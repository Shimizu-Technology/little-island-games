import React from 'react';
import { readFileSync } from 'node:fs';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { GridShell } from '../src/puzzles/grid/GridShell';
import { createGrid, type GridSpec } from '../src/puzzles/grid/model';
import * as clues from '../src/puzzles/latin/clues';
import { decodePuzzle, type LatinPuzzle } from '../src/puzzles/latin/core';
import { LatinBoard } from '../src/puzzles/latin/LatinBoard';
const counts = vi.hoisted(() => ({ cells: 0, svg: 0 }));
const dims = vi.hoisted(() => ({ width: 744, height: 1400, fontScale: 1 }));
vi.mock('react-native', () => ({ AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener: () => ({ remove() {} }) },
  TextInput: 'input', View: 'div', ScrollView: 'section', Platform: { OS: 'ios' }, useWindowDimensions: () => dims,
  Pressable: (props: Record<string, unknown>) => { counts.cells++; return React.createElement('button', props); },
  PanResponder: { create: () => ({ panHandlers: {} }) },
}));
vi.mock('react-native-reanimated', async () => {
  const { useRef } = await import('react');
  return { default: { View: 'div' }, useAnimatedStyle: () => ({}), useSharedValue: (initial: number) => {
    const ref = useRef({ value: initial, get() { return this.value; }, set(value: number) { this.value = value; } }); return ref.current;
  } };
});
vi.mock('react-native-svg', () => ({ default: (props: Record<string, unknown>) => { counts.svg++; return React.createElement('svg', props); }, Path: 'path' }));
vi.mock('../src/components/Text', () => ({ Text: 'span' }));
vi.mock('../src/components/ui', () => ({ C: {}, Button: 'button', Copy: 'p', ToggleRow: 'switch' }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let screen: ReactTestRenderer | undefined;
afterEach(async () => { if (screen) await act(async () => screen!.unmount()); screen = undefined; });
const intersects = (a: {left:number;top:number;width:number;height:number}, b: {left:number;top:number;width:number;height:number}) => a.left < b.left + b.width - 1e-5 && b.left < a.left + a.width - 1e-5 && a.top < b.top + b.height - 1e-5 && b.top < a.top + a.height - 1e-5;

it.each([1, 3.12].flatMap(scale => [[32,9], [36,6], [40,9], [42,9], [56,6], [68,9]].map(([cell,n]) => ({cell,n,scale}))))('corner captions never overlap dense notes: $n wide, $cell pt, scale $scale', async ({cell,n,scale}) => {
  dims.fontScale = scale;
  const spec: GridSpec = {rows:n,columns:n,symbols:Array.from({length:n},(_,i)=>String(i+1)),givens:Array(n*n).fill(0),kind:'digits'};
  const p: LatinPuzzle = {kind:'killer',size:n,box:n===9?3:2,givens:[...spec.givens],cages:[{cells:[0,1],op:'+',target:10}],less:[],sights:[],mask:Array(n*n).fill(0)};
  const state = {...createGrid(spec),notes:Array(n*n).fill((1<<n)-1)};
  // Optional only for the before-fix probe: the old public renderer still mounts and
  // its actual caption/notes geometry must fail, rather than an import failing.
  const cornerClues = (clues as unknown as {cageCorners?:(p:LatinPuzzle)=>unknown}).cageCorners?.(p);
  const props = {spec,state,dispatch:()=>{},active:true,width:n*cell,cornerClues,overlay:clues.cageLayer(p, {labels:!cornerClues})};
  await act(async () => { screen=create(<GridShell {...props as React.ComponentProps<typeof GridShell>}/>); });
  const first=screen!.root.findAllByType('button').find(b=>b.props.accessibilityLabel?.startsWith('Row 1, column 1,'))!;
  const actual=first.props.style.width;
  const drawn=screen!.root.findAllByType('span').filter(x=>x.props.testID?.startsWith('corner-note-0-'));
  const caption=screen!.root.findAllByType('span').find(x=>x.props.testID==='corner-clue-0') ?? screen!.root.findAllByType('span').find(x=>x.children.join('')==='10+')!;
  const cap=caption.props.style, factor=caption.props.allowFontScaling===false?1:Math.min(scale,caption.props.maxFontSizeMultiplier??scale);
  const captionBox={left:cap.left,top:cap.top,width:cap.width??actual-cap.left,height:cap.height??cap.lineHeight*factor};
  const notes=drawn.length?drawn:[first.findByType('span')];
  if(drawn.length)expect(drawn).toHaveLength(n);
  for(const note of notes){
    const st=note.props.style, oldHeight=Math.ceil(n/3)*st.lineHeight;
    const box={left:st.left??0,top:st.top??(actual-oldHeight)/2,width:st.width??actual,height:st.height??oldHeight};
    expect(intersects(box,captionBox)).toBe(false);
    expect(box.left).toBeGreaterThanOrEqual(Math.max(3,actual*.08)+1-1e-5);
    expect(box.left+box.width).toBeLessThanOrEqual(actual-Math.max(3,actual*.08)-1+1e-5);
    expect(box.top).toBeGreaterThanOrEqual(0);expect(box.top+box.height).toBeLessThanOrEqual(actual+1e-5);
    expect(st.fontSize).toBeGreaterThanOrEqual(Math.max(10,actual*.19));
    expect(note.props.maxFontSizeMultiplier).toBe(1);
  }
});

it.each([1,3.12])('plain Sudoku cells keep their original notes and geometry at scale %s',async scale=>{
 dims.fontScale=scale;
 const spec:GridSpec={rows:9,columns:9,symbols:['1','2','3','4','5','6','7','8','9'],givens:Array(81).fill(0),kind:'digits'};
 const state={...createGrid(spec),notes:Array(81).fill(511)};
 const render=(extra:object)=><GridShell spec={spec} state={state} dispatch={()=>{}} active width={378} {...extra}/>;
 await act(async()=>{screen=create(render({}));});
 const before=JSON.stringify(screen!.toJSON());
 const first=screen!.root.findAllByType('button').find(b=>b.props.accessibilityLabel?.startsWith('Row 1, column 1,'))!;
 expect(first.props.style.width).toBe(42);
 expect(first.findByType('span').props.style).toEqual({color:'#3D2B24',fontSize:8,lineHeight:10.5,fontVariant:['tabular-nums'],textAlign:'center'});
 await act(async()=>screen!.update(render({cornerClues:()=>new Map()})));
 expect(JSON.stringify(screen!.toJSON())).toEqual(before);
});

it.each([1,3.12].flatMap(scale=>[51,52].map(bank=>({scale,bank}))))('real Cage Math products in bank $bank reserve all notes at scale $scale',async ({scale,bank})=>{
 dims.fontScale=scale;
 const entries=readFileSync(`src/content/puzzles/assets/p${bank}.lipuzzle`,'utf8').trimEnd().split('\n').slice(1);
 const p=entries.map(line=>decodePuzzle(JSON.parse(line)[3])!).find(p=>p.cages.some(c=>c.op==='*'&&c.target>=1000))!;
 expect(p).toBeDefined();
 const anchor=Math.min(...p.cages.find(c=>c.op==='*'&&c.target>=1000)!.cells), n=p.size;
 const spec:GridSpec={rows:n,columns:n,kind:'digits',symbols:Array.from({length:n},(_,i)=>String(i+1)),givens:p.givens};
 const state={...createGrid(spec),notes:Array(n*n).fill((1<<n)-1)};
 await act(async()=>{screen=create(<GridShell spec={spec} state={state} dispatch={()=>{}} active width={n*36} cornerClues={clues.cageCorners(p)} overlay={clues.cageLayer(p,{labels:false})}/>);});
 const first=screen!.root.findAllByType('button').find(b=>b.props.accessibilityLabel?.startsWith('Row 1, column 1,'))!;
 const cell=first.props.style.width, cap=screen!.root.findAllByType('span').find(t=>t.props.testID===`corner-clue-${anchor}`)!.props.style;
 const box={...cap,left:cap.left-anchor%n*cell,top:cap.top-Math.floor(anchor/n)*cell};
 expect(box.left+box.width).toBeLessThanOrEqual(cell);
 const notes=screen!.root.findAllByType('span').filter(t=>t.props.testID?.startsWith(`corner-note-${anchor}-`));
 expect(notes).toHaveLength(n);
 for(const note of notes){expect(intersects(box,note.props.style)).toBe(false);expect(note.props.style.fontSize).toBeGreaterThanOrEqual(Math.max(10,cell*.19));}
});

it.each(['killer','cage-math','greater-than','sudoku'] as const)('wires the shared caption reservation for %s only when there are corner clues', async kind => {
 dims.fontScale=1;
 const n=4, spec:GridSpec={rows:n,columns:n,symbols:['1','2','3','4'],givens:Array(16).fill(0),kind:'digits'};
 const cages=kind==='killer'||kind==='cage-math'?[{cells:[0,1],op:'+' as const,target:5}]:[];
 const p:LatinPuzzle={kind,size:4,box:kind==='killer'||kind==='sudoku'?2:0,givens:[...spec.givens],cages,less:kind==='greater-than'?[[0,1]]:[],sights:[],mask:Array(16).fill(0)};
 const state={...createGrid(spec),notes:Array(16).fill(15)};
 await act(async()=>{screen=create(<LatinBoard view={{puzzle:p,state,spec,helps:0,resets:0,title:'Existing Latin board',teaches:'single'}} dispatch={()=>{}} active width={320}/>);});
 const grid=screen!.root.findByType(GridShell);
 if(cages.length){
   expect(grid.props.cornerClues).toBeTypeOf('function');
   expect(grid.props.cornerClues(80,1).size).toBe(1);
   expect(screen!.root.findAllByType('span').filter(s=>s.props.testID==='corner-clue-0')).toHaveLength(1);
   expect(screen!.root.findAllByType('span').filter(s=>s.children.join('')==='5+')).toHaveLength(1);
 }else expect(grid.props.cornerClues).toBeUndefined();
});
