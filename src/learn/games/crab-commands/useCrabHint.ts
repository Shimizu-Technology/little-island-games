import { useEffect, useState } from 'react';
import type { Command } from './engine';
import { nextHintSliced, type Descriptor, type Hint } from './challenge-engine';
/** Stale searches never publish after editing, leaving, or changing learners. */
export function useCrabHint(d:Descriptor, program:Command[], enabled:boolean) {
 const [answer,setAnswer]=useState<{d:Descriptor;program:Command[];hint:Hint}|null>(null);
 useEffect(()=>{
  if(!enabled)return;
  let cancelled=false;
  void nextHintSliced(d,program,{cancelled:()=>cancelled}).then(hint=>{if(hint&&!cancelled)setAnswer({d,program,hint});});
  return ()=>{cancelled=true;};
 },[d,program,enabled]);
 return enabled&&answer?.d===d&&answer?.program===program?answer.hint:null;
}
