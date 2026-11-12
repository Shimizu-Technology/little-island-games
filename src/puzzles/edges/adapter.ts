import { exactKeys, plain, uint } from '../../state/saveBits';
import { smallest } from '../semantic';
import { sha256Hex } from '../sha256';
import type { DescriptorCore, PuzzleAdapter } from '../types';
import { decodePuzzle, encodePuzzle, shapeOf, solved, validPuzzle, type BridgesPuzzle } from './core';
import { independentCount } from './independent';
import { grade, planHint, search } from './solver';

export type BridgesAction = readonly [link: number, count: number];
export type BridgesState = { counts: number[]; edits: number };

/** Cell maps for a w×h board: turns and mirrors for squares, half-turn and mirrors otherwise. */
export function boardMaps(w: number, h: number): { map: number[]; width: number; height: number }[] {
  const at = (width: number, height: number, f: (x: number, y: number) => [number, number]) => ({ width, height, map: Array.from({ length: w * h }, (_, i) => { const [x, y] = f(i % w, Math.floor(i / w)); return y * width + x; }) });
  const flat = [at(w, h, (x, y) => [x, y]), at(w, h, (x, y) => [w - 1 - x, y]), at(w, h, (x, y) => [x, h - 1 - y]), at(w, h, (x, y) => [w - 1 - x, h - 1 - y])];
  return w !== h ? flat : [...flat, at(h, w, (x, y) => [y, x]), at(h, w, (x, y) => [h - 1 - y, x]), at(h, w, (x, y) => [y, w - 1 - x]), at(h, w, (x, y) => [h - 1 - y, w - 1 - x])];
}
/** Turns and mirrors of the same map are one puzzle, and so are a map's portrait and landscape forms. */
export function semanticKey(p: BridgesPuzzle): string {
  // Landscape boards are first laid on their side, so both forms share one key.
  const width = Math.min(p.width, p.height), height = Math.max(p.width, p.height), clues = p.width <= p.height ? p.clues : p.clues.map((_, i) => p.clues[(i % width) * p.width + Math.floor(i / width)]);
  return smallest(boardMaps(width, height).map(({ map, width: mw }) => {
    const out = Array<number>(clues.length).fill(0);
    clues.forEach((c, i) => { out[map[i]] = c; });
    return `${mw}:${out.join('')}`;
  }));
}

/** The kit binding. Hints, completion, counting and grading all call the same pure rules. */
export function bridgesAdapter(): PuzzleAdapter<BridgesPuzzle, BridgesState, BridgesAction> {
  const crossesPlaced = (p: BridgesPuzzle, counts: readonly number[], link: number) => shapeOf(p).crosses[link].some(j => counts[j] > 0);
  return {
    engine: 'bridges', rules: 1, needsCheck: false,
    isPayload: (x): x is BridgesPuzzle => validPuzzle(x),
    isAction: (x): x is BridgesAction => Array.isArray(x) && x.length === 2 && uint(x[0], 1023) && uint(x[1], 2),
    encodePayload: encodePuzzle,
    decodePayload: decodePuzzle,
    create: d => ({ counts: shapeOf(d.payload).links.map(() => 0), edits: 0 }),
    validState: (x, d): x is BridgesState => {
      const { links } = shapeOf(d.payload);
      return plain(x) && exactKeys(x, ['counts', 'edits']) && uint(x.edits, 2147483647) && Array.isArray(x.counts) && x.counts.length === links.length
        && x.counts.every((c, i) => uint(c, 2) && (!c || !crossesPlaced(d.payload, x.counts as number[], i)));
    },
    // A bridge that would cross a placed one is refused, exactly as the board refuses it.
    reduce: (s, [link, count], d) => {
      const p = d.payload;
      if (link >= s.counts.length || count > 2 || s.counts[link] === count || count && crossesPlaced(p, s.counts, link)) return s;
      const counts = [...s.counts]; counts[link] = count;
      return { counts, edits: s.edits + 1 };
    },
    actions: (s, d) => s.counts.flatMap((c, link) => [0, 1, 2].filter(v => v !== c && (!v || !crossesPlaced(d.payload, s.counts, link))).map(v => [link, v] as const)),
    solved: (s, d) => solved(d.payload, s.counts),
    metrics: s => ({ placements: s.edits }),
    solve: (d, budget) => {
      const r = search(d.payload, 1, budget);
      if (r.status === 'budget-exhausted') return { status: 'budget-exhausted', nodes: r.nodes };
      if (!r.first) return { status: 'unsolved' };
      const witness = r.first.flatMap((c, link) => c ? [[link, c] as const] : []);
      return { status: 'solved', witness, metric: 'placements', lower: witness.length, upper: witness.length, exact: true };
    },
    count: (d, cap, budget) => { const r = search(d.payload, cap, budget); return r.status === 'counted' ? { status: 'counted', count: r.count } : { status: 'budget-exhausted' }; },
    independentCount: (d, cap, budget) => independentCount(d.payload, cap, budget * 10),
    technique: (d, budget) => {
      const g = grade(d.payload, undefined, Math.max(400, budget));
      return g.status === 'complete' ? { status: 'complete', ceiling: g.ceiling, steps: g.steps.length, trace: JSON.stringify(g.steps.map(s => [s.technique, s.island, s.links])) } : { status: 'stalled' };
    },
    hint: (s, d) => {
      const plan = planHint(d.payload, s.counts);
      if (plan.kind === 'place') return [plan.links[0], plan.counts[0]];
      if (plan.kind === 'clash' || plan.kind === 'mistake') return [plan.link, Math.max(0, s.counts[plan.link] - 1)];
      return null;
    },
    progress: s => s.counts.reduce((a, b) => a + b, 0),
    semanticKey: d => semanticKey(d.payload),
    solutionHash: s => sha256Hex(s.counts.join('')),
  };
}
export type BridgesDescriptor = DescriptorCore<BridgesPuzzle>;
