import { describe, expect, it } from "vitest";
import { allLevelIds } from "../src/arcade/types";
import {
  createPalm,
  palmLevel,
  palmLevels,
  palmResult,
  palmStep,
  palmTransition,
  validPalm,
  type PalmState,
} from "../src/arcade/games/palm-patrol/engine";
import {
  beachConfig,
  beachLevel,
  beachLevels,
  beachResult,
  beachStep,
  beachTransition,
  createBeach,
  paddleWidth,
  validBeach,
  type BeachState,
} from "../src/arcade/games/beach-ball/engine";
import { arcadeLearner, arcadeTransition, emptyArcade, validArcade } from "../src/arcade/progress";
import { emptySave, parseSave } from "../src/state/validation";
const tick = { type: "tick" } as const;
function palmPilot(initial: PalmState, frames = 30000) {
  let s = initial;
  for (let i = 0; i < frames && s.phase === "play"; i++) {
    const target = s.beetles.find(
      (b) => !b.caught && (s.level === "endless" || s.level.world !== "learn" || b.value === s.answer)
    );
    if (target) {
      s = palmTransition(s, { type: "move", x: target.x });
      s = palmTransition(s, { type: "toss" });
    }
    s = palmStep(s, tick, 1 / 60);
  }
  return s;
}
function beachPilot(initial: BeachState) {
  let s = initial;
  for (let i = 0; i < 60000 && s.phase === "play"; i++) {
    const incoming = s.balls.filter((b) => b.vy > 0).sort((a, b) => b.y - a.y)[0] ?? s.balls[0];
    // An intentional paddle edge produces angles; no direct score/state mutation.
    s = beachTransition(s, { type: "paddle", seat: 0, x: incoming.x + (incoming.x > 180 ? -29 : 29) });
    s = beachStep(s, tick, 1 / 60);
    if (i % 200 === 0) expect(validBeach(s)).toBe(true);
  }
  return s;
}
describe("Palm Patrol", () => {
  it("provides 32 canonical levels, visible goals, world bosses and a gentle speed curve", () => {
    expect(palmLevels.map((l) => l.id)).toEqual(allLevelIds);
    expect(palmLevel("w1-1").speed).toBeLessThan(palmLevel("w3-1").speed);
    for (const l of palmLevels) {
      expect(l.goals).toHaveLength(3);
      expect(validPalm(createPalm(l, 12))).toBe(true);
    }
    for (const w of ["w1", "w2", "w3"] as const) expect(palmLevel(`${w}-8`).boss).toBe(true);
  });
  it("is deterministic and clears every level through aiming, tossing and fixed steps with or without Helper", () => {
    for (const level of palmLevels)
      for (const helper of [false, true]) {
        const a = palmPilot(createPalm(level, 123, helper));
        expect(a.phase, `${level.id} helper=${helper}`).toBe("cleared");
        expect(validPalm(a), level.id).toBe(true);
        expect(palmResult(a)?.stars).toBeGreaterThan(0);
      }
    expect(palmPilot(createPalm(palmLevel("w3-8"), 77))).toEqual(palmPilot(createPalm(palmLevel("w3-8"), 77)));
  });
  it("bounces wrong numbers, never expires math choices, and supports all facts", () => {
    for (const level of palmLevels.filter((l) => l.world === "learn")) {
      let s = createPalm(level, 8, false);
      const wrong = s.beetles.find((b) => b.value !== s.answer)!;
      s = palmTransition(s, { type: "move", x: wrong.x });
      s = palmTransition(s, { type: "toss" });
      for (let i = 0; i < 100; i++) s = palmStep(s, tick, 1 / 60);
      expect(s.fact).toBe(0);
      expect(s.misses).toBe(1);
      expect(s.palms).toBe(4);
      for (let i = 0; i < 15000; i++) s = palmStep(s, tick, 1 / 60);
      expect(s.phase).toBe("play");
      expect(s.palms).toBe(4);
      expect(palmPilot(s).fact).toBe(level.facts);
    }
  });
  it("consumes fronds, fails after grove bumps, retries fresh, and scores stars by palms", () => {
    let s = createPalm(palmLevel("w3-7"), 4, false);
    for (let i = 0; i < 40000 && s.phase === "play"; i++) s = palmStep(s, tick, 1 / 60);
    expect(s.phase).toBe("rest");
    expect(s.palms).toBe(0);
    expect(palmResult(s)?.stars).toBe(0);
    expect(palmPilot(createPalm(s.level, 4, true)).phase).toBe("cleared");
    for (const [palms, stars] of [
      [4, 3],
      [2, 2],
      [1, 1],
    ])
      expect(palmResult({ ...s, palms, phase: "cleared" })?.stars).toBe(stars);
  });
  it("helper slows descent, auto tosses, bounds inputs, and stops terminal states", () => {
    const a = createPalm(palmLevel("w1-1"), 4, false),
      b = createPalm(a.level, 4, true);
    expect(palmStep(b, tick, 1 / 60).beetles[0].y).toBeLessThan(palmStep(a, tick, 1 / 60).beetles[0].y);
    expect(palmStep(b, tick, 1 / 60).husks.length).toBe(1);
    const assisted = palmTransition(palmTransition(a, { type: "helper", value: true }), {
      type: "helper",
      value: false,
    });
    expect(assisted.helped).toBe(true);
    expect(assisted.helper).toBe(false);
    expect(palmTransition(a, { type: "move", x: NaN })).toBe(a);
    expect(palmTransition(a, { type: "move", x: -50 }).launcher).toBe(24);
    expect(palmStep(a, tick, Infinity)).toBe(a);
    expect(palmTransition(a, { type: "finish" })).toBe(a);
    const done = palmTransition(createPalm("endless", 4), { type: "finish" });
    expect(palmResult(done)?.cleared).toBe(false);
    expect(palmStep(done, tick, 1 / 60)).toBe(done);
  });
  it("does not mutate collision inputs and rejects malformed ephemeral states", () => {
    const s = createPalm(palmLevel("learn-1"), 1),
      original = JSON.stringify(s);
    palmPilot(s);
    expect(JSON.stringify(s)).toBe(original);
    for (const bad of [
      null,
      {},
      { ...s, seed: -1 },
      { ...s, level: { ...(s.level as object), speed: 99 } },
      { ...s, currency: 1 },
      { ...s, beetles: [s.beetles[0], s.beetles[0]] },
      { ...s, launcher: Infinity },
      { ...s, shields: [9] },
      { ...s, phase: "win" },
    ])
      expect(validPalm(bad)).toBe(false);
  });
});
describe("Beach Ball", () => {
  it("has 32 canonical levels, wind, turtle, two balls, and skip-count learning", () => {
    expect(beachLevels.map((l) => l.id)).toEqual(allLevelIds);
    for (const level of beachLevels) {
      expect(validBeach(createBeach(level, 15))).toBe(true);
      expect(level.goals).toHaveLength(3);
    }
    expect(beachLevel("w2-1").wind).toBeGreaterThan(0);
    expect(beachLevel("w2-4").turtle).toBe(true);
    expect(beachLevel("w3-1").balls).toBe(2);
    expect(beachLevel("learn-1").countBy).toBe(2);
    expect(beachLevel("learn-5").countBy).toBe(5);
  });
  it("plays every level including learning to a result through paddle input", () => {
    for (const l of beachLevels) {
      const s = beachPilot(createBeach(l, 42));
      expect(s.phase, l.id).not.toBe("play");
      expect(beachResult(s)).not.toBeNull();
    }
    const a = beachPilot(createBeach(beachLevel("w1-1"), 17));
    expect(a).toEqual(beachPilot(createBeach(beachLevel("w1-1"), 17)));
    expect(a.phase).toBe("cleared");
  });
  it("rebounds only crossing paddles, uses contact angle, walls and turtle normal", () => {
    const base = createBeach(beachLevel("w1-1"), 3, false),
      b = { x: 210, y: 520, vx: 0, vy: 240, wait: 0 };
    const hit = beachStep({ ...base, balls: [b] }, tick, 1 / 60);
    expect(hit.balls[0].vy).toBeLessThan(0);
    expect(hit.balls[0].vx).toBeGreaterThan(0);
    expect(hit.hits).toBe(1);
    const miss = beachStep({ ...base, balls: [{ ...b, x: 20 }] }, tick, 1 / 60);
    expect(miss.balls[0].vy).toBeGreaterThan(0);
    const wall = beachStep({ ...base, balls: [{ ...b, x: 347, vx: 200 }] }, tick, 1 / 60);
    expect(wall.balls[0].vx).toBeLessThan(0);
    const turtle = beachStep(
      { ...base, level: beachLevel("w2-4"), balls: [{ x: 180, y: 345, vx: 0, vy: -200, wait: 0 }] },
      tick,
      1 / 60
    );
    expect(turtle.balls[0].vy).toBeGreaterThan(0);
  });
  it("resolves simultaneous winning points fairly, then settles an actual winner", () => {
    const base = createBeach(beachLevel("w3-1"), 1, false, "together");
    const tied = beachStep(
      {
        ...base,
        points: [1, 1],
        balls: [
          { x: 100, y: -13, vx: 0, vy: -200, wait: 0 },
          { x: 100, y: 613, vx: 0, vy: 200, wait: 0 },
        ],
      },
      tick,
      1 / 60
    );
    expect(tied.points).toEqual([2, 2]);
    expect(tied.phase).toBe("play");
    const won = beachStep({ ...tied, balls: [{ x: 100, y: -13, vx: 0, vy: -200, wait: 0 }] }, tick, 1 / 60);
    expect(won.winner).toBe(0);
    expect(beachResult(won)?.cleared).toBe(true);
  });
  it("supports both paddles in one tick, strength distinctions, Helper and solo ownership", () => {
    const base = createBeach(beachLevel("w1-1"), 12, false, "together");
    const moved = beachTransition(beachTransition(base, { type: "paddle", seat: 0, x: 80 }), {
      type: "paddle",
      seat: 1,
      x: 260,
    });
    expect(moved.paddles).toEqual([80, 260]);
    const solo = { ...base, mode: "solo" as const };
    expect(beachTransition(solo, { type: "paddle", seat: 1, x: 80 })).toBe(solo);
    expect(paddleWidth({ ...base, helper: true })).toBeGreaterThan(paddleWidth(base));
    expect(paddleWidth({ ...solo, helper: true }, 1)).toBe(paddleWidth(solo, 1));
    expect(paddleWidth({ ...base, helper: true }, 1)).toBe(116);
    expect(Math.abs(createBeach(base.level, 12, true).balls[0].vy)).toBeLessThan(
      Math.abs(createBeach(base.level, 12, false).balls[0].vy)
    );
    const speeds = (["gentle", "steady", "zippy"] as const).map(
      (strength) =>
        beachStep({ ...solo, strength, balls: [{ x: 30, y: 200, vx: 0, vy: -200, wait: 0 }] }, tick, 1 / 60).paddles[1]
    );
    expect(speeds[0]).toBeGreaterThan(speeds[1]);
    expect(speeds[1]).toBeGreaterThan(speeds[2]);
  });
  it("fails and retries; scores stars, count-by display, and voluntary free play", () => {
    let s = createBeach(beachLevel("learn-5"), 5, false);
    s = beachStep({ ...s, points: [0, 2], balls: [{ x: 20, y: 613, vx: 0, vy: 200, wait: 0 }] }, tick, 1 / 60);
    expect(beachResult(s)?.stars).toBe(0);
    expect(beachResult(s)?.detail).toContain("0 : 15");
    expect(createBeach(s.level, 5).points).toEqual([0, 0]);
    for (const [opponent, stars] of [
      [0, 3],
      [1, 2],
      [2, 1],
    ])
      expect(beachResult({ ...s, phase: "cleared", points: [3, opponent] })?.stars).toBe(stars);
    const free = beachTransition(createBeach("endless", 4), { type: "finish" });
    expect(beachResult(free)?.cleared).toBe(false);
    expect(beachStep(free, tick, 1 / 60)).toBe(free);
    expect(beachConfig(free).target).toBe(99999999);
  });
  it("keeps snapshots immutable and rejects hostile state/level/input data", () => {
    const s = createBeach(beachLevel("w3-8"), 4),
      original = JSON.stringify(s);
    beachStep(s, tick, 1 / 60);
    expect(JSON.stringify(s)).toBe(original);
    expect(beachTransition(s, { type: "paddle", seat: 0, x: NaN })).toBe(s);
    expect(beachStep(s, tick, -1)).toBe(s);
    for (const bad of [
      null,
      {},
      { ...s, strength: "impossible" },
      { ...s, time: Infinity },
      { ...s, level: { ...(s.level as object), speed: 1 } },
      { ...s, balls: [] },
      { ...s, balls: [{ ...s.balls[0], vx: NaN }] },
      { ...s, points: [-1, 2] },
      { ...s, extra: true },
    ])
      expect(validBeach(bad)).toBe(false);
  });
});
describe("action game saves", () => {
  it("round trips earned progress for both games; rejects malformed saves without adding real-time sessions", () => {
    let arcade = emptyArcade();
    for (const game of ["palm-patrol", "beach-ball"] as const) {
      arcade = arcadeTransition(arcade, "family", {
        type: "finish",
        game,
        level: "w1-1",
        stars: 3,
        score: 100,
        round: `round-${game}`,
        name: "Family",
      });
      expect(arcadeLearner(arcade).games[game]?.stars["w1-1"]).toBe(3);
    }
    expect(validArcade(arcade)).toBe(true);
    const save = { ...emptySave(), arcade };
    expect(parseSave(JSON.stringify(save))).toEqual(save);
    for (const game of ["palm-patrol", "beach-ball"] as const) {
      const bad = structuredClone(save);
      bad.arcade.people.family.games[game]!.stars["w1-1"] = 4 as never;
      expect(() => parseSave(JSON.stringify(bad))).toThrow();
    }
    expect(() =>
      parseSave(JSON.stringify({ ...save, arcade: { ...arcade, session: createBeach("endless", 3) } }))
    ).toThrow();
  });
});
