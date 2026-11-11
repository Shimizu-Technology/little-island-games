import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { SettleArt } from '../src/home/runtime/SettleArt';
import { buildScene } from '../src/home/scene/graph';
import { starterHome } from '../src/home/model';
import { socketBasesOf } from '../src/home/runtime/DragOverlay';
import { poseToken } from '../src/home/runtime/poseBank';
import { acknowledgePoseIn, forgetPoseIn, poseLaidOut, type PoseAcks } from '../src/home/runtime/poseAck';
vi.mock('../src/home/runtime/useInteraction', () => ({ emptyDragSlot: () => ({}), zoneAt: () => undefined }));
vi.mock('react-native', () => ({ View: 'View', Platform: { OS: 'ios' } }));
vi.mock('react-native-reanimated', () => ({ default: { View: 'AnimatedView' }, useAnimatedStyle: (fn: any) => ({ evaluate: fn }), useDerivedValue: (fn: any) => ({ get value() { return fn(); } }) }));
vi.mock('../src/home/runtime/EntityArt', () => ({ EntityArt: 'EntityArt', artFrame: (e: any) => e.bounds }));
vi.mock('../src/home/runtime/CarriedCharacter', () => ({ CarriedCharacter: 'CarriedCharacter' }));
vi.mock('../src/home/runtime/LandingPreview', () => ({ LandingPreview: () => null }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/** A friend carried out of the Kitchen (stand/sit only) and let go on My room's bed. */
function carried() {
  const scene = buildScene(starterHome());
  const source = { ...scene.entities['character/0'], room: 'kitchen' as const, base: 'stand' as const };
  const slot = { phase: 'settling', settleAt: 100, releaseX: 0, releaseY: 0, targetX: 400, targetY: 400, travelDelay: 0, proposal: { base: 'lie', facing: 'front', room: 'home' } };
  const poseLayouts = { value: {} as PoseAcks };
  const interaction: any = { slots: { value: [slot] }, clock: { value: 500 }, poseLayouts,
    acknowledgePose: (a: string, t: string, m: number) => acknowledgePoseIn(poseLayouts.value, a, t, m),
    forgetPose: (a: string, t: string, m: number) => forgetPoseIn(poseLayouts.value, a, t, m) };
  return { scene, source, interaction, poseLayouts, lie: poseToken('lie', 'front', source.action) };
}
/** Native layout arriving for the mounted target pose(s) of one base, as onLayout would. */
function layOut(tree: TestRenderer.ReactTestRenderer, base: string, actor?: string) {
  const views = tree.root.findAll((n) => typeof n.props?.onLayout === 'function' && (n.type as any) === 'View' &&
    n.findAll((c) => (c.type as any) === 'EntityArt' && c.props.entity.base === base && (!actor || c.props.entity.id === actor)).length > 0);
  for (const view of views) view.props.onLayout();
  return views.length;
}
const opacities = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAll((n) => (n.type as any) === 'AnimatedView')
  .map((n) => n.props.style?.find?.((s: any) => s?.evaluate)?.evaluate().opacity).filter((v) => typeof v === 'number') as number[];

it('R4: the carried friend stays visible until the destination pose is mounted and laid out', async () => {
  const { scene, source, interaction } = carried();
  const kitchen: any = ['stand', ...socketBasesOf(scene).kitchen];
  expect(kitchen).not.toContain('lie');
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<SettleArt source={source} interaction={interaction} index={0} reduced={false} bases={kitchen} />); });
  // Travel has finished, but no lie pose exists yet: the carry is the one visible layer.
  expect(opacities(tree)[0]).toBe(1);
  expect(opacities(tree).filter((o) => o > 0)).toHaveLength(1);
  // JS reaches My room and mounts its poses; the native layout has not arrived yet.
  await act(async () => tree.update(<SettleArt source={source} interaction={interaction} index={0} reduced={false} bases={[...kitchen, 'lie']} />));
  expect(opacities(tree)[0]).toBe(1);
  // The lie pose lays out (its onLayout acknowledges it): it takes over and the carry goes.
  const layouts = tree.root.findAll((n) => typeof n.props.onLayout === 'function');
  expect(layouts).toHaveLength(opacities(tree).length - 1);
  expect(layOut(tree, 'lie')).toBeGreaterThan(0);
  expect(opacities(tree)[0]).toBe(0);
  expect(opacities(tree).filter((o) => o === 1)).toHaveLength(1);
  await act(async () => tree.unmount());
});
it('R4: a pose unmounted since an earlier drag does not count as laid out', async () => {
  const { source, interaction, poseLayouts, lie } = carried();
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<SettleArt source={source} interaction={interaction} index={0} reduced={false} bases={['stand', 'sit', 'lie']} />); });
  layOut(tree, 'lie');
  expect(opacities(tree)[0]).toBe(0);
  await act(async () => tree.update(<SettleArt source={source} interaction={interaction} index={0} reduced={false} bases={['stand', 'sit']} />));
  expect(poseLaidOut(poseLayouts.value, source.id, lie)).toBe(false);
  // Remounted by a later reach, but not yet laid out natively: the carry stays.
  await act(async () => tree.update(<SettleArt source={source} interaction={interaction} index={0} reduced={false} bases={['stand', 'sit', 'lie']} />));
  expect(opacities(tree)[0]).toBe(1);
  await act(async () => tree.unmount());
});
it('R4: a re-render with a new interaction object keeps the acknowledgements of mounted poses', async () => {
  const { source, interaction, poseLayouts, lie } = carried();
  let tree!: TestRenderer.ReactTestRenderer;
  const bases = ['stand', 'sit', 'lie'] as const;
  await act(async () => { tree = TestRenderer.create(<SettleArt source={source} interaction={interaction} index={0} reduced={false} bases={bases} />); });
  layOut(tree, 'lie');
  // The Home screen re-renders mid-carry: useInteraction hands out new function identities.
  const next = { ...interaction, forgetPose: (a: string, t: string, m: number) => forgetPoseIn(poseLayouts.value, a, t, m) };
  await act(async () => tree.update(<SettleArt source={source} interaction={next} index={0} reduced={false} bases={bases} />));
  expect(poseLaidOut(poseLayouts.value, source.id, lie)).toBe(true);
  expect(opacities(tree)[0]).toBe(0);
  await act(async () => tree.unmount());
  expect(poseLaidOut(poseLayouts.value, source.id, lie)).toBe(false);
});
