import React, { useCallback, useLayoutEffect, useRef, useMemo } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedProps, useAnimatedStyle, useDerivedValue, type SharedValue, Easing, runOnJS, ReduceMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { ClipPath, Defs, G, Path } from 'react-native-svg';
import {mealPaths} from './MealPaths';
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
const EPOCH = 1000;
type MealClock=SharedValue<{key:number;drink:boolean;releaseScale?:number}>;
function frameIndex(value:number) {
  'worklet';return value >= 0 && value < mealTimes.length ? value : 0;
}
function OpacityLayer({ current, index, children }: { current: SharedValue<number>; index: number | readonly number[]; children: React.ReactNode }) {
  const signature=JSON.stringify(typeof index==='number'?[index]:index);
  const indices=useMemo(()=>JSON.parse(signature) as number[],[signature]);
  const props = useAnimatedProps(() => ({ opacity: indices.includes(frameIndex(current.value)) ? 1 : 0 }));
  return <AnimatedGroup testID={`meal-frame-${indices.join('-')}`} animatedProps={props}>{children}</AnimatedGroup>;
}
function foodArt(slot: CharacterRenderInput['slot'], meal: Meal, time: number, index: number, reduced: boolean, poseTip = true, clipId?:string) {
  const bitten = meal.action === 'eat' && time >= 360;
  const clip = clipId ?? `meal-${slot}-${meal.key}-${index}`;
  return <G data-meal-food={meal.food.item} transform={meal.food.item === 'banana' ? 'rotate(60 12 12)' : undefined}>
    {bitten && <Defs><ClipPath id={clip}><Path d="M0 14Q5 17 7 12Q13 15 14 9Q20 11 20 4L23 0H24V24H0Z"/></ClipPath></Defs>}
    <G transform={slot === 1 && meal.action === 'drink' ? `translate(12 12) scale(${heldDrinkScale(1,slot)}) rotate(${poseTip ? mealFrame(time, reduced).reach * 5 : 0}) translate(-12 -12)` : undefined} clipPath={bitten ? `url(#${clip})` : undefined}>
      <HandProp longStraw={slot === 1 && meal.action === 'drink'} id={meal.food.item as HoldableId} tint={meal.food.tint} state={{ on: meal.food.powered, empty: meal.action === 'drink' && time >= 660 }}/>
    </G>
  </G>;
}
function AuthoredFoodFrame({slot,meal,time,index,reduced}:{slot:CharacterRenderInput['slot'];meal:Meal;time:number;index:number;reduced:boolean}){
  return foodArt(slot,meal,time,index,reduced);
}
function FoodVariant({ current, clock, meal, input, reduced, after }: { current: SharedValue<number>; clock:MealClock; meal: Meal; input: CharacterRenderInput; reduced: boolean; after: boolean }) {
  const clipId=`meal-food-${React.useId().replace(/[^A-Za-z0-9_-]/g,'')}`;
  const time = after ? meal.action === 'eat' ? 360 : 660 : 0;
  const style = useAnimatedStyle(() => ({ opacity: (mealTimes[frameIndex(current.value)] >= (clock.value.drink ? 660 : 360)) === after ? 1 : 0 }));
  const unit = input.size / [132,160,120][input.slot];
  return <Animated.View testID={`meal-food-${after ? 1 : 0}`} pointerEvents="none" style={[{ position:'absolute',left:-20*unit,top:-34*unit,width:40*unit,height:54*unit },style]}>
    <Svg width={40*unit} height={54*unit} viewBox="-8 -22 40 54" accessible={false}>{foodArt(input.slot,meal,time,after ? 1 : 0,reduced,false,clipId)}</Svg>
  </Animated.View>;
}
/** Only two small food trees. Position/rotation/fade composite on the UI thread. */
const Food = React.memo(function Food({ current, clock, progress, meal, input, reduced }: { current: SharedValue<number>; clock:MealClock; progress: SharedValue<number>; meal: Meal; input: CharacterRenderInput; reduced: boolean }) {
  const {slot,size,base,facing,tilt,limbLag} = input;
  const positions = useMemo(() => {
    const make = [islanderAnchors,pipAnchors,crabAnchors][slot], unit = size / [132,160,120][slot];
    const options = { action:meal.action,tilt,limbLag,reduced };
    const bounds = make(base,facing,options).bounds;
    const direction = facing === 'left' ? -1 : 1;
    const lying = base === 'lie' ? slot === 0 ? -90 : slot === 1 ? -18 : 0 : 0;
    return mealTimes.map(time => {
      const frame = mealFrame(meal.offered?Math.max(180,time):time,reduced), hand = make(base,facing,{...options,meal:frame}).hand;
      return { x:(hand.x-bounds.left)*unit,y:(hand.y-bounds.top)*unit,
        angle:(lying + (slot === 1 && meal.action === 'drink' ? 5 : 0))*direction*frame.reach + (reduced ? 0 : tilt ?? 0) };
    });
  },[slot,size,base,facing,tilt,limbLag,meal.action,meal.offered,reduced]);
  const style = useAnimatedStyle(() => {
    const point = positions[frameIndex(current.value)];
    const elapsed = progress.value - clock.value.key * EPOCH;
    const ms = elapsed >= 0 && elapsed <= MEAL_MS ? elapsed : 0;
    return { opacity:!clock.value.drink && ms > 600 ? (MEAL_MS-ms)/150 : 1,
      transform:[{translateX:point.x},{translateY:point.y},{rotate:`${point.angle}deg`},{scale:reduced ? 1 : 1+((clock.value.releaseScale ?? 1)-1)*Math.max(0,1-ms/180)}] };
  });
  return <Animated.View testID="meal-held-food" pointerEvents="none" style={[{position:'absolute',left:0,top:0,width:1,height:1,transformOrigin:[0,0,0]},style]}>
    <FoodVariant {...{current,clock,meal,input,reduced}} after={false}/><FoodVariant {...{current,clock,meal,input,reduced}} after/>
  </Animated.View>;
}, (previous, next) => {
  const a = previous.input, b = next.input;
  const first = previous.meal, second = next.meal;
  // The UI clock owns the meal identity. Keep a prepared drawing when its
  // recipe and grip geometry are the same, including the first offered mango.
  return previous.current === next.current && previous.clock === next.clock &&
    previous.progress === next.progress && previous.reduced === next.reduced &&
    a.slot === b.slot && a.size === b.size && a.base === b.base && a.facing === b.facing &&
    a.tilt === b.tilt && a.limbLag === b.limbLag &&
    first.action === second.action && first.offered === second.offered &&
    first.food.item === second.food.item && first.food.tint === second.food.tint &&
    first.food.powered === second.food.powered;
});
/** Readiness changes the enclosing visibility, never the authored body. */
const MealDrawing=React.memo(function MealDrawing({input,meal,playback,renderCharacter}:{input:CharacterRenderInput;meal?:Meal;playback?:CharacterRenderInput['mealPlayback'];renderCharacter?:CharacterRenderer}) {
  const value=meal && playback?{...input,action:meal.action,meal:playback.frames[0].meal,mealPlayback:playback,blink:false}:input;
  return renderCharacter?.(value) ?? <HomeCharacter input={value}/>;
},(a,b)=>a.meal===b.meal && a.playback===b.playback && a.renderCharacter===b.renderCharacter && JSON.stringify(a.meal ? {...a.input,action:undefined} : a.input)===JSON.stringify(b.meal ? {...b.input,action:undefined} : b.input));
/** Persistent body; authored arm/mouth poses and one small held-food stage. */
export const MealArt=React.memo(function MealArt({ input, meal, reduced, renderCharacter, onPresented, onFinished, visible = true }: {
  input: CharacterRenderInput; meal?: Meal; visible?:boolean; reduced: boolean; renderCharacter?: CharacterRenderer; onPresented?: () => void; onFinished?: () => void;
}) {
  const clock=useSharedValue<{key:number;drink:boolean;releaseScale?:number}>({key:0,drink:false});
  const progress = useSharedValue(0), key = meal?.key ?? 0, slot = input.slot, drink=meal?.action==='drink';
  const current = useDerivedValue(() => {
    const elapsed = progress.value - clock.value.key * EPOCH;
    return mealIndex(elapsed >= 0 && elapsed <= MEAL_MS ? elapsed : 0);
  });
  const started = useRef(false), live = useRef(true), laidOut = useRef(false), prepared=useRef(false), playing=useRef(false), visibleRef=useRef(visible);
  useLayoutEffect(()=>{visibleRef.current=visible;},[visible]);
  const frameRequest = useRef<number | undefined>(undefined);
  const finish = useCallback(() => { if (live.current) onFinished?.(); }, [onFinished]);
  const renderMorph=useCallback((nodes:readonly React.ReactNode[])=>mealPaths(nodes,current,frameIndex,(index,children)=><OpacityLayer current={current} index={index}>{children}</OpacityLayer>),[current]);
  const renderLayer=useCallback((index:number | readonly number[],children:React.ReactNode)=><OpacityLayer current={current} index={index}>{children}</OpacityLayer>,[current]);
  // A new clock key must reuse the prepared SVG recipe, including Pip's first sip.
  const recipeAction=meal?.action,recipeOffered=meal?.offered,recipeItem=meal?.food.item,recipeTint=meal?.food.tint,recipePowered=meal?.food.powered;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the clock key and instance position do not affect authored art.
  const recipe = useMemo(() => meal, [recipeAction,recipeOffered,recipeItem,recipeTint,recipePowered]);
  const playback = useMemo(() => !recipe ? undefined : ({ progress,
    renderMorph,renderLayer,
    frames:mealTimes.map((time,index) => {
      const sampled = mealFrame(time,reduced);
      return {time,meal:{...sampled,bite:recipe.action === 'eat' && sampled.bite},
        face:time < 150 ? 'neutral' as const : recipe.action === 'drink' ? 'happy' as const : sampled.bite ? 'anticipate' as const : 'chew' as const,
        // Built-in rigs need only presence. Custom renderers can render this
        // recipe to get the real food without allocating unused SVG trees here.
        held:<AuthoredFoodFrame {...{slot,meal:recipe,time,index,reduced}}/>};
    }) }),[progress,renderMorph,renderLayer,recipe,reduced,slot]);
  const play=useCallback(()=>{
    if(!key || !live.current || playing.current)return;
    playing.current=true;
    progress.set(key*EPOCH);
    progress.set(withTiming(key*EPOCH+MEAL_MS,{duration:MEAL_MS,easing:Easing.linear,reduceMotion:ReduceMotion.Never},done=>{if(done)runOnJS(finish)();}));
  },[key,progress,finish]);
  const begin = useCallback(() => {
    laidOut.current = true;
    if (!key || started.current) return;
    started.current = true;
    frameRequest.current = requestAnimationFrame(() => {
      if (!live.current) return;
      frameRequest.current = requestAnimationFrame(() => {
        if (!live.current) return;
        prepared.current=true;
        if(visibleRef.current)play();
        onPresented?.();
      });
    });
  },[key,onPresented,play]);
  useLayoutEffect(() => {
    clock.set({key,drink,releaseScale:meal?.releaseScale});
    progress.set(key*EPOCH);
    live.current = true;
    if (laidOut.current) begin();
    return () => {
      live.current = false;
      started.current = false;
      prepared.current=false;
      playing.current=false;
      if (frameRequest.current !== undefined) cancelAnimationFrame(frameRequest.current);
      cancelAnimation(progress);
    };
  },[clock,key,drink,progress,begin,meal?.releaseScale]);
  useLayoutEffect(()=>{if(visible && prepared.current)play();},[visible,play]);
  return <View testID={meal ? 'meal-stage' : 'character-stage'} collapsable={false} onLayout={begin}
    style={{position:'absolute',left:0,top:0,right:0,bottom:0}}>
    <MealDrawing input={input} meal={recipe} playback={playback} renderCharacter={renderCharacter}/>
    {meal && <Food {...{current,clock,progress,meal,input,reduced}}/>}
  </View>;
},(a,b)=>a.meal===b.meal && a.visible===b.visible && a.reduced===b.reduced && a.renderCharacter===b.renderCharacter && a.onPresented===b.onPresented && a.onFinished===b.onFinished && JSON.stringify(a.input)===JSON.stringify(b.input));
