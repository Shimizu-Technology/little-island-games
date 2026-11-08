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
import { registration, type Action } from './helpers/challenge-replay';
import { defaultComfort, completedSignal } from '../src/challenge/offers';
import { startSession } from '../src/learn/session';
const db=vi.hoisted(()=>({raw:null as string|null,block:null as Promise<void>|null}));
vi.mock('../src/state/storage',()=>({storage:{get:async()=>db.raw,set:async(raw:string)=>{db.raw=raw;},preserve:async()=>{},writeDraft:async()=>{if(db.block)await db.block;},discardSession:async()=>{}}}));
vi.mock('react-native',()=>({ScrollView:'section',View:'div',useWindowDimensions:()=>({width:320,height:667}),AppState:{addEventListener:()=>({remove(){}})}}));
vi.mock('react-native-safe-area-context',()=>({SafeAreaView:'main'}));
vi.mock('expo-router',()=>({useIsFocused:()=>true,router:{canGoBack:()=>false,replace:vi.fn()}}));
vi.mock('../src/components/ui',()=>({Button:'button',Chip:'button',Heading:'h2',Copy:'p',ToggleRow:'switch',styles:{}}));
vi.mock('../src/components/Audio',()=>({AudioPreferences:createContext({})}));
vi.mock('../src/components/SaveStatus',()=>({SaveStatus:()=>null}));
vi.mock('../src/personalization/LearnerChip',()=>({LearnerChip:()=>null}));
let store:ReturnType<typeof useStore>;
function Probe(){const s=useStore();useLayoutEffect(()=>{store=s;},[s]);return null;}
function ReadyFrame(){return useStore().ready?<ChallengeFrame entry={entry}/>:null;}
const entry={...registration,render:(_session:unknown,dispatch:(a:unknown)=>void)=><button onClick={()=>dispatch({type:'read-aloud'} satisfies Action)}>Read aloud</button>};
const press=async(root:ReactTestRenderer,label:string)=>act(async()=>{const button=root.root.findAllByType('button').find(n=>n.children.includes(label));expect(button,label).toBeDefined();(button!.props.onPress??button!.props.onClick)();});
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
