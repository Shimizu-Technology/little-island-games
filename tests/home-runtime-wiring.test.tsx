import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInteraction, type Interaction } from "../src/home/runtime/useInteraction";
import { buildingLayout } from "../src/home/camera";
import { identityCamera } from "../src/home/scene/camera";
import { gridCell, roomPoint, type Scene, type SceneEntity } from "../src/home/scene/types";
import { roomIds } from "../src/home/catalogMore";
const harness = vi.hoisted(() => ({
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
            this.value = fn(this.value);
          },
          set(value: any) {
            this.value = typeof value === "function" ? value(this.value) : value;
          },
        };
      return ref.current;
    },
    useFrameCallback: (fn: (frame: { timeSincePreviousFrame: number }) => void) => {
      harness.frames[0] = fn;
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
let committed = 0;
let committedContact = entity.contact;
function Probe({ scene }: { scene: Scene }) {
  const interaction = useInteraction({
    scene,
    building: buildingLayout(4, true),
    viewport: { width: 1000, height: 600 },
    initialCamera: identityCamera,
    reduced: false,
    designing: false,
    onCameraChange: () => {},
    onPickup: (pickup) => {
      const slot = current.slots.get()[pickup.slot];
      if (slot.id === pickup.id && slot.generation === pickup.generation && slot.epoch === pickup.epoch)
        current.ready(pickup.slot, pickup.id);
    },
    onTap: () => {},
    onClear: () => {},
    onCommit: (index, proposal, _at, token) => {
      if (!current.isCurrent(index, token)) return;
      committed++;
      committedContact = proposal.contact;
      current.finish(index, true, proposal, "committed", undefined, token);
    },
  });
  React.useLayoutEffect(() => {
    current = interaction;
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
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  harness.frames = [];
  harness.js = [];
  harness.handlers = {};
  committed = 0;
  vi.useFakeTimers();
  vi.setSystemTime(1000);
});
describe("actual runtime callback sequencing", () => {
  it("retains the release transform while JS is queued and waits for the committed React scene", async () => {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe scene={fixture()} />);
    });
    touch("down", 120, 300);
    touch("move", 150, 320);
    flushJS();
    const released = { x: current.slots.get()[0].x, y: current.slots.get()[0].y };
    expect(released).not.toEqual({ x: 120, y: 420 });
    touch("up", 150, 320);
    expect(committed).toBe(0);
    vi.advanceTimersByTime(200);
    harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    expect(current.slots.get()[0].x).toBe(released.x);
    expect(current.slots.get()[0].y).toBe(released.y);
    flushJS();
    expect(committed).toBe(1);
    vi.advanceTimersByTime(260);
    harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    expect(current.slots.get()[0].id).toBe(entity.id); // destination React tree is still stale
    await act(async () => {
      renderer!.update(<Probe scene={fixture("newer-unrelated-commit", committedContact)} />);
    });
    harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    expect(current.slots.get()[0].id).toBe("");
    await act(async () => {
      renderer!.unmount();
    });
    vi.useRealTimers();
  });
  it("invalidates a queued commit when a new capture regrabs or cancels it", async () => {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe scene={fixture()} />);
    });
    touch("down", 120, 300);
    touch("move", 150, 320);
    flushJS();
    touch("up", 150, 320);
    const oldGeneration = current.slots.get()[0].generation;
    touch("down", 150, 320, 9);
    touch("move", 180, 340, 9);
    expect(current.slots.get()[0].generation).toBeGreaterThan(oldGeneration);
    flushJS();
    expect(committed).toBe(0);
    expect(current.slots.get()[0].phase).toBe("dragging");
    touch("up", 180, 340, 9);
    current.cancelAll();
    flushJS();
    expect(committed).toBe(0);
    expect(current.slots.get().every((s) => !s.id)).toBe(true);
    await act(async () => {
      renderer!.unmount();
    });
    vi.useRealTimers();
  });
  it("ignores a third contact without cancelling either pending actor", async () => {
    const scene = fixture();
    const friend = {
      ...entity,
      id: "character/1",
      contact: roomPoint(500, 300),
      character: { ...entity.character!, slot: 1 as const },
    };
    scene.entities[friend.id] = friend;
    scene.rooms.home.entities = scene.entities;
    scene.rooms.home.hitProxies.push({
      id: friend.id,
      bounds: { left: 470, top: 80, width: 60, height: 220 },
      depth: friend.depth,
      band: friend.band,
    });
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe scene={scene} />);
    });
    touch("down", 120, 300, 1);
    touch("down", 500, 300, 2);
    touch("down", 200, 200, 3);
    expect(current.controller.get().pointers.map((p) => p.entity)).toEqual(["character/0", "character/1"]);
    touch("move", 150, 320, 1);
    touch("move", 530, 320, 2);
    expect(current.slots.get().filter((s) => s.id)).toHaveLength(2);
    await act(async () => {
      renderer!.unmount();
    });
    vi.useRealTimers();
  });
  it("initializes the current overlay after a regrab invalidates a queued pickup", async () => {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe scene={fixture()} />);
    });
    touch("down", 120, 300);
    touch("move", 150, 320);
    touch("up", 150, 320);
    touch("down", 150, 320, 9);
    touch("move", 170, 340, 9);
    expect(current.slots.get()[0].ready).toBe(false);
    flushJS();
    expect(current.slots.get()[0].ready).toBe(true);
    expect(current.slots.get()[0].phase).toBe("dragging");
    expect(committed).toBe(0);
    await act(async () => {
      renderer!.unmount();
    });
    vi.useRealTimers();
  });
  it("freezes a settling transform on contact before the six point threshold", async () => {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe scene={fixture()} />);
    });
    touch("down", 120, 300);
    touch("move", 150, 320);
    flushJS();
    touch("up", 150, 320);
    flushJS();
    vi.advanceTimersByTime(60);
    harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    const frozen = { ...current.slots.get()[0] };
    touch("down", frozen.x, frozen.y - 120, 8);
    expect(current.slots.get()[0].phase).toBe("pending");
    vi.advanceTimersByTime(100);
    harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    expect(current.slots.get()[0].x).toBe(frozen.x);
    expect(current.slots.get()[0].y).toBe(frozen.y);
    touch("move", frozen.x + 12, frozen.y - 120, 8);
    expect(current.slots.get()[0].x).toBeCloseTo(frozen.x + 12);
    expect(current.slots.get()[0].y).toBeCloseTo(frozen.y);
    await act(async () => {
      renderer!.unmount();
    });
    vi.useRealTimers();
  });
  it("compensates a stationary held point after any camera change", async () => {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe scene={fixture()} />);
    });
    touch("down", 120, 300);
    touch("move", 150, 320);
    flushJS();
    current.camera.set({ a: 2, d: 2, b: 0, c: 0, tx: -10, ty: 30 });
    harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    const slot = current.slots.get()[0];
    expect((slot.x + slot.gripX) * 2 - 10).toBeCloseTo(150);
    expect((slot.y + slot.gripY) * 2 + 30).toBeCloseTo(320);
    await act(async () => {
      renderer!.unmount();
    });
    vi.useRealTimers();
  });
  it.each([false, true])("reserves attachment groups from pointer down (pending=%s)", async (pending) => {
    const scene = fixture();
    const table = {
      ...entity,
      id: "home/item/table",
      character: undefined,
      item: {
        id: "table",
        item: "coffee-table",
        x: 2,
        y: 2,
        rotation: 0,
        mirrored: false,
        layer: "furniture",
        state: "rest",
      },
      children: ["home/item/lamp"],
    } as SceneEntity;
    const lamp = {
      ...entity,
      id: "home/item/lamp",
      character: undefined,
      item: {
        id: "lamp",
        item: "table-lamp",
        x: 2,
        y: 2,
        rotation: 0,
        mirrored: false,
        layer: "furniture",
        state: "rest",
      },
      parent: table.id,
      attachment: { kind: "surface", parent: table.id, slot: 0 },
      children: [],
      bounds: { left: -10, top: -200, width: 20, height: 20 },
      depth: 301,
    } as SceneEntity;
    scene.entities = { [table.id]: table, [lamp.id]: lamp };
    scene.rooms.home.entities = scene.entities;
    scene.rooms.home.hitProxies = [table, lamp].map((e) => ({
      id: e.id,
      bounds: { ...e.bounds, left: e.contact.x + e.bounds.left, top: e.contact.y + e.bounds.top },
      depth: e.depth,
      band: e.band,
    }));
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe scene={scene} />);
    });
    touch("down", 120, 300);
    if (!pending) {
      touch("move", 300, 350);
      flushJS();
    }
    touch("down", 100, 110, 2);
    if (pending) {
      touch("move", 300, 350);
      flushJS();
    }
    expect(current.slots.get()[0].id).toBe(table.id);
    touch("move", 140, 250, 2);
    expect(
      current.controller
        .get()
        .pointers.filter((p) => p.entity)
        .map((p) => p.entity)
    ).toEqual([table.id]);
    expect(current.slots.get()[1].id).toBe("");
    await act(async () => {
      renderer!.unmount();
    });
    vi.useRealTimers();
  });
  it("makes a committed consumed overlay noninteractive immediately", async () => {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe scene={fixture()} />);
    });
    touch("down", 120, 300);
    touch("move", 150, 320);
    flushJS();
    touch("up", 150, 320);
    const slot = current.slots.get()[0];
    const destination = fixture("consumed");
    destination.entities = {};
    destination.rooms.home.entities = {};
    destination.rooms.home.hitProxies = [];
    current.finish(0, true, { ...slot.proposal!, kind: "mouth", consume: "food" }, "consumed", destination);
    expect(current.slots.get()[0].consumed).toBe(true);
    touch("down", 150, 320, 9);
    touch("move", 170, 340, 9);
    expect(current.controller.get().pointers.some((p) => p.entity)).toBe(false);
    flushJS();
    expect(committed).toBe(0);
    await act(async () => {
      renderer!.unmount();
    });
    vi.useRealTimers();
  });
  it("does not schedule React work for each drag frame and cancellation never commits", async () => {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe scene={fixture()} />);
    });
    touch("down", 120, 300);
    touch("move", 140, 320);
    flushJS();
    for (let x = 141; x < 200; x++) touch("move", x, 320);
    expect(harness.js).toHaveLength(0);
    touch("cancel", 199, 320);
    flushJS();
    expect(committed).toBe(0);
    vi.advanceTimersByTime(260);
    harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    expect(current.slots.get()[0].id).toBe("");
    await act(async () => {
      renderer!.unmount();
    });
    vi.useRealTimers();
  });
});
