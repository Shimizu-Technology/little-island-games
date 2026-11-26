import React, { useEffect, useState } from "react";
import { Animated } from "react-native";
import Reanimated, { runOnJS, useAnimatedReaction, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { nativeDriver, useReducedMotion } from "../../components/motion";
import type { PalmState } from "../games/palm-patrol/engine";
import type { PalmArtPose } from "./poses";
export function Bob({ children, wiggle = false }: { children: React.ReactNode; wiggle?: boolean }) {
  const reduced = useReducedMotion(),
    [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) {
      t.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: wiggle ? 550 : 1100, useNativeDriver: nativeDriver }),
        Animated.timing(t, { toValue: 0, duration: wiggle ? 550 : 1100, useNativeDriver: nativeDriver }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [reduced, t, wiggle]);
  return (
    <Animated.View
      style={{
        transform: wiggle
          ? [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["-3deg", "3deg"] }) }]
          : [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export function PalmRecoil({ poses, scale, canvas, children }: {
  poses: SharedValue<PalmArtPose[]>;
  scale: number;
  canvas: number;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const recoil = poses.value[57]?.recoil ?? 0;
    return { transform: [{ translateY: recoil * 3.2 * scale }, { scaleX: 1 + recoil * 0.032 }, { scaleY: 1 - recoil * 0.12 }] };
  });
  return <Reanimated.View testID="palm-recoil" style={[{ width: canvas, height: canvas }, style]}>{children}</Reanimated.View>;
}

export function PalmBossFlash({ poses, canvas, children }: {
  poses: SharedValue<PalmArtPose[]>;
  canvas: number;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => ({ opacity: poses.value[15]?.flash ?? 0 }));
  return (
    <Reanimated.View testID="palm-boss-flash" style={[{ position: "absolute", left: 0, top: 0, width: canvas, height: canvas }, style]}>
      {children}
    </Reanimated.View>
  );
}

/** Deliver shot sounds and impact cues without publishing presentation counters to React. */
export function usePalmSounds(state: SharedValue<PalmState>, onTone: (key: string, haptic?: boolean) => void) {
  useAnimatedReaction(
    () => {
      const { event, shots, cue } = state.value;
      return { event, shots, cue };
    },
    (next, before) => {
      if (!before || next.event === before.event) return;
      const shots = next.shots - before.shots;
      if (shots > 0) runOnJS(onTone)("coral", false);
      if (next.event - before.event > shots && next.cue !== "hit")
        runOnJS(onTone)(next.cue === "net" ? "clear" : next.cue === "shield" ? "shell-1" : "shell-2", true);
    },
    [state, onTone]
  );
}
