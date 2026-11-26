import type { FamilyManifest } from '../../puzzles/bank';
import manifest from '../../puzzles/picture-grid/manifest.generated.json';
import { definePictureGrid, pictureGridBankFacts, type Action, type Payload, type State } from '../../puzzles/picture-grid/registration';

/** G4a Picture Grid: four packed bands (110–113) from 5×5 Easy to 15×15 Expert, plus in-memory Draw a Puzzle. */
export const qaMechanics = ['M03', 'M04'] as const;
export const registration = definePictureGrid(pictureGridBankFacts(manifest as unknown as FamilyManifest));
export type { Action, Payload, State };
