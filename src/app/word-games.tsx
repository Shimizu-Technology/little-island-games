import React, { useRef, useState } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useStore } from '../state/Store';
import { Copy, styles } from '../components/ui';
import { Recovery } from '../components/Recovery';
import { SaveStatus } from '../components/SaveStatus';
import { useSoundControls } from '../components/Audio';
import { useRoundPractice } from '../practice/useRoundPractice';
import { WordHuntScreen } from '../wordgames/WordHuntScreen';
import { AnagramsScreen } from '../wordgames/AnagramsScreen';
import type { WordGame, WordSession } from '../wordgames/session';
/** Timed word games have their own route; no reading or classic activity route imports these screens. */
export default function WordGames() {
  const { game } = useLocalSearchParams<{ game?: string }>(), store = useStore();
  if (game !== 'word-hunt' && game !== 'anagrams') return <Redirect href="/"/>;
  if (!store.ready) return <SafeAreaView style={styles.page}><Copy>Opening your word game…</Copy></SafeAreaView>;
  if (store.recovery) return <SafeAreaView style={styles.page}><Recovery/></SafeAreaView>;
  return <WordGameRound key={`${game}:${store.epoch}:${store.save.learning?.active ?? 'family'}`} game={game}/>;
}
function WordGameRound({ game }: { game: WordGame }) {
  const store = useStore(), focused = useIsFocused(), { width } = useWindowDimensions();
  const [epoch] = useState(store.epoch), [owner] = useState(store.save.learning?.active ?? 'family');
  const [tracing, setTracing] = useState(false), scroll = useRef<ScrollView>(null);
  const saved = store.save.wordGames?.people[owner]?.[game] ?? null;
  const practice = useRoundPractice(game, saved);
  const sound = useSoundControls(store.save.settings.sound && focused && !practice.pending);
  const Screen = game === 'word-hunt' ? WordHuntScreen : AnagramsScreen;
  const save = (next: WordSession, previous: WordSession | null) => store.wordGameUpdate(game, next, { owner, epoch, id: previous?.id ?? null, ...(previous ? { revision: previous.revision } : {}) });
  return <SafeAreaView style={styles.page}>
    <ScrollView ref={scroll} scrollEnabled={!tracing} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingHorizontal: 20, gap: 16 }]}>
      <SaveStatus/>
      <Screen session={saved} onSave={save} onBack={() => router.canGoBack() ? router.back() : router.replace('/')}
        active={focused && !practice.pending} beforeNewRound={practice.request} sound={store.save.settings.sound} width={Math.min(width - 40, 420)}
        onActionFocus={() => scroll.current?.scrollTo({ y: 0, animated: false })} onTracingChange={setTracing}
        onFeedback={event => sound.play(event === 'finish' ? 'win' : event === 'word' ? 'match' : 'tap')}/>
    </ScrollView>{practice.panel}
  </SafeAreaView>;
}
