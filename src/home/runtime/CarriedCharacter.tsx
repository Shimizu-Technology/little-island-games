import React from "react";
import Animated, { useAnimatedStyle, useDerivedValue } from "react-native-reanimated";
import type { SceneEntity } from "../scene/types";
import { EntityArt, type CharacterRender } from "./EntityArt";
import { renderAnchors, carrySample } from "./rigGeometry";
import type { Interaction } from "./useInteraction";
function CarryFrame({
  entity,
  sample,
  index,
  interaction,
  reduced,
  renderCharacter,
}: {
  entity: SceneEntity;
  sample: number;
  index: number;
  interaction: Interaction;
  reduced: boolean;
  renderCharacter?: CharacterRender;
}) {
  const options = carrySample(sample),
    frame = renderAnchors(entity, true, options.tilt, options.limbLag).bounds;
  const { slots } = interaction;
  const visible = useDerivedValue(() => (reduced ? 0 : Math.max(-4, Math.min(4, Math.round(slots.value[index].lag / 2.5)))) === sample ? 1 : 0);
  const style = useAnimatedStyle(() => ({ opacity: visible.value }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: frame.left,
          top: frame.top,
          transformOrigin: [-frame.left, -frame.top, 0],
          transform: [{ rotate: `${-options.tilt}deg` }],
        },
        style,
      ]}
    >
      <EntityArt
        entity={entity}
        carry
        reduced={reduced}
        renderCharacter={renderCharacter}
        tilt={options.tilt}
        limbLag={options.limbLag}
      />
    </Animated.View>
  );
}
/** Authored rig frames switch entirely on the UI thread. Primary motion remains continuous. */
export function CarriedCharacter(props: {
  entity: SceneEntity;
  index: number;
  interaction: Interaction;
  reduced: boolean;
  renderCharacter?: CharacterRender;
}) {
  return (
    <>
      {(props.reduced ? [0] : [-4, -3, -2, -1, 0, 1, 2, 3, 4]).map((sample) => (
        <CarryFrame key={sample} sample={sample} {...props} />
      ))}
    </>
  );
}
