import React from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { SceneEntity } from "../scene/types";
import { EntityArt, artFrame, type CharacterRender } from "./EntityArt";
import { CarriedCharacter } from "./CarriedCharacter";
import { carryBinding, renderAnchors } from "./rigGeometry";
import { poseToken, poseVariants } from "./poseBank";
import { settleProgress } from "./settle";
import type { Interaction } from "./useInteraction";

/** All destination art mounts on contact, before release. Only opacity/transform
 * change during travel; no JS proposal render is needed to begin the pose blend. */
export function SettleArt({ source, destination = source, grip = { x: 0, y: 0 }, interaction, index, reduced,
  renderCharacter }: {
  source: SceneEntity; destination?: SceneEntity; grip?: { x: number; y: number };
  interaction: Interaction; index: number; reduced: boolean; renderCharacter?: CharacterRender;
}) {
  const { slots, clock } = interaction;
  const start = carryBinding(source, grip), head = renderAnchors(source, true).head;
  const variants = poseVariants({ ...source, action: destination.action });
  const poses = Object.fromEntries(variants.map((v) => [poseToken(v.base, v.facing, v.action), {
    head: renderAnchors(v).head, angle: v.base === "lie" ? (v.facing === "left" ? 90 : -90) : 0,
  }]));
  const from = useAnimatedStyle(() => {
    const s = slots.value[index];
    const active = (s.phase === "settling" && s.settleAt > 0) || (s.phase === "pending" && s.pausedElapsed > 0);
    const p = active ? settleProgress(s.phase === "pending" ? s.pausedElapsed : clock.value - s.settleAt, reduced) : 0;
    const base = s.proposal?.base ?? source.base, facing = s.proposal?.facing ?? source.facing;
    const pose = poses[poseToken(base, facing, destination.action)];
    const blend = Math.max(0, Math.min(1, (p - .12) / .65));
    return { opacity: 1 - blend, transformOrigin: [head.x, head.y, 0], transform: [
      { translateX: start.x + (pose.head.x - head.x - start.x) * p },
      { translateY: start.y + (pose.head.y - head.y - start.y) * p }, { rotate: `${pose.angle * p}deg` },
    ] };
  });
  return <>
    <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, from]}>
      <CarriedCharacter entity={source} interaction={interaction} index={index} reduced={reduced} renderCharacter={renderCharacter} />
    </Animated.View>
    {variants.map((entity) => <TargetPose key={poseToken(entity.base, entity.facing, entity.action)}
      entity={entity} source={source} startHead={{ x: head.x + start.x, y: head.y + start.y }}
      interaction={interaction} index={index} reduced={reduced} renderCharacter={renderCharacter} />)}
  </>;
}
function TargetPose({ entity, source, startHead, interaction, index, reduced, renderCharacter }: {
  entity: SceneEntity; source: SceneEntity; startHead: { x: number; y: number };
  interaction: Interaction; index: number; reduced: boolean; renderCharacter?: CharacterRender;
}) {
  const { slots, clock } = interaction, frame = artFrame(entity), head = renderAnchors(entity).head;
  const token = poseToken(entity.base, entity.facing, entity.action);
  const angle = entity.base === "lie" ? (entity.facing === "left" ? 90 : -90) : 0;
  const style = useAnimatedStyle(() => {
    const s = slots.value[index];
    const active = (s.phase === "settling" && s.settleAt > 0) || (s.phase === "pending" && s.pausedElapsed > 0);
    const p = active ? settleProgress(s.phase === "pending" ? s.pausedElapsed : clock.value - s.settleAt, reduced) : 0;
    const selected = poseToken(s.proposal?.base ?? source.base, s.proposal?.facing ?? source.facing, entity.action) === token;
    return { opacity: selected ? Math.max(0, Math.min(1, (p - .12) / .65)) : 0,
      transformOrigin: [head.x - frame.left, head.y - frame.top, 0], transform: [
        { translateX: (startHead.x - head.x) * (1 - p) },
        { translateY: (startHead.y - head.y) * (1 - p) }, { rotate: `${angle * (p - 1)}deg` },
      ] };
  });
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: frame.left, top: frame.top }, style]}>
    <View collapsable={false} onLayout={() => interaction.acknowledgePose(index, token)} style={{ width: frame.width, height: frame.height }}>
      <EntityArt entity={entity} reduced={reduced} renderCharacter={renderCharacter} />
    </View>
  </Animated.View>;
}
