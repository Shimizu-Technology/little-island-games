import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { IslandScene } from '../src/hub/IslandScene';
import { defaultLook } from '../src/islander/look';
vi.mock('react-native', () => ({ View:'div', Pressable:'button', Platform:{OS:'web'} }));
vi.mock('react-native-reanimated', () => ({ default:{View:'div',createAnimatedComponent:(c:unknown)=>c},cancelAnimation:vi.fn(),Easing:{out:()=>null,cubic:null},useSharedValue:(initial:number)=>({get:()=>initial,set:vi.fn()}),useAnimatedStyle:()=>({}),withTiming:(value:number)=>value,withSequence:()=>0,withDelay:()=>0 }));
vi.mock('../src/components/ui', () => ({ C:{},font:undefined }));
vi.mock('../src/components/Text', () => ({ Text:'span' }));
vi.mock('../src/islander', () => ({ Islander:()=>null }));
vi.mock('../src/hub/Landmarks', () => ({ Landmark:()=>null }));
vi.mock('../src/hub/Terrain', () => ({ Terrain:()=>null }));
vi.mock('../src/hub/IslandLife', () => ({ IslandLife:()=>null }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT=true;
describe('visible map input during route/sheet settling',()=>{
 it('opens a place immediately even while idle motion is paused by a closing sheet',async()=>{
  const open=vi.fn();let screen!:ReactTestRenderer;
  await act(()=>{screen=create(<IslandScene width={390} height={710} fontScale={1} look={defaultLook} reduced={false} active={false} door="school" onArrive={open}/>);});
  const home=screen.root.findAll(n=>n.type==='button' && n.props.accessibilityLabel==='Visit Home')[0];
  await act(()=>home.props.onPress()); expect(open).toHaveBeenCalledExactlyOnceWith('home');
  await act(()=>screen.unmount());
 });
});
