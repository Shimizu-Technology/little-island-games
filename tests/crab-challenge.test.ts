import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { challengeEngine as e, cardCodes, execute, nextHint, nextHintSliced, solution, type Action, type Descriptor, type State } from '../src/learn/games/crab-commands/challenge-engine';
import { crabPuzzles, proofContent } from '../src/learn/games/crab-commands/challenge-content';
import { levels, run, solved, solve, type Command } from '../src/learn/games/crab-commands/engine';
import { registration } from '../src/challenge/registrations/crab-commands';
import { creditProgress, dareBits, emptyChallenge, validChallengeSession, type ChallengeSession } from '../src/state/challenge';
import { sha256Hex } from '../src/puzzles/sha256';
const options={supportOff:false,ownRead:false};
const initial=(d:Descriptor)=>e.create(d,{version:1},options);
const change=(s:State,a:Action)=>{const n=e.step(s,a,s.descriptor);expect(n,JSON.stringify(a)).not.toBeNull();return n!.state;};
const move=(s:ChallengeSession,a:Action)=>{const n=registration.move(s,a);expect(n,JSON.stringify(a)).not.toBeNull();return n!;};
function finish(s:ChallengeSession,program:Command[]) {
 for(const c of program)s=move(s,['a',cardCodes.indexOf(c)]);
 s=move(s,['g']);for(let i=0;i<program.length&&!s.result;i++)s=move(s,['t']);return s;
}
describe('Crab authored first proof',()=>{
 it('registers 24 distinct dares on exactly replayable School beaches, without changing those beaches',()=>{
  const replays=crabPuzzles.filter(p=>p.source.kind==='school');
  expect(replays).toHaveLength(12);expect(replays.flatMap(p=>p.dares)).toHaveLength(24);
  expect(new Set(replays.flatMap(p=>p.dares.map(d=>d.slot))).size).toBe(24);
  for(const p of replays){expect(p.source.kind).toBe('school');if(p.source.kind!=='school')continue;
   const source=p.source;expect(p.descriptor.level).toEqual(levels.find(l=>l.id===source.puzzle));
   expect(p.ref.hash).toBe(sha256Hex(JSON.stringify(p.descriptor)));
   expect(p.dares[0].rule.kind).toBe('clean');
  }
 });
 it('replays all 23 certified witnesses on the real movement engine and exact budgets',()=>{
  for(const p of [...proofContent.replays,...proofContent.debug,...proofContent.mud]) {
   const d=p.descriptor as Descriptor, result=execute(d,p.witness as Command[]);
   expect(result.won,d.level.id).toBe(true);expect(result.cost).toBe(p.steps);
   expect(solution(d)?.length,d.level.id).toBe(p.cards);
   if(!d.level.rows.join('').includes('m'))expect(run(d.level,p.witness as Command[])).toEqual(result.walker);
  }
 });
 it('teaches walking costs before the detour, three developments, twist, hard and easy finish',()=>{
  expect(proofContent.mud).toHaveLength(7);
  const [teach,detour,,develop,twist,hard,easy]=proofContent.mud;
  expect([teach.cards,detour.cards,twist.cards,hard.cards,easy.cards]).toEqual([2,9,11,15,3]);
  expect(execute(detour.descriptor as Descriptor,['forward','forward','forward','forward'])).toMatchObject({won:false,cost:7});
  expect(execute({...detour.descriptor,budget:null} as Descriptor,['forward','forward','forward','forward']).won).toBe(true);
  expect([detour.steps,develop.steps,twist.steps]).toEqual([6,8,6]);
 });
 it('keeps certified walking lower bounds honest with an independent weighted graph search',()=>{
  for(const p of proofContent.mud) {
   const d=p.descriptor as Descriptor, cells=d.level.rows.join(''), shells=[...cells].flatMap((c,i)=>c==='S'?[i]:[]), queue=[{pos:cells.indexOf('C'),mask:0,cost:0}], seen=new Set<string>();let best=-1;
   while(queue.length){queue.sort((a,b)=>a.cost-b.cost);const s=queue.shift()!,k=`${s.pos}/${s.mask}`;if(seen.has(k))continue;seen.add(k);if(cells[s.pos]==='H'&&s.mask===(1<<shells.length)-1){best=s.cost;break;}
    for(const [dx,dy]of[[0,-1],[1,0],[0,1],[-1,0]]){const x=s.pos%5+dx,y=Math.floor(s.pos/5)+dy,pos=y*5+x;if(x<0||x>4||y<0||y>4||cells[pos]==='#')continue;const shell=shells.indexOf(pos);queue.push({pos,mask:s.mask|(shell<0?0:1<<shell),cost:s.cost+(cells[pos]==='m'?2:1)});}
   }
   expect(p.minimumSteps,d.level.id).toBe(best);
  }
 });
 it('all four broken programs fail and can actually be fixed by the promised edit counts',()=>{
  for(const [i,p] of proofContent.debug.entries()){
   const d=p.descriptor as Descriptor;expect(execute(d,d.starter).won).toBe(false);let repaired=initial(d);
   if(i===1)repaired=change(repaired,['i',2,cardCodes.indexOf(p.witness[2] as Command)]);
   else if(i===2)repaired=change(repaired,['x',1]);
   else for(const [j,c]of p.witness.entries())if(repaired.program[j]!==c)repaired=change(repaired,['r',j,cardCodes.indexOf(c as Command)]);
   expect(execute(d,repaired.program).won,d.level.id).toBe(true);expect(repaired.edits).toBe(i===3?2:1);
  }
  let s=initial(proofContent.debug[0].descriptor as Descriptor);const good=proofContent.debug[0].witness as Command[],at=s.program.findIndex((c,i)=>c!==good[i]);
  s=change(s,['r',at,cardCodes.indexOf(good[at])]);expect(execute(s.descriptor,s.program).won).toBe(true);expect(s.edits).toBe(1);
  s=change(s,['u']);expect(s.program).toEqual(proofContent.debug[0].descriptor.starter);expect(s.edits).toBe(2);
 });
 it('inserts missing cards, removes extras, resets and undoes without losing attempt evidence',()=>{
  let s=initial(proofContent.debug[1].descriptor as Descriptor),before=[...s.program];
  s=change(s,['i',2,cardCodes.indexOf(proofContent.debug[1].witness[2] as Command)]);expect(execute(s.descriptor,s.program).won).toBe(true);
  s=change(s,['x',2]);expect(s.program).toEqual(before);s=change(s,['z']);s=change(s,['u']);expect(s.program).toEqual(before);
 });
 it('one-step hints preserve valid alternate prefixes and never silently replace the plan',()=>{
  for(const p of proofContent.mud){const d=p.descriptor as Descriptor, before=JSON.stringify(d),hint=nextHint(d,[]);expect(hint.keep).toBe(0);expect(execute(d,hint.plan).won).toBe(true);expect(JSON.stringify(d)).toBe(before);}
  const d=proofContent.mud[1].descriptor as Descriptor, alternate=['turn-right','forward'] as Command[],hint=nextHint(d,alternate);expect(hint.keep).toBe(2);expect(hint.plan.slice(0,2)).toEqual(alternate);
  let s=initial(d);s=change(s,['h']);expect(s.program).toEqual([]);expect(s.hints).toBe(1);
 });
 it('cancels sliced hints after leaving and yields during worst-case search',async()=>{
  const d=proofContent.replays[10].descriptor as Descriptor, program=Array(80).fill('turn-left') as Command[];
  let clock=0,pauses=0,cancelled=false;
  const hint=await nextHintSliced(d,program,{cancelled:()=>cancelled,now:()=>clock++,budgetMs:2,pause:async()=>{pauses++;cancelled=true;}});
  expect(pauses).toBe(1);expect(hint).toBeNull();
  const answer=await nextHintSliced(d,program,{cancelled:()=>false,now:()=>clock++,budgetMs:2,pause:async()=>{pauses++;}});
  expect(answer).toEqual(nextHint(d,program));expect(pauses).toBeGreaterThan(1);
 });
 it('matches the original interpreter on 10,000 deterministic legal-command prefixes',()=>{
  let seed=11;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  for(let i=0;i<10000;i++){const p=proofContent.replays[i%12],d=p.descriptor as Descriptor, allowed=p.commands as Command[],program=Array.from({length:random()%25},()=>allowed[random()%allowed.length]),result=execute(d,program);expect(result.walker).toEqual(run(d.level,program.slice(0,result.cursor)));}
 });
 it('rejects invalid commands, extra fields, sparse logs, forged state and out-of-range edits',()=>{
  const d=proofContent.replays[0].descriptor as Descriptor,s=initial(d);
  for(const a of [['r',80,0],['x',0],['t'],['g'],['a',4]] as Action[])expect(e.step(s,a,d)).toBeNull();
  for(const a of [['a',8],['a',-1],['a',1,2],['wat'],new Array(1),{type:'help'}])expect(e.validAction(a)).toBe(false);
  expect(e.validInitial({version:1,program:['right']},d)).toBe(false);
 });
 it('retains the original School solution semantics including Again',()=>{
  for(const l of levels){const path=solve(l);expect(solved(l,run(l,path))).toBe(true);expect(execute({level:l,budget:null,starter:[],lesson:''},path).walker).toEqual(run(l,path));}
 });
 it('measures hint work on all authored starts',()=>{
  const durations=crabPuzzles.map(p=>{const t=performance.now();nextHint(p.descriptor,p.descriptor.starter);return performance.now()-t;});
  console.info('Crab hint host ms',JSON.stringify({max:Math.max(...durations),total:durations.reduce((a,b)=>a+b,0)}));
  expect(durations.every(Number.isFinite)).toBe(true);
 });
});
describe('Crab real Challenge replay and marks',()=>{
 it.each(crabPuzzles.filter(p=>p.source.kind==='school'))('proves the selected dares on $title, and preserves them after helped replay',p=>{
  let s=registration.start(p.ref,'a','crab-proof',emptyChallenge(),{...options,supportOff:p.dares.some(d=>d.rule.kind==='blind')},p.dares.map(d=>d.slot));
  s=finish(s,solution(p.descriptor)!);expect(s.result?.dares).toEqual(p.dares.map(d=>d.slot));expect(validChallengeSession(s,'a',registration.catalog)).toBe(true);
  const progress=creditProgress(emptyChallenge(),p.ref,s.result!,registration.catalog);expect(dareBits(progress.dares)?.filter(Boolean)).toHaveLength(2);
  const next=creditProgress(progress,p.ref,{event:'helped',awards:0,dares:[],cost:null,solution:null},registration.catalog);expect(next.dares).toBe(progress.dares);
  expect(registration.move(s,['h'])).toBeNull();
 });
 it('resumes an exact running draft, retains failed runs after undo/reset, and allows a helped finish',()=>{
  const p=crabPuzzles.find(p=>p.source.kind==='school')!;let s=registration.start(p.ref,'a','crab-save',emptyChallenge(),options,p.dares.map(d=>d.slot));
  s=move(s,['a',0]);s=move(s,['g']);s=move(s,['t']);s=move(s,['z']);s=move(s,['h']);
  for(const c of solution(p.descriptor)!)s=move(s,['a',cardCodes.indexOf(c)]);s=move(s,['g']);s=move(s,['t']);
  s=JSON.parse(JSON.stringify(s));expect(validChallengeSession(s,'a',registration.catalog)).toBe(true);
  for(let i=0;i<80&&!s.result;i++)s=move(s,['t']);expect(s.result?.event).toBe('helped');expect(s.result?.dares).not.toContain(p.dares[0].slot);
  expect(validChallengeSession({...s,result:{...s.result,dares:[p.dares[0].slot]}},'a',registration.catalog)).toBe(false);
  expect(validChallengeSession(s,'b',registration.catalog)).toBe(false);
 });
});
