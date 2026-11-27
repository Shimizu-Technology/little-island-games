/** R0: every School page at the largest text size. The shared Learn frame keeps its pinned header to one compact bar,
 * scrolls the rest with the page, and stops its header text where the words still fit, so the board stays reachable. */
import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { wordWidth } from '../src/components/wordFit';
import { LearnFrame } from '../src/learn/LearnFrame';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptySave } from '../src/state/validation';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { startSession } from '../src/learn/session';
import { engines } from '../src/learn/engines';
import { levelTitle, optionsAtLevel, type LearningLevel } from '../src/learn/levels';
import type { LearnId } from '../src/learn/types';
vi.mock('../src/components/Icon', () => ({ Icon: 'Icon' }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => true }));
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false }));

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 3.12 }));
const db = vi.hoisted(() => ({ raw: null as string | null }));
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (s: string) => { db.raw = s; }, preserve: async () => {} } }));
vi.mock('react-native', () => ({ ScrollView: 'ScrollView', View: 'View', Text: 'NativeText', Platform: { OS: 'ios' }, Pressable: 'Pressable', Animated: { createAnimatedComponent: () => 'AnimatedPressable', Value: class {} }, StyleSheet: { create: (s: unknown) => s, flatten: (s: unknown) => Object.assign({}, ...[s].flat(Infinity).filter(Boolean)) }, useWindowDimensions: () => viewport, AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock('expo-router', () => ({ useIsFocused: () => true, router: { canGoBack: () => false, replace: vi.fn(), push: vi.fn() } }));
vi.mock('../src/components/ui', () => ({ Button: 'Button', Chip: 'Chip', Heading: 'Heading', Copy: 'Copy', ToggleRow: 'ToggleRow', GameHeader: 'GameHeader', C: {}, styles: {},
  Sheet: ({ visible, children, footer }: { visible: boolean; children: React.ReactNode; footer: React.ReactNode }) => visible ? React.createElement('SheetBody', null, children, footer) : null }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play: () => {}, stop: () => {} }), hasSpeech: () => true }));
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

// iPhone 15 at the largest accessibility size (AX5): text grows about 3.12x, as A-polish measured.
const LARGEST = 3.12;
const ids = Object.keys(engines) as LearnId[];
const textOf = (n: ReactTestInstance): string => n.children.map(c => typeof c === 'string' ? c : textOf(c)).join('');
const longestAt = (text: string, size: number, scale: number) => Math.max(...text.split(/[\s ]+/).map(w => wordWidth(w) * size * Math.min(LARGEST, scale)));
const inside = (n: ReactTestInstance, parent: ReactTestInstance) => { for (let p: ReactTestInstance | null = n; p; p = p.parent) if (p === parent) return true; return false; };
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

it('AX5 phone portrait: only the one-row bar stays pinned; level, learner and mode scroll with the page above the board', async () => {
  const r = await mount('crab-commands', true, 2);
  const pinned = r.root.find(n => n.props.testID === 'learn-header-pinned'), scroll = byType(r, 'ScrollView')[0];
  expect(byType(r, 'GameHeader').filter(n => inside(n, pinned))).toHaveLength(1);
  expect(byType(r, 'Heading').filter(n => inside(n, pinned))).toHaveLength(0);
  expect(byType(r, 'LearnerChip').filter(n => inside(n, pinned))).toHaveLength(0);
  expect(byType(r, 'Copy').filter(n => inside(n, pinned))).toHaveLength(0);
  const level = r.root.find(n => String(n.type) === 'Heading' && textOf(n) === levelTitle('crab-commands', 2));
  expect(inside(level, scroll)).toBe(true);
  expect(byType(r, 'LearnerChip').some(n => inside(n, scroll))).toBe(true);
  expect(scroll.props.scrollEnabled).not.toBe(false);
  // The board follows the header in the same scrolling page.
  expect(inside(byType(r, 'Board')[0], scroll)).toBe(true);
  // The level title stops at 2x, where "Level 2 of 5 · Walk and turn" still wraps only between words.
  // The level title stops at 1.5x, the same ceiling as the game name in the bar.
  const levelMax = level.props.maxFontSizeMultiplier as number;
  expect(levelMax).toBeLessThanOrEqual(1.5);expect(levelMax).toBeGreaterThan(1);
  expect(longestAt(textOf(level), 19, levelMax)).toBeLessThanOrEqual(393 - 32 - 36 - 8 - 72);
  // Small lines are compact chrome: the mode line, the "New round" button's note.
  const mode = r.root.find(n => String(n.type) === 'Copy' && textOf(n) === 'On my own');
  expect(mode.props.maxFontSizeMultiplier).toBe(1.5);
  expect(r.root.find(n => String(n.type) === 'Copy' && textOf(n) === 'Your round saves on this device.').props.maxFontSizeMultiplier).toBe(1.5);
  expect(r.root.find(n => String(n.type) === 'Button' && textOf(n) === 'New round & options').props.maxFontSizeMultiplier).toBe(2);
});

it.each([[393, 852], [320, 568]])('AX5 at %s pt: every School game name fits its two-line bar and every level title wraps only between words', async (width, height) => {
  Object.assign(viewport, { width, height });
  for (const id of ids) {
    const r = await mount(id);
    const bar = byType(r, 'GameHeader')[0], titleMax = bar.props.titleMax as number;
    expect(titleMax, id).toBeLessThanOrEqual(1.5);
    // Back, Sound and Help are 44-pt icons with 8-pt gaps inside 16-pt page padding.
    expect(longestAt(bar.props.title, 21, titleMax), `${id} title at ${width}`).toBeLessThanOrEqual(width - 32 - 3 * 44 - 3 * 8);
    const level = r.root.find(n => String(n.type) === 'Heading' && textOf(n).startsWith('Level 1 of 5'));
    expect(longestAt(textOf(level), 19, level.props.maxFontSizeMultiplier), `${id} level at ${width}`).toBeLessThanOrEqual(width - 32 - 36 - 8 - 72);
    await act(async () => root!.unmount()); root = undefined;
    // Every level's title has words short enough to fit even at 1x on the narrowest phone, so the cap never has to break one.
    for (const n of [1, 2, 3, 4, 5] as const) expect(longestAt(levelTitle(id, n), 19, 1), `${id} level ${n}`).toBeLessThanOrEqual(320 - 32 - 36 - 8 - 72);
  }
});

it('AX5 phone landscape: the header scrolls with the page, with the same compact bar and caps', async () => {
  Object.assign(viewport, { width: 852, height: 393 });
  const r = await mount('slip-tide');
  expect(r.root.findAll(n => n.props.testID === 'learn-header-pinned')).toHaveLength(0);
  const scroll = byType(r, 'ScrollView')[0], bar = byType(r, 'GameHeader')[0];
  expect(inside(bar, scroll)).toBe(true);expect(bar.props.titleMax).toBeLessThanOrEqual(1.5);
  // A short landscape screen keeps the level title at 1.5x, and the learner chip shares the one mode line.
  const level = r.root.find(n => String(n.type) === 'Heading' && textOf(n).startsWith('Level 1 of 5'));
  expect(level.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
  const mode = r.root.findAll(n => String(n.type) === 'Copy' && textOf(n) === 'On my own');
  expect(mode).toHaveLength(1);expect(mode[0].props.maxFontSizeMultiplier).toBe(1.5);
  expect(mode[0].parent!.findAll(n => String(n.type) === 'LearnerChip')).toHaveLength(1);
  expect(inside(byType(r, 'Board')[0], scroll)).toBe(true);
});

it('default text size keeps the phone header pinned and unchanged', async () => {
  Object.assign(viewport, { fontScale: 1 });
  const r = await mount('crab-commands', true, 2);
  const pinned = r.root.find(n => n.props.testID === 'learn-header-pinned');
  expect(byType(r, 'GameHeader')[0].props.titleMax).toBeUndefined();
  expect(byType(r, 'Heading').filter(n => inside(n, pinned)).map(textOf)).toEqual([levelTitle('crab-commands', 2)]);
  expect(byType(r, 'LearnerChip').filter(n => inside(n, pinned))).toHaveLength(1);
  expect(r.root.find(n => String(n.type) === 'Heading' && textOf(n) === levelTitle('crab-commands', 2)).props.maxFontSizeMultiplier).toBeUndefined();
});

it('AX5 setup and help sheets: the name never breaks a word, and Play this level and the help buttons stop at 2x', async () => {
  for (const [width, height] of [[393, 852], [320, 568], [852, 393]]) {
    Object.assign(viewport, { width, height });
    for (const id of ids) {
      const r = await mount(id, false);
      const sheetLine = (width >= 600 ? Math.min(560, width - 48) : width) - 44;
      const card = r.root.find(n => n.props.testID === 'learn-setup-card');
      expect(card.props.style.flexDirection, id).toBe('column');
      const name = card.findAll(n => String(n.type) === 'Heading')[0];
      expect(name.props.maxFontSizeMultiplier).toBeLessThanOrEqual(2);
      expect(longestAt(textOf(name), 21, name.props.maxFontSizeMultiplier), `${id} at ${width}`).toBeLessThanOrEqual(sheetLine - 24);
      expect(r.root.find(n => String(n.type) === 'Button' && textOf(n) === 'Play this level').props.maxFontSizeMultiplier).toBe(2);
      await act(async () => root!.unmount()); root = undefined;
    }
  }
  Object.assign(viewport, { width: 393, height: 852 });
  const r = await mount('slip-tide');
  await act(async () => { byType(r, 'GameHeader')[0].props.onHelp(); });
  for (const label of ['Show me how', 'Choose a fresh round']) expect(r.root.find(n => String(n.type) === 'Button' && textOf(n) === label).props.maxFontSizeMultiplier, label).toBe(2);
});

it.each([[3.12, 892], [1, 0]])('next question in the same round at text scale %s returns the page to y=%s (the board top at large text)', async (fontScale, expected) => {
  Object.assign(viewport, { fontScale });
  const r = await mount('times-tide');
  await act(async () => { r.root.find(n => n.props.testID === 'learn-board').props.onLayout({ nativeEvent: { layout: { x: 0, y: 900, width: 361, height: 700 } } }); });
  scrolls.length = 0;
  const board = byType(r, 'Board')[0], state = board.props.session.state as { index: number };
  await act(async () => { board.props.update({ ...state, index: state.index + 1 }); });
  expect(scrolls).toEqual([expected]);
});

it.each([[3.12, true], [1, false]])('Help at text scale %s puts Hear a quick guide before the instructions: %s', async (fontScale, first) => {
  Object.assign(viewport, { fontScale });
  const r = await mount('slip-tide');
  await act(async () => { byType(r, 'GameHeader')[0].props.onHelp(); });
  const sheet = r.root.findAll(n => String(n.type) === 'SheetBody').at(-1)!;
  const order = sheet.findAll(n => (String(n.type) === 'Button' && textOf(n).trim() === 'Hear a quick guide') || (String(n.type) === 'Copy' && textOf(n) === engines['slip-tide'].help)).map(n => String(n.type));
  expect(order).toEqual(first ? ['Button', 'Copy'] : ['Copy', 'Button']);
});

it('AX5 setup sheet description stops at 2x so the level stones are near', async () => {
  const r = await mount('pattern-path', false);
  expect(r.root.find(n => String(n.type) === 'Copy' && textOf(n) === engines['pattern-path'].description).props.maxFontSizeMultiplier).toBe(2);
});

it('BaseButton keeps espresso icons beside plain label text with its row gap', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const { Button } = await vi.importActual<typeof import('../src/components/ui')>('../src/components/ui');
  await act(async () => { root = create(<Button icon="sound-on" onPress={() => {}} textStyle={{ color: '#3D2B24' }}>Hear a quick guide</Button>); });
  const icon = root!.root.findByType('Icon' as React.ElementType);
  const text = root!.root.findByType('NativeText' as React.ElementType);
  expect(icon.props.color).toBe('#3D2B24');
  expect(inside(icon, text)).toBe(false);
  expect(text.children).toEqual(['Hear a quick guide']);
  const row = root!.root.findByType('AnimatedPressable' as React.ElementType);
  expect(row.props.style.flat(Infinity)).toContainEqual({ flexDirection: 'row', gap: 7 });
});
