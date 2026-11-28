import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { HomeMotionContext } from '../src/home/runtime/HomeMotionContext';
import { SwimBobDriver, WaterRipples } from '../src/home/runtime/Swimming';
import { useDelight } from '../src/home/runtime/useDelight';
import { starterHome } from '../src/home/model';
import { buildScene } from '../src/home/scene/graph';
import { roomPoint } from '../src/home/scene/types';
const harness = vi.hoisted(() => ({ repeat: vi.fn((v: unknown) => ({ loop: v })), cancel: vi.fn(), play: vi.fn(), stop: vi.fn(), cue: vi.fn() }));
vi.mock('react-native', () => ({ View: 'View' }));
vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView' }, Easing: { sin: 'sin', inOut: (v: unknown) => v },
  useSharedValue: (initial: number) => React.useRef({ value: initial, set(v: unknown) { this.value = v as number; } }).current,
  useAnimatedStyle: (fn: () => unknown) => fn(), withTiming: (v: unknown) => v,
  withRepeat: harness.repeat, cancelAnimation: harness.cancel,
}));
vi.mock('../src/home/runtime/homeSound', () => ({ useHomeFeedback: () => ({ play: harness.play, stop: harness.stop, haptic: () => {} }) }));
vi.mock('../src/home/runtime/Effects', () => ({ effectLength: { splash: 900, bubbles: 900, sparkle: 900 } }));
vi.mock('../src/home/runtime/SetPieces', () => ({ pieceSound: {} }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let tree: TestRenderer.ReactTestRenderer | undefined;
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.clearAllMocks(); });

it('runs bob, ripples and kicks only while visible, cancelling on Reduce Motion, leaving the room and unmount', async () => {
  const bob = { value: 0, set(value: unknown) { this.value = value as number; } };
  function Host({ live = true, reduced = false, visible = true }) {
    return <HomeMotionContext.Provider value={visible}>
      <SwimBobDriver live={live} reduced={reduced} swimBob={bob as any}/>
      <WaterRipples slot={0} width={150} height={224} live={live} reduced={reduced} buoyant/>
    </HomeMotionContext.Provider>;
  }
  await act(async () => { tree = TestRenderer.create(<Host/>); });
  expect(harness.repeat).toHaveBeenCalledTimes(2);
  expect(tree!.root.findAllByProps({ testID: 'water-ripples-0' })).toHaveLength(1);
  expect(tree!.root.findAllByProps({ testID: 'swim-kicks-0' })).toHaveLength(1);
  await act(async () => tree!.update(<Host reduced/>));
  expect(bob.value).toBe(0);
  const loops = harness.repeat.mock.calls.length;
  await act(async () => tree!.update(<Host visible={false}/>));
  await act(async () => tree!.update(<Host live={false}/>));
  expect(harness.repeat).toHaveBeenCalledTimes(loops);
  expect(bob.value).toBe(0);
  await act(async () => tree!.update(<Host/>));
  expect(harness.repeat).toHaveBeenCalledTimes(loops + 2);
  const cancellations = harness.cancel.mock.calls.length;
  await act(async () => tree!.unmount()); tree = undefined;
  expect(harness.cancel.mock.calls.length).toBeGreaterThan(cancellations);
  expect(bob.value).toBe(0);
});

it.each([false, true])('tap and move-to-water trigger splash sound, droplets, bubbles, sparkle and cheer (reduced %s)', async reduced => {
  const state = starterHome();
  for (const room of Object.values(state.rooms)) room.characters = [];
  state.rooms['tumon-beach'].characters = [{ slot: 0, anchor: 'floor', pose: 'stand', x: 8, y: 0, at: roomPoint(630, 280) }];
  const scene = buildScene(state), friend = scene.entities['character/0'];
  let delight: ReturnType<typeof useDelight>;
  function Host() { delight = useDelight({ soundOn: true, reduced, cue: harness.cue, getScene: () => scene, cook: () => {} }); return null; }
  await act(async () => { tree = TestRenderer.create(<Host/>); });
  await act(async () => delight!.tapped(friend, {}));
  expect(harness.play).toHaveBeenCalledWith('splash');
  expect(harness.cue).toHaveBeenCalledWith(friend.id, 'hop', undefined);
  expect(delight!.moods[friend.id]).toBe('cheer');
  expect(new Set(delight!.effects.map(e => e.kind))).toEqual(new Set(['splash']).add('bubbles').add('sparkle'));
  await act(async () => delight!.landed({ id: friend.id, room: friend.room, kind: 'floor', contact: friend.contact, attachment: friend.attachment } as any, friend, scene, scene, friend.id));
  expect(harness.play.mock.calls.filter(([sound]) => sound === 'splash').length).toBeGreaterThanOrEqual(2);
  expect(delight!.effects.filter(e => e.kind === 'splash')).toHaveLength(2);
});
