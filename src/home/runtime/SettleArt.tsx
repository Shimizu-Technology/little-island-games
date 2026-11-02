import React from "react";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { SceneEntity } from "../scene/types";
import { type CharacterRender } from "./EntityArt";
import { CarriedCharacter } from "./CarriedCharacter";
import { carryBinding } from "./rigGeometry";
import { settleProgress } from "./settle";
import type { Interaction } from "./useInteraction";
/** Keep one opaque carry pose until contact, then atomically reveal the resting tree. */
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
  const from = useAnimatedStyle(() => {
    const s = slots.value[index],
      elapsed = s.phase === "pending" ? s.pausedElapsed : clock.value - s.settleAt;
    const p =
      (s.phase === "settling" && s.settleAt) || (s.phase === "pending" && s.committed)
        ? settleProgress(elapsed, reduced)
        : 0;
    return {
      opacity: 1,
      transform: [{ translateX: start.x + (end.x - start.x) * p }, { translateY: start.y + (end.y - start.y) * p }],
    };
  });
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, from]}>
      <CarriedCharacter
        entity={source}
        interaction={interaction}
        index={index}
        reduced={reduced}
        renderCharacter={renderCharacter}
      />
    </Animated.View>
  );
}
