import { Heading as BaseHeading, Copy as BaseCopy, Button as BaseButton } from "../components/ui";
import { useNunitoLoaded } from "../ui/fonts";

import React from 'react';
import { View } from 'react-native';

import type { ChallengeProgress, Signal } from '../state/challenge';
import { dismissSignal, rateSignal, ratingDue, resultOffer, type Comfort } from './offers';
export function ResultOffer({progress,context,comfort,facts,onChange,onChoose,onHear,samePuzzle}: {
  onHear?:()=>void; samePuzzle?:boolean;
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
  if(ratingDue(progress,context))return <View style={{gap:16,alignSelf:'stretch',padding:20,borderRadius:24,backgroundColor:'#FFFDF8',borderWidth:1,borderColor:'#E8D8BE'}} testID="challenge-rating">
    <Heading style={{fontSize:21,textAlign:'center'}}>How did that feel?</Heading>
    <View style={{gap:8}}>{(['easy','right','hard'] as const).map(value=><Button key={value} quiet onPress={()=>{const next=rateSignal(progress,context,value);if(value==='easy'&&facts.dare){if(onChange(dismissSignal(next,context)))onChoose('dare');}else if(value==='easy'&&facts.harder){if(onChange(dismissSignal(next,context)))onChoose('harder');}else rate(value);}}>{value==='easy'?'Too easy':value==='right'?'Just right':'Too hard'}</Button>)}</View>
    <Button quiet onPress={()=>onChange(dismissSignal(progress,context))}>Not now</Button>
  </View>;
  if(!offer)return null;
  return <View style={{gap:16,alignSelf:'stretch',padding:20,borderRadius:24,backgroundColor:'#FFFDF8',borderWidth:1,borderColor:'#E8D8BE'}} testID="challenge-offer">
    <Heading style={{fontSize:21,textAlign:'center'}}>{offer.title}</Heading>
    {offer.kind==='dare'&&<Copy style={{textAlign:'center'}}>{samePuzzle?'Try a dare on this same beach.':'A related challenge is open whenever you want it.'}</Copy>}
    {onHear&&<Button quiet onPress={onHear}>Hear the invitation</Button>}
    <View style={{gap:8}}><Button quiet onPress={()=>choose(offer.kind)}>{offer.kind==='dare'?(samePuzzle?'Try this beach with a dare':'Try a related challenge'):offer.kind==='harder'?'Try a stretch':'Choose a gentler puzzle'}</Button><Button quiet onPress={()=>onChange(dismissSignal(progress,context))}>Stay here</Button></View>
  </View>;
}

function Heading(props: React.ComponentProps<typeof BaseHeading>) {
 const loaded = useNunitoLoaded();
 return <BaseHeading {...props} style={[{ color: '#3D2B24' }, props.style, loaded ? {fontFamily: 'Nunito_800ExtraBold', fontWeight: 'normal'} : {fontWeight: '800'}]}/>;
}
function Copy(props: React.ComponentProps<typeof BaseCopy>) {
 const loaded = useNunitoLoaded();
 return <BaseCopy {...props} style={[{ color: '#665247' }, props.style, loaded && {fontFamily: 'Nunito_600SemiBold', fontWeight: 'normal'}]}/>;
}
function Button(props: React.ComponentProps<typeof BaseButton>) {
 const loaded = useNunitoLoaded();
 return <BaseButton {...props} style={{...props.style, backgroundColor: props.quiet ? '#FFFDF8' : '#FF7A5C', borderWidth: props.quiet ? (props.selected ? 2 : 1) : 0, borderColor: props.selected ? '#3D2B24' : props.quiet ? '#E8D8BE' : 'transparent'}} textStyle={{...props.textStyle, color: '#3D2B24', ...(loaded ? {fontFamily: 'Nunito_800ExtraBold', fontWeight: 'normal'} : {})}}/>;
}
