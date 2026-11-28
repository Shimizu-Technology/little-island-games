import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Copy, Heading, PressableScale } from '../components/ui';
import { GameIcon } from '../components/GameIcon';
import { useStore } from '../state/Store';
import type { WordGame } from './session';
const cards: readonly { id: WordGame; name: string; description: string }[] = [
  { id: 'word-hunt', name: 'Word Hunt', description: 'Trace neighboring letters to discover words.' },
  { id: 'anagrams', name: 'Anagrams', description: 'Mix a handful of letters into new words.' },
];
/** Display separately so the published classic/activity rosters and their QA matrix remain unchanged. */
export function WordGamesCards() {
  const store = useStore(), owner = store.save.learning?.active ?? 'family';
  return <View testID="word-games-cards" style={{ gap: 12 }}><Heading>Word games</Heading>{cards.map(card => {
    const round = store.save.wordGames?.people[owner]?.[card.id];
    const continuing = round && round.phase !== 'finished';
    return <PressableScale key={card.id} testID={`word-game-card-${card.id}`} accessibilityRole="button" accessibilityLabel={`${continuing ? 'Continue' : 'Play'} ${card.name}`}
      onPress={() => router.push({ pathname: '/word-games', params: { game: card.id } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 14, minHeight: 100, borderRadius: 20, backgroundColor: '#F3E4C9', borderWidth: 1, borderColor: '#D1B78D' }}>
      <GameIcon id={card.id} size={74}/><View style={{ flex: 1, gap: 4 }}><Heading style={{ fontSize: 22 }}>{card.name}</Heading><Copy>{card.description}</Copy><Copy style={{ fontSize: 14 }}>{continuing ? 'Continue your saved round' : 'Rush · Chill · Pass & Play'}</Copy></View>
    </PressableScale>;
  })}</View>;
}
