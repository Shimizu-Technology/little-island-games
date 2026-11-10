import { bridgesAdapter } from '../../../src/puzzles/edges/adapter';
import { edgeFamily } from '../edges/family';
import { bridgesGenerator } from '../edges/bridges';
/** G5 Bridges: seven packed rungs from 5×5 to grown-up 10×12, slots 60 onward. */
export const bridges = edgeFamily(bridgesGenerator, bridgesAdapter(), [
  'src/puzzles/edges/core.ts', 'src/puzzles/edges/solver.ts', 'src/puzzles/edges/independent.ts', 'src/puzzles/edges/adapter.ts', 'src/puzzles/edges/rungs.ts', 'scripts/puzzles/edges/bridges.ts',
], 'Generated here by growing seeded island networks; every board is graded by named Bridges techniques with no guessing. No imported puzzles.', 256);
