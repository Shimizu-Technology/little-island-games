import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoveRound } from '../src/cove/CoveRound';
import { StoreProvider, useStore } from '../src/state/Store';
import { registerSaveContent } from '../src/state/challenge';
import { catalogManifest } from '../src/state/catalogManifest';
import { emptySave } from '../src/state/validation';
import { addLearner } from '../src/learn/learners';
import { completion } from '../src/cove/catalog';
import { progressFor, selectedOwner } from '../src/state/challengeDrafts';
import { fixtureRegistration, fixturePuzzles } from './fixtures/word-search/registration';
import { WordSearchBoard } from '../src/puzzles/words/WordSearchBoard';
import type { WordSearchBoardProps } from '../src/puzzles/words/WordSearchBoard';
import type { ChallengeSession } from '../src/state/challenge';
import { searchEngine, type Action } from '../src/puzzles/words/game';
const db = vi.hoisted(() => ({ raw: null as string | null, rows: [] as string[], width: 393, played: vi.fn(() => true), fail: false }));
vi.mock('../src/state/storage', () => ({storage:{get:async()=>db.raw,set:async(raw:string)=>{if(db.fail)throw Error('disk');db.raw=raw;},preserve:async()=>{},writeDraft:async(raw:string)=>{await new Promise(r=>setTimeout(r,5));db.rows.push(raw);},readDrafts:async()=>db.rows,discardSession:async()=>{}}}));
vi.mock('react-native', () => ({AccessibilityInfo:{isScreenReaderEnabled:async()=>false,addEventListener:()=>({remove(){}})},ScrollView:'section',View:'div',TextInput:'input',Pressable:'button',Platform:{OS:'ios'},useWindowDimensions:()=>({width:db.width,height:852}),AppState:{addEventListener:()=>({remove(){}})}}));
vi.mock('react-native-svg',()=>({default:'svg',Circle:'circle',Line:'line',SvgXml:'picture'}));
vi.mock('expo-router',()=>({useIsFocused:()=>true,router:{}}));
vi.mock('../src/components/ui',()=>({Button:'button',Copy:'p',Heading:'h2',Chip:'button',C:{},styles:{}}));
vi.mock('../src/ui', async () => (await import('./helpers/cove-ui')).ui);
vi.mock('../src/personalization/Portrait', () => ({ Portrait: () => null }));
vi.mock('../src/cove/CoveArt', async () => (await import('./helpers/cove-ui')).art);
vi.mock('../src/components/Text',()=>({Text:'span'}));
vi.mock('../src/components/Audio',()=>({AudioPreferences:createContext({}),useSoundControls:()=>({play:db.played})}));
vi.mock('../src/components/SaveStatus',()=>({SaveStatus:()=>null}));
vi.mock('../src/puzzles/words/picture-context',()=>({SearchPicturesContext:createContext({idFor:()=> 'test',load:async()=>'<svg/>'})}));
let store:ReturnType<typeof useStore>,send:(a:Action)=>void;
const entry={...fixtureRegistration,render:(s:ChallengeSession,dispatch:(a:unknown)=>void,active:boolean,width:number)=>{
 send=dispatch;
 const el=fixtureRegistration.render(s,dispatch,active,width) as React.ReactElement<WordSearchBoardProps>;
 return el ? <WordSearchBoard {...el.props}/> : null;
}};
function Probe(){const s=useStore();useLayoutEffect(()=>{store=s;},[s]);return null;}
function Ready({partner=null}:{partner?:string|null}){const s=useStore();return s.ready?<CoveRound key={`${selectedOwner(s.save)}:${s.epoch}`} entry={entry} card={entry.puzzles[0]} partner={partner} width={353} onBrowse={()=>{}} onClose={()=>{}}/>:null;}
const settle=()=>act(async()=>{await new Promise(r=>setTimeout(r,15));});
const paused=()=>progressFor(store.save,selectedOwner(store.save))!.paused.find(s=>s.game==='word-search')!;
const action=(i:number,h:0|1=0):Action=>{const w=fixturePuzzles[0].descriptor.words[i];return ['find',w.cells[0],w.cells.at(-1)!,h];};
const surface=(s:ReactTestRenderer)=>s.root.findAll(n=>!!n.props.onResponderGrant)[0];
const event=(i:number,id:number=0)=>{const cell=353/6|0;return {nativeEvent:{changedTouches:[{identifier:id,locationX:(i%6+.5)*cell,locationY:(Math.floor(i/6)+.5)*cell}]}};};
const press=async(s:ReactTestRenderer,label:string)=>act(async()=>{const b=s.root.findAllByType('button').find(n=>n.children.includes(label));expect(b).toBeDefined();b!.props.onPress();});
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);db.raw=JSON.stringify(emptySave());db.rows=[];db.fail=false;db.width=393;db.played.mockClear();registerSaveContent(entry.catalog,catalogManifest(entry.catalog));});
afterEach(()=>vi.unstubAllGlobals());

describe('Word Search through the real Cove Store',()=>{
 it('G6-04 saves two rapid finds, resumes them exactly, and preserves help after undo',async()=>{
  let screen!:ReactTestRenderer;
  try {
   await act(async()=>{screen=create(<StoreProvider><Probe/><Ready/></StoreProvider>);});await settle();
   expect(JSON.stringify(screen.toJSON())).not.toContain('could not start');
   await act(async()=>{send(action(0));send(action(1,1));});await settle();await settle();
   expect(paused().revision).toBe(2);
   await press(screen,'Undo');await settle();
   await press(screen,'Redo');await settle();
   await press(screen,'Help · find one word');await settle();
   const accepted=paused();expect(JSON.stringify(accepted.payload)).toContain('help');
   await act(async()=>{await store.backup();screen.unmount();});
   await act(async()=>{screen=create(<StoreProvider><Probe/><Ready/></StoreProvider>);});await settle();
   expect(paused()).toEqual(accepted);
   await act(async()=>send(action(3)));await settle();
   expect(progressFor(store.save,'family')!.paused).toEqual([]);
   expect(completion(progressFor(store.save,'family')!,fixturePuzzles[0].ref,entry)).toBe(2);
  }finally{if(screen)await act(async()=>screen.unmount());}
 });
 it('G6-02 native two-pointer release keeps different trail owners and credits Together atomically',async()=>{
  db.width=768;db.raw=JSON.stringify({...emptySave(),learning:addLearner(undefined,'A','a')});let screen!:ReactTestRenderer;
  try{
   await act(async()=>{screen=create(<StoreProvider><Probe/><Ready partner="family"/></StoreProvider>);});await settle();
   const p=fixturePuzzles[0].descriptor;
   await act(async()=>{
    const h=surface(screen).props;
    h.onResponderGrant(event(p.words[0].cells[0],0));h.onResponderStart(event(p.words[1].cells[0],1));
    const a=event(p.words[0].cells.at(-1)!,0),b=event(p.words[1].cells.at(-1)!,1),both={nativeEvent:{changedTouches:[...a.nativeEvent.changedTouches,...b.nativeEvent.changedTouches]}};
    h.onResponderMove(both);h.onResponderEnd(both);
   });await settle();
   const el=fixtureRegistration.render(paused(),()=>{},true,353) as React.ReactElement<WordSearchBoardProps>;
   expect(el.props.state.found).toEqual([[0,0],[1,1]]);
   const root=surface(screen);expect(root.props.style.width).toBe(350);expect(root.findAll(n=>n.props.pointerEvents==='none' && n.props.style?.width===348).length).toBeGreaterThan(0);
   await act(async()=>send(action(2,0)));await settle();await act(async()=>send(action(3,1)));await settle();
   for(const owner of ['a','family'])expect(completion(progressFor(store.save,owner)!,fixturePuzzles[0].ref,entry)).toBe(3);
   expect(JSON.stringify(screen.toJSON())).toContain('Solved together');
  }finally{if(screen)await act(async()=>screen.unmount());}
 });
 it('G6-01 tap-tap, pointer cancellation and read-aloud have the expected saved outcomes',async()=>{
  let screen!:ReactTestRenderer;
  try{
   await act(async()=>{screen=create(<StoreProvider><Probe/><Ready/></StoreProvider>);});await settle();const w=fixturePuzzles[0].descriptor.words[0];
   await act(async()=>{const h=surface(screen).props;h.onResponderGrant(event(w.cells[0]));h.onResponderRelease(event(w.cells[0]));});
   await act(async()=>{const h=surface(screen).props;h.onResponderGrant(event(w.cells.at(-1)!));h.onResponderRelease(event(w.cells.at(-1)!));});await settle();expect(paused().revision).toBe(1);
   const before=paused();await act(async()=>{const h=surface(screen).props;h.onResponderGrant(event(0));h.onResponderTerminate();});expect(paused()).toEqual(before);
   await press(screen,'Hear word');await settle();expect(JSON.stringify(paused().payload)).toContain('hear');expect(JSON.stringify(paused().payload)).not.toContain('help');
  }finally{if(screen)await act(async()=>screen.unmount());}
 });
 it('clears a pending first-letter instruction at a new round identity',async()=>{
  const p=fixturePuzzles[0].descriptor,state=searchEngine.create(p,{version:1},{ownRead:false,supportOff:false});let screen!:ReactTestRenderer;
  try{
   await act(async()=>{screen=create(<WordSearchBoard state={state} dispatch={()=>{}} active width={353} resetKey="before"/>);});
   await act(async()=>{const h=surface(screen).props;h.onResponderGrant(event(0));h.onResponderRelease(event(0));});
   expect(JSON.stringify(screen.toJSON())).toContain('Now choose the last letter.');
   await act(async()=>screen.update(<WordSearchBoard state={state} dispatch={()=>{}} active width={353} resetKey="after"/>));
   expect(JSON.stringify(screen.toJSON())).not.toContain('Now choose the last letter.');
  }finally{if(screen)await act(async()=>screen.unmount());}
 });

});
it('reports a full log without promising that another game can always finish with Help',async()=>{
 let screen!:ReactTestRenderer;const full=vi.spyOn(entry,'full').mockReturnValue(true),move=vi.spyOn(entry,'move').mockReturnValue(null);
 try{
  await act(async()=>{screen=create(<StoreProvider><Probe/><Ready/></StoreProvider>);});await settle();
  await act(async()=>send(['help']));await settle();const text=JSON.stringify(screen.toJSON());
  expect(text).toContain('move log is full');expect(text).not.toContain('Help can still finish');
 }finally{full.mockRestore();move.mockRestore();if(screen)await act(async()=>screen.unmount());}
});

it('keeps a resumed round finish visible instead of automatically starting another attempt',async()=>{
 let screen!:ReactTestRenderer;
 try {
  await act(async()=>{screen=create(<StoreProvider><Probe/><Ready/></StoreProvider>);});await settle();
  for(const i of [0,1,2]){await act(async()=>send(action(i)));await settle();}
  await act(async()=>{await store.backup();screen.unmount();});
  await act(async()=>{screen=create(<StoreProvider><Probe/><Ready/></StoreProvider>);});await settle();
  await act(async()=>{send(action(3));await new Promise(r=>setTimeout(r,40));});await settle();
  expect(progressFor(store.save,'family')!.paused).toEqual([]);
  expect(JSON.stringify(screen.toJSON())).toContain('Puzzle solved');
 }finally{if(screen)await act(async()=>screen.unmount());}
});
