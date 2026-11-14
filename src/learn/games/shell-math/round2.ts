import {
  ROUND_LENGTH, advance, fitsLevel, initialWork, judge, levelPlan, roundProblems, sameFact, slotFor, validAct,
  type Act, type Level, type OpChoice, type Problem, type Step, type Work,
} from "../../../math/kit";
import { levelOf } from "../../levelOptions";
import type { LearnOptions } from "../../types";

/**
 * Shell Math round, version 2. Fresh rounds use it; a saved version-1 round keeps its own engine (round.ts).
 *
 * The round stores five problems and the list of everything the child did. Progress is always rebuilt from that
 * list through the K4 kit, so a saved round can never say something the rules would not allow.
 */
export type ItemCode = readonly [0 | 1, number, number, 0 | 1];
export type RoundAct = Act | readonly ["x"];
export type ShellRound = {
  version: 2; level: Level; index: number; items: ItemCode[]; history: RoundAct[];
  /**
   * Mirrors of the current problem's progress, kept because the Learn frame reads `solved` and `wrong` on math games
   * to let the island companion react to a miss. Always re-derived on load; never trusted.
   */
  solved: boolean; wrong: number | null;
};

/** Long enough for five slow, careful problems; the last RESERVE actions only take steps forward, never misses. */
export const HISTORY_CAP = 240;
export const RESERVE = 48;

export const problemOf = (c: ItemCode): Problem => ({ op: c[0] === 0 ? "add" : "subtract", a: c[1], b: c[2], unknown: c[3] === 0 ? "result" : "second" });
export const codeOf = (p: Problem): ItemCode => [p.op === "add" ? 0 : 1, p.a, p.b, p.unknown === "result" ? 0 : 1];
export const choiceOf = (o: LearnOptions): OpChoice => o.mathOperation ?? "add";

export function createShell(o: LearnOptions, rng: () => number): ShellRound {
  const level = levelOf(o) as Level;
  return { version: 2, level, index: 0, items: roundProblems(level, choiceOf(o), rng).map(codeOf), history: [], solved: false, wrong: null };
}

export type Progress = {
  index: number;
  /** One flag per finished problem: true when it was solved with any help or a miss. */
  helped: boolean[];
  work: Work;
  problem: Problem | null;
  plan: Step[] | null;
};
const isNext = (a: RoundAct): a is readonly ["x"] => a.length === 1 && a[0] === "x";

/** Rebuild progress from the list of actions; null if any action was not legal where it happened. */
export function progress(s: ShellRound): Progress | null {
  let index = 0, work = initialWork();
  const helped: boolean[] = [];
  const planAt = (i: number) => (i < s.items.length ? levelPlan(s.level, problemOf(s.items[i])) : null);
  let plan = planAt(0);
  for (const a of s.history) {
    if (!plan) return null;
    if (isNext(a)) {
      if (!work.solved) return null;
      helped.push(work.helped);
      index++;
      work = initialWork();
      plan = planAt(index);
      continue;
    }
    const next = advance(plan, work, a);
    if (next === work) return null;
    work = next;
  }
  return { index, helped, work, problem: index < s.items.length ? problemOf(s.items[index]) : null, plan };
}

/** One action. Returns the same round when the move is not allowed, so a caller can tell nothing happened. */
export function shellMove(s: ShellRound, act: RoundAct): ShellRound {
  if (!act || typeof act !== "object" || s.index >= s.items.length || s.history.length >= HISTORY_CAP) return s;
  const p = progress(s);
  if (!p || !p.plan) return s;
  if (isNext(act)) return p.work.solved ? { ...s, index: s.index + 1, history: [...s.history, ["x"]], solved: false, wrong: null } : s;
  if (!validAct(act)) return s;
  const verdict = judge(p.plan, p.work, act);
  if (verdict === "ignored") return s;
  // Help and the last stretch of the round only ever move forward: a flood of misses cannot trap a child.
  if (verdict === "wrong" && s.history.length >= HISTORY_CAP - RESERVE) return s;
  const work = advance(p.plan, p.work, act);
  return { ...s, history: [...s.history, act], solved: work.solved, wrong: work.last };
}

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const KEYS = ["version", "level", "index", "items", "history", "solved", "wrong"];

export function validShell(v: unknown, o: LearnOptions): v is ShellRound {
  if (!object(v) || Object.keys(v).length !== KEYS.length || !KEYS.every((k) => k in v)) return false;
  const level = levelOf(o);
  if (v.version !== 2 || v.level !== level || !Array.isArray(v.items) || v.items.length !== ROUND_LENGTH || !Array.isArray(v.history) || v.history.length > HISTORY_CAP) return false;
  if (!Number.isInteger(v.index) || (v.index as number) < 0 || (v.index as number) > ROUND_LENGTH) return false;
  const choice = choiceOf(o);
  const problems: Problem[] = [];
  for (let i = 0; i < v.items.length; i++) {
    const c = v.items[i];
    if (!Array.isArray(c) || c.length !== 4 || Object.keys(c).length !== 4 || (c[0] !== 0 && c[0] !== 1) || (c[3] !== 0 && c[3] !== 1)) return false;
    if (!Number.isInteger(c[1]) || !Number.isInteger(c[2])) return false;
    const p = problemOf(c as unknown as ItemCode);
    const slot = slotFor(level, i, choice);
    if (p.op !== slot.op || p.unknown !== slot.unknown || !fitsLevel(level, p) || problems.some((q) => sameFact(p, q))) return false;
    problems.push(p);
  }
  for (const a of v.history) if (!Array.isArray(a) || !((a.length === 1 && a[0] === "x") || validAct(a))) return false;
  const s = v as unknown as ShellRound;
  const p = progress(s);
  if (!p || p.index !== s.index) return false;
  if (s.solved !== p.work.solved || s.wrong !== p.work.last) return false;
  // A finished round holds no loose work.
  return s.index < ROUND_LENGTH || (p.work.at === 0 && p.work.hint === 0);
}
