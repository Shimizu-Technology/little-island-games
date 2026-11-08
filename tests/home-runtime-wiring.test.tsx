import React from "react";
import { instance } from "../src/home/model";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { layoutToken } from "../src/home/runtime/layout";
import { useInteraction, type Interaction } from "../src/home/runtime/useInteraction";
import { buildingLayout } from "../src/home/camera";
import { identityCamera } from "../src/home/scene/camera";
import { gridCell, roomPoint, type Scene, type SceneEntity } from "../src/home/scene/types";
import { roomIds } from "../src/home/catalogMore";
const harness = vi.hoisted(() => ({
  deferUI: false,
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
            const apply = () => { this.value = next; };
            if (harness.deferUI) harness.ui.push(apply); else apply();
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
let committedId = "";
let committedContact = entity.contact;
let destinationRevision = "";
const cameraChange = vi.fn();
const fixtureBuilding = buildingLayout(4, true), fixtureViewport = { width: 1000, height: 600 };
const noop = () => {};
const commitFixture: Parameters<typeof useInteraction>[0]["onCommit"] = (index, proposal, _at, token) => {
  if (!current.isCurrent(index, token)) return;
  committed++; committedId = proposal.id; committedContact = proposal.contact;
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
      const slot = current.slots.get()[pickup.slot];
      if (slot.id === pickup.id && slot.generation === pickup.generation && slot.epoch === pickup.epoch)
        { current.ready(pickup.slot, pickup.id);
          current.acknowledgePose(pickup.slot, layoutToken(pickup.scene.entities[pickup.id])); }
    },
    onTap: () => {},
    onClear: noop,
    onDestination: (_index, scene) => {
      destinationRevision = scene.revision;
    },
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
  harness.ui = [];
  harness.frames = [];
  harness.js = [];
  harness.handlers = {};
  committed = 0;
  committedId = "";
  destinationRevision = "";
  vi.useFakeTimers();
  vi.setSystemTime(1000);
});
describe("HM-03 anchored furniture in Play", () => {
  function roomWith(item: string) {
    const scene = fixture();
    const thing = { ...entity, id: `home/item/${item}`, character: undefined, base: "stand" as const, band: "furniture-back" as const,
      item: { ...instance(item, item, 2, 2) }, body: { w: 2, h: 2, layer: "furniture", small: false, holdable: false, portable: item !== "bed" } } as SceneEntity;
    scene.entities = { [thing.id]: thing };
    scene.rooms.home.entities = scene.entities;
    scene.rooms.home.occupancy = {};
    scene.rooms.home.hitProxies = [{ id: thing.id, bounds: { left: 70, top: 80, width: 60, height: 220 }, depth: thing.depth, band: thing.band }];
    return { scene, thing };
  }
  it("a stray bed drag wobbles, becomes a camera pan and commits nothing", async () => {
    const { scene, thing } = roomWith("bed");
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={scene} />); });
    touch("down", 100, 200); flushJS();
    expect(current.slots.get()[0].id).toBe("");
    touch("move", 112, 200); flushJS();
    expect(current.controller.get().pointers).toMatchObject([{ phase: "camera" }]);
    expect(current.controller.get().pointers[0].entity).toBeUndefined();
    expect(current.fixtureNudges.get()[thing.id]).toBeGreaterThan(0);
    touch("move", 140, 230); flushJS();
    touch("up", 140, 230); flushJS();
    expect(committed).toBe(0);
    expect(current.slots.get()[0].id).toBe("");
    await act(async () => renderer.unmount());
  });
  it("a tap on a bed is still a tap, and a second finger on it is camera input", async () => {
    const { scene } = roomWith("bed");
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={scene} />); });
    touch("down", 100, 200); flushJS();
    harness.handlers.down({ changedTouches: [{ x: 110, y: 260, id: 2 }], numberOfTouches: 2 }, manager); flushJS();
    expect(current.controller.get().pointers.every((p) => !p.entity)).toBe(true);
    expect(current.controller.get().pointers).toHaveLength(2);
    await act(async () => renderer.unmount());
  });
  it("a portable item still lifts and moves", async () => {
    const { scene, thing } = roomWith("teddy");
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={scene} />); });
    touch("down", 100, 200); flushJS();
    expect(current.slots.get()[0].id).toBe(thing.id);
    touch("move", 140, 230); flushJS();
    expect(current.slots.get()[0].phase).toBe("dragging");
    await act(async () => renderer.unmount());
  });
});
describe("actual runtime callback sequencing", () => {
  it("Q3 release commits the visible floor preview during a pending target change", async () => {
    const scene = fixture();
    const target = (id: string, x: number, y: number) => ({
      id, kind: "socket" as const, owner: `home/item/${id}`, attachment: { kind: "socket" as const, item: `home/item/${id}`, socket: "seat" },
      contact: roomPoint(x, y), core: { left: x-10, top: y-10, width: 20, height: 20 }, base: "sit" as const, facing: "front" as const,
    });
    scene.rooms.home.targets = [target("first",130,400), target("next",220,430)];
    scene.rooms.home.buckets = { "1:3": [0,1] };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={scene} />); });
    touch("down",120,300); touch("move",150,520); flushJS();
    expect(current.slots.get()[0].proposal?.target).toBe("first");
    touch("move",210,550);
    const preview = current.slots.get()[0].proposal!;
    expect(preview.kind).toBe("floor"); expect(preview.pending?.target).toBe("next");
    touch("up",210,550);
    expect(current.slots.get()[0].proposal).toEqual(preview);
    expect(current.slots.get()[0].targetX).toBe(20+preview.contact.x);
    expect(current.slots.get()[0].targetY).toBe(120+preview.contact.y);
    await act(async () => renderer.unmount()); vi.useRealTimers();
  });

  it("T2 keeps the native frame callback registered across committed scene updates", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={fixture()} />); });
    const callback = harness.frames[0];
    await act(async () => { renderer.update(<Probe scene={fixture("updated", roomPoint(200, 450))} />); });
    expect(harness.frames[0]).toBe(callback);
    await act(async () => renderer.unmount()); vi.useRealTimers();
  });

  it("T2 preserves every native pose acknowledgment when JS callbacks arrive before UI writes flush", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={fixture()} />); });
    harness.deferUI = true;
    const tokens = ["stand:front:none", "sit:front:none", "lie:front:none", "bathe:front:none"];
    for (const token of tokens) current.acknowledgePose(0, token);
    while (harness.ui.length) harness.ui.shift()!();
    for (const token of tokens) expect(current.poseLayouts.get()[`0:${token}`]).toBe(token);
    harness.deferUI = false;
    await act(async () => renderer.unmount()); vi.useRealTimers();
  });

  it("R6 does not queue stale camera navigation after a plain overview room tap", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe scene={fixture()} />);
    });
    // Empty background is the room hit; no pan or pinch occurred.
    touch("down", 500, 220);
    touch("up", 500, 220);
    flushJS();
    expect(cameraChange).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
    vi.useRealTimers();
  });
  it("reveals a pose-changing drop when another edit supersedes its acknowledged revision", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe scene={fixture()} />);
    });
    touch("down", 120, 300);
    touch("move", 150, 320);
    flushJS();
    touch("up", 150, 320);
    // Acknowledge a supported-pose commit without first rendering its revision.
    const proposal = { ...current.slots.get()[0].proposal!, base: "lie" as const };
    const acknowledged = fixture("first-commit", proposal.contact);
    acknowledged.entities[entity.id].base = "lie";
    current.finish(0, true, proposal, "first-commit", acknowledged);
    const newer = fixture("second-commit", proposal.contact);
    newer.entities[entity.id].base = "lie";
    await act(async () => renderer.update(<Probe scene={newer} />));
    vi.advanceTimersByTime(260);
    harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    expect(current.slots.get()[0].id).toBe("");
    expect(current.controller.get().phase).toBe("idle");
    await act(async () => renderer.unmount());
    vi.useRealTimers();
  });
  it.each([false, true])(
    "retargets a superseded landing without rewinding visual progress (pending=%s)",
    async (pending) => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(<Probe scene={fixture()} />);
      });
      touch("down", 120, 300);
      touch("move", 150, 320);
      flushJS();
      touch("up", 150, 320);
      const proposal = current.slots.get()[0].proposal!;
      current.finish(0, true, proposal, "first-commit", fixture("first-commit", proposal.contact));
      vi.advanceTimersByTime(100);
      harness.frames[0]({ timeSincePreviousFrame: 16.67 });
      if (pending) {
        const visible = current.slots.get()[0];
        touch("down", visible.x, visible.y - 10, 2);
        expect(current.slots.get()[0].phase).toBe("pending");
      }
      const before = { ...current.slots.get()[0] };
      const newer = fixture("second-commit", roomPoint(300, 450));
      await act(async () => renderer.update(<Probe scene={newer} />));
      const retargeted = current.slots.get()[0];
      expect(retargeted.releaseX).toBe(before.x);
      expect(retargeted.releaseY).toBe(before.y);
      // Lift, scale, anatomical binding and pose blend keep their original clock.
      expect(retargeted.settleAt).toBe(before.settleAt);
      expect(retargeted.pausedElapsed).toBe(before.pausedElapsed);
      expect(retargeted.travelDelay).toBe(100);
      expect(retargeted.targetX).toBe(320);
      expect(retargeted.targetY).toBe(570);
      expect(retargeted.proposal?.base).toBe("stand");
      expect(destinationRevision).toBe("second-commit");
      if (pending) touch("up", before.x, before.y - 10, 2);
      vi.advanceTimersByTime(260);
      harness.frames[0]({ timeSincePreviousFrame: 16.67 });
      expect(current.slots.get()[0].id).toBe("");
      expect(current.controller.get().phase).toBe("idle");
      await act(async () => renderer.unmount());
      vi.useRealTimers();
    }
  );
  it("starts travel before JS is available and holds the exact target through acknowledgment", async () => {
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
    // Exact open-floor placement keeps x; only the contained y needs travel.
    expect(current.slots.get()[0].x).toBe(released.x);
    expect(current.slots.get()[0].y).not.toBe(released.y);
    expect(committed).toBe(0);
    vi.advanceTimersByTime(50);
    harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    const target = { x: current.slots.get()[0].x, y: current.slots.get()[0].y };
    flushJS();
    expect({ x: current.slots.get()[0].x, y: current.slots.get()[0].y }).toEqual(target);
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
  it("holds the exact contact through delayed native layout, rejecting an old pose acknowledgement", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={fixture()} />); });
    touch("down", 120, 300); touch("move", 150, 320); flushJS(); touch("up", 150, 320);
    const proposal = { ...current.slots.get()[0].proposal!, base: "lie" as const };
    const final = fixture("mounted-on-js", proposal.contact);
    final.entities[entity.id].base = "lie";
    current.finish(0, true, proposal, final.revision, final);
    await act(async () => renderer.update(<Probe scene={final} layout={false} />));
    vi.advanceTimersByTime(900);
    harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    const settled = { ...current.slots.get()[0] };
    expect(settled.id).toBe(entity.id);
    expect(settled.x).toBe(settled.targetX); expect(settled.y).toBe(settled.targetY);
    current.acknowledgeLayout(entity.id, layoutToken(entity)); // old native standing subtree
    harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    expect(current.slots.get()[0].id).toBe(entity.id);
    current.acknowledgeLayout(entity.id, layoutToken(final.entities[entity.id]));
    harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    expect(current.slots.get()[0].id).toBe(entity.id); // overlay final art has not laid out yet
    current.acknowledgePose(0, layoutToken(final.entities[entity.id]));
    harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    expect(current.slots.get()[0].id).toBe("");
    expect(current.slots.get()[0].x).toBe(settled.x); expect(current.slots.get()[0].y).toBe(settled.y);
    await act(async () => renderer.unmount()); vi.useRealTimers();
  });
  it.each(["fridge", "stove", "sink-counter"])("S1 cancels a native Play drag of %s before any pickup motion", async (item) => {
    const scene = fixture();
    const fixtureEntity = { ...entity, character: undefined, item: {
      id: "fixture", item, x: 2, y: 2, rotation: 0, mirrored: false, layer: "furniture", state: "rest",
    }} as SceneEntity;
    scene.entities = { [entity.id]: fixtureEntity }; scene.rooms.home.entities = scene.entities;
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={scene} />); });
    touch("down", 120, 300); flushJS(); touch("move", 200, 420);
    expect(current.slots.get().every((s) => !s.id)).toBe(true);
    touch("up", 200, 420); flushJS();
    expect(committed).toBe(0);
    expect(current.controller.get().pointers).toHaveLength(0);
    await act(async () => renderer.unmount()); vi.useRealTimers();
  });
  it("prepares a hidden carry capture on touchdown and keeps its native readiness on the first move", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={fixture()} />); });
    touch("down", 120, 300);
    expect(current.slots.get()[0].phase).toBe("pending");
    expect(current.slots.get()[0].ready).toBe(false);
    flushJS();
    expect(current.slots.get()[0].ready).toBe(true);
    touch("move", 132, 300);
    expect(current.slots.get()[0].phase).toBe("dragging");
    expect(current.slots.get()[0].ready).toBe(true);
    expect(harness.js).toHaveLength(0);
    await act(async () => renderer.unmount()); vi.useRealTimers();
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
  it.each([false, true])("U4 replays a complete grab during commit, before layout acknowledgment (quick release=%s)", async (quickRelease) => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Probe scene={fixture()} />); });
    touch("down", 120, 300); touch("move", 150, 320); flushJS(); touch("up", 150, 320);
    vi.setSystemTime(1240); harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    const landing = { ...current.slots.get()[0] }, oldGeneration = landing.generation;
    expect(landing.commitRequested).toBe(true);
    touch("down", landing.x, landing.y - 30, 9);
    touch("move", landing.x + 40, landing.y - 10, 9);
    if (quickRelease) touch("up", landing.x + 40, landing.y - 10, 9);
    // JS is still busy: retain the landing transaction and all subsequent input.
    expect(current.slots.get()[0].generation).toBe(oldGeneration);
    flushJS(); expect(committed).toBe(1);
    harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    expect(current.slots.get()[0].generation).toBe(oldGeneration);
    await act(async () => { renderer.update(<Probe scene={fixture("committed", committedContact)} />); });
    vi.setSystemTime(1300); harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    expect(current.slots.get()[0].generation).toBeGreaterThan(oldGeneration);
    if (!quickRelease) {
      expect(current.slots.get()[0].phase).toBe("dragging");
      expect(current.controller.get().pointers[0].pointer).toBe(9);
      touch("up", landing.x + 40, landing.y - 10, 9);
    }
    expect(current.slots.get()[0].phase).toBe("settling");
    vi.setSystemTime(1600); harness.frames[0]({ timeSincePreviousFrame: 16.67 }); flushJS();
    expect(committed).toBe(2);
    expect(current.controller.get().pointers).toHaveLength(0);
    await act(async () => renderer.unmount()); vi.useRealTimers();
  });

  it.each([false, true])("commits a regrab under the canonical cross-room identity (queued=%s)", async (queued) => {
    const scene = fixture();
    const source = {
      ...entity,
      id: "home/item/cup",
      character: undefined,
      item: { id: "cup", item: "juice", x: 2, y: 2, rotation: 0, mirrored: false, layer: "furniture", state: "rest" },
    } as SceneEntity;
    scene.entities = { [source.id]: source };
    scene.rooms.home.entities = scene.entities;
    scene.rooms.home.hitProxies = scene.rooms.home.hitProxies.map((p) => ({ ...p, id: source.id }));
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe scene={scene} />);
    });
    touch("down", 120, 300);
    touch("move", 150, 320);
    flushJS();
    touch("up", 150, 320);
    harness.js = [];
    const moved = { ...source, id: "kitchen/item/cup", room: "kitchen" as const };
    const destination = fixture("transferred");
    destination.entities = { [moved.id]: moved };
    destination.rooms.home.entities = {};
    destination.rooms.home.hitProxies = [];
    destination.rooms.kitchen.entities = destination.entities;
    const proposal = { ...current.slots.get()[0].proposal!, room: "kitchen" as const, contact: moved.contact };
    const before = { ...current.slots.get()[0] };
    if (queued) {
      current.slots.get()[0].commitRequested = true;
      touch("down", before.x, before.y - 100, 7);
      touch("move", before.x + 20, before.y - 90, 7);
      touch("up", before.x + 20, before.y - 90, 7);
    }
    current.finish(0, true, proposal, "transferred", destination, undefined, moved.id);
    await act(async () => {
      renderer!.update(<Probe scene={destination} />);
    });
    vi.advanceTimersByTime(60);
    harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    const slot = { ...current.slots.get()[0] };
    if (!queued) {
      touch("down", slot.x, slot.y - 100, 7);
      touch("move", slot.x + 20, slot.y - 90, 7);
      touch("up", slot.x + 20, slot.y - 90, 7);
    } else {
      expect(slot.releaseX).toBeCloseTo(before.x + 20);
      expect(slot.releaseY).toBeCloseTo(before.y + 10);
    }
    vi.advanceTimersByTime(250);
    harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    flushJS();
    expect(committed).toBe(1);
    expect(committedId).toBe(moved.id);
    const returned = { ...source, contact: committedContact };
    const finalScene = fixture("committed");
    finalScene.entities = { [source.id]: returned };
    finalScene.rooms.home.entities = finalScene.entities;
    current.finish(0, true, current.slots.get()[0].proposal!, "committed", finalScene, undefined, source.id);
    await act(async () => {
      renderer!.update(<Probe scene={finalScene} />);
    });
    vi.advanceTimersByTime(260);
    harness.frames[0]({ timeSincePreviousFrame: 16.67 });
    expect(current.controller.get().settling).toEqual([]);
    expect(current.controller.get().phase).toBe("idle");
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
      renderer = TestRenderer.create(<Probe scene={scene} designing />);
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

describe('H2 capture handoff and synthetic moves', () => {
 it('starts lift at readiness and keeps the resting copy through one presented overlay frame', async () => {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<Probe scene={fixture()} />); });
  touch('down', 120, 300);
  touch('move', 150, 320);
  vi.advanceTimersByTime(180);
  flushJS();
  const slot = current.slots.get()[0];
  expect(slot.liftedAt).toBe(1180);
  expect(slot.painted).toBe(false);
  harness.frames[0]({ timeSincePreviousFrame: 16.67 });
  expect(current.slots.get()[0].painted).toBe(false);
  vi.advanceTimersByTime(17); harness.frames[0]({ timeSincePreviousFrame: 16.67 });
  expect(current.slots.get()[0].painted).toBe(true);
  await act(async () => renderer.unmount()); vi.useRealTimers();
 });
 it('tap travel captures once, travels through intermediate positions and commits only at arrival', async () => {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<Probe scene={fixture()} />); });
  const { resolve } = await import("../src/home/scene/resolve");
  const scene = fixture();
  const proposal = resolve(scene.rooms.home, scene.entities[entity.id], roomPoint(300, 486), { scale: 1, release: true });
  expect(current.animateProposal(proposal)).toBe(true);
  flushJS();
  const start = current.slots.get()[0];
  expect(start.synthetic).toBe(true); expect(committed).toBe(0);
  vi.advanceTimersByTime(100); harness.frames[0]({ timeSincePreviousFrame: 16.67 });
  expect(current.slots.get()[0].x).toBeGreaterThan(start.sourceX);
  expect(current.slots.get()[0].x).toBeLessThan(start.targetX); expect(committed).toBe(0);
  vi.advanceTimersByTime(400); harness.frames[0]({ timeSincePreviousFrame: 16.67 }); flushJS();
  expect(committed).toBe(1);
  await act(async () => renderer.unmount()); vi.useRealTimers();
 });
});

it('H2 reduced motion commits synthetic travel immediately, without a hop or delayed save', async () => {
 let renderer!: TestRenderer.ReactTestRenderer;
 const scene=fixture();
 await act(async()=>{renderer=TestRenderer.create(<Probe scene={scene} reduced/>);});
 const {resolve}=await import('../src/home/scene/resolve');
 const p=resolve(scene.rooms.home,scene.entities[entity.id],roomPoint(200,486),{scale:1,release:true});
 expect(current.animateProposal(p)).toBe(true);
 expect(committed).toBe(1);
 expect(current.slots.get()[0].x).toBe(current.slots.get()[0].targetX);
 expect(current.slots.get()[0].y).toBe(current.slots.get()[0].targetY);
 await act(async()=>renderer.unmount());vi.useRealTimers();
});
