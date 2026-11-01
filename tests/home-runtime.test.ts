import { describe, expect, it } from "vitest";
import { buildingLayout, roomOrigin } from "../src/home/camera";
import { identityCamera, roomToScreen, screenToRoom } from "../src/home/scene/camera";
import { transition, idleController } from "../src/home/scene/controller";
import { housePoint, roomPoint, screenPoint } from "../src/home/scene/types";
import {
  boundCamera,
  edgeVelocity,
  fitCamera,
  focusCamera,
  roomAtScreen,
  zoomCamera,
} from "../src/home/runtime/CameraController";
import { canRevealResting, settleProgress, trayExit } from "../src/home/runtime/settle";
import { labHome } from "../src/home/runtime/lab";
import { validHome, migrateHome, validPlacement, validCharacter } from "../src/home/model";
const origin = housePoint(0, 0);
it("starts the lab with a valid, reloadable isolated world", () => {
  const state = labHome();
  expect(
    validHome(state),
    JSON.stringify(
      Object.entries(state.rooms).map(([r, room]) => [
        r,
        room.instances.map((i) => [i.id, validPlacement(room.instances, i)]),
        room.characters.map((c) => [c.slot, validCharacter(c, room.instances)]),
      ])
    )
  ).toBe(true);
  expect(migrateHome(state)).toEqual(state);
});
describe("runtime ownership and coordinate wiring", () => {
  it("keeps a corner grip under its captured pointer at the six point threshold", () => {
    const down = transition(
      idleController,
      {
        type: "down",
        pointer: 7,
        point: screenPoint(130, 210),
        entity: "character/0",
        contact: roomPoint(100, 300),
        now: 0,
      },
      identityCamera,
      origin
    );
    const pending = transition(
      down.state,
      { type: "move", pointer: 7, point: screenPoint(136, 210) },
      identityCamera,
      origin
    );
    expect(pending.effects).toEqual([]);
    const drag = transition(
      pending.state,
      { type: "move", pointer: 7, point: screenPoint(137, 213) },
      identityCamera,
      origin
    );
    expect(drag.effects).toEqual([
      { type: "pickup", entity: "character/0" },
      { type: "drag", entity: "character/0", anchor: roomPoint(107, 303) },
    ]);
    const movedCamera = { ...identityCamera, a: 2, d: 2, tx: -20, ty: 15 };
    const moved = transition(
      drag.state,
      { type: "move", pointer: 7, point: screenPoint(137, 213) },
      movedCamera,
      origin
    );
    const anchor = moved.effects.find((e) => e.type === "drag");
    expect(anchor?.type).toBe("drag");
    if (anchor?.type === "drag") {
      const screen = roomToScreen(roomPoint(anchor.anchor.x + 30, anchor.anchor.y - 90), movedCamera, origin);
      expect(screen.x).toBeCloseTo(137);
      expect(screen.y).toBeCloseTo(213);
    }
  });
  it("keeps two object captures independent and ignores a third", () => {
    let state = idleController;
    for (let pointer = 0; pointer < 3; pointer++)
      state = transition(
        state,
        {
          type: "down",
          pointer,
          point: screenPoint(10 + pointer * 50, 20),
          contact: roomPoint(0, 0),
          entity: `character/${pointer}`,
          now: 0,
        },
        identityCamera,
        origin
      ).state;
    expect(state.pointers).toHaveLength(2);
    state = transition(state, { type: "move", pointer: 0, point: screenPoint(30, 30) }, identityCamera, origin).state;
    const cancel = transition(state, { type: "cancel", pointer: 0, now: 200 }, identityCamera, origin);
    expect(cancel.effects).toEqual([{ type: "restore", entity: "character/0" }]);
    expect(cancel.state.pointers.map((p) => p.pointer)).toEqual([1]);
  });
  it("only produces pinch effects for two background origins", () => {
    let state = transition(
      idleController,
      {
        type: "down",
        pointer: 1,
        point: screenPoint(10, 10),
        entity: "character/0",
        contact: roomPoint(10, 10),
        now: 0,
      },
      identityCamera,
      origin
    ).state;
    state = transition(
      state,
      { type: "down", pointer: 2, point: screenPoint(50, 10), now: 0 },
      identityCamera,
      origin
    ).state;
    const move = transition(state, { type: "move", pointer: 2, point: screenPoint(80, 10) }, identityCamera, origin);
    expect(move.effects.some((e) => e.type === "pinch")).toBe(false);
  });
});
describe("settle acknowledgement and bounded contact", () => {
  it("never reveals a stale resting tree, even when the spring has completed", () => {
    expect(canRevealResting({ committed: false, finished: true, revision: "old" }, "old")).toBe(false);
    expect(canRevealResting({ committed: true, finished: false, revision: "new" }, "new")).toBe(false);
    expect(canRevealResting({ committed: true, finished: true, revision: "new" }, "old")).toBe(false);
    expect(canRevealResting({ committed: true, finished: true, revision: "new" }, "new")).toBe(true);
  });
  it("settles monotonically with zero overshoot and an exact 240 ms cap", () => {
    let previous = 0;
    for (let t = 0; t <= 240; t++) {
      const p = settleProgress(t);
      expect(p).toBeGreaterThanOrEqual(previous);
      expect(p).toBeLessThanOrEqual(1);
      previous = p;
    }
    expect(1 - settleProgress(200)).toBeLessThan(0.02);
    expect(settleProgress(240)).toBe(1);
    expect(settleProgress(0, true)).toBe(1);
  });
  it("preserves the same world point while zooming, and fits both overview axes", () => {
    const b = buildingLayout(4),
      view = { width: 768, height: 960 },
      c = fitCamera(view, b);
    expect(b.width * c.a).toBeLessThanOrEqual(view.width);
    expect(b.height * c.a).toBeLessThanOrEqual(view.height);
    const close = focusCamera(0, view, b);
    const at = screenPoint(400, 500),
      before = screenToRoom(at, close, origin);
    const after = screenToRoom(at, zoomCamera(close, 1.1, at.x, at.y, view, b), origin);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    const o = roomOrigin(0, b),
      screen = roomToScreen(roomPoint(400, 400), close, housePoint(o.x, o.y));
    expect(roomAtScreen(screen.x, screen.y, close, b)).toBe(0);
    expect(boundCamera({ ...c, tx: 100000, ty: 100000 }, view, b)).toEqual(c);
  });
  it("arms edge pan only after 180 ms and exits trays across their scroll axis", () => {
    expect(edgeVelocity(0, 768, 179)).toBe(0);
    expect(edgeVelocity(0, 768, 180)).toBe(360);
    expect(edgeVelocity(768, 768, 180)).toBe(-360);
    expect(edgeVelocity(384, 768, 1000)).toBe(0);
    expect(trayExit(18, 2, false)).toBe("scroll");
    expect(trayExit(2, -10, false)).toBe("pickup");
    expect(trayExit(2, 18, true)).toBe("scroll");
    expect(trayExit(-10, 2, true)).toBe("pickup");
  });
});

describe("central silhouette picking", () => {
  it("prioritizes visible props over owners, then resolves overlapping expanded shapes by distance", async () => {
    const { pickEntity } = await import("../src/home/runtime/pick");
    const proxies = [
      { id: "actor", priority: 2, depth: 500, bounds: { left: 0, top: 0, width: 120, height: 220 } },
      { id: "cup", priority: 3, depth: 1, bounds: { left: 70, top: 90, width: 12, height: 12 } },
    ];
    expect(pickEntity(proxies, roomPoint(75, 95), 1)).toBe("cup");
    expect(pickEntity(proxies, roomPoint(20, 95), 1)).toBe("actor");
    const siblings = [
      { id: "a", priority: 3, depth: 1, bounds: { left: 0, top: 0, width: 12, height: 12 } },
      { id: "b", priority: 3, depth: 2, bounds: { left: 20, top: 0, width: 12, height: 12 } },
    ];
    expect(pickEntity(siblings, roomPoint(15, 6), 1)).toBe("a");
    expect(pickEntity(siblings, roomPoint(18, 6), 1)).toBe("b");
    expect(pickEntity(siblings, roomPoint(100, 6), 1)).toBeUndefined();
  });
});

it("bounds pan inertia and omits it for Reduce Motion", async () => {
  const { panInertia } = await import("../src/home/runtime/CameraController");
  expect(panInertia(5000, 16, 0, false)).toBeLessThan(1200);
  expect(panInertia(500, 16, 500, false)).toBe(0);
  expect(panInertia(7, 16, 10, false)).toBe(0);
  expect(panInertia(500, 16, 10, true)).toBe(0);
});

it("carries a complete nested attachment group exactly once, including a held child", async () => {
  const { groupIds, paintEntries } = await import("../src/home/runtime/group");
  const scene = {
    entities: {
      table: { id: "table", children: ["lamp", "actor"], item: {}, depth: 100 },
      lamp: { id: "lamp", children: [], attachment: { kind: "surface" }, depth: 100.5 },
      actor: { id: "actor", children: ["cup"], attachment: { kind: "socket" }, depth: 101 },
      cup: { id: "cup", children: [], attachment: { kind: "hand" }, depth: 101.5 },
    },
  } as unknown as import("../src/home/scene/types").Scene;
  expect(groupIds(scene, "table")).toEqual(["table", "lamp", "actor", "cup"]);
  expect(groupIds(scene, "actor")).toEqual(["actor", "cup"]);
  expect(paintEntries(Object.values(scene.entities), scene).map((e) => `${e.entity.id}:${e.front}`)).toEqual([
    "table:false",
    "lamp:false",
    "actor:false",
    "cup:false",
    "table:true",
  ]);
});
