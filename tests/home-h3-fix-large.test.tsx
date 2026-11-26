import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { DesignTools } from '../src/home/runtime/DesignTools';
import { HomePanels } from '../src/home/runtime/HomePanels';
import { starterHome } from '../src/home/model';
vi.mock('react-native',()=>({View:'View',Pressable:'Pressable',ScrollView:'ScrollView',Text:'Text',TextInput:'TextInput',Modal:'Modal',FlatList:({data,renderItem}:any)=>data.map((item:any)=>renderItem({item})),Platform:{OS:'ios'},StyleSheet:{create:(v:unknown)=>v,absoluteFill:{}}}));
vi.mock('react-native-reanimated',()=>({default:{View:'AnimatedView'},useSharedValue:(v:any)=>React.useRef({value:v,set(n:any){this.value=n;},get(){return this.value;}}).current,withRepeat:(x:any)=>x,withTiming:(x:any)=>x,cancelAnimation:()=>{},Easing:{linear:(t:number)=>t},useAnimatedStyle:(fn:()=>unknown)=>({evaluate:fn}),useDerivedValue:(fn:()=>unknown)=>({get value(){return fn();}}),useAnimatedReaction:(prepare:any,react:any)=>{const previous=React.useRef<any>(null);React.useLayoutEffect(()=>{const next=prepare();if(next!==previous.current){react(next,previous.current);previous.current=next;}});},runOnJS:(fn:any)=>fn,runOnUI:(fn:any)=>fn}));
vi.mock('react-native-gesture-handler',()=>({GestureDetector:'GestureDetector',Gesture:{Pan:()=>{
 const builder:any=new Proxy({}, {get:()=> ()=>builder});return builder;
}}}));
vi.mock('react-native-svg', () => ({ default: 'Svg', Circle: 'Circle', Path: 'Path' }));
vi.mock('../src/home/art/More',()=>({RoomShellArt:()=>null,MoreItemArt:()=>null}));
vi.mock('../src/home/art/Items',()=>({ItemArt:()=>null}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const flat = (style: any): any => typeof style === 'function' ? flat(style({ pressed: false })) : Array.isArray(style) ? Object.assign({}, ...style.map(flat)) : style || {};
const size = (n: TestRenderer.ReactTestInstance) => { const s = flat(n.props.style); return { w: s.width ?? s.minWidth ?? 0, h: s.height ?? s.minHeight ?? 0 }; };
const pressables = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAll((n) => (n.type as unknown) === 'Pressable');
const label = (n: TestRenderer.ReactTestInstance) => n.props.accessibilityLabel ?? n.findAll((t) => (t.type as unknown) === 'Text').map((t) => t.props.children).join('');

describe('R5: larger-target mode covers More and Design', () => {
  it('More: zoom, close and the Friends shortcut are 64 pt; grown-up controls stay as they are', async () => {
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => { tree = TestRenderer.create(<HomePanels more friends={false} scene={{} as any} bottom={60} large onLarge={() => true} onClose={() => {}} onFriends={() => {}} onZoom={() => {}} onBring={() => {}} />); });
    const child = pressables(tree).filter((n) => n.props.testID !== 'home-grown-ups');
    expect(child.map(label)).toEqual(['Close home controls', 'Zoom in', 'Zoom out', 'Friends drawer']);
    for (const button of child) {
      expect(size(button).w, label(button)).toBeGreaterThanOrEqual(64);
      expect(size(button).h, label(button)).toBeGreaterThanOrEqual(64);
      // A 64 pt target also looks like one.
      expect(flat(button.props.style).backgroundColor, label(button)).toBeTruthy();
    }
    await act(async () => tree.unmount());
  });
  it('More without the mode keeps the ordinary 48 pt buttons', async () => {
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => { tree = TestRenderer.create(<HomePanels more friends={false} scene={{} as any} bottom={60} onClose={() => {}} onFriends={() => {}} onZoom={() => {}} onBring={() => {}} />); });
    const zoom = pressables(tree).find((n) => n.props.accessibilityLabel === 'Zoom in')!;
    expect(size(zoom).w).toBe(48);
    await act(async () => tree.unmount());
  });
  it('Design: every tab, tool, room style, colour and the restore question are 64 pt', async () => {
    const state = starterHome();
    const target = state.rooms.home.instances.find((i) => i.item === 'lamp')!;
    const ghost = { value: { item: 'chair', active: false, x: 0, y: 0 }, set(v: any) { this.value = v; } };
    let tree!: TestRenderer.ReactTestRenderer;
    const render = () => <DesignTools state={state} ownership={{}} target={target} vertical={false} ghost={ghost as any} onChoose={() => {}} onDrop={() => {}} onDragItem={() => {}}
      interaction={{} as any} offset={{ value: { x: 0, y: 0 } } as any} dispatch={() => {}} onClose={() => {}} large />;
    await act(async () => { tree = TestRenderer.create(render()); });
    const checked = new Set<string>();
    const check = () => {
      for (const button of pressables(tree)) {
        const name = label(button);
        if (String(button.props.testID ?? '').startsWith('inventory-')) { expect(size(button).w).toBeGreaterThanOrEqual(64); continue; }
        expect(size(button).w, name).toBeGreaterThanOrEqual(64);
        expect(size(button).h, name).toBeGreaterThanOrEqual(64);
        checked.add(name);
      }
    };
    check();
    for (const tab of ['Room', 'Colours']) {
      const button = pressables(tree).find((n) => n.props.accessibilityRole === 'tab' && label(n) === tab)!;
      await act(async () => button.props.onPress());
      check();
    }
    await act(async () => pressables(tree).find((n) => n.props.accessibilityLabel === 'More decorating')!.props.onPress());
    check();
    await act(async () => pressables(tree).find((n) => n.props.testID === 'decorate-tidy-up-button')!.props.onPress());
    check();
    for (const name of ['Tidy up', 'Keep playing']) {
      const button = pressables(tree).find((n) => label(n) === name)!;
      expect(flat(button.props.style).backgroundColor, name).toBeTruthy();
    }
    for (const name of ['Close catalog', 'More decorating', 'Rotate', 'Mirror', 'Put away', 'Tidy up', 'Keep playing']) expect(checked, name).toContain(name);
    expect([...checked].some((n) => n.endsWith('colour'))).toBe(true);
    expect([...checked].some((n) => n.endsWith('walls'))).toBe(true);
    await act(async () => tree.unmount());
  });
});
