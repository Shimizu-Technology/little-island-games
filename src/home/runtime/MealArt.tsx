import React, { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { ClipPath, Defs, G, Path } from 'react-native-svg';
import { HandProp } from '../art/PropShape';
import type { HoldableId } from '../art/living';
import { HomeCharacter, type CharacterRenderer } from '../characterRenderer';
import type { CharacterRenderInput } from '../../islander/rig/character';
import { MEAL_MS, mealFrame, mealIndex, mealTimes, type Meal } from './meal';

function Frame({ input, meal, time, index, progress, reduced, renderCharacter }: {
  input: CharacterRenderInput; meal: Meal; time: number; index: number; progress: SharedValue<number>;
  reduced: boolean; renderCharacter?: CharacterRenderer;
}) {
  const sampled = mealFrame(time, reduced);
  const frame = { ...sampled, bite: meal.action === 'eat' && sampled.bite }, bitten = meal.action === 'eat' && time >= 360;
  const clip = `meal-${input.slot}-${meal.key}-${index}`;
  const held = <G data-meal-food={meal.food.item}>
    {bitten && <Defs><ClipPath id={clip}><Path d="M0 14Q5 17 7 12Q13 15 14 9Q20 11 20 4L23 0H24V24H0Z"/></ClipPath></Defs>}
    <G transform={meal.action === 'drink' ? 'translate(-8 -3)' : undefined} clipPath={bitten ? `url(#${clip})` : undefined}>
      <HandProp id={meal.food.item as HoldableId} tint={meal.food.tint} state={{ on: meal.food.powered, empty: meal.action === 'drink' && time >= 540 }}/>
    </G>
  </G>;
  const value = { ...input, action: meal.action, face: time < 150 ? 'neutral' as const : frame.bite ? 'anticipate' as const : 'chew' as const,
    held, meal: frame, gaze: { x: .35, y: .8 } };
  const style = useAnimatedStyle(() => ({ opacity: mealIndex(progress.value) === index ? 1 : 0 }));
  return <Animated.View testID={`meal-frame-${index}`} pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, style]}>
    {renderCharacter?.(value) ?? <HomeCharacter input={value}/>}
  </Animated.View>;
}
/** One-shot UI-thread playback. No timers, JS frames, or animated SVG paths. */
export function MealArt({ input, meal, reduced, renderCharacter, onPresented }: {
  input: CharacterRenderInput; meal: Meal; reduced: boolean; renderCharacter?: CharacterRenderer; onPresented?: () => void;
}) {
  const progress = useSharedValue(0);
  const started = useRef(false), live = useRef(true), laidOut = useRef(false);
  const frameRequest = useRef<number | undefined>(undefined);
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
        progress.set(withTiming(MEAL_MS, { duration: MEAL_MS, easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
        onPresented?.();
      });
    });
  }, [progress, onPresented]);
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
    {mealTimes.map((time, index) => <Frame key={index} {...{ input, meal, time, index, progress, reduced, renderCharacter }}/>) }
  </View>;
}
