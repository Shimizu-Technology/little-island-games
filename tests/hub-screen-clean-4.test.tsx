import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyChallenge } from '../src/state/challenge';
import { emptySave } from '../src/state/validation';
import { startSession } from '../src/learn/session';
import { mapLayout } from '../src/hub/model';
import { wordWidth } from '../src/components/wordFit';

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
  C: { cream: '#FCFAF4', soft: '#E8F0EB', ink: '#183F39', blue: '#386C9A', teal: '#1E6B66', line: '#D5E0D8' },
  Copy: 'span',
  Heading: 'h2',
  PressableScale: 'button',
  Sheet: ({ visible, children }: { visible: boolean; children?: React.ReactNode }) =>
    visible ? <aside data-testid="learner-sheet">{children}</aside> : null,
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
  useStore: () => ({ ready: fixture.ready, recovery: fixture.recovery, epoch: 1, save: fixture.save, selectLearner: vi.fn() }),
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
    // Unmocked LearnerChip enforces the 44 pt minimum touch target at every viewport.
    const chip = screen!.root.findByProps({ testID: 'learner-chip' });
    expect(flat(chip.props.style).minHeight).toBeGreaterThanOrEqual(44);
    expect(flat(chip.props.style).justifyContent).toBe('center');
  });

  it.each([2.0, 3.12])('reflows 320×568 header, 4-button dock, and 2-line map labels cleanly at fontScale %s with both resumes active', async fontScale => {
    Object.assign(viewport, { width: 320, height: 568, fontScale });
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

    // 1. Unmocked LearnerChip sits in its own full row and meets >= 44 pt minimum touch target.
    const chip = screen!.root.findByProps({ testID: 'learner-chip' });
    expect(flat(chip.props.style).minHeight).toBeGreaterThanOrEqual(44);
    expect(flat(chip.props.style).justifyContent).toBe('center');
    expect(chip.props.accessibilityLabel).toContain('Family practice');

    // Top bar splits into a clean 2-row header so "little island" and "Family practice" never crush.
    const headerRow = screen!.root.findByProps({ testID: 'hub-header-row' });
    const learnerRow = screen!.root.findByProps({ testID: 'hub-header-learner' });
    expect(headerRow.findByProps({ testID: 'hub-brand' })).toBeDefined();
    expect(learnerRow.findByProps({ testID: 'learner-chip' })).toBe(chip);
    const brandRoom = 320 - 20 - 44 - 44 - 12; // 200 pt
    expect(wordWidth('little island') * 18 * 1.3).toBeLessThanOrEqual(brandRoom);
    const chipTextRoom = 320 - 20 - 24 - 36 - 8; // 232 pt
    expect(wordWidth('Family practice ▾') * 13 * 1.3).toBeLessThanOrEqual(chipTextRoom);

    // 2. Bottom dock wraps into a 2-column grid when 4 buttons are active on a narrow/large-text screen.
    const dock = screen!.root.findByProps({ testID: 'hub-dock' });
    expect(flat(dock.props.style).flexWrap).toBe('wrap');
    const dockButtons = ['hub-dock-continue', 'hub-dock-school', 'hub-dock-ideas', 'hub-dock-favorites'].map(testID =>
      screen!.root.findByProps({ testID }),
    );
    const dockColInnerWidth = (320 - 20 - 8 - 2 - 4) / 2 - 8; // 135 pt
    for (const [button, label] of [
      [dockButtons[0], 'Continue'],
      [dockButtons[1], 'School'],
      [dockButtons[2], 'Try today'],
      [dockButtons[3], 'Favorites'],
    ] as const) {
      const s = flat(button.props.style);
      expect(s.flexBasis, label).toBe('46%');
      expect(s.minWidth, label).toBeGreaterThanOrEqual(128);
      expect(wordWidth(label) * 13 * 1.3, `${label} in ${dockColInnerWidth}pt`).toBeLessThanOrEqual(dockColInnerWidth);
    }

    // 3. HubScreen passes Math.min(fontScale, 2.0) to IslandScene so mapLayout allocates real expanded labelHeight.
    const expectedLayout = mapLayout(320, 590, Math.min(fontScale, 2.0));
    expect(expectedLayout.labelHeight).toBeGreaterThanOrEqual(62);
    const covePill = screen!.root.findByProps({ testID: 'place-label-cove' });
    expect(flat(covePill.props.style).minHeight).toBe(expectedLayout.labelHeight);
    const coveText = covePill.findByType('span');
    expect(coveText.props.numberOfLines).toBe(2);
  });

  it.each([
    [390, 844, 1.0],
    [402, 874, 1.3],
  ])('stacks the header at %s×%s (fontScale %s) so actions never wrap and Family practice fits cleanly', async (width, height, fontScale) => {
    Object.assign(viewport, { width, height, fontScale });
    await act(async () => { screen = create(<HubScreen/>); });

    const headerRow = screen!.root.findByProps({ testID: 'hub-header-row' });
    const learnerRow = screen!.root.findByProps({ testID: 'hub-header-learner' });
    const chip = learnerRow.findByProps({ testID: 'learner-chip' });
    expect(headerRow.findByProps({ testID: 'hub-brand' })).toBeDefined();
    expect(headerRow.findByProps({ testID: 'hub-everything' })).toBeDefined();
    expect(headerRow.findByProps({ testID: 'hub-settings' })).toBeDefined();
    expect(flat(chip.props.style).minHeight).toBeGreaterThanOrEqual(44);
    expect(chip.props.accessibilityLabel).toContain('Family practice');

    const brandRoom = width - 28 - 44 - 44 - 12;
    expect(wordWidth('little island') * 18 * Math.min(fontScale, 1.3)).toBeLessThanOrEqual(brandRoom);
    const chipTextRoom = width - 28 - 24 - 36 - 8;
    expect(wordWidth('Family practice ▾') * 13 * Math.min(fontScale, 1.3)).toBeLessThanOrEqual(chipTextRoom);
  });

  it('keeps the single-row header at 844×390 (fontScale 1.0) with ample room for the learner chip', async () => {
    Object.assign(viewport, { width: 844, height: 390, fontScale: 1.0 });
    await act(async () => { screen = create(<HubScreen/>); });

    expect(screen!.root.findAll(n => n.props.testID === 'hub-header-row')).toHaveLength(0);
    const header = screen!.root.findByProps({ testID: 'hub-header' });
    expect(flat(header.props.style).flexDirection).toBe('row');
    expect(header.findByProps({ testID: 'hub-brand' })).toBeDefined();
    expect(header.findByProps({ testID: 'hub-header-learner' }).findByProps({ testID: 'learner-chip' })).toBeDefined();
    expect(header.findByProps({ testID: 'hub-everything' })).toBeDefined();
    expect(header.findByProps({ testID: 'hub-settings' })).toBeDefined();
  });
});
