import React from "react";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { SceneEntity } from "../scene/types";
import { EntityArt, artFrame, type CharacterRender } from "./EntityArt";
import { CarriedCharacter } from "./CarriedCharacter";
import { carryBinding } from "./rigGeometry";
import { settleProgress } from "./settle";
import type { Interaction } from "./useInteraction";
/** Carry and supported art share an anatomical contact through the pose crossfade. */
export function SettleArt({
  source,
  destination,
  grip = { x: 0, y: 0 },
  interaction,
  index,
  reduced,
  renderCharacter,
}: {
  source: SceneEntity;
  destination?: SceneEntity;
  grip?: { x: number; y: number };
  interaction: Interaction;
  index: number;
  reduced: boolean;
  renderCharacter?: CharacterRender;
}) {
  const { slots, clock } = interaction;
  const start = carryBinding(source, grip),
    end = destination ? carryBinding(destination, grip, start.marker) : start;
  const blend = () => {
    "worklet";
    const s = slots.value[index],
      elapsed = s.phase === "pending" ? s.pausedElapsed : clock.value - s.settleAt;
    return destination && ((s.phase === "settling" && s.settleAt) || (s.phase === "pending" && s.committed))
      ? reduced
        ? 1
        : Math.min(1, Math.max(0, (elapsed - 120) / 120))
      : 0;
  };
  const from = useAnimatedStyle(() => {
    const s = slots.value[index],
      elapsed = s.phase === "pending" ? s.pausedElapsed : clock.value - s.settleAt;
    const p =
      (s.phase === "settling" && s.settleAt) || (s.phase === "pending" && s.committed)
        ? settleProgress(elapsed, reduced)
        : 0;
    return {
      opacity: 1 - blend(),
      transform: [{ translateX: start.x + (end.x - start.x) * p }, { translateY: start.y + (end.y - start.y) * p }],
    };
  });
  const to = useAnimatedStyle(() => ({ opacity: blend() }));
  const b = destination ? artFrame(destination) : artFrame(source);
  return (
    <>
      <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, from]}>
        <CarriedCharacter
          entity={source}
          interaction={interaction}
          index={index}
          reduced={reduced}
          renderCharacter={renderCharacter}
        />
      </Animated.View>
      {destination && (
        <Animated.View style={[{ position: "absolute", left: b.left, top: b.top }, to]}>
          <EntityArt entity={destination} reduced={reduced} renderCharacter={renderCharacter} />
        </Animated.View>
      )}
    </>
  );
}
