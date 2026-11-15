import { levelOf } from '../../levelOptions';
import type { LearnEngine } from '../../types';
import { engine as legacyEngine, taskAt as legacyTask, enter as legacyEnter, hint as legacyHint, valueAt as legacyValue, type LogicState as LegacyState, type GridTask as LegacyGrid, type BalanceTask } from './legacy';
import { conflicts, shapeOf, solved, type LatinPuzzle } from '../../../puzzles/latin/core';
import { grade, planHint, search } from '../../../puzzles/latin/solver';
import { cueFor } from '../../../puzzles/latin/teach';
import { createRng } from '../../../puzzles/rng';
import { createGrid, decodeGrid, encodeGrid, gridAction, type GridAction, type GridSpec, type GridState, type PackedGrid } from '../../../puzzles/grid/model';
import { exactKeys, plain, uint } from '../../../state/saveBits';
import { schoolPuzzle } from './supply';

export type LatinState = { version: 2; catalog: 1; level: number; seed: number; index: number; total: 4; board: PackedGrid | null; helped: boolean };
export type LogicState = LegacyState | LatinState;
export type Cage = LegacyGrid['cages'][number];
export type GridTask = LegacyGrid & { puzzle?: LatinPuzzle; teaches?: string };
export type LogicTask = GridTask | BalanceTask;
export { solutionCount } from './legacy';
export const specFor = (p: LatinPuzzle): GridSpec => ({ rows: p.size, columns: p.size, kind: 'digits', symbols: Array.from({ length: p.size }, (_, i) => String(i + 1)), givens: p.givens });

/** Two/three-picture teaching boards use the same Latin deduction functions, without adding packed sizes. */
function picturePuzzle(size: number, seed: number): LatinPuzzle {
  const rng = createRng(seed), p: LatinPuzzle = { kind: 'sudoku', size, box: 0, givens: Array(size * size).fill(0), cages: [], less: [], sights: [], mask: Array(size * size).fill(0) };
  const full = search(p, 1, 10000, () => rng.uint32() / 0x100000000).first!;
  p.givens = [...full];
  for (const cell of rng.shuffle(p.givens.map((_, i) => i))) {
    const v = p.givens[cell]; p.givens[cell] = 0;
    if (grade(p, 10000, p.givens, 0).status !== 'complete') p.givens[cell] = v;
  }
  return p;
}
const tasks = new Map<string, LogicTask>();
export function taskAt(s: LogicState): LogicTask {
  if (s.version === 1) return legacyTask(s);
  const key = `${s.catalog}:${s.level}:${s.seed}:${s.index}`, hit = tasks.get(key);
  if (hit) return hit;
  const seed = (s.seed + Math.imul(s.index, 9419)) >>> 0;
  let task: LogicTask;
  if (s.level === 3 && s.index === 2) {
    const answer = 2 + seed % 8, right = 1 + (seed >>> 7) % 7;
    task = { kind: 'balance', left: answer + right, right, answer, title: 'Balance the two shell scales' };
  } else {
    const p = s.level <= 2 ? picturePuzzle(s.level + 1, seed) : schoolPuzzle(s.level, seed);
    const g = grade(p), solution = search(p, 1).first!;
    task = { kind: 'grid', size: p.size, boxRows: p.box || 1, boxCols: p.box ? p.size / p.box : 1, solution, givens: p.givens,
      cages: p.cages.map(c => ({ cells: c.cells, sum: c.target })), puzzle: p, teaches: g.status === 'complete' ? g.ceiling : '',
      symbols: s.level <= 2 || s.level === 3 && s.index < 2 ? ['shell', 'fish', 'star', 'crab'].slice(0, p.size) : Array.from({ length: p.size }, (_, i) => String(i + 1)),
      title: s.level <= 2 ? 'Fill the picture lagoon' : s.level === 5 ? 'Solve the sum cages' : 'Fill each row, column and little box' };
  }
  tasks.set(key, task); if (tasks.size > 32) tasks.delete(tasks.keys().next().value!);
  return task;
}
export function boardAt(s: LatinState, p: LatinPuzzle): GridState { return s.board ? decodeGrid(s.board, specFor(p))! : createGrid(specFor(p)); }
export function valueAt(s: LogicState, cell: number): number {
  if (s.version === 1) return legacyValue(s, cell);
  const t = taskAt(s); return t.kind === 'grid' ? boardAt(s, t.puzzle!).values[cell] : 0;
}
export function move(s: LatinState, action: GridAction): LatinState {
  if (s.index === 4) return s;
  const t = taskAt(s); if (t.kind !== 'grid') return s;
  const p = t.puzzle!, state = boardAt(s, p), next = gridAction(state, action, specFor(p));
  if (state === next) return s;
  if (solved(p, next.values)) return { ...s, index: s.index + 1, board: null };
  return { ...s, board: encodeGrid(next, specFor(p), 2800) };
}
export function enter(s: LogicState, cell: number, value: number): LogicState {
  if (s.version === 1) return legacyEnter(s, cell, value);
  if (s.index === 4) return s;
  const t = taskAt(s);
  if (t.kind === 'balance') return cell === 0 && value === t.answer ? { ...s, index: s.index + 1, board: null } : s;
  return move(s, { type: 'write', cells: [cell], value, selected: cell });
}
export function hint(s: LogicState): { state: LogicState; cell: number; value: number; reason: string } {
  if (s.version === 1) return legacyHint(s);
  const t = taskAt(s), state = { ...s, helped: true };
  if (t.kind === 'balance') return { state, cell: 0, value: t.answer, reason: `Both sides must hold the same number of shells. Take ${t.right} away from ${t.left} to find the bag.` };
  const p = t.puzzle!, plan = planHint(p, boardAt(s, p).values), cue = cueFor(p, plan);
  return { state, cell: cue.target ?? 0, value: plan.kind === 'place' ? plan.value : 0, reason: `${cue.look} ${cue.think}`.trim() };
}
/** A teaching placement is a value even when the player is writing pencil notes. */
export function revealStep(s: LatinState): LatinState {
  const t = taskAt(s); if (t.kind !== 'grid') return s;
  const h = hint(s), p = t.puzzle!, before = boardAt(s, p);
  const base = { ...s, helped: true, board: encodeGrid({ ...before, pencil: false }, specFor(p), 2800) };
  const next = move(base, { type: 'write', cells: [h.cell], value: h.value, selected: h.cell });
  return next.index === s.index && next.board ? { ...next, board: { ...next.board, pencil: before.pencil } } : next;
}
/** Peer-single bot: deliberately cannot use cage totals, arrows or hidden places. */
export function singleCandidateBot(p: LatinPuzzle): boolean {
  const values = [...p.givens], { peers } = shapeOf(p);
  for (;;) {
    let changed = false;
    for (let i = 0; i < values.length; i++) if (!values[i]) {
      const options = Array.from({ length: p.size }, (_, k) => k + 1).filter(v => !peers[i].some(j => values[j] === v));
      if (options.length === 1) { values[i] = options[0]; changed = true; }
    }
    if (!changed) return solved(p, values);
  }
}
export const engine: LearnEngine<LogicState> = {
  ...legacyEngine,
  levelNames: [
    { name: 'Two friends', description: 'One of each picture in every row and column. One choice remains.' },
    { name: 'Picture grid', description: 'Three pictures: use the rows and columns together.' },
    { name: 'Little sudoku', description: '4 × 4 pictures, numbers and a shell-scale rest beat. Too easy? Level 4 is open.' },
    { name: 'Hidden places', description: '6 × 6: find the only place for a number. Use Notes to keep your choices.' },
    { name: 'Cages and clues', description: 'Sum cages without starting numbers. Challenge adds six-wide cages and arrow-only grids.' },
  ],
  help: 'Tap a square, then choose a picture or number. Every row and column needs one of each. Boxes and cage totals add clues. Help points to one useful step. There is no clock, and you can change your answers.',
  create: (o, ctx) => ({ version: 2, catalog: 1, level: levelOf(o), seed: Math.floor(ctx.rng() * 0xffffffff) >>> 0, index: 0, total: 4, board: null, helped: false }),
  notWon: undefined, turn: undefined,
  outcome: s => s.index === 4 ? 'done' : null,
  validate: (x, o): x is LogicState => {
    if (plain(x) && x.version === 1) return legacyEngine.validate(x, o);
    if (!plain(x) || !exactKeys(x, ['version', 'catalog', 'level', 'seed', 'index', 'total', 'board', 'helped']) || x.version !== 2 || x.catalog !== 1 || x.level !== levelOf(o) || !uint(x.seed, 0xffffffff) || !uint(x.index, 4) || x.total !== 4 || typeof x.helped !== 'boolean' || JSON.stringify(x).length > 3100) return false;
    const s = x as LatinState;
    if (s.index === 4) return s.board === null;
    const t = taskAt(s); return t.kind === 'balance' ? s.board === null : s.board === null || !!decodeGrid(s.board, specFor(t.puzzle!));
  },
};
/** Same public-rule feedback used by the shared Latin board and Check. */
export const clashes = conflicts;
