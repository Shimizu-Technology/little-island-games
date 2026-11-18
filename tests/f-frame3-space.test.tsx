/** F-frame-3: the School frame gives boards all of their card. Feedback (the star burst and the "You got it!" line)
 * never holds layout space above a board or moves it, and the width a board is told is the card's real inner width. */
import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { LearnFrame } from '../src/learn/LearnFrame';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptySave } from '../src/state/validation';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { startSession } from '../src/learn/session';
import { optionsAtLevel } from '../src/learn/levels';
import { MEASURED_SCHOOL_BOARDS } from '../src/learn/boardGeometry';
import type { LearnId } from '../src/learn/types';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 1 }));
const insets = vi.hoisted(() => ({ top: 59, bottom: 34, left: 0, right: 0 }));
const companion = vi.hoisted(() => ({ event: 'waiting' }));
const db = vi.hoisted(() => ({ raw: null as string | null }));
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (s: string) => { db.raw = s; }, preserve: async () => {} } }));
// The real Celebrate renders; its animation values are inert here.
vi.mock('react-native', () => {
  class Value { setValue() {} interpolate() { return 1; } }
  return { ScrollView: 'ScrollView', View: 'View', Text: 'Text', StyleSheet: { flatten: (s: unknown) => s }, useWindowDimensions: () => viewport,
    AppState: { addEventListener: () => ({ remove() {} }) }, Animated: { View: 'AnimatedView', Value, timing: () => ({ start() {}, stop() {} }) } };
});
vi.mock('react-native-svg', () => ({ default: 'Svg', Circle: 'Circle', Path: 'Path' }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => false, easeOut: undefined, nativeDriver: false }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => insets }));
vi.mock('expo-router', () => ({ useIsFocused: () => true, router: { canGoBack: () => false, replace: vi.fn(), push: vi.fn() } }));
vi.mock('../src/components/ui', () => ({ Button: 'Button', Chip: 'Chip', Heading: 'Heading', Copy: 'Copy', ToggleRow: 'ToggleRow', GameHeader: 'GameHeader', C: {}, styles: {},
  Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => visible ? React.createElement('SheetBody', null, children) : null }));
vi.mock('../src/components/Audio', () => ({ hasSpeech: () => true, AudioPreferences: createContext({}), useSoundControls: () => ({ play: () => {}, stop: () => {} }) }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/components/Match', () => ({ Scoreboard: () => null, PlayerNames: () => null }));
vi.mock('../src/components/feel', () => ({ feel: () => {} }));
vi.mock('../src/personalization/LearnerChip', () => ({ LearnerChip: 'LearnerChip' }));
// The tablet companion column, as Companion.tsx lays it out: the board, then a column holding the cheer and the islander.
vi.mock('../src/islander/Companion', () => ({ Companion: () => null, PhoneLearningCompanion: 'PhoneLearningCompanion',
  LearningCompanion: ({ children, cheer }: { children: React.ReactNode; cheer?: React.ReactNode }) => viewport.width < 600 ? children
    : React.createElement('View', { testID: 'companion-row' }, children, React.createElement('View', { testID: 'companion-column' }, cheer, React.createElement('Islander'))),
  useCompanionReaction: () => ({ event: companion.event, react: () => {} }) }));
vi.mock('../src/learn/LearnChrome', () => ({ IslandBackdrop: () => null, RoundProgress: 'RoundProgress', subjectTheme: new Proxy({}, { get: () => ({}) }) }));
vi.mock('../src/learn/LearnArt', () => ({ LearnArt: () => null }));
vi.mock('../src/learn/LevelPath', () => ({ LevelPath: () => null }));
vi.mock('../src/learn/games/hafa-adai/view', () => ({ LastPicnicWord: () => null }));
vi.mock('../src/badges/ResultCard', () => ({ BadgeResultCard: () => null }));
vi.mock('../src/challenge/ResultOffer', () => ({ ResultOffer: () => null }));
vi.mock('../src/learn/growth/Board', () => ({ GrowthBoard: (p: object) => React.createElement('Board', p) }));
vi.mock('../src/learn/views', async () => {
  const { useBoardSpace } = await import('../src/learn/BoardSpace');
  const Board = (p: object) => React.createElement('Board', { ...p, boardSpace: useBoardSpace() });
  return { views: new Proxy({}, { get: () => ({ Board, Art: 'Art' }) }) };
});

let root: ReactTestRenderer | undefined;
function Probe({ id }: { id: LearnId }) { const s = useStore(); useLayoutEffect(() => {}, [s]); return s.ready ? <LearnFrame id={id} /> : null; }
async function mount(id: LearnId) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  const save = migrateProfiles(emptySave());
  save.learn = { [id]: { ...startSession(id, { options: optionsAtLevel({ mode: 'solo', pace: 'easy' }, 1) }, {}, 7), learner: 'family' } };
  db.raw = encodeSave(save);
  await act(async () => { root = create(<StoreProvider><Probe id={id} /></StoreProvider>, { createNodeMock: () => ({ scrollTo() {} }) }); });
  return root!;
}
afterEach(async () => {
  if (root) await act(async () => root!.unmount()); root = undefined; vi.unstubAllGlobals();
  Object.assign(viewport, { width: 393, height: 852, fontScale: 1 }); Object.assign(insets, { left: 0, right: 0 }); companion.event = 'waiting';
});
const byType = (r: ReactTestRenderer, type: string) => r.root.findAll(n => String(n.type) === type);
const flat = (s: unknown): Record<string, unknown> => Array.isArray(s) ? Object.assign({}, ...s.map(flat)) : s && typeof s === 'object' ? { ...s as object } : {};
const absolute = (n: ReactTestInstance) => flat(n.props.style).position === 'absolute';
/** Everything that takes part in layout: each host and its style, skipping subtrees drawn over the page. */
function flow(n: ReactTestInstance, depth = 0): string[] {
  const kids = (x: ReactTestInstance, d: number) => x.children.flatMap(c => typeof c === 'string' ? [] : flow(c, d));
  if (typeof n.type !== 'string') return kids(n, depth);
  if (absolute(n)) return [];
  return [`${' '.repeat(depth)}${n.type}${n.props.testID ? `#${n.props.testID}` : ''} ${JSON.stringify({ ...flat(n.props.style), ...(String(n.type) === 'Board' ? { width: n.props.width } : {}) })}`, ...kids(n, depth + 1)];
}
/** The white card around the board: a 28-pt corner and a 2-pt border in the subject's colour. */
const boardCard = (r: ReactTestRenderer) => r.root.find(n => n.props.testID === 'learn-board').find(n => typeof n.type === 'string' && flat(n.props.style).borderRadius === 28 && flat(n.props.style).borderWidth === 2);
async function cheer(r: ReactTestRenderer, kind: 'right' | 'big') {
  companion.event = 'correct';
  await act(async () => { byType(r, 'Board')[0].props.cheer(kind); });
}
const windows = [
  ['iPhone 15', 393, 852, 1], ['iPhone 15 AX5', 393, 852, 3.12], ['iPhone 15 landscape', 852, 393, 1], ['iPhone 15 landscape AX5', 852, 393, 3.12],
  ['iPad mini', 744, 1133, 1], ['iPad mini AX5', 744, 1133, 3.12], ['iPad mini landscape', 1133, 744, 1], ['iPad mini landscape AX5', 1133, 744, 3.12],
] as const;
const measured = [...MEASURED_SCHOOL_BOARDS] as LearnId[];

it.each(windows)('%s: a burst never holds space in the board card, before, during or after it plays, on every measured School board', async (_, width, height, fontScale) => {
  Object.assign(viewport, { width, height, fontScale });
  for (const id of measured) {
    const r = await mount(id);
    for (const kind of ['right', 'big'] as const) {
      await cheer(r, kind);
      const cell = r.root.find(n => n.props.testID === 'celebration-cell');
      const card = boardCard(r);
      // The cell is drawn over the card, so no part of it is in the card's layout.
      const path: ReactTestInstance[] = [];
      for (let p: ReactTestInstance | null = cell; p && p !== card; p = p.parent) path.push(p);
      expect(path.some(p => typeof p.type === 'string' && absolute(p)), `${id} ${kind}`).toBe(true);
      // Nothing in the card's flow comes before the board.
      expect(flow(card).find(line => /^ \S/.test(line)), `${id} ${kind}`).toContain('learn-board-inset');
    }
    await act(async () => r.unmount()); root = undefined;
  }
});

it.each(windows)('%s: cheering does not move or resize anything on the page', async (_, width, height, fontScale) => {
  Object.assign(viewport, { width, height, fontScale });
  for (const id of ['space-station', 'shell-math', 'number-hop', 'hafa-adai', 'turtle-tales'] as LearnId[]) {
    const r = await mount(id);
    const idle = flow(r.root);
    await cheer(r, 'right');
    expect(byType(r, 'Copy').some(n => n.children.includes('You got it!')), id).toBe(true);
    expect(flow(r.root), id).toEqual(idle);
    await cheer(r, 'big');
    expect(flow(r.root), id).toEqual(idle);
    companion.event = 'incorrect';
    await act(async () => r.update(<StoreProvider><Probe id={id} /></StoreProvider>));
    expect(byType(r, 'Copy').some(n => n.children.includes('Try again!')), id).toBe(true);
    expect(flow(r.root), id).toEqual(idle);
    await act(async () => r.unmount()); root = undefined;
  }
});

it('the entry greeting also leaves the page where it settles', async () => {
  companion.event = 'entry';
  const r = await mount('space-station');
  const greeting = flow(r.root);
  companion.event = 'waiting';
  await act(async () => r.update(<StoreProvider><Probe id="space-station" /></StoreProvider>));
  expect(flow(r.root)).toEqual(greeting);
});

// The card: 16-pt page gutters, a 2-pt border, 12-pt padding on a phone or 22 pt from 600 pt; on a wide tablet the companion
// column (a 168-pt islander is 168 × 80 / 132 wide) and its 8-pt gap sit beside it.
const cardInner = (width: number, left = 0, right = 0, wide = false): number => Math.min(width - left - right, 1280) - 32 - 4 - (width < 600 ? 24 : 44) - (wide ? 168 * 80 / 132 + 8 : 0);

it('LearnFrame draws the card with the gutters, border and padding the width subtracts', async () => {
  for (const [width, pad] of [[393, 12], [744, 22]] as const) {
    Object.assign(viewport, { width, height: 1000 });
    const r = await mount('turtle-tales');
    const card = flat(boardCard(r).props.style);
    expect(card).toMatchObject({ borderWidth: 2, padding: pad });
    expect(flat(byType(r, 'ScrollView')[0].props.contentContainerStyle)).toMatchObject({ paddingHorizontal: 16, maxWidth: 1280 });
    await act(async () => r.unmount()); root = undefined;
  }
});

// Unmeasured boards are told the card's real width, still capped where they always were (900 pt, 812 beside the companion).
it.each([
  ['iPhone SE', 375, 667, 0, 0, 315], ['iPhone 15', 393, 852, 0, 0, 333], ['iPhone 15 landscape', 852, 393, 59, 59, 654],
  ['iPad mini', 744, 1133, 0, 0, 664], ['iPad 10th gen', 820, 1180, 0, 0, 820 - 80 - 168 * 80 / 132 - 8],
  ['iPad mini landscape', 1133, 744, 0, 0, 812], ['iPad landscape', 1024, 768, 0, 0, 812],
] as const)('%s: an unmeasured board and its text region get the real card width', async (_, width, height, left, right, expected) => {
  for (const fontScale of [1, 3.12]) {
    Object.assign(viewport, { width, height, fontScale }); Object.assign(insets, { left, right });
    const r = await mount('turtle-tales');
    expect(byType(r, 'Board')[0].props.width).toBeCloseTo(expected, 6);
    await act(async () => r.unmount()); root = undefined;
  }
});

it.each(windows)('%s: a measured board is told the measured width, and its first estimate is already that width', async (_, width, height, fontScale) => {
  Object.assign(viewport, { width, height, fontScale });
  const wide = width >= 768 && height >= 600;
  const r = await mount('hafa-adai');
  const estimate = byType(r, 'Board')[0].props.width;
  expect(estimate).toBeCloseTo(cardInner(width, 0, 0, wide), 6);
  await act(async () => {
    byType(r, 'ScrollView')[0].props.onLayout({ nativeEvent: { layout: { height: height - 200 } } });
    r.root.find(n => String(n.type) === 'View' && n.props.testID === 'learn-board').props.onLayout({ nativeEvent: { layout: { y: 90 } } });
    r.root.find(n => String(n.type) === 'View' && n.props.testID === 'learn-board-inset').props.onLayout({ nativeEvent: { layout: { y: width < 600 ? 14 : 24, width: estimate, height: 400 } } });
  });
  expect(byType(r, 'Board')[0].props.boardSpace).toMatchObject({ width: estimate, ready: true });
  expect(byType(r, 'Board')[0].props.width).toBe(estimate);
});

// The greeting no longer moves the board, so its end brings no new layout event. A board measured while it showed must
// still get its one AX entry reveal (Quick Practice and Shell Math stayed unrevealed natively until this was fixed).
it.each(['quick-practice', 'shell-math', 'space-station'] as const)('AX5 phone: %s measured during the greeting is revealed once, with no further layout', async id => {
  Object.assign(viewport, { width: 393, height: 852, fontScale: 3.12 }); companion.event = 'entry';
  const scrolls: number[] = [];
  const frames = new Map<number, FrameRequestCallback>(); let n = 0;
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const save = migrateProfiles(emptySave());
  save.learn = { [id]: { ...startSession(id, { options: optionsAtLevel({ mode: 'solo', pace: 'easy' }, 1) }, {}, 7), learner: 'family' } };
  db.raw = encodeSave(save);
  await act(async () => { root = create(<StoreProvider><Probe id={id} /></StoreProvider>, { createNodeMock: () => ({ scrollTo: (o: { y: number }) => scrolls.push(o.y), measureLayout() {} }) }); });
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => { frames.set(++n, f); return n; }); vi.stubGlobal('cancelAnimationFrame', (i: number) => frames.delete(i));
  const flushFrames = async () => act(async () => { const q = [...frames.values()]; frames.clear(); q.forEach(f => f(0)); });
  await act(async () => {
    byType(root!, 'ScrollView')[0].props.onLayout({ nativeEvent: { layout: { height: 759 } } });
    root!.root.find(x => String(x.type) === 'View' && x.props.testID === 'learn-board').props.onLayout({ nativeEvent: { layout: { y: 180 } } });
    root!.root.find(x => String(x.type) === 'View' && x.props.testID === 'learn-board-inset').props.onLayout({ nativeEvent: { layout: { y: 14, width: 333, height: 400 } } });
  });
  await flushFrames();
  companion.event = 'waiting';
  await act(async () => root!.update(<StoreProvider><Probe id={id} /></StoreProvider>));
  await flushFrames();
  expect(scrolls.filter(y => y > 0)).toEqual([186]);
});

it('a phone cheer at the bottom of the pinned header is drawn above the scrolling page', async () => {
  companion.event = 'correct';
  const r = await mount('quick-practice');
  const pinned = r.root.find(n => String(n.type) === 'View' && n.props.testID === 'learn-header-pinned');
  expect(flat(pinned.props.style).zIndex).toBeGreaterThan(0);
  expect(pinned.findAll(n => String(n.type) === 'Copy' && n.children.includes('You got it!'))).toHaveLength(1);
});
