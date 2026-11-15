/**
 * Hops on a number line (SC-15, Number Hop): a frog starts on one number and reaches another with the jumps a level
 * offers. The fewest jumps is found by a breadth-first search over every number on the line, so a par is proved,
 * not guessed. The same search gives Help its next jump. Plain data in and out, like the rest of the kit.
 */
export type Hop = { start: number; target: number; jumps: readonly number[]; lo: number; hi: number };

/**
 * The jump sets a level offers, by number. Stored in a saved puzzle, so a set never changes once shipped; add new ones
 * at the end. Each is listed smallest first, the order the buttons appear.
 *   0  ones and twos, both ways (Level 3)
 *   1  twos, fives and tens, forward only (Level 4)
 *   2  ones and tens, both ways (Level 5): going past and coming back can be shorter
 */
export const JUMP_SETS: readonly (readonly number[])[] = [[-2, -1, 1, 2], [2, 5, 10], [-10, -1, 1, 10]];
/** Longest path a puzzle accepts. Far more than any par; past it the child is asked to start again. */
export const MAX_PATH = 24;
/** Take-backs on one puzzle; starting again is always there. */
export const MAX_HOP_UNDO = 12;
/** Fresh starts on one puzzle, so a saved round stays small. */
export const MAX_RESTART = 6;

const whole = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

/**
 * Jumps needed from every number on the line to the target: index `n - lo`, -1 where the target cannot be reached.
 * A reverse breadth-first search: one pass, no more than (hi - lo + 1) × jumps steps.
 */
export function jumpsToTarget(target: number, jumps: readonly number[], lo: number, hi: number): number[] {
  const size = hi - lo + 1, dist: number[] = [];
  for (let i = 0; i < size; i++) dist.push(-1);
  if (target < lo || target > hi) return dist;
  dist[target - lo] = 0;
  const queue = [target];
  for (let head = 0; head < queue.length; head++) {
    const q = queue[head];
    for (const j of jumps) {
      const p = q - j;
      if (p < lo || p > hi || dist[p - lo] >= 0) continue;
      dist[p - lo] = dist[q - lo] + 1;
      queue.push(p);
    }
  }
  return dist;
}

/** Fewest jumps from the start to the target, or null when there is no way. This is the par. */
export function fewestJumps(h: Hop, jumps: readonly number[] = h.jumps): number | null {
  const d = jumpsToTarget(h.target, jumps, h.lo, h.hi)[h.start - h.lo];
  return d === undefined || d < 0 ? null : d;
}
/** Fewest jumps using only the jumps that head toward the target: what a child gets without going past and back. */
export function fewestStraight(h: Hop): number | null {
  const toward = h.jumps.filter((j) => (h.target > h.start ? j > 0 : j < 0));
  return toward.length ? fewestJumps(h, toward) : null;
}
/** The dumb player: the smallest jump toward the target, again and again. Jumps it takes, or null when it never lands. */
export function smallestJumpsBot(h: Hop): number | null {
  const toward = h.jumps.filter((j) => (h.target > h.start ? j > 0 : j < 0));
  if (!toward.length) return null;
  const step = toward.reduce((m, j) => (Math.abs(j) < Math.abs(m) ? j : m));
  const gap = h.target - h.start;
  return gap % step === 0 ? gap / step : null;
}
/** The largest-jump-that does-not-pass player. Jumps it takes, or null when it gets stuck short of the target. */
export function greedyJumps(h: Hop): number | null {
  const toward = h.jumps.filter((j) => (h.target > h.start ? j > 0 : j < 0)).slice().sort((x, y) => Math.abs(y) - Math.abs(x));
  let at = h.start, n = 0;
  while (at !== h.target && n <= MAX_PATH) {
    const j = toward.find((s) => Math.abs(h.target - at) >= Math.abs(s));
    if (j === undefined) return null;
    at += j; n++;
  }
  return at === h.target ? n : null;
}

/** A puzzle the kit can play: whole numbers on a line inside 0..max, a real distance, distinct jumps, and a way to the target. */
export function validHop(v: unknown, max = 100): v is Hop {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const h = v as Record<string, unknown>, keys = Object.keys(h);
  if (keys.length !== 5 || !["start", "target", "jumps", "lo", "hi"].every((k) => keys.indexOf(k) >= 0)) return false;
  if (!whole(h.lo, 0, max) || !whole(h.hi, 0, max) || (h.lo as number) >= (h.hi as number)) return false;
  if (!whole(h.start, h.lo as number, h.hi as number) || !whole(h.target, h.lo as number, h.hi as number) || h.start === h.target) return false;
  const j = h.jumps;
  if (!Array.isArray(j) || j.length < 1 || j.length > 6 || !j.every((s) => whole(Math.abs(s as number), 1, 50) && Number.isInteger(s))) return false;
  for (let i = 0; i < j.length; i++) for (let k = i + 1; k < j.length; k++) if (j[i] === j[k]) return false;
  return fewestJumps(v as Hop) !== null;
}

/**
 * The jump Help suggests from `at`: one that keeps a fewest path, the biggest such jump (tens first, as a child learns
 * to), forward before back on a tie. Null when the target cannot be reached from here.
 */
export function bestJump(h: Hop, at: number): number | null {
  const dist = jumpsToTarget(h.target, h.jumps, h.lo, h.hi), here = dist[at - h.lo];
  if (here === undefined || here <= 0) return null;
  let best: number | null = null;
  for (const j of h.jumps) {
    const to = at + j;
    if (to < h.lo || to > h.hi || dist[to - h.lo] !== here - 1) continue;
    if (best === null || Math.abs(j) > Math.abs(best) || (Math.abs(j) === Math.abs(best) && j > best)) best = j;
  }
  return best;
}
/** Jumps still needed from `at`, or null when there is no way from here. */
export function jumpsLeft(h: Hop, at: number): number | null {
  const d = jumpsToTarget(h.target, h.jumps, h.lo, h.hi)[at - h.lo];
  return d === undefined || d < 0 ? null : d;
}

/**
 * One reach puzzle's progress. Only the standing path counts toward par: Undo takes a jump off the path, and Start
 * again clears it. Help is sticky: once used, the puzzle is helped even after a fresh start.
 *   ["j", i]  jump by the i-th size of the set
 *   ["u"]     take the last jump back
 *   ["r"]     start again from the first number (also after landing, to try for fewer jumps)
 *   ["h"]     show the next jump on a fewest path
 */
export type HopAct = readonly ["j", number] | readonly ["u"] | readonly ["r"] | readonly ["h"];
export type HopWork = {
  at: number;
  /** The jumps standing, in order, as signed sizes. */
  path: readonly number[];
  /** 1 while Help's next jump is showing; cleared by any move. */
  hint: number;
  helped: boolean;
  solved: boolean;
  undone: number;
  restarts: number;
};
export type HopVerdict = "ok" | "help" | "undo" | "restart" | "ignored";
export const initialHop = (h: Hop): HopWork => ({ at: h.start, path: [], hint: 0, helped: false, solved: false, undone: 0, restarts: 0 });

export function validHopAct(v: unknown): v is HopAct {
  if (!Array.isArray(v) || Object.keys(v).length !== v.length) return false;
  if (v.length === 1) return v[0] === "u" || v[0] === "r" || v[0] === "h";
  return v.length === 2 && v[0] === "j" && whole(v[1], 0, 5);
}

export function judgeHop(h: Hop, w: HopWork, a: HopAct): HopVerdict {
  if (a[0] === "r") return w.path.length > 0 && w.restarts < MAX_RESTART ? "restart" : "ignored";
  if (w.solved) return "ignored";
  if (a[0] === "u") return w.path.length > 0 && w.undone < MAX_HOP_UNDO ? "undo" : "ignored";
  if (a[0] === "h") return w.hint === 0 && bestJump(h, w.at) !== null ? "help" : "ignored";
  const j = h.jumps[a[1]];
  if (j === undefined || w.path.length >= MAX_PATH) return "ignored";
  const to = w.at + j;
  return to < h.lo || to > h.hi ? "ignored" : "ok";
}

/** Apply an action; the same object back when nothing happens. */
export function advanceHop(h: Hop, w: HopWork, a: HopAct): HopWork {
  const v = judgeHop(h, w, a);
  if (v === "ignored") return w;
  if (v === "restart") return { ...w, at: h.start, path: [], hint: 0, solved: false, restarts: w.restarts + 1 };
  if (v === "undo") {
    const path = w.path.slice(0, -1), last = w.path[w.path.length - 1];
    return { ...w, at: w.at - last, path, hint: 0, undone: w.undone + 1 };
  }
  if (v === "help") return { ...w, hint: 1, helped: true };
  const j = h.jumps[(a as readonly ["j", number])[1]];
  const at = w.at + j;
  return { ...w, at, path: [...w.path, j], hint: 0, solved: at === h.target };
}

/** The fewest-jump path a perfect player takes, as actions. */
export function solveHop(h: Hop): HopAct[] {
  const out: HopAct[] = [];
  let at = h.start;
  for (let guard = 0; at !== h.target && guard <= MAX_PATH; guard++) {
    const j = bestJump(h, at);
    if (j === null) return out;
    out.push(["j", h.jumps.indexOf(j)]);
    at += j;
  }
  return out;
}

/** Where the frog lands after each jump of a path, from a start. */
export function landings(start: number, path: readonly number[]): number[] {
  const out: number[] = [];
  let at = start;
  for (const j of path) { at += j; out.push(at); }
  return out;
}
/** "+10", "−1": the minus sign is U+2212, like the rest of the kit. */
export const jumpText = (j: number): string => (j > 0 ? `+${j}` : `−${-j}`);
