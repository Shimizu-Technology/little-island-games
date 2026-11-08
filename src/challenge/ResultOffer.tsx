import React from 'react';
import { View } from 'react-native';
import { Button, Copy, Heading } from '../components/ui';
import type { ChallengeProgress, Signal } from '../state/challenge';
import { dismissSignal, rateSignal, ratingDue, resultOffer, type Comfort } from './offers';
export function ResultOffer({progress,context,comfort,facts,onChange,onChoose,onHear}: {
  onHear?:()=>void;
  progress:ChallengeProgress; context:string; comfort:Comfort;
  facts:{atPar:boolean;firstHigher:boolean;dare:boolean;harder:boolean;easier?:boolean};
  onChange:(next:ChallengeProgress)=>boolean; onChoose:(kind:'dare'|'harder'|'easier')=>void;
}) {
  const signal=progress.signals.find(s=>s[0]===context);
  if(!comfort.offers || comfort.youngChild || !signal || signal[4])return null;
  const offer=resultOffer(signal,comfort,facts);
  const choose=(kind:'dare'|'harder'|'easier')=>{if(onChange(dismissSignal(progress,context)))onChoose(kind);};
  const rate=(value:Signal[3])=>onChange(dismissSignal(rateSignal(progress,context,value),context));
  // A face and an invitation share one card; they are never stacked prompts.
  if(ratingDue(progress,context))return <View style={{gap:10,alignSelf:'stretch'}} testID="challenge-rating">
    <Heading style={{fontSize:21,textAlign:'center'}}>How did that feel?</Heading>
    <View style={{gap:8}}>{(['easy','right','hard'] as const).map(value=><Button key={value} quiet onPress={()=>{const next=rateSignal(progress,context,value);if(value==='easy'&&facts.dare){if(onChange(dismissSignal(next,context)))onChoose('dare');}else rate(value);}}>{value==='easy'?'Too easy':value==='right'?'Just right':'Too hard'}</Button>)}</View>
    <Button quiet onPress={()=>onChange(dismissSignal(progress,context))}>Not now</Button>
  </View>;
  if(!offer)return null;
  return <View style={{gap:10,alignSelf:'stretch'}} testID="challenge-offer">
    <Heading style={{fontSize:21,textAlign:'center'}}>{offer.title}</Heading>
    {offer.kind==='dare'&&<Copy style={{textAlign:'center'}}>A related challenge is open whenever you want it.</Copy>}
    {onHear&&<Button quiet onPress={onHear}>Hear the invitation</Button>}
    <View style={{gap:8}}><Button quiet onPress={()=>choose(offer.kind)}>{offer.kind==='dare'?'Try a related challenge':offer.kind==='harder'?'Try a stretch':'Choose a gentler puzzle'}</Button><Button quiet onPress={()=>onChange(dismissSignal(progress,context))}>Stay here</Button></View>
  </View>;
}
