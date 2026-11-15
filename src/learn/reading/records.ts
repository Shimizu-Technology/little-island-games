import type { SpellingChange } from "./morphology";
import type { ReadingLevel, StepId } from "./scope";

/**
 * Where a record stands in this tree. Nothing here can be "reviewed": review is detached W1 evidence (two blind
 * reviewers, the lead's reconciliation and Leon's family sample) checked by `scripts/words`, and a record that passes
 * ships only as the runtime projection of a manifest-registered bank (`content/words`). No field in this file is
 * approval, and no test or tool writes one.
 * - inherited: shipped in 3.0.0 before this process, pinned by a digest of the exact shipped data.
 * - draft: written, not yet reviewed. Never ships.
 * - fixture: invented for tests and the dev harness. Never ships.
 */
export type RecordStatus = "inherited" | "draft" | "fixture";
type Filed = { status: RecordStatus };

/** A decodable word tagged by pattern: its tiles are the sounds, left to right (a silent e is written a_e). */
export type LetterWord = Filed & {
  id: string;
  word: string;
  tiles: readonly string[];
  level: 1 | 2 | 3;
  /** The newest idea in the word, the one it is filed under. */
  step: StepId;
  /** Every taught pattern the tiles show. */
  patterns: readonly StepId[];
};

/** A word Sound Boat Levels 4 and 5 build from pieces on the boat. */
export type PartsKind = "compound" | "syllables" | "ending" | "prefix";
export type PartsWord = {
  id: string;
  word: string;
  level: 4 | 5;
  kind: PartsKind;
  /** The pieces, left to right, exactly as they sit inside the finished word. */
  chunks: readonly string[];
  /** Tempting wrong pieces on the tray. For a spelling change the unchanged base word must be among them. */
  distractors: readonly string[];
  /** Endings and starts only. */
  base?: string;
  affix?: string;
  change?: SpellingChange;
  /** Plain words for what the ending or start does, shown once the word is built. */
  gloss?: string;
  /** Other words made from the same base word. */
  family?: string;
  /** Other piece orders that are also right. */
  alternates?: readonly (readonly string[])[];
};
/** A parts record in the review process: the same content plus where it stands. It carries no approval. */
export type PartsDraft = Filed & PartsWord;
export type WordBank<R> = { schemaVersion: 1; id: string; fixture: boolean; records: readonly R[] };

/** A sentence or short passage written to be read with the patterns taught so far. */
export type ReadingText = Filed & {
  id: string;
  kind: "sentence" | "passage";
  text: string;
  level: ReadingLevel;
  /** Patterns this text practises. */
  steps: readonly StepId[];
  /** Irregular words the page asks a child to know by sight, listed on purpose and never inferred. */
  tricky: readonly string[];
};
