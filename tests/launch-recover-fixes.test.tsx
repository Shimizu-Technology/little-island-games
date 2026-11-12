import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { fixture, envelope } from './helpers/save-packed';
import { registerSaveContent, type ChallengeSession } from '../src/state/challenge';
import { catalogManifest } from '../src/state/catalogManifest';
import { encodeSave, projectProfile } from '../src/state/profiles';
import { pack } from '../src/state/saveBits';
import { encodeNotices, parseNotices, setAsideUnresolved } from '../src/state/setAside';
import { ScreenBoundary } from '../src/components/LaunchError';
import { BOOT_TIMEOUT_MS, bootTimeoutMessage, StoreProvider, useStore } from '../src/state/Store';
import type { EnvelopeWrite } from '../src/state/storage';
import type { BankLoader } from '../src/puzzles/loader';
import type { Save } from '../src/state/validation';

// Launch recovery, independent review round: R1 (timed-out load writes late), R2 (boundary retry
// remounts the Store mid-write), R3 (the pre-pass hid corruption), R4 (notices didn't persist).
const db=vi.hoisted(()=>({raw:null as string|null,notices:null as string|null,preserved:[] as string[],log:[] as string[],sets:[] as {raw:string;metadata?:EnvelopeWrite}[],loader:null as BankLoader|null,gets:0}));
// The fixture's banks stand in for the real registry, whose packed ordinals would overlap them.
vi.mock('../src/challenge/registry.generated',()=>({challengeEntries:[]}));
vi.mock('../src/puzzles/catalog',()=>({bankLoader:()=>db.loader!}));
vi.mock('../src/state/storage',()=>({storage:{
 get:async()=>{db.gets++;return db.raw;},
 // Like the native transaction: the notices row changes in the same write as the save, or not at all.
 set:async(raw:string,metadata?:EnvelopeWrite)=>{db.sets.push({raw,metadata});db.raw=raw;if(metadata?.notices!==undefined)db.notices=metadata.notices;},
 preserve:async(raw:string)=>{db.preserved.push(raw);},discardSession:async()=>{},logLaunch:async(entry:string)=>{db.log.push(entry);},
 readNotices:async()=>db.notices,writeNotices:async(raw:string|null)=>{db.notices=raw;},
 readDrafts:async()=>[],listRecovery:async()=>[],readRecovery:async()=>null}}));
vi.mock('react-native',()=>({AppState:{addEventListener:()=>({remove(){}})},View:'div',Pressable:'button',Text:'span'}));
const nav=vi.hoisted(()=>({dismissTo:vi.fn(),replace:vi.fn()}));
vi.mock('expo-router',()=>({router:nav}));
vi.mock('../src/components/Audio',()=>({AudioPreferences:createContext({})}));
let store:ReturnType<typeof useStore>,view:ReactTestRenderer|undefined;
function Probe(){const s=useStore();useLayoutEffect(()=>{store=s;},[s]);return null;}
const mount=async()=>{await act(async()=>{view=create(<StoreProvider><Probe/></StoreProvider>);});};
const unmount=async()=>{await act(async()=>view!.unmount());view=undefined;};
afterEach(async()=>{if(view)await unmount();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
const f=fixture();
registerSaveContent(f.catalog,catalogManifest(f.catalog));
const marks=(slot:number,count=100)=>[slot,pack(Array.from({length:count},(_,i)=>i===0?5:0),3),pack(Array<number>(count).fill(0),2)] as [number,string,string];
type Progress=NonNullable<Save['challenge']>;
/** Four learners and four Cove people with paused rounds; `change` edits any person's progress. */
function seed(change:(person:(id:string)=>Progress)=>void){
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);db.loader=f.loader;db.preserved=[];db.log=[];db.sets=[];db.notices=null;db.gets=0;
 const s=envelope(f);
 for(const p of Object.values(s.profiles!.people))p.challenge!.banks=[marks(101),marks(105)];
 change(id=>(s.profiles!.people[id]??s.cove!.people[id]).challenge!);
 db.raw=encodeSave(projectProfile({...s,learning:{...s.learning!,active:'family'}}));return db.raw;
}
const unknownBank=(c:Progress,at=2)=>{c.paused[at]={...c.paused[at],puzzle:{...c.paused[at].puzzle,bank:300}};};
const family=()=>store.save.profiles!.people.family.challenge!;
/** Holds the first call of a storage method until released. */
async function hold(method:'preserve'|'set'){
 const {storage}=await import('../src/state/storage');
 const original=storage[method] as (...args:unknown[])=>Promise<void>;
 const held={blocked:false,release:()=>{}};
 vi.spyOn(storage,method).mockImplementation(async(...args:unknown[])=>{
  if(!held.blocked){held.blocked=true;await new Promise<void>(r=>{held.release=r;});}
  return original(...args);
 });
 return held;
}

// R1: a load that timed out must never write after a retry or restore has completed.
it('R1: a timed-out load cannot overwrite a completed Start fresh',async()=>{
 const original=seed(p=>unknownBank(p('family')));
 vi.useFakeTimers();vi.spyOn(console,'warn').mockImplementation(()=>{});
 const held=await hold('preserve'); // the load is inside preserve-and-replace, about to write the filtered save
 await mount();expect(held.blocked).toBe(true);expect(store.ready).toBe(false);
 await act(async()=>{vi.advanceTimersByTime(BOOT_TIMEOUT_MS);});expect(store.recovery).toBe(bootTimeoutMessage);
 await act(async()=>{await store.startFresh();});
 const restored=db.raw;expect(store.recovery).toBeNull();expect(store.save.learning?.people).toHaveLength(1);
 await act(async()=>{held.release();});
 expect(db.raw).toBe(restored);expect(JSON.parse(db.raw!).learning.people).toHaveLength(1);
 expect(store.save.learning?.people).toHaveLength(1);expect(store.recovery).toBeNull();
 expect(db.preserved).toContain(original); // the five-learner original is still kept
});

it('R1: a timed-out load cannot overwrite changes made after Try opening again',async()=>{
 seed(p=>unknownBank(p('family')));
 vi.useFakeTimers();vi.spyOn(console,'warn').mockImplementation(()=>{});
 const held=await hold('preserve');
 await mount();await act(async()=>{vi.advanceTimersByTime(BOOT_TIMEOUT_MS);});
 await act(async()=>{await store.retry();});expect(store.recovery).toBeNull();
 await act(async()=>{store.settings({sound:false});});
 const saved=db.raw;expect(JSON.parse(saved!).settings.sound).toBe(false);
 const writes=db.sets.length;
 await act(async()=>{held.release();});
 expect(db.raw).toBe(saved);expect(db.sets).toHaveLength(writes); // the late load wrote nothing
 expect(store.save.settings.sound).toBe(false);expect(store.recovery).toBeNull();
});

it('R1: a retry waits for a replacement the timed-out load already began, then reads what it wrote',async()=>{
 seed(p=>unknownBank(p('family')));
 vi.useFakeTimers();vi.spyOn(console,'warn').mockImplementation(()=>{});
 const held=await hold('set'); // the replacement write itself is in flight
 await mount();await act(async()=>{vi.advanceTimersByTime(BOOT_TIMEOUT_MS);});
 const gets=db.gets;let retried=false;
 await act(async()=>{void store.retry().then(()=>{retried=true;});});
 expect(db.gets).toBe(gets);expect(retried).toBe(false); // nothing is read while that write is running
 await act(async()=>{held.release();});
 expect(retried).toBe(true);expect(store.recovery).toBeNull();
 expect(encodeSave(store.save)).toBe(db.raw);expect(family().paused).toHaveLength(7);
});

it('R1: with nothing newer, a load that finishes after the timeout still opens the island',async()=>{
 seed(p=>unknownBank(p('family')));
 vi.useFakeTimers();vi.spyOn(console,'warn').mockImplementation(()=>{});
 const held=await hold('preserve');
 await mount();await act(async()=>{vi.advanceTimersByTime(BOOT_TIMEOUT_MS);});expect(store.recovery).toBe(bootTimeoutMessage);
 await act(async()=>{held.release();});
 expect(store.recovery).toBeNull();expect(family().paused).toHaveLength(7);expect(encodeSave(store.save)).toBe(db.raw);
});

// R2: a Store mounted after another (a cold start in the same runtime, as in these tests) never takes over
// the old one's memory. It waits for writes already running, then reads storage. (The app itself never
// remounts the Store: see launch-recover-store-above.)
it('R2: a Store mounted while the last one\'s save is still being written waits for it and reads it',async()=>{
 seed(()=>{});await mount();
 const held=await hold('set');
 await act(async()=>{store.settings({sound:false});});expect(held.blocked).toBe(true);
 await unmount();await mount();expect(store.ready).toBe(false);
 await act(async()=>{held.release();});
 expect(store.ready).toBe(true);expect(store.save.settings.sound).toBe(false);
 await act(async()=>{store.settings({help:false});});
 expect(JSON.parse(db.raw!).settings).toMatchObject({sound:false,help:false});
});

it('R2: the next Store reads storage, not the last one\'s memory',async()=>{
 seed(()=>{});await mount();
 await act(async()=>{store.settings({sound:false});});
 await unmount();db.raw=db.raw!.replace('"sound":false','"sound":true');
 await mount();expect(store.save.settings.sound).toBe(true);
});

it('R2: a screen that fails to render is caught below the Store, which keeps its accepted state and write queue',async()=>{
 seed(()=>{});const broken={on:false};
 function Screen(){if(broken.on)throw new Error('A screen failed');return <article/>;}
 vi.spyOn(console,'error').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 await act(async()=>{view=create(<StoreProvider><Probe/><ScreenBoundary><Screen/></ScreenBoundary></StoreProvider>);});
 const held=await hold('set');
 await act(async()=>{store.settings({sound:false});});expect(held.blocked).toBe(true);
 const accepted=store.save;broken.on=true;
 await act(async()=>{view!.update(<StoreProvider><Probe/><ScreenBoundary><Screen key="again"/></ScreenBoundary></StoreProvider>);});
 const label=(n:{children:unknown[]}):string=>n.children.map(c=>typeof c==='string'?c:label(c as {children:unknown[]})).join('');
 expect(view!.root.findAll(n=>n.type==='button').map(label)).toEqual(['Try again','Back to the map']);
 expect(JSON.parse(db.log.at(-1)!)).toMatchObject({where:'screen'});
 await act(async()=>{held.release();});
 expect(db.gets).toBe(1);expect(store.save).toBe(accepted);expect(JSON.parse(db.raw!).settings.sound).toBe(false); // same Store, never reloaded
 broken.on=false;
 await act(async()=>{view!.root.findAll(n=>n.type==='button')[1].props.onPress();});
 expect(nav.dismissTo).toHaveBeenCalledWith('/');expect(view!.root.findAll(n=>n.type==='article')).toHaveLength(1);
 await act(async()=>{store.settings({help:false});});
 expect(JSON.parse(db.raw!).settings).toMatchObject({sound:false,help:false});
});

// R3: only well-formed entries that name unknown or changed banks are set aside. Damage goes to Recovery.
it('R3: a known bank with corrupted award bytes goes to Recovery; its valid completion marks are not removed',async()=>{
 const original=seed(p=>{p('family').banks[0][2]='corrupt';});
 vi.spyOn(console,'warn').mockImplementation(()=>{});
 expect(setAsideUnresolved(original,f.catalog)).toEqual({raw:original,setAside:[]});
 await mount();
 expect(store.recovery).not.toBeNull();expect(store.setAside).toEqual([]);
 expect(db.raw).toBe(original);expect(db.preserved).toContain(original);
});

it('R3: a malformed paused round that also names an unknown bank still fails validation',async()=>{
 const original=seed(p=>{const c=p('family');c.paused[2]={...c.paused[2],version:99,owner:'someone-else',puzzle:{...c.paused[2].puzzle,bank:300}} as unknown as ChallengeSession;});
 vi.spyOn(console,'warn').mockImplementation(()=>{});
 expect(setAsideUnresolved(original,f.catalog).setAside).toEqual([]);
 await mount();expect(store.recovery).not.toBeNull();expect(db.raw).toBe(original);
});

it('R3: other damage beside an unknown bank also keeps that person exactly as stored',()=>{
 const cases:((c:Progress)=>void)[]=[
  c=>{c.banks.push([300,'not packed!','']);}, // an unknown bank, but the row isn't a marks row at all
  c=>{unknownBank(c);c.paused.push(...c.paused.slice(0,1));}, // over the paused limit and duplicated
  c=>{unknownBank(c);c.nextOrdinal=2;}, // ordinals past the counter
  c=>{unknownBank(c);(c as unknown as Record<string,unknown>).extra=1;},
  c=>{unknownBank(c);c.recent=[[300,1],[300,1]];}, // duplicate rows
  c=>{unknownBank(c);c.bests=Array.from({length:300},(_,i)=>[300,i%1000,1]);}, // beyond the list bound
 ];
 for(const change of cases){const raw=seed(p=>change(p('family')));expect(setAsideUnresolved(raw,f.catalog).setAside).toEqual([]);}
 // The same unknown bank on its own is set aside, and so is a well-formed row for an unknown bank.
 const raw=seed(p=>{unknownBank(p('family'));p('family').banks.push(marks(300,40));});
 expect(setAsideUnresolved(raw,f.catalog).setAside).toEqual([{owner:'family',games:['packed-2'],marks:1}]);
});

it('R3: a row for a known bank is set aside only when both of its fields were written for another size',()=>{
 const half=(slot:number)=>[slot,marks(slot,160)[1],marks(slot)[2]] as [number,string,string];
 expect(setAsideUnresolved(seed(p=>{p('family').banks=[marks(101),half(103),marks(105)];}),f.catalog).setAside).toEqual([]);
 expect(setAsideUnresolved(seed(p=>{p('family').banks=[marks(101),marks(103,160),marks(105)];}),f.catalog).setAside).toEqual([{owner:'family',games:[],marks:1}]);
});

// R4: a set-aside notice stays until each affected person has seen it and tapped OK.
it('R4: notices are written with the replacement and survive relaunch until OK, for each person separately',async()=>{
 seed(p=>{unknownBank(p('family'));unknownBank(p('b'),5);unknownBank(p('cove-1'),1);});
 await mount();
 const notices=[{owner:'family',games:['packed-2'],marks:0},{owner:'b',games:['packed-5'],marks:0},{owner:'cove-1',games:['packed-1'],marks:0}];
 expect(store.setAside).toEqual(notices);
 // Same write as the filtered save, so neither can land without the other.
 expect(db.sets).toHaveLength(1);expect(db.sets[0].metadata?.notices).toBe(encodeNotices(notices));
 await unmount();await mount(); // closed before anyone saw it
 expect(store.setAside).toEqual(notices);expect(db.sets).toHaveLength(1);
 await act(async()=>{store.dismissSetAside('family');});
 expect(store.setAside).toEqual(notices.slice(1));
 await unmount();await mount();
 expect(store.setAside).toEqual(notices.slice(1)); // b and the Cove person still haven't seen theirs
 await act(async()=>{store.dismissSetAside('b');store.dismissSetAside('cove-1');});
 expect(db.notices).toBeNull();
 await unmount();await mount();expect(store.setAside).toEqual([]);
});

it('R4: a second set-aside adds to notices not yet seen; a restore clears them',async()=>{
 seed(p=>unknownBank(p('family')));await mount();
 const first=db.raw!,notices=db.notices;
 await unmount();
 db.raw=first.replace('"bank":101,','"bank":301,');expect(db.raw).not.toBe(first); // another build, another missing bank
 await mount();
 expect(store.setAside).toHaveLength(1);
 expect(store.setAside).toEqual([{owner:'family',games:['packed-2','packed-1'],marks:0}]);expect(db.notices).toBe(encodeNotices(store.setAside));expect(db.notices).not.toBe(notices);
 await act(async()=>{await store.startFresh();});
 expect(store.setAside).toEqual([]);expect(db.notices).toBeNull();
});

it('R4: notices are validated; damaged rows and removed people are ignored',()=>{
 const ok=encodeNotices([{owner:'family',games:['loop'],marks:1}]);
 expect(parseNotices(ok,['family'])).toEqual([{owner:'family',games:['loop'],marks:1}]);
 expect(parseNotices(ok,['a'])).toEqual([]);
 for(const raw of ['{','[]','{"version":2,"items":[]}','{"version":1,"items":[{"owner":"family","games":["Loop!"],"marks":1}]}','{"version":1,"items":[{"owner":"family","games":[],"marks":-1}]}','{"version":1,"items":[],"extra":1}'])
  expect(parseNotices(raw,['family'])).toEqual([]);
});
