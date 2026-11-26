import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IslandScene } from '../src/hub/IslandScene';
import { defaultLook } from '../src/islander/look';
vi.mock('react-native', () => ({ View:'div', Pressable:'button', Image:'img', Platform:{OS:'web'} }));
const motion = vi.hoisted(() => ({ values: [] as { value: number; get: () => number; set: (value: number) => void }[] }));
vi.mock('react-native-reanimated', async () => {
 const { useRef } = await import('react');
 return { default:{View:'div',createAnimatedComponent:(c:unknown)=>c},cancelAnimation:vi.fn(),Easing:{out:()=>null,cubic:null},
  useSharedValue:(initial:number)=>{
   const ref = useRef<{ value:number; get:()=>number; set:(value:number)=>void } | null>(null);
   if (!ref.current) { const shared = {value:initial,get:()=>shared.value,set:(value:number)=>{shared.value=value;}}; ref.current=shared; motion.values.push(shared); }
   return ref.current;
  },useAnimatedStyle:()=>({}),withTiming:(value:number)=>value,withSequence:(...values:number[])=>values.at(-1),withDelay:(_:number,value:number)=>value };
});
afterEach(()=>{vi.useRealTimers();motion.values=[];});
vi.mock('../src/components/ui', () => ({ C:{},font:undefined }));
vi.mock('../src/components/Text', () => ({ Text:'span' }));
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false }));
vi.mock('../src/islander', () => ({ Islander:()=>null }));
vi.mock('../src/hub/Terrain', () => ({ Terrain:()=>null }));
vi.mock('../src/hub/IslandLife', () => ({ IslandLife:()=>null }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT=true;
describe('six-door illustrated island map', () => {
 it('renders exactly six illustrated doors and zero locker/badges SVG doors', async () => {
  let screen!: ReactTestRenderer;
  await act(() => { screen = create(<IslandScene width={390} height={710} fontScale={1} look={defaultLook} reduced={false} active door={null} onArrive={vi.fn()}/>); });
  const doors = screen.root.findAll(n => n.type === 'button' && typeof n.props.testID === 'string' && n.props.testID.startsWith('place-'));
  expect(doors.map(n => n.props.testID)).toEqual(['place-school', 'place-library', 'place-arcade', 'place-hall', 'place-home', 'place-cove']);
  expect(screen.root.findAll(n => n.props.testID === 'place-locker' || n.props.testID === 'place-badges')).toHaveLength(0);
  const art = screen.root.findAll(n => n.type === 'img' && n.props.testID === 'illustrated-art');
  expect(art).toHaveLength(6);
  expect(art.map(n => n.props.source)).toEqual(['learn', 'library', 'arcade', 'game-hall', 'home', 'puzzles'].map(door => `assets/art/map/${door}.webp`));
  expect(screen.root.findAll(n => n.type === 'svg')).toHaveLength(0);
  await act(() => screen.unmount());
 });
});
describe('visible map input during route/sheet settling',()=>{
 it('opens a place immediately even while idle motion is paused by a closing sheet',async()=>{
  const open=vi.fn();let screen!:ReactTestRenderer;
  await act(()=>{screen=create(<IslandScene width={390} height={710} fontScale={1} look={defaultLook} reduced={false} active={false} door="school" onArrive={open}/>);});
  const home=screen.root.findAll(n=>n.type==='button' && n.props.accessibilityLabel==='Visit Home')[0];
  await act(()=>home.props.onPress()); expect(open).toHaveBeenCalledExactlyOnceWith('home');
  await act(()=>screen.unmount());
 });
});

describe('departure camera lifetime',()=>{
 it('holds the zoom through door acceptance and blur, then resets on return at that door',async()=>{
  vi.useFakeTimers(); let screen!:ReactTestRenderer;
  const open=vi.fn();
  const props={width:390,height:710,fontScale:1,look:defaultLook,reduced:false,onArrive:open};
  await act(()=>{screen=create(<IslandScene {...props} active door={null}/>);});
  const home=screen.root.findAll(n=>n.type==='button' && n.props.accessibilityLabel==='Visit Home')[0];
  await act(()=>home.props.onPress());
  const [x,y,,zoom,cameraX,cameraY]=motion.values;
  expect(zoom.get()).toBe(1.16);
  const camera=[zoom.get(),cameraX.get(),cameraY.get()];
  await act(()=>{vi.advanceTimersByTime(540);});
  expect(open).toHaveBeenCalledExactlyOnceWith('home');
  const door=[x.get(),y.get()];
  // HubScreen accepts the door in the same callback that pushes the Router route.
  await act(()=>screen.update(<IslandScene {...props} active door="home"/>));
  expect([zoom.get(),cameraX.get(),cameraY.get()]).toEqual(camera);
  // Native blur precedes the end of the outgoing screen's visible transition.
  await act(()=>screen.update(<IslandScene {...props} active={false} door="home"/>));
  await act(()=>{vi.advanceTimersByTime(1000);});
  expect([zoom.get(),cameraX.get(),cameraY.get()]).toEqual(camera);
  await act(()=>screen.update(<IslandScene {...props} active door="home"/>));
  expect([zoom.get(),cameraX.get(),cameraY.get()]).toEqual([1,0,0]);
  expect([x.get(),y.get()]).toEqual(door);
  expect(open).toHaveBeenCalledTimes(1);
  await act(()=>screen.unmount());
 });
});
