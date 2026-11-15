import { loadReadingBank, readingBankIds, type ReadingBank } from "../../../../content/words/registry";
import type { PartsWord } from "../records";
import { partsWordIssues } from "../validate";

/**
 * The only door from reviewed reading content into the app, and it is the W1 door: banks come from the word
 * registry, which lists only manifest-registered banks that passed detached admission (locked private policy, blind
 * packets, two reviews with their transcripts, the lead's reconciliation and the family sample, rebaked at every
 * shipping gate). Nothing is listed here by hand and no record carries its own approval. Until a bank is admitted
 * this is empty and the apps that read it fall back to what shipped before.
 *
 * Banks are the runtime projection (no review state), so this also runs the kit's own piece and spelling rules over
 * them, in addition to the build-time check, and refuses a bank that breaks them.
 */
/** The runtime projection's closed record keys, the same list W1 shipping enforces (`READING_KEYS` in scripts/words/core.mjs). */
const KEYS = ["id", "word", "level", "kind", "chunks", "distractors", "base", "affix", "change", "gloss", "family", "alternates"];
export function admitParts(banks: readonly ReadingBank[]): PartsWord[] {
  const ids = new Set<string>(), words = new Set<string>(), out: PartsWord[] = [];
  for (const bank of banks) {
    if (bank?.schemaVersion !== 1 || bank.kind !== "reading-parts" || !Array.isArray(bank.words)) throw new Error("Reading bank has the wrong shape");
    for (const w of bank.words as PartsWord[]) {
      if (Object.prototype.toString.call(w) !== "[object Object]" || !Object.keys(w).every((k) => KEYS.includes(k))) throw new Error("Reading bank is malformed: a record has unexpected fields");
      const issues = partsWordIssues(w);
      if (issues.length) throw new Error(`Reading bank is malformed: ${issues[0].id}: ${issues[0].problem}`);
      if (ids.has(w.id) || words.has(w.word)) throw new Error(`Reading bank repeats ${w.id}`);
      ids.add(w.id);
      words.add(w.word);
      out.push(w);
    }
  }
  return out;
}
export const admittedParts: readonly PartsWord[] = admitParts(readingBankIds.map(loadReadingBank));
