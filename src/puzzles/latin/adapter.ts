import { exactKeys, plain, uint } from '../../state/saveBits';
import { relabel, smallest, squareSymmetries } from '../semantic';
import { sha256Hex } from '../sha256';
import type { DescriptorCore, PuzzleAdapter } from '../types';
import { cellsOf, decodePuzzle, encodePuzzle, maxValue, shapeOf, sightCells, solved, validPuzzle, type LatinKind, type LatinPuzzle } from './core';
import { independentCount } from './independent';
import { grade, planHint, search } from './solver';

export type LatinAction = readonly [cell: number, value: number];
export type LatinState = { values: number[]; edits: number };
export type LatinDescriptor = DescriptorCore<LatinPuzzle>;

const permutations = <T,>(items: readonly T[]): T[][] => items.length <= 1 ? [[...items]] : items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map(rest => [x, ...rest]));
/** Row orders that keep every box intact: bands in any order, rows within each band reordered. */
function lineOrders(n: number, block: number, full: boolean): number[][] {
  const bands = permutations(Array.from({ length: n / block }, (_, i) => i));
  const inner = full ? permutations(Array.from({ length: block }, (_, i) => i)) : [Array.from({ length: block }, (_, i) => i), Array.from({ length: block }, (_, i) => block - 1 - i)];
  const out: number[][] = [];
  // Full inner orders per band would be inner^bands; on 4×4 and 6×6 that is still small.
  const choices = full ? inner.length ** (n / block) : inner.length;
  for (const order of bands) for (let pick = 0; pick < choices; pick++) {
    const rows: number[] = [];
    let code = pick;
    for (const band of order) { const within = full ? inner[code % inner.length] : inner[pick]; if (full) code = Math.floor(code / inner.length); for (const r of within) rows.push(band * block + r); }
    out.push(rows);
  }
  return out;
}
const sudokuMaps = new Map<number, number[][]>();
/**
 * Cell maps that keep Sudoku's rules: band/stack orders, line orders inside them and, when boxes are
 * square, transposition. Complete for 4×4 and 6×6; 9×9 keeps whole-band reversals (288 maps).
 */
export function sudokuSymmetries(n: number): number[][] {
  const hit = sudokuMaps.get(n);
  if (hit) return hit;
  const h = n === 9 ? 3 : 2, w = n / h, full = n < 9;
  const rows = lineOrders(n, h, full), cols = lineOrders(n, w, full), maps: number[][] = [];
  for (const transpose of h === w ? [false, true] : [false]) for (const r of rows) for (const c of cols)
    maps.push(Array.from({ length: n * n }, (_, i) => { const y = r.indexOf(Math.floor(i / n)), x = c.indexOf(i % n); return transpose ? x * n + y : y * n + x; }));
  sudokuMaps.set(n, maps);
  return maps;
}
/** Mirrors, turns, rule-keeping line swaps and digit renamings are not extra supply. Arithmetic keeps numeric meaning. */
export function semanticKey(p: LatinPuzzle): string {
  if (p.kind === 'sudoku') return `${p.size}:${smallest(sudokuSymmetries(p.size).map(map => { const a = p.givens.map(() => 0); p.givens.forEach((v, i) => { a[map[i]] = v; }); return relabel(a).join(''); }))}`;
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
