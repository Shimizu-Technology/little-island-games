import React from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useDerivedValue } from "react-native-reanimated";
import type { Target } from "../scene/types";
import type { Interaction } from "./useInteraction";
function useCueStyle(target: Target, interaction: Interaction) {
  const { slots } = interaction;
  const visible = useDerivedValue(() => slots.value.some((s) => s.id && s.phase === "dragging" && s.proposal?.target === target.id) ? 1 : 0);
  return useAnimatedStyle(() => ({ opacity: visible.value }));
}
/** A floor seat lights up under whoever is about to sit, with a small seated figure beside it. Painted just above the rug. */
export function SeatRimCue({ target, interaction }: { target: Target; interaction: Interaction }) {
  const style = useCueStyle(target, interaction), rim = target.rim!;
  return (
    <Animated.View testID="seat-rim" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none"
      style={[{ position: "absolute", left: rim.left, top: rim.top, width: rim.width, height: rim.height }, style]}>
      <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, borderRadius: rim.height, borderWidth: 6, borderColor: "#78B693", backgroundColor: "#E8F7C855" }} />
      <View testID="seat-rim-figure" style={{ position: "absolute", right: -12, top: -34, width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFF8E9", borderWidth: 3, borderColor: "#78B693" }}>
        <View style={{ position: "absolute", left: 21, top: 8, width: 13, height: 13, borderRadius: 7, backgroundColor: "#477D60" }} />
        <View style={{ position: "absolute", left: 18, top: 21, width: 8, height: 18, borderRadius: 4, backgroundColor: "#477D60" }} />
        <View style={{ position: "absolute", left: 18, top: 33, width: 22, height: 7, borderRadius: 4, backgroundColor: "#477D60" }} />
      </View>
    </Animated.View>
  );
}
/** Rounded, pictorial contact cue. It has no input or collision geometry. */
export function TargetCue({ target, interaction }: { target: Target; interaction: Interaction }) {
  const style = useCueStyle(target, interaction);
  return (
    <Animated.View
      accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
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
