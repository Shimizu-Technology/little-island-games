import React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { roomOrigin, type Building } from '../camera';
import { roomIds } from '../catalogMore';
import type { SceneEntity } from '../scene/types';
import type { CharacterRender } from './EntityArt';
import type { Interaction } from './useInteraction';
import { footprintShadow } from './handFeel';

/** Floor/wall contacts only. Semantic targets own their single cue in TargetCue. */
export function LandingPreview({ source, interaction, building }: {
  source: SceneEntity; interaction: Interaction; building: Building; renderCharacter?: CharacterRender;
}) {
  const { slots } = interaction, footprint = footprintShadow(source);
  const style = useAnimatedStyle(() => {
    const slot = slots.value.find(s => s.id === source.id), p = slot?.proposal;
    const visible = slot?.ready && slot.phase === 'dragging' && p?.kind === 'floor';
    const origin = p ? roomOrigin(roomIds.indexOf(p.room), building) : { x: 0, y: 0 };
    return { opacity: visible ? .75 : 0,
      transform: [{ translateX: origin.x + (p?.contact.x ?? 0) }, { translateY: origin.y + (p?.contact.y ?? 0) }] };
  });
  return <Animated.View collapsable={false} testID={`landing-preview-${source.id}`} accessible={false} accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: 1, height: 1 }, style]}>
    {source.character ? <View testID="landing-footprints" style={{ position: 'absolute', left: -18, top: -8, width: 36, height: 16 }}>
      {[-1, 1].map(side => <View key={side} style={{ position: 'absolute', left: side < 0 ? 0 : 22, width: 14, height: 16,
        borderRadius: 9, borderWidth: 2, borderColor: '#477D60', backgroundColor: '#FFF8E944', transform: [{ rotate: `${side * -12}deg` }] }}/>) }
    </View> : <View style={{ position: 'absolute', left: -footprint.width / 2, top: -footprint.height / 2,
      width: footprint.width, height: footprint.height, borderRadius: source.body?.layer === 'wall' ? 4 : footprint.height,
      borderWidth: 2, borderColor: '#477D60', backgroundColor: '#E8F7C833' }}/ >}
  </Animated.View>;
}
