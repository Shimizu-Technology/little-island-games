import { programOperations } from '../../program/operations';
import { Copy, Button } from '../../../components/ui';
import { ProgramEditor } from '../../program/ProgramEditor';
import { beepProgram, programCodes, readBeepDraft } from './program';
import React,{useContext,useEffect,useRef,useState} from 'react';
import {AudioPreferences,useSoundControls} from '../../../components/Audio';
import {useReducedMotion} from '../../../components/motion';
import type {ChallengeViewProps} from '../../../challenge/types';
import {execution} from './movement';
import type {Action,State} from './challenge-engine';
import {Plan,labels} from './Plan';
import {useBeepComfort} from './comfort';
import {cardSpeech} from './speech';
export function ChallengeBoard({state:s,dispatch,active,width,onSettled,header,footer,commit,sessionKey}:ChallengeViewProps<State,Action>){
 const comfort=useBeepComfort();
 const preferences=useContext(AudioPreferences),{play,stop}=useSoundControls(preferences.sound??true),reduced=useReducedMotion();
 const [blockMode,setBlocks]=useState(!!s.blockDraft);
 const blocks=s.descriptor.blockEditor===true&&blockMode;
 const draft=s.blockDraft?readBeepDraft(s.blockDraft,s.descriptor.puzzle,s.descriptor.level):null;
 const programKey=JSON.stringify(s.program);
 const [playback,setPlayback]=useState({run:s.runs,key:programKey,cursor:s.won?s.program.length:0,playing:false}),observed=useRef(s.runs);
 useEffect(()=>{if(observed.current!==s.runs){observed.current=s.runs;setPlayback({run:s.runs,key:programKey,cursor:0,playing:true});}},[s.runs,programKey]);
 const result=execution(s.descriptor.puzzle,s.program),limit=result.failedCard===null?s.program.length:result.failedCard+1;
 useEffect(()=>{if(!active||!playback.playing)return;const timer=setTimeout(()=>{if(playback.cursor<limit){setPlayback(p=>({...p,cursor:p.cursor+1}));play('tap',true);}else{setPlayback(p=>({...p,playing:false}));play(s.won?'win':'wrong',true);onSettled?.();}},reduced?140:420);return()=>clearTimeout(timer);},[active,playback,limit,s.won,reduced,onSettled,play]);
 useEffect(()=>{if(!active)stop();return stop;},[active,stop]);
 const running=playback.playing||playback.run!==s.runs,cursor=playback.run===s.runs&&playback.key===programKey?playback.cursor:0;
 return <Plan blockFrames={draft?.frames} blockEditor={blocks?<ProgramEditor program={draft?.program??beepProgram(s.program)} cards={programCodes.slice(0,s.descriptor.level===5?6:4).map((card,code)=>({code,name:labels[card],icon:<Copy maxFontSizeMultiplier={1.3}>{['↑','→','↓','←','↻ ×2','↻ ×3'][code]}</Copy>,speech:`crab-commands-card-${card.startsWith('repeat')?'repeat':card}`}))} disabled={!active||running||s.won} hear={key=>play(key,true)} condition="edge or rock above" currentPath={cursor>0?draft?.frames[cursor-1]?.path:undefined} onChange={async program=>!!commit&&!!sessionKey&&!!(await commit(['e',programOperations(draft?.program??beepProgram(s.program),program)],sessionKey))}/>:undefined} p={s.descriptor.puzzle} level={s.descriptor.level} program={s.program} cursor={cursor} running={running} won={s.won&&!running} runs={s.runs} edits={s.edits} hintStage={s.hintStage} plans={s.descriptor.winners} active={active} width={width} send={a=>{if(active&&!running){play(cardSpeech(a)??'tap',true);dispatch(a);}}} undo={!!s.history.length} header={<>{header}{s.descriptor.blockEditor&&<Button quiet compact maxFontSizeMultiplier={1.5} disabled={!active||running||s.won} onPress={()=>setBlocks(!blocks)}>{blocks?'Arrow editor':'Block editor'}</Button>}</>} footer={footer} pinned pictures={!comfort.youngChild} starter={s.descriptor.starter} hear={preferences.sound!==false?play:undefined}/>;
}
