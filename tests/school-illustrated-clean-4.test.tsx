import React from 'react';
import { readFileSync, readdirSync } from 'node:fs';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg from 'react-native-svg';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { hasLearnSubjectArt, type LearnSubjectId } from '../src/art/illustrated';
import { GameIcon, IslandIcon, type IslandIconId } from '../src/components/GameIcon';
import { styles } from '../src/components/ui';
import { wordWidth } from '../src/components/wordFit';
import { subjects } from '../src/hub/model';
import SchoolScreen from '../src/hub/SchoolScreen';
import { theme } from '../src/ui/theme';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 1 }));
const routing = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  canGoBack: vi.fn(() => true),
}));
const fixture = vi.hoisted(() => ({
  nunitoLoaded: false,
}));

vi.mock('react-native', () => {
  class Value { constructor(public value: number) {} setValue(value: number) { this.value = value; } }
  return {
    View: 'View', Image: 'Image', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView',
    StyleSheet: {
      create: (defs: object) => defs,
      absoluteFill: {},
      flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.flat(6).filter(Boolean)) : style,
    },
    Platform: { OS: 'ios' },
    useWindowDimensions: () => viewport,
    Animated: {
      createAnimatedComponent: (component: unknown) => component,
      View: 'AnimatedView',
      Value,
      timing: () => ({ start: (callback?: (result: { finished: boolean }) => void) => callback?.({ finished: true }) }),
    },
  };
});
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('react-native-svg', () => ({ default: 'Svg', Circle: 'Circle', Ellipse: 'Ellipse', G: 'G', Path: 'Path', Rect: 'Rect', Text: 'SvgText' }));
vi.mock('expo-router', () => ({ router: routing }));
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => fixture.nunitoLoaded }));
vi.mock('../src/components/motion', () => ({ easeOut: 0, nativeDriver: true, useReducedMotion: () => true }));

const artDir = 'assets/art/learn';
const artPath = (id: string) => `${artDir}/${id}.webp`;
const subjectIds: readonly LearnSubjectId[] = ['reading', 'numbers', 'science', 'thinking', 'coding', 'chamoru'];
const textOf = (node: ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');

let screen: ReactTestRenderer | undefined;
async function mount(element: React.ReactElement) {
  await act(async () => { screen = create(element); });
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.clearAllMocks();
  routing.canGoBack.mockReturnValue(true);
  Object.assign(viewport, { width: 393, height: 852, fontScale: 1 });
  fixture.nunitoLoaded = false;
});

afterEach(async () => {
  if (screen) await act(async () => { screen!.unmount(); });
  screen = undefined;
  vi.unstubAllGlobals();
});

it('bundles all six Learn subject illustrations as transparent 512×512 WebPs with static requires', () => {
  expect(subjects.map(subject => subject.id)).toEqual(subjectIds);
  expect(readdirSync(artDir).sort()).toEqual(subjectIds.map(id => `${id}.webp`).sort());

  const illustratedSource = readFileSync('src/art/illustrated.tsx', 'utf8');
  const required = [...illustratedSource.matchAll(/require\(([^)]*\/learn\/[^)]*)\)/g)].map(match => match[1]);
  expect(required).toHaveLength(6);
  for (const arg of required) expect(arg).toMatch(/^'\.\.\/\.\.\/assets\/art\/learn\/[a-z]+\.webp'$/);
  const thunks = [...illustratedSource.matchAll(/:\s*\(\)\s*=>\s*require\(([^)]*\/learn\/[^)]*)\)/g)].map(match => match[1]);
  expect(thunks).toEqual(required);

  for (const id of subjectIds) {
    expect(hasLearnSubjectArt(id), id).toBe(true);
    const header = readFileSync(artPath(id)).subarray(0, 30);
    expect(header.toString('ascii', 0, 4) + header.toString('ascii', 8, 16), id).toBe('RIFFWEBPVP8X');
    expect(header[20] & 0x10, id).toBe(0x10);
    expect([header.readUIntLE(24, 3) + 1, header.readUIntLE(27, 3) + 1], id).toEqual([512, 512]);
  }
  for (const other of ['classic', 'arcade', 'explore', 'hafa-adai', 'constructor']) {
    expect(hasLearnSubjectArt(other), other).toBe(false);
  }
});

it('renders illustrated LearnSubjectArt in IslandIcon for learn islands and preserves SVG fallbacks', async () => {
  const islands: readonly IslandIconId[] = ['reading', 'numbers', 'science', 'thinking', 'coding', 'classic', 'arcade', 'explore'];
  await mount(<>{islands.map(island => <IslandIcon key={island} island={island} size={96}/>)}</>);

  for (const icon of screen!.root.findAllByType(IslandIcon)) {
    const { island } = icon.props as { island: IslandIconId };
    if (hasLearnSubjectArt(island)) {
      const art = icon.findByType(Image);
      expect(art.props).toMatchObject({ source: artPath(island), resizeMode: 'contain', fadeDuration: 0, accessible: false });
      expect(StyleSheet.flatten(art.props.style)).toMatchObject({ width: 96 * 0.92, height: 96 * 0.92 });
      expect(icon.findByType(View).props.style).toMatchObject({ width: 96, height: 96, borderWidth: 1 });
      expect(icon.findAllByType(Svg)).toHaveLength(0);
    } else {
      expect(icon.findAllByType(Image)).toHaveLength(0);
      expect(icon.findByType(Svg).props.width).toBe(96);
    }
  }

  await act(async () => { screen!.unmount(); });
  screen = undefined;

  await mount(<><GameIcon id="hafa-adai" size={80}/><GameIcon id="beep-bot" size={80}/></>);
  for (const icon of screen!.root.findAllByType(GameIcon)) {
    expect(icon.findAllByType(Image)).toHaveLength(0);
    expect(icon.findByType(Svg).props.width).toBe(80);
  }
});

it.each([false, true])('styles SchoolScreen canvas, hero, and headings when Nunito loaded is %s', async (loaded) => {
  fixture.nunitoLoaded = loaded;
  await mount(<SchoolScreen/>);

  const safeArea = screen!.root.findByType(SafeAreaView);
  expect(StyleSheet.flatten(safeArea.props.style).backgroundColor).toBe('#FFF6E5');

  const images = screen!.root.findAllByType(Image);
  expect(images.map(img => img.props.source)).toEqual([
    'assets/art/map/learn.webp',
    ...subjectIds.map(id => artPath(id)),
  ]);

  const headings = ['School', 'What are you curious about?', ...subjects.map(subject => subject.name)];
  for (const title of headings) {
    const node = screen!.root.find(item => item.type === Text && item.props.accessibilityRole === 'header' && textOf(item) === title);
    const style = StyleSheet.flatten(node.props.style);
    expect(style.fontWeight, title).toBe(loaded ? 'normal' : '800');
    expect(style.fontFamily, title).toBe(loaded ? theme.fontFamily['800'] : styles.heading.fontFamily);
  }
});

it('preserves all six subject tiles, illustrations, accessibility labels, and navigation routes', async () => {
  await mount(<SchoolScreen/>);

  const tiles = screen!.root.findAll(node => node.type === Pressable && /^Open .* island$/.test(node.props.accessibilityLabel ?? ''));
  expect(tiles).toHaveLength(6);
  expect(tiles.map(tile => tile.props.accessibilityLabel)).toEqual(subjects.map(subject => `Open ${subject.name} island`));

  for (let i = 0; i < subjects.length; i++) {
    const subject = subjects[i];
    const tile = tiles[i];
    const style = StyleSheet.flatten(tile.props.style);
    expect(style.backgroundColor, subject.id).toBe(subject.color);
    expect(style.borderWidth, subject.id).toBe(1);
    expect(style.borderBottomWidth, subject.id).toBe(4);
    expect(style.width, subject.id).toBe((393 - 40 - 12) / 2);

    const art = tile.findByType(Image);
    expect(art.props).toMatchObject({ source: artPath(subject.id), resizeMode: 'contain', fadeDuration: 0, accessible: false });
    const artStyle = StyleSheet.flatten(art.props.style);
    expect(artStyle.width, subject.id).toBeGreaterThanOrEqual(100);
    expect(artStyle.width, subject.id).toBeLessThanOrEqual(108);
    expect(artStyle.height, subject.id).toBe(artStyle.width);

    await act(async () => tile.props.onPress());
  }

  expect(routing.push.mock.calls.map(call => call[0])).toEqual([
    { pathname: '/shelf', params: { island: 'reading' } },
    { pathname: '/shelf', params: { island: 'numbers' } },
    { pathname: '/shelf', params: { island: 'science' } },
    { pathname: '/shelf', params: { island: 'thinking' } },
    { pathname: '/shelf', params: { island: 'coding' } },
    { pathname: '/learn', params: { game: 'hafa-adai' } },
  ]);

  const back = screen!.root.find(node => node.type === Pressable && node.props.accessibilityLabel === 'Back to map');
  await act(async () => back.props.onPress());
  expect(routing.back).toHaveBeenCalledTimes(1);

  routing.canGoBack.mockReturnValue(false);
  await act(async () => back.props.onPress());
  expect(routing.replace).toHaveBeenCalledWith('/');
});

it('stacks into one column with shared word-fit at AX5 (320×568, fontScale 2.0) and expands to 3 columns on wide screens', async () => {
  Object.assign(viewport, { width: 320, height: 568, fontScale: 2.0 });
  await mount(<SchoolScreen/>);

  const tiles = screen!.root.findAll(node => node.type === Pressable && /^Open .* island$/.test(node.props.accessibilityLabel ?? ''));
  expect(tiles).toHaveLength(6);
  const singleColumnWidth = 320 - 40;
  for (const tile of tiles) {
    expect(StyleSheet.flatten(tile.props.style).width).toBe(singleColumnWidth);
  }

  const subjectHeadings = subjects.map(subject =>
    screen!.root.find(node => node.type === Text && node.props.accessibilityRole === 'header' && textOf(node) === subject.name),
  );
  const sharedMultipliers = new Set(subjectHeadings.map(node => node.props.maxFontSizeMultiplier));
  expect(sharedMultipliers.size).toBe(1);
  const [nameMax] = [...sharedMultipliers] as number[];
  expect(nameMax).toBeGreaterThanOrEqual(1);
  expect(nameMax).toBeLessThanOrEqual(2);
  for (const subject of subjects) {
    expect(wordWidth(subject.name) * 21 * Math.min(2.0, nameMax), subject.name).toBeLessThanOrEqual(singleColumnWidth - 34);
  }

  await act(async () => { screen!.unmount(); });
  screen = undefined;

  Object.assign(viewport, { width: 852, height: 1024, fontScale: 1 });
  await mount(<SchoolScreen/>);
  const wideTiles = screen!.root.findAll(node => node.type === Pressable && /^Open .* island$/.test(node.props.accessibilityLabel ?? ''));
  expect(wideTiles).toHaveLength(6);
  const threeColumnWidth = (852 - 40 - 24) / 3;
  for (const tile of wideTiles) {
    expect(StyleSheet.flatten(tile.props.style).width).toBe(threeColumnWidth);
  }
});

it('stacks the School hero on compact widths (320×568, fontScale 1.35) so headings get full card width', async () => {
  const nearestView = (node: ReactTestInstance | null): ReactTestInstance => {
    let cur = node;
    while (cur && cur.type !== View) cur = cur.parent;
    if (!cur) throw new Error('Expected ancestor View');
    return cur;
  };

  Object.assign(viewport, { width: 320, height: 568, fontScale: 1.35 });
  await mount(<SchoolScreen/>);

  const heroHeading = screen!.root.find(
    node => node.type === Text && node.props.accessibilityRole === 'header' && textOf(node) === 'What are you curious about?',
  );
  const heroCopy = screen!.root.find(
    node => node.type === Text && textOf(node) === 'Six little islands. Take your time.',
  );
  const heroTextWrap = nearestView(heroHeading.parent);
  const heroCard = nearestView(heroTextWrap.parent);

  expect(StyleSheet.flatten(heroCard.props.style).flexDirection).toBe('column');
  expect(StyleSheet.flatten(heroTextWrap.props.style).alignSelf).toBe('stretch');
  expect(StyleSheet.flatten(heroHeading.props.style).textAlign).toBe('center');
  expect(StyleSheet.flatten(heroCopy.props.style).textAlign).toBe('center');
  expect(heroHeading.props.maxFontSizeMultiplier).toBeUndefined();
  expect(wordWidth('curious') * 24 * 1.35).toBeLessThanOrEqual(320 - 40 - 38);

  await act(async () => { screen!.unmount(); });
  screen = undefined;

  Object.assign(viewport, { width: 393, height: 852, fontScale: 1.35 });
  await mount(<SchoolScreen/>);

  const wideHeading = screen!.root.find(
    node => node.type === Text && node.props.accessibilityRole === 'header' && textOf(node) === 'What are you curious about?',
  );
  const wideHeroCard = nearestView(nearestView(wideHeading.parent).parent);
  expect(StyleSheet.flatten(wideHeroCard.props.style).flexDirection).toBe('row');
  expect(StyleSheet.flatten(wideHeading.props.style).textAlign).toBe('left');
});
