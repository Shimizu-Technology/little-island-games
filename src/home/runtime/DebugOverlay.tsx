import React from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import Animated, { useAnimatedProps, useAnimatedStyle } from "react-native-reanimated";
import Svg, { Circle, Line } from "react-native-svg";
import { Tool } from "./HomeChrome";
import type { Interaction } from "./useInteraction";
const AText = Animated.createAnimatedComponent(TextInput);
const ACircle = Animated.createAnimatedComponent(Circle);
const ALine = Animated.createAnimatedComponent(Line);
export function DebugOverlay({
  interaction,
  width,
  height,
  stress,
  onStress,
}: {
  interaction: Interaction;
  width: number;
  height: number;
  stress: boolean;
  onStress: () => void;
}) {
  const { slots, controller, frameTimes, camera, clock } = interaction;
  const props = useAnimatedProps<TextInputProps & { text: string }>(() => {
    const s = slots.value[0];
    const sampledAt = clock.value;
    void sampledAt;
    const times = frameTimes.value;
    const text = `${controller.value.phase} • ${s.proposal?.kind ?? "—"} • ${s.proposal?.target ?? "no target"} • ${(times[times.length - 1] ?? 0).toFixed(1)}ms`;
    return { text, value: text, defaultValue: text };
  });
  const line = useAnimatedProps(() => {
    const s = slots.value[0],
      c = camera.value;
    return { x1: s.pointerX, y1: s.pointerY, x2: s.x * c.a + c.tx, y2: s.y * c.a + c.ty, opacity: s.id ? 1 : 0 };
  });
  const pointer = useAnimatedProps(() => {
    const s = slots.value[0];
    return { cx: s.pointerX, cy: s.pointerY, opacity: s.id ? 1 : 0 };
  });
  const grip = useAnimatedProps(() => {
    const s = slots.value[0],
      c = camera.value;
    return { cx: s.x * c.a + c.tx, cy: s.y * c.a + c.ty, opacity: s.id ? 1 : 0 };
  });
  const style = useAnimatedStyle(() => ({ opacity: 1 }));
  return (
    <Animated.View pointerEvents="box-none" style={[{ position: "absolute", left: 0, top: 0, width, height }, style]}>
      <Svg pointerEvents="none" width={width} height={height}>
        <ALine stroke="#AD5B54" strokeWidth={2} animatedProps={line} />
        <ACircle r={8} fill="none" stroke="#DC5848" strokeWidth={2} animatedProps={pointer} />
        <ACircle r={4} fill="#367D6A" animatedProps={grip} />
      </Svg>
      <AText
        editable={false}
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 12,
          bottom: 52,
          width: width - 24,
          color: "#173F39",
          fontFamily: "Menlo",
          fontSize: 12,
          backgroundColor: "#FFF8E9CC",
        }}
        animatedProps={props}
      />
      <View style={{ position: "absolute", left: 12, bottom: 4, flexDirection: "row", alignItems: "center" }}>
        <Tool label="Toggle stress fixture" symbol="⚙" onPress={onStress} selected={stress} />
        <Text style={{ color: "#284F4B", backgroundColor: "#FFF8E9", padding: 8 }}>
          {stress ? "Stress art: 12 actors + props" : "Interaction lab"}
        </Text>
      </View>
    </Animated.View>
  );
}
