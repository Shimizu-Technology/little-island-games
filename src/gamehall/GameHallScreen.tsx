import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AtmosphereHeader } from '../atmosphere/AtmosphereHeader';
import { Chip } from '../board/WarmUI';
import { GameIcon } from '../components/GameIcon';
import { openShelfGame } from '../components/GameShelf';
import { Recovery } from '../components/Recovery';
import { SaveStatus } from '../components/SaveStatus';
import { Text, TextFit, entryRegion } from '../components/Text';
import { Button, Copy, Heading, IconButton, PressableScale, styles } from '../components/ui';
import { LARGE_TEXT, wordFitMultiplier } from '../components/wordFit';
import { ongoing, shelfGames, type ShelfGame, type ShelfId } from '../learn/home';
import { useStore } from '../state/Store';
import type { Save } from '../state/validation';
import { useNunitoLoaded } from '../ui/fonts';
import { theme } from '../ui/theme';
import type { WordGame } from '../wordgames/session';
import {
  GameHallCard,
  HALL_BG,
  HALL_BORDER,
  HALL_CARD_SHADOW,
  HALL_CORAL,
  HALL_INK,
  HALL_LAGOON,
  HALL_MUTED,
  HALL_PAPER,
  HALL_PILL_BG,
} from './GameHallCard';
import { GameHallWordContext } from './wordContext';

export const GAME_HALL_FILTERS = [
  'All games',
  'Play together',
  'Play alone',
  'Words & numbers',
  'Think & explore',
  'Favorites',
] as const;

export type GameHallFilter = (typeof GAME_HALL_FILTERS)[number];

export interface WordGameCatalogItem {
  id: WordGame;
  name: string;
  description: string;
  surface: string;
  playerPill: string;
  filters: readonly GameHallFilter[];
}

export const WORD_GAME_ITEMS: readonly WordGameCatalogItem[] = [
  {
    id: 'word-hunt',
    name: 'Word Hunt',
    description: 'Trace neighboring letters to discover words.',
    surface: '#DFF1EE',
    playerPill: '1–2 Players',
    filters: ['Play alone', 'Play together', 'Words & numbers'],
  },
  {
    id: 'anagrams',
    name: 'Anagrams',
    description: 'Mix a handful of letters into new words.',
    surface: '#F7EBD0',
    playerPill: '1–2 Players',
    filters: ['Play alone', 'Play together', 'Words & numbers'],
  },
];

type HallSectionId = 'words' | 'boards' | 'cards' | 'explore';

interface HallSection {
  id: HallSectionId;
  title: string;
  wordIds: readonly WordGame[];
  shelfIds: readonly ShelfId[];
}

const SECTIONS: readonly HallSection[] = [
  {
    id: 'words',
    title: 'Word & Letter Games',
    wordIds: ['word-hunt', 'anagrams'],
    shelfIds: ['word-rescue', 'word-imposter'],
  },
  {
    id: 'boards',
    title: 'Board & Strategy',
    wordIds: [],
    shelfIds: ['coconut-drop', 'checkers', 'tic-tac-toe', 'shell-pits', 'fishing-nets', 'hidden-canoes', 'reef-sweep'],
  },
  {
    id: 'cards',
    title: 'Cards & Party',
    wordIds: [],
    shelfIds: ['go-fish', 'crazy-eights', 'memory', 'island-mystery'],
  },
  {
    id: 'explore',
    title: 'Explore & Race',
    wordIds: [],
    shelfIds: ['maze', 'numbers', 'racer'],
  },
];

export function playerPillFor(game: ShelfGame): string {
  switch (game.id) {
    case 'reef-sweep':
    case 'racer':
      return 'Solo';
    case 'word-imposter':
      return '3–8 Players';
    case 'island-mystery':
      return 'Solo or 3–8';
    case 'word-rescue':
    case 'maze':
    case 'numbers':
      return '1–2 Players';
    default:
      return '1–2 Players';
  }
}

export type ContinueEntry =
  | { kind: 'word'; id: WordGame; name: string; description: string; surface: string; playerPill: string }
  | { kind: 'shelf'; game: ShelfGame; playerPill: string };

export function findGameHallContinue(save: Save, classicGames: readonly ShelfGame[]): ContinueEntry | null {
  const byId = new Map(classicGames.map(game => [game.id, game]));
  const owner = save.learning?.active ?? 'family';

  const recentCandidates: ShelfId[] = (
    [save.recentBoard, save.recent, save.recentActivity] as (ShelfId | null | undefined)[]
  ).filter((id): id is ShelfId => typeof id === 'string' && byId.has(id));
  for (const id of recentCandidates) {
    if (ongoing(save, id)) {
      const game = byId.get(id)!;
      return { kind: 'shelf', game, playerPill: playerPillFor(game) };
    }
  }

  const wordRounds = save.wordGames?.people?.[owner];
  for (const item of WORD_GAME_ITEMS) {
    const round = wordRounds?.[item.id];
    if (round && round.phase !== 'finished') {
      return {
        kind: 'word',
        id: item.id,
        name: item.name,
        description: item.description,
        surface: item.surface,
        playerPill: item.playerPill,
      };
    }
  }

  for (const game of classicGames) {
    if (ongoing(save, game.id)) {
      return { kind: 'shelf', game, playerPill: playerPillFor(game) };
    }
  }

  return null;
}

export function GameHallScreen({ wordGames }: { wordGames: React.ReactNode }) {
  const loaded = useNunitoLoaded();
  const bold = loaded
    ? ({ fontFamily: theme.fontFamily['800'], fontWeight: 'normal' } as const)
    : ({ fontWeight: '800' } as const);
  const store = useStore();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const [filter, setFilter] = useState<GameHallFilter>('All games');
  const [wordFavorites, setWordFavorites] = useState<WordGame[]>([]);
  const lastSurprise = useRef<string | null>(null);

  const classicGames = useMemo(() => shelfGames.filter(game => game.island === 'classic'), []);
  const classicById = useMemo(() => new Map(classicGames.map(game => [game.id, game])), [classicGames]);

  if (!store.ready) {
    return (
      <SafeAreaView style={[styles.page, { backgroundColor: HALL_BG }]}>
        <Heading>Getting your island ready…</Heading>
      </SafeAreaView>
    );
  }
  if (store.recovery) {
    return (
      <SafeAreaView style={[styles.page, { backgroundColor: HALL_BG }]}>
        <Recovery />
      </SafeAreaView>
    );
  }

  const available = width - insets.left - insets.right;
  const large = fontScale >= LARGE_TEXT;
  const wrapTitle = fontScale > 1.3 && available < 350;
  const horizontalPad = available < 420 && !large ? 16 : 20;
  const line = Math.min(available, 1080) - horizontalPad * 2;
  const columns = fontScale > 1.3 || available < 350 ? 1 : available >= 860 ? 3 : 2;
  const cardWidth = Math.floor((line - 12 * (columns - 1)) / columns);

  const favorites = store.save.favoriteGames ?? [];
  const toggleWordFavorite = (id: WordGame) => {
    setWordFavorites(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  };

  const visibleWordIds = WORD_GAME_ITEMS.filter(item =>
    filter === 'All games'
      ? true
      : filter === 'Favorites'
        ? wordFavorites.includes(item.id)
        : item.filters.includes(filter),
  ).map(item => item.id);

  const visibleShelfGames = classicGames.filter(game =>
    filter === 'All games'
      ? true
      : filter === 'Favorites'
        ? favorites.includes(game.id)
        : game.filters.includes(filter),
  );

  const continueEntry = findGameHallContinue(store.save, classicGames);

  const goBackToMap = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const openContinue = () => {
    if (!continueEntry) return;
    if (continueEntry.kind === 'word') {
      router.push({ pathname: '/word-games', params: { game: continueEntry.id } });
    } else {
      openShelfGame(continueEntry.game.id);
    }
  };

  const launchSurprise = () => {
    const pool: ({ kind: 'word'; id: WordGame } | { kind: 'shelf'; id: ShelfId })[] = [
      ...WORD_GAME_ITEMS.map(item => ({ kind: 'word' as const, id: item.id })),
      ...classicGames.map(game => ({ kind: 'shelf' as const, id: game.id })),
    ];
    const filtered = pool.length > 1 && lastSurprise.current ? pool.filter(entry => entry.id !== lastSurprise.current) : pool;
    const pick = filtered[Math.floor(Math.random() * filtered.length)] ?? pool[0];
    if (!pick) return;
    lastSurprise.current = pick.id;
    if (pick.kind === 'word') {
      router.push({ pathname: '/word-games', params: { game: pick.id } });
    } else {
      openShelfGame(pick.id);
    }
  };

  const renderShelfCard = (game: ShelfGame) => {
    const live = ongoing(store.save, game.id);
    const favorite = favorites.includes(game.id);
    const pill = playerPillFor(game);
    return (
      <GameHallCard
        key={game.id}
        id={game.id}
        name={game.name}
        description={game.description}
        surface={game.surface}
        playerPill={pill}
        live={live}
        favorite={favorite}
        width={cardWidth}
        testID={`game-hall-card-${game.id}`}
        accessibilityLabel={`${live ? 'Continue' : 'Play'} ${game.name}, ${pill}${live ? ', saved round available' : ''}`}
        nunitoLoaded={loaded}
        onPress={() => openShelfGame(game.id)}
        onToggleFavorite={() => store.toggleGameFavorite(game.id)}
      />
    );
  };

  const hasVisibleResults = visibleWordIds.length > 0 || visibleShelfGames.length > 0;
  const stackContinue = large || available < 480;
  const inlineSurprise = !large && !wrapTitle && available >= 440;

  return (
    <TextFit.Provider value={entryRegion(fontScale, Math.max(120, line - 28))}>
      <SafeAreaView style={[styles.page, { backgroundColor: HALL_BG }]}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: horizontalPad, gap: 16, paddingTop: 4, paddingBottom: 32 },
          ]}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 8,
              paddingHorizontal: 8,
              marginHorizontal: -8,
            }}
          >
            <AtmosphereHeader rounded />
            {large || wrapTitle ? (
              <IconButton icon="back" label="Back to islands" onPress={goBackToMap} />
            ) : (
              <Button
                compact
                quiet
                icon="back"
                label="Back to islands"
                onPress={goBackToMap}
                style={{ backgroundColor: HALL_PAPER, borderColor: HALL_BORDER }}
                textStyle={{ color: HALL_INK }}
              >
                Map
              </Button>
            )}
            <Text
              accessibilityRole="header"
              numberOfLines={large || wrapTitle ? 2 : 1}
              adjustsFontSizeToFit={!large && !wrapTitle}
              minimumFontScale={0.75}
              maxFontSizeMultiplier={large ? wordFitMultiplier('Game Hall', 24, line - 56, 1.5) : undefined}
              style={{ flex: 1, fontSize: 24, color: HALL_INK, ...bold }}
            >
              Game Hall
            </Text>
            {inlineSurprise && (
              <Button
                compact
                onPress={launchSurprise}
                label="Surprise Me! Open a random game"
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  minHeight: 44,
                  backgroundColor: HALL_CORAL,
                  borderColor: '#D95D42',
                }}
                textStyle={{ color: HALL_INK, ...bold }}
              >
                Surprise Me!
              </Button>
            )}
          </View>

          <View style={{ gap: 10 }}>
            <Copy style={{ color: HALL_MUTED, fontSize: 15, lineHeight: 22 }}>
              Play board games, card games, and word games together at your own pace.
            </Copy>
            {!inlineSurprise && (
              <Button
                compact
                onPress={launchSurprise}
                label="Surprise Me! Open a random game"
                style={{
                  alignSelf: 'flex-start',
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  minHeight: 44,
                  backgroundColor: HALL_CORAL,
                  borderColor: '#D95D42',
                }}
                textStyle={{ color: HALL_INK, ...bold }}
              >
                Surprise Me!
              </Button>
            )}
          </View>

          <SaveStatus />

          {continueEntry && (
            <PressableScale
              testID="game-hall-continue-card"
              accessibilityRole="button"
              accessibilityLabel={`Continue ${continueEntry.kind === 'word' ? continueEntry.name : continueEntry.game.name}`}
              onPress={openContinue}
              amount={0.985}
              style={{
                backgroundColor: HALL_PAPER,
                borderRadius: 26,
                borderWidth: 1.5,
                borderColor: HALL_BORDER,
                borderBottomWidth: 3.5,
                borderBottomColor: 'rgba(61, 43, 36, 0.16)',
                padding: 16,
                flexDirection: stackContinue ? 'column' : 'row',
                alignItems: 'center',
                gap: 14,
                boxShadow: HALL_CARD_SHADOW,
              }}
            >
              <View
                style={{
                  width: stackContinue ? 96 : 104,
                  height: stackContinue ? 96 : 104,
                  borderRadius: 22,
                  backgroundColor: continueEntry.kind === 'word' ? continueEntry.surface : continueEntry.game.surface,
                  borderWidth: 1,
                  borderColor: 'rgba(61, 43, 36, 0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <GameIcon
                  id={continueEntry.kind === 'word' ? continueEntry.id : continueEntry.game.id}
                  size={stackContinue ? 82 : 88}
                  bare
                />
              </View>
              <View style={{ flex: 1, gap: 5, alignSelf: stackContinue ? 'stretch' : undefined }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  <View
                    style={{
                      backgroundColor: HALL_LAGOON,
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ color: HALL_PAPER, fontSize: 12, ...bold }}>Continue playing</Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: HALL_PILL_BG,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#E6D6BC',
                      paddingHorizontal: 9,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ color: HALL_MUTED, fontSize: 12, fontWeight: '700' }}>
                      {continueEntry.playerPill}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 22, lineHeight: 27, color: HALL_INK, ...bold }}>
                  {continueEntry.kind === 'word' ? continueEntry.name : continueEntry.game.name}
                </Text>
                <Copy style={{ fontSize: 14, lineHeight: 20, color: HALL_MUTED }}>
                  {continueEntry.kind === 'word' ? continueEntry.description : continueEntry.game.description}
                </Copy>
              </View>
              <View
                style={{
                  backgroundColor: HALL_CORAL,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderBottomWidth: 3,
                  borderColor: '#D95D42',
                  paddingHorizontal: 18,
                  paddingVertical: 11,
                  minHeight: 46,
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: stackContinue ? 'stretch' : 'center',
                }}
              >
                <Text style={{ color: HALL_INK, fontSize: 15, ...bold }}>Continue →</Text>
              </View>
            </PressableScale>
          )}

          <TextFit.Provider value={entryRegion(fontScale, line)}>
            <View
              testID="game-hall-filters"
              style={[styles.row, { flexWrap: 'wrap', gap: 8 }]}
              accessible={false}
              importantForAccessibility="no"
            >
              {GAME_HALL_FILTERS.map(f => (
                <Chip key={f} selected={f === filter} onPress={() => setFilter(f)}>
                  {f}
                </Chip>
              ))}
            </View>
          </TextFit.Provider>

          <GameHallWordContext.Provider
            value={{
              cardWidth,
              visibleIds: visibleWordIds,
              favorites: wordFavorites,
              nunitoLoaded: loaded,
              onToggleFavorite: toggleWordFavorite,
            }}
          >
            {filter === 'All games' ? (
              <View style={{ gap: 22 }}>
                {SECTIONS.map(section => {
                  const sectionShelfGames = section.shelfIds
                    .map(id => classicById.get(id))
                    .filter((game): game is ShelfGame => !!game);
                  const totalCount = section.wordIds.length + sectionShelfGames.length;
                  return (
                    <View key={section.id} testID={`game-hall-section-${section.id}`} style={{ gap: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <Heading style={{ fontSize: 22, color: HALL_INK, ...bold }}>{section.title}</Heading>
                        <View
                          style={{
                            backgroundColor: HALL_PILL_BG,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: HALL_BORDER,
                            paddingHorizontal: 10,
                            paddingVertical: 3,
                          }}
                        >
                          <Text style={{ fontSize: 12, color: HALL_MUTED, fontWeight: '700' }}>
                            {`${totalCount} games`}
                          </Text>
                        </View>
                      </View>
                      <View
                        testID={section.id === 'words' ? 'word-games-cards' : undefined}
                        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}
                      >
                        {section.id === 'words' && wordGames}
                        {sectionShelfGames.map(renderShelfCard)}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : !hasVisibleResults ? (
              <View
                testID="game-hall-empty"
                style={{
                  backgroundColor: HALL_PAPER,
                  borderRadius: 24,
                  borderWidth: 1.5,
                  borderColor: HALL_BORDER,
                  padding: 22,
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: HALL_CARD_SHADOW,
                }}
              >
                <Heading style={{ fontSize: 20, color: HALL_INK, textAlign: 'center', ...bold }}>
                  {filter === 'Favorites' ? 'No favorite games yet' : 'No games match this filter'}
                </Heading>
                <Copy style={{ textAlign: 'center', color: HALL_MUTED }}>
                  {filter === 'Favorites'
                    ? 'Tap the star on a game to keep it close by.'
                    : 'Try another filter to see more games in the Game Hall.'}
                </Copy>
                <Button quiet compact onPress={() => setFilter('All games')}>
                  Show all games
                </Button>
              </View>
            ) : (
              <View
                testID={visibleWordIds.length > 0 ? 'word-games-cards' : 'game-hall-filtered-grid'}
                style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}
              >
                {visibleWordIds.length > 0 && wordGames}
                {visibleShelfGames.map(renderShelfCard)}
              </View>
            )}
          </GameHallWordContext.Provider>

          <Copy style={{ fontSize: 12, textAlign: 'center', paddingVertical: 10, color: HALL_MUTED }}>
            Offline · No ads · Made for little moments together.
          </Copy>
        </ScrollView>
      </SafeAreaView>
    </TextFit.Provider>
  );
}
