import React, {memo, useLayoutEffect, useMemo} from 'react';
import Animated, {useAnimatedProps, useSharedValue, type SharedValue} from 'react-native-reanimated';
import {G} from 'react-native-svg';
import {HomeCharacter, type CharacterRenderer} from '../characterRenderer';
import type {CarryGrip, CharacterRenderInput, RigLife} from '../../islander/rig/character';

const AnimatedGroup=Animated.createAnimatedComponent(G);
function GripLayer({holding,selected,children}:{holding:SharedValue<boolean>;selected:boolean;children:React.ReactNode}) {
  const props=useAnimatedProps(()=>({opacity:holding.value===selected?1:0}));
  return <AnimatedGroup animatedProps={props}>{children}</AnimatedGroup>;
}
type Input=CharacterRenderInput & Pick<RigLife,'blink'>;
/** A first cup changes one arm, not every resting/landing SVG body. */
export const CharacterDrawing=memo(function CharacterDrawing({input,renderCharacter}:{input:Input;renderCharacter?:CharacterRenderer}) {
  const holding=useSharedValue(input.action==='hold');
  // An authored prop (the chef's spoon) must use the same pose as its supporting hand.
  const eligible=input.slot===0 && !input.held && !input.carryGrip && !input.mealPlayback && (input.action===null || input.action==='hold');
  useLayoutEffect(()=>{if(eligible)holding.set(input.action==='hold');},[holding,eligible,input.action]);
  const grip=useMemo<CarryGrip>(()=>({renderLayer:(selected,children)=><GripLayer holding={holding} selected={selected}>{children}</GripLayer>}),[holding]);
  const normalized=eligible?{...input,action:null,carryGrip:grip}:input;
  const signature=JSON.stringify({...normalized,carryGrip:undefined,held:!!normalized.held});
  // The normalized input is structurally the same through null <-> hold. The
  // native grip driver changes, while the body and authored right-arm layers stay.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(()=>renderCharacter?.(normalized) ?? <HomeCharacter input={normalized}/>,[signature,normalized.carryGrip,normalized.held,renderCharacter]);
});
