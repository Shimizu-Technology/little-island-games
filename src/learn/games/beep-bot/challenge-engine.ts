import { applyOperations, validOperations, type Operation } from '../../program/operations';
import { encodeProgram } from '../../program/codec';
import { projectionEdits } from '../../program/edit';
import { decodeProgram, type PackedProgram } from '../../program/codec';
import { beepProgram, readBeepDraft } from './program';
import type { ReplayEngine, ReplayPayload } from '../../../challenge/types';
import { exactKeys, plain, uint } from '../../../state/saveBits';
import { sha256Hex } from '../../../puzzles/sha256';
import { solves, type Arrow, type Puzzle } from './movement';
export type Descriptor={ blockEditor?: boolean;level:3|4|5;puzzle:Puzzle;starter:Arrow[];winners:Arrow[][]};
export type Initial={version:1;draft?:PackedProgram;prior?:{runs:number;failed:boolean;edits:number;hints:number}};
export type Action=['e',Operation[]]|['a',number]|['r'|'i',number,number]|['x',number]|['u'|'z'|'g'|'h'];
export type Payload=ReplayPayload<Initial,Action>;
export type State={blockDraft?:PackedProgram;blockHistory:(PackedProgram|null)[];descriptor:Descriptor;program:Arrow[];history:Arrow[][];edits:number;runs:number;won:boolean;hintStage:number;hints:number};
export const codes:Arrow[]=['up','right','down','left','repeat2','repeat3'];
export function editProgram(program:readonly Arrow[],a:Action,starter:Arrow[]):Arrow[]|null {
 if(a[0]==='a')return program.length<32?[...program,codes[a[1]]]:null;
 if(a[0]==='x')return a[1]<program.length?program.filter((_,i)=>i!==a[1]):null;
 if(a[0]==='r')return a[1]<program.length&&program[a[1]]!==codes[a[2]]?program.map((c,i)=>i===a[1]?codes[a[2]]:c):null;
 if(a[0]==='i')return a[1]<=program.length&&program.length<32?[...program.slice(0,a[1]),codes[a[2]],...program.slice(a[1])]:null;
 if(a[0]==='z')return JSON.stringify(program)!==JSON.stringify(starter)?[...starter]:null;
 return null;
}
export const challengeEngine:ReplayEngine<Descriptor,Initial,Action,State>={
 initial:()=>({version:1}),validInitial:(v,d):v is Initial=>plain(v)&&v.version===1&&Object.keys(v).every(k=>['version','draft','prior'].includes(k))&&(!('draft' in v)||d.blockEditor===true&&!!readBeepDraft(v.draft,d.puzzle,d.level))&&(!('prior' in v)||d.blockEditor===true&&plain(v.prior)&&exactKeys(v.prior,['runs','failed','edits','hints'])&&uint(v.prior.runs,65535)&&typeof v.prior.failed==='boolean'&&uint(v.prior.edits,65535)&&uint(v.prior.hints,65535)),
 create:(d,initial)=>({blockDraft:initial.draft,blockHistory:[],descriptor:d,program:initial.draft?readBeepDraft(initial.draft,d.puzzle,d.level)!.plan:[...d.starter],history:[],edits:initial.prior?.edits??0,runs:0,won:false,hintStage:Math.min(3,initial.prior?.hints??0),hints:initial.prior?.hints??0}),
 prior:initial=>initial.prior?{runs:initial.prior.runs,failed:initial.prior.failed}:null,
 validAction:(v):v is Action=>Array.isArray(v)&&v[0]==='e'?v.length===2&&Object.keys(v).length===2&&validOperations(v[1]):Array.isArray(v)&&Object.keys(v).length===v.length&&(v.length===1&&['u','z','g','h'].includes(v[0])||v.length===2&&['a','x'].includes(v[0])&&uint(v[1],v[0]==='a'?5:31)||v.length===3&&['r','i'].includes(v[0])&&uint(v[1],31)&&uint(v[2],5)),
 step:(s,a,d)=>{
  if(s.won)return null;
  if(a[0]==='e'){
      if(d.blockEditor!==true)return null;
      const current=s.blockDraft?decodeProgram(s.blockDraft):beepProgram(s.program);
      const program=current&&applyOperations(current,a[1]);
      if(!program)return null;
      const packed=encodeProgram(program);const decoded=readBeepDraft(packed,d.puzzle,d.level);if(!decoded||JSON.stringify(packed)===JSON.stringify(s.blockDraft))return null;return {state:{...s,blockDraft:packed,program:decoded.plan,history:[...s.history.slice(-15),s.program],blockHistory:[...s.blockHistory.slice(-15),s.blockDraft??null],edits:s.edits+projectionEdits(s.program,decoded.plan),hintStage:0},event:'edit'};}

  if((a[0]==='a'&&a[1]>=4||['r','i'].includes(a[0])&&a.length===3&&a[2]>=4)&&d.level!==5)return null;
  if(a[0]==='h')return s.hintStage>=3?null:{state:{...s,hintStage:s.hintStage+1,hints:s.hints+1},event:'help'};
  if(a[0]==='g'){if(!s.program.length)return null;const won=solves(d.puzzle,s.program);return {state:{...s,runs:s.runs+1,won},event:'run',correct:won};}
  const program=a[0]==='u'?s.history.at(-1)??null:editProgram(s.program,a,d.starter);if(!program)return null;
  return {state:{...s,program:[...program],blockDraft:a[0]==='u'?s.blockHistory.at(-1)??undefined:undefined,blockHistory:a[0]==='u'?s.blockHistory.slice(0,-1):[...s.blockHistory.slice(-15),s.blockDraft??null],history:a[0]==='u'?s.history.slice(0,-1):[...s.history.slice(-15),[...s.program]],edits:s.edits+1,hintStage:0},event:a[0]==='z'?'reset':'edit'};
 },
 inspect:s=>({solved:s.won,metrics:{cards:s.program.length},edits:s.edits,solution:s.won?sha256Hex(JSON.stringify(s.program)):null,objectives:s.edits===1&&s.runs===1?['one-fix-one-go']:[],dareEligible:!s.hints&&(s.descriptor.level!==4||s.edits===1&&s.runs===1)})
};
