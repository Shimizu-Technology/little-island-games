import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeScreen } from '../src/home/HomeScreen';
import { instance, type HomeStateV2 } from '../src/home/model';
import { buildScene } from '../src/home/scene/graph';
import { roomPoint } from '../src/home/scene/types';
import { apply, resolve } from '../src/home/scene/proposal';
import { buildingLayout, roomOrigin } from '../src/home/camera';
import { roomIds } from '../src/home/catalogMore';
import { labFixtures } from '../src/home/runtime/lab';
import { COOK_MS } from '../src/home/runtime/delight';
import { stagePieces } from '../src/home/art/Stage';
import { panFloorPoint } from '../src/home/scene/pan';
import { floorPoint } from '../src/home/geometry';
const harness = vi.hoisted(() => ({ options: {} as any, chrome: {} as any, scene: {} as any, cues: [] as any[], active: {} as Record<string, string>, played: [] as string[], haptics: [] as string[],
  handoffs: [] as any[], live: undefined as boolean | undefined, settings: { sound: true } as any, reduced: false, sleeping: {} as Record<string, boolean>, slots: [{}, {}] as any[] }));
vi.mock('react-native-svg', () => Object.fromEntries(['G', 'Circle', 'Ellipse', 'Rect', 'Path', 'Defs', 'Pattern', 'LinearGradient', 'Stop'].map((k) => [k, k]).concat([['default', 'Svg']])));
vi.mock('../src/badges/BadgeArt', () => ({ BadgeGlyph: () => null }));
vi.mock('../src/home/runtime/homeSound', () => ({
  useHomeFeedback: (live: boolean) => {
    harness.live = live;
    return { play: (s: string) => { if (live) harness.played.push(s); return live; }, haptic: (k: string) => { if (live) harness.haptics.push(k); return live; },
      stop: () => {}, setLive: () => {}, silence: () => {}, dispose: () => {} };
  },
}));
vi.mock('expo-router', () => ({ router: { push: vi.fn() }, useFocusEffect: () => {} }));
vi.mock('react-native', () => ({ View: 'View', Text: 'Text', Pressable: 'Pressable', Platform: { OS: 'web' }, AppState: { addEventListener: () => ({ remove() {} }) }, useWindowDimensions: () => ({ width: 390, height: 844 }), AccessibilityInfo: { sendAccessibilityEvent: () => {} } }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock('react-native-reanimated', () => ({ default: { View: 'AnimatedView' }, useSharedValue: (v: any) => { const ref = React.useRef(v); return { get: () => ref.current, set: (n: any) => { ref.current = n; } }; }, useAnimatedStyle: () => ({}) }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => harness.reduced }));
vi.mock('../src/state/Store', () => ({ useStore: () => ({ save: { settings: harness.settings } }) }));
vi.mock('../src/home/runtime/useIdleCharacters', () => ({ useIdleCharacters: () => ({ sleeping: harness.sleeping, wake: () => {} }) }));
vi.mock('../src/home/runtime/useInteraction', () => ({ useInteraction: (options: any) => { harness.options = options; return { isCurrent: () => true, finish: () => {}, completeMealHandoff:(...args:any[])=>harness.handoffs.push(args),
  camera: { get: () => ({ a: .5, b: 0, c: 0, d: .5, tx: 0, ty: 0 }), set: () => {} }, slots: { get: () => harness.slots }, cancelAll: () => {}, animateCamera: () => {},
  showHint: () => {}, showCue: (...args: any[]) => { harness.active[args[0]] = args[1]; return harness.cues.push(args); }, clearCue: (id: string) => { delete harness.active[id]; }, dropZones: { set: () => {} } }; } }));
vi.mock('../src/home/runtime/SceneView', () => ({ SceneView: (props: any) => { harness.scene = props; return null; } }));
vi.mock('../src/home/runtime/HomeChrome', () => ({ HomeChrome: (props: any) => { harness.chrome = props; return null; }, Tool: () => null, navigationHeight: 60, navigationHeightFor: () => 60 }));
vi.mock('../src/home/runtime/HomePanels', () => ({ HomePanels: () => null }));
vi.mock('../src/home/HomeClosetSheet', () => ({ HomeClosetSheet: () => null }));
vi.mock('../src/home/HomeBadgesSheet', () => ({ HomeBadgesSheet: () => null }));
vi.mock('../src/home/runtime/DesignTools', () => ({ DesignTools: () => null, portraitDrawerHeight: 200, portraitDrawerHeightFor: () => 200 }));
vi.mock('../src/home/runtime/StagingTray', () => ({ StagingTray: () => null }));
vi.mock('../src/home/runtime/Destinations', () => ({ Destinations: () => null }));
vi.mock('../src/home/runtime/DebugOverlay', () => ({ DebugOverlay: () => null }));
vi.mock('../src/home/runtime/FriendDrawer', () => ({ FriendDrawer: () => null }));
vi.mock('../src/home/runtime/CapacityCue', () => ({ CapacityCue: 'CapacityCue', CAPACITY_CUE_MS: 3200, CAPACITY_MESSAGE: 'Put something away to make room.' }));
vi.mock('../src/home/art/Items', () => ({ ItemArt: () => null }));
vi.mock('../src/home/art/More', () => ({ MoreItemArt: () => null }));
vi.mock('../src/home/runtime/UndoNote', () => ({ UndoNote: () => null, UndoGonePicture: () => null }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
vi.stubGlobal('requestAnimationFrame', () => 1);
vi.stubGlobal('cancelAnimationFrame', () => {});
let root: ReturnType<typeof create>;
beforeEach(() => { vi.useFakeTimers(); harness.reduced = false; harness.handoffs=[]; harness.slots = [{}, {}]; harness.cues = []; harness.active = {}; harness.played = []; harness.haptics = []; harness.settings = { sound: true }; harness.sleeping = {}; });
afterEach(async () => { if (root) await act(async () => root.unmount()); vi.useRealTimers(); });
const building = buildingLayout(roomIds.length, false);
async function open(state: HomeStateV2, persist = vi.fn((_s: HomeStateV2) => true)) {
  await act(async () => { root = create(<HomeScreen initialState={state} persist={persist} />); });
  return persist;
}
/** Commit a resolved drop the way the runtime does after the settle. */
async function drop(state: HomeStateV2, id: string, room: keyof HomeStateV2['rooms'], at: { x: number; y: number }, options: Record<string, unknown> = {}) {
  const scene = harness.scene.scene ?? buildScene(state);
  const proposal = resolve({ ...scene.rooms[room], entities: scene.entities }, scene.entities[id], roomPoint(at.x, at.y), { scale: .5, release: true, ...options });
  const origin = roomOrigin(roomIds.indexOf(room), building);
  await act(async () => harness.options.onCommit(0, proposal, { x: proposal.contact.x + origin.x, y: proposal.contact.y + origin.y }, {}));
  return proposal;
}
const tap = async (id: string | undefined, point = { x: 0, y: 0 }) => act(async () => harness.options.onTap(id, point, Date.now()));

describe('H4 on the Island Home screen', () => {
  it('HD-04: sound and haptics follow the sound switch and the effects switch together', async () => {
    harness.settings = { sound: false };
    await open(labFixtures.delight());
    expect(harness.live).toBe(false);
    await act(async () => root.unmount());
    harness.settings = { sound: true, effects: false };
    await open(labFixtures.delight());
    expect(harness.live).toBe(false);
    await act(async () => root.unmount());
    harness.settings = { sound: true };
    await open(labFixtures.delight());
    expect(harness.live).toBe(true);
  });
  it('HD-01 / HD-04: a pickup ticks and taps lightly; a friend gets a softer lift sound', async () => {
    const state = labFixtures.delight();
    await open(state);
    const scene = buildScene(state);
    const friend = Object.values(scene.entities).find((e) => e.character)!;
    const mango = Object.values(scene.entities).find((e) => e.item?.item === 'mango')!;
    const pickup = (id: string) => { harness.slots = [{ id, generation: 0, epoch: 0 }, {}]; return act(async () => harness.options.onPickup({ id, slot: 0, scene, generation: 0, epoch: 0 })); };
    await pickup(friend.id); await pickup(mango.id);
    expect(harness.played).toEqual(['lift', 'pick']);
    expect(harness.haptics).toEqual(['pickup', 'pickup']);
  });
  it('HD-03: a landing sounds like what landed; a seat gives a light attach tap, the floor does not', async () => {
    const state = labFixtures.delight();
    await open(state);
    const scene = buildScene(state);
    const rice = Object.values(scene.entities).find((e) => e.item?.item === 'rice-ball')!;
    await drop(state, rice.id, 'kitchen', { x: rice.contact.x + 90, y: rice.contact.y });
    expect(harness.played).toEqual(['cloth']);
    expect(harness.haptics).toEqual([]);
  });
  it('HD-06: friends near a friend set down turn to greet and both smile', async () => {
    const state = labFixtures.delight();
    await open(state);
    const scene = buildScene(state);
    const islander = Object.values(scene.entities).find((e) => e.character?.slot === 0)!;
    const pip = Object.values(scene.entities).find((e) => e.character?.slot === 1)!;
    await drop(state, islander.id, 'kitchen', { x: pip.contact.x - 110, y: pip.contact.y });
    expect(harness.cues.some(([id, kind]) => id === pip.id && kind === 'greet')).toBe(true);
    expect(harness.scene.moods[pip.id]).toBe('happy');
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(harness.scene.moods[pip.id]).toBeUndefined();
  });
  it('HD-05: eating crunches, drops crumbs, then a happy wiggle; the fifth meal ends in a small burp', async () => {
    const state = labFixtures.delight();
    state.rooms.kitchen.instances.push(...Array.from({ length: 5 }, (_, n) => ({ ...instance(`snack-${n}`, 'banana', 0, 0), at: { x: 120 + n * 60, y: 470 } })));
    await open(state);
    const eaterId = Object.values(buildScene(state).entities).find((e) => e.character?.slot === 0)!.id;
    for (let n = 0; n < 5; n++) {
      const scene = harness.scene.scene;
      const food = scene.entities[`kitchen/item/snack-${n}`];
      const index = scene.rooms.kitchen, mouth = index.targets.find((t: any) => t.id === `${eaterId}/mouth`)!;
      const proposal = resolve({ ...index, entities: scene.entities }, food, mouth.contact, { scale: .5, aim: roomPoint(mouth.face!.x, mouth.face!.y), release: true });
      expect(proposal.kind).toBe('mouth');
      const origin = roomOrigin(roomIds.indexOf('kitchen'), building);
      await act(async () => harness.options.onCommit(0, proposal, { x: proposal.contact.x + origin.x, y: proposal.contact.y + origin.y }, {}));
      expect(harness.played.at(-1)).toBe('munch');
      await act(async () => { vi.advanceTimersByTime(200); });
      expect(harness.scene.effects.some((e: any) => e.kind === 'crumbs')).toBe(true);
      await act(async () => { vi.advanceTimersByTime(600); });
      if (n < 4) {
        expect(harness.scene.moods[eaterId]).toBe('happy');
        expect(harness.cues.at(-1)).toEqual([eaterId, 'happy', undefined]);
      }
      await act(async () => { vi.advanceTimersByTime(400); });
    }
    expect(harness.cues.some(([id, kind]) => id === eaterId && kind === 'burp')).toBe(true);
    expect(harness.played).toContain('burp');
    expect(harness.played.filter((s) => s === 'burp')).toHaveLength(1);
  });
  it('fix round 1 (P2): the latest meal wins; an earlier meal\'s smile never lands on the next one', async () => {
    const state = labFixtures.delight();
    state.rooms.kitchen.instances.push(...Array.from({ length: 2 }, (_, n) => ({ ...instance(`snack-${n}`, 'banana', 0, 0), at: { x: 120 + n * 60, y: 470 } })));
    await open(state);
    const eaterId = Object.values(buildScene(state).entities).find((e) => e.character?.slot === 0)!.id;
    const feed = async (n: number) => {
      const scene = harness.scene.scene, index = scene.rooms.kitchen, mouth = index.targets.find((t: any) => t.id === `${eaterId}/mouth`)!;
      const proposal = resolve({ ...index, entities: scene.entities }, scene.entities[`kitchen/item/snack-${n}`], mouth.contact, { scale: .5, aim: roomPoint(mouth.face!.x, mouth.face!.y), release: true });
      expect(proposal.kind).toBe('mouth');
      const origin = roomOrigin(roomIds.indexOf('kitchen'), building);
      await act(async () => harness.options.onCommit(0, proposal, { x: proposal.contact.x + origin.x, y: proposal.contact.y + origin.y }, {}));
    };
    await feed(0);
    await act(async () => { vi.advanceTimersByTime(400); });
    await feed(1);
    await act(async () => { vi.advanceTimersByTime(400); }); // the first meal's moment has passed
    expect(harness.scene.moods[eaterId]).toBeUndefined();
    expect(harness.cues.some(([id, kind]) => id === eaterId && kind === 'happy')).toBe(false);
    await act(async () => { vi.advanceTimersByTime(400); }); // the second meal's moment
    expect(harness.scene.moods[eaterId]).toBe('happy');
    expect(harness.cues.filter(([id, kind]) => id === eaterId && kind === 'happy')).toHaveLength(1);
  });
  // Fix round 2 (codex round 2, P2): a newer action ends the mood and reaction already showing.
  const feeder = async (count: number) => {
    const state = labFixtures.delight();
    state.rooms.kitchen.instances.push(...Array.from({ length: count }, (_, n) => ({ ...instance(`snack-${n}`, 'banana', 0, 0), at: { x: 120 + (n % 6) * 60, y: 470 } })));
    await open(state);
    const eaterId = Object.values(buildScene(state).entities).find((e) => e.character?.slot === 0)!.id;
    const feed = async (n: number) => {
      const scene = harness.scene.scene, index = scene.rooms.kitchen, mouth = index.targets.find((t: any) => t.id === `${eaterId}/mouth`)!;
      const proposal = resolve({ ...index, entities: scene.entities }, scene.entities[`kitchen/item/snack-${n}`], mouth.contact, { scale: .5, aim: roomPoint(mouth.face!.x, mouth.face!.y), release: true });
      expect(proposal.kind).toBe('mouth');
      const origin = roomOrigin(roomIds.indexOf('kitchen'), building);
      await act(async () => harness.options.onCommit(0, proposal, { x: proposal.contact.x + origin.x, y: proposal.contact.y + origin.y }, {}));
    };
    return { eaterId, feed };
  };
  it('fix round 2 (P2): a second meal during the first meal\'s happy afterglow ends that smile and wiggle at once', async () => {
    const { eaterId, feed } = await feeder(2);
    await feed(0);
    await act(async () => { vi.advanceTimersByTime(1000); }); // afterglow started at 760 ms
    expect(harness.scene.moods[eaterId]).toBe('happy');
    expect(harness.active[eaterId]).toBe('happy');
    await feed(1);
    expect(harness.scene.moods[eaterId]).toBeUndefined();
    expect(harness.active[eaterId]).toBeUndefined();
    await act(async () => { vi.advanceTimersByTime(400); }); // the first meal's smile would still be showing
    expect(harness.scene.moods[eaterId]).toBeUndefined();
    expect(harness.active[eaterId]).toBeUndefined();
    await act(async () => { vi.advanceTimersByTime(400); }); // the second meal's own moment
    expect(harness.scene.moods[eaterId]).toBe('happy');
    expect(harness.active[eaterId]).toBe('happy');
    expect(harness.cues.filter(([id, kind]) => id === eaterId && kind === 'happy')).toHaveLength(2);
    await act(async () => { vi.advanceTimersByTime(800); });
    expect(harness.scene.moods[eaterId]).toBeUndefined();
  });
  it('fix round 2 (P2): a meal during a burp\'s surprise ends it, and the burp itself never comes', async () => {
    const { eaterId, feed } = await feeder(6);
    for (let n = 0; n < 4; n++) { await feed(n); await act(async () => { vi.advanceTimersByTime(1600); }); }
    await feed(4); // the fifth meal of the visit burps
    await act(async () => { vi.advanceTimersByTime(800); });
    expect(harness.scene.moods[eaterId]).toBe('surprised');
    expect(harness.active[eaterId]).toBe('burp');
    await feed(5);
    expect(harness.scene.moods[eaterId]).toBeUndefined();
    expect(harness.active[eaterId]).toBeUndefined();
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(harness.played).not.toContain('burp');
    expect(harness.scene.effects.some((e: any) => e.kind === 'burp')).toBe(false);
    expect(harness.scene.moods[eaterId]).toBeUndefined();
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(harness.scene.moods[eaterId]).toBe('happy');
    expect(harness.active[eaterId]).toBe('happy');
  });
  it('fix round 2 (P2): picking a friend up during an afterglow ends it too', async () => {
    const { eaterId, feed } = await feeder(1);
    await feed(0);
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(harness.scene.moods[eaterId]).toBe('happy');
    harness.slots = [{ id: eaterId, generation: 0, epoch: 0 }, {}];
    await act(async () => harness.options.onPickup({ id: eaterId, slot: 0, scene: harness.scene.scene, generation: 0, epoch: 0 }));
    expect(harness.scene.moods[eaterId]).toBeUndefined();
    expect(harness.active[eaterId]).toBeUndefined();
  });
  it('HD-07: tap the stove to light it; food in its pan sizzles and cooks; taken off early, it stays raw', async () => {
    const state = labFixtures.delight();
    const persist = await open(state);
    const stove = Object.values(buildScene(state).entities).find((e) => e.item?.item === 'stove')!;
    await tap(stove.id);
    expect(harness.played).toContain('knob');
    expect(persist.mock.calls.at(-1)![0].rooms.kitchen.instances.find((i: any) => i.item === 'stove')!.powered).toBe(true);
    const pan = harness.scene.scene.rooms.kitchen.targets.find((t: any) => t.owner === stove.id && t.pan)!;
    const mango = harness.scene.scene.entities['kitchen/item/mango'];
    await drop(state, mango.id, 'kitchen', pan.contact, { target: pan.id });
    expect(harness.scene.scene.entities['kitchen/item/mango'].pan).toBe(stove.id);
    expect(harness.played).toContain('sizzle');
    expect(harness.scene.effects.some((e: any) => e.kind === 'steam')).toBe(true);
    await act(async () => { vi.advanceTimersByTime(COOK_MS + 10); });
    const saved = persist.mock.calls.at(-1)![0];
    expect(saved.rooms.kitchen.instances.find((i: any) => i.id === 'mango')!.powered).toBe(true);
    // Serve the cooked mango, then put raw rice in the pan and take it off before it is done.
    await drop(saved, 'kitchen/item/mango', 'kitchen', { x: 250, y: 480 });
    const empty = harness.scene.scene.rooms.kitchen.targets.find((t: any) => t.owner === stove.id && t.pan)!;
    expect(empty.occupied).toBeUndefined();
    await drop(saved, 'kitchen/item/rice', 'kitchen', empty.contact, { target: empty.id });
    expect(harness.scene.scene.entities['kitchen/item/rice'].pan).toBe(stove.id);
    await act(async () => { vi.advanceTimersByTime(COOK_MS / 2); });
    await drop(saved, 'kitchen/item/rice', 'kitchen', { x: 330, y: 480 });
    await act(async () => { vi.advanceTimersByTime(COOK_MS * 2); });
    const after = persist.mock.calls.at(-1)![0].rooms.kitchen.instances;
    expect(after.find((i: any) => i.id === 'rice')!.powered).toBeUndefined();
    expect(after.find((i: any) => i.id === 'rice')!.on).toBeUndefined();
    expect(after.find((i: any) => i.id === 'mango')!.powered).toBe(true);
  });
  it('fix round 1 (P2): food picked up out of a hot pan stops cooking while held, and cooks again if the carry is cancelled', async () => {
    const state = labFixtures.delight();
    const persist = await open(state);
    const stove = Object.values(buildScene(state).entities).find((e) => e.item?.item === 'stove')!;
    await tap(stove.id);
    const pan = harness.scene.scene.rooms.kitchen.targets.find((t: any) => t.owner === stove.id && t.pan)!;
    await drop(state, 'kitchen/item/mango', 'kitchen', pan.contact, { target: pan.id });
    await act(async () => { vi.advanceTimersByTime(200); });
    // A finger captures the mango (the save still has it in the pan) and holds it past the deadline.
    const scene = harness.scene.scene;
    harness.slots = [{ id: 'kitchen/item/mango', phase: 'dragging', generation: 0, epoch: 0 }, {}];
    await act(async () => harness.options.onPickup({ id: 'kitchen/item/mango', slot: 0, scene, generation: 0, epoch: 0 }));
    await act(async () => { vi.advanceTimersByTime(1500); });
    const mango = () => persist.mock.calls.at(-1)![0].rooms.kitchen.instances.find((i: any) => i.id === 'mango')!;
    expect(mango().powered).toBeUndefined();
    // Cancelled: the mango never left the pan, so it starts cooking again from the start.
    harness.slots = [{}, {}];
    await act(async () => harness.options.onClear(0, 'kitchen/item/mango'));
    await act(async () => { vi.advanceTimersByTime(COOK_MS - 50); });
    expect(mango().powered).toBeUndefined();
    await act(async () => { vi.advanceTimersByTime(100); });
    expect(mango().powered).toBe(true);
  });
  // Fix round 2 (lead decision on the pan/floor ambiguity): the pan is a runtime seat that only a
  // pan drop fills. Food dropped on the floor in front of the stove stays on the floor.
  it('fix round 2: food dropped on the floor cell in front of a lit stove stays on the floor and never cooks', async () => {
    const state = labFixtures.delight();
    const persist = await open(state);
    const stove = Object.values(buildScene(state).entities).find((e) => e.item?.item === 'stove')!;
    await tap(stove.id);
    const floorAt = panFloorPoint(stove.item!);
    const proposal = await drop(state, 'kitchen/item/mango', 'kitchen', floorAt);
    expect(proposal.kind).toBe('floor');
    expect(proposal.target).toBeUndefined();
    const saved = () => persist.mock.calls.at(-1)![0].rooms.kitchen.instances.find((i: any) => i.id === 'mango')!;
    expect(floorPoint(saved().x, saved().y)).toEqual({ x: floorAt.x, y: floorAt.y });
    const mango = harness.scene.scene.entities['kitchen/item/mango'];
    expect(mango.pan).toBeUndefined();
    expect(mango.contact).toEqual(floorAt);
    expect(harness.played).not.toContain('sizzle');
    await act(async () => { vi.advanceTimersByTime(COOK_MS * 3); });
    expect(saved().powered).toBeUndefined();
    // The mango holds the pan's cell: no other food can go in, but the mango itself can, and then it cooks.
    const pan = harness.scene.scene.rooms.kitchen.targets.find((t: any) => t.owner === stove.id && t.pan)!;
    expect(pan.occupied).toBe('kitchen/item/mango');
    const scene = harness.scene.scene;
    expect(resolve({ ...scene.rooms.kitchen, entities: scene.entities }, scene.entities['kitchen/item/rice'], pan.contact, { scale: .5, release: true, target: pan.id }).target).not.toBe(pan.id);
    const into = await drop(state, 'kitchen/item/mango', 'kitchen', pan.contact, { target: pan.id });
    expect(into.target).toBe(pan.id);
    expect(harness.scene.scene.entities['kitchen/item/mango'].pan).toBe(stove.id);
    await act(async () => { vi.advanceTimersByTime(COOK_MS + 10); });
    expect(saved().powered).toBe(true);
  });
  it('fix round 2: food set down a little off the pan\'s spot, still over its cell, can be put in the pan; other food cannot', async () => {
    const state = labFixtures.delight();
    const persist = await open(state);
    const stove = Object.values(buildScene(state).entities).find((e) => e.item?.item === 'stove')!;
    await tap(stove.id);
    const floorAt = panFloorPoint(stove.item!);
    // Where the native recheck's floor drop settled: 2 left and 4 nearer than the pan's spot.
    const off = await drop(state, 'kitchen/item/mango', 'kitchen', { x: floorAt.x - 1.7, y: floorAt.y + 4.4 });
    expect(off.kind).toBe('floor');
    expect(off.contact).not.toEqual(floorAt);
    const pan = harness.scene.scene.rooms.kitchen.targets.find((t: any) => t.owner === stove.id && t.pan)!;
    expect([pan.closed, pan.occupied]).toEqual([true, 'kitchen/item/mango']);
    const scene = harness.scene.scene;
    expect(resolve({ ...scene.rooms.kitchen, entities: scene.entities }, scene.entities['kitchen/item/rice'], pan.contact, { scale: .5, release: true }).target).not.toBe(pan.id);
    const into = await drop(state, 'kitchen/item/mango', 'kitchen', pan.contact);
    expect(into.target).toBe(pan.id);
    await act(async () => { vi.advanceTimersByTime(COOK_MS + 10); });
    expect(persist.mock.calls.at(-1)![0].rooms.kitchen.instances.find((i: any) => i.id === 'mango')!.powered).toBe(true);
  });
  it('fix round 2: food lifted out of the pan and set on that same floor cell leaves the pan: same save, floor, cooking stops', async () => {
    const state = labFixtures.delight();
    const persist = await open(state);
    const stove = Object.values(buildScene(state).entities).find((e) => e.item?.item === 'stove')!;
    await tap(stove.id);
    const pan = harness.scene.scene.rooms.kitchen.targets.find((t: any) => t.owner === stove.id && t.pan)!;
    await drop(state, 'kitchen/item/mango', 'kitchen', pan.contact, { target: pan.id });
    expect(harness.scene.scene.entities['kitchen/item/mango'].pan).toBe(stove.id);
    const inPan = persist.mock.calls.at(-1)![0].rooms.kitchen.instances.find((i: any) => i.id === 'mango')!;
    await act(async () => { vi.advanceTimersByTime(COOK_MS / 2); });
    const proposal = await drop(state, 'kitchen/item/mango', 'kitchen', panFloorPoint(stove.item!));
    expect(proposal.kind).toBe('floor');
    const onFloor = persist.mock.calls.at(-1)![0].rooms.kitchen.instances.find((i: any) => i.id === 'mango')!;
    expect([onFloor.x, onFloor.y, onFloor.at]).toEqual([inPan.x, inPan.y, inPan.at]);
    expect(harness.scene.scene.entities['kitchen/item/mango'].pan).toBeUndefined();
    await act(async () => { vi.advanceTimersByTime(COOK_MS * 2); });
    expect(persist.mock.calls.at(-1)![0].rooms.kitchen.instances.find((i: any) => i.id === 'mango')!.powered).toBeUndefined();
  });
  it('HD-09: a tap on a sleeping friend makes them stir, with a drawn z, and they stay asleep', async () => {
    const state = labFixtures['delight-rest']();
    const sleeper = Object.values(buildScene(state).entities).find((e) => e.character?.slot === 0)!;
    harness.sleeping = { [sleeper.id]: true };
    await open(state);
    await tap(sleeper.id);
    expect(harness.cues).toContainEqual([sleeper.id, 'stir', undefined]);
    expect(harness.scene.effects.some((e: any) => e.kind === 'zzz')).toBe(true);
    expect(harness.played).toContain('rustle');
    expect(harness.scene.moods[sleeper.id]).toBeUndefined();
  });
  it('fix round 1 (P2): with Reduce Motion on and sound off, a sleeping friend tapped still shows a stir and a drawn z', async () => {
    harness.settings = { sound: false };
    harness.reduced = true;
    const state = labFixtures['delight-rest']();
    const sleeper = Object.values(buildScene(state).entities).find((e) => e.character?.slot === 0)!;
    harness.sleeping = { [sleeper.id]: true };
    await open(state);
    await tap(sleeper.id);
    expect(harness.live).toBe(false);
    expect(harness.played).toEqual([]);
    expect(harness.cues).toContainEqual([sleeper.id, 'stir', undefined]);
    expect(harness.scene.effects.some((e: any) => e.kind === 'zzz')).toBe(true);
  });
  it('HC-01: a painted jar, pan and book answer a touch with their own motion and sound', async () => {
    const state = labFixtures.delight();
    await open(state);
    const tapPiece = async (room: keyof HomeStateV2['rooms'], id: string) => {
      const piece = stagePieces[room].find((p) => p.id === id)!;
      const origin = roomOrigin(roomIds.indexOf(room), building);
      // The mocked camera is 0.5 with no translation.
      await tap(undefined, { x: (origin.x + piece.hit.left + piece.hit.width / 2) * .5, y: (origin.y + piece.hit.top + piece.hit.height / 2) * .5 });
      return piece;
    };
    await tapPiece('kitchen', 'kitchen-left-jar-1');
    expect(harness.scene.poke).toMatchObject({ id: 'kitchen-left-jar-1' });
    await tapPiece('kitchen', 'kitchen-pan-1');
    expect(harness.scene.poke).toMatchObject({ id: 'kitchen-pan-1' });
    await tapPiece('home', 'home-shelf-book-2');
    expect(harness.scene.poke).toMatchObject({ id: 'home-shelf-book-2' });
    expect(harness.played).toEqual(['shell', 'clang', 'wood']);
  });
  it('HC-01: an empty stool answers a tap with a small wiggle and its sound; a table holding things gives the sound alone', async () => {
    const state = labFixtures.delight();
    const persist = await open(state);
    const scene = buildScene(state);
    const stool = Object.values(scene.entities).find((e) => e.item?.item === 'stool' && !e.children.length)!;
    const table = Object.values(scene.entities).find((e) => e.item?.item === 'kitchen-table')!;
    expect(table.children.length).toBeGreaterThan(0);
    await tap(stool.id);
    await tap(table.id);
    expect(harness.cues).toEqual([[stool.id, 'tap', undefined]]);
    expect(harness.played).toEqual(['wood', 'wood']);
    expect(persist).not.toHaveBeenCalled();
  });
  it('HD-09: a tap on a bed with a sleeping friend in it is for the friend, who stirs; the bed never tilts', async () => {
    const state = labFixtures['delight-rest']();
    const scene = buildScene(state);
    const bed = Object.values(scene.entities).find((e) => e.item?.item === 'bed')!;
    const sleeper = Object.values(scene.entities).find((e) => e.character?.slot === 0)!;
    harness.sleeping = { [sleeper.id]: true };
    await open(state);
    await tap(bed.id);
    expect(harness.cues).toEqual([[sleeper.id, 'stir', undefined]]);
    expect(harness.played).toEqual(['rustle']);
  });
});

it('H4b retains only transient food art after consumption, replaces it for a newer meal, and clears it on pickup', async () => {
  const state = labFixtures['delight-feast']();
  await open(state);
  const initial = harness.scene.scene;
  const friend = initial.entities['character/0'];
  const mouth = initial.rooms.kitchen.targets.find((t: any) => t.owner === friend.id && t.kind === 'mouth');
  const food = Object.values(initial.entities).filter((e: any) => e.item && e.body?.edible === 'food') as any[];
  await drop(state, food[0].id, 'kitchen', mouth.contact, { previousTarget: mouth.id });
  const meal = harness.scene.meals[friend.id];
  expect(meal.food).toEqual(food[0].item);
  expect(meal.source).toBe(food[0].id);
  expect(meal.offered).toBe(true);
  expect(harness.scene.scene.entities[food[0].id]).toBeUndefined();
  const proposal = resolve({ ...initial.rooms.kitchen, entities: initial.entities }, food[0], mouth.contact, { scale: .5, release: true });
  const applied = apply(state, proposal);
  expect('state' in applied).toBe(true);
  if ('state' in applied) expect(harness.scene.state).toEqual(applied.state);
  await act(async () => { vi.advanceTimersByTime(300); });
  await drop(state, food[1].id, 'kitchen', mouth.contact, { previousTarget: mouth.id });
  expect(harness.scene.meals[friend.id].key).toBeGreaterThan(meal.key);
  expect(harness.scene.meals[friend.id].food.id).toBe(food[1].item.id);
  await act(async () => { vi.advanceTimersByTime(460); });
  expect(harness.scene.meals[friend.id]).toBeDefined();
  const scene = harness.scene.scene;
  harness.slots = [{ id: friend.id, generation: 0, epoch: 0 }, {}];
  await act(async () => harness.options.onPickup({ id: friend.id, slot: 0, scene, generation: 0, epoch: 0 }));
  expect(harness.scene.meals[friend.id]).toBeUndefined();
  expect(harness.scene.reactions[friend.id]).toBeUndefined();
});

it('keeps the original carry art mounted at the accepted mouth release', async () => {
  const state = labFixtures['rig-menu-0']();
  await open(state);
  const scene = harness.scene.scene;
  const id = 'home/item/menu-0';
  const capture = { generation: 1, epoch: 0 };
  const mouth = scene.rooms.home.targets.find((target: any) => target.kind === 'mouth');
  harness.slots = [{ id, ...capture }, {}];
  await act(async () => harness.options.onPickup({ id, slot: 0, scene, ...capture }));
  const pickup = harness.scene.pickups[0];
  expect(pickup.id).toBe(id);
  expect((await drop(state, id, 'home', mouth.contact, { previousTarget: mouth.id })).kind).toBe('mouth');
  expect(harness.scene.pickups[0]).toBe(pickup);
  expect(harness.scene.meals['character/0'].source).toBe(id);
});

it('H4b undo during the bite removes transient art and restores the consumed food atomically', async () => {
  const state = labFixtures['delight-feast']();
  await open(state);
  const scene = harness.scene.scene;
  const food = Object.values(scene.entities).find((e: any) => e.body?.edible === 'food') as any;
  const mouth = scene.rooms.kitchen.targets.find((t: any) => t.owner === 'character/0' && t.kind === 'mouth');
  await drop(state, food.id, 'kitchen', mouth.contact, { previousTarget: mouth.id });
  expect(harness.scene.meals['character/0']).toBeDefined();
  await act(async () => harness.chrome.onUndo());
  expect(harness.scene.meals).toEqual({});
  expect(harness.scene.reactions).toEqual({});
  expect(harness.scene.scene.entities[food.id].item).toEqual(food.item);
  await act(async () => { vi.advanceTimersByTime(800); });
  expect(harness.scene.scene.entities[food.id].item).toEqual(food.item);
});

it('H4b the committed drink stays empty and regrabbing its real container ends the sip art', async () => {
  const state = labFixtures['rig-meal']();
  await open(state);
  const scene = harness.scene.scene;
  const drink = Object.values(scene.entities).find((e: any) => e.body?.edible === 'drink') as any;
  const mouth = scene.rooms.home.targets.find((t: any) => t.owner === 'character/0' && t.kind === 'mouth');
  await drop(state, drink.id, 'home', mouth.contact, { previousTarget: mouth.id });
  const committed = harness.scene.scene;
  expect(committed.entities[drink.id].item.empty).toBe(true);
  expect(harness.scene.meals['character/0'].food.empty).not.toBe(true);
  harness.slots = [{ id: drink.id, generation: 0, epoch: 0 }, {}];
  await act(async () => harness.options.onPickup({ id: drink.id, slot: 0, scene: committed, generation: 0, epoch: 0 }));
  expect(harness.scene.meals['character/0']).toBeUndefined();
  expect(harness.scene.scene.entities[drink.id].item.empty).toBe(true);
  await act(async () => { vi.advanceTimersByTime(800); });
  expect(harness.scene.scene.entities['character/0'].action).not.toBe('drink');
});

it('H4b playback completion owns the meal end even after a long JS stall', async () => {
  const state = labFixtures['rig-meal']();
  await open(state);
  const scene = harness.scene.scene;
  const food = Object.values(scene.entities).find((e: any) => e.body?.edible === 'food') as any;
  const mouth = scene.rooms.home.targets.find((t: any) => t.owner === 'character/0' && t.kind === 'mouth');
  await drop(state, food.id, 'home', mouth.contact, { previousTarget: mouth.id });
  const meal = harness.scene.meals['character/0'];
  expect(harness.scene.scene.entities[food.id]).toBeUndefined();
  await act(async () => { vi.advanceTimersByTime(300); });
  await act(async () => harness.scene.onMealPresented('character/0', meal.key));
  await act(async () => { vi.advanceTimersByTime(2000); });
  expect(harness.scene.meals['character/0']).toMatchObject({key:meal.key});
  // A second layout must not extend the meal again.
  await act(async () => harness.scene.onMealPresented('character/0', meal.key));
  await act(async () => harness.scene.onMealFinished('character/0', meal.key));
  expect(harness.scene.meals['character/0']).toBeUndefined();
});

it('H4b stale presentation and completion callbacks cannot finish a newer meal', async () => {
  const state = labFixtures['rig-meal']();
  await open(state);
  const scene = harness.scene.scene;
  const food = Object.values(scene.entities).filter((e: any) => e.body?.edible === 'food') as any[];
  const mouth = scene.rooms.home.targets.find((t: any) => t.owner === 'character/0' && t.kind === 'mouth');
  await drop(state, food[0].id, 'home', mouth.contact, { previousTarget: mouth.id });
  const old = harness.scene.meals['character/0'];
  await act(async () => { vi.advanceTimersByTime(300); });
  await drop(state, food[1].id, 'home', mouth.contact, { previousTarget: mouth.id });
  await act(async () => { vi.advanceTimersByTime(100); });
  await act(async () => harness.scene.onMealPresented('character/0', old.key));
  const current = harness.scene.meals['character/0'];
  await act(async () => harness.scene.onMealPresented('character/0', current.key));
  await act(async () => harness.scene.onMealFinished('character/0', old.key));
  await act(async () => { vi.advanceTimersByTime(2000); });
  expect(harness.scene.meals['character/0']).toMatchObject({key:current.key});
  await act(async () => harness.scene.onMealFinished('character/0', current.key));
  expect(harness.scene.meals['character/0']).toBeUndefined();
});

it('H4b lab debug toggle hides the release probe so AX5 diagnostics cannot cover the gesture', async () => {
  await act(async () => { root = create(<HomeScreen initialState={labFixtures['rig-meal']()} lab />); });
  expect(root.root.findAllByProps({ accessibilityLabel: 'Release frame probe' })).toHaveLength(1);
  await act(async () => root.root.findByProps({ label: 'Toggle debug' }).props.onPress());
  expect(root.root.findAllByProps({ accessibilityLabel: 'Release frame probe' })).toHaveLength(0);
  await act(async () => root.root.findByProps({ label: 'Toggle debug' }).props.onPress());
  expect(root.root.findAllByProps({ accessibilityLabel: 'Release frame probe' })).toHaveLength(1);
});


it('reveals the meal only after presentation and releases its captured source on interruption',async()=>{
 const state=labFixtures['rig-menu-0']();await open(state);
 const source='home/item/menu-0',owner='character/0';
 const scene=buildScene(state),mouth=scene.rooms.home.targets.find(t=>t.owner===owner && t.kind==='mouth')!;
 await drop(state,source,'home',mouth.contact,{target:mouth.id});
 const meal=harness.scene.meals[owner];expect(meal).toBeDefined();
 expect(harness.scene.mealReady?.[owner]).not.toBe(meal.key);
 await act(async()=>harness.scene.onMealPresented(owner,meal.key));
 expect(harness.scene.mealReady?.[owner]).toBe(meal.key);
 const currentScene=harness.scene.scene;harness.slots=[{id:owner,generation:9,epoch:0},{}];
 await act(async()=>harness.options.onPickup({id:owner,slot:0,scene:currentScene,generation:9,epoch:0}));
 expect(harness.scene.meals[owner]).toBeUndefined();
 expect(harness.handoffs).toContainEqual([source,meal.capture]);
});
