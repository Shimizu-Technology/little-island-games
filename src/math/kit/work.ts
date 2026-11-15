import { KIT_MAX } from "./model";
import type { Step } from "./plan";

/**
 * One problem's worth of progress, advanced by small typed actions. The same function drives the School board,
 * the Challenge replay and the dumb-player bots, so a rule changes in exactly one place.
 *
 * Actions are short arrays so a saved round stays tiny:
 *   ["c"]            tap one shell (count steps only)
 *   ["n", value]     say a number (number steps)
 *   ["t"]            make or open a ten (trade steps)
 *   ["m", side, n]   move `n` shells into `side` (fill steps)
 *   ["p", i, j]      pick the numbers at positions i and j (pair steps)
 *   ["h"]            ask for the next help stage (a cue, then the answer shown, then the answer filled in)
 *   ["k"]            turn on answer choices (the typed-answer help)
 *   ["u"]            undo the last accepted action (never a miss or help, which stay on the record)
 */
export type Act = readonly ["c"] | readonly ["n", number] | readonly ["t"] | readonly ["m", 0 | 1, number] | readonly ["p", number, number] | readonly ["h"] | readonly ["k"] | readonly ["u"];
/** Where a problem stood before an accepted action: step, taps, side of a ten, pairs used. Undo goes back to it. */
export type Pos = readonly [at: number, tapped: number, side: 0 | 1 | null, used: number];
export type Work = {
  /** Index of the step the child is on; equals the plan length once solved. */
  at: number;
  /** Shells tapped so far on the current count step. */
  tapped: number;
  /** Misses so far. A miss only marks the finish as helped; nothing is ever lost. */
  wrong: number;
  /** 0 none, 1 cue, 2 answer shown in the picture, 3 answer filled in for the child to confirm. */
  hint: number;
  choices: boolean;
  helped: boolean;
  solved: boolean;
  /** Accepted and missed actions together, for "fewest moves". */
  moves: number;
  /** The value of the last miss, so the board can answer it; null once the child moves on. */
  last: number | null;
  /** Which group received the shells when the child filled a ten; null before that. */
  side: 0 | 1 | null;
  /** Positions already used by pair steps, as a bit set. */
  used: number;
  /** One entry per accepted action still standing, newest last. Undo pops it; misses and help never leave. */
  back: readonly Pos[];
  /** Undos used on this problem, never more than MAX_UNDO. Undo is a move: it counts toward `moves`. */
  undone: number;
};
export const initialWork = (): Work => ({ at: 0, tapped: 0, wrong: 0, hint: 0, choices: false, helped: false, solved: false, moves: 0, last: null, side: null, used: 0, back: [], undone: 0 });
export const MAX_HINT = 3;
/** A child can change their mind this many times on one problem; past it the choice stands. */
export const MAX_UNDO = 6;

export type Verdict = "ok" | "wrong" | "help" | "undo" | "ignored";

const whole = (v: unknown, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;

/** True for any action shape the engine could ever take; a said number is at most `max` (100, or the wide range). */
export function validAct(v: unknown, max = KIT_MAX): v is Act {
  if (!Array.isArray(v) || Object.keys(v).length !== v.length) return false;
  const k = v[0];
  if (v.length === 1) return k === "c" || k === "t" || k === "h" || k === "k" || k === "u";
  if (v.length === 2) return k === "n" && whole(v[1], max);
  if (v.length !== 3) return false;
  if (k === "m") return (v[1] === 0 || v[1] === 1) && whole(v[2], 10);
  return k === "p" && whole(v[1], 7) && whole(v[2], 7) && v[1] !== v[2];
}

/** The result of an action, without keeping it: how the board answers a tap before it commits. */
export function judge(plan: readonly Step[], w: Work, act: Act): Verdict {
  if (w.solved || w.at >= plan.length) return "ignored";
  if (act[0] === "h") return w.hint >= MAX_HINT ? "ignored" : "help";
  if (act[0] === "k") return w.choices ? "ignored" : "help";
  if (act[0] === "u") return w.back.length > 0 && w.undone < MAX_UNDO ? "undo" : "ignored";
  const s = plan[w.at];
  switch (act[0]) {
    case "c": return s.kind === "count" ? "ok" : "ignored";
    case "t": return s.kind === "trade" ? "ok" : "ignored";
    case "m": {
      if (s.kind !== "fill") return "ignored";
      return s.options.some((o) => o[0] === act[1] && o[1] === act[2]) ? "ok" : "wrong";
    }
    case "p": {
      if (s.kind !== "pair") return "ignored";
      const [i, j] = [act[1], act[2]];
      if (i >= s.of.length || j >= s.of.length || (w.used >> i) & 1 || (w.used >> j) & 1) return "wrong";
      return s.of[i] + s.of[j] === s.sum ? "ok" : "wrong";
    }
    case "n": {
      if (s.kind !== "number") return "ignored";
      return s.value === act[1] ? "ok" : "wrong";
    }
  }
}

/** Whether the child can take back the last accepted action. */
export const canUndo = (plan: readonly Step[], w: Work): boolean => judge(plan, w, ["u"]) === "undo";

/** Apply an action. Returns the same object when nothing happens, so callers can compare references. */
export function advance(plan: readonly Step[], w: Work, act: Act): Work {
  const v = judge(plan, w, act);
  if (v === "ignored") return w;
  if (v === "undo") {
    // Back to where the last accepted action started. The record of misses and help is kept, and the undo itself is a move.
    const p = w.back[w.back.length - 1];
    return { ...w, at: p[0], tapped: p[1], side: p[2], used: p[3], back: w.back.slice(0, -1), hint: 0, last: null, moves: w.moves + 1, undone: w.undone + 1 };
  }
  if (v === "help") return act[0] === "h" ? { ...w, hint: w.hint + 1, helped: true, last: null } : { ...w, choices: true, helped: true, last: null };
  const moves = w.moves + 1;
  if (v === "wrong") return { ...w, wrong: w.wrong + 1, helped: true, moves, last: act[0] === "n" ? (act[1] as number) : act[0] === "m" ? (act[2] as number) : act[0] === "p" ? (act[1] as number) * 8 + (act[2] as number) : null };
  // Accepted. A count step only completes on its last tap.
  const s = plan[w.at];
  const back: readonly Pos[] = [...w.back, [w.at, w.tapped, w.side, w.used]];
  if (s.kind === "count" && w.tapped + 1 < s.times) return { ...w, tapped: w.tapped + 1, moves, last: null, back };
  const at = w.at + 1;
  const used = s.kind === "pair" ? w.used | (1 << (act[1] as number)) | (1 << (act[2] as number)) : w.used;
  return { ...w, at, tapped: 0, hint: 0, moves, last: null, used, back, side: s.kind === "fill" ? (act[1] as 0 | 1) : w.side, solved: at >= plan.length };
}

/** Replay a whole list of actions; null if any of them is not a legal move at that point. */
export function replay(plan: readonly Step[], acts: readonly Act[]): Work | null {
  let w = initialWork();
  for (const a of acts) {
    const next = advance(plan, w, a);
    if (next === w) return null;
    w = next;
  }
  return w;
}

/** What a stage of help says about the step the child is on. Text is the board's job; this is the data. */
export type HintData =
  | { stage: 1; kind: Step["kind"] }
  | { stage: 2 | 3; kind: Step["kind"]; value: number | null; fill: readonly [0 | 1, number] | null; pair: readonly [number, number] | null };
export function hintFor(plan: readonly Step[], w: Work): HintData | null {
  if (w.hint === 0 || w.solved || w.at >= plan.length) return null;
  const s = plan[w.at];
  if (w.hint === 1) return { stage: 1, kind: s.kind };
  const value = s.kind === "number" ? s.value : s.kind === "count" ? s.times : null;
  return { stage: w.hint >= 3 ? 3 : 2, kind: s.kind, value, fill: s.kind === "fill" ? [s.options[0][0], s.options[0][1]] : null, pair: s.kind === "pair" ? firstPair(s, w.used) : null };
}

/** The actions a perfect player takes for a plan: the engine's own worked solution. */
export function solveActs(plan: readonly Step[]): Act[] {
  const out: Act[] = [];
  let used = 0;
  for (const s of plan) {
    if (s.kind === "count") for (let i = 0; i < s.times; i++) out.push(["c"]);
    else if (s.kind === "number") out.push(["n", s.value]);
    else if (s.kind === "trade") out.push(["t"]);
    else if (s.kind === "pair") { const pr = firstPair(s, used)!; used |= (1 << pr[0]) | (1 << pr[1]); out.push(["p", pr[0], pr[1]]); }
    else out.push(["m", s.options[0][0], s.options[0][1]]);
  }
  return out;
}

/** The first unused pair of positions that makes the sum. Null when none is left. */
export function firstPair(s: { of: readonly number[]; sum: number }, used: number): readonly [number, number] | null {
  for (let i = 0; i < s.of.length; i++) {
    if ((used >> i) & 1) continue;
    for (let j = i + 1; j < s.of.length; j++) if (!((used >> j) & 1) && s.of[i] + s.of[j] === s.sum) return [i, j];
  }
  return null;
}
