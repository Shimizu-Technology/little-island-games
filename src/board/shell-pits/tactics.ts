import { blank, integer, type Position } from "../types";
import { legal, move, sowPath } from "./engine";

/**
 * Shell Pits endgame tactics. The player is always the circle side (seat 0) and
 * moves first. The rival answers with its best defence, found by an exact solver
 * over the real sow, capture and extra-turn rules.
 */
export type Objective = "capture" | "one-turn";
export type Descriptor = {
  version: 1;
  /** Fourteen counts in engine order: circle pits 0-5, circle store 6, square pits 7-12, square store 13. */
  board: number[];
  /** Fewest circle sows that win against the best defence. Certified by `solve`. */
  par: number;
  /** Tactics a winning line can include, each certified by `canWinWith`. */
  objectives: Objective[];
};
export const INF = 1_000_000;
export const positionOf = (board: readonly number[]): Position => blank(0, 6, 0, [...board]);
const won = (p: Position) => p.outcome === 0;
const key = (p: Position) => `${p.turn}:${p.board.join(",")}`;

/**
 * Fewest circle sows, up to `cap`, that force a circle win from `p` against every
 * square reply. INF means no forced win within the cap. The square side picks the
 * reply that delays or prevents the win.
 */
export class Solver {
  private memo = new Map<string, boolean>();
  constructor(readonly cap = 8) {}
  /** True if circle can force a win using at most `k` more circle sows. */
  wins(p: Position, k: number): boolean {
    if (p.outcome !== null) return won(p);
    if (p.turn === 0 && k <= 0) return false;
    const id = `${k}|${key(p)}`,
      known = this.memo.get(id);
    if (known !== undefined) return known;
    const children = legal(p).map((m) => move({ ...p, moves: [] }, m));
    const result = p.turn === 0 ? children.some((c) => this.wins(c, k - 1)) : children.every((c) => this.wins(c, k));
    this.memo.set(id, result);
    return result;
  }
  value(p: Position): number {
    if (p.outcome !== null) return won(p) ? 0 : INF;
    // With the square side to move, every reply may already lose: that is 0 more sows, not 1.
    for (let k = p.turn === 1 ? 0 : 1; k <= this.cap; k++) if (this.wins(p, k)) return k;
    return INF;
  }
  /** The circle sow with the shortest forced win, lowest pit first. Null when none wins within the cap. */
  bestSow(p: Position): number | null {
    if (p.turn !== 0 || p.outcome !== null) return null;
    let best: number | null = null,
      score = INF;
    for (const m of legal(p)) {
      const v = this.value(move({ ...p, moves: [] }, m));
      if (v < INF && v + 1 < score) {
        score = v + 1;
        best = m;
      }
    }
    return best;
  }
  /** The square reply that keeps the win furthest away, lowest pit first. */
  bestDefence(p: Position): number {
    let best = legal(p)[0],
      score = -1;
    for (const m of legal(p)) {
      const v = this.value(move({ ...p, moves: [] }, m));
      if (v > score) {
        score = v;
        best = m;
      }
    }
    return best;
  }
}
/** Plays square replies until it is the circle side's turn again or the game ends. */
export function defend(p: Position, solver: Solver): { position: Position; replies: number[] } {
  const replies: number[] = [];
  let s = p;
  while (s.outcome === null && s.turn === 1) {
    const m = solver.bestDefence(s);
    replies.push(m);
    s = move(s, m);
  }
  return { position: s, replies };
}
/**
 * True if some line wins within `par` circle sows against every defence and
 * includes the tactic. Every square reply is considered, not only the best.
 */
export function canWinWith(start: Position, par: number, objective: Objective): boolean {
  const solver = new Solver(par);
  const search = (p: Position, left: number, met: boolean, rivalMoved: boolean): boolean => {
    if (p.outcome !== null) return won(p) && met;
    if (p.turn === 1) {
      if (objective === "one-turn") return false;
      return legal(p).every((m) => search(move({ ...p, moves: [] }, m), left, met, true));
    }
    if (left <= 0) return false;
    return legal(p).some((m) => {
      const next = move({ ...p, moves: [] }, m);
      if (!solver.wins(next, left - 1)) return false;
      const captured = captures(p, m);
      return search(next, left - 1, met || (objective === "capture" && captured) || (objective === "one-turn" && !rivalMoved && next.outcome !== null), rivalMoved);
    });
  };
  return search(start, par, false, false);
}
/** Whether a circle sow ends in an empty circle pit opposite shells: the engine's capture rule. */
export function captures(p: Position, pit: number): boolean {
  const path = sowPath(p, pit);
  if (!path.length || p.turn !== 0) return false;
  const board = [...p.board];
  board[pit] = 0;
  for (const i of path) board[i]++;
  const last = path[path.length - 1];
  return last < 6 && board[last] === 1 && board[12 - last] > 0;
}
export function validDescriptor(v: unknown): v is Descriptor {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const d = v as Record<string, unknown>;
  return (
    Object.keys(d).sort().join() === "board,objectives,par,version" &&
    d.version === 1 &&
    Array.isArray(d.board) &&
    d.board.length === 14 &&
    d.board.every((n) => integer(n, 0, 48)) &&
    (d.board as number[]).reduce((a, b) => a + b, 0) === 48 &&
    integer(d.par, 1, 12) &&
    Array.isArray(d.objectives) &&
    d.objectives.every((o) => o === "capture" || o === "one-turn")
  );
}
