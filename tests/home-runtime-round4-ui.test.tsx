import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { DragOverlay } from '../src/home/runtime/DragOverlay';
import { SceneView } from '../src/home/runtime/SceneView';
import { withPortions } from '../src/home/runtime/portions';
import { labHome } from '../src/home/runtime/lab';
import { buildScene } from '../src/home/scene/graph';
import { buildingLayout } from '../src/home/camera';
import type { Interaction, Pickup } from '../src/home/runtime/useInteraction';
vi.mock('react-native',()=>({View:'View',Pressable:'Pressable',Platform:{OS:'ios'}}));
vi.mock('react-native-reanimated',()=>({default:{View:'AnimatedView'},useAnimatedStyle:(fn:()=>unknown)=>({evaluate:fn}),useDerivedValue:(fn:()=>unknown)=>({get value(){return fn();}})}));
vi.mock('react-native-gesture-handler',()=>({GestureDetector:'GestureDetector'}));
vi.mock('../src/home/runtime/EntityArt',()=>({EntityArt:()=>null,artFrame:(e:any)=>e.bounds}));
vi.mock('../src/home/runtime/SettleArt',()=>({SettleArt:()=>null}));
vi.mock('../src/home/art/Room',()=>({RoomArt:()=>null,ShoreArt:()=>null}));
vi.mock('../src/home/art/More',()=>({RoomShellArt:()=>null}));
vi.mock('../src/home/BuildingArt',()=>({BuildingArt:()=>null,BuildingTrim:()=>null,TerraceArt:()=>null}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
function context(id:string,reduced=false) {
 const state=labHome();state.rooms.kitchen.instances.find(i=>i.id==='fridge')!.powered=true;const scene=withPortions(buildScene(state)),clock={value:1000};
 const slot={id,ready:true,phase:'dragging',liftedAt:0,x:0,y:0,gripX:0,gripY:0,tilt:0,lag:0,settleAt:0,pausedElapsed:0};
 const interaction={clock,slots:{value:[slot,{}]},camera:{value:{a:1}},fixtureNudges:{value:{}},acknowledgeLayout:()=>{},acknowledgePose:()=>{},ready:()=>{}} as unknown as Interaction;
 return {state,scene,clock,slot,interaction,reduced};
}
describe('round4 rendered runtime contracts',()=>{
 it.each(['home/item/banana','kitchen/item/portion-fridge-banana','kitchen/item/portion-bowl-banana','character/0'])('T5 carries %s at the intended readable scale and eases exactly to1',async(id)=>{
  const c=context(id);const pickup={id,slot:0,scene:c.scene,generation:1,epoch:0} as Pickup;let tree!:TestRenderer.ReactTestRenderer;
  await act(async()=>{tree=TestRenderer.create(<DragOverlay scene={c.scene} pickups={[pickup]} interaction={c.interaction} building={buildingLayout(4)} reduced={false}/>);});
  const views=tree.root.findAllByProps({testID:'drag-overlay-0'});const view=id==='character/0'?views[0]:views.at(-1)!;
  expect(view.props.style[1].evaluate().opacity).toBe(1);
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
  expect(tree.root.findAll(n=>typeof n.type==='string' && n.props.testID?.startsWith('home-scene-'))).toHaveLength(0);
  const labels=tree.root.findAllByProps({accessibilityLabel:'Fridge, Kitchen'}).filter(n=>typeof n.type==='string');
  expect(labels).toHaveLength(1);
  c.clock.value=1030;const rotation=()=>labels[0].findAll(n=>String(n.type)==='AnimatedView' && n.props.style?.evaluate)[0].props.style.evaluate().transform.find((t:any)=>'rotate'in t)?.rotate;
  const angle=parseFloat(rotation());expect(Math.abs(angle)).toBeGreaterThan(.1);expect(Math.abs(angle)).toBeLessThanOrEqual(1.5);
  c.clock.value=1220;expect(rotation()).toBe('0deg');
  await act(async()=>{tree.update(<SceneView {...props} reduced/>);});c.clock.value=1030;
  expect(rotation()).toBe('0deg');
  await act(async()=>tree.unmount());
 });
 it('U3 snapshots the kitchen accessibility tree and summarizes the badge board once', async()=>{
  const c=context('');c.scene.rooms.kitchen.entities=Object.fromEntries(Object.entries(c.scene.rooms.kitchen.entities).filter(([id])=>!id.includes('/portion-')));let tree!:TestRenderer.ReactTestRenderer;
  await act(async()=>{tree=TestRenderer.create(<SceneView state={c.state} scene={c.scene} building={buildingLayout(4)}
   viewport={{width:402,height:650}} interaction={c.interaction} pickups={[]} reduced={false} reactions={{}} sleeping={{}}
   onNode={()=>{}} onSelect={()=>{}} onMove={()=>{}} badges={['math-1','math-2','reading-1','science-1','chamoru-1','classic-1']}/>);});
  function ax(node: TestRenderer.ReactTestInstance): {role:string;label:string}[] {
   if(typeof node.type!=='string')return node.children.flatMap(n=>typeof n==='string'?[]:ax(n));
   if(node.props.accessibilityElementsHidden || node.props.importantForAccessibility==='no-hide-descendants')return [];
   if(node.props.accessible || node.props.accessibilityRole==='button') {
    if(node.props.accessibilityLabel)return [{role:node.props.accessibilityRole,label:node.props.accessibilityLabel}];
   }
   return node.children.flatMap(n=>typeof n==='string'?[]:ax(n));
  }
  const elements=ax(tree.root);
  expect(elements.filter(e=>e.label.endsWith(', Kitchen'))).toMatchInlineSnapshot(`
    [
      {
        "label": "Fridge, Kitchen",
        "role": "button",
      },
      {
        "label": "Bubble bath, Kitchen",
        "role": "button",
      },
      {
        "label": "Fruit bowl, Kitchen",
        "role": "button",
      },
    ]
  `);
  expect(elements.filter(e=>e.label.startsWith('Badge board'))).toEqual([{role:'button',label:'Badge board, 6 of 28 earned. Open My badges'}]);
  expect(elements.every(e=>!e.label.includes('house-')&&!e.label.includes('home-scene-')&&!e.label.includes('overlay'))).toBe(true);
  for(const element of elements.filter(e=>e.label.endsWith(', Kitchen')))expect(elements.filter(e=>e.label===element.label)).toHaveLength(1);
  await act(async()=>tree.unmount());
 });

 it('T5 Reduce Motion carries source portions at1.2 without animated lift',async()=>{
  const c=context('kitchen/item/portion-fridge-banana',true);const pickup={id:c.slot.id,slot:0,scene:c.scene,generation:1,epoch:0} as Pickup;
  let tree!:TestRenderer.ReactTestRenderer;
  await act(async()=>{tree=TestRenderer.create(<DragOverlay scene={c.scene} pickups={[pickup]} interaction={c.interaction} building={buildingLayout(4)} reduced/>);});
  const view=tree.root.findAllByProps({testID:'drag-overlay-0'}).at(-1)!;
  expect(view.props.style[1].evaluate().transform.find((t:any)=>'scaleX'in t).scaleX).toBe(1.2);
  c.slot.phase='settling';c.slot.settleAt=1000;
  expect(view.props.style[1].evaluate().transform.find((t:any)=>'scaleX'in t).scaleX).toBe(1);
  await act(async()=>tree.unmount());
 });

});
