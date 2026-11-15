import { answerOf, placeValue, resultOf, type Problem } from "./model";

/**
 * Routes are the arithmetic strategies a problem can be solved by. A plan is the ordered list of small
 * steps that route asks of a child. The board checks steps against the plan, help reads the plan, and
 * "show a second way" draws another plan for the same problem: one engine for all three.
 */
export type RouteId = "count" | "tens-ones" | "to-ten" | "to-ten-other" | "up-to-ten" | "give-take" | "trade";
/** `prompted` asks "how many to make ten?"; `built` has the child choose which shells to move. */
export type Scaffold = "prompted" | "built";
export type Role = "ones" | "tens" | "to-ten" | "rest" | "round-up" | "gap" | "part" | "final";
export type Step =
  | { kind: "count"; times: number; dir: 1 | -1 }
  | { kind: "number"; value: number; role: Role }
  | { kind: "trade"; dir: "make" | "open" }
  /** Move `n` shells into group `side` (0 = the first number's group, 1 = the second's), or take `n` away first. */
  | { kind: "fill"; options: readonly (readonly [0 | 1, number])[] }
  /** Pick two of `of`, by position, that add to `sum`. Used by the pairs puzzles. */
  | { kind: "pair"; of: readonly number[]; sum: number };

const num = (value: number, role: Role): Step => ({ kind: "number", value, role });
const one = (p: Problem) => answerOf(p);

function count(p: Problem): Step[] | null {
  if (p.unknown !== "result") return null;
  const times = p.op === "add" ? Math.min(p.a, p.b) : p.b;
  // Nothing to tap means nothing to count: counting on is not how that fact is solved.
  if (times < 1) return null;
  return [{ kind: "count", times, dir: p.op === "add" ? 1 : -1 }, num(one(p), "final")];
}

function tensOnes(p: Problem): Step[] | null {
  if (p.unknown !== "result") return null;
  const a = placeValue(p.a), b = placeValue(p.b), r = placeValue(resultOf(p));
  if (a.tens + b.tens + a.ones + b.ones === 0) return null;
  if (p.op === "add") {
    if (a.ones + b.ones > 9 || a.tens + b.tens > 9) return null;
    if (a.tens + a.ones === 0 || b.tens + b.ones === 0) return null;
    const out: Step[] = [];
    if (a.tens > 0 && b.tens > 0) out.push(num(a.tens + b.tens, "tens"));
    if (a.ones + b.ones > 0 || (a.tens > 0 && b.tens > 0 && a.ones + b.ones === 0)) out.push(num(a.ones + b.ones, "ones"));
    if (out.length === 0) return null;
    out.push(num(one(p), "final"));
    return out;
  }
  if (a.ones < b.ones || a.tens < b.tens || p.b === 0) return null;
  const out: Step[] = [];
  if (b.tens > 0) out.push(num(r.tens, "tens"));
  out.push(num(r.ones, "ones"));
  out.push(num(one(p), "final"));
  return out;
}

function toTen(p: Problem, scaffold: Scaffold): Step[] | null {
  if (p.unknown !== "result") return null;
  const oa = p.a % 10;
  if (oa === 0 || p.b > 9 || p.b < 1) return null;
  if (p.op === "add") {
    const d = 10 - oa;
    if (p.b <= d) return null;
    const options: [0 | 1, number][] = [[0, d]];
    if (p.a < 10 && p.a >= 10 - p.b) options.push([1, 10 - p.b]);
    return [scaffold === "built" ? { kind: "fill", options } : num(d, "to-ten"), num(p.b - d, "rest"), num(one(p), "final")];
  }
  if (oa >= p.b || p.a < 11) return null;
  return [scaffold === "built" ? { kind: "fill", options: [[0, oa]] } : num(oa, "to-ten"), num(p.b - oa, "rest"), num(one(p), "final")];
}

function toTenOther(p: Problem): Step[] | null {
  if (p.unknown !== "result" || p.op !== "add" || p.a > 9 || p.b > 9 || p.a === p.b || p.a + p.b < 11) return null;
  const e = 10 - p.b;
  return e <= p.a ? [num(e, "to-ten"), num(p.a - e, "rest"), num(one(p), "final")] : null;
}

/** Think addition through ten: climb from the small number to ten, then on to the big one. */
function upToTen(p: Problem): Step[] | null {
  let lo: number, hi: number;
  if (p.op === "subtract" && p.unknown === "result") { lo = p.b; hi = p.a; }
  else if (p.op === "add" && p.unknown === "second") { lo = p.a; hi = p.a + p.b; }
  else if (p.op === "subtract" && p.unknown === "second") { lo = p.a - p.b; hi = p.a; }
  else return null;
  if (lo < 1 || lo > 9 || hi < 11 || hi > 20) return null;
  return [num(10 - lo, "to-ten"), num(hi - 10, "rest"), num(one(p), "final")];
}

/** The numbers behind a round-and-fix: the nearly-ten number, the other one, what it rounds up to and the difference. */
export function giveTakeParts(p: Problem): { n: number; m: number; up: number; d: number } | null {
  if (p.unknown !== "result") return null;
  const near = (n: number) => n >= 8 && n % 10 >= 8;
  if (p.op === "add") {
    const n = near(p.b) ? p.b : near(p.a) ? p.a : -1;
    if (n < 0) return null;
    const up = n + (10 - (n % 10));
    return { n, m: n === p.b ? p.a : p.b, up, d: up - n };
  }
  if (!near(p.b)) return null;
  const up = p.b + (10 - (p.b % 10));
  return { n: p.b, m: p.a, up, d: up - p.b };
}

/** Round the nearly-ten number up, work with the easy number, then give back what was borrowed. */
function giveTake(p: Problem): Step[] | null {
  const g = giveTakeParts(p);
  if (!g) return null;
  if (p.op === "add") return g.m + g.up > 100 ? null : [num(g.m + g.up, "round-up"), num(one(p), "final")];
  return p.a < g.up ? null : [num(p.a - g.up, "round-up"), num(one(p), "final")];
}

function trade(p: Problem): Step[] | null {
  if (p.unknown !== "result" || p.a < 10) return null;
  const a = placeValue(p.a), b = placeValue(p.b);
  if (p.op === "add") {
    if (a.ones + b.ones < 10 || p.a + p.b > 99) return null;
    const out: Step[] = [num(a.ones + b.ones, "ones"), { kind: "trade", dir: "make" }];
    if (b.tens > 0) out.push(num(a.tens + b.tens + 1, "tens"));
    out.push(num(one(p), "final"));
    return out;
  }
  if (a.ones >= b.ones || a.tens < b.tens + 1) return null;
  const out: Step[] = [{ kind: "trade", dir: "open" }, num(a.ones + 10 - b.ones, "ones")];
  if (b.tens > 0) out.push(num(a.tens - 1 - b.tens, "tens"));
  out.push(num(one(p), "final"));
  return out;
}

/** The steps of one route for this problem, or null when the route does not fit it. */
export function planFor(p: Problem, route: RouteId, scaffold: Scaffold = "prompted"): Step[] | null {
  switch (route) {
    case "count": return count(p);
    case "tens-ones": return tensOnes(p);
    case "to-ten": return toTen(p, scaffold);
    case "to-ten-other": return toTenOther(p);
    case "up-to-ten": return upToTen(p);
    case "give-take": return giveTake(p);
    case "trade": return trade(p);
  }
}

export const ROUTES: readonly RouteId[] = ["count", "tens-ones", "to-ten", "to-ten-other", "up-to-ten", "give-take", "trade"];

/** Every route that fits, with a distinct plan each. Two routes that ask the same numbers count once. */
export function routesFor(p: Problem): RouteId[] {
  const seen: string[] = [];
  const out: RouteId[] = [];
  for (const r of ROUTES) {
    const plan = planFor(p, r);
    if (!plan) continue;
    const key = planKey(plan);
    if (seen.indexOf(key) >= 0) continue;
    seen.push(key);
    out.push(r);
  }
  return out;
}

/** Compact fingerprint of a plan's asked numbers, independent of how a step is drawn. */
export function planKey(plan: readonly Step[]): string {
  return plan.map((s) => (s.kind === "number" ? `n${s.value}` : s.kind === "count" ? `c${s.times}${s.dir}` : s.kind === "trade" ? `t${s.dir}` : s.kind === "pair" ? `p${s.sum}` : `f${s.options.map((o) => o.join(":")).join("/")}`)).join(",");
}
/** What a child's route is worth if the numbers were typed with no pictures: number of accepted steps. */
export const planLength = (plan: readonly Step[]): number => plan.reduce((n, s) => n + (s.kind === "count" ? s.times : 1), 0);
/** Fewest accepted steps over the given routes (default: every route that fits): the par for "fewest moves". */
export function fewestSteps(p: Problem, among: readonly RouteId[] = ROUTES): number {
  let best = 1000;
  for (const r of among) {
    const plan = planFor(p, r, "built");
    if (plan) best = Math.min(best, planLength(plan));
  }
  return best;
}
