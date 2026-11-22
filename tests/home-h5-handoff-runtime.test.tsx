import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, expect, it, vi } from "vitest";
import { layoutToken } from "../src/home/runtime/layout";
import { useInteraction, type Pickup, type Interaction } from "../src/home/runtime/useInteraction";
import { DragOverlay } from "../src/home/runtime/DragOverlay";
import { buildingLayout, roomOrigin } from "../src/home/camera";
import { identityCamera } from "../src/home/scene/camera";
import { roomPoint, type SceneEntity } from "../src/home/scene/types";
import { migrateHome, starterHome, instance, homeReducer, type HomeStateV2 } from "../src/home/model";
import { buildScene } from "../src/home/scene/graph";
import { apply, resolve } from "../src/home/scene/proposal";
const harness = vi.hoisted(() => ({
  frames: [] as ((frame: { timeSincePreviousFrame: number }) => void)[],
  js: [] as (() => void)[],
  handlers: {} as Record<string, (...args: any[]) => void>,
  layouts: 0,
  deferCommit: false,
  taps: [] as (string|undefined)[],
}));
vi.mock("react-native-gesture-handler", () => ({
  Gesture: {
    Manual: () => {
      const builder: any = {};
      for (const [name, key] of [["onTouchesDown", "down"], ["onTouchesMove", "move"], ["onTouchesUp", "up"], ["onTouchesCancelled", "cancel"]])
        builder[name] = (fn: (...args: any[]) => void) => { harness.handlers[key] = fn; return builder; };
      return builder;
    },
  },
}));
/** onLayout on mount and on a change of the view's own size; nothing else re-lays it out. */
function nativeView(type: string) {
  return function NativeView({ onLayout, children, style, ...rest }: any) {
    const flat = Array.isArray(style) ? style.filter((s: any) => s && !s.evaluate) : style;
    const size = JSON.stringify([flat?.width ?? (Array.isArray(flat) ? flat.map((s: any) => s.width) : undefined),
      flat?.height ?? (Array.isArray(flat) ? flat.map((s: any) => s.height) : undefined)]);
    const ref = React.useRef(onLayout);
    ref.current = onLayout;
    React.useEffect(() => { if (ref.current) { harness.layouts++; ref.current({ nativeEvent: { layout: {} } }); } }, [size]);
    return React.createElement(type, rest, children);
  };
}
vi.mock("react-native", () => ({ View: nativeView("View"), Platform: { OS: "ios" } }));
vi.mock("react-native-reanimated", async () => {
  const React = await import("react");
  return {
    default: { View: nativeView("AnimatedView") },
    useSharedValue: (initial: unknown) => {
      const ref = React.useRef<any>(undefined);
      if (!ref.current)
        ref.current = {
          value: initial,
          get() { return this.value; },
          modify(fn: (value: any) => any) { this.value = fn(this.value); },
          set(value: any) { this.value = typeof value === "function" ? value(this.value) : value; },
        };
      return ref.current;
    },
    useFrameCallback: (fn: (frame: { timeSincePreviousFrame: number }) => void) => {
      harness.frames[0] = fn;
      return { callbackId: 7, isActive: true, setActive: () => {} };
    },
    useAnimatedStyle: () => ({}),
    useDerivedValue: (fn: () => unknown) => ({ get value() { return fn(); } }),
    useAnimatedReaction: () => {},
    withTiming: (v: unknown) => v,
    runOnUI: (fn: (...args: any[]) => void) => (...args: any[]) => fn(...args),
    runOnJS: (fn: (...args: any[]) => void) => (...args: any[]) => harness.js.push(() => fn(...args)),
  };
});
vi.mock("../src/home/runtime/EntityArt", () => ({ EntityArt: "EntityArt", artFrame: (e: SceneEntity) => e.bounds }));
vi.mock("../src/home/runtime/CarriedCharacter", () => ({ CarriedCharacter: "CarriedCharacter" }));
vi.mock("../src/home/runtime/LandingPreview", () => ({ LandingPreview: () => null }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const registry = { calls: [] as [number, boolean][], manageStateFrameCallback(id: number, on: boolean) { registry.calls.push([id, on]); } };
(globalThis as any)._frameCallbackRegistry = registry;


const building=buildingLayout(4,true), viewport={width:1000,height:600};
let current: Interaction, settled:HomeStateV2, commits=0;
let edit: (action: Parameters<typeof homeReducer>[1]) => void;
function Host({initial}:{initial:HomeStateV2}) {
  const [state,setState]=React.useState(initial), [pickups,setPickups]=React.useState<(Pickup|undefined)[]>([undefined,undefined]);
  const scene=React.useMemo(()=>buildScene(state),[state]);
  const interaction=useInteraction({scene,building,viewport,initialCamera:identityCamera,reduced:false,designing:false,onCameraChange:()=>{},onTap:id=>harness.taps.push(id),
    onPickup:pickup=>setPickups(all=>all.map((p,i)=>i===pickup.slot?pickup:p)),
    onClear:index=>setPickups(all=>all.map((p,i)=>i===index?undefined:p)),
    onCommit:(index,proposal,_at,token)=>{
      if(harness.deferCommit)return;
      const result=apply(state,proposal); if(!('state' in result))throw Error('Rejected fixture');
      commits++;setState(result.state);
      interaction.finish(index,true,proposal,buildScene(result.state).revision,buildScene(result.state),token,result.identities[proposal.id]);
    }});
  React.useLayoutEffect(()=>{
    current=interaction;settled=state;edit=action=>setState(s=>homeReducer(s,action).state);
    for(const e of Object.values(scene.entities))if(e.attachment.kind!=='container')interaction.acknowledgeLayout(e.id,layoutToken(e));
  });
  return <DragOverlay scene={scene} activeRoom="home" pickups={pickups} interaction={interaction} building={building} reduced={false}/>;
}
async function flush(){await act(async()=>{while(harness.js.length)harness.js.shift()!();});}
async function frames(n:number){for(let i=0;i<n;i++){vi.advanceTimersByTime(16);harness.frames[0]({timeSincePreviousFrame:16.67});await flush();}}
beforeEach(()=>{harness.frames=[];harness.js=[];harness.handlers={};harness.taps=[];harness.deferCommit=false;commits=0;vi.useFakeTimers();vi.setSystemTime(1000);});
it('HS-01: three successive stored props retire their overlays using only the container layout acknowledgement',async()=>{
  const initial=migrateHome(starterHome())!;
  for(const r of Object.values(initial.rooms)){r.instances=[];r.characters=[];}
  initial.rooms.home.instances=[instance('box','toy-box',8,7),...['teddy','ball','shell'].map((item,n)=>instance(`prop${n}`,item,2+n*2,10))];
  settled=initial;
  let tree!:TestRenderer.ReactTestRenderer;
  await act(async()=>{tree=TestRenderer.create(<Host initial={initial}/>);});
  for(let n=0;n<3;n++){
    const scene=buildScene(settled),target=scene.rooms.home.targets.find(t=>t.kind==='container')!;
    const p=resolve(scene.rooms.home,scene.entities[`home/item/prop${n}`],target.contact,{scale:1,release:true,target:target.id});
    await act(async()=>{expect(current.animateProposal(p)).toBe(true);});await flush();await frames(90);
    expect(commits).toBe(n+1);
    expect(current.slots.get().every(s=>!s.id)).toBe(true);
    expect(settled.rooms.home.instances.filter(i=>i.in==='box')).toHaveLength(n+1);
  }
  // The last retired slot remembers this id for diagnostics, but must not own it.
  const scene=buildScene(settled);
  const take=resolve(scene.rooms.home,scene.entities['home/item/prop2'],roomPoint(650,525),{scale:1,release:true,floorOnly:true});
  await act(async()=>{expect(current.animateProposal(take)).toBe(true);});await flush();await frames(90);
  expect(commits).toBe(4);
  expect(settled.rooms.home.instances.filter(i=>i.in==='box')).toHaveLength(2);
  expect(current.slots.get().every(s=>!s.id)).toBe(true);
  await act(async()=>tree.unmount());vi.useRealTimers();
});

it('HS-01: closing the chest during a take-out/store handoff still retires every slot',async()=>{
  const initial=migrateHome(starterHome())!;
  for(const r of Object.values(initial.rooms)){r.instances=[];r.characters=[];}
  initial.rooms.home.instances=[instance('box','toy-box',2,4),instance('basket','carry-basket',10,8),{...instance('toy','teddy',0,0),in:'basket'}];
  let tree!:TestRenderer.ReactTestRenderer;
  await act(async()=>{tree=TestRenderer.create(<Host initial={initial}/>);});
  let scene=buildScene(settled);
  let p=resolve(scene.rooms.home,scene.entities['home/item/toy'],roomPoint(500,535),{scale:1,release:true,floorOnly:true});
  await act(async()=>{expect(current.animateProposal(p)).toBe(true);});await flush();await frames(90);
  scene=buildScene(settled);const target=scene.rooms.home.targets.find(t=>t.owner==='home/item/box'&&t.kind==='container')!;
  p=resolve(scene.rooms.home,scene.entities['home/item/toy'],target.contact,{scale:1,release:true,target:target.id});
  await act(async()=>{expect(current.animateProposal(p)).toBe(true);});await flush();
  while(commits<2)await frames(1);
  // The next edit arrives before the three-frame overlay retirement handshake.
  await act(async()=>edit({type:'toggle',id:'box',roomId:'home'}));
  await frames(90);
  expect(current.slots.get().every(s=>!s.id)).toBe(true);
  expect(current.controller.get().pointers).toHaveLength(0);
  expect(settled.rooms.home.instances.find(i=>i.id==='toy')?.in).toBe('box');
  expect(settled.rooms.home.instances.find(i=>i.id==='box')?.storage?.open).toBe(false);
  const basket=buildScene(settled).entities['home/item/basket'];
  const origin=roomOrigin(0,building);
  const touch={id:17,x:origin.x+basket.contact.x,y:origin.y+basket.contact.y-25};
  await act(async()=>harness.handlers.down({changedTouches:[touch],numberOfTouches:1},{activate:()=>{}}));await flush();
  expect(current.controller.get().pointers[0]?.entity).toBe(basket.id);
  vi.advanceTimersByTime(50);
  await act(async()=>harness.handlers.up({changedTouches:[touch],numberOfTouches:0},{end:()=>{}}));await flush();
  expect(harness.taps.at(-1)).toBe(basket.id);

  await act(async()=>tree.unmount());vi.useRealTimers();
});

it('HS-01: a queued tap ignores retired basket identities during another prop commit',async()=>{
  const initial=migrateHome(starterHome())!;
  for(const r of Object.values(initial.rooms)){r.instances=[];r.characters=[];}
  initial.rooms.home.instances=[instance('basket','carry-basket',10,8),instance('toy','teddy',2,10)];
  let tree!:TestRenderer.ReactTestRenderer;
  await act(async()=>{tree=TestRenderer.create(<Host initial={initial}/>);});
  let scene=buildScene(settled);
  const basketMove=resolve(scene.rooms.home,scene.entities['home/item/basket'],roomPoint(650,525),{scale:1,release:true,floorOnly:true});
  await act(async()=>{expect(current.animateProposal(basketMove)).toBe(true);});await flush();await frames(90);
  // Either slot may retain the retired identity after two-handed interaction.
  const retired=current.slots.get()[0];
  expect(retired.id).toBe('');expect(retired.restId).toBe('home/item/basket');
  current.slots.set([current.slots.get()[1],retired]);
  scene=buildScene(settled);
  const toyMove=resolve(scene.rooms.home,scene.entities['home/item/toy'],roomPoint(350,525),{scale:1,release:true,floorOnly:true});
  harness.deferCommit=true;
  await act(async()=>{expect(current.animateProposal(toyMove)).toBe(true);});await flush();await frames(60);
  expect(current.slots.get()[0].commitRequested).toBe(true);
  expect(current.slots.get()[0].committed).toBe(false);
  const basket=buildScene(settled).entities['home/item/basket'],origin=roomOrigin(0,building);
  const touch={id:19,x:origin.x+basket.contact.x,y:origin.y+basket.contact.y-25};
  await act(async()=>harness.handlers.down({changedTouches:[touch],numberOfTouches:1},{activate:()=>{}}));
  vi.advanceTimersByTime(50);
  await act(async()=>harness.handlers.up({changedTouches:[touch],numberOfTouches:0},{end:()=>{}}));
  expect(harness.taps).toHaveLength(0);
  await act(async()=>current.finish(0,false));await frames(90);
  expect(harness.taps).toEqual(['home/item/basket']);
  expect(current.controller.get().pointers).toHaveLength(0);
  await act(async()=>tree.unmount());vi.useRealTimers();
});
