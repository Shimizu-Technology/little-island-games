import type { ChallengeProgress, Signal } from '../state/challenge';
export type Comfort = { offers: boolean; youngChild: boolean; opening: 1|2|3|4|5 };
export const defaultComfort: Comfort = {offers:true,youngChild:false,opening:1};
export type Offer = { kind: 'dare'|'harder'|'easier'; title: string };
/** Only completed solo rounds enter personal signals. A pause/exit has no effect. */
export function completedSignal(progress: ChallengeProgress, context: string, clean: boolean, personal: boolean, cove=false, differentPuzzle=true): ChallengeProgress {
  if(!personal)return progress;
  const before=progress.signals.find(s=>s[0]===context), recent=((before?.[1]??'')+(clean?'c':'h')).slice(-5);
  const count=progress.practice.find(p=>p[0]===context)??[context,0,0];
  const row:Signal=[context,recent,0,differentPuzzle&&(count[1]+count[2]+1)%3===0?null:before?.[3]??null,differentPuzzle?false:before?.[4]??false];
  return {...progress,signals:[...progress.signals.filter(s=>s[0]!==context),row].slice(-(cove?8:32)),practice:[...progress.practice.filter(p=>p[0]!==context),[context,Math.min(2147483647,count[1]+Number(!clean)),Math.min(2147483647,count[2]+Number(clean))] as [string,number,number]].slice(-(cove?16:64))};
}
export function resultOffer(signal: Signal | undefined, comfort: Comfort, facts: {atPar:boolean;firstHigher:boolean;dare:boolean;harder:boolean;easier?:boolean}): Offer | null {
  if(!signal || !comfort.offers || comfort.youngChild || signal[4])return null;
  if(signal[3]==='hard')return facts.easier===false?null:{kind:'easier',title:'Choose a gentler puzzle?'};
  if(signal[3]==='easy' && facts.dare)return {kind:'dare',title:'Try a dare?'};
  if(signal[1].endsWith('c') && facts.atPar && facts.dare)return {kind:'dare',title:'Try a dare?'};
  if(facts.harder && (signal[1].endsWith('cc') || signal[1].endsWith('c') && facts.firstHigher))return {kind:'harder',title:'Want something harder?'};
  // Help is ordinary practice. The invitation never comments on help or scanning.
  if(signal[1].endsWith('hhh') && facts.easier!==false)return {kind:'easier',title:'Choose a gentler puzzle?'};
  return null;
}
export const ratingDue = (progress:ChallengeProgress, context:string) => {
  const count=progress.practice.find(p=>p[0]===context), signal=progress.signals.find(s=>s[0]===context);
  return !!count && (count[1]+count[2])%3===0 && signal?.[3]===null && !signal[4];
};
export function rateSignal(progress:ChallengeProgress,context:string,rating:Signal[3]):ChallengeProgress {
  return {...progress,signals:progress.signals.map(s=>s[0]===context?[s[0],s[1],s[2],rating,s[4]]:s)};
}
export function dismissSignal(progress:ChallengeProgress,context:string):ChallengeProgress {
  return {...progress,signals:progress.signals.map(s=>s[0]===context?[s[0],s[1],s[2],s[3],true]:s)};
}
