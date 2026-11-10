import { expect, it } from 'vitest';
import { cardCodes, challengeEngine as e, execute, nextHint, solution, type Action, type Descriptor, type Payload } from '../src/learn/games/crab-commands/challenge-engine';
import { commands, levels, type Command } from '../src/learn/games/crab-commands/engine';
import { crabPuzzles, proofContent } from '../src/learn/games/crab-commands/challenge-content';
import legacyMud from '../src/learn/games/crab-commands/legacy-mud.json';
import { hintText } from '../src/learn/games/crab-commands/hint-text';
import { lessonAudio } from '../src/learn/games/crab-commands/lesson-audio';
import speech from '../scripts/learn/c1-crab.json';
import { crabAssistance, registration } from '../src/challenge/registrations/crab-commands';
import { emptyChallenge, type ChallengeSession } from '../src/state/challenge';
import { jsonBytes } from '../src/state/saveBits';
const options={supportOff:false,ownRead:false};
const label=Object.fromEntries(cardCodes.map(c=>[c,c])) as Record<Command,string>;
const find=(title:string)=>crabPuzzles.find(p=>p.title.includes(title)&&!p.retired)!;
const add=(s:ChallengeSession,cards:readonly Command[])=>cards.reduce((n,c)=>registration.move(n,['a',cardCodes.indexOf(c)])!,s);
const actions=(s:ChallengeSession)=>(s.payload as Payload).actions;
/** The hinted edit, read the way the old prefix hints worded it when no explicit edit is given. */
const stepOf=(hint:ReturnType<typeof nextHint>,program:readonly Command[])=>hint.edit??{op:hint.keep<program.length?'change' as const:'insert' as const,at:hint.keep,card:hint.next!};
function apply(program:Command[],edit:NonNullable<ReturnType<typeof nextHint>['edit']>){
 const next=[...program];if(edit.op==='remove')next.splice(edit.at,1);else if(edit.op==='insert')next.splice(edit.at,0,edit.card!);else next[edit.at]=edit.card!;return next;
}

it('R2 P1-1: keeping the plan in a new attempt carries missed runs, so the finish is helped and earns no clean or run-limited dare',()=>{
 const p=find('Home around the bend');
 for(const dare of p.dares.filter(d=>!d.retired&&(d.rule.kind==='clean'||d.rule.kind==='plan'))){
  const good=solution(p.descriptor)!,wrong=[...good];wrong[wrong.length-1]=wrong.at(-1)==='forward'?'turn-left':'forward';
  let s=add(registration.start(p.ref,'a','old',emptyChallenge(),{...options,supportOff:dare.rule.kind==='plan'},[dare.slot]),wrong);
  for(let i=0;i<3;i++)s=registration.move(s,['g'])!;
  const fresh=registration.restart!(s,'new',{...emptyChallenge(),nextOrdinal:2});
  expect((fresh.payload as Payload).initial).toEqual({version:1,prior:{runs:3,failed:true,steps:0}});
  expect(registration.catalog.codecs.get(fresh.codec)!.canStart(fresh)).toBe(true);
  let fixed=registration.move(fresh,['r',good.length-1,cardCodes.indexOf(good.at(-1)!)])!;fixed=registration.move(fixed,['g'])!;
  expect(fixed.result?.event,dare.label).toBe('helped');expect(fixed.result?.awards).toBe(0);expect(fixed.result?.dares).toEqual([]);
  // A second restart keeps adding to the same evidence rather than starting over.
  const again=registration.restart!(registration.move(fresh,['g'])!,'again',{...emptyChallenge(),nextOrdinal:3});
  expect((again.payload as Payload).initial).toEqual({version:1,prior:{runs:4,failed:true,steps:0}});
 }
});
it('R2 P1-1: a forged or malformed prior is rejected by replay',()=>{
 const p=find('Home around the bend'),s=registration.start(p.ref,'a','x',emptyChallenge(),options,[]),codec=registration.catalog.codecs.get(s.codec)!;
 for(const prior of [{runs:-1,failed:true,steps:0},{runs:1,failed:'yes',steps:0},{runs:1,failed:true},{runs:1,failed:true,steps:0,extra:1}])
  expect(codec.validate({...s,payload:{...(s.payload as Payload),initial:{version:1,prior}}})).toBe(false);
 expect(codec.validate({...s,payload:{...(s.payload as Payload),initial:{version:1,prior:{runs:2,failed:true,steps:1}}}})).toBe(true);
});

it('R2 P1-2: Crab owns its Help ladder; every press is kept and the whole plan can still be reached',()=>{
 expect(registration.helpUI).toBe('board');expect(crabAssistance.idempotentHelp).toBe(false);
 const p=find('Winding shore');let s=registration.start(p.ref,'a','ladder',emptyChallenge(),options,[]);
 for(let i=0;i<3;i++)s=registration.move(s,['h'])!;
 expect(actions(s)).toEqual([['h'],['h'],['h']]);
 // A fourth press would only grow the log: the engine refuses it and nothing is saved.
 expect(registration.move(s,['h'])).toBeNull();
});
it('R2 P1-2: certified reserve — from the ordinary-edit ceiling, the full ladder and a winning Go fit with the largest result',()=>{
 let worst=0;
 for(const p of crabPuzzles.filter(p=>!p.retired))for(const wall of ['bytes','actions'] as const){
  const dare=[...p.dares].filter(d=>!d.retired&&d.rule.kind==='par').sort((a,b)=>b.slot-a.slot)[0];
  let s=registration.start(p.ref,'a','reserve',emptyChallenge(),options,dare?[dare.slot]:[]);
  const good=solution(p.descriptor)!,last=good.length-1,other=cardCodes.indexOf(commands(p.descriptor.level.pace).find(c=>c!==good[last])!);
  for(let i=p.descriptor.starter.length;i>0;i--)s=registration.move(s,['x',0])!;
  s=add(s,good);
  // Longest edits (insert, remove) or shortest (add, undo) until ordinary play is refused, ending on the winning plan.
  const [edit,undo]:Action[]=wall==='bytes'?[['i',last,other],['x',last]]:[['a',other],['u']];
  let refused=false;
  for(let i=0;i<600&&!refused;i++){const n=registration.move(s,edit);const back=n&&registration.move(n,undo);if(!back)refused=true;else s=back;}
  expect(refused,p.title).toBe(true);
  expect(execute(p.descriptor,replayProgram(s,p.descriptor)).won).toBe(true);
  const before=jsonBytes(s);
  for(let i=0;i<3;i++){const n=registration.move(s,['h']);expect(n,`${p.title} ${wall} help ${i+1}`).not.toBeNull();s=n!;}
  const won=registration.move(s,['g']);expect(won?.result,`${p.title} ${wall}`).not.toBeNull();
  expect(jsonBytes(won!)).toBeLessThanOrEqual(4096);expect(actions(won!).length).toBeLessThanOrEqual(512);
  worst=Math.max(worst,jsonBytes(won!)-before);
 }
 // The reserve covers the worst measured ladder-plus-result overhead.
 expect(worst).toBeLessThanOrEqual(crabAssistance.bytes);
});
function replayProgram(s:ChallengeSession,d:Descriptor){let st=e.create(d,(s.payload as Payload).initial,options);for(const a of actions(s))st=e.step(st,a,d)!.state;return st.program;}
it('R2 P1-2: an ordinary refusal that is not a full log does not offer a new attempt',()=>{
 const p=find('Winding shore'),s=registration.start(p.ref,'a','fresh',emptyChallenge(),options,[]);
 expect(registration.move(s,['x',0])).toBeNull();expect(registration.full!(s)).toBe(false);
});

it('R2 P2-1: a missing last card or an empty plan says Add card N+1, never Insert before a card that does not exist',()=>{
 for(const p of proofContent.debug){
  const d=p.descriptor as Descriptor,plan=solution(d)!;
  expect(hintText(nextHint(d,plan.slice(0,-1)),plan.length-1,label)).toBe(`Add card ${plan.length}: ${plan.at(-1)}. Keep the other cards.`);
  expect(hintText(nextHint(d,[]),0,label)).toMatch(/^Add card 1: /);
 }
});

it('R2 P2-2: one wrong first card is repaired in one hinted edit on every registered beach and every School beach',()=>{
 const descriptors=[...crabPuzzles.map(p=>p.descriptor),...levels.filter(l=>!l.retired).map(level=>({level,budget:null,starter:[],lesson:''} as Descriptor))];
 for(const d of descriptors){
  const good=solution(d)!;
  for(const c of commands(d.level.pace).filter(c=>c!==good[0])){
   const wrong=[c,...good.slice(1)];if(execute(d,wrong).won)continue;
   const hint=nextHint(d,wrong);
   const fixed=apply(wrong,stepOf(hint,wrong));
   expect(execute(d,fixed).won,`${d.level.id} first card ${c}: ${hintText(hint,wrong.length,label)}`).toBe(true);
   expect(fixed.length).toBe(good.length);
  }
 }
});
it('R2 P2-2/P3-3: literal hints reach a card-optimal winner, one edit per hint, on bug starters and two-edit perturbations',()=>{
 for(const p of crabPuzzles.filter(p=>!p.retired)){
  const d=p.descriptor,good=solution(d)!;
  const starts=[d.starter.length?[...d.starter]:null,[...good].reverse(),good.slice(1),[...good.slice(0,2),...good]].filter((q):q is Command[]=>!!q&&!execute(d,q).won);
  for(const start of starts){
   let program=start,edits=0;const first=nextHint(d,program);
   const promised=distance(program,first.plan);
   while(!execute(d,program).won&&edits<100){program=apply(program,stepOf(nextHint(d,program),program));edits++;}
   // The crab stops at home, so a win can come one edit early with unused cards left over.
   expect(execute(d,program).won,p.title).toBe(true);expect(edits).toBeLessThanOrEqual(promised);expect(edits).toBeGreaterThanOrEqual(promised-1);expect(execute(d,program).cursor).toBe(good.length);
  }
 }
});
function distance(a:readonly Command[],b:readonly Command[]){const dp=Array.from({length:a.length+1},(_,i)=>Array.from({length:b.length+1},(_,j)=>i+j));for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return dp[a.length][b.length];}

it('R2 P2-3: two hinted steps keep a help-welcome dare open; a third step or the whole plan keeps only the finish',()=>{
 const p=find('Winding shore'),dare=p.dares.find(d=>!d.retired&&d.help==='allowed'&&d.rule.kind==='plan')!;
 const run=(stepped:number)=>{
  let s=registration.start(p.ref,'a','steps',emptyChallenge(),{...options,supportOff:true},[dare.slot]),program:Command[]=[];
  for(let i=0;i<stepped;i++){s=registration.move(s,['h'])!;const edit=stepOf(nextHint(p.descriptor,program),program);program=apply(program,edit);s=add(s,[edit.card!]);}
  s=add(s,solution(p.descriptor)!.slice(program.length));s=registration.move(s,['g'])!;
  expect(s.result?.event).toBe('helped');return s.result!.dares;
 };
 expect(run(2)).toEqual([dare.slot]);expect(run(3)).toEqual([]);
 expect(registration.dareHelp).toContain('two steps');expect(registration.dareHelp).toContain('A third step, or the whole plan');
});
it('R2 P2-3: stepwise help from an empty plan earns none of the help-welcome dares',()=>{
 for(const p of crabPuzzles.filter(p=>p.source.kind==='school'))for(const dare of p.dares.filter(d=>!d.retired&&d.help==='allowed')){
  let s=registration.start(p.ref,'a','stepwise',emptyChallenge(),{...options,supportOff:dare.rule.kind==='blind'||dare.rule.kind==='plan'},[dare.slot]),program:Command[]=[];
  while(!execute(p.descriptor,program).won){s=registration.move(s,['h'])!;const edit=stepOf(nextHint(p.descriptor,program),program);program=apply(program,edit);s=edit.op==='insert'&&edit.at===program.length-1?add(s,[edit.card!]):registration.move(s,edit.op==='remove'?['x',edit.at]:[edit.op==='insert'?'i':'r',edit.at,cardCodes.indexOf(edit.card!)] as Action)!;}
  s=registration.move(s,['g'])!;expect(s.result?.event).toBe('helped');
  if(program.length>2)expect(s.result?.dares,`${p.title} ${dare.label}`).toEqual([]);
 }
});

it('R2 P2-4: every registered puzzle hears its own lesson, and School beaches have none',()=>{
 for(const p of crabPuzzles){
  const key=lessonAudio(p.descriptor.lesson);
  if(p.source.kind==='school'||p.retired)expect(key,p.title).toBeUndefined();
  else{expect(key,p.title).toBeDefined();expect((speech as Record<string,string>)[key!]).toBe(p.descriptor.lesson);}
 }
 expect(new Set(crabPuzzles.flatMap(p=>lessonAudio(p.descriptor.lesson)??[])).size).toBe(11);
});

it('R2 P3-1: retired legacy Mud entries keep their own certified walking minimum as par',()=>{
 for(const [j,i] of [2,5].entries()){
  const legacy=crabPuzzles.find(p=>p.retired&&p.ref.bank===9&&p.ref.puzzle===i)!;
  expect(legacy.par).toEqual({metric:'steps',lower:legacyMud[j].minimumSteps,upper:legacyMud[j].minimumSteps});
 }
});
it('R2 P3-6: a retired dare cannot be started',()=>{
 const p=crabPuzzles.find(p=>p.dares.some(d=>d.retired))!,retired=p.dares.find(d=>d.retired)!;
 expect(()=>registration.start(p.ref,'a','retired',emptyChallenge(),options,[retired.slot])).toThrow();
});
it('R2: Crab praise names the real outcome',()=>{
 const p=find('Fix a bug 1'),text=registration.completionText!;
 const result={event:'independent' as const,awards:3,dares:[],cost:11,solution:null};
 expect(text(p.ref,result,{helpUsed:false,failed:false})).toBe('You found the bug and fixed it.');
 expect(text(p.ref,{...result,event:'helped'},{helpUsed:true,failed:false})).toBe('You used help and guided the crab home.');
 expect(text(p.ref,{...result,event:'helped'},{helpUsed:false,failed:true})).toBe('You kept changing your plan until the crab got home.');
 expect(text(find('Mud 2').ref,result,{helpUsed:false,failed:false})).toBe('You found a route within the walking steps.');
});

it('R2 native finding: School board hints use only its own edits (take a card out, add at the end) and reach a card-optimal winner in the fewest',()=>{
 const winners=(d:Descriptor,L:number)=>{const cs=commands(d.level.pace),out:Command[][]=[];const walk=(q:Command[])=>{if(q.length===L){if(execute(d,q).won&&execute(d,q).cursor===L)out.push(q);return;}for(const c of cs)walk([...q,c]);};walk([]);return out;};
 const kept=(program:readonly Command[],w:readonly Command[])=>{let k=0;for(const c of program)if(k<w.length&&c===w[k])k++;return k;};
 let checked=0;
 for(const level of levels.filter(l=>!l.retired)){
  const d={level,budget:null,starter:[],lesson:''} as Descriptor,good=solution(d)!;if(good.length>7)continue;
  const all=winners(d,good.length);
  for(const c of commands(d.level.pace).filter(c=>c!==good[0])){
   let program=[c,...good.slice(1)];if(execute(d,program).won)continue;
   const fewest=Math.min(...all.map(w=>program.length+w.length-2*kept(program,w)));
   let edits=0;
   while(!execute(d,program).won&&edits<40){
    const h=nextHint(d,program,'append');expect(h.edit).toBeDefined();
    expect(h.edit!.op==='remove'||h.edit!.op==='insert'&&h.edit!.at===program.length,`${level.id}: ${hintText(h,program.length,label)}`).toBe(true);
    program=apply(program,h.edit!);edits++;
   }
   expect(execute(d,program).won,level.id).toBe(true);expect(edits,`${level.id} first card ${c}`).toBe(fewest);checked++;
  }
 }
 expect(checked).toBeGreaterThan(10);
});
