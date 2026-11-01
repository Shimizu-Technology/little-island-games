import React from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SceneEntity } from '../scene/types';
import { EntityArt, artFrame, type CharacterRender } from './EntityArt';
import type { Interaction } from './useInteraction';
/** Pose crossfade shares the final contact; it never exposes the old resting tree. */
export function SettleArt({ source, destination, interaction, index, reduced, renderCharacter }: { source: SceneEntity; destination?: SceneEntity; interaction: Interaction; index: number; reduced: boolean; renderCharacter?: CharacterRender }) {
  const { slots, clock } = interaction;
  const blend = () => {
    'worklet';
    const s = slots.value[index];
    return destination && s.phase === 'settling' && s.settleAt ? reduced ? 1 : Math.min(1, Math.max(0, (clock.value - s.settleAt - 120) / 120)) : 0;
  };
  const from = useAnimatedStyle(() => ({ opacity: 1 - blend() }));
  const to = useAnimatedStyle(() => ({ opacity: blend() }));
  const a = artFrame(source, !!source.character), b = destination ? artFrame(destination) : a;
  return <>
    <Animated.View style={[{ position: 'absolute', left: a.left, top: a.top }, from]}><EntityArt entity={source} carry={!!source.character} reduced={reduced} renderCharacter={renderCharacter} /></Animated.View>
    {destination && <Animated.View style={[{ position: 'absolute', left: b.left, top: b.top }, to]}><EntityArt entity={destination} reduced={reduced} renderCharacter={renderCharacter} /></Animated.View>}
  </>;
}
