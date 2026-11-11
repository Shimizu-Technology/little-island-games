import React from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useDerivedValue } from "react-native-reanimated";
import type { CharacterBase, SceneEntity } from "../scene/types";
import { EntityArt, artFrame, type CharacterRender } from "./EntityArt";
import { CarriedCharacter } from "./CarriedCharacter";
import { carryBinding, renderAnchors, limbBottom } from "./rigGeometry";
import { poseToken, poseVariants } from "./poseBank";
import { settleProgress } from "./settle";
import { poseHandoff, type SupportPlane } from "./poseHandoff";
import type { Interaction } from "./useInteraction";

/** Destination trees mount before release. A single opaque art swap happens
 * during continuous travel, without waiting for a JS proposal render. */
export function SettleArt({ source, destination = source, grip = { x: 0, y: 0 }, interaction, index, reduced, supportPlanes,
  renderCharacter, bases }: {
  source: SceneEntity; destination?: SceneEntity; grip?: { x: number; y: number };
  /** HM-13: mount target poses only for bases the reachable rooms offer. Geometry covers all. */
  bases?: readonly CharacterBase[];
  interaction: Interaction; index: number; reduced: boolean; supportPlanes?: Record<string, SupportPlane>; renderCharacter?: CharacterRender;
}) {
  const { slots, clock, poseLayouts } = interaction;
  const start = carryBinding(source, grip), head = renderAnchors(source, true).head;
  const variants = poseVariants({ ...source, action: destination.action });
  const mounted = variants.filter((v) => !bases || bases.includes(v.base));
  const mountedTokens = mounted.map((v) => poseToken(v.base, v.facing, v.action));
  const poses = Object.fromEntries(variants.map((v) => [poseToken(v.base, v.facing, v.action), {
    head: renderAnchors(v).head, bottom: limbBottom(v), angle: v.base === "lie" ? (v.facing === "left" ? 90 : -90) : 0,
  }]));
  const from = useAnimatedStyle(() => {
    const s = slots.value[index];
    const active = (s.phase === "settling" && s.settleAt > 0) || (s.phase === "pending" && s.pausedElapsed > 0);
    const p = active ? settleProgress(s.phase === "pending" ? s.pausedElapsed : clock.value - s.settleAt, reduced, s.duration) : 0;
    const base = s.proposal?.base ?? source.base, facing = s.proposal?.facing ?? source.facing;
    const requested = poseToken(base, facing, destination.action);
    const pose = poses[requested] ?? poses[poseToken("stand", "front", destination.action)];
    // R4: the carried art stays until the requested pose is mounted and natively laid out. A room
    // reached mid-carry mounts its poses through JS, which can lag the UI-thread proposal.
    const landed = mountedTokens.includes(requested) && poseLayouts?.value[`${index}:${requested}`] === requested;
    const attachment = s.proposal?.attachment;
    const support = attachment?.kind === "socket" ? supportPlanes?.[attachment.item] : undefined;
    const sample = poseHandoff(p, { x: s.releaseX, y: s.releaseY }, { x: s.targetX, y: s.targetY },
      { x: head.x + start.x, y: head.y + start.y }, pose.head, pose.bottom, pose.angle, support);
    return { opacity: active && landed ? sample.carryOpacity : 1, transformOrigin: [head.x, head.y, 0], transform: [
      { translateX: start.x + (pose.head.x - head.x - start.x) * p },
      { translateY: start.y + (pose.head.y - head.y - start.y) * p }, { rotate: "0deg" },
    ] };
  });
  return <>
    <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, from]}>
      <CarriedCharacter entity={source} interaction={interaction} index={index} reduced={reduced} renderCharacter={renderCharacter} />
    </Animated.View>
    {mounted.map((entity) => <TargetPose key={poseToken(entity.base, entity.facing, entity.action)}
      entity={entity} source={source} startHead={{ x: head.x + start.x, y: head.y + start.y }}
      interaction={interaction} index={index} reduced={reduced} supportPlanes={supportPlanes} renderCharacter={renderCharacter} />)}
  </>;
}
function TargetPose({ entity, source, startHead, interaction, index, reduced, supportPlanes, renderCharacter }: {
  entity: SceneEntity; source: SceneEntity; startHead: { x: number; y: number };
  interaction: Interaction; index: number; reduced: boolean; supportPlanes?: Record<string, SupportPlane>; renderCharacter?: CharacterRender;
}) {
  const { slots, clock } = interaction, frame = artFrame(entity), head = renderAnchors(entity).head;
  const token = poseToken(entity.base, entity.facing, entity.action);
  const bottom = limbBottom(entity);
  const angle = entity.base === "lie" ? (entity.facing === "left" ? 90 : -90) : 0;
  const forget = interaction.forgetPose;
  React.useEffect(() => () => forget?.(index, token), [forget, index, token]);
  const selected = useDerivedValue(() => {
    const s = slots.value[index];
    return poseToken(s.proposal?.base ?? source.base, s.proposal?.facing ?? source.facing, entity.action) === token;
  });
  const progress = useDerivedValue(() => {
    if (!selected.value) return 0;
    const s = slots.value[index];
    const active = s.phase === "settling" && s.settleAt > 0 || s.phase === "pending" && s.pausedElapsed > 0;
    return active ? settleProgress(s.phase === "pending" ? s.pausedElapsed : clock.value - s.settleAt, reduced, s.duration) : 0;
  });
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const s = slots.value[index], attachment = s.proposal?.attachment;
    const active = s.settleAt > 0 || s.pausedElapsed > 0;
    const support = attachment?.kind === "socket" ? supportPlanes?.[attachment.item] : undefined;
    const sample = poseHandoff(p, { x: s.releaseX, y: s.releaseY }, { x: s.targetX, y: s.targetY },
      startHead, head, bottom, angle, support);
    return { opacity: selected.value && active ? sample.targetOpacity : 0,
      transformOrigin: [head.x - frame.left, head.y - frame.top, 0], transform: [
        { translateX: sample.x }, { translateY: sample.y }, { rotate: `${sample.rotation}deg` },
      ] };

  });
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: frame.left, top: frame.top }, style]}>
    <View collapsable={false} onLayout={() => interaction.acknowledgePose(index, token)} style={{ width: frame.width, height: frame.height }}>
      <EntityArt entity={entity} reduced={reduced} renderCharacter={renderCharacter} />
    </View>
  </Animated.View>;
}
