import { WORDS } from "../content/reading/words";
import { wordBank } from "../kit/reading";
import { patternsOf, primaryPattern } from "./graphemes";
import type { LetterWord, WordBank } from "./records";
import { levelOfStep, stepForSkill } from "./scope";

/**
 * The words that have shipped since 3.0.0, filed into the kit by pattern. Their tags are derived from their tiles,
 * not copied: the shipped data keeps its own skill and pace, and the kit checks the two agree. These records are
 * "inherited": admitted by a pinned digest of the exact shipped data, never marked as reviewed.
 */
/** Digest of the derived records. Editing the shipped words, or how the kit tags them, changes it on purpose. */
export const INHERITED_DIGEST = "713832ce2e0200f82050bf1eb2f5691418b77a4ce798f6f6e7fece2736fd4e91";
export const inheritedWords: WordBank<LetterWord> = {
  schemaVersion: 1,
  id: "inherited-3-0-0",
  fixture: false,
  records: wordBank.map((w) => {
    const step = primaryPattern(w.tiles) ?? stepForSkill(w.skill)!;
    return {
      id: `w-${w.word}`,
      status: "inherited" as const,
      word: w.word,
      tiles: [...w.tiles],
      level: levelOfStep(step) as 1 | 2 | 3,
      step,
      patterns: patternsOf(w.tiles),
    };
  }),
};
/**
 * Every other reading source that has shipped since before this process (Which One's sentences, Turtle Tales' stories,
 * the picture words and the ladders), pinned the same way: a digest of each module's exact exported data, checked by
 * `tests/sound-boat-provenance.test.tsx`. Adding, removing or editing a word in any of them changes its digest and
 * fails the gate; new reading data goes through W1 admission instead.
 */
export const INHERITED_SOURCE_DIGESTS: Readonly<Record<string, string>> = {
  clues: "20aa0c8cf42c3135e9d25b38a0acc92cab7dd70e6cb9f0cbeb5817b612933457",
  ladders: "f75c86b133962f71883c8fe50283150fa5192243de4f9cd835f2bc6f0292cc52",
  sentences: "327d4e626c00f1ff87a9bb2c264f7e5743b4a548339923ce215324c7475675de",
  stories: "999c10ba0fc3ac29b75f228c4b84885eb9949b3080d5fd343c7edd034c78c1f3",
  words: "7822bf690a6860a8e494be4ee5b051155cb034b230489c4464ceb40f65f05d06",
};
/** The shipped data this bank was derived from, for the digest test. */
export const inheritedSource = WORDS;
