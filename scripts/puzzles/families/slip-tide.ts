import { rungRules, slipTideAdapter } from '../../../src/puzzles/adapters/slip-tide';
import { explore, needsStopper, type SlipPuzzle } from '../../../src/learn/games/slip-tide/rules';
import { createRng } from '../../../src/puzzles/rng';
import { parFrom } from '../../../src/puzzles/solver';
import { fnv1a32 } from '../../../src/puzzles/today';
import type { BandQuota, DescriptorCore, FamilySpec } from '../../../src/puzzles/types';

/** Original boards drawn from a seed, then proved by exhaustive search. Rung numbers come from the validated audit ladder. */
export const rungs = {
  a: { size: 4, crabs: 1, rocks: 2, min: 1, max: 2 },
  b: { size: 5, crabs: 1, rocks: 4, min: 3, max: 5 },
  c: { size: 5, crabs: 2, rocks: 4, min: 4, max: 6 },
  d: { size: 6, crabs: 2, rocks: 7, min: 7, max: 10 },
  e: { size: 6, crabs: 3, rocks: 7, min: 9, max: 13 },
  f: { size: 7, crabs: 3, rocks: 10, min: 14, max: 20 },
  g: { size: 7, crabs: 4, rocks: 11, min: 20, max: 60 },
} as const;
export type Rung = keyof typeof rungs;
const SEARCH_CAP = 200_000;

export function drawBoard(seed: number, band: Rung): Omit<SlipPuzzle, 'route'> {
  const c = rungs[band], rng = createRng(seed), cells = Array.from({ length: c.size * c.size }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = rng.below(i + 1);
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return { size: c.size, rocks: cells.slice(0, c.rocks).sort((a, b) => a - b), crabs: cells.slice(c.rocks, c.rocks + c.crabs), pools: cells.slice(c.rocks + c.crabs, c.rocks + 2 * c.crabs) };
}
const routeLetters = (p: Omit<SlipPuzzle, 'route'>) => {
  const route = slipTideAdapter.solve({ payload: { ...p, route: '' } } as DescriptorCore<SlipPuzzle>, SEARCH_CAP);
  return route.status === 'solved' ? route.witness.map(d => 'URDL'[d]).join('') : null;
};
export const slipTideFamily: FamilySpec<SlipPuzzle> = {
  id: 'slip-tide',
  adapter: slipTideAdapter,
  sources: ['src/learn/games/slip-tide/rules.ts', 'src/puzzles/adapters/slip-tide.ts', 'scripts/puzzles/families/slip-tide.ts'],
  bands: [
    { id: 'a', target: 120, floor: 60, advanced: false },
    { id: 'b', target: 200, floor: 72, advanced: false },
    { id: 'c', target: 300, floor: 80, advanced: false },
    { id: 'd', target: 400, floor: 80, advanced: true },
    { id: 'e', target: 400, floor: 80, advanced: true },
    { id: 'f', target: 256, floor: 80, advanced: true },
    { id: 'g', target: 128, floor: 60, advanced: true },
  ],
  provenance: { source: 'original', note: 'Random boards from a fixed RNG, each proved by exhaustive search. No level from any existing game.' },
  review: { ids: [], complete: false },
  maxRowBytes: 384,
  requiresUnique: false,
  requiresTrace: false,
  hiddenInformation: false,
  generate(seed: number, band: BandQuota): DescriptorCore<SlipPuzzle> | null {
    const id = band.id as Rung, c = rungs[id], rule = rungRules[id], drawn = drawBoard(seed, id);
    const graph = explore({ ...drawn, route: '' }, SEARCH_CAP);
    if (!graph.complete || graph.dist < c.min || graph.dist > c.max || graph.shortest > rule.maxShortest || (rule.noDeadEnds && graph.dead)) return null;
    if (rule.stopper && !needsStopper({ ...drawn, route: '' })) return null;
    const route = routeLetters(drawn);
    if (route === null) return null;
    const payload: SlipPuzzle = { ...drawn, route }, length = route.length;
    return {
      format: 1, seed, rng: 1, band: id, layout: `first-${route[0].toLowerCase()}`, template: `rocks-${fnv1a32(drawn.rocks.join()) % 8}`, payload, objectives: [],
      limits: band.advanced ? [{ metric: 'steps', max: length }] : [], par: parFrom('steps', length, length), teaches: rule.stopper ? ['stopper'] : [], speech: null,
    };
  },
};
