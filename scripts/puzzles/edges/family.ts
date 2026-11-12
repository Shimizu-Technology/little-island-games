/**
 * Shared G5 family plumbing for Bridges, Loop and Pearl Loop: one generator shape, one descriptor
 * form and one FamilySpec builder. One rung is one band and one packed bank.
 */
import type { BandQuota, DescriptorCore, FamilySpec, PuzzleAdapter } from '../../../src/puzzles/types';

export type EdgeRung = { id: string; tier: 1 | 2 | 3 | 4 | 5 | 6 };
export type EdgeCandidate<P> = { seed: number; puzzle: P; template: string; ceiling: string; workload: number };
export type EdgeGenerator<P, R extends EdgeRung = EdgeRung> = {
  family: string;
  rungs: readonly (R & { target: number; floor: number })[];
  generate(rung: R, seed: number): EdgeCandidate<P> | null;
  /** Grades a board again (a cached pool entry) and keeps it only if it still fits the rung. */
  judge(rung: R, seed: number, puzzle: P, template: string): EdgeCandidate<P> | null;
};
/** The rung's hardest idea is what the bank teaches. Par is omitted: bridge or line counts are not a goal. */
export const describe = <P,>(c: EdgeCandidate<P>, band: string): DescriptorCore<P> => ({
  format: 1, seed: c.seed, rng: 1, band, layout: c.template, template: c.template, payload: c.puzzle,
  objectives: [], limits: [], par: null, teaches: [c.ceiling], speech: null,
});
export function edgeFamily<P>(gen: EdgeGenerator<P>, adapter: PuzzleAdapter<P, any, any>, sources: readonly string[], note: string, maxRowBytes = 512): FamilySpec<P> {
  const bands: BandQuota[] = gen.rungs.map(r => ({ id: r.id, target: r.target, floor: r.floor, advanced: r.tier >= 3 }));
  return {
    id: gen.family, sources: [...sources, 'scripts/puzzles/edges/family.ts'], adapter, bands,
    provenance: { source: 'original', note },
    review: { ids: [], complete: false }, maxRowBytes, requiresUnique: true, requiresTrace: true, hiddenInformation: false,
    generate: (seed, band) => { const rung = gen.rungs.find(r => r.id === band.id); const c = rung && gen.generate(rung, seed); return c ? describe(c, band.id) : null; },
  };
}
