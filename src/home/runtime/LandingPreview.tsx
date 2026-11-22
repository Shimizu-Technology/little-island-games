import React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { roomOrigin, type Building } from '../camera';
import { roomIds } from '../catalogMore';
import type { Scene, SceneEntity } from '../scene/types';
import type { CharacterRender } from './EntityArt';
import type { Interaction } from './useInteraction';
import { paintedBounds } from '../art/silhouettes';
import { anchorsFor, species } from '../scene/species';
import { faceZone } from '../scene/resolve';
import { footprintShadow } from './handFeel';

/** Floor/wall contacts only. Semantic targets own their single cue in TargetCue. */
export function LandingPreview({ source, interaction, building, scene, reduced = false }: {
  scene?: Pick<Scene,"entities">; reduced?:boolean; source: SceneEntity; interaction: Interaction; building: Building; renderCharacter?: CharacterRender;
}) {
  const { slots, camera } = interaction, footprint = footprintShadow(source);
  const characters = Object.values(scene?.entities ?? {}).filter(e => e.character).map(e => ({room:e.room,bounds:paintedBounds(e) ?? {...e.bounds,left:e.contact.x+e.bounds.left,top:e.contact.y+e.bounds.top}}));
  const faces = Object.values(scene?.entities ?? {}).filter(e => e.character).map(e => {
    const mouth = anchorsFor(e.character!.slot,e.base,e.facing,e.action).head;
    return {room:e.room,x:e.contact.x+mouth.x,y:e.contact.y+mouth.y,headRadius:species[e.character!.slot].headRadius};
  });
  const style = useAnimatedStyle(() => {
    const slot = slots.value.find(s => s.id === source.id), p = slot?.proposal;
    let visible = slot?.ready && slot.phase === 'dragging' && p?.kind === 'floor';
    const origin = p ? roomOrigin(roomIds.indexOf(p.room), building) : { x: 0, y: 0 };
    if (visible && p) {
      if (characters.some(c => c.room === p.room && c.bounds && p.contact.x >= c.bounds.left && p.contact.x <= c.bounds.left+c.bounds.width &&
        p.contact.y >= c.bounds.top && p.contact.y <= c.bounds.top+c.bounds.height)) visible = false;
      const aim = {x:slot!.x-origin.x+(source.visual?.x ?? source.bounds.left+source.bounds.width/2),
        y:slot!.y-origin.y+(source.visual?.y ?? source.bounds.top+source.bounds.height/2)};
      if (source.body?.edible && faces.some(f => f.room === p.room && Math.hypot(aim.x-f.x,aim.y-f.y) <=
        Math.max(faceZone.minPt / Math.max(.1,camera.value.a),f.headRadius*faceZone.headFactor)+16)) visible = false;
    }
    return { opacity: visible ? withTiming(.75, {duration:reduced ? 0 : 90}) : 0,
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
