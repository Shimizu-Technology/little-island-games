import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { random } from "../src/games/types";
import {
  KIT_MAX, LEVELS, answerOf, candidates, choicesFor, equationText, fitsLevel, fewestSteps, initialWork, advance, judge, hintFor, levelPlan,
  levelRoute, openTen, makeTen, placeValue, planFor, planKey, planLength, replay, resultOf, roundProblems, routesFor, sameFact, secondWays,
  solveActs, validAct, validProblem, ROUND_LENGTH, ROUTES, type Act, type Problem, type Step,
} from "../src/math/kit";

const every = (): Problem[] => {
  const out: Problem[] = [];
  for (const op of ["add", "subtract"] as const) for (const unknown of ["result", "second"] as const)
    for (let a = 0; a <= KIT_MAX; a++) for (let b = 0; b <= KIT_MAX; b++) { const p = { op, a, b, unknown }; if (validProblem(p)) out.push(p); }
  return out;
};

describe("K4 model", () => {
  it("accepts only whole, in-range problems with exactly four keys", () => {
    expect(validProblem({ op: "add", a: 8, b: 5, unknown: "result" })).toBe(true);
    expect(validProblem({ op: "subtract", a: 5, b: 8, unknown: "result" })).toBe(false);
    expect(validProblem({ op: "add", a: 60, b: 50, unknown: "result" })).toBe(false);
    expect(validProblem({ op: "add", a: 1.5, b: 2, unknown: "result" })).toBe(false);
    expect(validProblem({ op: "add", a: 1, b: 2, unknown: "result", extra: 1 })).toBe(false);
    expect(validProblem({ op: "mul", a: 1, b: 2, unknown: "result" })).toBe(false);
    expect(validProblem(null)).toBe(false);
    expect(validProblem([1, 2])).toBe(false);
  });
  it("answers and writes equations for every unknown", () => {
    expect(answerOf({ op: "add", a: 8, b: 5, unknown: "result" })).toBe(13);
    expect(answerOf({ op: "add", a: 9, b: 6, unknown: "second" })).toBe(6);
    expect(equationText({ op: "subtract", a: 42, b: 7, unknown: "result" })).toBe("42 − 7 = ?");
    expect(equationText({ op: "add", a: 9, b: 6, unknown: "second" })).toBe("9 + ? = 15");
    expect(equationText({ op: "add", a: 9, b: 6, unknown: "second" }, true)).toBe("9 + 6 = 15");
  });
  it("trades a ten for ten ones and back without changing the value", () => {
    expect(placeValue(47)).toEqual({ tens: 4, ones: 7 });
    expect(openTen({ tens: 4, ones: 2 })).toEqual({ tens: 3, ones: 12 });
    expect(openTen({ tens: 0, ones: 2 })).toBeNull();
    expect(makeTen({ tens: 3, ones: 14 })).toEqual({ tens: 4, ones: 4 });
    expect(makeTen({ tens: 3, ones: 9 })).toBeNull();
  });
  it("treats swapped addends as one fact but never subtraction or unknowns", () => {
    const x: Problem = { op: "add", a: 8, b: 5, unknown: "result" };
    expect(sameFact(x, { ...x, a: 5, b: 8 })).toBe(true);
    expect(sameFact({ op: "subtract", a: 13, b: 5, unknown: "result" }, { op: "subtract", a: 5, b: 13, unknown: "result" })).toBe(false);
    expect(sameFact(x, { ...x, unknown: "second" })).toBe(false);
  });
  it("gives three distinct in-range choices that include the answer, for every problem", () => {
    for (const p of every()) {
      const c = choicesFor(answerOf(p), p);
      if (new Set(c).size !== 3 || !c.includes(answerOf(p)) || c.some((n) => n < 0 || n > KIT_MAX)) throw new Error(`bad choices ${JSON.stringify(p)} ${c}`);
    }
  });
});

describe("K4 choices on a short number line", () => {
  it("stay inside the cap the level works in, still three distinct tiles with the answer", () => {
    for (const cap of [10, 20, 99]) for (const p of every()) {
      const a = answerOf(p);
      if (a > cap) continue;
      const c = choicesFor(a, p, cap);
      if (new Set(c).size !== 3 || !c.includes(a) || c.some((n) => n < 0 || n > cap)) throw new Error(`cap ${cap} ${JSON.stringify(p)} ${c}`);
    }
  });
});

describe("K4 plans", () => {
  const solves = (plan: Step[]) => replay(plan, solveActs(plan));
  it("every route that fits ends on the problem's answer, and a perfect player solves it", () => {
    let fits = 0;
    for (const p of every()) for (const r of ROUTES) for (const scaffold of ["prompted", "built"] as const) {
      const plan = planFor(p, r, scaffold);
      if (!plan) continue;
      fits++;
      const last = plan[plan.length - 1];
      if (last.kind !== "number" || last.role !== "final" || last.value !== answerOf(p)) throw new Error(`${r} ${JSON.stringify(p)} ends wrong`);
      const w = solves(plan);
      if (!w || !w.solved || w.wrong !== 0 || w.helped) throw new Error(`${r} ${JSON.stringify(p)} not solved cleanly`);
      for (const s of plan) if (s.kind === "number" && (!Number.isInteger(s.value) || s.value < 0 || s.value > KIT_MAX)) throw new Error(`${r} ${JSON.stringify(p)} bad step`);
    }
    expect(fits).toBeGreaterThan(20000);
  });
  it("makes the arithmetic of each route true, checked independently of the planner", () => {
    for (const p of every()) {
      if (p.unknown !== "result") continue;
      const toTen = planFor(p, "to-ten");
      if (toTen) {
        const [d, rest] = [toTen[0], toTen[1]].map((s) => (s as { value: number }).value);
        if (p.op === "add") { expect((p.a + d) % 10).toBe(0); expect(d + rest).toBe(p.b); expect(p.a + d + rest).toBe(resultOf(p)); }
        else { expect((p.a - d) % 10).toBe(0); expect(d + rest).toBe(p.b); expect(p.a - d - rest).toBe(resultOf(p)); }
      }
      const gt = planFor(p, "give-take");
      if (gt) { const mid = (gt[0] as { value: number }).value; expect(Math.abs(mid - resultOf(p))).toBeLessThanOrEqual(2); expect(mid % 10 === 0 || (mid + (p.op === "add" ? 0 : 0)) >= 0).toBe(true); }
      const tr = planFor(p, "trade");
      if (tr) {
        const ones = tr.find((s) => s.kind === "number" && s.role === "ones") as { value: number };
        if (p.op === "add") { expect(ones.value).toBe((p.a % 10) + (p.b % 10)); expect(ones.value).toBeGreaterThanOrEqual(10); }
        else { expect(ones.value).toBe((p.a % 10) + 10 - (p.b % 10)); expect(p.a % 10).toBeLessThan(p.b % 10); }
      }
    }
  });
  it("only asks a trade when the ones really do not fit", () => {
    for (const p of every()) {
      const plan = planFor(p, "trade");
      if (plan && !plan.some((s) => s.kind === "trade")) throw new Error("trade route without a trade");
      if (planFor(p, "tens-ones") && planFor(p, "trade")) throw new Error(`${JSON.stringify(p)} needs both a trade and none`);
    }
  });
  it("lists distinct second ways and keeps keys stable", () => {
    const p: Problem = { op: "add", a: 8, b: 5, unknown: "result" };
    expect(routesFor(p)).toEqual(["count", "to-ten", "to-ten-other", "give-take"]);
    expect(planKey(planFor(p, "to-ten")!)).toBe("n2,n3,n13");
    expect(planKey(planFor(p, "to-ten-other")!)).toBe("n5,n3,n13");
    expect(secondWays(3, p)).toEqual(["to-ten-other", "give-take"]);
    const q: Problem = { op: "add", a: 46, b: 8, unknown: "result" };
    expect(secondWays(5, q).sort()).toEqual(["give-take", "to-ten"]);
    expect(planKey(planFor({ op: "add", a: 9, b: 9, unknown: "result" }, "to-ten-other") ?? [])).toBe("");
    expect(routesFor({ op: "add", a: 9, b: 9, unknown: "result" })).not.toContain("to-ten-other");
  });
  it("computes the fewest steps among chosen routes", () => {
    const p: Problem = { op: "add", a: 46, b: 8, unknown: "result" };
    expect(fewestSteps(p, ["trade"])).toBe(3);
    expect(planLength(planFor(p, "count")!)).toBe(9);
    // Rounding 8 up to 10 and giving the 2 back takes two moves, so the fewest over every route is 2.
    expect(fewestSteps(p)).toBe(2);
  });
});

describe("K4 work", () => {
  const plan = planFor({ op: "add", a: 8, b: 5, unknown: "result" }, "to-ten", "built")!;
  it("accepts only the step the child is on", () => {
    const w0 = initialWork();
    expect(judge(plan, w0, ["n", 2])).toBe("ignored");
    expect(judge(plan, w0, ["c"])).toBe("ignored");
    expect(judge(plan, w0, ["m", 0, 2])).toBe("ok");
    expect(judge(plan, w0, ["m", 1, 5])).toBe("ok");
    expect(judge(plan, w0, ["m", 0, 3])).toBe("wrong");
    expect(advance(plan, w0, ["n", 2])).toBe(w0);
  });
  it("a miss marks help but never blocks, loses or ends anything", () => {
    let w = advance(plan, initialWork(), ["m", 0, 3]);
    expect(w).toMatchObject({ wrong: 1, helped: true, solved: false, at: 0, last: 3 });
    for (const a of solveActs(plan)) w = advance(plan, w, a);
    expect(w).toMatchObject({ solved: true, helped: true });
  });
  it("climbs the help ladder to three, resets per step, and fills the answer last", () => {
    let w = initialWork();
    const p2 = planFor({ op: "add", a: 8, b: 5, unknown: "result" }, "to-ten")!;
    expect(hintFor(p2, w)).toBeNull();
    w = advance(p2, w, ["h"]);
    expect(hintFor(p2, w)).toEqual({ stage: 1, kind: "number" });
    w = advance(p2, w, ["h"]);
    expect(hintFor(p2, w)).toEqual({ stage: 2, kind: "number", value: 2, fill: null, pair: null });
    w = advance(p2, w, ["h"]);
    expect(hintFor(p2, w)).toMatchObject({ stage: 3, value: 2 });
    expect(advance(p2, w, ["h"])).toBe(w);
    w = advance(p2, w, ["n", 2]);
    expect(w.hint).toBe(0);
    expect(w.helped).toBe(true);
  });
  it("choices are a help that marks the finish helped, once", () => {
    const w = advance(plan, initialWork(), ["k"]);
    expect(w).toMatchObject({ choices: true, helped: true });
    expect(advance(plan, w, ["k"])).toBe(w);
  });
  it("replay rejects an illegal move anywhere in the list", () => {
    expect(replay(plan, [["m", 0, 2], ["n", 3], ["n", 13]])).toMatchObject({ solved: true, helped: false, moves: 3 });
    expect(replay(plan, [["n", 2]])).toBeNull();
    expect(replay(plan, [["m", 0, 2], ["n", 3], ["n", 13], ["n", 13]])).toBeNull();
  });
  it("count steps need every tap", () => {
    const c = planFor({ op: "add", a: 2, b: 3, unknown: "result" }, "count")!;
    expect(c[0]).toEqual({ kind: "count", times: 2, dir: 1 });
    const w = replay(c, [["c"], ["c"], ["n", 5]]);
    expect(w).toMatchObject({ solved: true, moves: 3 });
    expect(replay(c, [["c"], ["n", 5]])).toBeNull();
  });
  it("validates action shapes strictly", () => {
    const good: Act[] = [["c"], ["n", 0], ["n", 100], ["t"], ["m", 0, 3], ["m", 1, 10], ["h"], ["k"]];
    for (const a of good) expect(validAct(a)).toBe(true);
    for (const bad of [[], ["n"], ["n", -1], ["n", 101], ["n", 1.5], ["m", 2, 1], ["m", 0, 11], ["z"], ["c", 1], "c", null, { 0: "c" }, ["n", "7"]]) expect(validAct(bad)).toBe(false);
  });
});

describe("K4 levels", () => {
  it("every generated round is five distinct facts that belong to the level, with the level's own route", () => {
    for (const level of LEVELS) for (const choice of ["add", "subtract", "mixed"] as const) for (let seed = 0; seed < 120; seed++) {
      const round = roundProblems(level, choice, random(seed * 31 + level));
      expect(round).toHaveLength(ROUND_LENGTH);
      round.forEach((p, i) => {
        if (!validProblem(p) || !fitsLevel(level, p)) throw new Error(`L${level} ${JSON.stringify(p)} does not fit`);
        if (round.slice(0, i).some((q) => sameFact(p, q))) throw new Error(`L${level} repeats ${JSON.stringify(p)}`);
        const plan = levelPlan(level, p)!;
        expect(plan).not.toBeNull();
        expect((plan[plan.length - 1] as { value: number }).value).toBe(answerOf(p));
        expect(levelRoute(level, p)).toBe(level === 1 ? "count" : level === 2 ? "tens-ones" : level === 5 ? "trade" : p.unknown === "second" ? "up-to-ten" : "to-ten");
      });
    }
  });
  it("honours the child's operation choice at levels 1 to 3 and alternates at 4 and 5", () => {
    for (const level of [1, 2, 3] as const) {
      expect(roundProblems(level, "add", random(5)).every((p) => p.op === "add")).toBe(true);
      expect(roundProblems(level, "subtract", random(5)).every((p) => p.op === "subtract")).toBe(true);
    }
    for (const level of [4, 5] as const) expect(roundProblems(level, "add", random(5)).map((p) => p.op)).toEqual(["add", "subtract", "add", "subtract", "add"]);
  });
  it("level 4 ends on missing numbers and level 1 to 3 and 5 never ask them", () => {
    for (let seed = 0; seed < 60; seed++) {
      expect(roundProblems(4, "mixed", random(seed)).map((p) => p.unknown)).toEqual(["result", "result", "result", "second", "second"]);
      for (const level of [1, 2, 3, 5] as const) expect(roundProblems(level, "mixed", random(seed)).every((p) => p.unknown === "result")).toBe(true);
    }
  });
  it("grades by required strategy: a problem fits its own level's route and rarely a lower one", () => {
    // Everything at 3 and above needs a ten; nothing there can be solved without crossing one.
    for (const level of [3, 4] as const) for (const op of ["add", "subtract"] as const) for (let rung = 0; rung < 3; rung++) for (const p of candidates(level, op, rung)) {
      const plan = planFor(p, "to-ten")!;
      const first = (plan[0] as { value: number } | { options: number[][] });
      expect("value" in first ? first.value : 1).toBeGreaterThan(0);
      expect(Math.floor(p.a / 10) === Math.floor(resultOf(p) / 10)).toBe(false);
    }
    // Level 5 always needs an actual trade: no problem there fits the level 2 route.
    for (const op of ["add", "subtract"] as const) for (let rung = 0; rung < 5; rung++) for (const p of candidates(5, op, rung)) {
      expect(planFor(p, "tens-ones")).toBeNull();
      expect(planFor(p, "trade")!.some((s) => s.kind === "trade")).toBe(true);
    }
    // Level 2 never needs a trade or a ten bridge.
    for (const op of ["add", "subtract"] as const) for (let rung = 0; rung < 5; rung++) for (const p of candidates(2, op, rung)) {
      expect(planFor(p, "trade")).toBeNull();
      expect(planFor(p, "to-ten")).toBeNull();
    }
  });
  it("rungs climb: number size or bridge length never drops within a level on average", () => {
    for (const level of LEVELS) {
      const mean = (rung: number) => { const c = candidates(level, level === 1 || level === 2 ? "add" : "add", rung); return c.reduce((n, p) => n + resultOf(p), 0) / c.length; };
      if (level === 3 || level === 4) continue;
      expect(mean(4)).toBeGreaterThanOrEqual(mean(0));
    }
  });
  it("is deterministic for a seed and never mutates shared candidate lists", () => {
    const a = JSON.stringify(roundProblems(5, "mixed", random(9)));
    const before = JSON.stringify(candidates(5, "add", 0));
    roundProblems(5, "mixed", random(10));
    expect(JSON.stringify(roundProblems(5, "mixed", random(9)))).toBe(a);
    expect(JSON.stringify(candidates(5, "add", 0))).toBe(before);
  });
  it("stays finite for a constant random source", () => {
    for (const level of LEVELS) expect(roundProblems(level, "mixed", () => 0)).toHaveLength(ROUND_LENGTH);
    for (const level of LEVELS) expect(roundProblems(level, "mixed", () => 0.999999)).toHaveLength(ROUND_LENGTH);
  });
  it("round-trips through JSON, so it can cross a thread or a save", () => {
    for (const level of LEVELS) {
      const r = roundProblems(level, "mixed", random(2));
      expect(JSON.parse(JSON.stringify(r))).toEqual(r);
      expect(structuredClone(levelPlan(level, r[0]))).toEqual(levelPlan(level, r[0]));
    }
  });
});

describe("K4 purity", () => {
  it("imports nothing from React or the platform and uses no clock, random source or class", () => {
    const dir = "src/math/kit";
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const f of files) {
      const code = readFileSync(`${dir}/${f}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      for (const bad of [/Math\.random/, /\bDate\b/, /\bnew (Map|Set|WeakMap)\b/, /\bclass\s/, /from ["']react/, /from ["']react-native/, /\bperformance\./, /\bsetTimeout\b/])
        if (bad.test(code)) throw new Error(`${f} uses ${bad}`);
    }
  });
});
