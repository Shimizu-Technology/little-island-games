import React from 'react';
import { act, create } from 'react-test-renderer';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { mealFrame, mealTimes, MEAL_MS } from '../src/home/runtime/meal';
import { MealArt } from '../src/home/runtime/MealArt';
import { characterPose } from '../src/islander/rig/character';
import { instance } from '../src/home/model';
const playback = vi.hoisted(() => ({ progress: undefined as any, timingCalls: 0, completion: undefined as undefined | ((done: boolean) => void), frames: new Map<number, () => void>(), serial: 0 }));
vi.mock('react-native', () => ({ View: 'meal-stage' }));
vi.mock('react-native-svg', () => Object.fromEntries(['G','Circle','Ellipse','Rect','Path','Defs','ClipPath'].map(k=>[k,k.toLowerCase()]).concat([['default','svg']])));
vi.mock('react-native-reanimated', () => ({ default: { View: 'frame', createAnimatedComponent: () => 'frame' }, ReduceMotion: { Never: 'never' }, Easing: { linear: (t: number) => t }, runOnJS: (fn: any) => fn, cancelAnimation: () => {}, useDerivedValue: (fn: () => any) => ({get value(){return fn();}}), useAnimatedProps: (fn: () => any) => ({ evaluate: fn }), withTiming: (_to: any, _opts: any, done: any) => { playback.timingCalls++; playback.completion = done; return 0; },
  useSharedValue: (v: number) => { const ref = React.useRef({ value: v, set(n: number) { this.value = n; } }); playback.progress = ref.current; return ref.current; },
  useAnimatedStyle: (fn: () => any) => ({ evaluate: fn }) }));
vi.mock('../src/home/characterRenderer', () => ({ HomeCharacter: () => null }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
vi.stubGlobal('requestAnimationFrame', (fn: () => void) => { const id = ++playback.serial; playback.frames.set(id,fn); return id; });
vi.stubGlobal('cancelAnimationFrame', (id: number) => playback.frames.delete(id));
const flushFrames = () => { const frames = [...playback.frames.values()]; playback.frames.clear(); frames.forEach(fn => fn()); };

describe('H4b meal art and natural hand path', () => {
  it('approaches from below, bends below the food and returns while chewing without moving the supported body', () => {
    for (const base of ['stand','sit','lie','bathe'] as const) {
      const first = characterPose(base, 'eat', 0, 0, mealFrame(0));
      const bite = characterPose(base, 'eat', 0, 0, mealFrame(180));
      const end = characterPose(base, 'eat', 0, 0, mealFrame(720));
      expect(first.joints.rightHand[1]).toBeGreaterThan(bite.joints.rightHand[1] + 15);
      expect(bite.joints.rightElbow[1]).toBeGreaterThan(bite.joints.rightHand[1] + 10);
      expect(end.joints.rightHand).toEqual(first.joints.rightHand);
      for (const joint of ['head','leftHip','rightHip','leftFoot','rightFoot'] as const) expect(bite.joints[joint]).toEqual(first.joints[joint]);
    }
    expect(mealFrame(180).bite).toBe(true);
    expect(mealFrame(420).bite).toBe(false);
    expect(mealFrame(360).chew).not.toBe(mealFrame(480).chew);
  });
  it('shows exactly one opaque mounted frame at every 60 Hz step, always carrying identifiable food', async () => {
    const inputs: any[] = [];
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(<MealArt input={{ slot: 0, base: 'stand', action: 'eat', face: null, facing: 'right', size: 240 }}
      meal={{ key: 7, food: instance('meal-prop', 'mango', 0, 0), action: 'eat' }} reduced={false}
      renderCharacter={input => { inputs.push(input); return <>{input.mealPlayback!.frames.map((f,i) => <React.Fragment key={i}>{input.mealPlayback!.renderLayer(i,f.held)}</React.Fragment>)}</>; }}/>); });
    const frames = tree.root.findAll(n => n.type === 'frame' as never && String(n.props.testID ?? '').startsWith('meal-frame-'));
    expect(frames).toHaveLength(mealTimes.length);
    for (let ms = 0; ms <= MEAL_MS; ms += 1000 / 60) {
      playback.progress.value = 7000 + ms;
      expect(frames.filter(f => f.props.animatedProps.evaluate().opacity === 1)).toHaveLength(1);
    }
    for (const f of inputs[0].mealPlayback.frames) expect(renderToStaticMarkup(f.held)).toContain('data-meal-food="mango"');
    expect(inputs[0].mealPlayback.frames.some((f: any) => f.meal.bite)).toBe(true);
    expect(inputs).toHaveLength(1); // One body; playback changes only meal layers.
    expect(inputs[0].mealPlayback.frames).toHaveLength(mealTimes.length);
    expect(renderToStaticMarkup(inputs[0].mealPlayback.frames.at(-1).held)).toContain('clip-path=');
    await act(async () => tree.unmount());
  });
  it('Reduce Motion keeps the hand still while retaining bite and chew feedback', () => {
    expect(new Set(mealTimes.map(t => mealFrame(t,true).reach))).toEqual(new Set([1]));
    expect(mealTimes.some(t=>mealFrame(t,true).bite)).toBe(true);
  });
});

it('waits for the first native layout before playback, and does not restart on another layout', async () => {
  playback.timingCalls = 0;
  playback.frames.clear();
  const presented = vi.fn();
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(<MealArt input={{ slot: 0, base: 'stand', action: 'eat', face: null, facing: 'right', size: 224 }}
    meal={{ key: 2, food: instance('snack', 'mango', 0, 0), action: 'eat' }} reduced={false} onPresented={presented}/>); });
  expect(playback.timingCalls).toBe(0);
  const stage = tree.root.findAll(n => typeof n.type === 'string' && n.props.testID === 'meal-stage')[0];
  await act(async () => stage.props.onLayout());
  expect(playback.timingCalls).toBe(0);
  for (let i = 0; i < 3; i++) await act(async () => flushFrames());
  expect(playback.timingCalls).toBe(1);
  expect(presented).toHaveBeenCalledOnce();
  await act(async () => stage.props.onLayout());
  await act(async () => flushFrames());
  expect(playback.timingCalls).toBe(1);
  expect(presented).toHaveBeenCalledOnce();
  await act(async () => tree.unmount());
  expect(playback.frames.size).toBe(0);
});

it('cancels a presentation unmounted before its first painted frame', async () => {
  playback.timingCalls = 0;
  playback.frames.clear();
  const presented = vi.fn();
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(<MealArt input={{ slot: 0, base: 'stand', action: 'eat', face: null, facing: 'right', size: 224 }}
    meal={{ key: 8, food: instance('snack', 'mango', 0, 0), action: 'eat' }} reduced={false} onPresented={presented}/>); });
  const stage = tree.root.findAll(n => typeof n.type === 'string' && n.props.testID === 'meal-stage')[0];
  await act(async () => stage.props.onLayout());
  await act(async () => tree.unmount());
  await act(async () => flushFrames());
  expect(playback.timingCalls).toBe(0);
  expect(presented).not.toHaveBeenCalled();
  expect(playback.frames.size).toBe(0);
});

 it('mounts one complete character per meal, independently of pose count', async () => {
  const render = vi.fn(() => React.createElement('character'));
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(<MealArt input={{ slot: 1, base: 'stand', action: null, face: null, facing: 'right', size: 224 }} meal={{ key: 9, food: instance('drink','coconut-drink',0,0), action: 'drink' }} reduced={false} renderCharacter={render}/>); });
  expect(render).toHaveBeenCalledTimes(1);
  await act(async () => tree.unmount());
 });

it('finishes from the UI playback completion, and ignores cancelled/unmounted playback', async () => {
 const done=vi.fn();
 let tree!: ReturnType<typeof create>;
 await act(async () => { tree=create(<MealArt input={{slot:0,base:'stand',action:null,face:null,facing:'right',size:224}} meal={{key:20,food:instance('a','juice',0,0),action:'drink'}} reduced={false} onFinished={done}/>); });
 await act(async () => tree.root.findByProps({testID:'meal-stage'}).props.onLayout());
 await act(async () => { flushFrames(); flushFrames(); });
 expect(done).not.toHaveBeenCalled();
 await act(async () => playback.completion!(false));
 expect(done).not.toHaveBeenCalled();
 await act(async () => playback.completion!(true));
 expect(done).toHaveBeenCalledOnce();
 await act(async () => tree.unmount());
 await act(async () => playback.completion!(true));
 expect(done).toHaveBeenCalledOnce();
});
