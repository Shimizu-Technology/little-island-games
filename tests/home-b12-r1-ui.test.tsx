import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { EntityArt } from '../src/home/runtime/EntityArt';
import { SceneView } from '../src/home/runtime/SceneView';
import { DragOverlay } from '../src/home/runtime/DragOverlay';
import { Destinations } from '../src/home/runtime/Destinations';
import { FriendDrawer } from '../src/home/runtime/FriendDrawer';
import { posePlan, PosePicture } from '../src/home/runtime/PosePicture';
import { instance, starterHome } from '../src/home/model';
import { buildScene } from '../src/home/scene/graph';
import { resolve } from '../src/home/scene/proposal';
import { buildingLayout } from '../src/home/camera';
import { emptyDragSlot } from '../src/home/runtime/useInteraction';
import { emptyRestingFlags, emptyRestingMotion, restingFlagsOf } from '../src/home/runtime/restingState';
vi.mock('../src/home/runtime/HomeChrome', () => ({ Tool: 'Tool' }));
vi.mock('expo-haptics', () => ({ impactAsync: () => Promise.resolve(), ImpactFeedbackStyle: { Light: 'light' } }));
vi.mock('react-native', () => ({ View: 'View', Text: 'Text', Image: 'Image', Pressable: 'Pressable', ScrollView: 'ScrollView', Platform: { OS: 'ios' }, StyleSheet: { absoluteFill: {}, create: (s: unknown) => s } }));
vi.mock('react-native-svg', () => ({ default: 'Svg', G: 'G', Path: 'Path', Ellipse: 'Ellipse', Circle: 'Circle' }));
vi.mock('react-native-reanimated', () => ({ default: { View: 'AnimatedView', createAnimatedComponent: (v: unknown) => v },
  useSharedValue: (v: unknown) => React.useRef({ value: v, get() { return this.value; }, set(n: unknown) { this.value = n; } }).current,
  useAnimatedStyle: (fn: () => unknown) => ({ evaluate: fn }), useDerivedValue: (fn: () => unknown) => ({ get value() { return fn(); } }),
  useAnimatedReaction: () => {}, withTiming: (v: unknown) => v, cancelAnimation: () => {}, runOnJS: (fn: unknown) => fn, Easing: { linear: (v: number) => v } }));
vi.mock('react-native-gesture-handler', () => ({ GestureDetector: 'GestureDetector', Gesture: { Pan: () => { const chain: any = new Proxy({}, { get: () => () => chain }); return chain; } } }));
vi.mock('../src/home/runtime/CharacterDrawing', () => ({ CharacterDrawing: 'CharacterDrawing' }));
vi.mock('../src/home/runtime/MealArt', () => ({ MealArt: 'MealArt' }));
vi.mock('../src/home/runtime/SettleArt', () => ({ SettleArt: () => null }));
vi.mock('../src/home/runtime/LandingPreview', () => ({ LandingPreview: () => null }));
vi.mock('../src/home/art/Items', () => ({ ItemArt: 'ItemArt' }));
vi.mock('../src/home/art/More', () => ({ MoreItemArt: 'MoreItemArt', RoomShellArt: () => null }));
vi.mock('../src/home/art/Room', () => ({ RoomArt: () => null, ShoreArt: () => null, SkyArt: () => null }));
vi.mock('../src/home/BuildingArt', () => ({ BuildingArt: () => null, BuildingTrim: () => null, TerraceArt: () => null }));
vi.mock('../src/home/runtime/Swimming', () => ({ WaterRipples: () => null, SwimBobDriver: () => null }));
vi.mock('../src/home/runtime/WeatherOverlay', () => ({ WeatherOverlay: () => null }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let tree: TestRenderer.ReactTestRenderer;
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });
function fixture() {
  const state = starterHome();
  for (const room of Object.values(state.rooms)) room.characters = [];
  state.rooms.home.instances.push(instance('r1-ring', 'swim-ring', 8, 0));
  state.rooms.home.characters = [{ slot: 0, anchor: 'floor', pose: 'stand', x: 8, y: 9, holding: 'r1-ring' }];
  const scene = buildScene(state);
  const interaction: any = { slots: { value: [emptyDragSlot(), emptyDragSlot()] }, camera: { value: { a: 1, tx: 0, ty: 0 } }, clock: { value: 1000 },
    restingFlags: { value: emptyRestingFlags() }, restingMotion: { value: emptyRestingMotion() }, acknowledgeLayout: () => {}, ready: () => {}, unready: () => {} };
  return { state, scene, interaction, actor: scene.entities['character/0'], ring: scene.entities['home/item/r1-ring'] };
}
it('R1-02 hides every resting waist layer on the UI thread only once the ring overlay is ready, and restores on cancel', async () => {
  const f = fixture();
  await act(async () => { tree = TestRenderer.create(<SceneView state={f.state} scene={f.scene} interaction={f.interaction} building={buildingLayout(4)} viewport={{ width: 800, height: 600 }} pickups={[]} reduced reactions={{}} sleeping={{}} onNode={() => {}} onSelect={() => {}} onMove={() => {}}/>); });
  const layers = tree.root.findAll(n => typeof n.props.testID === 'string' && n.props.testID.startsWith('worn-floaty-'));
  expect(layers.length).toBeGreaterThanOrEqual(2);
  const opacity = () => layers.map(n => n.props.style[1].evaluate().opacity);
  expect(opacity().every(v => v === 1)).toBe(true);
  const slot = { ...emptyDragSlot(), id: f.ring.id, restId: f.ring.id, subject: f.ring, phase: 'dragging' as const, ready: false, painted: true };
  f.interaction.restingFlags.value = restingFlagsOf([slot], []);
  expect(opacity().every(v => v === 1)).toBe(true);
  slot.ready = true;
  f.interaction.restingFlags.value = restingFlagsOf([slot], []);
  expect(opacity().every(v => v === 0)).toBe(true);
  expect(tree.root.findAllByType('CharacterDrawing' as any).length).toBeGreaterThan(0);
  f.interaction.restingFlags.value = emptyRestingFlags();
  expect(opacity().every(v => v === 1)).toBe(true);
});
it.each(['dragging', 'settling'] as const)('R1-02 paints a worn ring as a visible standalone root in DragOverlay while %s', async phase => {
  const f = fixture();
  f.interaction.slots.value[0] = { ...emptyDragSlot(), id: f.ring.id, subject: f.ring, generation: 1, phase, ready: true, x: 400, y: 450, settleAt: phase === 'settling' ? 900 : 0 };
  await act(async () => { tree = TestRenderer.create(<DragOverlay scene={f.scene} interaction={f.interaction} building={buildingLayout(4)} pickups={[{ id: f.ring.id, slot: 0, generation: 1, epoch: 0, scene: f.scene }]} reduced/>); });
  const ring = tree.root.findAllByType(EntityArt).find(n => n.props.entity.id === f.ring.id && n.props.standalone);
  expect(ring).toBeDefined();
  expect(ring!.findAllByType('MoreItemArt' as any)).toHaveLength(1);
});
it('R1-03 paints the ring chooser and removes the redundant held badge from a wearing friend', async () => {
  const f = fixture();
  await act(async () => { tree = TestRenderer.create(<Destinations scene={f.scene} selected={f.actor.id} scale={1} bottom={0} onChoose={() => {}} onSelect={() => {}}/>); });
  const tile = tree.root.findByProps({ accessibilityLabel: 'Choose Hibiscus Swim Ring' });
  expect(tile.findAllByType('MoreItemArt' as any)).toHaveLength(1);
  await act(async () => tree.update(<FriendDrawer open scene={f.scene} here="home" bottom={0} interaction={f.interaction} offset={{ value: { x: 0, y: 0 } } as any} reduced onBring={() => {}} onClose={() => {}} onCarry={() => {}}/>));
  expect(tree.root.findAllByProps({ testID: 'worn-floaty-front-0' })).toHaveLength(1);
  expect(tree.root.findAll(n => n.props.style?.left === 3 && n.props.style?.top === 3 && n.props.style?.width === 22)).toHaveLength(0);
});
it('R1-03 socket previews remove the worn ring; the ring destination depicts one wearing avatar', async () => {
  const f = fixture();
  for (const target of Object.values(f.scene.rooms).flatMap(r => r.sockets).filter(t => !t.pet)) {
    const index = { ...f.scene.rooms[f.scene.entities[target.owner].room], entities: f.scene.entities };
    const proposal = resolve(index, f.actor, target.contact, { scale: 1, release: true, target: target.id });
    if (proposal.target !== target.id) continue;
    const plan = posePlan(f.scene.entities[target.owner], f.actor, target, proposal);
    if (plan.owner.item?.item !== 'swim-ring') expect(plan.subject.floaty).toBe(false);
  }
  const target = f.scene.rooms['tumon-beach'].sockets.find(t => f.scene.entities[t.owner].item?.item === 'swim-ring' && !t.pet)!;
  const proposal = resolve({ ...f.scene.rooms['tumon-beach'], entities: f.scene.entities }, f.actor, target.contact, { scale: 1, release: true, target: target.id });
  const plan = posePlan(f.scene.entities[target.owner], f.actor, target, proposal);
  expect(plan.subject.floaty).toBe(true);
  expect(plan.hideOwner).toBe(true);
  await act(async () => { tree = TestRenderer.create(<PosePicture plan={plan} size={48}/>); });
  expect(tree.root.findAllByType('CharacterDrawing' as any)).toHaveLength(1);
  expect(tree.root.findAllByType('MoreItemArt' as any)).toHaveLength(2);
});
