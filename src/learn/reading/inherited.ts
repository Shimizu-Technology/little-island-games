import { deepFreeze } from "../../puzzles/descriptor";
import { wordBank } from "../kit/reading";
import { patternsOf, primaryPattern } from "./graphemes";
import type { LetterWord, WordBank } from "./records";
import { levelOfStep, stepForSkill } from "./scope";

/**
 * The words that have shipped since 3.0.0, filed into the kit by pattern. Their tags are derived from their tiles,
 * not copied: the shipped data keeps its own skill and pace, and the kit checks the two agree. These records are
 * "inherited": admitted by a pinned digest of the exact shipped data, never marked as reviewed. They are derived from
 * the frozen snapshot in `provenance.ts`, never from the live source, and are frozen themselves.
 */
/** Digest of the derived records. Editing the shipped words, or how the kit tags them, changes it on purpose. */
export const INHERITED_DIGEST = "713832ce2e0200f82050bf1eb2f5691418b77a4ce798f6f6e7fece2736fd4e91";
export const inheritedWords: WordBank<LetterWord> = deepFreeze({
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
});
