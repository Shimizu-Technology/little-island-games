import { integer, type Position } from "../types";
import { create, legal, move } from "./engine";

/**
 * Coconut Drop puzzles. Each one is a legal opening, replayed drop by drop through the
 * real engine from an empty board, that leaves the circle side (seat 0) to move.
 * - win: one drop finishes four in a line.
 * - block: the other side could finish four next turn, in exactly one column.
 * - fork: one drop makes two ways to finish four, so the other side can block only one.
 */
export type Kind = "win" | "block" | "fork";
export type Descriptor = {
  version: 1;
  kind: Kind;
  /** Columns 0-6 from an empty board, circle first. Even length, so circle moves next. */
  moves: number[];
  /** Fewest circle drops that meet the goal against every reply: 1, or 2 for a fork. */
  par: number;
};
export const INF = 1_000_000;
/** Replays the opening. Null if any drop is illegal or the game is already over. */
export function replay(moves: readonly number[]): Position | null {
  let p = create(0, 7, 0);
  for (const m of moves) {
    const next = move(p, m);
    if (next === p || next.outcome !== null) return null;
    p = next;
  }
  return p;
}
export const positionOf = (d: Descriptor): Position => replay(d.moves)!;
/** Columns where the side to move finishes four now. */
export const winsNow = (p: Position): number[] => legal(p).filter((c) => move(p, c).outcome === p.turn);
/** Columns where the other side would finish four if it moved now. */
export const threats = (p: Position): number[] => winsNow({ ...p, turn: p.turn === 0 ? 1 : 0 });
const key = (p: Position) => `${p.turn}${p.board.map((v) => v + 1).join("")}`;

/** Exact forced-win search for the circle side, a few drops deep. */
export class Solver {
  private memo = new Map<string, boolean>();
  constructor(readonly cap = 3) {}
  /** True if circle can force a win using at most `k` more circle drops. */
  wins(p: Position, k: number): boolean {
    if (p.outcome !== null) return p.outcome === 0;
    if (p.turn === 0 && k <= 0) return false;
    const id = `${k}|${key(p)}`,
      known = this.memo.get(id);
    if (known !== undefined) return known;
    const children = legal(p).map((c) => move({ ...p, moves: [] }, c));
    const result = p.turn === 0 ? children.some((c) => this.wins(c, k - 1)) : children.every((c) => this.wins(c, k));
    this.memo.set(id, result);
    return result;
  }
  /** Fewest circle drops that force a win, up to the cap. INF if none. */
  value(p: Position): number {
    if (p.outcome !== null) return p.outcome === 0 ? 0 : INF;
    for (let k = p.turn === 1 ? 0 : 1; k <= this.cap; k++) if (this.wins(p, k)) return k;
    return INF;
  }
  /** Circle drops that win fastest, in the engine's centre-first order. */
  bestDrops(p: Position): number[] {
    if (p.turn !== 0 || p.outcome !== null) return [];
    const scored = legal(p).map((c) => [c, this.value(move({ ...p, moves: [] }, c))] as const),
      best = Math.min(...scored.map(([, v]) => v));
    return best >= INF ? [] : scored.filter(([, v]) => v === best).map(([c]) => c);
  }
}
/**
 * The other side's reply: finish four if it can, otherwise keep circle's win furthest
 * away, preferring a drop that blocks one of circle's fours. When nothing can stop
 * circle within the cap, it plays the Challenge rival's own move.
 */
export function defend(p: Position, solver: Solver, rival: (p: Position) => number | null): number {
  const now = winsNow(p);
  if (now.length) return now[0];
  const blocks = threats(p),
    scored = legal(p).map((c) => [c, solver.value(move({ ...p, moves: [] }, c))] as const),
    worst = Math.max(...scored.map(([, v]) => v));
  if (worst >= INF) return rival(p) ?? scored[0][0];
  const delaying = scored.filter(([, v]) => v === worst).map(([c]) => c);
  return delaying.find((c) => blocks.includes(c)) ?? delaying[0];
}
/** What a puzzle asks for, checked on the board after a circle drop. */
export function goalMet(d: Descriptor, after: Position): boolean {
  return d.kind === "block" ? after.outcome === null && winsNow(after).length === 0 : after.outcome === 0;
}
/** The circle drops that answer a puzzle from its start, for certification and Help. */
export function answers(d: Descriptor, p: Position = positionOf(d)): number[] {
  if (d.kind === "block") return legal(p).filter((c) => goalMet(d, move(p, c)));
  return new Solver(d.par).bestDrops(p).filter((c) => new Solver(d.par).wins(move(p, c), d.par - 1));
}
export function validDescriptor(v: unknown): v is Descriptor {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const d = v as Record<string, unknown>;
  return (
    Object.keys(d).sort().join() === "kind,moves,par,version" &&
    d.version === 1 &&
    (d.kind === "win" || d.kind === "block" || d.kind === "fork") &&
    integer(d.par, 1, 2) &&
    (d.kind === "fork") === (d.par === 2) &&
    Array.isArray(d.moves) &&
    d.moves.length % 2 === 0 &&
    d.moves.length <= 36 &&
    d.moves.every((m) => integer(m, 0, 6)) &&
    replay(d.moves as number[]) !== null
  );
}
