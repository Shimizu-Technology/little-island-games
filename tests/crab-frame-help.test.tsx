import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { ChallengeFrame } from '../src/challenge/ChallengeFrame';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptyChallenge, registerSaveContent } from '../src/state/challenge';
import { catalogManifest } from '../src/state/catalogManifest';
import { emptySave } from '../src/state/validation';
import { addLearner } from '../src/learn/learners';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { putProgress } from '../src/state/challengeDrafts';
import { registration, type Action, type Payload } from '../src/challenge/registrations/crab-commands';
import { crabPuzzles } from '../src/learn/games/crab-commands/challenge-content';
import { cardCodes, solution } from '../src/learn/games/crab-commands/challenge-engine';
const db=vi.hoisted(()=>({raw:null as string|null}));
vi.mock('../src/state/storage',()=>({storage:{get:async()=>db.raw,set:async(raw:string)=>{db.raw=raw;},preserve:async()=>{},writeDraft:async()=>{},discardSession:async()=>{}}}));
vi.mock('react-native',()=>({ScrollView:'section',View:'div',useWindowDimensions:()=>({width:390,height:844}),AppState:{addEventListener:()=>({remove(){}})}}));
vi.mock('react-native-safe-area-context',()=>({SafeAreaView:'main',useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})}));
vi.mock('expo-router',()=>({useIsFocused:()=>true,router:{canGoBack:()=>false,replace:vi.fn()}}));
vi.mock('../src/components/ui',()=>({Button:'button',Chip:'button',Heading:'h2',Copy:'p',ToggleRow:'switch',PressableScale:'button',C:{},styles:{}}));
vi.mock('../src/components/Audio',()=>({AudioPreferences:createContext({sound:false}),useSoundControls:()=>({play:vi.fn(),stop:vi.fn()})}));
vi.mock('../src/components/motion',()=>({useReducedMotion:()=>true}));
vi.mock('../src/components/Settings',()=>({Settings:()=>null}));
vi.mock('../src/components/SaveStatus',()=>({SaveStatus:()=>null}));
vi.mock('../src/personalization/LearnerChip',()=>({LearnerChip:()=>null}));
vi.mock('../src/content/learnAudio',()=>({learnSources:{}}));
vi.mock('../src/learn/games/crab-commands/view',()=>({ArrowArt:()=>null,Beach:'beach',cardLabel:{up:'Up',right:'Right',down:'Down',left:'Left',forward:'Walk','turn-left':'Turn left','turn-right':'Turn right',repeat:'Again ×2'}}));
let store:ReturnType<typeof useStore>, root:ReactTestRenderer|undefined;
function Probe(){const s=useStore();useLayoutEffect(()=>{store=s;},[s]);return null;}
function Ready(){const s=useStore();return s.ready?<ChallengeFrame key={`${s.epoch}`} entry={registration}/>:null;}
afterEach(async()=>{if(root)await act(async()=>root!.unmount());root=undefined;vi.unstubAllGlobals();});
const text=()=>JSON.stringify(root!.toJSON());
const buttons=(label:string)=>root!.root.findAllByType('button').filter(b=>b.props.accessibilityLabel===label||b.children.filter(c=>typeof c==='string').join('')===label);
const press=async(label:string)=>{await vi.waitFor(()=>expect(buttons(label),label).not.toHaveLength(0),{timeout:5000,interval:20});await act(async()=>{const b=buttons(label)[0];(b.props.onPress??b.props.onClick)();});};
const paused=()=>store.save.challenge!.paused[0];
async function mount(session?:ReturnType<typeof registration.start>,recent:[number,number][]=[]){
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);registerSaveContent(registration.catalog,catalogManifest(registration.catalog));
 let save=migrateProfiles({...emptySave(),learning:addLearner(undefined,'A','a')});
 if(session)save=putProgress(save,'a',{...emptyChallenge(),nextOrdinal:session.ordinal+1,paused:[session],recent});
 db.raw=encodeSave(save);await act(async()=>{root=create(<StoreProvider><Probe/><Ready/></StoreProvider>);});
}

it('R2 P1-2: one Help in the frame, and More help and Show the whole plan still advance through the Store',async()=>{
 await mount();await press('Start this puzzle');
 await vi.waitFor(()=>expect(buttons('Go!')).toHaveLength(1),{timeout:5000,interval:20});
 expect(buttons('Help')).toHaveLength(1);
 await press('Help');expect((paused().payload as Payload).actions).toEqual([['h']]);
 await press('More help');expect((paused().payload as Payload).actions).toEqual([['h'],['h']]);
 await press('Show the whole plan');expect((paused().payload as Payload).actions).toEqual([['h'],['h'],['h']]);
 await vi.waitFor(()=>expect(text()).toContain('One working plan:'),{timeout:5000,interval:20});
 expect(buttons('Help')).toHaveLength(0);expect(buttons('More help')).toHaveLength(0);
});

it('R2 merge: Harder after Mud 5 deals the current Mud 6, never the retired legacy card',async()=>{
 const p=crabPuzzles.find(p=>p.title.startsWith('Mud 5')&&!p.retired)!;
 let s=registration.start(p.ref,'a','mud-5',emptyChallenge(),{supportOff:false,ownRead:false},[]);
 for(const c of solution(p.descriptor)!)s=registration.move(s,['a',cardCodes.indexOf(c)] as Action)!;
 // The current Mud 6 was played recently, so rotation would prefer the retired copy if it were offered.
 const mud6=crabPuzzles.find(p=>p.title.startsWith('Mud 6')&&!p.retired)!;
 await mount({...s,revision:0},[[mud6.ref.bank,mud6.ref.puzzle]]);await press('Go!');
 await vi.waitFor(()=>expect(text()).toContain('Puzzle solved!'),{timeout:8000,interval:50});
 const note=text();
 await press('Harder');
 const next=crabPuzzles.find(c=>c.ref.bank===paused().puzzle.bank&&c.ref.puzzle===paused().puzzle.puzzle)!;
 // C1d fix: when Harder leaves Mud for another idea, the finish card names exactly where it goes.
 if(!next.title.startsWith('Mud'))expect(note).toContain(`Harder takes you to ${next.title.split(' · ')[0]}.`);else expect(note).not.toContain('Harder takes you to');
 // Since C1d the Deep Water ladder holds five more ideas, so Harder may deal another unplayed card one tier up.
 expect(next.retired).toBeFalsy();expect(next.tier).toBe(mud6.tier);if(next.title.startsWith('Mud'))expect(next.ref).toEqual(mud6.ref);
},15000);

it('R2 P3-2: a refused move that is not a full log says the draft is kept, without the new-attempt offer',async()=>{
 const p=crabPuzzles.find(p=>p.title.startsWith('Fix a bug 1'))!;
 const entry={...registration,render:(...args:Parameters<typeof registration.render>)=><><button onClick={()=>args[1](['x',70])}>Bad edit</button>{registration.render(...args)}</>};
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);registerSaveContent(registration.catalog,catalogManifest(registration.catalog));
 const s=registration.start(p.ref,'a','fix-1',emptyChallenge(),{supportOff:false,ownRead:false},[]);
 db.raw=encodeSave(putProgress(migrateProfiles({...emptySave(),learning:addLearner(undefined,'A','a')}),'a',{...emptyChallenge(),nextOrdinal:s.ordinal+1,paused:[s]}));
 function Wrapped(){const st=useStore();return st.ready?<ChallengeFrame entry={entry}/>:null;}
 await act(async()=>{root=create(<StoreProvider><Probe/><Wrapped/></StoreProvider>);});
 await press('Bad edit');
 expect(text()).toContain('This draft is kept. Try Help or choose another puzzle.');expect(text()).not.toContain('This attempt is full');expect(buttons('Keep my plan in a new attempt')).toHaveLength(0);
});
