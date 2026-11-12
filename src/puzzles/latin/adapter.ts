import { exactKeys, plain, uint } from '../../state/saveBits';
import { smallest, squareSymmetries } from '../semantic';
import { sha256Hex } from '../sha256';
import type { DescriptorCore, PuzzleAdapter } from '../types';
import { cellsOf, decodePuzzle, encodePuzzle, maxValue, shapeOf, sightCells, solved, validPuzzle, type LatinKind, type LatinPuzzle } from './core';
import { independentCount } from './independent';
import { grade, planHint, search } from './solver';

export type LatinAction = readonly [cell: number, value: number];
export type LatinState = { values: number[]; edits: number };
export type LatinDescriptor = DescriptorCore<LatinPuzzle>;

const permutations = <T,>(items: readonly T[]): T[][] => items.length <= 1 ? [[...items]] : items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map(rest => [x, ...rest]));
/** Every line order that keeps boxes whole: blocks of `block` lines in any order, and any order inside each block. */
function lineOrders(n: number, block: number): number[][] {
  const blocks = permutations(Array.from({ length: n / block }, (_, i) => i)), inner = permutations(Array.from({ length: block }, (_, i) => i)), out: number[][] = [];
  const walk = (order: readonly number[], at: number, lines: number[]) => {
    if (at === order.length) { out.push(lines); return; }
    for (const within of inner) walk(order, at + 1, [...lines, ...within.map(r => order[at] * block + r)]);
  };
  for (const order of blocks) walk(order, 0, []);
  return out;
}
const columnOrders = new Map<string, number[][]>();
/**
 * The smallest row-major reading of a Sudoku clue grid over its whole rule-keeping class: band and
 * stack orders, any row order inside a band, any column order inside a stack, transposition when
 * boxes are square, and digit renaming. That class has 3,359,232 cell maps on 9×9, so rows are
 * chosen one at a time and only the column orders that tie for the smallest prefix survive.
 */
export function sudokuCanonical(p: Pick<LatinPuzzle, 'size' | 'box' | 'givens'>): string {
  const n = p.size, h = p.box, w = n / h, key = `${n}:${w}`;
  const cols = columnOrders.get(key) ?? lineOrders(n, w);
  columnOrders.set(key, cols);
  const grids: number[][] = [[...p.givens], ...(h === w ? [p.givens.map((_, i) => p.givens[(i % n) * n + Math.floor(i / n)])] : [])];
  type Branch = { grid: number[]; used: number; band: number; cols: number; names: number[]; next: number };
  let live: Branch[] = grids.flatMap(grid => cols.map((_, c) => ({ grid, used: 0, band: -1, cols: c, names: Array<number>(n + 1).fill(0), next: 1 })));
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    let best: number[] | null = null, kept: Branch[] = [];
    const seen = new Set<string>();
    for (const b of live) {
      // A band's first row may come from any band not used yet; later rows stay in that band.
      const free = (r: number) => !((b.used >> r) & 1), all = Array.from({ length: n }, (_, r) => r);
      const rows = k % h === 0 ? all.filter(r => all.every(q => Math.floor(q / h) !== Math.floor(r / h) || free(q))) : all.filter(r => Math.floor(r / h) === b.band && free(r));
      for (const r of rows) {
        const names = [...b.names], order = cols[b.cols], line: number[] = [];
        let next = b.next, cmp = best ? 0 : -1;
        for (let j = 0; j < n; j++) {
          const v = b.grid[r * n + order[j]];
          let named = 0;
          if (v) { if (!names[v]) names[v] = next++; named = names[v]; }
          line.push(named);
          if (cmp === 0) { const d = named - best![j]; if (d) cmp = d; if (cmp > 0) break; }
        }
        if (cmp > 0) continue;
        const branch: Branch = { grid: b.grid, used: b.used | (1 << r), band: Math.floor(r / h), cols: b.cols, names, next };
        if (cmp < 0) { best = line; kept = []; seen.clear(); }
        // Branches that reach the same rows, band, columns and names have the same future.
        const id = `${grids.indexOf(b.grid)}|${branch.used}|${branch.band}|${branch.cols}|${names.join(',')}`;
        if (!seen.has(id)) { seen.add(id); kept.push(branch); }
      }
    }
    out.push(...best!);
    live = kept;
  }
  return out.join('');
}
/** Mirrors, turns, rule-keeping line swaps and digit renamings are not extra supply. Arithmetic keeps numeric meaning. */
export function semanticKey(p: LatinPuzzle): string {
  if (p.kind === 'sudoku') return `${p.size}:${sudokuCanonical(p)}`;
  const n = p.size, maps = p.kind === 'killer' && n === 6 ? squareSymmetries(n).filter((_, i) => [0, 2, 4, 5].includes(i)) : squareSymmetries(n);
  const flips = p.kind === 'greater-than' ? [false, true] : [false];
  return smallest(maps.flatMap(map => flips.map(flip => {
    const value = (v: number) => v && flip ? n + 1 - v : v;
    const givens = p.givens.map(() => 0), mask = p.mask.map(() => 0);
    p.givens.forEach((v, i) => { givens[map[i]] = value(v); });
    p.mask.forEach((m, i) => { mask[map[i]] = m; });
    const cages = p.cages.map(c => [c.cells.map(i => map[i]).sort((a, b) => a - b), c.op, c.target]).sort((a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : 1);
    const less = p.less.map(([a, b]) => flip ? [map[b], map[a]] : [map[a], map[b]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    // A sight line is identified by its ordered mapped cells, so the viewing direction survives.
    const sights = p.sights.map(([id, clue]) => [sightCells(p, id).map(i => map[i]).join('.'), clue]).sort((a, b) => String(a[0]) < String(b[0]) ? -1 : 1);
    return JSON.stringify([p.kind, n, givens.join(''), cages, less, sights, mask.join('')]);
  })));
}

/** The kit binding. Hints, completion, counting and grading all call the same pure rules. */
export function latinAdapter(engine: LatinKind): PuzzleAdapter<LatinPuzzle, LatinState, LatinAction> {
  return {
    engine, rules: 1, needsCheck: false,
    isPayload: (x): x is LatinPuzzle => validPuzzle(x) && x.kind === engine,
    isAction: (x): x is LatinAction => Array.isArray(x) && x.length === 2 && uint(x[0], 99) && uint(x[1], 9),
    encodePayload: encodePuzzle,
    decodePayload: x => { const p = decodePuzzle(x); return p?.kind === engine ? p : null; },
    create: d => ({ values: [...d.payload.givens], edits: 0 }),
    validState: (x, d): x is LatinState => {
      const p = d.payload;
      return plain(x) && exactKeys(x, ['values', 'edits']) && uint(x.edits, 2147483647) && Array.isArray(x.values) && x.values.length === p.givens.length
        && x.values.every((v, i) => uint(v, maxValue(p)) && (!p.givens[i] || v === p.givens[i]) && (!p.mask[i] || v === 0));
    },
    reduce: (s, [cell, value], d) => {
      const p = d.payload;
      if (cell >= s.values.length || p.mask[cell] || p.givens[cell] || s.values[cell] === value || value > maxValue(p)) return s;
      const values = [...s.values]; values[cell] = value;
      return { values, edits: s.edits + 1 };
    },
    // Public legal choices: an empty cell can take any number its filled peers do not already use.
    actions: (s, d) => {
      const p = d.payload, { peers } = shapeOf(p), out: LatinAction[] = [];
      for (const i of cellsOf(p)) {
        if (p.givens[i]) continue;
        if (s.values[i]) { out.push([i, 0]); continue; }
        for (let v = 1; v <= maxValue(p); v++) if (!peers[i].some(j => s.values[j] === v)) out.push([i, v]);
      }
      return out;
    },
    solved: (s, d) => solved(d.payload, s.values),
    metrics: s => ({ placements: s.edits }),
    solve: (d, budget) => {
      const r = search(d.payload, 1, budget);
      if (r.status === 'budget-exhausted') return { status: 'budget-exhausted', nodes: r.nodes };
      if (!r.first) return { status: 'unsolved' };
      const witness = r.first.flatMap((v, i) => !d.payload.mask[i] && !d.payload.givens[i] ? [[i, v] as const] : []);
      return { status: 'solved', witness, metric: 'placements', lower: witness.length, upper: witness.length, exact: true };
    },
    count: (d, cap, budget) => { const r = search(d.payload, cap, budget); return r.status === 'counted' ? { status: 'counted', count: r.count } : { status: 'budget-exhausted' }; },
    independentCount: (d, cap, budget) => { const r = independentCount(d.payload, cap, budget); return r.status === 'counted' ? { status: 'counted', count: r.count } : { status: 'budget-exhausted' }; },
    technique: (d, budget) => {
      const r = grade(d.payload, budget * 4);
      return r.status === 'complete' ? { status: 'complete', ceiling: r.ceiling, steps: r.steps.length, trace: JSON.stringify(r.steps.map(s => [s.technique, s.remove])) } : { status: 'stalled' };
    },
    hint: (s, d) => {
      const plan = planHint(d.payload, s.values);
      return plan.kind === 'place' ? [plan.cell, plan.value] : plan.kind === 'clash' ? [plan.erase, 0] : plan.kind === 'mistake' ? [plan.cell, 0] : null;
    },
    progress: s => s.values.filter(Boolean).length,
    semanticKey: d => semanticKey(d.payload),
    solutionHash: s => sha256Hex(s.values.join('')),
  };
}
