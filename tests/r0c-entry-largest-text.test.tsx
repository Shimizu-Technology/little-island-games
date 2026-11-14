/** R0c: the island's entry screens at the largest text size. The School subject chooser fits every subject name to its
 * tile (no word breaks mid-word, never past 2x), and Puzzle Cove's landing keeps its chrome compact, shows each Today
 * card with its family's picture, and leaves the default layout as it was. */
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

it.each([[393, 3.12], [320, 3.12], [393, 1.5], [852, 3.12], [393, 1.35]])('School subject names at %s pt, text scale %s: every name fits its tile and stops by 2x (44 pt)', async (width, fontScale) => {
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

it('Puzzle Cove landing at AX5: title, intro, headings and tiles are capped so the first row of puzzles is within one screen', async () => {
  await mountCove(['sudoku', 'cage-math', 'bridges']);
  const room = 393 - 40;
  expect(heading('Puzzle Cove').props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
  expect(widest('Puzzle Cove', 28, heading('Puzzle Cove').props.maxFontSizeMultiplier)).toBeLessThanOrEqual(room);
  expect(heading('Think as long as you like.').props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
  for (const h of texts().filter(n => n.props.accessibilityRole === 'header')) {
    expect(h.props.maxFontSizeMultiplier ?? Infinity, textOf(h)).toBeLessThanOrEqual(1.5);
    for (const w of textOf(h).split(' ')) expect(wordWidth(w) * 23 * Math.min(3.12, h.props.maxFontSizeMultiplier), `${w} in "${textOf(h)}"`).toBeLessThanOrEqual(room);
  }
  // Back is an icon beside the title, so the title and Back share a row.
  expect(root!.root.findAll(n => n.props.accessibilityLabel === 'Back to map' && String(n.type) === 'Pressable')).toHaveLength(1);
  expect(texts().filter(n => textOf(n) === '← Map')).toHaveLength(0);
  // The intro picture is smaller than at default size.
  const art = root!.root.findAll(n => flat(n.props.style).width === 72 && flat(n.props.style).height === 57);
  expect(art.length).toBeGreaterThan(0);
  // No paragraph, tile or button label is left uncapped.
  const uncapped = texts().filter(n => n.props.maxFontSizeMultiplier === undefined && textOf(n).length > 12 && !/^[☆★]/.test(textOf(n)));
  expect(uncapped.map(textOf)).toEqual([]);
});

it('every Today card shows its puzzle family\'s picture in the hub tile style, and keeps its spoken label', async () => {
  await mountCove(['sudoku', 'cage-math', 'bridges']);
  const today = root!.root.findAll(n => String(n.type) === 'Pressable' && /^Open (Small|Medium|Large) · /.test(n.props.accessibilityLabel ?? ''));
  expect(today).toHaveLength(3);
  for (const card of today) {
    expect(card.findAll(n => n.props.testID === 'cove-motif')).toHaveLength(1);
    const s = flat(card.props.style);
    expect(s.borderRadius).toBe(26); expect(['#F7EBD0', '#FBE6DC']).toContain(s.backgroundColor);
    expect(card.props.accessibilityLabel).toMatch(/^Open (Small|Medium|Large) · [A-Za-z -]+\. Fixture \d$/);
  }
});

it('Puzzle Cove at default size keeps its header, intro and tiles as they were', async () => {
  Object.assign(viewport, { fontScale: 1 });
  await mountCove();
  expect(texts().filter(n => textOf(n) === '← Map')).toHaveLength(1);
  expect(root!.root.findAll(n => n.props.accessibilityLabel === 'Back to map')).toHaveLength(0);
  expect(flat(heading('Puzzle Cove').props.style).fontSize).toBe(28);
  expect(flat(heading('Think as long as you like.').props.style).fontSize).toBe(24);
  expect(flat(viewAbove(heading('Think as long as you like.'), 2).props.style).flexDirection).toBe('row');
  expect(root!.root.findAll(n => flat(n.props.style).width === 110 && flat(n.props.style).height === 90).length).toBeGreaterThan(0);
  expect(flat(root!.root.findAll(n => String(n.type) === 'Pressable' && /^Open Small · /.test(n.props.accessibilityLabel ?? ''))[0].props.style).width).toBe(260);
});
