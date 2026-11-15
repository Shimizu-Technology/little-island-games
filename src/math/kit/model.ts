/**
 * K4 number kit: the pure, worklet-safe arithmetic model.
 *
 * Plain data in, plain data out. No React, clocks, `Math.random`, classes, Map or Set, so every function here
 * can run on the JS thread, in a worklet, or in a test the same way. Shell Math, Number Hop, Quick Practice,
 * Market and the other Numbers games share it. It never mutates an input.
 */
export type Op = "add" | "subtract";
/** Which part of `a op b = c` the child finds. */
export type Unknown = "result" | "second";
export type Problem = { op: Op; a: number; b: number; unknown: Unknown };
/** Largest number any kit problem reaches. */
export const KIT_MAX = 100;

export const resultOf = (p: Problem): number => (p.op === "add" ? p.a + p.b : p.a - p.b);
export const answerOf = (p: Problem): number => (p.unknown === "second" ? p.b : resultOf(p));

const whole = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

/** Exactly four keys, whole numbers in range, and a result that stays on the number line. */
export function validProblem(v: unknown): v is Problem {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const p = v as Record<string, unknown>;
  const keys = Object.keys(p);
  if (keys.length !== 4 || !["op", "a", "b", "unknown"].every((k) => keys.includes(k))) return false;
  if ((p.op !== "add" && p.op !== "subtract") || (p.unknown !== "result" && p.unknown !== "second")) return false;
  if (!whole(p.a, 0, KIT_MAX) || !whole(p.b, 0, KIT_MAX)) return false;
  const c = p.op === "add" ? p.a + p.b : p.a - p.b;
  return whole(c, 0, KIT_MAX);
}

export const placeValue = (n: number): { tens: number; ones: number } => ({ tens: Math.floor(n / 10), ones: n % 10 });
/** "1 ten and 1 one", "3 tens and 15 ones": a count never reads "1 tens". */
export const tensOnesText = (tens: number, ones: number) => `${tens} ${tens === 1 ? "ten" : "tens"} and ${ones} ${ones === 1 ? "one" : "ones"}`;
export const fromPlaceValue = (tens: number, ones: number): number => tens * 10 + ones;
/** Trade one ten for ten ones. Null when there is no ten to open. */
export function openTen(v: { tens: number; ones: number }): { tens: number; ones: number } | null {
  return v.tens > 0 ? { tens: v.tens - 1, ones: v.ones + 10 } : null;
}
/** Trade ten ones for one ten. Null when there are fewer than ten ones. */
export function makeTen(v: { tens: number; ones: number }): { tens: number; ones: number } | null {
  return v.ones >= 10 ? { tens: v.tens + 1, ones: v.ones - 10 } : null;
}

/** `8 + 5 = ?`, or the revealed `8 + 5 = 13`. The minus sign is U+2212, like the older Shell Math. */
export function equationText(p: Problem, reveal = false): string {
  const sign = p.op === "add" ? "+" : "−";
  const second = p.unknown === "second" && !reveal ? "?" : String(p.b);
  const result = p.unknown === "result" && !reveal ? "?" : String(resultOf(p));
  return `${p.a} ${sign} ${second} = ${result}`;
}

/** Stable key for a problem, used to keep a round free of repeats and as a bank id. */
export const problemKey = (p: Problem): string => `${p.op === "add" ? "+" : "-"}${p.a},${p.b},${p.unknown === "second" ? "s" : "r"}`;
/** Two additions that only swap their addends are the same fact for a child. */
export function sameFact(x: Problem, y: Problem): boolean {
  if (x.op !== y.op || x.unknown !== y.unknown) return false;
  if (x.a === y.a && x.b === y.b) return true;
  return x.op === "add" && x.unknown === "result" && x.a === y.b && x.b === y.a;
}

/** Small deterministic hash for ordering choices without a random source. */
export function mixInts(...n: number[]): number {
  let h = 0x9e3779b9 | 0;
  for (const v of n) {
    h = Math.imul(h ^ (v | 0), 0x85ebca6b);
    h ^= h >>> 13;
  }
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Three distinct in-range choices for a typed answer's help option. The distractors are the slips a child makes
 * (one off, ten off, forgetting the trade, joining instead of taking away), in a fixed order per problem so a
 * saved or replayed round shows the same tiles.
 */
export function choicesFor(answer: number, p: Problem, max = KIT_MAX): number[] {
  const pool = [answer + 1, answer - 1, answer + 10, answer - 10, p.op === "add" ? p.a - p.b : p.a + p.b, answer + 2, answer - 2, p.a, p.b];
  const near: number[] = [];
  for (const n of pool) if (n >= 0 && n <= max && n !== answer && near.indexOf(n) < 0) near.push(n);
  for (let n = 0; near.length < 2 && n <= max; n++) if (n !== answer && near.indexOf(n) < 0) near.push(n);
  const pick = [answer, near[0], near[1]];
  // A fixed rotation chosen from the problem, so the answer does not always sit in the same place.
  const turn = mixInts(p.a, p.b, p.op === "add" ? 1 : 2, p.unknown === "second" ? 3 : 4) % 3;
  return [pick[turn % 3], pick[(turn + 1) % 3], pick[(turn + 2) % 3]];
}

/** Three distinct tiles around a step's number: the ones just off it, in a fixed order for the same number and key. */
export function choicesAround(answer: number, key: number, max = KIT_MAX): number[] {
  const near: number[] = [];
  for (const d of [1, -1, 2, -2, 10, -10, 3, -3]) {
    const n = answer + d;
    if (n >= 0 && n <= max && near.indexOf(n) < 0) near.push(n);
  }
  const pick = [answer, near[0], near[1]];
  const turn = mixInts(answer, key) % 3;
  return [pick[turn % 3], pick[(turn + 1) % 3], pick[(turn + 2) % 3]];
}
