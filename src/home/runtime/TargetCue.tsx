import React from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { Target } from "../scene/types";
import type { Interaction } from "./useInteraction";
/** Rounded, pictorial contact cue. It has no input or collision geometry. */
export function TargetCue({ target, interaction }: { target: Target; interaction: Interaction }) {
  const { slots } = interaction;
  const style = useAnimatedStyle(() => ({
    opacity: slots.value.some((s) => s.id && s.phase === "dragging" && s.proposal?.target === target.id) ? 1 : 0,
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: target.contact.x - 22,
          top: target.contact.y - 12,
          width: 44,
          height: 24,
          borderRadius: 30,
          borderWidth: 3,
          borderColor: "#78B693",
          backgroundColor: "#E8F7C899",
        },
        style,
      ]}
    >
      <View
        style={{
          position: "absolute",
          left: 12,
          top: 5,
          width: 14,
          height: 7,
          borderBottomWidth: 3,
          borderColor: "#477D60",
          borderRadius: 9,
        }}
      />
    </Animated.View>
  );
}
