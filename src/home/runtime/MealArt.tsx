import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedProps, useAnimatedStyle, useDerivedValue, type SharedValue, Easing, runOnJS, ReduceMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { ClipPath, Defs, G, Path } from 'react-native-svg';
import {heldDrinkScale} from '../art/heldDrink';
import { HandProp } from '../art/PropShape';
import type { HoldableId } from '../art/living';
import { HomeCharacter, type CharacterRenderer } from '../characterRenderer';
import type { CharacterRenderInput } from '../../islander/rig/character';
import { islanderAnchors, pipAnchors, crabAnchors } from '../../islander/rig/anchors';
import { MEAL_MS, mealFrame, mealIndex, mealTimes, type Meal } from './meal';

const AnimatedGroup = Animated.createAnimatedComponent(G);
// Keep one caller-owned clock. An epoch prevents a newer meal from briefly
// displaying the preceding meal's frame before its native clock starts.
const EPOCH = 1000, INDEX_EPOCH = 100;
function frameIndex(code: number, key: number) {
  'worklet';
  const value = code - key * INDEX_EPOCH;
  return value >= 0 && value < mealTimes.length ? value : 0;
}
function OpacityLayer({ current, mealKey, index, children }: { current: SharedValue<number>; mealKey: number; index: number | readonly number[]; children: React.ReactNode }) {
  const indices = typeof index === 'number' ? [index] : index;
  const props = useAnimatedProps(() => ({ opacity: indices.includes(frameIndex(current.value, mealKey)) ? 1 : 0 }));
  return <AnimatedGroup testID={`meal-frame-${indices.join('-')}`} animatedProps={props}>{children}</AnimatedGroup>;
}
function foodArt(slot: CharacterRenderInput['slot'], meal: Meal, time: number, index: number, reduced: boolean, poseTip = true) {
  const bitten = meal.action === 'eat' && time >= 360;
  const clip = `meal-${slot}-${meal.key}-${index}`;
  return <G data-meal-food={meal.food.item}>
    {bitten && <Defs><ClipPath id={clip}><Path d="M0 14Q5 17 7 12Q13 15 14 9Q20 11 20 4L23 0H24V24H0Z"/></ClipPath></Defs>}
    <G transform={slot === 1 && meal.action === 'drink' ? `translate(12 12) scale(${heldDrinkScale(1,slot)}) rotate(${poseTip ? mealFrame(time, reduced).reach * 5 : 0}) translate(-12 -12)` : undefined} clipPath={bitten ? `url(#${clip})` : undefined}>
      <HandProp longStraw={slot === 1 && meal.action === 'drink'} id={meal.food.item as HoldableId} tint={meal.food.tint} state={{ on: meal.food.powered, empty: meal.action === 'drink' && time >= 540 }}/>
    </G>
  </G>;
}
function FoodVariant({ current, meal, input, reduced, after }: { current: SharedValue<number>; meal: Meal; input: CharacterRenderInput; reduced: boolean; after: boolean }) {
  const time = after ? meal.action === 'eat' ? 360 : 540 : 0;
  const style = useAnimatedStyle(() => ({ opacity: (mealTimes[frameIndex(current.value, meal.key)] >= (meal.action === 'eat' ? 360 : 540)) === after ? 1 : 0 }));
  const unit = input.size / [132,160,120][input.slot];
  return <Animated.View testID={`meal-food-${after ? 1 : 0}`} pointerEvents="none" style={[{ position:'absolute',left:-20*unit,top:-34*unit,width:40*unit,height:54*unit },style]}>
    <Svg width={40*unit} height={54*unit} viewBox="-8 -22 40 54" accessible={false}>{foodArt(input.slot,meal,time,after ? 1 : 0,reduced,false)}</Svg>
  </Animated.View>;
}
/** Only two small food trees. Position/rotation/fade composite on the UI thread. */
function Food({ current, progress, meal, input, reduced }: { current: SharedValue<number>; progress: SharedValue<number>; meal: Meal; input: CharacterRenderInput; reduced: boolean }) {
  const {slot,size,base,facing,tilt,limbLag} = input;
  const positions = useMemo(() => {
    const make = [islanderAnchors,pipAnchors,crabAnchors][slot], unit = size / [132,160,120][slot];
    const options = { action:meal.action,tilt,limbLag,reduced };
    const bounds = make(base,facing,options).bounds;
    const direction = facing === 'left' ? -1 : 1;
    const lying = base === 'lie' ? slot === 0 ? -90 : slot === 1 ? -18 : 0 : 0;
    return mealTimes.map(time => {
      const frame = mealFrame(time,reduced), hand = make(base,facing,{...options,meal:frame}).hand;
      return { x:(hand.x-bounds.left)*unit,y:(hand.y-bounds.top)*unit,
        angle:(lying + (slot === 1 && meal.action === 'drink' ? 5 : 0))*direction*frame.reach + (reduced ? 0 : tilt ?? 0) };
    });
  },[slot,size,base,facing,tilt,limbLag,meal.action,reduced]);
  const style = useAnimatedStyle(() => {
    const point = positions[frameIndex(current.value,meal.key)];
    const elapsed = progress.value - meal.key * EPOCH;
    const ms = elapsed >= 0 && elapsed <= MEAL_MS ? elapsed : 0;
    return { opacity:meal.action === 'eat' && ms > 600 ? (MEAL_MS-ms)/150 : 1,
      transform:[{translateX:point.x},{translateY:point.y},{rotate:`${point.angle}deg`}] };
  });
  return <Animated.View testID="meal-held-food" pointerEvents="none" style={[{position:'absolute',left:0,top:0,width:1,height:1,transformOrigin:[0,0,0]},style]}>
    <FoodVariant {...{current,meal,input,reduced}} after={false}/><FoodVariant {...{current,meal,input,reduced}} after/>
  </Animated.View>;
}
/** Persistent body; authored arm/mouth poses and one small held-food stage. */
export function MealArt({ input, meal, reduced, renderCharacter, onPresented, onFinished }: {
  input: CharacterRenderInput; meal?: Meal; reduced: boolean; renderCharacter?: CharacterRenderer; onPresented?: () => void; onFinished?: () => void;
}) {
  const progress = useSharedValue(0), key = meal?.key ?? 0, slot = input.slot;
  const current = useDerivedValue(() => {
    const elapsed = progress.value - key * EPOCH;
    return key * INDEX_EPOCH + mealIndex(elapsed >= 0 && elapsed <= MEAL_MS ? elapsed : 0);
  },[key]);
  const started = useRef(false), live = useRef(true), laidOut = useRef(false);
  const frameRequest = useRef<number | undefined>(undefined);
  const finish = useCallback(() => { if (live.current) onFinished?.(); }, [onFinished]);
  const playback = useMemo(() => !meal ? undefined : ({ progress,
    renderLayer:(index:number | readonly number[],children:React.ReactNode)=><OpacityLayer current={current} mealKey={meal.key} index={index}>{children}</OpacityLayer>,
    frames:mealTimes.map((time,index) => {
      const sampled = mealFrame(time,reduced);
      return {time,meal:{...sampled,bite:meal.action === 'eat' && sampled.bite},
        face:time < 150 ? 'neutral' as const : meal.action === 'drink' ? 'happy' as const : sampled.bite ? 'anticipate' as const : 'chew' as const,
        held:foodArt(slot,meal,time,index,reduced)};
    }) }),[progress,current,meal,reduced,slot]);
  const value = meal && playback ? {...input,action:meal.action,meal:playback.frames[0].meal,mealPlayback:playback,blink:false} : input;
  const begin = useCallback(() => {
    laidOut.current = true;
    if (!key || started.current) return;
    started.current = true;
    frameRequest.current = requestAnimationFrame(() => {
      if (!live.current) return;
      frameRequest.current = requestAnimationFrame(() => {
        if (!live.current) return;
        progress.set(key * EPOCH);
        progress.set(withTiming(key * EPOCH + MEAL_MS, {duration:MEAL_MS,easing:Easing.linear,reduceMotion:ReduceMotion.Never}, done => {if (done) runOnJS(finish)();}));
        onPresented?.();
      });
    });
  },[key,progress,onPresented,finish]);
  useEffect(() => {
    live.current = true;
    if (laidOut.current) begin();
    return () => {
      live.current = false;
      started.current = false;
      if (frameRequest.current !== undefined) cancelAnimationFrame(frameRequest.current);
      cancelAnimation(progress);
    };
  },[progress,begin]);
  return <View testID={meal ? 'meal-stage' : 'character-stage'} collapsable={false} onLayout={begin}
    style={{position:'absolute',left:0,top:0,right:0,bottom:0}}>
    {renderCharacter?.(value) ?? <HomeCharacter input={value}/>}
    {meal && <Food {...{current,progress,meal,input,reduced}}/>}
  </View>;
}
