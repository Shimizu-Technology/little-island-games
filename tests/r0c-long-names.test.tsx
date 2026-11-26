/** R0c fix round 1 (P2-2): a valid 24-character wide name (WWWWWWWWWWWWWWWWWWWWWWWW) is wider than a phone's line at any
 * text size. Puzzles' identity controls (4.0 Clean: the profile pill, Who's playing faces, Play together faces and pin
 * cards) keep it on one line in a bounded column, or show only a face, with the full name spoken. */
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { wordWidth } from '../src/components/wordFit';
import { addLearner, selectLearner } from '../src/learn/learners';
import { emptySave } from '../src/state/validation';
import { emptyLocal } from '../src/cove/local';
import type { ChallengeCard, ChallengeEntry } from '../src/challenge/types';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 3.12 }));
const fixture = vi.hoisted(() => ({ params: {} as { game?: string }, save: {} as ReturnType<typeof import('../src/state/validation').emptySave>, local: {} as ReturnType<typeof import('../src/cove/useCoveLocal').useCoveLocal>, entries: [] as ChallengeEntry[] }));
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
vi.mock('expo-router', async () => { const { useEffect } = await import('react'); return { router: { push: vi.fn(), back: vi.fn(), canGoBack: () => true, replace: vi.fn() }, useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]), useLocalSearchParams: () => fixture.params }; });
vi.mock('../src/components/Text', () => ({ Text: 'Text' }));
vi.mock('../src/components/motion', () => ({ easeOut: 0, nativeDriver: true, useReducedMotion: () => true }));
vi.mock('../src/components/Recovery', () => ({ Recovery: () => null }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/cove/CoveRound', () => ({ CoveRound: () => null }));
vi.mock('../src/cove/useCoveLocal', () => ({ useCoveLocal: () => fixture.local }));
vi.mock('../src/state/Store', () => ({ useStore: () => ({ ready: true, epoch: 1, save: fixture.save, covePerson: vi.fn(), selectLearner: vi.fn() }) }));
vi.mock('../src/hub/navigation', () => ({ openGame: vi.fn() }));
vi.mock('react-native-reanimated', async () => (await import('./helpers/cove-ui')).reanimated);
vi.mock('expo-haptics', async () => (await import('./helpers/cove-ui')).haptics);
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false, NunitoProvider: 'View' }));
vi.mock('../src/ui/icons', async () => (await import('./helpers/cove-ui')).icons());
vi.mock('../src/cove/catalog', async () => ({ ...await vi.importActual('../src/cove/catalog'), coveEntries: () => fixture.entries }));

const NAME = 'W'.repeat(24);
const textOf = (n: ReactTestInstance): string => n.children.map(c => typeof c === 'string' ? c : textOf(c)).join('');
const flat = (style: unknown): Record<string, unknown> => Array.isArray(style) ? Object.assign({}, ...style.map(flat)) : (style && typeof style === 'object' ? style as Record<string, unknown> : {});
let root: ReactTestRenderer | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; Object.assign(viewport, { width: 393, height: 852, fontScale: 3.12 }); vi.unstubAllGlobals(); });
const cards = [1, 2, 3].map((tier, i) => ({ tier, title: `Fixture ${i}`, ref: { bank: 10, puzzle: i, engine: 'sudoku', rules: 1, hash: String(i).repeat(64) } })) as ChallengeCard[];
const entry = (game: string): ChallengeEntry => ({ game, cove: true, puzzles: cards.map(c => ({ ...c, ref: { ...c.ref, engine: game } })), codec: 'fixture', contextFor: () => 'fixture', start: () => { throw new Error('Fixture only'); }, move: () => null, render: () => null, controls: { help: () => null, reset: () => null }, catalog: { banks: new Map(), codecs: new Map(), contexts: new Set(), dares: new Map() } });
/** `current` makes the wide name the person playing; otherwise Family is playing and the wide name is a partner. */
async function mountCove(current: boolean, options: { pin?: boolean; name?: string; game?: string } = {}) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const learning = addLearner(undefined, options.name ?? NAME, 'wide');
  fixture.save = { ...emptySave(), learning: current ? learning : selectLearner(learning, 'family') };
  fixture.entries = [entry('sudoku')]; fixture.params = options.game ? { game: options.game } : {}; fixture.local = { data: emptyLocal(), ready: true, error: '', load: vi.fn(), reset: vi.fn(), change: vi.fn(async () => true) };
  // A pin from the wide-named person waits in Family's Continue strip.
  if (options.pin) fixture.local.data.pins.family = [{ ref: cards[0].ref, from: 'wide' }];
  const { default: Cove } = await import('../src/cove/CoveScreen');
  await act(async () => { root = create(<Cove />); });
}
const inSheet = (n: ReactTestInstance) => { for (let p = n.parent; p; p = p.parent) if (String(p.type) === 'Modal') return true; return false; };
const pressable = (label: string, sheet: boolean) => root!.root.find(n => String(n.type) === 'Pressable' && n.props.accessibilityLabel === label && inSheet(n) === sheet);
/** Every Text a control draws that starts with the wide name: each must keep to one line. */
const nameTexts = (control: ReactTestInstance) => control.findAll(n => String(n.type) === 'Text' && textOf(n).startsWith(NAME));

it.each([[3.12], [1]])('the premise: at text scale %s the wide name alone is wider than a 393-pt phone line', fontScale => {
  expect(wordWidth(NAME) * 15 * Math.min(fontScale, 1.3)).toBeGreaterThan(393 - 40);
});

it.each([[3.12], [1]])('Puzzles at text scale %s: the profile pill of a 24-wide name shows only the face and speaks the whole name', async fontScale => {
  Object.assign(viewport, { fontScale });
  await mountCove(true);
  const pill = pressable(`Who's playing: ${NAME}. Switch`, false);
  expect(nameTexts(pill)).toHaveLength(0);
  expect(pill.findAll(n => n.props.testID === 'learner-portrait').length).toBeGreaterThan(0);
});

it.each([[3.12], [1]])("Puzzles at text scale %s: Who's playing bounds a 24-wide face name to one line in its column", async fontScale => {
  Object.assign(viewport, { fontScale });
  await mountCove(true);
  await act(async () => pressable(`Who's playing: ${NAME}. Switch`, false).props.onPress());
  const face = pressable(NAME, true);
  expect(flat(face.props.style).width).toBe(88);
  const texts = nameTexts(face);
  expect(texts).toHaveLength(1);
  expect(texts[0].props.numberOfLines).toBe(1);
});

it.each([[3.12], [1]])('Puzzles at text scale %s: a Play together partner with a 24-wide name is a bounded face, full name spoken', async fontScale => {
  Object.assign(viewport, { fontScale });
  await mountCove(false, { game: 'sudoku' });
  await act(async () => pressable('Play together', true).props.onPress());
  const face = pressable(`Play together with ${NAME}`, true);
  expect(flat(face.props.style).width).toBe(88);
  expect(nameTexts(face).every(t => t.props.numberOfLines === 1)).toBe(true);
});

it.each([[3.12], [1]])('Puzzles at text scale %s: a pin from a 24-wide name shows the sender as a face and speaks the whole name', async fontScale => {
  Object.assign(viewport, { fontScale });
  await mountCove(false, { pin: true });
  const card = pressable(`Fixture, from ${NAME}`.replace('Fixture', 'Sudoku'), false);
  expect(nameTexts(card)).toHaveLength(0);
  expect(card.findAll(n => n.props.testID === 'learner-portrait').length).toBeGreaterThan(0);
  for (const t of card.findAll(n => String(n.type) === 'Text')) expect(t.props.numberOfLines, textOf(t)).toBe(1);
});
it('Puzzles: a short sender name is spoken whole on its pin card', async () => {
  await mountCove(false, { pin: true, name: 'Mele' });
  expect(pressable('Sudoku, from Mele', false)).toBeDefined();
});
