import { KIT_MAX, type Op } from "./model";
import type { Step } from "./plan";

/**
 * Two-step problems: `a first b second c`, worked left to right. "8 + 5 − 4 = ?" asks for 13 first, then 9. The
 * middle number is its own step, so help, replay and "show another way" treat it like any other plan.
 * Same rules as the rest of the kit: plain data in and out, no clock, no random source of its own.
 */
export type TwoStep = { a: number; first: Op; b: number; second: Op; c: number };

const whole = (v: unknown, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
const apply = (op: Op, x: number, y: number) => (op === "add" ? x + y : x - y);
export const twoStepMid = (t: TwoStep): number => apply(t.first, t.a, t.b);
export const twoStepResult = (t: TwoStep): number => apply(t.second, twoStepMid(t), t.c);

/** Exactly five keys, whole numbers up to `max` (100, or the wide range), and a middle number and answer that stay on the number line. */
export function validTwoStep(v: unknown, max = KIT_MAX): v is TwoStep {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const t = v as Record<string, unknown>, keys = Object.keys(t);
  if (keys.length !== 5 || !["a", "first", "b", "second", "c"].every((k) => keys.indexOf(k) >= 0)) return false;
  if ((t.first !== "add" && t.first !== "subtract") || (t.second !== "add" && t.second !== "subtract")) return false;
  if (!whole(t.a, max) || !whole(t.b, max) || !whole(t.c, max)) return false;
  const mid = apply(t.first, t.a, t.b);
  return whole(mid, max) && whole(apply(t.second, mid, t.c), max);
}

const sign = (op: Op) => (op === "add" ? "+" : "−");
/** `8 + 5 − 4 = ?`, or the revealed `8 + 5 − 4 = 9`. */
export const twoStepText = (t: TwoStep, reveal = false): string => `${t.a} ${sign(t.first)} ${t.b} ${sign(t.second)} ${t.c} = ${reveal ? twoStepResult(t) : "?"}`;
export const twoStepKey = (t: TwoStep): string => `${t.a}${t.first === "add" ? "+" : "-"}${t.b}${t.second === "add" ? "+" : "-"}${t.c}`;

/** The middle number, then the answer. Null for a problem outside the range. */
export function twoStepPlan(t: TwoStep, max = KIT_MAX): Step[] | null {
  if (!validTwoStep(t, max)) return null;
  return [{ kind: "number", value: twoStepMid(t), role: "part" }, { kind: "number", value: twoStepResult(t), role: "final" }];
}

const draw = (rng: () => number, n: number) => {
  const r = rng();
  return Math.min(n - 1, Math.max(0, Math.floor(Number.isFinite(r) ? r * n : 0)));
};
/** Both steps must do something: something to add or take each time, and an answer that is not just the number you started with. */
const worthAsking = (t: TwoStep, max: number) => t.b >= 1 && t.c >= 1 && validTwoStep(t, max) && twoStepMid(t) >= 1 && twoStepResult(t) >= 1 && twoStepResult(t) !== t.a;

/** `count` distinct two-step problems up to `max`, the same list for the same random source. Always returns a full list. */
export function twoStepProblems(count: number, rng: () => number, max = KIT_MAX): TwoStep[] {
  const out: TwoStep[] = [], keys: string[] = [];
  const take = (t: TwoStep) => {
    if (!worthAsking(t, max) || keys.indexOf(twoStepKey(t)) >= 0) return false;
    out.push(t); keys.push(twoStepKey(t));
    return true;
  };
  const ops: Op[] = ["add", "subtract"];
  for (let i = 0; out.length < count && i < count * 60; i++) {
    take({ a: 1 + draw(rng, max), first: ops[draw(rng, 2)], b: 1 + draw(rng, Math.min(max, 60)), second: ops[draw(rng, 2)], c: 1 + draw(rng, Math.min(max, 60)) });
  }
  // A scan fills any gap in a fixed order, so a round never comes up short.
  for (let a = 2; out.length < count && a <= max; a++) for (let b = 1; out.length < count && b <= 9; b++) take({ a, first: "add", b, second: "subtract", c: 1 + (a % 7) });
  return out;
}
