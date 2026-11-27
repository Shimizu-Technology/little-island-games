import type { CreateContext, LearnOptions } from "../../types";
import { pickItems } from "../../skills";
import type { ReadingQuestion } from "../../reading/provenance";
import { exact, familyResult, integer, seat } from "../../kit/reading";

/**
 * Sound Boat native Levels 4 and 5 (when no detached W1 reading bank is admitted yet).
 * Uses the pinned, branded `readingGrowthTracks()["sound-boat"]` records by id, played on
 * the real wooden boat with syllable/affix word-building boxes and word-family sail cards.
 * Pure, untimed, and opt-in Help never leaks the answer before the child asks.
 */
export const VOYAGE_PARTS_COUNT = 6;
export type VoyagePartsLevel = 4 | 5;

export type VoyagePartsState = {
  kind: "voyage-parts";
  level: VoyagePartsLevel;
  ids: string[];
  starter: 0 | 1;
  /** 0..5 while playing; 6 when the boat reaches the island. */
  index: number;
  /** Selected tile indices (for tile-building words) or [choiceIndex] (for word-family cards). */
  draft: number[];
  /** Number of wrong Checks on the current word. */
  misses: number;
  /** True after a missed Check until the child edits their draft. */
  missed: boolean;
  /** True once the child tapped Help on this word. */
  helped: boolean;
  /** True once the current word is solved and waiting for Sail on. */
  solved: boolean;
  /** One entry per sailed word: true iff solved on first try without Help. */
  clean: boolean[];
};

export type VoyagePartsAction =
  | { type: "add"; tile: number }
  | { type: "remove"; at: number }
  | { type: "pick"; choice: number }
  | { type: "check" }
  | { type: "help" }
  | { type: "reset" }
  | { type: "next" };

export const isVoyageParts = (s: unknown): s is VoyagePartsState =>
  !!s && typeof s === "object" && (s as { kind?: unknown }).kind === "voyage-parts";

export const voyagePartsDone = (s: VoyagePartsState) => s.index >= s.ids.length;

export const voyagePartsTurn = (s: VoyagePartsState): 0 | 1 =>
  ((s.starter + Math.min(s.index, Math.max(0, s.ids.length - 1))) % 2) as 0 | 1;

/** For a tile-build word, returns the expected pieces in order. */
export const expectedPieces = (q: ReadingQuestion): string[] =>
  q.tiles ? q.answer.split("|") : [];

/** For a tile-build word, whether the current draft matches the exact answer. */
export function voyagePartsMatches(q: ReadingQuestion, draft: readonly number[]): boolean {
  if (q.tiles) {
    const pieces = expectedPieces(q);
    if (draft.length !== pieces.length) return false;
    return draft.map((i) => q.tiles![i]).join("|") === q.answer;
  }
  if (draft.length !== 1) return false;
  const choice = q.choices[draft[0]];
  return !!choice && choice.value === q.answer;
}

/** Deterministic choice order for word-family items so the answer isn't always first. */
export function orderedChoices(q: ReadingQuestion): readonly { value: string; label: string; originalIndex: number }[] {
  const items = q.choices.map((c, originalIndex) => ({ ...c, originalIndex }));
  let h = 2166136261;
  for (const ch of q.id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  for (let i = items.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const j = h % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * Opt-in Help guidance from the same pure engine:
 * - For tile words: points to the first misplaced tile in the boat, or lights the next needed tray tile.
 * - For word-family words: identifies a calm base-word clue without revealing the choice label.
 */
export function voyagePartsHint(
  q: ReadingQuestion,
  draft: readonly number[],
): { misfitBox: number | null; nextTrayTile: number | null; clueText: string } {
  if (!q.tiles) {
    return {
      misfitBox: null,
      nextTrayTile: null,
      clueText:
        q.skill === "read.family-meaning"
          ? "Look closely at the base word and its prefix or ending to match the meaning."
          : "Find the word that keeps the base word and adds the right start or ending.",
    };
  }
  const pieces = expectedPieces(q);
  for (let i = 0; i < draft.length; i++) {
    if (q.tiles[draft[i]] !== pieces[i]) {
      return {
        misfitBox: i,
        nextTrayTile: null,
        clueText: `Box ${i + 1} does not fit yet. Tap it to take it out and try another piece.`,
      };
    }
  }
  const nextPiece = pieces[draft.length];
  const nextTrayTile =
    nextPiece === undefined
      ? null
      : q.tiles.findIndex((t, idx) => t === nextPiece && !draft.includes(idx));
  return {
    misfitBox: null,
    nextTrayTile: nextTrayTile !== null && nextTrayTile >= 0 ? nextTrayTile : null,
    clueText:
      draft.length === 0
        ? "Start with the glowing first piece on the tray."
        : "Now add the glowing piece to finish the word.",
  };
}

export function createVoyageParts(
  level: VoyagePartsLevel,
  pool: readonly ReadingQuestion[],
  c: CreateContext<unknown>,
): VoyagePartsState {
  const prevIds = isVoyageParts(c.previous) ? new Set(c.previous.ids) : new Set<string>();
  const buildable = pool.filter((q) => !!q.tiles);
  const family = pool.filter((q) => !q.tiles);
  const pickFrom = (list: readonly ReadingQuestion[], count: number) => {
    const fresh = list.filter((q) => !prevIds.has(q.id));
    return pickItems(fresh.length >= count ? fresh : [...list], c.skills, count, c.rng, c.today);
  };
  const chosenBuild = pickFrom(buildable, Math.min(4, buildable.length));
  const chosenFamily = pickFrom(family, Math.min(VOYAGE_PARTS_COUNT - chosenBuild.length, family.length));
  const picked = [...chosenBuild, ...chosenFamily];
  return {
    kind: "voyage-parts",
    level,
    ids: picked.map((q) => q.id),
    starter: c.starter,
    index: 0,
    draft: [],
    misses: 0,
    missed: false,
    helped: false,
    solved: false,
    clean: [],
  };
}

export function voyagePartsMove(
  s: VoyagePartsState,
  a: VoyagePartsAction,
  q: ReadingQuestion | undefined,
): VoyagePartsState {
  if (voyagePartsDone(s) || !q) return s;
  if (a.type === "next") {
    if (!s.solved) return s;
    return {
      ...s,
      index: s.index + 1,
      draft: [],
      misses: 0,
      missed: false,
      helped: false,
      solved: false,
      clean: [...s.clean, s.misses === 0 && !s.helped],
    };
  }
  if (s.solved) return s;
  if (a.type === "help") {
    return s.helped ? s : { ...s, helped: true };
  }
  if (a.type === "reset") {
    return s.draft.length === 0 && !s.missed ? s : { ...s, draft: [], missed: false };
  }
  if (a.type === "add") {
    if (!q.tiles) return s;
    const need = expectedPieces(q).length;
    if (s.draft.length >= need || !integer(a.tile, q.tiles.length - 1) || s.draft.includes(a.tile)) return s;
    return { ...s, draft: [...s.draft, a.tile], missed: false };
  }
  if (a.type === "remove") {
    if (!q.tiles || !integer(a.at, s.draft.length - 1)) return s;
    const next = [...s.draft];
    next.splice(a.at, 1);
    return { ...s, draft: next, missed: false };
  }
  if (a.type === "pick") {
    if (q.tiles || !integer(a.choice, q.choices.length - 1)) return s;
    if (s.draft.length === 1 && s.draft[0] === a.choice && !s.missed) return s;
    return { ...s, draft: [a.choice], missed: false };
  }
  if (a.type === "check") {
    const need = q.tiles ? expectedPieces(q).length : 1;
    if (s.draft.length !== need || s.missed) return s;
    if (voyagePartsMatches(q, s.draft)) {
      return { ...s, solved: true, missed: false };
    }
    return { ...s, misses: Math.min(500, s.misses + 1), missed: true };
  }
  return s;
}

export function validVoyageParts(
  v: unknown,
  level: VoyagePartsLevel,
  lookup: (id: unknown) => ReadingQuestion | undefined,
): v is VoyagePartsState {
  if (!exact(v, ["kind", "level", "ids", "starter", "index", "draft", "misses", "missed", "helped", "solved", "clean"])) {
    return false;
  }
  const s = v as unknown as VoyagePartsState;
  if (
    s.kind !== "voyage-parts" ||
    s.level !== level ||
    !seat(s.starter) ||
    !Array.isArray(s.ids) ||
    s.ids.length !== VOYAGE_PARTS_COUNT ||
    new Set(s.ids).size !== VOYAGE_PARTS_COUNT ||
    !s.ids.every((id) => typeof id === "string" && !!lookup(id)) ||
    !integer(s.index, VOYAGE_PARTS_COUNT) ||
    !Array.isArray(s.clean) ||
    s.clean.length !== s.index ||
    !s.clean.every((b) => typeof b === "boolean") ||
    !integer(s.misses, 500) ||
    typeof s.missed !== "boolean" ||
    typeof s.helped !== "boolean" ||
    typeof s.solved !== "boolean" ||
    !Array.isArray(s.draft)
  ) {
    return false;
  }
  if (s.index === VOYAGE_PARTS_COUNT) {
    return s.draft.length === 0 && s.misses === 0 && !s.missed && !s.helped && !s.solved;
  }
  const q = lookup(s.ids[s.index]);
  if (!q) return false;
  if (q.tiles) {
    const need = expectedPieces(q).length;
    if (s.draft.length > need || new Set(s.draft).size !== s.draft.length) return false;
    if (!s.draft.every((i) => integer(i, q.tiles!.length - 1))) return false;
  } else {
    if (s.draft.length > 1 || !s.draft.every((i) => integer(i, q.choices.length - 1))) return false;
  }
  if (s.solved) return !s.missed && voyagePartsMatches(q, s.draft);
  if (s.missed) return s.misses > 0 && !voyagePartsMatches(q, s.draft);
  return true;
}

export function voyagePartsOutcome(s: VoyagePartsState, o: LearnOptions) {
  if (!voyagePartsDone(s)) return null;
  return o.mode === "versus" ? familyResult(s.clean, s.starter) : ("done" as const);
}
