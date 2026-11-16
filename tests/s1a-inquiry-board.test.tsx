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
import { StationScene } from '../src/learn/games/space-station/Scene';
import { SCHOOL_BOARD_MIN } from '../src/learn/boardGeometry';
import { move, solve, type InquiryState, type Investigation } from '../src/learn/inquiry/engine';
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
async function mount(level: LearningLevel, window: { width: number; height: number; fontScale: number } = { width: 393, height: 852, fontScale: 1 }, prepare?: (s: LearnSession) => LearnSession) {
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

/** Plays the round correctly through the real engine until `pick` matches the current investigation. */
function skipTo(session: LearnSession, pick: (q: Investigation) => boolean): LearnSession {
  let s = session.state as InquiryState;
  const qs = investigations(s.level, s.seed);
  while (!pick(qs[s.index])) {
    const q = qs[s.index];
    if (q.kind === 'observe') s = move(qs, s, { type: 'predict', outcome: q.observe(q.start).outcome });
    else solve(q)!.forEach((value, control) => { if (!q.controls[control].fixed) s = move(qs, s, { type: 'set', control, value }); });
    s = move(qs, s, { type: 'test' });
    s = move(qs, s, { type: 'explain', choice: q.explain.answer });
    s = move(qs, s, { type: 'next' });
  }
  return { ...session, state: s };
}
it('a surprising first prediction is forgiven at Level 1 but marks the round helped at Level 4', async () => {
  for (const level of [1, 4] as const) {
    const { props, settle } = await mount(level, undefined, session => skipTo(session, q => q.kind === 'observe'));
    const s = props.session.state as InquiryState, q = investigations(level, s.seed)[s.index];
    const miss = (q.observe(q.start).outcome + 1) % q.outcomes.length;
    await press(tile(`Predict: ${q.outcomes[miss]}`), settle);
    await press(button('Test the model'), settle);
    expect(texts()).toContain('Surprise!');
    expect(props.assistance).toHaveBeenCalledTimes(level === 4 ? 1 : 0);
    await act(async () => root!.unmount()); root = undefined;
  }
});

it('a reach plan that misses asks for a new plan; Undo restores an untested setting', async () => {
  const { props, settle } = await mount(4, { width: 393, height: 852, fontScale: 1 }, session => skipTo(session, q => q.key === 'gravity-b'));
  // The start setup never reaches the goal, whichever world the plan starts on.
  const s = props.session.state as InquiryState, q = investigations(4, s.seed)[s.index];
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

// Found natively, then tightened in review (P2-4): every SVG label reaches the School floor (13 pt, 19.5 pt at AX)
// with no length exception, and fits inside the drawing. Longer words moved to the legend below the drawing.
const labelSizes = (window: { width: number; fontScale: number }) => {
  const svg = root!.root.findAll(n => String(n.type) === 'Svg')[0];
  const scale = Math.min(svg.props.height / 210, (window.width - 60 - 12) / 360);
  return svg.findAll(n => String(n.type) === 'SvgText').map(n => ({ words: String(n.props.children), x: n.props.x, size: n.props.fontSize * scale, units: n.props.fontSize }));
};
it.each([1, 2, 3, 4, 5] as const)('level %i: every scene label reaches the floor and fits, before and after Test, default and AX5', async level => {
  for (const window of [{ width: 393, height: 852, fontScale: 1 }, { width: 393, height: 852, fontScale: 3.12 }]) {
    const floor = window.fontScale >= 1.5 ? 19.5 : 13;
    const { props, settle } = await mount(level, window);
    const qs = investigations(level, (props.session.state as InquiryState).seed);
    for (const q of qs) {
      const check = () => { for (const l of labelSizes(window)) {
        expect(l.size, l.words).toBeGreaterThanOrEqual(floor - 0.01);
        const half = (l.words.length * 0.6 * l.units) / 2;
        expect(l.x - half, l.words).toBeGreaterThanOrEqual(0);
        expect(l.x + half, l.words).toBeLessThanOrEqual(360);
      } };
      check();
      if (q.kind === 'observe') await press(tile(`Predict: ${q.outcomes[q.observe(q.start).outcome]}`), settle);
      else for (const [c, v] of solve(q)!.entries()) if (!q.controls[c].fixed && v !== (props.session.state as InquiryState).draft[c]) await press(tile(`Set ${q.controls[c].name}: ${q.controls[c].options[v]}`), settle);
      await press(button(q.kind === 'observe' ? 'Test the model' : 'Test my plan'), settle);
      check();
      await press(tile(`Reason: ${q.explain.choices[q.explain.answer]}`), settle);
      await press(button(q === qs[qs.length - 1] ? 'Finish' : 'Next investigation'), settle);
    }
    await act(async () => root!.unmount()); root = undefined;
  }
});
it('"From Earth" and "Mystery world" now read as legend text at the floor, not shrunken scene labels', async () => {
  for (const [level, key, words] of [[2, 'moon', 'Right: the view from Earth'], [4, 'gravity-c', 'Left: the mystery world']] as const) {
    await mount(level, { width: 393, height: 852, fontScale: 3.12 }, session => skipTo(session, q => q.key.startsWith(key)));
    const legend = root!.root.findAll(n => String(n.type) === 'Text' && n.props.testID === 'inquiry-legend');
    const lines = legend[0].findAll(n => String(n.type) === 'Text').map(n => n.children.filter(c => typeof c === 'string').join(''));
    expect(lines).toContain(`${words} · `);
    expect(legend[0].props.maxFontSizeMultiplier).toBe(1.5); // 13 pt × 1.5 = 19.5 pt at AX
    expect(labelSizes({ width: 393, fontScale: 3.12 }).every(l => l.words.length <= 8)).toBe(true);
    await act(async () => root!.unmount()); root = undefined;
  }
});

// P2-1: a revised plan shows no result for its untested draft; the earlier result names its own tested setup.
it('after Change my plan, the drawing and VoiceOver show no result for the new draft, also after save and reload', async () => {
  const { props, settle } = await mount(4, undefined, session => skipTo(session, q => q.key === 'gravity-b'));
  const s0 = props.session.state as InquiryState, q = investigations(4, s0.seed)[s0.index];
  const tested = q.observe(q.start);
  await press(button('Test my plan'), settle);
  await press(button('Change my plan'), settle);
  const other = (q.start[0] + 1) % 5;
  await press(tile(`Set Mass (kg): ${q.controls[0].options[other]}`), settle);
  const draft = (props.session.state as InquiryState).draft, untested = q.observe(draft);
  const look = () => {
    const svg = root!.root.findAll(n => String(n.type) === 'Svg')[0];
    expect(svg.props.accessibilityLabel).toContain('Result hidden until you test.');
    expect(svg.props.accessibilityLabel).not.toContain(tested.reading);
    const drawn = svg.findAll(n => String(n.type) === 'SvgText').map(n => String(n.props.children));
    for (const n of untested.reading.match(/[\d.]+ N/g) ?? []) expect(drawn).not.toContain(n);
    const previous = root!.root.findAll(n => String(n.type) === 'Text' && n.props.testID === 'inquiry-previous')[0];
    const words = previous.children.map(String).join('');
    expect(words).toContain(tested.reading);
    expect(words).toContain(`Mass (kg) ${q.controls[0].options[q.start[0]]}`);
  };
  look();
  props.session = JSON.parse(JSON.stringify(props.session));
  await act(async () => root!.unmount()); root = undefined;
  await mount(4, undefined, () => props.session);
  look();
});

// P2-3: the Earth reference keeps its size whatever hidden planet is chosen before Test.
it('cycling every offered planet before Test never changes the Earth reference or reveals the choice', async () => {
  for (const want of [3, 0]) {
    const { props, settle } = await mount(3, undefined, session => skipTo(session, q => q.kind === 'reach' && q.want === want));
    const q = investigations(3, (props.session.state as InquiryState).seed)[(props.session.state as InquiryState).index];
    const earth = () => root!.root.findAll(n => String(n.type) === 'SvgCircle' && n.props.fill === '#649CA9').map(n => n.props.r);
    const sizes = new Set<number>();
    for (const option of q.controls[0].options) {
      const selected = (props.session.state as InquiryState).draft[0];
      if (q.controls[0].options[selected] !== option) await press(tile(`Set Planet: ${option}`), settle);
      if (option !== 'Earth') { expect(earth()).toHaveLength(1); sizes.add(earth()[0]); }
      const circles = root!.root.findAll(n => String(n.type) === 'SvgCircle' && typeof n.props.fill === 'string' && n.props.fill.startsWith('#') && n.props.fill !== '#649CA9' && n.props.fill !== '#FFF9E9');
      expect(circles.filter(c => ['#AA9D8A', '#D5A266', '#C27D58', '#C9A57A', '#DCC994', '#8CCAC9', '#6E8FBF'].includes(c.props.fill))).toHaveLength(0);
    }
    expect(sizes.size).toBe(1);
    await act(async () => root!.unmount()); root = undefined;
  }
});

// P2-5: a restored round whose own history shows help, saved with levelHelped false, is marked on its next move.
it('a restored dirty round with a false help flag calls assistance on the next move', async () => {
  const { props, settle } = await mount(4, undefined, session => {
    let s = session.state as InquiryState;
    const qs = investigations(4, s.seed);
    s = move(qs, s, { type: 'hint' });
    return { ...session, levelHelped: false, state: s };
  });
  const q = investigations(4, (props.session.state as InquiryState).seed)[0];
  if (q.kind === 'observe') await press(tile(`Predict: ${q.outcomes[0]}`), settle);
  else await press(button('Hint'), settle);
  expect(props.assistance).toHaveBeenCalledTimes(1);
});

// At the drawing's floor (the smallest it gets), every label still reads at the text floor and fits in the scene.
it('at the 120-pt drawing floor, every scene label on every level reaches the text floor and fits, default and AX', async () => {
  const height = SCHOOL_BOARD_MIN['space-station'], width = 393 - 60, scale = Math.min(height / 210, (width - 12) / 360);
  expect(height).toBe(120);
  for (const floor of [13, 19.5]) for (let seed = 0; seed < 40; seed++) for (let level = 1; level <= 5; level++) for (const q of investigations(level, seed)) {
    const plans = [q.start, ...(q.kind === 'reach' ? [solve(q)!] : [])];
    for (const settings of plans) for (const seen of [null, q.observe(settings)]) {
      let tree: ReactTestRenderer | undefined;
      await act(async () => { tree = create(<StationScene q={q} settings={settings} seen={seen} height={height} label={floor / scale} />); });
      for (const t of tree!.root.findAll(n => String(n.type) === 'SvgText')) {
        const words = String(t.props.children), half = (words.length * 0.6 * t.props.fontSize) / 2;
        expect(t.props.fontSize * scale, words).toBeGreaterThanOrEqual(floor - 0.01);
        expect(t.props.x - half, `${q.key} ${words}`).toBeGreaterThanOrEqual(0);
        expect(t.props.x + half, `${q.key} ${words}`).toBeLessThanOrEqual(360);
      }
      await act(async () => tree!.unmount());
    }
  }
}, 120_000);

// Found natively in fix round 1: nested spans (the title inside the question, the legend inside the caption) must carry
// the same 1.5× cap as their block, or iOS scales them with the frame's 2× region.
it('nested title and legend spans carry the chrome cap at AX5', async () => {
  await mount(5, { width: 393, height: 852, fontScale: 3.12 });
  for (const id of ['inquiry-question', 'inquiry-legend']) {
    const block = root!.root.findAll(n => String(n.type) === 'Text' && n.props.testID === id)[0];
    const nested = block.findAll(n => String(n.type) === 'Text' && n !== block);
    expect(nested.length, id).toBeGreaterThan(0);
    for (const span of nested) expect(span.props.maxFontSizeMultiplier, id).toBe(1.5);
  }
});
