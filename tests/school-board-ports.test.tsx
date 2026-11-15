/** Native-follow-up regressions: default phone spacing and measured cargo chrome. */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { TextFit } from '../src/components/Text';
import { startSession } from '../src/learn/session';
import { optionsAtLevel } from '../src/learn/levels';
import type { LearnId } from '../src/learn/types';
import { Board as B7 } from '../src/learn/games/weather-watch/view';
import { Board as B8 } from '../src/learn/games/treasure-algebra/view';
import { Board as B1 } from '../src/learn/games/crab-commands/view';
import { Board as B2 } from '../src/learn/games/beep-bot/view';
import { Board as B3 } from '../src/learn/games/hafa-adai/view';
import { Board as B4 } from '../src/learn/games/reef-race/view';
import { Board as B5 } from '../src/learn/games/shell-math/view';
import { Board as B6 } from '../src/learn/games/tide-pool/view';
import { Art as FloatArt, Board as B9 } from '../src/learn/games/float-sink/view';
import { Board as B10 } from '../src/learn/games/logic-lagoon/view';
import { SchoolBoard as B11 } from '../src/learn/games/slip-tide/schoolBoard';
import { ProgramEditor } from '../src/learn/program/ProgramEditor';
import { Board as B13 } from '../src/learn/games/tide-logic/view';


import { BoardPrimary, BoardSpaceContent, BoardSpaceProvider } from '../src/learn/BoardSpace';

vi.mock('../src/components/feel',()=>({feel:()=>{}}));
vi.mock('expo-router',()=>({router:{push:vi.fn()}}));
vi.mock('../src/content/learnAudio',()=>({learnSources:{'beep-bot-intro':1}}));
vi.mock('../src/state/Store',()=>({useStore:()=>({save:{learning:{active:'a',people:[{id:'a',name:'A'}]},settings:{}}})}));
const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 3.12 }));
vi.mock('react-native', () => {
  class Value { v: number; constructor(v: number) { this.v = v; } setValue(v: number) { this.v = v; } stopAnimation() {} interpolate() { return new Value(0); } }
  class ValueXY { x = new Value(0); y = new Value(0); setValue() {} }
  const animation = { start: (done?: () => void) => done?.(), stop: () => {} };
  const flatten = (s: unknown): Record<string, unknown> => Array.isArray(s) ? Object.assign({}, ...s.map(flatten)) : s && typeof s === 'object' ? s as Record<string, unknown> : {};
  return {
    View: 'View', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable',
    Platform: { OS: 'ios', select: (o: Record<string, unknown>) => o.ios ?? o.default },
    StyleSheet: { flatten, create: (s: unknown) => s },
    Animated: { View: 'View', add: () => new Value(0), multiply: () => new Value(0), Value, ValueXY, timing: () => animation, sequence: () => animation, loop: () => animation, spring: () => animation, delay: () => animation, parallel: () => animation },
    AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
    useWindowDimensions: () => viewport,
    Easing: { linear:()=>0,bezier:()=>()=>0,out:()=>0,inOut:()=>0,quad:()=>0 },
  };
});
vi.mock('react-native-svg', () => Object.fromEntries(['Circle', 'ClipPath', 'Defs', 'Ellipse', 'FeColorMatrix', 'Filter', 'G', 'Line', 'LinearGradient', 'Path', 'Pattern', 'Polygon', 'Polyline', 'RadialGradient', 'Rect', 'Stop', 'SvgXml', 'Text', 'TSpan'].map(k => [k, `Svg${k}`]).concat([['default', 'Svg']])));
vi.mock('../src/learn/program/PaletteDrag', () => ({ PaletteDrag: ({children}: {children:React.ReactNode}) => children }));
vi.mock('react-native-gesture-handler',()=>({GestureDetector:'GestureDetector',Gesture:{Pan:()=>{const g:Record<string,()=>unknown>={};for(const k of ['enabled','maxPointers','minDistance','onBegin','onUpdate','onFinalize'])g[k]=()=>g;return g;}}}));
vi.mock('react-native-reanimated',()=>({default:{View:'AnimatedView'},Easing:{out:()=>0,inOut:()=>0,quad:0,bezier:()=>0},runOnJS:(x:unknown)=>x,useSharedValue:(v:unknown)=>({get:()=>v,set:()=>{}}),useAnimatedStyle:(f:()=>unknown)=>f(),cancelAnimation:()=>{},withTiming:(v:unknown)=>v,withSpring:(v:unknown)=>v,withSequence:(...v:unknown[])=>v.at(-1),withRepeat:(v:unknown)=>v}));
vi.mock('../src/components/motion', () => ({ easeInOut: () => 0, easeOut: () => 0, nativeDriver: false, useReducedMotion: () => true }));
vi.mock('../src/learn/Coach', () => ({ Hand:'Hand', CoachSpot: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../src/learn/games/slip-tide/art',()=>({Arrow:'Arrow',CrabSprite:'CrabSprite',HomeEyes:'HomeEyes',LagoonArt:'LagoonArt',PoolBadge:'PoolBadge'}));
vi.mock('../src/components/Icon', () => ({ Icon: 'Icon' }));
vi.mock('../src/components/GameIcon', () => ({ GameIcon: 'GameIcon' }));
vi.mock('../src/learn/kit/ReadingText', () => ({ ReadingText: 'ReadingText' }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: React.createContext({}), useSoundControls: () => ({ play: () => {}, stop: () => {} }) }));
vi.mock('../src/islander/active', async () => { const { defaultLook } = await import('../src/islander/look'); return { useActiveIslanderLook: () => defaultLook }; });
// The shared controls draw their words through the real Text, so the board's text region reaches them.
vi.mock('../src/components/ui', async () => {
  const { Text } = await import('../src/components/Text');
  type P = { children?: React.ReactNode; style?: object; maxFontSizeMultiplier?: number; numberOfLines?: number; label?: string; onPress?: () => void; disabled?: boolean; testID?: string };
  return {
    C: new Proxy({}, { get: () => '#183F39' }), font: 'Avenir Next', styles: { row: { flexDirection: 'row' }, page: {}, content: {} },
    Copy: ({ children, style, ...p }: P) => <Text {...p} style={[{ fontSize: 16, lineHeight: 25 }, style]}>{children}</Text>,
    Heading: ({ children, style, maxFontSizeMultiplier }: P) => <Text accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier} style={[{ fontSize: 32 }, style]}>{children}</Text>,
    Button: ({ children, style, maxFontSizeMultiplier, label, onPress, disabled, numberOfLines }: P) => <Pressable role="button" label={label} onPress={onPress} disabled={disabled} style={style}><Text maxFontSizeMultiplier={maxFontSizeMultiplier} numberOfLines={numberOfLines} style={{ fontSize: 15 }}>{children}</Text></Pressable>,
    Chip: ({ children }: P) => <Pressable role="chip"><Text style={{ fontSize: 15 }}>{children}</Text></Pressable>,
    IconButton: 'IconButton', PressableScale: 'PressableScale',
  };
});
const Pressable = 'Pressable' as unknown as React.ComponentType<Record<string, unknown>>;
const frames = new Map<number, FrameRequestCallback>(); let next = 0;
let boundary={y:0,height:500}, rowBox={y:0,height:500};
let root: ReactTestRenderer | undefined;
afterEach(async () => { if(root) await act(async()=>root!.unmount()); root=undefined; frames.clear(); vi.unstubAllGlobals(); });
async function mountPort(id: LearnId, Board: React.ElementType, available=472, window={width:393,height:852,fontScale:1}) {
  boundary={y:0,height:500};rowBox={y:0,height:500};
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  vi.stubGlobal('requestAnimationFrame',(f:FrameRequestCallback)=>{frames.set(++next,f);return next;});
  vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
  Object.assign(viewport,window);
  const session=startSession(id,{options:optionsAtLevel({mode:'solo',pace:'easy'},1)},{},7);
  const props={session,update:vi.fn(),practice:vi.fn(),assistance:vi.fn(),skills:{},sound:vi.fn(),stopSound:vi.fn(),soundOn:false,width:window.width-60,height:window.height-93,active:true,coach:{active:false,done:vi.fn()},cheer:vi.fn()};
  await act(async()=>{root=create(<BoardSpaceProvider space={{width:window.width-60,height:available,large:window.fontScale>=1.5}}><BoardSpaceContent testID="content"><TextFit.Provider value={null}><Board {...props}/></TextFit.Provider></BoardSpaceContent></BoardSpaceProvider>,{createNodeMock:element=>({measureLayout:(_:unknown,done:(x:number,y:number,w:number,h:number)=>void)=>done(0,['school-drawing-row','slip-side'].includes((element.props as {testID:string}).testID)?rowBox.y:boundary.y,333,['school-drawing-row','slip-side'].includes((element.props as {testID:string}).testID)?rowBox.height:boundary.height),scrollTo:vi.fn(),measureInWindow:()=>{}})});});
  return root!;
}
const flat=(s:unknown):Record<string,unknown>=>Array.isArray(s)?Object.assign({},...s.map(flat)):s&&typeof s==='object'?s as Record<string,unknown>:{};
const view=(id:string)=>root!.root.findAll(n=>String(n.type)==='View'&&n.props.testID===id)[0];
it('Weather keeps the three default clothes choices in one full-size row in measured phone space',async()=>{
 const r=await mountPort('weather-watch',B7);
 const choices=r.root.findAll(n=>String(n.type)==='PressableScale'&&n.props.accessibilityLabel?.startsWith('Set '));
 expect(choices).toHaveLength(3);
 expect(flat(choices[0].parent!.props.style).flexWrap).toBe('nowrap');
 for(const choice of choices){expect(flat(choice.props.style)).toMatchObject({flexBasis:'29%',flexShrink:1,minWidth:0});expect(flat(choice.props.style).minHeight).toBeGreaterThanOrEqual(44);}
});
it('Treasure retains 48 by 52 step targets while tightening only the surrounding phone spacing',async()=>{
 const r=await mountPort('treasure-algebra',B8);
 const container=r.root.findAll(n=>String(n.type)==='View'&&flat(n.props.style).paddingBottom===20)[0];
 expect(flat(container.props.style).gap).toBe(8);
 const step=r.root.findAll(n=>String(n.type)==='PressableScale'&&n.props.accessibilityLabel==='Subtract 10 steps')[0];
 expect(flat(step.props.style)).toMatchObject({width:48,minHeight:52});
});
it('Tide Logic reserves the measured cargo labels and row gaps rather than treating them as shrinkable art',async()=>{
 const r=await mountPort('tide-logic',B13,600);
 // A two-row native fixture: 128 pt of art and 61 pt of labels, padding and row gaps.
 // The other fixed controls take 453 pt. Only 147 pt remain for the cargo region.
 await act(async()=>{
  view('content').props.onLayout({nativeEvent:{layout:{height:642}}});
  view('school-tide-logic-drawing').props.onLayout({nativeEvent:{layout:{height:189}}});
  const queue=[...frames.values()];frames.clear();queue.forEach(f=>f(0));
 });
 const glyphs=r.root.findAll(n=>String(n.type)==='Svg'&&n.props.accessibilityLabel?.startsWith('big '));
 expect(glyphs.length).toBeGreaterThan(0);
 expect(glyphs[0].props.width * 49 / 64).toBeGreaterThanOrEqual(56);
});

const realComponent=(name:string)=>root!.root.findAll(n=>typeof n.type==='function'&&n.type.name===name)[0];
function renderedDrawingHeight(id:LearnId):number {
 const drawing=view(`school-${id}-drawing`), component=(name:string)=>drawing.findAll(n=>typeof n.type==='function'&&n.type.name===name)[0];
 if(id==='crab-commands')return component('Beach').props.size;
 if(id==='beep-bot')return component('Grid').props.size;
 if(id==='hafa-adai'){const p=component('Picnic').props;return p.rows*p.rowHeight+44;}
 if(id==='reef-race')return component('ReefBoard').props.height;
 if(id==='weather-watch')return drawing.findAll(n=>String(n.type)==='Svg')[0].props.height;
 if(id==='shell-math')return 2*component('TenFrame').props.cell+16;
 if(id==='tide-logic')return Math.max(...drawing.findAll(n=>typeof n.type==='function'&&n.type.name==='Cargo').map(n=>Number(n.props.size)))*2;
 if(id==='logic-lagoon'){const cells=drawing.findAll(n=>String(n.type)==='PressableScale');return Math.sqrt(cells.length)*(Number(flat(cells[0].props.style).height)+2)+14;}
 if(id==='slip-tide')return Number(flat(drawing.findAll(n=>n.props.accessibilityRole==='image')[0].props.style).height);
 return Number(flat(drawing.props.style).height);
}
const ports: [LearnId,React.ElementType][] = [['crab-commands',B1],['beep-bot',B2],['hafa-adai',B3],['reef-race',B4],['weather-watch',B7],['shell-math',B5],['tide-pool',B6],['float-sink',B9],['tide-logic',B13],['logic-lagoon',B10],['slip-tide',B11],['treasure-algebra',B8]];
const configurations = [[393,852],[375,667],[744,1133],[1133,744],[852,393]];
it.each(ports)('%s renders its actual drawing, primary boundary and touch targets in each measured window',async(id,Board)=>{
 for(const [width,height] of configurations)for(const fontScale of [1,3.12]){
  boundary={y:0,height:500};rowBox={y:0,height:500};
  const available=height-160, r=await mountPort(id,Board,available,{width,height,fontScale});
  const drawings=r.root.findAll(n=>String(n.type)==='View'&&n.props.testID===`school-${id}-drawing`);
  expect(drawings.length).toBeGreaterThan(0);
  expect(drawings[0].props.onLayout).toBeTypeOf('function');
  expect(r.root.findAll(n=>String(n.type)==='View'&&n.props.testID==='school-primary').length).toBe(1);
  const columns=r.root.findAll(n=>String(n.type)==='View'&&['school-drawing-row','slip-side'].includes(n.props.testID));
  expect(columns.length).toBe(width>height || id==='treasure-algebra'&&width-60>=304&&width-60<600?1:0);
  const natural=renderedDrawingHeight(id), reserve=fontScale>=1.5?264:176;
  const side=columns.length>0;
  // Mock a native layout pass, including the row's *actual* max-of-columns
  // shape. The inputs are synthetic controls, while the drawing and its
  // response are read from each real board component, not supplied to fit().
  rowBox={y:reserve,height:Math.max(natural,320)};
  boundary={y:0,height:side?reserve+rowBox.height:natural+reserve};
  await act(async()=>{
   view('content').props.onLayout({nativeEvent:{layout:{height:boundary.height+200}}});
   drawings[0].props.onLayout({nativeEvent:{layout:{height:natural}}});
   const queue=[...frames.values()];frames.clear();queue.forEach(f=>f(0));
  });
  const actual=renderedDrawingHeight(id);
  if(actual+reserve>available){
   // A physical limit must keep content at its declared legibility/touch
   // floor. These assertions inspect the rendered input, not a test constant.
   if(id==='hafa-adai')expect(realComponent('WordPicture').props.size).toBe(width-60>=600?64:56);
   else if(id==='tide-logic')expect(realComponent('Cargo').props.size).toBeGreaterThanOrEqual(width-60>=600?64:56);
   else if(id==='shell-math')expect(realComponent('TenFrame').props.cell).toBeGreaterThanOrEqual(24);
   else expect(actual).toBe(({ 'crab-commands':150,'beep-bot':160,'reef-race':260,'weather-watch':150,'tide-pool':90,'float-sink':width-60>=600?138:120,'logic-lagoon':106,'slip-tide':156,'treasure-algebra':250 } as Partial<Record<LearnId,number>>)[id]);
  }else expect(actual+reserve).toBeLessThanOrEqual(available);
  const target=drawings[0].findAll(n=>String(n.type)==='PressableScale'&&n.props.accessibilityRole==='button');
  for(const t of target){const s=flat(t.props.style);if(typeof s.width==='number')expect(s.width).toBeGreaterThanOrEqual(44);if(typeof s.height==='number')expect(s.height).toBeGreaterThanOrEqual(44);}

  await act(async()=>r.unmount());root=undefined;
 }
});
it.each([1,3.12])('K7 at text scale %s preserves its base allocation, two plan rows and the visible command palette',async fontScale=>{
 for(const [width,height] of configurations){
  Object.assign(viewport,{width,height,fontScale});
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('requestAnimationFrame',(f:FrameRequestCallback)=>{frames.set(++next,f);return next;});vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
  const editor=<ProgramEditor schoolGeometry program={{version:1,body:[{kind:'repeat',times:2,body:[{kind:'command',command:0}]}],songs:[]}} cards={[{code:0,name:'Right',icon:null}]} onChange={()=>true} disabled={false} hear={()=>{}} maxHeight={Math.max(180,Math.min(340,height-493))}/>;
  await act(async()=>{root=create(<BoardSpaceProvider space={{width:width-60,height:height-160,large:fontScale>=1.5}}><BoardSpaceContent testID="editor-content"><BoardPrimary>{editor}</BoardPrimary></BoardSpaceContent></BoardSpaceProvider>,{createNodeMock:()=>({measureLayout:(_:unknown,done:(x:number,y:number,w:number,h:number)=>void)=>done(0,0,333,1000)})});});
  await act(async()=>{view('editor-content').props.onLayout({nativeEvent:{layout:{height:1000}}});view('program-editor').props.onLayout({nativeEvent:{layout:{height:Math.max(180,Math.min(340,height-493))}}});const q=[...frames.values()];frames.clear();q.forEach(f=>f(0));});
  const allocation=flat(view('program-editor').props.style).maxHeight as number;
  expect(allocation).toBeGreaterThanOrEqual(Math.max(180,Math.min(340,height-493)));
  const plan=root!.root.findAll(n=>String(n.type)==='ScrollView'&&n.props.accessibilityLabel==='Nested program cards')[0];
  expect(flat(plan.props.style).height).toBe(fontScale>=1.5?120:140);
  const tools=root!.root.findAll(n=>String(n.type)==='ScrollView'&&n.props.accessibilityLabel==='Block tools')[0];
  expect(flat(tools.props.style).minHeight).toBeGreaterThanOrEqual(112);
  expect(String(tools.children[0] && typeof tools.children[0]!=='string' && tools.children[0].type)).toBe('View');
  await act(async()=>root!.unmount());root=undefined;
 }
});
it('Treasure number-line labels retain their actual point size under a tight measured allocation',async()=>{
 await mountPort('treasure-algebra',B8,280,{width:393,height:852,fontScale:3.12});
 const drawing=view('school-treasure-algebra-drawing');
 await act(async()=>{drawing.props.onLayout({nativeEvent:{layout:{height:330}}});const q=[...frames.values()];frames.clear();q.forEach(f=>f(0));});
 const svg=drawing.findAll(n=>String(n.type)==='Svg')[0];
 const labels=svg.findAll(n=>String(n.type)==='SvgText');
 expect(labels.length).toBeGreaterThan(5);expect(labels.every(n=>Number(n.props.fontSize)>=13*1.5)).toBe(true);
});
it('Håfa Adai picture inputs remain at least 56 pt on phone and 64 pt on iPad',async()=>{
 for(const width of [393,744]){
  const r=await mountPort('hafa-adai',B3,150,{width,height:852,fontScale:1});
  await act(async()=>{view('content').props.onLayout({nativeEvent:{layout:{height:700}}});view('school-hafa-adai-drawing').props.onLayout({nativeEvent:{layout:{height:300}}});const q=[...frames.values()];frames.clear();q.forEach(f=>f(0));});
  const pictures=r.root.findAll(n=>typeof n.type==='function'&&n.type.name==='WordPicture');
  expect(pictures.length).toBeGreaterThan(0);expect(pictures.every(n=>n.props.size >= (width>=600?64:56))).toBe(true);
  await act(async()=>r.unmount());root=undefined;
 }
});
it('Float/Sink clips the scaled contents inside the actual tank',async()=>{
 await mountPort('float-sink',B9,200);
 expect(flat(view('school-float-sink-drawing').props.style).overflow).toBe('hidden');
 expect(flat(view('water-contents').props.style).transformOrigin).toBe('top');
});

it('the actual Crab plan exposes hidden cards, follows running/bumped cards and announces the cue',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{});
 Object.assign(viewport,{width:393,height:852,fontScale:1});
 const session=startSession('crab-commands',{options:optionsAtLevel({mode:'solo',pace:'easy'},1)},{},7);
 const base={...session,state:{...(session.state as Record<string,unknown>),program:Array.from({length:32},()=> 'right'),cursor:0,running:false}};
 const scrolls:{y:number;animated:boolean}[]=[];
 const render=(cursor:number,running:boolean)=><BoardSpaceProvider space={{width:333,height:500,large:false}}><BoardSpaceContent><B1 session={{...base,state:{...base.state,cursor,running}} as never} update={vi.fn()} practice={vi.fn()} assistance={vi.fn()} skills={{}} sound={vi.fn()} stopSound={vi.fn()} soundOn={false} width={333} height={759} active coach={{active:false,done:vi.fn()}} cheer={vi.fn()}/></BoardSpaceContent></BoardSpaceProvider>;
 await act(async()=>{root=create(render(0,false),{createNodeMock:()=>({scrollTo:(o:{y:number;animated:boolean})=>scrolls.push(o)})});});
 const strip=root!.root.findAll(n=>String(n.type)==='ScrollView'&&n.props.accessibilityLabel==='Your plan cards')[0];
 const cards=strip.findAll(n=>String(n.type)==='PressableScale'&&n.props.accessibilityLabel?.startsWith('Card '));
 expect(cards).toHaveLength(32);
 await act(async()=>{
  strip.props.onLayout({nativeEvent:{layout:{height:192}}});strip.props.onContentSizeChange(333,381);
  cards.forEach((c,i)=>c.props.onLayout({nativeEvent:{layout:{y:4+Math.floor(i/6)*63,height:58,width:44}}}));
 });
 expect(view('plan-more-below')).toBeUndefined(); // cue is Copy/Text, not a layout View
 const cue=root!.root.findAll(n=>n.props.testID==='plan-more-below'&&String(n.type)==='Text')[0];
 expect(cue.props.accessibilityLabel).toBe('14 more cards below. Scroll down.');
 await act(async()=>root!.update(render(25,true)));
 expect(scrolls.at(-1)).toEqual({y:126,animated:false});
 await act(async()=>strip.props.onScroll({nativeEvent:{contentOffset:{y:126}}}));
 expect(root!.root.findAll(n=>n.props.testID==='plan-more-above').length).toBeGreaterThan(0);
});
it('Slip Tide does not shrink its drawing to pay for a taller sibling column',async()=>{
 await mountPort('slip-tide',B11,500,{width:852,height:393,fontScale:1});
 const drawing=view('school-slip-tide-drawing');
 const drawn=()=>drawing.findAll(n=>String(n.type)==='View'&&typeof flat(n.props.style).height==='number').map(n=>Number(flat(n.props.style).height)).sort((a,b)=>b-a)[0];
 const before=drawn();
 await act(async()=>{
  view('content').props.onLayout({nativeEvent:{layout:{height:700}}});drawing.props.onLayout({nativeEvent:{layout:{height:before}}});
  const q=[...frames.values()];frames.clear();q.forEach(f=>f(0));
 });
 expect(drawn()).toBe(before);
});

it('Float/Sink header art keeps its original aspect ratio outside the measured host',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 await act(async()=>{root=create(<FloatArt size={70}/>);});
 expect(flat(view('water-contents').props.style).transform).toEqual([{scaleY:1}]);
});
it('ProgramEditor leaves Turtle and other unported hosts at their original allocation',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{});
 await act(async()=>{root=create(<BoardSpaceProvider space={{width:333,height:100,large:false}}><BoardSpaceContent><ProgramEditor program={{version:1,body:[],songs:[]}} cards={[]} onChange={()=>true} disabled={false} hear={()=>{}} maxHeight={180}/></BoardSpaceContent></BoardSpaceProvider>);});
 expect(view('program-editor').props.onLayout).toBeUndefined();expect(flat(view('program-editor').props.style).maxHeight).toBe(180);
 const tools=root!.root.findAll(n=>String(n.type)==='ScrollView'&&n.props.accessibilityLabel==='Block tools')[0];
 expect(flat(tools.props.style).minHeight).toBeUndefined();
});
