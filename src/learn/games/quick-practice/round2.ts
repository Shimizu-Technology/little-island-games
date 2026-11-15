import { advance, drawFor, initialWork, judge, mixInts, validAct, type Act, type Level, type OpChoice, type Step, type Work } from "../../../math/kit";
import { levelOf } from "../../levelOptions";
import type { LearnOptions } from "../../types";
import { ROUND, answerOf, fitsSlot, freshItem, itemKey, levelMax, type QItem } from "./items";

/**
 * Quick Practice round, version 2 (SC-13). Fresh rounds at every level use it; a saved version-1 round keeps its own
 * engine (shell-math/round.ts) and an archived Level 4 or 5 question round keeps the shared growth board.
 *
 * Three places, one question showing at each. **Every miss** retires the question: the board shows its worked answer and a
 * fresh question of the same kind takes its place. Nothing grows with misses, so the save stays small however many there are:
 *   - `items` holds the question now at each place;
 *   - `tries` counts the fresh questions drawn at each place, and that counter plus the round's seed draws the next one, so a
 *     reload draws the same question;
 *   - `helped` is the sticky record that a place took a miss or any help, whatever happens next;
 *   - `missed` is the question just missed (with `wrong`, what was said), kept only until the child's next move, so its worked
 *     answer survives a reload;
 *   - `history` is what the child did on the question on screen (Help, Choices, the right answer), replayed through the kit
 *     on every load, so a saved round can never say something the rules would not allow.
 */
export type QAct = Act | readonly ["x"];
export type QuickRound = {
  version: 2; level: Level; seed: number;
  /** The place the child is on, 0 to 3. `total` is always ROUND, for the frame's journey bar. */
  index: number; total: number;
  items: QItem[]; tries: number[]; helped: boolean[];
  missed: QItem | null;
  history: QAct[];
  /** Mirrors the Learn frame reads to let the companion react: the question is solved, or what the miss said. Re-derived on load. */
  solved: boolean; wrong: number | null;
};
/** Fresh questions a place can draw; past it the counter stays and the draw still avoids the question just missed. */
export const MAX_TRIES = 9999;
/** Help three times, Choices once, then the answer: nothing else stays on a question, since a miss replaces it. */
const MAX_HISTORY = 5;

export const choiceOf = (o: LearnOptions): OpChoice => o.mathOperation ?? "add";
export const planOf = (i: QItem): Step[] => [{ kind: "number", value: answerOf(i), role: "final" }];
const isNext = (a: QAct): a is readonly ["x"] => a.length === 1 && a[0] === "x";
const fallback = (seed: number) => (n: number) => drawFor(seed, 100000 + n);

export function createQuick(o: LearnOptions, rng: () => number): QuickRound {
  const level = levelOf(o) as Level, choice = choiceOf(o);
  const seed = Math.floor((Number.isFinite(rng()) ? rng() : 0) * 4294967296) >>> 0;
  const items: QItem[] = [];
  for (let pos = 0; pos < ROUND; pos++) items.push(freshItem(level, pos, choice, drawFor(seed, pos), items, fallback(seed)));
  return { version: 2, level, seed, index: 0, total: ROUND, items, tries: [0, 0, 0], helped: [false, false, false], missed: null, history: [], solved: false, wrong: null };
}

/** The fresh question for a place after its n-th miss: deterministic from the seed, never one already showing or just missed. */
export function retryItem(s: Pick<QuickRound, "level" | "seed" | "items">, pos: number, n: number, choice: OpChoice): QItem {
  const draw = mixInts(s.seed, pos + 1, n);
  return freshItem(s.level, pos, choice, drawFor(draw, 0), s.items, fallback(draw));
}

export type QuickProgress = {
  /** Which of the three places the child is on (also the index into `items`). */
  pos: number;
  cur: number;
  work: Work;
  /** One flag per finished place: true when it took a miss or any help. */
  helped: boolean[];
  /** The question just missed and what was said, until the child's next move. */
  missed: { item: QItem; value: number } | null;
  /** A question at this place was missed or helped, so the place is helped whatever happens next. */
  placeMissed: boolean;
};

/** Rebuild the question on screen from its actions; null if any action was not legal there. */
export function quickProgress(s: QuickRound): QuickProgress | null {
  const pos = s.index;
  let work = initialWork();
  if (pos < ROUND) {
    const plan = planOf(s.items[pos]);
    for (const a of s.history) {
      if (isNext(a) || judge(plan, work, a) === "wrong") return null;
      const next = advance(plan, work, a);
      if (next === work) return null;
      work = next;
    }
  } else if (s.history.length) return null;
  const missed = s.missed && s.wrong !== null ? { item: s.missed, value: s.wrong } : null;
  return { pos, cur: pos, work, helped: s.helped.slice(0, Math.min(pos, ROUND)), missed, placeMissed: pos < ROUND && s.helped[pos] };
}

/** One action. Returns the same round when the move is not allowed, so a caller can tell nothing happened. */
export function quickMove(s: QuickRound, act: QAct, choice: OpChoice): QuickRound {
  if (!act || typeof act !== "object" || s.index >= ROUND) return s;
  const p = quickProgress(s);
  if (!p) return s;
  const pos = s.index, helped = (h: boolean) => s.helped.map((v, i) => (i === pos ? v || h : v));
  if (isNext(act)) {
    if (!p.work.solved) return s;
    return { ...s, index: pos + 1, helped: helped(p.work.helped), missed: null, history: [], solved: false, wrong: null };
  }
  if (!validAct(act, levelMax(s.level)) || (act[0] !== "n" && act[0] !== "h" && act[0] !== "k")) return s;
  const item = s.items[pos], plan = planOf(item), v = judge(plan, p.work, act);
  if (v === "ignored") return s;
  if (v === "wrong") {
    // Every miss: show how the missed one works, and put a fresh question of the same kind in its place.
    const n = Math.min(MAX_TRIES, s.tries[pos] + 1);
    const fresh = retryItem({ ...s, items: [...s.items.slice(0, pos), item, ...s.items.slice(pos + 1)] }, pos, n, choice);
    return {
      ...s, items: s.items.map((q, i) => (i === pos ? fresh : q)), tries: s.tries.map((t, i) => (i === pos ? n : t)),
      helped: helped(true), missed: item, history: [], solved: false, wrong: act[1] as number,
    };
  }
  const work = advance(plan, p.work, act);
  if (s.history.length >= MAX_HISTORY) return s;
  return { ...s, helped: helped(work.helped), missed: null, history: [...s.history, act], solved: work.solved, wrong: null };
}

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const KEYS = ["version", "level", "seed", "index", "total", "items", "tries", "helped", "missed", "history", "solved", "wrong"];
const itemShape = (i: unknown): i is QItem => Array.isArray(i) && Object.keys(i).length === i.length && i.length >= 5 && i.length <= 6 && i.every((n) => Number.isInteger(n));

export function validQuick(v: unknown, o: LearnOptions): v is QuickRound {
  if (!object(v) || Object.keys(v).length !== KEYS.length || !KEYS.every((k) => k in v)) return false;
  const level = levelOf(o) as Level, choice = choiceOf(o), max = levelMax(level);
  if (v.version !== 2 || v.level !== level || v.total !== ROUND || !Number.isInteger(v.seed) || (v.seed as number) < 0 || (v.seed as number) > 4294967295) return false;
  if (!Number.isInteger(v.index) || (v.index as number) < 0 || (v.index as number) > ROUND) return false;
  if (!Array.isArray(v.items) || v.items.length !== ROUND || !v.items.every(itemShape)) return false;
  if (!Array.isArray(v.tries) || v.tries.length !== ROUND || !v.tries.every((t) => Number.isInteger(t) && t >= 0 && t <= MAX_TRIES)) return false;
  if (!Array.isArray(v.helped) || v.helped.length !== ROUND || !v.helped.every((h) => typeof h === "boolean")) return false;
  if (!Array.isArray(v.history) || v.history.length > MAX_HISTORY) return false;
  for (const a of v.history) if (!Array.isArray(a) || !validAct(a, max) || (a[0] !== "n" && a[0] !== "h" && a[0] !== "k")) return false;
  const s = v as unknown as QuickRound, index = s.index;
  if (!s.items.every((q, pos) => fitsSlot(level, pos, choice, q))) return false;
  const keys = s.items.map(itemKey);
  if (keys.some((k, i) => keys.indexOf(k) !== i)) return false;
  // A place before the one on screen is finished; a place after it has never been tried.
  if (s.tries.some((t, pos) => pos > index && t > 0) || s.helped.some((h, pos) => pos > index && h)) return false;
  if (s.missed !== null) {
    if (index >= ROUND || !itemShape(s.missed) || !fitsSlot(level, index, choice, s.missed) || s.tries[index] < 1 || !s.helped[index]) return false;
    if (s.history.length || typeof s.wrong !== "number" || !Number.isInteger(s.wrong) || s.wrong < 0 || s.wrong > max || s.wrong === answerOf(s.missed)) return false;
    if (itemKey(s.missed) === keys[index]) return false;
  }
  const p = quickProgress(s);
  if (!p) return false;
  if (index < ROUND && p.work.helped && !s.helped[index]) return false;
  if (s.solved !== p.work.solved || (s.missed === null && s.wrong !== null)) return false;
  return index < ROUND || (s.missed === null && !s.solved);
}
