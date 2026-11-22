import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { GridShell } from '../src/puzzles/grid/GridShell';
import { createGrid, type GridSpec } from '../src/puzzles/grid/model';
import { cageCorners } from '../src/puzzles/latin/clues';
import { wordsFit } from '../src/components/wordFit';
const dims=vi.hoisted(()=>({width:393,height:852,fontScale:1}));
vi.mock('react-native',()=>({View:'View',TextInput:'Input',Pressable:'Cell',Platform:{OS:'ios'},useWindowDimensions:()=>dims,AccessibilityInfo:{isScreenReaderEnabled:async()=>false,addEventListener:()=>({remove(){}})},PanResponder:{create:()=>({panHandlers:{}})}}));
vi.mock('react-native-reanimated',async()=>{const {useRef}=await import('react');return {default:{View:'AnimatedView'},useAnimatedStyle:()=>({}),useSharedValue:(value:number)=>useRef({get:()=>value,set:()=>{}}).current};});
vi.mock('react-native-svg',()=>({default:'Svg',Path:'Path'}));
vi.mock('../src/components/Text',()=>({Text:'Text'}));
vi.mock('../src/components/ui',()=>({Button:'Button',Copy:'Copy',C:{ink:'#183F39'}}));
(globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let root:ReactTestRenderer|undefined;afterEach(async()=>{if(root)await act(async()=>root!.unmount());root=undefined;});
it.each([4,6,9].flatMap(n=>[1,3.12].flatMap(scale=>[280,333,684].flatMap(width=>['sudoku','killer','cage-math'].map(kind=>({n,scale,width,kind}))))))('word-fit Erase or icon for $kind $n wide / $width / $scale',async({n,scale,width,kind})=>{
 dims.fontScale=scale;const spec:GridSpec={kind:'digits',rows:n,columns:n,symbols:Array.from({length:n},(_,i)=>String(i+1)),givens:Array(n*n).fill(0)},dispatch=vi.fn();
 const p={kind:kind as 'sudoku'|'killer'|'cage-math',size:n,box:kind==='cage-math'?0:n===9?3:2,givens:[...spec.givens],cages:kind==='sudoku'?[]:[{cells:[0,1],op:'+' as const,target:7}],less:[],sights:[],mask:Array(n*n).fill(0)};
 await act(async()=>{root=create(<GridShell spec={spec} state={createGrid(spec)} active width={width} dispatch={dispatch} cornerClues={p.cages.length?cageCorners(p):undefined}/>);});
 const erase=root!.root.findAllByType('Button' as never).find(x=>/\bErase$/.test(x.props.label??''));expect(erase).toBeDefined();
 const room=erase!.props.style.width-2*(erase!.props.style.paddingHorizontal??13)-4,font=15*Math.min(scale,erase!.props.maxFontSizeMultiplier??scale);
 expect(erase!.props.style.minHeight).toBeGreaterThanOrEqual(56);
 if(erase!.props.icon){expect(erase!.props.icon).toBe('erase');expect(erase!.children).toHaveLength(0);expect(wordsFit('Erase',font,room)).toBe(false);}
 else{expect(erase!.children).toEqual(['Erase']);expect(wordsFit('Erase',font,room)).toBe(true);}
 expect(erase!.props.label).toBe('Erase');expect(erase!.props.numberOfLines).toBe(1);
 await act(async()=>erase!.props.onPress());expect(dispatch).toHaveBeenCalledWith({type:'write',cells:[0],value:0});
 const digits=root!.root.findAllByType('Button' as never).filter(x=>/^Enter \d$/.test(x.props.label??''));expect(digits).toHaveLength(n);expect(digits.every(x=>x.props.textStyle.fontSize===26)).toBe(true);
});
it.each(['killer','cage-math','logic-lagoon'])('keeps box and frame lines above caption backgrounds for %s',async(kind)=>{
 const n=4,spec:GridSpec={kind:'digits',rows:n,columns:n,symbols:['1','2','3','4'],givens:Array(16).fill(0)};
 const p={kind:kind==='cage-math'?'cage-math' as const:'killer' as const,size:4,box:kind==='cage-math'?0:2,givens:[...spec.givens],cages:[{cells:[0,1],op:kind==='cage-math'?'*' as const:'+' as const,target:kind==='cage-math'?12:7}],less:[],sights:[],mask:Array(16).fill(0)};
 await act(async()=>{root=create(<GridShell spec={spec} state={{...createGrid(spec),notes:Array(16).fill(15)}} active width={300} dispatch={()=>{}} cornerClues={cageCorners(p)} borders="M0 0H224V224H0ZM112 0V224M0 112H224"/>);});
 const output=JSON.stringify(root!.toJSON());expect(output.indexOf('strokeWidth":2.5')).toBeGreaterThan(output.indexOf('corner-clue-0'));expect(output.indexOf('#A1B4A9')).toBeGreaterThan(output.indexOf('corner-clue-0'));
});

it('retains multi-letter game symbols rather than treating them as the appended erase action',async()=>{
 dims.fontScale=1;const spec:GridSpec={kind:'cells',rows:2,columns:2,symbols:['Sea','Land'],givens:[0,0,0,0]};
 await act(async()=>{root=create(<GridShell spec={spec} state={createGrid(spec)} active width={333} dispatch={()=>{}}/>);});
 for(const symbol of spec.symbols){const key=root!.root.findAllByType('Button' as never).find(x=>x.props.label===`Enter ${symbol}`)!;expect(key.children).toEqual([symbol]);expect(key.props.icon).toBeUndefined();expect(key.props.style.paddingHorizontal).toBeUndefined();expect(key.props.maxFontSizeMultiplier).toBeUndefined();}
});
