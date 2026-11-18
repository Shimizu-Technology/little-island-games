import { mixInts, type Op } from "./model";

/**
 * Missing numbers anywhere (SC-13, Quick Practice): `? + 6 = 14`, `15 − ? = 8`, `? − 7 = 9`, and equal sides such as
 * `7 + ? = 5 + 9`. The kit's `Problem` hides only the second number or the result; these hide any part. Plain data in
 * and out, like the rest of the kit.
 */
/** Which part of `a op b = c` is hidden: 0 the first number, 1 the second, 2 the result. */
export type Blank = 0 | 1 | 2;
export type Missing = { op: Op; a: number; b: number; blank: Blank };
/** Equal sides: `a + b = c + d` with one of the four numbers hidden (0 to 3, left to right). */
export type Balance = { a: number; b: number; c: number; d: number; blank: 0 | 1 | 2 | 3 };

const whole = (v: unknown, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
const sign = (op: Op) => (op === "add" ? "+" : "−");

export const missingResult = (m: Missing): number => (m.op === "add" ? m.a + m.b : m.a - m.b);
export const missingAnswer = (m: Missing): number => (m.blank === 0 ? m.a : m.blank === 1 ? m.b : missingResult(m));
/** Every number, the hidden one too, a whole number from 0 to `max`. */
export function validMissing(v: unknown, max: number): v is Missing {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const m = v as Record<string, unknown>, keys = Object.keys(m);
  if (keys.length !== 4 || !["op", "a", "b", "blank"].every((k) => keys.indexOf(k) >= 0)) return false;
  if ((m.op !== "add" && m.op !== "subtract") || (m.blank !== 0 && m.blank !== 1 && m.blank !== 2)) return false;
  return whole(m.a, max) && whole(m.b, max) && whole(missingResult(m as Missing), max);
}
/** `? + 6 = 14`, or revealed `8 + 6 = 14`. */
export function missingText(m: Missing, reveal = false): string {
  const part = (n: number, i: Blank) => (m.blank === i && !reveal ? "?" : String(n));
  return `${part(m.a, 0)} ${sign(m.op)} ${part(m.b, 1)} = ${part(missingResult(m), 2)}`;
}

export const balanceAnswer = (b: Balance): number => [b.a, b.b, b.c, b.d][b.blank];
export function validBalance(v: unknown, max: number): v is Balance {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const b = v as Record<string, unknown>, keys = Object.keys(b);
  if (keys.length !== 5 || !["a", "b", "c", "d", "blank"].every((k) => keys.indexOf(k) >= 0)) return false;
  if (!(b.blank === 0 || b.blank === 1 || b.blank === 2 || b.blank === 3)) return false;
  if (![b.a, b.b, b.c, b.d].every((n) => whole(n, max))) return false;
  return (b.a as number) + (b.b as number) === (b.c as number) + (b.d as number) && whole((b.a as number) + (b.b as number), max);
}
/** `7 + ? = 5 + 9`, or revealed `7 + 7 = 5 + 9`. */
export function balanceText(b: Balance, reveal = false): string {
  const n = [b.a, b.b, b.c, b.d].map((x, i) => (i === b.blank && !reveal ? "?" : String(x)));
  return `${n[0]} + ${n[1]} = ${n[2]} + ${n[3]}`;
}
/** The side with no hidden number, worked out: what both sides make. */
export const balanceTotal = (b: Balance): number => b.a + b.b;

/**
 * A small deterministic random source from a seed (mulberry32). A game can draw a fresh question inside a move this
 * way, without a clock or `Math.random`, and the same saved seed always draws the same question.
 */
export function seeded(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
/** The random source for the n-th draw of a round with this seed. */
export const drawFor = (seed: number, n: number): (() => number) => seeded(mixInts(seed, n, 0x51));
