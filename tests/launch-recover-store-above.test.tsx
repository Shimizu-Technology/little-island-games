import React, { createContext, useEffect, useLayoutEffect } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { fixture, envelope } from './helpers/save-packed';
import { registerSaveContent, type ChallengeSession } from '../src/state/challenge';
import { catalogManifest } from '../src/state/catalogManifest';
import { encodeSave, projectProfile } from '../src/state/profiles';
import { pack } from '../src/state/saveBits';
import { encodeNotices, parseNotices } from '../src/state/setAside';
import { StoreFailure, UIBoundaryView, rebuildable, type UINavigation } from '../src/components/LaunchError';
import { BACKUP_FLUSH_MS, BOOT_TIMEOUT_MS, noticesReadMessage, StoreProvider, useStore } from '../src/state/Store';
import type { EnvelopeWrite } from '../src/state/storage';
import type { BankLoader } from '../src/puzzles/loader';
import type { Save } from '../src/state/validation';

// Launch recovery, review round 2. The Store is mounted above the UI boundary and is never remounted, so
// no accepted state is handed between Store instances. Drafts are tracked per game, and the notices row
// is never treated as empty because a read failed, nor left behind by a restore.
const db=vi.hoisted(()=>({raw:null as string|null,notices:null as string|null,preserved:[] as string[],log:[] as string[],sets:[] as {raw:string;metadata?:EnvelopeWrite}[],loader:null as BankLoader|null,gets:0,drafts:[] as string[]}));
const failing=vi.hoisted(()=>({store:false}));
vi.mock('../src/challenge/registry.generated',()=>({challengeEntries:[]}));
vi.mock('../src/puzzles/catalog',()=>({bankLoader:()=>db.loader!}));
vi.mock('../src/state/storage',()=>({storage:{
 get:async()=>{db.gets++;return db.raw;},
 // Like the native transaction: the notices row changes in the same write as the save, or not at all.
 set:async(raw:string,metadata?:EnvelopeWrite)=>{db.sets.push({raw,metadata});db.raw=raw;db.drafts=[];if(metadata?.notices!==undefined)db.notices=metadata.notices;},
 preserve:async(raw:string)=>{db.preserved.push(raw);},discardSession:async()=>{},logLaunch:async(entry:string)=>{db.log.push(entry);},
 readNotices:async()=>db.notices,writeNotices:async(raw:string|null)=>{db.notices=raw;},
 readDrafts:async()=>db.drafts,
 // Each game has its own row, checked against the committed envelope revision.
 writeDraft:async(raw:string)=>{const row=JSON.parse(raw);if(row.base!==JSON.parse(db.raw!).saveRevision)throw new Error('stale base');db.drafts=db.drafts.filter(s=>JSON.parse(s).session.game!==row.session.game);db.drafts.push(raw);},
 listRecovery:async()=>[],readRecovery:async()=>null}}));
vi.mock('react-native',()=>({AppState:{addEventListener:()=>({remove(){}})},View:'div',Pressable:'button',Text:'span'}));
const nav=vi.hoisted(()=>({dismissTo:vi.fn(),replace:vi.fn()}));
vi.mock('expo-router',()=>({router:nav,useNavigationContainerRef:()=>null}));
// The Store's own provider tree. `failing.store` makes the Store itself fail to render.
vi.mock('../src/components/Audio',()=>{
 const Base=createContext({});
 return {AudioPreferences:{...Base,Provider:({children,value}:{children:React.ReactNode;value:object})=>{if(failing.store)throw new Error('The Store failed');return <Base.Provider value={value}>{children}</Base.Provider>;}}};
});
let store:ReturnType<typeof useStore>,view:ReactTestRenderer|undefined;
function Probe(){const s=useStore();useLayoutEffect(()=>{store=s;},[s]);return null;}
const mount=async()=>{await act(async()=>{view=create(<StoreProvider><Probe/></StoreProvider>);});};
const unmount=async()=>{await act(async()=>view!.unmount());view=undefined;};
afterEach(async()=>{if(view)await unmount();failing.store=false;vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
const f=fixture();
registerSaveContent(f.catalog,catalogManifest(f.catalog));
const marks=(slot:number,count=100)=>[slot,pack(Array.from({length:count},(_,i)=>i===0?5:0),3),pack(Array<number>(count).fill(0),2)] as [number,string,string];
type Progress=NonNullable<Save['challenge']>;
function seed(change:(person:(id:string)=>Progress)=>void=()=>{}){
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);db.loader=f.loader;db.preserved=[];db.log=[];db.sets=[];db.notices=null;db.gets=0;db.drafts=[];
 const s=envelope(f);
 for(const p of Object.values(s.profiles!.people))p.challenge!.banks=[marks(101),marks(105)];
 change(id=>(s.profiles!.people[id]??s.cove!.people[id]).challenge!);
 db.raw=encodeSave(projectProfile({...s,learning:{...s.learning!,active:'family'}}));return db.raw;
}
const unknownBank=(c:Progress,at=2)=>{c.paused[at]={...c.paused[at],puzzle:{...c.paused[at].puzzle,bank:300}};};
const family=()=>store.save.profiles!.people.family.challenge!;
const disk=()=>JSON.parse(db.raw!) as Save;
/** Holds the first call of a storage method until released; `fail` makes that held call reject. */
async function hold(method:'preserve'|'set',fail=false){
 const {storage}=await import('../src/state/storage');
 const original=storage[method] as (...args:unknown[])=>Promise<void>;
 const held={blocked:false,release:()=>{}};
 vi.spyOn(storage,method).mockImplementation(async(...args:unknown[])=>{
  if(!held.blocked){held.blocked=true;await new Promise<void>(r=>{held.release=r;});if(fail)throw new Error('disk full');}
  return original(...args);
 });
 return held;
}
const text=(n:ReactTestInstance):string=>n.children.map(c=>typeof c==='string'?c:text(c)).join('');
const buttons=()=>view!.root.findAll(n=>n.type==='button').map(text);
const press=async(label:string)=>{await act(async()=>{view!.root.findAll(n=>n.type==='button'&&text(n)===label)[0].props.onPress();});};

/** A navigation container: a remounted navigator starts on the map, as `initialRouteName="index"` makes it. */
function fakeNav(){
 const listeners=new Set<()=>void>();
 const n={current:{name:'index'} as {name:string;params?:object},navigated:[] as {name:string;params?:object}[],
  isReady:()=>true,getCurrentRoute:()=>n.current,
  addListener:(_:'state',l:()=>void)=>{listeners.add(l);return()=>listeners.delete(l);},
  navigate:(name:string,params?:object)=>{n.navigated.push({name,params});n.go({name,params});},
  go:(route:{name:string;params?:object})=>{n.current=route;for(const l of listeners)l();}};
 return n as typeof n & UINavigation;
}
/** Stands in for the Stack: it fails when told to, and mounts on the map. */
const broken={on:0};
const failsNow=()=>{if(broken.on<=0)return false;broken.on--;return true;};
function Navigator({nav}:{nav:ReturnType<typeof fakeNav>}){
 if(failsNow())throw new Error('The navigator failed');
 useEffect(()=>{nav.go({name:'index'});},[nav]);
 return <article/>;
}
async function mountApp(nav=fakeNav()){
 vi.spyOn(console,'error').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 const tree=(n:number)=><StoreProvider><Probe/><UIBoundaryView nav={nav}><Navigator key={n} nav={nav}/></UIBoundaryView></StoreProvider>;
 let renders=0;
 await act(async()=>{view=create(tree(renders++));});
 /** An error under the Store, above the screens (the navigator itself), on its next render. */
 const fail=async(times=2)=>{broken.on=times;await act(async()=>{view!.update(tree(renders++));});};
 return {nav,fail};
}

// P1: a UI error must never remount the Store, so nothing it accepted can be dropped between instances.
it('a UI error under the Store keeps the same Store: a failed save stays accepted, and Try saving again writes it',async()=>{
 seed();const {fail}=await mountApp();
 const {storage}=await import('../src/state/storage');
 vi.spyOn(storage,'set').mockRejectedValueOnce(new Error('disk full'));
 await act(async()=>{store.settings({sound:false});});
 expect(store.error).not.toBeNull();expect(disk().settings.sound).toBe(true);
 const accepted=store.save;
 await fail();
 expect(buttons()).toEqual(['Try again','Back to the map']);
 expect(JSON.parse(db.log.at(-1)!)).toMatchObject({where:'ui'});
 await press('Try again');
 expect(view!.root.findAll(n=>n.type==='article')).toHaveLength(1);
 expect(db.gets).toBe(1);expect(store.save).toBe(accepted);expect(store.error).not.toBeNull(); // never reloaded
 await act(async()=>{await store.retry();});
 expect(store.error).toBeNull();expect(disk().settings.sound).toBe(false);
 await unmount();await mount();expect(store.save.settings.sound).toBe(false);
});

it('repeated UI errors while a save is held and then fails keep the accepted change in the one Store',async()=>{
 seed();const {fail}=await mountApp();
 const held=await hold('set',true);
 await act(async()=>{store.settings({sound:false});});expect(held.blocked).toBe(true);
 await fail();await press('Try again');
 await fail();await press('Try again');
 await act(async()=>{held.release();});
 expect(db.gets).toBe(1);expect(store.save.settings.sound).toBe(false);expect(store.error).not.toBeNull();
 expect(disk().settings.sound).toBe(true);
 await act(async()=>{await store.retry();});
 expect(disk().settings.sound).toBe(false);
});

it('with a write that never finishes, Try again still opens the UI and a backup holds the accepted work',async()=>{
 seed();const {fail}=await mountApp();
 const held=await hold('set');
 try{
  await act(async()=>{store.settings({sound:false});});
  await fail();await press('Try again');
  expect(store.ready).toBe(true);expect(store.recovery).toBeNull();
  vi.useFakeTimers();
  let backup:Save|undefined;
  await act(async()=>{void store.backup().then(raw=>{backup=JSON.parse(raw);});});
  expect(backup).toBeUndefined();
  await act(async()=>{await vi.advanceTimersByTimeAsync(BACKUP_FLUSH_MS);});
  expect(backup?.settings.sound).toBe(false);expect(Object.keys(backup!.profiles!.people)).toContain('b');
  expect(store.error).toBe('This backup contains the latest accepted work. Some changes could not be saved on this device.');
 }finally{await act(async()=>{held.release();});}
});

// P3: Try again goes back to where the child was, when that screen can be rebuilt; otherwise to the map.
it('Try again reopens the screen the child was on over the map; failing again there goes to the map',async()=>{
 seed();const {nav,fail}=await mountApp();
 await act(async()=>{nav.go({name:'library',params:{place:'reader',id:'book'}});});
 await fail();await press('Try again');
 expect(nav.navigated).toEqual([{name:'library',params:{place:'reader',id:'book'}}]);
 // It fails again on the screen just reopened: the next Try again stays on the map.
 await fail();await press('Try again');
 expect(nav.navigated).toHaveLength(1);expect(nav.current).toEqual({name:'index'});
 // A failure on another screen later is a new one.
 await act(async()=>{nav.go({name:'badges'});});
 await fail();await press('Try again');
 expect(nav.navigated.at(-1)).toEqual({name:'badges'});
 // Back to the map never reopens anything.
 await act(async()=>{nav.go({name:'school',params:{game:'x'}});});
 await fail();await press('Back to the map');
 expect(nav.navigated).toHaveLength(2);expect(nav.current).toEqual({name:'index'});
 expect(db.gets).toBe(1);
});

it('only a screen with a plain route can be rebuilt',()=>{
 expect(rebuildable({name:'library',params:{place:'make',id:'page-1'}})).toEqual({name:'library',params:{place:'make',id:'page-1'}});
 expect(rebuildable({name:'badges',params:{}})).toEqual({name:'badges'});
 expect(rebuildable({name:'learn',params:{tags:['a','b']}})).toEqual({name:'learn',params:{tags:['a','b']}});
 for(const route of [undefined,{name:'index'},{name:'+not-found'},{name:'_sitemap'},{name:'library',params:{at:3}},{name:'library',params:{nested:{screen:'x'}}},{name:'library',params:{id:'x'.repeat(2100)}},{name:'library',params:['x']}])
  expect(rebuildable(route as never)).toBeNull();
});

// The Store itself failing: a plain restart screen. No other Store, so nothing is handed over or overwritten.
class RootTry extends React.Component<{children:React.ReactNode},{error:Error|null}>{
 state={error:null as Error|null};
 static getDerivedStateFromError(error:Error){return {error};}
 render(){return this.state.error?<StoreFailure error={this.state.error} retry={async()=>{throw new Error('The Store must not be remounted');}}/>:this.props.children;}
}
it('if the Store itself fails, the restart screen offers no Try again, writes nothing new, and lets accepted writes finish',async()=>{
 seed();vi.spyOn(console,'error').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 await act(async()=>{view=create(<RootTry><StoreProvider><Probe/></StoreProvider></RootTry>);});
 const held=await hold('set');
 await act(async()=>{store.settings({sound:false});});expect(held.blocked).toBe(true);
 failing.store=true;
 await act(async()=>{store.settings({help:false});}); // accepted and queued, then the Store fails to render
 expect(text(view!.root)).toContain('Little Island needs a restart.');expect(text(view!.root)).toContain('Restart Little Island');
 expect(view!.root.findAll(n=>n.type==='button')).toHaveLength(0);
 expect(db.log.map(e=>JSON.parse(e).where)).toContain('store');
 const writes=db.sets.length;
 await act(async()=>{held.release();});
 // Both accepted changes were already in its queue, in order. Nothing else is written.
 expect(db.sets).toHaveLength(writes+2);expect(disk().settings).toMatchObject({sound:false,help:false});
 // A cold start opens the durable save the normal way.
 failing.store=false;await unmount();await mount();
 expect(store.save.settings).toMatchObject({sound:false,help:false});expect(db.sets).toHaveLength(writes+2);
});

it('a Store mounted after a failed one never takes its memory: the old one starts no more writes',async()=>{
 seed();vi.spyOn(console,'error').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 await act(async()=>{view=create(<RootTry><StoreProvider><Probe/></StoreProvider></RootTry>);});
 const held=await hold('set');
 await act(async()=>{store.settings({sound:false});}); // being written
 failing.store=true;await act(async()=>{store.settings({help:false});}); // queued behind it when the Store fails
 failing.store=false;await unmount();await mount(); // a new Store mounts before the old write finishes
 expect(store.ready).toBe(false); // it waits for the write already running
 await act(async()=>{held.release();});
 expect(store.ready).toBe(true);
 expect(disk().settings).toMatchObject({sound:false,help:true}); // the old Store's queued write never started
 expect(encodeSave(store.save)).toBe(db.raw); // the new Store holds exactly the durable save
 expect(db.log.map(e=>JSON.parse(e).where)).not.toContain('handoff');
});

// P1: a successful draft for one game must never mark another game's failed draft as saved.
const move=async(s:ChallengeSession)=>{let ok=false;await act(async()=>{ok=await store.challengeSave({...s,revision:s.revision+1,payload:s.revision+1},{epoch:store.epoch,owner:s.owner,game:s.game,id:s.id,revision:s.revision});});return ok;};
it('a draft saved for game B leaves game A\'s failed draft unsaved until it is written (reviewer probe C)',async()=>{
 seed();await mount();
 const {storage}=await import('../src/state/storage');
 vi.spyOn(storage,'writeDraft').mockRejectedValueOnce(new Error('temporary disk failure'));
 const a=family().paused[1], b=family().paused[2];
 expect(await move(a)).toBe(false);expect(family().paused[1].revision).toBe(1);expect(store.error).not.toBeNull();
 expect(await move(b)).toBe(true);expect(family().paused[2].revision).toBe(1);
 expect(db.drafts.map(r=>JSON.parse(r).session.game)).toEqual([b.game]);
 expect(store.error).not.toBeNull(); // B's save says nothing about A
 let flushed=false;await act(async()=>{flushed=await store.libraryFlush();});
 expect(flushed).toBe(true); // a flush folds every accepted move into the envelope
 expect(store.error).toBeNull();
 await unmount();await mount();
 expect(family().paused[1].revision).toBe(1);expect(family().paused[2].revision).toBe(1);
});

it('game A\'s next saved move clears only its own failure; Try saving again covers the rest',async()=>{
 seed();await mount();
 const {storage}=await import('../src/state/storage');
 const a=family().paused[1], b=family().paused[2];
 vi.spyOn(storage,'writeDraft').mockRejectedValueOnce(new Error('A failed')).mockRejectedValueOnce(new Error('B failed'));
 expect(await move(a)).toBe(false);expect(await move(b)).toBe(false);
 expect(await move(family().paused[1])).toBe(true); // A again: its newest draft holds both of its moves
 expect(store.error).not.toBeNull(); // B is still unsaved
 await act(async()=>{await store.retry();});expect(store.error).toBeNull();
 await unmount();await mount();
 expect(family().paused[1].revision).toBe(2);expect(family().paused[2].revision).toBe(1);
});

// R4: restore clears notices in its own replacement write, and a failed read is never an empty row.
it('Start fresh clears notices in the same write as the replacement, never in a separate one (reviewer probe D)',async()=>{
 seed(p=>unknownBank(p('family')));await mount();expect(db.notices).not.toBeNull();
 const {storage}=await import('../src/state/storage');
 const clear=vi.spyOn(storage,'writeNotices').mockRejectedValue(new Error('SQLite busy'));
 await act(async()=>{await store.startFresh();});
 expect(store.setAside).toEqual([]);expect(clear).not.toHaveBeenCalled();
 expect(db.sets.at(-1)!.metadata!.notices).toBeNull();expect(db.notices).toBeNull();
 await unmount();await mount();
 expect(store.setAside).toEqual([]);expect(store.save.learning?.people).toHaveLength(1);
});

it('a Start fresh whose write fails keeps the old save and its notices, and reports the failure',async()=>{
 seed(p=>unknownBank(p('family')));await mount();
 const notices=db.notices, raw=db.raw, shown=store.setAside;
 const {storage}=await import('../src/state/storage');
 vi.spyOn(storage,'set').mockRejectedValueOnce(new Error('SQLite busy'));
 let failed=false;
 await act(async()=>{await store.startFresh().catch(()=>{failed=true;});});
 expect(failed).toBe(true);expect(db.notices).toBe(notices);expect(db.raw).toBe(raw);expect(store.setAside).toBe(shown);
});

it('one failed notices read is retried, so another person\'s unseen notice is kept (reviewer probe F)',async()=>{
 seed(p=>unknownBank(p('family')));await mount();
 await unmount();const next=JSON.parse(db.raw!);next.profiles.people.b.challenge.paused[3].puzzle.bank=300;db.raw=JSON.stringify(next);
 const {storage}=await import('../src/state/storage');
 vi.spyOn(storage,'readNotices').mockRejectedValueOnce(new Error('SQLite temporarily busy'));
 await mount();
 expect(store.setAside.map(n=>n.owner).sort()).toEqual(['b','family']);
 expect(parseNotices(db.notices,['family','b']).map(n=>n.owner).sort()).toEqual(['b','family']);
});

it('a notices read that keeps failing opens Recovery and changes nothing; Try opening again keeps every notice',async()=>{
 seed(p=>unknownBank(p('family')));await mount();const kept=db.notices;
 await unmount();const next=JSON.parse(db.raw!);next.profiles.people.b.challenge.paused[3].puzzle.bank=300;db.raw=JSON.stringify(next);
 const raw=db.raw, writes=db.sets.length;
 const {storage}=await import('../src/state/storage');
 vi.spyOn(storage,'readNotices').mockRejectedValueOnce(new Error('busy')).mockRejectedValueOnce(new Error('busy'));
 vi.spyOn(console,'warn').mockImplementation(()=>{});
 await mount();
 expect(store.recovery).toBe(noticesReadMessage);
 expect(db.raw).toBe(raw);expect(db.notices).toBe(kept);expect(db.sets).toHaveLength(writes);
 await act(async()=>{await store.retry();});
 expect(store.recovery).toBeNull();expect(store.setAside.map(n=>n.owner).sort()).toEqual(['b','family']);
});

// Reviewer round-2 guards, kept as tests.
it('Start fresh waits for a timed-out load\'s write already running, then wins; the late load publishes nothing',async()=>{
 seed(p=>unknownBank(p('family')));vi.useFakeTimers();vi.spyOn(console,'warn').mockImplementation(()=>{});const held=await hold('set');
 try{
  await mount();await act(async()=>{vi.advanceTimersByTime(BOOT_TIMEOUT_MS);});
  let finished=false;await act(async()=>{void store.startFresh().then(()=>{finished=true;});});
  expect(finished).toBe(false);await act(async()=>{held.release();});
  expect(finished).toBe(true);expect(store.recovery).toBeNull();expect(store.save.learning!.people).toHaveLength(1);
  expect(encodeSave(store.save)).toBe(db.raw);expect(db.sets).toHaveLength(2);
 }finally{await act(async()=>{held.release();});}
});

it('the largest valid notices row stays bounded under repeated merges',async()=>{
 const {mergeNotices}=await import('../src/state/setAside');
 const owners=['family','a','b','c','d','cove-0','cove-1','cove-2','cove-3'];
 let items=owners.map(owner=>({owner,games:Array.from({length:8},(_,i)=>`game-${i}`.padEnd(80,'a')),marks:512}));
 for(let n=0;n<100;n++)items=mergeNotices(items,owners.map(owner=>({owner,games:Array.from({length:8},(_,i)=>`other-${i}`.padEnd(80,'b')),marks:512})));
 const encoded=encodeNotices(items)!;
 expect(Buffer.byteLength(encoded)).toBeLessThan(13000);expect(parseNotices(encoded,owners)).toEqual(items);
});
