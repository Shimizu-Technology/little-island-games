import type { FamilySpec } from '../../../src/puzzles/types';
import { sudoku } from './sudoku';
/** Add one registered family per owner slice. Proof families stay in proof-families.ts and never ship. */
export const families: FamilySpec<unknown>[] = [sudoku as FamilySpec<unknown>];
