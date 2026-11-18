import {
  MAX_PATH, MAX_RESTART, advance, advanceHop, drawFor, initialHop, initialWork, judge, judgeHop, jumpsLeft, solveActs, validAct, validHopAct,
  type Act, type HopAct, type HopWork, type Level, type OpChoice, type Work,
} from "../../../math/kit";
import { levelOf } from "../../levelOptions";
import type { LearnOptions } from "../../types";
import { ROUND_LENGTH, fitsRung, freshHop, hopOf, lineMax, parOf, planOf, type HopItem } from "./items";

/**
 * Number Hop round, version 2 (SC-15). Fresh rounds at every level use it; a saved version-1 round keeps its own engine
 * (shell-math/round.ts) and an archived Level 4 or 5 question round keeps the shared growth board.
 *
 * Five puzzles and the list of everything the child did. Progress is rebuilt from that list on every load.
 * Counting and unknown-start puzzles run on the kit's step machine (work.ts); reach puzzles on its hop machine (hop.ts).
 * A reach puzzle counts as the child's own work only when it lands in the fewest jumps with no Help: landing in more is
 * welcome, says so, and offers a fresh try.
 */
export type HopRoundAct = Act | HopAct | readonly ["x"];
export type HopRound = {
  version: 2; level: Level; index: number; items: HopItem[]; history: HopRoundAct[];
  /** Mirrors of the current puzzle, which the Learn frame reads to let the companion react. Re-derived on load. */
  solved: boolean; wrong: number | null;
};
/** Long enough for five slow, careful puzzles. Nothing may use the room the round needs to finish. */
export const HISTORY_CAP = 240;

export const choiceOf = (o: LearnOptions): OpChoice => o.mathOperation ?? "add";
const isNext = (a: HopRoundAct): a is readonly ["x"] => a.length === 1 && a[0] === "x";
const fallback = (seed: number) => (n: number) => drawFor(seed, 200000 + n);

export function createHop(o: LearnOptions, rng: () => number): HopRound {
  const level = levelOf(o) as Level, choice = choiceOf(o);
  const seed = Math.floor((Number.isFinite(rng()) ? rng() : 0) * 4294967296) >>> 0;
  const items: HopItem[] = [];
  for (let rung = 0; rung < ROUND_LENGTH; rung++) items.push(freshHop(level, rung, choice, drawFor(seed, rung), items, fallback(seed)));
  return { version: 2, level, index: 0, items, history: [], solved: false, wrong: null };
}

/** One puzzle's state: the kit's step work for count and start puzzles, hop work for reach puzzles. */
export type Puzzle = { kind: 0 | 2; work: Work } | { kind: 1; work: HopWork; par: number };
export type HopProgress = {
  index: number;
  puzzle: Puzzle | null;
  item: HopItem | null;
  /** One flag per finished puzzle: true unless it was the child's own work (no miss, no Help, and the fewest jumps). */
  helped: boolean[];
};

export function startPuzzle(i: HopItem, level: Level): Puzzle | null {
  if (i[0] === 1) {
    const par = parOf(i, level);
    return par === null ? null : { kind: 1, work: initialHop(hopOf(i, level)), par };
  }
  return planOf(i) ? { kind: i[0] as 0 | 2, work: initialWork() } : null;
}
export const solvedOf = (p: Puzzle): boolean => p.work.solved;
/** Own work: no miss or Help, and for a reach puzzle the fewest jumps. */
export const cleanOf = (p: Puzzle): boolean => (p.kind === 1 ? !p.work.helped && p.work.solved && p.work.path.length === p.par : !p.work.helped);

/** Apply one action to a puzzle; the same object when it is not legal there. */
export function puzzleMove(p: Puzzle, i: HopItem, level: Level, a: Act | HopAct): Puzzle {
  if (p.kind === 1) {
    if (!validHopAct(a)) return p;
    const work = advanceHop(hopOf(i, level), p.work, a as HopAct);
    return work === p.work ? p : { ...p, work };
  }
  if (!validAct(a, lineMax(level))) return p;
  const work = advance(planOf(i)!, p.work, a as Act);
  return work === p.work ? p : { ...p, work };
}
/** How the kit would answer this action, for the board's sound and words. */
export function verdictOf(p: Puzzle, i: HopItem, level: Level, a: Act | HopAct): string {
  if (p.kind === 1) return validHopAct(a) ? judgeHop(hopOf(i, level), p.work, a as HopAct) : "ignored";
  return validAct(a, lineMax(level)) ? judge(planOf(i)!, p.work, a as Act) : "ignored";
}

/** Rebuild progress from the list of actions; null if any action was not legal where it happened. */
export function hopProgress(s: HopRound): HopProgress | null {
  let index = 0, item: HopItem | null = s.items[0] ?? null, puzzle = item ? startPuzzle(item, s.level) : null;
  const helped: boolean[] = [];
  for (const a of s.history) {
    if (!puzzle || !item) return null;
    if (isNext(a)) {
      if (!solvedOf(puzzle)) return null;
      helped.push(!cleanOf(puzzle));
      index++;
      item = index < s.items.length ? s.items[index] : null;
      puzzle = item ? startPuzzle(item, s.level) : null;
      if (item && !puzzle) return null;
      continue;
    }
    const next = puzzleMove(puzzle, item, s.level, a as Act | HopAct);
    if (next === puzzle) return null;
    puzzle = next;
  }
  return { index, puzzle, item, helped };
}

/** Forward actions one puzzle still needs, or null when it can no longer be finished. */
export function puzzleCost(p: Puzzle, i: HopItem, level: Level): number | null {
  if (p.work.solved) return 0;
  if (p.kind === 1) {
    const h = hopOf(i, level), w = p.work, left = jumpsLeft(h, w.at);
    if (left !== null && w.path.length + left <= MAX_PATH) return left;
    // Stuck here: a fresh start can still land it. Once those are used up, a jump that leads here is refused.
    return w.restarts < MAX_RESTART ? 1 + p.par : null;
  }
  const plan = planOf(i)!, rest = solveActs(plan.slice(p.work.at)).length;
  return rest - (plan[p.work.at]?.kind === "count" ? p.work.tapped : 0);
}
/** Forward actions the round still needs: the rest of this puzzle, a Next after each, every later puzzle's own. */
export function hopFinishCost(s: HopRound): number | null {
  const p = hopProgress(s);
  if (!p) return null;
  if (!p.puzzle || !p.item) return 0;
  const here = puzzleCost(p.puzzle, p.item, s.level);
  if (here === null) return null;
  let n = here + 1;
  for (let k = p.index + 1; k < s.items.length; k++) {
    const q = startPuzzle(s.items[k], s.level);
    if (!q) return null;
    n += (puzzleCost(q, s.items[k], s.level) ?? 0) + 1;
  }
  return n;
}

/** One action. Returns the same round when the move is not allowed, so a caller can tell nothing happened. */
export function hopMove(s: HopRound, act: HopRoundAct): HopRound {
  if (!act || typeof act !== "object" || s.index >= s.items.length || s.history.length >= HISTORY_CAP) return s;
  const p = hopProgress(s);
  if (!p || !p.puzzle || !p.item) return s;
  if (isNext(act)) return p.puzzle.work.solved ? { ...s, index: s.index + 1, history: [...s.history, ["x"]], solved: false, wrong: null } : s;
  const puzzle = puzzleMove(p.puzzle, p.item, s.level, act as Act | HopAct);
  if (puzzle === p.puzzle) return s;
  const next: HopRound = { ...s, history: [...s.history, act], solved: puzzle.work.solved, wrong: puzzle.kind === 1 ? null : puzzle.work.last };
  // A jump into a dead end, a miss, Help, Undo or a fresh start is refused once it would leave the round unable to finish.
  const need = hopFinishCost(next);
  if (need === null || next.history.length + need > HISTORY_CAP) return s;
  return next;
}

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const KEYS = ["version", "level", "index", "items", "history", "solved", "wrong"];

export function validHop2(v: unknown, o: LearnOptions): v is HopRound {
  if (!object(v) || Object.keys(v).length !== KEYS.length || !KEYS.every((k) => k in v)) return false;
  const level = levelOf(o) as Level, choice = choiceOf(o);
  if (v.version !== 2 || v.level !== level || !Array.isArray(v.items) || v.items.length !== ROUND_LENGTH) return false;
  if (!Array.isArray(v.history) || v.history.length > HISTORY_CAP) return false;
  if (!Number.isInteger(v.index) || (v.index as number) < 0 || (v.index as number) > ROUND_LENGTH) return false;
  const keys: string[] = [];
  for (let r = 0; r < v.items.length; r++) {
    const i = v.items[r];
    if (!Array.isArray(i) || Object.keys(i).length !== i.length || !fitsRung(level, r, choice, i)) return false;
    const key = i.join(",");
    if (keys.indexOf(key) >= 0) return false;
    keys.push(key);
  }
  for (const a of v.history) if (!Array.isArray(a) || !((a.length === 1 && a[0] === "x") || validAct(a, lineMax(level)) || validHopAct(a))) return false;
  const s = v as unknown as HopRound;
  const p = hopProgress(s);
  if (!p || p.index !== s.index) return false;
  const solved = !!p.puzzle?.work.solved, wrong = p.puzzle && p.puzzle.kind !== 1 ? p.puzzle.work.last : null;
  if (s.solved !== solved || s.wrong !== wrong) return false;
  return s.index < ROUND_LENGTH || p.puzzle === null;
}
