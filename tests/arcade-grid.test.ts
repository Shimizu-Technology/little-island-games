import { describe, expect, it } from "vitest";
import { arcadeTransition, emptyArcade, validArcade } from "../src/arcade/progress";
import { allLevelIds } from "../src/arcade/types";
import {
  createRail,
  railLevel,
  railLevels,
  railLearning,
  railMove,
  railResult,
  railSnake,
  railStep,
  railTick,
  railTransition,
  validRail,
  type RailState,
} from "../src/arcade/games/rail-parade/engine";
import {
  crabConfig,
  crabLanes,
  crabLevel,
  crabLevels,
  crabResult,
  crabStep,
  crabTransition,
  createCrab,
  laneObjects,
  supported,
  validCrab,
} from "../src/arcade/games/crab-crossing/engine";
import { delta, directions, opposite, same, type Direction } from "../src/arcade/games/grid/rules";
function railPath(s: RailState): Direction[] {
  const q: { x: number; y: number; path: Direction[]; direction: Direction }[] = [
      { ...s.body[0], path: [], direction: s.direction },
    ],
    seen = new Set<string>();
  while (q.length) {
    const c = q.shift()!;
    if (same(c, s.food)) return c.path;
    for (const d of directions) {
      if (!c.path.length && s.body.length > 1 && opposite(s.direction, d)) continue;
      const p = { x: c.x + delta[d].x, y: c.y + delta[d].y },
        key = `${p.x},${p.y}`;
      if (
        p.x < 0 ||
        p.x > 9 ||
        p.y < 0 ||
        p.y > 9 ||
        seen.has(key) ||
        s.body.slice(0, -1).some((b) => same(b, p)) ||
        (railLearning(s) && same(p, s.decoy)) ||
        (s.level !== "endless" && s.level.hedges.some((b) => same(b, p))) ||
        railSnake(s).some((b) => same(b, p)) ||
        (!railLearning(s) && s.level !== "endless" && p.y === s.level.snakeRow && p.x > 0 && p.x < 9)
      )
        continue;
      seen.add(key);
      q.push({ ...p, direction: d, path: [...c.path, d] });
    }
  }
  return [];
}
describe("grid arcade content", () => {
  it("has 32 tuned levels per game, three goals each, and no mutable shared state", () => {
    for (const levels of [railLevels, crabLevels]) {
      expect(levels.map((l) => l.id)).toEqual(allLevelIds);
      expect(levels.every((l) => l.goals.length === 3 && l.goals.every(Boolean))).toBe(true);
    }
    expect(railLevel("w1-1").tick).toBeGreaterThan(railLevel("w3-8").tick);
    expect(crabLevel("w3-8").speed).toBeGreaterThan(crabLevel("w1-1").speed);
    for (const id of allLevelIds) {
      expect(validRail(createRail(railLevel(id), 42))).toBe(true);
      expect(validCrab(createCrab(crabLevel(id), 42))).toBe(true);
    }
  });
});
describe("Rail Parade", () => {
  it("buffers two fair turns and rejects a reverse against the queued turn", () => {
    const s = createRail(railLevel("w1-1"), 10, false),
      a = railTransition(s, { type: "turn", direction: "up" }),
      b = railTransition(a, { type: "turn", direction: "left" });
    expect(b.queue).toEqual(["up", "left"]);
    expect(railTransition(a, { type: "turn", direction: "down" })).toBe(a);
    expect(railTransition(b, { type: "turn", direction: "down" })).toBe(b);
    expect(railTransition(s, { type: "turn", direction: "left" })).toBe(s);
    let next = b;
    for (let i = 0; i < 80; i++) next = railStep(next, { type: "tick" }, 1 / 60);
    expect(next.body[0]).toEqual({ x: 1, y: 6 });
    expect(s.body[0]).toEqual({ x: 2, y: 7 });
  });
  it("allows the vacated tail but catches body, edge, hedge and snake collisions", () => {
    const s = createRail(railLevel("w2-1"), 2, false),
      square: RailState = {
        ...s,
        body: [
          { x: 3, y: 3 },
          { x: 3, y: 4 },
          { x: 2, y: 4 },
          { x: 2, y: 3 },
        ],
        food: { x: 8, y: 8 },
      };
    expect(railMove(square, "left").phase).toBe("play");
    expect(railMove(square, "down").phase).toBe("rest");
    expect(railMove({ ...s, body: [{ x: 9, y: 7 }] }, "right").phase).toBe("rest");
    expect(railMove({ ...s, body: [{ x: 3, y: 4 }] }, "right").phase).toBe("rest");
    const snake = railSnake(s);
    expect(railMove({ ...s, body: [{ x: snake[0].x, y: snake[0].y + 1 }] }, "up").phase).toBe("rest");
  });
  it("Helper slows steps, loses one chick on a bump and can still earn three stars", () => {
    const s = createRail(railLevel("w1-1"), 2, true),
      atEdge = {
        ...s,
        body: [
          { x: 9, y: 7 },
          { x: 8, y: 7 },
          { x: 7, y: 7 },
        ],
      },
      b = railMove(atEdge, "right");
    expect(b.phase).toBe("play");
    expect(b.body).toHaveLength(2);
    expect(b.bumps).toBe(1);
    expect(railTick(s)).toBeGreaterThan(railTick({ ...s, helper: false }));
    const final = railMove({ ...s, collected: 2, food: { x: 3, y: 7 } }, "right");
    expect(railResult(final)).toMatchObject({ cleared: true, stars: 3, score: 40 });
    expect(railResult({ ...final, bumps: 2 })?.stars).toBe(2);
    expect(railResult({ ...final, bumps: 3 })?.stars).toBe(1);
  });
  it.each(railLevels.filter((l) => l.world === "learn"))("finishes $id by actual untimed moves", (level) => {
    let s = createRail(level, 120, false);
    expect(railStep(s, { type: "tick" }, 100)).toBe(s);
    for (let i = 0; i < 100 && !railResult(s); i++) {
      const path = railPath(s);
      expect(path.length).toBeGreaterThan(0);
      s = railTransition(s, { type: "turn", direction: path[0] });
      expect(validRail(s)).toBe(true);
    }
    expect(railResult(s)?.cleared).toBe(true);
    expect(s.collected).toBe(level.sequence.length);
    expect(s.bumps).toBe(0);
    expect(s.score).toBe(s.collected * 40);
  });
  it("keeps wrong tiles untimed and recoverable; terminal inputs do not rescore", () => {
    let s = createRail(railLevel("learn-1"), 2, false);
    s = { ...s, decoy: { x: 3, y: 7 }, food: { x: 6, y: 6 } };
    const next = railTransition(s, { type: "turn", direction: "right" });
    expect(next.body).toBe(s.body);
    expect(next.collected).toBe(0);
    expect(next.bumps).toBe(1);
    const end = railTransition(createRail("endless", 2), { type: "finish" });
    expect(railResult(end)?.stars).toBe(0);
    expect(railTransition(end, { type: "turn", direction: "up" })).toBe(end);
  });
  it("reproduces RNG, ignores invalid input and rejects malformed states", () => {
    const a = createRail(railLevel("w1-2"), 12);
    expect(a).toEqual(createRail(railLevel("w1-2"), 12));
    expect(a.food).not.toEqual(createRail(railLevel("w1-2"), 14).food);
    for (const dt of [NaN, Infinity, -1, 0]) expect(railStep(a, { type: "tick" }, dt)).toBe(a);
    expect(railTransition(a, { type: "turn", direction: "diagonal" as Direction })).toBe(a);
    for (const bad of [
      null,
      {},
      { ...a, seed: NaN },
      { ...a, phase: "cleared" },
      { ...a, score: 999 },
      { ...a, level: { cycle: a } },
      { ...a, body: [a.body[0], a.body[0]] },
      { ...a, level: { ...(a.level as object), tick: -3 } },
      { ...a, extra: true },
      { ...a, queue: ["up", "left", "down"] },
      { ...a, food: { x: 10, y: 0 } },
    ])
      expect(validRail(bad)).toBe(false);
  });
});
describe("Crab Crossing", () => {
  it.each(crabLevels.filter((l) => l.world === "learn"))(
    "finishes $id by real hops with no clock pressure",
    (level) => {
      let s = createCrab(level, 7, false);
      expect(crabStep(s, { type: "tick" }, 900)).toBe(s);
      for (const target of level.stones) {
        while (s.x !== target) s = crabTransition(s, { type: "hop", direction: s.x < target ? "right" : "left" });
        s = crabTransition(s, { type: "hop", direction: "up" });
        expect(validCrab(s)).toBe(true);
      }
      s = crabTransition(s, { type: "hop", direction: "up" });
      expect(crabResult(s)).toMatchObject({ cleared: true, stars: 3, score: 100 });
      expect(s.cursor).toBe(9);
      expect(s.time).toBeGreaterThan(0);
    }
  );
  it("shows count on, back and skip counting with a recoverable wrong step", () => {
    expect(crabLevel("learn-1").numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(crabLevel("learn-2").numbers).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(crabLevel("learn-6").numbers).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45]);
    const s = { ...createCrab(crabLevel("learn-1"), 2, false), x: 3 },
      next = crabTransition(s, { type: "hop", direction: "up" });
    expect(next.y).toBe(10);
    expect(next.cursor).toBe(0);
    expect(next.phase).toBe("play");
    expect(next.bumps).toBe(1);
  });
  it("carries riders continuously, detects water and traffic, and handles wrapped platforms", () => {
    const s = createCrab(crabLevel("w3-1"), 7, false),
      lanes = crabLanes(s),
      log = lanes.find((l) => l.row === 4)!,
      bus = lanes.find((l) => l.kind === "bus")!,
      x = laneObjects(log, 0).find((x) => x >= 1 && x <= 7)!;
    expect(supported(log, x, 0)).toBe(true);
    const rider = crabStep({ ...s, x, y: 4 }, { type: "tick" }, 1 / 60);
    expect(rider.phase).toBe("play");
    expect(rider.x).toBeCloseTo(x + log.speed / 60);
    const hit = crabStep(
      { ...s, x: laneObjects(bus, 0).find((x) => x >= 0 && x <= 8)!, y: 7 },
      { type: "tick" },
      1 / 60
    );
    expect(hit.phase).toBe("rest");
    const gap = Array.from({ length: 9 }, (_, x) => x).find((x) => !supported(log, x, 0))!;
    expect(crabStep({ ...s, x: gap, y: 4 }, { type: "tick" }, 1 / 60).phase).toBe("rest");
    for (const t of [0, 1, 10, 1000]) expect(laneObjects(log, t).every(Number.isFinite)).toBe(true);
  });
  it("Helper adds a safe island and checkpoint without lowering stars", () => {
    const s = createCrab(crabLevel("w3-1"), 2),
      off = { ...s, helper: false };
    expect(crabLanes(s).some((l) => l.row === 2)).toBe(false);
    expect(crabLanes(off).some((l) => l.row === 2)).toBe(true);
    expect(crabLanes(s)[0].speed).toBeLessThan(crabLanes(off)[0].speed);
    const bumped = crabStep({ ...s, x: -0.1, y: 3 }, { type: "tick" }, 1 / 60);
    expect(bumped.phase).toBe("play");
    expect(bumped.y).toBe(5);
    expect(bumped.bumps).toBe(1);
    expect(crabResult(crabTransition({ ...s, y: 1 }, { type: "hop", direction: "up" }))?.stars).toBe(3);
  });
  it("supports multi-crossing goals, voluntary endless finish and rejects malformed saves", () => {
    const s = createCrab(crabLevel("w1-8"), 12, false),
      once = crabTransition({ ...s, y: 1 }, { type: "hop", direction: "up" });
    expect(once.y).toBe(10);
    expect(once.crossed).toBe(1);
    expect(crabResult(once)).toBeNull();
    const end = crabTransition({ ...once, y: 1 }, { type: "hop", direction: "up" });
    expect(crabResult(end)?.score).toBe(200);
    expect(crabTransition(end, { type: "hop", direction: "up" })).toBe(end);
    expect(crabResult(crabTransition(createCrab("endless", 12), { type: "finish" }))?.stars).toBe(0);
    expect(createCrab(s.level, 12)).toEqual({ ...s, helper: true });
    for (const bad of [
      null,
      {},
      { ...s, x: Infinity },
      { ...s, phase: "cleared" },
      { ...s, score: 99 },
      { ...s, cursor: 1 },
      { ...s, y: 11 },
      { ...s, cursor: 10 },
      { ...s, level: { ...crabConfig(s), speed: -1 } },
      { ...s, unknown: 1 },
      { ...s, time: NaN },
    ])
      expect(validCrab(bad)).toBe(false);
    for (const dt of [NaN, Infinity, -1, 0]) expect(crabStep(s, { type: "tick" }, dt)).toBe(s);
  });
});
describe("grid progress uses the strict existing kit save", () => {
  it.each(["rail-parade", "crab-crossing"] as const)("round-trips %s progress and rejects malformed stars", (game) => {
    let s = arcadeTransition(emptyArcade(), "family", {
      type: "finish",
      game,
      level: "learn-1",
      score: 100,
      stars: 3,
      round: "grid-test",
      name: "Family",
    });
    expect(validArcade(s)).toBe(true);
    expect(validArcade(JSON.parse(JSON.stringify(s)))).toBe(true);
    expect(s.people.family.games[game]?.stars["learn-1"]).toBe(3);
    s = {
      ...s,
      people: {
        ...s.people,
        family: {
          ...s.people.family,
          games: { [game]: { ...s.people.family.games[game]!, stars: { "learn-1": 7 as 3 } } },
        },
      },
    };
    expect(validArcade(s)).toBe(false);
  });
});

describe("Rail normal-world reachability", () => {
  it.each(railLevels.filter((l) => l.world !== "learn"))("clears $id with Helper off and fixed ticks", (level) => {
    let s = createRail(level, 120, false);
    for (let turn = 0; turn < 260 && !railResult(s); turn++) {
      const path = railPath(s);
      expect(path.length).toBeGreaterThan(0);
      s = railTransition(s, { type: "turn", direction: path[0] });
      const before = s.moves;
      for (let tick = 0; tick < 80 && s.moves === before && !railResult(s); tick++)
        s = railStep(s, { type: "tick" }, 1 / 60);
      expect(validRail(s)).toBe(true);
    }
    expect(railResult(s)).toMatchObject({ cleared: true, stars: 3 });
  });
});

function crossingPath(s: import("../src/arcade/games/crab-crossing/engine").CrabState): (Direction | "wait")[] {
  const q = [{ state: s, path: [] as (Direction | "wait")[] }],
    seen = new Set<string>();
  for (let i = 0; i < q.length && i < 16000; i++) {
    const { state, path } = q[i];
    for (const d of ["up", "left", "right", "down", "wait"] as const) {
      let next = d === "wait" ? state : crabTransition(state, { type: "hop", direction: d });
      for (let tick = 0; tick < 12 && next.phase === "play"; tick++) next = crabStep(next, { type: "tick" }, 1 / 60);
      if (next.phase === "cleared" || next.crossed > s.crossed) return [...path, d];
      if (next.bumps > s.bumps || next.phase !== "play" || path.length >= 55) continue;
      const key = [Math.round(next.x * 4), next.y, Math.round(next.time * 10)].join();
      if (!seen.has(key)) {
        seen.add(key);
        q.push({ state: next, path: [...path, d] });
      }
    }
  }
  throw new Error(`No route through ${s.level === "endless" ? "free play" : s.level.id}`);
}
describe("Crab normal-world reachability", () => {
  it.each(crabLevels.filter((l) => l.world !== "learn"))("clears $id with Helper off and moving lanes", (level) => {
    let s = createCrab(level, 120, false);
    for (let crossing = 0; crossing < level.target; crossing++) {
      const path = crossingPath(s);
      for (const direction of path) {
        if (direction !== "wait") s = crabTransition(s, { type: "hop", direction });
        for (let tick = 0; tick < 12 && s.phase === "play"; tick++) s = crabStep(s, { type: "tick" }, 1 / 60);
        expect(validCrab(s)).toBe(true);
      }
    }
    expect(crabResult(s)).toMatchObject({ cleared: true, stars: 3 });
  });
});
