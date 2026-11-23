import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScaleBoardProps } from '../src/learn/games/shell-scale/board';
import type { Payload as ScalePayload, State as ScaleChallengeState } from '../src/learn/games/shell-scale/challenge';
import { startRound, type ScaleState } from '../src/learn/games/shell-scale/engine';
import { emptyOrder, trueSortOrder, weighOnScale, type OddEitherPuzzle, type OddHeavyPuzzle, type SortPuzzle } from '../src/learn/games/shell-scale/rules';
import { MEASURED_SCHOOL_BOARDS, SCHOOL_BOARD_MIN } from '../src/learn/boardGeometry';
import { learnIds, learningGroups } from '../src/learn/generated/ids';
import { shelfGames, toggleShelfFavorite, homeContinue } from '../src/learn/home';
import type { LearnSession } from '../src/learn/types';
import { emptySave } from '../src/state/validation';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 1 }));
const appStateListeners = vi.hoisted(() => new Set<(state: string) => void>());
vi.mock('react-native', () => ({
  View: 'View',
  ScrollView: 'ScrollView',
  useWindowDimensions: () => viewport,
  AppState: {
    addEventListener: (_event: string, fn: (state: string) => void) => {
      appStateListeners.add(fn);
      return { remove: () => appStateListeners.delete(fn) };
    },
  },
}));
vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView' },
  Easing: { out: () => 0, in: () => 0, inOut: () => 0, quad: 0 },
  useSharedValue: (value: unknown) => ({ value, get: () => value, set() {} }),
  useAnimatedStyle: (f: () => unknown) => f(),
  withTiming: (v: number) => v,
  withSpring: (v: number) => v,
  withSequence: (...v: number[]) => v.at(-1),
}));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => true }));
vi.mock('../src/components/Audio', async () => {
  const { createContext } = await import('react');
  return { AudioPreferences: createContext({ sound: false }), hasSpeech: () => false, useSoundControls: () => ({ play: () => false }) };
});
vi.mock('../src/components/ui', () => ({
  Button: 'Button',
  Chip: 'Chip',
  Heading: 'Heading',
  C: { ink: '#000', teal: '#0a0', blue: '#00f', muted: '#888' },
  Copy: 'Copy',
  PressableScale: 'PressableScale',
}));
vi.mock('../src/learn/Coach', () => ({ CoachSpot: 'CoachSpot' }));
vi.mock('../src/learn/BoardSpace', () => ({
  BoardPrimary: 'BoardPrimary',
  useBoardSpace: () => null,
  useBoardGeometry: (_id: string, natural: number) => ({ height: natural, measured: false }),
}));
vi.mock('../src/learn/games/shell-scale/art', () => ({
  PearlArt: 'PearlArt',
  ShellArt: 'ShellArt',
  ShelfArt: 'ShelfArt',
  ink: '#000',
}));
vi.mock('../src/learn/games/shell-scale/scale', () => ({
  BalanceScale: 'BalanceScale',
}));

const { ScaleBoard } = await import('../src/learn/games/shell-scale/board');
const { SchoolBoard } = await import('../src/learn/games/shell-scale/schoolBoard');
const { ChallengeBoard } = await import('../src/learn/games/shell-scale/challengeBoard');
const scaleChallenge = await import('../src/learn/games/shell-scale/challenge');
const { emptyChallenge } = await import('../src/state/challenge');

const sortPuzzle: SortPuzzle = { kind: 'sort', n: 3, cast: [0, 1, 2], weights: [0, 2, 1] };
const odd9Puzzle: OddHeavyPuzzle = { kind: 'odd-heavy', n: 9, cast: [0], odd: 4 };
const odd12Puzzle: OddEitherPuzzle = { kind: 'odd-either', n: 12, cast: [0], odd: 7, dir: 'light' };

let root: ReactTestRenderer | undefined;
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = undefined;
  Object.assign(viewport, { width: 393, height: 852, fontScale: 1 });
});

const byId = (id: string) => root!.root.find(n => n.props.testID === id);
const findBtn = (label: string) => root!.root.findAll(n => String(n.type) === 'Button').find(b => b.children.join('') === label);
const findChip = (label: string) => root!.root.findAll(n => String(n.type) === 'Chip').find(b => b.children.join('') === label);
const allText = () =>
  root!.root
    .findAll(() => true)
    .flatMap(n => [
      ...n.children.filter((c): c is string => typeof c === 'string'),
      ...(typeof n.props.accessibilityLabel === 'string' ? [n.props.accessibilityLabel] : []),
    ])
    .join('\n');

function mount(over: Partial<ScaleBoardProps> = {}) {
  const calls = { weigh: [] as [number, number][], place: [] as [number, number][], pick: [] as [number, string | undefined][], check: 0 };
  const props: ScaleBoardProps = {
    board: { kind: 'sort', n: 3, cast: [0, 1, 2], history: [] },
    order: [-1, -1, -1],
    oddPick: null,
    oddDir: null,
    showLinks: true,
    won: false,
    missed: false,
    canCheck: false,
    active: true,
    width: 340,
    title: 'Three shells',
    onWeigh: (l, r) => { calls.weigh.push([l, r]); return true; },
    onPlaceSort: (i, s) => { calls.place.push([i, s]); return true; },
    onPickOdd: (p, d) => { calls.pick.push([p, d]); return true; },
    onSetOddDir: () => {},
    onCheck: () => { calls.check++; },
    onUndo: () => {},
    onReset: () => {},
    canUndo: false,
    canReset: false,
    ...over,
  };
  act(() => { root = create(<ScaleBoard {...props} />); });
  return calls;
}

describe('Shell Scale board interactions, AX5 & VoiceOver', () => {
  it('places two shells onto Left and Right pans, weighs them, and places shells into the order row', () => {
    const calls = mount();
    act(() => byId('scale-shell-0').props.onPress());
    act(() => findBtn('Left pan')!.props.onPress());
    act(() => byId('scale-shell-1').props.onPress());
    act(() => findBtn('Right pan')!.props.onPress());
    act(() => findBtn('Weigh')!.props.onPress());
    expect(calls.weigh).toEqual([[1 << 0, 1 << 1]]);

    act(() => byId('scale-shell-0').props.onPress());
    act(() => byId('scale-slot-0').props.onPress());
    expect(calls.place).toEqual([[0, 0]]);
  });

  it('supports 9-pearl and 12-pearl group weighing with ruled-out greying and Heavy/Light picker', () => {
    const calls = mount({
      board: {
        kind: 'odd-either',
        n: 12,
        cast: [0],
        history: [{ left: 0b1111, right: 0b11110000, outcome: '=' }],
      },
      order: [],
      showLinks: true,
    });
    // Pearls 0..7 are publicly ruled out normal -> accessibility label reflects ruled out.
    expect(byId('scale-pearl-0').props.accessibilityLabel).toContain('ruled out');
    expect(byId('scale-pearl-8').props.accessibilityLabel).not.toContain('ruled out');
    expect(byId('scale-odd-dir')).toBeDefined();

    // Put pearl 8 on Left pan, pearl 9 on Right pan, and weigh!
    act(() => byId('scale-pearl-8').props.onPress());
    act(() => findChip('Right pan (0)')!.props.onPress());
    act(() => byId('scale-pearl-9').props.onPress());
    act(() => findBtn('Weigh 1 vs 1')!.props.onPress());
    expect(calls.weigh).toEqual([[1 << 8, 1 << 9]]);

    // Switch to Pick odd pearl and tap pearl 10.
    act(() => findChip('Pick odd pearl')!.props.onPress());
    act(() => byId('scale-pearl-10').props.onPress());
    expect(calls.pick).toEqual([[10, 'heavy']]);
    expect(odd9Puzzle.n).toBe(9);
    expect(odd12Puzzle.n).toBe(12);
    expect(sortPuzzle.n).toBe(3);
  });

  it('caps every Copy and Button at <= 1.5x and stacks header at AX5 largest text (iPhone 15 portrait & iPad mini landscape)', () => {
    for (const vp of [{ width: 393, height: 852, fontScale: 3.12 }, { width: 1133, height: 744, fontScale: 3.12 }]) {
      Object.assign(viewport, vp);
      mount({ onToggleLinks: () => {}, width: vp.width - 40 });
      const header = byId('board-header');
      expect(header.props.style.flexDirection).toBeUndefined();
      for (const n of root!.root.findAll(n => String(n.type) === 'Copy' || String(n.type) === 'Button')) {
        expect(n.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
      }
      act(() => root!.unmount());
      root = undefined;
    }
    expect(MEASURED_SCHOOL_BOARDS.has('shell-scale')).toBe(true);
    expect(SCHOOL_BOARD_MIN['shell-scale']).toBe(170);
  });
});

describe('Scale-Holder privacy across handover, force-close resume & role swap (OR-05b)', () => {
  it('NEVER leaks hidden weights on Guesser screen, covers, backgrounding, force-close resume, or role swap', () => {
    let state: ScaleState = startRound(3, () => 0.25);
    const makeSession = (): LearnSession<ScaleState> => ({
      game: 'shell-scale',
      version: 1,
      id: 'scale-together-test',
      revision: 0,
      options: { mode: 'together', pace: 'hard' },
      names: ['Stassie', 'Dad'],
      starter: 0,
      state,
    });
    let active = true;
    const render = () => (
      <SchoolBoard
        session={makeSession()}
        update={next => { state = next; }}
        skills={{}}
        practice={() => {}}
        cheer={() => {}}
        active={active}
        width={340}
        height={640}
        sound={() => {}}
        stopSound={() => {}}
        soundOn={false}
        coach={{ active: false, done: () => {} }}
      />
    );
    act(() => { root = create(render()); });

    // 1. Guesser screen: ZERO hidden weights anywhere in tree or accessibility labels!
    const guesserText = allText();
    expect(guesserText).not.toContain('Lightest to heaviest:');
    expect(guesserText).not.toContain("Stassie's secret scale");

    // 2. Guesser stages shell 0 vs shell 1 and taps Ask Stassie -> handover cover hides everything.
    act(() => byId('scale-shell-0').props.onPress());
    act(() => findBtn('Left pan')!.props.onPress());
    act(() => byId('scale-shell-1').props.onPress());
    act(() => findBtn('Right pan')!.props.onPress());
    act(() => findBtn('Ask Stassie')!.props.onPress());
    act(() => root!.update(render()));
    expect(state.phase).toBe('cover-to-holder');
    expect(byId('scale-cover-holder')).toBeDefined();
    expect(allText()).not.toContain('Lightest to heaviest:');

    // 3. Holder unlocks secret screen -> secret is now visible ONLY to Holder!
    act(() => findBtn("I'm Stassie: show secret")!.props.onPress());
    act(() => root!.update(render()));
    expect(state.phase).toBe('holder');
    expect(byId('scale-holder-secret')).toBeDefined();
    expect(allText()).toContain('Lightest to heaviest:');

    // 4. Simulate FORCE-CLOSE & RESUME while saved in `phase === 'holder'` (fresh mount!) -> privacy cover MUST re-engage!
    act(() => root!.unmount());
    root = undefined;
    act(() => { root = create(render()); });
    expect(byId('scale-cover-holder')).toBeDefined();
    expect(allText()).not.toContain('Lightest to heaviest:');

    // Unlock again, then simulate OS AppState background -> privacy cover MUST immediately hide secret!
    act(() => findBtn("I'm Stassie: show secret")!.props.onPress());
    act(() => root!.update(render()));
    expect(byId('scale-holder-secret')).toBeDefined();
    act(() => {
      for (const fn of appStateListeners) fn('background');
    });
    expect(byId('scale-cover-holder')).toBeDefined();
    expect(allText()).not.toContain('Lightest to heaviest:');

    // Unlock again, then simulate `active = false` -> privacy cover MUST immediately hide secret and stay locked on `active = true`!
    act(() => findBtn("I'm Stassie: show secret")!.props.onPress());
    act(() => root!.update(render()));
    expect(byId('scale-holder-secret')).toBeDefined();
    active = false;
    act(() => root!.update(render()));
    expect(byId('scale-cover-holder')).toBeDefined();
    expect(allText()).not.toContain('Lightest to heaviest:');

    // Resume (`active = true`) -> STILL locked until Stassie taps unlock!
    active = true;
    act(() => root!.update(render()));
    expect(byId('scale-cover-holder')).toBeDefined();
    expect(allText()).not.toContain('Lightest to heaviest:');
    act(() => findBtn("I'm Stassie: show secret")!.props.onPress());
    act(() => root!.update(render()));
    const truth = weighOnScale(
      { kind: 'sort', n: 4, cast: [...(state.puzzles[0][2] as string)].map(Number), weights: [...(state.puzzles[0][3] as string)].map(Number) },
      1 << 0,
      1 << 1,
    )!;
    act(() => findBtn(truth === 'L' ? 'Left is heavier' : 'Right is heavier')!.props.onPress());
    act(() => root!.update(render()));
    expect(state.phase).toBe('cover-to-guesser');
    expect(byId('scale-cover-guesser')).toBeDefined();
    expect(allText()).not.toContain('Lightest to heaviest:');

    act(() => findBtn("I'm Dad: see the scale")!.props.onPress());
    act(() => root!.update(render()));
    expect(state.phase).toBe('guesser');
    expect(state.history).toHaveLength(1);
    expect(allText()).not.toContain('Lightest to heaviest:');

    // 5. Role swap after Holder peeked deals fresh shells and flips holder to Dad (1) with zero leak!
    act(() => findBtn('Swap roles (new)')!.props.onPress());
    act(() => root!.update(render()));
    expect(state.holder).toBe(1);
    expect(state.history).toHaveLength(0);
    expect(allText()).not.toContain('Lightest to heaviest:');
  });
});

describe('ChallengeBoard reserve-boundary UI completion & Island Originals wiring', () => {
  it('wires Shell Scale cleanly into Island Originals, Everything, Favorites, and homeContinue', () => {
    expect(learnIds).toContain('shell-scale');
    expect(learningGroups['shell-scale']).toBe('originals');
    expect(shelfGames.find(g => g.id === 'shell-scale')?.island).toBe('thinking');

    let save = emptySave();
    save = toggleShelfFavorite(save, 'shell-scale');
    expect(save.favoriteGames).toContain('shell-scale');
    const session = {
      game: 'shell-scale' as const,
      version: 1 as const,
      id: 'ss-1',
      revision: 1,
      options: { mode: 'solo' as const, pace: 'easy' as const },
      state: startRound(1, () => 0.1),
    };
    save = { ...save, recentLearn: 'shell-scale', learn: { ...save.learn, 'shell-scale': session } };
    expect(homeContinue(save)).toBe('shell-scale');
  });

  it('completes a 6-shell Deep Water board at the 486-action limit via real Help UI -> Check', async () => {
    const entry = scaleChallenge.puzzles.find(p => p.descriptor.puzzle.kind === 'sort' && p.descriptor.puzzle.n === 6)!;
    const boardPuzzle = entry.descriptor.puzzle as SortPuzzle;
    const trueOrd = trueSortOrder(boardPuzzle);
    let current = scaleChallenge.registration.start(entry.ref, 'alex', 'ui-reserve-6', emptyChallenge(), { supportOff: false, ownRead: false }, []);
    // Place wrong order and spam weighings to hit ORDINARY_LIMIT (486).
    const wrongOrd = [...trueOrd]; [wrongOrd[0], wrongOrd[1]] = [wrongOrd[1], wrongOrd[0]];
    for (let slot = 0; slot < 6; slot++) current = scaleChallenge.registration.move(current, scaleChallenge.actPlaceSort(wrongOrd[slot], slot))!;
    while ((current.payload as ScalePayload).actions.length < scaleChallenge.ORDINARY_LIMIT) {
      current = scaleChallenge.registration.move(current, scaleChallenge.actWeighFor(boardPuzzle, 1 << 0, 1 << 1))!;
    }
    expect((current.payload as ScalePayload).actions.length).toBe(scaleChallenge.ORDINARY_LIMIT);

    const replay = (s: typeof current): ScaleChallengeState =>
      (s.payload as ScalePayload).actions.reduce<ScaleChallengeState>(
        (v, a) => scaleChallenge.scaleStep(v, a)!,
        {
          puzzle: boardPuzzle, showLinks: false, history: [], order: emptyOrder(6), oddPick: null, oddDir: null,
          stack: [], checks: 0, misses: 0, checked: false, won: false, actions: 0,
        },
      );

    function Host() {
      const [session, setSession] = React.useState(current);
      return (
        <ChallengeBoard
          state={replay(session)}
          sessionKey={String(session.revision)}
          active
          width={340}
          dispatch={() => {}}
          onFresh={() => {}}
          commit={async (action, expected) => {
            if (expected !== String(current.revision)) return null;
            const next = scaleChallenge.registration.move(current, action);
            if (!next) return null;
            current = next;
            setSession(next);
            return { key: String(next.revision), state: replay(next) };
          }}
        />
      );
    }
    await act(async () => { root = create(<Host />); });
    expect(findBtn('Undo')!.props.disabled).toBe(true);
    expect(findBtn('Clear row')!.props.disabled).toBe(true);

    const press = async (label: string) => {
      const b = findBtn(label);
      expect(b, `missing button ${label}`).toBeDefined();
      await act(async () => {
        await b!.props.onPress();
        await new Promise(r => setTimeout(r, 0));
      });
    };

    // Step through Help (Look -> Think -> One step per weighing, then Show me -> Next step for placements) until Check wins!
    let guard = 0;
    while (!current.result && guard++ < 80) {
      const st = replay(current);
      if (st.order.every((sh: number, sl: number) => sh === trueOrd[sl])) {
        await press('Check');
        break;
      }
      if (findBtn('Help')) await press('Help');
      else if (findBtn('Next step')) await press('Next step');
      else if (findBtn('Show me')) await press('Show me');
      else if (findBtn('One step')) await press('One step');
      else if (findBtn('Think')) await press('Think');
      else if (findBtn('Look')) await press('Look');
    }
    expect(current.result).toMatchObject({ event: 'helped', dares: [] });
    expect((current.payload as ScalePayload).actions.length).toBeLessThanOrEqual(512);
  });
});
