import { expect, it, vi } from 'vitest';
import { challengeEngine, solution, type Payload } from '../src/learn/games/crab-commands/challenge-engine';
import { crabPuzzles } from '../src/learn/games/crab-commands/challenge-content';
import { crabProgram } from '../src/learn/games/crab-commands/program';
import { programOperations } from '../src/learn/program/operations';
import { encodeProgram } from '../src/learn/program/codec';
import { validProgram } from '../src/learn/program/model';
import { compress, solvePrograms } from '../src/learn/program/solver';
const options = { supportOff:false, ownRead:false };
it('published content refuses nested-wrap attacks on all seven live card-limit dares', () => {
 let checked=0;
 for(const p of crabPuzzles.filter(p=>p.ref.bank===7&&!p.retired&&p.dares.some(d=>!d.retired&&d.rule.kind==='par'&&d.rule.metric==='cards'))) {
  checked++;
  const route=solution(p.descriptor)!;
  const body=crabProgram(route).body;
  const nested={version:1 as const,songs:[],body:[{kind:'repeat' as const,times:2,body}]};
  const s=challengeEngine.create(p.descriptor,{version:1},options);
  expect(challengeEngine.validAction(['b',encodeProgram(nested)])).toBe(false);
  expect(challengeEngine.step(s,['e',programOperations(crabProgram(p.descriptor.starter),nested)],p.descriptor),p.descriptor.level.id).toBeNull();
 }
 expect(checked).toBe(7);
});
it('conditions require an explicit known sensor tag',()=>{
 expect(validProgram({version:1,body:[{kind:'if',yes:[],no:[]}],songs:[]})).toBe(false);
 expect(validProgram({version:1,body:[{kind:'if',condition:{kind:'blocked'},yes:[],no:[]}],songs:[]})).toBe(true);
 expect(validProgram({version:1,body:[{kind:'if',condition:{kind:'invented'},yes:[],no:[]}],songs:[]})).toBe(false);
});
it('compression handles a 64-command witness and bounded search retains a found winner',()=>{
 expect(compress(Array.from({length:64},(_,i)=>i%2))).not.toBeNull();
 const p=crabProgram(['right']);const work=solvePrograms([p,p],0,{step:n=>n+1,blocked:()=>false},n=>n===1,1);let r=work.next();while(!r.done)r=work.next();
 expect(r.value).toMatchObject({status:'budget-exhausted',program:p,cost:1});
});

it('opted-in Crab card-limit dares count the expanded route, including detours', async()=>{
 const {start,step,commands}=await import('../src/learn/games/crab-commands/engine');
 const {execute}=await import('../src/learn/games/crab-commands/challenge-engine');
 const {nodeCost}=await import('../src/learn/program/model');
 const reverse={up:'down',down:'up',left:'right',right:'left'} as const;
 for(const p of crabPuzzles.filter(p=>p.ref.bank===7&&!p.retired&&p.dares.some(d=>!d.retired&&d.rule.kind==='par'&&d.rule.metric==='cards'))){
  const d={...p.descriptor,blockEditor:true},witness=solution(d)!;
  const cycle=d.level.pace==='easy'?(()=>{const first=commands('easy').find(c=>!step(d.level,start(d.level),c).bump) as keyof typeof reverse;return [first,reverse[first]];})():Array(4).fill('turn-right');
  const route=[...cycle,...cycle,...cycle,...witness] as typeof witness;
  const nested=compress(crabProgram(route).body.map(n=>n.kind==='command'?n.command:0))!;
  expect(nodeCost(nested)).toBeLessThan(route.length);
  const initial=challengeEngine.create(d,{version:1},options);
  const edited=challengeEngine.step(initial,['e',programOperations(crabProgram(d.starter),nested)],d)!.state;
  const won=challengeEngine.step(edited,['g'],d)!.state;
  expect(won.won).toBe(true);
  expect(challengeEngine.inspect(won,d).metrics.cards).toBe(execute(d,route).cursor);
  const dare=p.dares.find(x=>x.rule.kind==='par'&&x.rule.metric==='cards')!;
  expect(challengeEngine.inspect(won,d).metrics.cards).toBeGreaterThan(dare.rule.kind==='par'?dare.rule.max:0);
 }
});

it('a 13-card beach fits over 100 compact edits; full measures the refused action and restart keeps nesting and audit',async()=>{
 const {registration}=await import('../src/challenge/registrations/crab-commands');
 const {emptyChallenge,validChallengeSession}=await import('../src/state/challenge');
 const {decodeProgram,sessionBytes}=await import('../src/learn/program/codec');
 const p=crabPuzzles.find(p=>p.ref.bank===7&&p.descriptor.level.id==='m2')!;
 p.descriptor.blockEditor=true;
 try{
  const witness=crabProgram(solution(p.descriptor)!),draft={...witness,body:[{kind:'repeat' as const,times:2,body:[witness.body[0]]},...witness.body.slice(1)]};
  let s=registration.start(p.ref,'family','compact-fixture',emptyChallenge(),options,[]);
  s=registration.move(s,['e',programOperations(crabProgram(p.descriptor.starter),draft)])!;expect(s).not.toBeNull();
  let accepted=0,current=draft;let refused:unknown;
  for(let i=0;i<512;i++){
   const next={...current,body:[{...current.body[0] as Extract<typeof draft.body[number],{kind:'repeat'}>,times:i%2?2:3},...current.body.slice(1)]};
   const action=['e',programOperations(current,next)];const moved=registration.move(s,action);
   if(!moved){refused=action;break;}s=moved;current=next;accepted++;
  }
  if(process.env.K7_FIX_EVIDENCE)console.info('m2 compact log',JSON.stringify({acceptedEdits:accepted,sessionBytes:sessionBytes(s)}));
  expect(accepted).toBeGreaterThan(100);expect(refused).toBeDefined();expect(registration.full!(s,refused)).toBe(true);
  expect(sessionBytes(s)).toBeLessThanOrEqual(4096);
  const snapshot=JSON.stringify(s),restarted=registration.restart!(s,'compact-restart',emptyChallenge());
  expect(JSON.stringify(s)).toBe(snapshot);expect(validChallengeSession(restarted,'family',registration.catalog)).toBe(true);
  const payload=restarted.payload as {initial:{draft:unknown};actions:unknown[]};
  expect(decodeProgram(payload.initial.draft)).toEqual(current);expect(payload.actions).toEqual([]);
  let old=challengeEngine.create(p.descriptor,(s.payload as Payload).initial,options);
  for(const action of (s.payload as Payload).actions)old=challengeEngine.step(old,action,p.descriptor)!.state;
  const fresh=challengeEngine.create(p.descriptor,payload.initial as Payload['initial'],options);
  expect(fresh.program).toEqual(old.program);expect(fresh.blockDraft).toEqual(old.blockDraft);
 }finally{delete p.descriptor.blockEditor;}
});

it('compact operations round trip moves, songs, branches and count changes; hostile paths cannot mutate input',async()=>{
 const {applyOperations,validOperations}=await import('../src/learn/program/operations');
 const {emptyProgram}=await import('../src/learn/program/model');
 const original=crabProgram(['right','left']);
 const next={version:1 as const,body:[{kind:'call' as const,song:0}],songs:[[{kind:'if' as const,condition:{kind:'blocked' as const},yes:[{kind:'repeat' as const,times:3,body:original.body}],no:[]}]]};
 expect(applyOperations(original,programOperations(original,next))).toEqual(next);
 expect(applyOperations(next,programOperations(next,original))).toEqual(original);
 expect(applyOperations(original,[[2,[-1,0],[-1,2]]])).toEqual(crabProgram(['left','right']));
 for(const bad of [[],[[1,[-1,-1]]],[[3,[-1,0],17]],[[0,[-1,0],[0,999]]],[[2,[-1,0],[-1,0,0,0]]]]){
  const copy=JSON.stringify(original);if(validOperations(bad))expect(applyOperations(original,bad)).toBeNull();expect(JSON.stringify(original)).toBe(copy);
 }
 expect(applyOperations(emptyProgram(),[[0,[-1,0],[2,2,[[0,1]]]]])).not.toBeNull();
});

it('drag hit regions clip to the plan viewport and edge scrolling never starts outside it',async()=>{
 const {clipped,edgeScroll}=await import('../src/learn/program/geometry');
 const viewport={x:10,y:100,width:200,height:140};
 expect(clipped({x:10,y:250,width:200,height:44},viewport)).toBeNull();
 expect(clipped({x:10,y:80,width:200,height:44},viewport)).toEqual({x:10,y:100,width:200,height:24});
 expect(edgeScroll(101,viewport)).toBeLessThan(0);expect(edgeScroll(239,viewport)).toBeGreaterThan(0);
 expect(edgeScroll(250,viewport)).toBe(0);expect(edgeScroll(170,viewport)).toBe(0);
});

it('block hints identify a nested block and repeat turn, rather than an invisible expanded card',async()=>{
 const {blockHint}=await import('../src/learn/program/hints');
 const frames=Array.from({length:6},(_,i)=>({path:'main.0.body.1',iteration:[Math.floor(i/2)]}));
 const text=blockHint({op:'change',at:4,card:'right'},frames,'Right');
 expect(text).toContain('plan, block 1, inside block 2');expect(text).toContain('repeat turn 3');expect(text).not.toContain('card 5');
});

it('existing School descriptors stay flat and an isolated fixture opts in additively',async()=>{
 const {levels}=await import('../src/learn/games/crab-commands/engine');
 const {bank}=await import('../src/learn/games/beep-bot/engine');
 const {task}=await import('../src/learn/games/turtle-draw/engine');
 expect(levels.every(l=>l.blockEditor===undefined)).toBe(true);
 expect(bank.flat().every(p=>p.puzzle.blockEditor===undefined)).toBe(true);
 for(let level=1;level<=5;level++)expect(task(level,0).blockEditor).toBeUndefined();
 vi.stubEnv('EXPO_PUBLIC_K7_FIXTURES','1');vi.resetModules();
 try{const {levels:fixtures}=await import('../src/learn/games/crab-commands/engine');expect(fixtures.find(l=>l.id==='k7-fixture')).toMatchObject({blockEditor:true,retired:true});expect(fixtures.filter(l=>l.id!=='k7-fixture').every(l=>l.blockEditor===undefined)).toBe(true);}
 finally{vi.unstubAllEnvs();vi.resetModules();}
});

it('Beep compact restart preserves nested structure, missed runs, edits and Help eligibility',async()=>{
 const {registration}=await import('../src/learn/games/beep-bot/challenge');
 const {beepPuzzles}=await import('../src/learn/games/beep-bot/challenge-content');
 const {challengeEngine:engine}=await import('../src/learn/games/beep-bot/challenge-engine');
 const {beepProgram}=await import('../src/learn/games/beep-bot/program');
 const {emptyChallenge,validChallengeSession}=await import('../src/state/challenge');
 const p=beepPuzzles[0];p.descriptor.blockEditor=true;
 try{
  let s=registration.start(p.ref,'family','beep-compact',emptyChallenge(),options,[]),current=beepProgram([]);
  const first={...current,body:[{kind:'repeat' as const,times:2,body:[{kind:'command' as const,command:0}]}]};
  s=registration.move(s,['e',programOperations(current,first)])!;current=first;
  s=registration.move(s,['g'])!;expect(s.result).toBeNull();s=registration.move(s,['h'])!;
  let count=0;for(let i=0;i<512;i++){
   const next={...first,body:[{...first.body[0],times:i%2?2:3}]};const action=['e',programOperations(current,next)];const moved=registration.move(s,action);
   if(!moved){expect(registration.full!(s,action)).toBe(true);break;}s=moved;current=next;count++;
  }
  if(process.env.K7_FIX_EVIDENCE)console.info('Beep compact log',JSON.stringify({acceptedEdits:count}));
  expect(count).toBeGreaterThan(100);
  const next=registration.restart!(s,'beep-continued',emptyChallenge());expect(validChallengeSession(next,'family',registration.catalog)).toBe(true);
  const payload=next.payload as import('../src/learn/games/beep-bot/challenge-engine').Payload;
  expect(payload.initial.prior).toMatchObject({runs:1,failed:true,hints:1});
  const state=engine.create(p.descriptor,payload.initial,options);expect(state.blockDraft).toEqual(encodeProgram(current));
  expect(state.edits).toBeGreaterThan(100);expect(engine.inspect(state,p.descriptor).dareEligible).toBe(false);
 }finally{delete p.descriptor.blockEditor;}
});
