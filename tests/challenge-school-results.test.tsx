import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { LearnFrame } from '../src/learn/LearnFrame';
import * as storeModule from '../src/state/Store';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptyChallenge } from '../src/state/challenge';
import { emptySave } from '../src/state/validation';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { addLearner } from '../src/learn/learners';
import { startSession } from '../src/learn/session';
import { schoolContext } from '../src/challenge/catalog';
import { completedSignal } from '../src/challenge/offers';
import { optionsAtLevel } from '../src/learn/levels';
import { router } from 'expo-router';
const route=vi.hoisted(()=>({focused:true}));
const db=vi.hoisted(()=>({raw:null as string|null}));const sound=vi.hoisted(()=>vi.fn());
const saveByteCap=vi.hoisted(()=>({max:null as number|null}));
vi.mock('../src/state/validation',async(orig)=>{
 const mod=await orig<typeof import('../src/state/validation')>();
 return {...mod,withinSaveLimit:(raw:string)=>(saveByteCap.max===null?mod.withinSaveLimit(raw):raw.length<=saveByteCap.max)};
});
vi.mock('../src/state/storage',()=>({storage:{get:async()=>db.raw,set:async(s:string)=>{db.raw=s;},preserve:async()=>{}}}));
vi.mock('react-native',()=>({ScrollView:'section',View:'div',useWindowDimensions:()=>({width:320,height:667}),AppState:{addEventListener:()=>({remove(){}})}}));
vi.mock('react-native-safe-area-context',()=>({SafeAreaView:'main',useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})}));
vi.mock('expo-router',()=>({useIsFocused:()=>route.focused,router:{canGoBack:()=>false,replace:vi.fn(),push:vi.fn()}}));
vi.mock('../src/components/ui',()=>({Button:'button',Chip:'button',Heading:'h2',Copy:'p',ToggleRow:'switch',Sheet:({visible,children,footer}:{visible:boolean;children:React.ReactNode;footer:React.ReactNode})=>visible?<section>{children}{footer}</section>:null,GameHeader:()=>null,C:{},styles:{}}));
vi.mock('../src/components/Audio',()=>({AudioPreferences:createContext({}),useSoundControls:()=>({play:sound,stop:vi.fn()}),hasSpeech:()=>true}));
vi.mock('../src/components/SaveStatus',()=>({SaveStatus:()=>null}));
vi.mock('../src/components/Match',()=>({Scoreboard:()=>null,PlayerNames:()=>null}));
vi.mock('../src/components/feel',()=>({feel:()=>{}}));
vi.mock('../src/personalization/LearnerChip',()=>({LearnerChip:()=>null}));
vi.mock('../src/islander/Companion',()=>({Companion:()=>null,LearningCompanion:({children}:{children:React.ReactNode})=>children,PhoneLearningCompanion:()=>null,useCompanionReaction:()=>({event:null,react:()=>{}})}));
vi.mock('../src/learn/LearnChrome',()=>({IslandBackdrop:()=>null,RoundProgress:()=>null,subjectTheme:{reading:{},coding:{},numbers:{},thinking:{}}}));
vi.mock('../src/learn/LearnArt',()=>({LearnArt:()=>null}));
vi.mock('../src/learn/Celebrate',()=>({Celebrate:()=>null}));
vi.mock('../src/learn/LevelPath',()=>({LevelPath:()=>null}));
vi.mock('../src/learn/growth/Board',()=>({GrowthBoard:()=>null}));
vi.mock('../src/learn/games/hafa-adai/view',()=>({LastPicnicWord:()=>null}));
const boardHold=vi.hoisted(()=>({fn:null as null|((held:boolean)=>void)}));
// Boards render nothing here; each one records the page-scroll hold it was given.
vi.mock('../src/learn/views',async()=>{const {useContext,useLayoutEffect}=await import('react');const {GridInteraction}=await import('../src/puzzles/grid/preferences');return {views:new Proxy({},{get:()=>({Board:()=>{const hold=useContext(GridInteraction);useLayoutEffect(()=>{boardHold.fn=hold;},[hold]);return null;},Art:()=>null})})};});
vi.mock('../src/badges/ResultCard',()=>({BadgeResultCard:()=>null}));
let store:ReturnType<typeof useStore>;
function Probe(){const s=useStore();useLayoutEffect(()=>{store=s;},[s]);return s.ready?<LearnFrame id="letter-lagoon"/>:null;}
async function mount(owner='a',active=owner,mode:'solo'|'together'='solo',count=0){
 let save=migrateProfiles({...emptySave(),learning:addLearner(addLearner(undefined,'A','a'),'B','b')});
 save.learning={...save.learning!,active};save.settings.sound=true;
 const start={...startSession('letter-lagoon',{options:optionsAtLevel({mode,pace:'easy'},2)}, {},42),learner:owner};
 const round={...start,state:{...start.state as object,index:4,placed:[],clean:[true,true,true,true],helped:false,hint:false,miss:false}};save.learn={'letter-lagoon':round};
 const progress=save.challenge!;let next=progress;for(let i=0;i<count;i++)next=completedSignal(next,schoolContext('letter-lagoon',2),true,true);save.challenge=next;save.profiles!.people[active].challenge=next;
 db.raw=encodeSave(save);let root!:ReactTestRenderer;await act(async()=>{root=create(<StoreProvider><Probe/></StoreProvider>);});return root;
}
const buttons=(r:ReactTestRenderer)=>r.root.findAllByType('button');
const press=async(r:ReactTestRenderer,label:string)=>act(async()=>{const b=buttons(r).find(n=>n.children.includes(label));expect(b,label).toBeDefined();b!.props.onPress();});
it.each([['a','b','solo'],['a','a','together']] as const)('P2-3: suppresses foreign and Together result controls (%s %s %s)',async(owner,active,mode)=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);let r!:ReactTestRenderer,spy:ReturnType<typeof vi.spyOn>|undefined;
 try{r=await mount(active,active,mode,mode==='together'?1:2);
  if(owner!==active){const current=store,round=current.save.learn!['letter-lagoon']!;spy=vi.spyOn(storeModule,'useStore').mockReturnValue({...current,save:{...current.save,learn:{...current.save.learn,'letter-lagoon':{...round,learner:owner}}}});await act(async()=>r.update(<LearnFrame id="letter-lagoon"/>));}
  expect(JSON.stringify(r.toJSON())).toContain('You did it!');expect(r.root.findAllByProps({testID:'challenge-offer'})).toHaveLength(0);expect(JSON.stringify(r.toJSON())).not.toContain('Keep going with Sound Boat');
 }finally{spy?.mockRestore();if(r)await act(async()=>r.unmount());vi.unstubAllGlobals();}
});
it.each(['family','a'])('P2-4: bridge works for %s and dismissal survives another round and reload',async owner=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);let r!:ReactTestRenderer;try{r=await mount(owner,owner,'solo',0);expect(JSON.stringify(r.toJSON())).toContain('Keep going with Sound Boat');await press(r,'Not now');expect(JSON.stringify(r.toJSON())).not.toContain('Keep going with Sound Boat');await act(async()=>r.unmount());
 const disk=JSON.parse(db.raw!);for(const person of Object.values(disk.profiles.people) as {challenge:ReturnType<typeof completedSignal>}[])person.challenge=completedSignal(person.challenge,schoolContext('letter-lagoon',2),true,owner!=='family');db.raw=JSON.stringify(disk);
 await act(async()=>{r=create(<StoreProvider><Probe/></StoreProvider>);});expect(JSON.stringify(r.toJSON())).not.toContain('Keep going with Sound Boat');}finally{if(r)await act(async()=>r.unmount());vi.unstubAllGlobals();}
});
it('P2-7: School invitation retains its recorded Hear action',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);let r!:ReactTestRenderer;try{r=await mount('a','a','solo',2);await press(r,'Hear the invitation');expect(sound).toHaveBeenCalledWith('learning-try-level-3');}finally{if(r)await act(async()=>r.unmount());vi.unstubAllGlobals();}
});

function CrabProbe(){const s=useStore();useLayoutEffect(()=>{store=s;},[s]);return s.ready?<LearnFrame id="crab-commands"/>:null;}
it.each([false,true])('Crab entry dismisses setup without changing a School draft (saved %s)',async hasDraft=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);route.focused=true;vi.mocked(router.push).mockClear();
 let save=migrateProfiles(emptySave());
 if(hasDraft){const round=startSession('crab-commands',{options:{mode:'solo',pace:'easy'}},{},42);save.learn={'crab-commands':{...round,state:{...round.state as object,program:['right'],cards:1},learner:'family'}};}
 db.raw=encodeSave(save);let r!:ReactTestRenderer;
 try{
  await act(async()=>{r=create(<StoreProvider><CrabProbe/></StoreProvider>);});
  const before=JSON.stringify(store.save.learn?.['crab-commands']);
  if(hasDraft)await press(r,'New round & options');
  await press(r,'Challenge');expect(router.push).toHaveBeenCalledWith({pathname:'/challenge',params:{game:'crab-commands'}});
  if(hasDraft)expect(JSON.stringify(r.toJSON())).not.toContain('Starting a new round replaces this round.');
  route.focused=false;await act(async()=>r.update(<StoreProvider><CrabProbe/></StoreProvider>));
  expect(r.root.findByProps({title:hasDraft?'A fresh round':'Let’s play Crab Commands'}).props.visible).toBe(false);
  expect(JSON.stringify(store.save.learn?.['crab-commands'])).toBe(before);
 }finally{route.focused=true;if(r)await act(async()=>r.unmount());vi.unstubAllGlobals();}
});
it.each(['e7','e6'])('Crab P2-7: finished %s beach offers same-puzzle only when registered',async id=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.mocked(router.push).mockClear();route.focused=true;
 const {levels,solve}=await import('../src/learn/games/crab-commands/engine');
 let save=migrateProfiles({...emptySave(),learning:addLearner(undefined,'A','a')});const round=startSession('crab-commands',{options:{mode:'solo',pace:'easy'}},{},42),ids=['ea1','eb1',id];
 const completed=ids.map(id=>solve(levels.find(l=>l.id===id)!));save.learn={'crab-commands':{...round,learner:'a',state:{...round.state as object,levels:ids,completed,program:[],cursor:0,running:false,cards:completed.flat().length}}};
 let progress=completedSignal(emptyChallenge(),schoolContext('crab-commands',1),true,true);progress=completedSignal(progress,schoolContext('crab-commands',1),true,true);progress.signals[0][3]='easy';save.challenge=progress;save.profiles!.people.a.challenge=progress;db.raw=encodeSave(save);let r!:ReactTestRenderer;
 try{await act(async()=>{r=create(<StoreProvider><CrabProbe/></StoreProvider>);});await press(r,id==='e7'?'Try this beach with a dare':'Try a related challenge');expect(router.push).toHaveBeenCalledWith({pathname:'/challenge',params:{game:'crab-commands',...(id==='e7'?{puzzle:'7:3'}:{})}});
 }finally{if(r)await act(async()=>r.unmount());vi.unstubAllGlobals();}
});

// Integration rehearsal: a page scroll that started on the Slip Tide board also moved the crabs. A board that owns a
// touch now holds the School page still until release, as Cove grids do.
it('a board that owns a touch holds the School page scroll until release',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);boardHold.fn=null;
 const save=migrateProfiles({...emptySave(),learning:addLearner(undefined,'A','a')});
 save.learn={'letter-lagoon':{...startSession('letter-lagoon',{options:optionsAtLevel({mode:'solo',pace:'easy'},2)},{},42),learner:'a'}};
 db.raw=encodeSave(save);let r!:ReactTestRenderer;
 try{await act(async()=>{r=create(<StoreProvider><Probe/></StoreProvider>);});
  const page=()=>r.root.findByType('section' as never);
  expect(boardHold.fn).not.toBeNull();expect(page().props.scrollEnabled).toBe(true);
  await act(async()=>boardHold.fn!(true));expect(page().props.scrollEnabled).toBe(false);
  await act(async()=>boardHold.fn!(false));expect(page().props.scrollEnabled).toBe(true);
 }finally{if(r)await act(async()=>r.unmount());vi.unstubAllGlobals();}
});

function ScaleProbe(){const s=useStore();useLayoutEffect(()=>{store=s;},[s]);return s.ready?<LearnFrame id="shell-scale"/>:null;}
it.each([
 ['b', 'Both people keep this Together finish. Ready for another round?'],
 [null, 'Your Together finish is saved. Ready for another round?'],
] as const)('R2 P2-2: Shell Scale Together result copy matches whether a saved partner was credited (partner=%s)',async(partner,expectedCopy)=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 const { startRound, setPartner } = await import('../src/learn/games/shell-scale/engine');
 let save=migrateProfiles({...emptySave(),learning:addLearner(addLearner(undefined,'Alex','a'),'Maya','b')});
 save.learning={...save.learning!,active:'a'};
 const base=startRound(1,()=>0.25);
 const finishedState={...setPartner(base,partner),index:4,done:[[1,false],[1,false],[1,false],[1,false]] as [number,boolean][],order:[],oddPick:null,oddDir:null,history:[],undo:[],won:false,checked:false,checks:0,misses:0,phase:'guesser' as const,pendingWeigh:null};
 const round={...startSession('shell-scale',{options:optionsAtLevel({mode:'together',pace:'easy'},1),names:['Alex','Maya']}, {},42),learner:'a',state:finishedState};
 save.learn={'shell-scale':round};
 db.raw=encodeSave(save);let r!:ReactTestRenderer;
 try{
  await act(async()=>{r=create(<StoreProvider><ScaleProbe/></StoreProvider>);});
  const rendered=JSON.stringify(r.toJSON());
  expect(rendered).toContain('You weighed it out together!');
  expect(rendered).toContain(expectedCopy);
  if(partner===null)expect(rendered).not.toContain('Both people keep this Together finish');
 }finally{if(r)await act(async()=>r.unmount());vi.unstubAllGlobals();}
});

it('R2 P2-2: Store.learnUpdate rejects Shell Scale Together finish when save admission fails, surfaces error, and retries cleanly once room exists',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 const { nextBoard, setPartner, startRound } = await import('../src/learn/games/shell-scale/engine');
 const { trueSortOrder } = await import('../src/learn/games/shell-scale/rules');
 const { progressFor } = await import('../src/state/challengeDrafts');
 let save=migrateProfiles({...emptySave(),learning:addLearner(addLearner(undefined,'Alex','a'),'Maya','b')});
 save.learning={...save.learning!,active:'a'};
 let st=startRound(3,()=>0.25);
 for(let i=0;i<4;i++){
  const t=st.puzzles[st.index],w=[...(t[3] as string)].map(Number),ord=trueSortOrder({kind:'sort',n:4,cast:[0,1,2,3],weights:w});
  st={...st,order:ord,checks:1,won:true};
  if(i<3)st=nextBoard(st);
 }
 const round={...startSession('shell-scale',{options:optionsAtLevel({mode:'together',pace:'hard'},3),names:['Alex','Maya']}, {},42),learner:'a',revision:3,state:st};
 save.learn={'shell-scale':round};
 const encodedBefore=encodeSave(save);
 db.raw=encodedBefore;let r!:ReactTestRenderer;
 try{
  await act(async()=>{r=create(<StoreProvider><ScaleProbe/></StoreProvider>);});
  expect(store.ready).toBe(true);
  expect(store.recovery).toBeNull();
  const nextSession={...round,revision:round.revision+1,state:nextBoard(setPartner(st,'b'))};
  // Tight cap: enough for the current unfinished save, too small for adding Together credits.
  saveByteCap.max=encodedBefore.length+4;
  let ok=true;
  await act(async()=>{ok=store.learnUpdate('shell-scale',nextSession,{id:round.id,revision:round.revision,epoch:store.epoch});});
  expect(ok).toBe(false);
  expect(store.error).toContain('save limit');
  expect((store.save.learn!['shell-scale']!.state as {index:number}).index).toBe(3);
  expect(progressFor(store.save,'a')!.banks.find(b=>b[0]===362)).toBeUndefined();
  expect(progressFor(store.save,'b')!.banks.find(b=>b[0]===362)).toBeUndefined();
  // Once room is freed, retrying the exact same finish succeeds and credits BOTH players!
  saveByteCap.max=null;
  await act(async()=>{ok=store.learnUpdate('shell-scale',nextSession,{id:round.id,revision:round.revision,epoch:store.epoch});});
  expect(ok).toBe(true);
  expect((store.save.learn!['shell-scale']!.state as {index:number}).index).toBe(4);
  expect(progressFor(store.save,'a')!.banks.find(b=>b[0]===362)).toBeDefined();
  expect(progressFor(store.save,'b')!.banks.find(b=>b[0]===362)).toBeDefined();
  expect(store.save.profiles!.people.a.schoolTogether?.['shell-scale']?.[3]).toEqual({completed:1,rounds:[round.id]});
  expect(store.save.profiles!.people.b.schoolTogether?.['shell-scale']?.[3]).toEqual({completed:1,rounds:[round.id]});
 }finally{saveByteCap.max=null;if(r)await act(async()=>r.unmount());vi.unstubAllGlobals();}
});
