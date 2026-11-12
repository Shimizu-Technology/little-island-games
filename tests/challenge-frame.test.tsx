import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { ChallengeFrame } from '../src/challenge/ChallengeFrame';
import { ResultOffer } from '../src/challenge/ResultOffer';
import { StoreProvider, useStore } from '../src/state/Store';
import { registerSaveContent, emptyChallenge } from '../src/state/challenge';
import { catalogManifest } from '../src/state/catalogManifest';
import { emptySave } from '../src/state/validation';
import { addLearner } from '../src/learn/learners';
import { registration, engine, puzzle, solve, type Action, type Payload } from './helpers/challenge-replay';
import { defaultComfort, completedSignal } from '../src/challenge/offers';
import { defineReplayGame } from '../src/challenge/replay';
import { buildCatalog } from '../src/challenge/catalog';
import * as challengeCatalog from '../src/challenge/catalog';
import type { ChallengeEntry } from '../src/challenge/types';
import { migrateProfiles, encodeSave } from '../src/state/profiles';
import { putProgress } from '../src/state/challengeDrafts';
import { startSession } from '../src/learn/session';
import { GridInteraction } from '../src/puzzles/grid/preferences';
const db=vi.hoisted(()=>({raw:null as string|null,block:null as Promise<void>|null,fail:false,boundaryBlock:null as Promise<void>|null}));
vi.mock('../src/state/storage',()=>({storage:{get:async()=>db.raw,set:async(raw:string)=>{if(db.fail)throw new Error('disk full');if(db.boundaryBlock)await db.boundaryBlock;db.raw=raw;},preserve:async()=>{},writeDraft:async()=>{if(db.block)await db.block;},discardSession:async()=>{}}}));
vi.mock('react-native',()=>({ScrollView:'section',View:'div',useWindowDimensions:()=>({width:320,height:667}),AppState:{addEventListener:()=>({remove(){}})}}));
vi.mock('react-native-safe-area-context',()=>({SafeAreaView:'main'}));
vi.mock('expo-router',()=>({useIsFocused:()=>true,router:{canGoBack:()=>false,replace:vi.fn()}}));
vi.mock('../src/components/ui',()=>({Button:'button',Chip:'button',Heading:'h2',Copy:'p',ToggleRow:'switch',styles:{}}));
vi.mock('../src/components/Audio',()=>({AudioPreferences:createContext({}),useSoundControls:()=>({play:()=>{}})}));
vi.mock('../src/components/Settings',()=>({Settings:()=>null}));
vi.mock('../src/components/SaveStatus',()=>({SaveStatus:()=>null}));
vi.mock('../src/personalization/LearnerChip',()=>({LearnerChip:()=>null}));
let store:ReturnType<typeof useStore>;
function Probe(){const s=useStore();useLayoutEffect(()=>{store=s;},[s]);return null;}
function ReadyFrame({selectedEntry=entry}:{selectedEntry?:ChallengeEntry}){const s=useStore();return s.ready?<ChallengeFrame key={`${s.epoch}`} entry={selectedEntry}/>:null;}
const entry={...registration,render:(session:Parameters<typeof registration.move>[0],dispatch:(a:unknown)=>void)=>{const actions=(solve(registration.start(puzzle.ref,'a','route',emptyChallenge(),{supportOff:false,ownRead:false},[])).payload as Payload).actions;const n=(session.payload as Payload).actions.filter(a=>a.type==='move').length;return <><button onClick={()=>dispatch({type:'read-aloud'} satisfies Action)}>Read aloud</button><button onClick={()=>dispatch(actions[n])}>Next maze step</button></>;}};
const press=async(root:ReactTestRenderer,label:string)=>act(async()=>{const button=root.root.findAllByType('button').find(n=>n.children.filter(c=>typeof c==='string').join('')===label);expect(button,label).toBeDefined();(button!.props.onPress??button!.props.onClick)();});
it('R2 P2-1: a stretch invitation clears a dare from the completed puzzle before Start',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 const first={...puzzle,par:undefined,ref:{...puzzle.ref,engine:'stretch-proof',bank:430},source:{kind:'endless' as const,bank:430,puzzle:0},dares:puzzle.dares.map((d,i)=>({...d,slot:3300+i,id:`stretch-dare-${i}`}))};
 const puzzles=[first,{...first,title:'A higher test maze',tier:2 as const,ref:{...first.ref,puzzle:1,hash:'b'.repeat(64)},source:{kind:'endless' as const,bank:430,puzzle:1},dares:[{...puzzle.dares[0],slot:3400,id:'higher-par'}]}];
 const registered=defineReplayGame({game:'stretch-proof',codec:'stretch-proof-v1',context:'stretch',cove:true,budget:{wrapper:700,draft:3396,undo:0,audit:0},puzzles,engine,Board:()=>null,controls:{help:()=>({type:'help'} as Action),reset:()=>({type:'reset'} as Action)}});
 const selectedEntry={...registered,render:entry.render};
 registerSaveContent(registered.catalog,catalogManifest(registered.catalog));
 // One prior clean finish plus the real finish below produces the two-clean-finish stretch signal.
 db.raw=encodeSave(putProgress(migrateProfiles({...emptySave(),learning:addLearner(undefined,'A','a')}),'a',completedSignal(emptyChallenge(),'stretch-1',true,true)));
 const spy=vi.spyOn(challengeCatalog,'challengeFor').mockReturnValue(selectedEntry);let r!:ReactTestRenderer;
 try{await act(async()=>{r=create(<StoreProvider><Probe/><ReadyFrame selectedEntry={selectedEntry}/></StoreProvider>);});
  await press(r,'blind · Help welcome');await press(r,'Start this puzzle');expect(store.save.challenge!.paused[0].selectedDares).toEqual([3303]);
  for(let i=0;i<40&&store.save.challenge!.paused.length;i++)await press(r,'Next maze step');
  await press(r,'Try a stretch');await press(r,'Start this puzzle');
  expect(store.challengeRefusal).toBeNull();expect(store.save.challenge!.paused).toHaveLength(1);
  expect(store.save.challenge!.paused[0].puzzle.puzzle).toBe(1);expect(store.save.challenge!.paused[0].selectedDares).toEqual([]);
  expect((store.save.challenge!.paused[0].payload as Payload).options.supportOff).toBe(false);
 }finally{spy.mockRestore();if(r)await act(async()=>r.unmount());vi.unstubAllGlobals();}
});
it('keeps School paused while Challenge starts, admits new edits during draft I/O, and restores the exact paused Challenge',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);registerSaveContent(registration.catalog,catalogManifest(registration.catalog));
  const school={...startSession('crab-commands',{options:{mode:'solo',pace:'easy'}},{},42),learner:'a'};
  db.raw=JSON.stringify({...emptySave(),learning:addLearner(undefined,'A','a'),learn:{'crab-commands':school}});let root!:ReactTestRenderer;
  try {
    await act(async()=>{root=create(<StoreProvider><Probe/><ReadyFrame/></StoreProvider>);});
    expect(store.save.challenge?.paused).toEqual([]);await press(root,'Start this puzzle');expect(store.save.learn?.['crab-commands']).toEqual(school);expect(store.save.challenge?.choice).toEqual(['maze-proof','endless',1]);
    let unblock!:()=>void;db.block=new Promise(resolve=>{unblock=resolve;});
    await press(root,'Read aloud');expect(store.save.challenge?.paused[0].revision).toBe(1);
    await press(root,'Read aloud');expect(store.save.challenge?.paused[0].revision).toBe(2);
    expect(store.challengeWorking({choice:['maze-proof','endless',1]},{owner:'a',epoch:store.epoch,game:'maze-proof',id:store.save.challenge!.paused[0].id,revision:1,kind:'challenge'})).toBe(false);
    await act(async()=>{unblock();db.block=null;await store.retry();});
    const paused=store.save.challenge?.paused[0];await act(async()=>root.unmount());
    await act(async()=>{root=create(<StoreProvider><Probe/><ReadyFrame/></StoreProvider>);});
    expect(store.save.challenge?.paused[0]).toEqual(paused);expect(store.save.learn?.['crab-commands']).toEqual(school);
    await press(root,'Another puzzle');expect(JSON.stringify(root.toJSON())).toContain('Continue saved puzzle');
  } finally {db.block=null;if(root)await act(async()=>root.unmount());vi.unstubAllGlobals();}
});
it('too-easy face opens one related challenge; dismissal is saved; young-child choice removes the card',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);let progress=emptyChallenge();for(let i=0;i<3;i++)progress=completedSignal(progress,'s0-1',true,true);
  const choose=vi.fn(),onChange=vi.fn((p:typeof progress)=>{progress=p;return true;});let root!:ReactTestRenderer;
  const props=()=>({progress,context:'s0-1',comfort:defaultComfort,facts:{atPar:true,firstHigher:true,dare:true,harder:true},onChange,onChoose:choose});
  try{await act(async()=>{root=create(<ResultOffer {...props()}/>);});expect(root.root.findAllByProps({testID:'challenge-offer'})).toHaveLength(0);await press(root,'Too easy');expect(choose).toHaveBeenCalledExactlyOnceWith('dare');expect(progress.signals[0][4]).toBe(true);
    await act(async()=>root.update(<ResultOffer {...props()}/>));expect(root.toJSON()).toBeNull();
    await act(async()=>root.update(<ResultOffer {...props()} progress={completedSignal(progress,'s0-1',true,true)} comfort={{...defaultComfort,youngChild:true}}/>));expect(root.toJSON()).toBeNull();
  }finally{if(root)await act(async()=>root.unmount());vi.unstubAllGlobals();}
});

it.each(['Just right','Too hard'])('P1-3: %s consumes the round card',async label=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);let p=emptyChallenge();for(let i=0;i<3;i++)p=completedSignal(p,'s0-1',true,true);
  let root!:ReactTestRenderer;const props=()=>({progress:p,context:'s0-1',comfort:defaultComfort,facts:{atPar:true,firstHigher:true,dare:true,harder:true},onChange:(next:typeof p)=>{p=next;return true;},onChoose:vi.fn()});
  try{await act(async()=>{root=create(<ResultOffer {...props()}/>);});await press(root,label);await act(async()=>root.update(<ResultOffer {...props()}/>));expect(root.toJSON()).toBeNull();}finally{await act(async()=>root.unmount());vi.unstubAllGlobals();}
});
it.each([false,true])('P1-2/P2-5: replacement is atomic (storage failure %s)',async fail=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);registerSaveContent(registration.catalog,catalogManifest(registration.catalog));db.raw=JSON.stringify({...emptySave(),learning:addLearner(undefined,'A','a')});let root!:ReactTestRenderer;
  try{await act(async()=>{root=create(<StoreProvider><Probe/><ReadyFrame/></StoreProvider>);});await press(root,'Start this puzzle');const old=store.save.challenge!.paused[0],raw=db.raw;
    await press(root,'Another puzzle');await act(async()=>root.root.findByType('switch').props.onChange(true));db.fail=fail;await press(root,'Start this puzzle');
    if(fail){expect(store.save.challenge!.paused[0]).toEqual(old);expect(db.raw).toBe(raw);}else{expect(store.save.challenge!.paused).toHaveLength(1);expect(store.save.challenge!.paused[0].ordinal).toBe(2);expect(store.challengeRefusal).toBeNull();}
  }finally{db.fail=false;await act(async()=>root.unmount());vi.unstubAllGlobals();}
});
it.each([['blind',3003,'supportOff'],['own-read',3007,'ownRead']] as const)('P2-1: selecting %s sets its launch option',async(label,slot,option)=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);registerSaveContent(registration.catalog,catalogManifest(registration.catalog));db.raw=JSON.stringify({...emptySave(),learning:addLearner(undefined,'A','a')});let root!:ReactTestRenderer;
  try{await act(async()=>{root=create(<StoreProvider><Probe/><ReadyFrame/></StoreProvider>);});const chip=root.root.findAllByType('button').find(n=>n.children[0]===label)!;await act(async()=>chip.props.onPress());await press(root,'Start this puzzle');const s=store.save.challenge!.paused[0];expect(s.selectedDares).toEqual([slot]);expect((s.payload as {options:Record<string,boolean>}).options[option]).toBe(true);
  }finally{await act(async()=>root.unmount());vi.unstubAllGlobals();}
});

it('P2-6: a finish frees its slot; Another puzzle starts directly; reopening has no old result',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);registerSaveContent(registration.catalog,catalogManifest(registration.catalog));db.raw=JSON.stringify({...emptySave(),learning:addLearner(undefined,'A','a')});let r!:ReactTestRenderer;
 try{await act(async()=>{r=create(<StoreProvider><Probe/><ReadyFrame/></StoreProvider>);});await press(r,'Start this puzzle');for(let i=0;i<40&&store.save.challenge!.paused.length;i++)await press(r,'Next maze step');expect(store.save.challenge!.paused).toEqual([]);expect(JSON.stringify(r.toJSON())).toContain('Puzzle solved!');await press(r,'Try another');expect(JSON.stringify(r.toJSON())).not.toContain('Continue saved puzzle');await press(r,'Start this puzzle');expect(store.save.challenge!.paused[0].ordinal).toBe(2);
  for(let i=0;i<40&&store.save.challenge!.paused.length;i++)await press(r,'Next maze step');await act(async()=>r.unmount());await act(async()=>{r=create(<StoreProvider><Probe/><ReadyFrame/></StoreProvider>);});expect(JSON.stringify(r.toJSON())).not.toContain('Puzzle solved!');expect(JSON.stringify(r.toJSON())).toContain('Start this puzzle');
 }finally{await act(async()=>r.unmount());vi.unstubAllGlobals();}
});
it('P1-4: a full unfinished set offers Continue, export and explicit replacement',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 const entries=Array.from({length:8},(_,i)=>defineReplayGame({game:`slot-${i}`,codec:`slot-${i}-v1`,context:`slot${i}`,cove:true,objectives:['shell'],budget:{wrapper:700,draft:3396,undo:0,audit:0},puzzles:[{...puzzle,dares:[],awards:[null,null],ref:{...puzzle.ref,bank:410+i,engine:`slot-${i}`},source:{kind:'endless',bank:410+i,puzzle:0}}],engine,Board:()=>null,controls:{help:()=>({type:'help'} as Action),reset:()=>({type:'reset'} as Action)}}));
 const catalog=buildCatalog([registration,...entries]);registerSaveContent(catalog,catalogManifest(catalog));let p=emptyChallenge();for(const e of entries){const session=e.start(e.puzzles[0].ref,'a',`saved-${p.nextOrdinal}`,p,{supportOff:false,ownRead:false},[]);p={...p,nextOrdinal:p.nextOrdinal+1,paused:[...p.paused,session]};}
 db.raw=encodeSave(putProgress(migrateProfiles({...emptySave(),learning:addLearner(undefined,'A','a')}),'a',p));let r!:ReactTestRenderer;
 try{await act(async()=>{r=create(<StoreProvider><Probe/><ReadyFrame/></StoreProvider>);});expect(JSON.stringify(r.toJSON())).toContain('Your paused spaces are full');expect(JSON.stringify(r.toJSON())).toContain('Export backup in Settings');expect(r.root.findAllByType('button').some(n=>n.children.join('')==='Continue Slot 0')).toBe(true);await press(r,'Replace Slot 0');await press(r,'Start this puzzle');expect(store.save.challenge!.paused).toHaveLength(8);expect(store.save.challenge!.paused.some(s=>s.game==='slot-0')).toBe(false);expect(store.save.challenge!.paused.some(s=>s.game==='maze-proof')).toBe(true);
 }finally{await act(async()=>r.unmount());vi.unstubAllGlobals();}
});

it('P2-5: an adapter start exception leaves the accepted attempt intact',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);registerSaveContent(registration.catalog,catalogManifest(registration.catalog));db.raw=JSON.stringify({...emptySave(),learning:addLearner(undefined,'A','a')});let r!:ReactTestRenderer;let spy:ReturnType<typeof vi.spyOn>|undefined;
 try{await act(async()=>{r=create(<StoreProvider><Probe/><ReadyFrame/></StoreProvider>);});await press(r,'Start this puzzle');const old=store.save.challenge!.paused[0],raw=db.raw;await press(r,'Another puzzle');await act(async()=>r.root.findByType('switch').props.onChange(true));spy=vi.spyOn(entry,'start').mockImplementation(()=>{throw new Error('invalid descriptor');});await press(r,'Start this puzzle');expect(store.save.challenge!.paused[0]).toEqual(old);expect(db.raw).toBe(raw);expect(JSON.stringify(r.toJSON())).toContain('Your saved work is kept.');
 }finally{spy?.mockRestore();await act(async()=>r.unmount());vi.unstubAllGlobals();}
});
it('P3-8: older draft completions cannot unlock a pending terminal boundary',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);registerSaveContent(registration.catalog,catalogManifest(registration.catalog));db.raw=JSON.stringify({...emptySave(),learning:addLearner(undefined,'A','a')});let r!:ReactTestRenderer,releaseDraft!:()=>void,releaseBoundary!:()=>void;
 try{await act(async()=>{r=create(<StoreProvider><Probe/><ReadyFrame/></StoreProvider>);});await press(r,'Start this puzzle');db.block=new Promise(resolve=>{releaseDraft=resolve;});
  const actions=(solve(registration.start(puzzle.ref,'a','route',emptyChallenge(),{supportOff:false,ownRead:false},[])).payload as Payload).actions;
  for(let i=0;i<actions.length-1;i++)await press(r,'Next maze step');db.boundaryBlock=new Promise(resolve=>{releaseBoundary=resolve;});await press(r,'Next maze step');
  await act(async()=>{db.block=null;releaseDraft();await new Promise(resolve=>setTimeout(resolve,0));});const another=r.root.findAllByType('button').find(n=>n.children.includes('Another puzzle'))!;expect(another.props.disabled).toBe(true);const revision=store.save.challenge!.paused[0].revision;await press(r,'Read aloud');expect(store.save.challenge!.paused[0].revision).toBe(revision);
  await act(async()=>{db.boundaryBlock=null;releaseBoundary();await new Promise(resolve=>setTimeout(resolve,0));});expect(store.save.challenge!.paused).toEqual([]);
 }finally{db.block=null;db.boundaryBlock=null;releaseDraft?.();releaseBoundary?.();await act(async()=>r.unmount());vi.unstubAllGlobals();}
});
it('Crab P2-6: keeps the final board mounted and waits for arrival before showing the result',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);registerSaveContent(registration.catalog,catalogManifest(registration.catalog));db.raw=JSON.stringify({...emptySave(),learning:addLearner(undefined,'A','a')});let r!:ReactTestRenderer;let settle:(()=>void)|undefined;
 const animated={...entry,animatedRuns:true,render:(s:Parameters<typeof registration.move>[0],dispatch:(a:unknown)=>void,_active:boolean,_width:number,host?:{onSettled?:()=>void})=>{settle=host?.onSettled;return <div data-testid="final-beach">{entry.render(s,dispatch)}</div>;}};
 try{await act(async()=>{r=create(<StoreProvider><Probe/><ReadyFrame selectedEntry={animated}/></StoreProvider>);});await press(r,'Start this puzzle');
  for(let i=0;i<40&&store.save.challenge!.paused.length;i++)await press(r,'Next maze step');
  expect(r.root.findAllByProps({'data-testid':'final-beach'})).toHaveLength(1);expect(JSON.stringify(r.toJSON())).not.toContain('Puzzle solved!');expect(settle).toBeTypeOf('function');
  await act(async()=>settle!());expect(JSON.stringify(r.toJSON())).toContain('Puzzle solved!');expect(r.root.findAllByProps({'data-testid':'final-beach'})).toHaveLength(1);
 }finally{if(r)await act(async()=>r.unmount());vi.unstubAllGlobals();}
});
it('Crab P2-3: a clean puzzle without dares offers a harder puzzle even when other puzzles have dares',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 const first={...puzzle,ref:{...puzzle.ref,bank:431,engine:'mud-offer'},source:{kind:'endless' as const,bank:431,puzzle:0},dares:[]};
 const higher={...first,title:'Harder dry crossing',tier:2 as const,ref:{...first.ref,puzzle:1,hash:'e'.repeat(64)},source:{...first.source,puzzle:1},dares:[{...puzzle.dares[0],slot:3450,id:'mud-offer-par'}]};
 const registered=defineReplayGame({game:'mud-offer',codec:'mud-offer-v1',context:'mudoffer',cove:false,budget:{wrapper:700,draft:3396,undo:0,audit:0},puzzles:[first,higher],objectives:['shell'],engine,Board:()=>null,controls:{help:()=>({type:'help'} as Action),reset:()=>({type:'reset'} as Action)}});
 registerSaveContent(registered.catalog,catalogManifest(registered.catalog));db.raw=encodeSave(putProgress(migrateProfiles({...emptySave(),learning:addLearner(undefined,'A','a')}),'a',completedSignal(emptyChallenge(),'mudoffer-1',true,true)));
 const selectedEntry={...registered,render:entry.render},spy=vi.spyOn(challengeCatalog,'challengeFor').mockReturnValue(selectedEntry);
 let r!:ReactTestRenderer;try{await act(async()=>{r=create(<StoreProvider><Probe/><ReadyFrame selectedEntry={selectedEntry}/></StoreProvider>);});await press(r,'Start this puzzle');for(let i=0;i<40&&store.save.challenge!.paused.length;i++)await press(r,'Next maze step');
 expect(JSON.stringify(r.toJSON())).not.toContain('Try a dare?');await press(r,'Try a stretch');await press(r,'Start this puzzle');expect(store.save.challenge!.paused[0].puzzle.puzzle).toBe(1);
 }finally{spy.mockRestore();if(r)await act(async()=>r.unmount());vi.unstubAllGlobals();}
});
it('a requested School replay opens its picker while preserving an existing Challenge draft',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);registerSaveContent(registration.catalog,catalogManifest(registration.catalog));
 let save=migrateProfiles({...emptySave(),learning:addLearner(undefined,'A','a')});const progress=emptyChallenge(),paused=registration.start(puzzle.ref,'a','kept-draft',progress,{supportOff:false,ownRead:false},[]);
 save=putProgress(save,'a',{...progress,nextOrdinal:paused.ordinal+1,paused:[paused]});db.raw=encodeSave(save);let r!:ReactTestRenderer;
 function RequestedFrame(){const s=useStore();return s.ready?<ChallengeFrame entry={entry} requestedPuzzle={`${puzzle.ref.bank}:${puzzle.ref.puzzle}`}/>:null;}
 try{await act(async()=>{r=create(<StoreProvider><Probe/><RequestedFrame/></StoreProvider>);});
  expect(r.root.findAllByType('switch').some(s=>s.props.label==='Start another attempt')).toBe(true);
  expect(store.save.challenge!.paused[0]).toEqual(paused);expect(JSON.stringify(r.toJSON())).toContain('Continue saved puzzle');expect(JSON.stringify(r.toJSON())).not.toContain('Start this puzzle');
 }finally{if(r)await act(async()=>r.unmount());vi.unstubAllGlobals();}
});

it('F4: end choices are equal and a one-card tier returns to the chooser without carrying dares',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);registerSaveContent(registration.catalog,catalogManifest(registration.catalog));db.raw=JSON.stringify({...emptySave(),learning:addLearner(undefined,'A','a')});let r!:ReactTestRenderer;
 try{await act(async()=>{r=create(<StoreProvider><Probe/><ReadyFrame/></StoreProvider>);});await press(r,'blind · Help welcome');await press(r,'Start this puzzle');for(let i=0;i<40&&store.save.challenge!.paused.length;i++)await press(r,'Next maze step');
  const choices=r.root.findByProps({testID:'tide-choices'}).findAllByType('button');expect(choices.map(b=>b.props.quiet)).toEqual([true,true,true]);expect(choices.map(b=>b.children.join(''))).toEqual(['Easier','Same','Harder']);
  await press(r,'Try another');expect(store.save.challenge!.paused).toHaveLength(0);await press(r,'Start this puzzle');expect(store.save.challenge!.paused).toHaveLength(1);expect(store.save.challenge!.paused[0].ordinal).toBe(2);expect(store.save.challenge!.paused[0].selectedDares).toEqual([]);expect(store.challengeRefusal).toBeNull();
 }finally{await act(async()=>r.unmount());vi.unstubAllGlobals();}
});

it('F4: a hint commit returns the durable accepted revision and rejects a stale expected key',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);registerSaveContent(registration.catalog,catalogManifest(registration.catalog));db.raw=JSON.stringify({...emptySave(),learning:addLearner(undefined,'A','a')});let r!:ReactTestRenderer,host:import('../src/challenge/types').ChallengeRenderHost|undefined;
 const selectedEntry:ChallengeEntry={...entry};
 selectedEntry.render=(session,dispatch,active,width,h)=>{host=h;return entry.render(session,dispatch);};
 try{await act(async()=>{r=create(<StoreProvider><Probe/><ReadyFrame selectedEntry={selectedEntry}/></StoreProvider>);});await press(r,'Start this puzzle');
  const before=host!,key=before.key;let result:Awaited<ReturnType<typeof before.commit>>=null;
  await act(async()=>{result=await before.commit({type:'help'},key);});
  expect(result).not.toBeNull();expect(result!.session.revision).toBe(1);expect(result!.key).toBe(host!.key);expect(result!.key).not.toBe(key);
  const saved=store.save.challenge!.paused[0];await act(async()=>{expect(await host!.commit({type:'help'},key)).toBeNull();});expect(store.save.challenge!.paused[0]).toEqual(saved);
 }finally{await act(async()=>r.unmount());vi.unstubAllGlobals();}
});
// Review round 2, F3 (generic): a dare is offered only when a card with a dare is reachable from the finished card.
// Here only a different tier has dares, so neither the invitation nor "Too easy" may open a picker without one.
for(const [name,prior] of [['the direct invitation',1],['the "Too easy" face',2]] as const) it(`F3: no dare target means no dare offer through ${name}`,async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 const plain={...puzzle,ref:{...puzzle.ref,engine:'nodare-proof',bank:432},source:{kind:'endless' as const,bank:432,puzzle:0},dares:[]};
 const puzzles=[plain,{...plain,title:'A higher test maze',tier:2 as const,ref:{...plain.ref,puzzle:1,hash:'b'.repeat(64)},source:{kind:'endless' as const,bank:432,puzzle:1},dares:[{...puzzle.dares[1],slot:3500,id:'nodare-higher'}]}];
 // The test maze reports its shell objective; no card here has a pick-up dare, so the game declares it.
 const registered=defineReplayGame({game:'nodare-proof',codec:'nodare-proof-v1',context:'nodare',cove:true,objectives:['shell'],budget:{wrapper:700,draft:3396,undo:0,audit:0},puzzles,engine,Board:()=>null,controls:{help:()=>({type:'help'} as Action),reset:()=>({type:'reset'} as Action)}});
 const selectedEntry={...registered,render:entry.render};
 registerSaveContent(registered.catalog,catalogManifest(registered.catalog));
 // One prior clean finish gives the invitation on a clean finish; two make this the third, which asks how it felt.
 const progress=Array.from({length:prior},()=>0).reduce(p=>completedSignal(p,'nodare-1',true,true),emptyChallenge());
 db.raw=encodeSave(putProgress(migrateProfiles({...emptySave(),learning:addLearner(undefined,'A','a')}),'a',progress));
 const spy=vi.spyOn(challengeCatalog,'challengeFor').mockReturnValue(selectedEntry);let r!:ReactTestRenderer;
 try{await act(async()=>{r=create(<StoreProvider><Probe/><ReadyFrame selectedEntry={selectedEntry}/></StoreProvider>);});
  await press(r,'Start this puzzle');
  for(let i=0;i<40&&store.save.challenge!.paused.length;i++)await press(r,'Next maze step');
  let text=JSON.stringify(r.toJSON());
    expect(text).toContain('Puzzle solved!');
  expect(text).not.toContain('Try a dare?');
  if(prior===2){
   expect(text).toContain('How did that feel?');
   await press(r,'Too easy');
   text=JSON.stringify(r.toJSON());
   // The rating is kept and no dare is offered. With no dare target, Crab's rule (C1 P2-3) takes "Too easy" to the
   // harder card on the same path instead, with no dare chosen.
   expect(store.save.challenge!.signals.find(s=>s[0]==='nodare-1')?.[3]).toBe('easy');
   expect(text).not.toContain('Try a dare?');
   expect(text).toContain('Start this puzzle');
   expect(r.root.findAll(n=>n.props.selected===true&&JSON.stringify(n.props.children??'').includes('A higher test maze')).length).toBeGreaterThan(0);
   expect(r.root.findAll(n=>n.props.selected===true&&JSON.stringify(n.props.children??'').includes('On my own'))).toHaveLength(0);
  }
 }finally{spy.mockRestore();if(r)await act(async()=>r.unmount());vi.unstubAllGlobals();}
});
// Integration rehearsal: a page scroll that started on the Slip Tide board also moved the crabs. A board that owns a
// touch now holds the Challenge page still until release, as Cove grids do (GridScroll does the same after G3).
it('a board that owns a touch holds the Challenge page scroll until release',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);registerSaveContent(registration.catalog,catalogManifest(registration.catalog));
 const board={hold:null as null|((held:boolean)=>void)};
 function Holder(){const hold=React.useContext(GridInteraction);useLayoutEffect(()=>{board.hold=hold;},[hold]);return null;}
 const holding={...entry,render:()=><Holder/>};
 db.raw=JSON.stringify({...emptySave(),learning:addLearner(undefined,'A','a')});let r!:ReactTestRenderer;
 try{await act(async()=>{r=create(<StoreProvider><Probe/><ReadyFrame selectedEntry={holding}/></StoreProvider>);});
  await press(r,'Start this puzzle');
  const page=()=>r.root.findByType('section' as never);
  expect(board.hold).not.toBeNull();expect(page().props.scrollEnabled).toBe(true);
  await act(async()=>board.hold!(true));expect(page().props.scrollEnabled).toBe(false);
  await act(async()=>board.hold!(false));expect(page().props.scrollEnabled).toBe(true);
 }finally{if(r)await act(async()=>r.unmount());vi.unstubAllGlobals();}
});
