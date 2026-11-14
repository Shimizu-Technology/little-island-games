/** Build-time only. Freezes the Challenge puzzles so a later change to the generator can never move a published one. */
import { writeFileSync } from "node:fs";
import { random } from "../../../games/types";
import {
  candidates, fewestSteps, levelPlan, levelRoute, planLength, secondWays, slotFor, ROUND_LENGTH, type Level, type Problem, type RouteId,
} from "../../../math/kit";
import { codeOf } from "./round2";
import type { Descriptor } from "./challenge-task";

export const PER_LEVEL = 24, DARES_PER_LEVEL = 16;
const rungs = [5, 5, 5, 5, 4];

function wanted(level: Level, p: Problem): RouteId[] | null {
  const own = levelRoute(level, p), others = secondWays(level, p).filter((r) => r !== own);
  if (level === 3) return others.length ? [own, ...others].slice(0, 3) : null;
  if (level === 5) {
    const ownLen = planLength(levelPlan(5, p)!);
    const shorter = others.filter((r) => fewestSteps(p, [r]) < ownLen);
    return shorter.length ? [own, ...others].slice(0, 3) : null;
  }
  return [own];
}

/** Rung by rung, easiest first. At levels 3 and 5 the bank leads with puzzles that really have more than one way. */
export function bakeFacts(level: Level): Descriptor[] {
  const rng = random(0x4e31a0 + level * 977), seen = new Set<string>(), picked: { d: Descriptor; rung: number }[] = [];
  const key = (p: Problem) => `${p.op}${Math.min(p.a, p.b)}${Math.max(p.a, p.b)}${p.unknown}`;
  const needWays = level === 3 || level === 5;
  const take = (rung: number, need: boolean, count: number) => {
    const { op, unknown } = slotFor(level, rung, "mixed");
    const pool = [...candidates(level, op, rung, unknown), ...(level < 4 ? candidates(level, op === "add" ? "subtract" : "add", rung, unknown) : [])];
    const fit = pool.filter((p) => !seen.has(key(p)) && (!need || wanted(level, p) !== null));
    // Deterministic shuffle by the seeded source; the original list is never reordered.
    const order = fit.map((p, i) => [rng(), i] as const).sort((a, b) => a[0] - b[0]).map(([, i]) => fit[i]);
    for (const p of order.slice(0, count)) {
      seen.add(key(p));
      picked.push({ d: { t: "fact", level, item: codeOf(p), ways: wanted(level, p) ?? [levelRoute(level, p)] }, rung });
    }
  };
  for (let rung = 0; rung < ROUND_LENGTH; rung++) take(rung, needWays, needWays ? Math.min(rungs[rung], 4) : rungs[rung]);
  for (let rung = 0; rung < ROUND_LENGTH; rung++) take(rung, false, rungs[rung] - picked.filter((x) => x.rung === rung).length);
  return picked.sort((a, b) => a.rung - b.rung).map((x) => x.d).slice(0, PER_LEVEL);
}

export const deepPuzzles = (): Descriptor[] => [
  ...[[3, 17], [4, 15], [2, 26], [1, 38]].map(([tens, ones]): Descriptor => ({ t: "regroup", tens, ones })),
  ...[[17, 40, false], [28, 51, true], [46, 83, false], [59, 100, true]].map(([known, total, first]): Descriptor => ({ t: "missing", known: known as number, total: total as number, first: first as boolean })),
  ...[[34, 46], [27, 53], [48, 90], [15, 89]].map(([x, y]): Descriptor => ({ t: "equalize", x, y })),
  ...[[7, 8, 3, 2], [6, 9, 4, 1], [3, 7, 9, 1, 5, 5], [8, 2, 6, 4, 7, 3]].map((nums): Descriptor => ({ t: "pairs", nums })),
];

export function bakeAll() {
  return { facts: { 1: bakeFacts(1), 2: bakeFacts(2), 3: bakeFacts(3), 4: bakeFacts(4), 5: bakeFacts(5) }, deep: deepPuzzles() };
}
if (process.argv[1]?.endsWith("bake-challenge.ts")) {
  writeFileSync("src/learn/games/shell-math/challenge-bank.json", JSON.stringify(bakeAll(), null, 1) + "\n");
  console.log("wrote challenge-bank.json");
}
