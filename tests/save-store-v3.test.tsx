import React, { createContext, useLayoutEffect } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptySave, parseSave } from '../src/state/validation';
import { encodeSave } from '../src/state/profiles';
import { addLearner } from '../src/learn/learners';
import { unpack } from '../src/state/saveBits';
import { parseDraft, type ChallengeExpected } from '../src/state/challengeDrafts';
import { installFixture, moved, session } from './helpers/save-contract';
const db=vi.hoisted(()=>({raw:null as string|null,preserved:[] as string[],drafts:[] as string[],sets:0,moves:0,preserveFails:false,writeFails:false,draftFails:false,responseFails:false}));
vi.mock('../src/state/storage',()=>({storage:{
 get:async()=>db.raw,
 set:async(raw:string)=>{if(db.writeFails)throw new Error('write failed');db.raw=raw;db.sets++;db.drafts=[];if(db.responseFails)throw new Error('publish interrupted');},
 preserve:async(raw:string)=>{if(db.preserveFails)throw new Error('preserve failed');db.preserved.push(raw);},
 readDrafts:async()=>db.drafts,
 writeDraft:async(raw:string)=>{if(db.draftFails)throw new Error('draft failed');const row=parseDraft(raw);if(row.base!==JSON.parse(db.raw!).saveRevision)throw new Error('stale base');db.drafts=[raw];db.moves++;},
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
beforeEach(()=>{Object.assign(db,{raw:JSON.stringify({...emptySave(),learning:addLearner(undefined,'A','a')}),preserved:[],drafts:[],sets:0,moves:0,preserveFails:false,writeFails:false,draftFails:false,responseFails:false});vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);});
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
it('draft failure keeps the accepted draft and reports retry; caller mutation cannot change accepted state',async()=>{
 await mount();const s=await start(),before=encodeSave(store.save);db.draftFails=true;
 await act(async()=>expect(await store.challengeSave(moved(s),e(s))).toBe(false));expect(encodeSave(store.save)).toBe(before);expect(store.error).toMatch(/draft failed/);
 db.draftFails=false;const next=moved(s);await act(async()=>expect(await store.challengeSave(next,e(s))).toBe(true));(next.payload as {moves:number}).moves=999;expect((store.save.challenge!.paused[0].payload as {moves:number}).moves).toBe(1);
});
for(const failure of ['preserveFails','writeFails'] as const)it(`terminal ${failure} cannot publish either Together participant's award`,async()=>{
 await mount();const s=await start({...session('a'),partner:'family'}),before=encodeSave(store.save),raw=db.raw;db[failure]=true;
 await act(async()=>expect(await store.challengeSave(moved(s,{end:true,awards:3}),e(s))).toBe(false));expect(encodeSave(store.save)).toBe(before);expect(db.raw).toBe(raw);expect(store.save.profiles!.people.family.challenge!.banks).toEqual([]);
 db[failure]=false;await act(async()=>expect(await store.challengeSave(moved(s,{end:true,awards:3}),e(s))).toBe(true));
 for(const owner of ['a','family'])expect(unpack(store.save.profiles!.people[owner].challenge!.banks[0][1],1024,3)![0]).toBe(3);
 expect(store.save.challenge!.paused[0].credited).toBe(true);const accepted=db.raw;
 await act(async()=>expect(await store.challengeSave(moved(s,{end:true,awards:3}),e(s))).toBe(false));expect(db.raw).toBe(accepted);
});
it('interrupt after durable write but before publication recovers exactly one accepted terminal credit',async()=>{
 await mount();const s=await start(),before=store.save;db.responseFails=true;
 await act(async()=>expect(await store.challengeSave(moved(s,{end:true,awards:3}),e(s))).toBe(false));expect(store.save).toBe(before);expect(parseSave(db.raw!).challenge!.paused[0].credited).toBe(true);
 db.responseFails=false;await unmount();await mount();expect(store.save.challenge!.paused[0].credited).toBe(true);const accepted=db.raw;
 await act(async()=>expect(await store.challengeSave(moved(s,{end:true,awards:3}),e(s))).toBe(false));expect(db.raw).toBe(accepted);
});
it('switch A→Family→A and restore reject captured callbacks; explicit discard preserves the draft and advances ordinal',async()=>{
 await mount();const s=await start(),stale=e(s),callback=store.challengeSave;
 await act(async()=>store.selectLearner('family'));await act(async()=>store.selectLearner('a'));
 await act(async()=>expect(await callback(moved(s),stale)).toBe(false));
 let backup='';await act(async()=>{backup=await store.backup();});const older=e(s);await act(async()=>store.restore(backup));await act(async()=>expect(await store.challengeSave(moved(s),older)).toBe(false));
 const kept=db.raw;await act(async()=>expect(await store.challengeDiscard(e(s))).toBe(true));expect(db.preserved).toContain(kept);expect(store.save.challenge!.paused).toEqual([]);expect(store.save.challenge!.nextOrdinal).toBe(2);
 await start(session('a','new-attempt',2));expect(store.save.challenge!.paused[0].ordinal).toBe(2);
});
it('Cove-only operations are epoch guarded and never add a child, house, School record or change child work',async()=>{
 await mount();const child=JSON.stringify(store.save.profiles),epoch=store.epoch;
 await act(async()=>expect(await store.covePerson({type:'add',name:'Adult',id:'cove-adult'},epoch)).toBe(true));expect(JSON.stringify(store.save.profiles)).toBe(child);expect(store.save.learning!.people).toHaveLength(2);expect(store.save.personalization!.people['cove-adult']).toBeUndefined();
 await act(async()=>expect(await store.covePerson({type:'remove',id:'cove-adult'},epoch)).toBe(false));
 const s=await start(session('cove-adult'));await act(async()=>expect(await store.challengeSave(moved(s),e(s))).toBe(true));
 await act(async()=>expect(await store.covePerson({type:'remove',id:'cove-adult'},store.epoch)).toBe(true));expect(store.save.cove!.people).toEqual({});expect(JSON.stringify(store.save.profiles)).toBe(child);
});
