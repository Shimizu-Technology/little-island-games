import type { LatinGenerator } from './family';
import { sudokuGenerator } from './sudoku';
/** Every G3 generator by family id. */
export const generators: Record<string, LatinGenerator> = { sudoku: sudokuGenerator };
