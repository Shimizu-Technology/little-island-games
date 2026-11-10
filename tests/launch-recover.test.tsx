import React, { createContext, useLayoutEffect } from 'react';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { fixture, envelope } from './helpers/save-packed';
import { registerSaveContent, emptyChallenge, type Bank, type ChallengeSession, type SaveCatalog } from '../src/state/challenge';
import { catalogManifest } from '../src/state/catalogManifest';
import { encodeSave, projectProfile } from '../src/state/profiles';
import { pack } from '../src/state/saveBits';
import { setAsideUnresolved } from '../src/state/setAside';
import { resumeMessage } from '../src/state/sessionContent';
import { BOOT_TIMEOUT_MS, bootTimeoutMessage, StoreProvider, useStore } from '../src/state/Store';
import type { BankLoader } from '../src/puzzles/loader';
import type { Save } from '../src/state/validation';

// Slice F-recover: a save that names content this build doesn't have must never stop launch.
// Its synthetic catalog fills ordinals that shipped registrations also use, so keep them out (as the save fixtures do).
vi.mock('../src/challenge/registry.generated', () => ({ challengeEntries: [] }));
const db=vi.hoisted(()=>({raw:null as string|null,preserved:[] as string[],discarded:[] as string[],log:[] as string[],loader:null as BankLoader|null,get:null as null|(()=>Promise<string|null>)}));
vi.mock('../src/puzzles/catalog',()=>({bankLoader:()=>db.loader!}));
vi.mock('../src/state/storage',()=>({storage:{get:async()=>db.get?db.get():db.raw,set:async(raw:string)=>{db.raw=raw;},preserve:async(raw:string)=>{db.preserved.push(raw);},discardSession:async(raw:string)=>{db.discarded.push(raw);},logLaunch:async(entry:string)=>{db.log.push(entry);},readDrafts:async()=>[],listRecovery:async()=>[],readRecovery:async()=>null}}));
vi.mock('react-native',()=>({AppState:{addEventListener:()=>({remove(){}})}}));
vi.mock('../src/components/Audio',()=>({AudioPreferences:createContext({})}));
let store:ReturnType<typeof useStore>,view:ReactTestRenderer|undefined;
function Probe(){const s=useStore();useLayoutEffect(()=>{store=s;},[s]);return null;}
const mount=async()=>{await act(async()=>{view=create(<StoreProvider><Probe/></StoreProvider>);});};
afterEach(async()=>{if(view)await act(async()=>view!.unmount());view=undefined;vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
const sha=(text:string)=>createHash('sha256').update(text).digest('hex');

// One registration per module: the packed fixture plus a small inline bank (slot 120).
const f=fixture();
const inline:Bank={slot:120,engine:'inline-0',rules:1,entries:[0,1,2].map(n=>({ordinal:900+n,hash:sha(`inline-${n}`)})),awards:[3,3,3],cove:true};
const catalog:SaveCatalog={...f.catalog,banks:new Map([...f.catalog.banks,[120,inline]]),codecs:new Map([...f.catalog.codecs,['inline-0-v1',{...f.catalog.codecs.get('packed-1-v1')!,game:'inline-0'}]])};
registerSaveContent(catalog,catalogManifest(catalog));
const inlineSession=(owner:string,ordinal:number,hash=sha('inline-1'),bank=120):ChallengeSession=>({version:1,owner,game:'inline-0',id:`${owner}-inline`,ordinal,revision:0,puzzle:{bank,puzzle:1,engine:'inline-0',rules:1,hash},codec:'inline-0-v1',payload:0,selectedDares:[],partner:null,result:null,credited:false});
const marks=(slot:number,count=100)=>[slot,pack(Array.from({length:count},(_,i)=>i===0?5:0),3),pack(Array<number>(count).fill(0),2)] as [number,string,string];
/** Four learners with 8 paused rounds each, four Cove people with 4 each; `change` edits the family's progress. */
function seed(change:(family:NonNullable<Save['challenge']>)=>void){
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);db.loader=f.loader;db.preserved=[];db.discarded=[];db.log=[];db.get=null;
 const s=envelope(f);const family=s.profiles!.people.family.challenge!;family.banks=[marks(101),marks(105)];change(family);
 db.raw=encodeSave(projectProfile({...s,learning:{...s.learning!,active:'family'}}));return db.raw;
}
const family=()=>store.save.profiles!.people.family.challenge!;
const others=(s:Save)=>JSON.stringify([Object.entries(s.profiles!.people).filter(([id])=>id!=='family').map(([id,p])=>[id,p.challenge]),s.cove!.people]);
async function expectSetAside(original:string,games:string[],marksRows:number){
 await mount();
 expect(store.ready).toBe(true);expect(store.recovery).toBeNull();
 expect(db.preserved).toContain(original); // the original is the copy of what was set aside
 expect(db.raw).not.toBe(original);expect(JSON.parse(db.raw!).saveRevision).not.toBe(JSON.parse(original).saveRevision);
 expect(store.setAside).toEqual([{owner:'family',games,marks:marksRows}]);
 for(const game of games)expect(family().paused.map(s=>s.game)).not.toContain(game);
 expect(others(store.save)).toBe(others(JSON.parse(original))); // other learners and Cove people are untouched
 expect(JSON.parse(db.log.at(-1)!)).toMatchObject({where:'set-aside'});
}

it('unknown packed bank: launch reaches the app, only that round and its marks are set aside, original preserved',async()=>{
 const original=seed(c=>{c.paused[2]={...c.paused[2],puzzle:{...c.paused[2].puzzle,bank:300}};c.banks.push(marks(300,40));});
 await expectSetAside(original,['packed-2'],1);
 expect(family().paused).toHaveLength(7);expect(family().banks.map(b=>b[0])).toEqual([101,105]);
});

it('unknown inline bank and changed inline entry: both rounds set aside, inline marks for the known bank kept',async()=>{
 const original=seed(c=>{c.paused[7]=inlineSession('family',8,sha('inline-1'),121);c.paused.sort((a,b)=>a.game<b.game?-1:1);c.banks.push(marks(120,3));});
 await expectSetAside(original,['inline-0'],0);
 expect(family().banks.map(b=>b[0])).toEqual([101,105,120]);
 // A known inline bank whose entry hash changed can't resume either.
 await act(async()=>view!.unmount());view=undefined;
 const changed=seed(c=>{c.paused[7]=inlineSession('family',8,'e'.repeat(64));c.paused.sort((a,b)=>a.game<b.game?-1:1);});
 await expectSetAside(changed,['inline-0'],0);
});

it('a bank whose size changed (the G5 Loop case): that marks row is set aside, every other row and round stays',async()=>{
 const original=seed(c=>{c.banks=[marks(101),marks(103,160),marks(105)];c.recent=[[103,120],[105,0]];c.solutions=[[103,150,'a'.repeat(64)]];});
 await expectSetAside(original,[],1);
 expect(family().banks.map(b=>b[0])).toEqual([101,105]);expect(family().paused).toHaveLength(8);
 expect(family().recent).toEqual([[105,0]]);expect(family().solutions).toEqual([]);
});

it('pack hash changed: launch is untouched; Continue says it couldn’t be resumed and starting fresh keeps a copy',async()=>{
 const original=seed(c=>{c.paused[3]={...c.paused[3],puzzle:{...c.paused[3].puzzle,hash:'e'.repeat(64)}};});
 await mount();expect(store.recovery).toBeNull();expect(store.setAside).toEqual([]);expect(db.raw).toBe(original);
 const slot=family().paused[3],guard={owner:'family',game:slot.game,epoch:store.epoch,id:slot.id,revision:slot.revision};
 await act(async()=>{expect(await store.challengeOpen(guard)).toEqual({ok:false,kind:'invalid-session',message:resumeMessage});});
 await act(async()=>{expect(await store.challengeDiscard(guard)).toBe(true);});
 expect(db.discarded).toEqual([JSON.stringify(slot)]);expect(family().paused.map(s=>s.game)).not.toContain(slot.game);
 expect(family().banks.map(b=>b[0])).toEqual([101,105]);expect(others(store.save)).toBe(others(JSON.parse(original)));
});

it('unreadable pack: launch is untouched; Continue can retry or start fresh',async()=>{
 const original=seed(()=>{}),asset=f.root.families[4][1],text=f.files.get(asset)!;f.files.delete(asset);
 try {
  await mount();expect(store.recovery).toBeNull();expect(db.raw).toBe(original);
  const slot=family().paused[4],guard={owner:'family',game:slot.game,epoch:store.epoch,id:slot.id,revision:slot.revision};
  vi.spyOn(console,'warn').mockImplementation(()=>{});
  await act(async()=>{expect(await store.challengeOpen(guard)).toMatchObject({ok:false,kind:'content-unavailable'});});
  await act(async()=>{expect(await store.challengeDiscard(guard)).toBe(true);});
  expect(db.discarded).toEqual([JSON.stringify(slot)]);expect(family().paused).toHaveLength(7);
 } finally { f.files.set(asset,text); }
});

it('the G5 stale dev save launches without Recovery and keeps the learner, look, home and settings',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);db.preserved=[];db.log=[];db.get=null;
 const original=readFileSync(new URL('./fixtures/launch/g5-stale-dev-save.json',import.meta.url),'utf8').trim();db.raw=original;
 await mount();
 expect(store.ready).toBe(true);expect(store.recovery).toBeNull();expect(db.preserved).toContain(original);
 expect(store.setAside).toEqual([{owner:'family',games:['bridges','loop'],marks:6}]);
 const before=JSON.parse(original);
 expect(store.save.learning).toEqual(before.learning);expect(store.save.settings).toEqual(before.settings);
 expect(store.save.personalization!.people.family.look).toEqual(before.personalization.people.family.look);
 expect(store.save.personalization!.people.family.home).toEqual(before.personalization.people.family.home);
 expect(family()).toEqual({...emptyChallenge(),nextOrdinal:before.profiles.people.family.challenge.nextOrdinal});
});

it('setAsideUnresolved never changes resolvable saves or its input',()=>{
 const raw=seed(()=>{});expect(setAsideUnresolved(raw)).toEqual({raw,setAside:[]});
 const bad='{"version":3,"profiles":{"people":{"family":{"challenge":{"paused":[{"puzzle":{"bank":300}}]}}}}}';
 const copy=bad;expect(setAsideUnresolved(bad).setAside).toHaveLength(1);expect(bad).toBe(copy);
 for(const raw of ['not json','{"version":2}','[]'])expect(setAsideUnresolved(raw)).toEqual({raw,setAside:[]});
});

it('a load that never settles shows Recovery after the boot timeout and logs the cause locally',async()=>{
 seed(()=>{});vi.useFakeTimers();db.get=()=>new Promise(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 await mount();expect(store.ready).toBe(false);
 await act(async()=>{vi.advanceTimersByTime(BOOT_TIMEOUT_MS);});
 expect(store.ready).toBe(true);expect(store.recovery).toBe(bootTimeoutMessage);
 expect(JSON.parse(db.log.at(-1)!)).toMatchObject({where:'timeout'});
 // A late, successful load still publishes and clears the timeout screen.
 db.get=null;await act(async()=>{await store.retry();});expect(store.recovery).toBeNull();
});

it('a load that settles in time never shows the timeout screen',async()=>{
 seed(()=>{});vi.useFakeTimers();await mount();expect(store.recovery).toBeNull();
 await act(async()=>{vi.advanceTimersByTime(BOOT_TIMEOUT_MS*2);});expect(store.recovery).toBeNull();expect(db.log).toEqual([]);
});
