import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Copy, Heading } from '../components/ui';
import { useStore } from '../state/Store';
import { selectedOwner, progressFor } from '../state/challengeDrafts';
import { coveEntries, infoFor } from './catalog';
import { useCoveLocal } from './useCoveLocal';
export function coveContinue(save: ReturnType<typeof useStore>['save']) {
  return progressFor(save, selectedOwner(save))?.paused.filter(s => !s.result && !s.credited).sort((a, b) => b.ordinal - a.ordinal).find(s => coveEntries().some(e => e.game === s.game));
}
export function CoveLists({ favorites = false }: { favorites?: boolean }) {
  const store = useStore(), local = useCoveLocal(), entries = coveEntries().filter(e => (!favorites || local.data.favorites.includes(e.game)) && e.puzzles.some(p => !local.data.hidden.includes(p.ref.hash))), resume = coveContinue(store.save);
  if (!entries.length && !resume) return null;
  return <View style={{ gap: 10 }}><Heading style={{ fontSize: 24 }}>{favorites ? 'Cove favorites' : 'Puzzle Cove'}</Heading>{!favorites && resume && <Button quiet disabled={!local.ready} onPress={() => router.push({ pathname: '/cove', params: { game: resume.game } })}>Continue {infoFor(resume.game).name}</Button>}{entries.map(e => <View key={e.game} style={{ gap: 4 }}><Button quiet disabled={!local.ready} onPress={() => router.push({ pathname: '/cove', params: { game: e.game } })}>{infoFor(e.game).name}</Button><Button quiet compact disabled={!local.ready} onPress={() => void local.change({ type: 'favorite', game: e.game })}>{local.data.favorites.includes(e.game) ? 'Remove Cove favorite' : 'Favorite in Cove'}</Button></View>)}{!!local.error && <Copy>{local.error}</Copy>}</View>;
}
