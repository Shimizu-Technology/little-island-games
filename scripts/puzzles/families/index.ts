import type { FamilySpec } from '../../../src/puzzles/types';
import { slipTideFamily } from './slip-tide';
/** Add one registered family per owner slice. Proof families stay in proof-families.ts and never ship. */
export const families: FamilySpec<unknown>[] = [slipTideFamily as unknown as FamilySpec<unknown>];
