import type { CreateContext, LearnOptions } from "../../types";
import { pickItems } from "../../skills";
import type { ReadingQuestion } from "../../reading/provenance";
import { bools, exact, familyResult, integer, seat } from "../../kit/reading";

/**
 * Which One? native Levels 4 & 5: interactive multi-clue deductive elimination board.
 * Uses the pinned, branded `readingGrowthTracks()["which-one"]` records by id.
 * Players read condition, reference, negation, and cause-effect clues, optionally cross out
 * ruled-out candidate cards, and select the matching choice. Completely untimed.
 */
export const CLUE_ROUND_COUNT = 6;
export type ClueLevel = 4 | 5;

export type WhichClueState = {
  kind: "which-clues";
  level: ClueLevel;
  ids: string[];
  orders: number[][];
  starter: 0 | 1;
  index: number;
  /** Candidate positions (in displayed order 0..2) the child crossed out as eliminated. */
  crossed: number[];
  /** Candidate positions wrongly picked on this question. */
  wrong: number[];
  /** True once the child tapped Help or made a miss on this question. */
  helped: boolean;
  /** True once the child tapped the matching candidate and is ready for Next. */
  solved: boolean;
  /** One entry per completed clue round: true iff solved first try without Help. */
  clean: boolean[];
};

export const isWhichClue = (s: unknown): s is WhichClueState =>
  !!s && typeof s === "object" && (s as { kind?: unknown }).kind === "which-clues";

export const whichClueDone = (s: WhichClueState) => s.index >= s.ids.length;

export const whichClueTurn = (s: WhichClueState): 0 | 1 =>
  ((s.starter + Math.min(s.index, Math.max(0, s.ids.length - 1))) % 2) as 0 | 1;

/** Displayed index (0..2) of the correct choice (always original choice 0 in the branded record). */
export const whichClueAnswer = (s: WhichClueState): number =>
  s.orders[Math.min(s.index, s.orders.length - 1)].indexOf(0);

/** Break the scenario context into distinct clue chips for visual step-by-step elimination. */
export function clueChips(q: ReadingQuestion): readonly string[] {
  const text = (q.context ?? "").trim();
  if (!text) return [];
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : [text];
}

/** Pure opt-in Help cue: highlights the decisive rule type without revealing the answer choice. */
export function clueHintText(q: ReadingQuestion): string {
  if (q.skill.includes("negation")) {
    return "Watch for words like not, neither, unless, or no — cross out any card that breaks that rule first!";
  }
  if (q.skill.includes("reference")) {
    return "Track who or what the word it, they, them, or these points back to in the earlier sentence.";
  }
  if (q.skill.includes("cause-effect")) {
    return "Check what happened first and what directly caused the result — rule out anything that does not match.";
  }
  return "Check every condition in the clue one by one, and cross out any card that misses even one detail.";
}

function shuffle3(rng: () => number): number[] {
  const a = [0, 1, 2];
  for (let i = 2; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createWhichClue(
  level: ClueLevel,
  pool: readonly ReadingQuestion[],
  c: CreateContext<unknown>,
): WhichClueState {
  const prev = isWhichClue(c.previous) ? new Set(c.previous.ids) : new Set<string>();
  const fresh = pool.filter((q) => !prev.has(q.id));
  const picked = pickItems(fresh.length >= CLUE_ROUND_COUNT ? fresh : [...pool], c.skills, CLUE_ROUND_COUNT, c.rng, c.today);
  return {
    kind: "which-clues",
    level,
    ids: picked.map((q) => q.id),
    orders: picked.map(() => shuffle3(c.rng)),
    starter: c.starter,
    index: 0,
    crossed: [],
    wrong: [],
    helped: false,
    solved: false,
    clean: [],
  };
}

/** Toggle a candidate card as crossed-out (elimination scratchpad; never marks a miss or help). */
export function whichClueToggleCross(s: WhichClueState, displayIndex: number): WhichClueState {
  if (whichClueDone(s) || s.solved || !integer(displayIndex, 2) || s.wrong.includes(displayIndex)) return s;
  const crossed = s.crossed.includes(displayIndex)
    ? s.crossed.filter((i) => i !== displayIndex)
    : [...s.crossed, displayIndex].sort((a, b) => a - b);
  return { ...s, crossed };
}

export function whichCluePick(s: WhichClueState, displayIndex: number): WhichClueState {
  if (whichClueDone(s) || s.solved || !integer(displayIndex, 2) || s.wrong.includes(displayIndex)) return s;
  if (displayIndex === whichClueAnswer(s)) {
    return { ...s, solved: true, crossed: s.crossed.filter((i) => i !== displayIndex) };
  }
  return {
    ...s,
    wrong: [...s.wrong, displayIndex].sort((a, b) => a - b),
    crossed: s.crossed.filter((i) => i !== displayIndex),
    helped: true,
  };
}

export function whichClueHelp(s: WhichClueState): WhichClueState {
  if (whichClueDone(s) || s.solved || s.helped) return s;
  return { ...s, helped: true };
}

export function whichClueNext(s: WhichClueState): WhichClueState {
  if (whichClueDone(s) || !s.solved) return s;
  return {
    ...s,
    index: s.index + 1,
    crossed: [],
    wrong: [],
    helped: false,
    solved: false,
    clean: [...s.clean, !s.helped && s.wrong.length === 0],
  };
}

export function validWhichClue(
  v: unknown,
  level: ClueLevel,
  lookup: (id: unknown) => ReadingQuestion | undefined,
): v is WhichClueState {
  if (!exact(v, ["kind", "level", "ids", "orders", "starter", "index", "crossed", "wrong", "helped", "solved", "clean"])) {
    return false;
  }
  const s = v as unknown as WhichClueState;
  if (
    s.kind !== "which-clues" ||
    s.level !== level ||
    !seat(s.starter) ||
    !Array.isArray(s.ids) ||
    s.ids.length !== CLUE_ROUND_COUNT ||
    new Set(s.ids).size !== CLUE_ROUND_COUNT ||
    !s.ids.every((id) => typeof id === "string" && !!lookup(id)) ||
    !Array.isArray(s.orders) ||
    s.orders.length !== CLUE_ROUND_COUNT ||
    !s.orders.every((a) => Array.isArray(a) && a.length === 3 && a.every((n) => integer(n, 2)) && new Set(a).size === 3) ||
    !integer(s.index, CLUE_ROUND_COUNT) ||
    !bools(s.clean, s.index) ||
    !Array.isArray(s.crossed) ||
    s.crossed.length > 3 ||
    new Set(s.crossed).size !== s.crossed.length ||
    !s.crossed.every((n) => integer(n, 2)) ||
    !Array.isArray(s.wrong) ||
    s.wrong.length > 2 ||
    new Set(s.wrong).size !== s.wrong.length ||
    !s.wrong.every((n) => integer(n, 2)) ||
    typeof s.helped !== "boolean" ||
    typeof s.solved !== "boolean"
  ) {
    return false;
  }
  if (s.index === CLUE_ROUND_COUNT) {
    return s.crossed.length === 0 && s.wrong.length === 0 && !s.helped && !s.solved;
  }
  const ans = whichClueAnswer(s);
  if (s.wrong.includes(ans)) return false;
  if (s.wrong.length > 0 && !s.helped) return false;
  if (s.crossed.some((i) => s.wrong.includes(i))) return false;
  return true;
}

export function whichClueOutcome(s: WhichClueState, o: LearnOptions) {
  if (!whichClueDone(s)) return null;
  return o.mode === "versus" ? familyResult(s.clean, s.starter) : ("done" as const);
}
