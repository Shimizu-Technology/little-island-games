import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Copy } from '../components/ui';
import type { ChallengeExpected } from '../state/challengeDrafts';
import { contentMessage, type SessionOpenResult } from '../state/sessionContent';

/** Mount per exact slot/owner/epoch. Never render or dispatch an unverified saved board. */
export function SessionGate({open,expected,render}:{open:(expected:ChallengeExpected)=>Promise<SessionOpenResult>;expected:ChallengeExpected;render:()=>React.ReactNode}) {
  const initial=useRef({open,expected}), [attempt,setAttempt]=useState(0), [result,setResult]=useState<SessionOpenResult>();
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
  return <View testID="paused-content" accessibilityLiveRegion="polite" style={{gap:10}}>
    <Copy>{result?.message??'Opening your saved puzzle. Your saved work is kept.'}</Copy>
    {result&&!result.ok&&<Button quiet onPress={()=>{setResult(undefined);setAttempt(n=>n+1);}}>Try opening again</Button>}
  </View>;
}
