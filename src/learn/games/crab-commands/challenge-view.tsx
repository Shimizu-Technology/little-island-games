import { blockHint } from '../../program/hints';
import { programOperations } from '../../program/operations';
import { ProgramEditor } from '../../program/ProgramEditor';
import { crabProgram, programCodes, readCrabDraft } from './program';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ArrowArt, Beach, cardLabel } from './view';
import { commands, trail } from './engine';
import { cardCodes, execute, fogLevels, runPlan, type Action, type State } from './challenge-engine';
import { blockSolutions } from './challenge-content';
import { describeProgram, describeStep, nearestBlocks } from './block-hint';
import { decodeProgram } from '../../program/codec';
import type { ChallengeViewProps } from '../../../challenge/types';
import { Button, C, Copy, PressableScale } from '../../../components/ui';
import { learnSources } from '../../../content/learnAudio';
import { AudioPreferences, useSoundControls } from '../../../components/Audio';
import { useCrabHint } from './useCrabHint';
import { hintText } from './hint-text';
import { lessonAudio } from './lesson-audio';
import { useReducedMotion } from '../../../components/motion';
import { commandActionLabel, EDIT_TEXT_MAX, HINTED, hintedCard, PlanEditChoices, planCardLabel, type EditMode } from './plan-edit';

export function ChallengeBoard({state:s,dispatch,active,width,onSettled,header,footer,commit,sessionKey}:ChallengeViewProps<State,Action>) {
  const prefs=useContext(AudioPreferences), {play,stop}=useSoundControls(prefs.sound??true), reduced=useReducedMotion();
  const [blockMode,setBlocks]=useState(!!s.blockDraft);
  // A tray puzzle is built only from blocks: no flat plan fits it.
  const blocks=s.descriptor.blockEditor===true&&(blockMode||s.descriptor.tray!==undefined);
  const draft=s.blockDraft?readCrabDraft(s.blockDraft,s.descriptor.level):null;
  const [selected,setSelected]=useState<number|null>(null), [mode,setMode]=useState<EditMode>('replace');
  const [playback,setPlayback]=useState({run:s.runs,cursor:s.cursor,playing:false});
  const [alreadyHome]=useState(s.won);
  const observed=useRef(s.runs);
  useEffect(()=>{if(alreadyHome)onSettled?.();},[alreadyHome,onSettled]);
  const running=playback.run!==s.runs||playback.playing;
  const cursor=s.cursor===0?0:playback.run===s.runs?playback.cursor:0;
  const d=s.descriptor, rulesAudio=d.budget!==null?'c1-crab-mud-rules':d.starter.length?'c1-crab-debug-rules':d.level.tide!==undefined?'c1d-crab-tide-rules':d.level.rows.join('').includes('G')?'c1d-crab-key-rules':d.crabs===2?'c1d-crab-two-rules':d.fog?'c1d-crab-fog-rules':d.tools?.songs?'c1d-crab-song-rules':'c1-crab-rules', result=execute(d,s.program.slice(0,cursor));
  // Each foggy beach replays its own plan (its condition can choose differently); playback shows each up to the same card.
  const foggy=useMemo(()=>d.fog?runPlan(d,s).beaches.map((b,i)=>{const level=fogLevels(d)[i];return {level,walker:b.frames[Math.min(cursor,b.frames.length-1)]};}):[],[d,s,cursor]);
  const planned=useMemo(()=>trail(d.level,s.program),[d.level,s.program]);
  // Footprints follow one crab on one beach; two crabs or two foggy beaches show the crabs themselves.
  const footprints=!d.fog&&d.crabs!==2;
  const hintVisible=s.hintProgram===JSON.stringify(s.program)&&s.hintStage>0;
  const hint=useCrabHint(d,s.program,hintVisible&&active&&d.tray===undefined);
  const blockHelp=useMemo(()=>{
    if(d.tray===undefined||!hintVisible)return null;
    const current=(s.blockDraft&&decodeProgram(s.blockDraft))||crabProgram(s.program), near=nearestBlocks(current,blockSolutions(d)), name=(code:number)=>cardLabel[programCodes[code]];
    if(!near)return null;
    return {step:near.first?describeStep(near.first,current,name):'Your blocks reach home. Press Go to try them.',whole:`One working plan: ${describeProgram(near.target,name)}.`};
  },[d,hintVisible,s.blockDraft,s.program]);
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
  const tideText=d.level.tide!==undefined?`Low sand floods after ${d.level.tide} steps · walked ${result.walker.walked??0}`:null;
  const message=running?'Watch your plan.':d.fog&&s.cursor>0&&!runPlan(d,s).won&&!result.walker.bump?'The plan does not bring the crab home on every beach yet. Your plan is kept.':result.walker.bump?'Bump. Your plan is kept. Change a card and try again.':over?'That route costs too many walking steps. Try a drier path.':s.cursor>0?'Not home yet. Your plan is kept: add or change a card.':d.starter.length?'Find the bug. Tap any card to change it.':goal;
  const stepText=blockHelp?blockHelp.step:hint?(blocks?blockHint(hint.edit,draft?.frames??[],hint.edit?.card?cardLabel[hint.edit.card]:'a card'):hintText(hint,s.program.length,cardLabel)):'';
  const hinted=hint&&!blockHelp&&s.hintStage<3?hintedCard(hint.edit,s.program.length):null;
  const lessonKey=lessonAudio(d.lesson);
  const feedbackAudio=over?'c1-crab-budget':'c1-crab-retry';
  // On block puzzles the help sits under the beach with Go!, and the next-help choice sits beside Go!. The help text scrolls in
  // a bounded box, so at the largest text sizes the pinned screen still leaves the palette room.
  const cap=blocks?1.5:undefined;
  const nextHelp=s.hintStage<3&&(hint||blockHelp)&&<Button quiet compact={blocks} maxFontSizeMultiplier={cap} disabled={disabled} onPress={()=>send(['h'])}>{s.hintStage===1?'More help':'Show the whole plan'}</Button>;
  const helpBody=<>
      <Copy maxFontSizeMultiplier={cap} style={{color:C.ink}}>{s.hintStage<3?stepText:blockHelp?blockHelp.whole:`One working plan: ${(hint?.plan??[]).map(c=>cardLabel[c]).join(', ')}.`}</Copy>
      {hint?.edit&&learnSources[`c1-crab-hint-${hint.edit.op}`]&&<Button compact quiet maxFontSizeMultiplier={cap} disabled={disabled} onPress={()=>play(`c1-crab-hint-${hint!.edit!.op}`)}>Hear the edit</Button>}
      {s.hintStage===2&&<Copy maxFontSizeMultiplier={cap}>You can try this step, or ask for the whole plan. Helped finishes count too.</Copy>}
      {learnSources[s.hintStage===1?'c1-crab-first-hint':'c1-crab-more-help']&&<Button compact quiet maxFontSizeMultiplier={cap} disabled={disabled} onPress={()=>play(s.hintStage===1?'c1-crab-first-hint':'c1-crab-more-help')}>Hear help</Button>}
  </>;
  const helpPanel=<>{hintVisible&&!hint&&!blockHelp&&<Copy maxFontSizeMultiplier={cap}>Finding one step…</Copy>}{(hint||blockHelp)&&(blocks?
    <ScrollView testID="crab-challenge-help" nestedScrollEnabled style={{flexGrow:0,maxHeight:116,backgroundColor:C.soft,borderRadius:12}} contentContainerStyle={{gap:4,padding:8}} accessibilityLiveRegion="polite">{helpBody}</ScrollView>:
    <View style={{gap:8,padding:12,backgroundColor:C.soft,borderRadius:12}} accessibilityLiveRegion="polite">{helpBody}{nextHelp}</View>)}</>;
  return <View style={{gap:8,flex:1,minHeight:0}}>
    <View style={{flexDirection:d.fog?'column':'row',gap:10,alignItems:d.fog?'stretch':'center'}}>
    {d.fog?<View style={{flexDirection:'row',gap:8,justifyContent:'center'}}>{foggy.map((b,i)=><Beach key={i} label={`Foggy beach ${i+1} of ${foggy.length}`} level={b.level} walker={b.walker} size={Math.max(100,Math.min((width-8)/2,170))} facingHint showBump={false}/>)}</View>:
    <Beach level={d.level} walker={result.walker} others={result.walkers.slice(1)} size={Math.max(140,Math.min(width*0.5,200))} facingHint={d.level.pace!=='easy'} plan={footprints&&!s.supportOff&&!running&&!s.won?planned:undefined} showBump={footprints&&!s.supportOff&&!running&&!s.won}/>}
    <View style={d.fog?{gap:6}:{flex:1,gap:6}}>
    {d.budget!==null&&<Copy maxFontSizeMultiplier={1.4} style={{fontWeight:'700',fontSize:14}}>{s.cursor===0?'Plan cost':'Walking steps'}: {s.cursor===0?execute(d,s.program).cost:result.cost} of {d.budget} · Mud 2 / sand 1 / turn 0</Copy>}
    {tideText&&<Copy maxFontSizeMultiplier={1.4} style={{fontWeight:'700',fontSize:14}}>{tideText}</Copy>}
    <Copy maxFontSizeMultiplier={1.4} accessibilityLiveRegion="polite" style={{fontSize:14}}>{(d.fog?s.won:result.won)?d.crabs===2?'Both crabs are home!':'Home! Every shell collected.':message}</Copy>
    </View></View>
    {/* With the block editor open, Go! and Help sit full width under the beach: below the editor they fall out of reach, and
        beside the beach the help text would break words at the largest sizes. */}
    {blocks&&!s.won&&<View testID="crab-challenge-block-run" style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
      <Button compact maxFontSizeMultiplier={1.5} disabled={disabled||!s.program.length} onPress={()=>send(['g'])}>Go!</Button>
      {!hintVisible&&<Button compact quiet maxFontSizeMultiplier={1.5} disabled={disabled} onPress={()=>send(['h'])}>Help</Button>}
      {nextHelp}
    </View>}
    {blocks&&!s.won&&helpPanel}
    {/* With blocks the screen is pinned to the phone's height: the editor shows the tray and its own guidance, so these lines give way. */}
    {!blocks&&<Copy maxFontSizeMultiplier={1.3} style={{fontSize:14}}>Plan · {s.program.length} {s.program.length===1?'card':'cards'} · {s.runs} {s.runs===1?'run':'runs'}{s.supportOff?' · Footprints off':''}</Copy>}
    {/* The empty prompt wraps at any text size; inside the horizontal strip it ran off the edge. */}
    {!blocks&&!s.won&&!s.program.length&&<View style={{padding:12,borderRadius:12,backgroundColor:C.paper}}><Copy maxFontSizeMultiplier={1.5}>Tap a command below to add it.</Copy></View>}
    {!blocks&&!s.won&&s.program.length>0&&<ScrollView horizontal style={{flexGrow:0,maxHeight:94}} contentContainerStyle={{flexDirection:'row',gap:6,padding:6,borderRadius:12,backgroundColor:C.paper,minHeight:80}} accessibilityLabel="Your program editor">
      {s.program.map((c,i)=><PressableScale key={i} disabled={disabled} accessibilityRole="button" accessibilityState={{selected:selected===i}} accessibilityLabel={planCardLabel(i,cardLabel[c],hinted===i?HINTED:'')} onPress={()=>{setSelected(selected===i?null:i);setMode('replace');}} style={{minWidth:48,minHeight:60,padding:4,alignItems:'center',justifyContent:'center',borderWidth:2,borderStyle:hinted===i&&selected!==i?'dashed':'solid',borderColor:selected===i||hinted===i?C.teal:running&&cursor===i?'#B0563A':C.line,borderRadius:10,backgroundColor:selected===i?C.soft:C.cream}}>
        <Copy maxFontSizeMultiplier={1.3} style={{fontSize:12}}>{i+1}</Copy><ArrowArt command={c}/>
      </PressableScale>)}
    </ScrollView>}
    {blocks&&<ProgramEditor tray={d.tray} songs={d.tray===undefined||!!d.tools?.songs} repeat={d.tools?.repeat!==false} program={draft?.program??crabProgram(s.program)} cards={commands(d.level.pace).map(command=>({code:programCodes.indexOf(command),name:cardLabel[command],icon:<ArrowArt command={command} size={24}/>,speech:`crab-commands-card-${command}`}))} disabled={disabled} hear={key=>play(key,true)} condition={d.tray===undefined||d.tools?.condition?'edge or rock ahead':undefined} currentPath={cursor>0?draft?.frames[cursor-1]?.path:undefined} iteration={cursor>0?draft?.frames[cursor-1]?.iteration:undefined} onChange={async program=>!!commit&&!!sessionKey&&!!(await commit(['e',programOperations(draft?.program??crabProgram(s.program),program)],sessionKey))}/>}
    {!s.won&&<ScrollView style={{flex:1,minHeight:0}} contentContainerStyle={{gap:10,paddingBottom:8}} accessibilityLabel="Plan and commands">
    {header}
    {d.blockEditor&&d.tray===undefined&&<Button compact quiet maxFontSizeMultiplier={1.5} disabled={disabled} onPress={()=>setBlocks(!blocks)}>{blocks?'Arrow editor':'Block editor'}</Button>}

    {d.budget!==null&&<Copy>{s.cursor===0?'Plan cost':'Walking steps'}: {s.cursor===0?execute(d,s.program).cost:result.cost} of {d.budget}. Mud costs 2, sand 1, turns 0.</Copy>}
    {/* The goal already shows beside the beach; a lesson that only repeats it is left out. */}
    {d.lesson!==goal&&<Copy>{d.lesson}</Copy>}
    {lessonKey&&learnSources[lessonKey]&&<Button compact quiet disabled={!active} onPress={()=>play(lessonKey)}>Hear this puzzle</Button>}
    {learnSources[rulesAudio]&&<Button compact quiet disabled={!active} onPress={()=>play(rulesAudio)}>Hear rules</Button>}
    {s.runs>0&&learnSources[feedbackAudio]&&<Button compact quiet disabled={!active} onPress={()=>play(feedbackAudio)}>Hear feedback</Button>}
    {s.supportOff&&learnSources['c1-crab-footprints']&&<Button compact quiet disabled={!active} onPress={()=>play('c1-crab-footprints')}>Hear about footprints</Button>}
    {!blocks&&selected!==null&&selected<s.program.length&&<PlanEditChoices at={selected} label={cardLabel[s.program[selected]]} mode={mode} setMode={setMode} disabled={disabled} onRemove={()=>{send(['x',selected]);setSelected(null);}} onAddAtEnd={()=>setSelected(null)}/>}
    {!blocks&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
      {commands(d.level.pace).map(c=><PressableScale key={c} accessibilityRole="button" accessibilityLabel={commandActionLabel(selected,mode,cardLabel[c])} disabled={disabled||s.program.length>=80&&(selected===null||mode==='insert')} onPress={()=>{if(selected===null||mode==='insert'||s.program[selected]!==c)send(selected===null?['a',cardCodes.indexOf(c)]:[mode==='replace'?'r':'i',selected,cardCodes.indexOf(c)]);setSelected(null);}} style={{minWidth:64,minHeight:72,flexGrow:1,padding:8,gap:4,alignItems:'center',justifyContent:'center',backgroundColor:C.paper,borderRadius:12,borderWidth:2,borderColor:C.line,opacity:disabled?0.5:1}}>
        <ArrowArt command={c}/><Copy maxFontSizeMultiplier={EDIT_TEXT_MAX} style={{fontSize:14,fontWeight:'700'}}>{cardLabel[c]}</Copy>
      </PressableScale>)}
    </View>}
    {d.level.pace==='hard'&&<Copy>Again ×2 does the card before it two more times.</Copy>}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
      {!blocks&&<Button disabled={disabled||!s.program.length} onPress={()=>{setSelected(null);send(['g']);}}>Go!</Button>}
      <Button quiet disabled={disabled||!s.history.length} onPress={()=>{setSelected(null);send(['u']);}}>Undo edit</Button>
      <Button quiet disabled={disabled||JSON.stringify(s.program)===JSON.stringify(d.starter)} onPress={()=>{setSelected(null);send(['z']);}}>Reset plan</Button>
    </View>
    {!blocks&&helpPanel}
    {!hintVisible&&!blocks&&<Button quiet disabled={disabled} onPress={()=>send(['h'])}>Help</Button>}
    {learnSources['c1-crab-marks']&&<Button compact quiet disabled={disabled} onPress={()=>play('c1-crab-marks')}>Hear about marks</Button>}
    {footer}
    </ScrollView>}
  </View>;
}
