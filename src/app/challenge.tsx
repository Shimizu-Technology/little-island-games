import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, Heading } from '../components/ui';
import { useStore } from '../state/Store';
import { Recovery } from '../components/Recovery';
import { challengeFor } from '../challenge/catalog';
import { ChallengeFrame } from '../challenge/ChallengeFrame';
export default function Challenge() {
  const {game,puzzle}=useLocalSearchParams<{game?:string;puzzle?:string}>(), store=useStore(), entry=challengeFor(game??'');
  if(!entry)return <Redirect href="/"/>;
  if(!store.ready)return <SafeAreaView style={{flex:1,backgroundColor:C.cream}}><Heading>Getting your puzzle ready…</Heading></SafeAreaView>;
  if(store.recovery)return <SafeAreaView style={{flex:1,backgroundColor:C.cream}}><Recovery/></SafeAreaView>;
  return <ChallengeFrame key={`${game}:${store.epoch}:${store.save.cove?.active??store.save.learning?.active??'family'}`} entry={entry} requestedPuzzle={puzzle}/>;
}
