import { bankLoaders } from './registry.generated';
export { legacyWordRescue } from './legacy-word-rescue';

export type WordBank = {
  schemaVersion: 1;
  words: {
    id: string; spelling: string; language: 'en' | 'ch'; readerLevel: string;
    knownBand: number; readBand: number; spellBand: number; clueBand: number;
    theme: string; topic: string; guamFit: number; audio: string | null;
    canonicalId?: string; fluentReaderChecked?: false;
  }[];
  clues: {id: string; wordId: string; text: string}[];
  surfaces: {id: string; kind: string; wordIds: string[]; cells?: string[][];
    listed?: {wordId: string; answer: string; cells: [number, number][]}[];
    shuffle?: string; letters?: string}[];
  accept: string[];
};

/** The only application entry point for new baked word/clue data. */
export function loadWordBank(id: string): WordBank {
  if (!Object.hasOwn(bankLoaders, id)) throw new Error('Unknown admitted word bank');
  return bankLoaders[id]();
}
