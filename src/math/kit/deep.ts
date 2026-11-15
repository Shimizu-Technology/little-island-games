import type { Step } from "./plan";

/**
 * The four harder puzzle shapes of Deep Water, built from the same steps as an ordinary question so the same
 * rules, help and replay run them: open a number into tens and ones, find a missing number by climbing through a
 * ten, make two piles equal, and pair numbers into tens.
 */
const num = (value: number, role: "to-ten" | "rest" | "gap" | "final"): Step => ({ kind: "number", value, role });

/** `T tens and O ones`, with O of ten or more: make a ten for each ten ones, then say the number. */
export function regroupPlan(tens: number, ones: number): Step[] | null {
  if (!Number.isInteger(tens) || !Number.isInteger(ones) || tens < 0 || ones < 10 || tens * 10 + ones > 99) return null;
  const out: Step[] = [];
  for (let k = Math.floor(ones / 10); k > 0; k--) out.push({ kind: "trade", dir: "make" });
  out.push(num(tens * 10 + ones, "final"));
  return out;
}
export const regroupValue = (tens: number, ones: number) => tens * 10 + ones;

/** `lo + ? = hi`: climb to the next ten, climb the rest, then say the whole distance. */
export function climbPlan(lo: number, hi: number): Step[] | null {
  if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 1 || lo % 10 === 0) return null;
  const ten = lo + (10 - (lo % 10));
  if (hi <= ten || hi > 100) return null;
  return [num(ten - lo, "to-ten"), num(hi - ten, "rest"), num(hi - lo, "final")];
}

/** Two piles, one bigger by an even amount. Move the fewest shells to make them equal. */
export function equalizePlan(x: number, y: number): Step[] | null {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 1 || y > 99 || x >= y || (y - x) % 2 !== 0) return null;
  return [num(y - x, "gap"), num((y - x) / 2, "final")];
}

/** Numbers that pair into tens: every pair step needs two unused numbers that make ten, then the total. */
export function pairsPlan(nums: readonly number[]): Step[] | null {
  if (nums.length !== 4 && nums.length !== 6) return null;
  if (!nums.every((n) => Number.isInteger(n) && n >= 1 && n <= 9)) return null;
  // The numbers must split completely into ten-pairs, or the puzzle has no answer by pairing.
  const left = [...nums];
  while (left.length) {
    const a = left.shift()!, at = left.indexOf(10 - a);
    if (at < 0) return null;
    left.splice(at, 1);
  }
  const out: Step[] = [];
  for (let k = 0; k < nums.length / 2; k++) out.push({ kind: "pair", of: nums, sum: 10 });
  out.push(num(nums.reduce((n, v) => n + v, 0), "final"));
  return out;
}
