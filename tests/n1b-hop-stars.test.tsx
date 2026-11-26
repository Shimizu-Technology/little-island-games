/** N1b fix P1-1: finishing Number Hop's last puzzle over par must not be credited as independent work. Real LearnFrame, Store and
 * Number Hop board; only the platform is mocked. The board is played through its own buttons. */
import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { random } from '../src/games/types';
import { solveHop } from '../src/math/kit';
import { LearnFrame } from '../src/learn/LearnFrame';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptySave, type Save } from '../src/state/validation';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { startSession } from '../src/learn/session';
import { optionsAtLevel } from '../src/learn/levels';
import { addLearner } from '../src/learn/learners';
import { hopOf } from '../src/learn/games/number-hop/items';
import { createHop, hopMove, hopProgress, type HopRound } from '../src/learn/games/number-hop/round2';
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false }));

const db = vi.hoisted(() => ({ raw: null as string | null }));
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (s: string) => { db.raw = s; }, preserve: async () => {} } }));
vi.mock('react-native', () => ({ ScrollView: 'ScrollView', View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { flatten: (s: unknown) => s, create: (s: unknown) => s },
  useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }), AppState: { addEventListener: () => ({ remove() {} }) },
  Animated: { Value: class { setValue() {} interpolate() { return 0; } }, View: 'View', timing: () => ({ start() {}, stop() {} }), sequence: () => ({ start() {}, stop() {} }), createAnimatedComponent: (c: unknown) => c },
  AccessibilityInfo: { isReduceMotionEnabled: async () => true, addEventListener: () => ({ remove() {} }) }, Platform: { OS: 'ios' } }));
vi.mock('react-native-svg', () => ({ default: 'svg', Circle: 'circle', Rect: 'rect', Path: 'path', G: 'g', Line: 'line', Text: 'svgtext', Ellipse: 'ellipse' }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock('expo-router', () => ({ useIsFocused: () => true, router: { canGoBack: () => false, replace: vi.fn(), push: vi.fn() } }));
vi.mock('../src/components/Text', async () => ({ ...(await vi.importActual<object>('../src/components/Text')), Text: 'Text' }));
vi.mock('../src/components/ui', () => ({ Button: 'Button', Chip: 'Chip', Heading: 'Heading', Copy: 'Copy', ToggleRow: 'ToggleRow', GameHeader: 'GameHeader', PressableScale: 'Button',
  C: { ink: '#000', paper: '#fff', line: '#ccc', teal: '#0a0', coral: '#a00', gold: '#aa0', cream: '#eee', muted: '#666', soft: '#efe' }, styles: {},
  Sheet: ({ visible, children, footer }: { visible: boolean; children: React.ReactNode; footer: React.ReactNode }) => visible ? React.createElement('SheetBody', null, children, footer) : null }));
vi.mock('../src/components/Audio', () => ({ hasSpeech: () => false, AudioPreferences: createContext({}), useSoundControls: () => ({ play: () => {}, stop: () => {} }) }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/components/Match', () => ({ Scoreboard: () => null, PlayerNames: () => null }));
vi.mock('../src/components/feel', () => ({ feel: () => {} }));
vi.mock('../src/personalization/LearnerChip', () => ({ LearnerChip: 'LearnerChip' }));
vi.mock('../src/islander/Companion', () => ({ Companion: () => null, LearningCompanion: ({ children }: { children: React.ReactNode }) => children, PhoneLearningCompanion: 'PhoneLearningCompanion', useCompanionReaction: () => ({ event: 'entry', react: () => {} }) }));
vi.mock('../src/learn/LearnChrome', () => ({ IslandBackdrop: () => null, RoundProgress: 'RoundProgress', subjectTheme: new Proxy({}, { get: () => ({}) }) }));
vi.mock('../src/learn/LearnArt', () => ({ LearnArt: () => null }));
vi.mock('../src/learn/Celebrate', () => ({ Celebrate: () => null }));
vi.mock('../src/learn/LevelPath', () => ({ LevelPath: () => null }));
vi.mock('../src/learn/AnswerTile', () => ({ AnswerTile: (p: { label: string; onPress: () => void; children: React.ReactNode }) => React.createElement('Button', { accessibilityLabel: p.label, onPress: p.onPress }, p.children) }));
vi.mock('../src/learn/Coach', () => ({ CoachSpot: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../src/learn/games/hafa-adai/view', () => ({ LastPicnicWord: () => null }));
vi.mock('../src/badges/ResultCard', () => ({ BadgeResultCard: () => null }));
vi.mock('../src/challenge/ResultOffer', () => ({ ResultOffer: () => null }));
vi.mock('../src/learn/views', async () => {
  const hop = await import('../src/learn/games/number-hop/view');
  return { views: new Proxy({}, { get: () => ({ Board: hop.Board, Art: 'Art' }) }) };
});

let root: ReactTestRenderer | undefined;
const seen: { store?: ReturnType<typeof useStore> } = {};
function Probe() { const s = useStore(); useLayoutEffect(() => { seen.store = s; }); return s.ready ? <LearnFrame id="number-hop" /> : null; }
const options = { ...optionsAtLevel({ mode: 'solo', pace: 'easy' }, 3), mathOperation: 'add' as const };
/** Seed 9, Level 3, the review's round: the first four puzzles done at par, the fifth waiting. */
function fourDone(): HopRound {
  let s = createHop(options, random(9));
  for (let k = 0; k < 4; k++) { for (const a of solveHop(hopOf(s.items[k], 3))) s = hopMove(s, a); s = hopMove(s, ['x']); }
  return s;
}
async function mount(state: HopRound) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  // The measured School board space (F-frame-2) coalesces layout on the next frame.
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => setTimeout(() => cb(0), 0));
  vi.stubGlobal('cancelAnimationFrame', (h: ReturnType<typeof setTimeout>) => clearTimeout(h));
  const save = migrateProfiles(emptySave());
  save.learning = addLearner(save.learning, 'Child', 'a');
  save.learn = { 'number-hop': { ...startSession('number-hop', { options }, {}, 9), learner: 'a', levelHelped: false, state } };
  db.raw = encodeSave(save);
  await act(async () => { root = create(<StoreProvider><Probe /></StoreProvider>, { createNodeMock: () => ({ scrollTo: () => {}, measureLayout: () => {} }) }); });
}
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; seen.store = undefined; vi.unstubAllGlobals(); });
const textOf = (n: ReactTestInstance): string => n.children.map((c) => (typeof c === 'string' ? c : textOf(c))).join('');
const label = (n: ReactTestInstance) => n.props.accessibilityLabel ?? textOf(n);
async function press(name: string) {
  const hit = root!.root.findAll((n) => String(n.type) === 'Button' && typeof n.props.onPress === 'function' && !n.props.disabled && label(n) === name)[0];
  expect(hit, `${name} among ${root!.root.findAll((n) => String(n.type) === 'Button').map(label).join(' | ')}`).toBeDefined();
  await act(async () => { hit.props.onPress(); });
}
const saved = (): Save => seen.store!.save;
const hopState = () => saved().learn!['number-hop']!.state as HopRound;

it('the review repro: a last puzzle finished over par (seed 9, 1 to 12 in 11 jumps, par 6) is not credited as independent work', async () => {
  const start = fourDone(), h = hopOf(start.items[4], 3);
  expect([h.start, h.target]).toEqual([1, 12]);
  await mount(start);
  for (let k = 0; k < 11; k++) await press('Jump forward 1');
  expect(hopState().solved).toBe(true);
  await press('Finish round');
  const round = saved().learn!['number-hop']!, record = saved().school?.['number-hop']?.[3];
  expect(round.state).toMatchObject({ index: 5 });
  expect(round.levelHelped).toBe(true);
  expect(record).toMatchObject({ completed: 1, independent: 0, stars: 1 });
});

it('an over-par landing tried again at par without Help still counts as the child\'s own work', async () => {
  const start = fourDone(), h = hopOf(start.items[4], 3);
  await mount(start);
  for (let k = 0; k < 11; k++) await press('Jump forward 1');
  await press('Try for 6 jumps');
  for (const a of solveHop(h)) await press(`Jump forward ${h.jumps[a[1] as number]}`);
  expect(hopProgress(hopState())!.puzzle!.work).toMatchObject({ solved: true, path: [2, 2, 2, 2, 2, 1] });
  await press('Finish round');
  const round = saved().learn!['number-hop']!;
  expect(round.levelHelped).toBe(false);
  expect(saved().school?.['number-hop']?.[3]).toMatchObject({ completed: 1, independent: 1, stars: 2 });
});
