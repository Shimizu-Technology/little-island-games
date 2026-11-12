import {router} from 'expo-router';
import {View} from 'react-native';
import React,{useContext,useEffect,useRef,useState} from 'react';
import {AudioPreferences,useSoundControls} from '../../../components/Audio';
import {Button,C,Copy} from '../../../components/ui';
import {useReducedMotion} from '../../../components/motion';
import type {ChallengeViewProps} from '../../../challenge/types';
import {execution} from './movement';
import type {Action,State} from './challenge-engine';
import {Plan} from './Plan';
import {FinishResult} from './finish';
export function ChallengeBoard({state:s,dispatch,active,width,onSettled,header,footer}:ChallengeViewProps<State,Action>){
 const preferences=useContext(AudioPreferences),{play,stop}=useSoundControls(preferences.sound??true),reduced=useReducedMotion();
 const programKey=JSON.stringify(s.program);
 const [playback,setPlayback]=useState({run:s.runs,key:programKey,cursor:s.won?s.program.length:0,playing:false}),observed=useRef(s.runs);
 const outcome=useContext(FinishResult),finishFact=outcome?.dares.length?'Your dare mark is kept.':outcome?.event==='helped'?'Your helped finish is kept.':'Your finish is kept.';
 useEffect(()=>{if(observed.current!==s.runs){observed.current=s.runs;setPlayback({run:s.runs,key:programKey,cursor:0,playing:true});}},[s.runs,programKey]);
 const result=execution(s.descriptor.puzzle,s.program),limit=result.failedCard===null?s.program.length:result.failedCard+1;
 useEffect(()=>{if(!active||!playback.playing)return;const timer=setTimeout(()=>{if(playback.cursor<limit){setPlayback(p=>({...p,cursor:p.cursor+1}));play('tap',true);}else{setPlayback(p=>({...p,playing:false}));play(s.won?'win':'wrong',true);if(!s.won)onSettled?.();}},reduced?140:420);return()=>clearTimeout(timer);},[active,playback,limit,s.won,reduced,onSettled,play]);
 useEffect(()=>{if(!active)stop();return stop;},[active,stop]);
 const running=playback.playing||playback.run!==s.runs,cursor=playback.run===s.runs&&playback.key===programKey?playback.cursor:0;
 return <Plan p={s.descriptor.puzzle} level={s.descriptor.level} program={s.program} cursor={cursor} running={running} won={s.won&&!running} runs={s.runs} edits={s.edits} hintStage={s.hintStage} plans={s.descriptor.winners} active={active} width={width} send={a=>{if(active&&!running){play('tap',true);dispatch(a);}}} undo={!!s.history.length} header={header} footer={s.won?undefined:footer} next={s.won&&!running?<View style={{gap:8}}><Copy maxFontSizeMultiplier={1.5} style={{fontSize:14,color:C.ink}}>{finishFact}</Copy><Button disabled={!active} onPress={()=>{play('tap',true);if(router.canGoBack())router.back();else router.replace('/');}}>Done</Button></View>:undefined} pinned pictures starter={s.descriptor.starter} hear={preferences.sound!==false?play:undefined}/>;
}
