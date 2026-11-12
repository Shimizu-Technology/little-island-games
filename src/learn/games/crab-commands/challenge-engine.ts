import { commands, solved, start, step, type Command, type Level, type Walker } from './engine';
import type { LaunchOptions, ReplayEngine, ReplayPayload } from '../../../challenge/types';
import { sha256Hex } from '../../../puzzles/sha256';

export type Descriptor = { level: Level; budget: number | null; starter: Command[]; lesson: string };
export const cardCodes: Command[] = ['up','right','down','left','forward','turn-left','turn-right','repeat'];
/** Compact tuples retain replay and undo evidence within the shared 4 KiB slot. */
export type Action = ['a',number] | ['x',number] | ['r',number,number] | ['i',number,number] | ['g'|'h'|'u'|'z'];
/** `prior` carries an earlier attempt's runs, misses and hinted steps into a continued attempt. */
export type Prior = { runs: number; failed: boolean; steps: number };
export type Initial = { version: 1; prior?: Prior };
/** Help may show this many steps in an attempt and still leave dare marks open. */
export const freeHintSteps = 2;
export type Payload = ReplayPayload<Initial,Action>;
export type State = {
  descriptor: Descriptor; program: Command[]; history: Command[][]; cursor: number; running: boolean;
  edits: number; runs: number; hints: number; steps: number; hintStage: number; hintProgram: string | null; fullPlanShown: boolean; supportOff: boolean; won: boolean;
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
type Node = { walker: Walker; cost: number; next: [Command, number][] };
type Graph = { layers: Node[][]; goals: number[] };
/** Every card-optimal winner as a layered graph: each path of L cards from the start to a
 * goal is one shortest winning program. Mud keeps the walking cost in the node. Each yield
 * covers one node, so pruning and expansion never run unbroken through a whole layer. */
function* winnerGraph(d: Descriptor): Generator<void, Graph | null> {
  const layers: Node[][] = [[{walker:start(d.level),cost:0,next:[]}]];
  while(layers.length<=80) {
    const index=new Map<string,number>(), layer:Node[]=[], goals:number[]=[];
    for(const node of layers.at(-1)!) {
      yield;
      for(const c of commands(d.level.pace)) {
        const n=advance(d.level,node.walker,c), cost=node.cost+n.cost;
        if(n.walker.bump || d.budget!==null&&cost>d.budget)continue;
        const id=`${key(n.walker)}/${d.budget===null?0:cost}`;
        let at=index.get(id);
        if(at===undefined){at=layer.length;index.set(id,at);layer.push({walker:n.walker,cost,next:[]});if(solved(d.level,n.walker))goals.push(at);}
        node.next.push([c,at]);
      }
    }
    if(!layer.length)return null;
    layers.push(layer);
    if(goals.length) {
      // Keep only edges that still reach a goal in exactly the remaining cards.
      const alive=layers.map(l=>new Uint8Array(l.length));
      for(const g of goals)alive[layers.length-1][g]=1;
      for(let k=layers.length-2;k>=0;k--)for(let u=0;u<layers[k].length;u++) {
        yield;
        const node=layers[k][u], next=alive[k+1];
        node.next=node.next.filter(([,to])=>next[to]===1);if(node.next.length)alive[k][u]=1;
      }
      return {layers,goals};
    }
  }
  return null;
}
const INF=0x3fffffff;
/** One DP row per live node, allocated when first reached: cost, predecessor node (-1 start,
 * -2 the same node one program card back) and how it was reached. */
type Row = { cost: Int32Array; from: Int32Array; move: Int8Array };
const row=(n:number):Row=>({cost:new Int32Array(n+1).fill(INF),from:new Int32Array(n+1).fill(-1),move:new Int8Array(n+1).fill(-1)});
const at=(rows:(Row|undefined)[],v:number,n:number)=>rows[v]??(rows[v]=row(n));
/** The card-optimal winner fewest edits away from the child's program (change, insert, remove). */
function* nearestWinner(d: Descriptor, program: readonly Command[]): Generator<void, Command[] | null> {
  const graph=yield* winnerGraph(d);if(!graph)return null;
  const {layers,goals}=graph;
  const n=program.length, L=layers.length-1, cards=program.map(c=>cardCodes.indexOf(c));
  // move: card index * 2, plus 1 when the card is inserted without using a program card.
  const table:(Row|undefined)[][]=layers.map(()=>[]);
  at(table[0],0,n).cost[0]=0;
  for(let k=0;k<=L;k++)for(let u=0;u<layers[k].length;u++) {
    const r=table[k][u];if(!r)continue;
    yield;
    const cost=r.cost;
    for(let i=0;i<n;i++)if(cost[i]+1<cost[i+1]){cost[i+1]=cost[i]+1;r.from[i+1]=-2;r.move[i+1]=-1;}
    for(const [c,v] of layers[k][u].next) {
      yield;
      const t=at(table[k+1],v,n), card=cardCodes.indexOf(c);
      for(let i=0;i<=n;i++) {
        const here=cost[i];if(here>=INF)continue;
        if(i<n){const next=here+(cards[i]===card?0:1);if(next<t.cost[i+1]){t.cost[i+1]=next;t.from[i+1]=u;t.move[i+1]=card*2;}}
        if(here+1<t.cost[i]){t.cost[i]=here+1;t.from[i]=u;t.move[i]=card*2+1;}
      }
    }
  }
  const final=(g:number)=>table[L][g]!.cost[n];
  const best=goals.reduce((g,h)=>final(h)<final(g)?h:g);
  if(final(best)>=INF)return null;
  const plan:Command[]=[];
  for(let k=L,u=best,i=n;;) {
    const r=table[k][u]!, from=r.from[i], move=r.move[i];
    if(from===-1)break;
    if(from===-2){i--;continue;}
    plan.unshift(cardCodes[move>>1]);if(!(move&1))i--;k--;u=from;
  }
  return plan;
}
/** Both Crab editors can Replace, Insert before, Remove and Add at end, so a hint is one of those edits. */
function* hintWork(d: Descriptor, program: readonly Command[]):Generator<void,Hint> {
  if(execute(d,program).won)return {keep:program.length,plan:[...program],next:null};
  const target=yield* nearestWinner(d,program);
  if(!target)return {keep:0,plan:[] as Command[],next:null};
  const edit=repairStep(program,target);
  return {keep:edit?.at??program.length,plan:target,next:edit?.card??null,edit};
}
export function nextHint(d: Descriptor, program: readonly Command[]):Hint {
  const work=hintWork(d,program);let result=work.next();while(!result.done)result=work.next();return result.value;
}
/** Hint work is cancellable and returns to the event loop at most every 8 ms. Each step of the
 * search is one node or one edge, so a slice pauses early when its longest step so far would
 * carry it past the budget. */
export async function nextHintSliced(d:Descriptor,program:readonly Command[], options:{cancelled:()=>boolean;now?:()=>number;pause?:()=>Promise<void>;budgetMs?:number}):Promise<Hint|null> {
 const now=options.now??(()=>performance.now()), pause=options.pause??(()=>new Promise<void>(resolve=>setTimeout(resolve,0))), budget=Math.min(8,options.budgetMs??8), work=hintWork(d,program);
 let began=now(), last=began, longest=0;
 while(!options.cancelled()) {
  const result=work.next();if(result.done)return options.cancelled()?null:result.value;
  const t=now();longest=Math.max(longest,t-last);last=t;
  if(t-began+Math.min(longest,budget/2)>=budget){await pause();if(options.cancelled())return null;began=last=now();}
 }
 return null;
}
const integer = (v: unknown, max: number): v is number => Number.isInteger(v) && (v as number)>=0 && (v as number)<=max;
const make = (d: Descriptor, o: LaunchOptions, initial: Initial): State => ({descriptor:d,program:[...d.starter],history:[],cursor:0,running:false,edits:0,runs:0,hints:0,steps:initial.prior?.steps??0,hintStage:0,hintProgram:null,fullPlanShown:false,supportOff:o.supportOff,won:false});
const validPrior = (v: unknown): v is Prior => !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===3&&integer((v as Prior).runs,65535)&&typeof (v as Prior).failed==='boolean'&&integer((v as Prior).steps,255);
export const challengeEngine: ReplayEngine<Descriptor,Initial,Action,State> = {
  initial:()=>({version:1}),
  validInitial:(v):v is Initial=>!!v&&typeof v==='object'&&!Array.isArray(v)&&(v as Initial).version===1&&(Object.keys(v).length===1||Object.keys(v).length===2&&validPrior((v as Initial).prior)),
  create:(d,initial,o)=>make(d,o,initial),
  prior:initial=>initial.prior?{runs:initial.prior.runs,failed:initial.prior.failed}:null,
  validAction:(v):v is Action=>Array.isArray(v)&&Object.keys(v).length===v.length&&(
    v.length===1&&['g','h','u','z'].includes(v[0]) ||
    v.length===2&&(v[0]==='a'?integer(v[1],7):v[0]==='x'&&integer(v[1],79)) ||
    v.length===3&&['r','i'].includes(v[0])&&integer(v[1],80)&&integer(v[2],7)),
  step:(s,a,d)=>{
    if(s.won)return null;
    if(a[0]==='h') {
      // Each press reveals more; once the whole plan shows, another press would only grow the log.
      const hintProgram=JSON.stringify(s.program), same=s.hintProgram===hintProgram;
      if(same&&s.hintStage>=3)return null;
      const hintStage=same?s.hintStage+1:1;
      return {state:{...s,hints:s.hints+1,steps:s.steps+(same?0:1),hintProgram,hintStage,fullPlanShown:s.fullPlanShown||hintStage===3},event:'help'};
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
    // Two hinted steps leave dares open; a third step or the whole plan keeps only the finish.
    return {solved:s.won,edits:s.edits,dareEligible:!s.fullPlanShown&&s.steps<=freeHintSteps,metrics:{cards:s.cursor,steps:result.cost},solution:s.won?sha256Hex(JSON.stringify(primitives)):null,objectives:[]};
  },
};
