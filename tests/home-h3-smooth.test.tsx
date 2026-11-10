import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { layoutToken } from "../src/home/runtime/layout";
import { useInteraction, mergeRoomPayloads, roomPayloadsOf, type Pickup, type Interaction } from "../src/home/runtime/useInteraction";
import { buildingLayout } from "../src/home/camera";
import { identityCamera } from "../src/home/scene/camera";
import { gridCell, roomPoint, type Scene, type SceneEntity } from "../src/home/scene/types";
import { roomIds } from "../src/home/catalogMore";
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
function Probe({ scene, layout = true, designing = false, reduced = false }: { scene: Scene; layout?: boolean; designing?: boolean; reduced?: boolean }) {
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
          current.acknowledgePose(pickup.slot, layoutToken(pickup.scene.entities[pickup.id])); }
    },
    onTap: () => {},
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
      if (entity) interaction.acknowledgePose(interaction.slots.get().indexOf(slot), layoutToken(entity));
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
