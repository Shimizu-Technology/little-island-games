import type { Position } from "../board/types";
import * as nets from "../board/fishing-nets/engine";

/**
 * Exact search runs only on boards with at most this many open ropes. With the memo it
 * visits each set of tied ropes once, so it never searches more than 2^16 - 1 positions.
 */
export const exactRopes = 16;
export const exactBudget = 1 << 16;
type Frame = { mask: number; i: number; best: number; gain: number };
const unknown = -128;

/**
 * Exact Fishing Nets values, for checking look-back advice. A value is the boxes the
 * side to move can still win minus the boxes the other side wins, with best play by
 * both. Boxes already closed and head starts don't change which rope is better.
 *
 * Explicit stack and a memo indexed by the ropes tied since the root, so it can pause
 * between slices. `step` counts every rope it looks at, memo hits included, so a slice
 * stays small. Deterministic: past `budget` positions it gives up and says so, and no
 * advice is shown from it.
 */
export class NetsExact {
  /** Positions searched: sets of tied ropes, each counted once. */
  nodes = 0;
  private readonly open: number[];
  private readonly touches: number[][];
  private readonly sides: number[];
  private readonly memo: Int8Array | null = null;
  private readonly stack: Frame[] = [];
  private outcome: "solved" | "over-budget" | null = null;
  /** Each root rope's value for the side to move, once solved. */
  private readonly rootValues: number[] = [];
  constructor(
    root: Position,
    private readonly budget: number,
    /** Tests may check larger boards; the app keeps the default. */
    maxRopes = exactRopes
  ) {
    const n = root.size;
    this.open = nets.legal(root);
    this.sides = root.marks.map((_, b) => nets.boxEdges(n, b).filter((e) => root.board[e] !== -1).length);
    this.touches = this.open.map((e) => root.marks.flatMap((v, b) => (v === -1 && nets.boxEdges(n, b).includes(e) ? [b] : [])));
    if (this.open.length > maxRopes) this.outcome = "over-budget";
    else if (!this.open.length) this.outcome = "solved";
    else {
      this.memo = new Int8Array(1 << this.open.length).fill(unknown);
      this.stack.push({ mask: 0, i: 0, best: -Infinity, gain: 0 });
    }
  }
  get done() {
    return this.outcome !== null;
  }
  get solved() {
    return this.outcome === "solved";
  }
  /** Value of tying `rope` now, for the side to move at the root. */
  valueOf(rope: number): number | null {
    if (!this.solved) return null;
    const i = this.open.indexOf(rope);
    return i < 0 ? null : (this.rootValues[i] ?? null);
  }
  private tie(i: number, d: 1 | -1): number {
    let gain = 0;
    for (const b of this.touches[i]) {
      this.sides[b] += d;
      if (d === 1 && this.sides[b] === 4) gain++;
    }
    return gain;
  }
  /** Looks at about `quota` more ropes. True once solved or over budget. */
  step(quota: number): boolean {
    const memo = this.memo!,
      r = this.open.length;
    for (let work = 0; this.outcome === null && work < quota; work++) {
      const f = this.stack[this.stack.length - 1];
      while (f.i < r && f.mask & (1 << f.i)) f.i++;
      if (f.i >= r) {
        const value = f.best === -Infinity ? 0 : f.best;
        memo[f.mask] = value;
        this.stack.pop();
        const parent = this.stack[this.stack.length - 1];
        if (!parent) this.outcome = "solved";
        else this.deliver(parent, value);
        continue;
      }
      f.gain = this.tie(f.i, 1);
      const mask = f.mask | (1 << f.i);
      if (memo[mask] !== unknown) {
        this.deliver(f, memo[mask]);
        continue;
      }
      if (++this.nodes > this.budget) {
        this.outcome = "over-budget";
        break;
      }
      this.stack.push({ mask, i: 0, best: -Infinity, gain: 0 });
    }
    return this.outcome !== null;
  }
  /** A child's value reaches its parent: closing a box keeps the turn, otherwise it passes. */
  private deliver(f: Frame, child: number) {
    const value = f.gain ? f.gain + child : -child;
    this.tie(f.i, -1);
    if (this.stack.length === 1) this.rootValues[f.i] = value;
    if (value > f.best) f.best = value;
    f.i++;
  }
  /** Runs straight through; for tests and scripts. */
  run(): this {
    while (!this.step(1 << 16));
    return this;
  }
}
/**
 * True when `rope` closes a box and touches no other open box. Taking such a box is
 * always at least as good as any other move, and strictly better than a rope that
 * closes nothing: the rope changes no other box, so whoever ties it later only gains it.
 */
export function isolatedCapture(s: Position, rope: number): boolean {
  const n = s.size,
    after = nets.move(s, rope),
    touched = s.marks.flatMap((v, b) => (v === -1 && nets.boxEdges(n, b).includes(rope) ? [b] : []));
  return touched.length > 0 && touched.every((b) => after.marks[b] !== -1);
}
/** The boxes a rope really closes, read from the move itself. */
export const closedBy = (s: Position, rope: number): number[] => {
  const after = nets.move(s, rope);
  return s.marks.flatMap((v, b) => (v === -1 && after.marks[b] !== -1 ? [b] : []));
};
