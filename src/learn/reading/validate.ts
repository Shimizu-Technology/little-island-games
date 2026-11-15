import { canonical } from "../../puzzles/descriptor";
import { sha256Hex } from "../../puzzles/sha256";
import { tokens } from "../kit/reading";
import { patternsOf, primaryPattern, tilesSpell } from "./graphemes";
import { PREFIXES, SUFFIXES, applyAffix, spellings, stemOf } from "./morphology";
import type { LetterWord, PartsDraft, PartsWord, ReadingText, WordBank } from "./records";
import { levelOfStep, stepIds, taughtThrough, type ReadingLevel } from "./scope";

export type Issue = { id: string; problem: string };
const bad = (id: string, problem: string): Issue => ({ id, problem });
const slug = /^[a-z0-9][a-z0-9-]{0,39}$/;
const hasVowel = (c: string) => /[aeiouy]/.test(c);

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

/** Structure of one word built from pieces. Same rules for fixtures, drafts and reviewed records. */
export function partsWordIssues(r: PartsWord): Issue[] {
  const out: Issue[] = [];
  const no = (problem: string) => out.push(bad(r.id, problem));
  if (!slug.test(r.id)) no("id is not a plain slug");
  if (!/^[a-z]{4,14}$/.test(r.word)) no("word must be 4-14 lowercase letters");
  if (!["compound", "syllables", "ending", "prefix"].includes(r.kind)) return [...out, bad(r.id, "unknown kind")];
  if (!Array.isArray(r.chunks) || r.chunks.length < 2 || r.chunks.length > 4 || !r.chunks.every((c) => /^[a-z]{1,8}$/.test(c))) return [...out, bad(r.id, "chunks must be 2-4 lowercase pieces")];
  if (r.chunks.join("") !== r.word) no("chunks do not spell the word");
  const change = r.change ?? "none";
  const level = r.kind === "prefix" || change !== "none" ? 5 : 4;
  if (r.level !== level) no(`level should be ${level} for ${r.kind}${change !== "none" ? " with a spelling change" : ""}`);
  if (r.kind === "compound" && (r.chunks.length !== 2 || r.chunks.some((c) => c.length < 3))) no("a compound is two whole words");
  if (r.kind === "syllables" && !r.chunks.every(hasVowel)) no("every beat needs a vowel sound");
  if (r.kind === "ending" || r.kind === "prefix") {
    const kind = r.kind === "ending" ? "suffix" : "prefix";
    const list: readonly string[] = kind === "suffix" ? SUFFIXES : PREFIXES;
    if (!r.base || !r.affix || !list.includes(r.affix)) no("an ending or start needs a base word and a known affix");
    else {
      if (applyAffix(r.base, r.affix, kind, change) !== r.word) no("the spelling change does not make this word from its base");
      const stem = stemOf(r.word, r.affix, kind);
      const want = kind === "suffix" ? [stem, r.affix] : [r.affix, stem];
      if (r.chunks.join("|") !== want.join("|")) no("chunks must be the base piece and the affix");
      if (change !== "none" && !r.distractors?.includes(r.base)) no("the unchanged base word must be on the tray as the tempting wrong piece");
    }
    if (typeof r.gloss !== "string" || !/^[a-z ]{3,40}$/.test(r.gloss)) no("gloss must be 3-40 plain lowercase letters");
  } else if (r.base || r.affix || r.change || r.gloss) no("only an ending or a start carries a base, an affix, a change or a gloss");
  if (r.family !== undefined && !/^[a-z]{2,10}$/.test(r.family)) no("family must be a base word");
  const tray = [...r.chunks, ...(r.distractors ?? [])];
  if (!Array.isArray(r.distractors) || r.distractors.length < 2 || r.distractors.length > 4 || !r.distractors.every((d) => /^[a-z]{1,8}$/.test(d)) || new Set(r.distractors).size !== r.distractors.length || r.distractors.some((d) => r.chunks.includes(d))) no("2-4 distinct wrong pieces that are not right pieces");
  else {
    const accepted = new Set([r.chunks.join("|"), ...(r.alternates ?? []).map((a) => a.join("|"))]);
    for (const a of r.alternates ?? []) if (a.join("") !== r.word || a.join("|") === r.chunks.join("|")) no("an alternate must spell the word a different way");
    for (const order of spellings(tray, r.word)) if (!accepted.has(order.map((i) => tray[i]).join("|"))) no("the tray spells the word a way that is not accepted");
  }
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
