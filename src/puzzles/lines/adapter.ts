import { exactKeys, plain, uint } from '../../state/saveBits';
import { smallest } from '../semantic';
import { sha256Hex } from '../sha256';
import type { DescriptorCore, PuzzleAdapter } from '../types';
import { CROSS, EMPTY, LINE, decodePuzzle, encodePuzzle, latticeOf, solved, validPuzzle, type LinePuzzle } from './core';
import { independentCount } from './independent';
import { grade, planHint, search } from './solver';

/** Set one edge to empty, line or cross. */
export type LineAction = readonly [edge: number, mark: number];
export type LineState = { marks: number[]; edits: number };

/** Turns and mirrors of the same board are one puzzle (square boards also turn a quarter). */
export function semanticKey(p: LinePuzzle): string {
  const values = p.kind === 'loop' ? p.clues : p.pearls, { rows: h, cols: w } = p;
  const maps: [number, (x: number, y: number) => [number, number]][] = [[w, (x, y) => [x, y]], [w, (x, y) => [w - 1 - x, y]], [w, (x, y) => [x, h - 1 - y]], [w, (x, y) => [w - 1 - x, h - 1 - y]]];
  if (w === h) maps.push([h, (x, y) => [y, x]], [h, (x, y) => [h - 1 - y, x]], [h, (x, y) => [y, w - 1 - x]], [h, (x, y) => [h - 1 - y, w - 1 - x]]);
  return smallest(maps.map(([width, f]) => {
    const out = Array<number>(values.length).fill(0);
    values.forEach((v, i) => { const [x, y] = f(i % w, Math.floor(i / w)); out[y * width + x] = v; });
    return `${p.kind}:${width}:${out.map(v => v < 0 ? '.' : v).join('')}`;
  }));
}
export function lineAdapter(kind: LinePuzzle['kind']): PuzzleAdapter<LinePuzzle, LineState, LineAction> {
  return {
    engine: kind, rules: 1, needsCheck: false,
    isPayload: (x): x is LinePuzzle => validPuzzle(x) && x.kind === kind,
    isAction: (x): x is LineAction => Array.isArray(x) && x.length === 2 && uint(x[0], 1023) && uint(x[1], 2),
    encodePayload: encodePuzzle,
    decodePayload: x => decodePuzzle(kind, x),
    create: d => ({ marks: latticeOf(d.payload).edges.map(() => EMPTY), edits: 0 }),
    validState: (x, d): x is LineState => plain(x) && exactKeys(x, ['marks', 'edits']) && uint(x.edits, 2147483647) && Array.isArray(x.marks)
      && x.marks.length === latticeOf(d.payload).edges.length && x.marks.every(m => uint(m, 2)),
    reduce: (s, [edge, mark], _d) => {
      if (edge >= s.marks.length || mark > 2 || s.marks[edge] === mark) return s;
      const marks = [...s.marks]; marks[edge] = mark;
      return { marks, edits: s.edits + 1 };
    },
    // Public legal choices: any edge may become empty, a line or a cross.
    actions: s => s.marks.flatMap((m, e) => [EMPTY, LINE, CROSS].filter(v => v !== m).map(v => [e, v] as const)),
    solved: (s, d) => solved(d.payload, s.marks.map(m => m === CROSS ? EMPTY : m)),
    metrics: s => ({ placements: s.edits }),
    solve: (d, budget) => {
      const r = search(d.payload, 1, budget);
      if (r.status === 'budget-exhausted') return { status: 'budget-exhausted', nodes: r.nodes };
      if (!r.first) return { status: 'unsolved' };
      const witness = r.first.flatMap((m, e) => m === LINE ? [[e, LINE] as const] : []);
      return { status: 'solved', witness, metric: 'placements', lower: witness.length, upper: witness.length, exact: true };
    },
    count: (d, cap, budget) => { const r = search(d.payload, cap, Math.min(budget * 2, 400_000)); return r.status === 'counted' ? { status: 'counted', count: r.count } : { status: 'budget-exhausted' }; },
    independentCount: (d, cap, budget) => independentCount(d.payload, cap, budget * 50),
    technique: (d, budget) => {
      const g = grade(d.payload, undefined, Math.max(400, budget));
      return g.status === 'complete' ? { status: 'complete', ceiling: g.ceiling, steps: g.steps.length, trace: JSON.stringify(g.steps.map(s => [s.technique, s.set])) } : { status: 'stalled' };
    },
    // One certain line or cross at a time, from the same plan the board's hint card uses.
    hint: (s, d) => {
      const plan = planHint(d.payload, s.marks);
      if (plan.kind === 'place') return plan.set[0];
      if (plan.kind === 'mistake') return [plan.edge, EMPTY];
      if (plan.kind === 'clash') return plan.edges.length ? [plan.edges[0], EMPTY] : null;
      return null;
    },
    progress: s => s.marks.filter(m => m === LINE).length,
    semanticKey: d => semanticKey(d.payload),
    solutionHash: s => sha256Hex(s.marks.map(m => m === LINE ? 1 : 0).join('')),
  };
}
export type LineDescriptor = DescriptorCore<LinePuzzle>;
