import { lineAdapter } from '../../../src/puzzles/lines/adapter';
import { edgeFamily } from '../edges/family';
import { loopGenerator, pearlGenerator } from '../lines/loops';
const sources = ['src/puzzles/lines/core.ts', 'src/puzzles/lines/solver.ts', 'src/puzzles/lines/independent.ts', 'src/puzzles/lines/adapter.ts', 'src/puzzles/lines/rungs.ts', 'scripts/puzzles/lines/loops.ts'];
const note = 'Generated here from seeded loop shapes; clues are removed only while named loop techniques still finish the board with no guessing. No imported puzzles.';
/** G5 Loop: six packed rungs from 5×5 to grown-up 10×12, slots 67 onward. */
export const loop = edgeFamily(loopGenerator, lineAdapter('loop'), sources, note, 256);
/** G5 Pearl Loop: a small pack of three rungs, 6×6 to 8×8, slots 74 onward. */
export const pearlLoop = edgeFamily(pearlGenerator, lineAdapter('pearl-loop'), sources, note, 256);
