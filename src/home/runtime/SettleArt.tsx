import React from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { SceneEntity } from "../scene/types";
import { EntityArt, artFrame, type CharacterRender } from "./EntityArt";
import { CarriedCharacter } from "./CarriedCharacter";
import { carryBinding, renderAnchors } from "./rigGeometry";
import { layoutToken } from "./layout";
import { settleProgress } from "./settle";
import type { Interaction } from "./useInteraction";

/** Both poses remain mounted. Carry rotates into the destination before its opaque
 * contact pose takes over; the slot retains that pose until native resting layout. */
export function SettleArt({ source, destination = source, grip = { x: 0, y: 0 }, interaction, index, reduced,
  renderCharacter }: {
  source: SceneEntity; destination?: SceneEntity; grip?: { x: number; y: number };
  interaction: Interaction; index: number; reduced: boolean; renderCharacter?: CharacterRender;
}) {
  const { slots, clock, poseLayouts } = interaction;
  const token = layoutToken(destination);
  const start = carryBinding(source, grip);
  const carry = renderAnchors(source, true).bounds, final = artFrame(destination);
  const angle = destination.base === "lie" ? (destination.facing === "left" ? 90 : -90) : 0;
  const radians = angle * Math.PI / 180;
  const cx = carry.left + carry.width / 2, cy = carry.top + carry.height / 2;
  const rotatedX = cx * Math.cos(radians) - cy * Math.sin(radians);
  const rotatedY = cx * Math.sin(radians) + cy * Math.cos(radians);
  const end = { x: final.left + final.width / 2 - rotatedX, y: final.top + final.height / 2 - rotatedY };
  const progress = () => {
    "worklet";
    const s = slots.value[index];
    return ((s.phase === "settling" && s.settleAt) || (s.phase === "pending" && s.committed))
      ? settleProgress(s.phase === "pending" ? s.pausedElapsed : clock.value - s.settleAt, reduced) : 0;
  };
  const from = useAnimatedStyle(() => {
    const p = progress();
    return { opacity: p === 1 && poseLayouts.value[index] === token ? 0 : 1, transformOrigin: [0, 0, 0], transform: [
      { translateX: start.x + (end.x - start.x) * p },
      { translateY: start.y + (end.y - start.y) * p }, { rotate: `${angle * p}deg` },
    ] };
  });
  const to = useAnimatedStyle(() => ({ opacity: progress() === 1 && poseLayouts.value[index] === token ? 1 : 0 }));
  return <>
    <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, from]}>
      <CarriedCharacter entity={source} interaction={interaction} index={index} reduced={reduced} renderCharacter={renderCharacter} />
    </Animated.View>
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: final.left, top: final.top }, to]}>
      <View key={token} collapsable={false} onLayout={() => interaction.acknowledgePose(index, token)}
        style={{ width: final.width, height: final.height }}>
        <EntityArt entity={destination} reduced={reduced} renderCharacter={renderCharacter} />
      </View>
    </Animated.View>
  </>;
}
