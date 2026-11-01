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
  bounds: { left: 70, top: 80, width: 60, height: 220 },
  hitProxies: [{ left: 70, top: 80, width: 60, height: 220 }],
  character: { slot: 0, anchor: "floor", pose: "stand", x: 2, y: 2 },
};
function fixture(revision = "initial"): Scene {
  const rooms = Object.fromEntries(
    roomIds.map((room) => [
      room,
      {
        room,
        revision,
        entities: room === "home" ? { [entity.id]: entity } : {},
        floor: [{ cell: gridCell(4, 7), contact: roomPoint(200, 486), blockers: [], occlusion: [0, 0, 0] }],
        surfaces: [],
        sockets: [],
        targets: [],
        buckets: {},
        occlusionBands: [],
        hitProxies:
          room === "home" ? [{ id: entity.id, bounds: entity.bounds, depth: entity.depth, band: entity.band }] : [],
      },
    ])
  ) as unknown as Scene["rooms"];
  return { revision, entities: { [entity.id]: entity }, rooms };
}
let current: Interaction;
let committed = 0;
function Probe({ scene }: { scene: Scene }) {
  current = useInteraction({
    scene,
    building: buildingLayout(4, true),
    viewport: { width: 1000, height: 600 },
    initialCamera: identityCamera,
    reduced: false,
    designing: false,
    onCameraChange: () => {},
    onPickup: (pickup) => current.ready(pickup.slot, pickup.id),
    onTap: () => {},
    onClear: () => {},
    onCommit: (index, proposal) => {
      committed++;
      current.finish(index, true, proposal, "committed");
    },
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
      renderer!.update(<Probe scene={fixture("committed")} />);
    });
    harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    expect(current.slots.get()[0].id).toBe("");
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
