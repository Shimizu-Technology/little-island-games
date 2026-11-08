import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { ArrowArt, Beach, cardLabel } from './view';
import { commands, trail } from './engine';
import { cardCodes, execute, type Action, type State } from './challenge-engine';
import type { ChallengeViewProps } from '../../../challenge/types';
import { Button, C, Copy, PressableScale } from '../../../components/ui';
import { learnSources } from '../../../content/learnAudio';
import { AudioPreferences, useSoundControls } from '../../../components/Audio';
import { useCrabHint } from './useCrabHint';
import { useReducedMotion } from '../../../components/motion';

export function ChallengeBoard({state:s,dispatch,active,width}:ChallengeViewProps<State,Action>) {
  const prefs=useContext(AudioPreferences), {play,stop}=useSoundControls(prefs.sound??true), reduced=useReducedMotion();
  const [selected,setSelected]=useState<number|null>(null), [mode,setMode]=useState<'replace'|'insert'>('replace');
  const d=s.descriptor, rulesAudio=d.budget!==null?'c1-crab-mud-rules':d.starter.length?'c1-crab-debug-rules':'c1-crab-rules', result=execute(d,s.program.slice(0,s.cursor));
  const planned=useMemo(()=>trail(d.level,s.program),[d.level,s.program]);
  const hint=useCrabHint(d,s.program,s.hints>0&&active);
  useEffect(()=>{if(!active)stop();return stop;},[active,stop]);
  useEffect(()=>{
    if(!active||!s.running)return;
    const timer=setTimeout(()=>dispatch(['t']),reduced?140:480);
    return ()=>clearTimeout(timer);
  },[active,s.running,s.cursor,dispatch,reduced]);
  useEffect(()=>{if(active&&s.cursor>0)play(result.walker.bump?'wrong':result.won?'win':'tap',true);},[active,s.cursor,result.walker.bump,result.won,play]);
  const send=(a:Action)=>{if(!active)return;play('tap',true);dispatch(a);};
  const disabled=!active||s.running;
  const over=d.budget!==null&&result.cost>d.budget;
  const message=s.running?'Watch your plan.':result.walker.bump?'Bump. Your plan is kept. Change a card and try again.':over?'That route costs too many walking steps. Try a drier path.':s.cursor>0?'Not home yet. Your plan is kept: add or change a card.':d.starter.length?'Find the bug. Tap any card to change it.':'Collect every shell, then go home.';
  return <View style={{gap:10}}>
    <Copy>{d.lesson}</Copy>
    {learnSources[rulesAudio]&&<Button compact quiet disabled={!active} onPress={()=>play(rulesAudio)}>Hear rules</Button>}
    {d.budget!==null&&<Copy style={{fontWeight:'700'}}>Walking steps: {result.cost} of {d.budget} · Mud 2 / sand 1 / turn 0</Copy>}
    <Copy accessibilityLiveRegion="polite">{message}</Copy>
    <Beach level={d.level} walker={result.walker} size={Math.max(180,Math.min(width,280))} facingHint={d.level.pace!=='easy'} plan={!s.supportOff&&!s.running?planned:undefined} showBump={!s.supportOff&&!s.running}/>
    <Copy style={{fontSize:14}}>Plan · {s.program.length} {s.program.length===1?'card':'cards'} · {s.runs} {s.runs===1?'run':'runs'}{s.supportOff?' · Footprints off':''}</Copy>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,padding:6,borderRadius:12,backgroundColor:C.paper,minHeight:60}} accessibilityLabel="Your program editor">
      {!s.program.length&&<Copy>Tap a command below to add it.</Copy>}
      {s.program.map((c,i)=><PressableScale key={i} disabled={disabled} accessibilityRole="button" accessibilityState={{selected:selected===i}} accessibilityLabel={`Card ${i+1}: ${cardLabel[c]}. Select to change, insert before, or remove.`} onPress={()=>{setSelected(selected===i?null:i);setMode('replace');}} style={{minWidth:48,minHeight:60,padding:4,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:selected===i?C.teal:s.running&&s.cursor===i?'#B0563A':C.line,borderRadius:10,backgroundColor:selected===i?C.soft:C.cream}}>
        <Copy style={{fontSize:12}}>{i+1}</Copy><ArrowArt command={c}/>
      </PressableScale>)}
    </View>
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
      <Button quiet disabled={disabled} onPress={()=>{setSelected(null);send(['z']);}}>Reset plan</Button>
    </View>
    {s.hints>0&&!hint&&<Copy>Finding one step…</Copy>}
    {hint&&<View style={{gap:8,padding:12,backgroundColor:C.soft,borderRadius:12}} accessibilityLiveRegion="polite">
      <Copy>{s.hints===1?(hint.next?`${hint.keep<s.program.length?'Change':'Add'} card ${hint.keep+1}: ${cardLabel[hint.next]}. Keep the cards before it.`:'Your plan reaches home. Press Go to try it.'):s.hints===2?'You can ask for the whole plan, or try that one step first.':`One working plan: ${hint.plan.map(c=>cardLabel[c]).join(', ')}.`}</Copy>
      {s.hints<3&&<Button quiet disabled={disabled} onPress={()=>send(['h'])}>{s.hints===1?'More help':'Show the whole plan'}</Button>}
    </View>}
  </View>;
}
