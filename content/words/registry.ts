import { bankLoaders, readingBankLoaders } from './registry.generated';
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

/** Lead contract change: W1 reading records. Runtime projection of a detached-admitted Sound Boat word-parts bank. */
export type ReadingBank = {
  schemaVersion: 1;
  kind: 'reading-parts';
  words: {
    id: string; word: string; level: 4 | 5; kind: 'compound' | 'syllables' | 'ending' | 'prefix';
    chunks: string[]; distractors: string[];
    base?: string; affix?: string; change?: 'none' | 'drop-e' | 'double' | 'y-to-i'; gloss?: string; family?: string;
    alternates?: string[][];
  }[];
};
/** Ids of the reading banks the manifest admits, in manifest order. Empty until the lead admits one. */
export const readingBankIds: readonly string[] = Object.keys(readingBankLoaders).sort();
export function loadReadingBank(id: string): ReadingBank {
  if (!Object.hasOwn(readingBankLoaders, id)) throw new Error('Unknown admitted reading bank');
  return readingBankLoaders[id]();
}
