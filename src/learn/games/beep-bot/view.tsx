import { ProgramEditor } from '../../program/ProgramEditor';
import { encodeProgram, sessionBytes } from '../../program/codec';
import { beepProgram, programCodes, readBeepDraft } from './program';
import React,{useEffect,useMemo,useState} from 'react';
import {View} from 'react-native';
import {router} from 'expo-router';
import {useBeepComfort} from './comfort';
import {Button,Copy} from '../../../components/ui';
import {useReducedMotion} from '../../../components/motion';
import type {BoardProps} from '../../types';
import {advance,bank,roundStarter,solves,tick,type Arrow,type BotState} from './engine';
import {editProgram,type Action} from './challenge-engine';
import {winners} from './solver';
import {cardSpeech} from './speech';
import {DarePicture,Plan,labels} from './Plan';
import {useStepReveal} from '../../stepReveal';
export {Art} from './art';
export function Board({session,update,practice,assistance,cheer,sound,soundOn,width,active,coach}:BoardProps<BotState>){
 const comfort=useBeepComfort();
 useStepReveal(session.state.done);
 const s=session.state,p=s.puzzles[Math.min(s.done,3)],reduced=useReducedMotion();
 const [blocks,setBlocks]=useState(!!s.blockDraft);
 const draft=s.blockDraft?readBeepDraft(s.blockDraft,p,s.level):null;
 const [history,setHistory]=useState<Arrow[][]>([]),[edits,setEdits]=useState(0),[hintStage,setHintStage]=useState(0);
 const won=s.done<4&&!s.running&&s.cursor>0&&(s.version===1?solves(p,s.program.slice(0,s.cursor)):s.cursor===s.program.length&&solves(p,s.program));
 const plans=useMemo(()=>s.version===2?bank[s.level-1][p.seed%bank[s.level-1].length].proof.winners:winners(p,s.level),[p,s.level,s.version]);
 useEffect(()=>{if(!active||!s.running)return;const timer=setTimeout(()=>{const n=tick(s);update(n);if(!n.running){const right=solves(p,n.program.slice(0,n.cursor));practice(s.level===5?'think.loops':s.level===4?'think.debug':'think.sequence',right);if(right)cheer(s.done===3?'big':'right','beep-bot-shell');else sound('beep-bot-bump',true);}},reduced?140:420);return()=>clearTimeout(timer);},[s,p,active,reduced,update,practice,cheer,sound]);
 const send=(a:Action)=>{
  if(!active||s.running||won||s.done===4)return;
  if(a[0]==='h'){assistance?.();setHintStage(h=>Math.min(3,h+1));update({...s,helped:true});return;}
  if(a[0]==='g'){coach.done();update({...s,cursor:0,running:true,attempts:Math.min(10000,s.attempts+1)});return;}
  const starter=roundStarter(s),program=a[0]==='u'?history.at(-1)??null:editProgram(s.program,a,starter);
  if(!program)return;
  setHistory(a[0]==='u'?history.slice(0,-1):[...history.slice(-15),[...s.program]]);setEdits(n=>n+1);setHintStage(0);const {blockDraft:_,...legacy}=s;update({...legacy,program,cursor:0});sound(cardSpeech(a)??'tap',true);
 };
 return <View style={{gap:10,alignSelf:'stretch'}}><Copy style={{fontSize:18,fontWeight:'700'}}>{s.done===4?'Every shell found!':`Shell ${s.done+1} of 4`}</Copy>{s.done<4&&<Button quiet compact maxFontSizeMultiplier={1.5} disabled={!active||s.running} onPress={()=>setBlocks(!blocks)}>{blocks?'Arrow editor':'Block editor'}</Button>}<Plan blockEditor={blocks&&s.done<4?<ProgramEditor key={`${session.id}:${s.done}`} program={draft?.program??beepProgram(s.program)} cards={programCodes.slice(0,s.level===5?6:4).map((card,code)=>({code,name:labels[card],icon:<Copy maxFontSizeMultiplier={1.3}>{['↑','→','↓','←','↻ ×2','↻ ×3'][code]}</Copy>,speech:`crab-commands-card-${card.startsWith('repeat')?'repeat':card}`}))} disabled={!active||s.running||won} hear={key=>sound(key,true)} condition="rock above" currentPath={s.cursor>0?draft?.frames[s.cursor-1]?.path:undefined} iteration={s.cursor>0?draft?.frames[s.cursor-1]?.iteration:undefined}
 onChange={program=>{const blockDraft=encodeProgram(program),result=readBeepDraft(blockDraft,p,s.level);if(!result)return false;const next={...s,blockDraft,program:result.plan,cursor:0,running:false};if(sessionBytes({...session,state:next})>4096)return false;update(next);setHintStage(0);return true;}}
 onStep={()=>{if(!s.program.length||s.cursor>=s.program.length)return;const next=tick({...s,running:true});update({...next,running:false});sound('tap',true);}} onRestart={()=>update({...s,cursor:0,running:false})}/>:undefined} key={`${session.id}:${s.done}`} p={p} level={s.level} program={s.program} cursor={s.cursor} running={s.running} won={won||s.done===4} runs={s.attempts} edits={edits} hintStage={hintStage} plans={plans} active={active} width={width} send={send} starter={roundStarter(s)} coachCard={active&&coach.active&&s.done===0&&!s.program.length?plans[0]?.[0]:undefined} coachGo={coach.active&&s.done===0&&!!s.program.length} hear={soundOn?sound:undefined} undo={!blocks&&!!history.length} next={won?<Button onPress={()=>{update(advance(s));setHistory([]);setEdits(0);setHintStage(0);}}>{s.done===3?'Finish!':'Next shell'}</Button>:undefined}/>
 {!comfort.youngChild&&s.level>=3&&s.done<4&&!s.running&&<View style={{flexDirection:'row',gap:8,alignItems:'center'}}><DarePicture level={s.level}/><View style={{flex:1}}><Button quiet onPress={()=>router.push({pathname:'/challenge',params:{game:'beep-bot'}})}>Picture dares</Button><Copy style={{fontSize:14}}>Your School plan stays here.</Copy></View></View>}
 </View>;
}
