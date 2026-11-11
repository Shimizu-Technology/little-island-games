import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { fixture, envelope } from './helpers/save-packed';
import { registerSaveContent, saveCatalog } from '../src/state/challenge';
import { catalogManifest } from '../src/state/catalogManifest';
import { encodeSave, projectProfile } from '../src/state/profiles';
import { StoreProvider, useStore } from '../src/state/Store';
import { prepareSessionContent, prepareSaveContent, contentUnavailable, sessionContentSize } from '../src/state/sessionContent';
import { parseSaveWithContent } from '../src/state/validation';
import { recoverChallengeDrafts } from '../src/state/challengeDrafts';
import { type BankLoader } from '../src/puzzles/loader';

vi.mock('../src/challenge/registry.generated', () => ({ challengeEntries: [] }));
const db=vi.hoisted(()=>({raw:null as string|null,preserved:[] as string[],drafts:[] as string[],loader:null as Pick<BankLoader,'savedHash'>|null,onSet:null as (()=>Promise<void>)|null}));
vi.mock('../src/puzzles/catalog',()=>({bankLoader:()=>db.loader!}));
vi.mock('../src/state/storage',()=>({storage:{get:async()=>db.raw,set:async(raw:string)=>{await db.onSet?.();db.raw=raw;},preserve:async(raw:string)=>{db.preserved.push(raw);},readDrafts:async()=>db.drafts,listRecovery:async()=>db.preserved.length?[{key:'newest'}]:[],readRecovery:async()=>db.preserved.at(-1)??null}}));
vi.mock('react-native',()=>({AppState:{addEventListener:()=>({remove(){}})}}));
vi.mock('../src/components/Audio',()=>({AudioPreferences:createContext({})}));
let store:ReturnType<typeof useStore>,view:ReactTestRenderer|undefined;
function Probe(){const s=useStore();useLayoutEffect(()=>{store=s;},[s]);return null;}
const mount=async()=>{await act(async()=>{view=create(<StoreProvider><Probe/></StoreProvider>);});};
afterEach(async()=>{if(view)await act(async()=>view!.unmount());view=undefined;db.onSet=null;vi.restoreAllMocks();vi.unstubAllGlobals();});
function setup(index:number,empty=false){
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);const f=fixture();registerSaveContent(f.catalog,catalogManifest(f.catalog));db.loader=f.loader;db.preserved=[];db.drafts=[];
 const s=envelope(f);for(const p of [...Object.values(s.profiles!.people),...Object.values(s.cove!.people)]){for(const session of p.challenge!.paused)session.puzzle=f.session(session.owner,Number(session.game.slice(-1)),index).puzzle;if(empty){p.challenge!.paused=[];p.challenge!.nextOrdinal=1;}}
 db.raw=encodeSave(projectProfile(s));return f;
}
it('F4-1: damaged inactive slot cannot block launch, backup, restore or another learner; Continue alone fails kindly',async()=>{
 const f=setup(81),original=db.raw!,asset='p103';f.files.set(asset,f.files.get(asset)!+' ');
 await mount();expect(store.ready).toBe(true);expect(store.recovery).toBeNull();expect(f.reads).toEqual([]);expect(db.raw).toBe(original);
 expect(await store.backup()).toBe(original);await act(async()=>store.restore(original));expect(store.recovery).toBeNull();expect(f.reads).toEqual([]);
 await act(async()=>store.selectLearner('family'));const slot=store.save.challenge!.paused[3],epoch=store.epoch;
 let result:unknown;await act(async()=>{result=await store.challengeOpen({owner:'family',game:slot.game,epoch,id:slot.id,revision:slot.revision});});
 expect(result).toEqual({ok:false,kind:'content-unavailable',message:expect.stringMatching(/Your saved work is kept.*[Tt]ry again/)});
 expect(JSON.stringify(result)).not.toMatch(/Pack|103|hash|asset/);expect(store.recovery).toBeNull();expect(store.error).toBeNull();expect(store.epoch).toBe(epoch);
 const healthy=store.save.challenge!.paused[4];await act(async()=>{expect(await store.challengeOpen({owner:'family',game:healthy.game,epoch,id:healthy.id,revision:healthy.revision})).toEqual({ok:true});});
 expect(store.save.challenge!.paused[3]).toEqual(slot);
});
it('F4-1: forged packed hash stays inert at load and cannot continue or earn credit',async()=>{
 const f=setup(82),s=JSON.parse(db.raw!);s.profiles.people.a.challenge.paused[0].puzzle.hash='f'.repeat(64);db.raw=JSON.stringify(s);await mount();expect(store.recovery).toBeNull();await act(async()=>store.selectLearner('a'));
 const slot=store.save.challenge!.paused[0],guard={owner:'a',game:slot.game,epoch:store.epoch,id:slot.id,revision:slot.revision},before=encodeSave(store.save);
 await act(async()=>{expect(await store.challengeOpen(guard)).toMatchObject({ok:false,kind:'invalid-session'});expect(await store.challengeSave({...slot,revision:1,payload:1},guard)).toBe(false);});
 expect(encodeSave(store.save)).toBe(before);expect(db.raw).toBe(before);expect(f.reads.length).toBeGreaterThan(0);
});
it('F4-4: eviction during a committed boundary cannot leave memory behind disk',async()=>{
 const f=setup(91,true);await mount();await act(async()=>store.selectLearner('a'));const s=f.session('a',0,91);
 db.onSet=async()=>{for(let i=0;i<90;i++)await prepareSessionContent(f.session('family',0,i),saveCatalog,{loader:f.loader});};
 await act(async()=>{expect(await store.challengeSave(s,{owner:'a',game:s.game,epoch:store.epoch,id:null,revision:null})).toBe(true);});
 expect(encodeSave(store.save)).toBe(db.raw);expect(store.save.challenge!.paused).toEqual([s]);expect(sessionContentSize(saveCatalog).pinned).toBe(1);
});
it('F4-5: non-BankError resolution is retryable, never a corruption verdict',async()=>{
 const f=fixture();let failure:unknown;try{await prepareSessionContent(f.session(),f.catalog,{loader:{savedHash:async()=>{throw new RangeError('root detail');}}});}catch(error){failure=error;}
 expect(contentUnavailable(failure)).toBe(true);expect(failure).toMatchObject({kind:'content-unavailable'});
 const base=envelope(f),row=JSON.stringify({version:1,base:base.saveRevision,session:{...f.session(),revision:1,payload:1}}),preserve=vi.fn();
 const recovered=await recoverChallengeDrafts(base,{get:async()=>null,set:async()=>{},preserve,listRecovery:async()=>[],readRecovery:async()=>null,readDrafts:async()=>[row]},f.catalog,{loader:{savedHash:async()=>{throw new RangeError('root detail');}}});
 expect(preserve).not.toHaveBeenCalled();expect(recovered.profiles!.people.family.challenge!.paused[0].revision).toBe(1);
});
it('F4-6: cancelled start produces a typed stale refusal',async()=>{
 const f=setup(92,true);await mount();await act(async()=>store.selectLearner('a'));let release!:()=>void,entered!:()=>void;const gate=new Promise<void>(r=>release=r),started=new Promise<void>(r=>entered=r);
 db.loader={savedHash:async(bank,index)=>{entered();await gate;return f.loader.savedHash(bank,index);}};const s=f.session('a',0,92);
 await act(async()=>{const pending=store.challengeSave(s,{owner:'a',game:s.game,epoch:store.epoch,id:null,revision:null});await started;store.selectLearner('family');release();expect(await pending).toBe(false);});
 expect(store.challengeRefusal).toBe('stale');
});
it.each(['session','puzzle'])('F4-7: extra envelope key %s cannot hide paused refs during an explicit integrity audit',async key=>{
 const f=fixture();registerSaveContent(f.catalog,catalogManifest(f.catalog));const raw=JSON.stringify({...JSON.parse(encodeSave(envelope(f))),[key]:{}});
 // Explicit envelope traversal must visit every slot even with unrelated extra root keys.
 await prepareSaveContent(JSON.parse(raw),f.catalog,{loader:f.loader});
 expect(f.reads.filter(name=>name.startsWith('p'))).toHaveLength(8);
 await expect(parseSaveWithContent(raw,{loader:f.loader})).resolves.toBeDefined();
});
it('F4-8: repeated rejected imports preserve only one exact newest copy',async()=>{
 setup(93,true);await mount();const raw='{bad import';for(let i=0;i<5;i++)await act(async()=>{await expect(store.restore(raw)).rejects.toThrow();});expect(db.preserved.filter(x=>x===raw)).toHaveLength(1);
});

it('F4-9: failed start explains recovery without exposing asset/hash details',async()=>{
 const f=setup(94,true);await mount();const owner=store.save.learning!.active,s=f.session(owner,0,94);f.files.set('p100',f.files.get('p100')!+' ');
 await act(async()=>{expect(await store.challengeSave(s,{owner,game:s.game,epoch:store.epoch,id:null,revision:null})).toBe(false);});
 expect(store.error).toMatch(/Your saved work is kept.*Try again/);expect(store.error).not.toMatch(/Pack|100|hash|asset/);expect(store.recovery).toBeNull();
});
