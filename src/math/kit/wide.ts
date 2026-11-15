import { KIT_MAX, WIDE_MAX, type Op, type Problem, validProblem } from "./model";

/**
 * Single-step facts that go beyond 100, up to the wide range: 99 + 2, 340 + 280, 1000 − 450. Unknown is the result or
 * the second number, as in the rest of the kit. Deterministic for a given random source, and never repeats a fact.
 */
const draw = (rng: () => number, n: number) => {
  const r = rng();
  return Math.min(n - 1, Math.max(0, Math.floor(Number.isFinite(r) ? r * n : 0)));
};
const keyOf = (p: Problem) => `${p.op}${p.a},${p.b},${p.unknown}`;

/** Whether a fact is beyond 100 somewhere: an addend, the total, or the number taken from. */
export const isWide = (p: Problem): boolean => p.a > KIT_MAX || p.b > KIT_MAX || (p.op === "add" ? p.a + p.b : p.a - p.b) > KIT_MAX;

/** `count` distinct wide facts (at least one number over 100 in each), mixed add and subtract unless `op` says otherwise. */
export function wideProblems(count: number, rng: () => number, max = WIDE_MAX, op: Op | "mixed" = "mixed"): Problem[] {
  const out: Problem[] = [], seen: string[] = [];
  const take = (p: Problem) => {
    if (!validProblem(p, max) || !isWide(p) || seen.indexOf(keyOf(p)) >= 0) return false;
    out.push(p); seen.push(keyOf(p));
    return true;
  };
  for (let i = 0; out.length < count && i < count * 60; i++) {
    const kind: Op = op === "mixed" ? (draw(rng, 2) === 0 ? "add" : "subtract") : op;
    const unknown: Problem["unknown"] = draw(rng, 4) === 0 ? "second" : "result";
    take(kind === "add"
      ? { op: "add", a: 1 + draw(rng, max - 1), b: 1 + draw(rng, max - 1), unknown }
      : { op: "subtract", a: KIT_MAX + 1 + draw(rng, max - KIT_MAX), b: 1 + draw(rng, max - 1), unknown });
  }
  for (let a = KIT_MAX + 1; out.length < count && a <= max; a++) take({ op: op === "subtract" ? "subtract" : "add", a, b: 1 + (a % 97), unknown: "result" });
  return out;
}
