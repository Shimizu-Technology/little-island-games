import { assertFrozenCatalog, catalogManifest } from '../src/state/catalogManifest';
import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { emptySave, parseSave, MAX_SAVE_BYTES } from '../src/state/validation';
import { migrateProfiles, encodeSave, projectProfile } from '../src/state/profiles';
import { addLearner, selectLearner } from '../src/learn/learners';
import { addCovePerson, removeCovePerson, validCove } from '../src/state/covePeople';
import { base64, jsonBytes, pack, unbase64, unpack } from '../src/state/saveBits';
import { complete, mergeProgressFacts, registerSaveContent, creditProgress, emptyChallenge, mergeCompletion, validChallengeProgress, validChallengeSession, type Completion } from '../src/state/challenge';
import { challengeTransition, finishChallenge, parseDraft, recoverChallengeDrafts, type ChallengeExpected } from '../src/state/challengeDrafts';
import { checkpointBudget, checkpointPaint, checkpointPaintUndo, checkpointAudit, checkpointEdit, newCheckpoint, validCheckpoint } from '../src/state/checkpoint';
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
it('P2-3 1,200 axis-locked strokes never refuse an edit, drop oldest whole strokes and undo exactly',()=>{
 let p=checkpointAudit(newCheckpoint('paint'),9999);
 for(let i=0;i<1200;i++)p=checkpointPaint(p,'row',i%25,0,25,i%4);
 expect(p.undoCount).toBe(512);expect(validCheckpoint(p)).toBe(true);expect(p.audit).toEqual([9999]);
 const latest=p.data;p=checkpointPaintUndo(p);expect(p.data).not.toBe(latest);expect(p.undoCount).toBe(511);
 // Adversarial prior values: every full-line stroke costs 9 bytes.
 p={...newCheckpoint('paint'),data:pack(Array.from({length:625},(_,i)=>(Math.floor(i/25)+i%25)%4),2),audit:Array(128).fill(9999)};
 const history:string[]=[];
 for(let i=0;i<1200;i++){
  history.push(p.data);
  const line=i%25;
  // Alternate full batches: every row/column sees 25 varied prior cells.
  const axis=Math.floor(i/25)%2?'column':'row';p=checkpointPaint(p,axis,line,0,25,line%4);
  expect(validCheckpoint(p)).toBe(true);
 }
 expect(p.undoCount).toBe(217);expect(jsonBytes(p)).toBeLessThan(3900);
 for(let i=1199;i>=1200-217;i--){p=checkpointPaintUndo(p);expect(p.data).toBe(history[i]);expect(p.audit).toEqual(Array(128).fill(9999));}
 expect(p.undoCount).toBe(0);
 expect(()=>checkpointAudit(p,10000)).toThrow();
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

it('per-bank merges union every completion code and award combination without changing working drafts',()=>{
 for(let a=0;a<7;a++)for(let b=0;b<7;b++)for(let marks=0;marks<4;marks++){
  const progress=(code:number,award:number)=>{const p=emptyChallenge(),states=Array<number>(1024).fill(0),awards=Array<number>(1024).fill(0);states[0]=code;awards[0]=code>=2?award:0;p.banks=[[0,pack(states,3),pack(awards,2)]];return p;};
  const left=progress(a,marks),right=progress(b,3^marks),merged=mergeProgressFacts(left,right,fixtureCatalog);
  expect(unpack(merged.banks[0][1],1024,3)![0]).toBe(mergeCompletion(a as Completion,b as Completion));
  expect(unpack(merged.banks[0][2],1024,2)![0]).toBe((a>=2?marks:0)|(b>=2?3^marks:0));expect(merged.paused).toBe(left.paused);
  expect(validChallengeProgress(merged,'family',fixtureCatalog)).toBe(true);
 }
});
it('registration rejects a real-time physics codec even if its structural validator claims it is persistable',()=>{
 const codec=fixtureCatalog.codecs.get('save-proof-v1')!;
 for(const game of ['lagoon-run','canoe-cargo']) expect(()=>registerSaveContent({banks:new Map(),codecs:new Map([['illegal-realtime-v1',{...codec,game}]]),dares:new Map(),contexts:new Set()})).toThrow(/codec/);
});

it('P2-1 empty dare bitmap is canonical empty text',()=>{expect(emptyChallenge().dares).toBe('');expect(validChallengeProgress({...emptyChallenge(),dares:''},'family',fixtureCatalog)).toBe(true);});
it('P2-4 solo can confirm Together at finish; nonexistent and ineligible partners are refused at start',()=>{
 const s=session('a'),save=start(fresh(),s),end=moved({...s,partner:'family'},{end:true});
 expect(finishChallenge(save,end,expected(s),1,fixtureCatalog)).not.toBe(save);
 const ghost={...session('a'),partner:'ghost'};expect(start(fresh(),ghost).challenge!.paused).toEqual([]);
});
it('P2-5 moving validates only the changed session, not every paused engine',()=>{
 const s=session('a'),save=start(fresh(),s);let calls=0;const codec=fixtureCatalog.codecs.get(s.codec)!;
 const catalog={...fixtureCatalog,codecs:new Map([[s.codec,{...codec,validate:(v:typeof s)=>{calls++;return codec.validate(v);}}]])};
 expect(challengeTransition(save,moved(s),expected(s),1,catalog)).not.toBe(save);expect(calls).toBe(1);
});
it('P2-7/P3-3 identical immutable registration is repeatable and reorder/length/hash changes fail',()=>{
 expect(()=>registerSaveContent(fixtureCatalog,catalogManifest(fixtureCatalog))).not.toThrow();
 const b=fixtureCatalog.banks.get(0)!;
 for(const entries of [[...b.entries].reverse(),[...b.entries,{ordinal:100000,hash:'c'.repeat(64)}],b.entries.map((e,i)=>i?e:{...e,hash:'c'.repeat(64)})])expect(()=>registerSaveContent({...fixtureCatalog,banks:new Map([[0,{...b,entries}]])})).toThrow();
});
it('P3-8 oversized context IDs cannot be registered',()=>{expect(()=>registerSaveContent({banks:new Map(),codecs:new Map(),dares:new Map(),contexts:new Set(['x'.repeat(80)])})).toThrow(/context/);});

it('P2-7 a committed slot is immutable across builds even before runtime registration',()=>{
 const frozen=catalogManifest(fixtureCatalog), b=frozen.banks[0];
 for(const entries of [[...b.entries,{ordinal:100000,hash:'c'.repeat(64)}],[...b.entries].reverse(),b.entries.map((e,i)=>i?e:{...e,hash:'c'.repeat(64)})])expect(()=>assertFrozenCatalog(frozen,{...frozen,banks:[{...b,entries}]})).toThrow(/Immutable/);
 expect(()=>registerSaveContent(fixtureCatalog,{version:1,banks:[],dares:[],contexts:[]})).toThrow(/Immutable/);
});
it('P2-3 codecs must declare wrapper plus draft plus undo plus full audit within 4096',()=>{
 const codec=fixtureCatalog.codecs.get('save-proof-v1')!;
 expect(()=>registerSaveContent({banks:new Map(),codecs:new Map([['over-budget',{...codec,budget:{wrapper:800,draft:800,undo:2600,audit:641}}]]),dares:new Map(),contexts:new Set()})).toThrow(/codec/);
});

it('P2-6 new frozen fixtures pin advanced rounds, Reef, rewards, Library and earlier work; whole legacy object matches shipped migration',()=>{
 const receipt=JSON.parse(readFileSync(folder+'FIX_RECEIPT.json','utf8')) as {files:Record<string,{bytes:number;sha256:string}>};
 for(const [file,metadata] of Object.entries(receipt.files)){const raw=readFileSync(folder+file,'utf8');expect(Buffer.byteLength(raw)).toBe(metadata.bytes);expect(createHash('sha256').update(raw).digest('hex')).toBe(metadata.sha256);expect(()=>parseSave(raw)).not.toThrow();}
 const before=parseSave(readFileSync(folder+'fix-advanced-envelope-2.json','utf8')),next=migrateProfiles(before);
 const legacy=structuredClone(next);legacy.version=2;legacy.profiles!.version=1;delete legacy.saveRevision;delete legacy.cove;delete legacy.challenge;for(const p of Object.values(legacy.profiles!.people))delete p.challenge;
 const shipped=parseSave(readFileSync(folder+'fix-advanced-shipped-migration-2.json','utf8'));
 expect(legacy).toEqual(shipped);
 for(const [owner,p] of Object.entries(before.profiles!.people)){
  expect(Object.values(p.learn!).every(r=>r!.revision>0)).toBe(true);
  expect(before.arcade!.people[owner].session!.state.board.some(Boolean)).toBe(true);expect(p.wordRecords!.wins).toBeGreaterThan(0);expect(Object.keys(p.raceRecords!)).not.toHaveLength(0);expect(Object.keys(p.school!)).not.toHaveLength(0);
  expect(before.personalization!.people[owner].earned.length).toBeGreaterThan(0);
 }
 expect(before.library!.profiles.family.creations.length).toBeGreaterThan(0);expect(Object.keys(before.profiles!.unassigned.rounds.sessions)).not.toHaveLength(0);
 expect(Buffer.byteLength(readFileSync(folder+'fix-last-bytes-2.json','utf8'))).toBeGreaterThan(1999980);
});

it('P2-3 full paint/table/digit/piece rings plus all 128 audit events fit the session using measured wrapper bounds',()=>{
 for(const kind of ['paint','table','digits','pieces','cells','letters','edges'] as const){
  let cp=newCheckpoint(kind);const spec={table:[1024,2],digits:[256,3],pieces:[256,5],cells:[256,2],letters:[256,2],edges:[256,2]}[kind as 'table'];
  if(kind==='paint')for(let i=0;i<512;i++)cp=checkpointPaint(cp,'row',i%25,0,25,i%4);
  else for(let i=0;i<spec[0];i++)cp=checkpointEdit(cp,cp.data,Array(spec[1]).fill(255));
  for(let i=0;i<128;i++)cp=checkpointAudit(cp,9999);
  const s={...session(),payload:{...session().payload as object,checkpoint:cp}};
  const wrapper=jsonBytes(s)-jsonBytes(cp),budget=checkpointBudget(kind,wrapper);
  expect(Object.values(budget).reduce((a,b)=>a+b,0),kind).toBeLessThanOrEqual(4096);expect(jsonBytes(s),kind).toBeLessThanOrEqual(4096);
 }
});

it('P3-2 punctuation in game IDs uses the same code-unit ordering as validation',()=>{
 const names=['proof:game','proof_game'];
 const codec=fixtureCatalog.codecs.get('save-proof-v1')!;
 const catalog={banks:new Map(names.map((game,i)=>[i,{...fixtureCatalog.banks.get(0)!,slot:i,engine:game,entries:[{ordinal:i,hash:'a'.repeat(64)}],awards:[3]}])),codecs:new Map(names.map((game,i)=>[`proof-codec-${i}`,{...codec,game}])),dares:new Map(),contexts:new Set<string>()};
 let save=fresh();for(const [i,game] of names.entries()){
  const s={...session('a',`punctuation-${i}`,i+1),game,codec:`proof-codec-${i}`,puzzle:{...session().puzzle,bank:i,engine:game}};
  save=challengeTransition(save,s,{...expected(s),id:null,revision:null},1,catalog);
 }
 expect(save.challenge!.paused.map(s=>s.game)).toEqual(names);expect(validChallengeProgress(save.challenge,'a',catalog)).toBe(true);
});
it('P2-4 a Cove-only name cannot start or be confirmed for a School-only bank',()=>{
 const s=session('a'),base=addCovePerson(fresh(),'Adult','cove-test');
 const catalog={...fixtureCatalog,banks:new Map([[0,{...fixtureCatalog.banks.get(0)!,cove:false}]])};
 const partnered={...s,partner:'cove-test'};expect(challengeTransition(base,partnered,{...expected(s),id:null,revision:null},1,catalog)).toBe(base);
 const playing=challengeTransition(base,s,{...expected(s),id:null,revision:null},1,catalog);
 expect(finishChallenge(playing,moved(partnered,{end:true}),expected(s),1,catalog)).toBe(playing);
});
