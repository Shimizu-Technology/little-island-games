import React, { useEffect } from 'react';
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
  const frame = { ...sampled, bite: meal.action === 'eat' && sampled.bite }, bitten = meal.action === 'eat' && time >= 300;
  const clip = `meal-${input.slot}-${meal.key}-${index}`;
  const held = <G data-meal-food={meal.food.item}>
    {bitten && <Defs><ClipPath id={clip}><Path d="M0 9Q3 12 5 8Q9 11 11 6Q15 8 16 1L24 0V24H0Z"/></ClipPath></Defs>}
    <G transform={meal.action === 'drink' ? 'translate(-8 -3)' : undefined} clipPath={bitten ? `url(#${clip})` : undefined}>
      <HandProp id={meal.food.item as HoldableId} tint={meal.food.tint} state={{ on: meal.food.powered, empty: meal.action === 'drink' && time >= 540 }}/>
    </G>
  </G>;
  const value = { ...input, action: meal.action, face: frame.bite ? 'anticipate' as const : 'chew' as const,
    held, meal: frame, gaze: { x: .35, y: .8 } };
  const style = useAnimatedStyle(() => ({ opacity: mealIndex(progress.value) === index ? 1 : 0 }));
  return <Animated.View testID={`meal-frame-${index}`} pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, style]}>
    {renderCharacter?.(value) ?? <HomeCharacter input={value}/>}
  </Animated.View>;
}
/** One-shot UI-thread playback. No timers, JS frames, or animated SVG paths. */
export function MealArt({ input, meal, reduced, renderCharacter }: {
  input: CharacterRenderInput; meal: Meal; reduced: boolean; renderCharacter?: CharacterRenderer;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(0);
    progress.set(withTiming(MEAL_MS, { duration: MEAL_MS, easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
    return () => progress.set(0);
  }, [meal.key, progress]);
  return <>{mealTimes.map((time, index) => <Frame key={index} {...{ input, meal, time, index, progress, reduced, renderCharacter }}/>)}</>;
}
