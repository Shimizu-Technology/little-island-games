/** A-polish: Arcade at the largest text size. Map title never breaks mid-word, the start card keeps its choices scrollable
 * above a compact Start dock, and Crab's HUD starts below the measured header. */
import React, { createContext } from 'react';
import TestRenderer, { act, type ReactTestInstance } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { wordWidth } from '../src/components/wordFit';
import { arcadeGames } from '../src/arcade/registry';
import { emptyArcadeLearner } from '../src/arcade/progress';
import { createCrab, crabLevel, crabLevels } from '../src/arcade/games/crab-crossing/engine';
const viewport=vi.hoisted(()=>({width:393,height:852}));
const db=vi.hoisted(()=>({raw:null as string|null}));
vi.mock('../src/state/storage',()=>({storage:{get:async()=>db.raw,set:async(raw:string)=>{db.raw=raw;},preserve:async()=>{}}}));
vi.mock('react-native',()=>({View:'View',TextInput:'TextInput',ScrollView:'ScrollView',Switch:'Switch',Platform:{OS:'ios',select:(o:Record<string,unknown>)=>o.ios},useWindowDimensions:()=>viewport,AppState:{addEventListener:()=>({remove(){}})}}));
vi.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({top:59,bottom:34,left:0,right:0})}));
vi.mock('react-native-svg',()=>({default:'Svg',Rect:'Rect',Path:'Path',Circle:'Circle'}));
vi.mock('react-native-reanimated',()=>({default:{View:'AnimatedView'},useSharedValue:(value:unknown)=>({value}),useAnimatedStyle:()=>({}),useFrameCallback:()=>{},cancelAnimation:()=>{},Easing:{inOut:()=>{},sin:{}},withDelay:()=>0,withRepeat:()=>0,withSequence:()=>0,withTiming:()=>0}));
vi.mock('expo-router',()=>({router:{replace(){}}}));
vi.mock('../src/components/Audio',()=>({AudioPreferences:createContext({})}));
vi.mock('../src/components/ui',()=>({Button:'Button',Chip:'Chip',Copy:'Copy',Heading:'Heading',IconButton:'IconButton',PressableScale:'PressableScale',ToggleRow:'ToggleRow',C:{line:'#ccc',paper:'#fff',ink:'#000'},font:undefined,styles:{},Sheet:({visible,children}:{visible:boolean;children:React.ReactNode})=>visible?children:null}));
vi.mock('../src/components/Text',()=>({Text:'Text'}));
vi.mock('../src/components/motion',()=>({useReducedMotion:()=>true}));
vi.mock('../src/badges/ResultCard',()=>({BadgeResultCard:()=>null}));
vi.mock('../src/islander/Companion',()=>({Companion:()=>null}));
vi.mock('../src/personalization/LearnerChip',()=>({LearnerChip:()=>null}));
vi.mock('../src/arcade/games/fruit-bat-flight/Art',()=>({ShellMedal:()=>null}));
vi.mock('../src/arcade/FamilySetup',()=>({FamilySetup:()=>null}));
vi.mock('../src/arcade/PlayScene',()=>({PlayScene:()=>null}));
vi.mock('../src/arcade/PlayTeaching',()=>({PlayTeaching:()=>null}));
vi.mock('../src/components/Settings',()=>({Settings:()=>null}));
vi.mock('../src/components/SaveStatus',()=>({SaveStatus:()=>null}));
vi.mock('../src/components/Icon',()=>({Icon:()=>null}));
vi.mock('../src/components/GameIcon',()=>({GameIcon:()=>null}));
vi.mock('../src/arcade/Scene',()=>({ArcadeScene:()=>null}));
vi.mock('../src/arcade/Juice',()=>({Hero:()=>null,StarReveal:()=>null,HudPill:'HudPill'}));
vi.mock('../src/arcade/TreasureArt',()=>({ChestArt:()=>null}));
vi.mock('../src/arcade/Art',()=>({ArcadeIsland:()=>null,StarDisplay:()=>null}));
vi.mock('../src/arcade/Chest',()=>({TreasureChest:()=>null}));
vi.mock('../src/arcade/Collection',()=>({OutfitCloset:()=>null,StickerBook:()=>null}));
vi.mock('../src/arcade/Teaching',()=>({Teaching:()=>null}));
vi.mock('../src/arcade/audio',()=>({useArcadeAudio:()=>({say(){},tone(){}})}));
vi.mock('../src/arcade/breakClock',()=>({markArcadePlaying(){},arcadeBreakDue:()=>false,acknowledgeArcadeBreak(){}}));
vi.mock('../src/arcade/loop',()=>({useArcadeForeground:()=>true,useArcadeLoop:({initial}:{initial:unknown})=>({snapshot:initial,dispatch(){},state:{current:initial},budget:{}})}));
vi.mock('../src/arcade/plays',async()=>{const {crabLevel:level,crabLevels:levels}=await import('../src/arcade/games/crab-crossing/engine');return {arcadePlays:{'crab-crossing':{level,levels,speech:()=>'',goal:()=>'Look, hop, ride.',Board:()=>null,Scene:()=>null}}};});
vi.mock('../src/arcade/Sprite',()=>({ArcadeSprite:'ArcadeSprite'}));
vi.mock('../src/arcade/LivesHud',()=>({HeartsHud:()=>null,HitReaction:({children}:{children:React.ReactNode})=>children}));
vi.mock('../src/arcade/games/grid/Feedback',()=>({GridFeedback:()=>null}));
vi.mock('../src/arcade/games/grid/Art',()=>({GridHero:()=>null,GridObject:()=>null}));
vi.mock('../src/arcade/games/grid/Controls',()=>({GridBudget:()=>null,Shake:({children}:{children:React.ReactNode})=>children,useGridInput:()=>({}),useGridTouch:()=>({handlers:{},touching:false})}));
vi.mock('../src/arcade/games/crab-crossing/CrabArt',()=>({CrabLane:()=>null,CrabVehicle:()=>null}));

// iPhone 15 at the largest accessibility size (AX5): text grows about 3.12x.
const LARGEST=3.12;
const textOf=(n:ReactTestInstance):string=>n.children.map(c=>typeof c==='string'?c:textOf(c)).join('');
const fits=(h:ReactTestInstance,line:number)=>{const size=h.props.style?.fontSize as number, scale=Math.min(LARGEST,h.props.maxFontSizeMultiplier??Infinity);return Math.max(...textOf(h).split(/[\s ]+/).map(w=>wordWidth(w)*size*scale))<=line;};
let root:ReturnType<typeof TestRenderer.create>|undefined;
afterEach(async()=>{if(root)await act(async()=>{root!.unmount();});root=undefined;vi.unstubAllGlobals();Object.assign(viewport,{width:393,height:852});});

it.each([[393,852],[320,568],[852,393]])('level map title wraps only between words at the largest text (%s×%s)',async(width,height)=>{
  Object.assign(viewport,{width,height});vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  const {LevelMap}=await import('../src/arcade/LevelMap');
  for(const game of arcadeGames){
    await act(async()=>{root=TestRenderer.create(<LevelMap game={game} person={emptyArcadeLearner()} levels={crabLevels} onLevel={()=>{}} onOutfits={()=>{}} onChest={()=>{}} active={false}/>);});
    const title=root!.root.findAll(n=>String(n.type)==='Heading'&&textOf(n)===game.name)[0];
    // The title column sits beside the 110-pt hero inside 16-pt page padding.
    expect(fits(title,width-32-116),`${game.name} at ${width}`).toBe(true);
    // The stars pill under it ("★ 0 · 0 stickers") wraps between words too, inside its 13-pt padding and border.
    const pill=root!.root.find(n=>String(n.type)==='HudPill'), scale=Math.min(LARGEST,pill.props.maxFontSizeMultiplier??Infinity);
    expect(Math.max(...'★ 0 · 0 stickers'.split(' ').map(w=>wordWidth(w)*17*scale)),`${game.name} pill at ${width}`).toBeLessThanOrEqual(width-32-116-30);
    await act(async()=>{root!.unmount();});root=undefined;
  }
});

it('start card: Start sits in a compact dock below a scrolling card that holds the Helper switch and the Dare choice',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('__DEV__',false);
  const {StoreProvider}=await import('../src/state/Store');
  const {ArcadeGameScreen}=await import('../src/arcade/ArcadeScreen');
  const {emptySave}=await import('../src/state/validation');
  const {addLearner,selectLearner}=await import('../src/learn/learners');
  db.raw=JSON.stringify({...emptySave(),learning:selectLearner(addLearner(undefined,'A','a'),'a')});
  const crab=arcadeGames.find(g=>g.id==='crab-crossing')!;
  await act(async()=>{root=TestRenderer.create(<StoreProvider><ArcadeGameScreen game={crab}/></StoreProvider>);});
  // Open W2-2, which carries a dare, from the real level map.
  await act(async()=>{root!.root.findAll(n=>String(n.type)==='Button'&&textOf(n)==='World 2')[0].props.onPress();});
  await act(async()=>{root!.root.find(n=>String(n.type)==='PressableScale'&&n.props.testID==='level-w2-2').props.onPress();});
  const scroll=root!.root.findAll(n=>String(n.type)==='ScrollView')[0], dock=root!.root.find(n=>n.props.testID==='arcade-start-dock'&&String(n.type)==='View');
  const inside=(n:ReactTestInstance,parent:ReactTestInstance)=>{for(let p:ReactTestInstance|null=n;p;p=p.parent)if(p===parent)return true;return false;};
  const helper=root!.root.find(n=>String(n.type)==='ToggleRow'&&n.props.label==='Helper'), dares=root!.root.find(n=>n.props.testID==='arcade-dares'&&String(n.type)==='View');
  expect(inside(helper,scroll)).toBe(true);expect(inside(dares,scroll)).toBe(true);expect(inside(dock,scroll)).toBe(false);
  expect(scroll.props.scrollEnabled).not.toBe(false);
  // The dock's Start label stops at 2x, like the header, so the card keeps most of the height to scroll in.
  const start=dock.findAll(n=>String(n.type)==='Button')[0];
  expect(textOf(start)).toBe('Show me & play');expect(start.props.maxFontSizeMultiplier).toBe(2);
  // The card's level name and its world/level line never break a word.
  const name=root!.root.find(n=>String(n.type)==='Heading'&&textOf(n)===crabLevel('w2-2').name);
  expect(fits(name,Math.min(480,393-32)-50)).toBe(true);
  // A decorative title like the header: it stops at 2x so the goals, Helper and Dare stay close.
  expect(name.props.maxFontSizeMultiplier).toBeLessThanOrEqual(2);
  const where=root!.root.find(n=>String(n.type)==='Copy'&&textOf(n).startsWith('Canoe Lagoon'));
  expect(where.props.maxFontSizeMultiplier).toBe(2);expect(textOf(where)).toContain('Level 2');
});

it.each([0,62,171])('Crab HUD starts below the measured header (%s pt) with HUD text capped like Lagoon',async(overlayTop)=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  const {CrabBoard}=await import('../src/arcade/games/crab-crossing/View');
  await act(async()=>{root=TestRenderer.create(<CrabBoard initial={createCrab(crabLevel('w2-2'),7,false)} active={false} helper={false} outfit={'classic' as never} onResult={()=>{}} onTone={()=>{}} size={393} height={700} wide={false} debug={false} overlayTop={overlayTop}/>);});
  // The HUD is the absolutely placed group around the burrow count.
  let hud=root!.root.find(n=>String(n.type)==='Text'&&textOf(n).startsWith('BURROWS'));
  while(!(String(hud.type)==='View'&&hud.props.style?.position==='absolute'))hud=hud.parent!;
  expect(hud.props.style.position).toBe('absolute');expect(hud.props.style.top).toBeGreaterThanOrEqual(overlayTop+4);
  for(const t of hud.findAll(n=>String(n.type)==='Text'))expect(t.props.maxFontSizeMultiplier,textOf(t)).toBeLessThanOrEqual(1.5);
  const hint=root!.root.find(n=>String(n.type)==='Copy'&&textOf(n)==='Tap to hop · swipe to steer');
  expect(hint.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
  // The hint never runs under the arrow keys at the bottom right.
  const hintBox=root!.root.find(n=>String(n.type)==='View'&&n.props.testID==='crab-hint');
  expect(hintBox.props.style.right).toBeGreaterThanOrEqual(10+44*3+4*2);
});
