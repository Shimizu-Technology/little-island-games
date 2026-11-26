import React, { useEffect, useState } from "react";
import { Animated } from "react-native";
import Reanimated, { runOnJS, useAnimatedReaction, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { nativeDriver, useReducedMotion } from "../../components/motion";
import type { PalmState } from "../games/palm-patrol/engine";
import type { BeachState } from "../games/beach-ball/engine";
import type { SpritePose } from "../poses";
import type { PalmArtPose } from "./poses";

export type BeachArtPose = SpritePose & {
  spin?: number;
  squash?: number;
  wallSquash?: number;
  glow?: number;
  dip?: number;
  tilt?: number;
  shine?: number;
  bump?: number;
};
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

/** UI-thread beach ball bounce squash, radial impact glow, and continuous rolling spin. */
export function BeachBallMotion({
  poses,
  index,
  canvas,
  inkDiameter,
  children,
}: {
  poses: SharedValue<BeachArtPose[]>;
  index: number;
  canvas: number;
  inkDiameter: number;
  children: React.ReactNode;
}) {
  const squashStyle = useAnimatedStyle(() => {
    const pose = poses.value[index];
    const pad = pose?.squash ?? 0;
    const wall = pose?.wallSquash ?? 0;
    const scaleX = (1 + pad * 0.16) * (1 - wall * 0.15);
    const scaleY = (1 - pad * 0.16) * (1 + wall * 0.15);
    return { transform: [{ scaleX }, { scaleY }] };
  });
  const glowStyle = useAnimatedStyle(() => ({
    opacity: poses.value[index]?.glow ?? 0,
  }));
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${poses.value[index]?.spin ?? 0}rad` }],
  }));
  const glowSize = inkDiameter * 1.38;
  const glowOffset = (canvas - glowSize) / 2;
  return (
    <Reanimated.View testID={`beach-ball-${index}`} style={[{ width: canvas, height: canvas }, squashStyle]}>
      <Reanimated.View
        testID={`beach-ball-glow-${index}`}
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: glowOffset,
            top: glowOffset,
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: "#FFF3B0",
          },
          glowStyle,
        ]}
      />
      <Reanimated.View testID={`beach-ball-spin-${index}`} style={[{ width: canvas, height: canvas }, spinStyle]}>
        {children}
      </Reanimated.View>
    </Reanimated.View>
  );
}

/** UI-thread driftwood paddle cushioned bounce dip, springy rebound, and subtle hit tilt. */
export function BeachPaddleMotion({
  poses,
  index,
  seat,
  scale,
  width,
  height,
  children,
}: {
  poses: SharedValue<BeachArtPose[]>;
  index: number;
  seat: 0 | 1;
  scale: number;
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const pose = poses.value[index];
    const dip = pose?.dip ?? 0;
    const tilt = pose?.tilt ?? 0;
    const dir = seat === 0 ? 1 : -1;
    return {
      transform: [
        { translateY: dip * dir * 4.2 * scale },
        { rotate: `${tilt}rad` },
        { scaleX: 1 + dip * 0.045 },
        { scaleY: 1 - dip * 0.11 },
      ],
    };
  });
  return (
    <Reanimated.View testID={`beach-paddle-${seat}`} style={[{ width, height }, style]}>
      {children}
    </Reanimated.View>
  );
}

/** Subtle sunlit wood-edge shine that pulses on paddle impact. */
export function BeachPaddleShine({
  poses,
  index,
  seat,
  inkBox,
}: {
  poses: SharedValue<BeachArtPose[]>;
  index: number;
  seat: 0 | 1;
  inkBox: { left: number; top: number; width: number; height: number };
}) {
  const style = useAnimatedStyle(() => ({
    opacity: 0.22 + (poses.value[index]?.shine ?? 0) * 0.65,
  }));
  const stripWidth = inkBox.width * 0.68;
  const stripHeight = Math.max(2, inkBox.height * 0.14);
  const top = seat === 0 ? inkBox.top + inkBox.height * 0.12 : inkBox.top + inkBox.height * 0.74;
  return (
    <Reanimated.View
      testID={`beach-paddle-shine-${seat}`}
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: inkBox.left + (inkBox.width - stripWidth) / 2,
          top,
          width: stripWidth,
          height: stripHeight,
          borderRadius: stripHeight / 2,
          backgroundColor: "#FFF9DC",
        },
        style,
      ]}
    />
  );
}

/** UI-thread gentle sea-turtle shell wobble on ball bump. */
export function BeachTurtleMotion({
  poses,
  size,
  children,
}: {
  poses: SharedValue<BeachArtPose[]>;
  size: number;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const bump = poses.value[12]?.bump ?? 0;
    return {
      transform: [
        { rotate: `${bump * 0.08}rad` },
        { scaleX: 1 + bump * 0.09 },
        { scaleY: 1 - bump * 0.09 },
      ],
    };
  });
  return (
    <Reanimated.View testID="beach-turtle" style={[{ width: size, height: size }, style]}>
      {children}
    </Reanimated.View>
  );
}

/** Deliver paddle, turtle, and point sounds without publishing presentation counters to React. */
export function useBeachSounds(state: SharedValue<BeachState>, onTone: (key: string, haptic?: boolean) => void) {
  useAnimatedReaction(
    () => {
      const { event, cue } = state.value;
      return { event, cue };
    },
    (next, before) => {
      if (!before || next.event === before.event) return;
      if (next.cue === "point") runOnJS(onTone)("clear", true);
      else if (next.cue === "turtle") runOnJS(onTone)("shell-1", false);
      else if (next.cue === "paddle") runOnJS(onTone)("shell-0", false);
    },
    [state, onTone]
  );
}
