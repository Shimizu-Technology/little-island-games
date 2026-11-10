import type { LatinGenerator } from './family';
import { sudokuGenerator } from './sudoku';
import { cageMathGenerator, greaterGenerator, killerGenerator, skylineGenerator } from './variants';
/** Every G3 generator by family id. */
export const generators: Record<string, LatinGenerator> = { sudoku: sudokuGenerator, 'cage-math': cageMathGenerator, 'greater-than': greaterGenerator, skyline: skylineGenerator, killer: killerGenerator };
