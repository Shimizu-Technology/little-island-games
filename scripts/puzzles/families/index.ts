import { logicLagoonFamily } from '../logic-lagoon/family';
import type { FamilySpec } from '../../../src/puzzles/types';
import { slipTideFamily } from './slip-tide';
import { canoeSeatsFamily } from './canoe-seats';
import { shellScaleFamily } from './shell-scale';
import { sudoku } from './sudoku';
import { cageMath, greaterThan, killer, skyline } from './latin-variants';
import { bridges } from './bridges';
import { loop, pearlLoop } from './loops';
import { wordSearch } from './word-search';
import {klondike,freecell} from '../solitaire/family';
import root from '../../../src/content/puzzles/root.json';
/** Add one registered family per owner slice. Proof families stay in proof-families.ts and never ship. */
export const families: FamilySpec<unknown>[] = [logicLagoonFamily as unknown as FamilySpec<unknown>, slipTideFamily as unknown as FamilySpec<unknown>, canoeSeatsFamily as unknown as FamilySpec<unknown>, shellScaleFamily as unknown as FamilySpec<unknown>, ...[...(root.families.some(row=>row[0]==='solitaire')?[klondike]:[]), ...(root.families.some(row=>row[0]==='freecell')?[freecell]:[]), sudoku, cageMath, greaterThan, skyline, killer, bridges, loop, pearlLoop, ...(root.families.some(row=>row[0]==='word-search') ? [wordSearch] : [])] as FamilySpec<unknown>[]];
