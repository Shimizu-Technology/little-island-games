/** F-frame-3 fix round 1 (review P2-1, P2-2, P2-3): a rotation reveals the board without waiting out an answer's cheer or
 * using the previous window's offsets, the cheer line stays clear of long mode labels and inside a tablet's column, and the
 * in-board burst is not drawn where it would land on a revealed board's words, nor replayed when the card remounts. */
import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { LearnFrame } from '../src/learn/LearnFrame';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptySave } from '../src/state/validation';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { startSession } from '../src/learn/session';
import { optionsAtLevel } from '../src/learn/levels';
import type { LearnId, LearnMode } from '../src/learn/types';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 3.12 }));
const insets = vi.hoisted(() => ({ top: 59, bottom: 34, left: 0, right: 0 }));
const companion = vi.hoisted(() => ({ event: 'waiting' }));
const timings = vi.hoisted(() => [] as { done: (r: { finished: boolean }) => void }[]);
const db = vi.hoisted(() => ({ raw: null as string | null }));
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (s: string) => { db.raw = s; }, preserve: async () => {} } }));
vi.mock('react-native', () => {
  class Value { setValue() {} interpolate() { return 1; } }
  return { ScrollView: 'ScrollView', View: 'View', Text: 'Text', StyleSheet: { flatten: (s: unknown) => s }, useWindowDimensions: () => viewport,
    AppState: { addEventListener: () => ({ remove() {} }) },
    // A burst's animation ends when the test says so.
    Animated: { View: 'AnimatedView', Value, timing: () => ({ start(done: (r: { finished: boolean }) => void) { timings.push({ done }); }, stop() {} }) } };
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
// As Companion.tsx lays it out: below 600 pt the children stand alone, so crossing 600 pt remounts the whole card.
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
const scrolls: number[] = [];
const frames = new Map<number, FrameRequestCallback>(); let frameId = 0;
function Probe({ id }: { id: LearnId }) { const s = useStore(); useLayoutEffect(() => {}, [s]); return s.ready ? <LearnFrame id={id} /> : null; }
async function mount(id: LearnId, mode: LearnMode = 'solo') {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => { frames.set(++frameId, f); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (i: number) => frames.delete(i));
  const save = migrateProfiles(emptySave());
  save.learn = { [id]: { ...startSession(id, { options: optionsAtLevel({ mode, pace: 'easy' }, 1) }, {}, 7), learner: 'family' } };
  db.raw = encodeSave(save);
  await act(async () => { root = create(<StoreProvider><Probe id={id} /></StoreProvider>, { createNodeMock: () => ({ scrollTo: (o: { y: number }) => { if (o.y > 0) scrolls.push(o.y); }, measureLayout() {} }) }); });
  return root!;
}
afterEach(async () => {
  if (root) await act(async () => root!.unmount()); root = undefined; vi.unstubAllGlobals();
  Object.assign(viewport, { width: 393, height: 852, fontScale: 3.12 }); Object.assign(insets, { left: 0, right: 0 }); companion.event = 'waiting';
  scrolls.length = 0; frames.clear(); timings.length = 0;
});
const byType = (r: ReactTestRenderer, type: string) => r.root.findAll(n => String(n.type) === type);
const byId = (r: ReactTestRenderer, testID: string) => r.root.find(n => String(n.type) === 'View' && n.props.testID === testID);
const textOf = (n: ReactTestInstance): string => n.children.map(c => typeof c === 'string' ? c : textOf(c)).join('');
const flat = (s: unknown): Record<string, unknown> => Array.isArray(s) ? Object.assign({}, ...s.map(flat)) : s && typeof s === 'object' ? { ...s as object } : {};
const flush = async () => act(async () => { const q = [...frames.values()]; frames.clear(); q.forEach(f => f(0)); });
const rerender = (r: ReactTestRenderer, id: LearnId) => act(async () => r.update(<StoreProvider><Probe id={id} /></StoreProvider>));

type Geometry = { width: number; viewportWidth: number; viewportHeight: number; top: number; inset: number; inner: number };
/** What the native layout delivers for a window: the viewport, the board's top in the page and the inset inside its card. */
async function deliver(r: ReactTestRenderer, g: Geometry) {
  await act(async () => {
    byType(r, 'ScrollView')[0].props.onLayout({ nativeEvent: { layout: { height: g.viewportHeight, width: g.viewportWidth } } });
    byId(r, 'learn-board').props.onLayout({ nativeEvent: { layout: { y: g.top } } });
    byId(r, 'learn-board-inset').props.onLayout({ nativeEvent: { layout: { y: g.inset, width: g.inner, height: 400 } } });
  });
}
// The two windows each device rotates between, with the geometry its layout reports.
const phone = { portrait: { w: 393, h: 852, g: { width: 393, viewportWidth: 393, viewportHeight: 759, top: 180, inset: 14, inner: 333 } },
  landscape: { w: 852, h: 393, left: 59, right: 59, g: { width: 852, viewportWidth: 734, viewportHeight: 300, top: 247, inset: 24, inner: 654 } } };
const tablet = { portrait: { w: 744, h: 1133, g: { width: 744, viewportWidth: 744, viewportHeight: 1040, top: 190, inset: 24, inner: 664 } },
  landscape: { w: 1133, h: 744, left: 0, right: 0, g: { width: 1133, viewportWidth: 1133, viewportHeight: 650, top: 204, inset: 24, inner: 943 } } };
const reveal = (g: Geometry) => g.top + g.inset - 8;

// ── P2-1: rotation never waits out a cheer, and never reveals against the previous window ─────────────────────────────
it.each([['phone', phone], ['tablet', tablet]] as const)('AX5 %s: rotating during a right answer\'s cheer reveals the board at once, once, against the new window\'s offsets', async (_, d) => {
  Object.assign(viewport, { width: d.portrait.w, height: d.portrait.h });
  const r = await mount('space-station');
  await deliver(r, d.portrait.g); await flush();
  expect(scrolls).toEqual([reveal(d.portrait.g)]); // the entry reveal, as before
  scrolls.length = 0;
  for (const event of ['correct', 'incorrect']) {
    companion.event = event; await rerender(r, 'space-station');
    Object.assign(viewport, { width: d.landscape.w, height: d.landscape.h }); Object.assign(insets, { left: d.landscape.left, right: d.landscape.right });
    await rerender(r, 'space-station'); await deliver(r, d.landscape.g); await flush();
    expect(scrolls, event).toEqual([reveal(d.landscape.g)]);
    scrolls.length = 0;
    // And back, still mid-reaction.
    Object.assign(viewport, { width: d.portrait.w, height: d.portrait.h }); Object.assign(insets, { left: 0, right: 0 });
    await rerender(r, 'space-station'); await deliver(r, d.portrait.g); await flush();
    expect(scrolls, `${event} back`).toEqual([reveal(d.portrait.g)]);
    scrolls.length = 0;
  }
});

it.each([['phone', phone], ['tablet', tablet]] as const)('AX5 %s: the entry greeting still holds the first reveal, and a rotation during it still waits for it', async (_, d) => {
  Object.assign(viewport, { width: d.portrait.w, height: d.portrait.h });
  companion.event = 'entry';
  const r = await mount('space-station');
  await deliver(r, d.portrait.g); await flush();
  expect(scrolls).toEqual([]);
  Object.assign(viewport, { width: d.landscape.w, height: d.landscape.h }); Object.assign(insets, { left: d.landscape.left, right: d.landscape.right });
  await rerender(r, 'space-station'); await deliver(r, d.landscape.g); await flush();
  expect(scrolls).toEqual([]);
  companion.event = 'waiting'; await rerender(r, 'space-station'); await flush();
  expect(scrolls).toEqual([reveal(d.landscape.g)]);
});

it.each([['phone', phone], ['tablet', tablet]] as const)('AX5 %s: dimensions before layout waits for the new layout, then reveals against it once', async (_, d) => {
  Object.assign(viewport, { width: d.portrait.w, height: d.portrait.h });
  const r = await mount('space-station');
  await deliver(r, d.portrait.g); await flush();
  scrolls.length = 0;
  companion.event = 'correct'; await rerender(r, 'space-station');
  Object.assign(viewport, { width: d.landscape.w, height: d.landscape.h }); Object.assign(insets, { left: d.landscape.left, right: d.landscape.right });
  await rerender(r, 'space-station');
  // The queued frame runs before the new layout arrives: nothing may scroll to the old window's offset.
  await flush();
  expect(scrolls).toEqual([]);
  await deliver(r, d.landscape.g); await flush();
  expect(scrolls).toEqual([reveal(d.landscape.g)]);
  // The layout has settled; nothing more happens.
  await flush();
  expect(scrolls).toEqual([reveal(d.landscape.g)]);
});

it.each([['phone', phone], ['tablet', tablet]] as const)('AX5 %s: layout before dimensions is also revealed once, against that layout', async (_, d) => {
  Object.assign(viewport, { width: d.portrait.w, height: d.portrait.h });
  const r = await mount('space-station');
  await deliver(r, d.portrait.g); await flush();
  scrolls.length = 0;
  companion.event = 'correct'; await rerender(r, 'space-station');
  await deliver(r, d.landscape.g); await flush();
  expect(scrolls).toEqual([]); // the window has not changed yet
  Object.assign(viewport, { width: d.landscape.w, height: d.landscape.h }); Object.assign(insets, { left: d.landscape.left, right: d.landscape.right });
  await rerender(r, 'space-station'); await flush();
  expect(scrolls).toEqual([reveal(d.landscape.g)]);
});

it('a short landscape reveal at the default text size also waits for its layout', async () => {
  Object.assign(viewport, { width: 393, height: 852, fontScale: 1 });
  const r = await mount('space-station');
  await deliver(r, phone.portrait.g); await flush();
  expect(scrolls).toEqual([]);
  Object.assign(viewport, { width: 852, height: 393 }); Object.assign(insets, { left: 59, right: 59 });
  await rerender(r, 'space-station'); await flush();
  expect(scrolls).toEqual([]);
  await deliver(r, phone.landscape.g); await flush();
  expect(scrolls).toEqual([reveal(phone.landscape.g)]);
});

// ── P2-2: the cheer line clears long mode labels and stays inside a tablet's column and gutter ──────────────────────────
const pillOf = (r: ReactTestRenderer) => r.root.find(n => String(n.type) === 'View' && n.props.accessibilityLiveRegion === 'polite');
const opacityOf = (r: ReactTestRenderer) => flat(byId(r, 'learn-cheer-phone').props.style).opacity;
const lay = (node: ReactTestInstance, x: number, y: number, width: number, height: number) => node.props.onLayout({ nativeEvent: { layout: { x, y, width, height } } });
const modeCopy = (r: ReactTestRenderer, text: string) => byType(r, 'Copy').find(n => n.props.onLayout && textOf(n) === text)!;

it("a phone at the default size doesn't draw the cheer over Slip Tide's long mode label, and draws it where the label is short", async () => {
  Object.assign(viewport, { width: 393, height: 852, fontScale: 1.4 }); companion.event = 'correct';
  const r = await mount('slip-tide', 'together');
  const mode = modeCopy(r, 'Together: two directions each');
  await act(async () => { lay(mode.parent!, 0, 0, 361, 22); lay(mode, 0, 0, 262, 22); lay(pillOf(r), 0, 0, 150, 29); });
  expect(opacityOf(r)).toBe(0);
  // The line is still mounted and announced, and nothing else moved.
  expect(byType(r, 'Copy').some(n => textOf(n) === 'You got it!')).toBe(true);
  expect(flat(byId(r, 'learn-cheer-phone').props.style)).toMatchObject({ position: 'absolute' });
  await act(async () => lay(mode, 0, 0, 120, 22));
  expect(opacityOf(r)).toBe(1);
});

it('a phone at AX5 keeps the cheer clear of a wrapped Slip Tide row: a maximum-length learner chip above and the mode on the last line', async () => {
  Object.assign(viewport, { width: 393, height: 852, fontScale: 3.12 }); companion.event = 'correct';
  const r = await mount('slip-tide', 'together');
  const mode = modeCopy(r, 'Together: two directions each'), row = mode.parent!;
  const chip = row.findAll(n => String(n.type) === 'View' && n.props.onLayout && n !== row)[0];
  await act(async () => { lay(row, 0, 0, 361, 70); lay(chip, 0, 0, 361, 40); lay(mode, 0, 48, 262, 22); lay(pillOf(r), 0, 0, 136, 29); });
  expect(opacityOf(r)).toBe(0);
  // A short learner name leaves the line above clear of the pill's column, so only the mode label matters.
  await act(async () => { lay(chip, 0, 0, 160, 40); lay(mode, 0, 48, 120, 22); });
  expect(opacityOf(r)).toBe(1);
  // Until the row has been measured, nothing is painted.
  const fresh = await mount('slip-tide', 'together');
  expect(opacityOf(fresh)).toBe(0);
});

it.each([
  ['beside the card (iPad mini landscape)', 1133, 744, 3.12],
  ['beside the card (iPad 10th gen portrait)', 820, 1180, 3.12],
  ['below the card (iPad mini portrait)', 744, 1133, 3.12],
] as const)('the tablet cheer %s stays within its column and the 16-pt gutter at AX5', async (_, width, height, fontScale) => {
  Object.assign(viewport, { width, height, fontScale }); companion.event = 'correct';
  const r = await mount('space-station');
  const wrapper = flat(byId(r, 'learn-cheer-tablet').props.style);
  expect(wrapper.position).toBe('absolute');
  if (width >= 768) {
    // The 102-pt column and the 16-pt gutter beside it: the pill can reach at most 16 pt past either side.
    expect(wrapper.left as number).toBeGreaterThanOrEqual(-16);
    expect(wrapper.right as number).toBeGreaterThanOrEqual(-16);
    expect(wrapper.alignItems).toBe('center');
  } else {
    expect(wrapper.right).toBe('100%'); // to the islander's left, over blank page
  }
  // A pill wider than that wraps its words instead of overflowing.
  expect(flat(pillOf(r).props.style).maxWidth).toBe('100%');
});

// ── P2-3: no in-board burst over a revealed board's words, and no replay when the card remounts ───────────────────────
const cheerNow = async (r: ReactTestRenderer, kind: 'right' | 'big' = 'right') => act(async () => { byType(r, 'Board')[0].props.cheer(kind); });
it.each([
  ['AX5 phone', 393, 852, 3.12], ['AX5 phone landscape', 852, 393, 3.12], ['AX5 iPad', 744, 1133, 3.12], ['AX5 iPad landscape', 1133, 744, 3.12],
  ['default short landscape phone', 852, 393, 1],
] as const)('%s: the revealed board is not covered by a burst, in motion or under Reduce Motion', async (_, width, height, fontScale) => {
  Object.assign(viewport, { width, height, fontScale });
  const r = await mount('hafa-adai');
  await cheerNow(r, 'right'); await cheerNow(r, 'big');
  expect(r.root.findAll(n => n.props.testID === 'celebration-cell')).toHaveLength(0);
  expect(timings).toHaveLength(0);
});

it('the burst stays on the card border at the default size', async () => {
  Object.assign(viewport, { width: 393, height: 852, fontScale: 1 });
  const r = await mount('hafa-adai');
  await cheerNow(r);
  const cell = r.root.find(n => n.props.testID === 'celebration-cell');
  let wrapper = cell.parent!;
  while (typeof wrapper.type !== 'string') wrapper = wrapper.parent!;
  expect(flat(wrapper.props.style)).toMatchObject({ position: 'absolute', top: -33 });
  expect(timings).toHaveLength(1);
});

it('a burst skipped on a revealed board does not start later when a rotation brings the card to the border', async () => {
  Object.assign(viewport, { width: 852, height: 393, fontScale: 1 });
  const r = await mount('hafa-adai');
  await cheerNow(r);
  expect(timings).toHaveLength(0);
  Object.assign(viewport, { width: 393, height: 852 }); await rerender(r, 'hafa-adai');
  expect(timings).toHaveLength(0);
  await cheerNow(r); // a new answer still celebrates
  expect(timings).toHaveLength(1);
});

it('a finished burst is not replayed when rotating across the 600-pt companion breakpoint', async () => {
  Object.assign(viewport, { width: 393, height: 852, fontScale: 1 });
  const r = await mount('hafa-adai');
  await cheerNow(r);
  expect(timings).toHaveLength(1);
  await act(async () => timings[0].done({ finished: true }));
  Object.assign(viewport, { width: 744, height: 1133 }); await rerender(r, 'hafa-adai'); // the card remounts inside the companion row
  expect(timings).toHaveLength(1);
  Object.assign(viewport, { width: 393, height: 852 }); await rerender(r, 'hafa-adai');
  expect(timings).toHaveLength(1);
  await cheerNow(r); // the next answer celebrates as usual, however many came before
  expect(timings).toHaveLength(2);
});
