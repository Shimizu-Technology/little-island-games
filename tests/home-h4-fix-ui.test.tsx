import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { SceneView } from '../src/home/runtime/SceneView';
import { Effects } from '../src/home/runtime/Effects';
import { pieceMotion } from '../src/home/runtime/SetPieces';
import { labFixtures } from '../src/home/runtime/lab';
import { withPortions } from '../src/home/runtime/portions';
import { buildScene } from '../src/home/scene/graph';
import { buildingLayout } from '../src/home/camera';
import { restingFlagsOf, restingMotionOf } from '../src/home/runtime/restingState';
import { REDUCED_CUE_DIM, type CueKind } from '../src/home/runtime/delight';
import { instance, validHome, type HomeStateV2 } from '../src/home/model';
import type { Interaction } from '../src/home/runtime/useInteraction';

const timing = vi.hoisted(() => ({ configs: [] as any[] }));
vi.mock('react-native', () => ({ StyleSheet:{absoluteFill:{position:'absolute',top:0,left:0,right:0,bottom:0}}, View: 'View', Pressable: 'Pressable', Text: 'Text', Platform: { OS: 'ios' } }));
vi.mock('react-native-svg', () => Object.fromEntries(['Image', 'G', 'Circle', 'Ellipse', 'Rect', 'Path', 'Defs', 'ClipPath', 'Pattern', 'LinearGradient', 'Stop'].map((k) => [k, k.toLowerCase()]).concat([['default', 'svg']])));
vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView' }, cancelAnimation:()=>{},
  useSharedValue: (v: any) => React.useRef({ value: v, set(n: any) { this.value = n; }, get() { return this.value; } }).current,
  // The real driver under system Reduce Motion jumps to the end unless reduceMotion is Never.
  withTiming: (to: any, config?: any) => { timing.configs.push(config); return to; },
  ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
  Easing: { linear: (t: number) => t },
  useAnimatedStyle: (fn: () => unknown) => ({ evaluate: fn }),
  useDerivedValue: (fn: () => unknown) => ({ get value() { return fn(); } }),
  // Reactions run on every render, the way a changed shared value would trigger them.
  useAnimatedReaction: (prepare: () => any, react: (v: any, p: any) => void) => { react(prepare(), null); },
  runOnJS: (f: any) => f, runOnUI: (f: any) => f,
}));
vi.mock('react-native-gesture-handler', () => ({ GestureDetector: 'GestureDetector' }));
vi.mock('../src/home/runtime/EntityArt', () => ({ EntityArt: (props: any) => React.createElement('EntityArt', { entityId: props.entity.id }), artFrame: (e: any) => e.bounds }));
vi.mock('../src/home/runtime/SettleArt', () => ({ SettleArt: () => null }));
vi.mock('../src/home/runtime/SetPieces', async (importOriginal) => ({ ...(await importOriginal<any>()), SetPieces: () => null }));
vi.mock('../src/home/art/Room', () => ({ RoomArt: () => null, ShoreArt: () => null, SkyArt: () => null }));
vi.mock('../src/home/art/More', () => ({ RoomShellArt: () => null, MoreItemArt: () => null }));
vi.mock('../src/home/art/Items', () => ({ ItemArt: () => null }));
vi.mock('../src/home/BuildingArt', () => ({ BuildingArt: () => null, BuildingTrim: () => null, TerraceArt: () => null }));
vi.mock('../src/badges/BadgeArt', () => ({ BadgeGlyph: () => null }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/** The Islander in the kitchen holding a rice ball, a teddy or a drink. */
function holding(item: 'rice-ball' | 'teddy' | 'juice'): HomeStateV2 {
  const state = labFixtures.delight();
  state.rooms.kitchen.instances.push({ ...instance('held', item, 0, 0) });
  state.rooms.kitchen.characters = state.rooms.kitchen.characters.map((c) => c.slot === 0 ? { ...c, holding: 'held' } : c);
  expect(validHome(state)).toBe(true);
  return state;
}
async function render(state: HomeStateV2, cue?: { kind: CueKind; at: number; now: number; dir?: number }, notice = false, reduced = false) {
  const scene = withPortions(buildScene(state));
  const islander = Object.values(scene.entities).find((e) => e.character?.slot === 0)!;
  const interaction: any = { slots: { value: [{}, {}] }, camera: { value: { a: 1 } }, acknowledgeLayout: () => {}, acknowledgePose: () => {}, ready: () => {} };
  interaction.restingFlags = { value: restingFlagsOf([], []) };
  if (notice) interaction.restingFlags.value.notice = [{ id: islander.id, dir: -1, food: true }];
  interaction.restingMotion = { value: restingMotionOf([], scene.revision, 1, cue?.now ?? 0, reduced, {}, null,
    cue ? { [islander.id]: { at: cue.at, kind: cue.kind, dir: cue.dir ?? 1 } } : {}) };
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<SceneView state={state} scene={scene} building={buildingLayout(4)} viewport={{ width: 402, height: 650 }}
    interaction={interaction as Interaction} pickups={[]} reduced={reduced} reactions={{}} sleeping={{}} onNode={() => {}} onSelect={() => {}} onMove={() => {}} liveRoom="kitchen" />); });
  const node = (testID: string) => tree.root.findAll((n) => n.props.testID === testID && typeof n.type === 'string')[0];
  /** World-space pivot and the transform of one resting entity. */
  const pose = (testID: string) => {
    const outer = node(testID), view = outer.findAll((n) => String(n.type) === 'AnimatedView' && n.props.style?.evaluate)[0];
    const style = view.props.style.evaluate(), at = outer.props.style[0];
    const get = (k: string) => style.transform.find((t: any) => k in t)?.[k];
    return { pivot: { x: at.left + style.transformOrigin[0], y: at.top + style.transformOrigin[1] }, rotate: get('rotate'), dy: get('translateY'), sy: get('scaleY'), opacity: style.opacity };
  };
  return { tree, pose };
}

describe('fix round 1 (P2): a held thing moves with its friend', () => {
  for (const item of ['rice-ball', 'teddy', 'juice'] as const)
    for (const [kind, ms] of [['happy', 150], ['greet', 300], ['hop', 120], ['stir', 300], ['burp', 400]] as const)
      it(`${item} during ${kind}`, async () => {
        const { tree, pose } = await render(holding(item), { kind, at: 1000, now: 1000 + ms, dir: -1 });
        const friend = pose('character-0'), held = pose('object-held');
        expect(held.rotate).toBe(friend.rotate);
        expect(held.dy).toBe(friend.dy);
        expect(held.pivot.x).toBeCloseTo(friend.pivot.x, 6);
        expect(held.pivot.y).toBeCloseTo(friend.pivot.y, 6);
        expect(friend.rotate !== '0deg' || friend.dy !== 0).toBe(true);
        await act(async () => tree.unmount());
      });
  it('and leans with the friend toward food carried near', async () => {
    const { tree, pose } = await render(holding('teddy'), undefined, true);
    const friend = pose('character-0'), held = pose('object-held');
    expect(friend.rotate).toBe('-5deg');
    expect(held.rotate).toBe('-5deg');
    expect(held.pivot.x).toBeCloseTo(friend.pivot.x, 6);
    await act(async () => tree.unmount());
  });
  it('at rest it keeps its own small wiggle about its own base', async () => {
    const { tree, pose } = await render(holding('teddy'));
    expect(pose('object-held').rotate).toBe('0deg');
    await act(async () => tree.unmount());
  });
});

describe('fix round 1 (P2): with Reduce Motion on, feedback is still seen (sound off needs no sound)', () => {
  it('a resting reaction becomes a stationary dim, not nothing', async () => {
    const { tree, pose } = await render(labFixtures.delight(), { kind: 'stir', at: 1000, now: 1100 }, false, true);
    const friend = pose('character-0');
    expect(friend.opacity).toBe(REDUCED_CUE_DIM);
    expect(friend.rotate).toBe('0deg');
    expect(friend.dy).toBe(0);
    await act(async () => tree.unmount());
    const later = await render(labFixtures.delight(), { kind: 'stir', at: 1000, now: 1400 }, false, true);
    expect(later.pose('character-0').opacity).toBe(1);
    await act(async () => later.tree.unmount());
  });
  it('effects run their clock whatever the system setting, and show in place', async () => {
    timing.configs = [];
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => { tree = TestRenderer.create(<Effects reduced effects={[{ key: 'zzz-1', kind: 'zzz', room: 'home', x: 100, y: 100 }]} />); });
    expect(timing.configs.length).toBeGreaterThan(0);
    for (const c of timing.configs) expect(c?.reduceMotion).toBe('never');
    // Mid-way, each drawn z is visible and still.
    const dots = tree.root.findAll((n) => String(n.type) === 'AnimatedView' && n.props.style?.[1]?.evaluate);
    const progress = tree.root.findAll((n) => n.props.progress)[0].props.progress;
    progress.value = 0.6;
    const seen = dots.map((d) => d.props.style[1].evaluate());
    expect(seen.some((s) => s.opacity > 0.5)).toBe(true);
    const xs = seen.map((s) => s.transform[0].translateX);
    progress.value = 0.8;
    expect(dots.map((d) => d.props.style[1].evaluate().transform[0].translateX)).toEqual(xs);
    await act(async () => tree.unmount());
  });
  it('a painted piece dims in place for half its time; the sink still runs', () => {
    expect(pieceMotion('jar', 0.3, true)).toEqual({ deg: 0, dy: 0, opacity: 0.6 });
    expect(pieceMotion('sink', 0.5, true).opacity).toBe(1);
  });
});
