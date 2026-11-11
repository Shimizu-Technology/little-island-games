import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { crabPuzzles } from '../src/learn/games/crab-commands/challenge-content';
import { commands, levels, type Command } from '../src/learn/games/crab-commands/engine';
import { execute, nextHint, nextHintSliced, solution, type Descriptor, type HintEdits } from '../src/learn/games/crab-commands/challenge-engine';
import { sha256Hex } from '../src/puzzles/sha256';

// Every registered beach (active and retired puzzles, every School level) and both editors.
const beaches=[
 ...crabPuzzles.map(p=>({name:`${p.ref.bank}/${p.ref.puzzle}${p.retired?'/retired':''}`,d:p.descriptor})),
 ...levels.map(level=>({name:`school/${level.id}`,d:{level,budget:null,starter:[],lesson:''} as Descriptor})),
];
const modes:HintEdits[]=['any','append'];
/** Deterministic programs: empty, starter, the plan and its one-card faults, and full-length drafts. */
function programs(d:Descriptor):Command[][] {
 let seed=d.level.id.length*977+(d.budget??0);const rand=(n:number)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 const cs=commands(d.level.pace), plan=solution(d)??[];
 const out:Command[][]=[[],[...d.starter],plan,plan.slice(0,-1),[...plan,cs[0]],plan.slice(1)];
 for(const c of cs)if(c!==plan[0])out.push([c,...plan.slice(1)]);
 for(let j=0;j<3&&plan.length;j++){const p=[...plan];p[rand(p.length)]=cs[rand(cs.length)];out.push(p);}
 for(const c of ['turn-left',cs[0]] as Command[])out.push(Array(80).fill(c));
 for(let j=0;j<2;j++)out.push(Array.from({length:80},()=>cs[rand(cs.length)]));
 for(let j=0;j<3;j++)out.push(Array.from({length:rand(30)},()=>cs[rand(cs.length)]));
 return out;
}
const goldenPath=new URL('./fixtures/crab-hint-golden.json',import.meta.url);

describe('Crab hint search', () => {
 it('gives the same hints as the reviewed head (39d1dea2) on every registered beach in both editors', () => {
  const now:Record<string,string>={};
  for(const {name,d} of beaches)for(const mode of modes)now[`${name}/${mode}`]=sha256Hex(JSON.stringify(programs(d).map(p=>nextHint(d,p,mode))));
  if(process.env.CRAB_HINT_GOLDEN==='write')writeFileSync(goldenPath,JSON.stringify(now,null,1)+'\n');
  const golden=JSON.parse(readFileSync(goldenPath,'utf8')) as Record<string,string>;
  expect(Object.keys(now).length).toBe(beaches.length*2);
  expect(now).toEqual(golden);
 });

 it('agrees with exhaustive enumeration of every shortest winner on short School boards, for arbitrary drafts', () => {
  // Independent of the search: list every winning program of the shortest length and score
  // the child's draft against each with plain edit distance (any) or keep-in-order (append).
  const distance=(a:readonly Command[],b:readonly Command[])=>{let r=Array.from({length:b.length+1},(_,i)=>i);for(let i=0;i<a.length;i++){const q=[i+1];for(let j=0;j<b.length;j++)q.push(Math.min(r[j+1]+1,q[j]+1,r[j]+(a[i]===b[j]?0:1)));r=q;}return r[b.length];};
  const append=(a:readonly Command[],b:readonly Command[])=>{let k=0;for(const c of a)if(c===b[k])k++;return a.length+b.length-2*k;};
  let seed=7, checked=0;const rand=(n:number)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
  for(const level of levels.filter(l=>!l.retired)) {
   const d={level,budget:null,starter:[],lesson:''} as Descriptor, L=solution(d)!.length;if(L>7)continue;
   const cs=commands(level.pace), all:Command[][]=[];
   const walk=(p:Command[])=>{const x=execute(d,p);if(x.walker.bump||x.cursor<p.length)return;if(p.length===L){if(x.won)all.push(p);return;}for(const c of cs)walk([...p,c]);};walk([]);
   for(let z=0;z<15;z++) {
    const p=Array.from({length:rand(L+5)},()=>cs[rand(cs.length)]);if(execute(d,p).won)continue;
    for(const mode of modes){const h=nextHint(d,p,mode), cost=mode==='any'?distance:append;expect(execute(d,h.plan).won).toBe(true);expect(h.plan.length).toBe(L);expect(cost(p,h.plan),`${level.id} ${mode} ${JSON.stringify(p)}`).toBe(Math.min(...all.map(w=>cost(p,w))));checked++;}
   }
  }
  console.info('Crab hint oracle cases',checked);expect(checked).toBeGreaterThan(500);
 });
 // Real event-loop pauses (the production setTimeout), measured outside the slicer: an active
 // slice is the time from resuming to the next pause. Host jitter allowance: 1 ms, and a search
 // fails only if it overruns on three separate runs (a missing yield overruns every time; a
 // scheduler or GC stall on this shared host does not repeat). Not a device timing claim.
 const sliceMs=8, jitterMs=1;
 async function measure(d:Descriptor,program:Command[],edits:HintEdits) {
  const slices:number[]=[], began=performance.now();let last=began, step=0, previous=began;
  const hint=await nextHintSliced(d,program,{cancelled:()=>false,edits,
   now:()=>{const t=performance.now();step=Math.max(step,t-previous);previous=t;return t;},
   pause:async()=>{slices.push(performance.now()-last);await new Promise<void>(resolve=>setTimeout(resolve,0));last=previous=performance.now();}});
  slices.push(performance.now()-last);
  return {hint,slices,max:Math.max(...slices),active:slices.reduce((a,b)=>a+b,0),total:performance.now()-began,step};
 }
 const full=(d:Descriptor,seed:number)=>{const cs=commands(d.level.pace);return [Array(80).fill('turn-left') as Command[],Array.from({length:80},(_,j)=>cs[(j*7+seed)%cs.length])];};
 it('keeps every uninterrupted slice within 8 ms at the maximum program length, in both editors, on every registered beach', async () => {
  const report:{name:string;mode:HintEdits;max:number;active:number;total:number;step:number;slices:number;tries:number}[]=[];
  for(const {name,d} of beaches)for(const mode of modes)for(const [j,program] of full(d,name.length).entries()) {
   let m=await measure(d,program,mode), tries=1;
   while(m.max>sliceMs+jitterMs&&tries<3){m=await measure(d,program,mode);tries++;}
   expect(m.hint).toEqual(nextHint(d,program,mode));
   report.push({name:`${name}#${j}`,mode,max:m.max,active:m.active,total:m.total,step:m.step,slices:m.slices.length,tries});
  }
  report.sort((a,b)=>b.max-a.max);
  console.info('Crab hint slices host ms',JSON.stringify({searches:report.length,retried:report.filter(r=>r.tries>1).length,maxSlice:report[0].max,maxStep:Math.max(...report.map(r=>r.step)),maxActive:Math.max(...report.map(r=>r.active)),worst:report.slice(0,5)}));
  for(const r of report)expect(r.max,`${r.name} ${r.mode}: ${r.max.toFixed(2)} ms slice`).toBeLessThanOrEqual(sliceMs+jitterMs);
 });
 it('stops within one slice when cancelled from outside, and at the next step when polled', async () => {
  // The longest searches at full length; a 2 ms budget also forces several pauses into each.
  // The same three-run rule as above applies to each latency.
  const heavy=['school/h3','school/h5','10/0','9/4'].map(name=>beaches.find(b=>b.name===name)!.d);
  let stopped=0, worstTap=0, worstPoll=0;
  for(const d of heavy)for(const edits of modes)for(const budgetMs of [8,2])for(const delay of [0,2,5]) {
   const program=Array(80).fill('turn-left') as Command[], whole=nextHint(d,program,edits);
   // A tap that lands while the search works can only run at the next pause, so the search
   // either stops there or has already finished; both happen within one slice of the tap.
   const tap=async()=>{
    let cancelled=false,due=0;
    const timer=new Promise<void>(resolve=>{due=performance.now()+delay;setTimeout(()=>{cancelled=true;resolve();},delay);});
    const answer=await nextHintSliced(d,program,{cancelled:()=>cancelled,edits,budgetMs});const done=performance.now();await timer;
    if(answer)expect(answer).toEqual(whole);
    return {stopped:!answer,latency:Math.max(0,done-due)};
   };
   // A cancel check that turns true mid-slice is seen at the next step, with no further work.
   const poll=async()=>{
    const stop=performance.now()+delay;let seen=0;
    const answer=await nextHintSliced(d,program,{cancelled:()=>{const t=performance.now();if(t>=stop&&!seen)seen=t;return t>=stop;},edits,budgetMs});
    if(answer){expect(answer).toEqual(whole);expect(seen).toBe(0);return {stopped:false,latency:0};}
    return {stopped:true,latency:performance.now()-seen};
   };
   for(const [run,limit,name] of [[tap,sliceMs+jitterMs,'tap'],[poll,jitterMs,'poll']] as const) {
    let r=await run();for(let tries=1;r.latency>limit&&tries<3;tries++)r=await run();
    expect(r.latency,`${name}: ${edits}, ${budgetMs} ms budget, at ${delay} ms`).toBeLessThanOrEqual(limit);
    if(r.stopped)stopped++;
    if(name==='tap')worstTap=Math.max(worstTap,r.latency);else worstPoll=Math.max(worstPoll,r.latency);
   }
  }
  console.info('Crab hint cancel host ms',JSON.stringify({stopped,worstTap,worstPoll}));
  expect(stopped).toBeGreaterThan(20);
 });
});
