import React,{useContext,useEffect,useRef,useState} from 'react';
import {AudioPreferences,useSoundControls} from '../../../components/Audio';
import {useReducedMotion} from '../../../components/motion';
import type {ChallengeViewProps} from '../../../challenge/types';
import {execution} from './movement';
import type {Action,State} from './challenge-engine';
import {Plan} from './Plan';
export function ChallengeBoard({state:s,dispatch,active,width,onSettled,header,footer}:ChallengeViewProps<State,Action>){
 const preferences=useContext(AudioPreferences),{play,stop}=useSoundControls(preferences.sound??true),reduced=useReducedMotion();
 const programKey=JSON.stringify(s.program);
 const [playback,setPlayback]=useState({run:s.runs,key:programKey,cursor:0,playing:false}),observed=useRef(s.runs),[alreadyWon]=useState(s.won);
 useEffect(()=>{if(alreadyWon)onSettled?.();},[alreadyWon,onSettled]);
 useEffect(()=>{if(observed.current!==s.runs){observed.current=s.runs;setPlayback({run:s.runs,key:programKey,cursor:0,playing:true});}},[s.runs,programKey]);
 const result=execution(s.descriptor.puzzle,s.program),limit=result.failedCard===null?s.program.length:result.failedCard+1;
 useEffect(()=>{if(!active||!playback.playing)return;const timer=setTimeout(()=>{if(playback.cursor<limit){setPlayback(p=>({...p,cursor:p.cursor+1}));play('tap',true);}else{setPlayback(p=>({...p,playing:false}));play(s.won?'win':'wrong',true);onSettled?.();}},reduced?140:420);return()=>clearTimeout(timer);},[active,playback,limit,s.won,reduced,onSettled,play]);
 useEffect(()=>{if(!active)stop();return stop;},[active,stop]);
 const running=playback.playing||playback.run!==s.runs,cursor=playback.run===s.runs&&playback.key===programKey?playback.cursor:0;
 return <Plan p={s.descriptor.puzzle} level={s.descriptor.level} program={s.program} cursor={cursor} running={running} won={s.won&&!running} runs={s.runs} edits={s.edits} hintStage={s.hintStage} plans={s.descriptor.winners} active={active} width={width} send={a=>{if(active&&!running){play('tap',true);dispatch(a);}}} undo={!!s.history.length} header={header} footer={footer} pinned pictures hear={preferences.sound!==false?play:undefined}/>;
}
