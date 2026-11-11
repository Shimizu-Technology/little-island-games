import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HomeScreen } from '../src/home/HomeScreen';
import { starterHome } from '../src/home/model';
import { HINT_IDLE_MS } from '../src/home/runtime/quietHints';
const harness = vi.hoisted(() => ({
  hint: vi.fn(), scene: {} as any, appState: [] as ((s: string) => void)[], focus: [] as (() => void | (() => void))[], blur: [] as (() => void)[],
}));
vi.mock('expo-router', () => ({
  router: {},
  useFocusEffect: (effect: () => void | (() => void)) => {
    React.useEffect(() => {
      harness.focus.push(effect);
      const cleanup = effect();
      if (cleanup) harness.blur.push(cleanup);
    }, [effect]);
  },
}));
vi.mock('react-native', () => ({ View: 'View', Text: 'Text', Pressable: 'Pressable', Platform: { OS: 'ios' },
  AppState: { currentState: 'active', addEventListener: (_: string, fn: (s: string) => void) => { harness.appState.push(fn); return { remove() {} }; } },
  useWindowDimensions: () => ({ width: 390, height: 844 }) }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock('react-native-reanimated', () => ({ default: { View: 'AnimatedView' }, useSharedValue: (v: any) => { const ref = React.useRef(v); return { get: () => ref.current, set: (n: any) => { ref.current = n; } }; }, useAnimatedStyle: () => ({}) }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => false }));
vi.mock('../src/state/Store', () => ({ useStore: () => ({ save: { settings: {} } }) }));
vi.mock('../src/components/Audio', () => ({ useSounds: () => () => {} }));
vi.mock('../src/home/runtime/useIdleCharacters', () => ({ useIdleCharacters: () => ({ sleeping: {}, wake: () => {} }) }));
vi.mock('../src/home/runtime/useInteraction', () => ({ useInteraction: () => ({ isCurrent: () => true, finish: () => {}, camera: { get: () => ({ a: .5, b: 0, c: 0, d: .5, tx: 0, ty: 0 }), set: () => {} }, slots: { get: () => [{}, {}] }, cancelAll: () => {}, animateCamera: () => {}, showHint: harness.hint, dropZones: { set: () => {} } }) }));
vi.mock('../src/home/runtime/SceneView', () => ({ SceneView: (props: any) => { harness.scene = props; return null; } }));
vi.mock('../src/home/runtime/HomeChrome', () => ({ HomeChrome: () => null, Tool: () => null, navigationHeight: 60, navigationHeightFor: () => 60 }));
vi.mock('../src/home/runtime/HomePanels', () => ({ HomePanels: () => null }));
vi.mock('../src/home/runtime/DesignTools', () => ({ DesignTools: () => null, portraitDrawerHeight: 200, portraitDrawerHeightFor: () => 200 }));
vi.mock('../src/home/runtime/StagingTray', () => ({ StagingTray: () => null }));
vi.mock('../src/home/runtime/Destinations', () => ({ Destinations: () => null }));
vi.mock('../src/home/runtime/DebugOverlay', () => ({ DebugOverlay: () => null }));
vi.mock('../src/home/runtime/FriendDrawer', () => ({ FriendDrawer: () => null }));
vi.mock('../src/home/runtime/CapacityCue', () => ({ CapacityCue: () => null, CAPACITY_CUE_MS: 3200, CAPACITY_MESSAGE: 'Put something away to make room.' }));
vi.mock('../src/home/art/Items', () => ({ ItemArt: () => null }));
vi.mock('../src/home/art/More', () => ({ MoreItemArt: () => null }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
vi.stubGlobal('requestAnimationFrame', () => 1);
vi.stubGlobal('cancelAnimationFrame', () => {});
let root: ReturnType<typeof create> | undefined;
beforeEach(() => { vi.useFakeTimers(); harness.hint.mockClear(); harness.appState.length = 0; harness.blur.length = 0; });
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.useRealTimers(); });
const appState = (state: string) => act(async () => { for (const fn of harness.appState) fn(state); });

it('R2: a Beach with nothing to hint at schedules nothing more after the quiet deadline', async () => {
  const state = starterHome(); state.current = 'beach';
  const spy = vi.spyOn(globalThis, 'setTimeout');
  await act(async () => { root = create(<HomeScreen initialState={state} persist={() => true} />); });
  spy.mockClear();
  await act(async () => { vi.advanceTimersByTime(HINT_IDLE_MS + 100); });
  const immediate = spy.mock.calls.filter((call) => Number(call[1] ?? 0) <= 16).length;
  expect(harness.hint).not.toHaveBeenCalled();
  expect(immediate).toBeLessThanOrEqual(1);
  // And nothing waits on a long quiet either.
  spy.mockClear();
  await act(async () => { vi.advanceTimersByTime(60_000); });
  expect(spy.mock.calls.length).toBe(0);
  expect(harness.hint).not.toHaveBeenCalled();
  spy.mockRestore();
});
it('R3: backgrounded, Home stops the life clock and hints; back in front, a fresh quiet spell starts', async () => {
  await act(async () => { root = create(<HomeScreen initialState={starterHome()} persist={() => true} />); });
  expect(harness.scene.liveRoom).toBe('home');
  await act(async () => { vi.advanceTimersByTime(3000); });
  await appState('background');
  expect(harness.scene.liveRoom).toBeUndefined();
  await act(async () => { vi.advanceTimersByTime(60_000); });
  expect(harness.hint).not.toHaveBeenCalled();
  await appState('active');
  expect(harness.scene.liveRoom).toBe('home');
  // A fresh 6 s quiet, not the old deadline that passed while away.
  await act(async () => { vi.advanceTimersByTime(HINT_IDLE_MS - 200); });
  expect(harness.hint).not.toHaveBeenCalled();
  await act(async () => { vi.advanceTimersByTime(400); });
  expect(harness.hint).toHaveBeenCalledTimes(1);
});
it('R3: hidden behind another screen, Home is quiet too, and resumes on focus', async () => {
  await act(async () => { root = create(<HomeScreen initialState={starterHome()} persist={() => true} />); });
  await act(async () => { for (const blur of harness.blur.splice(0)) blur(); });
  expect(harness.scene.liveRoom).toBeUndefined();
  await act(async () => { vi.advanceTimersByTime(60_000); });
  expect(harness.hint).not.toHaveBeenCalled();
  await act(async () => { harness.focus.at(-1)!(); });
  expect(harness.scene.liveRoom).toBe('home');
  await act(async () => { vi.advanceTimersByTime(HINT_IDLE_MS + 200); });
  expect(harness.hint).toHaveBeenCalledTimes(1);
});
it('R3: an inactive app (Control Centre, app switcher) is not on screen either', async () => {
  await act(async () => { root = create(<HomeScreen initialState={starterHome()} persist={() => true} />); });
  await appState('inactive');
  expect(harness.scene.liveRoom).toBeUndefined();
});
