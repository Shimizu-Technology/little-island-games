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
import { addLearner, selectLearner } from '../src/learn/learners';
import { recordLevelRound } from '../src/learn/levelEvidence';
import { optionsAtLevel } from '../src/learn/levels';
import { roundStars } from '../src/learn/schoolProgress';
import { startSession } from '../src/learn/session';
import type { LearnSession } from '../src/learn/types';
import { progressFor } from '../src/state/challengeDrafts';
import { applyLearnSave } from '../src/state/learnAction';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { unpack } from '../src/state/saveBits';
import { emptySave, parseSave } from '../src/state/validation';
import '../src/challenge/catalog';

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
      expect(header.props.style.flexDirection).toBe(vp.width - 40 < 560 ? undefined : 'row');
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

  it('P1-2 UI: Random Practice keeps certified draft & Undo intact and offers Back to certified round after solve & relaunch', () => {
    let state: ScaleState = startRound(3, () => 0.25);
    const certifiedTuple = state.puzzles[0].join('|');
    const makeSession = (): LearnSession<ScaleState> => ({
      game: 'shell-scale',
      version: 1,
      id: 'scale-practice-preserve',
      revision: 0,
      options: { mode: 'solo', pace: 'hard' },
      state,
    });
    const render = () => (
      <SchoolBoard
        session={makeSession()}
        update={next => { state = next; }}
        skills={{}}
        practice={() => {}}
        cheer={() => {}}
        active
        width={340}
        height={640}
        sound={() => {}}
        stopSound={() => {}}
        soundOn={false}
        coach={{ active: false, done: () => {} }}
      />
    );
    act(() => { root = create(render()); });

    // Weigh once and place shell 0 into slot 0 on the certified board.
    act(() => byId('scale-shell-0').props.onPress());
    act(() => findBtn('Left pan')!.props.onPress());
    act(() => byId('scale-shell-1').props.onPress());
    act(() => findBtn('Right pan')!.props.onPress());
    act(() => findBtn('Weigh')!.props.onPress());
    act(() => root!.update(render()));
    act(() => byId('scale-shell-0').props.onPress());
    act(() => byId('scale-slot-0').props.onPress());
    act(() => root!.update(render()));
    expect(state.history).toHaveLength(1);
    expect(state.order[0]).toBe(0);
    expect(state.undo).toHaveLength(1);

    // Open Random Practice (2 shells) and solve it!
    act(() => findBtn('Random practice (any size)')!.props.onPress());
    act(() => findChip('2 shells')!.props.onPress());
    act(() => root!.update(render()));
    expect(state.practice).toBe(true);
    expect(findBtn('Back to certified round')).toBeDefined();

    // Simulate app relaunch while in Random Practice.
    act(() => root!.unmount());
    root = undefined;
    act(() => { root = create(render()); });
    expect(findBtn('Back to certified round')).toBeDefined();

    // Solve the 2-shell practice puzzle so finished card renders Back to certified round too.
    const pracWeights = [...(state.puzzles[0][3] as string)].map(Number);
    const pracOrder = pracWeights[0] < pracWeights[1] ? [0, 1] : [1, 0];
    act(() => byId(`scale-shell-${pracOrder[0]}`).props.onPress());
    act(() => byId('scale-slot-0').props.onPress());
    act(() => root!.update(render()));
    act(() => byId(`scale-shell-${pracOrder[1]}`).props.onPress());
    act(() => byId('scale-slot-1').props.onPress());
    act(() => root!.update(render()));
    act(() => findBtn('Check')!.props.onPress());
    act(() => root!.update(render()));
    expect(state.won).toBe(true);
    expect(byId('scale-finished-card')).toBeDefined();

    // Tap Back to certified round -> exact certified puzzle, weighing, order, and Undo stack restored!
    act(() => findBtn('Back to certified round')!.props.onPress());
    act(() => root!.update(render()));
    expect(state.practice).toBe(false);
    expect(state.puzzles[0].join('|')).toBe(certifiedTuple);
    expect(state.history).toHaveLength(1);
    expect(state.order[0]).toBe(0);
    expect(state.undo).toHaveLength(1);
  });

  it('R2 P1-2 UI: legacy R1 Random Practice save (without certified) still offers Back to certified round and starts a fresh certified round', () => {
    const base = startRound(2, () => 0.25);
    let state: ScaleState = { ...base, practice: true, index: 0, done: [], puzzles: [base.puzzles[0], base.puzzles[0], base.puzzles[0], base.puzzles[0]] };
    delete state.certified;
    const makeSession = (): LearnSession<ScaleState> => ({
      game: 'shell-scale',
      version: 1,
      id: 'scale-r1-practice',
      revision: 0,
      options: { mode: 'solo', pace: 'medium' },
      state,
    });
    const render = () => (
      <SchoolBoard
        session={makeSession()}
        update={next => { state = next; }}
        skills={{}}
        practice={() => {}}
        cheer={() => {}}
        active
        width={340}
        height={640}
        sound={() => {}}
        stopSound={() => {}}
        soundOn={false}
        coach={{ active: false, done: () => {} }}
      />
    );
    act(() => { root = create(render()); });
    expect(findBtn('Back to certified round')).toBeDefined();
    act(() => findBtn('Back to certified round')!.props.onPress());
    act(() => root!.update(render()));
    expect(state.practice).toBe(false);
    expect(state.level).toBe(2);
    expect(state.index).toBe(0);
  });

  it('R2 P2-2 UI: failed finish admission keeps SchoolBoard retryable without advancing local ref', () => {
    let state: ScaleState = startRound(3, () => 0.25);
    // Advance to board 4 won!
    for (let i = 0; i < 4; i++) {
      const t = state.puzzles[state.index];
      const w = [...(t[3] as string)].map(Number);
      const ord = trueSortOrder({ kind: 'sort', n: 4, cast: [0, 1, 2, 3], weights: w });
      state = { ...state, order: ord, checks: 1, won: true };
      if (i < 3) state = { ...state, index: state.index + 1, done: [...state.done, [0, false]], order: [-1, -1, -1, -1], checks: 0, won: false };
    }
    let allow = false;
    const attempts: ScaleState[] = [];
    const makeSession = (): LearnSession<ScaleState> => ({
      game: 'shell-scale',
      version: 1,
      id: 'scale-retry-finish',
      revision: 4,
      options: { mode: 'together', pace: 'hard' },
      names: ['Alex', 'Maya'],
      starter: 0,
      state,
    });
    const render = () => (
      <SchoolBoard
        session={makeSession()}
        update={next => {
          attempts.push(next);
          if (!allow) return false;
          state = next;
          return true;
        }}
        partners={[{ id: 'b', name: 'Maya' }]}
        skills={{}}
        practice={() => {}}
        cheer={() => {}}
        active
        width={340}
        height={640}
        sound={() => {}}
        stopSound={() => {}}
        soundOn={false}
        coach={{ active: false, done: () => {} }}
      />
    );
    act(() => { root = create(render()); });
    act(() => findBtn('Finish together with Maya')!.props.onPress());
    expect(attempts).toHaveLength(1);
    expect(state.index).toBe(3);

    allow = true;
    act(() => findBtn('Finish together with Maya')!.props.onPress());
    expect(attempts).toHaveLength(2);
    expect(state.index).toBe(4);
    expect(state.partner).toBe('b');
  });

  it('P1-3 UI: Scale-Holder helped 4-board solve hides solo helped copy and credits BOTH saved learners via real finish path', async () => {
    const learners = selectLearner(addLearner(addLearner(undefined, 'Alex', 'a'), 'Maya', 'b'), 'a');
    let save = migrateProfiles({ ...emptySave(), learning: learners });
    const opts = optionsAtLevel({ mode: 'together', pace: 'hard' }, 3);
    let session = { ...startSession('shell-scale', { options: opts, names: ['Alex', 'Maya'] }, {}, 77), learner: 'a' } as LearnSession<ScaleState>;
    save = applyLearnSave(save, 'shell-scale', session, { id: null, epoch: 1 }, 1);
    const partners = [{ id: 'b', name: 'Maya' }, { id: 'family', name: 'Family practice' }];
    const assistanceCalls = vi.fn();

    const commitToSave = (nextState: ScaleState) => {
      const nextSession: LearnSession<ScaleState> = { ...session, revision: session.revision + 1, state: nextState };
      const updated = applyLearnSave(save, 'shell-scale', nextSession, { id: session.id, revision: session.revision, epoch: 1 }, 1);
      save = recordLevelRound(save, updated, 'shell-scale', 100);
      session = nextSession;
    };

    const render = () => (
      <SchoolBoard
        session={session}
        update={commitToSave}
        partners={partners}
        assistance={assistanceCalls}
        skills={{}}
        practice={() => {}}
        cheer={() => {}}
        active
        width={340}
        height={640}
        sound={() => {}}
        stopSound={() => {}}
        soundOn={false}
        coach={{ active: false, done: () => {} }}
      />
    );
    await act(async () => { root = create(render()); });

    for (let boardIdx = 0; boardIdx < 4; boardIdx++) {
      // Trigger real board Help on board 0!
      if (boardIdx === 0) {
        const helpBtn = findBtn('Help');
        expect(helpBtn).toBeDefined();
        await act(async () => {
          await helpBtn!.props.onPress();
          await new Promise(r => setTimeout(r, 0));
        });
        await act(async () => { root!.update(render()); });
        const lookBtn = findBtn('Look');
        if (lookBtn) {
          await act(async () => {
            await lookBtn.props.onPress();
            await new Promise(r => setTimeout(r, 0));
          });
          await act(async () => { root!.update(render()); });
        }
        expect(session.state.helped).toBe(true);
        expect(assistanceCalls).not.toHaveBeenCalled();
      }

      // Place true order and Check.
      const tuple = session.state.puzzles[session.state.index];
      const weights = [...(tuple[3] as string)].map(Number);
      const ord = trueSortOrder({ kind: 'sort', n: 4, cast: [0, 1, 2, 3], weights });
      for (let slot = 0; slot < 4; slot++) {
        act(() => byId(`scale-shell-${ord[slot]}`).props.onPress());
        act(() => byId(`scale-slot-${slot}`).props.onPress());
        act(() => root!.update(render()));
      }
      act(() => findBtn('Check')!.props.onPress());
      act(() => root!.update(render()));
      expect(session.state.won).toBe(true);
      // NEVER show solo "A helped finish counts too" copy in Scale-Holder Together mode!
      expect(allText()).not.toContain('A helped finish counts too');

      if (boardIdx < 3) {
        act(() => findBtn('Next scale')!.props.onPress());
        act(() => root!.update(render()));
      } else {
        // Confirm Together finish with Maya via the real one-tap button!
        const finishWithMaya = findBtn('Finish together with Maya');
        expect(finishWithMaya).toBeDefined();
        act(() => finishWithMaya!.props.onPress());
      }
    }

    // Verify BOTH saved learners ('a' and 'b') have Together credit (code 3, NOT helped code 2) & zero School stars!
    for (const person of ['a', 'b'] as const) {
      const prog = progressFor(save, person)!;
      const bankRow = prog.banks.find(b => b[0] === 362);
      expect(bankRow, `${person} bank 362`).toBeDefined();
      const states = unpack(bankRow![1], 6, 3)!;
      expect(states.filter(code => code === 3).length).toBe(4);
      expect(states.includes(2)).toBe(false);
      expect(save.profiles!.people[person].school?.['shell-scale']).toBeUndefined();
      expect(prog.signals).toEqual([]);
    }
    expect(save.school?.['shell-scale']).toBeUndefined();
    expect(roundStars(session, 3)).toBe(0);
    expect(parseSave(encodeSave(save))).toBeTruthy();
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
