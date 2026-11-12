import type { InlineBank } from '../src/state/bankFacts';
import { catalogManifest } from '../src/state/catalogManifest';
import { expect, it, vi } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { registerSaveContent, emptyChallenge, validChallengeProgress, type ChallengeProgress, type ChallengeSession, type SaveCatalog } from '../src/state/challenge';
import { jsonBytes, pack, base64, plain } from '../src/state/saveBits';
import { checkpointPaint, checkpointKinds, newCheckpoint, checkpointEdit, validCheckpoint, type CheckpointKind } from '../src/state/checkpoint';
import { encodeSave, migrateProfiles, projectProfile } from '../src/state/profiles';
import { addCovePerson } from '../src/state/covePeople';
import { parseSave, MAX_SAVE_BYTES } from '../src/state/validation';
import { newLibraryChild, validLibraryData } from '../src/library/state';
import { instance, validHome, type HomeStateV2 } from '../src/home/model';
import { HOME_UNDO_BYTES, HOME_UNDO_STEPS, undoBytes } from '../src/home/undoHistory';
// Capacity fixtures occupy bank slots 312–511 and every dare slot; isolate them from the shipped registrations.
vi.mock('../src/arcade/dares',async original=>({...await original<typeof import('../src/arcade/dares')>(),arcadeDareCatalog:()=>({banks:new Map(),dares:new Map(),codecs:new Map(),contexts:new Set()})}));
vi.mock('../src/challenge/registry.generated', () => ({ challengeEntries: [] }));
const hash='b'.repeat(64);
const banks:InlineBank[]=[];let ordinal=0;
// 54,000 Cove entries + 8,647 School entries; exactly 62,647 entries, not an all-ones invalid bitmap.
for(let i=0;i<200;i++){
 const count=i===179||i===199?1024:i<4?119:i<180?300:i<183?237:432;
 banks.push({slot:i+312,engine:`capacity-${i%8}-`+'x'.repeat(69),rules:1,cove:i<180,entries:Array.from({length:count},()=>({ordinal:ordinal++,hash})),awards:Array<number>(count).fill(3)});
}
const catalog:SaveCatalog={banks:new Map(banks.map(b=>[b.slot,b])),codecs:new Map(Array.from({length:8},(_,i)=>[`capacity-${i}-v1`,{game:`capacity-${i}-`+'x'.repeat(69),cove:true,budget:{wrapper:700,draft:3396,undo:0,audit:0},validate:(s:ChallengeSession)=>i===7?typeof s.payload==='string'&&s.payload.length<=4096:plain(s.payload)&&validCheckpoint(s.payload.checkpoint)&&typeof s.payload.padding==='string',evaluate:()=>null,canStart:()=>true,extends:()=>true}])),dares:new Map(Array.from({length:4096},(_,i)=>[i,{kind:'pick-up' as const,help:'allowed' as const,bank:312,puzzle:0}])),contexts:new Set(Array.from({length:64},(_,i)=>`ctx-${i}-`+'x'.repeat(16-(`ctx-${i}-`).length)))};
registerSaveContent(catalog,catalogManifest(catalog));
const kinds=Object.keys(checkpointKinds) as CheckpointKind[];
function largest(kind:CheckpointKind){let p=newCheckpoint(kind);const spec=checkpointKinds[kind];p={...p,data:spec.bits?pack(Array<number>(spec.cells).fill(2**spec.bits-1),spec.bits):base64(Array<number>(800).fill(255))};for(let i=0;i<spec.undo;i++)p=kind==='paint'?checkpointPaint(p,'row',i%25,0,25,i%4):checkpointEdit(p,p.data,Array<number>(spec.deltaBytes).fill(255));return p;}
function paused(owner:string,i:number):ChallengeSession{
 const s:ChallengeSession={version:1,owner,game:`capacity-${i}-`+'x'.repeat(69),id:`${owner}-${i}-`+'x'.repeat(100-(`${owner}-${i}-`).length),ordinal:2147483639+i,revision:2147483647,puzzle:{bank:312+i,puzzle:0,engine:`capacity-${i}-`+'x'.repeat(69),rules:1,hash},codec:`capacity-${i}-v1`,payload:i===7?'':{checkpoint:largest(kinds[i]),padding:''},selectedDares:[],partner:null,result:null,credited:false};
 const padding='p'.repeat(4096-jsonBytes(s));if(i===7)s.payload=padding;else(s.payload as {padding:string}).padding=padding;
 expect(jsonBytes(s)).toBe(4096);return s;
}
function dense(owner:string,cove=false):ChallengeProgress{
 const included=banks.filter(b=>!cove||b.cove),last=included.at(-1)!;return {...emptyChallenge(cove),banks:included.map(b=>[b.slot,pack(Array<number>(b.entries.length).fill(6),3),pack(Array<number>(b.entries.length).fill(3),2)]),dares:cove?'':pack(Array<number>(4096).fill(1),1),nextOrdinal:2147483647,paused:Array.from({length:cove?4:8},(_,i)=>paused(owner,i)),bests:Array.from({length:cove?128:256},(_,i)=>[last.slot,1023-i,0xffffffff]),signals:Array.from({length:cove?8:32},(_,i)=>[[...catalog.contexts][i],'chfcf',999,'hard',true]),recent:Array.from({length:cove?32:64},(_,i)=>[last.slot,1023-i]),cursors:Array.from({length:cove?64:128},(_,i)=>[included[included.length-1-i].slot,0xffffffff]),practice:Array.from({length:cove?16:64},(_,i)=>[[...catalog.contexts][i],0xffffffff,0xffffffff]),solutions:Array.from({length:cove?16:32},(_,i)=>[last.slot,1023-i,hash]),choice:[banks[0].engine,'endless',6]};
}
/** Five dense learners, four dense adults and a full Library: the supported capacity envelope. */
function denseSave(){
 const frozen=parseSave(readFileSync('tests/fixtures/save-v3/main-envelope-2.json','utf8'));let save=migrateProfiles(frozen);
 for(const p of save.learning!.people)save.profiles!.people[p.id].challenge=dense(p.id);
 save=projectProfile(save);
 for(let i=0;i<4;i++){save=addCovePerson(save,`Adult ${i}`,`cove-${i}`);save.cove!.people[`cove-${i}`].challenge=dense(`cove-${i}`,true);}
 // 16 drawings for each learner, inside the real Library validator. Fill remaining bytes with allowed geometry.
 const child=newLibraryChild();child.creations=Array.from({length:16},(_,i)=>({id:`drawing-${i}`,title:'Family drawing',sentences:'',updatedAt:1,strokes:[],stamps:[]}));
 save.library={version:2,profiles:Object.fromEntries(save.learning!.people.map(p=>[p.id,structuredClone(child)]))};
 const first=save.library.profiles.family.creations[0];
 for(let i=0;i<256;i++){
  first.strokes.push({color:'#123456',width:1,points:Array.from({length:2048},()=>({x:0.25,y:0.75}))});
  if(jsonBytes(save.library)>999900){first.strokes.pop();break;}
 }
 // Use the exact remaining budget on an allowed sentences field.
 first.sentences='a'.repeat(Math.min(4000,999900-jsonBytes(save.library)));
 return save;
}
/** H3 F2: every learner's Home holds a full saved undo history, as close to HOME_UNDO_BYTES as
 * whole basket things allow, in 20 valid room snapshots that each rebuild a valid earlier home. */
function withFullUndo(save:ReturnType<typeof denseSave>){
 for(const person of Object.values(save.personalization!.people)){
  const home=person.home as HomeStateV2;
  // As many whole-room steps as fit (at most 20), then basket things until no more fit.
  const one=JSON.stringify({home:{room:home.rooms.home}}).length+1;
  const sizes=Array<number>(Math.min(HOME_UNDO_STEPS,Math.floor((HOME_UNDO_BYTES-24)/one))).fill(0);
  const steps=()=>sizes.map((k,n)=>({home:{room:{...home.rooms.home,instances:[...home.rooms.home.instances,...Array.from({length:k},(_,i)=>({...instance(`shell-${n}-${i}`,'shell',0,0),staged:true as const}))]}}}));
  const bytes=()=>undoBytes({version:1,steps:steps()});
  expect(sizes.length).toBeGreaterThan(0);expect(bytes()).toBeLessThanOrEqual(HOME_UNDO_BYTES);
  for(let n=0;;n=(n+1)%sizes.length){sizes[n]++;if(bytes()>HOME_UNDO_BYTES){sizes[n]--;break;}}
  person.home={...home,undo:{version:1,steps:steps()}} as HomeStateV2;
  expect(validHome(person.home)).toBe(true);
  expect(HOME_UNDO_BYTES-bytes()).toBeLessThan(100);
 }
 return save;
}
it('FND-16 measures real canonical contract encodings, five learners, four adults, full Library and a dense valid legacy save',()=>{
 expect(ordinal).toBe(62647);
 const learner=dense('family'),adult=dense('cove-0',true);
 expect(validChallengeProgress(learner,'family')).toBe(true);expect(validChallengeProgress(adult,'cove-0',undefined,true)).toBe(true);expect(jsonBytes(learner)).toBeLessThanOrEqual(104000);expect(jsonBytes(adult)).toBeLessThan(72000-100);
 const save=denseSave();
 expect(validLibraryData(save.library)).toBe(true);expect(jsonBytes(save.library)).toBe(999900);
 const raw=encodeSave(save);expect(Buffer.byteLength(raw)).toBeLessThan(MAX_SAVE_BYTES);expect(()=>parseSave(raw)).not.toThrow();
 const near=migrateProfiles(parseSave(readFileSync('tests/fixtures/save-v3/main-near-limit-2.json','utf8')));const nearOriginal=encodeSave(near);
 near.profiles!.people.family.challenge=learner;const oversized=encodeSave(projectProfile(near));expect(Buffer.byteLength(oversized)).toBeGreaterThan(MAX_SAVE_BYTES);expect(()=>parseSave(oversized)).toThrow(/large/);expect(nearOriginal.length).toBeLessThan(MAX_SAVE_BYTES);
 const sessionBytes=Object.fromEntries(kinds.map(kind=>[kind,jsonBytes(largest(kind))]));
 const undone=withFullUndo(denseSave()),undoRaw=encodeSave(undone),headroom=MAX_SAVE_BYTES-Buffer.byteLength(raw);
 const homeUndo={capBytes:HOME_UNDO_BYTES,maxSteps:HOME_UNDO_STEPS,stepsPerLearner:Object.values(undone.personalization!.people).map(p=>(p.home as HomeStateV2).undo!.steps.length),perLearnerBytes:Object.values(undone.personalization!.people).map(p=>undoBytes((p.home as HomeStateV2).undo!)),wholeSaveBytes:Buffer.byteLength(undoRaw),addedBytes:Buffer.byteLength(undoRaw)-Buffer.byteLength(raw),remainingBytes:MAX_SAVE_BYTES-Buffer.byteLength(undoRaw),marginOfHeadroom:Number(((MAX_SAVE_BYTES-Buffer.byteLength(undoRaw))/headroom).toFixed(3))};
 const report={catalogEntries:ordinal,coveEntries:54000,bankCount:200,learnerBytes:jsonBytes(learner),adultChallengeBytes:jsonBytes(adult),adultRecordBytes:jsonBytes(save.cove!.people['cove-0']),sessionBytes,pausedSessionBytes:learner.paused.map(s=>({game:s.game,bytes:jsonBytes(s)})),fiveLearnersChallengeBytes:Object.values(save.profiles!.people).reduce((n,p)=>n+jsonBytes(p.challenge),0),fourAdultRecordBytes:Object.values(save.cove!.people).reduce((n,p)=>n+jsonBytes(p),0),libraryBytes:jsonBytes(save.library),drawingCount:80,wholeSaveBytes:Buffer.byteLength(raw),remainingBytes:MAX_SAVE_BYTES-Buffer.byteLength(raw),nearLimitMigratedBytes:Buffer.byteLength(nearOriginal),nearLimitPlusDenseChallengeBytes:Buffer.byteLength(oversized),homeUndo,limits:{save:2000000,library:1000000,learner:104000,adult:72000},coverage:'Actual canonical production storage primitives and validators, test-only structural codecs. Not proof of future game-engine reachability, future Home storage/delta formats or device timing. homeUndo: five full Home undo histories (valid room snapshots at the cap) added to the same envelope.'};
 if(process.env.F1_SIZE_REPORT)writeFileSync(process.env.F1_SIZE_REPORT,JSON.stringify(report,null,2)+'\n');
});
it('H3 F2: five learners with full Home undo histories still save and load, leaving 10% of the headroom spare',()=>{
 const base=Buffer.byteLength(encodeSave(denseSave())),headroom=MAX_SAVE_BYTES-base;
 const save=withFullUndo(denseSave()),raw=encodeSave(save),bytes=Buffer.byteLength(raw);
 expect(Object.values(save.personalization!.people)).toHaveLength(5);
 const loaded=parseSave(raw);
 for(const [id,person] of Object.entries(loaded.personalization!.people))expect((person.home as HomeStateV2).undo).toEqual((save.personalization!.people[id].home as HomeStateV2).undo);
 // At least 10% of what the dense envelope leaves stays unused, even with every history at exactly the cap.
 const slack=Object.values(save.personalization!.people).reduce((n,p)=>n+HOME_UNDO_BYTES-undoBytes((p.home as HomeStateV2).undo!),0);
 expect(MAX_SAVE_BYTES-bytes-slack).toBeGreaterThanOrEqual(headroom*0.1);
});
