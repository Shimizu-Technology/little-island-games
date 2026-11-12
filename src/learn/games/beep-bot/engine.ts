import type { LearnEngine } from '../../types';
import { levelOf } from '../../levelOptions';
import { engine as legacyEngine } from './legacy';
import content from './content.json';
import { dirs, trace, solves, type Arrow, type Puzzle } from './movement';
export { cardEffect, execution, solves, step, trace, type Arrow, type Puzzle } from './movement';
export type BotState={version:1|2;level:number;puzzles:Puzzle[];done:number;completed:Arrow[][];program:Arrow[];cursor:number;running:boolean;attempts:number;helped:boolean};
// Named plan records distinguish programs from letter matrices in exported data.
export const bank=content.map(rows=>rows.map(({puzzle,proof})=>({puzzle:puzzle as Puzzle,proof:{...proof,winners:proof.winners.map(plan=>plan.cards as Arrow[])}})));
export function makePuzzle(level:number,seed:number):Puzzle {const p=bank[level-1][seed%bank[level-1].length].puzzle;return {...p,seed,rocks:[...p.rocks],answer:[...p.answer]};}
export function initialProgram(p:Puzzle,level:number):Arrow[]{if(level!==4)return [];const program=[...p.answer],at=Math.floor(p.seed/16)%program.length;program[at]=dirs[(dirs.indexOf(program[at])+2)%4];return program;}
export function advance(s:BotState):BotState {const done=s.done+1;return {...s,done,completed:[...s.completed,s.program.slice(0,s.cursor)],program:done<4?initialProgram(s.puzzles[done],s.level):[],cursor:0,running:false,helped:false};}
export function tick(s:BotState):BotState {if(!s.running)return s;const cursor=s.cursor+1,p=s.puzzles[s.done],path=trace(p,s.program.slice(0,cursor));return {...s,cursor,running:cursor<s.program.length&&path.at(-1)!>=0&&(s.version===2||path.at(-1)!==p.shell)};}
const keys=['version','level','puzzles','done','completed','program','cursor','running','attempts','helped'].sort().join();
export const engine:LearnEngine<BotState>={...legacyEngine,outcome:s=>s.done===4?'done':null,turn:s=>s.done%2 as 0|1,notWon:()=>null,
 helpAudio:'c2a-beep-help',
 help:'Tap arrows to build a plan. Tap a card to change it, insert before it, or remove it. Go follows your plan. If Beep bumps, your plan stays. Help gives one next edit. Level 4 has one wrong arrow. Level 5 adds Again cards.',
 create:(o,c)=>{const level=levelOf(o),seed=Math.floor(c.rng()*10000);const puzzles=Array.from({length:4},(_,i)=>makePuzzle(level,(seed+i)%10000));return {version:2,level,puzzles,done:0,completed:[],program:initialProgram(puzzles[0],level),cursor:0,running:false,attempts:0,helped:false};},
 validate:(x,o):x is BotState=>{
  if(!x||typeof x!=='object'||Array.isArray(x))return false;
  const s=x as BotState;if(s.version===1)return legacyEngine.validate(x,o);
  const valid=(a:unknown):a is Arrow=>dirs.includes(a as Arrow)||s.level===5&&['repeat2','repeat3'].includes(a as string);
  if(Object.keys(s).sort().join()!==keys||s.version!==2||s.level!==levelOf(o)||!Array.isArray(s.puzzles)||s.puzzles.length!==4||!s.puzzles.every(p=>p&&Number.isInteger(p.seed)&&p.seed>=0&&p.seed<=10000&&JSON.stringify(p)===JSON.stringify(makePuzzle(s.level,p.seed)))||new Set(s.puzzles.map(p=>JSON.stringify([p.start,p.shell,p.rocks]))).size!==4||!Number.isInteger(s.done)||s.done<0||s.done>4||!Array.isArray(s.completed)||s.completed.length!==s.done||!s.completed.every((a,i)=>Array.isArray(a)&&a.length<=32&&a.every(valid)&&solves(s.puzzles[i],a))||!Array.isArray(s.program)||s.program.length>32||!s.program.every(valid)||!Number.isInteger(s.cursor)||s.cursor<0||s.cursor>s.program.length||typeof s.running!=='boolean'||!Number.isInteger(s.attempts)||s.attempts<0||s.attempts>10000||typeof s.helped!=='boolean')return false;
  return (!s.running||s.done<4&&s.cursor<s.program.length)&&(s.done<4||s.program.length===0);
 }
};
/** Existing version-1 rounds remain exactly version 1: their stored maps are never regenerated. */
export function copySavedRound(s:BotState):BotState {return structuredClone(s);}
