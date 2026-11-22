import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { TargetCue } from '../src/home/runtime/TargetCue';
import { LandingPreview } from '../src/home/runtime/LandingPreview';
import { StagingTray } from '../src/home/runtime/StagingTray';
import { DesignTools } from '../src/home/runtime/DesignTools';
import { DragOverlay } from '../src/home/runtime/DragOverlay';
import { SceneView } from '../src/home/runtime/SceneView';
import { withPortions } from '../src/home/runtime/portions';
import { labHome } from '../src/home/runtime/lab';
import { buildScene, createSceneBuilder } from '../src/home/scene/graph';
import { buildingLayout } from '../src/home/camera';
import { emptyDragSlot, type DragSlot, type Interaction, type Pickup } from '../src/home/runtime/useInteraction';
import { restingFlagsOf, restingMotionOf } from '../src/home/runtime/restingState';
vi.mock('../src/home/runtime/SetPieces',()=>({SetPieces:()=>null,pieceAt:()=>undefined,pieceLength:{},pieceSound:{}}));
// These scene tests replace native art; the mouth cue now also imports SVG.
vi.mock('react-native-svg',()=>({default:'Svg',Path:'Path'}));
vi.mock('react-native',()=>({View:'View',Pressable:'Pressable',ScrollView:'ScrollView',Text:'Text',Modal:'Modal',FlatList:({data,renderItem}:any)=>data.map((item:any)=>renderItem({item})),Platform:{OS:'ios'}}));
vi.mock('react-native-reanimated',()=>({default:{View:'AnimatedView'},useSharedValue:(v:any)=>React.useRef({value:v,set(n:any){this.value=n;},get(){return this.value;}}).current,withRepeat:(x:any)=>x,withTiming:(x:any)=>x,cancelAnimation:()=>{},Easing:{linear:(t:number)=>t},useAnimatedStyle:(fn:()=>unknown)=>({evaluate:fn}),useDerivedValue:(fn:()=>unknown)=>({get value(){return fn();}}),useAnimatedReaction:(prepare:any,react:any)=>{const previous=React.useRef<any>(null);React.useLayoutEffect(()=>{const next=prepare();if(next!==previous.current){react(next,previous.current);previous.current=next;}});},runOnJS:(fn:any)=>fn,runOnUI:(fn:any)=>fn}));
const pans=vi.hoisted(()=>[] as any[]);
vi.mock('react-native-gesture-handler',()=>({GestureDetector:'GestureDetector',Gesture:{Pan:()=>{
 const handlers:any={};const builder:any=new Proxy({}, {get:(_t,key)=> (...args:any[])=>{if(String(key).startsWith('on'))handlers[key]=args[0];return builder;}});pans.push(handlers);return builder;
}}}));
vi.mock('../src/home/runtime/EntityArt',()=>({EntityArt:()=>null,artFrame:(e:any)=>e.bounds}));
vi.mock('../src/home/runtime/SettleArt',()=>({SettleArt:()=>null}));
vi.mock('../src/home/art/Room',()=>({RoomArt:()=>null,ShoreArt:()=>null}));
vi.mock('../src/home/art/More',()=>({RoomShellArt:()=>null,MoreItemArt:()=>null}));
vi.mock('../src/home/art/Items',()=>({ItemArt:()=>null}));
vi.mock('../src/home/runtime/HomeChrome',()=>({Tool:()=>null}));
vi.mock('../src/home/BuildingArt',()=>({BuildingArt:()=>null,BuildingTrim:()=>null,TerraceArt:()=>null}));
vi.mock('../src/home/runtime/UndoNote', () => ({ UndoNote: () => null, UndoGonePicture: () => null }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
function context(id:string,reduced=false) {
 const state=labHome();state.rooms.kitchen.instances.find(i=>i.id==='fridge')!.powered=true;const scene=withPortions(buildScene(state)),clock={value:1000};
 const slot={id,ready:true,painted:true,phase:'dragging',liftedAt:0,x:0,y:0,gripX:0,gripY:0,tilt:0,lag:0,settleAt:0,pausedElapsed:0};
 const interaction={clock,slots:{value:[slot,{}]},camera:{value:{a:1}},fixtureNudges:{value:{}},acknowledgeLayout:()=>{},acknowledgePose:()=>{},poseLayouts: { value: new Proxy({}, { get: (_t: object, k: string | symbol) => String(k).split(':').slice(1).join(':') }) },ready:()=>{}} as unknown as Interaction;
 // HM-13: resting art reads the published state; derive it from the same fake channels.
 const live=interaction as any;
 live.restingFlags={get value(){return restingFlagsOf(live.slots.value.filter((s:any)=>s.id!==undefined).map((s:any)=>({...s})),live.controller?.value.pointers??[]);}};
 live.restingMotion={get value(){return restingMotionOf(live.slots.value.filter((s:any)=>s.id).map((s:any)=>({...s,subject:s.subject??scene.entities[s.id]})),scene.revision,live.camera.value.a,clock.value,reduced,live.fixtureNudges.value,null);}};
 return {state,scene,clock,slot,interaction,reduced};
}
describe('round4 rendered runtime contracts',()=>{
 it.each(['home/item/banana','kitchen/item/portion-fridge-banana','kitchen/item/portion-bowl-banana','character/0'])('T5 carries %s at the intended readable scale and eases exactly to1',async(id)=>{
  const c=context(id);const pickup={id,slot:0,scene:c.scene,generation:1,epoch:0} as Pickup;let tree!:TestRenderer.ReactTestRenderer;
  await act(async()=>{tree=TestRenderer.create(<DragOverlay scene={c.scene} pickups={[pickup]} interaction={c.interaction} building={buildingLayout(4)} reduced={false}/>);});
  const view=tree.root.findByProps({nativeID:`drag-overlay-${id}`});
  expect(view.props.style[1].evaluate().opacity).toBe(1);
  const scale=()=>view.props.style[1].evaluate().transform.find((t:any)=>'scaleX'in t).scaleX;
  expect(scale()).toBe(id==='character/0'?1.04:1.08);
  c.slot.phase='settling';c.slot.settleAt=1000;c.clock.value=1070;
  expect(scale()).toBeGreaterThan(1);expect(scale()).toBeLessThan(id==='character/0'?1.04:1.08);
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

 it('T5 Reduce Motion carries source portions at1 without animated lift',async()=>{
  const c=context('kitchen/item/portion-fridge-banana',true);const pickup={id:c.slot.id,slot:0,scene:c.scene,generation:1,epoch:0} as Pickup;
  let tree!:TestRenderer.ReactTestRenderer;
  await act(async()=>{tree=TestRenderer.create(<DragOverlay scene={c.scene} pickups={[pickup]} interaction={c.interaction} building={buildingLayout(4)} reduced/>);});
  const view=tree.root.findByProps({nativeID:`drag-overlay-${c.slot.id}`});
  expect(view.props.style[1].evaluate().transform.find((t:any)=>'scaleX'in t).scaleX).toBe(1);
  c.slot.phase='settling';c.slot.settleAt=1000;
  expect(view.props.style[1].evaluate().transform.find((t:any)=>'scaleX'in t).scaleX).toBe(1);
  await act(async()=>tree.unmount());
 });

});

it('H2 resting art answers a held finger and follows before an overlay can mount', async () => {
 const c=context('home/item/banana'), e=c.scene.entities['home/item/banana'];
 Object.assign(c.slot,{subject:e,sourceX:100,sourceY:200,x:145,y:225,ready:false,painted:false,phase:'pending'});
 (c.interaction as any).controller={value:{pointers:[{entity:e.id,phase:'pending'}]}};
 let tree!:TestRenderer.ReactTestRenderer;
 await act(async()=>{tree=TestRenderer.create(<SceneView state={c.state} scene={c.scene} building={buildingLayout(4)}
  viewport={{width:402,height:650}} interaction={c.interaction} pickups={[]} reduced={false} reactions={{}} sleeping={{}}
  onNode={()=>{}} onSelect={()=>{}} onMove={()=>{}}/>);});
 const node=tree.root.findByProps({testID:'object-banana'});
 const view=node.findAll(n=>String(n.type)==='AnimatedView' && n.props.style?.evaluate)[0];
 const style=()=>view.props.style.evaluate();
 expect(style().transform.find((t:any)=>'scaleX'in t).scaleX).toBe(1.02);
 c.slot.phase='dragging';
 expect(style().opacity).toBe(1);
 expect(style().transform.find((t:any)=>'translateX'in t).translateX).toBe(45);
 expect(style().transform.find((t:any)=>'translateY'in t).translateY).toBe(25);
 c.slot.ready=true;
 expect(style().opacity).toBe(1);
 c.slot.painted=true;
 expect(style().opacity).toBe(0);
 await act(async()=>tree.unmount());
});

it('H2 a pre-mounted prop follows the second pointer even while pickup JS is withheld', async () => {
 const c=context('home/item/banana');
 c.interaction.slots.value=[{} as any,c.slot as any];
 let tree!:TestRenderer.ReactTestRenderer;
 await act(async()=>{tree=TestRenderer.create(<DragOverlay scene={c.scene} pickups={[]} interaction={c.interaction}
  building={buildingLayout(4)} reduced={false}/>);});
 const view=tree.root.findByProps({nativeID:'drag-overlay-home/item/banana'});
 expect(view.props.style[1].evaluate().opacity).toBe(1);
 expect(view.props.style[1].evaluate().transform.find((t:any)=>'scaleX'in t).scaleX).toBe(1.08);
 await act(async()=>tree.unmount());
});

it('H4b landing has exactly one cue: floor footprints or a furniture outline', async () => {
 const {LandingPreview}=await import('../src/home/runtime/LandingPreview');
 const {roomOrigin}=await import('../src/home/camera');
 const c=context('character/0'),building=buildingLayout(4),origin=roomOrigin(0,building);
 const proposal={kind:'floor' as 'floor'|'socket',room:'home' as 'home'|'kitchen',base:'stand',facing:'front',contact:{x:427,y:442.15}};
 Object.assign(c.slot,{proposal});
 c.interaction.slots.value=[{} as any,c.slot as any];
 let tree!:TestRenderer.ReactTestRenderer;
 await act(async()=>{tree=TestRenderer.create(<LandingPreview source={c.scene.entities['character/0']} interaction={c.interaction} building={building}/>);});
 const active=tree.root.findAll(n=>String(n.type)==='AnimatedView'&&n.props.testID==='landing-preview-character/0'&&n.props.style[1].evaluate().opacity>0);
 expect(active).toHaveLength(1);
 expect(active[0].props.collapsable).toBe(false);
 expect(active[0].props.style[0]).toMatchObject({width:1,height:1});
 expect(active[0].props.style[1].evaluate().transform).toEqual([{translateX:origin.x+427},{translateY:origin.y+442.15}]);
 expect(tree.root.findAllByProps({testID:'landing-footprints'})).toHaveLength(1);
 proposal.kind='socket';
 expect(active[0].props.style[1].evaluate().opacity).toBe(0);
 const target:any={id:'seat',kind:'socket',contact:proposal.contact};
 const cueInteraction:any={restingFlags:{value:{dragTargets:['seat']}}};
 let cue!:TestRenderer.ReactTestRenderer;
 await act(async()=>{cue=TestRenderer.create(<TargetCue target={target} interaction={cueInteraction}/>);});
 expect(cue.root.findByProps({testID:'socket-landing-outline'}).props.style[1].evaluate().opacity).toBe(1);
 await act(async()=>cue.unmount());
 proposal.kind='floor';proposal.room='kitchen';proposal.contact={x:300,y:500};
 const nextOrigin=roomOrigin(1,building);
 expect(active[0].props.style[1].evaluate().transform).toEqual([{translateX:nextOrigin.x+300},{translateY:nextOrigin.y+500}]);
 await act(async()=>tree.unmount());
});


describe('H2 rendered review regressions',()=>{
 it('P2-5 hand cue uses the same projected contact as the release',async()=>{
  const c=context('home/item/banana'),target=c.scene.rooms.home.targets.find(t=>t.kind==='hand'&&t.owner==='character/0')!;
  let tree!:TestRenderer.ReactTestRenderer;await act(async()=>{tree=TestRenderer.create(<TargetCue target={target} interaction={c.interaction}/>);});
  const style=tree.root.findByProps({testID:'open-hand-preview'}).props.style[0];
  expect(style.left+16).toBe(target.projectedContact!.x);expect(style.top+22).toBe(target.projectedContact!.y);
  await act(async()=>tree.unmount());
 });
 it('P2-6 basket art answers pending contact with the same 1.02 press',async()=>{
  const c=context(''),entity=c.scene.entities['home/item/banana'];c.interaction.controller={value:{pointers:[{entity:entity.id,phase:'pending'}]}} as any;
  let tree!:TestRenderer.ReactTestRenderer;await act(async()=>{tree=TestRenderer.create(<StagingTray entities={[entity]} bottom={0} offset={{value:{x:0,y:0}} as any} interaction={c.interaction} reduced={false} onNode={()=>{}} onSelect={()=>{}}/>);});
  const style=tree.root.findByType('AnimatedView' as never).props.style.evaluate();expect(style.transform).toContainEqual({scale:1.02});
  await act(async()=>tree.unmount());
 });
 it('P2-1/P3-1 a stray thumbnail finalize or failed end cannot drop another capture',async()=>{
  const c=context(''),ghost={value:{item:'chair',active:true,x:100,y:100},set(v:any){this.value=v;}};const drop=vi.fn();pans.length=0;
  let tree!:TestRenderer.ReactTestRenderer;await act(async()=>{tree=TestRenderer.create(<DesignTools state={c.state} ownership={{}} vertical={false} ghost={ghost as any} onChoose={()=>{}} onDrop={drop} onDragItem={()=>{}} interaction={c.interaction} offset={{value:{x:0,y:0}} as any} dispatch={()=>{}} onClose={()=>{}}/>);});
  const thumbnails=tree.root.findAllByProps({testID:'inventory-chair'});expect(thumbnails.length).toBeGreaterThan(0);
  const chairIndex=tree.root.findAll(n=>typeof n.type==='string'&&n.props.testID?.startsWith('inventory-')).findIndex(n=>n.props.testID==='inventory-chair');
  const other=pans.find((_,n)=>n!==chairIndex)!;other.onFinalize({absoluteX:20,absoluteY:20},false);
  expect(drop).not.toHaveBeenCalled();expect(ghost.value.active).toBe(true);
  pans[chairIndex].onEnd({absoluteX:120,absoluteY:120},false);expect(drop).not.toHaveBeenCalled();
  pans[chairIndex].onFinalize({absoluteX:120,absoluteY:120},false);expect(drop).toHaveBeenCalledTimes(1);expect(drop.mock.calls[0][3]).toBe(true);
  await act(async()=>tree.unmount());
 });
 it('P2-7 warm overlays are bounded to the active room at the save limit',async()=>{
  const c=context('');for(const room of Object.values(c.state.rooms))for(let n=0;n<40;n++)room.instances.push({...c.state.rooms.home.instances.find(i=>i.id==='banana')!,id:`extra-${n}`});c.scene=buildScene(c.state);
  let tree!:TestRenderer.ReactTestRenderer;await act(async()=>{tree=TestRenderer.create(<DragOverlay scene={c.scene} pickups={[]} interaction={c.interaction} building={buildingLayout(4)} reduced={false}/>);});
  const ids=tree.root.findAll(n=>typeof n.type==='string'&&n.props.nativeID?.startsWith('drag-overlay-')).map(n=>n.props.nativeID);
  expect(ids.filter(id=>id.includes('/item/')).length).toBeLessThanOrEqual(16);expect(ids.filter(id=>id.includes('/item/')).every(id=>id.includes('home/item/'))).toBe(true);
  await act(async()=>tree.unmount());
 });
 it('P2-8 a character preview does not mount eight rig trees during pickup readiness',async()=>{
  const c=context('character/0');let tree!:TestRenderer.ReactTestRenderer;await act(async()=>{tree=TestRenderer.create(<LandingPreview source={c.scene.entities['character/0']} interaction={c.interaction} building={buildingLayout(4)}/>);});
  expect(tree.root.findAllByProps({testID:'landing-preview-character/0'}).filter(n=>typeof n.type==='string').length).toBeLessThanOrEqual(1);
  await act(async()=>tree.unmount());
 });
});

it('R2-P2-2 a committed cold Reduced Motion move uses the rendered destination without doubling its offset', async()=>{
 const c=context('home/item/banana');Object.assign(c.slot,{ready:false,painted:false,phase:'settling',committed:true,revision:c.scene.revision,sourceX:100,sourceY:300,x:200,y:486});
 let tree!:TestRenderer.ReactTestRenderer;await act(async()=>{tree=TestRenderer.create(<SceneView state={c.state} scene={c.scene} building={buildingLayout(4)} viewport={{width:402,height:650}} interaction={c.interaction} pickups={[]} reduced reactions={{}} sleeping={{}} onNode={()=>{}} onSelect={()=>{}} onMove={()=>{}}/>);});
 const view=tree.root.findByProps({testID:'object-banana'}).findAll(n=>String(n.type)==='AnimatedView'&&n.props.style?.evaluate)[0];
 expect(view.props.style.evaluate().transform).toContainEqual({translateX:0});expect(view.props.style.evaluate().transform).toContainEqual({translateY:0});
 await act(async()=>tree.unmount());
});
it('R2-P2-3 the resting copy is visible during the acknowledged overlay handoff', async()=>{
 const c=context('character/0');Object.assign(c.slot,{phase:'settling',committed:true,revealFrame:10});
 let tree!:TestRenderer.ReactTestRenderer;await act(async()=>{tree=TestRenderer.create(<SceneView state={c.state} scene={c.scene} building={buildingLayout(4)} viewport={{width:402,height:650}} interaction={c.interaction} pickups={[]} reduced={false} reactions={{}} sleeping={{}} onNode={()=>{}} onSelect={()=>{}} onMove={()=>{}}/>);});
 const view=tree.root.findByProps({testID:'character-0'}).findAll(n=>String(n.type)==='AnimatedView'&&n.props.style?.evaluate)[0];
 expect(view.props.style.evaluate().opacity).toBe(1);await act(async()=>tree.unmount());
});

it('R2-P3-2 a frozen idle clock cannot make the pickup shadow grow beyond its footprint',async()=>{
 const c=context('home/item/banana');c.clock.value=0;c.slot.liftedAt=6780;
 let tree!:TestRenderer.ReactTestRenderer;await act(async()=>{tree=TestRenderer.create(<DragOverlay scene={c.scene} pickups={[]} interaction={c.interaction} building={buildingLayout(4)} reduced={false}/>);});
 const style=tree.root.findByProps({testID:'drag-shadow-home/item/banana'}).props.style[1].evaluate();
 expect(style.opacity).toBeLessThanOrEqual(.18);expect(style.transform.find((t:any)=>'scale'in t).scale).toBeLessThanOrEqual(1);
 await act(async()=>tree.unmount());
});
it('R2-P3-3 unmounting the owning drawer cell cancels the capture and clears its ghost',async()=>{
 const c=context(''),cancel=vi.fn();(c.interaction as any).externalUp=cancel;
 const ghost={value:{item:'chair',active:true,x:100,y:100},set(v:any){this.value=v;}};
 let tree!:TestRenderer.ReactTestRenderer;await act(async()=>{tree=TestRenderer.create(<DesignTools state={c.state} ownership={{}} vertical={false} ghost={ghost as any} onChoose={()=>{}} onDrop={()=>{}} onDragItem={()=>{}} interaction={c.interaction} offset={{value:{x:0,y:0}} as any} dispatch={()=>{}} onClose={()=>{}}/>);});
 await act(async()=>tree.unmount());expect(cancel).toHaveBeenCalledExactlyOnceWith(-500,true);expect(ghost.value.active).toBe(false);
});

it('a food drag draws no shadow across the face for mouth proposals',async()=>{
 const c=context('kitchen/item/bowl');
 const id=c.slot.id, root=c.scene.entities[id];
 const pickup={id,slot:0,generation:1,epoch:0,scene:c.scene,grip:{x:0,y:0}} as Pickup;
 let tree!:TestRenderer.ReactTestRenderer;
 await act(async()=>{tree=TestRenderer.create(<DragOverlay scene={c.scene} pickups={[pickup]} interaction={c.interaction} building={buildingLayout(4)} reduced={false}/>);});
 const shadow=tree.root.findByProps({testID:`drag-shadow-${id}`});
 (c.slot as any).proposal={kind:'mouth',room:root.room,contact:root.contact,attachment:{kind:'hand',character:'character/0'}};
 expect(shadow.props.style[1].evaluate().opacity).toBe(0);
 await act(async()=>tree.unmount());
});

it('one meal stage hides its real cup atomically, while restored drinks remain visible',async()=>{
 const c=context('character/0');
 c.interaction.slots.value=[{} as any,{} as any];
 const state=labHome('rig-meal');
 state.rooms.home.characters[0].holding='rig-drink';
 state.rooms.home.characters[0].action='drink';
 const scene=buildScene(state), friend=scene.entities['character/0'];
 const meal={key:3,food:state.rooms.home.instances.find(i=>i.id==='rig-drink')!,action:'drink' as const};
 let tree!:TestRenderer.ReactTestRenderer;
 await act(async()=>{tree=TestRenderer.create(<SceneView state={state} scene={scene} building={buildingLayout(4)} viewport={{width:402,height:650}} interaction={c.interaction} pickups={[]} reduced={false} reactions={{}} sleeping={{}} liveRoom="home" meals={{[friend.id]:meal}} onNode={()=>{}} onSelect={()=>{}} onMove={()=>{}}/>);});
 const {EntityArt}=await import('../src/home/runtime/EntityArt');
 const art=tree.root.findAllByType(EntityArt);
 expect(art.filter(n=>n.props.meal)).toHaveLength(1);
 const cup = tree.root.findByProps({testID:'object-rig-drink'});
 const mountedCup = cup.findByType(EntityArt);
 expect(mountedCup.parent?.props.style.opacity).toBe(0);
 await act(async()=>{tree.update(<SceneView state={state} scene={scene} building={buildingLayout(4)} viewport={{width:402,height:650}} interaction={c.interaction} pickups={[]} reduced={false} reactions={{}} sleeping={{}} onNode={()=>{}} onSelect={()=>{}} onMove={()=>{}}/>);});
 const drink=tree.root.findByProps({testID:'object-rig-drink'});
 expect(drink.findByType(EntityArt).parent?.props.style.opacity).toBe(1);
 expect(drink.findByType(EntityArt)).toBe(mountedCup);
 await act(async()=>tree.unmount());
});

it('a visible friend keeps its closed-eye art cached through a meal without playing a second meal',async()=>{
 const c=context('character/0');c.interaction.slots.value=[{} as any,{} as any];
 const state=labHome('rig-meal'),scene=buildScene(state);
 const props={building:buildingLayout(4),viewport:{width:402,height:650},interaction:c.interaction,pickups:[],reduced:false,reactions:{},sleeping:{},liveRoom:'home',onNode:()=>{},onSelect:()=>{},onMove:()=>{}};
 let tree!:TestRenderer.ReactTestRenderer;
 await act(async()=>{tree=TestRenderer.create(<SceneView {...props} state={state} scene={scene}/>);});
 const {EntityArt}=await import('../src/home/runtime/EntityArt');
 expect(tree.root.findAllByType(EntityArt).filter(n=>n.props.blink && n.props.entity.id==='character/0')).toHaveLength(1);
 state.rooms.home.characters[0].action='eat';const next=buildScene(state);
 const meal={key:5,action:'eat' as const,food:state.rooms.home.instances[0]};
 await act(async()=>tree.update(<SceneView {...props} state={state} scene={next} meals={{'character/0':meal}}/>));
 const closed=tree.root.findAllByType(EntityArt).filter(n=>n.props.blink && n.props.entity.id==='character/0');
 expect(closed).toHaveLength(1);expect(closed[0].props.meal).toBeUndefined();
 let wrapper=closed[0].parent;
 while(wrapper && !wrapper.props.style?.[1]?.evaluate)wrapper=wrapper.parent;
 expect(wrapper).not.toBeNull();expect(wrapper!.props.style[1].evaluate().opacity).toBe(0);
 await act(async()=>tree.unmount());
});

it('holds the painted food position and scale at a mouth release until the meal takes it',async()=>{
 const {pickupTransform}=await import('../src/home/runtime/handFeel');
 const c=context('home/item/banana'),root=c.scene.entities['home/item/banana'];
 const slot:DragSlot={...emptyDragSlot(),...c.slot,phase:'dragging',proposal:{kind:'mouth'}as any};
 const before=pickupTransform(slot,root,1,1000,false);
 slot.phase='settling';slot.settleAt=1000;
 for(const ms of [0,70,140,240,500]){
  const after=pickupTransform(slot,root,1,1000+ms,false);
  expect(after.lift).toBe(before.lift);expect(after.scaleX).toBe(before.scaleX);expect(after.scaleY).toBe(before.scaleY);
 }
});

it('hides the carried food in the same native commit that presents its meal art',async()=>{
 const c=context('home/item/banana'),id='home/item/banana';
 const pickup={id,slot:0,scene:c.scene,generation:1,epoch:0} as Pickup;
 let tree!:TestRenderer.ReactTestRenderer;
 await act(async()=>{tree=TestRenderer.create(<DragOverlay scene={c.scene} pickups={[pickup]} interaction={c.interaction} building={buildingLayout(4)} reduced={false} {...{hiddenByMeal:[id]}}/>);});
 expect(tree.root.findByProps({testID:`meal-handoff-source-${id}`}).props.style.opacity).toBe(0);
 await act(async()=>tree.unmount());
});

it('keeps an offered food overlay in place when its source leaves the room', async () => {
 const state = labHome('rig-menu-0');
 const scene = buildScene(state);
 const id = 'home/item/menu-0';
 const pickup = { id, slot: 0, scene, generation: 1, epoch: 0 } as Pickup;
 const { interaction } = context(id);
 const props = { pickups: [pickup], interaction, building: buildingLayout(4), reduced: false };
 let tree!: TestRenderer.ReactTestRenderer;
 await act(async () => { tree = TestRenderer.create(<DragOverlay {...props} scene={scene} />); });
 const itemOrder = () => tree.root.findAll(n => typeof n.type === 'string' &&
  n.props.testID?.startsWith('meal-handoff-source-home/item/menu-')).map(n => n.props.testID);
 const before = itemOrder();
 expect(before).toHaveLength(6);

 state.rooms.home.instances = state.rooms.home.instances.filter(item => item.id !== 'menu-0');
 const consumed = buildScene(state);
 await act(async () => tree.update(<DragOverlay {...props} scene={consumed} />));
 expect(itemOrder()).toEqual(before);
 await act(async () => tree.unmount());
});

it('preserves an unchanged prepared food overlay after a different food is eaten', async () => {
 const state = labHome('rig-menu-0');
 const scene = buildScene(state);
 const { interaction } = context('');
 const props = { pickups: [], interaction, building: buildingLayout(4), reduced: false };
 let tree!: TestRenderer.ReactTestRenderer;
 await act(async () => { tree = TestRenderer.create(<DragOverlay {...props} scene={scene} />); });
 const banana = () => tree.root.findByProps({ nativeID: 'drag-overlay-home/item/menu-1' });
 const before = banana().props.onLayout;

 state.rooms.home.instances = state.rooms.home.instances.filter(item => item.id !== 'menu-0');
 await act(async () => tree.update(<DragOverlay {...props} scene={buildScene(state)} />));
 expect(banana().props.onLayout).toBe(before);
 await act(async () => tree.unmount());
});

it('retains an unchanged resting entity through a meal in another room', async () => {
 const c = context('');
 c.interaction.slots.value = [emptyDragSlot(), emptyDragSlot()];
 const build = createSceneBuilder();
 const scene = build(c.state);
 const props = {
  building: buildingLayout(4), viewport: { width: 402, height: 650 }, interaction: c.interaction,
  pickups: [], reduced: false, reactions: {}, sleeping: {}, onNode: () => {}, onSelect: () => {}, onMove: () => {},
 };
 let tree!: TestRenderer.ReactTestRenderer;
 await act(async () => { tree = TestRenderer.create(<SceneView {...props} state={c.state} scene={scene} />); });
 const fridgeAction = () => tree.root.findByProps({ testID: 'object-fridge' }).props.onAccessibilityAction;
 const originalAction = fridgeAction();
 const state = { ...c.state, rooms: { ...c.state.rooms, home: {
  ...c.state.rooms.home, characters: c.state.rooms.home.characters.map(character =>
   character.slot === 0 ? { ...character, action: 'eat' as const } : character),
 } } };
 const next = build(state);
 expect(next.revision).not.toBe(scene.revision);
 expect(next.entities['kitchen/item/fridge']).toBe(scene.entities['kitchen/item/fridge']);
 await act(async () => tree.update(<SceneView {...props} state={state} scene={next} />));
 expect(fridgeAction()).toBe(originalAction);
 await act(async () => tree.unmount());
});

it('retires the offered item after the visible meal has had a native paint', async () => {
 const c = context('');
 c.interaction.slots.value = [emptyDragSlot(), emptyDragSlot()];
 const completeMealHandoff = vi.fn();
 const frames: FrameRequestCallback[] = [];
 vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
 vi.stubGlobal('cancelAnimationFrame', () => {});
 const state = labHome('rig-menu-0');
 const scene = buildScene(state);
 const source = 'home/item/menu-0';
 const capture = { generation: 2, epoch: 1 };
 const meals = { 'character/0': { key: 5, source, capture, action: 'eat' as const, food: scene.entities[source].item! } };
 const props = {
  state, scene, building: buildingLayout(4), viewport: { width: 402, height: 650 },
  interaction: { ...c.interaction, completeMealHandoff }, pickups: [], reduced: false, reactions: {}, sleeping: {},
  meals, onNode: () => {}, onSelect: () => {}, onMove: () => {},
 };
 let tree!: TestRenderer.ReactTestRenderer;
 try {
  await act(async () => { tree = TestRenderer.create(<SceneView {...props} mealReady={{}} />); });
  expect(completeMealHandoff).not.toHaveBeenCalled();
  await act(async () => tree.update(<SceneView {...props} mealReady={{ 'character/0': 5 }} />));
  expect(completeMealHandoff).not.toHaveBeenCalled();
  frames.shift()!(0);
  expect(completeMealHandoff).not.toHaveBeenCalled();
  frames.shift()!(16.67);
  expect(completeMealHandoff).toHaveBeenCalledExactlyOnceWith(source, capture);
 } finally {
  if (tree) await act(async () => tree.unmount());
  vi.unstubAllGlobals();
 }
});

it('applies the anticipation fade only to the idle drawing during a meal', async () => {
 const c = context('');
 c.interaction.slots.value = [emptyDragSlot(), emptyDragSlot()];
 const state = labHome('rig-menu-0');
 const scene = buildScene(state);
 const meal = { key: 6, action: 'eat' as const, food: scene.entities['home/item/menu-0'].item! };
 const { EntityArt } = await import('../src/home/runtime/EntityArt');
 let tree!: TestRenderer.ReactTestRenderer;
 await act(async () => {
  tree = TestRenderer.create(<SceneView state={state} scene={scene} building={buildingLayout(4)}
   viewport={{ width: 402, height: 650 }} interaction={c.interaction} pickups={[]} reduced={false}
   reactions={{}} sleeping={{}} meals={{ 'character/0': meal }} mealReady={{ 'character/0': 6 }}
   onNode={() => {}} onSelect={() => {}} onMove={() => {}} />);
 });
 const art = tree.root.findAllByType(EntityArt).find(node => node.props.meal === meal)!;
 expect(art.props.idleStyle.evaluate()).toHaveProperty('opacity');
 expect(art.parent?.props.style?.evaluate).toBeUndefined();
 await act(async () => tree.unmount());
});

it('prepares a full picked-up drink in the resting actor’s hidden stage', async () => {
 const c = context('');
 c.interaction.slots.value = [emptyDragSlot(), emptyDragSlot()];
 const state = labHome('rig-menu-1');
 const scene = buildScene(state);
 const drink = scene.entities['home/item/menu-4'];
 const pickup = { id: drink.id, slot: 0, scene, generation: 1, epoch: 0 } as Pickup;
 const props = {
  state, scene, building: buildingLayout(4), viewport: { width: 402, height: 650 }, interaction: c.interaction,
  reduced: false, reactions: {}, sleeping: {}, onNode: () => {}, onSelect: () => {}, onMove: () => {},
 };
 const { EntityArt } = await import('../src/home/runtime/EntityArt');
 let tree!: TestRenderer.ReactTestRenderer;
 await act(async () => { tree = TestRenderer.create(<SceneView {...props} pickups={[pickup]} />); });
 const art = tree.root.findAllByType(EntityArt).find(node => node.props.prepareMeal)!;
 expect(art.props.meal).toBeUndefined();
 expect(art.props.mealStandby).toEqual({ key: 0, action: 'drink', offered: true, food: drink.item });
 await act(async () => tree.unmount());
});
