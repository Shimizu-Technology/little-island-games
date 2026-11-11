/** F1 integrated: the real interaction runtime, the real carry overlay and its target poses.
 * Two friends in My room share drag slot 0 (every idle friend does). One is carried over the Kitchen
 * button, the view switches, the other friend's overlay unmounts, and the carry lands in the Kitchen.
 * Native layout is modelled as React Native documents it: onLayout fires on mount and when a view's
 * layout changes, never on an ordinary re-render. */
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, expect, it, vi } from "vitest";
import { layoutToken } from "../src/home/runtime/layout";
import { useInteraction, type Pickup, type Interaction } from "../src/home/runtime/useInteraction";
import { DragOverlay } from "../src/home/runtime/DragOverlay";
import { buildingLayout } from "../src/home/camera";
import { identityCamera } from "../src/home/scene/camera";
import { gridCell, roomPoint, type Scene, type SceneEntity } from "../src/home/scene/types";
import { roomIds, type RoomId } from "../src/home/catalogMore";
const harness = vi.hoisted(() => ({
  frames: [] as ((frame: { timeSincePreviousFrame: number }) => void)[],
  js: [] as (() => void)[],
  handlers: {} as Record<string, (...args: any[]) => void>,
  layouts: 0,
}));
vi.mock("react-native-gesture-handler", () => ({
  Gesture: {
    Manual: () => {
      const builder: any = {};
      for (const [name, key] of [["onTouchesDown", "down"], ["onTouchesMove", "move"], ["onTouchesUp", "up"], ["onTouchesCancelled", "cancel"]])
        builder[name] = (fn: (...args: any[]) => void) => { harness.handlers[key] = fn; return builder; };
      return builder;
    },
  },
}));
/** onLayout on mount and on a change of the view's own size; nothing else re-lays it out. */
function nativeView(type: string) {
  return function NativeView({ onLayout, children, style, ...rest }: any) {
    const flat = Array.isArray(style) ? style.filter((s: any) => s && !s.evaluate) : style;
    const size = JSON.stringify([flat?.width ?? (Array.isArray(flat) ? flat.map((s: any) => s.width) : undefined),
      flat?.height ?? (Array.isArray(flat) ? flat.map((s: any) => s.height) : undefined)]);
    const ref = React.useRef(onLayout);
    ref.current = onLayout;
    React.useEffect(() => { if (ref.current) { harness.layouts++; ref.current({ nativeEvent: { layout: {} } }); } }, [size]);
    return React.createElement(type, rest, children);
  };
}
vi.mock("react-native", () => ({ View: nativeView("View"), Platform: { OS: "ios" } }));
vi.mock("react-native-reanimated", async () => {
  const React = await import("react");
  return {
    default: { View: nativeView("AnimatedView") },
    useSharedValue: (initial: unknown) => {
      const ref = React.useRef<any>(undefined);
      if (!ref.current)
        ref.current = {
          value: initial,
          get() { return this.value; },
          modify(fn: (value: any) => any) { this.value = fn(this.value); },
          set(value: any) { this.value = typeof value === "function" ? value(this.value) : value; },
        };
      return ref.current;
    },
    useFrameCallback: (fn: (frame: { timeSincePreviousFrame: number }) => void) => {
      harness.frames[0] = fn;
      return { callbackId: 7, isActive: true, setActive: () => {} };
    },
    useAnimatedStyle: () => ({}),
    useDerivedValue: (fn: () => unknown) => ({ get value() { return fn(); } }),
    useAnimatedReaction: () => {},
    withTiming: (v: unknown) => v,
    runOnUI: (fn: (...args: any[]) => void) => (...args: any[]) => fn(...args),
    runOnJS: (fn: (...args: any[]) => void) => (...args: any[]) => harness.js.push(() => fn(...args)),
  };
});
vi.mock("../src/home/runtime/EntityArt", () => ({ EntityArt: "EntityArt", artFrame: (e: SceneEntity) => e.bounds }));
vi.mock("../src/home/runtime/CarriedCharacter", () => ({ CarriedCharacter: "CarriedCharacter" }));
vi.mock("../src/home/runtime/LandingPreview", () => ({ LandingPreview: () => null }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const registry = { calls: [] as [number, boolean][], manageStateFrameCallback(id: number, on: boolean) { registry.calls.push([id, on]); } };
(globalThis as any)._frameCallbackRegistry = registry;

const manager = { activate: vi.fn(), end: vi.fn() };
function friend(slot: 0 | 1, x: number): SceneEntity {
  return {
    id: `character/${slot}`, room: "home", contact: roomPoint(x, 300), attachment: { kind: "floor", room: "home", at: roomPoint(x, 300) },
    base: "stand", facing: "front", action: null, children: [], depth: 300, band: "occupant",
    bounds: { left: -30, top: -220, width: 60, height: 220 }, hitProxies: [{ left: x - 30, top: 80, width: 60, height: 220 }],
    character: { slot, anchor: "floor", pose: "stand", x: 2, y: 2 },
  };
}
function sceneOf(revision: string, entities: SceneEntity[]): Scene {
  const all = Object.fromEntries(entities.map((e) => [e.id, e]));
  const rooms = Object.fromEntries(roomIds.map((room) => {
    const own = entities.filter((e) => e.room === room);
    return [room, {
      room, revision, entities: all,
      floor: [{ cell: gridCell(4, 7), contact: roomPoint(200, 486), blockers: [], occlusion: [0, 0, 0] }],
      surfaces: [], sockets: [], targets: [], buckets: {}, occupancy: {}, occlusionBands: [],
      hitProxies: own.map((e) => ({ id: e.id, bounds: { ...e.bounds, left: e.contact.x + e.bounds.left, top: e.contact.y + e.bounds.top }, depth: e.depth, band: e.band })),
    }];
  })) as unknown as Scene["rooms"];
  return { revision, entities: all, rooms };
}
const building = buildingLayout(4, true), viewport = { width: 1000, height: 600 };
let current: Interaction;
let commits = 0;
/** The Home screen's part: pickups, the active room, commit and clear. */
function Home({ initial }: { initial: Scene }) {
  const [scene, setScene] = React.useState(initial);
  const [room, setRoom] = React.useState<RoomId>("home");
  const [pickups, setPickups] = React.useState<(Pickup | undefined)[]>([undefined, undefined]);
  const interaction = useInteraction({
    scene, building, viewport, initialCamera: identityCamera, reduced: false, designing: false, onCameraChange: () => {},
    onPickup: (pickup) => setPickups((all) => all.map((p, i) => (i === pickup.slot ? pickup : p))),
    onTap: () => {},
    onClear: (index) => { if (!current.slots.get()[index].id) setPickups((all) => all.map((p, i) => (i === index ? undefined : p))); },
    onCommit: (index, proposal, _at, token) => {
      if (!current.isCurrent(index, token)) return;
      commits++;
      const moved = scene.entities[proposal.id];
      const contact = proposal.contact;
      const final = sceneOf(`committed-${commits}`, Object.values(scene.entities).map((e) => e.id !== moved.id ? e : {
        ...e, room: proposal.room, contact, attachment: { kind: "floor", room: proposal.room, at: contact } as SceneEntity["attachment"],
        base: proposal.base ?? e.base, facing: proposal.facing ?? e.facing }));
      setPickups((all) => all.map((p, i) => (i === index && p ? { ...p, destination: final } : p)));
      current.finish(index, true, proposal, final.revision, final, token);
      setScene(final);
      setRoom(proposal.room);
    },
    currentRoom: room,
    onRoomHover: (next) => setRoom(next),
  });
  React.useLayoutEffect(() => {
    current = interaction;
    // The resting room art's own layout (SceneView); pose acknowledgements come only from the overlay.
    for (const entity of Object.values(scene.entities)) interaction.acknowledgeLayout(entity.id, layoutToken(entity));
  });
  return <DragOverlay scene={scene} activeRoom={room} pickups={pickups} interaction={interaction} building={building} reduced={false} />;
}
function touch(type: string, x: number, y: number) {
  harness.handlers[type]({ changedTouches: [{ x, y, id: 1 }], numberOfTouches: type === "up" || type === "cancel" ? 0 : 1 }, manager);
}
async function flushJS() {
  await act(async () => { while (harness.js.length) harness.js.shift()!(); });
}
async function frames(n: number) {
  for (let i = 0; i < n; i++) { vi.advanceTimersByTime(16); harness.frames[0]({ timeSincePreviousFrame: 16.67 }); await flushJS(); }
}
beforeEach(() => {
  harness.frames = []; harness.js = []; harness.handlers = {}; harness.layouts = 0; registry.calls = []; commits = 0;
  vi.useFakeTimers();
  vi.setSystemTime(1000);
});

it("F1: a friend carried over the Kitchen button into the empty Kitchen retires, and frame work stops", async () => {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<Home initial={sceneOf("initial", [friend(0, 100), friend(1, 300)])} />); });
  const overlays = () => tree.root.findAll((n) => (n.type as unknown) === "AnimatedView" && typeof n.props.nativeID === "string" && n.props.nativeID.startsWith("drag-overlay-")).map((n) => n.props.nativeID);
  expect(overlays()).toEqual(["drag-overlay-character/0", "drag-overlay-character/1"]);
  await frames(5);
  expect(registry.calls.at(-1)).toEqual([7, false]);
  current.dropZones.set([{ kind: "room", room: "kitchen", x: 400, y: 560, width: 48, height: 48 }]);
  touch("down", 100, 200); await flushJS();
  touch("move", 160, 260); await frames(2);
  expect(current.slots.get()[0]).toMatchObject({ id: "character/0", phase: "dragging", ready: true });
  // Hold on the Kitchen button: the view goes to the Kitchen. The other friend's overlay leaves.
  touch("move", 420, 580); await frames(25);
  expect(overlays()).toEqual(["drag-overlay-character/0"]);
  // Let go on the Kitchen floor.
  touch("move", 500, 300); await frames(2);
  touch("up", 500, 300); await flushJS();
  await frames(60);
  expect(commits).toBe(1);
  expect(current.slots.get()[0].proposal).toMatchObject({ room: "kitchen", base: "stand" });
  expect(current.slots.get()[0].id).toBe("");
  expect(current.slots.get().every((s) => !s.id)).toBe(true);
  // Frame work stops once the slot has retired.
  expect(registry.calls.at(-1)).toEqual([7, false]);
  const after = registry.calls.length;
  await frames(5);
  expect(registry.calls.length).toBe(after);
  await act(async () => tree.unmount());
});
