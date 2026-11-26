import React, { Profiler, useEffect, useRef } from 'react';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { SharedValue } from 'react-native-reanimated';
import { BakedCanoe, BakedHazard, BakedShell } from '../src/arcade/games/lagoon-run/Baked';
import { LagoonFeedback, useRunFeedback } from '../src/arcade/games/lagoon-run/Feedback.tsx';
import { actorImageFrame, illustrated, illustratedHazard } from '../src/arcade/games/lagoon-run/illustrated';
import { impactMotion, runnerKinetics } from '../src/arcade/games/lagoon-run/kinetics';
import { hazardBox } from '../src/arcade/games/lagoon-run/course';
import { createRun, runLevels, type RunState } from '../src/arcade/games/lagoon-run/engine';
import { projectTrack } from '../src/arcade/games/lagoon-run/camera';
import { CANOE_DEPTH } from '../src/arcade/games/lagoon-run/geometry';
import { runPoses, spritePoint } from '../src/arcade/games/scrolling/render';
import { surfaceProfile } from '../src/arcade/games/lagoon-run/surface';
import type { SpritePose } from '../src/arcade/poses';

type Frame = (info: { timestamp: number; timeSincePreviousFrame: number; timeSinceFirstFrame: number }) => void;
type Mutable = { value: unknown; set(next: unknown): void };
const probe = vi.hoisted(() => ({
  frame: null as Frame | null, state: null as SharedValue<RunState> | null,
  reactions: new Set<() => void>(), reduced: vi.fn(() => false),
  cancel: vi.fn(), timing: vi.fn(), bridge: vi.fn(),
}));
vi.mock('react-native', () => ({
  View: 'View', Pressable: 'Pressable', Image: 'Image', StyleSheet: { absoluteFill: {} },
  Platform: { OS: 'ios' }, AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener: () => ({ remove() {} }) },
}));
vi.mock('react-native-svg', () => ({ default: 'Svg', Path: 'Path', Rect: 'Rect', Text: 'SvgText', Circle: 'Circle', G: 'G', Ellipse: 'Ellipse' }));
vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView' },
  runOnUI: (f: unknown) => f,
  runOnJS: (f: (...args: unknown[]) => void) => (...args: unknown[]) => { probe.bridge(...args); f(...args); },
  useFrameCallback: (f: Frame) => { probe.frame = f; return useRef({ setActive() {} }).current; },
  useSharedValue: (value: unknown) => {
    const shared = useRef<Mutable>({ value, set(next) {
      // Worklet timers stay at the start of their animation until a test moves the clock.
      if (!(next && typeof next === 'object' && 'mockTiming' in next)) this.value = next;
    } }).current;
    if (value && typeof value === 'object' && 'rows' in value) probe.state = shared as SharedValue<RunState>;
    return shared;
  },
  useAnimatedStyle: (style: () => unknown) => style,
  useAnimatedReaction: (read: () => unknown, react: (next: unknown, previous: unknown) => void) => {
    const last = useRef<unknown>(null);
    const current = useRef({ read, react });
    useEffect(() => { current.current = { read, react }; }, [read, react]);
    useEffect(() => {
      const update = () => {
        const next = current.current.read();
        current.current.react(next, last.current);
        last.current = next;
      };
      probe.reactions.add(update);
      return () => { probe.reactions.delete(update); };
    }, []);
  },
  cancelAnimation: probe.cancel, Easing: { linear: vi.fn() }, ReduceMotion: { Never: 'never' },
  withTiming: (mockTiming: number, config: unknown) => { probe.timing(config); return { mockTiming }; },
}));
vi.mock('react-native-gesture-handler', () => ({ GestureDetector: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('expo-constants', () => ({ default: { expoConfig: {} } }));
vi.mock('expo-router', () => ({ useLocalSearchParams: () => ({}) }));
vi.mock('../src/components/Text', () => ({ Text: 'Text' }));
vi.mock('../src/components/ui', () => ({ Button: 'Button' }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: probe.reduced }));
vi.mock('../src/arcade/Input', () => ({ UiPlayTarget: 'UiPlayTarget' }));
vi.mock('../src/arcade/Sprite', () => ({ ArcadeSprite: () => null }));
vi.mock('../src/arcade/LivesHud', () => ({ HeartsHud: () => null, HitReaction: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../src/arcade/games/lagoon-run/swipe', () => ({ runSwipe: () => ({ enabled: () => ({}) }) }));
vi.mock('../src/arcade/games/lagoon-run/useRunMeter', () => ({ useRunMeter: () => '', runEventTags: () => [] }));
vi.mock('../src/arcade/games/lagoon-run/World', () => ({ HarborPlanks: () => null, HarborEnvironment: () => null, RunCamera: ({ children }: { children: React.ReactNode }) => children, SpeedLines: () => null }));
vi.mock('../src/arcade/games/lagoon-run/Backdrop', () => ({ DeckBase: () => null, DeckHaze: () => null, DeckLight: () => null, RunAmbient: () => null, RunBackdrop: () => null, RunForeground: () => null }));
vi.mock('../src/arcade/games/lagoon-run/Art', () => ({ Deck: () => null, Canoe: () => null, PowerRing: () => null, RunTeachingCue: () => null, KiteRig: () => null }));
vi.mock('../src/arcade/games/lagoon-run/DepthSprite', () => ({ DepthSprite: () => null }));
vi.mock('../src/arcade/games/fruit-bat-flight/Art', () => ({ FlightPalm: () => null, FlightForest: () => null, FlightShore: () => null, FlightWideSky: () => null, Fruit: () => null }));
vi.mock('../src/arcade/games/scrolling/FeelArt', () => ({ BatRig: () => null, RunnerRig: () => null, LastHit: ({ children }: { children: React.ReactNode }) => children }));

const { RunBoard } = await import('../src/arcade/games/scrolling/Board');
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const extensions = createRequire(import.meta.url).extensions, previousPng = extensions['.png'];
beforeAll(() => { extensions['.png'] = (module, name) => { module.exports = relative(process.cwd(), name); }; });
afterAll(() => { if (previousPng) extensions['.png'] = previousPng; else delete extensions['.png']; });

let tree: ReactTestRenderer | undefined;
afterEach(async () => {
  if (tree) await act(async () => tree!.unmount());
  tree = undefined;
  vi.useRealTimers();
  vi.clearAllMocks();
});
const sizeStyle = (node: ReactTestInstance) => Object.assign({}, ...[node.props.style].flat().map(s => typeof s === 'function' ? s() : s));
const host = (r: ReactTestRenderer, type: string) => r.root.findAll(n => String(n.type) === type);

describe('Lagoon Run illustrated actors', () => {
  it('loads all six WebPs by their static thunks and preserves the open slots', () => {
    for (const name of ['canoe', 'crate', 'crab', 'shell', 'log', 'banner'] as const) {
      const path = `assets/arcade/lagoon/illustrated/${name}.webp`;
      expect(illustrated[name].source()).toBe(path);
      const bytes = readFileSync(path);
      expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
    }
    for (const name of ['cooler', 'rock', 'runner', 'horizonMorning'] as const) expect(illustrated[name]).toBeUndefined();
  });

  it('maps visible hazard edges and feet to their authored boxes at the ground and on raised decks', () => {
    for (const kind of ['crate', 'crab', 'log', 'banner'] as const) {
      const { width, height } = hazardBox(kind);
      const art = illustrated[kind];
      const frame = actorImageFrame(art, width, art.contactHeight, height);
      const [left, top, inkWidth, inkHeight] = art.ink;
      expect(frame.left + left * frame.width / art.pixels).toBeCloseTo(0);
      expect(frame.left + (left + inkWidth) * frame.width / art.pixels).toBeCloseTo(width);
      expect(frame.top + (top + inkHeight) * frame.height / art.pixels).toBeCloseTo(height);
      expect(frame.top + top * frame.height / art.pixels).toBeCloseTo(height - art.contactHeight);
      expect(art.contactHeight).toBeLessThanOrEqual(height);
    }
    const start = createRun(runLevels[0], 771), box = hazardBox('crate');
    for (const surface of ['sand', 'boardwalk'] as const) {
      const row = { ...start.rows[0], lane: 1, shellLane: 1, kind: 'crate' as const, z: 1, surface };
      const pose = runPoses({ ...start, rows: [row, ...start.rows.slice(1)] })[1];
      const contact = projectTrack(1, row.z);
      const paintedFoot = spritePoint(pose, box.width, box.height, box.width / 2, box.height);
      expect(paintedFoot.x).toBeCloseTo(contact.x);
      expect(paintedFoot.y).toBeCloseTo(contact.y - surfaceProfile(row, 0, 1) * 85 * contact.scale);
    }
    expect(illustratedHazard('cooler')).toBeUndefined();
    expect(illustratedHazard('rock')).toBeUndefined();
  });

  it('mounts the projected canoe bow, illustrated shell, and the baked cooler and rock', async () => {
    const lane = 1, z = 1, a = projectTrack(lane - .3, z), b = projectTrack(lane + .3, z);
    const c = projectTrack(lane + .3, z - CANOE_DEPTH), d = projectTrack(lane - .3, z - CANOE_DEPTH);
    const poses = { value: [a, b, c, d] } as SharedValue<SpritePose[]>;
    await act(async () => { tree = create(<>
      <BakedCanoe poses={poses} index={0} moving/>
      <BakedShell/>
      <BakedHazard kind="cooler" {...hazardBox('cooler')} poses={poses} index={0}/>
      <BakedHazard kind="rock" {...hazardBox('rock')} poses={poses} index={0}/>
    </>); });
    const images = host(tree!, 'Image');
    expect(images.map(n => n.props.source)).toEqual([
      illustrated.canoe.source(), illustrated.shell.source(), 'assets/arcade/lagoon/actors/cooler.png', 'assets/arcade/lagoon/actors/rock.png',
    ]);
    const canoe = sizeStyle(images[0].parent!);
    const [x, y, scale] = canoe.transform;
    expect(x.translateX).toBeCloseTo(a.x);
    expect(y.translateY + canoe.transformOrigin[1]).toBeCloseTo(a.y);
    expect(scale.scale * canoe.width).toBeCloseTo(b.x - a.x);
  });
});

describe('Lagoon Run kinetic feedback', () => {
  it('animates real accepted steps and puts shell totals through the HUD without re-rendering the round', async () => {
    vi.useFakeTimers();
    const commits = vi.fn(), onTone = vi.fn();
    await act(async () => {
      tree = create(<Profiler id="lagoon" onRender={commits}>
        <RunBoard level={runLevels[0]} seed={771} active helper={false} outfit="island" onResult={() => {}} onTone={onTone} debug={false}/>
      </Profiler>);
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(120); });
    const toggle = host(tree!, 'Pressable').find(n => n.props.accessibilityLabel === 'Arrow buttons')!;
    await act(async () => toggle.props.onPress());
    let frame = 0;
    const tick = () => {
      frame++;
      probe.frame!({ timestamp: frame * 17, timeSincePreviousFrame: 17, timeSinceFirstFrame: frame * 17 });
      for (const update of probe.reactions) update();
    };
    await act(async () => tick());
    const steadyCommits = commits.mock.calls.length;
    const roundRenders = probe.reduced.mock.calls.length;
    for (const label of ['Move left', 'Jump', 'Roll or drop']) {
      const control = host(tree!, 'UiPlayTarget').find(n => n.props.accessibilityLabel === label)!;
      await act(async () => { control.props.onAccessiblePress(); tick(); });
    }
    expect(probe.state!.value.learned).toBe(7);
    expect(commits).toHaveBeenCalledTimes(steadyCommits);
    expect(probe.reduced).toHaveBeenCalledTimes(roundRenders);
    expect(onTone.mock.calls).toEqual(Array.from({ length: 3 }, () => ['lagoon-snap', true]));
    expect(probe.timing).toHaveBeenCalledWith(expect.objectContaining({ duration: 205 }));

    const state = probe.state!.value;
    const lane = state.lane;
    probe.state!.value = { ...state, poseLane: lane, laneFrom: lane, laneTime: 0, jump: 0, duck: 0, fastDrop: false, elevation: 0,
      rows: state.rows.map((row, i) => i === 0 ? { ...row, z: .858, shellDone: 3, shellLane: lane, sky: false, action: 'idle', powerDone: true } : row),
    };
    await act(async () => tick());
    expect(onTone).toHaveBeenLastCalledWith('lagoon-shell', true);
    expect(tree!.root.findByProps({ testID: 'run-score-panel' }).props.accessibilityLabel).toContain('1 shells');
    expect(commits).toHaveBeenCalledTimes(steadyCommits + 1);
    expect(probe.reduced).toHaveBeenCalledTimes(roundRenders);
    expect(probe.timing).toHaveBeenCalledWith(expect.objectContaining({ duration: 330 }));
  });

  it('suppresses movement effects with Reduce Motion and retains gameplay poses, pickup count and impact cues', async () => {
    const start = createRun(runLevels[0], 771);
    const jump = { ...start, jump: start.jumpDuration };
    const bank = { ...start, lane: 2, laneTime: .06 };
    const landing = { ...start, landing: .13 };
    const roll = { ...start, duck: .55 };
    const hit = { ...start, cooldown: .3, lives: { ...start.lives, hit: 1, invulnerable: 1.2 } };
    expect(runnerKinetics(bank, false).angle).toBeCloseTo(11 * Math.PI / 180);
    expect(runnerKinetics(bank, false).scale).toBe(-4);
    expect(runnerKinetics(jump, false).x).toBeCloseTo(.88);
    expect(runnerKinetics(jump, false).y).toBeCloseTo(1.14);
    expect(runnerKinetics(landing, false)).toMatchObject({ x: 1.15, y: .85 });
    expect(runnerKinetics(roll, false).y).toBeLessThan(1);
    for (const state of [jump, bank, landing, roll]) expect(runnerKinetics(state, true)).toEqual({ angle: 0, x: 1, y: 1, scale: 0 });
    expect(impactMotion(.16, false).x).not.toBe(0);
    expect(impactMotion(.16, true)).toEqual({ x: 0, y: 0, flash: expect.any(Number) });
    expect(impactMotion(.16, true).flash).toBeGreaterThan(0);
    expect(runPoses(roll, true)[91].opacity).not.toBe(0);
    expect(runPoses(hit, true)[36].scale).toBeLessThan(1);

    const onTone = vi.fn();
    const model: { current?: ReturnType<typeof useRunFeedback> } = {};
    function Example() {
      const feedback = useRunFeedback(true, true, onTone);
      useEffect(() => { model.current = feedback; }, [feedback]);
      return <LagoonFeedback {...feedback.visual}/>;
    }
    await act(async () => { tree = create(<Example/>); });
    const feedback = model.current!;
    feedback.observe(start, jump);
    feedback.observe(start, { ...start, shells: 1 });
    feedback.observe(start, hit);
    const fx = (id: string) => host(tree!, 'AnimatedView').filter(n => n.props.testID === id).map(sizeStyle);
    expect(fx('lagoon-dust').every(style => style.opacity === 0)).toBe(true);
    expect(fx('lagoon-shell-spark').every(style => style.opacity === 0)).toBe(true);
    expect(fx('lagoon-shell-pop').filter(style => style.opacity > 0)).toHaveLength(1);
    const award = feedback.visual.shells.find(pulse => pulse.age.value === 0)!;
    const old = fx('lagoon-shell-pop').find(style => style.opacity > 0)!;
    award.age.set(.3);
    expect(fx('lagoon-shell-pop').find(style => style.opacity > 0)?.transform).toEqual(old.transform);
    expect(onTone.mock.calls).toEqual([['lagoon-snap', true], ['lagoon-shell', true], ['lagoon-thump', true]]);
    expect(probe.timing).not.toHaveBeenCalledWith(expect.objectContaining({ duration: 205 }));
    expect(probe.timing).toHaveBeenCalledWith(expect.objectContaining({ duration: 120 }));

    const ages = [...feedback.visual.dust, ...feedback.visual.shells].map(pulse => pulse.age);
    await act(async () => tree!.unmount());
    tree = undefined;
    expect(probe.cancel.mock.calls.flat()).toEqual([...ages, feedback.visual.impact]);
    expect([...ages, feedback.visual.impact].every(age => age.value === 1)).toBe(true);
  });
});
