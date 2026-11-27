/** A-polish: the shared Challenge frame names the chosen dare through the round, and its headings never break mid-word at the largest text size. */
import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { ChallengeFrame } from '../src/challenge/ChallengeFrame';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptyChallenge, registerSaveContent, type ChallengeSession } from '../src/state/challenge';
import { catalogManifest } from '../src/state/catalogManifest';
import { emptySave } from '../src/state/validation';
import { addLearner } from '../src/learn/learners';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { putProgress } from '../src/state/challengeDrafts';
import { registration as pits } from '../src/challenge/registrations/shell-pits';
import { registration as crab } from '../src/challenge/registrations/crab-commands';
import { registration as slip, type Action as SlipAction, type State as SlipState } from '../src/learn/games/slip-tide/challenge';
import { ChallengeBoard } from '../src/learn/games/slip-tide/challengeBoard';
import { wordWidth } from '../src/components/wordFit';
import type { ChallengeCard, ChallengeEntry, ChallengeViewProps } from '../src/challenge/types';
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false }));
const db=vi.hoisted(()=>({raw:null as string|null}));
vi.mock('../src/state/storage',()=>({storage:{get:async()=>db.raw,set:async(raw:string)=>{db.raw=raw;},preserve:async()=>{},writeDraft:async()=>{},discardSession:async()=>{}}}));
vi.mock('../src/puzzles/bankAssets',async()=>{const {readFileSync:read}=await import('node:fs');return {bankTransport:{read:async(name:string)=>read(`src/content/puzzles/assets/${name}.lipuzzle`,'utf8')}};});
vi.mock('react-native',()=>({ScrollView:'section',View:'div',useWindowDimensions:()=>({width:393,height:852}),AppState:{addEventListener:()=>({remove(){}})}}));
vi.mock('react-native-safe-area-context',()=>({SafeAreaView:'main',useSafeAreaInsets:()=>({top:59,bottom:34,left:0,right:0})}));
vi.mock('expo-router',()=>({useIsFocused:()=>true,router:{canGoBack:()=>false,replace:vi.fn()}}));
vi.mock('../src/components/ui',()=>({Button:'button',Chip:'button',Heading:'h2',Copy:'p',ToggleRow:'switch',PressableScale:'button',C:{},styles:{}}));
vi.mock('../src/components/Audio',()=>({AudioPreferences:createContext({sound:false}),useSoundControls:()=>({play:vi.fn(),stop:vi.fn()})}));
vi.mock('../src/components/motion',()=>({useReducedMotion:()=>true}));
vi.mock('../src/components/Settings',()=>({Settings:()=>null}));
vi.mock('../src/components/SaveStatus',()=>({SaveStatus:()=>null}));
vi.mock('../src/personalization/LearnerChip',()=>({LearnerChip:()=>null}));
vi.mock('../src/content/learnAudio',()=>({learnSources:{}}));
vi.mock('../src/learn/games/crab-commands/view',()=>({ArrowArt:()=>null,Beach:'beach',cardLabel:{up:'Up',right:'Right',down:'Down',left:'Left',forward:'Walk','turn-left':'Turn left','turn-right':'Turn right',repeat:'Again ×2'}}));
vi.mock('../src/learn/games/slip-tide/field',()=>({Playfield:(props:{help?:React.ReactNode})=>props.help??null}));

// iPhone 15 portrait at the largest accessibility size (AX5): body text grows about 3.12x.
const LARGEST=3.12, LINE=393-40;
let store:ReturnType<typeof useStore>, root:ReactTestRenderer|undefined;
function Probe(){const s=useStore();useLayoutEffect(()=>{store=s;},[s]);return null;}
// Slip's board is lazily required on device; here the same props render it directly.
const slipEntry:ChallengeEntry={...slip,render:(session,dispatch,active,width,host)=>{const el=slip.render(session,dispatch,active,width,host) as React.ReactElement<ChallengeViewProps<SlipState,SlipAction>>|null;return el?<ChallengeBoard {...el.props}/>:null;}};
afterEach(async()=>{if(root)await act(async()=>root!.unmount());root=undefined;vi.unstubAllGlobals();});
async function mount(entry:ChallengeEntry,session?:ChallengeSession,nodeMock?:(el:React.ReactElement)=>unknown,youngChild=false){
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);registerSaveContent(entry.catalog,catalogManifest(entry.catalog));
  let save=migrateProfiles({...emptySave(),learning:addLearner(undefined,'A','a')});
  if(session)save=putProgress(save,'a',{...emptyChallenge(),nextOrdinal:session.ordinal+1,paused:[session]});
  if(youngChild)save={...save,settings:{...save.settings,learningComfort:{a:{offers:true,youngChild:true,opening:1}}}};
  db.raw=encodeSave(save);
  function Ready(){const s=useStore();return s.ready?<ChallengeFrame key={`${s.epoch}`} entry={entry}/>:null;}
  await act(async()=>{root=create(<StoreProvider><Probe/><Ready/></StoreProvider>,nodeMock?{createNodeMock:nodeMock}:undefined);});
  await vi.waitFor(()=>expect(store?.ready).toBe(true),{timeout:5000,interval:20});
}
const chips=()=>root!.root.findAll(n=>n.props.testID==='chosen-dare'&&typeof n.type==='string');
const textOf=(n:ReactTestInstance):string=>n.children.map(c=>typeof c==='string'?c:textOf(c)).join('');
const headings=()=>root!.root.findAllByType('h2' as never);
/** At the largest size, the heading's longest word fits its line, so iOS never breaks it mid-word. */
function fitsAtLargest(h:ReactTestInstance,line=LINE){
  const scale=Math.min(LARGEST,h.props.maxFontSizeMultiplier??Infinity), size=h.props.style?.fontSize??32;
  const widest=Math.max(...textOf(h).split(/\s+/).map(w=>wordWidth(w)*size*scale));
  return widest<=line;
}
const dared=(puzzles:readonly ChallengeCard[])=>{const p=puzzles.find(p=>!p.retired&&p.dares.some(d=>!d.retired))!;return {p,dare:p.dares.find(d=>!d.retired)!};};

it('Crab Commands (pinned board header): the chosen dare is named, quietly, through the round and read by VoiceOver',async()=>{
  const {p,dare}=dared(crab.puzzles);
  await mount(crab,crab.start(p.ref,'a','dare-crab',emptyChallenge(),{supportOff:false,ownRead:false},[dare.slot]));
  await vi.waitFor(()=>expect(chips()).toHaveLength(1),{timeout:5000,interval:20});
  const help=dare.help==='allowed'?'Help welcome':'On my own';
  expect(textOf(chips()[0])).toBe(`Dare: ${dare.label} · ${help}`);
  expect(chips()[0].props.accessible).toBe(true);
  expect(chips()[0].props.accessibilityLabel).toBe(`Your chosen dare: ${dare.label}. ${help}.`);
  // Quiet: no clock, countdown or pressure wording.
  expect(textOf(chips()[0])).not.toMatch(/time|second|hurry|quick|fast|left|\d+:\d/i);
  // Pinned chrome stays compact at the largest text, so the board and its plan keep the room.
  expect(root!.root.findAllByType('p' as never).find(n=>textOf(n).startsWith('Dare:'))!.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
  expect(headings().find(h=>textOf(h)===p.title)!.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
});

it('Slip Tide (unpinned frame): the chosen dare stays named under the puzzle title',async()=>{
  const {p,dare}=dared(slip.puzzles);
  await mount(slipEntry,slip.start(p.ref,'a','dare-slip',emptyChallenge(),{supportOff:false,ownRead:false},[dare.slot]));
  await vi.waitFor(()=>expect(chips()).toHaveLength(1),{timeout:5000,interval:20});
  expect(textOf(chips()[0])).toContain(dare.label);
  expect(chips()[0].props.accessibilityLabel).toContain(`Your chosen dare: ${dare.label}.`);
  const title=headings().find(h=>textOf(h)===p.title)!;
  expect(title).toBeDefined();expect(fitsAtLargest(title)).toBe(true);
});

it('no dare chosen: no dare line',async()=>{
  const {p}=dared(slip.puzzles);
  await mount(slipEntry,slip.start(p.ref,'a','plain-slip',emptyChallenge(),{supportOff:false,ownRead:false},[]));
  await vi.waitFor(()=>expect(headings().some(h=>textOf(h)===p.title)).toBe(true),{timeout:5000,interval:20});
  expect(chips()).toHaveLength(0);
});

it('the Challenge heading never breaks mid-word at the largest text ("Challe/nge")',async()=>{
  await mount(slipEntry);
  const heading=await vi.waitFor(()=>{const h=headings().find(n=>textOf(n)==='Challenge');expect(h).toBeDefined();return h!;},{timeout:5000,interval:20});
  expect(fitsAtLargest(heading)).toBe(true);
  // It still grows well past default: about 2x on an iPhone in portrait.
  expect(heading.props.maxFontSizeMultiplier).toBeGreaterThanOrEqual(1.8);
});

it('a pinned board starts at the top of the page, never in the empty space a long picker scrolled to',async()=>{
  const scrollTo=vi.fn();
  await mount(crab,undefined,el=>el.type==='section'?{scrollTo}:null);
  const start=await vi.waitFor(()=>{const b=root!.root.findAllByType('button' as never).find(n=>textOf(n)==='Start this puzzle');expect(b).toBeDefined();return b!;},{timeout:5000,interval:20});
  expect(scrollTo).not.toHaveBeenCalled();
  await act(async()=>{await start.props.onPress();});
  await vi.waitFor(()=>expect(store.save.challenge?.paused).toHaveLength(1),{timeout:5000,interval:20});
  expect(scrollTo).toHaveBeenCalledWith({y:0,animated:false});
});

// Independent review probes. These exercise the actual frame and valid catalog sessions.
it('REVIEW: Young-child choices hides the dare on an existing saved round',async()=>{
  const {p,dare}=dared(slip.puzzles);
  await mount(slipEntry,slip.start(p.ref,'a','saved-before-young-child',emptyChallenge(),{supportOff:false,ownRead:false},[dare.slot]),undefined,true);
  await vi.waitFor(()=>expect(headings().some(h=>textOf(h)===p.title)).toBe(true),{timeout:5000,interval:20});
  expect(store.save.settings.learningComfort?.a?.youngChild).toBe(true);
  expect(chips()).toHaveLength(0);
});
it('REVIEW: Shell Pits uses its own selected dare label and help policy',async()=>{
  const {p}=dared(pits.puzzles);
  // Native board rendering is outside this read-only Node probe. Use the real entry/catalog/start.
  for(const dare of p.dares.filter(d=>!d.retired)){
    await mount({...pits,render:()=>null},pits.start(p.ref,'a',`review-pits-${dare.slot}`,emptyChallenge(),{supportOff:false,ownRead:false},[dare.slot]));
    expect(chips()).toHaveLength(1);
    expect(textOf(chips()[0])).toBe(`Dare: ${dare.label} · ${dare.help==='allowed'?'Help welcome':'On my own'}`);
    await act(async()=>root!.unmount()); root=undefined;
  }
});
it('REVIEW: retiring a previously selected dare removes its chip',async()=>{
  const {p,dare}=dared(slip.puzzles);
  const session=slip.start(p.ref,'a','retired-dare',emptyChallenge(),{supportOff:false,ownRead:false},[dare.slot]);
  await mount({...slipEntry,puzzles:slip.puzzles.map(c=>c===p?{...c,dares:c.dares.map(d=>({...d,retired:d.slot===dare.slot}))}:c)},session);
  await vi.waitFor(()=>expect(headings().some(h=>textOf(h)===p.title)).toBe(true));
  expect(chips()).toHaveLength(0);
});
it('REVIEW: pinned board edits preserve page position after the initial scroll reset',async()=>{
  const scrollTo=vi.fn();
  const {p}=dared(crab.puzzles);
  await mount(crab,crab.start(p.ref,'a','editing-crab',emptyChallenge(),{supportOff:false,ownRead:false},[]),el=>el.type==='section'?{scrollTo}:null);
  const count=scrollTo.mock.calls.length;
  expect(count).toBeGreaterThan(0);
  const command=await vi.waitFor(()=>{const n=root!.root.findAllByType('button' as never).find(n=>n.props.accessibilityLabel==='Add Right');expect(n).toBeDefined();return n!;});
  await act(async()=>command.props.onPress());
  expect(scrollTo).toHaveBeenCalledTimes(count);
});
