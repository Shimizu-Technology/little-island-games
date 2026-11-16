import React from 'react';
import { act, create } from 'react-test-renderer';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { mealFrame, mealTimes, MEAL_MS } from '../src/home/runtime/meal';
import { MealArt } from '../src/home/runtime/MealArt';
import { characterPose } from '../src/islander/rig/character';
import { instance } from '../src/home/model';
const playback = vi.hoisted(() => ({ progress: undefined as any }));
vi.mock('react-native-svg', () => Object.fromEntries(['G','Circle','Ellipse','Rect','Path','Defs','ClipPath'].map(k=>[k,k.toLowerCase()])));
vi.mock('react-native-reanimated', () => ({ default: { View: 'frame' }, ReduceMotion: { Never: 'never' }, Easing: { linear: (t: number) => t }, withTiming: () => 0,
  useSharedValue: (v: number) => { const ref = React.useRef({ value: v, set(n: number) { this.value = n; } }); playback.progress = ref.current; return ref.current; },
  useAnimatedStyle: (fn: () => any) => ({ evaluate: fn }) }));
vi.mock('../src/home/characterRenderer', () => ({ HomeCharacter: () => null }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

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
    expect(mealFrame(360).bite).toBe(false);
    expect(mealFrame(360).chew).not.toBe(mealFrame(480).chew);
  });
  it('shows exactly one opaque mounted frame at every 60 Hz step, always carrying identifiable food', async () => {
    const inputs: any[] = [];
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(<MealArt input={{ slot: 0, base: 'stand', action: 'eat', face: null, facing: 'right', size: 240 }}
      meal={{ key: 7, food: instance('meal-prop', 'mango', 0, 0), action: 'eat' }} reduced={false}
      renderCharacter={input => { inputs.push(input); return React.createElement('character'); }}/>); });
    const frames = tree.root.findAllByType('frame' as never);
    expect(frames).toHaveLength(mealTimes.length);
    for (let ms = 0; ms <= MEAL_MS; ms += 1000 / 60) {
      playback.progress.value = ms;
      expect(frames.filter(f => f.props.style[1].evaluate().opacity === 1)).toHaveLength(1);
    }
    for (const input of inputs) expect(renderToStaticMarkup(input.held)).toContain('data-meal-food="mango"');
    expect(inputs.some(i => i.meal.bite)).toBe(true);
    expect(inputs.slice(8).every(i => i.face === 'chew')).toBe(true);
    expect(renderToStaticMarkup(inputs.at(-1).held)).toContain('clip-path=');
    await act(async () => tree.unmount());
  });
  it('Reduce Motion keeps the hand still while retaining bite and chew feedback', () => {
    expect(new Set(mealTimes.map(t => mealFrame(t,true).reach))).toEqual(new Set([1]));
    expect(mealTimes.some(t=>mealFrame(t,true).bite)).toBe(true);
  });
});
