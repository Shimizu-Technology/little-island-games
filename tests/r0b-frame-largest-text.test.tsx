/** R0b: what the Learn frame gives each School board at the largest text size. The board and the result card get a
 * text region (2x, or where the words fit), step games can bring the board back into view, and a short landscape
 * phone folds the learner chip, mode and journey into one row beside the level line. */
import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { LearnFrame } from '../src/learn/LearnFrame';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptySave } from '../src/state/validation';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { startSession } from '../src/learn/session';
import { optionsAtLevel } from '../src/learn/levels';
import type { LearnId, LearnSession } from '../src/learn/types';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 3.12 }));
const db = vi.hoisted(() => ({ raw: null as string | null }));
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (s: string) => { db.raw = s; }, preserve: async () => {} } }));
vi.mock('react-native', () => ({ ScrollView: 'ScrollView', View: 'View', Text: 'Text', StyleSheet: { flatten: (s: unknown) => s }, useWindowDimensions: () => viewport, AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock('expo-router', () => ({ useIsFocused: () => true, router: { canGoBack: () => false, replace: vi.fn(), push: vi.fn() } }));
// Headings report the text region they are drawn in, as the real Text reads it.
vi.mock('../src/components/ui', async () => {
  const { TextFit } = await import('../src/components/Text');
  const Heading = ({ children, maxFontSizeMultiplier }: { children: React.ReactNode; maxFontSizeMultiplier?: number }) => React.createElement('Heading', { maxFontSizeMultiplier, fit: React.useContext(TextFit) }, children);
  return { Button: 'Button', Chip: 'Chip', Heading, Copy: 'Copy', ToggleRow: 'ToggleRow', GameHeader: 'GameHeader', C: {}, styles: {},
    Sheet: ({ visible, children, footer }: { visible: boolean; children: React.ReactNode; footer: React.ReactNode }) => visible ? React.createElement('SheetBody', null, children, footer) : null };
});
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play: () => {}, stop: () => {} }) }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/components/Match', () => ({ Scoreboard: () => null, PlayerNames: () => null }));
vi.mock('../src/components/feel', () => ({ feel: () => {} }));
vi.mock('../src/personalization/LearnerChip', () => ({ LearnerChip: 'LearnerChip' }));
vi.mock('../src/islander/Companion', () => ({ Companion: () => null, LearningCompanion: ({ children }: { children: React.ReactNode }) => children, PhoneLearningCompanion: 'PhoneLearningCompanion', useCompanionReaction: () => ({ event: 'entry', react: () => {} }) }));
vi.mock('../src/learn/LearnChrome', () => ({ IslandBackdrop: () => null, RoundProgress: 'RoundProgress', subjectTheme: new Proxy({}, { get: () => ({}) }) }));
vi.mock('../src/learn/LearnArt', () => ({ LearnArt: () => null }));
vi.mock('../src/learn/Celebrate', () => ({ Celebrate: () => null }));
vi.mock('../src/learn/LevelPath', () => ({ LevelPath: () => null }));
vi.mock('../src/learn/games/hafa-adai/view', () => ({ LastPicnicWord: () => null }));
vi.mock('../src/badges/ResultCard', () => ({ BadgeResultCard: () => null }));
vi.mock('../src/challenge/ResultOffer', () => ({ ResultOffer: () => null }));
// Every board reports the text region and the step reveal the frame gives it.
vi.mock('../src/learn/growth/Board', async () => {
  const { TextFit } = await import('../src/components/Text');
  const { StepReveal } = await import('../src/learn/stepReveal');
  return { GrowthBoard: (p: object) => React.createElement('Board', { ...p, fit: React.useContext(TextFit), reveal: React.useContext(StepReveal) }) };
});
vi.mock('../src/learn/views', async () => {
  const { TextFit } = await import('../src/components/Text');
  const { StepReveal } = await import('../src/learn/stepReveal');
  const Board = (p: object) => React.createElement('Board', { ...p, fit: React.useContext(TextFit), reveal: React.useContext(StepReveal) });
  return { views: new Proxy({}, { get: () => ({ Board, Art: 'Art' }) }) };
});

let root: ReactTestRenderer | undefined;
const scrolls = vi.hoisted(() => [] as number[]);
function Probe({ id }: { id: LearnId }) { const s = useStore(); useLayoutEffect(() => {}, [s]); return s.ready ? <LearnFrame id={id} /> : null; }
async function mount(id: LearnId, patch?: (s: LearnSession) => LearnSession) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const save = migrateProfiles(emptySave());
  const round = { ...startSession(id, { options: optionsAtLevel({ mode: 'solo', pace: 'easy' }, 1) }, {}, 7), learner: 'family' };
  save.learn = { [id]: patch ? patch(round) : round };
  db.raw = encodeSave(save);
  await act(async () => { root = create(<StoreProvider><Probe id={id} /></StoreProvider>, { createNodeMock: () => ({ scrollTo: ({ y }: { y: number }) => scrolls.push(y) }) }); });
  return root!;
}
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.unstubAllGlobals(); scrolls.length = 0; Object.assign(viewport, { width: 393, height: 852, fontScale: 3.12 }); });
const byType = (r: ReactTestRenderer, type: string) => r.root.findAll(n => String(n.type) === type);
const textOf = (n: ReactTestInstance): string => n.children.map(c => typeof c === 'string' ? c : textOf(c)).join('');
const inside = (n: ReactTestInstance, parent: ReactTestInstance) => { for (let p: ReactTestInstance | null = n; p; p = p.parent) if (p === parent) return true; return false; };

it.each([[3.12, { width: 337, ceiling: 2, maxSize: 44 }], [1, null]])('at text scale %s the board gets the text region %o', async (fontScale, fit) => {
  Object.assign(viewport, { fontScale });
  const r = await mount('turtle-tales');
  expect(byType(r, 'Board')[0].props.fit).toEqual(fit);
});

it('an iPad board region is the board width beside the companion', async () => {
  Object.assign(viewport, { width: 1133, height: 744 });
  const r = await mount('turtle-tales');
  // 1133 - 56, less the 88-pt companion column on a wide screen.
  expect(byType(r, 'Board')[0].props.fit).toEqual({ width: 900 - 88, ceiling: 2, maxSize: 44 });
});

it.each([[3.12, [892]], [1, []]])('a step game asking for the board at text scale %s scrolls the page to %o', async (fontScale, expected) => {
  Object.assign(viewport, { fontScale });
  const r = await mount('turtle-tales');
  await act(async () => { r.root.find(n => n.props.testID === 'learn-board').props.onLayout({ nativeEvent: { layout: { x: 0, y: 900, width: 361, height: 700 } } }); });
  scrolls.length = 0;
  await act(async () => { byType(r, 'Board')[0].props.reveal(); });
  expect(scrolls).toEqual(expected);
});

it.each([[3.12, 2], [1, undefined]])('the result card at text scale %s draws its words inside a region capped at %s', async (fontScale, ceiling) => {
  Object.assign(viewport, { fontScale });
  // A finished Quick practice round: every question answered.
  const r = await mount('quick-practice', s => {
    const st = s.state as { questions: unknown[]; index: number; completed: boolean[] };
    return { ...s, state: { ...st, index: st.questions.length, completed: st.questions.map(() => false) } };
  });
  const result = r.root.find(n => String(n.type) === 'Heading' && textOf(n) === 'You did it!');
  expect(result.props.fit?.ceiling).toBe(ceiling);
  if (ceiling) expect(result.props.fit.width).toBe(393 - 32 - 46);
});

it('AX5 landscape phone: the learner chip, the mode and a one-line journey share a row beside the level line', async () => {
  Object.assign(viewport, { width: 874, height: 402 });
  const r = await mount('crab-commands');
  const header = r.root.find(n => n.props.testID === 'learn-header-scrolled');
  expect(header.props.style.flexDirection).toBe('row');
  const cluster = header.find(n => n.props.testID === 'learn-header-cluster');
  expect(byType(r, 'LearnerChip').filter(n => inside(n, cluster))).toHaveLength(1);
  expect(byType(r, 'Copy').filter(n => inside(n, cluster)).map(textOf)).toEqual(['On my own']);
  const journeys = byType(r, 'RoundProgress');
  expect(journeys).toHaveLength(1);
  expect(inside(journeys[0], cluster)).toBe(true);
  expect(journeys[0].props.inline).toBe(true);
  // The level line sits in the same wrapping row, before the cluster.
  expect(byType(r, 'Heading').filter(n => inside(n, header)).length).toBeGreaterThan(0);
});

it.each([[1133, 744, 3.12], [874, 402, 1], [393, 852, 3.12]])('at %sx%s, text scale %s, the journey keeps its own labelled rows', async (width, height, fontScale) => {
  Object.assign(viewport, { width, height, fontScale });
  const r = await mount('crab-commands');
  expect(r.root.findAll(n => n.props.testID === 'learn-header-cluster')).toHaveLength(0);
  const journeys = byType(r, 'RoundProgress');
  expect(journeys).toHaveLength(1);
  expect(journeys[0].props.inline).toBeUndefined();
});

it('the step reveal lands on the board itself, below the card padding and a celebration cell above it', async () => {
  const r = await mount('turtle-tales');
  await act(async () => { r.root.find(n => n.props.testID === 'learn-board').props.onLayout({ nativeEvent: { layout: { x: 0, y: 900, width: 361, height: 700 } } }); });
  await act(async () => { r.root.find(n => n.props.testID === 'learn-board-inset').props.onLayout({ nativeEvent: { layout: { x: 14, y: 78, width: 333, height: 600 } } }); });
  scrolls.length = 0;
  await act(async () => { byType(r, 'Board')[0].props.reveal(); });
  expect(scrolls).toEqual([970]);
});
