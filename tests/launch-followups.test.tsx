import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { fixture, envelope } from './helpers/save-packed';
import { registerSaveContent } from '../src/state/challenge';
import { catalogManifest } from '../src/state/catalogManifest';
import { encodeSave, projectProfile } from '../src/state/profiles';
import { pack } from '../src/state/saveBits';
import { BOOT_TIMEOUT_MS, StoreProvider, useStore } from '../src/state/Store';
import type { EnvelopeWrite } from '../src/state/storage';
import type { BankLoader } from '../src/puzzles/loader';
import type { LibraryPolicy } from '../src/library/state';
import type { Save } from '../src/state/validation';

// Launch follow-ups. (1) Replaying the Store's hydration effect, as Fast Refresh or a development double
// effect does, keeps the same Store's accepted state, queue and ownership. (2) Every successful full
// envelope write acknowledges the draft debt it folds; unrelated Library errors stay.
const db=vi.hoisted(()=>({raw:null as string|null,notices:null as string|null,loader:null as BankLoader|null,gets:0,drafts:[] as string[]}));
// Each Store's hydration effect, in mount order, so a test can replay it with the Store's refs kept.
const effects=vi.hoisted(()=>[] as {setup:()=>void|(()=>void);cleanup:(()=>void)|null}[]);
vi.mock('react',async importOriginal=>{
 const actual=await importOriginal<typeof import('react')>();
 return {...actual,useEffect:(setup:()=>void|(()=>void),deps?:React.DependencyList)=>actual.useEffect(()=>{
  const cleanup=setup();
  if(setup.toString().includes('BOOT_TIMEOUT_MS'))effects.push({setup,cleanup:typeof cleanup==='function'?cleanup:null});
  return cleanup;
 },deps)};
});
vi.mock('../src/challenge/registry.generated',()=>({challengeEntries:[]}));
vi.mock('../src/puzzles/catalog',()=>({bankLoader:()=>db.loader!}));
vi.mock('../src/state/storage',()=>({storage:{
 get:async()=>{db.gets++;return db.raw;},
 set:async(raw:string,metadata?:EnvelopeWrite)=>{db.raw=raw;db.drafts=[];if(metadata?.notices!==undefined)db.notices=metadata.notices;},
 preserve:async()=>{},discardSession:async()=>{},logLaunch:async()=>{},
 readNotices:async()=>db.notices,writeNotices:async(raw:string|null)=>{db.notices=raw;},
 readDrafts:async()=>db.drafts,
 writeDraft:async(raw:string)=>{const row=JSON.parse(raw);if(row.base!==JSON.parse(db.raw!).saveRevision)throw new Error('stale base');db.drafts=db.drafts.filter(s=>JSON.parse(s).session.game!==row.session.game);db.drafts.push(raw);},
 listRecovery:async()=>[],readRecovery:async()=>null}}));
vi.mock('react-native',()=>({AppState:{addEventListener:()=>({remove(){}})},View:'div',Pressable:'button',Text:'span'}));
vi.mock('expo-router',()=>({router:{dismissTo:vi.fn(),replace:vi.fn()},useNavigationContainerRef:()=>null}));
vi.mock('../src/components/Audio',()=>{
 const Base=createContext({});
 return {AudioPreferences:{...Base,Provider:({children,value}:{children:React.ReactNode;value:object})=><Base.Provider value={value}>{children}</Base.Provider>}};
});
type S=ReturnType<typeof useStore>;
let store:S,views:ReactTestRenderer[]=[];
function Probe({into}:{into?:(s:S)=>void}){const s=useStore();useLayoutEffect(()=>{(into??(x=>{store=x;}))(s);},[s,into]);return null;}
const mount=async(into?:(s:S)=>void)=>{await act(async()=>{views.push(create(<StoreProvider><Probe into={into}/></StoreProvider>));});};
/** The Store's hydration effect runs again with its hooks kept: cleanup, then setup. */
const replay=async(at=effects.length-1)=>{await act(async()=>{const e=effects[at];e.cleanup?.();const next=e.setup();e.cleanup=typeof next==='function'?next:null;});};
afterEach(async()=>{for(const e of effects)e.cleanup?.();effects.length=0;for(const v of views)await act(async()=>v.unmount());views=[];vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
const f=fixture();
registerSaveContent(f.catalog,catalogManifest(f.catalog));
const marks=(slot:number)=>[slot,pack(Array.from({length:100},(_,i)=>i===0?5:0),3),pack(Array<number>(100).fill(0),2)] as [number,string,string];
const family=()=>store.save.profiles!.people.family.challenge!;
const disk=()=>JSON.parse(db.raw!) as Save;
function seed(){
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);db.loader=f.loader;db.notices=null;db.gets=0;db.drafts=[];
 const s=envelope(f);
 for(const p of Object.values(s.profiles!.people))p.challenge!.banks=[marks(101),marks(105)];
 db.raw=encodeSave(projectProfile({...s,learning:{...s.learning!,active:'family'}}));
}
const quiet=()=>{vi.spyOn(console,'error').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});};

// (1) Effect replay: REVIEW-3 P2, the reviewer's two interleavings and the cases around them.
it('a replay keeps an accepted change whose save failed, and its error',async()=>{
 seed();await mount();
 const {storage}=await import('../src/state/storage');
 vi.spyOn(storage,'set').mockRejectedValueOnce(new Error('disk full'));
 await act(async()=>{store.settings({sound:false});});
 const accepted=store.save;
 expect(accepted.settings.sound).toBe(false);expect(store.error).not.toBeNull();
 await replay();
 expect(store.save).toBe(accepted);
 expect(store.error).not.toBeNull();
 expect(db.gets).toBe(1);
});

it('a replay between queued saves does not reload, so the next save keeps the newer settings',async()=>{
 seed();await mount();
 const {storage}=await import('../src/state/storage');
 const original=storage.set;
 let entered=0,releaseFirst=()=>{},releaseSecond=()=>{};
 vi.spyOn(storage,'set').mockImplementation(async(raw,meta)=>{
  entered++;
  if(entered===1)await new Promise<void>(r=>{releaseFirst=r;});
  if(entered===2)await new Promise<void>(r=>{releaseSecond=r;});
  return original(raw,meta);
 });
 try{
  await act(async()=>{store.settings({sound:false});});
  await act(async()=>{store.settings({help:false});});
  await replay();
  await act(async()=>{releaseFirst();});
  expect(entered).toBe(2);
  expect(store.save.settings.help).toBe(false);
  await act(async()=>{releaseSecond();});
  await act(async()=>{store.settings({effects:false});});
  expect(disk().settings).toMatchObject({sound:false,help:false,effects:false});
  expect(db.gets).toBe(1);
 }finally{await act(async()=>{releaseFirst();releaseSecond();});}
});

it('a replay while the first read is still running lets that load finish, and reads once',async()=>{
 seed();
 const {storage}=await import('../src/state/storage');
 const original=storage.get;let release=()=>{};
 vi.spyOn(storage,'get').mockImplementationOnce(async()=>{await new Promise<void>(r=>{release=r;});return original();});
 await mount();
 expect(store.ready).toBe(false);
 await replay();
 await act(async()=>{release();});
 expect(store.ready).toBe(true);expect(store.recovery).toBeNull();
 expect(db.gets).toBe(1);
 await act(async()=>{store.settings({sound:false});});
 expect(disk().settings.sound).toBe(false);
});

it('a replay keeps the launch timeout to its first deadline, and a timed-out launch is not rearmed',async()=>{
 seed();quiet();
 const {storage}=await import('../src/state/storage');
 const original=storage.get;let release=()=>{};
 vi.spyOn(storage,'get').mockImplementationOnce(async()=>{await new Promise<void>(r=>{release=r;});return original();});
 vi.useFakeTimers();
 try{
  await mount();
  await act(async()=>{await vi.advanceTimersByTimeAsync(BOOT_TIMEOUT_MS-1000);});
  await replay();
  expect(store.recovery).toBeNull();
  await act(async()=>{await vi.advanceTimersByTimeAsync(1000);});
  expect(store.recovery).not.toBeNull();
  await replay();
  // The held read still publishes when it finishes, and nothing shows the timeout over it.
  await act(async()=>{release();await vi.advanceTimersByTimeAsync(BOOT_TIMEOUT_MS);});
  expect(store.recovery).toBeNull();expect(store.ready).toBe(true);expect(db.gets).toBe(1);
 }finally{release();}
});

it('a replay on Recovery does not reload; Try opening again still does',async()=>{
 seed();quiet();db.raw='{"version":3,"broken":';
 await mount();
 expect(store.recovery).not.toBeNull();expect(db.gets).toBe(1);
 await replay();
 expect(store.recovery).not.toBeNull();expect(db.gets).toBe(1);
 await act(async()=>{await store.retry();});
 expect(db.gets).toBe(2);
});

it('a replay never takes writes back from a newer Store',async()=>{
 seed();quiet();
 let older!:S;
 await mount(s=>{older=s;});
 await mount();
 const revision=disk().saveRevision;
 // Replay the older Store's effect: it stays refused, so its accepted change never reaches disk.
 await replay(0);
 await act(async()=>{older.settings({sound:false});});
 expect(older.save.settings.sound).toBe(false);
 expect(disk().saveRevision).toBe(revision);
 expect(disk().settings.sound).toBe(true);
 await act(async()=>{store.settings({help:false});});
 expect(disk().settings).toMatchObject({sound:true,help:false});
});

// (2) Folded draft debt: REVIEW-3's pre-existing observation.
const failFirstDraft=async()=>{
 const {storage}=await import('../src/state/storage');
 vi.spyOn(storage,'writeDraft').mockRejectedValueOnce(new Error('disk full'));
 const a=family().paused[1];
 await act(async()=>{await store.challengeSave({...a,revision:1,payload:1},{epoch:store.epoch,owner:a.owner,game:a.game,id:a.id,revision:a.revision});});
 expect(store.error).not.toBeNull();
 return a;
};
it('FOLDED DEBT: a discard that writes the whole envelope clears the draft failure it folded',async()=>{
 seed();await mount();
 const a=await failFirstDraft(),b=family().paused[2];
 await act(async()=>{expect(await store.challengeDiscard({epoch:store.epoch,owner:b.owner,game:b.game,id:b.id,revision:b.revision})).toBe(true);});
 expect(disk().profiles!.people.family.challenge!.paused.find(x=>x.game===a.game)!.revision).toBe(1);
 let flushed:boolean|undefined;
 await act(async()=>{flushed=await store.libraryFlush();});
 expect({flushed,error:store.error,drafts:db.drafts.length}).toEqual({flushed:true,error:null,drafts:0});
});

it('a Cove person change, also a whole-envelope write, clears folded draft debt too',async()=>{
 seed();await mount();
 await failFirstDraft();
 await act(async()=>{expect(await store.covePerson({type:'select',id:'cove-0'},store.epoch)).toBe(true);});
 let flushed:boolean|undefined;
 await act(async()=>{flushed=await store.libraryFlush();});
 expect({flushed,error:store.error}).toEqual({flushed:true,error:null});
});

it('a discard leaves an unrelated refused Library change showing and failing the flush',async()=>{
 seed();await mount();
 await act(async()=>{store.libraryPolicy('family',{} as LibraryPolicy);});
 const refused=store.error;
 expect(refused).toMatch(/Library change could not be saved/);
 const b=family().paused[2];
 await act(async()=>{expect(await store.challengeDiscard({epoch:store.epoch,owner:b.owner,game:b.game,id:b.id,revision:b.revision})).toBe(true);});
 expect(store.error).toBe(refused);
 let flushed:boolean|undefined;
 await act(async()=>{flushed=await store.libraryFlush();});
 expect(flushed).toBe(false);
});
