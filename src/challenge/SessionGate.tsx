import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Copy } from '../components/ui';
import type { ChallengeExpected } from '../state/challengeDrafts';
import { contentMessage, type SessionOpenResult } from '../state/sessionContent';

/** Mount per exact slot/owner/epoch. Never render or dispatch an unverified saved board. */
export function SessionGate({open,expected,render,onStartFresh}:{open:(expected:ChallengeExpected)=>Promise<SessionOpenResult>;expected:ChallengeExpected;render:()=>React.ReactNode;onStartFresh?:()=>Promise<boolean>}) {
  const initial=useRef({open,expected}), [attempt,setAttempt]=useState(0), [result,setResult]=useState<SessionOpenResult>(), [busy,setBusy]=useState(false), [failed,setFailed]=useState(false);
  useEffect(()=>{
    let live=true;
    const {open,expected}=initial.current;
    void open(expected).then(result=>{if(live)setResult(result);}).catch(error=>{
      console.warn('Paused puzzle could not open',error);
      if(live)setResult({ok:false,kind:'content-unavailable',message:contentMessage});
    });
    return ()=>{live=false;};
  },[attempt]);
  if(result?.ok)return <>{render()}</>;
  // A board that can't open is set aside (kept in recovery storage), never repaired, so the learner isn't stuck on it.
  const fresh=result&&!result.ok&&result.kind!=='stale'&&onStartFresh;
  return <View testID="paused-content" accessibilityLiveRegion="polite" style={{gap:10}}>
    <Copy>{result?.message??'Opening your saved puzzle. Your saved work is kept.'}</Copy>
    {failed&&<Copy>The paused puzzle couldn’t be set aside. Your saved work is kept. Try again.</Copy>}
    {result&&!result.ok&&result.kind!=='invalid-session'&&<Button quiet disabled={busy} onPress={()=>{setResult(undefined);setAttempt(n=>n+1);}}>Try opening again</Button>}
    {fresh&&<Button disabled={busy} onPress={()=>{setBusy(true);setFailed(false);void fresh().then(ok=>{if(!ok)setFailed(true);}).catch(()=>setFailed(true)).finally(()=>setBusy(false));}}>Start this puzzle fresh</Button>}
  </View>;
}
