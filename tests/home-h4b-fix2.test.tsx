import React from 'react';
import {act,create} from 'react-test-renderer';
import {describe,it,expect,vi} from 'vitest';
import {buildScene} from '../src/home/scene/graph';
import {labFixtures} from '../src/home/runtime/lab';
import {resolve} from '../src/home/scene/resolve';
import {apply} from '../src/home/scene/proposal';
import {paintedBounds} from '../src/home/art/silhouettes';
import {restFrom,restTransform} from '../src/home/runtime/restFrom';
import {roomPoint} from '../src/home/scene/types';
import {floorCueMask,floorCueHidden} from '../src/home/runtime/floorCues';
import {LandingPreview} from '../src/home/runtime/LandingPreview';
import {buildingLayout} from '../src/home/camera';
import {releaseWindow} from '../src/home/runtime/frameProbe';
vi.mock('react-native',()=>({View:'view'}));
vi.mock('react-native-reanimated',()=>({default:{View:'animated-view'},withTiming:(v:number)=>v,useAnimatedStyle:(f:()=>unknown)=>({evaluate:f})}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
for(const slot of [0,1,2]as const)describe(`replacement drink actor ${slot}`,()=>{
 const fixture=()=>{const state=labFixtures[`rig-menu-${slot}`](),coconut=state.rooms.home.instances.find(i=>i.item==='coconut-drink')!;
 state.rooms.home.characters[0].holding=coconut.id;return {state,scene:buildScene(state)};};
 it('sets the first drink beside the feet and away from the resting hand',()=>{
  const {scene,state}=fixture(),owner=scene.entities[`character/${slot}`],juice=Object.values(scene.entities).find(e=>e.item?.item==='juice')!,coconut=Object.values(scene.entities).find(e=>e.item?.item==='coconut-drink')!;
  const mouth=scene.rooms.home.targets.find(t=>t.kind==='mouth'&&t.owner===owner.id)!;
  const p=resolve(scene.rooms.home,juice,mouth.contact,{scale:1,target:mouth.id,release:true});
  const move=p.moves.find(m=>m.id===coconut.id)!;
  expect(p.kind).toBe('mouth');expect(move).toBeDefined();expect(move.attachment.kind).toBe('floor');
  expect(Math.abs(move.contact.y-owner.contact.y)).toBeLessThan(18);
  const result=apply(state,p);expect(result).toHaveProperty('state');
  if(!('state'in result))throw Error('commit rejected');
  const next=buildScene(result.state),floor=next.entities[coconut.id],held=next.entities[juice.id];
  const a=paintedBounds(floor)!,b=paintedBounds(held)!;
  expect(a.left+a.width<=b.left || b.left+b.width<=a.left || a.top+a.height<=b.top || b.top+b.height<=a.top).toBe(true);
  const from=restFrom(coconut,floor)!;
  expect(from.duration).toBe(220);expect(from.x).toBe(coconut.contact.x);expect(from.y).toBe(coconut.contact.y);
  const start=restTransform(from,0,false);expect(start.scale).toBeCloseTo(coconut.bounds.width/floor.bounds.width);
  expect(floor.contact.x+start.dx+(floor.visual?.x ?? 0)*start.scale).toBeCloseTo(coconut.contact.x);
  expect(floor.contact.y+start.dy+(floor.visual?.y ?? 0)*start.scale).toBeCloseTo(coconut.contact.y);
  expect(restTransform(from,220,false)).toEqual({dx:0,dy:0,scale:1});
  expect(restTransform(from,0,true)).toEqual({dx:0,dy:0,scale:1});
  // A short, visible set-down must not spend its entire travel before the
  // first mid-transition native sample. Halfway still has half the lateral trip.
  const middle=restTransform(from,110,false);
  expect(middle.dx).toBeCloseTo(from.dx/2);
  expect(middle.scale).toBeCloseTo((1+from.scale)/2);
 });
 it('prefers a free reachable surface but never an occupied one',()=>{
  const {scene}=fixture(),index=scene.rooms.home,owner=scene.entities[`character/${slot}`];
  const juice=Object.values(scene.entities).find(e=>e.item?.item==='juice')!;
  const mouth=index.targets.find(t=>t.kind==='mouth'&&t.owner===owner.id)!;
  const surface={...mouth,id:'test-surface',kind:'surface' as const,owner:'counter',face:undefined,
   attachment:{kind:'surface' as const,parent:'counter',slot:0},contact:roomPoint(owner.contact.x-70,owner.contact.y-40),core:{left:owner.contact.x-100,top:owner.contact.y-60,width:60,height:40}};
  const withSurface={...index,targets:[...index.targets,surface]};
  const p=resolve(withSurface,juice,mouth.contact,{scale:1,target:mouth.id,release:true});
  expect(p.moves.find(m=>m.id.includes('menu-4'))?.attachment.kind).toBe('surface');
  const occupied={...index,targets:[...index.targets,{...surface,occupied:'other-cup'}]};
  const blocked=resolve(occupied,juice,mouth.contact,{scale:1,target:mouth.id,release:true});
  expect(blocked.moves.find(m=>m.id.includes('menu-4'))?.attachment.kind).toBe('floor');
 });
 it('suppresses the shared carry-shadow mask at the footprint edge and face approach',()=>{
  const {scene}=fixture(),owner=scene.entities[`character/${slot}`],juice=Object.values(scene.entities).find(e=>e.item?.item==='juice')!;
  const mask=floorCueMask(scene),actor=mask.find(a=>a.room===owner.room)!;
  const b=actor.bounds,footprint={width:40,height:10};
  expect(floorCueHidden(mask,juice,owner.room,{x:b.left-19,y:b.top+b.height/2},{x:-1000,y:-1000},1,footprint)).toBe(true);
  expect(floorCueHidden(mask,juice,owner.room,{x:-1000,y:-1000},{x:actor.x,y:actor.y},1,footprint)).toBe(true);
  expect(floorCueHidden(mask,juice,owner.room,{x:-1000,y:-1000},{x:-1000,y:-1000},1,footprint)).toBe(false);
 });
 it('suppresses floor preview under a painted character',async()=>{
  const {scene}=fixture(),owner=scene.entities[`character/${slot}`],juice=Object.values(scene.entities).find(e=>e.item?.item==='juice')!;
  const contact=roomPoint(owner.contact.x,owner.contact.y-15);
  const interaction={camera:{value:{a:1}},slots:{value:[{id:juice.id,ready:true,phase:'dragging',x:contact.x,y:contact.y,proposal:{kind:'floor',room:'home',contact}}]}}as any;
  let tree!:ReturnType<typeof create>;
  await act(async()=>{tree=create(<LandingPreview source={juice} scene={scene} interaction={interaction} building={buildingLayout(4)}/>);});
  expect(tree.root.findByProps({testID:`landing-preview-${juice.id}`}).props.style[1].evaluate().opacity).toBe(0);
  await act(async()=>tree.unmount());
 });
});
it('includes pickup through lift +300ms without release-window padding',()=>{
 const p=releaseWindow({at:1000,id:'cup',kind:'pickup',phase:'pickup'},[{at:900,delta:20},{at:1005,delta:20},{at:1305,delta:20},{at:1400,delta:20}]);
 expect(p.frames.map(f=>f.at)).toEqual([1005,1305]);
});
