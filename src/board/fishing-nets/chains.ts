import type { Seat } from "../../games/match";
import { integer, withEdge, type Position } from "../types";
import { boxEdges, create, legal, move } from "./engine";

/**
 * Fishing Nets chain endings. Each one is a legal game, replayed rope by rope through the
 * real engine, that leaves the circle side (seat 0) to move with a few ropes open.
 */
export type Descriptor = {
  version: 1;
  size: 3 | 4;
  /** Ropes tied from an empty board, circle starting. Ends with circle to move. */
  moves: number[];
};
/** Curated endings keep the exact table small: at most 2^12 sets of tied ropes. */
export const chainRopes = 12;
/** Replays the game. Null if a rope is illegal, the game is over, or square is to move. */
export function replay(size: number, moves: readonly number[]): Position | null {
  let p = create(0, size, 0);
  for (const m of moves) {
    const next = move(p, m);
    if (next === p) return null;
    p = next;
  }
  return p.outcome === null && p.turn === 0 ? p : null;
}
export const positionOf = (d: Descriptor): Position => replay(d.size, d.moves)!;

/**
 * Exact values for every position reachable from one root, by the set of ropes tied
 * since the root. A value is the boxes the side to move wins from the open boxes minus
 * the boxes the other side wins, with best play by both. Closing a box keeps the turn,
 * so that seat chooses again and its gain adds; any other rope passes the turn and the
 * value flips. Built once, from the full board backwards, with no recursion.
 */
export class NetsTable {
  readonly open: number[];
  readonly value: Int8Array;
  private readonly boxMask: number[];
  private readonly ropeBoxes: number[][];
  constructor(readonly root: Position, max = chainRopes) {
    this.open = legal(root);
    const r = this.open.length;
    if (r > max) throw new Error(`Too many open ropes for an exact table: ${r}.`);
    const n = root.size,
      boxes = root.marks.flatMap((v, b) => (v === -1 ? [b] : []));
    const masks = new Map(boxes.map((b) => [b, boxEdges(n, b).reduce((m, e) => (this.open.includes(e) ? m | (1 << this.open.indexOf(e)) : m), 0)]));
    this.boxMask = root.marks.map((_, b) => masks.get(b) ?? 0);
    this.ropeBoxes = this.open.map((e) => boxes.filter((b) => boxEdges(n, b).includes(e)));
    const full = (1 << r) - 1,
      value = new Int8Array(1 << r);
    for (let mask = full - 1; mask >= 0; mask--) {
      let best = -128;
      for (let i = 0; i < r; i++) if (!(mask & (1 << i))) best = Math.max(best, this.after(mask, i, value));
      value[mask] = best;
    }
    this.value = value;
  }
  /** Boxes rope `i` closes when tied with the ropes in `mask` already tied. */
  gain(mask: number, i: number): number {
    const next = mask | (1 << i);
    return this.ropeBoxes[i].filter((b) => (this.boxMask[b] & ~next) === 0).length;
  }
  /** Value for the side to move of tying rope `i` from `mask`. */
  private after(mask: number, i: number, value: Int8Array = this.value): number {
    const g = this.gain(mask, i),
      child = value[mask | (1 << i)];
    return g ? g + child : -child;
  }
  maskOf(p: Position): number {
    return this.open.reduce((m, e, i) => (p.board[e] !== -1 ? m | (1 << i) : m), 0);
  }
  /** Value of tying `rope` now, for the side to move. */
  ropeValue(p: Position, rope: number): number {
    const i = this.open.indexOf(rope);
    if (i < 0 || p.board[rope] !== -1) throw new Error("Not an open rope of this ending.");
    return this.after(this.maskOf(p), i);
  }
  /** Ropes with the best value for the side to move, lowest rope first. */
  best(p: Position): number[] {
    const ropes = legal(p),
      values = ropes.map((e) => this.ropeValue(p, e)),
      top = Math.max(...values);
    return ropes.filter((_, i) => values[i] === top);
  }
  /** Final circle boxes minus square boxes, head starts included, with best play from here. */
  margin(p: Position): number {
    const [a, b] = withEdge(p),
      v = p.outcome !== null ? 0 : this.value[this.maskOf(p)];
    return a - b + (p.turn === 0 ? v : -v);
  }
  /** The most boxes circle can be sure of from here. */
  bestBoxes(p: Position): number {
    const open = p.marks.filter((m) => m === -1).length,
      v = p.outcome !== null ? 0 : this.value[this.maskOf(p)];
    return p.scores[0] + (open + (p.turn === 0 ? v : -v)) / 2;
  }
}
/** Square's ropes until circle's turn or the end: the best for square, lowest rope first. */
export function defend(p: Position, table: NetsTable): { position: Position; replies: number[] } {
  const replies: number[] = [];
  let s = p;
  while (s.outcome === null && s.turn === 1) {
    const rope = table.best(s)[0];
    replies.push(rope);
    s = move(s, rope);
  }
  return { position: s, replies };
}
export const wins = (p: Position, seat: Seat = 0) => p.outcome === seat;
export function validDescriptor(v: unknown): v is Descriptor {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const d = v as Record<string, unknown>;
  if (Object.keys(d).sort().join() !== "moves,size,version" || d.version !== 1 || (d.size !== 3 && d.size !== 4)) return false;
  if (!Array.isArray(d.moves) || d.moves.length > 2 * d.size * (d.size + 1) || !d.moves.every((m) => integer(m, 0, 39))) return false;
  const p = replay(d.size, d.moves as number[]);
  return !!p && legal(p).length <= chainRopes && legal(p).length >= 3;
}
/**
 * The idea a curated ending teaches, read from its best line:
 * - "leave-two": circle takes what's on offer but leaves the last two boxes with one rope,
 *   while a box is still there to take. Ray takes the two and must open the next chain.
 * - "middle-two": every rope gives boxes away; circle hands Ray a pair through its middle
 *   rope, so Ray can't hand the pair back and must open the next chain.
 * Each is checked against the exact table: the move is strictly better than the tempting one.
 */
export type Theme = "leave-two" | "middle-two";
export type Lesson = { theme: Theme; at: Position; rope: number; tempting: number[] };
const sidesOf = (p: Position, b: number) => boxEdges(p.size, b).filter((e) => p.board[e] !== -1).length;
const touching = (p: Position, rope: number) => p.marks.flatMap((v, b) => (v === -1 && boxEdges(p.size, b).includes(rope) ? [b] : []));
export function lesson(d: Descriptor): Lesson | null {
  const table = tableFor(d);
  let q = positionOf(d);
  while (q.outcome === null) {
    if (q.turn === 1) {
      q = defend(q, table).position;
      continue;
    }
    const rope = table.best(q)[0],
      after = move(q, rope);
    if (after.turn === 0) {
      q = after;
      continue;
    }
    return lessonAt(q, rope, table);
  }
  return null;
}
/**
 * The idea, if any, that one circle rope at one position teaches: the same two tests `lesson` applies on the best
 * line plus the ending both ideas promise, so a hint on a different but still winning route only names an idea that
 * is true on the board in front of the child.
 */
export function lessonAt(q: Position, rope: number, table: NetsTable): Lesson | null {
  const after = move(q, rope);
  if (q.outcome !== null || q.turn !== 0 || after.turn === 0) return null;
  const next = defend(after, table).position,
    taken = next.scores[1] - after.scores[1],
    value = table.ropeValue(q, rope),
    closers = legal(q).filter((e) => move(q, e).turn === 0);
  // Both ideas end "then Ray has to open the next chain of boxes for you": a box must be waiting for circle.
  if (next.outcome !== null || !legal(next).some((e) => move(next, e).turn === 0)) return null;
  if (closers.length && taken === 2) {
    const tempting = closers.filter((e) => table.ropeValue(q, e) < value);
    return tempting.length === closers.length ? { theme: "leave-two", at: q, rope, tempting } : null;
  }
  const pair = touching(q, rope);
  if (!closers.length && taken === 2 && pair.length === 2 && pair.every((b) => sidesOf(q, b) === 2)) {
    const ends = pair.flatMap((b) => boxEdges(q.size, b).filter((e) => e !== rope && q.board[e] === -1));
    return ends.length && ends.every((e) => table.ropeValue(q, e) < value) ? { theme: "middle-two", at: q, rope, tempting: ends } : null;
  }
  return null;
}
const tables = new Map<string, NetsTable>();
/** One exact table per ending, built on first use. */
export function tableFor(d: Descriptor): NetsTable {
  const id = `${d.size}:${d.moves.join(",")}`;
  let t = tables.get(id);
  if (!t) tables.set(id, (t = new NetsTable(positionOf(d))));
  return t;
}
/**
 * Circle's final box counts over every line that wins against the in-game defence.
 * The "all the boxes you can" dare is offered only when some winning line falls short.
 */
export function winningTotals(d: Descriptor): number[] {
  const table = tableFor(d),
    memo = new Map<string, Set<number>>();
  const search = (q: Position): Set<number> => {
    if (q.outcome !== null) return new Set(q.outcome === 0 ? [q.scores[0]] : []);
    const id = `${table.maskOf(q)}:${q.scores[0]}`,
      known = memo.get(id);
    if (known) return known;
    const out = new Set<number>();
    for (const rope of legal(q)) {
      const after = move(q, rope);
      for (const n of search(after.turn === 1 ? defend(after, table).position : after)) out.add(n);
    }
    memo.set(id, out);
    return out;
  };
  return [...search(positionOf(d))].sort((a, b) => a - b);
}
