import { sha256Hex } from "../../puzzles/sha256";
import { random } from "../../games/types";
import type { AnswerRules } from "../../puzzles/wholeAnswer";
import { isSilentETile } from "./graphemes";
import type { ReadingLevel } from "./scope";

/**
 * Building one word on the boat from pieces: letter sounds at Levels 1-3, word parts at Levels 4-5. The same pure
 * rules serve the School board and the Challenge replay, so what a hint says and what Check accepts never differ.
 * Nothing here reads a clock. Tasks are made only by `tasks.ts`, from admitted or pinned inherited records, by id.
 */
export type BuildTask = {
  id: string;
  word: string;
  level: ReadingLevel;
  skill: string;
  /** The right pieces, left to right. */
  tiles: readonly string[];
  /** Everything on offer, in a fixed order for this word. Pieces may repeat (ba, na, na). */
  tray: readonly string[];
  /** Other right orders. */
  alternates: readonly (readonly string[])[];
  /** What an ending or start does, shown once the word is built. */
  cue: { base: string; affix: string; gloss: string; prefix: boolean } | null;
};
/** Tray positions already placed in the boxes, left to right. */
export type BuildDraft = number[];
export type BuildEdit = ["a", number] | ["x", number];

export const hashOf = (text: string) => parseInt(sha256Hex(text).slice(0, 8), 16);
export function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = [...items], rng = random(seed);
  for (let k = out.length - 1; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    [out[k], out[j]] = [out[j], out[k]];
  }
  return out;
}
const accepted = (t: BuildTask): (readonly string[])[] => [t.tiles, ...t.alternates];

export const hasSilentE = (t: BuildTask) => t.tiles.some(isSilentETile);

export const draftTexts = (t: BuildTask, draft: readonly number[]): string[] => draft.map((i) => t.tray[i]);
/** How many leading pieces of the draft agree with the best-matching accepted order. */
function lead(t: BuildTask, texts: readonly string[]): { order: readonly string[]; agree: number } {
  let best = { order: t.tiles, agree: -1 };
  for (const order of accepted(t)) {
    let n = 0;
    while (n < texts.length && n < order.length && texts[n] === order[n]) n++;
    if (n > best.agree) best = { order, agree: n };
  }
  return best;
}
/** The first placed piece that does not fit, or null when the draft so far is the start of a right answer. */
export function firstMisfit(t: BuildTask, draft: readonly number[]): number | null {
  const { agree } = lead(t, draftTexts(t, draft));
  return agree < draft.length ? agree : null;
}
/** The unused tray position holding the next piece a right answer needs, or null when something placed is wrong or full. */
export function nextNeeded(t: BuildTask, draft: readonly number[]): number | null {
  const texts = draftTexts(t, draft), { order, agree } = lead(t, texts);
  if (agree < texts.length || agree >= order.length) return null;
  const at = t.tray.findIndex((p, i) => p === order[agree] && !draft.includes(i));
  return at < 0 ? null : at;
}

const validDraft = (draft: unknown, t: BuildTask): draft is BuildDraft =>
  Array.isArray(draft) && draft.length <= t.tiles.length && new Set(draft).size === draft.length &&
  draft.every((i) => Number.isInteger(i) && i >= 0 && i < t.tray.length);
export const buildRules: AnswerRules<BuildTask, BuildDraft, BuildEdit> = {
  initial: () => [],
  valid: (draft, t) => validDraft(draft, t),
  edit: (draft, [kind, at], t) => {
    if (kind === "a") return at >= 0 && at < t.tray.length && !draft.includes(at) && draft.length < t.tiles.length ? [...draft, at] : draft;
    return at >= 0 && at < draft.length ? draft.filter((_, k) => k !== at) : draft;
  },
  complete: (draft, t) => draft.length === t.tiles.length,
  accepts: (draft, t) => {
    const texts = draftTexts(t, draft);
    return accepted(t).some((order) => order.length === texts.length && order.every((p, k) => p === texts[k]));
  },
};
export const validBuildEdit = (v: unknown, tray: number): v is BuildEdit =>
  Array.isArray(v) && v.length === 2 && (v[0] === "a" || v[0] === "x") && Number.isInteger(v[1]) && v[1] >= 0 && v[1] < Math.max(tray, 8);
