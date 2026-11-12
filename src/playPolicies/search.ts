import type { Seat } from "../games/match";

/** The rules a search may call. No view of hidden state is ever passed in. */
export type SearchRules<P> = {
  legal: (p: P) => number[];
  move: (p: P, m: number) => P;
  turn: (p: P) => Seat;
  /** null while the game continues; otherwise the winning seat or "draw". */
  outcome: (p: P) => Seat | "draw" | null;
  evaluate: (p: P, seat: Seat) => number;
  /** Optional ordering below the root. It changes speed, not legality. */
  order?: (p: P, moves: number[]) => number[];
};
export type SearchLimits = {
  depth: number;
  nodes: number;
  /** Search a forced move too, when its score matters (post-game review). */
  scoreForced?: boolean;
};
export type SearchResult = {
  move: number | null;
  /** Deepest iteration that finished inside the node cap. */
  depth: number;
  score: number;
  /** Positions generated, including the abandoned iteration. */
  nodes: number;
  /** True when the full requested depth finished. */
  complete: boolean;
};
type Frame<P> = {
  pos: P;
  depth: number;
  alpha: number;
  beta: number;
  max: boolean;
  moves: number[];
  i: number;
  best: number;
  bestMove: number | null;
};
const WIN = 100000;

/**
 * Iterative-deepening alpha-beta with an explicit stack, so it can pause between
 * slices without changing its answer. Strength depends only on the node count,
 * never on the clock: a slow device takes longer, it does not play weaker.
 *
 * If the node cap stops an iteration part way, that iteration is discarded and the
 * deepest completed iteration answers. An unfinished deeper root is never compared
 * with completed siblings.
 */
export class IterativeSearch<P> {
  private readonly seat: Seat;
  private stack: Frame<P>[] = [];
  private iteration = 0;
  private order: number[];
  private finished: SearchResult | null = null;
  private completed: { move: number | null; depth: number; score: number } | null = null;
  nodes = 0;
  private readonly limits: Readonly<SearchLimits>;
  constructor(
    private readonly root: P,
    private readonly rules: Readonly<SearchRules<P>>,
    limits: Readonly<SearchLimits>
  ) {
    // A private copy: the caller's object can't change the budget part way through.
    this.limits = Object.freeze({ ...limits });
    this.seat = rules.turn(root);
    this.order = rules.legal(root);
    if (!this.order.length || rules.outcome(root) !== null)
      this.finished = { move: null, depth: 0, score: 0, nodes: 0, complete: true };
    else if (this.order.length === 1 && !limits.scoreForced)
      // A forced move needs no search; strength is unaffected.
      this.finished = { move: this.order[0], depth: limits.depth, score: 0, nodes: 0, complete: true };
    else this.begin(1);
  }
  get done() {
    return this.finished !== null;
  }
  result(): SearchResult {
    if (!this.finished) throw new Error("Search has not finished.");
    return this.finished;
  }
  private begin(depth: number) {
    this.iteration = depth;
    this.stack = [this.frame(this.root, depth, -Infinity, Infinity, this.order)];
  }
  private frame(pos: P, depth: number, alpha: number, beta: number, moves = this.children(pos)): Frame<P> {
    const max = this.rules.turn(pos) === this.seat;
    return { pos, depth, alpha, beta, max, moves, i: 0, best: max ? -Infinity : Infinity, bestMove: null };
  }
  private children(p: P) {
    const moves = this.rules.legal(p);
    return this.rules.order ? this.rules.order(p, moves) : moves;
  }
  private terminal(p: P, remaining: number): number | null {
    const o = this.rules.outcome(p);
    if (o === null) return null;
    return o === "draw" ? 0 : o === this.seat ? WIN + remaining : -WIN - remaining;
  }
  private settle(f: Frame<P>, value: number) {
    if (f.max) {
      if (value > f.best) {
        f.best = value;
        f.bestMove = f.moves[f.i];
      }
      f.alpha = Math.max(f.alpha, f.best);
    } else {
      if (value < f.best) {
        f.best = value;
        f.bestMove = f.moves[f.i];
      }
      f.beta = Math.min(f.beta, f.best);
    }
    f.i++;
  }
  private finish(complete: boolean) {
    const c = this.completed!;
    this.finished = { move: c.move, depth: c.depth, score: c.score, nodes: this.nodes, complete };
    this.stack = [];
  }
  /** Generates at most `quota` positions. Returns true once the answer is ready. */
  step(quota: number): boolean {
    if (this.finished) return true;
    let left = quota;
    while (left > 0) {
      const f = this.stack[this.stack.length - 1];
      if (f.i >= f.moves.length || f.alpha >= f.beta) {
        this.stack.pop();
        const value = Number.isFinite(f.best) ? f.best : this.rules.evaluate(f.pos, this.seat);
        const parent = this.stack[this.stack.length - 1];
        if (parent) {
          this.settle(parent, value);
          continue;
        }
        // The whole iteration finished inside the cap.
        this.completed = { move: f.bestMove, depth: this.iteration, score: value };
        if (this.iteration >= this.limits.depth || Math.abs(value) >= WIN) {
          this.finish(this.iteration >= this.limits.depth || Math.abs(value) >= WIN);
          return true;
        }
        // Search the previous best first; the rest keep their legal order.
        this.order = [f.bestMove!, ...this.order.filter((m) => m !== f.bestMove)];
        this.begin(this.iteration + 1);
        continue;
      }
      // Depth 1 always finishes, so there is always a completed answer to fall back to.
      if (++this.nodes > this.limits.nodes && this.completed) {
        this.finish(false);
        return true;
      }
      left--;
      const child = this.rules.move(f.pos, f.moves[f.i]),
        remaining = f.depth - 1,
        end = this.terminal(child, remaining);
      if (end !== null) this.settle(f, end);
      else if (remaining <= 0) this.settle(f, this.rules.evaluate(child, this.seat));
      else this.stack.push(this.frame(child, remaining, f.alpha, f.beta));
    }
    return false;
  }
  /** Runs to the answer synchronously. Tests and offline tools only. */
  run(): SearchResult {
    while (!this.step(4096));
    return this.result();
  }
}
