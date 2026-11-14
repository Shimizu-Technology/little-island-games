/** R0c: Everything, an island shelf (Game Hall) and the Arcade lobby at the largest text size. No title, game name or
 * sentence draws larger than 44 pt or has a word wider than its line, so nothing breaks mid-word; at default size nothing is capped. */
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { emptySave } from '../src/state/validation';
import { shelfGames } from '../src/learn/home';
import { wordWidth } from '../src/components/wordFit';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 3.12 }));
const fixture = vi.hoisted(() => ({ params: {} as Record<string, string>, store: { ready: true, recovery: false, save: {} as ReturnType<typeof import('../src/state/validation').emptySave>, toggleGameFavorite: () => {} } }));
vi.mock('react-native', () => {
  class Value { constructor(public v: number) {} }
  return {
    View: 'View', Text: 'Text', Switch: 'Switch', Pressable: 'Pressable', ScrollView: 'ScrollView', Modal: 'Modal', KeyboardAvoidingView: 'KeyboardAvoidingView', TextInput: 'TextInput',
    StyleSheet: { create: (s: object) => s, absoluteFill: {}, flatten: (s: unknown) => Array.isArray(s) ? Object.assign({}, ...s.flat(9).filter(Boolean)) : s }, PanResponder: { create: () => ({ panHandlers: {} }) }, Platform: { OS: 'ios' },
    Animated: { createAnimatedComponent: (c: unknown) => c, Value, timing: () => ({ start() {} }), spring: () => ({ start() {} }), View: 'AnimatedView' },
    useWindowDimensions: () => viewport,
  };
});
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'main', useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock('react-native-svg', () => ({ default: 'Svg', Circle: 'Circle', Path: 'Path', Ellipse: 'Ellipse', G: 'G', Rect: 'Rect', Line: 'Line', Text: 'SvgText' }));
vi.mock('expo-router', () => ({ router: { push: vi.fn(), back: vi.fn(), replace: vi.fn(), canGoBack: () => true, setParams: vi.fn() }, useLocalSearchParams: () => fixture.params, Redirect: () => null }));
vi.mock('../src/components/motion', () => ({ easeOut: 0, nativeDriver: true, useReducedMotion: () => true }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/components/Recovery', () => ({ Recovery: () => null }));
vi.mock('../src/components/Settings', () => ({ Settings: () => null }));
vi.mock('../src/cove/HubCove', () => ({ CoveLists: () => null }));
vi.mock('../src/hub/Landmarks', () => ({ Landmark: () => null }));
vi.mock('../src/state/Store', () => ({ useStore: () => fixture.store }));
vi.mock('../src/arcade/Scene', () => ({ ArcadeScene: () => null }));
vi.mock('../src/arcade/Art', () => ({ ArcadeIsland: () => null, StarDisplay: () => null }));
vi.mock('../src/arcade/Collection', () => ({ StickerBook: () => null, OutfitCloset: () => null }));
vi.mock('../src/arcade/PlayScene', () => ({ PlayScene: () => null }));
vi.mock('../src/arcade/PlayTeaching', () => ({ PlayTeaching: () => null }));
vi.mock('../src/arcade/Teaching', () => ({ Teaching: () => null }));
vi.mock('../src/arcade/LevelMap', () => ({ LevelMap: () => null }));
vi.mock('../src/arcade/Juice', () => ({ Hero: () => null, StarReveal: () => null }));
vi.mock('../src/arcade/TreasureArt', () => ({ ChestArt: () => null }));
vi.mock('../src/arcade/Chest', () => ({ TreasureChest: () => null }));
vi.mock('../src/arcade/plays', () => ({ arcadePlays: {} }));
vi.mock('../src/arcade/audio', () => ({ useArcadeAudio: () => ({}) }));
vi.mock('../src/arcade/loop', () => ({ useArcadeForeground: () => ({}) }));
vi.mock('../src/arcade/games/fruit-bat-flight/Art', () => ({ ShellMedal: () => null }));
vi.mock('../src/islander/Companion', () => ({ Companion: () => null }));
vi.mock('../src/personalization/LearnerChip', () => ({ LearnerChip: () => null }));
vi.mock('../src/badges/ResultCard', () => ({ BadgeResultCard: () => null }));

const textOf = (n: ReactTestInstance): string => n.children.map(c => typeof c === 'string' ? c : textOf(c)).join('');
const flat = (style: unknown): Record<string, unknown> => Array.isArray(style) ? Object.assign({}, ...style.map(flat)) : (style && typeof style === 'object' ? style as Record<string, unknown> : {});
let root: ReactTestRenderer | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; Object.assign(viewport, { width: 393, height: 852, fontScale: 3.12 }); vi.unstubAllGlobals(); });
const inSheet = (n: ReactTestInstance) => { for (let p = n.parent; p; p = p.parent) if (String(p.type) === 'Modal') return true; return false; };
const texts = () => root!.root.findAll(n => String(n.type) === 'Text' && textOf(n).trim() !== '' && !inSheet(n));
/** What a text draws at: its size times the smaller of the system scale and its cap. */
const drawn = (n: ReactTestInstance) => ((flat(n.props.style).fontSize as number | undefined) ?? 14) * Math.min(viewport.fontScale, n.props.maxFontSizeMultiplier ?? Infinity);
function expectFitted(line: number, what: string) {
  for (const t of texts()) {
    const size = drawn(t), text = textOf(t);
    // Decorative art labels (SVG text) never scale; everything else stays at or under 44 pt, and no word is wider than the line.
    expect(size, `${what}: "${text}" is ${size} pt`).toBeLessThanOrEqual(44.01);
    for (const word of text.split(/[\s ]+/)) expect(wordWidth(word) * size, `${what}: "${word}" in "${text}" at ${size} pt`).toBeLessThanOrEqual(line);
  }
}

it.each([[393, 3.12], [320, 3.12], [393, 1.5]])('Everything at %s pt, text scale %s: every title, game name and sentence fits its line', async (width, fontScale) => {
  Object.assign(viewport, { width, fontScale }); fixture.params = {}; fixture.store.save = emptySave();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const { default: Everything } = await import('../src/hub/EverythingScreen');
  await act(async () => { root = create(<Everything />); });
  expect(texts().filter(t => textOf(t) === 'Everything' || textOf(t) === 'All games').length).toBeGreaterThan(0);
  // Every game name in the list is present and fits (the list text sits beside a 44-pt star and its gap).
  expect(shelfGames.every(g => texts().some(t => textOf(t) === g.name))).toBe(true);
  expectFitted((Math.min(width, 760) - 40 - 52) * 0.92 + 0.5, `Everything ${width}`);
});

it('Everything at default size caps nothing', async () => {
  Object.assign(viewport, { fontScale: 1 }); fixture.params = {}; fixture.store.save = emptySave();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const { default: Everything } = await import('../src/hub/EverythingScreen');
  await act(async () => { root = create(<Everything />); });
  expect(texts().filter(t => t.props.maxFontSizeMultiplier !== undefined)).toHaveLength(0);
});

it.each([[393, 3.12], [320, 3.12]])('Game Hall at %s pt, text scale %s: the title wraps beside an icon Back and chips and cards fit', async (width, fontScale) => {
  Object.assign(viewport, { width, fontScale }); fixture.params = { island: 'classic' }; fixture.store.save = emptySave();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const { default: Shelf } = await import('../src/app/shelf');
  await act(async () => { root = create(<Shelf />); });
  const title = texts().find(t => textOf(t) === 'Classic games')!;
  expect(title.props.numberOfLines).toBe(2); expect(title.props.adjustsFontSizeToFit).toBeFalsy();
  expect(root!.root.findAll(n => String(n.type) === 'Pressable' && n.props.accessibilityLabel === 'Back to islands')).toHaveLength(1);
  expect(shelfGames.filter(g => g.island === 'classic').every(g => texts().some(t => textOf(t) === g.name))).toBe(true);
  // One column at this size: a card is the page width less 40, and its text column is 28 pt narrower.
  const card = Math.min(width, 1080) - 40;
  for (const t of texts()) {
    const size = drawn(t), text = textOf(t);
    expect(size, `"${text}"`).toBeLessThanOrEqual(44.01);
    const room = (t === title ? card - 52 : textOf(t).match(/^(All games|Play alone|Play together|Favorites|Words & numbers|Think & explore)$/) ? card : card - 28) * 0.92 + 0.5;
    for (const word of text.split(/[\s ]+/)) expect(wordWidth(word) * size, `"${word}" in "${text}" at ${size} pt`).toBeLessThanOrEqual(room);
  }
});

it('Game Hall at default size keeps its bar, chips and cards uncapped', async () => {
  Object.assign(viewport, { fontScale: 1 }); fixture.params = { island: 'classic' }; fixture.store.save = emptySave();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const { default: Shelf } = await import('../src/app/shelf');
  await act(async () => { root = create(<Shelf />); });
  const title = texts().find(t => textOf(t) === 'Classic games')!;
  expect(title.props.numberOfLines).toBe(1); expect(title.props.adjustsFontSizeToFit).toBe(true);
  expect(texts().filter(t => t.props.maxFontSizeMultiplier !== undefined)).toHaveLength(0);
});

it.each([[393, 3.12], [320, 3.12]])('Island Arcade lobby at %s pt, text scale %s: buttons wrap, each world stacks its picture over its name, no word breaks', async (width, fontScale) => {
  Object.assign(viewport, { width, fontScale }); fixture.store.save = emptySave();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const { ArcadeLobby } = await import('../src/arcade/ArcadeScreen');
  await act(async () => { root = create(<ArcadeLobby />); });
  expect(texts().some(t => textOf(t) === 'Island Arcade')).toBe(true);
  const bar = root!.root.find(n => String(n.type) === 'View' && flat(n.props.style).justifyContent === 'space-between');
  expect(flat(bar.props.style).flexWrap).toBe('wrap');
  const world = root!.root.findAll(n => String(n.type) === 'Pressable' && /^Play .*open level map$/.test(n.props.accessibilityLabel ?? ''));
  expect(world.length).toBeGreaterThan(0);
  for (const w of world) expect(flat(w.props.style).flexDirection).toBe('column');
  const line = Math.min(width, 1000) - 40;
  for (const t of texts()) {
    const size = drawn(t), text = textOf(t);
    expect(size, `"${text}"`).toBeLessThanOrEqual(44.01);
    for (const word of text.split(/[\s ]+/)) expect(wordWidth(word) * size, `"${word}" in "${text}" at ${size} pt`).toBeLessThanOrEqual(line * 0.92 + 0.5);
  }
});

it('Island Arcade lobby at default size keeps each world as a row and caps nothing', async () => {
  Object.assign(viewport, { fontScale: 1 }); fixture.store.save = emptySave();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const { ArcadeLobby } = await import('../src/arcade/ArcadeScreen');
  await act(async () => { root = create(<ArcadeLobby />); });
  for (const w of root!.root.findAll(n => String(n.type) === 'Pressable' && /^Play .*open level map$/.test(n.props.accessibilityLabel ?? ''))) expect(flat(w.props.style).flexDirection).toBe('row');
  expect(texts().filter(t => t.props.maxFontSizeMultiplier !== undefined).map(t => [textOf(t), t.props.maxFontSizeMultiplier])).toEqual([]);
});
