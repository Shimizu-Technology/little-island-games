import { isInheritedRecord, type InheritedRecord, type ReadingPage, type ReadingSentence, type ReadingWord } from "./provenance";
import { refuse } from "./refuse";
import { isMinted, type MintedTask } from "./tasks";

/** Reading content a child may be shown: a record branded by `provenance.ts` or a task minted by `tasks.ts`. */
export type AdmittedReading = InheritedRecord | MintedTask;
/** What `ReadingText` and `TapWords` print: a word, a sentence or a passage page. */
export type ReadableRecord = ReadingWord | ReadingSentence | ReadingPage | MintedTask;

/**
 * The check every reading consumer runs before it shows, speaks or credits anything. A raw string, a hand-made or
 * parsed object, or a copy or spread of a branded record is refused: in development that throws; in a release it
 * returns false, and the consumer shows `REFUSED_TASK_TEXT` with nothing to press, no speech and no credit.
 */
export function admittedReading(record: unknown, where: string): record is AdmittedReading {
  if (isInheritedRecord(record) || isMinted(record)) return true;
  refuse(`${where} was given reading content that did not come from an admitted or pinned inherited record`);
  return false;
}
/** The printed text of a readable record. The words come from the record, never from the caller. */
export const readableText = (r: ReadableRecord): string => ("text" in r ? r.text : r.word);
export { REFUSED_TASK_TEXT } from "./refuse";
