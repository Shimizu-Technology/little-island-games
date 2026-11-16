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
import { LIFE_PERIOD, longestBlinkWait, lifeBlink, lifeSeed, BREATH_SCALE, nextLifeTick, BREATH_STEP_MS, LIFE_PERIOD as PERIOD, lifeBlink as blinkAt, lifeSeed as seedOf } from '../src/home/runtime/life';
vi.mock('../src/home/runtime/SetPieces',()=>({SetPieces:()=>null,pieceAt:()=>undefined,pieceLength:{},pieceSound:{}}));
vi.mock('react-native',()=>({View:'View',Pressable:'Pressable',ScrollView:'ScrollView',Text:'Text',Modal:'Modal',FlatList:({data,renderItem}:any)=>data.map((item:any)=>renderItem({item})),Platform:{OS:'ios'}}));
vi.mock('react-native-reanimated',()=>({default:{View:'AnimatedView'},useSharedValue:(v:any)=>React.useRef({value:v,set(n:any){this.value=n;},get(){return this.value;}}).current,withRepeat:(x:any)=>x,withTiming:(x:any)=>x,cancelAnimation:()=>{},Easing:{linear:(t:number)=>t},useAnimatedStyle:(fn:()=>unknown)=>({evaluate:fn}),useDerivedValue:(fn:()=>unknown)=>({get value(){return fn();}}),useAnimatedReaction:(prepare:any,react:any)=>{const previous=React.useRef<any>(null);React.useLayoutEffect(()=>{const next=prepare();if(next!==previous.current){react(next,previous.current);previous.current=next;}});},runOnJS:(fn:any)=>fn,runOnUI:(fn:any)=>fn}));
const pans=vi.hoisted(()=>[] as any[]);
vi.mock('react-native-gesture-handler',()=>({GestureDetector:'GestureDetector',Gesture:{Pan:()=>{
 const handlers:any={};const builder:any=new Proxy({}, {get:(_t,key)=> (...args:any[])=>{if(String(key).startsWith('on'))handlers[key]=args[0];return builder;}});pans.push(handlers);return builder;
}}}));
vi.mock('../src/home/runtime/EntityArt',()=>({EntityArt:(props:any)=>React.createElement('EntityArt',{blink:!!props.blink,entityId:props.entity.id}),artFrame:(e:any)=>e.bounds}));
vi.mock('../src/home/runtime/SettleArt',()=>({SettleArt:()=>null}));
vi.mock('../src/home/art/Room',()=>({RoomArt:()=>null,ShoreArt:()=>null}));
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
const characterIn=(c:ReturnType<typeof context>,room:string)=>Object.values(c.scene.entities).find(e=>e.character&&e.room===room)!;
describe('HM-11 friends blink and breathe at rest',()=>{
 it('a friend in the room on screen has a closed-eye copy that swaps in by opacity',async()=>{
  const {c,tree}=await render('home');const friend=characterIn(c,'home');
  const label=tree.root.findAll(n=>n.props.testID===`character-${friend.character!.slot}`&&typeof n.type==='string')[0];
  const copies=label.findAll(n=>String(n.type)==='EntityArt');
  expect(copies.map(n=>n.props.blink)).toEqual([false,true,false]);
  const closedWrap=label.findAll(n=>String(n.type)==='AnimatedView'&&n.findAll(m=>String(m.type)==='EntityArt'&&m.props.blink).length&&n.props.style?.[1]?.evaluate)[0];
  const life=(tree.root.findAll(n=>n.props.life)[0].props.life);
  const seed=lifeSeed(friend.character!.slot);
  const blinkAt=Array.from({length:LIFE_PERIOD},(_,t)=>t).find(t=>lifeBlink(t,seed))!;
  life.value=blinkAt;expect(closedWrap.props.style[1].evaluate().opacity).toBe(1);
  life.value=blinkAt+400;expect(closedWrap.props.style[1].evaluate().opacity).toBe(0);
  const main=label.findAll(n=>String(n.type)==='AnimatedView'&&n.props.style?.evaluate)[0];
  const scale=(t:number)=>{life.value=t;return main.props.style.evaluate().transform.find((x:any)=>'scaleY'in x).scaleY;};
  const scales=[0,900,1800,2700].map(scale);
  expect(Math.max(...scales)).toBeLessThanOrEqual(1+BREATH_SCALE+1e-9);
  expect(Math.max(...scales)-Math.min(...scales)).toBeGreaterThan(BREATH_SCALE*.9);
  await act(async()=>tree.unmount());
 });
 it('every friend blinks within 6 s of any moment, and never all at once',()=>{
  expect(longestBlinkWait()).toBeLessThan(6000);
  for(const slot of [0,1,2]){
   for(let t=0;t<LIFE_PERIOD;t+=250){let wait=0;while(!lifeBlink(t+wait,lifeSeed(slot)))wait+=10;expect(wait).toBeLessThan(6000);}
  }
  for(let t=0;t<LIFE_PERIOD;t+=10) expect([0,1,2].filter(s=>lifeBlink(t,lifeSeed(s))).length).toBeLessThan(3);
 });
 it('friends in other rooms, the overview and Reduced Motion get no life clock',async()=>{
  for(const [room,reduced] of [[undefined,false],['home',true]] as const){
   const {tree}=await render(room,reduced);
   expect(tree.root.findAll(n=>String(n.type)==='EntityArt'&&n.props.blink)).toHaveLength(0);
   await act(async()=>tree.unmount());
  }
  const {c,tree}=await render('kitchen');
  const live=tree.root.findAll(n=>String(n.type)==='EntityArt'&&n.props.blink).map(n=>n.props.entityId);
  expect(live.every(id=>c.scene.entities[id].room==='kitchen')).toBe(true);
  await act(async()=>tree.unmount());
 });
});
describe('HM-11 / HM-13 the life clock wakes rarely', () => {
 it('ticks at every blink edge and at most every 250 ms, never per frame', () => {
  const seeds = [0, 1, 2].map(seedOf), ticks: number[] = [];
  for (let t = 0; t < 3 * PERIOD;) { ticks.push(t); const wait = nextLifeTick(t, seeds); expect(wait).toBeGreaterThan(0); expect(wait).toBeLessThanOrEqual(BREATH_STEP_MS); t += wait; }
  // About 4 wakes a second plus blink edges, against 60 for a frame loop.
  expect(ticks.length / (3 * PERIOD / 1000)).toBeLessThan(6);
  for (const seed of seeds) for (let t = 0; t < 3 * PERIOD; t += 5) {
   // Whatever is shown between ticks is what the last tick showed: every blink is seen, and ends on time.
   const last = ticks.filter((x) => x <= t).at(-1)!;
   expect(blinkAt(last, seed), `${seed}@${t}`).toBe(blinkAt(t, seed));
  }
 });
});
