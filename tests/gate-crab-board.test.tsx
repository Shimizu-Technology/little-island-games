import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkQuiz, lockSecretRule, openRulePicker, pickSecretRule, puzzleAt, setPhase, setQuizChoice,
  startGuessing, startRound, type GateCrabState,
} from '../src/learn/games/gate-crab/engine';
import { evaluateRow, RULE_BY_ID } from '../src/learn/games/gate-crab/rules';
import { builderShellSize, evidenceSideBySide, pickerColumns } from '../src/learn/games/gate-crab/layout';
import type { State as ChallengeState } from '../src/learn/games/gate-crab/challenge';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 1 }));
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  useWindowDimensions: () => viewport,
}));
vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView' },
  useAnimatedStyle: () => ({}),
  useSharedValue: (v: number) => ({ get: () => v, set: () => {} }),
  withSequence: (v: number) => v,
  withSpring: (v: number) => v,
  withTiming: (v: number) => v,
}));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => true }));
vi.mock('../src/components/Audio', () => ({
  hasSpeech: () => false,
  AudioPreferences: React.createContext({ sound: true }),
  useSoundControls: () => ({ play: vi.fn(), stop: vi.fn() }),
}));
vi.mock('../src/learn/BoardSpace', () => ({ BoardPrimary: ({ children }: { children: React.ReactNode }) => React.createElement('BoardPrimary', null, children) }));
vi.mock('../src/learn/Coach', () => ({ CoachSpot: ({ children }: { children?: React.ReactNode }) => React.createElement('CoachSpot', null, children) }));
vi.mock('../src/components/ui', () => ({
  C: { ink: '#20474A' },
  Copy: ({ children, ...p }: { children?: React.ReactNode }) => React.createElement('Copy', p, children),
  Heading: ({ children, ...p }: { children?: React.ReactNode }) => React.createElement('Heading', p, children),
  Button: ({ children, onPress, ...p }: { children?: React.ReactNode; onPress?: () => void }) => React.createElement('Button', { ...p, onPress }, children),
  PressableScale: ({ children, onPress, ...p }: { children?: React.ReactNode; onPress?: () => void }) => React.createElement('PressableScale', { ...p, onPress }, children),
}));
vi.mock('../src/learn/games/gate-crab/art', () => ({
  ALL_SHELL_CODES: [0, 1, 2, 3, 4, 5],
  GateCrabArt: (p: object) => React.createElement('GateCrabArt', p),
  RulePicture: (p: object) => React.createElement('RulePicture', p),
  ShellArt: (p: object) => React.createElement('ShellArt', p),
  ShelfArt: (p: object) => React.createElement('ShelfArt', p),
  ink: '#20474A',
}));

const { SchoolBoard } = await import('../src/learn/games/gate-crab/schoolBoard');
const { ChallengeBoard } = await import('../src/learn/games/gate-crab/challengeBoard');
const gateChallenge = await import('../src/learn/games/gate-crab/challenge');

const rng = (() => {
  let x = 7;
  return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; };
})();

const textOf = (n: ReactTestInstance): string =>
  n.children.map(c => (typeof c === 'string' || typeof c === 'number' ? String(c) : textOf(c))).join('');

let root: ReactTestRenderer | undefined;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  vi.unstubAllGlobals();
  Object.assign(viewport, { width: 393, height: 852, fontScale: 1 });
});

describe('Gate Crab UI boards, Together privacy, row reading, and AX5 layouts', () => {
  it('never leaks the secret rule label in solo or Together play until won === true', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    let state = startRound(2, rng, true, 0);
    const p = puzzleAt(state)!;
    const rule = RULE_BY_ID.get(p.ruleId)!;
    const makeProps = (st: GateCrabState) => ({
      session: { version: 1 as const, id: 's1', game: 'gate-crab' as const, options: { mode: 'together' as const, pace: 'medium' as const }, names: ['Stassie', 'Leon'] as [string, string], state: st, revision: 0 },
      update: (next: GateCrabState) => { state = next; },
      practice: vi.fn(),
      notePractice: vi.fn(),
      assistance: vi.fn(),
      skills: {},
      sound: vi.fn(),
      stopSound: vi.fn(),
      soundOn: true,
      width: 360,
      height: 760,
      active: true,
      coach: { active: false, done: vi.fn() },
      cheer: vi.fn(),
    });

    // 1. cover-maker: secret rule NOT shown
    await act(async () => { root = create(<SchoolBoard {...makeProps(state)} />); });
    expect(textOf(root!.root)).toContain('Rule maker: Stassie');
    expect(textOf(root!.root)).not.toContain(rule.label);

    // 2. pick-rule -> lock -> cover-guesser: secret rule NOT shown on cover-guesser!
    state = lockSecretRule(pickSecretRule(openRulePicker(state), rule.id, 77));
    await act(async () => { root!.update(<SchoolBoard {...makeProps(state)} />); });
    expect(textOf(root!.root)).toContain('Secret rule locked!');
    expect(textOf(root!.root)).not.toContain(rule.label);

    // 3. play: secret rule NOT shown while testing or sorting quiz!
    state = startGuessing(state);
    await act(async () => { root!.update(<SchoolBoard {...makeProps(state)} />); });
    expect(textOf(root!.root)).toContain('Test at gate');
    expect(textOf(root!.root)).not.toContain(rule.label);

    // 4. won: secret rule IS revealed!
    let solved = setPhase(state, 'quiz');
    for (let i = 0; i < 5; i++) solved = setQuizChoice(solved, i, evaluateRow(rule, p.len, solved.quizRows[i]));
    solved = checkQuiz(solved).state;
    await act(async () => { root!.update(<SchoolBoard {...makeProps(solved)} />); });
    expect(textOf(root!.root)).toContain('Secret rule discovered!');
    expect(textOf(root!.root)).toContain(rule.label);
  });

  it('toggles optional row reading and renders counterexample card on a quiz miss', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    let state = startRound(1, rng);
    const p = puzzleAt(state)!;
    const rule = RULE_BY_ID.get(p.ruleId)!;
    const wrongActual = evaluateRow(rule, p.len, state.quizRows[0]);
    state = setPhase(state, 'quiz');
    state = setQuizChoice(state, 0, !wrongActual);
    for (let i = 1; i < 5; i++) state = setQuizChoice(state, i, evaluateRow(rule, p.len, state.quizRows[i]));
    state = checkQuiz(state).state;

    const update = vi.fn((next: GateCrabState) => { state = next; });
    const renderBoard = (st: GateCrabState) => (
      <SchoolBoard
        session={{ version: 1 as const, id: 's2', game: 'gate-crab', options: { mode: 'solo', pace: 'easy' }, state: st, revision: 0 }}
        update={update}
        practice={vi.fn()}
        notePractice={vi.fn()}
        assistance={vi.fn()}
        skills={{}}
        sound={vi.fn()}
        stopSound={vi.fn()}
        soundOn
        width={360}
        height={760}
        active
        coach={{ active: false, done: vi.fn() }}
        cheer={vi.fn()}
      />
    );

    await act(async () => { root = create(renderBoard(state)); });
    expect(root!.root.findByProps({ testID: 'gate-counterexample' })).toBeDefined();
    expect(textOf(root!.root)).toContain('New clue from the quiz!');

    // Toggle optional row reading ON
    await act(async () => { root!.root.findByProps({ label: 'Row reading is off. Tap to read rows aloud.' }).props.onPress(); });
    expect(state.readRows).toBe(true);
    await act(async () => { root!.update(renderBoard(state)); });
    expect(textOf(root!.root)).toContain('Read rows: On');
    expect(textOf(root!.root)).toContain('Hear row');
  });

  it('renders ChallengeBoard across iPhone 15 portrait AX5 and iPad mini 6 landscape AX5 cleanly', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const entry = gateChallenge.puzzles[0];
    const s0: ChallengeState = {
      puzzle: entry.descriptor.puzzle,
      evidence: entry.descriptor.puzzle.starters.map(r => ({ row: r, pass: evaluateRow(RULE_BY_ID.get(entry.descriptor.puzzle.ruleId)!, entry.descriptor.puzzle.len, r) })),
      tests: [],
      quizRows: [...entry.descriptor.puzzle.quiz],
      quizChoices: [null, null, null, null, null],
      stack: [],
      checks: 0,
      misses: 0,
      counterexample: null,
      won: false,
      actions: 0,
    };

    // iPhone 15 portrait AX5
    Object.assign(viewport, { width: 393, height: 852, fontScale: 3.12 });
    await act(async () => {
      root = create(<ChallengeBoard state={s0} dispatch={vi.fn()} active width={353} sessionKey="k1" />);
    });
    expect(root!.root.findByProps({ testID: 'gate-crab-board' })).toBeDefined();
    expect(evidenceSideBySide(353, true)).toBe(false);
    expect(pickerColumns(353, true)).toBe(3);
    expect(builderShellSize(353, 3, 393)).toBeGreaterThanOrEqual(48);

    // iPad mini 6 landscape AX5
    Object.assign(viewport, { width: 1133, height: 744, fontScale: 3.12 });
    await act(async () => {
      root!.update(<ChallengeBoard state={s0} dispatch={vi.fn()} active width={760} sessionKey="k1" />);
    });
    expect(evidenceSideBySide(760, true)).toBe(true);
    expect(builderShellSize(760, 3, 1133)).toBeGreaterThanOrEqual(60);
  });
});
