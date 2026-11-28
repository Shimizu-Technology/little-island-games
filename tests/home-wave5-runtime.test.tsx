import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { layoutToken } from "../src/home/runtime/layout";
import { useInteraction, type Pickup, type Interaction } from "../src/home/runtime/useInteraction";
import { DragOverlay } from "../src/home/runtime/DragOverlay";
import { buildingLayout, roomOrigin } from "../src/home/camera";
import { identityCamera } from "../src/home/scene/camera";
import { roomPoint, type SceneEntity } from "../src/home/scene/types";
import { starterHome, instance, type HomeStateV2 } from "../src/home/model";
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
let mealPending = false;
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
      interaction.finish(index,true,proposal,buildScene(result.state).revision,buildScene(result.state),token,result.identities[proposal.id], mealPending);
    }});
  React.useLayoutEffect(()=>{
    current=interaction;settled=state;
    for(const e of Object.values(scene.entities))if(e.attachment.kind!=='container')interaction.acknowledgeLayout(e.id,layoutToken(e));
  });
  return <DragOverlay scene={scene} activeRoom="home" pickups={pickups} interaction={interaction} building={building} reduced={false}/>;
}
async function flush(){await act(async()=>{while(harness.js.length)harness.js.shift()!();});}
async function frames(n:number){for(let i=0;i<n;i++){vi.advanceTimersByTime(16);harness.frames[0]({timeSincePreviousFrame:16.67});await flush();}}
beforeEach(()=>{harness.frames=[];harness.js=[];harness.handlers={};harness.taps=[];harness.deferCommit=false;commits=0;vi.useFakeTimers();vi.setSystemTime(1000);});

afterEach(() => { vi.useRealTimers(); mealPending = false; });
function mealFixture() {
  const state = starterHome();
  for (const room of Object.values(state.rooms)) { room.instances = []; room.characters = []; }
  state.rooms.home.characters = [{slot: 0, anchor: 'floor', pose: 'stand', x: 8, y: 8}];
  state.rooms.home.instances = Array.from({length: 8}, (_, n) => instance(`snack${n}`, 'mango', 2 + n, 10));
  return state;
}
it('rapid repeated feeding retires every interrupted meal presentation and accepts the next input', async () => {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<Host initial={mealFixture()}/>); });
  mealPending = true;
  for (let n = 0; n < 8; n++) {
    const scene = buildScene(settled), mouth = scene.rooms.home.targets.find(t => t.id === 'character/0/mouth')!;
    const p = resolve(scene.rooms.home, scene.entities[`home/item/snack${n}`], mouth.contact, {scale: 1, target: mouth.id, release: true});
    await act(async () => { expect(current.animateProposal(p)).toBe(true); });
    await flush(); await frames(35);
    const pending = current.slots.get().find(s => s.id);
    expect(pending?.mealPending).toBe(true);
    // No presentation/finish callback arrives (offscreen or interrupted native animation).
    await frames(140);
    expect(current.slots.get().every(s => !s.id)).toBe(true);
    expect(current.controller.get().pointers).toHaveLength(0);
  }
  expect(commits).toBe(8);
  await act(async () => tree.unmount());
});
it('a lost JS commit acknowledgement releases queued taps without Undo', async () => {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<Host initial={mealFixture()}/>); });
  const scene = buildScene(settled), snack = scene.entities['home/item/snack0'];
  const p = resolve(scene.rooms.home, snack, roomPoint(600, 520), {scale: 1, floorOnly: true, release: true});
  harness.deferCommit = true;
  await act(async () => { current.animateProposal(p); }); await flush(); await frames(45);
  expect(current.slots.get().some(s => s.commitRequested && !s.committed)).toBe(true);
  const touch = {id: 44, x: 790, y: 550};
  await act(async () => harness.handlers.down({changedTouches:[touch],numberOfTouches:1},{activate:()=>{}}));
  await act(async () => harness.handlers.up({changedTouches:[touch],numberOfTouches:0},{end:()=>{}}));
  await frames(190);
  expect(current.slots.get().every(s => !s.id)).toBe(true);
  expect(current.controller.get().pointers).toHaveLength(0);
  expect(commits).toBe(0);
  await act(async () => tree.unmount());
});
it.each(['zero', 'cancel', 'pan'])('grounds an orphaned dragging avatar after %s interruption', async kind => {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<Host initial={mealFixture()}/>); });
  const actor = buildScene(settled).entities['character/0'], origin = roomOrigin(0, building);
  const down = {id: 5, x: origin.x + actor.contact.x, y: origin.y + actor.contact.y - 70};
  await act(async () => harness.handlers.down({changedTouches:[down],numberOfTouches:1},{activate:()=>{}}));
  await act(async () => harness.handlers.move({changedTouches:[{...down,x:down.x+70,y:down.y-100}],numberOfTouches:1}));
  await flush(); await frames(3);
  expect(current.slots.get().some(s => s.id === actor.id && s.phase === 'dragging')).toBe(true);
  if (kind === 'zero') await act(async () => harness.handlers.move({changedTouches:[],numberOfTouches:0}));
  if (kind === 'cancel') await act(async () => harness.handlers.cancel({changedTouches:[],numberOfTouches:0},{end:()=>{}}));
  if (kind === 'pan') current.controller.set({...current.controller.get(),pointers:[]});
  await frames(150);
  expect(current.slots.get().every(s => !s.id)).toBe(true);
  const grounded = buildScene(settled).entities[actor.id];
  expect(grounded.contact).toEqual(actor.contact);
  expect(grounded.base).toBe('stand');
  await act(async () => tree.unmount());
});
