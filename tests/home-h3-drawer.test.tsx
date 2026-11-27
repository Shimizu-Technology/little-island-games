import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { FriendDrawer, friendLabel, DRAWER_MS } from "../src/home/runtime/FriendDrawer";
import { GrownUpAccess } from "../src/home/runtime/HomePanels";
import { labHome } from "../src/home/runtime/lab";
import { buildScene } from "../src/home/scene/graph";
import { apply, resolve } from "../src/home/scene/proposal";
import { roomPoint } from "../src/home/scene/types";
import { starterHome, validHome, migrateHome } from "../src/home/model";
import { useHomeStore } from "../src/home/useHomeStore";
const timing = vi.hoisted(() => ({ durations: [] as number[] }));
vi.mock("react-native", () => ({ View: "View", Pressable: "Pressable", Text: "Text", TextInput: "TextInput" }));
vi.mock("react-native-svg", () => ({ default: "Svg", Path: "Path", Circle: "Circle", Rect: "Rect" }));
vi.mock("react-native-gesture-handler", () => {
  const pan = () => { const b: any = new Proxy({}, { get: () => () => b }); return b; };
  return { Gesture: { Pan: pan }, GestureDetector: ({ children }: { children: React.ReactNode }) => children };
});
vi.mock("react-native-reanimated", () => ({
  default: { View: "AnimatedView" },
  useSharedValue: (v: unknown) => ({ value: v, set(n: unknown) { this.value = n; }, get() { return this.value; } }),
  useAnimatedStyle: (fn: () => unknown) => fn(),
  withTiming: (v: number, o: { duration: number }) => { timing.durations.push(o.duration); return v; },
  runOnJS: (fn: (...a: unknown[]) => unknown) => fn,
}));
vi.mock("../src/home/runtime/EntityArt", () => ({ EntityArt: "EntityArt", artFrame: () => ({ left: -30, top: -200, width: 60, height: 200 }) }));
vi.mock("../src/home/art/More", () => ({ MoreItemArt: "MoreItemArt" }));
vi.mock("../src/home/art/Items", () => ({ ItemArt: "ItemArt" }));
vi.mock("../src/home/runtime/HomeChrome", () => ({ Tool: "Tool", FriendsIcon: "FriendsIcon" }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const interaction = { externalDown: vi.fn(), externalMove: vi.fn(), externalUp: vi.fn(), slots: { value: [{}, {}] } } as any;
const offset = { value: { x: 0, y: 100 } } as any;
const flat = (style: any): any => Array.isArray(style) ? Object.assign({}, ...style.map(flat)) : style ?? {};
describe("Guam friend locations", () => {
  it.each(['tumon-beach', 'chamorro-village'] as const)('names %s naturally and paints the actual Village badge', async room => {
    const state = starterHome();
    state.rooms[room].characters.push(state.rooms.home.characters.shift()!);
    const scene = buildScene(state);
    expect(friendLabel(scene.entities['character/0'], 'home')).toContain(`at ${room === 'tumon-beach' ? 'Tumon Beach' : 'Chamorro Village'}`);
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => { tree = TestRenderer.create(<FriendDrawer open scene={scene} here="home" bottom={70} interaction={interaction} offset={offset} reduced onBring={() => {}} onClose={() => {}} onCarry={() => {}} />); });
    const cell = tree.root.findByProps({ testID: 'friend-cell-0' });
    if (room === 'chamorro-village') {
      expect(cell.findAll(n => String(n.type) === 'MoreItemArt').map(n => n.props.id)).toEqual(['bbq-grill']);
      expect(cell.findAll(n => String(n.type) === 'ItemArt')).toHaveLength(0);
    }
    await act(async () => tree.unmount());
  });
});
describe("HR-01 the friends drawer (rules 4, 47)", () => {
  it("has a cell of at least 56 pt per friend, named by where they are, and a tap brings them", async () => {
    const state = labHome();
    const islander = state.rooms.home.characters.find((c) => c.slot === 0)!;
    state.rooms.home.characters = state.rooms.home.characters.filter((c) => c.slot !== 0);
    state.rooms.kitchen.characters.push(islander);
    const scene = buildScene(state), onBring = vi.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => { tree = TestRenderer.create(<FriendDrawer open scene={scene} here="home" bottom={70} interaction={interaction}
      offset={offset} reduced={false} onBring={onBring} onClose={() => {}} onCarry={() => {}} />); });
    const cells = tree.root.findAll((n) => typeof n.props.testID === "string" && n.props.testID.startsWith("friend-cell-") && (n.type as unknown) === "Pressable");
    expect(cells).toHaveLength(3);
    for (const cell of cells) {
      const style = flat(cell.props.style);
      expect(style.width).toBeGreaterThanOrEqual(56);
      expect(style.height).toBeGreaterThanOrEqual(56);
    }
    expect(cells[0].props.accessibilityLabel).toBe("Islander, in the Kitchen. Drag into the room, or tap to bring here.");
    expect(cells[1].props.accessibilityLabel).toBe("Pip, in this room. Drag into the room, or tap to bring here.");
    const { friendLabel } = await import("../src/home/runtime/FriendDrawer");
    expect(friendLabel(scene.entities["character/1"], "kitchen")).toBe("Pip, in My room. Drag into the room, or tap to bring here.");
    // A friend elsewhere shows where they are, as a picture.
    expect(cells[0].findAll((n) => (n.type as unknown) === "MoreItemArt").map(n => n.props.id)).toEqual(["fridge"]);
    expect(cells[1].findAll((n) => (n.type as unknown) === "ItemArt")).toHaveLength(0);
    await act(async () => tree.unmount());
  });
  it("a waiting friend shows the basket picture, and on a phone in large mode the drawer opens at the top", async () => {
    let state = labHome();
    const scene0 = buildScene(state), pip = scene0.entities["character/1"];
    state = (apply(state, resolve({ ...scene0.rooms.home, entities: scene0.entities }, pip, pip.contact, { scale: 1, intent: "staging", release: true })) as any).state;
    const scene = buildScene(state);
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => { tree = TestRenderer.create(<FriendDrawer open scene={scene} here="home" bottom={70} top={120} large interaction={interaction}
      offset={offset} reduced={false} onBring={() => {}} onClose={() => {}} onCarry={() => {}} />); });
    expect(tree.root.findAllByProps({ testID: "friend-waiting-1" }).length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ testID: "friend-waiting-0" })).toHaveLength(0);
    const style = flat(tree.root.findByProps({ testID: "friend-drawer" }).props.style);
    expect(style.top).toBe(120);
    expect(style.bottom).toBeUndefined();
    await act(async () => tree.unmount());
  });
  it("opens and closes within 180 ms, and when closed cannot be touched or read", async () => {
    timing.durations = [];
    const scene = buildScene(labHome());
    let tree!: TestRenderer.ReactTestRenderer;
    const props = { scene, here: "home" as const, bottom: 70, interaction, offset, reduced: false, onBring: () => {}, onClose: () => {}, onCarry: () => {} };
    await act(async () => { tree = TestRenderer.create(<FriendDrawer open={false} {...props} />); });
    const drawer = () => tree.root.findByProps({ testID: "friend-drawer" });
    expect(drawer().props.pointerEvents).toBe("none");
    expect(drawer().props.accessibilityElementsHidden).toBe(true);
    await act(async () => tree.update(<FriendDrawer open {...props} />));
    expect(drawer().props.pointerEvents).toBe("box-none");
    expect(Math.max(...timing.durations)).toBe(DRAWER_MS);
    expect(DRAWER_MS).toBeLessThanOrEqual(180);
    await act(async () => tree.unmount());
  });
  it("a friend who waits in the drawer keeps what they hold, and comes back out the same friend", () => {
    let state = labHome();
    let scene = buildScene(state);
    const friend = scene.entities["character/0"];
    const prop = Object.values(scene.entities).find((e) => e.item && e.room === "home" && e.body?.holdable && e.attachment.kind !== "hand")!;
    const hand = scene.rooms.home.targets.find((t) => t.kind === "hand" && t.owner === friend.id)!;
    state = (apply(state, resolve({ ...scene.rooms.home, entities: scene.entities }, prop, hand.contact, { scale: 1, release: true, target: hand.id })) as any).state;
    scene = buildScene(state);
    const before = state.rooms.home.characters.find((c) => c.slot === 0)!;
    expect(before.holding).toBeDefined();
    const wait = resolve({ ...scene.rooms.home, entities: scene.entities }, scene.entities[friend.id], scene.entities[friend.id].contact, { scale: 1, intent: "staging", release: true });
    expect(wait.kind).toBe("staging");
    state = (apply(state, wait) as any).state;
    scene = buildScene(state);
    expect(scene.entities[friend.id].attachment.kind).toBe("staging");
    const out = resolve({ ...scene.rooms.kitchen, entities: scene.entities }, scene.entities[friend.id], roomPoint(400, 480), { scale: 1, release: true });
    expect(out).toMatchObject({ kind: "floor", room: "kitchen" });
    state = (apply(state, out) as any).state;
    const after = state.rooms.kitchen.characters.find((c) => c.slot === 0)!;
    expect(after.holding).toBe(before.holding);
    expect(state.rooms.kitchen.instances.some((i) => i.id === before.holding)).toBe(true);
    expect(validHome(state)).toBe(true);
  });
});
describe("HR-03 larger targets behind the grown-up gate (rule 62)", () => {
  it("only a typed grown-up answer opens the switch, and the switch saves", async () => {
    const onLarge = vi.fn(() => true);
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => { tree = TestRenderer.create(<GrownUpAccess large={false} onLarge={onLarge} />); });
    expect(tree.root.findAllByProps({ testID: "home-large-targets" })).toHaveLength(0);
    await act(async () => tree.root.findByProps({ accessibilityLabel: "For grown-ups" }).props.onPress());
    const input = () => tree.root.findByType("TextInput" as never);
    const question = () => input().props.accessibilityLabel.match(/(\d) times (\d)/)!.slice(1).map(Number);
    const [a, b] = question();
    await act(async () => input().props.onChangeText(String(a * b + 1)));
    await act(async () => tree.root.findByProps({ accessibilityLabel: "Unlock grown-up choices" }).props.onPress());
    expect(tree.root.findAllByProps({ testID: "home-large-targets" })).toHaveLength(0);
    const [c, d] = question();
    await act(async () => input().props.onChangeText(String(c * d)));
    await act(async () => tree.root.findByProps({ accessibilityLabel: "Unlock grown-up choices" }).props.onPress());
    const toggle = tree.root.findByProps({ testID: "home-large-targets" });
    expect(toggle.props.accessibilityState).toEqual({ checked: false });
    await act(async () => toggle.props.onPress());
    expect(onLarge).toHaveBeenCalledWith(true);
    await act(async () => tree.unmount());
  });
  it("the choice is saved with the home, survives relaunch, and is never an undo step", async () => {
    const saved: any[] = [];
    let store!: ReturnType<typeof useHomeStore>;
    function Host({ initial }: { initial?: unknown }) { store = useHomeStore({}, initial, (s) => { saved.push(JSON.parse(JSON.stringify(s))); return true; }); return null; }
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => { tree = TestRenderer.create(<Host initial={starterHome()} />); });
    await act(async () => { expect(store.setAccess({ largeTargets: true })).toBe(true); });
    expect(saved.at(-1).access).toEqual({ largeTargets: true });
    expect(store.canUndo).toBe(false);
    const relaunch = saved.at(-1);
    expect(migrateHome(relaunch)).toBe(relaunch);
    await act(async () => tree.unmount());
    await act(async () => { tree = TestRenderer.create(<Host initial={relaunch} />); });
    expect(store.access).toEqual({ largeTargets: true });
    await act(async () => { store.setAccess(undefined); });
    expect(saved.at(-1).access).toBeUndefined();
    expect(validHome({ ...relaunch, access: { largeTargets: false } })).toBe(false);
    expect(validHome({ ...relaunch, access: { largeTargets: true, extra: 1 } })).toBe(false);
    expect(validHome({ ...relaunch, version: 3, access: { largeTargets: true } })).toBe(false);
    await act(async () => tree.unmount());
  });
});
describe("HM-18 lab fixture", () => {
  it("'full' is a valid home at exactly the room limit", async () => {
    const { placedInstances, MAX_INSTANCES } = await import("../src/home/model");
    const state = labHome("full");
    expect(validHome(state)).toBe(true);
    expect(placedInstances(state.rooms.home)).toHaveLength(MAX_INSTANCES);
  });
});


it('offers six named family actors with separate accessible cells in a bounded drawer', async () => {
  const scene = buildScene(starterHome()); let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<FriendDrawer open scene={scene} here="home" bottom={70} interaction={interaction}
    offset={offset} reduced onBring={() => {}} onClose={() => {}} onCarry={() => {}}/>); });
  const cells = tree.root.findAll(n => (n.type as unknown) === 'Pressable' && n.props.testID?.startsWith('friend-cell-'));
  expect(cells).toHaveLength(6);
  for (const [index, name] of ['Islander', 'Pip', 'Crab', 'Mom', 'Dad', 'Little Sibling'].entries()) expect(cells[index].props.accessibilityLabel).toContain(name);
  expect(flat(tree.root.findByProps({ testID: 'friend-drawer' }).props.style).width).toBeLessThan(390);
  await act(async () => tree.unmount());
});


it('uses one family row in short landscape windows', async () => {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<FriendDrawer open compact scene={buildScene(starterHome())} here="home" bottom={70} interaction={interaction}
    offset={offset} reduced onBring={() => {}} onClose={() => {}} onCarry={() => {}}/>); });
  expect(flat(tree.root.findByProps({ testID: 'friend-drawer' }).props.style).width).toBe(520);
  await act(async () => tree.unmount());
});

it('reserves identical avatar and centered label slots with waiting and away badges above names', async () => {
  const state = starterHome();
  const hero = state.rooms.home.characters.shift()!; state.rooms.kitchen.characters.push(hero);
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<FriendDrawer open scene={buildScene(state)} here="home" bottom={70} interaction={interaction}
    offset={offset} reduced onBring={() => {}} onClose={() => {}} onCarry={() => {}}/>); });
  const cells = tree.root.findAll(n => String(n.type) === 'Pressable' && n.props.testID?.startsWith('friend-cell-'));
  const avatarHeights: number[] = [];
  for (const cell of cells) {
    const label = cell.findByType('Text' as any);
    expect(label.props.style.textAlign).toBe('center'); expect(label.props.style.height).toBe(28);
    avatarHeights.push((cell.children[0] as TestRenderer.ReactTestInstance).props.style.height);
    for (const badge of cell.findAll(n => String(n.type) === 'View' && n.props.style?.width === 28)) {
      expect(badge.props.style.top).toBe(3); expect(badge.props.style.bottom).toBeUndefined();
      expect(badge.props.style.top + badge.props.style.height).toBeLessThan(cell.props.style.height - 32);
    }
  }
  expect(new Set(avatarHeights).size).toBe(1);
  expect(tree.root.findAllByProps({ testID: 'friend-waiting-5' }).length).toBeGreaterThan(0);
  await act(async () => tree.unmount());
});
