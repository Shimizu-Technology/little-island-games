import React from 'react';
import { readFileSync, readdirSync } from 'node:fs';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg from 'react-native-svg';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ArcadeLobby } from '../src/arcade/ArcadeScreen';
import { emptyArcade, emptyArcadeLearner, emptyGameProgress } from '../src/arcade/progress';
import { arcadeShelfGames } from '../src/arcade/registry';
import { hasArcadeArt } from '../src/art/illustrated';
import { GameIcon } from '../src/components/GameIcon';
import { addLearner } from '../src/learn/learners';
import { emptySave } from '../src/state/validation';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 1 }));
const routing = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const fixture = vi.hoisted(() => ({
  save: {} as ReturnType<typeof import('../src/state/validation').emptySave>,
  toggleGameFavorite: vi.fn(),
}));

vi.mock('react-native', () => {
  class Value { constructor(public value: number) {} setValue(value: number) { this.value = value; } }
  return {
    View: 'View', Image: 'Image', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', Modal: 'Modal', KeyboardAvoidingView: 'KeyboardAvoidingView',
    StyleSheet: { create: (styles: object) => styles, absoluteFill: {}, flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.flat(5).filter(Boolean)) : style },
    PanResponder: { create: () => ({ panHandlers: {} }) }, Platform: { OS: 'ios' }, useWindowDimensions: () => viewport,
    Animated: { createAnimatedComponent: (component: unknown) => component, View: 'AnimatedView', Value,
      timing: () => ({ start: (callback?: (result: { finished: boolean }) => void) => callback?.({ finished: true }) }) },
  };
});
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock('react-native-svg', () => ({ default: 'Svg', Circle: 'Circle', Ellipse: 'Ellipse', G: 'G', Path: 'Path', Rect: 'Rect', Text: 'SvgText' }));
vi.mock('expo-router', () => ({ router: routing }));
vi.mock('../src/components/motion', () => ({ easeOut: 0, nativeDriver: true, useReducedMotion: () => true }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: 'SaveStatus' }));
vi.mock('../src/components/Settings', async () => {
  const { Sheet } = await import('../src/components/ui');
  return { Settings: (props: { visible: boolean; onClose: () => void }) => <Sheet {...props} title="Settings">{null}</Sheet> };
});
vi.mock('../src/state/Store', () => ({ useStore: () => fixture }));
vi.mock('../src/arcade/Scene', () => ({ ArcadeScene: () => null }));
vi.mock('../src/arcade/Art', () => ({ ArcadeIsland: () => null }));
vi.mock('../src/arcade/Collection', () => ({ StickerBook: 'StickerBook' }));
vi.mock('../src/arcade/PlayScene', () => ({}));
vi.mock('../src/arcade/PlayTeaching', () => ({}));
vi.mock('../src/arcade/Teaching', () => ({}));
vi.mock('../src/arcade/LevelMap', () => ({}));
vi.mock('../src/arcade/Juice', () => ({}));
vi.mock('../src/arcade/TreasureArt', () => ({}));
vi.mock('../src/arcade/Chest', () => ({}));
vi.mock('../src/arcade/plays', () => ({}));
vi.mock('../src/arcade/audio', () => ({}));
vi.mock('../src/arcade/loop', () => ({}));
vi.mock('../src/arcade/games/fruit-bat-flight/Art', () => ({}));
vi.mock('../src/islander/Companion', () => ({}));
vi.mock('../src/personalization/LearnerChip', () => ({}));
vi.mock('../src/badges/ResultCard', () => ({}));

const games = arcadeShelfGames();
const artDir = 'assets/art/arcade';
const artPath = (id: string) => `${artDir}/${id}.webp`;
let screen: ReactTestRenderer;
async function mount(element: React.ReactElement) {
  await act(async () => { screen = create(element); });
}
const button = (label: string) => screen.root.find(node => node.type === Pressable &&
  (node.props.accessibilityLabel ?? node.findAllByType(Text)[0]?.children.join('')) === label);

beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.clearAllMocks(); });
afterEach(async () => { if (screen) await act(async () => screen.unmount()); vi.unstubAllGlobals(); });

it('bundles exactly the nine shelf illustrations as 512×512 WebPs with alpha', () => {
  expect(games).toHaveLength(9);
  expect(readdirSync(artDir).sort()).toEqual(games.map(game => `${game.id}.webp`).sort());
  for (const { id } of games) {
    expect(hasArcadeArt(id), id).toBe(true);
    const header = readFileSync(artPath(id)).subarray(0, 30);
    expect(header.toString('ascii', 8, 16), id).toBe('WEBPVP8X');
    expect(header[20] & 0x10, id).toBe(0x10);
    expect([header.readUIntLE(24, 3) + 1, header.readUIntLE(27, 3) + 1], id).toEqual([512, 512]);
  }
  expect(hasArcadeArt('coconut-drop')).toBe(false);
  expect(hasArcadeArt('constructor')).toBe(false);
});

it('shows decorative arcade images in fixed-size tiles and keeps the other shelf icons as SVGs', async () => {
  const vectorIds = ['beep-bot', 'coconut-drop', 'tic-tac-toe', 'weather-watch'] as const;
  await mount(<>{[...games.map(game => game.id), ...vectorIds].map(id => <GameIcon key={id} id={id} size={120}/>)}</>);
  for (const icon of screen.root.findAllByType(GameIcon)) {
    const { id } = icon.props;
    if (hasArcadeArt(id)) {
      const art = icon.findByType(Image);
      expect(art.props).toMatchObject({ source: artPath(id), resizeMode: 'contain', fadeDuration: 0, accessible: false });
      expect(icon.findByType(View).props.style).toMatchObject({ width: 120, height: 120, borderWidth: 1 });
      expect(icon.findAllByType(Svg)).toHaveLength(0);
    } else {
      expect(icon.findAllByType(Image)).toHaveLength(0);
      expect(icon.findByType(Svg).props.width).toBe(120);
    }
  }
});

it.each([[1, 'row'], [2, 'column']] as const)('keeps all nine cards and lobby actions at %s× text', async (fontScale, direction) => {
  viewport.fontScale = fontScale;
  const learner = emptyArcadeLearner();
  learner.stickers = ['flying-fox'];
  learner.games['fruit-bat-flight'] = { ...emptyGameProgress(), stars: { 'w1-1': 2, 'w1-2': 1, 'learn-1': 3 } };
  fixture.save = { ...emptySave(), learning: addLearner(undefined, 'Mina', 'mina'),
    arcade: { ...emptyArcade(), people: { mina: learner } } };
  fixture.toggleGameFavorite.mockImplementation((id: 'fruit-bat-flight') => {
    const favorites = fixture.save.favoriteGames ?? [];
    fixture.save = { ...fixture.save, favoriteGames: favorites.includes(id) ? favorites.filter(game => game !== id) : [...favorites, id] };
  });
  await mount(<ArcadeLobby/>);

  const sentence = screen.root.find(node => node.type === View && node.props.testID === 'arcade-learner');
  expect(sentence.props.accessibilityLabel).toBe('Mina · 1 island stickers');
  expect(screen.root.findAll(node => String(node.type) === 'SaveStatus')).toHaveLength(1);
  expect(screen.root.findAllByType(Image).map(art => art.props.source)).toEqual(games.map(game => artPath(game.id)));
  for (const game of games) {
    const play = button(`Play ${game.name}, open level map`);
    expect(StyleSheet.flatten(play.props.style).flexDirection).toBe(direction);
    expect(play.findByType(Image).props.source).toBe(artPath(game.id));
    expect(button(`Favorite ${game.name}`).props.accessibilityState.selected).toBe(false);
  }
  const bat = button('Play Fruit Bat Flight, open level map');
  expect(bat.findAll(node => node.children.includes('6 stars · 2/7 worlds explored')).length).toBeGreaterThan(0);
  await act(async () => bat.props.onPress());
  expect(routing.push).toHaveBeenCalledWith({ pathname: '/arcade', params: { game: 'fruit-bat-flight' } });
  await act(async () => { button('Favorite Fruit Bat Flight').props.onPress(); screen.update(<ArcadeLobby/>); });
  expect(fixture.toggleGameFavorite).toHaveBeenCalledWith('fruit-bat-flight');
  expect(button('Remove favorite Fruit Bat Flight').props.accessibilityState.selected).toBe(true);
  await act(async () => { button('Remove favorite Fruit Bat Flight').props.onPress(); screen.update(<ArcadeLobby/>); });
  expect(button('Favorite Fruit Bat Flight').props.accessibilityState.selected).toBe(false);

  for (const [open, title] of [['Settings', 'Settings'], ['Open my sticker book', 'Sticker book']] as const) {
    await act(async () => button(open).props.onPress());
    expect(screen.root.findAllByType(Modal).filter(modal => modal.props.visible)).toHaveLength(1);
    await act(async () => button(`Close ${title}`).props.onPress());
    expect(screen.root.findAllByType(Modal).filter(modal => modal.props.visible)).toHaveLength(0);
  }
  await act(async () => button('Home').props.onPress());
  expect(routing.replace).toHaveBeenCalledWith('/');
});
