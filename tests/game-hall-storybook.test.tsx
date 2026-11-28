import React from 'react';
import { readFileSync, readdirSync } from 'node:fs';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME_HALL_TILE_ART, hasGameHallArt, hasWordArt, PUZZLE_TILE_ART } from '../src/art/illustrated';
import { GameIcon } from '../src/components/GameIcon';
import { Button as UiButton, GameHeader } from '../src/components/ui';
import { findGameHallContinue } from '../src/gamehall/GameHallScreen';
import { shelfGames } from '../src/learn/home';
import { addLearner, selectLearner } from '../src/learn/learners';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { applyActivitySave } from '../src/state/activityAction';
import { applySessionAction } from '../src/state/sessionAction';
import { emptySave, parseSave, type Save } from '../src/state/validation';
import {
  applyWordGameSave,
  toggleWordGameFavorite,
  validWordGames,
  withoutWordGameOwner,
  wordGameFavorites,
} from '../src/state/wordGames';
import { createWordSession, finishRound } from '../src/wordgames/session';
import { getWordLexicon } from '../src/wordgames/lexicon';
import { createTic, ticMove } from '../src/games/tic';
import { defaultOptions } from '../src/games/types';
import { applyBoardSave, createSession as createBoardSession } from '../src/board';
import { createRaceSession } from '../src/racer/engine';
import { createPartySession } from '../src/party/engine';
import { PartyScreen } from '../src/party/PartyScreen';
import { WordHuntScreen } from '../src/wordgames/WordHuntScreen';
import { AnagramsScreen } from '../src/wordgames/AnagramsScreen';
import { solveBoard } from '../src/wordgames/wordHuntEngine';
import type { WordGame, WordSession } from '../src/wordgames/session';

const viewport = vi.hoisted(() => ({ width: 1024, height: 768, fontScale: 1 }));
const routing = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), canGoBack: () => false }));
const fixture = vi.hoisted(() => ({
  ready: true,
  recovery: null as string | null,
  nunitoLoaded: true,
  save: {} as Save,
  toggleGameFavorite: vi.fn(),
  toggleWordGameFavorite: vi.fn(),
}));

vi.mock('react-native', () => {
  class Value {
    constructor(public value: number) {}
    setValue(value: number) { this.value = value; }
    stopAnimation() {}
    interpolate() { return 0; }
  }
  return {
    View: 'View',
    Image: 'Image',
    Text: 'Text',
    Pressable: 'Pressable',
    ScrollView: 'ScrollView',
    Modal: 'Modal',
    Switch: 'Switch',
    TextInput: 'TextInput',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    StyleSheet: {
      create: (s: object) => s,
      absoluteFill: {},
      flatten: (style: unknown) => (Array.isArray(style) ? Object.assign({}, ...style.flat(6).filter(Boolean)) : style),
    },
    PanResponder: { create: (h: object) => ({ panHandlers: h }) },
    AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
    AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener: () => ({ remove() {} }) },
    Platform: { OS: 'ios' },
    useWindowDimensions: () => viewport,
    Animated: {
      createAnimatedComponent: (c: unknown) => c,
      View: 'AnimatedView',
      Value,
      timing: () => ({ start: (cb?: (r: { finished: boolean }) => void) => cb?.({ finished: true }), stop() {} }),
      spring: () => ({ start() {} }),
    },
  };
});
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock('react-native-svg', () => ({
  default: 'Svg',
  Circle: 'Circle',
  Ellipse: 'Ellipse',
  G: 'G',
  Line: 'Line',
  Path: 'Path',
  Polyline: 'Polyline',
  Rect: 'Rect',
  Text: 'SvgText',
}));
vi.mock('expo-router', () => ({
  router: routing,
  useLocalSearchParams: () => ({ island: 'classic' }),
  Redirect: () => null,
}));
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => fixture.nunitoLoaded }));
vi.mock('../src/components/motion', () => ({ easeOut: 0, nativeDriver: false, useReducedMotion: () => true }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/components/Recovery', () => ({ Recovery: () => null }));
vi.mock('../src/atmosphere/AtmosphereHeader', () => ({ AtmosphereHeader: () => null }));
vi.mock('../src/state/Store', () => ({ useStore: () => fixture }));

const ALL_GAME_HALL_IDS = [
  'word-hunt',
  'anagrams',
  'word-rescue',
  'word-imposter',
  'coconut-drop',
  'checkers',
  'tic-tac-toe',
  'shell-pits',
  'fishing-nets',
  'hidden-canoes',
  'reef-sweep',
  'go-fish',
  'crazy-eights',
  'memory',
  'island-mystery',
  'maze',
  'numbers',
  'racer',
] as const;

let screen: ReactTestRenderer | undefined;
const textOf = (node: ReactTestInstance): string =>
  node.children.map(c => (typeof c === 'string' ? c : textOf(c))).join('');

async function mount(node: React.ReactElement) {
  await act(async () => {
    screen = create(node);
  });
  return screen!;
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.clearAllMocks();
  viewport.width = 1024;
  viewport.height = 768;
  viewport.fontScale = 1;
  fixture.ready = true;
  fixture.recovery = null;
  fixture.nunitoLoaded = true;
  fixture.save = emptySave();
  fixture.toggleGameFavorite.mockImplementation((id: string) => {
    const prev = fixture.save.favoriteGames ?? [];
    fixture.save = {
      ...fixture.save,
      favoriteGames: prev.includes(id as never) ? prev.filter(item => item !== id) : [...prev, id as never],
    };
  });
  fixture.toggleWordGameFavorite.mockImplementation((id: WordGame) => {
    fixture.save = toggleWordGameFavorite(fixture.save, id);
  });
});

afterEach(async () => {
  if (screen) await act(async () => screen!.unmount());
  screen = undefined;
  vi.unstubAllGlobals();
});

describe('Build 13 Game Hall painted art & Warm Island Storybook lobby', () => {
  it('bundles all 15 new Game Hall icons as 512×512 transparent WebPs and gives all 18 games painted art', async () => {
    const dir = 'assets/art/game-hall';
    const expectedIds = Object.keys(GAME_HALL_TILE_ART).sort();
    expect(expectedIds).toHaveLength(15);
    expect(readdirSync(dir).sort()).toEqual(expectedIds.map(id => `${id}.webp`));

    for (const id of expectedIds) {
      expect(hasGameHallArt(id), id).toBe(true);
      const header = readFileSync(`${dir}/${id}.webp`).subarray(0, 30);
      expect(header.toString('ascii', 8, 16), id).toBe('WEBPVP8X');
      expect(header[20] & 0x10, id).toBe(0x10);
      expect([header.readUIntLE(24, 3) + 1, header.readUIntLE(27, 3) + 1], id).toEqual([512, 512]);
    }

    expect(hasWordArt('word-hunt')).toBe(true);
    expect(hasWordArt('anagrams')).toBe(true);
    expect(PUZZLE_TILE_ART['reef-sweep']).toBeDefined();

    await mount(
      <>
        {ALL_GAME_HALL_IDS.map(id => (
          <GameIcon key={id} id={id} size={96} bare />
        ))}
      </>,
    );
    const icons = screen!.root.findAllByType(GameIcon);
    expect(icons).toHaveLength(18);
    for (const icon of icons) {
      expect(icon.findAll(n => String(n.type) === 'Image'), icon.props.id).toHaveLength(1);
    }
  });

  it('renders all 4 category shelves with all 18 games, unified filters, Continue hero, Favorites, and Surprise Me!', async () => {
    const { default: Shelf } = await import('../src/app/shelf');
    fixture.save = {
      ...emptySave(),
      recent: 'tic-tac-toe',
      sessions: { 'tic-tac-toe': createTic(defaultOptions) },
      board: { 'coconut-drop': createBoardSession('coconut-drop') },
      wordGames: {
        version: 1,
        people: { family: { 'word-hunt': createWordSession('word-hunt', 4, 'chill', 42) } },
      },
    };

    await mount(<Shelf />);

    // All 4 category shelves exist when filter is "All games".
    for (const section of ['words', 'boards', 'cards', 'explore']) {
      expect(screen!.root.findAllByProps({ testID: `game-hall-section-${section}` })).toHaveLength(1);
    }

    // All 18 Game Hall games render with painted images.
    expect(screen!.root.findByProps({ testID: 'word-games-cards' })).toBeDefined();
    expect(screen!.root.findByProps({ testID: 'word-game-card-word-hunt' })).toBeDefined();
    expect(screen!.root.findByProps({ testID: 'word-game-card-anagrams' })).toBeDefined();
    const classicShelf = shelfGames.filter(g => g.island === 'classic');
    expect(classicShelf).toHaveLength(16);
    for (const g of classicShelf) {
      expect(screen!.root.findByProps({ testID: `game-hall-card-${g.id}` })).toBeDefined();
    }

    // Continue hero surfaces the recent ongoing round and launches it on press.
    const hero = screen!.root.findByProps({ testID: 'game-hall-continue-card' });
    expect(hero.props.accessibilityLabel).toBe('Continue Tic-tac-toe');
    await act(async () => hero.props.onPress());
    expect(routing.push).toHaveBeenCalledWith({ pathname: '/play', params: { game: 'tic-tac-toe' } });

    // Surprise Me! launches a valid Game Hall route.
    routing.push.mockClear();
    const surprise = screen!.root.find(
      n => String(n.type) === 'Pressable' && n.props.accessibilityLabel === 'Surprise Me! Open a random game',
    );
    await act(async () => surprise.props.onPress());
    expect(routing.push).toHaveBeenCalledTimes(1);
    expect(['/play', '/board', '/activity', '/challenge', '/word-games']).toContain(
      routing.push.mock.calls[0][0].pathname,
    );

    // Filter chip "Play together" unifies Word Hunt & Anagrams with classic/board/card games.
    const findChip = (label: string) =>
      screen!.root.find(
        n => String(n.type) === 'Pressable' && textOf(n).trim() === label,
      );
    await act(async () => findChip('Play together').props.onPress());
    expect(screen!.root.findAllByProps({ testID: 'game-hall-section-boards' })).toHaveLength(0);
    expect(screen!.root.findByProps({ testID: 'word-game-card-word-hunt' })).toBeDefined();
    expect(screen!.root.findByProps({ testID: 'word-game-card-anagrams' })).toBeDefined();
    expect(screen!.root.findByProps({ testID: 'game-hall-card-coconut-drop' })).toBeDefined();
    expect(screen!.root.findAllByProps({ testID: 'game-hall-card-racer' })).toHaveLength(0);

    // Favorites filter shows friendly empty state, then includes starred classic + word games.
    await act(async () => findChip('Favorites').props.onPress());
    expect(screen!.root.findByProps({ testID: 'game-hall-empty' })).toBeDefined();

    await act(async () => findChip('All games').props.onPress());
    const starCheckers = screen!.root.find(
      n => String(n.type) === 'Pressable' && n.props.accessibilityLabel === 'Favorite Checkers',
    );
    await act(async () => starCheckers.props.onPress());
    expect(fixture.toggleGameFavorite).toHaveBeenCalledWith('checkers');
    const starHunt = screen!.root.find(
      n => String(n.type) === 'Pressable' && n.props.accessibilityLabel === 'Favorite Word Hunt',
    );
    await act(async () => starHunt.props.onPress());

    await act(async () => screen!.update(<Shelf />));
    await act(async () => findChip('Favorites').props.onPress());
    expect(screen!.root.findByProps({ testID: 'game-hall-card-checkers' })).toBeDefined();
    expect(screen!.root.findByProps({ testID: 'word-game-card-word-hunt' })).toBeDefined();
  });

  it('adapts cleanly to compact 375px phone and 2x accessibility font scale', async () => {
    const { default: Shelf } = await import('../src/app/shelf');
    for (const [width, fontScale] of [
      [375, 1],
      [375, 2],
      [1024, 1],
    ] as const) {
      viewport.width = width;
      viewport.fontScale = fontScale;
      await mount(<Shelf />);
      expect(
        screen!.root.findAll(n => String(n.type) === 'Pressable' && n.props.testID === 'game-hall-card-coconut-drop'),
      ).toHaveLength(1);
      expect(
        screen!.root.findAll(n => String(n.type) === 'Pressable' && n.props.testID === 'word-game-card-word-hunt'),
      ).toHaveLength(1);
      await act(async () => screen!.unmount());
      screen = undefined;
    }
  });
});

describe('Word Hunt & Anagrams intuitive options, clean slide mode, and expanded prose lexicon', () => {
  it('harvests expanded non-reading prose lexicon cleanly above 1,850 valid English words', () => {
    const words = getWordLexicon();
    expect(words.size).toBeGreaterThanOrEqual(1850);
    expect([...words].every(word => /^[A-Z]{3,8}$/.test(word))).toBe(true);
    expect(words.has('HTTPS')).toBe(false);
    expect(words.has('COCONUT')).toBe(true);
    expect(words.has('VOLCANO')).toBe(true);
    expect(words.has('PICNIC')).toBe(true);
  });

  it('Word Hunt hides Submit/Clear in drag mode, exposes 1-tap New / Mode sheet, and gives clear feedback', async () => {
    let saved: WordSession | null = null;
    const onBack = vi.fn();
    await mount(
      <WordHuntScreen
        session={null}
        onSave={next => {
          saved = next;
        }}
        onBack={onBack}
      />,
    );

    const pressButton = async (label: string) => {
      const btn = screen!.root.find(
        n => String(n.type) === 'Pressable' && textOf(n).trim() === label,
      );
      await act(async () => btn.props.onPress());
    };

    await pressButton('Start Word Hunt');
    expect(saved).not.toBeNull();
    const firstId = saved!.id;

    // Slide-to-trace default hides redundant Submit and Clear buttons.
    expect(screen!.root.findAll(n => String(n.type) === 'Pressable' && textOf(n).trim() === 'Submit')).toHaveLength(0);
    expect(screen!.root.findAll(n => String(n.type) === 'Pressable' && textOf(n).trim() === 'Clear')).toHaveLength(0);

    // 1-tap New / Mode button opens the options sheet mid-round without needing Finish round.
    await pressButton('New / Mode');
    expect(screen!.root.findByProps({ testID: 'word-options-sheet' })).toBeDefined();
    await pressButton('5 × 5 Big Board');
    await pressButton('Start a fresh round');
    expect(saved!.id).not.toBe(firstId);
    expect(saved!.size).toBe(5);

    // Tap mode restores Submit/Clear and emits clear feedback for short/unknown/duplicate words.
    await pressButton('Use tap tracing');
    expect(screen!.root.findAll(n => String(n.type) === 'Pressable' && textOf(n).trim() === 'Submit')).toHaveLength(1);
    const [word, path] = [...solveBoard(saved!.tiles)][0];
    for (const tile of path) {
      await act(async () => screen!.root.findByProps({ testID: `hunt-tile-${tile}` }).props.onPress());
    }
    await pressButton('Submit');
    for (const tile of path) {
      await act(async () => screen!.root.findByProps({ testID: `hunt-tile-${tile}` }).props.onPress());
    }
    await pressButton('Submit');
    expect(JSON.stringify(screen!.toJSON())).toContain(`${word} · Already found`);
  });

  it('Anagrams exposes 1-tap New / Mode sheet mid-round to switch rack size and start fresh', async () => {
    let saved: WordSession | null = null;
    await mount(
      <AnagramsScreen
        session={null}
        onSave={next => {
          saved = next;
        }}
        onBack={() => {}}
      />,
    );
    const pressButton = async (label: string) => {
      const btn = screen!.root.find(
        n => String(n.type) === 'Pressable' && textOf(n).trim() === label,
      );
      await act(async () => btn.props.onPress());
    };
    await pressButton('Start Anagrams');
    expect(saved!.size).toBe(6);
    await pressButton('New / Mode');
    expect(screen!.root.findByProps({ testID: 'word-options-sheet' })).toBeDefined();
    await pressButton('7 tiles · Big Rack');
    await pressButton('Start a fresh round');
    expect(saved!.size).toBe(7);
  });
});

describe('R1 review regressions: persisted word favorites, cross-18-game recency, 1-tap Secret Word Options, compact GameHeader', () => {
  it('R1-01: persists Word Hunt & Anagrams favorites across Hall remount, save/reload, and learner switches', async () => {
    const { default: Shelf } = await import('../src/app/shelf');
    fixture.save = migrateProfiles(emptySave());
    await mount(<Shelf />);

    const findChip = (label: string) =>
      screen!.root.find(n => String(n.type) === 'Pressable' && textOf(n).trim() === label);

    // Star Word Hunt and Anagrams from the Hall.
    await act(async () =>
      screen!.root.find(n => String(n.type) === 'Pressable' && n.props.accessibilityLabel === 'Favorite Word Hunt').props.onPress(),
    );
    await act(async () =>
      screen!.root.find(n => String(n.type) === 'Pressable' && n.props.accessibilityLabel === 'Favorite Anagrams').props.onPress(),
    );
    expect(wordGameFavorites(fixture.save)).toEqual(['word-hunt', 'anagrams']);

    // Unmount, serialize/parse reload, and remount the Hall: both stars persist.
    await act(async () => screen!.unmount());
    screen = undefined;
    fixture.save = migrateProfiles(parseSave(encodeSave(fixture.save)));
    await mount(<Shelf />);

    await act(async () => findChip('Favorites').props.onPress());
    expect(screen!.root.findByProps({ testID: 'word-game-card-word-hunt' })).toBeDefined();
    expect(screen!.root.findByProps({ testID: 'word-game-card-anagrams' })).toBeDefined();

    // Per-learner isolation + learner removal + zero-byte omission when cleared.
    let multi: Save = { ...fixture.save, learning: addLearner(fixture.save.learning, 'Mina', 'child-1') };
    expect(wordGameFavorites(multi)).toEqual([]);
    multi = toggleWordGameFavorite(multi, 'anagrams');
    expect(wordGameFavorites(multi)).toEqual(['anagrams']);
    const reloaded = migrateProfiles(parseSave(encodeSave(multi)));
    expect(wordGameFavorites(reloaded, 'family')).toEqual(['word-hunt', 'anagrams']);
    expect(wordGameFavorites(reloaded, 'child-1')).toEqual(['anagrams']);

    const switchedBack = { ...reloaded, learning: selectLearner(reloaded.learning, 'family') };
    const pruned = withoutWordGameOwner(switchedBack, 'child-1');
    expect(pruned.wordGames?.favorites?.['child-1']).toBeUndefined();
    expect(wordGameFavorites(pruned, 'family')).toEqual(['word-hunt', 'anagrams']);

    let cleared = toggleWordGameFavorite(toggleWordGameFavorite(emptySave(), 'word-hunt'), 'word-hunt');
    expect(JSON.parse(encodeSave(cleared))).not.toHaveProperty('wordGames');

    // Strict validation rejects bad favorites payloads.
    expect(validWordGames({ version: 1, people: {}, favorites: { family: ['word-hunt', 'word-hunt'] } }, ['family'])).toBe(false);
    expect(validWordGames({ version: 1, people: {}, favorites: { family: ['chess'] } }, ['family'])).toBe(false);
    expect(validWordGames({ version: 1, people: {}, favorites: { unknown: ['anagrams'] } }, ['family'])).toBe(false);
  });

  it('R1-02: Continue Playing honors recency across board -> word, activity -> word, word -> word, word -> board/activity/classic, and skips finished rounds', () => {
    const classicGames = shelfGames.filter(g => g.island === 'classic');

    // Board -> Word (Coconut Drop saved first, then Anagrams saved via applyWordGameSave)
    let save = migrateProfiles(emptySave());
    const boardRound = createBoardSession('coconut-drop');
    save = applyBoardSave(save, 'coconut-drop', boardRound, undefined, 1, 1);
    expect(findGameHallContinue(save, classicGames)).toMatchObject({ kind: 'shelf', game: { id: 'coconut-drop' } });

    const anagramsRound = createWordSession('anagrams', 7, 'pass-play', 55);
    save = applyWordGameSave(save, 'anagrams', anagramsRound, { owner: 'family', id: null, epoch: 1 }, 1);
    expect(findGameHallContinue(save, classicGames)).toMatchObject({ kind: 'word', id: 'anagrams' });

    // Round-trip through encodeSave/parseSave preserves Anagrams as Continue hero.
    const persisted = migrateProfiles(parseSave(encodeSave(save)));
    expect(findGameHallContinue(persisted, classicGames)).toMatchObject({ kind: 'word', id: 'anagrams' });

    // Word Hunt after Anagrams -> Word Hunt wins; Anagrams after Word Hunt -> Anagrams wins.
    const huntRound = createWordSession('word-hunt', 4, 'chill', 77);
    save = applyWordGameSave(save, 'word-hunt', huntRound, { owner: 'family', id: null, epoch: 1 }, 1);
    expect(findGameHallContinue(save, classicGames)).toMatchObject({ kind: 'word', id: 'word-hunt' });

    const anagramsFresh = createWordSession('anagrams', 6, 'chill', 88);
    save = applyWordGameSave(
      save,
      'anagrams',
      anagramsFresh,
      { owner: 'family', id: anagramsRound.id, revision: anagramsRound.revision, epoch: 1 },
      1,
    );
    expect(findGameHallContinue(save, classicGames)).toMatchObject({ kind: 'word', id: 'anagrams' });

    // Activity -> Word -> Board -> Classic transitions
    const raceRound = createRaceSession('training', 'practice');
    save = applyActivitySave(save, 'racer', raceRound, { id: null, epoch: 1 }, 1);
    expect(findGameHallContinue(save, classicGames)).toMatchObject({ kind: 'shelf', game: { id: 'racer' } });

    const huntFresh = createWordSession('word-hunt', 5, 'chill', 91);
    save = applyWordGameSave(
      save,
      'word-hunt',
      huntFresh,
      { owner: 'family', id: huntRound.id, revision: huntRound.revision, epoch: 1 },
      1,
    );
    expect(findGameHallContinue(save, classicGames)).toMatchObject({ kind: 'word', id: 'word-hunt' });

    const boardFresh = createBoardSession('shell-pits');
    save = applyBoardSave(save, 'shell-pits', boardFresh, undefined, 1, 1);
    expect(findGameHallContinue(save, classicGames)).toMatchObject({ kind: 'shelf', game: { id: 'shell-pits' } });

    const tic = createTic(defaultOptions);
    save = { ...save, sessions: { ...save.sessions, 'tic-tac-toe': tic } };
    save = applySessionAction(save, 'tic-tac-toe', tic.id, s => (s.game === 'tic-tac-toe' ? ticMove(s, 0) : s));
    save = { ...save, recentBoard: null };
    expect(findGameHallContinue(save, classicGames)).toMatchObject({ kind: 'shelf', game: { id: 'tic-tac-toe' } });

    // Finished word round is ineligible for Continue Playing.
    let singleWord = applyWordGameSave(
      emptySave(),
      'anagrams',
      anagramsFresh,
      { owner: 'family', id: null, epoch: 1 },
      1,
    );
    expect(findGameHallContinue(singleWord, classicGames)).toMatchObject({ kind: 'word', id: 'anagrams' });
    const ended = finishRound(anagramsFresh);
    singleWord = applyWordGameSave(
      singleWord,
      'anagrams',
      ended,
      { owner: 'family', id: anagramsFresh.id, revision: anagramsFresh.revision, epoch: 1 },
      1,
    );
    expect(findGameHallContinue(singleWord, classicGames)).toBeNull();

    // Strict validation rejects invalid recent field.
    expect(validWordGames({ version: 1, people: {}, recent: { family: 'racer' } }, ['family'])).toBe(false);
    expect(validWordGames({ version: 1, people: {}, recent: { unknown: 'anagrams' } }, ['family'])).toBe(false);
  });

  it('R1-03: Secret Word header Options opens setup in one tap, conceals secrets, and cancel returns to the same round', async () => {
    const session = createPartySession({ players: ['Ana', 'Ben', 'Cam'], pack: 'animals', clueRounds: 1 });
    const onChange = vi.fn();
    await mount(
      <PartyScreen
        session={session}
        onChange={onChange}
        onBack={() => {}}
        sound={true}
        onToggleSound={() => {}}
      />,
    );

    // Reveal the current player's secret card first.
    const revealBtn = screen!.root.find(
      n => String(n.type) === 'Pressable' && textOf(n).trim() === 'Reveal my card',
    );
    await act(async () => revealBtn.props.onPress());
    expect(JSON.stringify(screen!.toJSON())).toContain('Hide my card & pass');

    // Tap header Options ONCE -> opens setup sheet directly (not "Start a different game?").
    const optionsBtn = screen!.root.find(
      n => String(n.type) === 'Pressable' && n.props.accessibilityLabel === 'Change players, pack, or start a new game',
    );
    await act(async () => optionsBtn.props.onPress());
    const openJson = JSON.stringify(screen!.toJSON());
    expect(openJson).toContain('Secret Word · players & pack');
    expect(openJson).toContain('Deal the secret roles');
    expect(openJson).not.toContain('Hide my card & pass');

    // Cancel setup via Return to current game -> same round preserved with secrets concealed.
    const returnBtn = screen!.root.find(
      n => String(n.type) === 'Pressable' && textOf(n).trim() === 'Return to current game',
    );
    await act(async () => returnBtn.props.onPress());
    const afterJson = JSON.stringify(screen!.toJSON());
    expect(afterJson).toContain('Reveal my card');
    expect(afterJson).not.toContain('Hide my card & pass');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('R1-04: GameHeader stacks trailing controls onto a compact row at 375px phone width so titles never clip', async () => {
    viewport.width = 375;
    viewport.fontScale = 1;
    await mount(
      <GameHeader
        title="Coconut Drop"
        onBack={() => {}}
        sound={{ on: true, toggle: () => {} }}
        onHelp={() => {}}
      >
        <UiButton compact quiet label="New game and options" onPress={() => {}}>
          Options
        </UiButton>
      </GameHeader>,
    );
    expect(screen!.root.findAllByProps({ testID: 'game-header-compact' })).toHaveLength(1);
    const titleNode = screen!.root.find(n => String(n.type) === 'Text' && n.props.accessibilityRole === 'header');
    expect(textOf(titleNode)).toBe('Coconut Drop');
    // Title row only holds Back + Title (Options/Sound/Help live in the second row).
    const titleRow = titleNode.parent!;
    expect(titleRow.findAll(n => String(n.type) === 'Pressable' && textOf(n).trim() === 'Options')).toHaveLength(0);

    // Wide tablet keeps the sleek single-row bar.
    await act(async () => screen!.unmount());
    screen = undefined;
    viewport.width = 1024;
    await mount(
      <GameHeader
        title="Crazy Eights"
        onBack={() => {}}
        sound={{ on: true, toggle: () => {} }}
        onHelp={() => {}}
      >
        <UiButton compact quiet label="New game and options" onPress={() => {}}>
          Options
        </UiButton>
      </GameHeader>,
    );
    expect(screen!.root.findAllByProps({ testID: 'game-header-compact' })).toHaveLength(0);
  });
});
