import type { FamilySpec } from '../../../src/puzzles/types';
import { slipTideFamily } from './slip-tide';
import { sudoku } from './sudoku';
import { cageMath, greaterThan, killer, skyline } from './latin-variants';
import { bridges } from './bridges';
import { loop, pearlLoop } from './loops';
/** Add one registered family per owner slice. Proof families stay in proof-families.ts and never ship. */
export const families: FamilySpec<unknown>[] = [slipTideFamily as unknown as FamilySpec<unknown>, ...[sudoku, cageMath, greaterThan, skyline, killer, bridges, loop, pearlLoop] as FamilySpec<unknown>[]];
