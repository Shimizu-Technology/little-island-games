import React from "react";
import { Pressable } from "react-native";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "../components/motion";
import { theme } from "./theme";
import type { TargetSize } from "./theme";

export type PressTargetProps = Pick<
  PressableProps,
  "accessibilityLabel" | "accessibilityHint" | "disabled" | "onPress" | "onLongPress" | "delayLongPress" | "onAccessibilityAction" | "accessibilityActions" | "testID"
> & {
  children: React.ReactNode;
  /** Floor for the hit area: `child` 64, `adult` 48, `min` 44. Defaults to `adult`. */
  target?: TargetSize;
  haptic?: boolean;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** The smallest square a target of this size may be. Content larger than this still grows the target. */
export const targetFloor = (target: TargetSize) => theme.target[target];

/**
 * Accessible pressable: scale 0.96 over 140 ms on touch-down (still under Reduce Motion), optional light haptic,
 * and a hit area that is never under its size floor.
 */
export function PressTarget({ target = "adult", haptic = false, selected, disabled, onPress, onLongPress, style, ...props }: PressTargetProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const floor = targetFloor(target);
  const inert = disabled || (!onPress && !onLongPress);

  const press = (pressed: boolean) => {
    if (reduced) return;
    scale.set(withTiming(pressed ? theme.motion.press.scale : 1, { duration: theme.motion.press.duration, reduceMotion: ReduceMotion.System }));
  };
  const buzz = () => {
    if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  return (
    <AnimatedPressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inert, selected }}
      disabled={inert}
      onPress={onPress && ((event) => { buzz(); onPress(event); })}
      onLongPress={onLongPress && ((event) => { buzz(); onLongPress(event); })}
      onPressIn={() => press(true)}
      onPressOut={() => press(false)}
      style={[{ minWidth: floor, minHeight: floor }, style, animated, inert && { opacity: theme.opacity.disabled }]}
    />
  );
}
