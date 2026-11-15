import { advance, drawFor, initialWork, judge, validAct, type Act, type Level, type OpChoice, type Step, type Work } from "../../../math/kit";
import { levelOf } from "../../levelOptions";
import type { LearnOptions } from "../../types";
import { ROUND, answerOf, fitsSlot, freshItem, itemKey, levelMax, type QItem } from "./items";

/**
 * Quick Practice round, version 2 (SC-13). Fresh rounds at every level use it; a saved version-1 round keeps its own
 * engine (shell-math/round.ts) and an archived Level 4 or 5 question round keeps the shared growth board.
 *
 * Three questions. The round stores every question shown, in order, and the list of everything the child did; progress
 * is always rebuilt from that list, so a saved round can never say something the rules would not allow.
 *
 * A miss does not leave the question there to be guessed again: the board shows the worked answer and a fresh question
 * of the same kind takes its place (drawn from the round's seed, so a reload draws the same one). The miss stays on the
 * record for that place in the round. After MAX_FRESH fresh questions a miss is an ordinary miss: try again.
 */
export type QAct = Act | readonly ["x"];
export type QuickRound = {
  /** `total` is always ROUND: the frame's journey bar reads it, since `items` grows when a fresh question is given. */
  version: 2; level: Level; seed: number; index: number; total: number; items: QItem[]; history: QAct[];
  /** Mirrors of the current question, which the Learn frame reads to let the companion react. Re-derived on load. */
  solved: boolean; wrong: number | null;
};
export const MAX_FRESH = 9;
export const HISTORY_CAP = 120;

export const choiceOf = (o: LearnOptions): OpChoice => o.mathOperation ?? "add";
export const planOf = (i: QItem): Step[] => [{ kind: "number", value: answerOf(i), role: "final" }];
const isNext = (a: QAct): a is readonly ["x"] => a.length === 1 && a[0] === "x";
const fallback = (seed: number) => (n: number) => drawFor(seed, 100000 + n);

export function createQuick(o: LearnOptions, rng: () => number): QuickRound {
  const level = levelOf(o) as Level, choice = choiceOf(o);
  const seed = Math.floor((Number.isFinite(rng()) ? rng() : 0) * 4294967296) >>> 0;
  const items: QItem[] = [];
  for (let pos = 0; pos < ROUND; pos++) items.push(freshItem(level, pos, choice, drawFor(seed, pos), items, fallback(seed)));
  return { version: 2, level, seed, index: 0, total: ROUND, items, history: [], solved: false, wrong: null };
}

export type QuickProgress = {
  /** Which of the three places the child is on. */
  pos: number;
  /** Index into `items` of the question on screen. */
  cur: number;
  /** Fresh questions given so far. */
  fresh: number;
  work: Work;
  /** One flag per finished place: true when it took a miss or any help. */
  helped: boolean[];
  /** The question just missed and what was said, while the fresh one waits for its first move. */
  missed: { item: QItem; value: number } | null;
  /** The place each question reached so far belongs to. */
  places: number[];
  /** A question at this place was missed, so the place is helped whatever happens next. */
  placeMissed: boolean;
};

/** Rebuild progress from the list of actions; null if any action was not legal where it happened. */
export function quickProgress(s: QuickRound): QuickProgress | null {
  let pos = 0, cur = 0, fresh = 0, work = initialWork(), placeHelped = false;
  let missed: QuickProgress["missed"] = null;
  const helped: boolean[] = [], places: number[] = [0];
  for (const a of s.history) {
    const item = s.items[cur];
    if (!item || pos >= ROUND) return null;
    if (isNext(a)) {
      if (!work.solved) return null;
      helped.push(work.helped || placeHelped);
      pos++; cur++; work = initialWork(); placeHelped = false; missed = null;
      if (pos < ROUND) places.push(pos);
      continue;
    }
    const plan = planOf(item), v = judge(plan, work, a);
    if (v === "ignored") return null;
    if (v === "wrong" && fresh < MAX_FRESH) {
      fresh++; placeHelped = true; missed = { item, value: a[1] as number };
      cur++; work = initialWork();
      if (!s.items[cur]) return null;
      places.push(pos);
      continue;
    }
    work = advance(plan, work, a);
    missed = null;
  }
  return { pos, cur, fresh, work, helped, missed, places, placeMissed: placeHelped };
}

/** Forward actions still needed: an answer and a Next for each place left. */
export function quickFinishCost(p: QuickProgress): number {
  return p.pos >= ROUND ? 0 : (ROUND - p.pos) * 2 - (p.work.solved ? 1 : 0);
}

/** One action. Returns the same round when the move is not allowed, so a caller can tell nothing happened. */
export function quickMove(s: QuickRound, act: QAct, choice: OpChoice): QuickRound {
  if (!act || typeof act !== "object" || s.index >= ROUND || s.history.length >= HISTORY_CAP) return s;
  const p = quickProgress(s);
  if (!p) return s;
  if (isNext(act)) return p.work.solved ? { ...s, index: s.index + 1, history: [...s.history, ["x"]], solved: false, wrong: null } : s;
  if (!validAct(act, levelMax(s.level)) || (act[0] !== "n" && act[0] !== "h" && act[0] !== "k")) return s;
  const item = s.items[p.cur], plan = planOf(item), v = judge(plan, p.work, act);
  if (v === "ignored") return s;
  let next: QuickRound;
  if (v === "wrong" && p.fresh < MAX_FRESH) {
    const fresh = freshItem(s.level, p.pos, choice, drawFor(s.seed, s.items.length), s.items, fallback(s.seed));
    next = { ...s, items: [...s.items.slice(0, p.cur + 1), fresh, ...s.items.slice(p.cur + 1)], history: [...s.history, act], solved: false, wrong: act[1] as number };
  } else {
    const work = advance(plan, p.work, act);
    next = { ...s, history: [...s.history, act], solved: work.solved, wrong: work.last };
  }
  // Only a right answer is always allowed. A miss or help is refused once it would use the room the round needs to finish.
  if (v !== "ok") {
    const after = quickProgress(next);
    if (!after || next.history.length + quickFinishCost(after) > HISTORY_CAP) return s;
  }
  return next;
}

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const KEYS = ["version", "level", "seed", "index", "total", "items", "history", "solved", "wrong"];

export function validQuick(v: unknown, o: LearnOptions): v is QuickRound {
  if (!object(v) || Object.keys(v).length !== KEYS.length || !KEYS.every((k) => k in v)) return false;
  const level = levelOf(o) as Level, choice = choiceOf(o), max = levelMax(level);
  if (v.version !== 2 || v.level !== level || v.total !== ROUND || !Number.isInteger(v.seed) || (v.seed as number) < 0 || (v.seed as number) > 4294967295) return false;
  if (!Array.isArray(v.items) || v.items.length < ROUND || v.items.length > ROUND + MAX_FRESH) return false;
  if (!Array.isArray(v.history) || v.history.length > HISTORY_CAP) return false;
  if (!Number.isInteger(v.index) || (v.index as number) < 0 || (v.index as number) > ROUND) return false;
  for (const i of v.items) if (!Array.isArray(i) || Object.keys(i).length !== i.length || i.length < 5 || i.length > 6 || !i.every((n) => Number.isInteger(n))) return false;
  for (const a of v.history) {
    if (!Array.isArray(a) || !((a.length === 1 && a[0] === "x") || (validAct(a, max) && (a[0] === "n" || a[0] === "h" || a[0] === "k")))) return false;
  }
  const s = v as unknown as QuickRound;
  const keys = s.items.map(itemKey);
  if (keys.some((k, i) => keys.indexOf(k) !== i)) return false;
  const p = quickProgress(s);
  if (!p || p.pos !== s.index || s.items.length !== ROUND + p.fresh) return false;
  // Every question shown so far fits the place it was shown in; the ones still waiting fit the places after it.
  for (let k = 0; k < s.items.length; k++) {
    const place = k <= p.cur && k < p.places.length ? p.places[k] : p.pos + (k - p.cur);
    if (place >= ROUND || !fitsSlot(level, place, choice, s.items[k])) return false;
  }
  const wrong = p.missed ? p.missed.value : p.work.last;
  if (s.solved !== p.work.solved || s.wrong !== wrong) return false;
  return s.index < ROUND || (p.cur === s.items.length && p.work.at === 0 && p.work.hint === 0);
}
