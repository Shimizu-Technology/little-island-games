import React, { useContext } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Copy, Heading, PressableScale } from '../components/ui';
import { GameIcon } from '../components/GameIcon';
import { GameHallCard, HALL_BORDER, HALL_CARD_SHADOW, HALL_INK, HALL_MUTED, HALL_PAPER } from '../gamehall/GameHallCard';
import { GameHallWordContext } from '../gamehall/wordContext';
import { useStore } from '../state/Store';
import type { WordGame } from './session';

const cards: readonly { id: WordGame; name: string; description: string; surface: string; playerPill: string }[] = [
  { id: 'word-hunt', name: 'Word Hunt', description: 'Trace neighboring letters to discover words.', surface: '#DFF1EE', playerPill: '1–2 Players' },
  { id: 'anagrams', name: 'Anagrams', description: 'Mix a handful of letters into new words.', surface: '#F7EBD0', playerPill: '1–2 Players' },
];

/** Display separately so the published classic/activity rosters and their QA matrix remain unchanged. */
export function WordGamesCards() {
  const store = useStore();
  const owner = store.save.learning?.active ?? 'family';
  const hall = useContext(GameHallWordContext);

  if (hall) {
    return (
      <>
        {cards
          .filter(card => hall.visibleIds.includes(card.id))
          .map(card => {
            const round = store.save.wordGames?.people?.[owner]?.[card.id];
            const continuing = !!round && round.phase !== 'finished';
            const favorite = hall.favorites.includes(card.id);
            return (
              <GameHallCard
                key={card.id}
                id={card.id}
                name={card.name}
                description={card.description}
                surface={card.surface}
                playerPill={card.playerPill}
                live={continuing}
                favorite={favorite}
                width={hall.cardWidth}
                testID={`word-game-card-${card.id}`}
                accessibilityLabel={`${continuing ? 'Continue' : 'Play'} ${card.name}`}
                nunitoLoaded={hall.nunitoLoaded}
                onPress={() => router.push({ pathname: '/word-games', params: { game: card.id } })}
                onToggleFavorite={() => hall.onToggleFavorite(card.id)}
              />
            );
          })}
      </>
    );
  }

  return (
    <View testID="word-games-cards" style={{ gap: 12 }}>
      <Heading>Word games</Heading>
      {cards.map(card => {
        const round = store.save.wordGames?.people?.[owner]?.[card.id];
        const continuing = !!round && round.phase !== 'finished';
        return (
          <PressableScale
            key={card.id}
            testID={`word-game-card-${card.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${continuing ? 'Continue' : 'Play'} ${card.name}`}
            onPress={() => router.push({ pathname: '/word-games', params: { game: card.id } })}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              padding: 14,
              minHeight: 100,
              borderRadius: 22,
              backgroundColor: HALL_PAPER,
              borderWidth: 1.5,
              borderColor: HALL_BORDER,
              borderBottomWidth: 3,
              borderBottomColor: 'rgba(61, 43, 36, 0.14)',
              boxShadow: HALL_CARD_SHADOW,
            }}
          >
            <GameIcon id={card.id} size={74} />
            <View style={{ flex: 1, gap: 4 }}>
              <Heading style={{ fontSize: 22, color: HALL_INK }}>{card.name}</Heading>
              <Copy style={{ color: HALL_MUTED }}>{card.description}</Copy>
              <Copy style={{ fontSize: 14, color: HALL_MUTED }}>
                {continuing ? 'Continue your saved round' : 'Rush · Chill · Pass & Play'}
              </Copy>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}
