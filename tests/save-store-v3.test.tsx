import { catalogManifest } from '../src/state/catalogManifest';
import { emptyChallenge, registerSaveContent } from '../src/state/challenge';
import { jsonBytes, pack, unpack } from '../src/state/saveBits';
import { newCheckpoint } from '../src/state/checkpoint';
import React, { createContext, useLayoutEffect } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptySave, parseSave } from '../src/state/validation';
import { newLibraryChild } from '../src/library/state';
import { projectProfile, migrateProfiles, encodeSave } from '../src/state/profiles';
import { addLearner } from '../src/learn/learners';
import { parseDraft, type ChallengeExpected } from '../src/state/challengeDrafts';
import { fixtureCatalog, installFixture, moved, session } from './helpers/save-contract';

vi.mock('../src/challenge/registry.generated', () => ({ challengeEntries: [] }));
const db=vi.hoisted(()=>({raw:null as string|null,preserved:[] as string[],drafts:[] as string[],sets:0,moves:0,preserveFails:false,writeFails:false,draftFails:false,responseFails:false,releaseDraft:null as null|(()=>void),holdDraft:false}));
// Synthetic ceiling banks deliberately reuse slots; keep this fixture catalog isolated.
vi.mock('../src/challenge/registry.generated',()=>({challengeEntries:[]}));
vi.mock('../src/state/storage',()=>({storage:{
 discardSession:async()=>{},
 get:async()=>db.raw,
 set:async(raw:string)=>{if(db.writeFails)throw new Error('write failed');db.raw=raw;db.sets++;db.drafts=[];if(db.responseFails)throw new Error('publish interrupted');},
 preserve:async(raw:string)=>{if(db.preserveFails)throw new Error('preserve failed');db.preserved.push(raw);},
 readDrafts:async()=>db.drafts,
 writeDraft:async(raw:string)=>{if(db.holdDraft)await new Promise<void>(resolve=>{db.releaseDraft=resolve;});if(db.draftFails)throw new Error('draft failed');const row=parseDraft(raw);if(row.base!==JSON.parse(db.raw!).saveRevision)throw new Error('stale base');db.drafts=[raw];db.moves++;},
}}));
vi.mock('react-native',()=>({AppState:{addEventListener:()=>({remove(){}})}}));
vi.mock('../src/components/Audio',()=>({AudioPreferences:createContext({})}));
installFixture();
let store:ReturnType<typeof useStore>,root:ReturnType<typeof TestRenderer.create>|undefined;
function Probe(){const s=useStore();useLayoutEffect(()=>{store=s;},[s]);return null;}
async function mount(){await act(async()=>{root=TestRenderer.create(<StoreProvider><Probe/></StoreProvider>);});}
async function unmount(){await act(async()=>{root?.unmount();root=undefined;});}
const e=(s:ReturnType<typeof session>):ChallengeExpected=>({epoch:store.epoch,owner:s.owner,game:s.game,id:s.id,revision:s.revision});
async function start(s=session('a')){await act(async()=>expect(await store.challengeSave(s,{...e(s),id:null,revision:null})).toBe(true));return s;}
beforeEach(()=>{Object.assign(db,{raw:JSON.stringify({...emptySave(),learning:addLearner(undefined,'A','a')}),preserved:[],drafts:[],sets:0,moves:0,preserveFails:false,writeFails:false,draftFails:false,responseFails:false,releaseDraft:null as null|(()=>void),holdDraft:false});vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);});
afterEach(async()=>{await unmount();vi.unstubAllGlobals();});
it('PF frozen source upgrades once, preserves exact bytes, all legacy rounds survive, repeat hydration writes nothing',async()=>{
 db.raw=' \n'+readFileSync('tests/fixtures/save-v3/main-envelope-2.json','utf8')+'\n';const original=db.raw;await mount();expect(store.recovery).toBeNull();expect(db.preserved).toEqual([original]);expect(parseSave(db.raw!)).toEqual(store.save);
 const settled=db.raw,count=db.sets;await unmount();await mount();expect(store.recovery).toBeNull();expect(db.sets).toBe(count);expect(db.raw).toBe(settled);expect(db.preserved).toHaveLength(1);
 for(const p of Object.values(store.save.profiles!.people))expect(Object.keys(p.learn!)).toHaveLength(28);
});
for(const failure of ['preserveFails','writeFails'] as const)it(`migration ${failure} keeps exact active original and publishes no upgraded state`,async()=>{
 const raw=db.raw;db[failure]=true;await mount();expect(db.raw).toBe(raw);expect(store.recovery).toBeTruthy();expect(store.save.version).toBe(1);
});
it('each accepted move writes only a small draft, immediate remount resumes it, export folds it coherently',async()=>{
 await mount();const s=await start(),next=moved(s),count=db.sets,raw=db.raw;
 await act(async()=>expect(await store.challengeSave(next,e(s))).toBe(true));expect(db.moves).toBe(1);expect(db.sets).toBe(count);expect(db.raw).toBe(raw);expect(db.drafts[0].length).toBeLessThan(5000);
 await unmount();await mount();expect(store.recovery).toBeNull();expect(store.save.challenge!.paused[0]).toEqual(next);expect(db.sets).toBe(count);
 let backup='';await act(async()=>{backup=await store.backup();});expect(db.drafts).toEqual([]);expect(parseSave(backup).challenge!.paused[0]).toEqual(next);expect(db.raw).toBe(backup);
 const revision=store.save.saveRevision;await act(async()=>store.restore(backup));expect(store.save.saveRevision).not.toBe(revision);expect(store.save.challenge!.paused[0]).toEqual(next);
});
it('draft failure retains the synchronously accepted move and reports retry; caller mutation cannot change accepted state',async()=>{
 await mount();const s=await start();db.draftFails=true;
 await act(async()=>expect(await store.challengeSave(moved(s),e(s))).toBe(false));expect(store.save.challenge!.paused[0]).toEqual(moved(s));expect(store.error).toMatch(/latest moves.*could not be saved/);
 db.draftFails=false;const current=moved(s),next=moved(current);await act(async()=>expect(await store.challengeSave(next,e(current))).toBe(true));(next.payload as {moves:number}).moves=999;expect((store.save.challenge!.paused[0].payload as {moves:number}).moves).toBe(2);
});
for(const failure of ['writeFails'] as const)it(`terminal ${failure} cannot publish either Together participant's award`,async()=>{
 await mount();const s=await start({...session('a'),partner:'family'}),before=encodeSave(store.save),raw=db.raw;db[failure]=true;
 await act(async()=>expect(await store.challengeSave(moved(s,{end:true,awards:3}),e(s))).toBe(false));expect(encodeSave(store.save)).toBe(before);expect(db.raw).toBe(raw);expect(store.save.profiles!.people.family.challenge!.banks).toEqual([]);
 db[failure]=false;await act(async()=>expect(await store.challengeSave(moved(s,{end:true,awards:3}),e(s))).toBe(true));
 for(const owner of ['a','family'])expect(unpack(store.save.profiles!.people[owner].challenge!.banks[0][1],1024,3)![0]).toBe(3);
 expect(store.save.challenge!.paused).toEqual([]);const accepted=db.raw;
 await act(async()=>expect(await store.challengeSave(moved(s,{end:true,awards:3}),e(s))).toBe(false));expect(db.raw).toBe(accepted);
});
it('interrupt after durable write but before publication recovers exactly one accepted terminal credit',async()=>{
 await mount();const s=await start(),before=store.save;db.responseFails=true;
 await act(async()=>expect(await store.challengeSave(moved(s,{end:true,awards:3}),e(s))).toBe(true));expect(store.save).not.toBe(before);expect(parseSave(db.raw!).challenge!.paused).toEqual([]);
 db.responseFails=false;await unmount();await mount();expect(store.save.challenge!.paused).toEqual([]);const accepted=db.raw;
 await act(async()=>expect(await store.challengeSave(moved(s,{end:true,awards:3}),e(s))).toBe(false));expect(db.raw).toBe(accepted);
});
it('switch A→Family→A and restore reject captured callbacks; explicit discard preserves the draft and advances ordinal',async()=>{
 await mount();const s=await start(),stale=e(s),callback=store.challengeSave;
 await act(async()=>store.selectLearner('family'));await act(async()=>store.selectLearner('a'));
 await act(async()=>expect(await callback(moved(s),stale)).toBe(false));
 let backup='';await act(async()=>{backup=await store.backup();});const older=e(s);await act(async()=>store.restore(backup));await act(async()=>expect(await store.challengeSave(moved(s),older)).toBe(false));
 const copies=db.preserved.length;await act(async()=>expect(await store.challengeDiscard(e(s))).toBe(true));expect(db.preserved).toHaveLength(copies);expect(store.save.challenge!.paused).toEqual([]);expect(store.save.challenge!.nextOrdinal).toBe(2);
 await start(session('a','new-attempt',2));expect(store.save.challenge!.paused[0].ordinal).toBe(2);
});
it('Cove-only operations are epoch guarded and never add a child, house, School record or change child work',async()=>{
 await mount();const child=JSON.stringify(store.save.profiles),epoch=store.epoch;
 await act(async()=>expect(await store.covePerson({type:'add',name:'Adult',id:'cove-adult'},epoch)).toBe(true));expect(JSON.stringify(store.save.profiles)).toBe(child);expect(store.save.learning!.people).toHaveLength(2);expect(store.save.personalization!.people['cove-adult']).toBeUndefined();
 await act(async()=>expect(await store.covePerson({type:'remove',id:'cove-adult'},epoch)).toBe(false));
 const s=await start(session('cove-adult'));await act(async()=>expect(await store.challengeSave(moved(s),e(s))).toBe(true));
 await act(async()=>expect(await store.covePerson({type:'remove',id:'cove-adult'},store.epoch)).toBe(true));expect(store.save.cove!.people).toEqual({});expect(JSON.stringify(store.save.profiles)).toBe(child);
});

for(const flag of ['write','library','admission'] as const)it(`P1-1 export remains available after ${flag} rejection`,async()=>{
 await mount();
 if(flag==='write'){db.writeFails=true;await act(async()=>store.settings({sound:false}));}
 if(flag==='library')await act(async()=>{store.libraryPatch({creations:null as never},store.epoch,'a');});
 if(flag==='admission'){
  await unmount();const near=migrateProfiles(parseSave(readFileSync('tests/fixtures/save-v3/fix-upgrade-window-2.json','utf8')));
  const child=newLibraryChild();child.creations=[{id:'capacity-drawing',title:'Island',sentences:'',updatedAt:1,strokes:[],stamps:[]}];
  near.library={version:2,profiles:{...near.library!.profiles,family:child}};
  child.creations[0].sentences='x'.repeat(1999999-Buffer.byteLength(encodeSave(near)));
  db.raw=encodeSave(near);expect(()=>parseSave(db.raw!)).not.toThrow();await mount();expect(store.recovery).toBeNull();
  await act(async()=>store.rememberPlayers(['A long family player name','Another family player']));expect(store.error).toMatch(/save limit/);
 }
 const accepted=encodeSave(store.save);let backup='';await act(async()=>{backup=await store.backup();});expect(parseSave(backup)).toEqual(parseSave(accepted));
});
it('P1-2 routine rounds do not add whole-save recovery copies',async()=>{
 db.raw=readFileSync('tests/fixtures/save-v3/main-envelope-2.json','utf8');const preUpdate=db.raw;
 await mount();await act(async()=>store.selectLearner('a'));const copies=db.preserved.length;
 for(let n=0;n<12;n++){const s=await start(session('a',`round-${n}`,n+1));const m=moved(s);await act(async()=>expect(await store.challengeSave(m,e(s))).toBe(true));const end=moved(m,{end:true});await act(async()=>expect(await store.challengeSave(end,e(m))).toBe(true));expect(store.save.challenge!.paused).toEqual([]);}
 expect(db.preserved).toHaveLength(copies);expect(db.preserved).toEqual([preUpdate]);
 if(process.env.F1_POST_PLAY_SAVE)writeFileSync(process.env.F1_POST_PLAY_SAVE,encodeSave(store.save));
});
it('P1-3 synchronous acceptance queues K moves while a draft write is pending and keeps ambient changes',async()=>{
 await mount();let s=await start();db.holdDraft=true;const promises:Promise<boolean>[]=[];
 await act(async()=>{
  for(let n=0;n<20;n++){const next=moved(s);promises.push(store.challengeSave(next,e(s)));s=next;}
  store.settings({sound:false});
  // Permit the first queued write to start, then release it.
  for(let n=0;n<10;n++)await Promise.resolve();db.holdDraft=false;db.releaseDraft?.();
  expect(await Promise.all(promises)).toEqual(Array(20).fill(true));
 });
 expect(store.save.challenge!.paused[0].revision).toBe(20);expect(store.save.settings.sound).toBe(false);
 await unmount();await mount();expect(store.save.challenge!.paused[0].revision).toBe(20);
});
it('P2-2 session budget refusal is explained and the current draft stays resumable',async()=>{
 await mount();const s=await start();const tooBig=moved(s,{checkpoint:'x'.repeat(5000)});
 await act(async()=>expect(await store.challengeSave(tooBig,e(s))).toBe(false));expect(store.error).toMatch(/paused game.*limit/i);expect(store.save.challenge!.paused[0]).toEqual(s);
});
it('P3-1 a lost terminal acknowledgement cannot be overwritten by the next ordinary commit',async()=>{
 await mount();const s=await start();db.responseFails=true;await act(async()=>{await store.challengeSave(moved(s,{end:true}),e(s));});db.responseFails=false;
 await act(async()=>store.settings({sound:false}));expect(parseSave(db.raw!).challenge!.paused).toEqual([]);
});

it('P2-1 the old failure window now upgrades; exact-limit originals have actionable recovery',async()=>{
 await unmount();db.raw=readFileSync('tests/fixtures/save-v3/fix-upgrade-window-2.json','utf8');await mount();expect(store.recovery).toBeNull();
 await unmount();db.raw=readFileSync('tests/fixtures/save-v3/fix-last-bytes-2.json','utf8');const original=db.raw;await mount();expect(store.recovery).toMatch(/previous build/);expect(store.recovery).not.toMatch(/before retrying/);expect(db.raw).toBe(original);expect(db.preserved).toContain(original);
});

it('P2-2 terminal full-save refusal explains management and keeps the paused session',async()=>{
 let near=migrateProfiles(parseSave(readFileSync('tests/fixtures/save-v3/fix-upgrade-window-2.json','utf8')));const s=session('a');
 near.profiles!.people.a.challenge={...emptyChallenge(),nextOrdinal:2,paused:[s]};near=projectProfile(near,{...near.learning!,active:'a'});
 const child=newLibraryChild();child.creations=[{id:'capacity-drawing',title:'Island',sentences:'',updatedAt:1,strokes:[],stamps:[]}];near.library={version:2,profiles:{...near.library!.profiles,family:child}};
 child.creations[0].sentences='x'.repeat(1999999-Buffer.byteLength(encodeSave(near)));db.raw=encodeSave(near);await mount();expect(store.recovery).toBeNull();const original=db.raw;
 await act(async()=>expect(await store.challengeSave(moved(s,{end:true}),e(s))).toBe(false));expect(store.challengeRefusal).toBe('full-save');expect(store.error).toMatch(/grown-up.*export.*manage/);expect(store.error).not.toMatch(/backup.*large/);expect(db.raw).toBe(original);expect(store.save.challenge!.paused[0]).toEqual(s);
});
it('P2-2 learner ceiling has a typed, visible refusal before any move is lost',async()=>{
 const b=fixtureCatalog.banks.get(0)!;if(!('entries' in b))throw new Error('Expected inline fixture.');const catalog={banks:new Map(Array.from({length:119},(_,i)=>[i+1,{...b,slot:i+1,entries:b.entries.map((e,j)=>({...e,ordinal:(i+1)*1024+j}))}])),codecs:new Map(),dares:new Map(),contexts:new Set<string>()};registerSaveContent(catalog,catalogManifest(catalog));
 let near=migrateProfiles({...emptySave(),learning:addLearner(undefined,'A','a')});const s=session('a'),p={...emptyChallenge(),nextOrdinal:2,paused:[s]};
 for(const b of catalog.banks.values()){
  const row:[number,string,string]=[b.slot,pack(Array(1024).fill(6),3),pack(Array(1024).fill(3),2)];
  if(jsonBytes({...p,banks:[...p.banks,row]})>103800)break;p.banks.push(row);
 }
 for(let i=0;i<256;i++){const best:[number,number,number]=[0,i,0xffffffff];if(jsonBytes({...p,bests:[...p.bests,best]})>103980)break;p.bests.push(best);}
 near.profiles!.people.a.challenge=p;near=projectProfile(near);db.raw=encodeSave(near);await mount();expect(store.recovery).toBeNull();
 await act(async()=>expect(await store.challengeSave(moved(s,{checkpoint:newCheckpoint('paint')}),e(s))).toBe(false));expect(store.challengeRefusal).toBe('learner-ceiling');expect(store.error).toMatch(/person.*limit/);expect(store.save.challenge!.paused[0]).toEqual(s);
});

it('P1-3 K rapid accepted moves resolve only after revision K is durable, without a boundary fold',async()=>{
 await mount();let current=await start();const writes:Promise<boolean>[]=[];
 await act(async()=>{for(let i=0;i<100;i++){const next=moved(current);writes.push(store.challengeSave(next,e(current)));current=next;}expect(await Promise.all(writes)).toEqual(Array(100).fill(true));});
 expect(parseDraft(db.drafts[0]).session.revision).toBe(100);expect(db.moves).toBeLessThan(100);expect(store.save.challenge!.paused[0]).toEqual(current);
});
