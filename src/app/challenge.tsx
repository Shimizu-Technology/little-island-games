import React, { useEffect, useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, Heading } from '../components/ui';
import { useStore } from '../state/Store';
import { Recovery } from '../components/Recovery';
import { legacyReefResume } from '../learn/destinations';
import { challengeFor } from '../challenge/catalog';
import { resolvePuzzleLink } from '../challenge/deepLink';
import { ChallengeFrame } from '../challenge/ChallengeFrame';
export default function Challenge() {
  const raw=useLocalSearchParams<{game?:string|string[];puzzle?:string|string[]}>();
  const game=Array.isArray(raw.game)?raw.game[0]:raw.game, puzzle=Array.isArray(raw.puzzle)?raw.puzzle[0]:raw.puzzle;
  const hasPuzzle=raw.puzzle!==undefined, store=useStore(), entry=challengeFor(game??'');
  const linkKey=`${game??''}:${puzzle??''}:${store.save.cove?.active??store.save.learning?.active??'family'}`;
  const [consumedLink,setConsumedLink]=useState<string>();
  const [resolved, setResolved] = useState<{value: unknown; target: Awaited<ReturnType<typeof resolvePuzzleLink>>}>();
  useEffect(() => {
    if (!puzzle) return;
    let live = true;
    void resolvePuzzleLink(puzzle).then(target => { if (live) setResolved({value: puzzle, target}); });
    return () => { live = false; };
  }, [puzzle]);
  if (puzzle && resolved?.value !== puzzle) return <SafeAreaView style={{flex:1,backgroundColor:C.cream}}><Heading>Getting your puzzle ready…</Heading></SafeAreaView>;
  const target = resolved?.value === puzzle ? resolved?.target : null;
  // An explicit game retains its original route semantics, including mismatched puzzle parameters.
  const selected = entry ?? (!game ? target?.entry : undefined);
  if(!selected)return <Redirect href={hasPuzzle ? "/cove" : "/"}/>;
  if(!store.ready)return <SafeAreaView style={{flex:1,backgroundColor:C.cream}}><Heading>Getting your puzzle ready…</Heading></SafeAreaView>;
  if(store.recovery)return <SafeAreaView style={{flex:1,backgroundColor:C.cream}}><Recovery/></SafeAreaView>;
  if(game==='reef-sweep'&&!hasPuzzle&&legacyReefResume(store.save))return <Redirect href={{pathname:'/board',params:{game:'reef-sweep'}}}/>;
  return <ChallengeFrame key={`${selected.game}:${puzzle ?? ''}:${store.epoch}:${store.save.cove?.active??store.save.learning?.active??'family'}`} entry={selected} autoStart={!game&&consumedLink!==linkKey} onLinkConsumed={()=>setConsumedLink(linkKey)} requestedPuzzle={puzzle} requestedCard={target?.entry === selected ? target.card : undefined}/>;
}
