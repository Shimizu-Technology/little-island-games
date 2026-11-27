import React, { createContext } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ChallengeFrame } from '../src/challenge/ChallengeFrame';
import Play from '../src/app/play';
import { BoardScreen } from '../src/board/Screen';
import { LearnFrame } from '../src/learn/LearnFrame';
import { emptySave } from '../src/state/validation';
import { emptyChallenge, type ChallengeSession } from '../src/state/challenge';
import { registration, puzzle, solve } from './helpers/challenge-replay';
import { createTic, ticMove } from '../src/games/tic';
import { customWord, guessLetter } from '../src/games/words';
import { defaultOptions } from '../src/games/types';
import { createSession, type BoardId } from '../src/board';
import { startSession } from '../src/learn/session';
import { finishMathRound } from './helpers/shell-rounds';

const fixture = vi.hoisted(() => ({ reduced: false, height: 844, game: 'tic-tac-toe', scroll: vi.fn(), store: {} as ReturnType<typeof import('../src/state/Store').useStore> }));
vi.mock('../src/state/Store', () => ({ useStore: () => fixture.store }));
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => fixture.reduced }));
vi.mock('react-native', () => ({ View: 'div', Text: 'span', TextInput: 'input', ScrollView: 'section', StyleSheet: { flatten: (s: unknown) => s }, Platform: { OS: 'ios' }, AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) }, useWindowDimensions: () => ({ width: 390, height: fixture.height, fontScale: 1 }) }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'main', useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
vi.mock('expo-router', () => ({ Redirect: () => null, useIsFocused: () => true, useFocusEffect() {}, useLocalSearchParams: () => ({ game: fixture.game }), router: { canGoBack: () => true, back() {}, replace() {}, push() {} } }));
vi.mock('../src/components/ui', () => ({ Button: 'button', PressableScale: 'button', Chip: 'button', Copy: 'p', Heading: 'h2', Label: 'label', GameHeader: () => null, ToggleRow: () => null, Status: ({ title, detail }: { title: string; detail: string }) => <p>{title}{detail}</p>, C: {}, styles: {}, Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => visible ? <aside>{children}</aside> : null }));
vi.mock('../src/components/Audio', () => ({ hasSpeech: () => false, AudioPreferences: createContext({}), useSounds: () => () => {}, useSoundControls: () => ({ play() {}, stop() {} }) }));
vi.mock('../src/components/Settings', () => ({ Settings: () => null }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/components/Recovery', () => ({ Recovery: () => null }));
vi.mock('../src/components/feel', () => ({ feel() {} }));
vi.mock('../src/components/Match', () => ({ PlayerNames: () => null, Scoreboard: () => null }));
vi.mock('../src/personalization/LearnerChip', () => ({ LearnerChip: () => null }));
vi.mock('../src/islander/active', () => ({ useActiveIslanderLook: () => ({}) }));
vi.mock('../src/islander/Companion', () => ({ Companion: () => null, IslanderPortrait: () => null, PhoneLearningCompanion: () => null, LearningCompanion: ({ children }: { children: React.ReactNode }) => children, useCompanionReaction: () => ({ event: 'entry', react() {} }) }));
vi.mock('../src/practice/useRoundPractice', () => ({ useRoundPractice: () => ({ request: (f: () => void) => f(), panel: null, pending: false }) }));
vi.mock('../src/content/learnAudio', () => ({ learnSources: {} }));
vi.mock('../src/badges/ResultCard', () => ({ BadgeResultCard: () => <p>Badge feedback</p> }));
vi.mock('../src/screens/GameBoards', () => ({ TicBoard: () => <p>Finished tic board</p>, MemoryBoard: () => null, CheckersBoard: () => null, MazeBoard: () => null, NumbersBoard: () => null, WordBoard: () => <p>Finished word board</p> }));
vi.mock('../src/board/Art', () => ({ Piece: () => null, BoardArt: () => null }));
vi.mock('../src/board/Boards', () => ({ Boards: () => <p>Finished hall board</p>, demoPosition: () => ({}) }));
vi.mock('../src/learn/LearnChrome', () => ({ IslandBackdrop: () => null, RoundProgress: () => null, subjectTheme: new Proxy({}, { get: () => ({}) }) }));
vi.mock('../src/learn/LearnArt', () => ({ LearnArt: () => null }));
vi.mock('../src/learn/Celebrate', () => ({ Celebrate: () => null }));
vi.mock('../src/learn/LevelPath', () => ({ LevelPath: () => null }));
vi.mock('../src/learn/growth/Board', () => ({ GrowthBoard: () => <p>School board</p> }));
vi.mock('../src/learn/views', () => ({ views: new Proxy({}, { get: () => ({ Board: () => <p>School board</p>, Art: () => null }) }) }));
vi.mock('../src/learn/games/hafa-adai/view', () => ({ LastPicnicWord: () => null }));
vi.mock('../src/learn/voice', () => ({ speakText() {}, stopSpeaking() {}, useSpeechLifecycle() {} }));

let root: ReactTestRenderer;
const words = (n: ReactTestInstance | string): string => typeof n === 'string' ? n : n.children.map(words).join('');
const button = (label: string, scope = root.root) => scope.find(n => n.type === 'button' && words(n) === label);
const byId = (id: string) => root.root.find(n => n.type === 'div' && n.props.testID === id);
function before(first: ReactTestInstance, second: ReactTestInstance) {
  const nodes = root.root.findAll(() => true);
  expect(nodes.indexOf(first)).toBeLessThan(nodes.indexOf(second));
}
async function mount(element: React.ReactElement) {
  await act(async () => { root = create(element, { createNodeMock: () => ({ scrollTo: fixture.scroll }) }); });
}
async function refresh(element: React.ReactElement) { await act(async () => root.update(element)); }
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  fixture.reduced = false; fixture.height = 844; fixture.game = 'tic-tac-toe'; fixture.scroll.mockClear();
  fixture.store = { ready: true, recovery: false, epoch: 0, save: { ...emptySave(), challenge: emptyChallenge() }, settings() {}, update: vi.fn(), boardUpdate: vi.fn(), challengeWorking: vi.fn(), challengeOpen: async () => ({ ok: true }), challengeSave: async (next: ChallengeSession) => {
    const p = fixture.store.save.challenge!;
    fixture.store.save.challenge = { ...p, nextOrdinal: next.ordinal + 1, paused: next.result ? [] : [next] };
    return true;
  } } as unknown as typeof fixture.store;
});
afterEach(async () => { if (root) await act(async () => root.unmount()); vi.unstubAllGlobals(); });

it.each([false, true])('Challenge reveals its next action before the final board, reduced motion %s', async reduced => {
  fixture.reduced = reduced;
  const entry = { ...registration, move: (s: ChallengeSession) => solve(s), render: (_s: ChallengeSession, dispatch: (a: unknown) => void) => <button onClick={() => dispatch({ type: 'check' })}>Finish puzzle</button> };
  await mount(<ChallengeFrame entry={entry}/>);
  await act(async () => button('Start this puzzle').props.onPress());
  fixture.scroll.mockClear();
  await act(async () => button('Finish puzzle').props.onClick());
  const card = byId('challenge-finish-card'), board = byId('challenge-board-ready');
  expect(words(card)).toContain('Puzzle solved!');
  expect(button('Next puzzle', card).props.quiet).not.toBe(true);
  before(card, board);
  expect(fixture.scroll).toHaveBeenLastCalledWith({ y: 0, animated: !reduced });
  await act(async () => button('Next puzzle', card).props.onPress());
  expect(root.root.findAll(n => n.props.testID === 'challenge-finish-card')).toHaveLength(0);
});

it('Challenge waits for its animated run to settle before revealing and scrolling to the finish card', async () => {
  let settle = () => {};
  const entry = { ...registration, animatedRuns: true, move: (s: ChallengeSession) => solve(s), render: (_s: ChallengeSession, dispatch: (a: unknown) => void, _active: boolean, _width: number, context?: { onSettled?: () => void }) => {
    settle = context?.onSettled ?? (() => {});
    return <button onClick={() => dispatch({})}>Finish puzzle</button>;
  } };
  await mount(<ChallengeFrame entry={entry}/>);
  await act(async () => button('Start this puzzle').props.onPress());
  await act(async () => button('Finish puzzle').props.onClick());
  expect(root.root.findAll(n => n.props.testID === 'challenge-finish-card')).toHaveLength(0);
  fixture.scroll.mockClear();
  await act(async () => settle());
  before(byId('challenge-finish-card'), byId('challenge-board-ready'));
  expect(fixture.scroll).toHaveBeenLastCalledWith({ y: 0, animated: true });
});

it.each([false, true])('Classics reveals one replay action before its retained board, reduced motion %s', async reduced => {
  fixture.reduced = reduced;
  const start = createTic({ ...defaultOptions, mode: 'together' });
  fixture.store.save.sessions = { 'tic-tac-toe': start };
  await mount(<Play/>); fixture.scroll.mockClear();
  const completed = [0, 3, 1, 4, 2].reduce(ticMove, start);
  fixture.store.save.sessions['tic-tac-toe'] = completed;
  await refresh(<Play/>);
  const card = byId('classic-finish-card');
  before(card, byId('classic-board'));
  expect(button('Play again', card).props.quiet).not.toBe(true);
  expect(root.root.findAll(n => n.type === 'button' && words(n) === 'Play again')).toHaveLength(1);
  expect(root.root.findAll(n => n.type === 'button' && words(n) === 'New round & options')).toHaveLength(1);
  expect(words(card)).toContain('Badge feedback');
  expect(fixture.scroll).toHaveBeenLastCalledWith({ y: 0, animated: !reduced });
  fixture.scroll.mockClear(); await refresh(<Play/>); expect(fixture.scroll).not.toHaveBeenCalled();
  await act(async () => button('Play again', card).props.onPress());
  expect(fixture.store.update).toHaveBeenCalled();
});

it('a finished custom family word offers the next family word above its board', async () => {
  fixture.game = 'word-rescue';
  const round = customWord({ ...defaultOptions, mode: 'together' }, 'CAT')!;
  fixture.store.save.sessions = { 'word-rescue': ['C', 'A', 'T'].reduce(guessLetter, round) };
  await mount(<Play/>);
  const card = byId('classic-finish-card');
  expect(button('Choose a new family word', card)).toBeDefined();
  before(card, byId('classic-board'));
  await act(async () => button('Choose a new family word', card).props.onPress());
  expect(root.root.findAllByType('aside')).toHaveLength(1);
});

it.each<[BoardId, number, boolean, 0 | 1 | 'draw']>([['coconut-drop', 844, false, 0], ['coconut-drop', 844, true, 'draw'], ['reef-sweep', 844, false, 0], ['reef-sweep', 844, true, 1], ['reef-sweep', 1024, false, 0]])('Board %s at height %s places replay with the status, reduced %s outcome %s', async (game, height, reduced, outcome) => {
  fixture.height = height; fixture.reduced = reduced;
  const start = { ...createSession(game, { seed: 7 }), taught: true };
  fixture.store.save.board = { [game]: start };
  await mount(<BoardScreen game={game}/>); fixture.scroll.mockClear();
  fixture.store.save.board[game] = { ...start, position: { ...start.position, outcome } };
  await refresh(<BoardScreen game={game}/>);
  const card = byId('board-finish-card');
  expect(words(card)).toContain('Play again');
  expect(button('Play again', card).props.quiet).not.toBe(true);
  expect(button('New game', card).props.quiet).toBe(true);
  before(card, root.root.find(n => n.type === 'p' && words(n) === 'Finished hall board'));
  expect(root.root.findAll(n => n.type === 'button' && words(n) === 'Play again')).toHaveLength(1);
  expect(root.root.findAll(n => n.type === 'button' && words(n) === 'New game')).toHaveLength(1);
  expect(fixture.scroll).toHaveBeenLastCalledWith({ y: 0, animated: !reduced });
  fixture.scroll.mockClear(); await refresh(<BoardScreen game={game}/>); expect(fixture.scroll).not.toHaveBeenCalled();
  await act(async () => button('Play again', card).props.onPress()); expect(fixture.store.boardUpdate).toHaveBeenCalled();
});

it.each([false, true])('School scrolls its Keep going celebration into view, reduced motion %s', async reduced => {
  fixture.reduced = reduced;
  const round = { ...startSession('quick-practice', { options: { mode: 'solo', pace: 'easy' } }, {}, 7), learner: 'family' };
  fixture.store.save.learn = { 'quick-practice': round };
  await mount(<LearnFrame id="quick-practice"/>); fixture.scroll.mockClear();
  fixture.store.save.learn['quick-practice'] = { ...round, state: finishMathRound(round.state, 'quick-practice') };
  await refresh(<LearnFrame id="quick-practice"/>);
  expect(button('Keep going')).toBeDefined();
  expect(root.root.findAll(n => n.props.testID === 'learn-board')).toHaveLength(0);
  expect(fixture.scroll).toHaveBeenLastCalledWith({ y: 0, animated: !reduced });
  fixture.scroll.mockClear(); await refresh(<LearnFrame id="quick-practice"/>); expect(fixture.scroll).not.toHaveBeenCalled();
});
