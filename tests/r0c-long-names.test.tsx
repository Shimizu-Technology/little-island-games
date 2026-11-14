/** R0c fix round 1 (P2-2): a valid 24-character wide name (WWWWWWWWWWWWWWWWWWWWWWWW) is wider than a phone's line at any
 * text size. Puzzle Cove's identity controls keep it on one line in their column, ending in an ellipsis, with the full name spoken. */
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { wordWidth } from '../src/components/wordFit';
import { addLearner, selectLearner } from '../src/learn/learners';
import { emptySave } from '../src/state/validation';
import { emptyLocal } from '../src/cove/local';
import type { ChallengeCard, ChallengeEntry } from '../src/challenge/types';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 3.12 }));
const fixture = vi.hoisted(() => ({ save: {} as ReturnType<typeof import('../src/state/validation').emptySave>, local: {} as ReturnType<typeof import('../src/cove/useCoveLocal').useCoveLocal>, entries: [] as ChallengeEntry[] }));
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
vi.mock('../src/cove/CoveRound', () => ({ CoveRound: () => null }));
vi.mock('../src/cove/useCoveLocal', () => ({ useCoveLocal: () => fixture.local }));
vi.mock('../src/state/Store', () => ({ useStore: () => ({ ready: true, epoch: 1, save: fixture.save, covePerson: vi.fn(), selectLearner: vi.fn() }) }));
vi.mock('../src/hub/navigation', () => ({ openGame: vi.fn() }));
vi.mock('../src/cove/catalog', async () => ({ ...await vi.importActual('../src/cove/catalog'), coveEntries: () => fixture.entries }));

const NAME = 'W'.repeat(24);
const textOf = (n: ReactTestInstance): string => n.children.map(c => typeof c === 'string' ? c : textOf(c)).join('');
const flat = (style: unknown): Record<string, unknown> => Array.isArray(style) ? Object.assign({}, ...style.map(flat)) : (style && typeof style === 'object' ? style as Record<string, unknown> : {});
let root: ReactTestRenderer | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; Object.assign(viewport, { width: 393, height: 852, fontScale: 3.12 }); vi.unstubAllGlobals(); });
const cards = [1, 2, 3].map((tier, i) => ({ tier, title: `Fixture ${i}`, ref: { bank: 10, puzzle: i, engine: 'sudoku', rules: 1, hash: String(i).repeat(64) } })) as ChallengeCard[];
const entry = (game: string): ChallengeEntry => ({ game, cove: true, puzzles: cards.map(c => ({ ...c, ref: { ...c.ref, engine: game } })), codec: 'fixture', contextFor: () => 'fixture', start: () => { throw new Error('Fixture only'); }, move: () => null, render: () => null, controls: { help: () => null, reset: () => null }, catalog: { banks: new Map(), codecs: new Map(), contexts: new Set(), dares: new Map() } }) as unknown as ChallengeEntry;
/** `current` makes the wide name the person solving; otherwise Family practice is solving and the wide name is a partner. */
async function mountCove(current: boolean) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const learning = addLearner(undefined, NAME, 'wide');
  fixture.save = { ...emptySave(), learning: current ? learning : selectLearner(learning, 'family') };
  fixture.entries = [entry('sudoku')]; fixture.local = { data: emptyLocal(), ready: true, error: '', load: vi.fn(), reset: vi.fn(), change: vi.fn() };
  const { default: Cove } = await import('../src/cove/CoveScreen');
  await act(async () => { root = create(<Cove />); });
}
const inSheet = (n: ReactTestInstance) => { for (let p = n.parent; p; p = p.parent) if (String(p.type) === 'Modal') return true; return false; };
const buttonOf = (label: string, sheet = false) => root!.root.find(n => String(n.type) === 'Pressable' && n.props.accessibilityLabel === label && inSheet(n) === sheet);
/** The text a control draws, which must stay on one line in the control's column. */
const labelText = (button: ReactTestInstance) => button.find(n => String(n.type) === 'Text' && textOf(n).startsWith(NAME));

it.each([[3.12], [1]])('the premise: at text scale %s the wide name alone is wider than a 393-pt phone line', fontScale => {
  expect(wordWidth(NAME) * 15 * Math.min(fontScale, 1.3)).toBeGreaterThan(393 - 40);
});

it.each([[3.12], [1]])('Cove at text scale %s: the person solving, a 24-wide name, keeps to one line in its column and keeps its full spoken name', async fontScale => {
  Object.assign(viewport, { fontScale });
  await mountCove(true);
  const picker = buttonOf(`Who is solving: ${NAME}`);
  expect(flat(picker.props.style).maxWidth).toBe('100%');
  const text = labelText(picker);
  expect(text.props.numberOfLines).toBe(1);
  expect(flat(text.props.style).flexShrink).toBe(1);
});

it.each([[3.12], [1]])('Cove at text scale %s: a partner with a 24-wide name is a chip bounded to its column, one line, full name spoken', async fontScale => {
  Object.assign(viewport, { fontScale });
  await mountCove(false);
  const chip = buttonOf(NAME);
  expect(flat(chip.props.style).maxWidth).toBe('100%');
  expect(flat(chip.props.style).flexShrink).toBe(1);
  const text = labelText(chip);
  expect(text.props.numberOfLines).toBe(1);
  expect(flat(text.props.style).flexShrink).toBe(1);
  // Other partners keep the chip they always had: no line limit, no shrink.
  const other = root!.root.find(n => String(n.type) === 'Pressable' && !inSheet(n) && textOf(n) === 'On my own');
  expect(flat(other.props.style).flexShrink).toBe(0);
});

it('Cove: the who-is-solving sheet bounds a 24-wide name the same way', async () => {
  await mountCove(true);
  const row = buttonOf(NAME, true);
  expect(flat(row.props.style).maxWidth).toBe('100%');
  expect(labelText(row).props.numberOfLines).toBe(1);
});
