import { expect, it } from 'vitest';
import { cardCodes, challengeEngine as e, execute, nextHint, solution, type Action, type Descriptor } from '../src/learn/games/crab-commands/challenge-engine';
import { crabPuzzles, proofContent } from '../src/learn/games/crab-commands/challenge-content';
import { registration } from '../src/challenge/registrations/crab-commands';
import { emptyChallenge } from '../src/state/challenge';
const options={supportOff:false,ownRead:false};
it('P1-1: every bug hint names the repair operation and literal hints finish in the promised edits',()=>{
 for(const [i,p] of proofContent.debug.entries()){
  const d=p.descriptor as Descriptor;let program=[...d.starter];const expected=[['change',2],['insert',2],['remove',1],['change',0]][i];
  for(let n=0;n<(i===3?2:1);n++){
   const h=nextHint(d,program) as ReturnType<typeof nextHint>&{edit?:{op:string;at:number;card?:typeof program[number]}};
   expect(h.edit,`bug ${i+1}`).toBeDefined();if(n===0)expect([h.edit!.op,h.edit!.at]).toEqual(expected);
   const a=h.edit!;if(a.op==='remove')program.splice(a.at,1);else if(a.op==='insert')program.splice(a.at,0,a.card!);else program[a.at]=a.card!;
  }expect(execute(d,program).won).toBe(true);
 }
});
it('P1-2: Go completes atomically, tick is not an action, and a full attempt can restart with its plan',()=>{
 const p=crabPuzzles.find(p=>p.title.startsWith('Mud 6'))!;let s=registration.start(p.ref,'a','capacity',emptyChallenge(),options,[]);
 const good=solution(p.descriptor)!,wrong=[...good];wrong[wrong.length-1]='turn-left';
 for(const c of wrong)s=registration.move(s,['a',cardCodes.indexOf(c)])!;
 let accepted=0;for(let i=0;i<600;i++){const n=registration.move(s,['g']);if(!n)break;s=n;accepted++;expect(e.inspect(replay(s),p.descriptor).solved).toBe(false);expect(replay(s).running).toBe(false);}
 expect(accepted).toBeGreaterThan(100);expect(e.validAction(['t'])).toBe(false);
 const fresh=registration.restart;
 expect(fresh).toBeTypeOf('function');const next=fresh!(s,'fresh',emptyChallenge());expect(replay(next).program).toEqual(wrong);expect(next.id).toBe('fresh');
 let fixed=registration.move(next,['r',good.length-1,cardCodes.indexOf(good.at(-1)!)])!;fixed=registration.move(fixed,['g'])!;expect(fixed.result).not.toBeNull();
});
function replay(s:ReturnType<typeof registration.start>){const p=crabPuzzles.find(p=>p.ref.bank===s.puzzle.bank&&p.ref.puzzle===s.puzzle.puzzle)!,payload=s.payload as {actions:Action[]};let st=e.create(p.descriptor,{version:1},options);for(const a of payload.actions)st=e.step(st,a,p.descriptor)!.state;return st;}
it('P2-2: copying a full-plan hint cannot earn a stretch dare; run dares disable footprints',()=>{
 for(const p of crabPuzzles.filter(p=>p.source.kind==='school'))for(const dare of p.dares.filter(d=>!d.retired)){
  let s=registration.start(p.ref,'a','dare',emptyChallenge(),{...options,supportOff:dare.rule.kind==='blind'||dare.rule.kind==='plan'},[dare.slot]);
  for(let i=0;i<3;i++)s=registration.move(s,['h'])!;
  for(const c of solution(p.descriptor)!)s=registration.move(s,['a',cardCodes.indexOf(c)])!;
  s=registration.move(s,['g'])!;
  expect(s.result?.event).toBe('helped');expect(s.result?.dares).toEqual([]);
 }
});
it('P2-3: Mud par is the proved minimum walking cost',()=>{for(const p of crabPuzzles.filter(p=>p.title.startsWith('Mud')&&!p.retired)){const proof=proofContent.mud.find(m=>m.descriptor.level.id===p.descriptor.level.id)!;expect(p.par?.upper).toBe(proof.minimumSteps);}});
it('P2-4: card-count dares say what they count and allow two extra arrows',()=>{for(const p of crabPuzzles.filter(p=>p.source.kind==='school')){const d=p.dares[1];if(d.rule.kind==='par'){expect(d.label).not.toBe('No extra turns');if(p.descriptor.level.pace==='easy'){expect(d.label).toBe('Two extra cards at most');expect(d.rule.max).toBe(solution(p.descriptor)!.length+2);}}}});
it('P2-5: Mud develops, then a short budget trade-off, and ends easy',()=>{
 const [,_two,three,,,hard,easy]=proofContent.mud;expect(execute(three.descriptor as Descriptor,_two.witness as never[]).won).toBe(false);
 expect(hard.cards).toBeGreaterThanOrEqual(8);expect(hard.cards).toBeLessThanOrEqual(10);
 const shortest=solution({...hard.descriptor,budget:null} as Descriptor)!;expect(execute(hard.descriptor as Descriptor,shortest).won).toBe(false);
 expect(crabPuzzles.find(p=>p.title.startsWith('Mud 7'))?.tier).toBe(1);expect(easy.cards).toBeLessThan(hard.cards);
});
it('P3-2: idle Reset is refused without spending a bug edit',()=>{const d=proofContent.debug[0].descriptor as Descriptor,s=e.create(d,{version:1},options);expect(e.step(s,['z'],d)).toBeNull();});
it('P3-4: beach names are authored without internal IDs',()=>{for(const p of crabPuzzles.filter(p=>p.source.kind==='school'))expect(p.title).not.toMatch(/Beach (ea|eb|e|mb|m|hb|h)\d/);});
it('P2-2: planning dare launch forces footprints off and rejects a forged visible-footprints replay',()=>{
 for(const p of crabPuzzles)for(const dare of p.dares.filter(d=>d.rule.kind==='plan')){
  const s=registration.start(p.ref,'a','blind-plan',emptyChallenge(),options,[dare.slot]);const payload=s.payload as {options:typeof options};expect(payload.options.supportOff).toBe(true);
  expect(registration.catalog.codecs.get(s.codec)!.validate({...s,payload:{...payload,options}})).toBe(false);
 }
});
it('P1-2: a fresh saved attempt preserves an 80-card plan, help evidence, and the original bytes',()=>{
 const p=crabPuzzles.find(p=>p.title.startsWith('Mud 6'))!;let s=registration.start(p.ref,'a','old',emptyChallenge(),options,[]);
 for(let i=0;i<80;i++)s=registration.move(s,['a',5])!;for(let i=0;i<3;i++)s=registration.move(s,['h'])!;
 const before=JSON.stringify(s),fresh=registration.restart!(s,'new',{...emptyChallenge(),nextOrdinal:2});
 expect(registration.catalog.codecs.get(s.codec)!.canStart(fresh)).toBe(true);expect(replay(fresh).program).toEqual(replay(s).program);expect(replay(fresh).fullPlanShown).toBe(true);expect(JSON.stringify(s)).toBe(before);expect(fresh.revision).toBe(0);
});
it('keeps the retired Tide 6 signal context valid',()=>{expect(registration.catalog.contexts.has('crab-6')).toBe(true);});
