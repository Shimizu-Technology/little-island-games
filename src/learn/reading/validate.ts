import { canonical } from "../../puzzles/descriptor";
import { sha256Hex } from "../../puzzles/sha256";
import { tokens } from "../kit/reading";
import { patternsOf, primaryPattern, tilesSpell } from "./graphemes";
import { partsWordIssues, type Issue } from "./morphology";
import type { LetterWord, PartsDraft, ReadingText, WordBank } from "./records";
import { levelOfStep, stepIds, taughtThrough, type ReadingLevel } from "./scope";

export { partsWordIssues };
export type { Issue };
const bad = (id: string, problem: string): Issue => ({ id, problem });
const slug = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** Structure of one decodable word: its tiles spell it and its tags are exactly what the tiles show. */
export function letterWordIssues(r: LetterWord): Issue[] {
  const out: Issue[] = [];
  if (!slug.test(r.id)) out.push(bad(r.id, "id is not a plain slug"));
  if (!/^[a-z]{1,8}$/.test(r.word)) out.push(bad(r.id, "word must be 1-8 lowercase letters"));
  if (tilesSpell(r.tiles) !== r.word) out.push(bad(r.id, "tiles do not spell the word"));
  const shown = patternsOf(r.tiles);
  if (shown.join() !== [...r.patterns].join()) out.push(bad(r.id, "patterns differ from what the tiles show"));
  const primary = primaryPattern(r.tiles);
  if (!primary || r.step !== primary) out.push(bad(r.id, "word is filed under the wrong pattern"));
  else if (levelOfStep(primary) !== r.level) out.push(bad(r.id, "level differs from the pattern's level"));
  return out;
}

/** Whole-bank rules that need every record in view. */
export function bankIssues<R extends { id: string; word?: string; status: string }>(bank: WordBank<R>, perRecord: (r: R) => Issue[]): Issue[] {
  const out: Issue[] = [];
  if (bank.schemaVersion !== 1 || !slug.test(bank.id) || typeof bank.fixture !== "boolean" || !Array.isArray(bank.records) || !bank.records.length) return [bad(bank.id ?? "bank", "bank must be schema 1 with a slug id, a fixture flag and records")];
  const ids = new Set<string>(), words = new Set<string>();
  for (const r of bank.records) {
    if (ids.has(r.id)) out.push(bad(r.id, "duplicate id"));
    ids.add(r.id);
    if (r.word !== undefined) {
      if (words.has(r.word)) out.push(bad(r.id, "duplicate word"));
      words.add(r.word);
    }
    if (bank.fixture ? r.status !== "fixture" : r.status === "fixture") out.push(bad(r.id, bank.fixture ? "a fixture bank holds only fixture records" : "fixture records cannot sit in a real bank"));
    out.push(...perRecord(r));
  }
  return out;
}
export const partsBankIssues = (bank: WordBank<PartsDraft>) => bankIssues(bank, partsWordIssues);
export const letterBankIssues = (bank: WordBank<LetterWord>) => bankIssues(bank, letterWordIssues);

/**
 * Inherited records are admitted only by a pinned digest of the exact shipped data. Reviewed content has no entry
 * here: it ships only through the detached W1 admission (`scripts/words`, manifest, runtime projection).
 */
export function inheritedIssues(bank: WordBank<{ id: string; status: string }>, pinned: string): Issue[] {
  const out: Issue[] = [];
  for (const r of bank.records) if (r.status !== "inherited") out.push(bad(r.id, `${r.status} records are not inherited`));
  if (bank.fixture) out.push(bad(bank.id, "a fixture bank can never ship"));
  if (bankDigest(bank) !== pinned) out.push(bad(bank.id, "inherited records do not match the pinned shipped data"));
  return out;
}
export const bankDigest = (bank: WordBank<unknown>): string => sha256Hex(canonical(bank.records));

/** Every word a child can meet, filed by the newest pattern in it. */
export type Lexicon = ReadonlyMap<string, ReadingLevel>;
export function lexiconOf(...banks: readonly WordBank<LetterWord>[]): Lexicon {
  const map = new Map<string, ReadingLevel>();
  for (const bank of banks) for (const r of bank.records) map.set(r.word, r.level);
  return map;
}
/**
 * A text is decodable at a level when every word in it is a word the lexicon files at or below that level, or is
 * on the text's own list of sight words. Unknown words fail closed, and a sight word that is not in the text fails too.
 */
export function textIssues(r: ReadingText, lexicon: Lexicon): Issue[] {
  const out: Issue[] = [];
  const no = (problem: string) => out.push(bad(r.id, problem));
  if (!slug.test(r.id)) no("id is not a plain slug");
  const words = tokens(r.text);
  const limit = r.kind === "sentence" ? 14 : 140;
  if (!words.length || words.length > limit) no(`a ${r.kind} holds 1-${limit} words`);
  if (/[0-9]/.test(r.text) || !/[.!?]$/.test(r.text.trim())) no("text must end in . ! or ? and hold no digits");
  if (![1, 2, 3, 4, 5].includes(r.level)) no("level must be 1-5");
  const tricky = new Set(r.tricky);
  if (tricky.size !== r.tricky.length || r.tricky.length > 12 || !r.tricky.every((w) => /^[a-z]+$/.test(w))) no("sight words must be 12 or fewer distinct plain words");
  for (const w of tricky) if (!words.includes(w)) no(`sight word "${w}" is not in the text`);
  for (const w of new Set(words)) {
    if (tricky.has(w)) continue;
    const at = lexicon.get(w);
    if (at === undefined) no(`"${w}" is not a known decodable word`);
    else if (at > r.level) no(`"${w}" needs Level ${at}, above this text's Level ${r.level}`);
  }
  if (!r.steps.length || !r.steps.every((s) => stepIds.includes(s) && taughtThrough(r.level).includes(s))) no("steps must be taught by this text's level");
  return out;
}
