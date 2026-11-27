import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { SceneView } from '../src/home/runtime/SceneView';
import { withPortions } from '../src/home/runtime/portions';
import { labHome } from '../src/home/runtime/lab';
import { buildScene } from '../src/home/scene/graph';
import { buildingLayout } from '../src/home/camera';
import type { Interaction } from '../src/home/runtime/useInteraction';
import { restingFlagsOf, restingMotionOf } from '../src/home/runtime/restingState';
vi.mock('../src/home/runtime/SetPieces',()=>({SetPieces:()=>null,pieceAt:()=>undefined,pieceLength:{},pieceSound:{}}));
// These scene tests replace native art; the mouth cue now also imports SVG.
vi.mock('react-native-svg',()=>({default:'Svg',Path:'Path',Circle:'Circle'}));
vi.mock('react-native',()=>({StyleSheet:{absoluteFill:{position:'absolute',top:0,left:0,right:0,bottom:0}},AppState:{currentState:'active',addEventListener:()=>({remove(){}})},View:'View',Pressable:'Pressable',ScrollView:'ScrollView',Text:'Text',Modal:'Modal',FlatList:({data,renderItem}:any)=>data.map((item:any)=>renderItem({item})),Platform:{OS:'ios'}}));
vi.mock('react-native-reanimated',()=>({default:{View:'AnimatedView'},useSharedValue:(v:any)=>React.useRef({value:v,set(n:any){this.value=n;},get(){return this.value;}}).current,withRepeat:(x:any)=>x,withTiming:(x:any)=>x,cancelAnimation:()=>{},Easing:{linear:(t:number)=>t},useAnimatedStyle:(fn:()=>unknown)=>({evaluate:fn}),useDerivedValue:(fn:()=>unknown)=>({get value(){return fn();}}),useAnimatedReaction:(prepare:any,react:any)=>{const previous=React.useRef<any>(null);React.useLayoutEffect(()=>{const next=prepare();if(next!==previous.current){react(next,previous.current);previous.current=next;}});},runOnJS:(fn:any)=>fn,runOnUI:(fn:any)=>fn}));
const pans=vi.hoisted(()=>[] as any[]);
vi.mock('react-native-gesture-handler',()=>({GestureDetector:'GestureDetector',Gesture:{Pan:()=>{
 const handlers:any={};const builder:any=new Proxy({}, {get:(_t,key)=> (...args:any[])=>{if(String(key).startsWith('on'))handlers[key]=args[0];return builder;}});pans.push(handlers);return builder;
}}}));
vi.mock('../src/home/runtime/EntityArt',()=>({EntityArt:(props:any)=>React.createElement('EntityArt',{blink:!!props.blink,entityId:props.entity.id,face:props.faceOverride,preview:props.preview,carry:props.carry}),artFrame:(e:any)=>e.bounds}));
vi.mock('../src/home/runtime/SettleArt',()=>({SettleArt:()=>null}));
vi.mock('../src/home/art/Room',()=>({RoomArt:()=>null,ShoreArt:()=>null,SkyArt:()=>null}));
vi.mock('../src/home/art/More',()=>({RoomShellArt:()=>null,MoreItemArt:()=>null}));
vi.mock('../src/home/art/Items',()=>({ItemArt:()=>null}));
vi.mock('../src/home/runtime/HomeChrome',()=>({Tool:()=>null}));
vi.mock('../src/home/BuildingArt',()=>({BuildingArt:()=>null,BuildingTrim:()=>null,TerraceArt:()=>null}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
function context(){
 const state=labHome();const scene=withPortions(buildScene(state));
 const interaction={slots:{value:[{},{}]},camera:{value:{a:1}},fixtureNudges:{value:{}},acknowledgeLayout:()=>{},acknowledgePose:()=>{},ready:()=>{}} as any;
 interaction.restingFlags={value:restingFlagsOf([],[])};interaction.restingMotion={value:restingMotionOf([],scene.revision,1,0,false,{},null)};
 return {state,scene,interaction};
}
async function render(liveRoom:string|undefined,reduced=false){
 const c=context();let tree!:TestRenderer.ReactTestRenderer;
 await act(async()=>{tree=TestRenderer.create(<SceneView state={c.state} scene={c.scene} building={buildingLayout(4)} viewport={{width:402,height:650}} interaction={c.interaction as Interaction}
  pickups={[]} reduced={reduced} reactions={{}} sleeping={{}} onNode={()=>{}} onSelect={()=>{}} onMove={()=>{}} liveRoom={liveRoom}/>);});
 return {c,tree};
}
describe('R3: the life clock runs only for a friend who uses it', () => {
  it('a room on screen with no resting friend schedules no life timer; one with a friend does', async () => {
    vi.useFakeTimers();
    const empty = await render('beach');
    expect(Object.values(empty.c.scene.rooms.beach.entities).some((e) => e.character)).toBe(false);
    expect(empty.tree.root.findAll((n) => n.props.life).length).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => empty.tree.unmount());
    const lively = await render('home');
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    await act(async () => lively.tree.unmount());
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
  it('sleeping friends do not keep the clock running', async () => {
    vi.useFakeTimers();
    const c = context();
    const sleeping = Object.fromEntries(Object.values(c.scene.entities).filter((e) => e.character).map((e) => [e.id, true]));
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => { tree = TestRenderer.create(<SceneView state={c.state} scene={c.scene} building={buildingLayout(4)} viewport={{ width: 402, height: 650 }} interaction={c.interaction as Interaction}
      pickups={[]} reduced={false} reactions={{}} sleeping={sleeping} onNode={() => {}} onSelect={() => {}} onMove={() => {}} liveRoom="home" />); });
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => tree.unmount());
    vi.useRealTimers();
  });
});


it('frame-zero lying faces never mount an open-eyed blink or anticipation copy, for all six family actors', async () => {
  vi.useFakeTimers();
  const c = context(), state = labHome('silky-family'), built = buildScene(state);
  const entities = Object.fromEntries(Object.entries(built.entities).map(([id,e])=>[id,e.character?{...e,base:'lie' as const,action:null}:e]));
  const scene = {...built,entities,rooms:{...built.rooms,home:{...built.rooms.home,entities:Object.fromEntries(Object.keys(built.rooms.home.entities).map(id=>[id,entities[id]]))}}};
  let tree!:TestRenderer.ReactTestRenderer;
  await act(async()=>{tree=TestRenderer.create(<SceneView state={state} scene={scene} building={buildingLayout(4)} viewport={{width:390,height:844}}
    interaction={c.interaction} pickups={[]} reduced={false} reactions={{}} sleeping={{}} moods={{'character/0':'happy'}}
    onNode={()=>{}} onSelect={()=>{}} onMove={()=>{}} liveRoom="home"/>);});
  for(const slot of [0,1,2,3,4,5]) {
    const art=tree.root.findAll(n=>n.type==='EntityArt' && n.props.entityId===`character/${slot}` && !n.props.carry);
    expect(art.length).toBeGreaterThan(0);
    expect(art.every(n=>n.props.face==='sleepy' && !n.props.blink && !n.props.preview)).toBe(true);
  }
  expect(vi.getTimerCount()).toBe(0);
  await act(async()=>tree.unmount());vi.useRealTimers();
});
