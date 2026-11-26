import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HomeScreen } from '../src/home/HomeScreen';
import { starterHome, instance, type HomeAction } from '../src/home/model';
import { editHistory, restoredHistory, savedHistory, RESTORE_NOTE, UNDO_FULL_MESSAGE, UNDO_TRIMMED_NOTE } from '../src/home/useHomeStore';
import twentySteps from './fixtures/home-undo-legacy/twenty-steps.json';
const harness = vi.hoisted(() => ({ chrome: {} as any, design: {} as any, announce: [] as string[] }));
vi.mock('expo-router', () => ({ router: {}, useFocusEffect: (effect: () => void | (() => void)) => { React.useEffect(() => effect(), [effect]); } }));
vi.mock('react-native', () => ({ View: 'View', Text: 'Text', Pressable: 'Pressable', Platform: { OS: 'ios' },
  AccessibilityInfo: { announceForAccessibility: (text: string) => { harness.announce.push(text); }, sendAccessibilityEvent: () => {} },
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  useWindowDimensions: () => ({ width: 390, height: 844 }) }));
vi.mock('react-native-svg', () => ({ default: 'Svg', Circle: 'Circle', Path: 'Path', Rect: 'Rect' }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock('react-native-reanimated', () => ({ default: { View: 'AnimatedView' }, useSharedValue: (v: any) => { const ref = React.useRef(v); return { get: () => ref.current, set: (n: any) => { ref.current = n; } }; }, useAnimatedStyle: () => ({}) }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => false }));
vi.mock('../src/state/Store', () => ({ useStore: () => ({ save: { settings: {} } }) }));
vi.mock('../src/components/Audio', () => ({ useSounds: () => () => {} }));
vi.mock('../src/home/runtime/useIdleCharacters', () => ({ useIdleCharacters: () => ({ sleeping: {}, wake: () => {} }) }));
vi.mock('../src/home/runtime/useInteraction', () => ({ useInteraction: () => ({ isCurrent: () => true, finish: () => {}, camera: { get: () => ({ a: .5, b: 0, c: 0, d: .5, tx: 0, ty: 0 }), set: () => {} }, slots: { get: () => [{}, {}] }, cancelAll: () => {}, animateCamera: () => {}, showHint: () => {}, dropZones: { set: () => {} } }) }));
vi.mock('../src/home/runtime/SceneView', () => ({ SceneView: () => null }));
vi.mock('../src/home/runtime/HomeChrome', () => ({ HomeChrome: (p: any) => { harness.chrome = p; return null; }, Tool: () => null, navigationHeight: 60, navigationHeightFor: () => 60 }));
vi.mock('../src/home/runtime/HomePanels', () => ({ HomePanels: () => null }));
vi.mock('../src/home/HomeClosetSheet', () => ({ HomeClosetSheet: () => null }));
vi.mock('../src/home/HomeBadgesSheet', () => ({ HomeBadgesSheet: () => null }));
vi.mock('../src/home/runtime/DesignTools', () => ({ DesignTools: (p: any) => { harness.design = p; return null; }, portraitDrawerHeight: 200, portraitDrawerHeightFor: () => 200 }));
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
beforeEach(() => { vi.useFakeTimers(); harness.announce.length = 0; });
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.useRealTimers(); });
const flat = (style: any): any => Array.isArray(style) ? Object.assign({}, ...style.map(flat)) : style || {};
const note = () => root!.root.findAll((n) => n.props.testID === 'undo-note' && (n.type as unknown) === 'Pressable');
/** Text a sighted child can't see: the old 1x1 clipped region. */
const hidden = () => root!.root.findAll((n) => (n.type as unknown) === 'Text' && flat(n.props.style).width === 1).map((n) => String(n.props.children));

it('F3: the reviewer\'s 246-thing room restores once confirmed, with a visible note the screen reader hears too', async () => {
  const state = starterHome();
  state.rooms.home.instances.push(...Array.from({ length: 240 }, (_, i) => ({ ...instance(`keepsake-${i}`, 'shell', 0, 0), staged: true as const })));
  const saves: any[] = [];
  await act(async () => { root = create(<HomeScreen initialState={state} persist={(s) => { saves.push(s); return true; }} />); });
  await act(async () => harness.chrome.onDesign());
  expect(harness.design.restoreCost()).toBe('no-undo');
  await act(async () => harness.design.onRestoreAnyway());
  expect(saves).toHaveLength(1);
  expect(harness.design.state.rooms.home.instances).toHaveLength(6);
  expect(note()).toHaveLength(1);
  expect(note()[0].props.accessibilityLabel).toBe(RESTORE_NOTE['no-undo']);
  expect(note()[0].findAll((n) => (n.type as unknown) === 'Text' && n.props.accessible !== false).map((n) => n.props.children)).toEqual([RESTORE_NOTE['no-undo']]);
  // A visible cross says it can be tapped away.
  expect(note()[0].findAll((n) => (n.type as unknown) === 'Text' && n.props.children === '✕')).toHaveLength(1);
  expect(note()[0].findAll((n) => (n.type as unknown) === 'Svg')).toHaveLength(1);
  expect(harness.announce).toContain(RESTORE_NOTE['no-undo']);
  expect(hidden().join('')).not.toMatch(/undo/i);
  // Reading is never timed: it stays until the child taps it.
  await act(async () => { vi.advanceTimersByTime(60_000); });
  expect(note()).toHaveLength(1);
  await act(async () => note()[0].props.onPress());
  expect(note()).toHaveLength(0);
  // R3-F2: dismissed, its words don't come back in the hidden region either.
  expect(hidden().join('')).toBe('');
});
it('F3 drops-older on the real screen: the note shows, and once dismissed the hidden region stays blank', async () => {
  const state = starterHome();
  for (const room of ['kitchen', 'home'] as const)
    state.rooms[room].instances.push(...Array.from({ length: 48 }, (_, i) => ({ ...instance(`${room}-${i}`, 'shell', 0, 0), staged: true as const })));
  // The Kitchen basket was restored earlier, so its removal is in the saved undo.
  const saved = savedHistory(editHistory(restoredHistory(state), { type: 'reset', roomId: 'kitchen' } as HomeAction));
  expect(saved.undo?.steps).toHaveLength(1);
  const saves: any[] = [];
  await act(async () => { root = create(<HomeScreen initialState={saved} persist={(s) => { saves.push(s); return true; }} />); });
  await act(async () => harness.chrome.onDesign());
  expect(harness.design.restoreCost()).toBe('drops-older');
  await act(async () => harness.design.onRestoreAnyway());
  expect(saves).toHaveLength(1);
  expect(note().map((n) => n.props.accessibilityLabel)).toEqual([RESTORE_NOTE['drops-older']]);
  expect(harness.announce).toContain(RESTORE_NOTE['drops-older']);
  expect(hidden().join('')).toBe('');
  await act(async () => note()[0].props.onPress());
  expect(note()).toHaveLength(0);
  expect(hidden().join('')).toBe('');
});
it('F3: a refusal is never silent either: it shows the same kind of note', async () => {
  const state = starterHome();
  state.rooms.home.instances.push(...Array.from({ length: 240 }, (_, i) => ({ ...instance(`keepsake-${i}`, 'shell', 0, 0), staged: true as const })));
  const saves: any[] = [];
  await act(async () => { root = create(<HomeScreen initialState={state} persist={(s) => { saves.push(s); return true; }} />); });
  await act(async () => harness.chrome.onDesign());
  await act(async () => harness.design.dispatch({ type: 'reset' }));
  expect(saves).toHaveLength(0);
  expect(note().map((n) => n.props.accessibilityLabel)).toEqual([UNDO_FULL_MESSAGE]);
  expect(hidden().join('')).not.toMatch(/undo/i);
  // R3-F2: dismissed, the refusal stays out of the hidden region.
  await act(async () => note()[0].props.onPress());
  expect(note()).toHaveLength(0);
  expect(hidden().join('')).toBe('');
  // A second refusal is news again.
  await act(async () => harness.design.dispatch({ type: 'reset' }));
  expect(note().map((n) => n.props.accessibilityLabel)).toEqual([UNDO_FULL_MESSAGE]);
  // The next message replaces it.
  await act(async () => harness.design.dispatch({ type: 'theme', wallpaper: 'lagoon' }));
  expect(saves).toHaveLength(1);
  expect(note()).toHaveLength(0);
  expect(hidden().join('')).not.toBe('');
});
it('R3-F1: the first edit on a Home saved by the previous head succeeds and shows the note once', async () => {
  const state = JSON.parse(JSON.stringify(twentySteps));
  const saves: any[] = [];
  await act(async () => { root = create(<HomeScreen initialState={state} persist={(s) => { saves.push(s); return true; }} />); });
  expect(note()).toHaveLength(0);
  await act(async () => harness.chrome.onDesign());
  await act(async () => harness.design.dispatch({ type: 'theme', wallpaper: 'lagoon' }));
  expect(saves).toHaveLength(1);
  expect(note().map((n) => n.props.accessibilityLabel)).toEqual([UNDO_TRIMMED_NOTE]);
  // Undo still works for the newer steps, so the picture is the crossed arrow alone, not a restored room.
  expect(note()[0].findAll((n) => (n.type as unknown) === 'Rect')).toHaveLength(0);
  expect(harness.announce).toContain(UNDO_TRIMMED_NOTE);
  expect(hidden().join('')).toBe('');
  await act(async () => note()[0].props.onPress());
  expect(note()).toHaveLength(0);
  expect(hidden().join('')).toBe('');
  await act(async () => harness.design.dispatch({ type: 'theme', wallpaper: 'cream' }));
  expect(saves).toHaveLength(2);
  expect(note()).toHaveLength(0);
});
