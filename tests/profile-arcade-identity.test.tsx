/** Real ArcadeGameScreen + Store; presentation/audio/gameplay children are inert probes. */
import React, { createContext, useLayoutEffect } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { StoreProvider, useStore } from '../src/state/Store';
import { ArcadeGameScreen } from '../src/arcade/ArcadeScreen';
import { emptySave } from '../src/state/validation';
import { addLearner, selectLearner } from '../src/learn/learners';
import { arcadeTransition, arcadeLearner, gameProgress, levelOpen } from '../src/arcade/progress';
import type { ArcadeGame } from '../src/arcade/types';
vi.mock('../src/atmosphere/AtmosphereHeader', () => ({ AtmosphereHeader: () => null }));
vi.mock('../src/atmosphere/GlobalWeatherLayer', () => ({ GlobalWeatherLayer: () => null, AtmosphereSky: () => null }));

vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false }));
const db=vi.hoisted(()=>({raw:null as string|null}));
vi.mock('../src/state/storage',()=>({storage:{get:async()=>db.raw,set:async(raw:string)=>{db.raw=raw;},preserve:async()=>{}}}));
vi.mock('../src/ui/fonts',()=>({useNunitoLoaded:()=>false}));
vi.mock('react-native',()=>({View:'View',TextInput:'TextInput',ScrollView:'ScrollView',useWindowDimensions:()=>({width:390,height:844}),AppState:{addEventListener:()=>({remove(){}})}}));
vi.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})}));
vi.mock('react-native-svg',()=>({default:'Svg',Rect:'Rect'}));
vi.mock('expo-router',()=>({router:{replace(){}}}));
vi.mock('../src/components/Audio',()=>({AudioPreferences:createContext({})}));
vi.mock('../src/components/ui',()=>({Button:'Button',Chip:'Chip',Copy:'Copy',Heading:'Heading',IconButton:'IconButton',PressableScale:'PressableScale',ToggleRow:'ToggleRow',styles:{},Sheet:({visible,children}:{visible:boolean;children:React.ReactNode})=>visible?children:null}));
vi.mock('../src/badges/ResultCard',()=>({BadgeResultCard:()=>null}));
vi.mock('../src/islander/Companion',()=>({Companion:()=>null}));
vi.mock('../src/personalization/LearnerChip',()=>({LearnerChip:()=>null}));
vi.mock('../src/arcade/games/fruit-bat-flight/Art',()=>({ShellMedal:()=>null}));
vi.mock('../src/arcade/FamilySetup',()=>({FamilySetup:()=>null}));
vi.mock('../src/arcade/PlayScene',()=>({PlayScene:()=>null}));
vi.mock('../src/arcade/PlayTeaching',()=>({PlayTeaching:({onPlay}:{onPlay:()=>void})=><button onClick={onPlay}>Teach play</button>}));
vi.mock('../src/components/Settings',()=>({Settings:({visible,onClose}:{visible:boolean;onClose:()=>void})=>visible?<button onClick={onClose}>Close settings</button>:null}));
vi.mock('../src/components/SaveStatus',()=>({SaveStatus:()=>null}));
vi.mock('../src/components/Icon',()=>({Icon:()=>null}));
vi.mock('../src/components/GameIcon',()=>({GameIcon:()=>null}));
vi.mock('../src/arcade/Scene',()=>({ArcadeScene:()=>null}));
vi.mock('../src/arcade/Juice',()=>({Hero:()=>null,StarReveal:()=>null}));
vi.mock('../src/arcade/TreasureArt',()=>({ChestArt:()=>null}));
vi.mock('../src/arcade/Art',()=>({ArcadeIsland:()=>null,StarDisplay:()=>null}));
vi.mock('../src/arcade/Chest',()=>({TreasureChest:()=>null}));
vi.mock('../src/arcade/Collection',()=>({OutfitCloset:()=>null,StickerBook:()=>null}));
vi.mock('../src/arcade/LevelMap',()=>({LevelMap:({onLevel}:{onLevel:(id:string)=>void})=><button {...{onLevel}} onClick={()=>onLevel('w2-1')}>Choose w2-1</button>}));
vi.mock('../src/arcade/Teaching',()=>({Teaching:({onPlay}:{onPlay:()=>void})=><button onClick={onPlay}>Teach play</button>}));
vi.mock('../src/arcade/audio',()=>({useArcadeAudio:()=>({say(){},tone(){}})}));
vi.mock('../src/arcade/breakClock',()=>({markArcadePlaying(){},arcadeBreakDue:()=>false,acknowledgeArcadeBreak(){}}));
vi.mock('../src/arcade/loop',()=>({useArcadeForeground:()=>true}));
vi.mock('../src/arcade/registry',()=>({arcadeShelfGames:()=>[],arcadeGames:[]}));
vi.mock('../src/arcade/plays',async()=>{const {reefLevel,reefLevels}=await import('../src/arcade/games/reef-builder/engine');return {arcadePlays:{'reef-builder':{level:reefLevel,levels:reefLevels,speech:()=>'',goal:()=>'',Board:(props:unknown)=>React.createElement('audit-board',props as Record<string,unknown>),Scene:()=>null}}};});
let store:ReturnType<typeof useStore>;
function Probe(){const s=useStore();useLayoutEffect(()=>{store=s;},[s]);return null;}
const game:ArcadeGame={id:'reef-builder',name:'Reef Builder',color:'#123',hero:'Pip',tagline:'Audit',surface:'#fff',subject:'math',twoPlayer:false,worlds:[{id:'w1',name:'One',detail:'',stars:0},{id:'w2',name:'Two',detail:'',stars:12}]};
it('R04 identity clears another learner’s selection and pending start; finish rejection is recoverable',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('__DEV__',false);
  const learning=selectLearner(addLearner(addLearner(undefined,'A','a'),'B','b'),'a');
  let arcade=arcadeTransition(undefined,'a',{type:'finish',game:'reef-builder',level:'w1-1',stars:3,score:1,round:'a1',name:'A'});
  for(let i=2;i<=4;i++) arcade=arcadeTransition(arcade,'a',{type:'finish',game:'reef-builder',level:`w1-${i}`,stars:3,score:i,round:`a${i}`,name:'A'});
  db.raw=JSON.stringify({...emptySave(),learning,arcade});let root!:ReturnType<typeof TestRenderer.create>;
  try{
    await act(async()=>{root=TestRenderer.create(<StoreProvider><Probe/><ArcadeGameScreen game={game}/></StoreProvider>);});
    await act(async()=>{root.root.findAllByType('button').find(n=>n.children.includes('Choose w2-1'))!.props.onClick();});
    await act(async()=>{root.root.findAll(n=>String(n.type)==='Button'&&n.props.children==='Settings')[0].props.onPress();});
    await act(async()=>{store.selectLearner('b');});
    expect(levelOpen(gameProgress(arcadeLearner(store.save.arcade,'b'),'reef-builder'),'w2-1')).toBe(true);
    await act(async()=>{root.root.findAllByType('button').find(n=>n.children.includes('Close settings'))!.props.onClick();});
    expect(root.root.findAll(n=>String(n.type)==='Copy'&&n.props.children==='Two · Level 1')).toHaveLength(0);
    expect(root.root.findAll(n=>String(n.type)==='Button'&&n.props.children==='Show me & play')).toHaveLength(0);
    expect(root.root.findAll(n=>String(n.type)==='audit-board')).toHaveLength(0);
    // Select B's available first level, teach, start and save a real accepted result.
    // The map stub selects w2-1; calling its actual callback exercises the unlocked first level.
    const map = root.root.findAll(n => typeof n.props.onLevel === 'function')[0];
    await act(async()=>map.props.onLevel('w1-1'));
    await act(async()=>{root.root.findAll(n=>String(n.type)==='Button'&&n.props.children==='Show me & play')[0].props.onPress();});
    await act(async()=>{root.root.findAllByType('button').find(n=>n.children.includes('Teach play'))!.props.onClick();});
    const board=root.root.findAll(n=>String(n.type)==='audit-board')[0];expect(board.props.level.id).toBe('w1-1');
    // A malformed terminal offers a real exit, and doesn't consume result credit.
    const acceptedArcade = store.arcade;
    // Exercise real admission rejection with an invalid score.
    await act(async()=>board.props.onResult({cleared:true,stars:3,score:-1,detail:'invalid'}));
    expect(root.root.findAll(n=>String(n.type)==='Copy'&&String(n.props.children).includes('could not be checked')).length).toBeGreaterThan(0);
    expect(root.root.findAll(n=>String(n.type)==='Button'&&n.props.children==='Try saving again')).toHaveLength(0);
    expect(store.arcade).toBe(acceptedArcade);
    await act(async()=>root.root.findAll(n=>n.props.title==='Keep your result'&&typeof n.props.onClose==='function')[0].props.onClose());
    expect(root.root.findAll(n=>String(n.type)==='Button'&&n.props.children==='Save my result')).toHaveLength(0);
    expect(root.root.findAll(n=>String(n.type)==='Button'&&n.props.children==='Result options')).toHaveLength(1);
    await act(async()=>board.props.onResult({cleared:true,stars:3,score:100,detail:'cleared'}));
    expect(gameProgress(arcadeLearner(store.save.arcade,'b'),'reef-builder').stars['w1-1']).toBe(3);
    expect(root.root.findAll(n=>String(n.type)==='audit-board')).toHaveLength(0);
  }finally{if(root)await act(async()=>{root.unmount();});vi.unstubAllGlobals();}
});
