/** S1a: the K6 board as rendered for Star Station: steps, hidden results, the star rule, measured space and K8 dispatch. */
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { TextFit } from '../src/components/Text';
import { startSession } from '../src/learn/session';
import { optionsAtLevel, type LearningLevel } from '../src/learn/levels';
import type { LearnSession } from '../src/learn/types';
import { Board } from '../src/learn/games/space-station/view';
import { legacyEngine } from '../src/learn/games/space-station/engine';
import { investigations } from '../src/learn/games/space-station/investigations';
import { replay, solve, type InquiryState } from '../src/learn/inquiry/engine';
import { BoardSpaceContent, BoardSpaceProvider } from '../src/learn/BoardSpace';

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
vi.mock('../src/components/Audio', () => ({ hasSpeech: () => false, AudioPreferences: React.createContext({}), useSoundControls: () => ({ play: () => {}, stop: () => {} }) }));
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
let root: ReactTestRenderer | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.unstubAllGlobals(); });

type Props = { session: LearnSession; update: ReturnType<typeof vi.fn>; practice: ReturnType<typeof vi.fn>; assistance: ReturnType<typeof vi.fn> };
async function mount(level: LearningLevel, window = { width: 393, height: 852, fontScale: 1 }, prepare?: (s: LearnSession) => LearnSession) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  Object.assign(viewport, window);
  let session = startSession('space-station', { options: optionsAtLevel({ mode: 'solo', pace: 'easy' }, level) }, {}, 7);
  if (prepare) session = prepare(session);
  const props = { session, update: vi.fn(), practice: vi.fn(), assistance: vi.fn(), skills: {}, sound: vi.fn(), stopSound: vi.fn(), soundOn: false, width: window.width - 60, height: window.height - 93, active: true, coach: { active: false, done: vi.fn() }, cheer: vi.fn() };
  const tree = (p: typeof props) => <BoardSpaceProvider geometryEnabled space={{ width: window.width - 60, height: 600, large: window.fontScale >= 1.5 }}><BoardSpaceContent testID="content"><TextFit.Provider value={null}><Board {...(p as unknown as React.ComponentProps<typeof Board>)} /></TextFit.Provider></BoardSpaceContent></BoardSpaceProvider>;
  await act(async () => { root = create(tree(props), { createNodeMock: () => ({ measureLayout: () => {}, scrollTo: () => {}, measureInWindow: () => {} }) }); });
  /** Feeds the last update back in, as the frame does. */
  const settle = async () => {
    const last = props.update.mock.calls.at(-1)?.[0];
    if (last) { props.session = { ...props.session, state: last }; await act(async () => root!.update(tree(props))); }
  };
  return { props: props as unknown as Props & typeof props, settle };
}
const texts = () => root!.root.findAll(n => String(n.type) === 'Text').map(n => n.children.map(String).join(''));
const button = (label: string) => root!.root.findAll(n => String(n.type) === 'Pressable' && n.props.role === 'button' && n.findAll(t => String(t.type) === 'Text' && t.children.map(String).join('') === label).length > 0)[0];
const tile = (label: string): ReactTestInstance => root!.root.findAll(n => String(n.type) === 'PressableScale' && n.props.accessibilityLabel === label)[0];
const press = async (node: ReactTestInstance | undefined, settle: () => Promise<void>) => { expect(node).toBeTruthy(); await act(async () => node!.props.onPress()); await settle(); };

it('a fresh round is a measured K6 board whose result stays hidden until Test', async () => {
  const { props } = await mount(1, { width: 393, height: 852, fontScale: 3.12 });
  expect(root!.root.findAll(n => String(n.type) === 'View' && n.props.testID === 'school-space-station-drawing')).toHaveLength(1);
  const s = props.session.state as InquiryState, q = investigations(1, s.seed)[0];
  const svg = root!.root.findAll(n => String(n.type) === 'Svg')[0];
  expect(svg.props.accessibilityLabel).toContain('Result hidden until you test.');
  expect(texts().join(' ')).not.toContain(q.observe(q.start).reading);
  expect(button('Test the model').props.disabled).toBe(true);
  expect(texts()).toContain('Illustrative model');
  // Test sits inside the measured primary boundary, so the drawing gives way before it leaves the screen.
  const primary = root!.root.findAll(n => String(n.type) === 'View' && n.props.testID === 'school-primary')[0];
  expect(primary.findAll(n => n === button('Test the model'))).toHaveLength(1);
});

it('predict → test → explain → next, with one helped mark for the first hint or miss', async () => {
  const { props, settle } = await mount(1);
  const s = props.session.state as InquiryState, qs = investigations(1, s.seed), q = qs[0];
  const right = q.observe(q.start).outcome, wrongReason = (q.explain.answer + 1) % 3;
  await press(tile(`Predict: ${q.outcomes[right]}`), settle);
  expect(button('Test the model').props.disabled).toBe(false);
  await press(button('Test the model'), settle);
  expect(texts()).toContain('Your prediction matched the model!');
  expect(texts()).toContain(q.observe(q.start).reading);
  expect(props.assistance).not.toHaveBeenCalled();
  await press(tile(`Reason: ${q.explain.choices[wrongReason]}`), settle);
  expect(props.practice).toHaveBeenLastCalledWith('sci.space-station', false);
  expect(props.assistance).toHaveBeenCalledTimes(1);
  expect(tile(`Reason: ${q.explain.choices[wrongReason]}`).props.disabled).toBe(true);
  await press(tile(`Reason: ${q.explain.choices[q.explain.answer]}`), settle);
  expect(props.practice).toHaveBeenLastCalledWith('sci.space-station', true);
  expect(texts()).toContain(q.rule);
  await press(button('Hint'), settle); // a hint on a finished step is refused
  await press(button('Next investigation'), settle);
  expect((props.session.state as InquiryState).index).toBe(1);
  await press(button('Hint'), settle);
  expect(props.assistance).toHaveBeenCalledTimes(1); // already helped; the frame keeps one mark
  expect(texts()).toContain(qs[1].clue);
});

it('a surprising first prediction is forgiven at Level 1 but marks the round helped at Level 4', async () => {
  for (const level of [1, 4] as const) {
    const { props, settle } = await mount(level);
    const s = props.session.state as InquiryState, q = investigations(level, s.seed)[0];
    const miss = (q.observe(q.start).outcome + 1) % q.outcomes.length;
    await press(tile(`Predict: ${q.outcomes[miss]}`), settle);
    await press(button('Test the model'), settle);
    expect(texts()).toContain('Surprise!');
    expect(props.assistance).toHaveBeenCalledTimes(level === 4 ? 1 : 0);
    await act(async () => root!.unmount()); root = undefined;
  }
});

it('a reach plan that misses asks for a new plan; Undo restores an untested setting', async () => {
  const { props, settle } = await mount(4, { width: 393, height: 852, fontScale: 1 }, session => {
    const s = session.state as InquiryState, qs = investigations(4, s.seed);
    // Skip to the fair test, as a child would after the first investigation.
    let state = s; const q = qs[0];
    state = { ...state, guess: q.observe(q.start).outcome };
    state = { ...state, history: [['t', state.guess, ...q.start], ['e', q.explain.answer], ['x']], index: 1, draft: [...qs[1].start], guess: -1 };
    return { ...session, state };
  });
  const s = props.session.state as InquiryState, q = investigations(4, s.seed)[1];
  expect(replay(investigations(4, s.seed), s.history)!.index).toBe(1);
  await press(button('Test my plan'), settle);
  expect(texts()).toContain('Not yet');
  await press(button('Change my plan'), settle);
  expect(button('Test my plan').props.disabled).toBe(true); // that setup was tested
  const heavier = q.controls[0].options[(q.start[0] + 1) % 5];
  await press(tile(`Set Mass (kg): ${heavier}`), settle);
  expect(button('Test my plan').props.disabled).toBe(false);
  await press(button('Undo'), settle);
  expect((props.session.state as InquiryState).draft).toEqual(q.start);
});

it('a saved version-1 round resumes on its own shared science board (K8)', async () => {
  await mount(5, { width: 393, height: 852, fontScale: 1 }, session => ({ ...session, state: legacyEngine.create(session.options, { skills: {}, rng: () => .4, starter: 0, today: 0 }) }));
  expect(button('Test model')).toBeTruthy();
  expect(root!.root.findAll(n => String(n.type) === 'View' && n.props.testID === 'school-space-station-drawing')).toHaveLength(0);
  expect(root!.root.findAll(n => String(n.type) === 'View' && n.props.testID === 'school-weather-watch-drawing')).toHaveLength(0);
});

it.each([1, 2, 3, 4, 5] as const)('level %i renders every investigation without broken numbers at phone and iPad, default and AX5', async level => {
  for (const window of [{ width: 393, height: 852, fontScale: 1 }, { width: 393, height: 852, fontScale: 3.12 }, { width: 744, height: 1133, fontScale: 3.12 }]) {
    const { props, settle } = await mount(level, window);
    const qs = investigations(level, (props.session.state as InquiryState).seed);
    for (const q of qs) {
      const json = JSON.stringify(root!.toJSON());
      expect(json).not.toMatch(/NaN|undefined|Infinity/);
      if (q.kind === 'observe') await press(tile(`Predict: ${q.outcomes[q.observe(q.start).outcome]}`), settle);
      else {
        const target = solve(q)!;
        for (const [c, v] of target.entries()) if (!q.controls[c].fixed && v !== (props.session.state as InquiryState).draft[c]) await press(tile(`Set ${q.controls[c].name}: ${q.controls[c].options[v]}`), settle);
      }
      await press(button(q.kind === 'observe' ? 'Test the model' : 'Test my plan'), settle);
      expect(JSON.stringify(root!.toJSON())).not.toMatch(/NaN|Infinity/);
      await press(tile(`Reason: ${q.explain.choices[q.explain.answer]}`), settle);
      await press(button(q === qs[qs.length - 1] ? 'Finish' : 'Next investigation'), settle);
    }
    expect(texts()).toContain('Your investigation journal is complete!');
    expect(props.assistance).not.toHaveBeenCalled();
    await act(async () => root!.unmount()); root = undefined;
  }
});

// Found natively: SVG labels were drawn in viewBox units, so a 140-pt scene shrank them to about 9 pt. The board now
// divides by the scene's scale; labels reach the School floor (13 pt, 19.5 at AX) unless a reading must fit its box.
it.each([1, 2, 3, 4, 5] as const)('level %i scene labels reach the School label floor at phone default and AX5', async level => {
  for (const window of [{ width: 393, height: 852, fontScale: 1 }, { width: 393, height: 852, fontScale: 3.12 }]) {
    await mount(level, window);
    const svg = root!.root.findAll(n => String(n.type) === 'Svg')[0];
    const scale = Math.min(svg.props.height / 210, (window.width - 60 - 12) / 360), floor = window.fontScale >= 1.5 ? 19.5 : 13;
    const labels = svg.findAll(n => String(n.type) === 'SvgText');
    if (level > 1) expect(labels.length).toBeGreaterThan(0); // Level 1 shows its labels only after Test.
    for (const label of labels) {
      const words = String(label.props.children), size = label.props.fontSize * scale;
      // A label below the floor only ever shrank to fit the room it was given (`room / (length × 0.6)`).
      if (size < floor - 0.01) expect(words.length, words).toBeGreaterThanOrEqual(7);
      else expect(size).toBeGreaterThanOrEqual(floor - 0.01);
    }
    await act(async () => root!.unmount()); root = undefined;
  }
});
