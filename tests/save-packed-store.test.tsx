import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { fixture, envelope } from './helpers/save-packed';
import { registerSaveContent } from '../src/state/challenge';
import { catalogManifest } from '../src/state/catalogManifest';
import { encodeSave, projectProfile } from '../src/state/profiles';
import { StoreProvider, useStore } from '../src/state/Store';
import { createBankLoader, type BankLoader } from '../src/puzzles/loader';

vi.mock('../src/challenge/registry.generated', () => ({ challengeEntries: [] }));
const db=vi.hoisted(()=>({raw:null as string|null,preserved:[] as string[],loader:null as BankLoader|null}));
vi.mock('../src/puzzles/catalog',()=>({bankLoader:()=>db.loader!}));
vi.mock('../src/state/storage',()=>({storage:{get:async()=>db.raw,set:async(raw:string)=>{db.raw=raw;},preserve:async(raw:string)=>{db.preserved.push(raw);},readDrafts:async()=>[],listRecovery:async()=>[],readRecovery:async()=>null}}));
vi.mock('react-native',()=>({AppState:{addEventListener:()=>({remove(){}})}}));
vi.mock('../src/components/Audio',()=>({AudioPreferences:createContext({})}));
let store:ReturnType<typeof useStore>,view:ReactTestRenderer|undefined;
function Probe(){const s=useStore();useLayoutEffect(()=>{store=s;},[s]);return null;}
const mount=async()=>{await act(async()=>{view=create(<StoreProvider><Probe/></StoreProvider>);});};
afterEach(async()=>{if(view)await act(async()=>view!.unmount());view=undefined;vi.unstubAllGlobals();});
function setup(index:number){
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);const f=fixture();registerSaveContent(f.catalog,catalogManifest(f.catalog));db.loader=f.loader;db.preserved=[];
 const s=envelope(f);for(const p of [...Object.values(s.profiles!.people),...Object.values(s.cove!.people)])for(const session of p.challenge!.paused)session.puzzle=f.session(session.owner,Number(session.game.slice(-1)),index).puzzle;
 db.raw=encodeSave(projectProfile(s));return f;
}
it('Store cold hydration, backup and restore retain every paused session',async()=>{
 const f=setup(10),original=db.raw!;await mount();expect(store.ready).toBe(true);expect(store.recovery).toBeNull();
 expect(await store.backup()).toBe(original);f.loader.release();
 await act(async()=>{await store.restore(original);});
 expect(store.recovery).toBeNull();expect(store.save.profiles!.people.family.challenge!.paused).toHaveLength(8);
 expect(store.save.cove!.people['cove-3'].challenge.paused).toHaveLength(4);expect(db.preserved).toContain(original);
});
it('Store loads and exports with unread content; only Continue waits, and retry reopens the exact slot',async()=>{
 const f=setup(80),original=db.raw!,asset=f.root.families[0][1],text=f.files.get(asset)!;f.files.delete(asset);
 await mount();expect(store.recovery).toBeNull();expect(db.raw).toBe(original);expect(f.reads).toEqual([]);expect(await store.backup()).toBe(original);
 const owner=store.save.learning!.active,slot=store.save.challenge!.paused[0],guard={owner,game:slot.game,epoch:store.epoch,id:slot.id,revision:slot.revision};
 await act(async()=>{expect(await store.challengeOpen(guard)).toMatchObject({ok:false,kind:'content-unavailable'});});
 f.files.set(asset,text);await act(async()=>{expect(await store.challengeOpen(guard)).toEqual({ok:true});});expect(encodeSave(store.save)).toBe(original);
});
it('import of structurally valid unopened work succeeds without assets and preserves both saves',async()=>{
 const f=setup(20),accepted=db.raw!;await mount();const incoming=envelope(f);
 for(const p of Object.values(incoming.profiles!.people))for(const s of p.challenge!.paused)s.puzzle=f.session(s.owner,Number(s.game.slice(-1)),70).puzzle;
 const raw=encodeSave(projectProfile(incoming)),asset=f.root.families[0][1];f.loader.release();f.files.delete(asset);const epoch=store.epoch;
 await act(async()=>{await store.restore(raw);});
 expect(store.recovery).toBeNull();expect(store.epoch).toBeGreaterThan(epoch);expect(store.save.challenge!.paused[0].puzzle.puzzle).toBe(70);expect(db.raw).toBe(encodeSave(store.save));expect(db.preserved).toContain(accepted);expect({...JSON.parse(db.raw!),saveRevision:JSON.parse(raw).saveRevision}).toEqual(JSON.parse(raw));expect(f.reads).toEqual([]);
});
it('a delayed start cannot publish after a person switch',async()=>{
 const f=setup(30),empty=envelope(f);for(const p of [...Object.values(empty.profiles!.people),...Object.values(empty.cove!.people)])p.challenge!.paused=[];
 db.raw=encodeSave(projectProfile(empty));await mount();const owner=store.save.learning!.active,s=f.session(owner,0,95),epoch=store.epoch;
 let release!:()=>void,entered!:()=>void;const gate=new Promise<void>(r=>{release=r;}),started=new Promise<void>(r=>{entered=r;});
 db.loader=createBankLoader({root:f.root,transport:{read:async name=>{entered();await gate;return f.files.get(name)!;}}});
 let pending!:Promise<boolean>;await act(async()=>{pending=store.challengeSave(s,{owner,game:s.game,epoch,id:null,revision:null});await started;store.selectLearner('family');release();expect(await pending).toBe(false);});
 expect(store.save.learning!.active).toBe('family');expect(Object.values(store.save.profiles!.people).every(p=>p.challenge!.paused.length===0)).toBe(true);
});
