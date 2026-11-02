import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { DragOverlay } from '../src/home/runtime/DragOverlay';
import { SceneView } from '../src/home/runtime/SceneView';
import { labHome } from '../src/home/runtime/lab';
import { buildScene } from '../src/home/scene/graph';
import { buildingLayout } from '../src/home/camera';
import type { Interaction, Pickup } from '../src/home/runtime/useInteraction';
vi.mock('react-native',()=>({View:'View',Platform:{OS:'ios'}}));
vi.mock('react-native-reanimated',()=>({default:{View:'AnimatedView'},useAnimatedStyle:(fn:()=>unknown)=>({evaluate:fn})}));
vi.mock('react-native-gesture-handler',()=>({GestureDetector:'GestureDetector'}));
vi.mock('../src/home/runtime/EntityArt',()=>({EntityArt:()=>null,artFrame:(e:any)=>e.bounds}));
vi.mock('../src/home/runtime/SettleArt',()=>({SettleArt:()=>null}));
vi.mock('../src/home/art/Room',()=>({RoomArt:()=>null,ShoreArt:()=>null}));
vi.mock('../src/home/art/More',()=>({RoomShellArt:()=>null}));
vi.mock('../src/home/BuildingArt',()=>({BuildingArt:()=>null,BuildingTrim:()=>null,TerraceArt:()=>null}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
function context(id:string,reduced=false) {
 const state=labHome(),scene=buildScene(state),clock={value:1000};
 const slot={id,ready:true,phase:'dragging',liftedAt:0,x:0,y:0,gripX:0,gripY:0,tilt:0,lag:0,settleAt:0,pausedElapsed:0};
 const interaction={clock,slots:{value:[slot,{}]},camera:{value:{a:1}},fixtureNudges:{value:{}},acknowledgeLayout:()=>{},acknowledgePose:()=>{},ready:()=>{}} as unknown as Interaction;
 return {state,scene,clock,slot,interaction,reduced};
}
describe('round4 rendered runtime contracts',()=>{
 it.each(['home/item/banana','character/0'])('T5 carries %s at the intended readable scale and eases exactly to1',async(id)=>{
  const c=context(id);const pickup={id,slot:0,scene:c.scene,generation:1,epoch:0} as Pickup;let tree!:TestRenderer.ReactTestRenderer;
  await act(async()=>{tree=TestRenderer.create(<DragOverlay scene={c.scene} pickups={[pickup]} interaction={c.interaction} building={buildingLayout(4)} reduced={false}/>);});
  const view=tree.root.findAllByProps({testID:'drag-overlay-0'}).at(-1)!;
  const scale=()=>view.props.style[1].evaluate().transform.find((t:any)=>'scaleX'in t).scaleX;
  expect(scale()).toBe(id==='character/0'?1.04:1.2);
  c.slot.phase='settling';c.slot.settleAt=1000;c.clock.value=1070;
  expect(scale()).toBeGreaterThan(1);expect(scale()).toBeLessThan(id==='character/0'?1.04:1.2);
  c.clock.value=1240;expect(scale()).toBe(1);
  expect(tree.root.findByProps({testID:`drag-shadow-${id}`}).props.style[1].evaluate().opacity).toBe(0);
  await act(async()=>tree.unmount());
 });
 it('T4 exposes one item label and keeps every scene wrapper non-accessible; T7 fixture nudge is bounded and stops',async()=>{
  const c=context('');c.interaction.fixtureNudges.value={'kitchen/item/fridge':1000};let tree!:TestRenderer.ReactTestRenderer;
  const props={state:c.state,scene:c.scene,building:buildingLayout(4),viewport:{width:402,height:650},interaction:c.interaction,
   pickups:[],reduced:false,selected:undefined,reactions:{},sleeping:{},onNode:()=>{},onSelect:()=>{},onMove:()=>{}};
  await act(async()=>{tree=TestRenderer.create(<SceneView {...props}/>);});
  for(const room of ['home','kitchen','treehouse','beach'])expect(tree.root.findByProps({testID:`home-scene-${room}`}).props.accessible).toBe(false);
  const labels=tree.root.findAllByProps({accessibilityLabel:'Fridge, Kitchen'}).filter(n=>typeof n.type==='string');
  expect(labels).toHaveLength(1);
  c.clock.value=1030;const rotation=()=>labels[0].props.style[1].evaluate().transform.find((t:any)=>'rotate'in t)?.rotate;
  const angle=parseFloat(rotation());expect(Math.abs(angle)).toBeGreaterThan(.1);expect(Math.abs(angle)).toBeLessThanOrEqual(1.5);
  c.clock.value=1220;expect(rotation()).toBe('0deg');
  await act(async()=>{tree.update(<SceneView {...props} reduced/>);});c.clock.value=1030;
  expect(rotation()).toBe('0deg');
  await act(async()=>tree.unmount());
 });
});
