import React,{useEffect,useMemo,useState} from 'react';
import {View} from 'react-native';
import {router} from 'expo-router';
import {Button,Copy} from '../../../components/ui';
import {useReducedMotion} from '../../../components/motion';
import type {BoardProps} from '../../types';
import {advance,bank,initialProgram,solves,tick,type Arrow,type BotState} from './engine';
import {initialProgram as legacyStarter} from './legacy';
import {editProgram,type Action} from './challenge-engine';
import {winners} from './solver';
import {DarePicture,Plan} from './Plan';
export {Art} from './art';
export function Board({session,update,practice,assistance,cheer,sound,soundOn,width,active,coach}:BoardProps<BotState>){
 const s=session.state,p=s.puzzles[Math.min(s.done,3)],reduced=useReducedMotion();
 const [history,setHistory]=useState<Arrow[][]>([]),[edits,setEdits]=useState(0),[hintStage,setHintStage]=useState(0);
 const won=s.done<4&&!s.running&&s.cursor>0&&(s.version===1?solves(p,s.program.slice(0,s.cursor)):s.cursor===s.program.length&&solves(p,s.program));
 const plans=useMemo(()=>s.version===2?bank[s.level-1][p.seed%bank[s.level-1].length].proof.winners:winners(p,s.level),[p,s.level,s.version]);
 useEffect(()=>{if(!active||!s.running)return;const timer=setTimeout(()=>{const n=tick(s);update(n);if(!n.running){const right=solves(p,n.program.slice(0,n.cursor));practice(s.level===5?'think.loops':s.level===4?'think.debug':'think.sequence',right);if(right)cheer(s.done===3?'big':'right','beep-bot-shell');else sound('beep-bot-bump',true);}},reduced?140:420);return()=>clearTimeout(timer);},[s,p,active,reduced,update,practice,cheer,sound]);
 const send=(a:Action)=>{
  if(!active||s.running||won||s.done===4)return;
  if(a[0]==='h'){assistance?.();setHintStage(h=>Math.min(3,h+1));update({...s,helped:true});return;}
  if(a[0]==='g'){coach.done();update({...s,cursor:0,running:true,attempts:Math.min(10000,s.attempts+1)});return;}
  const starter=s.version===1?legacyStarter(p,s.level):initialProgram(p,s.level),program=a[0]==='u'?history.at(-1)??null:editProgram(s.program,a,starter);
  if(!program)return;
  setHistory(a[0]==='u'?history.slice(0,-1):[...history.slice(-15),[...s.program]]);setEdits(n=>n+1);setHintStage(0);update({...s,program,cursor:0});sound('tap',true);
 };
 return <View style={{gap:10,alignSelf:'stretch'}}><Copy style={{fontSize:18,fontWeight:'700'}}>{s.done===4?'Every shell found!':`Shell ${s.done+1} of 4`}</Copy><Plan key={`${session.id}:${s.done}`} p={p} level={s.level} program={s.program} cursor={s.cursor} running={s.running} won={won||s.done===4} runs={s.attempts} edits={edits} hintStage={hintStage} plans={plans} active={active} width={width} send={send} hear={soundOn?sound:undefined} undo={!!history.length} next={won?<Button onPress={()=>{update(advance(s));setHistory([]);setEdits(0);setHintStage(0);}}>{s.done===3?'Finish!':'Next shell'}</Button>:undefined}/>
 {s.level>=3&&s.done<4&&!s.running&&<View style={{flexDirection:'row',gap:8,alignItems:'center'}}><DarePicture level={s.level}/><View style={{flex:1}}><Button quiet onPress={()=>router.push({pathname:'/challenge',params:{game:'beep-bot'}})}>Picture dares</Button><Copy style={{fontSize:14}}>Your School plan stays here.</Copy></View></View>}
 {s.level===5&&<Button quiet onPress={()=>router.push({pathname:'/learn',params:{game:'crab-commands'}})}>Keep going with Crab Commands</Button>}
 </View>;
}
