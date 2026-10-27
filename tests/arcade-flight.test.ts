import { describe, expect, it } from "vitest";
import { arcadeTransition, emptyArcade, validArcade } from "../src/arcade/progress";
import { createFlight, flightGap, flightLearning, flightResult, flightStep, flightTransition, validFlight, type FlightState } from "../src/arcade/games/fruit-bat-flight/engine";
import { createRun, rowSafe, runLearning, runResult, runStep, runTransition, validRun, type RunState } from "../src/arcade/games/lagoon-run/engine";
import { equation, flightLevels, mathGate, runLevels, validFact } from "../src/arcade/games/scrolling/content";
import { FIXED_DT } from "../src/arcade/clock";
import { allLevelIds, worldIds } from "../src/arcade/types";
function fly(initial: FlightState): FlightState {
  let s = initial;
  for (let i = 0; i < 100000 && !flightResult(s); i++) {
    const gate = s.gates.filter(g => !g.passed && g.x > .20).sort((a, b) => a.x - b.x)[0];
    const target = gate ? flightLearning(s) ? [.24, .5, .76][gate.fact.choices.indexOf(gate.fact.answer)] : gate.center : .5;
    if (s.y > target && s.vy > -.04) s = flightTransition(s, { type: "flap" });
    s = flightStep(s, { type: "idle" }, FIXED_DT);
    if (i % 500 === 0) expect(validFlight(s)).toBe(true);
  }
  return s;
}
function run(initial: RunState): RunState {
  let s = initial;
  for (let i = 0; i < 30000 && !runResult(s); i++) {
    const row = s.rows.filter(r => !r.passed).sort((a, b) => b.z - a.z)[0];
    const lane = runLearning(s) ? row.fact.choices.indexOf(row.fact.answer) : row.shellLane;
    s = runTransition(s, { type: "lane", lane }); s = runStep(s, { type: "idle" }, FIXED_DT);
    if (i % 500 === 0) expect(validRun(s)).toBe(true);
  }
  return s;
}
describe("scrolling arcade content", () => {
  it("authors 32 levels per game, four worlds, clear targets and increasingly close gaps", () => {
    for (const levels of [flightLevels, runLevels]) {
      expect(levels.map(l => l.id)).toEqual(allLevelIds);
      for (const world of worldIds) expect(levels.filter(l => l.world === world)).toHaveLength(8);
      expect(levels.every(l => l.goals.length === 3 && l.target >= 3 && l.speed > 0 && l.spacing > .4 && l.goals.every(Boolean))).toBe(true);
      expect(levels[0].speed).toBeLessThan(levels[23].speed); expect(levels[0].gap).toBeGreaterThan(levels[23].gap);
      expect(levels.filter(l => l.storm).map(l => l.id)).toEqual(["w3-5", "w3-6", "w3-7", "w3-8"]);
    }
  });
  it("math facts are deterministic, unique, within range and contain exactly one answer", () => {
    for (let seed = 0; seed < 100; seed++) for (let i = 1; i <= 8; i++) {
      const a = mathGate(seed, i); expect(a).toEqual(mathGate(seed, i)); expect(validFact(a.fact)).toBe(true);
      expect(a.fact.choices.filter(n => n === a.fact.answer)).toHaveLength(1); expect(equation(a.fact)).toContain("= ?");
      if (i < 5) expect(a.fact.answer).toBeLessThanOrEqual(10);
    }
    expect(validFact({ ...mathGate(4, 2).fact, choices: [1, 1, 1] })).toBe(false);
  });
});
describe("Fruit Bat Flight", () => {
  it("uses pure, reproducible fixed steps and bounds the pool", () => {
    const s = createFlight(flightLevels[0], 42), before = JSON.stringify(s);
    const a = flightStep(flightTransition(s, { type: "flap" }), { type: "idle" }, FIXED_DT), b = flightStep(flightTransition(s, { type: "flap" }), { type: "idle" }, FIXED_DT);
    expect(a).toEqual(b); expect(JSON.stringify(s)).toBe(before); expect(a.vy).toBeLessThan(0); expect(a.gates).toHaveLength(4);
    for (const dt of [0, -1, NaN, Infinity, .2]) expect(flightStep(s, { type: "idle" }, dt)).toBe(s);
  });
  it("finishes every authored level through flaps, including all math levels with Helper off", () => {
    for (const level of flightLevels) {
      const s = fly(createFlight(level, 981, false)); expect(flightResult(s)?.cleared, level.id).toBe(true); expect(validFlight(s), level.id).toBe(true); expect(s.gates).toHaveLength(4);
    }
  });
  it("World 1 with Helper is gentle and still earns full stars", () => {
    const s = fly(createFlight(flightLevels[0], 92, true)); expect(flightResult(s)?.stars).toBe(3); expect(s.helped).toBe(true);
    expect(flightGap(s)).toBeGreaterThan(flightGap({ ...s, helper: false }));
  });
  it("bumps cost a moment and a fruit with Helper, but finish an unassisted flight", () => {
    const base = createFlight(flightLevels[0], 8, true), near = { ...base, y: .96, vy: .5, fruit: 1, passed: 1 };
    const helper = flightStep(near, { type: "idle" }, FIXED_DT); expect(helper.status).toBe("playing"); expect(helper.fruit).toBe(0); expect(helper.cooldown).toBeGreaterThan(0); expect(helper.travel).toBe(0);
    expect(flightStep({ ...near, helper: false }, { type: "idle" }, FIXED_DT).status).toBe("bumped");
    const failed = flightStep({ ...near, helper: false }, { type: "idle" }, FIXED_DT); expect(flightResult(failed)?.stars).toBe(0); expect(flightTransition(failed, { type: "flap" })).toBe(failed);
    expect(createFlight(flightLevels[0], 8, false).status).toBe("playing");
  });
  it("wrong math gates retry without ending the run, independently of Helper", () => {
    const s = createFlight(flightLevels[24], 16, false), g = s.gates[0], wrong = g.fact.choices.findIndex(n => n !== g.fact.answer);
    const next = flightStep({ ...s, y: [.24, .5, .76][wrong], gates: [{ ...g, x: .24 }, ...s.gates.slice(1)] }, { type: "idle" }, FIXED_DT);
    expect(next.status).toBe("playing"); expect(next.passed).toBe(0); expect(next.cue).toBe("try"); expect(next.bumps).toBe(1);
    expect(s.helped).toBe(false); expect(next.helped).toBe(true); // a wrong answer is credited as helped practice
  });
  it("matches shown 1/2/3-star collection thresholds and ignores stale results", () => {
    const s = createFlight(flightLevels[0], 3);
    for (const [fruit, stars] of [[0, 1], [2, 2], [4, 3]]) expect(flightResult({ ...s, status: "cleared", passed: 4, fruit })?.stars).toBe(stars);
    const ended = flightTransition(createFlight("endless", 2), { type: "finish" }); expect(flightResult(ended)?.cleared).toBe(false); expect(flightStep(ended, { type: "idle" }, FIXED_DT)).toBe(ended);
  });
});
describe("Lagoon Run", () => {
  it("finishes all 32 authored levels with legal lane actions", () => {
    for (const level of runLevels) { const s = run(createRun(level, 771, false)); expect(runResult(s)?.stars, level.id).toBe(3); expect(validRun(s), level.id).toBe(true); expect(s.rows).toHaveLength(5); }
  });
  it("jump clears coconuts/crabs and duck clears fronds/lines; the opposite action does not", () => {
    const s = createRun(runLevels[0], 22, false), base = { ...s.rows[0], lane: 1, z: .88 };
    for (const kind of ["coconut", "crab", "frond", "line"] as const) {
      const row = { ...base, kind }; expect(rowSafe(s, row)).toBe(false);
      expect(rowSafe(runTransition(s, { type: ["coconut", "crab"].includes(kind) ? "jump" : "duck" }), row)).toBe(true);
      expect(rowSafe(runTransition(s, { type: ["coconut", "crab"].includes(kind) ? "duck" : "jump" }), row)).toBe(false);
      expect(rowSafe(runTransition(s, { type: "left" }), row)).toBe(true);
    }
  });
  it("clamps lanes, rejects malformed lanes, handles fast input and deterministic jump/duck recovery", () => {
    let s = createRun(runLevels[0], 22); for (let i = 0; i < 10; i++) s = runTransition(s, { type: "left" }); expect(s.lane).toBe(0);
    for (const lane of [-1, 3, .5, NaN, Infinity]) expect(runTransition(s, { type: "lane", lane })).toBe(s);
    s = runTransition(s, { type: "jump" }); expect(s.jump).toBe(1.1); expect(runTransition(s, { type: "jump" })).toBe(s);
    s = runTransition(s, { type: "duck" }); expect(s.jump).toBe(0); expect(s.duck).toBe(1.1);
    for (const dt of [0, -1, NaN, Infinity, .2]) expect(runStep(s, { type: "idle" }, dt)).toBe(s);
  });
  it("stumbles pause progress with Helper and finish otherwise; retries create fresh state", () => {
    const s = createRun(runLevels[0], 6), row = { ...s.rows[0], z: .88, lane: 1 };
    const next = runStep({ ...s, rows: [row, ...s.rows.slice(1)] }, { type: "idle" }, FIXED_DT); expect(next.status).toBe("playing"); expect(next.cooldown).toBeGreaterThan(0); expect(next.passed).toBe(0);
    const frozen = runStep(next, { type: "idle" }, FIXED_DT); expect(frozen.travel).toBe(next.travel);
    const off = runStep({ ...s, helper: false, rows: [row, ...s.rows.slice(1)] }, { type: "idle" }, FIXED_DT); expect(runResult(off)?.stars).toBe(0); expect(off.status).toBe("stumbled"); expect(runTransition(off, { type: "jump" })).toBe(off);
    expect(createRun(runLevels[0], 6).bumps).toBe(0);
  });
  it("wrong math lane retries gently and valid answers earn stars regardless of Helper", () => {
    const s = createRun(runLevels[24], 14, false), row = { ...s.rows[0], z: .88 }, lane = row.fact.choices.findIndex(n => n !== row.fact.answer);
    const next = runStep({ ...s, lane, rows: [row, ...s.rows.slice(1)] }, { type: "idle" }, FIXED_DT); expect(next.status).toBe("playing"); expect(next.passed).toBe(0); expect(next.cue).toBe("try");
    expect(s.helped).toBe(false); expect(next.helped).toBe(true);
    expect(runResult(run(createRun(runLevels[24], 14, true)))?.stars).toBe(3);
  });
  it("uses the advertised shell thresholds, terminal scoring, and pure transforms", () => {
    const s = createRun(runLevels[0], 2), before = JSON.stringify(s); runStep(runTransition(s, { type: "right" }), { type: "idle" }, FIXED_DT); expect(JSON.stringify(s)).toBe(before);
    for (const [shells, stars] of [[0, 1], [2, 2], [4, 3]]) expect(runResult({ ...s, status: "cleared", passed: 4, shells })?.stars).toBe(stars);
    const end = runTransition(createRun("endless", 2), { type: "finish" }); expect(runResult(end)?.stars).toBe(0); expect(runStep(end, { type: "idle" }, FIXED_DT)).toBe(end);
  });
});
describe("strict state and kit saves", () => {
  it("ignores malformed serialized actions without changing the engine", () => {
    const f = createFlight(flightLevels[0], 1), r = createRun(runLevels[0], 1);
    for (const input of [null, [], 3, {}, { type: "unknown" }, { type: "helper", value: "yes" }]) {
      expect(flightTransition(f, input as never)).toBe(f); expect(runTransition(r, input as never)).toBe(r);
    }
  });
  it("rejects malformed engine states and level content, while active rounds are never persisted", () => {
    for (const [create, valid, levels] of [[createFlight, validFlight, flightLevels], [createRun, validRun, runLevels]] as const) {
      const s = create(levels[0], 1); expect(valid(s)).toBe(true);
      for (const bad of [null, [], {}, { ...s, seed: -1 }, { ...s, score: Infinity }, { ...s, helper: 1 }, { ...s, time: NaN }, { ...s, level: { ...levels[0], speed: 999 } }, { ...s, level: { id: "w1-1" } }]) expect(valid(bad)).toBe(false);
    }
    const f = createFlight(flightLevels[0], 2); expect(validFlight({ ...f, gates: [] })).toBe(false); expect(validFlight({ ...f, y: 2 })).toBe(false);
    const r = createRun(runLevels[0], 2); expect(validRun({ ...r, rows: [] })).toBe(false); expect(validRun({ ...r, lane: 3 })).toBe(false);
    expect(validArcade({ ...emptyArcade(), flight: f })).toBe(false); expect(validArcade({ ...emptyArcade(), run: r })).toBe(false);
  });
  it("stores both games per learner, prevents duplicate credit and rejects hostile save additions", () => {
    let save = emptyArcade();
    for (const game of ["fruit-bat-flight", "lagoon-run"] as const) {
      save = arcadeTransition(save, "family", { type: "finish", game, level: "w1-1", score: 240, stars: 3, round: game, name: "Family" });
      expect(validArcade(save)).toBe(true); expect(save.people.family.games[game]?.stars["w1-1"]).toBe(3);
      expect(arcadeTransition(save, "family", { type: "finish", game, level: "w1-1", score: 999, stars: 3, round: game, name: "Family" })).toBe(save);
    }
    expect(save.people.kai).toBeUndefined(); const raw = JSON.parse(JSON.stringify(save)); raw.people.family.games["fruit-bat-flight"].running = true; expect(validArcade(raw)).toBe(false);
    const bad = JSON.parse(JSON.stringify(save)); bad.people.family.games["lagoon-run"].stars["w4-1"] = 3; expect(validArcade(bad)).toBe(false);
  });
});
