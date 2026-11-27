import type { CreateContext, LearnOptions } from "../../types";
import { pickItems } from "../../skills";
import type { ChamoruRecord, ReadingQuestion } from "../../reading/provenance";
import { bools, exact, familyResult, integer, seat } from "../../kit/reading";

/**
 * Håfa Adai Island native Levels 4 & 5: interactive CHamoru picnic conversation & cultural
 * context matching right on the picnic table/blanket.
 * STRICT REQUIREMENT: TEXT-ONLY for CHamoru words — ZERO CHamoru audio synthesis.
 * Uses only the pinned, branded `readingGrowthTracks()["hafa-adai"]` scenarios and verbatim
 * `chamoruRecord` vocabulary entries. Completely untimed.
 */
export const CONTEXT_ROUND_COUNT = 6;
export type ContextLevel = 4 | 5;

export type PicnicContextState = {
  kind: "picnic-context";
  level: ContextLevel;
  ids: string[];
  orders: number[][];
  starter: 0 | 1;
  index: number;
  /** Choice indices (in original question choices 0..2) wrongly tapped on this card. */
  wrong: number[];
  /** True once the child tapped Peek / Help or missed on this turn. */
  helped: boolean;
  /** True once the right CHamoru word card was chosen and waiting for Next. */
  solved: boolean;
  /** One entry per completed turn: true iff right on first try without Peek/Help. */
  clean: boolean[];
};

export const isPicnicContext = (s: unknown): s is PicnicContextState =>
  !!s && typeof s === "object" && (s as { kind?: unknown }).kind === "picnic-context";

export const picnicContextDone = (s: PicnicContextState) => s.index >= s.ids.length;

export const picnicContextTurn = (s: PicnicContextState): 0 | 1 =>
  ((s.starter + Math.min(s.index, Math.max(0, s.ids.length - 1))) % 2) as 0 | 1;

function shuffle3(rng: () => number): number[] {
  const a = [0, 1, 2];
  for (let i = 2; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Category clue shown on opt-in Peek/Help without naming or giving away the CHamoru term. */
export function contextHintText(word: ChamoruRecord | undefined): string {
  const category = word?.category.replaceAll("_", " ") ?? "everyday word";
  return `Look for the ${category} card on the picnic that matches every English clue.`;
}

export function createPicnicContext(
  level: ContextLevel,
  pool: readonly ReadingQuestion[],
  c: CreateContext<unknown>,
): PicnicContextState {
  const prev = isPicnicContext(c.previous) ? new Set(c.previous.ids) : new Set<string>();
  const fresh = pool.filter((q) => !prev.has(q.id));
  const picked = pickItems(
    fresh.length >= CONTEXT_ROUND_COUNT ? fresh : [...pool],
    c.skills,
    CONTEXT_ROUND_COUNT,
    c.rng,
    c.today,
  );
  return {
    kind: "picnic-context",
    level,
    ids: picked.map((q) => q.id),
    orders: picked.map(() => shuffle3(c.rng)),
    starter: c.starter,
    index: 0,
    wrong: [],
    helped: false,
    solved: false,
    clean: [],
  };
}

export function picnicContextPick(
  s: PicnicContextState,
  choiceIndex: number,
  q: ReadingQuestion | undefined,
): PicnicContextState {
  if (picnicContextDone(s) || s.solved || !q || !integer(choiceIndex, q.choices.length - 1)) return s;
  if (s.wrong.includes(choiceIndex)) return s;
  const chosen = q.choices[choiceIndex];
  if (!chosen) return s;
  if (chosen.value === q.answer) {
    return { ...s, solved: true };
  }
  return {
    ...s,
    wrong: [...s.wrong, choiceIndex].sort((a, b) => a - b),
    helped: true,
  };
}

export function picnicContextHelp(s: PicnicContextState): PicnicContextState {
  if (picnicContextDone(s) || s.solved || s.helped) return s;
  return { ...s, helped: true };
}

export function picnicContextNext(s: PicnicContextState): PicnicContextState {
  if (picnicContextDone(s) || !s.solved) return s;
  return {
    ...s,
    index: s.index + 1,
    wrong: [],
    helped: false,
    solved: false,
    clean: [...s.clean, !s.helped && s.wrong.length === 0],
  };
}

export function validPicnicContext(
  v: unknown,
  level: ContextLevel,
  lookup: (id: unknown) => ReadingQuestion | undefined,
  o: LearnOptions,
): v is PicnicContextState {
  if (!exact(v, ["kind", "level", "ids", "orders", "starter", "index", "wrong", "helped", "solved", "clean"])) {
    return false;
  }
  const s = v as unknown as PicnicContextState;
  if (
    s.kind !== "picnic-context" ||
    s.level !== level ||
    !seat(s.starter) ||
    (o.mode === "solo" && s.starter !== 0) ||
    !Array.isArray(s.ids) ||
    s.ids.length !== CONTEXT_ROUND_COUNT ||
    new Set(s.ids).size !== CONTEXT_ROUND_COUNT ||
    !s.ids.every((id) => typeof id === "string" && !!lookup(id)) ||
    !Array.isArray(s.orders) ||
    s.orders.length !== CONTEXT_ROUND_COUNT ||
    !s.orders.every((a) => Array.isArray(a) && a.length === 3 && a.every((n) => integer(n, 2)) && new Set(a).size === 3) ||
    !integer(s.index, CONTEXT_ROUND_COUNT) ||
    !bools(s.clean, s.index) ||
    !Array.isArray(s.wrong) ||
    s.wrong.length > 2 ||
    new Set(s.wrong).size !== s.wrong.length ||
    !s.wrong.every((n) => integer(n, 2)) ||
    typeof s.helped !== "boolean" ||
    typeof s.solved !== "boolean"
  ) {
    return false;
  }
  if (s.index === CONTEXT_ROUND_COUNT) {
    return s.wrong.length === 0 && !s.helped && !s.solved;
  }
  const q = lookup(s.ids[s.index]);
  if (!q) return false;
  const answerIdx = q.choices.findIndex((c) => c.value === q.answer);
  if (s.wrong.includes(answerIdx)) return false;
  if (s.wrong.length > 0 && !s.helped) return false;
  return true;
}

export function picnicContextOutcome(s: PicnicContextState, o: LearnOptions) {
  if (!picnicContextDone(s)) return null;
  return o.mode === "versus" ? familyResult(s.clean, s.starter) : ("done" as const);
}
