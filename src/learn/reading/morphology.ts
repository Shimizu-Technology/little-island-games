import type { PartsWord } from "./records";

/** Word parts for Levels 4 and 5: what an ending or a start does to a base word, checked rather than claimed. */
export type SpellingChange = "none" | "drop-e" | "double" | "y-to-i";
export const SUFFIXES = ["s", "es", "ed", "ing", "er", "est", "ly", "ful"] as const;
export const PREFIXES = ["un", "re"] as const;
export type Suffix = (typeof SUFFIXES)[number];
export type Prefix = (typeof PREFIXES)[number];
const vowel = (c: string | undefined) => !!c && "aeiou".includes(c);
const startsWithVowel = (affix: string) => vowel(affix[0]);
/** A short vowel then one consonant, like hop or sit: the pattern that doubles before a vowel ending. */
const isDoubler = (base: string) =>
  base.length >= 3 && !vowel(base[base.length - 1]) && !"wxy".includes(base[base.length - 1]) &&
  vowel(base[base.length - 2]) && !vowel(base[base.length - 3]) && base.length <= 4 && !/[aeiou]{2}/.test(base);
/**
 * The word an ending or start makes from a base word under a spelling change, or null when the change does not
 * apply to that pair. This is the rule a record's own claim is checked against.
 */
export function applyAffix(base: string, affix: string, kind: "suffix" | "prefix", change: SpellingChange): string | null {
  if (kind === "prefix") return change === "none" ? affix + base : null;
  switch (change) {
    case "none":
      return base + affix;
    case "drop-e":
      return base.endsWith("e") && startsWithVowel(affix) ? base.slice(0, -1) + affix : null;
    case "double":
      return isDoubler(base) && startsWithVowel(affix) ? base + base[base.length - 1] + affix : null;
    case "y-to-i":
      return base.endsWith("y") && !vowel(base[base.length - 2]) && affix[0] !== "i" ? base.slice(0, -1) + "i" + affix : null;
  }
}
/** The base-word piece as it sits inside the finished word (mak in making, hopp in hopping, cri in cried). */
export function stemOf(word: string, affix: string, kind: "suffix" | "prefix"): string {
  return kind === "suffix" ? word.slice(0, word.length - affix.length) : word.slice(affix.length);
}
/**
 * Every ordering of tray pieces that spells a word, as lists of tray positions. A tray is fair only when every
 * way of spelling the word is a way that is accepted, so no clever wrong-looking tile can be right.
 */
export function spellings(tray: readonly string[], word: string, limit = 64): number[][] {
  const out: number[][] = [];
  const used = new Array<boolean>(tray.length).fill(false);
  const walk = (at: number, picked: number[]) => {
    if (out.length >= limit) return;
    if (at === word.length) {
      out.push([...picked]);
      return;
    }
    tray.forEach((piece, i) => {
      if (used[i] || !piece || !word.startsWith(piece, at)) return;
      used[i] = true;
      picked.push(i);
      walk(at + piece.length, picked);
      picked.pop();
      used[i] = false;
    });
  };
  walk(0, []);
  return out;
}

export type Issue = { id: string; problem: string };
const slug = /^[a-z0-9][a-z0-9-]{0,39}$/;
const hasVowel = (c: string) => /[aeiouy]/.test(c);
const bad = (id: string, problem: string): Issue => ({ id, problem });
/** A piece is a string: a regex alone would also pass a nested array or a number, which JSON can hold. */
const piece = (p: unknown): p is string => typeof p === "string" && /^[a-z]{1,8}$/.test(p);
const pieces = (v: unknown, min: number, max: number): v is readonly string[] => Array.isArray(v) && v.length >= min && v.length <= max && v.every(piece);
/**
 * Structure of one word built from pieces. Same rules for fixtures, drafts and reviewed records, and the one
 * validator for both sides of admission: the W1 bake and shipping check (`scripts/words/core.mjs`) load this file,
 * and the app's admitted loader runs it again, so reviewed content that passes shipping cannot fail in the app. It
 * has no runtime imports, so Node can load it by stripping types. It reads untrusted JSON, so it checks types too.
 */
export function partsWordIssues(r: PartsWord): Issue[] {
  const out: Issue[] = [];
  const no = (problem: string) => out.push(bad(r.id, problem));
  if (typeof r.id !== "string" || !slug.test(r.id)) no("id is not a plain slug");
  if (typeof r.word !== "string") return [...out, bad(r.id, "word must be 4-14 lowercase letters")];
  if (!/^[a-z]{4,14}$/.test(r.word)) no("word must be 4-14 lowercase letters");
  if (!["compound", "syllables", "ending", "prefix"].includes(r.kind)) return [...out, bad(r.id, "unknown kind")];
  if (!pieces(r.chunks, 2, 4)) return [...out, bad(r.id, "chunks must be 2-4 lowercase pieces")];
  if (r.chunks.join("") !== r.word) no("chunks do not spell the word");
  const change = r.change ?? "none";
  const level = r.kind === "prefix" || change !== "none" ? 5 : 4;
  if (r.level !== level) no(`level should be ${level} for ${r.kind}${change !== "none" ? " with a spelling change" : ""}`);
  if (r.kind === "compound" && (r.chunks.length !== 2 || r.chunks.some((c) => c.length < 3))) no("a compound is two whole words");
  if (r.kind === "syllables" && !r.chunks.every(hasVowel)) no("every beat needs a vowel sound");
  if (r.kind === "ending" || r.kind === "prefix") {
    const kind = r.kind === "ending" ? "suffix" : "prefix";
    const list: readonly string[] = kind === "suffix" ? SUFFIXES : PREFIXES;
    if (typeof r.base !== "string" || !/^[a-z]{1,10}$/.test(r.base) || typeof r.affix !== "string" || !list.includes(r.affix)) no("an ending or start needs a base word and a known affix");
    else {
      if (applyAffix(r.base, r.affix, kind, change) !== r.word) no("the spelling change does not make this word from its base");
      const stem = stemOf(r.word, r.affix, kind);
      const want = kind === "suffix" ? [stem, r.affix] : [r.affix, stem];
      if (r.chunks.join("|") !== want.join("|")) no("chunks must be the base piece and the affix");
      if (change !== "none" && !r.distractors?.includes(r.base)) no("the unchanged base word must be on the tray as the tempting wrong piece");
    }
    if (typeof r.gloss !== "string" || !/^[a-z ]{3,40}$/.test(r.gloss)) no("gloss must be 3-40 plain lowercase letters");
  } else if (r.base || r.affix || r.change || r.gloss) no("only an ending or a start carries a base, an affix, a change or a gloss");
  if (r.family !== undefined && (typeof r.family !== "string" || !/^[a-z]{2,10}$/.test(r.family))) no("family must be a base word");
  const tray = [...r.chunks, ...(r.distractors ?? [])];
  if (!pieces(r.distractors, 2, 4) || new Set(r.distractors).size !== r.distractors.length || r.distractors.some((d) => r.chunks.includes(d))) no("2-4 distinct wrong pieces that are not right pieces");
  else if (r.alternates !== undefined && (!Array.isArray(r.alternates) || !r.alternates.every((a) => pieces(a, 1, 8)))) no("alternates must be lists of pieces");
  else {
    const accepted = new Set([r.chunks.join("|"), ...(r.alternates ?? []).map((a) => a.join("|"))]);
    for (const a of r.alternates ?? []) if (a.join("") !== r.word || a.join("|") === r.chunks.join("|")) no("an alternate must spell the word a different way");
    for (const order of spellings(tray, r.word)) if (!accepted.has(order.map((i) => tray[i]).join("|"))) no("the tray spells the word a way that is not accepted");
  }
  return out;
}
