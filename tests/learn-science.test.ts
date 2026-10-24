import { describe, expect, it } from "vitest";
import { random } from "../src/games/types";
import type { LearnOptions, Pace } from "../src/learn/types";
import { exact, same } from "../src/learn/kit/science";
import {
  actions,
  availableActions,
  change,
  engine as tide,
  expected,
  initialPool,
  missionMet,
  nextExperiment,
  tryChange,
} from "../src/learn/games/tide-pool/engine";
import { act, capacity, dock, engine as floats, objects, shapes } from "../src/learn/games/float-sink/engine";
import {
  commands,
  currentLevel,
  engine as crab,
  levels,
  run,
  solve,
  solved,
  start,
  step,
  tick,
} from "../src/learn/games/crab-commands/engine";
const ctx = (seed = 1) => ({ skills: {}, rng: random(seed), starter: 1 as const, today: 20000 });
const paces: Pace[] = ["easy", "medium", "hard"];
describe("science kit", () => {
  it("compares save trees without relying on property order", () => {
    expect(same({ a: 1, b: [2] }, { b: [2], a: 1 })).toBe(true);
    expect(exact({ a: 1, extra: 2 }, ["a"])).toBe(false);
  });
});
describe("tide pool", () => {
  it("models lasting heat, light, fresh rain and incoming seawater", () => {
    let p = change(initialPool(), "temperature");
    expect(p.heat).toBe(1);
    p = change(p, "snail");
    expect(p.heat).toBe(2);
    p = change(p, "temperature");
    expect(p.heat).toBe(0);
    p = change(p, "sun");
    expect(p.light).toBe(false);
    p = change(p, "rain");
    expect(p.salt).toBe(1);
    p = change(change(p, "tide"), "tide");
    expect(p.salt).toBe(2);
  });
  for (const mode of tide.modes)
    for (const pace of paces)
      it(`requires predictions before every change: ${mode}/${pace}`, () => {
        const o = { mode, pace };
        let s = tide.create(o, ctx());
        for (let i = 0; i < 60; i++) {
          const action = availableActions(pace)[i % availableActions(pace).length];
          s = { ...s, action };
          expect(tryChange(s, mode === "together")).toBe(s);
          const guess = expected(s.pool, action);
          s = { ...s, guesses: mode === "together" ? [guess, (1 - guess) as 0 | 1] : [guess] };
          expect(tide.validate(s, o)).toBe(true);
          s = tryChange(s, mode === "together");
          expect(tide.validate(s, o)).toBe(true);
          expect(tryChange(s, mode === "together")).toBe(s);
          s = nextExperiment(s);
          expect(tide.validate(s, o)).toBe(true);
          if (tide.outcome(s, o)) break;
        }
      });
  it("every mission has an achievable discovery without a correct-prediction gate", () => {
    const o: LearnOptions = { mode: "solo", pace: "hard" };
    let s = tide.create(o, ctx());
    const paths: Record<string, (typeof actions)[number][]> = {
      coral: ["snail"],
      crab: ["crab"],
      snail: ["snail"],
      light: ["snail"],
      rain: ["rain", "tide", "tide"],
      heat: ["temperature", "snail"],
    };
    for (const [id, path] of Object.entries(paths)) {
      s = {
        ...tide.create(o, ctx()),
        missions: [id, ...["coral", "crab", "snail", "light", "rain", "heat"].filter((v) => v !== id).slice(0, 4)],
      };
      for (const a of path) {
        s = tryChange({ ...s, action: a, guesses: [(1 - expected(s.pool, a)) as 0 | 1] }, false);
        if (!missionMet(s)) s = nextExperiment(s);
      }
      expect(missionMet(s), id).toBe(true);
      expect(nextExperiment(s).index).toBe(1);
    }
  });
  it("rejects malformed, oversized, inconsistent and unknown-key saves", () => {
    const o: LearnOptions = { mode: "solo", pace: "easy" },
      s = tide.create(o, ctx());
    const bad: unknown[] = [
      null,
      [],
      {},
      { ...s, extra: true },
      { ...s, index: 99 },
      { ...s, guesses: [0, 1] },
      { ...s, result: true },
      { ...s, action: "unknown" },
      { ...s, missions: Array(500).fill("crab") },
      { ...s, pool: { ...s.pool, heat: 2 } },
      { ...s, pool: { ...s.pool, salt: 1.5 } },
      { ...s, pool: { ...s.pool, creatures: ["fish", "fish"] } },
    ];
    for (const b of bad) expect(tide.validate(b, o)).toBe(false);
  });
});
describe("float dock", () => {
  for (const mode of floats.modes)
    for (const pace of paces)
      it(`plays all phases and restores exact state: ${mode}/${pace}`, () => {
        const o = { mode, pace };
        let s = floats.create(o, ctx());
        expect(act(s, { kind: "drop" }, o)).toBe(s);
        for (const id of s.items) {
          const object = objects.find((x) => x.id === id)!;
          s = act(s, { kind: "predict", value: object.floats ? 1 : 0 }, o);
          s = act(s, { kind: "drop" }, o);
          expect(act(s, { kind: "sort", value: object.floats ? 1 : 0 }, o)).toBe(s);
          s = act(s, { kind: "sort", value: object.floats ? 0 : 1 }, o);
          expect(floats.validate(JSON.parse(JSON.stringify(s)), o)).toBe(true);
        }
        for (let boat = 0; boat < (mode === "versus" ? 2 : 1); boat++) {
          const shape = boat === 0 ? "bowl" : "wide";
          s = act(s, { kind: "shape", value: shape }, o);
          for (let n = 0; n <= capacity(shape, pace === "hard"); n++) {
            s = act(s, { kind: "load" }, o);
            expect(floats.validate(s, o)).toBe(true);
          }
          if (mode === "versus" && boat === 0) s = act(s, { kind: "pass" }, o);
        }
        expect(floats.outcome(s, o)).toBe(mode === "solo" ? "done" : 0);
        expect(dock(s, o)?.shelf).toEqual(s.items);
      });
  it("strictly replays events and rejects forged phase skips or unexpected keys", () => {
    const o: LearnOptions = { mode: "solo", pace: "hard" },
      s = floats.create(o, ctx());
    for (const events of [
      [{ kind: "load" }],
      [{ kind: "predict", value: 3 }],
      [{ kind: "predict", value: 0, extra: 1 }],
      [null],
      Array(100).fill({ kind: "drop" }),
    ])
      expect(floats.validate({ ...s, events }, o)).toBe(false);
    expect(floats.validate({ ...s, items: ["no"] }, o)).toBe(false);
  });
  it("a solid clay ball sinks before any pebble is added", () => {
    for (const mode of floats.modes) {
      const o: LearnOptions = { mode, pace: "easy" };
      let s = floats.create(o, ctx());
      for (const id of s.items) {
        const value = objects.find((x) => x.id === id)!.floats ? 0 : 1;
        s = act(act(act(s, { kind: "predict", value }, o), { kind: "drop" }, o), { kind: "sort", value }, o);
      }
      s = act(s, { kind: "shape", value: "ball" }, o);
      expect(dock(s, o)?.phase).toBe(mode === "solo" ? "done" : "pass");
      expect(dock(s, o)?.pebbles).toBe(0);
      expect(act(s, { kind: "load" }, o)).toBe(s);
      expect(floats.validate(s, o)).toBe(true);
    }
  });
  it("covers 16 varied objects and every boat shape", () => {
    expect(objects).toHaveLength(16);
    for (const s of shapes) expect(capacity(s, false)).toBeGreaterThanOrEqual(0);
    expect(objects.find((x) => x.id === "clay")?.floats).toBe(false);
    expect(objects.find((x) => x.id === "clay-boat")?.floats).toBe(true);
  });
});
describe("crab beach solver", () => {
  for (const l of levels)
    it(`${l.id} has a legal shortest hint and every execution prefix saves`, () => {
      const path = solve(l);
      expect(path.length).toBeGreaterThan(0);
      expect(path.length).toBeLessThan(80);
      expect(solved(l, run(l, path))).toBe(true);
      expect(solved(l, run(l, path.slice(0, -1)))).toBe(false);
      const o: LearnOptions = { mode: "together", pace: l.pace };
      let s = crab.create(o, ctx());
      s = {
        ...s,
        levels: [
          l.id,
          ...levels
            .filter((v) => v.pace === l.pace && v.id !== l.id)
            .slice(0, 2)
            .map((v) => v.id),
        ],
        program: path,
        cards: path.length,
        running: true,
      };
      while (s.running) {
        expect(crab.validate(s, o)).toBe(true);
        s = tick(s);
      }
      expect(crab.validate(s, o)).toBe(true);
      expect(solved(currentLevel(s), run(l, s.program.slice(0, s.cursor)))).toBe(true);
    });
  it("repeat is exactly two extra executions of the previous command", () => {
    const l = levels.find((l) => l.id === "h1")!,
      w = step(l, start(l), "forward");
    expect(step(l, w, "repeat")).toEqual(step(l, step(l, w, "forward"), "forward"));
    expect(step(l, start(l), "repeat").bump).toBe(true);
    expect(solve(l).length).toBeLessThan(11);
  });
  it("bump stops the crab on the failing card and changing the program is safe", () => {
    const l = levels.find((l) => l.id === "e2")!;
    expect(run(l, ["right", "down"]).pos).toBe(start(l).pos);
    expect(run(l, ["right", "down"]).bump).toBe(true);
  });
  for (const pace of paces)
    it(`completes a three-beach round at ${pace}`, () => {
      const o: LearnOptions = { mode: "solo", pace },
        s = crab.create(o, ctx());
      const completed = s.levels.map((id) => solve(levels.find((l) => l.id === id)!));
      expect(crab.validate({ ...s, completed, cards: completed.reduce((n, p) => n + p.length, 0) }, o)).toBe(true);
      expect(crab.outcome({ ...s, completed }, o)).toBe("done");
    });
  it("rejects invalid level, command, cursor, running and completion combinations", () => {
    const o: LearnOptions = { mode: "solo", pace: "easy" },
      s = crab.create(o, ctx());
    for (const bad of [
      { ...s, extra: 1 },
      { ...s, levels: ["h1", "h2", "h3"] },
      { ...s, program: ["repeat"] },
      { ...s, cursor: 3 },
      { ...s, running: true },
      { ...s, completed: [["right"]] },
      { ...s, program: Array(10000).fill("up") },
    ])
      expect(crab.validate(bad, o)).toBe(false);
    expect(commands("hard")).toContain("repeat");
  });
});
