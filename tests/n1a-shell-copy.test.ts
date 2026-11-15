import { describe, expect, it } from "vitest";
import { random } from "../src/games/types";
import { LEVELS, advance, answerOf, candidates, giveTakeParts, initialWork, levelPlan, levelRoute, planFor, placeValue, ROUTES, roundProblems, routesFor, solveActs, type Level, type Problem } from "../src/math/kit";
import { hintLine, routeBlurb, routeLines, routeName, stepCue, stepPrompt } from "../src/learn/games/shell-math/copy";
import { pictureFor } from "../src/learn/games/shell-math/picture";

const sample = (): { level: Level; p: Problem }[] => {
  const out: { level: Level; p: Problem }[] = [];
  for (const level of LEVELS) for (let seed = 0; seed < 60; seed++) for (const p of roundProblems(level, "mixed", random(seed * 3 + level))) out.push({ level, p });
  return out;
};
/** Every `a + b = c` or `a − b = c` written out in a line must be true arithmetic. */
const claims = (line: string) => [...line.matchAll(/(\d+) ([+−]) (\d+) = (\d+)/g)].map((m) => ({ a: +m[1], op: m[2], b: +m[3], c: +m[4] }));
const holds = (x: { a: number; op: string; b: number; c: number }) => (x.op === "+" ? x.a + x.b : x.a - x.b) === x.c;

describe("Shell Math wording", () => {
  it("every arithmetic sentence in a second way is true, for every route that fits", () => {
    let seen = 0;
    for (let a = 0; a <= 99; a += 1) for (let b = 1; b <= 99; b += 1) for (const op of ["add", "subtract"] as const) {
      const p: Problem = { op, a, b, unknown: "result" };
      if ((op === "add" ? a + b : a - b) < 0 || (op === "add" ? a + b : a - b) > 99) continue;
      for (const r of routesFor(p)) {
        if (r === "count") continue;
        for (const line of routeLines(p, r)) for (const c of claims(line)) { seen++; if (!holds(c)) throw new Error(`${r} ${JSON.stringify(p)}: "${line}"`); }
      }
    }
    expect(seen).toBeGreaterThan(5000);
  });

  it("round-and-fix sentences name the real numbers", () => {
    const g = giveTakeParts({ op: "add", a: 38, b: 19, unknown: "result" })!;
    expect(g).toEqual({ n: 19, m: 38, up: 20, d: 1 });
    expect(routeLines({ op: "add", a: 38, b: 19, unknown: "result" }, "give-take").join(" ")).toContain("38 + 20 = 58");
    expect(routeLines({ op: "subtract", a: 64, b: 29, unknown: "result" }, "give-take").join(" ")).toContain("64 − 30 = 34");
  });

  it("every step of every level has a prompt, a cue and a help line, none empty and no unfilled holes", () => {
    for (const { level, p } of sample()) {
      const plan = levelPlan(level, p)!;
      let w = initialWork();
      const acts = solveActs(plan);
      let at = 0;
      for (let n = 0; n < plan.length; n++) {
        const prompt = stepPrompt(level, p, plan, n), cue = stepCue(level, p, plan, n);
        expect(prompt.length, JSON.stringify(p)).toBeGreaterThan(8);
        expect(cue.length).toBeGreaterThan(8);
        for (const bad of ["undefined", "NaN", "null", "[object"]) { expect(prompt).not.toContain(bad); expect(cue).not.toContain(bad); }
        expect(cue).not.toMatch(/The number is/);
        for (const c of claims(prompt)) expect(holds(c) || /\?/.test(prompt)).toBe(true);
        for (let h = 1; h <= 3; h++) {
          const line = hintLine(level, p, plan, { ...w, hint: h });
          expect(line, `${level} ${JSON.stringify(p)} hint ${h}`).not.toBeNull();
          if (h === 1) expect(line).toBe(cue);
        }
        const count = plan[n].kind === "count" ? (plan[n] as { times: number }).times : 1;
        for (let k = 0; k < count; k++) w = advance(plan, w, acts[at++]);
      }
      expect(w.solved).toBe(true);
    }
  });

  it("a prompt that shows a blank is true when the step's own number fills it, for every route", () => {
    let checked = 0;
    for (let a = 0; a <= 99; a++) for (let b = 1; b <= 99; b++) for (const op of ["add", "subtract"] as const) for (const unknown of ["result", "second"] as const) {
      const p: Problem = { op, a, b, unknown };
      const r = op === "add" ? a + b : a - b;
      if (r < 0 || r > 99) continue;
      for (const route of routesFor(p)) {
        if (route === "count") continue;
        const plan = planFor(p, route)!;
        plan.forEach((step, n) => {
          if (step.kind !== "number") return;
          const prompt = stepPrompt(3, p, plan, n, route);
          for (const m of prompt.matchAll(/(?<![+\u2212] )(\d+) ([+\u2212]) \? = (\d+)/g)) {
            checked++;
            const x = +m[1], y = +m[3];
            if ((m[2] === "+" ? x + step.value : x - step.value) !== y) throw new Error(`${route} ${JSON.stringify(p)} step ${n}: "${prompt}" (answer ${step.value})`);
          }
          for (const m of prompt.matchAll(/(?<![+\u2212] )(\d+) ([+\u2212]) (\d+) = \?/g)) {
            checked++;
            const x = +m[1], y = +m[3];
            if ((m[2] === "+" ? x + y : x - y) !== step.value) throw new Error(`${route} ${JSON.stringify(p)} step ${n}: "${prompt}" (answer ${step.value})`);
          }
        });
      }
    }
    expect(checked).toBeGreaterThan(5000);
  });

  it("prompts for the other ways read as their own route, not the level's", () => {
    const p: Problem = { op: "add", a: 8, b: 5, unknown: "result" };
    const other = planFor(p, "to-ten-other")!;
    expect(stepPrompt(3, p, other, 0, "to-ten-other")).toContain("5 + ? = 10");
    const gt = planFor(p, "give-take")!;
    expect(stepPrompt(3, p, gt, 0, "give-take")).toMatch(/Round 8 up to 10/);
    expect(routeBlurb(p, "give-take")).toContain("Round 8 up to 10");
    for (const r of ROUTES) { expect(routeName(r).length).toBeGreaterThan(3); expect(routeBlurb(p, r).length).toBeGreaterThan(3); }
  });
});

describe("Shell Math pictures", () => {
  it("shells and blocks always add up to the arithmetic, at every step of every level", () => {
    for (const { level, p } of sample()) {
      const route = levelRoute(level, p), plan = levelPlan(level, p)!;
      let w = initialWork();
      const acts = solveActs(plan);
      let at = 0;
      const check = () => {
        const pic = pictureFor(level, p, route, plan, w), a = placeValue(p.a);
        void a;
        if (pic.pair) expect(pic.pair.a + pic.pair.b, JSON.stringify(p)).toBe(p.a + p.b);
        if (pic.blocks && route === "trade") {
          const value = pic.blocks.tens * 10 + pic.blocks.ones;
          expect(value, `${JSON.stringify(p)} at ${w.at}`).toBe(p.op === "add" ? p.a + p.b : p.a);
        }
        if (pic.frames) {
          const f = pic.frames;
          if (route === "count" && p.op === "add") expect(f.gold + f.blue + f.ghost).toBe(p.a + p.b > 10 ? 10 : Math.max(p.a, p.b) + Math.min(p.a, p.b));
          if (p.op === "subtract" && route !== "up-to-ten") { expect(f.gold).toBe(p.a); expect(f.struck).toBeLessThanOrEqual(p.b); }
        }
      };
      check();
      for (let n = 0; n < plan.length; n++) {
        const count = plan[n].kind === "count" ? (plan[n] as { times: number }).times : 1;
        for (let k = 0; k < count; k++) { w = advance(plan, w, acts[at++]); check(); }
      }
      // At the end the picture shows the answer's quantity.
      const end = pictureFor(level, p, route, plan, w);
      if (end.blocks && route === "trade") expect(end.blocks.tens * 10 + end.blocks.ones - (end.blocks.struckOnes + end.blocks.struckTens * 10) * (p.op === "subtract" ? 1 : 0)).toBe(answerOf(p) + (p.op === "subtract" ? 0 : 0));
    }
  });

  it("level 4 asks for a fill and remembers which side the child filled", () => {
    const p: Problem = { op: "add", a: 8, b: 5, unknown: "result" };
    const plan = planFor(p, "to-ten", "built")!;
    expect(plan[0]).toEqual({ kind: "fill", options: [[0, 2], [1, 5]] });
    const viaB = advance(plan, initialWork(), ["m", 0, 2]), viaA = advance(plan, initialWork(), ["m", 1, 5]);
    expect(pictureFor(4, p, "to-ten", plan, viaB).pair).toEqual({ a: 10, b: 3, fullA: true, fullB: false });
    expect(pictureFor(4, p, "to-ten", plan, viaA).pair).toEqual({ a: 3, b: 10, fullA: false, fullB: true });
  });
});
void candidates;
