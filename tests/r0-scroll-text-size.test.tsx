/** R0 review P2: crossing the large-text threshold mid-answer must not move the page. Only a real move to another
 * question or round repositions the board. */
import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { LearnFrame } from '../src/learn/LearnFrame';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptySave } from '../src/state/validation';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { startSession } from '../src/learn/session';
import { optionsAtLevel, type LearningLevel } from '../src/learn/levels';
import type { LearnId } from '../src/learn/types';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 3.12 }));
const db = vi.hoisted(() => ({ raw: null as string | null }));
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (s: string) => { db.raw = s; }, preserve: async () => {} } }));
vi.mock('react-native', () => ({ ScrollView: 'ScrollView', View: 'View', useWindowDimensions: () => viewport, AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock('expo-router', () => ({ useIsFocused: () => true, router: { canGoBack: () => false, replace: vi.fn(), push: vi.fn() } }));
vi.mock('../src/components/ui', () => ({ Button: 'Button', Chip: 'Chip', Heading: 'Heading', Copy: 'Copy', ToggleRow: 'ToggleRow', GameHeader: 'GameHeader', C: {}, styles: {},
  Sheet: ({ visible, children, footer }: { visible: boolean; children: React.ReactNode; footer: React.ReactNode }) => visible ? React.createElement('SheetBody', null, children, footer) : null }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play: () => {}, stop: () => {} }) }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/components/Match', () => ({ Scoreboard: () => null, PlayerNames: () => null }));
vi.mock('../src/components/feel', () => ({ feel: () => {} }));
vi.mock('../src/personalization/LearnerChip', () => ({ LearnerChip: 'LearnerChip' }));
vi.mock('../src/islander/Companion', () => ({ Companion: () => null, LearningCompanion: ({ children }: { children: React.ReactNode }) => children, PhoneLearningCompanion: 'PhoneLearningCompanion', useCompanionReaction: () => ({ event: 'entry', react: () => {} }) }));
vi.mock('../src/learn/LearnChrome', () => ({ IslandBackdrop: () => null, RoundProgress: () => null, subjectTheme: new Proxy({}, { get: () => ({}) }) }));
vi.mock('../src/learn/LearnArt', () => ({ LearnArt: () => null }));
vi.mock('../src/learn/Celebrate', () => ({ Celebrate: () => null }));
vi.mock('../src/learn/LevelPath', () => ({ LevelPath: () => null }));
vi.mock('../src/learn/growth/Board', () => ({ GrowthBoard: 'Board' }));
vi.mock('../src/learn/games/hafa-adai/view', () => ({ LastPicnicWord: () => null }));
vi.mock('../src/learn/views', () => ({ views: new Proxy({}, { get: () => ({ Board: 'Board', Art: 'Art' }) }) }));
vi.mock('../src/badges/ResultCard', () => ({ BadgeResultCard: () => null }));

let root: ReactTestRenderer | undefined;
function Probe({ id }: { id: LearnId }) { const s = useStore(); useLayoutEffect(() => {}, [s]); return s.ready ? <LearnFrame id={id} /> : null; }
const scrolls = vi.hoisted(() => [] as number[]);
async function mount(id: LearnId, round = true, level: LearningLevel = 1) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const save = migrateProfiles(emptySave());
  if (round) save.learn = { [id]: { ...startSession(id, { options: optionsAtLevel({ mode: 'solo', pace: 'easy' }, level) }, {}, 7), learner: 'family' } };
  db.raw = encodeSave(save);
  await act(async () => { root = create(<StoreProvider><Probe id={id} /></StoreProvider>, { createNodeMock: () => ({ scrollTo: ({ y }: { y: number }) => scrolls.push(y) }) }); });
  return root!;
}
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.unstubAllGlobals(); Object.assign(viewport, { width: 393, height: 852, fontScale: 3.12 }); });
const byType = (r: ReactTestRenderer, type: string) => r.root.findAll(n => String(n.type) === type);

it('a text-size change mid-answer leaves the page where the child is (review P2)', async () => {
  Object.assign(viewport, { fontScale: 3.12 });
  const r = await mount('times-tide');
  await act(async () => { r.root.find(n => n.props.testID === 'learn-board').props.onLayout({ nativeEvent: { layout: { x: 0, y: 900, width: 361, height: 700 } } }); });
  scrolls.length = 0;
  let board = byType(r, 'Board')[0];
  const state = board.props.session.state;
  await act(async () => { board.props.update({ ...state, marks: [1] }); });
  expect(scrolls).toEqual([]);
  Object.assign(viewport, { fontScale: 1.35 });
  await act(async () => { r.update(<StoreProvider><Probe id="times-tide" /></StoreProvider>); });
  expect(scrolls).toEqual([]);
  board = byType(r, 'Board')[0];
  expect(board.props.session.state.index).toBe(state.index);
  expect(board.props.session.state.marks).toEqual([1]);
  scrolls.length = 0;
  Object.assign(viewport, { fontScale: 3.12 });
  await act(async () => { r.update(<StoreProvider><Probe id="times-tide" /></StoreProvider>); });
  expect(scrolls).toEqual([]);
});
