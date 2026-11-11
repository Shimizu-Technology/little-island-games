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

for(const boundary of ['discard','cove'] as const)it(`${boundary} keeps the error for a change refused during its envelope write`,async()=>{
 seed();await mount();
 const {storage}=await import('../src/state/storage');
 const original=storage.set;
 let release=()=>{},entered=false;
 vi.spyOn(storage,'set').mockImplementationOnce(async(raw,meta)=>{entered=true;await new Promise<void>(r=>{release=r;});return original(raw,meta);});
 let pending:Promise<boolean>|undefined;
 try {
  await act(async()=>{
   if(boundary==='cove')pending=store.covePerson({type:'select',id:'cove-0'},store.epoch);
   else {const b=family().paused[2];pending=store.challengeDiscard({epoch:store.epoch,owner:b.owner,game:b.game,id:b.id,revision:b.revision});}
  });
  expect(entered).toBe(true);
  await act(async()=>{store.settings({sound:false});});
  expect(store.save.settings.sound).toBe(true);
  const refused=store.error;
  expect(refused).toMatch(/Please try this change again/);
  await act(async()=>{release();expect(await pending).toBe(true);});
  console.log('REFUSED DURING BOUNDARY',JSON.stringify({boundary,refused,error:store.error,memorySound:store.save.settings.sound,diskSound:disk().settings.sound}));
  expect(store.error).toBe(refused);
 } finally {release();if(pending)await act(async()=>{await pending;});}
});
