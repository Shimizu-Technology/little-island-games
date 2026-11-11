/** L2 fix round (P2-2): the shared header's measured height reaches Lagoon's board while it overlays the run. */
import React, { createContext } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { StoreProvider } from '../src/state/Store';
import { ArcadeGameScreen } from '../src/arcade/ArcadeScreen';
import { emptySave } from '../src/state/validation';
import { addLearner, selectLearner } from '../src/learn/learners';
import type { ArcadeGame } from '../src/arcade/types';
const db=vi.hoisted(()=>({raw:null as string|null}));
vi.mock('../src/state/storage',()=>({storage:{get:async()=>db.raw,set:async(raw:string)=>{db.raw=raw;},preserve:async()=>{}}}));
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
vi.mock('../src/arcade/Teaching',()=>({Teaching:({onPlay}:{onPlay:()=>void})=><button onClick={onPlay}>Teach play</button>}));
vi.mock('../src/arcade/audio',()=>({useArcadeAudio:()=>({say(){},tone(){}})}));
vi.mock('../src/arcade/breakClock',()=>({markArcadePlaying(){},arcadeBreakDue:()=>false,acknowledgeArcadeBreak(){}}));
vi.mock('../src/arcade/loop',()=>({useArcadeForeground:()=>true}));
vi.mock('../src/arcade/LevelMap',()=>({LevelMap:({onLevel}:{onLevel:(id:string)=>void})=><button onClick={()=>onLevel('w1-1')}>Choose w1-1</button>}));
vi.mock('../src/arcade/registry',()=>({arcadeShelfGames:()=>[],arcadeGames:[]}));
vi.mock('../src/arcade/plays',async()=>{const {reefLevel,reefLevels}=await import('../src/arcade/games/reef-builder/engine');const play={level:reefLevel,levels:reefLevels,speech:()=>'',goal:()=>'',Board:(props:unknown)=>React.createElement('audit-board',props as Record<string,unknown>),Scene:()=>null};return {arcadePlays:{'lagoon-run':play,'reef-builder':play}};});
const world=[{id:'w1',name:'Morning Beach',detail:'',stars:0}] as ArcadeGame['worlds'];
const game=(id:'lagoon-run'|'reef-builder'):ArcadeGame=>({id,name:'Lagoon Run',color:'#123',hero:'Pip',tagline:'Audit',surface:'#fff',subject:'math',twoPlayer:false,worlds:world});
for(const id of ['lagoon-run','reef-builder'] as const) it(`${id}: the board gets the overlaid header's measured height`,async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('__DEV__',false);
  db.raw=JSON.stringify({...emptySave(),learning:selectLearner(addLearner(undefined,'A','a'),'a')});
  let root!:ReturnType<typeof TestRenderer.create>;
  try{
    await act(async()=>{root=TestRenderer.create(<StoreProvider><ArcadeGameScreen game={game(id)}/></StoreProvider>);});
    await act(async()=>{root.root.findAllByType('button').find(n=>n.children.includes('Choose w1-1'))!.props.onClick();});
    // Largest text: before a round, the header (title and Settings) stops growing at 2x so the level map stays on screen.
    expect(root.root.find(n=>String(n.type)==='Heading'&&n.props.children==='Lagoon Run').props.maxFontSizeMultiplier).toBe(2);
    expect(root.root.find(n=>String(n.type)==='Button'&&n.props.children==='Settings').props.maxFontSizeMultiplier).toBe(2);
    await act(async()=>{root.root.findAll(n=>String(n.type)==='Button'&&n.props.children==='Show me & play')[0].props.onPress();});
    await act(async()=>{root.root.findAllByType('button').find(n=>n.children.includes('Teach play'))!.props.onClick();});
    const header=root.root.find(n=>n.props.testID==='arcade-header'&&String(n.type)==='View');
    const board=()=>root.root.findAll(n=>String(n.type)==='audit-board')[0];
    if(id==='reef-builder'){expect(header.props.onLayout).toBeUndefined();expect(board().props.overlayTop).toBe(0);return;}
    for(const height of [171.2,96]){
      await act(async()=>header.props.onLayout({nativeEvent:{layout:{x:0,y:0,width:390,height}}}));
      expect(board().props.overlayTop).toBe(Math.ceil(height));
    }
    // Largest text: header copy is capped while it overlays the run, so the run keeps most of the screen.
    const title=root.root.find(n=>String(n.type)==='Heading'&&n.props.children==='Lagoon Run');
    expect(title.props.maxFontSizeMultiplier).toBe(2);
    const subtitle=root.root.find(n=>String(n.type)==='Copy'&&String(n.props.children).startsWith('Morning Beach'));
    expect(subtitle.props.maxFontSizeMultiplier).toBe(2);
  }finally{if(root)await act(async()=>{root.unmount();});vi.unstubAllGlobals();}
});
