import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { layoutToken } from "../src/home/runtime/layout";
import { poseToken } from "../src/home/runtime/poseBank";
import { useInteraction, mergeRoomPayloads, roomPayloadsOf, cameraTweenSample, CAMERA_EASE_MS, DOOR_MS, BACKGROUND_TAP_MS, type Pickup, type Interaction } from "../src/home/runtime/useInteraction";
import { buildingLayout } from "../src/home/camera";
import { identityCamera } from "../src/home/scene/camera";
import { gridCell, roomPoint, type Scene, type SceneEntity } from "../src/home/scene/types";
import { roomIds } from "../src/home/catalogMore";
import { buildScene } from "../src/home/scene/graph";
import { apply, resolve as resolveDrop } from "../src/home/scene/proposal";
import { labHome } from "../src/home/runtime/lab";
import { EDGE_BAND, edgeVelocity, focusCamera } from "../src/home/runtime/CameraController";
import { withPortions, shoreShellId, shoreShells } from "../src/home/runtime/portions";
import { prepareHits, pickEntity } from "../src/home/runtime/pick";
import { settleProgress } from "../src/home/runtime/settle";
const poseOf = (e: SceneEntity) => poseToken(e.base, e.facing, e.action);
const harness = vi.hoisted(() => ({
  deferUI: false,
  pickups: [] as Pickup[],
  inUI: false,
  publications: [] as {scene: Scene; inUI: boolean}[],
  ui: [] as (() => void)[],
  frames: [] as ((frame: { timeSincePreviousFrame: number }) => void)[],
  js: [] as (() => void)[],
  handlers: {} as Record<string, (...args: any[]) => void>,
}));
vi.mock("react-native-gesture-handler", () => ({
  Gesture: {
    Manual: () => {
      const builder = {
        onTouchesDown: (fn: (...args: any[]) => void) => {
          harness.handlers.down = fn;
          return builder;
        },
        onTouchesMove: (fn: (...args: any[]) => void) => {
          harness.handlers.move = fn;
          return builder;
        },
        onTouchesUp: (fn: (...args: any[]) => void) => {
          harness.handlers.up = fn;
          return builder;
        },
        onTouchesCancelled: (fn: (...args: any[]) => void) => {
          harness.handlers.cancel = fn;
          return builder;
        },
      };
      return builder;
    },
  },
}));
vi.mock("react-native-reanimated", async () => {
  const React = await import("react");
  return {
    useSharedValue: (initial: unknown) => {
      const ref = React.useRef<any>(undefined);
      if (!ref.current)
        ref.current = {
          value: initial,
          get() {
            return this.value;
          },
          modify(fn: (value: any) => any) {
            const apply = () => { this.value = fn(this.value); };
            if (harness.deferUI) harness.ui.push(apply); else apply();
          },
          set(value: any) {
            const next = typeof value === "function" ? value(this.value) : value;
            const onUI = harness.inUI;
            const apply = () => {
              this.value = next;
              if (next?.rooms && next?.entities && typeof next.revision === 'string') harness.publications.push({scene:next,inUI:onUI});
            };
            if (harness.deferUI) harness.ui.push(apply); else apply();
          },
        };
      return ref.current;
    },
    useFrameCallback: (fn: (frame: { timeSincePreviousFrame: number }) => void) => {
      harness.frames[0] = fn;
      return { callbackId: 7, isActive: true, setActive: () => {} };
    },
    runOnUI: (fn: (...args: any[]) => void) => (...args: any[]) => {
      const apply = () => {
        const deferred = harness.deferUI, wasUI = harness.inUI; harness.deferUI = false; harness.inUI = true;
        try { fn(...args); } finally { harness.deferUI = deferred; harness.inUI = wasUI; }
      };
      if (harness.deferUI) harness.ui.push(apply); else apply();
    },
    runOnJS:
      (fn: (...args: any[]) => void) =>
      (...args: any[]) =>
        harness.js.push(() => fn(...args)),
  };
});
const manager = { activate: vi.fn(), end: vi.fn() };
const entity: SceneEntity = {
  id: "character/0",
  room: "home",
  contact: roomPoint(100, 300),
  attachment: { kind: "floor", room: "home", at: roomPoint(100, 300) },
  base: "stand",
  facing: "front",
  action: null,
  children: [],
  depth: 300,
  band: "occupant",
  bounds: { left: -30, top: -220, width: 60, height: 220 },
  hitProxies: [{ left: 70, top: 80, width: 60, height: 220 }],
  character: { slot: 0, anchor: "floor", pose: "stand", x: 2, y: 2 },
};
function fixture(revision = "initial", contact = entity.contact): Scene {
  const visible = { ...entity, contact };
  const rooms = Object.fromEntries(
    roomIds.map((room) => [
      room,
      {
        room,
        revision,
        entities: room === "home" ? { [entity.id]: visible } : {},
        floor: [{ cell: gridCell(4, 7), contact: roomPoint(200, 486), blockers: [], occlusion: [0, 0, 0] }],
        surfaces: [],
        sockets: [],
        targets: [],
        buckets: {},
        occupancy: {},
        occlusionBands: [],
        hitProxies:
          room === "home"
            ? [
                {
                  id: entity.id,
                  bounds: {
                    ...entity.bounds,
                    left: entity.contact.x + entity.bounds.left,
                    top: entity.contact.y + entity.bounds.top,
                  },
                  depth: entity.depth,
                  band: entity.band,
                },
              ]
            : [],
      },
    ])
  ) as unknown as Scene["rooms"];
  return { revision, entities: { [entity.id]: visible }, rooms };
}
let current: Interaction;
const cameraChange = vi.fn();
const fixtureBuilding = buildingLayout(4, true), fixtureViewport = { width: 1000, height: 600 };
const noop = () => {};
const commitFixture: Parameters<typeof useInteraction>[0]["onCommit"] = (index, proposal, _at, token) => {
  if (!current.isCurrent(index, token)) return;
  current.finish(index, true, proposal, "committed", undefined, token);
};
function Probe({ scene, layout = true, designing = false, reduced = false, onTap = () => {} }: { scene: Scene; layout?: boolean; designing?: boolean; reduced?: boolean; onTap?: (...args: any[]) => void }) {
  const interaction = useInteraction({
    scene,
    building: fixtureBuilding,
    viewport: fixtureViewport,
    initialCamera: identityCamera,
    reduced,
    designing,
    onCameraChange: cameraChange,
    onPickup: (pickup) => {
      harness.pickups.push(pickup);
      const slot = current.slots.get()[pickup.slot];
      if (slot.id === pickup.id && slot.generation === pickup.generation && slot.epoch === pickup.epoch)
        { current.ready(pickup.slot, pickup.id);
          current.acknowledgePose(pickup.id, poseOf(pickup.scene.entities[pickup.id]), 0); }
    },
    onTap,
    onClear: noop,
    onDestination: noop,
    onCommit: commitFixture,
  });
  React.useLayoutEffect(() => {
    current = interaction;
    if (layout) for (const entity of Object.values(scene.entities))
      interaction.acknowledgeLayout(entity.id, layoutToken(entity));
    if (layout) for (const slot of interaction.slots.get()) {
      const entity = scene.entities[slot.restId ?? slot.id];
      if (entity) interaction.acknowledgePose(slot.id, poseOf(entity), 0);
    }
  });
  return null;
}
function touch(type: string, x: number, y: number, id = 1) {
  harness.handlers[type](
    { changedTouches: [{ x, y, id }], numberOfTouches: type === "up" || type === "cancel" ? 0 : 1 },
    manager
  );
}
function flushJS() {
  while (harness.js.length) harness.js.shift()!();
}
beforeEach(() => {
  cameraChange.mockClear();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  harness.deferUI = false;
  harness.pickups = [];
  harness.inUI = false;
  harness.publications = [];
  harness.ui = [];
  harness.frames = [];
  harness.js = [];
  harness.handlers = {};
  vi.useFakeTimers();
  vi.setSystemTime(1000);
});

const registry = { calls: [] as [number, boolean][], manageStateFrameCallback(id: number, on: boolean) { registry.calls.push([id, on]); } };
(globalThis as any)._frameCallbackRegistry = registry;
const frame = () => harness.frames[0]({ timeSincePreviousFrame: 16.67 });
function frames(n: number) { for (let i = 0; i < n; i++) { vi.advanceTimersByTime(16); frame(); flushJS(); } }
describe("HM-13 always-on UI work", () => {
  it("the frame callback stops itself at idle and restarts on the next touch", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={fixture()} />); });
    registry.calls = [];
    frames(5);
    expect(registry.calls).toEqual([[7, false]]);
    frames(5);
    expect(registry.calls).toEqual([[7, false]]);
    touch("down", 100, 200); flushJS();
    expect(registry.calls).toEqual([[7, false], [7, true]]);
    touch("move", 160, 240); frames(4);
    touch("up", 160, 240); flushJS();
    frames(40);
    // A settling slot still needs frames, so the callback never stopped under it.
    expect(current.slots.get().some((s) => !!s.id)).toBe(true);
    expect(registry.calls.at(-1)).toEqual([7, true]);
    act(() => current.cancelAll());
    frames(5);
    expect(registry.calls.at(-1)).toEqual([7, false]);
    await act(async () => renderer.unmount());
  });
  it("drag frames leave the shared resting state untouched once the overlay is up", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={fixture()} />); });
    touch("down", 100, 200); flushJS();
    touch("move", 130, 220); flushJS();
    frames(3);
    const flags = current.restingFlags.get(), motion = current.restingMotion.get();
    expect(flags.rest).toMatchObject([{ owner: "character/0", hide: true }]);
    expect(motion.follow).toEqual([]);
    for (let i = 0; i < 30; i++) { touch("move", 130 + i * 4, 220 + i); frame(); flushJS(); }
    expect(current.restingFlags.get()).toBe(flags);
    expect(current.restingMotion.get()).toBe(motion);
    await act(async () => renderer.unmount());
  });
  it("only rooms whose contents changed are sent to the UI thread", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    const first = fixture("one");
    await act(async () => { renderer = TestRenderer.create(<Probe scene={first} />); });
    const second = fixture("two", roomPoint(140, 300));
    const original = harness.publications.length;
    await act(async () => { renderer.update(<Probe scene={second} />); });
    expect(harness.publications.length).toBeGreaterThan(original);
    const published = harness.publications.at(-1)!.scene;
    expect(published.revision).toBe("two");
    expect(published.entities["character/0"].contact).toEqual(roomPoint(140, 300));
    for (const room of roomIds) expect(published.rooms[room].entities).toBe(published.entities);
    const payloads = roomPayloadsOf(second), before = roomPayloadsOf(first);
    for (const room of roomIds) if (room !== "home") expect(payloads[room].replace(/"revision":"two"/g, "")).toBe(before[room].replace(/"revision":"one"/g, ""));
    await act(async () => renderer.unmount());
  });
  it("merging one room keeps the other rooms' entities and replaces the sent room's", () => {
    const scene = fixture("a");
    const kitchenThing = { ...scene.entities["character/0"], id: "kitchen/item/x", room: "kitchen" as const, character: undefined };
    scene.entities = { ...scene.entities, [kitchenThing.id]: kitchenThing };
    const moved = { ...scene, revision: "b", entities: { ...scene.entities, "character/0": { ...scene.entities["character/0"], contact: roomPoint(9, 9) } } };
    const merged = mergeRoomPayloads(scene, { home: roomPayloadsOf(moved).home }, "b");
    expect(Object.keys(merged.entities).sort()).toEqual(["character/0", "kitchen/item/x"]);
    expect(merged.entities["character/0"].contact).toEqual(roomPoint(9, 9));
    expect(merged.entities["kitchen/item/x"]).toBe(kitchenThing);
    expect(merged.revision).toBe("b");
  });
});
describe("HM-13 resting mappers never read per-frame channels", () => {
  it.each(["src/home/runtime/SceneView.tsx", "src/home/runtime/TargetCue.tsx"])("%s captures no slots, clock or controller", async (file) => {
    const { readFileSync } = await import("node:fs");
    const { createRequire } = await import("node:module");
    const babel = createRequire(import.meta.url)("@babel/core");
    const root = process.env.LI_H3_SOURCE_ROOT ?? ".";
    const result = babel.transformSync(readFileSync(`${root}/${file}`, "utf8"), {
      filename: file, configFile: false, babelrc: false, ast: true,
      plugins: ["react-native-worklets/plugin", ["@babel/plugin-transform-typescript", { isTSX: true }]],
    });
    const captured = new Set<string>();
    const walk = (node: any) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "AssignmentExpression" && node.left?.property?.name === "__closure" && node.right.type === "ObjectExpression")
        for (const p of node.right.properties) captured.add(p.key?.name);
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value === "object") walk(value);
      }
    };
    walk(result.ast);
    expect(captured.size).toBeGreaterThan(0);
    for (const name of ["slots", "clock", "controller", "fixtureNudges"]) expect([...captured]).not.toContain(name);
  });
});
describe("HM-12 explicit camera moves ease on the UI thread", () => {
  const to = { ...identityCamera, a: 0.5, d: 0.5, tx: -400, ty: -120 };
  it("eases over 180 ms with intermediate frames, then lands exactly", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={fixture()} />); });
    frames(4);
    registry.calls = [];
    current.animateCamera(to);
    expect(registry.calls).toEqual([[7, true]]);
    const xs: number[] = [];
    for (let i = 0; i < 14; i++) { vi.advanceTimersByTime(16); frame(); xs.push(current.camera.get().tx); }
    expect(xs.filter((x) => x !== 0 && x !== -400).length).toBeGreaterThanOrEqual(5);
    expect(current.camera.get()).toEqual(to);
    expect(xs.every((x, i) => i === 0 || x <= xs[i - 1])).toBe(true);
    frames(4);
    expect(registry.calls.at(-1)).toEqual([7, false]);
    await act(async () => renderer.unmount());
  });
  it("is immediate under Reduced Motion", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={fixture()} reduced />); });
    current.animateCamera(to);
    expect(current.camera.get()).toEqual(to);
    expect(current.veil.get()).toBe(0);
    await act(async () => renderer.unmount());
  });
  it("a floor change swaps the view under a full veil instead of sliding through walls", () => {
    const tween = { from: identityCamera, to, since: 0, duration: DOOR_MS, door: true };
    expect(cameraTweenSample(tween, 40)).toMatchObject({ camera: identityCamera, done: false });
    expect(cameraTweenSample(tween, DOOR_MS / 2).veil).toBeCloseTo(1);
    expect(cameraTweenSample(tween, DOOR_MS / 2).camera).toEqual(to);
    expect(cameraTweenSample(tween, DOOR_MS)).toMatchObject({ camera: to, veil: 0, done: true });
    expect(CAMERA_EASE_MS).toBe(180);
    // It fades in over a few frames rather than appearing at once.
    expect(cameraTweenSample(tween, 16.7).veil).toBeGreaterThan(0.1);
    expect(cameraTweenSample(tween, 16.7).veil).toBeLessThan(0.6);
    expect(DOOR_MS).toBeLessThanOrEqual(180);
    // Whatever 60 Hz frame lands near the swap, the veil is fully closed on both sides of it.
    for (let offset = 0; offset < 16.7; offset += 1) {
      const swap = [...Array(Math.ceil(DOOR_MS / 16.7) + 1).keys()].map((n) => offset + n * 16.7)
        .filter((at) => at <= DOOR_MS).map((at) => cameraTweenSample(tween, at));
      const changed = swap.findIndex((f) => f.camera === to);
      expect(swap[changed].veil).toBeCloseTo(1);
      expect(swap[changed - 1].veil).toBeCloseTo(1);
    }
  });
  it("a same-floor move does most of its travel in the first third, then settles", () => {
    const tween = { from: identityCamera, to, since: 0, duration: CAMERA_EASE_MS, door: false };
    const at = (ms: number) => (cameraTweenSample(tween, ms).camera.tx - identityCamera.tx) / (to.tx - identityCamera.tx);
    expect(at(CAMERA_EASE_MS / 3)).toBeGreaterThan(0.6);
    expect(at(17)).toBeGreaterThan(0.2);
    expect(at(CAMERA_EASE_MS)).toBe(1);
  });
  it("a new hand on the room finishes the move at once and takes the camera", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={fixture()} />); });
    current.animateCamera(to);
    vi.advanceTimersByTime(40); frame();
    touch("down", 600, 50); flushJS();
    expect(current.camera.get()).toEqual(to);
    await act(async () => renderer.unmount());
  });
});
describe("HM-14 room buttons are drop targets (D7)", () => {
  const hovered = vi.fn();
  function Hover({ scene, room = "home" }: { scene: Scene; room?: "home" | "kitchen" }) {
    const interaction = useInteraction({
      scene, building: fixtureBuilding, viewport: fixtureViewport, initialCamera: identityCamera, reduced: false, designing: false,
      onCameraChange: cameraChange, onPickup: (pickup) => { current.ready(pickup.slot, pickup.id); }, onTap: () => {}, onClear: noop,
      onCommit: commitFixture, currentRoom: room, onRoomHover: hovered,
    });
    React.useLayoutEffect(() => { current = interaction; });
    return null;
  }
  const zone = { kind: "room" as const, room: "kitchen" as const, x: 400, y: 560, width: 48, height: 48 };
  beforeEach(() => hovered.mockClear());
  it("holding a carried friend on a room button for 300 ms moves the view there and keeps the carry", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Hover scene={fixture()} />); });
    current.dropZones.set([zone]);
    touch("down", 100, 200); flushJS();
    touch("move", 160, 260); frames(2);
    touch("move", 420, 580); frames(1);
    expect(current.slots.get()[0].proposal).toMatchObject({ room: "kitchen", kind: "floor" });
    expect(current.roomHover.get()).toMatchObject({ room: "kitchen" });
    frames(10);
    expect(hovered).not.toHaveBeenCalled();
    frames(12);
    expect(hovered).toHaveBeenCalledWith("kitchen");
    expect(hovered).toHaveBeenCalledTimes(1);
    expect(current.slots.get()[0]).toMatchObject({ id: "character/0", phase: "dragging" });
    frames(14);
    const kitchenCamera = focusCamera(roomIds.indexOf("kitchen"), fixtureViewport, fixtureBuilding);
    expect(current.camera.get()).toEqual(kitchenCamera);
    // Moving back into the room view continues the same carry in the new room.
    touch("move", 500, 300); frames(1);
    expect(current.roomHover.get()).toBeNull();
    expect(current.slots.get()[0]).toMatchObject({ id: "character/0", phase: "dragging" });
    await act(async () => renderer.unmount());
  });
  it("cancelling after the switch restores the friend to its own room, uncommitted", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Hover scene={fixture()} />); });
    current.dropZones.set([zone]);
    touch("down", 100, 200); flushJS(); touch("move", 160, 260); frames(2);
    touch("move", 420, 580); frames(25);
    expect(hovered).toHaveBeenCalledWith("kitchen");
    touch("cancel", 420, 580); frames(30);
    const slot = current.slots.get()[0];
    expect(slot.committed && slot.targetX === slot.sourceX && slot.targetY === slot.sourceY || !slot.id).toBe(true);
    await act(async () => renderer.unmount());
  });
  it("releasing on a room button before the hover ends still lands there and follows it", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Hover scene={fixture()} />); });
    current.dropZones.set([zone]);
    touch("down", 100, 200); flushJS(); touch("move", 160, 260); frames(2);
    touch("move", 420, 580); frames(2);
    touch("up", 420, 580); flushJS();
    expect(hovered).toHaveBeenCalledWith("kitchen");
    expect(current.slots.get()[0].proposal).toMatchObject({ room: "kitchen" });
    await act(async () => renderer.unmount());
  });
  it("P1-2: holding over a Next room arrow keeps the latched destination stable without cascading or dropping one room farther", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Hover scene={fixture()} />); });
    current.dropZones.set([zone]);
    touch("down", 100, 200); flushJS();
    touch("move", 160, 260); frames(2);
    // Move onto Next room arrow (initially kitchen) and hold past 300ms.
    touch("move", 420, 580); frames(22);
    expect(hovered).toHaveBeenCalledTimes(1);
    expect(hovered).toHaveBeenCalledWith("kitchen");
    // Simulate HomeChrome reassigning the exact same Next arrow rect to treehouse once room becomes kitchen.
    current.dropZones.set([{ kind: "room", room: "treehouse", x: 400, y: 560, width: 48, height: 48 }]);
    // Keep holding at the same finger position for 600+ ms -> MUST NOT cascade to treehouse!
    frames(40);
    expect(hovered).toHaveBeenCalledTimes(1);
    expect(current.slots.get()[0].proposal).toMatchObject({ room: "kitchen", kind: "floor" });
    // Releasing right there drops into kitchen, NOT one room farther into treehouse!
    touch("up", 420, 580); flushJS();
    expect(hovered).toHaveBeenCalledTimes(1);
    expect(current.slots.get()[0].proposal).toMatchObject({ room: "kitchen" });
    await act(async () => renderer.unmount());
  });
  it("P1-2: leaving the room arrow clears the latch so re-entering steps to the reassigned room", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Hover scene={fixture()} />); });
    current.dropZones.set([zone]);
    touch("down", 100, 200); flushJS();
    touch("move", 160, 260); frames(2);
    touch("move", 420, 580); frames(22);
    expect(hovered).toHaveBeenCalledWith("kitchen");
    current.dropZones.set([{ kind: "room", room: "treehouse", x: 400, y: 560, width: 48, height: 48 }]);
    // Leave the arrow into the room canvas -> clears latch.
    touch("move", 500, 300); frames(2);
    expect(current.roomHover.get()).toBeNull();
    // Re-enter the arrow -> now steps cleanly to treehouse!
    touch("move", 420, 580); frames(22);
    expect(hovered).toHaveBeenCalledTimes(2);
    expect(hovered).toHaveBeenLastCalledWith("treehouse");
    expect(current.slots.get()[0].proposal).toMatchObject({ room: "treehouse", kind: "floor" });
    await act(async () => renderer.unmount());
  });
  it("a friend's held prop and pose travel with them to the other room", () => {
    let state = labHome();
    let scene = buildScene(state);
    const friend = Object.values(scene.entities).find((e) => e.character && e.room === "home" && !e.children.length)!;
    const prop = Object.values(scene.entities).find((e) => e.item && e.room === "home" && e.body?.holdable && e.attachment.kind !== "hand")!;
    const hand = scene.rooms.home.targets.find((t) => t.kind === "hand" && t.owner === friend.id)!;
    const give = resolveDrop(scene.rooms.home, prop, hand.contact, { scale: 1, release: true, target: hand.id });
    expect(give.kind).toBe("hand");
    const given = apply(state, give);
    expect("state" in given).toBe(true);
    state = (given as { state: typeof state }).state;
    scene = buildScene(state);
    const carrier = scene.entities[friend.id];
    // The runtime resolves against every room's shared entity map, as useInteraction prepares it.
    const move = resolveDrop({ ...scene.rooms.kitchen, entities: scene.entities }, carrier, roomPoint(400, 480), { scale: 1, floorOnly: true, release: true });
    expect(move).toMatchObject({ room: "kitchen", kind: "floor" });
    const moved = apply(state, move);
    expect("state" in moved).toBe(true);
    const after = (moved as { state: typeof state }).state;
    const kitchenFriend = after.rooms.kitchen.characters.find((c) => c.slot === friend.character!.slot)!;
    expect(kitchenFriend.holding).toBeDefined();
    expect(after.rooms.kitchen.instances.some((i) => i.id === kitchenFriend.holding)).toBe(true);
    expect(after.rooms.home.characters.some((c) => c.slot === friend.character!.slot)).toBe(false);
  });
  it("the edge band is 48 pt on every viewport", () => {
    expect(EDGE_BAND).toBe(48);
    expect(edgeVelocity(47, 402, 200)).toBeGreaterThan(0);
    expect(edgeVelocity(49, 402, 200)).toBe(0);
    expect(edgeVelocity(1024 - 47, 1024, 200)).toBeLessThan(0);
  });
});
describe("HM-15 the sand drops onto the floor visibly; HC-02 beach shells", () => {
  it("a friend let go on the sand lands on the nearest open floor, with visible travel", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={fixture()} />); });
    touch("down", 100, 200); flushJS(); touch("move", 140, 260); frames(2);
    touch("move", 300, 760); frames(1);
    const proposal = current.slots.get()[0].proposal!;
    expect(proposal).toMatchObject({ kind: "floor", room: "home" });
    expect(proposal.contact.y).toBeLessThan(560);
    touch("up", 300, 760); flushJS();
    const slot = current.slots.get()[0];
    expect(slot.phase).toBe("settling");
    expect(slot.targetY).toBeLessThan(slot.releaseY - 100);
    expect(settleProgress(16, false, slot.duration)).toBeLessThan(0.5);
    await act(async () => renderer.unmount());
  });
  it("each ground-floor beach has three shells to pick up, on the sand, outside the room", () => {
    const scene = withPortions(buildScene(labHome()), ["home", "kitchen"]);
    for (const room of ["home", "kitchen"] as const) shoreShells.forEach(([x, y], n) => {
      const shell = scene.entities[shoreShellId(room, n)];
      expect(shell.item!.item).toBe("shell");
      expect(shell.contact).toEqual(roomPoint(x, y));
      expect(pickEntity(prepareHits(scene)[room], roomPoint(x, y - 12), 0.5)).toBe(shell.id);
    });
    expect(scene.entities[shoreShellId("treehouse", 0)]).toBeUndefined();
  });
  it("a shell let go on the sand goes back to its spot and saves nothing", async () => {
    const scene = withPortions(buildScene(labHome()), ["home", "kitchen", "treehouse", "beach"]);
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={scene} />); });
    const [x, y] = shoreShells[0];
    touch("down", 20 + x, 120 + y - 14); flushJS();
    expect(current.slots.get()[0].id).toBe(shoreShellId("home", 0));
    touch("move", 20 + x + 40, 120 + y + 20); frames(2);
    touch("move", 20 + x + 180, 120 + y + 30); frames(1);
    expect(current.slots.get()[0].proposal).toBeUndefined();
    touch("up", 20 + x + 180, 120 + y + 30); flushJS();
    const slot = current.slots.get()[0];
    expect(slot.targetX).toBe(slot.sourceX);
    expect(slot.targetY).toBe(slot.sourceY);
    await act(async () => renderer.unmount());
  });
});

describe("HM-18 background taps", () => {
  function both(type: string, a: [number, number], b: [number, number]) {
    harness.handlers[type](
      { changedTouches: [{ x: a[0], y: a[1], id: 1 }, { x: b[0], y: b[1], id: 2 }], numberOfTouches: type === "up" ? 0 : 2 },
      manager
    );
  }
  it("a short single-finger background touch is a tap; a hold over 500 ms is not", async () => {
    const onTap = vi.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={fixture()} onTap={onTap} />); });
    touch("down", 700, 500); vi.advanceTimersByTime(120); touch("up", 700, 500); flushJS();
    expect(onTap).toHaveBeenCalledTimes(1);
    touch("down", 700, 500); vi.advanceTimersByTime(BACKGROUND_TAP_MS + 80); touch("up", 700, 500); flushJS();
    expect(onTap).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  });
  it("a two-finger tap is ignored, so it can neither zoom nor move a selection", async () => {
    const onTap = vi.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={fixture()} onTap={onTap} />); });
    both("down", [600, 400], [700, 420]); vi.advanceTimersByTime(60); both("up", [600, 400], [700, 420]); flushJS();
    expect(onTap).not.toHaveBeenCalled();
    // The next ordinary tap still counts.
    touch("down", 700, 500); touch("up", 700, 500); flushJS();
    expect(onTap).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  });
});
describe("HR-01 friends drawer pickups", () => {
  function Drawer({ scene }: { scene: Scene }) {
    const interaction = useInteraction({
      scene, building: fixtureBuilding, viewport: fixtureViewport, initialCamera: identityCamera, reduced: false, designing: false,
      onCameraChange: cameraChange, onPickup: (pickup) => { current.ready(pickup.slot, pickup.id); }, onTap: () => {}, onClear: noop,
      onCommit: commitFixture, currentRoom: "home",
    });
    React.useLayoutEffect(() => { current = interaction; });
    return null;
  }
  it("a friend carried out of the drawer starts under the finger and its room copy does not slide", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Drawer scene={fixture()} />); });
    current.externalDown(-200, "character/0", { x: 700, y: 560 } as never, undefined, { below: 100 });
    current.externalMove(-200, { x: 690, y: 540 } as never);
    flushJS();
    const slot = current.slots.get()[0];
    expect(slot).toMatchObject({ id: "character/0", drawer: true, phase: "dragging" });
    // Identity camera: the house point is the screen point; the contact sits 100 below the finger.
    expect(slot.sourceX).toBeCloseTo(700);
    expect(slot.sourceY).toBeCloseTo(660);
    expect(slot.x).toBeCloseTo(690);
    expect(slot.y).toBeCloseTo(640);
    expect(current.restingMotion.get().follow).toEqual([]);
    await act(async () => renderer.unmount());
  });
  it("let go in the room, the friend lands there as the same friend; on the Friends button, they wait", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Drawer scene={fixture()} />); });
    current.dropZones.set([{ kind: "drawer", x: 900, y: 560, width: 48, height: 48 }]);
    current.externalDown(-200, "character/0", { x: 700, y: 560 } as never, undefined, { below: 100 });
    current.externalMove(-200, { x: 300, y: 380 } as never); frames(2);
    expect(current.slots.get()[0].proposal).toMatchObject({ id: "character/0", kind: "floor", room: "home" });
    current.externalMove(-200, { x: 920, y: 580 } as never); frames(2);
    expect(current.slots.get()[0].proposal).toMatchObject({ id: "character/0", kind: "staging" });
    expect(current.drawerHover.get()).toBe(true);
    current.externalUp(-200, false); flushJS(); frames(1);
    const slot = current.slots.get()[0];
    // It flies to the button it was let go on, not back to its old spot.
    expect(slot.targetX).toBeCloseTo(924);
    expect(slot.targetY).toBeCloseTo(584);
    frames(2);
    expect(current.drawerHover.get()).toBe(false);
    await act(async () => renderer.unmount());
  });
  it("a prop carried over the Friends button is not put in the drawer", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    const scene = buildScene(labHome());
    await act(async () => { renderer = TestRenderer.create(<Drawer scene={scene} />); });
    current.dropZones.set([{ kind: "drawer", x: 900, y: 560, width: 48, height: 48 }]);
    current.externalDown(-300, "home/item/cup", { x: 300, y: 380 } as never);
    current.externalMove(-300, { x: 330, y: 400 } as never); frames(1);
    current.externalMove(-300, { x: 920, y: 580 } as never); frames(1);
    expect(current.slots.get()[0]).toMatchObject({ id: "home/item/cup", phase: "dragging" });
    expect(current.slots.get()[0].proposal?.kind).not.toBe("staging");
    expect(current.drawerHover.get()).toBe(false);
    await act(async () => renderer.unmount());
  });
});
describe("HR-02 one quiet wiggle", () => {
  it("a hint wiggles only its own thing, for 180 ms, then the frame callback stops again", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={fixture()} />); });
    frames(5);
    registry.calls = [];
    act(() => current.showHint("character/0"));
    expect(registry.calls).toEqual([[7, true]]);
    frames(3);
    const wobble = current.restingMotion.get().wobble;
    expect(Object.keys(wobble)).toEqual(["character/0"]);
    expect(Math.abs(wobble["character/0"])).toBeLessThanOrEqual(3);
    frames(20);
    expect(current.restingMotion.get().wobble).toEqual({});
    expect(registry.calls.at(-1)).toEqual([7, false]);
    await act(async () => renderer.unmount());
  });
  it("no hint starts under a finger", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={fixture()} />); });
    touch("down", 700, 500);
    act(() => current.showHint("character/0"));
    frames(3);
    expect(current.restingMotion.get().wobble).toEqual({});
    touch("up", 700, 500); flushJS();
    await act(async () => renderer.unmount());
  });
});
describe("HM-13 timing after a restart", () => {
  it("the first frame after the callback restarts does not count the stopped time as a frame", async () => {
    vi.stubGlobal("requestAnimationFrame", () => 1);
    const events: any[] = [];
    function Traced({ scene }: { scene: Scene }) {
      const interaction = useInteraction({ scene, building: fixtureBuilding, viewport: fixtureViewport, initialCamera: identityCamera, reduced: false,
        designing: false, onCameraChange: cameraChange, onPickup: (p) => { current.ready(p.slot, p.id); }, onTap: () => {}, onClear: noop,
        onCommit: commitFixture, onTrace: (e) => events.push(e) });
      React.useLayoutEffect(() => { current = interaction; });
      return null;
    }
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Traced scene={fixture()} />); });
    frames(20);
    expect(events.some((e) => e.type === "frames-idle")).toBe(true);
    touch("down", 100, 200); flushJS();
    harness.frames[0]({ timeSincePreviousFrame: 4000 }); flushJS();
    touch("move", 160, 240);
    for (let i = 0; i < 14; i++) { touch("move", 160 + i, 240); frame(); flushJS(); }
    touch("up", 174, 240); flushJS();
    act(() => current.cancelAll()); frames(10);
    const batches = events.filter((e) => e.type === "frames");
    expect(batches.length).toBeGreaterThan(0);
    for (const b of batches) expect(b.max).toBeLessThan(100);
    await act(async () => renderer.unmount());
  });
});
