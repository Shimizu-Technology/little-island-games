import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ArrowArt, Beach, cardLabel } from './view';
import { commands, trail } from './engine';
import { cardCodes, execute, type Action, type State } from './challenge-engine';
import type { ChallengeViewProps } from '../../../challenge/types';
import { Button, C, Copy, PressableScale } from '../../../components/ui';
import { learnSources } from '../../../content/learnAudio';
import { AudioPreferences, useSoundControls } from '../../../components/Audio';
import { useCrabHint } from './useCrabHint';
import { hintText } from './hint-text';
import { lessonAudio } from './lesson-audio';
import { useReducedMotion } from '../../../components/motion';
import { commandActionLabel, EDIT_TEXT_MAX, HINTED, hintedCard, PlanEditChoices, planCardLabel, type EditMode } from './plan-edit';

export function ChallengeBoard({state:s,dispatch,active,width,onSettled,header,footer}:ChallengeViewProps<State,Action>) {
  const prefs=useContext(AudioPreferences), {play,stop}=useSoundControls(prefs.sound??true), reduced=useReducedMotion();
  const [selected,setSelected]=useState<number|null>(null), [mode,setMode]=useState<EditMode>('replace');
  const [playback,setPlayback]=useState({run:s.runs,cursor:s.cursor,playing:false});
  const [alreadyHome]=useState(s.won);
  const observed=useRef(s.runs);
  useEffect(()=>{if(alreadyHome)onSettled?.();},[alreadyHome,onSettled]);
  const running=playback.run!==s.runs||playback.playing;
  const cursor=s.cursor===0?0:playback.run===s.runs?playback.cursor:0;
  const d=s.descriptor, rulesAudio=d.budget!==null?'c1-crab-mud-rules':d.starter.length?'c1-crab-debug-rules':'c1-crab-rules', result=execute(d,s.program.slice(0,cursor));
  const planned=useMemo(()=>trail(d.level,s.program),[d.level,s.program]);
  const hintVisible=s.hintProgram===JSON.stringify(s.program)&&s.hintStage>0;
  const hint=useCrabHint(d,s.program,hintVisible&&active);
  useEffect(()=>{if(!active)stop();return stop;},[active,stop]);
  useEffect(()=>{
    if(observed.current===s.runs)return;
    observed.current=s.runs;setPlayback({run:s.runs,cursor:0,playing:true});
  },[s.runs]);
  useEffect(()=>{
    if(!active||!playback.playing||playback.run!==s.runs)return;
    const timer=setTimeout(()=>{
      if(playback.cursor<s.cursor)setPlayback(p=>({...p,cursor:p.cursor+1}));
      else {setPlayback(p=>({...p,playing:false}));onSettled?.();}
    },reduced?140:480);
    return ()=>clearTimeout(timer);
  },[active,playback,s.runs,s.cursor,reduced,onSettled]);
  useEffect(()=>{if(active&&cursor>0&&s.runs>0)play(result.walker.bump?'wrong':result.won?'win':'tap',true);},[active,cursor,s.runs,result.walker.bump,result.won,play]);
  const send=(a:Action)=>{if(!active)return;play('tap',true);dispatch(a);};
  const disabled=!active||running||s.won;
  const over=d.budget!==null&&result.cost>d.budget;
  const goal='Collect every shell, then reach home.';
  const message=running?'Watch your plan.':result.walker.bump?'Bump. Your plan is kept. Change a card and try again.':over?'That route costs too many walking steps. Try a drier path.':s.cursor>0?'Not home yet. Your plan is kept: add or change a card.':d.starter.length?'Find the bug. Tap any card to change it.':goal;
  const stepText=hint?hintText(hint,s.program.length,cardLabel):'';
  const hinted=hint&&s.hintStage<3?hintedCard(hint.edit,s.program.length):null;
  const lessonKey=lessonAudio(d.lesson);
  const feedbackAudio=over?'c1-crab-budget':'c1-crab-retry';
  return <View style={{gap:8,flex:1,minHeight:0}}>
    <View style={{flexDirection:'row',gap:10,alignItems:'center'}}>
    <Beach level={d.level} walker={result.walker} size={Math.max(140,Math.min(width*0.5,200))} facingHint={d.level.pace!=='easy'} plan={!s.supportOff&&!running&&!s.won?planned:undefined} showBump={!s.supportOff&&!running&&!s.won}/>
    <View style={{flex:1,gap:6}}>
    {d.budget!==null&&<Copy maxFontSizeMultiplier={1.4} style={{fontWeight:'700',fontSize:14}}>{s.cursor===0?'Plan cost':'Walking steps'}: {s.cursor===0?execute(d,s.program).cost:result.cost} of {d.budget} · Mud 2 / sand 1 / turn 0</Copy>}
    <Copy maxFontSizeMultiplier={1.4} accessibilityLiveRegion="polite" style={{fontSize:14}}>{result.won?'Home! Every shell collected.':message}</Copy>
    </View></View>
    <Copy maxFontSizeMultiplier={1.3} style={{fontSize:14}}>Plan · {s.program.length} {s.program.length===1?'card':'cards'} · {s.runs} {s.runs===1?'run':'runs'}{s.supportOff?' · Footprints off':''}</Copy>
    {/* The empty prompt wraps at any text size; inside the horizontal strip it ran off the edge. */}
    {!s.won&&!s.program.length&&<View style={{padding:12,borderRadius:12,backgroundColor:C.paper}}><Copy maxFontSizeMultiplier={1.5}>Tap a command below to add it.</Copy></View>}
    {!s.won&&s.program.length>0&&<ScrollView horizontal style={{flexGrow:0,maxHeight:94}} contentContainerStyle={{flexDirection:'row',gap:6,padding:6,borderRadius:12,backgroundColor:C.paper,minHeight:80}} accessibilityLabel="Your program editor">
      {s.program.map((c,i)=><PressableScale key={i} disabled={disabled} accessibilityRole="button" accessibilityState={{selected:selected===i}} accessibilityLabel={planCardLabel(i,cardLabel[c],hinted===i?HINTED:'')} onPress={()=>{setSelected(selected===i?null:i);setMode('replace');}} style={{minWidth:48,minHeight:60,padding:4,alignItems:'center',justifyContent:'center',borderWidth:2,borderStyle:hinted===i&&selected!==i?'dashed':'solid',borderColor:selected===i||hinted===i?C.teal:running&&cursor===i?'#B0563A':C.line,borderRadius:10,backgroundColor:selected===i?C.soft:C.cream}}>
        <Copy maxFontSizeMultiplier={1.3} style={{fontSize:12}}>{i+1}</Copy><ArrowArt command={c}/>
      </PressableScale>)}
    </ScrollView>}
    {!s.won&&<ScrollView style={{flex:1,minHeight:0}} contentContainerStyle={{gap:10,paddingBottom:8}} accessibilityLabel="Plan and commands">
    {header}
    {d.budget!==null&&<Copy>{s.cursor===0?'Plan cost':'Walking steps'}: {s.cursor===0?execute(d,s.program).cost:result.cost} of {d.budget}. Mud costs 2, sand 1, turns 0.</Copy>}
    {/* The goal already shows beside the beach; a lesson that only repeats it is left out. */}
    {d.lesson!==goal&&<Copy>{d.lesson}</Copy>}
    {lessonKey&&learnSources[lessonKey]&&<Button compact quiet disabled={!active} onPress={()=>play(lessonKey)}>Hear this puzzle</Button>}
    {learnSources[rulesAudio]&&<Button compact quiet disabled={!active} onPress={()=>play(rulesAudio)}>Hear rules</Button>}
    {s.runs>0&&learnSources[feedbackAudio]&&<Button compact quiet disabled={!active} onPress={()=>play(feedbackAudio)}>Hear feedback</Button>}
    {s.supportOff&&learnSources['c1-crab-footprints']&&<Button compact quiet disabled={!active} onPress={()=>play('c1-crab-footprints')}>Hear about footprints</Button>}
    {selected!==null&&selected<s.program.length&&<PlanEditChoices at={selected} label={cardLabel[s.program[selected]]} mode={mode} setMode={setMode} disabled={disabled} onRemove={()=>{send(['x',selected]);setSelected(null);}} onAddAtEnd={()=>setSelected(null)}/>}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
      {commands(d.level.pace).map(c=><PressableScale key={c} accessibilityRole="button" accessibilityLabel={commandActionLabel(selected,mode,cardLabel[c])} disabled={disabled||s.program.length>=80&&(selected===null||mode==='insert')} onPress={()=>{if(selected===null||mode==='insert'||s.program[selected]!==c)send(selected===null?['a',cardCodes.indexOf(c)]:[mode==='replace'?'r':'i',selected,cardCodes.indexOf(c)]);setSelected(null);}} style={{minWidth:64,minHeight:72,flexGrow:1,padding:8,gap:4,alignItems:'center',justifyContent:'center',backgroundColor:C.paper,borderRadius:12,borderWidth:2,borderColor:C.line,opacity:disabled?0.5:1}}>
        <ArrowArt command={c}/><Copy maxFontSizeMultiplier={EDIT_TEXT_MAX} style={{fontSize:14,fontWeight:'700'}}>{cardLabel[c]}</Copy>
      </PressableScale>)}
    </View>
    {d.level.pace==='hard'&&<Copy>Again ×2 does the card before it two more times.</Copy>}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
      <Button disabled={disabled||!s.program.length} onPress={()=>{setSelected(null);send(['g']);}}>Go!</Button>
      <Button quiet disabled={disabled||!s.history.length} onPress={()=>{setSelected(null);send(['u']);}}>Undo edit</Button>
      <Button quiet disabled={disabled||JSON.stringify(s.program)===JSON.stringify(d.starter)} onPress={()=>{setSelected(null);send(['z']);}}>Reset plan</Button>
    </View>
    {hintVisible&&!hint&&<Copy>Finding one step…</Copy>}
    {hint&&<View style={{gap:8,padding:12,backgroundColor:C.soft,borderRadius:12}} accessibilityLiveRegion="polite">
      <Copy style={{color:C.ink}}>{s.hintStage<3?stepText:`One working plan: ${hint.plan.map(c=>cardLabel[c]).join(', ')}.`}</Copy>
      {hint.edit&&learnSources[`c1-crab-hint-${hint.edit.op}`]&&<Button compact quiet disabled={disabled} onPress={()=>play(`c1-crab-hint-${hint.edit!.op}`)}>Hear the edit</Button>}
      {s.hintStage===2&&<Copy>You can try this step, or ask for the whole plan. Helped finishes count too.</Copy>}
      {learnSources[s.hintStage===1?'c1-crab-first-hint':'c1-crab-more-help']&&<Button compact quiet disabled={disabled} onPress={()=>play(s.hintStage===1?'c1-crab-first-hint':'c1-crab-more-help')}>Hear help</Button>}
      {s.hintStage<3&&<Button quiet disabled={disabled} onPress={()=>send(['h'])}>{s.hintStage===1?'More help':'Show the whole plan'}</Button>}

    </View>}
    {!hintVisible&&<Button quiet disabled={disabled} onPress={()=>send(['h'])}>Help</Button>}
    {learnSources['c1-crab-marks']&&<Button compact quiet disabled={disabled} onPress={()=>play('c1-crab-marks')}>Hear about marks</Button>}
    {footer}
    </ScrollView>}
  </View>;
}
