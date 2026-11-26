import React, { memo, useCallback, useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { cancelAnimation, Easing, ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { Text } from "../../../components/Text";
import { flightFrame, type Commands } from "../scrolling/commands";
import { flightLearning, type FlightInput, type FlightState } from "./engine";
import { FLIGHT_H } from "./hull";
import { BAT_X, batArtMotion, flightAward, impactVisual } from "./presentation";

type Point = { x: number; y: number };
type Pulse = { origin: SharedValue<Point>; age: SharedValue<number> };
type Award = ReturnType<typeof flightAward>;

function usePulse(): Pulse {
  const origin = useSharedValue<Point>({ x: 0, y: 0 }), age = useSharedValue(1);
  return useMemo(() => ({ origin, age }), [origin, age]);
}

function playPulse({ origin, age }: Pulse, point: Point, duration: number) {
  "worklet";
  origin.set(point);
  age.set(0);
  // The visual functions apply reduced-motion behavior, retaining still feedback and a short fade.
  age.set(withTiming(1, { duration, easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
}

export function useFlightFeedback(reduced: boolean, onTone: (key: string, haptic?: boolean) => void) {
  const puff1 = usePulse(), puff2 = usePulse(), puff3 = usePulse();
  const puffs = useMemo(() => [puff1, puff2, puff3], [puff1, puff2, puff3]);
  const awardPulse = usePulse();
  const award = useSharedValue<Award>(null), impact = useSharedValue(1);

  useEffect(() => () => {
    for (const pulse of [...puffs, awardPulse]) {
      cancelAnimation(pulse.age);
      cancelAnimation(pulse.origin);
    }
    cancelAnimation(award);
    cancelAnimation(impact);
  }, [puffs, awardPulse, award, impact]);

  const step = useCallback((before: FlightState, input: Commands<FlightInput>, dt: number) => {
    "worklet";
    const after = flightFrame(before, input, dt);
    if (before.status !== "playing") return after;
    if (!reduced && before.command !== after.command) {
      for (const command of input.queue) {
        if (command.id <= before.command || command.id > after.command || command.action.type !== "flap") continue;
        playPulse(puffs[command.id % puffs.length], { x: BAT_X - 23, y: batArtMotion(before, false).y + 8 }, 200);
      }
    }
    const cleared = flightAward(before, after);
    if (cleared) {
      award.set(cleared);
      playPulse(awardPulse, cleared, 340);
      runOnJS(onTone)(cleared.mango ? "flight-fruit" : "flight-clear", cleared.mango || flightLearning(after));
    }
    const bumped = after.bumps > before.bumps;
    if (after.status === "bumped" || (bumped && after.cue !== "try")) {
      impact.set(0);
      impact.set(withTiming(1, { duration: 120, easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
      runOnJS(onTone)("flight-bump", true);
    } else if (bumped) {
      runOnJS(onTone)("shell-0", false);
    }
    return after;
  }, [reduced, onTone, puffs, awardPulse, award, impact]);

  return { step, impact, award, awardPulse, puffs };
}

export function useFlightCamera(impact: SharedValue<number>, reduced: boolean) {
  return useAnimatedStyle(() => {
    const visual = impactVisual(impact.value, reduced);
    return { transform: [{ translateX: visual.x }, { translateY: visual.y }] };
  });
}

export const FlightFlash = memo(function FlightFlash({ impact, reduced }: { impact: SharedValue<number>; reduced: boolean }) {
  const style = useAnimatedStyle(() => ({ opacity: impactVisual(impact.value, reduced).flash }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#FFD3AB" }, style]}/>;
});

const dropletColors = ["#FFFDF0", "#FFE2A1", "#FFF1CE"];
const Puff = memo(function Puff({ origin, age, index, reduced }: Pulse & { index: number; reduced: boolean }) {
  const style = useAnimatedStyle(() => {
    const t = age.value, point = origin.value;
    return {
      opacity: reduced ? 0 : (1 - t) ** 2,
      transform: [
        { translateX: point.x - (9 + index * 6) * t - index * 6 },
        { translateY: point.y + (index - 1) * (6 + 10 * t) },
        { rotate: "-24deg" },
        { scale: 1 - .55 * t },
      ],
    };
  });
  return <Animated.View style={[{ position: "absolute", top: 0, left: 0, width: 8 - index, height: 4, borderRadius: 3, backgroundColor: dropletColors[index] }, style]}/>;
});

const Sparkle = memo(function Sparkle({ origin, age, index, reduced }: Pulse & { index: number; reduced: boolean }) {
  const style = useAnimatedStyle(() => {
    const t = age.value, point = origin.value;
    const angle = index * Math.PI / 3 + Math.PI / 8, distance = 8 + (1 - (1 - t) ** 2) * (index % 2 ? 28 : 41);
    return {
      opacity: reduced ? 0 : Math.min(1, (1 - t) * 2.3),
      transform: [
        { translateX: point.x - 6 + Math.cos(angle) * distance },
        { translateY: point.y - 6 + Math.sin(angle) * distance },
        { scale: 1 - .4 * t },
      ],
    };
  });
  return <Animated.View style={[{ position: "absolute", top: 0, left: 0, width: 12, height: 12 }, style]}>
    <Svg width={12} height={12} viewBox="0 0 12 12" accessible={false}><Path d="M6 1 7.4 4.6 11 6 7.4 7.4 6 11 4.6 7.4 1 6 4.6 4.6Z" fill={index % 2 ? "#FFF4C7" : "#FFD76E"} stroke="#AD7025" strokeWidth={.65}/></Svg>
  </Animated.View>;
});

const ScorePop = memo(function ScorePop({ award, age, reduced, points }: { award: SharedValue<Award>; age: SharedValue<number>; reduced: boolean; points: number }) {
  const style = useAnimatedStyle(() => {
    const t = age.value, event = award.value;
    return {
      opacity: event?.gain === points ? Math.min(1, (1 - t) * 3) : 0,
      transform: [
        { translateX: (event?.x ?? 0) - 21 },
        { translateY: Math.max(6, Math.min(FLIGHT_H - 32, (event?.y ?? 0) - 31 - (reduced ? 0 : t * 27))) },
      ],
    };
  });
  return <Animated.View style={[{ position: "absolute", top: 0, left: 0, width: 42, borderRadius: 16, backgroundColor: "#FFF2C6", borderColor: "#D39844", borderWidth: 1 }, style]}>
    <Text allowFontScaling={false} style={{ color: "#744218", fontSize: 18, fontWeight: "900", textAlign: "center" }}>+{points}</Text>
  </Animated.View>;
});

export const FlightEffects = memo(function FlightEffects({ award, awardPulse, puffs, reduced }: Pick<ReturnType<typeof useFlightFeedback>, "award" | "awardPulse" | "puffs"> & { reduced: boolean }) {
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    {puffs.map((pulse, i) => dropletColors.map((_, index) => <Puff key={i * 3 + index} {...pulse} index={index} reduced={reduced}/>))}
    {[0, 1, 2, 3, 4, 5].map(index => <Sparkle key={index} {...awardPulse} index={index} reduced={reduced}/>)}
    <ScorePop award={award} age={awardPulse.age} points={1} reduced={reduced}/>
    <ScorePop award={award} age={awardPulse.age} points={2} reduced={reduced}/>
  </View>;
});
