/** R0c: the island's entry screens at the largest text size. The School subject chooser fits every subject name to its
 * tile (no word breaks mid-word, never past 2x), and Puzzles (4.0 Clean) has no paragraph at any size, caps its headings
 * through the kit, keeps its picture tiles in a phone grid, and draws nothing smaller than the system size below AX. */
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { subjects } from '../src/hub/model';
import { wordWidth } from '../src/components/wordFit';
import { emptySave } from '../src/state/validation';
import { emptyLocal } from '../src/cove/local';
import type { ChallengeCard, ChallengeEntry } from '../src/challenge/types';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 3.12 }));
const fixture = vi.hoisted(() => ({ local: {} as ReturnType<typeof import('../src/cove/useCoveLocal').useCoveLocal>, entries: [] as ChallengeEntry[] }));
vi.mock('react-native', () => {
  class Value { constructor(public v: number) {} }
  return {
    View: 'View', Switch: 'Switch', Pressable: 'Pressable', ScrollView: 'ScrollView', Modal: 'Modal', KeyboardAvoidingView: 'KeyboardAvoidingView', TextInput: 'TextInput',
    StyleSheet: { create: (s: object) => s, absoluteFill: {}, flatten: (s: unknown) => Array.isArray(s) ? Object.assign({}, ...s.flat(9).filter(Boolean)) : s }, PanResponder: { create: () => ({ panHandlers: {} }) }, Platform: { OS: 'ios' },
    Animated: { createAnimatedComponent: (c: unknown) => c, Value, timing: () => ({ start() {} }), spring: () => ({ start() {} }), View: 'AnimatedView' },
    useWindowDimensions: () => viewport,
  };
});
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'main', useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock('react-native-svg', () => ({ default: 'Svg', Circle: 'Circle', Path: 'Path', Ellipse: 'Ellipse', G: 'G', Rect: 'Rect', Line: 'Line', Text: 'SvgText' }));
vi.mock('expo-router', async () => { const { useEffect } = await import('react'); return { router: { push: vi.fn(), back: vi.fn(), canGoBack: () => true, replace: vi.fn() }, useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]), useLocalSearchParams: () => ({}) }; });
vi.mock('../src/components/Text', () => ({ Text: 'Text' }));
vi.mock('../src/components/motion', () => ({ easeOut: 0, nativeDriver: true, useReducedMotion: () => true }));
vi.mock('../src/components/Recovery', () => ({ Recovery: () => null }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/cove/PeoplePicker', () => ({ PeoplePicker: () => null, solvingPeople: () => [{ id: 'family', name: 'Family practice' }] }));
vi.mock('../src/cove/CoveRound', () => ({ CoveRound: () => null }));
vi.mock('../src/cove/useCoveLocal', () => ({ useCoveLocal: () => fixture.local }));
vi.mock('../src/state/Store', () => ({ useStore: () => ({ ready: true, epoch: 1, save: emptySave(), covePerson: vi.fn() }) }));
vi.mock('../src/hub/navigation', () => ({ openGame: vi.fn() }));
vi.mock('react-native-reanimated', async () => (await import('./helpers/cove-ui')).reanimated);
vi.mock('expo-haptics', async () => (await import('./helpers/cove-ui')).haptics);
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false, NunitoProvider: 'View' }));
vi.mock('../src/ui/icons', async () => (await import('./helpers/cove-ui')).icons());
vi.mock('../src/cove/catalog', async () => ({ ...await vi.importActual('../src/cove/catalog'), coveEntries: () => fixture.entries }));

const textOf = (n: ReactTestInstance): string => n.children.map(c => typeof c === 'string' ? c : textOf(c)).join('');
const flat = (style: unknown): Record<string, unknown> => Array.isArray(style) ? Object.assign({}, ...style.map(flat)) : (style && typeof style === 'object' ? style as Record<string, unknown> : {});
let root: ReactTestRenderer | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; Object.assign(viewport, { width: 393, height: 852, fontScale: 3.12 }); vi.unstubAllGlobals(); });
const inSheet = (n: ReactTestInstance) => { for (let p = n.parent; p; p = p.parent) if (String(p.type) === 'Modal') return true; return false; };
const texts = (type = 'Text') => root!.root.findAll(n => String(n.type) === type && !inSheet(n));
const heading = (text: string) => root!.root.find(n => String(n.type) === 'Text' && n.props.accessibilityRole === 'header' && textOf(n) === text);
/** The nth View above a node (1 = its text column, 2 = the row that holds the picture and the text). */
const viewAbove = (n: ReactTestInstance, nth: number) => { let p = n.parent, seen = 0; while (p) { if (String(p.type) === 'View' && ++seen === nth) return p; p = p.parent; } throw new Error('no View'); };
const widest = (text: string, size: number, multiplier: number) => Math.max(...text.split(/[\s ]+/).map(w => wordWidth(w) * size * multiplier));

it.each([[393, 3.12], [320, 3.12], [393, 1.5], [852, 3.12]])('School subject names at %s pt, text scale %s: every name fits its tile and stops by 2x (44 pt)', async (width, fontScale) => {
  Object.assign(viewport, { width, fontScale });
  const { default: School } = await import('../src/hub/SchoolScreen');
  await act(async () => { root = create(<School />); });
  const columns = fontScale > 1.5 || width < 340 ? 1 : width > 650 ? 3 : 2, tile = (Math.min(width - 40, 900) - (columns - 1) * 12) / columns;
  for (const { name } of subjects) {
    const h = heading(name), max = h.props.maxFontSizeMultiplier as number;
    expect(max, name).toBeGreaterThanOrEqual(1); expect(max, name).toBeLessThanOrEqual(2);
    expect(21 * max, name).toBeLessThanOrEqual(44);
    // The widest word, drawn at the larger of the capped size and the system size, never exceeds the tile's text width.
    expect(widest(name, 21, Math.min(fontScale, max)), `${name} in ${tile}`).toBeLessThanOrEqual(tile - 34);
  }
  // Six names share one size, so the tiles read as a set.
  expect(new Set(subjects.map(s => heading(s.name).props.maxFontSizeMultiplier)).size).toBe(1);
});

it('School chrome stops at 1.5x at accessibility sizes and its picture sits above the question; the default layout is unchanged', async () => {
  const { default: School } = await import('../src/hub/SchoolScreen');
  await act(async () => { root = create(<School />); });
  expect(heading('School').props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
  expect(heading('What are you curious about?').props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
  expect(root!.root.findAll(n => String(n.type) === 'Text' && /^Six little islands/.test(textOf(n)))[0].props.maxFontSizeMultiplier).toBe(1.5);
  const intro = viewAbove(heading('What are you curious about?'), 2);
  expect(flat(intro.props.style).flexDirection).toBe('column');
  await act(async () => root!.unmount()); root = undefined;
  // Default size: two columns, the picture beside the question, the same sizes as before.
  Object.assign(viewport, { fontScale: 1 });
  await act(async () => { root = create(<School />); });
  const tiles = root!.root.findAll(n => String(n.type) === 'Pressable' && n.props.accessibilityRole === 'button' && /^Open /.test(n.props.accessibilityLabel ?? ''));
  expect(tiles).toHaveLength(6);
  for (const t of tiles) { const s = flat(t.props.style); expect(s.width).toBe((393 - 40 - 12) / 2); expect(s.minHeight).toBe(164); expect(s.padding).toBe(16); }
  expect(flat(viewAbove(heading('What are you curious about?'), 2).props.style).flexDirection).toBe('row');
  expect(flat(heading('School').props.style).fontSize).toBe(27);
  for (const { name } of subjects) expect(flat(heading(name).props.style).fontSize).toBe(21);
});

const cards = [1, 2, 3].map((tier, i) => ({ tier, title: `Fixture ${i}`, ref: { bank: 10, puzzle: i, engine: 'sudoku', rules: 1, hash: String(i).repeat(64) } })) as ChallengeCard[];
const entry = (game: string): ChallengeEntry => ({ game, cove: true, puzzles: cards.map(c => ({ ...c, ref: { ...c.ref, engine: game } })), codec: 'fixture', contextFor: () => 'fixture', start: () => { throw new Error('Fixture only'); }, move: () => null, render: () => null, controls: { help: () => null, reset: () => null }, catalog: { banks: new Map(), codecs: new Map(), contexts: new Set(), dares: new Map() } }) as unknown as ChallengeEntry;
async function mountCove(games = ['sudoku']) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  fixture.entries = games.map(entry); fixture.local = { data: emptyLocal(), ready: true, error: '', load: vi.fn(), reset: vi.fn(), change: vi.fn() };
  const { default: Cove } = await import('../src/cove/CoveScreen');
  await act(async () => { root = create(<Cove />); });
}

it('Puzzles home at AX5: no paragraph, every heading capped by the kit, Back is one labelled icon', async () => {
  await mountCove(['sudoku', 'killer', 'bridges']);
  const room = 393 - 32;
  expect(heading('Puzzles').props.maxFontSizeMultiplier).toBeLessThanOrEqual(2);
  for (const h of texts().filter(n => n.props.accessibilityRole === 'header')) {
    expect(h.props.maxFontSizeMultiplier ?? Infinity, textOf(h)).toBeLessThanOrEqual(2);
    for (const w of textOf(h).split(' ')) expect(wordWidth(w) * 22 * Math.min(3.12, h.props.maxFontSizeMultiplier), `${w} in "${textOf(h)}"`).toBeLessThanOrEqual(room);
  }
  expect(root!.root.findAll(n => n.props.accessibilityLabel === 'Back to map' && String(n.type) === 'Pressable')).toHaveLength(1);
  // No status prose, no counts, no band words: every visible text is a short label.
  for (const t of texts()) expect(textOf(t).length, textOf(t)).toBeLessThanOrEqual(24);
  expect(texts().map(textOf).join(' ')).not.toMatch(/\b(?:Paddling|Shallows|Lagoon|Deep|Trench|bands?)\b|\bReef\b(?! Sweep)|puzzles ·/);
  // Tile names keep to two lines, share one size, and every word fits its tile at that size (no word breaks mid-way).
  const tile = Math.floor((393 - 32 - 12) / 2), names = ['Sudoku', 'Cage Sudoku', 'Bridges', 'Today'].map(name => texts().find(t => textOf(t) === name)!);
  for (const t of names) {
    expect(t.props.numberOfLines).toBe(2);
    expect(t.props.maxFontSizeMultiplier, textOf(t)).toBeGreaterThanOrEqual(1); expect(t.props.maxFontSizeMultiplier, textOf(t)).toBeLessThanOrEqual(2);
    expect(widest(textOf(t), 15, Math.min(3.12, t.props.maxFontSizeMultiplier)), textOf(t)).toBeLessThanOrEqual(tile);
  }
  expect(new Set(names.map(t => t.props.maxFontSizeMultiplier)).size).toBe(1);
  // No paragraph, tile or button label is left uncapped.
  expect(texts().filter(n => n.props.maxFontSizeMultiplier === undefined && textOf(n).length > 12).map(textOf)).toEqual([]);
});

it('the Today tile shows a sun and opens from one labelled tile', async () => {
  await mountCove(['sudoku', 'killer', 'bridges']);
  const today = root!.root.find(n => String(n.type) === 'Pressable' && n.props.testID === 'cove-today');
  expect(today.props.accessibilityLabel).toBe('Today');
  expect(today.findAll(n => n.props.testID === 'cove-today-art')).toHaveLength(1);
});

it('Puzzles home at default size lays tiles out two to a phone row under plain section headings', async () => {
  Object.assign(viewport, { fontScale: 1 });
  await mountCove(['sudoku', 'killer', 'bridges', 'solitaire']);
  for (const title of ['Numbers', 'Logic', 'Cards']) expect(heading(title)).toBeDefined();
  const tile = root!.root.find(n => String(n.type) === 'Pressable' && n.props.testID === 'cove-tile-sudoku');
  expect(flat(viewAbove(tile, 1).props.style).width).toBe(Math.floor((393 - 32 - 12) / 2));
});

// Fix round 1 (P2-1): below the accessibility threshold (text scale 1.5) every new cap is absent, so no text draws smaller than the system size.
const belowAx = [1, 1.3, 1.35];
/** Texts whose cap would draw them smaller than the system scale: none may exist below the accessibility sizes. */
const shrunk = () => root!.root.findAll(n => String(n.type) === 'Text' && !inSheet(n) && typeof n.props.maxFontSizeMultiplier === 'number' && n.props.maxFontSizeMultiplier < viewport.fontScale).map(n => `${textOf(n).slice(0, 40)} @${n.props.maxFontSizeMultiplier}`);
it.each(belowAx)('School at text scale %s draws every text at the system size (no cap, so nothing shrinks)', async fontScale => {
  Object.assign(viewport, { fontScale });
  const { default: School } = await import('../src/hub/SchoolScreen');
  await act(async () => { root = create(<School />); });
  expect(shrunk()).toEqual([]);
  // The shared name size in particular: 28.35 pt at 1.35, not the 25.83 pt a 1.23 cap drew.
  for (const { name } of subjects) expect(heading(name).props.maxFontSizeMultiplier, name).toBeUndefined();
});
it.each(belowAx)('Puzzles at text scale %s draws every text at the system size, tiles and buttons included', async fontScale => {
  Object.assign(viewport, { fontScale });
  await mountCove(['sudoku', 'killer', 'bridges']);
  expect(shrunk()).toEqual([]);
});
