import React from "react";
import Svg, { Path } from "react-native-svg";
import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { Target } from "../scene/types";
import type { Interaction } from "./useInteraction";
/** Reads the shared resting state (HM-13): it changes when the proposal's target changes, not per frame. */
function useCueStyle(target: Target, interaction: Interaction) {
  const { restingFlags } = interaction;
  return useAnimatedStyle(() => ({ opacity: restingFlags.value.dragTargets.includes(target.id) ? 1 : 0 }));
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
  if (target.kind === "mouth") return <Animated.View testID="mouth-target-halo" pointerEvents="none"
    accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[{ position: "absolute", left: (target.face?.x ?? target.contact.x) - (target.face?.headRadius ?? 40) - 34, top: target.contact.y - 15, width: 24, height: 24 }, style]}>
    <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M8 3Q1 12 8 21M16 3Q23 12 16 21"
      fill="none" stroke="#FFF5CF" strokeWidth={6} strokeLinecap="round"/><Path d="M8 3Q1 12 8 21M16 3Q23 12 16 21"
      fill="none" stroke="#C68A50" strokeWidth={2} strokeLinecap="round"/></Svg>
  </Animated.View>;
  if (target.kind === "hand") return <Animated.View testID="open-hand-preview" pointerEvents="none"
    accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[{ position: "absolute", left: (target.projectedContact ?? target.contact).x - 16, top: (target.projectedContact ?? target.contact).y - 22, width: 32, height: 40 }, style]}>
    <View style={{ position: "absolute", left: 7, top: 15, width: 22, height: 22, borderRadius: 10,
      borderWidth: 3, borderColor: "#477D60", backgroundColor: "#E8F7C8AA" }} />
    {[0, 1, 2, 3].map(n => <View key={n} style={{ position: "absolute", left: 7 + n * 6, top: n === 0 || n === 3 ? 5 : 0,
      width: 6, height: 23, borderRadius: 4, borderWidth: 2, borderColor: "#477D60", backgroundColor: "#E8F7C8" }} />)}
    <View style={{ position: "absolute", left: 0, top: 20, width: 14, height: 8, borderRadius: 5,
      borderWidth: 2, borderColor: "#477D60", backgroundColor: "#E8F7C8", transform: [{ rotate: "35deg" }] }} />
  </Animated.View>;
  if (target.kind === 'container') return <Animated.View testID="storage-landing-cue" pointerEvents="none"
    accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[{ position: 'absolute', left: target.core.left, top: target.core.top, width: target.core.width, height: target.core.height, borderRadius: 16, borderWidth: 4, borderColor: target.closed ? '#A66A32' : '#477D60', backgroundColor: target.closed ? '#FFE4A888' : '#E8F7C855', alignItems: 'center', justifyContent: 'center' }, style]}>
    {target.closed ? <Svg width={32} height={32} viewBox="0 0 32 32"><Path d="M5 12H27L24 28H8ZM9 10V5H14V10M18 10V5H23V10" fill="#D7AE74" stroke="#A66A32" strokeWidth={3}/></Svg> : <Svg width={32} height={32} viewBox="0 0 32 32"><Path d="M16 3V23M8 15L16 23L24 15M5 25V29H27V25" fill="none" stroke="#FFF8E9" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round"/><Path d="M16 3V23M8 15L16 23L24 15M5 25V29H27V25" fill="none" stroke="#477D60" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/></Svg>}
  </Animated.View>;
  if (target.kind === 'socket') {
    const region = target.rim ?? target.activation ?? target.core ?? { left: target.contact.x - 26, top: target.contact.y - 12, width: 52, height: 24 };
    const pose = target.base === 'lie' ? 'M10 18a7 7 0 1 0 0 .1M21 22H58M25 22V32M54 22L63 32'
      : target.base === 'bathe' ? 'M31 5a7 7 0 1 0 0 .1M29 20V33M12 30Q32 45 53 30M11 23h1m43-6h1M18 13h1'
      : 'M27 5a7 7 0 1 0 0 .1M25 20V34H47V47';
    return <Animated.View testID="socket-landing-outline" pointerEvents="none"
      accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[{ position: 'absolute', left: region.left - 5, top: region.top - 5, width: region.width + 10, height: region.height + 10,
        borderRadius: 22, borderWidth: 5, borderColor: '#F5BF49', backgroundColor: '#FFD66B33' }, style]}>
      <View testID={`hover-pose-${target.base}`} style={{ position: 'absolute', right: 8, top: -58,
        width: 76, height: 62, borderRadius: 22, borderWidth: 3, borderColor: '#E6AB37', backgroundColor: '#FFF5D9', alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={68} height={52} viewBox="0 0 68 52"><Path d={pose} fill="none" stroke="#9C6528" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"/></Svg>
      </View>
    </Animated.View>;
  }
  if (target.kind !== "surface") return null;
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
