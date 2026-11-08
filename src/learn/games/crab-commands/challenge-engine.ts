import repairs from './repair-plans.json';
import { commands, solved, start, step, type Command, type Level, type Walker } from './engine';
import type { LaunchOptions, ReplayEngine, ReplayPayload } from '../../../challenge/types';
import { sha256Hex } from '../../../puzzles/sha256';

export type Descriptor = { level: Level; budget: number | null; starter: Command[]; lesson: string };
export const cardCodes: Command[] = ['up','right','down','left','forward','turn-left','turn-right','repeat'];
/** Compact tuples retain replay and undo evidence within the shared 4 KiB slot. */
export type Action = ['a',number] | ['x',number] | ['r',number,number] | ['i',number,number] | ['g'|'h'|'u'|'z'];
export type Initial = { version: 1 };
export type Payload = ReplayPayload<Initial,Action>;
export type State = {
  descriptor: Descriptor; program: Command[]; history: Command[][]; cursor: number; running: boolean;
  edits: number; runs: number; hints: number; hintStage: number; hintProgram: string | null; fullPlanShown: boolean; supportOff: boolean; won: boolean;
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
export type Repair = {op:'change'|'insert'|'remove';at:number;card?:Command};
export type Hint = {keep:number;plan:Command[];next:Command|null;edit?:Repair};
/** Minimum edit alignment to the certified repair. Insert/remove stay distinct from replacement. */
export function repairStep(program:readonly Command[], plan:Command[]):Repair|undefined {
 const dp=Array.from({length:program.length+1},()=>Array(plan.length+1).fill(0) as number[]);
 for(let i=program.length;i>=0;i--)for(let j=plan.length;j>=0;j--){
  dp[i][j]=i===program.length?plan.length-j:j===plan.length?program.length-i:program[i]===plan[j]?dp[i+1][j+1]:1+Math.min(dp[i+1][j+1],dp[i][j+1],dp[i+1][j]);
 }
 let at=0;while(at<program.length&&at<plan.length&&program[at]===plan[at])at++;
 if(at===program.length&&at===plan.length)return;
 if(at<program.length&&at<plan.length&&dp[at][at]===1+dp[at+1][at+1])return {op:'change',at,card:plan[at]};
 if(at<plan.length&&dp[at][at]===1+dp[at][at+1])return {op:'insert',at,card:plan[at]};
 if(at<program.length&&dp[at][at]===1+dp[at+1][at])return {op:'remove',at};
 return {op:'change',at,card:plan[at]};
}
function* hintWork(d: Descriptor, program: readonly Command[]):Generator<void,Hint> {
  if(d.starter.length) {
    if(execute(d,program).won)return {keep:program.length,plan:[...program],next:null};
    const baked=repairs.find(p=>p.id===d.level.id&&JSON.stringify(p.starter)===JSON.stringify(d.starter));
    const plan=baked?.plan as Command[]|undefined;
    const target=plan&&execute(d,plan).won?plan:(yield* solutionWork(d))??[], edit=repairStep(program,target);
    return {keep:edit?.at??program.length,plan:target,next:edit?.card??null,edit};
  }
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
const make = (d: Descriptor, o: LaunchOptions): State => ({descriptor:d,program:[...d.starter],history:[],cursor:0,running:false,edits:0,runs:0,hints:0,hintStage:0,hintProgram:null,fullPlanShown:false,supportOff:o.supportOff,won:false});
export const challengeEngine: ReplayEngine<Descriptor,Initial,Action,State> = {
  initial:()=>({version:1}),
  validInitial:(v):v is Initial=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===1&&(v as Initial).version===1,
  create:(d,_initial,o)=>make(d,o),
  validAction:(v):v is Action=>Array.isArray(v)&&Object.keys(v).length===v.length&&(
    v.length===1&&['g','h','u','z'].includes(v[0]) ||
    v.length===2&&(v[0]==='a'?integer(v[1],7):v[0]==='x'&&integer(v[1],79)) ||
    v.length===3&&['r','i'].includes(v[0])&&integer(v[1],80)&&integer(v[2],7)),
  step:(s,a,d)=>{
    if(s.won)return null;
    if(a[0]==='h') {
      const hintProgram=JSON.stringify(s.program), hintStage=s.hintProgram===hintProgram?Math.min(3,s.hintStage+1):1;
      return {state:{...s,hints:s.hints+1,hintProgram,hintStage,fullPlanShown:s.fullPlanShown||hintStage===3},event:'help'};
    }
    if(a[0]==='g') {
      if(!s.program.length)return null;
      const result=execute(d,s.program);
      return {state:{...s,cursor:result.cursor,running:false,won:result.won,runs:s.runs+1},event:'run',correct:result.won};
    }
    if(a[0]==='u') {
      if(!s.history.length)return null;
      return {state:{...s,program:s.history.at(-1)!,history:s.history.slice(0,-1),cursor:0,hintStage:0,hintProgram:null,edits:s.edits+1},event:'edit'};
    }
    if(a[0]==='z'&&JSON.stringify(s.program)===JSON.stringify(d.starter))return null;
    if(a[0]==='z')return {state:{...s,program:[...d.starter],history:[...s.history,s.program],cursor:0,hintStage:0,hintProgram:null,edits:s.edits+1},event:'reset'};
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
    return {state:{...s,program,history:[...s.history,s.program],cursor:0,hintStage:0,hintProgram:null,edits:s.edits+1},event:'edit'};
  },
  inspect:s=>{
    const result=execute(s.descriptor,s.program.slice(0,s.cursor));
    // Again and its flat expansion are the same solution, not a second way.
    let previous:Command|null=null;
    const primitives=s.program.slice(0,s.cursor).flatMap(c=>{if(c==='repeat')return previous?[previous,previous]:[];previous=c;return [c];});
    return {solved:s.won,edits:s.edits,dareEligible:!s.fullPlanShown,metrics:{cards:s.cursor,steps:result.cost},solution:s.won?sha256Hex(JSON.stringify(primitives)):null,objectives:[]};
  },
};
