import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useStore } from '../state/Store';
import { Recovery } from '../components/Recovery';
import { challengeFor } from '../challenge/catalog';
import { ChallengeFrame } from '../challenge/ChallengeFrame';
export default function Challenge() {
  const {game,puzzle}=useLocalSearchParams<{game?:string;puzzle?:string}>(), store=useStore(), entry=challengeFor(game??'');
  if(!entry)return <Redirect href="/"/>;
  if(!store.ready)return null;
  if(store.recovery)return <Recovery/>;
  return <ChallengeFrame key={`${game}:${store.epoch}:${store.save.cove?.active??store.save.learning?.active??'family'}`} entry={entry} requestedPuzzle={puzzle}/>;
}
