import { latinFamily } from '../latin/family';
import { cageMathGenerator, greaterGenerator, killerGenerator, skylineGenerator } from '../latin/variants';
const sources = ['scripts/puzzles/latin/variants.ts'];
/** G3 Latin variants on the Sudoku core, packed in slots 48–58. */
export const cageMath = latinFamily(cageMathGenerator, sources);
export const greaterThan = latinFamily(greaterGenerator, sources);
export const skyline = latinFamily(skylineGenerator, sources);
export const killer = latinFamily(killerGenerator, sources);
