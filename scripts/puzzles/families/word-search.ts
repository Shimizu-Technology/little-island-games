import { wordSearchAdapter } from '../../../src/puzzles/words/adapter';
import type { FamilySpec } from '../../../src/puzzles/types';
/** The G6 driver supplies explicit W1-admitted surfaces; the shared CLI cannot generate words. */
export const wordSearch: FamilySpec = {
  id: 'word-search', adapter: wordSearchAdapter(), sources: ['src/puzzles/words/core.ts', 'src/puzzles/words/adapter.ts', 'scripts/puzzles/words/bake.mjs'],
  bands: ['paddling', 'shallows', 'lagoon', 'reef', 'deep', 'trench'].map(id => ({ id, target: 2048, floor: 1, advanced: false })),
  provenance: { source: 'reviewed', note: 'Original baked layouts over W1-admitted words. Both grid scans required; no runtime generation.' },
  review: { ids: [], complete: false }, maxRowBytes: 4096, requiresUnique: false, requiresTrace: false, hiddenInformation: false,
  generate: () => null,
};
