import { latinAdapter } from '../../../src/puzzles/latin/adapter';
import type { LatinKind, LatinPuzzle } from '../../../src/puzzles/latin/core';
import type { RungInfo } from '../../../src/puzzles/latin/rungs';
import type { Grade } from '../../../src/puzzles/latin/solver';
import type { BandQuota, DescriptorCore, FamilySpec } from '../../../src/puzzles/types';

export type GenRung = RungInfo & { target: number; floor: number };
export type Candidate = { seed: number; puzzle: LatinPuzzle; template: string; grade: Extract<Grade, { status: 'complete' }> };
export type LatinGenerator = { kind: LatinKind; rungs: readonly GenRung[]; generate(rung: GenRung, seed: number): Candidate | null; workload(c: Candidate): number };

export const latinSources = ['src/puzzles/latin/core.ts', 'src/puzzles/latin/solver.ts', 'src/puzzles/latin/independent.ts', 'src/puzzles/latin/adapter.ts', 'src/puzzles/latin/rungs.ts', 'scripts/puzzles/latin/family.ts'];
/** The rung's technique is what the bank teaches. Par is omitted: placements are not a Latin goal. */
export const describe = (c: Candidate, band: string): DescriptorCore<LatinPuzzle> => ({
  format: 1, seed: c.seed, rng: 1, band, layout: c.template, template: c.template, payload: c.puzzle,
  objectives: [], limits: [], par: null, teaches: [c.grade.ceiling], speech: null,
});
/** The registered family. Its own `generate` deals one fresh candidate per seed for the kit's CLI. */
export function latinFamily(gen: LatinGenerator, sources: readonly string[]): FamilySpec<LatinPuzzle> {
  const bands: BandQuota[] = gen.rungs.map(r => ({ id: r.id, target: r.target, floor: r.floor, advanced: r.tier >= 3 }));
  return {
    id: gen.kind, sources: [...latinSources, ...sources], adapter: latinAdapter(gen.kind), bands,
    provenance: { source: 'original', note: 'Generated here from seeded random solved grids and symmetric clue removal; every rung is graded by named human techniques. No imported puzzles.' },
    review: { ids: [], complete: false }, maxRowBytes: 512, requiresUnique: true, requiresTrace: true, hiddenInformation: false,
    generate: (seed, band) => { const rung = gen.rungs.find(r => r.id === band.id); const c = rung && gen.generate(rung, seed); return c ? describe(c, band.id) : null; },
  };
}
