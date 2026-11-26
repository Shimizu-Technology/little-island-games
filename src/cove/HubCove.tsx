import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Copy, Heading } from '../components/ui';
import { useStore } from '../state/Store';
import { selectedOwner, progressFor } from '../state/challengeDrafts';
import { coveEntries, infoFor, shownCount } from './catalog';
import { useCoveLocal } from './useCoveLocal';
export function coveContinue(save: ReturnType<typeof useStore>['save']) {
  return progressFor(save, selectedOwner(save))?.paused.filter(s => !s.result && !s.credited).sort((a, b) => b.ordinal - a.ordinal).find(s => coveEntries().some(e => e.game === s.game));
}
/** Device-local suggestion only; merely displaying it never selects an identity. */
export function lastCoveContinue(save: ReturnType<typeof useStore>['save'], person?: string) {
  if (!person || !save.cove?.people[person]) return undefined;
  const session = save.cove.people[person].challenge.paused.filter(s => !s.result && !s.credited).sort((a,b) => b.ordinal - a.ordinal).find(s => coveEntries().some(e => e.game === s.game));
  return session ? { person, name: save.cove.people[person].name, session } : undefined;
}
export function CovePersonResume() {
  const store = useStore(), local = useCoveLocal(), last = lastCoveContinue(store.save, local.data.lastPerson);
  return last ? <Button quiet disabled={!local.ready} onPress={() => router.push({ pathname: '/cove', params: { person: last.person, game: last.session.game, resume: '1' } })}>Resume {last.name} · {infoFor(last.session.game).name}</Button> : null;
}
export function CoveLists({ favorites = false }: { favorites?: boolean }) {
  const store = useStore(), local = useCoveLocal(), entries = coveEntries().filter(e => (!favorites || local.data.favorites.includes(e.game)) && shownCount(e, local.data.hidden) > 0), resume = coveContinue(store.save);
  if (!entries.length && !resume) return null;
  return <View style={{ gap: 10 }}><Heading style={{ fontSize: 24 }}>{favorites ? 'Puzzle favorites' : 'Puzzles'}</Heading>{!favorites && <CovePersonResume/>}{!favorites && resume && <Button quiet disabled={!local.ready} onPress={() => router.push({ pathname: '/cove', params: { game: resume.game, resume: '1' } })}>Continue {infoFor(resume.game).name}</Button>}{entries.map(e => <View key={e.game} style={{ gap: 4 }}><Button quiet disabled={!local.ready} onPress={() => router.push({ pathname: '/cove', params: { game: e.game } })}>{infoFor(e.game).name}</Button><Button quiet compact disabled={!local.ready} onPress={() => void local.change({ type: 'favorite', game: e.game })}>{local.data.favorites.includes(e.game) ? 'Remove from favorites' : 'Add to favorites'}</Button></View>)}{!!local.error && <Copy>{local.error}</Copy>}</View>;
}
