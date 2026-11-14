import { sha256Hex } from "../../puzzles/sha256";
import { canonical } from "../../puzzles/descriptor";
import type { SpellingChange } from "./morphology";
import type { ReadingLevel, StepId } from "./scope";

/**
 * Where a record stands. Only the lead's two-reviewer process (W1/W2 tooling) can move a record to "reviewed";
 * nothing in the app or its tests writes that status, and no field here is ever filled in by hand.
 * - inherited: shipped in 3.0.0 before this process. Admitted only by a pinned digest of the exact shipped data.
 * - draft: written, not yet reviewed. Never ships.
 * - fixture: invented for tests and the dev harness. Never ships.
 * - reviewed: carries complete review evidence bound to the record's exact content.
 */
export type RecordStatus = "inherited" | "draft" | "fixture" | "reviewed";
export type ReviewerRun = {
  /** Reviewer identity label. */
  id: string;
  family: "openai" | "anthropic" | "google";
  model: string;
  runId: string;
  verdict: "keep";
  transcriptSha256: string;
  startedAt: string;
  finishedAt: string;
};
export type ReviewEvidence = {
  batchSha256: string;
  /** Hash of the record's content at review time. A later edit makes it stale. */
  contentSha256: string;
  reviews: readonly [ReviewerRun, ReviewerRun];
  lead: { reviewer: string; decision: "keep"; reconciliationSha256: string; startedAt: string; finishedAt: string };
};
type Reviewable = { status: RecordStatus; review?: ReviewEvidence };

/** A decodable word tagged by pattern: its tiles are the sounds, left to right (a silent e is written a_e). */
export type LetterWord = Reviewable & {
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
export type PartsWord = Reviewable & {
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
export type WordBank<R> = { schemaVersion: 1; id: string; fixture: boolean; records: readonly R[] };

/** A sentence or short passage written to be read with the patterns taught so far. */
export type ReadingText = Reviewable & {
  id: string;
  kind: "sentence" | "passage";
  text: string;
  level: ReadingLevel;
  /** Patterns this text practises. */
  steps: readonly StepId[];
  /** Irregular words the page asks a child to know by sight, listed on purpose and never inferred. */
  tricky: readonly string[];
};

/** What a review is about: the record without its status and evidence. */
export function contentOf<R extends Reviewable>(record: R): Omit<R, "status" | "review"> {
  const { status: _status, review: _review, ...content } = record;
  return content;
}
export const contentHash = (record: Reviewable): string => sha256Hex(canonical(contentOf(record)));
