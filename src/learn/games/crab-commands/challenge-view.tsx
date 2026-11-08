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
import { useReducedMotion } from '../../../components/motion';

export function ChallengeBoard({state:s,dispatch,active,width,onSettled,header,footer}:ChallengeViewProps<State,Action>) {
  const prefs=useContext(AudioPreferences), {play,stop}=useSoundControls(prefs.sound??true), reduced=useReducedMotion();
  const [selected,setSelected]=useState<number|null>(null), [mode,setMode]=useState<'replace'|'insert'>('replace');
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
  const message=running?'Watch your plan.':result.walker.bump?'Bump. Your plan is kept. Change a card and try again.':over?'That route costs too many walking steps. Try a drier path.':s.cursor>0?'Not home yet. Your plan is kept: add or change a card.':d.starter.length?'Find the bug. Tap any card to change it.':'Collect every shell, then go home.';
  const stepText=hint?hintText(hint,s.program.length):'';
  const feedbackAudio=over?'c1-crab-budget':'c1-crab-retry';
  return <View style={{gap:8,flex:1,minHeight:0}}>
    <View style={{flexDirection:'row',gap:10,alignItems:'center'}}>
    <Beach level={d.level} walker={result.walker} size={Math.max(140,Math.min(width*0.5,200))} facingHint={d.level.pace!=='easy'} plan={!s.supportOff&&!running&&!s.won?planned:undefined} showBump={!s.supportOff&&!running&&!s.won}/>
    <View style={{flex:1,gap:6}}>
    {d.budget!==null&&<Copy maxFontSizeMultiplier={1.4} style={{fontWeight:'700',fontSize:14}}>{s.runs===0?'Plan cost':'Walking steps'}: {s.runs===0?execute(d,s.program).cost:result.cost} of {d.budget} · Mud 2 / sand 1 / turn 0</Copy>}
    <Copy maxFontSizeMultiplier={1.4} accessibilityLiveRegion="polite" style={{fontSize:14}}>{result.won?'Home! Every shell collected.':message}</Copy>
    </View></View>
    <Copy maxFontSizeMultiplier={1.3} style={{fontSize:14}}>Plan · {s.program.length} {s.program.length===1?'card':'cards'} · {s.runs} {s.runs===1?'run':'runs'}{s.supportOff?' · Footprints off':''}</Copy>
    {!s.won&&<ScrollView horizontal style={{flexGrow:0,maxHeight:94}} contentContainerStyle={{flexDirection:'row',gap:6,padding:6,borderRadius:12,backgroundColor:C.paper,minHeight:80}} accessibilityLabel="Your program editor">
      {!s.program.length&&<Copy>Tap a command below to add it.</Copy>}
      {s.program.map((c,i)=><PressableScale key={i} disabled={disabled} accessibilityRole="button" accessibilityState={{selected:selected===i}} accessibilityLabel={`Card ${i+1}: ${cardLabel[c]}. Select to change, insert before, or remove.`} onPress={()=>{setSelected(selected===i?null:i);setMode('replace');}} style={{minWidth:48,minHeight:60,padding:4,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:selected===i?C.teal:running&&cursor===i?'#B0563A':C.line,borderRadius:10,backgroundColor:selected===i?C.soft:C.cream}}>
        <Copy maxFontSizeMultiplier={1.3} style={{fontSize:12}}>{i+1}</Copy><ArrowArt command={c}/>
      </PressableScale>)}
    </ScrollView>}
    {!s.won&&<ScrollView style={{flex:1,minHeight:0}} contentContainerStyle={{gap:10,paddingBottom:8}} accessibilityLabel="Plan and commands">
    {header}
    <Copy>{result.won?'Home! Every shell collected.':message}</Copy>
    {d.budget!==null&&<Copy>{s.runs===0?'Plan cost':'Walking steps'}: {s.runs===0?execute(d,s.program).cost:result.cost} of {d.budget}. Mud costs 2, sand 1, turns 0.</Copy>}
    <Copy>{d.lesson}</Copy>
    {learnSources[lessonAudio(d.level.id)]&&<Button compact quiet disabled={!active} onPress={()=>play(lessonAudio(d.level.id))}>Hear this puzzle</Button>}
    {learnSources[rulesAudio]&&<Button compact quiet disabled={!active} onPress={()=>play(rulesAudio)}>Hear rules</Button>}
    {s.runs>0&&learnSources[feedbackAudio]&&<Button compact quiet disabled={!active} onPress={()=>play(feedbackAudio)}>Hear feedback</Button>}
    {s.supportOff&&learnSources['c1-crab-footprints']&&<Button compact quiet disabled={!active} onPress={()=>play('c1-crab-footprints')}>Hear about footprints</Button>}
    {selected!==null&&selected<s.program.length&&<View style={{gap:8}}>
      <Copy>Card {selected+1}: {cardLabel[s.program[selected]]}. Choose a command to {mode==='replace'?'replace it':'insert before it'}.</Copy>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
        <Button compact quiet selected={mode==='replace'} disabled={disabled} onPress={()=>setMode('replace')}>Replace</Button>
        <Button compact quiet selected={mode==='insert'} disabled={disabled} onPress={()=>setMode('insert')}>Insert before</Button>
        <Button compact quiet disabled={disabled} onPress={()=>{send(['x',selected]);setSelected(null);}}>Remove card</Button>
        <Button compact quiet disabled={disabled} onPress={()=>setSelected(null)}>Add at end</Button>
      </View>
    </View>}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
      {commands(d.level.pace).map(c=><PressableScale key={c} accessibilityRole="button" accessibilityLabel={`${selected===null?'Add':mode==='replace'?'Replace with':'Insert'} ${cardLabel[c]}`} disabled={disabled||s.program.length>=80&&(selected===null||mode==='insert')} onPress={()=>{if(selected===null||mode==='insert'||s.program[selected]!==c)send(selected===null?['a',cardCodes.indexOf(c)]:[mode==='replace'?'r':'i',selected,cardCodes.indexOf(c)]);setSelected(null);}} style={{minWidth:64,minHeight:72,flexGrow:1,padding:8,gap:4,alignItems:'center',justifyContent:'center',backgroundColor:C.paper,borderRadius:12,borderWidth:2,borderColor:C.line,opacity:disabled?0.5:1}}>
        <ArrowArt command={c}/><Copy style={{fontSize:14,fontWeight:'700'}}>{cardLabel[c]}</Copy>
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
    <Button quiet disabled={disabled} onPress={()=>send(['h'])}>Help</Button>
    {learnSources['c1-crab-marks']&&<Button compact quiet disabled={disabled} onPress={()=>play('c1-crab-marks')}>Hear about marks</Button>}
    {footer}
    </ScrollView>}
  </View>;
}

export const lessonAudio=(id:string)=>id==='mud-1'?'c1-crab-mud-teach':id==='mud-2'?'c1-crab-mud-detour':id==='mud-5'?'c1-crab-mud-twist':`c1-crab-lesson-${id}`;
export function hintText(hint:import('./challenge-engine').Hint,length:number) {
 const edit=hint.edit;
 if(edit?.op==='remove')return `Remove card ${edit.at+1}. Keep the other cards.`;
 if(edit?.op==='insert')return `Insert before card ${edit.at+1}: ${cardLabel[edit.card!]}. Keep the other cards.`;
 if(edit?.op==='change')return `Change card ${edit.at+1}: ${cardLabel[edit.card!]}. Keep the other cards.`;
 return hint.next?`${hint.keep<length?'Change':'Add'} card ${hint.keep+1}: ${cardLabel[hint.next]}. Keep the cards before it.`:'Your plan reaches home. Press Go to try it.';
}
