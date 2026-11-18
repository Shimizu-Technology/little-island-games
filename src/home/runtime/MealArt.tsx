import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, type SharedValue, Easing, runOnJS, ReduceMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { ClipPath, Defs, G, Path } from 'react-native-svg';
import {heldDrinkScale} from '../art/heldDrink';
import { HandProp } from '../art/PropShape';
import type { HoldableId } from '../art/living';
import { HomeCharacter, type CharacterRenderer } from '../characterRenderer';
import type { CharacterRenderInput } from '../../islander/rig/character';
import { MEAL_MS, mealFrame, mealTimes, type Meal } from './meal';

const AnimatedGroup = Animated.createAnimatedComponent(G);
function OpacityLayer({ progress, index, children }: { progress: SharedValue<number>; index: number; children: React.ReactNode }) {
  const start = mealTimes[index], end = mealTimes[index + 1] ?? Infinity;
  const props = useAnimatedProps(() => ({ opacity: progress.value >= start && progress.value < end ? 1 : 0 }));
  return <AnimatedGroup testID={`meal-frame-${index}`} animatedProps={props}>{children}</AnimatedGroup>;
}
function foodArt(input: CharacterRenderInput, meal: Meal, time: number, index: number, reduced: boolean) {
  const bitten = meal.action === 'eat' && time >= 360;
  const clip = `meal-${input.slot}-${meal.key}-${index}`;
  return <G data-meal-food={meal.food.item} opacity={meal.action === 'eat' && time > 600 ? (MEAL_MS - time) / 150 : 1}>
    {bitten && <Defs><ClipPath id={clip}><Path d="M0 14Q5 17 7 12Q13 15 14 9Q20 11 20 4L23 0H24V24H0Z"/></ClipPath></Defs>}
    <G transform={input.slot === 1 && meal.action === 'drink' ? `translate(12 12) scale(${heldDrinkScale(1,input.slot)}) rotate(${mealFrame(time, reduced).reach * 5}) translate(-12 -12)` : undefined} clipPath={bitten ? `url(#${clip})` : undefined}>
      <HandProp longStraw={input.slot === 1 && meal.action === 'drink'} id={meal.food.item as HoldableId} tint={meal.food.tint} state={{ on: meal.food.powered, empty: meal.action === 'drink' && time >= 540 }}/>
    </G>
  </G>;
}
/** One-shot UI-thread playback. No timers, JS frames, or animated SVG paths. */
export function MealArt({ input, meal, reduced, renderCharacter, onPresented, onFinished }: {
  input: CharacterRenderInput; meal: Meal; reduced: boolean; renderCharacter?: CharacterRenderer; onPresented?: () => void; onFinished?: () => void;
}) {
  const progress = useSharedValue(0);
  const started = useRef(false), live = useRef(true), laidOut = useRef(false);
  const frameRequest = useRef<number | undefined>(undefined);
  const finish = useCallback(() => { if (live.current) onFinished?.(); }, [onFinished]);
  const playback = useMemo(() => ({ progress, renderLayer: (index: number, children: React.ReactNode) => <OpacityLayer progress={progress} index={index}>{children}</OpacityLayer>, frames: mealTimes.map((time, index) => {
    const sampled = mealFrame(time, reduced);
    return { time, meal: { ...sampled, bite: meal.action === 'eat' && sampled.bite },
      face: time < 150 ? 'neutral' as const : meal.action === 'drink' ? 'happy' as const : sampled.bite ? 'anticipate' as const : 'chew' as const,
      held: foodArt(input, meal, time, index, reduced) };
  }) }), [progress, meal, reduced, input]);
  const value = { ...input, action: meal.action, meal: playback.frames[0].meal, mealPlayback: playback, blink: false };
  const begin = useCallback(() => {
    laidOut.current = true;
    if (started.current) return;
    started.current = true;
    // Layout can precede paint. Let the mounted native frames flush before
    // starting their clock, so a busy mount cannot skip the reaching path.
    frameRequest.current = requestAnimationFrame(() => {
      if (!live.current) return;
      frameRequest.current = requestAnimationFrame(() => {
        if (!live.current) return;
        progress.set(withTiming(MEAL_MS, { duration: MEAL_MS, easing: Easing.linear, reduceMotion: ReduceMotion.Never }, done => { if (done) runOnJS(finish)(); }));
        onPresented?.();
      });
    });
  }, [progress, onPresented, finish]);
  useEffect(() => {
    live.current = true;
    if (laidOut.current) begin();
    return () => {
      live.current = false;
      started.current = false;
      if (frameRequest.current !== undefined) cancelAnimationFrame(frameRequest.current);
      progress.set(0);
    };
  }, [progress, begin]);
  return <View testID="meal-stage" collapsable={false} onLayout={begin}
    style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
    {renderCharacter?.(value) ?? <HomeCharacter input={value}/>}
  </View>;
}
