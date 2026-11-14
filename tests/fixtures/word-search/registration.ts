/** Explicit test/dev entry only. Never import this module from src or content. */
import bank from './bank.json';
import { sha256Hex } from '../../../src/puzzles/sha256';
import { defineWordSearch } from '../../../src/puzzles/words/registration';
import type { SearchPuzzle } from '../../../src/puzzles/words/core';
import type { Puzzle } from '../../../src/challenge/types';
export const fixturePuzzles: Puzzle<SearchPuzzle>[] = bank.puzzles.map((p, i) => ({
  ref: { bank: 80, puzzle: i, engine: 'word-search', rules: 1, hash: sha256Hex(JSON.stringify(p)) },
  source: { kind: 'endless', bank: 80, puzzle: i }, path: 'endless', tier: i === 9 ? 6 : 1,
  title: `TEST FIXTURE · ${p.theme}`, descriptor: p as SearchPuzzle,
  dares: [{ slot: 1500 + i, id: `search-fixture-${i}`, label: 'Find every word together', rule: { kind: 'pick-up', objective: 'all-found' }, help: 'allowed' }], awards: [null, null],
}));
export const fixtureRegistration = defineWordSearch([], fixturePuzzles, undefined, 'word-search-fixture-v1');
