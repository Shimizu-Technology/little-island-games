import { latinFamily } from '../latin/family';
import { sudokuGenerator } from '../latin/sudoku';
/** G3 Sudoku: nine rungs from 4×4 singles to grown-up 9×9, packed in slots 40 onward. */
export const sudoku = latinFamily(sudokuGenerator, ['scripts/puzzles/latin/sudoku.ts']);
