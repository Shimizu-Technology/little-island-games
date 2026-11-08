import { enter, hint, solutionCount, taskAt, type GridTask, type LogicState } from '../../learn/games/logic-lagoon/engine';
import { relabel, smallest, squareSymmetries } from '../semantic';
import type { CountResult, DescriptorCore, PuzzleAdapter, TechniqueResult } from '../types';

/**
 * Pack tuple: [level, engine seed, round index, givens, solution], digits one per cell, 0 for blank.
 * The layout is explicit: if a later engine change would deal a different grid, validation fails closed.
 */
export type LogicPayload = { level: number; seed: number; index: number; givens: number[]; solution: number[] };
export type LogicAction = readonly [cell: number, value: number];
type D = DescriptorCore<LogicPayload>;

let cachedKey = '', cachedTask: GridTask | null = null;
function gridOf(level: number, seed: number, index: number): GridTask | null {
  const key = `${level}:${seed}:${index}`;
  if (key !== cachedKey) {
    const task = taskAt({ version: 1, level, seed, index, total: 4, entries: [], helped: false });
    cachedKey = key;
    cachedTask = task.kind === 'grid' && !task.cages.length && !task.writtenClue ? task : null;
  }
  return cachedTask;
}
const shape = (d: D) => gridOf(d.payload.level, d.payload.seed, d.payload.index)!;
const digits = (a: readonly number[]) => a.join('');
const parseDigits = (x: unknown) => (typeof x === 'string' && /^[0-9]+$/.test(x) ? Array.from(x, Number) : null);
const create = (d: D): LogicState => ({ version: 1, level: d.payload.level, seed: d.payload.seed, index: d.payload.index, total: 4, entries: [], helped: false });

/** Peers per cell, written from the rules rather than taken from the engine, so the count is independent. */
function peersOf(task: GridTask) {
  const { size, boxRows, boxCols } = task;
  return Array.from({ length: size * size }, (_, a) => Array.from({ length: size * size }, (_, b) => b).filter(b => {
    if (a === b) return false;
    const ar = Math.floor(a / size), br = Math.floor(b / size), ac = a % size, bc = b % size;
    return ar === br || ac === bc || (boxRows > 1 && Math.floor(ar / boxRows) === Math.floor(br / boxRows) && Math.floor(ac / boxCols) === Math.floor(bc / boxCols));
  }));
}
function backtrack(task: GridTask, cap: number, budget: number): { status: 'counted'; count: number; first: number[] | null } | { status: 'budget-exhausted' } {
  const grid = [...task.givens], peers = peersOf(task);
  let count = 0, nodes = 0, first: number[] | null = null, spent = false;
  const walk = () => {
    if (nodes++ >= budget) { spent = true; return; }
    const cell = grid.indexOf(0);
    if (cell < 0) { count++; first ??= [...grid]; return; }
    for (let v = 1; v <= task.size && count < cap && !spent; v++) {
      if (peers[cell].some(p => grid[p] === v)) continue;
      grid[cell] = v;
      walk();
      grid[cell] = 0;
    }
  };
  walk();
  return spent ? { status: 'budget-exhausted' } : { status: 'counted', count, first };
}
/** Public-information deduction only: naked singles, then hidden singles. */
function singlesTrace(task: GridTask, budget: number): TechniqueResult {
  const grid = [...task.givens], peers = peersOf(task), { size } = task, steps: string[] = [];
  const units: number[][] = [];
  for (let i = 0; i < size; i++) {
    units.push(Array.from({ length: size }, (_, j) => i * size + j), Array.from({ length: size }, (_, j) => j * size + i));
  }
  if (task.boxRows > 1) for (let b = 0; b < size; b++) {
    const r = Math.floor(b / task.boxCols) * task.boxRows, c = (b % task.boxCols) * task.boxCols;
    units.push(Array.from({ length: size }, (_, j) => (r + Math.floor(j / task.boxCols)) * size + c + (j % task.boxCols)));
  }
  const options = (cell: number) => Array.from({ length: size }, (_, n) => n + 1).filter(v => !peers[cell].some(p => grid[p] === v));
  let ceiling = 'naked-single', rounds = 0;
  while (grid.includes(0)) {
    if (rounds++ > budget) return { status: 'stalled' };
    let placed = false;
    for (let cell = 0; cell < grid.length && !placed; cell++) {
      if (grid[cell]) continue;
      const o = options(cell);
      if (o.length === 1) { grid[cell] = o[0]; steps.push(`n${cell}=${o[0]}`); placed = true; }
    }
    for (let u = 0; u < units.length && !placed; u++) for (let v = 1; v <= size && !placed; v++) {
      if (units[u].some(c => grid[c] === v)) continue;
      const spots = units[u].filter(c => !grid[c] && options(c).includes(v));
      if (spots.length === 1) { grid[spots[0]] = v; steps.push(`h${spots[0]}=${v}`); ceiling = 'hidden-single'; placed = true; }
    }
    if (!placed) return { status: 'stalled' };
  }
  return { status: 'complete', ceiling, steps: steps.length, trace: steps.join() };
}
const symmetries = (task: GridTask) => {
  const all = squareSymmetries(task.size);
  // A 2x3 box survives half-turns and mirrors, not quarter-turns.
  return task.boxRows > 1 && task.boxRows !== task.boxCols ? [all[0], all[2], all[4], all[5]] : all;
};
export const logicLagoonAdapter: PuzzleAdapter<LogicPayload, LogicState, LogicAction> = {
  engine: 'logic-lagoon', rules: 1, needsCheck: false,
  isPayload: (x): x is LogicPayload => {
    const p = x as LogicPayload;
    if (!p || !Number.isInteger(p.level) || !Number.isInteger(p.seed) || p.seed < 0 || !Number.isInteger(p.index) || !Array.isArray(p.givens) || !Array.isArray(p.solution)) return false;
    const task = gridOf(p.level, p.seed, p.index);
    return !!task && digits(p.givens) === digits(task.givens) && digits(p.solution) === digits(task.solution);
  },
  isAction: (x): x is LogicAction => Array.isArray(x) && x.length === 2 && x.every(Number.isInteger),
  encodePayload: p => [p.level, p.seed, p.index, digits(p.givens), digits(p.solution)],
  decodePayload: x => {
    if (!Array.isArray(x) || x.length !== 5) return null;
    const givens = parseDigits(x[3]), solution = parseDigits(x[4]);
    return givens && solution && typeof x[0] === 'number' && typeof x[1] === 'number' && typeof x[2] === 'number' ? { level: x[0], seed: x[1], index: x[2], givens, solution } : null;
  },
  create,
  validState: (x, d): x is LogicState => (x as LogicState)?.version === 1 && (x as LogicState).seed === d.payload.seed,
  reduce: (s, [cell, value], d) => {
    if (s.index !== d.payload.index || s.entries[cell] === value) return s;
    return enter(s, cell, value);
  },
  actions: (s, d) => {
    if (s.index !== d.payload.index) return [];
    const task = shape(d);
    return task.givens.flatMap((given, cell) => (given ? [] : Array.from({ length: task.size }, (_, n) => [cell, n + 1] as const)));
  },
  solved: (s, d) => s.index === d.payload.index + 1,
  metrics: (_, actions) => ({ placements: actions.length }),
  solve: (d, budget) => {
    const task = shape(d), found = backtrack(task, 1, budget);
    if (found.status === 'budget-exhausted') return { status: 'budget-exhausted', nodes: budget };
    if (!found.first) return { status: 'unsolved' };
    const witness = found.first.flatMap((v, cell) => (task.givens[cell] ? [] : [[cell, v] as const]));
    return { status: 'solved', witness, metric: 'placements', lower: witness.length, upper: witness.length, exact: true };
  },
  semanticKey: d => {
    const task = shape(d);
    return `${task.size}:${smallest(symmetries(task).map(map => {
      const moved = Array<number>(map.length).fill(0);
      task.givens.forEach((v, i) => { moved[map[i]] = v; });
      return digits(relabel(moved));
    }))}`;
  },
  progress: s => s.entries.filter(Boolean).length,
  hint: (s, d) => {
    if (s.index !== d.payload.index) return null;
    const h = hint(s);
    return [h.cell, h.value];
  },
  count: (d, cap) => ({ status: 'counted', count: solutionCount([...shape(d).givens], shape(d).size, shape(d).boxRows, shape(d).boxCols, [], cap) }),
  independentCount: (d, cap, budget): CountResult => {
    const r = backtrack(shape(d), cap, budget);
    return r.status === 'counted' ? { status: 'counted', count: r.count } : r;
  },
  technique: (d, budget) => singlesTrace(shape(d), budget),
};
