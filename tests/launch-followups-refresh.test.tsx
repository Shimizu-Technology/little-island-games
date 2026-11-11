import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { fixture, envelope } from './helpers/save-packed';
import { registerSaveContent } from '../src/state/challenge';
import { catalogManifest } from '../src/state/catalogManifest';
import { encodeSave, projectProfile } from '../src/state/profiles';
import { pack } from '../src/state/saveBits';
import { StoreProvider, useStore } from '../src/state/Store';
import type { EnvelopeWrite } from '../src/state/storage';
import type { BankLoader } from '../src/puzzles/loader';
import type { Save } from '../src/state/validation';

// Launch follow-ups, REVIEW-3 P2, through the real React Refresh runtime. A refresh of the Store's
// component family keeps its hooks and reruns its effects. It must not hydrate over accepted work.
const db=vi.hoisted(()=>({raw:null as string|null,notices:null as string|null,loader:null as BankLoader|null,gets:0,drafts:[] as string[]}));
vi.mock('../src/challenge/registry.generated',()=>({challengeEntries:[]}));
vi.mock('../src/puzzles/catalog',()=>({bankLoader:()=>db.loader!}));
vi.mock('../src/state/storage',()=>({storage:{
 get:async()=>{db.gets++;return db.raw;},
 set:async(raw:string,metadata?:EnvelopeWrite)=>{db.raw=raw;db.drafts=[];if(metadata?.notices!==undefined)db.notices=metadata.notices;},
 preserve:async()=>{},discardSession:async()=>{},logLaunch:async()=>{},
 readNotices:async()=>db.notices,writeNotices:async(raw:string|null)=>{db.notices=raw;},
 readDrafts:async()=>db.drafts,writeDraft:async(raw:string)=>{db.drafts.push(raw);},
 listRecovery:async()=>[],readRecovery:async()=>null}}));
vi.mock('react-native',()=>({AppState:{addEventListener:()=>({remove(){}})},View:'div',Pressable:'button',Text:'span'}));
vi.mock('expo-router',()=>({router:{dismissTo:vi.fn(),replace:vi.fn()},useNavigationContainerRef:()=>null}));
vi.mock('../src/components/Audio',()=>{
 const Base=createContext({});
 return {AudioPreferences:{...Base,Provider:({children,value}:{children:React.ReactNode;value:object})=><Base.Provider value={value}>{children}</Base.Provider>}};
});
const runtime=await vi.hoisted(async()=>{
 const {createRequire}=await import('node:module');
 const refresh=createRequire(import.meta.url)('react-refresh/runtime');
 refresh.injectIntoGlobalHook(globalThis);
 return refresh as {register:(type:unknown,id:string)=>void;performReactRefresh:()=>{updatedFamilies:Set<unknown>;staleFamilies:Set<unknown>}|null};
});
let store:ReturnType<typeof useStore>,view:ReactTestRenderer|undefined;
function Probe(){const s=useStore();useLayoutEffect(()=>{store=s;},[s]);return null;}
afterEach(async()=>{if(view)await act(async()=>view!.unmount());view=undefined;vi.unstubAllGlobals();vi.restoreAllMocks();});
const f=fixture();
registerSaveContent(f.catalog,catalogManifest(f.catalog));
const marks=(slot:number)=>[slot,pack(Array.from({length:100},(_,i)=>i===0?5:0),3),pack(Array<number>(100).fill(0),2)] as [number,string,string];
const disk=()=>JSON.parse(db.raw!) as Save;
function seed(){
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);db.loader=f.loader;db.notices=null;db.gets=0;db.drafts=[];
 const s=envelope(f);
 for(const p of Object.values(s.profiles!.people))p.challenge!.banks=[marks(101),marks(105)];
 db.raw=encodeSave(projectProfile({...s,learning:{...s.learning!,active:'family'}}));
}
/** Mounts the Store as a registered refresh family, and returns a refresh that swaps in a new identity. */
async function mountFamily(id:string){
 const Base=new Proxy(StoreProvider,{});runtime.register(Base,id);
 await act(async()=>{view=create(<Base><Probe/></Base>);});
 return async()=>{
  // Same implementation and hook order, a new function identity: a component-family update.
  runtime.register(new Proxy(StoreProvider,{}),id);
  let update:ReturnType<typeof runtime.performReactRefresh>=null;
  await act(async()=>{update=runtime.performReactRefresh();});
  expect(update).not.toBeNull();expect(update!.updatedFamilies.size).toBe(1);expect(update!.staleFamilies.size).toBe(0);
 };
}

it('a refresh keeps an accepted change whose save failed, with its error, and reads storage once',async()=>{
 seed();const refresh=await mountFamily('followups/failed');
 const {storage}=await import('../src/state/storage');
 vi.spyOn(storage,'set').mockRejectedValueOnce(new Error('disk full'));
 await act(async()=>{store.settings({sound:false});});
 expect(store.save.settings.sound).toBe(false);expect(store.error).not.toBeNull();
 await refresh();
 expect(db.gets).toBe(1);
 expect(store.save.settings.sound).toBe(false);
 expect(store.error).not.toBeNull();
 expect(disk().settings.sound).toBe(true);
 // Try saving again writes the change the refresh kept.
 await act(async()=>{await store.retry();});
 expect(disk().settings.sound).toBe(false);expect(store.error).toBeNull();
});

it('a refresh between queued saves keeps memory ahead of disk, so a later save cannot write stale settings',async()=>{
 seed();const refresh=await mountFamily('followups/queue');
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
  await refresh();
  await act(async()=>{releaseFirst();});
  expect(entered).toBe(2);
  expect(store.save.settings).toMatchObject({sound:false,help:false});
  await act(async()=>{releaseSecond();});
  expect(disk().settings).toMatchObject({sound:false,help:false});
  await act(async()=>{store.settings({effects:false});});
  expect(disk().settings).toMatchObject({sound:false,help:false,effects:false});
  expect(store.save.settings).toMatchObject({sound:false,help:false,effects:false});
  expect(db.gets).toBe(1);
 }finally{await act(async()=>{releaseFirst();releaseSecond();});}
});
