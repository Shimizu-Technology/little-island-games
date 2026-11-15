import {
  climbPlan, equalizePlan, levelScaffold, pairsPlan, planFor, regroupPlan, type Level, type RouteId, type Step,
} from "../../../math/kit";
import { problemOf, type ItemCode } from "./round2";

/**
 * What a Shell Math Challenge puzzle is. Facts are the same questions as School, one bank per level, some with more than
 * one way through them. The four Deep Water shapes are open-a-number, a missing number, two piles and pairs of ten.
 */
export type Descriptor =
  | { t: "fact"; level: Level; item: ItemCode; ways: RouteId[] }
  | { t: "regroup"; tens: number; ones: number }
  | { t: "missing"; known: number; total: number; first: boolean }
  | { t: "equalize"; x: number; y: number }
  | { t: "pairs"; nums: number[] };

export type Way = { id: string; plan: Step[] };

/** The ways a child can go about a puzzle. One way means the board does not ask. */
export function waysOf(d: Descriptor): Way[] {
  switch (d.t) {
    case "fact": {
      const p = problemOf(d.item);
      return d.ways.map((r, i) => ({ id: r, plan: planFor(p, r, i === 0 ? levelScaffold(d.level) : "prompted") ?? [] }));
    }
    case "regroup": return [{ id: "regroup", plan: regroupPlan(d.tens, d.ones) ?? [] }];
    case "missing": return [{ id: "climb", plan: climbPlan(d.known, d.total) ?? [] }];
    case "equalize": return [{ id: "equalize", plan: equalizePlan(d.x, d.y) ?? [] }];
    case "pairs": return [{ id: "pairs", plan: pairsPlan(d.nums) ?? [] }];
  }
}
/** Every plan is non-empty and ends on the answer; false for a descriptor that cannot be played. */
export const playable = (d: Descriptor) => waysOf(d).length > 0 && waysOf(d).every((w) => w.plan.length > 0 && w.plan[w.plan.length - 1].kind === "number");
