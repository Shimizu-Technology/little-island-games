import { RoundResult, Seat, validSeat } from "../games/match";
export const strengths = ["gentle", "growing", "challenge"] as const;
export type Strength = (typeof strengths)[number];
export type ReefFallback = {
  /** Certified safe opening cell shown to the player before the first tap. */
  start: number;
  /** Sorted urchin cell indices of the certified fallback board. */
  mines: number[];
};
/** Canonical engine state. marks is game-specific public bookkeeping. */
export type Position = {
  seed: number;
  size: number;
  starter: Seat;
  turn: Seat;
  moves: number[];
  board: number[];
  marks: number[];
  scores: [number, number];
  outcome: RoundResult;
  /**
   * A declared head start, per seat, in the game's own units. Present only when
   * nonzero, so every older saved position keeps its exact shape.
   */
  edge?: [number, number];
  /**
   * Reef Sweep rules revision. Absent on legacy paused rounds (which keep their
   * original single-shuffle layout); 2 enables deterministic first-tap no-guess redraw.
   */
  rules?: 2;
  /**
   * Proven redraw attempt index (0..REDRAW_MAX_ATTEMPTS-1) for a rules: 2 Reef Sweep board.
   * Recorded on the first opening so commit, save validation, and undo reconstruct that exact
   * candidate directly without re-searching earlier attempts.
   */
  attempt?: number;
  /**
   * Present only when the player explicitly accepted a certified fallback Reef Sweep board
   * after bounded redraw exhausted its budget. Never set silently.
   */
  fallback?: ReefFallback;
};
export type Edge = [number, number];
export type Engine = {
  create: (seed?: number, size?: number, starter?: Seat, edge?: Edge) => Position;
  /** Largest head start the rules allow for one seat. 0 means none. */
  maxEdge: number;
  move: (state: Position, move: number) => Position;
  legal: (state: Position) => number[];
  choose: (state: Position, strength: Strength) => number | null;
  validate: (value: unknown) => value is Position;
};
export const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const integer = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
export function rng(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}
export function shuffle<T>(values: readonly T[], seed: number): T[] {
  const a = [...values],
    random = rng(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function blank(seed: number, size: number, starter: Seat, board: number[], marks: number[] = [], edge?: Edge): Position {
  const p: Position = { seed: seed >>> 0, size, starter, turn: starter, board, marks, scores: [0, 0], moves: [], outcome: null };
  return edge && (edge[0] || edge[1]) ? { ...p, edge: [edge[0], edge[1]] } : p;
}
export const edgeOf = (s: Position): Edge => s.edge ?? [0, 0];
/** Scores plus any declared head start. */
export const withEdge = (s: Position, scores: readonly number[] = s.scores): [number, number] => {
  const e = edgeOf(s);
  return [scores[0] + e[0], scores[1] + e[1]];
};
export const validEdge = (v: unknown, max: number): v is Edge =>
  Array.isArray(v) && v.length === 2 && v.every((n) => integer(n, 0, max)) && (v[0] > 0 || v[1] > 0) && (v[0] === 0 || v[1] === 0);
export function tally(scores: readonly number[]): RoundResult {
  return scores[0] === scores[1] ? "draw" : scores[0] > scores[1] ? 0 : 1;
}
/** Replaying rejects forged outcomes, wrong turns, duplicate/illegal moves and unreachable boards. */
export function replayValidator(
  create: Engine["create"],
  move: Engine["move"],
  sizes: number[],
  maxMoves: number,
  maxEdge = 0
) {
  return (value: unknown): value is Position => {
    if (!object(value)) return false;
    const keys = Object.keys(value).sort().join();
    if (
      (keys !== "board,marks,moves,outcome,scores,seed,size,starter,turn" &&
        !(keys === "board,edge,marks,moves,outcome,scores,seed,size,starter,turn" && validEdge(value.edge, maxEdge))) ||
      !integer(value.seed, 0, 0xffffffff) ||
      !sizes.includes(value.size as number) ||
      !validSeat(value.starter) ||
      !Array.isArray(value.moves) ||
      value.moves.length > maxMoves ||
      !value.moves.every((m) => integer(m, 0, 1000))
    )
      return false;
    let state = create(value.seed, value.size as number, value.starter, value.edge as Edge | undefined);
    for (const action of value.moves) {
      const next = move(state, action);
      if (next === state) return false;
      state = next;
    }
    return Object.keys(state).every((k) => JSON.stringify(state[k as keyof Position]) === JSON.stringify(value[k]));
  };
}
/** Fixed node budget bounds alpha-beta even on extra-turn games. */
export function minimax(
  state: Position,
  depth: number,
  legal: Engine["legal"],
  move: Engine["move"],
  evaluate: (s: Position, seat: Seat) => number,
  budget = 9000
): number | null {
  const seat = state.turn;
  let nodes = 0;
  function search(s: Position, remaining: number, alpha: number, beta: number): number {
    if (s.outcome !== null)
      return s.outcome === "draw" ? 0 : s.outcome === seat ? 100000 + remaining : -100000 - remaining;
    if (remaining <= 0 || ++nodes > budget) return evaluate(s, seat);
    const maximize = s.turn === seat;
    let best = maximize ? -Infinity : Infinity;
    for (const m of legal(s)) {
      const score = search(move(s, m), remaining - 1, alpha, beta);
      best = maximize ? Math.max(best, score) : Math.min(best, score);
      if (maximize) alpha = Math.max(alpha, best);
      else beta = Math.min(beta, best);
      if (alpha >= beta || nodes > budget) break;
    }
    return Number.isFinite(best) ? best : evaluate(s, seat);
  }
  let best = -Infinity,
    selected: number | null = null;
  for (const m of legal(state)) {
    const score = search(move(state, m), depth - 1, -Infinity, Infinity);
    if (score > best) {
      best = score;
      selected = m;
    }
  }
  return selected;
}
