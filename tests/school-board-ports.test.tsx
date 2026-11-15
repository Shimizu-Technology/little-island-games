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
import { Board as B13 } from '../src/learn/games/tide-logic/view';


import { BoardSpaceContent, BoardSpaceProvider } from '../src/learn/BoardSpace';

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
  };
});
vi.mock('react-native-svg', () => Object.fromEntries(['Circle', 'ClipPath', 'Defs', 'Ellipse', 'FeColorMatrix', 'Filter', 'G', 'Line', 'LinearGradient', 'Path', 'Pattern', 'Polygon', 'Polyline', 'RadialGradient', 'Rect', 'Stop', 'SvgXml', 'Text', 'TSpan'].map(k => [k, `Svg${k}`]).concat([['default', 'Svg']])));
vi.mock('../src/components/motion', () => ({ easeInOut: () => 0, easeOut: () => 0, nativeDriver: false, useReducedMotion: () => true }));
vi.mock('../src/learn/Coach', () => ({ CoachSpot: ({ children }: { children: React.ReactNode }) => children }));
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
let root: ReactTestRenderer | undefined;
afterEach(async () => { if(root) await act(async()=>root!.unmount()); root=undefined; frames.clear(); vi.unstubAllGlobals(); });
async function mountPort(id: LearnId, Board: React.ElementType, available=472) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  vi.stubGlobal('requestAnimationFrame',(f:FrameRequestCallback)=>{frames.set(++next,f);return next;});
  vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
  Object.assign(viewport,{width:393,height:852,fontScale:1});
  const session=startSession(id,{options:optionsAtLevel({mode:'solo',pace:'easy'},1)},{},7);
  const props={session,update:vi.fn(),practice:vi.fn(),assistance:vi.fn(),skills:{},sound:vi.fn(),stopSound:vi.fn(),soundOn:false,width:333,height:759,active:true,coach:{active:false,done:vi.fn()},cheer:vi.fn()};
  await act(async()=>{root=create(<BoardSpaceProvider space={{width:333,height:available,large:false}}><BoardSpaceContent testID="content"><TextFit.Provider value={null}><Board {...props}/></TextFit.Provider></BoardSpaceContent></BoardSpaceProvider>);});
  return root!;
}
const flat=(s:unknown):Record<string,unknown>=>Array.isArray(s)?Object.assign({},...s.map(flat)):s&&typeof s==='object'?s as Record<string,unknown>:{};
const view=(id:string)=>root!.root.findAll(n=>String(n.type)==='View'&&n.props.testID===id)[0];
it('Weather keeps the three default clothes choices in one full-size row in measured phone space',async()=>{
 const r=await mountPort('weather-watch',B7);
 const choices=r.root.findAll(n=>String(n.type)==='PressableScale'&&n.props.accessibilityLabel?.startsWith('Set '));
 expect(choices).toHaveLength(3);
 for(const choice of choices){expect(flat(choice.props.style).flexBasis).toBe('29%');expect(flat(choice.props.style).minHeight).toBeGreaterThanOrEqual(44);}
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
 expect(glyphs[0].props.width).toBe(43);
});
