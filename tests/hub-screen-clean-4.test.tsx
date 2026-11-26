import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyChallenge } from '../src/state/challenge';
import { emptySave } from '../src/state/validation';
import { startSession } from '../src/learn/session';

const viewport = vi.hoisted(() => ({ width: 390, height: 844, fontScale: 1 }));
const fixture = vi.hoisted(() => ({
  push: vi.fn(),
  openGame: vi.fn(),
  save: {} as ReturnType<typeof emptySave>,
  ready: true,
  recovery: null as string | null,
}));

vi.mock('react-native', () => ({
  View: 'div',
  ScrollView: 'section',
  Pressable: 'button',
  Image: 'img',
  Platform: { OS: 'ios' },
  StyleSheet: {
    create: (s: object) => s,
    flatten: (s: unknown) => Array.isArray(s) ? Object.assign({}, ...s.flat(9).filter(Boolean)) : s,
  },
  useWindowDimensions: () => viewport,
}));
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'main',
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock('react-native-svg', () => ({
  default: 'svg',
  G: 'g',
  Circle: 'circle',
  Path: 'path',
  Rect: 'rect',
  Ellipse: 'ellipse',
}));
vi.mock('react-native-reanimated', async () => {
  const { useRef } = await import('react');
  return {
    default: { View: 'div', createAnimatedComponent: (c: unknown) => c },
    cancelAnimation: vi.fn(),
    Easing: { out: () => null, cubic: null, inOut: () => null, sin: null },
    useSharedValue: (initial: number) => {
      const ref = useRef<{ value: number; get: () => number; set: (v: number) => void } | null>(null);
      if (!ref.current) {
        const shared = { value: initial, get: () => shared.value, set: (v: number) => { shared.value = v; } };
        ref.current = shared;
      }
      return ref.current;
    },
    useAnimatedStyle: () => ({}),
    withTiming: (v: number) => v,
    withSequence: (...v: number[]) => v.at(-1),
    withDelay: (_: number, v: number) => v,
    withRepeat: (v: number) => v,
  };
});
vi.mock('expo-router', () => ({
  router: { push: fixture.push },
  useIsFocused: () => true,
}));
vi.mock('../src/components/ui', () => ({
  C: { cream: '#FCFAF4', ink: '#183F39', blue: '#386C9A' },
  Heading: 'h2',
  PressableScale: 'button',
}));
vi.mock('../src/components/Text', () => ({ Text: 'span' }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => true }));
vi.mock('../src/components/sheetPresence', () => ({ useSheetsClear: () => true }));
vi.mock('../src/components/Settings', () => ({
  Settings: ({ visible, onClose }: { visible: boolean; onClose: () => void }) =>
    visible ? <aside data-testid="settings-sheet"><button onClick={onClose}>Close settings</button></aside> : null,
}));
vi.mock('../src/components/Recovery', () => ({ Recovery: () => <div data-testid="recovery"/> }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/personalization/LearnerChip', () => ({ LearnerChip: () => <span data-testid="learner-chip"/> }));
vi.mock('../src/personalization/Creator', () => ({ Creator: () => null }));
vi.mock('../src/islander', () => ({ Islander: () => null }));
vi.mock('../src/hub/IslandLife', () => ({ IslandLife: () => null }));
vi.mock('../src/cove/HubCove', async () => {
  const actual = await vi.importActual<typeof import('../src/cove/HubCove')>('../src/cove/HubCove');
  return { ...actual, CovePersonResume: () => null };
});
vi.mock('../src/hub/navigation', async () => {
  const actual = await vi.importActual<typeof import('../src/hub/navigation')>('../src/hub/navigation');
  return { ...actual, openGame: fixture.openGame };
});
vi.mock('../src/ui/icons', async () => (await import('./helpers/cove-ui')).icons());
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false }));
vi.mock('../src/state/Store', () => ({
  useStore: () => ({ ready: fixture.ready, recovery: fixture.recovery, epoch: 1, save: fixture.save }),
}));

const { default: HubScreen } = await import('../src/hub/HubScreen');

let screen: ReactTestRenderer | undefined;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  Object.assign(viewport, { width: 390, height: 844, fontScale: 1 });
  fixture.push.mockReset();
  fixture.openGame.mockReset();
  fixture.ready = true;
  fixture.recovery = null;
  fixture.save = emptySave();
});
afterEach(async () => {
  if (screen) await act(async () => screen!.unmount());
  screen = undefined;
  vi.unstubAllGlobals();
});

const flat = (style: unknown): Record<string, unknown> =>
  Array.isArray(style) ? Object.assign({}, ...style.map(flat)) : (style && typeof style === 'object' ? style as Record<string, unknown> : {});

describe('HubScreen Clean 4.0 6-door map and dock', () => {
  it('renders exactly six illustrated doors, supports 1-tap Cove Continue, School resume, Everything, and Settings', async () => {
    fixture.save = {
      ...fixture.save,
      recentLearn: 'crab-commands',
      learn: { 'crab-commands': startSession('crab-commands', { options: { mode: 'solo', pace: 'easy' } }, undefined, 1) },
      challenge: {
        ...emptyChallenge(),
        paused: [{
          version: 1,
          owner: 'family',
          game: 'sudoku',
          id: 'paused-sudoku',
          ordinal: 1,
          revision: 1,
          puzzle: { bank: 10, puzzle: 0, engine: 'sudoku', rules: 1, hash: 'a'.repeat(64) },
          codec: 'sudoku-v1',
          payload: {},
          selectedDares: [],
          partner: null,
          result: null,
          credited: false,
        }],
      },
    };

    await act(async () => { screen = create(<HubScreen/>); });

    const doors = screen!.root.findAll(n => n.type === 'button' && typeof n.props.testID === 'string' && n.props.testID.startsWith('place-'));
    expect(doors.map(n => n.props.testID)).toEqual(['place-school', 'place-library', 'place-arcade', 'place-hall', 'place-home', 'place-cove']);
    expect(screen!.root.findAll(n => n.type === 'img' && n.props.testID === 'illustrated-art')).toHaveLength(6);

    // 1-tap Puzzle Cove Continue
    const coveContinueBtn = screen!.root.findByProps({ testID: 'hub-dock-continue' });
    await act(async () => coveContinueBtn.props.onPress());
    expect(fixture.push).toHaveBeenLastCalledWith({ pathname: '/cove', params: { game: 'sudoku', resume: '1' } });

    // 1-tap School resume stays alongside Cove Continue
    const schoolBtn = screen!.root.findByProps({ testID: 'hub-dock-school' });
    await act(async () => schoolBtn.props.onPress());
    expect(fixture.openGame).toHaveBeenCalledWith('crab-commands');

    // Try today and Favorites dock actions
    await act(async () => screen!.root.findByProps({ testID: 'hub-dock-ideas' }).props.onPress());
    expect(fixture.push).toHaveBeenLastCalledWith({ pathname: '/everything', params: { section: 'ideas' } });
    await act(async () => screen!.root.findByProps({ testID: 'hub-dock-favorites' }).props.onPress());
    expect(fixture.push).toHaveBeenLastCalledWith({ pathname: '/everything', params: { section: 'favorites' } });

    // Everything top bar button (>= 44x44)
    const everythingBtn = screen!.root.findByProps({ testID: 'hub-everything' });
    expect(flat(everythingBtn.props.style).width).toBeGreaterThanOrEqual(44);
    expect(flat(everythingBtn.props.style).height).toBeGreaterThanOrEqual(44);
    await act(async () => everythingBtn.props.onPress());
    expect(fixture.push).toHaveBeenLastCalledWith('/everything');

    // Settings lock button (>= 44x44) opens and closes Settings
    const settingsBtn = screen!.root.findByProps({ testID: 'hub-settings' });
    expect(flat(settingsBtn.props.style).width).toBeGreaterThanOrEqual(44);
    expect(flat(settingsBtn.props.style).height).toBeGreaterThanOrEqual(44);
    expect(screen!.root.findAll(n => n.props['data-testid'] === 'settings-sheet')).toHaveLength(0);
    await act(async () => settingsBtn.props.onPress());
    expect(screen!.root.findAll(n => n.props['data-testid'] === 'settings-sheet')).toHaveLength(1);
    await act(async () => screen!.root.find(n => n.props['data-testid'] === 'settings-sheet').findByType('button').props.onClick());
    expect(screen!.root.findAll(n => n.props['data-testid'] === 'settings-sheet')).toHaveLength(0);

    // Tapping a map door navigates to its route
    const homeDoor = screen!.root.findByProps({ testID: 'place-home' });
    await act(async () => homeDoor.props.onPress());
    expect(fixture.push).toHaveBeenLastCalledWith('/island-home');
  });

  it.each([
    [320, 568, 1.5],
    [320, 568, 2.0],
    [390, 844, 2.0],
    [844, 390, 1.5],
    [1024, 768, 2.0],
  ])('renders cleanly across viewports %s×%s at fontScale %s', async (width, height, fontScale) => {
    Object.assign(viewport, { width, height, fontScale });
    await act(async () => { screen = create(<HubScreen/>); });
    const doors = screen!.root.findAll(n => n.type === 'button' && typeof n.props.testID === 'string' && n.props.testID.startsWith('place-'));
    expect(doors).toHaveLength(6);
    expect(screen!.root.findAll(n => n.props.testID === 'hub-dock-ideas')).toHaveLength(1);
    expect(screen!.root.findAll(n => n.props.testID === 'hub-dock-favorites')).toHaveLength(1);
  });
});
