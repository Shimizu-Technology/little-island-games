import { commands, solved, start, step, type Command, type Level, type Walker } from './engine';
import type { LaunchOptions, ReplayEngine, ReplayPayload } from '../../../challenge/types';
import { sha256Hex } from '../../../puzzles/sha256';

export type Descriptor = { level: Level; budget: number | null; starter: Command[]; lesson: string };
export const cardCodes: Command[] = ['up','right','down','left','forward','turn-left','turn-right','repeat'];
/** Compact tuples retain replay and undo evidence within the shared 4 KiB slot. */
export type Action = ['a',number] | ['x',number] | ['r',number,number] | ['i',number,number] | ['g'|'t'|'h'|'u'|'z'];
export type Initial = { version: 1 };
export type Payload = ReplayPayload<Initial,Action>;
export type State = {
  descriptor: Descriptor; program: Command[]; history: Command[][]; cursor: number; running: boolean;
  edits: number; runs: number; hints: number; supportOff: boolean; won: boolean;
};
const key = (w: Walker) => `${w.pos}/${w.facing}/${w.shells}/${w.previous}`;
/** Turns are free; entering mud costs two walking steps. Movement always uses the School engine. */
export function advance(level: Level, walker: Walker, command: Command): { walker: Walker; cost: number } {
  const primitives = command === 'repeat' ? (walker.previous && walker.previous !== 'repeat' ? [walker.previous,walker.previous] : ['repeat'] as Command[]) : [command];
  let cost=0;
  for(const c of primitives) {
    const next=step(level,walker,c);
    if(!next.bump && next.pos!==walker.pos)cost+=level.rows.join('')[next.pos]==='m'?2:1;
    walker=next;
  }
  return {walker,cost};
}
export function execute(d: Descriptor, program: readonly Command[]) {
  let walker=start(d.level), cost=0, cursor=0;
  const frames=[walker];
  for(const c of program) {
    const next=advance(d.level,walker,c);walker=next.walker;cost+=next.cost;cursor++;frames.push(walker);
    if(walker.bump || solved(d.level,walker) || d.budget!==null && cost>d.budget)break;
  }
  return {walker,cost,cursor,frames,won:solved(d.level,walker) && (d.budget===null || cost<=d.budget)};
}
/** BFS minimises cards under the exact walking budget. Cost-state dominance prevents a short
 * muddy path from pruning a longer path with enough walking steps left. */
function* solutionWork(d: Descriptor, prefix: readonly Command[] = []): Generator<void, Command[] | null> {
  const first=execute(d,prefix);
  if(first.cursor!==prefix.length || first.walker.bump || d.budget!==null&&first.cost>d.budget)return null;
  if(first.won)return [...prefix];
  const queue=[{walker:first.walker,cost:first.cost,path:[...prefix]}];
  const seen=new Map<string,number>([[key(first.walker),first.cost]]);
  for(let i=0;i<queue.length;i++) {
    yield;
    const {walker,cost,path}=queue[i];
    if(path.length>=80)continue;
    for(const c of commands(d.level.pace)) {
      const n=advance(d.level,walker,c), total=cost+n.cost;
      if(n.walker.bump || d.budget!==null&&total>d.budget)continue;
      const next=[...path,c];
      if(solved(d.level,n.walker))return next;
      const k=key(n.walker), previous=seen.get(k);
      if(previous!==undefined && (d.budget===null || previous<=total))continue;
      seen.set(k,total);queue.push({walker:n.walker,cost:total,path:next});
    }
  }
  return null;
}
export function solution(d: Descriptor, prefix: readonly Command[] = []): Command[] | null {
  const work=solutionWork(d,prefix);let result=work.next();while(!result.done)result=work.next();return result.value;
}
export type Hint = {keep:number;plan:Command[];next:Command|null};
function* hintWork(d: Descriptor, program: readonly Command[]):Generator<void,Hint> {
  for(let keep=program.length;keep>=0;keep--) {
    const plan=yield* solutionWork(d,program.slice(0,keep));
    if(plan)return {keep,plan,next:plan[keep]??null};
  }
  return {keep:0,plan:[] as Command[],next:null};
}
export function nextHint(d: Descriptor, program: readonly Command[]):Hint {
  const work=hintWork(d,program);let result=work.next();while(!result.done)result=work.next();return result.value;
}
/** Hint work is cancellable and returns to the event loop at most every 8 ms. */
export async function nextHintSliced(d:Descriptor,program:readonly Command[], options:{cancelled:()=>boolean;now?:()=>number;pause?:()=>Promise<void>;budgetMs?:number}):Promise<Hint|null> {
 const now=options.now??(()=>performance.now()), pause=options.pause??(()=>new Promise<void>(resolve=>setTimeout(resolve,0))), budget=Math.min(8,options.budgetMs??8), work=hintWork(d,program);
 let deadline=now()+budget;
 while(!options.cancelled()) {
  const result=work.next();if(result.done)return options.cancelled()?null:result.value;
  if(now()>=deadline){await pause();if(options.cancelled())return null;deadline=now()+budget;}
 }
 return null;
}
const integer = (v: unknown, max: number): v is number => Number.isInteger(v) && (v as number)>=0 && (v as number)<=max;
const make = (d: Descriptor, o: LaunchOptions): State => ({descriptor:d,program:[...d.starter],history:[],cursor:0,running:false,edits:0,runs:0,hints:0,supportOff:o.supportOff,won:false});
export const challengeEngine: ReplayEngine<Descriptor,Initial,Action,State> = {
  initial:()=>({version:1}),
  validInitial:(v):v is Initial=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===1&&(v as Initial).version===1,
  create:(d,_initial,o)=>make(d,o),
  validAction:(v):v is Action=>Array.isArray(v)&&Object.keys(v).length===v.length&&(
    v.length===1&&['g','t','h','u','z'].includes(v[0]) ||
    v.length===2&&(v[0]==='a'?integer(v[1],7):v[0]==='x'&&integer(v[1],79)) ||
    v.length===3&&['r','i'].includes(v[0])&&integer(v[1],80)&&integer(v[2],7)),
  step:(s,a,d)=>{
    if(s.won)return null;
    if(a[0]==='h')return {state:{...s,hints:Math.min(3,s.hints+1)},event:'help'};
    if(a[0]==='t') {
      if(!s.running)return null;
      const cursor=s.cursor+1, result=execute(d,s.program.slice(0,cursor)), ended=result.walker.bump || result.won || d.budget!==null&&result.cost>d.budget || cursor===s.program.length;
      return {state:{...s,cursor,running:!ended,won:result.won},event:'edit'};
    }
    if(s.running)return null;
    if(a[0]==='g') {
      if(!s.program.length)return null;
      return {state:{...s,cursor:0,running:true,runs:s.runs+1},event:'run',correct:execute(d,s.program).won};
    }
    if(a[0]==='u') {
      if(!s.history.length)return null;
      return {state:{...s,program:s.history.at(-1)!,history:s.history.slice(0,-1),cursor:0,edits:s.edits+1},event:'edit'};
    }
    if(a[0]==='z')return {state:{...s,program:[...d.starter],history:[...s.history,s.program],cursor:0,edits:s.edits+1},event:'reset'};
    const program=[...s.program];
    if(a[0]==='x') {if(a[1]>=program.length)return null;program.splice(a[1],1);}
    else {
      const c=cardCodes[a[a[0]==='a'?1:2] as number];
      if(!commands(d.level.pace).includes(c))return null;
      if(a[0]==='a')program.push(c);
      else if(a[0]==='r') {if(a[1]>=program.length || program[a[1]]===c)return null;program[a[1]]=c;}
      else if(a[0]==='i') {if(a[1]>program.length)return null;program.splice(a[1],0,c);}
    }
    if(program.length>80)return null;
    return {state:{...s,program,history:[...s.history,s.program],cursor:0,edits:s.edits+1},event:'edit'};
  },
  inspect:s=>{
    const result=execute(s.descriptor,s.program.slice(0,s.cursor));
    // Again and its flat expansion are the same solution, not a second way.
    let previous:Command|null=null;
    const primitives=s.program.slice(0,s.cursor).flatMap(c=>{if(c==='repeat')return previous?[previous,previous]:[];previous=c;return [c];});
    return {solved:s.won,edits:s.edits,metrics:{cards:s.cursor,steps:result.cost},solution:s.won?sha256Hex(JSON.stringify(primitives)):null,objectives:[]};
  },
};
