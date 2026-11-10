import React, { useState } from 'react';
import { View } from 'react-native';
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import { roomOrigin, type Building } from '../camera';
import { roomIds } from '../catalogMore';
import type { SceneEntity } from '../scene/types';
import { EntityArt, artFrame, type CharacterRender } from './EntityArt';
import type { Interaction } from './useInteraction';
import { footprintShadow } from './handFeel';

/** The ghost reads the proposal itself; there is no second destination calculation. */
export function LandingPreview({ source, interaction, building, renderCharacter }: {
  source: SceneEntity; interaction: Interaction; building: Building; renderCharacter?: CharacterRender;
}) {
  const [pose, setPose] = useState<{ base: SceneEntity["base"]; facing: SceneEntity["facing"] }>();
  const { slots } = interaction;
  useAnimatedReaction(() => {
    const slot = slots.value.find(s => s.id === source.id), p = slot?.proposal;
    return source.character && slot?.ready && slot.phase === "dragging" && p && p.kind !== "staging"
      ? `${p.base}:${p.facing === "left" ? "left" : "front"}` : "";
  }, (next, previous) => {
    if (next === previous) return;
    if (!next) runOnJS(setPose)(undefined);
    else { const [base, facing] = next.split(":"); runOnJS(setPose)({ base: base as SceneEntity["base"], facing: facing as SceneEntity["facing"] }); }
  });
  const variants = source.character ? pose ? [{ ...source, ...pose }] : [] : [source];
  return <>{variants.map((entity, n) => <PreviewPose key={n} entity={entity} source={source}
    interaction={interaction} building={building} renderCharacter={renderCharacter} />)}</>;
}
function PreviewPose({ source, entity, interaction, building, renderCharacter }: {
  source: SceneEntity; entity: SceneEntity; interaction: Interaction; building: Building; renderCharacter?: CharacterRender;
}) {
  const { slots } = interaction, frame = artFrame(entity), footprint = footprintShadow(source);
  const style = useAnimatedStyle(() => {
    const s = slots.value.find(s => s.id === source.id), p = s?.proposal;
    const visible = s?.phase === 'dragging' && p && p.kind !== 'staging' &&
      (!source.character || p.base === entity.base && (p.facing === "left" ? "left" : "front") === entity.facing);
    const origin = p ? roomOrigin(roomIds.indexOf(p.room), building) : { x: 0, y: 0 };
    return { opacity: visible ? source.character ? .28 : .65 : 0,
      transform: [{ translateX: origin.x + (p?.contact.x ?? 0) }, { translateY: origin.y + (p?.contact.y ?? 0) }] };
  });
  return <Animated.View collapsable={false} testID={`landing-preview-${source.id}`} accessible={false} accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: 1, height: 1 }, style]}>
    {source.character ? <View style={{ position: 'absolute', left: frame.left, top: frame.top }}>
      <EntityArt entity={entity} reduced renderCharacter={renderCharacter} />
    </View> : <View style={{ position: 'absolute', left: -footprint.width / 2, top: -footprint.height / 2,
      width: footprint.width, height: footprint.height, borderRadius: source.body?.layer === 'wall' ? 4 : footprint.height,
      borderWidth: 3, borderColor: '#477D60', backgroundColor: '#E8F7C888' }} />}
  </Animated.View>;
}
