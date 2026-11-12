import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { SettleArt } from '../src/home/runtime/SettleArt';
import { buildScene } from '../src/home/scene/graph';
import { starterHome } from '../src/home/model';
import { buildingLayout } from '../src/home/camera';
import { DragOverlay } from '../src/home/runtime/DragOverlay';
import { poseToken } from '../src/home/runtime/poseBank';
import { acknowledgePoseIn, forgetPoseIn, poseLaidOut, type PoseAcks } from '../src/home/runtime/poseAck';
vi.mock('../src/home/runtime/useInteraction', () => ({ emptyDragSlot: () => ({}), zoneAt: () => undefined }));
vi.mock('react-native', () => ({ View: 'View', Platform: { OS: 'ios' } }));
vi.mock('react-native-reanimated', () => ({ runOnJS: (fn: any) => fn, withTiming: (v: any) => v,
  useAnimatedReaction: () => {},
  default: { View: 'AnimatedView' }, useAnimatedStyle: (fn: any) => ({ evaluate: fn }), useDerivedValue: (fn: any) => ({ get value() { return fn(); } }) }));
vi.mock('../src/home/runtime/EntityArt', () => ({ EntityArt: 'EntityArt', artFrame: (e: any) => e.bounds }));
vi.mock('../src/home/runtime/CarriedCharacter', () => ({ CarriedCharacter: 'CarriedCharacter' }));
vi.mock('../src/home/runtime/LandingPreview', () => ({ LandingPreview: () => null }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/** The same acknowledgement store useInteraction keeps, with its real key and ownership rules. */
function store(slots: unknown[]) {
  const poseLayouts = { value: {} as PoseAcks };
  const interaction: any = { slots: { value: slots }, clock: { value: 500 }, camera: { value: { a: 1 } }, restingFlags: { value: { fronts: [] } }, poseLayouts,
    acknowledgePose: (a: string, t: string, m: number) => acknowledgePoseIn(poseLayouts.value, a, t, m),
    forgetPose: (a: string, t: string, m: number) => forgetPoseIn(poseLayouts.value, a, t, m), ready: () => {}, unready: () => {} };
  return { interaction, poseLayouts };
}
/** Every mounted view gets its native layout, as onLayout would deliver it. */
const layOutAll = (tree: TestRenderer.ReactTestRenderer) => { for (const n of tree.root.findAll((n) => typeof n.props?.onLayout === 'function')) n.props.onLayout(); };
const opacities = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAll((n) => (n.type as any) === 'AnimatedView')
  .map((n) => n.props.style?.find?.((s: any) => s?.evaluate)?.evaluate().opacity).filter((v) => typeof v === 'number') as number[];

it('F1: another friend on the same slot unmounting leaves the carried friend\'s pose acknowledgement', async () => {
  const scene = buildScene(starterHome());
  const source = { ...scene.entities['character/0'], room: 'kitchen' as const, base: 'stand' as const };
  const other = { ...scene.entities['character/1'] };
  const slot = { phase: 'settling', settleAt: 100, releaseX: 0, releaseY: 0, targetX: 400, targetY: 400, travelDelay: 0, proposal: { base: 'lie', facing: 'front', room: 'home' } };
  const { interaction, poseLayouts } = store([slot]);
  const lie = poseToken('lie', 'front', source.action);
  const bases = ['stand', 'sit', 'lie'] as const;
  // Both friends' overlays use drag slot 0: idle warm friends all do.
  const draw = (warm: boolean) => <>
    {warm && <SettleArt key="warm" source={other} interaction={interaction} index={0} reduced={false} bases={bases} />}
    <SettleArt key="active" source={source} interaction={interaction} index={0} reduced={false} bases={bases} />
  </>;
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(draw(true)); });
  layOutAll(tree);
  expect(poseLaidOut(poseLayouts.value, source.id, lie)).toBe(true);
  await act(async () => tree.update(draw(false)));
  // The target is still mounted and laid out, so its acknowledgement stands, and only it is opaque.
  expect(poseLaidOut(poseLayouts.value, source.id, lie)).toBe(true);
  expect(poseLaidOut(poseLayouts.value, other.id, lie)).toBe(false);
  expect(opacities(tree)[0]).toBe(0);
  expect(opacities(tree).filter((o) => o === 1)).toHaveLength(1);
  await act(async () => tree.unmount());
  expect(Object.keys(poseLayouts.value)).toEqual([]);
});

it('F1: a room-button hover unmounts the warm friends and keeps the carried friend\'s standing acknowledgement', async () => {
  const scene = buildScene(starterHome()), source = scene.entities['character/0'];
  const friends = Object.values(scene.entities).filter((e) => e.character && e.room === 'home');
  expect(friends.length).toBeGreaterThanOrEqual(3);
  const slot = { id: source.id, ready: true, phase: 'settling', settleAt: 100, releaseX: 100, releaseY: 400, targetX: 100, targetY: 400, x: 100, y: 400,
    gripX: 0, gripY: 0, tilt: 0, lag: 0, liftedAt: 0, proposal: { base: 'stand', facing: source.facing, room: 'kitchen', contact: { x: 100, y: 400 }, attachment: { kind: 'floor' } } };
  const { interaction, poseLayouts } = store([slot, {}]);
  const pickup: any = { id: source.id, slot: 0, scene, generation: 1, epoch: 0 };
  const building = buildingLayout(4);
  const draw = (activeRoom: 'home' | 'kitchen') => <DragOverlay scene={scene} pickups={[pickup]} interaction={interaction} building={building} reduced={false} activeRoom={activeRoom} />;
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(draw('home')); });
  expect(tree.root.findAllByType(SettleArt)).toHaveLength(friends.length);
  layOutAll(tree);
  const token = poseToken('stand', source.facing, source.action);
  expect(poseLaidOut(poseLayouts.value, source.id, token)).toBe(true);
  await act(async () => tree.update(draw('kitchen')));
  expect(tree.root.findAllByType(SettleArt)).toHaveLength(1);
  expect(poseLaidOut(poseLayouts.value, source.id, token)).toBe(true);
  // The departed friends cleared only their own.
  for (const friend of friends.filter((f) => f.id !== source.id))
    expect(Object.keys(poseLayouts.value).some((k) => k.startsWith(`${friend.id}|`))).toBe(false);
  await act(async () => tree.unmount());
});

it('F1: a laid-out pose whose overlay changes drag slot still counts; nothing lays it out again', async () => {
  const scene = buildScene(starterHome()), source = scene.entities['character/0'];
  const slot = { phase: 'settling', settleAt: 100, releaseX: 0, releaseY: 0, targetX: 0, targetY: 0, travelDelay: 0, proposal: { base: 'stand', facing: source.facing } };
  const { interaction, poseLayouts } = store([{}, slot]);
  const token = poseToken('stand', source.facing, source.action);
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<SettleArt source={source} interaction={interaction} index={0} reduced={false} bases={['stand']} />); });
  layOutAll(tree);
  // A second finger: this friend's next carry runs on slot 1. Same mounted, laid-out views.
  await act(async () => tree.update(<SettleArt source={source} interaction={interaction} index={1} reduced={false} bases={['stand']} />));
  expect(poseLaidOut(poseLayouts.value, source.id, token)).toBe(true);
  expect(opacities(tree)[0]).toBe(0);
  await act(async () => tree.unmount());
});
