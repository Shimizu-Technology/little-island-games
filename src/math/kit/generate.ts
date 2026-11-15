import { resultOf, sameFact, type Op, type Problem } from "./model";
import { planFor, planLength, routesFor, type RouteId, type Scaffold, type Step } from "./plan";

/**
 * Levels are graded by the strategy a problem asks for, not by how big its numbers are. Each level has one
 * canonical route; a problem belongs to a level only if that route fits it. Number size ramps inside a level.
 *
 *   1 count on          up to 10, join or take away
 *   2 ten and ones      place value, no trade
 *   3 bridge a ten      cross ten within 20, the bridge is drawn
 *   4 make a ten        the child chooses what to move; missing numbers too
 *   5 open a ten        regroup: add with a carry, take away with a borrow, up to 99
 */
export type Level = 1 | 2 | 3 | 4 | 5;
export type OpChoice = "add" | "subtract" | "mixed";
export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5];
/** Questions in one School round, one rung each. */
export const ROUND_LENGTH = 5;

export function levelRoute(level: Level, p: Problem): RouteId {
  if (level === 1) return "count";
  if (level === 2) return "tens-ones";
  if (level === 5) return "trade";
  return p.unknown === "second" ? "up-to-ten" : "to-ten";
}
export const levelScaffold = (level: Level): Scaffold => (level === 4 ? "built" : "prompted");
/** The plan a child follows at this level, or null when the problem does not belong there. */
export function levelPlan(level: Level, p: Problem): Step[] | null {
  return fitsLevel(level, p) ? planFor(p, levelRoute(level, p), levelScaffold(level)) : null;
}

export function fitsLevel(level: Level, p: Problem): boolean {
  const r = resultOf(p);
  if (r < 0 || p.a < 0 || p.b < 0) return false;
  switch (level) {
    case 1: return p.unknown === "result" && p.a >= 1 && p.b >= 1 && p.a <= 10 && p.b <= 10 && r >= 1 && r <= 10;
    case 2: return p.unknown === "result" && r >= 1 && (p.a >= 10 || p.b >= 10) && Math.max(p.a, p.b, r) <= 99 && planFor(p, "tens-ones") !== null;
    case 3: return p.unknown === "result" && (p.op === "add" ? p.a <= 9 && p.b <= 9 : p.a <= 19) && planFor(p, "to-ten") !== null;
    case 4: return p.unknown === "result"
      ? (p.op === "add" ? p.a <= 9 && p.b <= 9 : p.a <= 19) && planFor(p, "to-ten", "built") !== null
      : planFor(p, "up-to-ten") !== null;
    // A carry should leave something behind: 48 + 2 only completes a ten, so it is not a regrouping question.
    // Taking away from a teen is a level 3 bridge, so a level 5 subtraction starts at 21 or more.
    case 5: return p.unknown === "result" && planFor(p, "trade") !== null && (p.op === "add" ? p.a >= 13 && (p.a % 10) + (p.b % 10) >= 11 : p.a >= 21);
  }
}

/** First hop of a ten-bridge and what is left after it. */
function bridge(p: Problem): { d: number; rest: number } {
  const oa = p.a % 10;
  const d = p.op === "add" ? 10 - oa : oa;
  return { d, rest: p.b - d };
}
/** Whether a problem sits at a rung of its level (0 gentlest, 4 hardest). */
function atRung(level: Level, rung: number, p: Problem): boolean {
  const r = resultOf(p);
  switch (level) {
    case 1: return rung <= 1 ? Math.max(p.a, p.b, r) <= 6 && p.a + p.b >= 3 : rung === 2 ? r <= 8 && Math.min(p.a, p.b) >= 2 : Math.max(p.a, p.b) >= 4 && Math.min(p.a, p.b) >= 2;
    // Early rungs work with real ones on both sides; 10 + 5 or 15 - 10 has no ones to work out. Later rungs may add whole tens.
    case 2: {
      const ones = p.a % 10 > 0 && p.b % 10 > 0;
      return rung <= 1 ? ones && Math.max(p.a, p.b, r) <= 15 : rung === 2 ? ones && Math.max(p.a, p.b, r) <= 20 : Math.min(p.a, p.b) >= 10 || p.a >= 20;
    }
    case 3: case 4: {
      if (p.unknown === "second") {
        const lo = p.op === "add" ? p.a : p.a - p.b, hi = p.op === "add" ? p.a + p.b : p.a;
        return lo >= 4 && hi - 10 >= 2 && hi - lo >= 3;
      }
      const { d, rest } = bridge(p);
      return rung === 0 ? d <= 2 && rest <= 3 && p.b >= 3 : rung === 1 ? d <= 3 && p.b >= 3 : rung === 2 ? p.b >= 3 : d >= 3 && rest >= 2;
    }
    case 5: {
      const big = p.b >= 10;
      return rung <= 1 ? !big && Math.max(p.a, r) <= 90 : rung === 2 ? big && Math.max(p.a, p.b) <= 79 : big && p.b >= 15;
    }
  }
}

const OPS: readonly Op[] = ["add", "subtract"];
const cache: Record<string, Problem[]> = {};
/** Every problem a level offers at a rung, in a fixed order. Cached: the lists are small. */
export function candidates(level: Level, op: Op, rung: number, unknown: Problem["unknown"] = "result"): Problem[] {
  const key = `${level}${op}${rung}${unknown}`;
  const hit = cache[key];
  if (hit) return hit;
  const out: Problem[] = [];
  const top = level === 5 ? 99 : level === 2 ? 99 : 20;
  for (let a = 0; a <= top; a++) for (let b = 0; b <= (level === 5 ? 99 : level === 2 ? 99 : 20); b++) {
    const p: Problem = { op, a, b, unknown };
    if (fitsLevel(level, p) && atRung(level, rung, p)) out.push(p);
  }
  cache[key] = out;
  return out;
}

const draw = (rng: () => number, n: number) => Math.min(n - 1, Math.max(0, Math.floor((Number.isFinite(rng()) ? rng() : 0) * n) || 0));
const pickFrom = (list: readonly Problem[], avoid: readonly Problem[], rng: () => number): Problem | null => {
  const fresh = list.filter((p) => !avoid.some((q) => sameFact(p, q)));
  const pool = fresh.length ? fresh : list;
  return pool.length ? pool[draw(rng, pool.length)] : null;
};

/** The op and the unknown a rung asks for. Levels 4 and 5 always alternate; 1 to 3 follow the child's choice. */
export function slotFor(level: Level, rung: number, choice: OpChoice): { op: Op; unknown: Problem["unknown"] } {
  const mixed = level >= 4 || choice === "mixed";
  const op: Op = mixed ? OPS[rung % 2] : choice;
  // Level 4 ends on missing numbers: `14 - ? = 8`, then `9 + ? = 15`.
  if (level === 4 && rung >= 3) return { op: rung === 3 ? "subtract" : "add", unknown: "second" };
  return { op, unknown: "result" };
}

/** One round's problems: ROUND_LENGTH distinct facts that climb the rungs. Always returns a full list. */
export function roundProblems(level: Level, choice: OpChoice, rng: () => number): Problem[] {
  const out: Problem[] = [];
  for (let rung = 0; rung < ROUND_LENGTH; rung++) {
    const { op, unknown } = slotFor(level, rung, choice);
    let p = pickFrom(candidates(level, op, rung, unknown), out, rng);
    // Defensive only: every slot has candidates, but a round must never come up short.
    for (let step = 1; !p && step <= 4; step++) p = pickFrom(candidates(level, op, Math.max(0, rung - step), unknown), out, rng);
    if (!p) throw new Error(`No ${op} problems for level ${level}`);
    out.push(p);
  }
  return out;
}

/** A distinct bank of problems for one level, spread across the rungs and both operations. For the baked Endless bands. */
export function bakeLevel(level: Level, count: number, rng: () => number): Problem[] {
  const out: Problem[] = [];
  for (let i = 0; out.length < count && i < count * 8; i++) {
    const { op, unknown } = slotFor(level, i % ROUND_LENGTH, "mixed");
    const p = pickFrom(candidates(level, op, i % ROUND_LENGTH, unknown), out, rng);
    if (p && !out.some((q) => sameFact(p, q))) out.push(p);
  }
  return out;
}

/** Strategies that would also solve this problem, besides the level's own route: the "second ways". */
export function secondWays(level: Level, p: Problem): RouteId[] {
  const own = planFor(p, levelRoute(level, p), "prompted");
  const ownKey = own ? JSON.stringify(own) : "";
  return routesFor(p).filter((r) => r !== "count" && JSON.stringify(planFor(p, r, "prompted")) !== ownKey);
}

/** Graded cost: how many accepted steps this level's plan takes. */
export const levelSteps = (level: Level, p: Problem): number => {
  const plan = levelPlan(level, p);
  return plan ? planLength(plan) : 0;
};
