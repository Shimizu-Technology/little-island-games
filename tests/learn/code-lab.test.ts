import "../../src/learn/engines";
import { describe, expect, it } from "vitest";
import { complete, correct, engine, rendered, taskAt } from "../../src/learn/games/code-lab/engine";
import type { LearnOptions } from "../../src/learn/types";
const options = (level: number): LearnOptions => ({ mode: "solo", pace: level === 1 ? "easy" : level === 2 ? "medium" : "hard", ...(level === 4 ? { stage: "stretch" } : level === 5 ? { stage: "deep" } : {}) });
describe("Code Lab", () => {
  for (let level = 1; level <= 5; level++) it(`plays and validates level ${level}`, () => {
    const o = options(level), s = engine.create(o, { skills: {}, rng: () => .3, starter: 0, today: 0 });
    expect(engine.validate(JSON.parse(JSON.stringify(s)), o)).toBe(true);
    let state = s;
    for (let task = 0; task < 4; task++) {
      const t = taskAt(level, state.seed, task);
      // Duplicate lines can use either identical bank block.
      const used = new Set<number>();
      const distinctOrder = t.lines.map((line) => { const i = t.bank.findIndex((candidate, index) => candidate === line && !used.has(index)); used.add(i); return i; });
      expect(distinctOrder.length).toBeGreaterThanOrEqual(2);
      state = { ...state, order: distinctOrder, token: t.answer };
      expect(correct(state)).toBe(true);
      expect(rendered(state).join("\n")).toContain(t.lines[0].replace("□", t.answer));
      state = { ...state, ran: true };
      expect(engine.validate(state, o)).toBe(true);
      state = { ...state, index: task + 1, order: [], token: "", ran: false };
    }
    expect(complete(state)).toBe(true); expect(engine.outcome(state, o)).toBe("done");
    expect(engine.validate({ ...state, index: 5 }, o)).toBe(false);
    expect(engine.validate({ ...state, order: [0, 0] }, o)).toBe(false);
  });
  it("introduces loops, functions, debugging and short programs", () => {
    expect(taskAt(2, 0, 2).lines.join(" ")).toContain("range");
    expect(taskAt(3, 0, 0).lines.join(" ")).toContain("def ");
    expect(taskAt(4, 0, 0).lines.join(" ")).toContain("if ");
    expect(taskAt(5, 0, 0).lines.join(" ")).toContain("% 3");
  });
});
