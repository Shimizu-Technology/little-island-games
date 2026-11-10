import { useEffect, useMemo, useState } from 'react';
import type { Command } from './engine';
import { nextHintSliced, type Descriptor, type Hint, type HintEdits } from './challenge-engine';
/** Stale searches never publish after editing, leaving, or changing learners. */
export function useCrabHint(d:Descriptor, program:Command[], enabled:boolean, edits:HintEdits='any') {
 const key=JSON.stringify(program), stableProgram=useMemo<Command[]>(()=>JSON.parse(key),[key]);
 const [answer,setAnswer]=useState<{d:Descriptor;key:string;hint:Hint}|null>(null);
 useEffect(()=>{
  if(!enabled)return;
  let cancelled=false;
  void nextHintSliced(d,stableProgram,{cancelled:()=>cancelled,edits}).then(hint=>{if(hint&&!cancelled)setAnswer({d,key,hint});});
  return ()=>{cancelled=true;};
 },[d,key,stableProgram,enabled,edits]);
 return enabled&&answer?.d===d&&answer?.key===key?answer.hint:null;
}
