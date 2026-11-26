import React, { useEffect, useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, Heading } from '../components/ui';
import { useStore } from '../state/Store';
import { Recovery } from '../components/Recovery';
import { challengeFor } from '../challenge/catalog';
import { resolvePuzzleLink } from '../challenge/deepLink';
import { ChallengeFrame } from '../challenge/ChallengeFrame';
export default function Challenge() {
  const {game,puzzle}=useLocalSearchParams<{game?:string;puzzle?:string}>(), store=useStore(), entry=challengeFor(game??'');
  const [resolved, setResolved] = useState<{value: unknown; target: Awaited<ReturnType<typeof resolvePuzzleLink>>}>();
  useEffect(() => {
    let live = true;
    void resolvePuzzleLink(puzzle).then(target => { if (live) setResolved({value: puzzle, target}); });
    return () => { live = false; };
  }, [puzzle]);
  if (puzzle && resolved?.value !== puzzle) return <SafeAreaView><Heading>Getting your puzzle ready…</Heading></SafeAreaView>;
  const target = resolved?.value === puzzle ? resolved?.target : null;
  // An explicit game retains its original route semantics, including mismatched puzzle parameters.
  const selected = entry ?? (!game ? target?.entry : undefined);
  if(!selected)return <Redirect href={puzzle ? "/cove" : "/"}/>;
  if(!store.ready)return <SafeAreaView style={{flex:1,backgroundColor:C.cream}}><Heading>Getting your puzzle ready…</Heading></SafeAreaView>;
  if(store.recovery)return <SafeAreaView style={{flex:1,backgroundColor:C.cream}}><Recovery/></SafeAreaView>;
  return <ChallengeFrame key={`${selected.game}:${puzzle ?? ''}:${store.epoch}:${store.save.cove?.active??store.save.learning?.active??'family'}`} entry={selected} autoStart={!game} requestedPuzzle={puzzle} requestedCard={target?.entry === selected ? target.card : undefined}/>;
}
