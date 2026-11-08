import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { emptySave, parseSave, MAX_SAVE_BYTES } from '../src/state/validation';
import { migrateProfiles, encodeSave, projectProfile } from '../src/state/profiles';
import { addLearner, selectLearner } from '../src/learn/learners';
import { addCovePerson, removeCovePerson, validCove } from '../src/state/covePeople';
import { base64, jsonBytes, pack, unbase64, unpack } from '../src/state/saveBits';
import { complete, creditProgress, emptyChallenge, mergeCompletion, validChallengeProgress, validChallengeSession, type Completion } from '../src/state/challenge';
import { challengeTransition, finishChallenge, parseDraft, recoverChallengeDrafts, type ChallengeExpected } from '../src/state/challengeDrafts';
import { checkpointAudit, checkpointEdit, newCheckpoint, validCheckpoint } from '../src/state/checkpoint';
import { fixtureCatalog, installFixture, moved, session } from './helpers/save-contract';
installFixture();
const fresh=()=>migrateProfiles({...emptySave(),learning:addLearner(undefined,'A','a')});
const expected=(s:ReturnType<typeof session>,epoch=1):ChallengeExpected=>({epoch,owner:s.owner,game:s.game,id:s.id,revision:s.revision});
const start=(save=fresh(),s=session('a'))=>challengeTransition(save,s,{...expected(s),id:null,revision:null},1);
const folder='tests/fixtures/save-v3/';
const receipt=JSON.parse(readFileSync(folder+'RECEIPT.json','utf8')) as {files:Record<string,{bytes:number;sha256:string}>};
for(const [file,metadata] of Object.entries(receipt.files)) it(`frozen ${file} validates and migrates immutably with every legacy slot preserved`,()=>{
 const raw=readFileSync(folder+file,'utf8');expect(Buffer.byteLength(raw)).toBe(metadata.bytes);expect(createHash('sha256').update(raw).digest('hex')).toBe(metadata.sha256);
 const original=parseSave(raw),snapshot=JSON.stringify(original),next=migrateProfiles(original);expect(JSON.stringify(original)).toBe(snapshot);expect(migrateProfiles(next)).toEqual(next);
 expect(next.version).toBe(3);expect(next.profiles?.version).toBe(2);expect(parseSave(encodeSave(next))).toEqual(next);
 for(const [id,p] of Object.entries(next.profiles!.people)){
  expect(p.challenge).toEqual(emptyChallenge());
  const previous=original.profiles?.people[id];if(previous)for(const field of ['learn','sessions','activities','board','school'] as const)expect(p[field]).toEqual(previous[field]);
 }
 expect(next.personalization).toEqual(original.personalization);expect(next.library).toEqual(original.library);expect(Buffer.byteLength(encodeSave(next))).toBeLessThan(MAX_SAVE_BYTES);
});
it('v3 projection is not duplicated, no forced downgrade, legacy/future namespaces fail closed',()=>{
 const save=fresh(),raw=JSON.parse(encodeSave(save));expect(raw.challenge).toBeUndefined();expect(raw.profiles.people.a.challenge).toEqual(emptyChallenge());
 for(const patch of [{version:4},{version:2},{saveRevision:null},{cove:null},{challenge:emptyChallenge()}])expect(()=>parseSave(JSON.stringify({...raw,...patch}))).toThrow();
 expect(JSON.parse(encodeSave({...save,version:2})).version).toBe(2);expect(()=>parseSave(encodeSave({...save,version:2}))).toThrow();
});
it('canonical bits round trip across byte boundaries and reject aliases/padding/reserved codes',()=>{
 for(const width of [1,2,3,6,13])for(const n of [0,1,7,81,625,1024]){const values=Array.from({length:n},(_,i)=>i%(2**width));expect(unpack(pack(values,width),n,width)).toEqual(values);}
 expect(unbase64('AB==',1)).toBeNull();expect(unbase64('AA',1)).toBeNull();expect(unpack('/w==',1,3)).toBeNull();
 const p={...emptyChallenge(),banks:[[0,pack(Array<number>(1024).fill(7),3),pack(Array<number>(1024).fill(0),2)]]};expect(validChallengeProgress(p,'family',fixtureCatalog)).toBe(false);
});
it('all seven completion codes implement the frozen event table and a monotonic join',()=>{
 const expectedEvents={opened:[1,1,2,3,4,5,6],helped:[2,2,2,4,4,5,6],together:[3,3,4,3,4,6,6],independent:[5,5,5,6,6,5,6]};
 for(let a=0;a<7;a++){
  for(const [event,table] of Object.entries(expectedEvents))expect(complete(a as Completion,event as keyof typeof expectedEvents)).toBe(table[a]);
  for(let b=0;b<7;b++)for(let c=0;c<7;c++){
   const x=a as Completion,y=b as Completion,z=c as Completion;
   expect(mergeCompletion(x,y)).toBe(mergeCompletion(y,x));expect(mergeCompletion(x,x)).toBe(x);expect(mergeCompletion(mergeCompletion(x,y),z)).toBe(mergeCompletion(x,mergeCompletion(y,z)));
  }
 }
});
it('every supported A/B award combination round trips at every completion code; helped replay never removes facts',()=>{
 for(let state=0;state<7;state++)for(let awards=0;awards<4;awards++){
  let p=emptyChallenge();const states=Array<number>(1024).fill(0);states[0]=state;const bits=Array<number>(1024).fill(0);bits[0]=state>=2?awards:0;
  p={...p,banks:[[0,pack(states,3),pack(bits,2)]]};expect(validChallengeProgress(JSON.parse(JSON.stringify(p)),'family',fixtureCatalog)).toBe(true);
  p=creditProgress(p,session().puzzle,{event:'independent',awards,dares:[],cost:4,solution:null},fixtureCatalog);
  const after=creditProgress(p,session().puzzle,{event:'helped',awards:0,dares:[],cost:8,solution:null},fixtureCatalog);
  expect(after.banks).toEqual(p.banks);expect(after.bests[0][2]).toBe(4);
 }
});
it('retains registered permanent marks while optional numeric best and recent rings evict',()=>{
 let p=creditProgress(emptyChallenge(),session().puzzle,{event:'independent',awards:3,dares:[0],cost:1,solution:null},fixtureCatalog);
 for(let i=1;i<400;i++)p=creditProgress(p,{...session().puzzle,puzzle:i},{event:'helped',awards:0,dares:[],cost:i,solution:null},fixtureCatalog);
 expect(p.bests).toHaveLength(256);expect(p.recent).toHaveLength(64);expect(p.bests.some(([b,i])=>b===0&&i===0)).toBe(false);expect(unpack(p.dares,4096,1)![0]).toBe(1);expect(unpack(p.banks[0][2],1024,2)![0]).toBe(3);expect(unpack(p.banks[0][1],1024,3)![0]).toBe(5);
});
it('rejects malformed refs, forged results, credited unfinished rounds, owners, schemas, real-time and unknown codecs',()=>{
 const s=session();expect(validChallengeSession(s,'family',fixtureCatalog)).toBe(true);
 const variants=[{owner:'a'},{version:2},{codec:'unknown'},{game:'lagoon-run'},{revision:-1},{ordinal:0},{credited:true},{extra:1},{payload:{}},{puzzle:{...s.puzzle,hash:'A'.repeat(64)}},{puzzle:{...s.puzzle,rules:2}},{result:{event:'independent',awards:3,dares:[],cost:0,solution:null}},{selectedDares:[0,0]},{partner:'family'}];
 for(const patch of variants)expect(validChallengeSession({...s,...patch},'family',fixtureCatalog)).toBe(false);
});
it('rejects invalid progress, unknown namespaces, excessive slots and nonzero unregistered bits',()=>{
 const p=emptyChallenge();const d=Array<number>(4096).fill(0);d[100]=1;
 for(const patch of [{version:2},{nextOrdinal:0},{extra:1},{dares:pack(d,1)},{signals:[['unknown','c',0,null,false]]},{choice:['unknown','endless',1]},{practice:[['save-proof',-1,0]]},{banks:[[512,'','']]},{recent:[[0,0],[0,0]]},{paused:[session()]},{solutions:[[0,0,'bad']]}])expect(validChallengeProgress({...p,...patch},'family',fixtureCatalog)).toBe(false);
});
it('Together credit is one atomic candidate for both survivors and never touches School or badges',()=>{
 const original=start(fresh(),{...session('a'),partner:'family',selectedDares:[0,5,6]});const old=original.challenge!.paused[0];
 const done=moved(old,{end:true,helped:true,awards:3,dares:[0,5,6]});const before=JSON.stringify(original);
 const after=finishChallenge(original,done,expected(old),1,fixtureCatalog);expect(after).not.toBe(original);expect(JSON.stringify(original)).toBe(before);
 for(const owner of ['a','family']){expect(unpack(after.profiles!.people[owner].challenge!.banks[0][1],1024,3)![0]).toBe(3);expect(after.profiles!.people[owner].school).toEqual(original.profiles!.people[owner].school);}
 expect(after.personalization).toEqual(original.personalization);expect(after.challenge!.paused[0].credited).toBe(true);expect(finishChallenge(after,done,expected(old),1,fixtureCatalog)).toBe(after);
 const soloPartner={...original,profiles:{...original.profiles!,people:{a:original.profiles!.people.a}}};expect(finishChallenge(soloPartner,done,expected(old),1,fixtureCatalog).challenge!.paused[0].credited).toBe(true);
});
it('independent-only dares cannot be forged by helped/Together results',()=>{
 for(const slot of [1,4,7]){const s={...session(),selectedDares:[slot]};const done=moved(s,{end:true,helped:true,dares:[slot]});expect(validChallengeSession(done,'family',fixtureCatalog)).toBe(false);expect(validChallengeSession({...done,partner:'a',result:{...done.result!,event:'together'}},'family',fixtureCatalog)).toBe(false);}
});
it('owner, epoch, revision, ordinal and ninth-slot guards reject stale writes without changing input',()=>{
 const s=session('a'),save=start(fresh(),s),next=moved(s),raw=encodeSave(save);
 for(const e of [{...expected(s),epoch:0},{...expected(s),owner:'family'},{...expected(s),id:'old'},{...expected(s),revision:9}])expect(challengeTransition(save,next,e,1,fixtureCatalog)).toBe(save);
 expect(challengeTransition(save,{...next,ordinal:9},expected(s),1,fixtureCatalog)).toBe(save);
 const switched=projectProfile(save,selectLearner(save.learning,'family'));expect(challengeTransition(switched,next,expected(s),1,fixtureCatalog)).toBe(switched);expect(encodeSave(save)).toBe(raw);
});
it('Cove people remain outside child pickers, cap at four, never allocate a house, and remove only themselves',()=>{
 let save=fresh();const before=JSON.stringify(save.profiles);
 for(let i=0;i<4;i++)save=addCovePerson(save,`Adult ${i}`,`cove-${i}`);
 expect(save.learning!.people).toHaveLength(2);expect(validCove(save.cove,save.learning!.people.map(p=>p.id))).toBe(true);expect(addCovePerson(save,'Fifth','cove-5')).toBe(save);expect(JSON.stringify(save.profiles)).toBe(before);expect(save.personalization).toBeUndefined();
 const next=removeCovePerson(save,'cove-2');expect(Object.keys(next.cove!.people)).toHaveLength(3);expect(next.profiles).toBe(save.profiles);expect(next.cove!.people['cove-1']).toBe(save.cove!.people['cove-1']);expect(parseSave(encodeSave(next)).cove).toEqual(next.cove);
});
it('recovers only newest exact-base drafts and preserves stale, malformed and owner-orphan originals',async()=>{
 const s=session('a'),save=start(fresh(),s),next=moved(s),row=JSON.stringify({version:1,base:save.saveRevision,session:next});const preserved:string[]=[];
 const stale=JSON.stringify({version:1,base:'old-base',session:next}),orphan=JSON.stringify({version:1,base:save.saveRevision,session:{...next,id:'different'}});
 const recovered=await recoverChallengeDrafts(save,{get:async()=>null,set:async()=>{},preserve:async raw=>{preserved.push(raw);},listRecovery:async()=>[],readRecovery:async()=>null,readDrafts:async()=>[row,stale,'{bad',orphan]},fixtureCatalog);
 expect(recovered.challenge!.paused[0]).toEqual(next);expect(preserved).toEqual([stale,'{bad',orphan]);expect(parseDraft(row,fixtureCatalog).session).toEqual(next);
 expect(save.challenge!.paused[0]).toEqual(s);
});
it('625-cell canonical paint draft accepts 1,200 edits while retaining only the newest 512 undo deltas and all audit events',()=>{
 let p=checkpointAudit(newCheckpoint('paint'),1);const cells=Array<number>(625).fill(0);
 for(let i=0;i<1200;i++){cells[i%625]=(i%3)+1;p=checkpointEdit(p,pack(cells,2),[i&255,(i>>>8)&255]);}
 expect(unpack(p.data,625,2)).toEqual(cells);expect(p.undoCount).toBe(512);expect(p.audit).toEqual([1]);expect(validCheckpoint(p)).toBe(true);expect(jsonBytes(p)).toBeLessThan(3900);
 const bytes=unbase64(p.undo,1024)!;expect(bytes.slice(0,2)).toEqual([688&255,688>>>8]);
});
it('max digit notes, table undo, and 200 pieces round trip in concrete bounded encodings',()=>{
 for(const kind of ['digits','table','pieces'] as const){let p=newCheckpoint(kind);const spec={digits:{undo:256,bytes:3},table:{undo:1024,bytes:2},pieces:{undo:256,bytes:5}}[kind];
  if(kind==='digits')p={...p,data:pack(Array<number>(81).fill(8191),13)};
  if(kind==='pieces')p={...p,data:base64(Array<number>(800).fill(255))};
  for(let i=0;i<spec.undo+1;i++)p=checkpointEdit(p,p.data,Array<number>(spec.bytes).fill(255));
  expect(validCheckpoint(JSON.parse(JSON.stringify(p)))).toBe(true);expect(p.undoCount).toBe(spec.undo);expect(jsonBytes(p)).toBeLessThan(4096);
 }
});

it('malformed checkpoint edits cannot erase assistance evidence through the registered transition guard',()=>{
 const initial=session('a'),save=start(fresh(),initial),helped=moved(initial,{helped:true});
 const accepted=challengeTransition(save,helped,expected(initial),1,fixtureCatalog);
 const forged=moved(helped,{helped:false});expect(challengeTransition(accepted,forged,expected(helped),1,fixtureCatalog)).toBe(accepted);
});
