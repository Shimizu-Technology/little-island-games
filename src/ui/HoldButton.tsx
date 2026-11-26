import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import Svg, { Circle } from "react-native-svg";
import Animated, { Easing, ReduceMotion, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { Icon } from "./Icon";
import type { IconGlyph } from "./Icon";
import { PressTarget } from "./PressTarget";
import { Text } from "./Text";
import { LockSimple } from "./icons";
import { theme } from "./theme";

const RING = 40;
const STROKE = 4;
const RADIUS = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** True while VoiceOver or TalkBack is running, when a timed hold is not a fair ask. */
function useScreenReader() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isScreenReaderEnabled().then(value => { if (live) setOn(value); }).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", setOn);
    return () => { live = false; sub.remove(); };
  }, []);
  return on;
}

/**
 * Two-second hold gate (the Grown-ups door). Hold the button while the ring fills; letting go early starts over.
 * A haptic marks the finish. The hold is never the only way in: with a screen reader on, a plain activate confirms;
 * Switch Control and VoiceOver also get a "Confirm without holding" custom action; on Web, Enter or Space confirms.
 * The ring is a progress meter rather than decoration, so it fills even under Reduce Motion.
 */
export function HoldButton({ label, holdLabel = "Hold to open", confirmLabel = "Confirm without holding", glyph = LockSimple, ms = theme.hold.ms, onComplete, disabled, testID }: {
  label: string;
  /** Spoken hint and the visible cue under the label. */
  holdLabel?: string;
  /** Name of the non-timed custom action. */
  confirmLabel?: string;
  glyph?: IconGlyph;
  ms?: number;
  onComplete: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  const progress = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const done = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  const disabledRef = useRef(!!disabled);
  const screenReader = useScreenReader();

  const reset = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    progress.set(withTiming(0, { duration: 160, reduceMotion: ReduceMotion.Never }));
  }, [progress]);
  useEffect(() => () => clearTimeout(timer.current), []);
  // Going disabled mid-hold drops the hold: no timer left to fire, and the ring empties.
  useEffect(() => {
    disabledRef.current = !!disabled;
    if (disabled) reset();
  }, [disabled, reset]);

  const finish = useCallback(() => {
    if (disabledRef.current || done.current) return;
    done.current = true;
    clearTimeout(timer.current);
    timer.current = undefined;
    progress.set(1);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    onCompleteRef.current();
    // A confirm gesture can fire press and key events together; one door opens once.
    setTimeout(() => { done.current = false; progress.set(0); }, 500);
  }, [progress]);

  const start = () => {
    if (disabled || done.current) return;
    progress.set(0);
    progress.set(withTiming(1, { duration: ms, easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
    clearTimeout(timer.current);
    timer.current = setTimeout(finish, ms);
  };

  const ring = useAnimatedProps(() => ({ strokeDashoffset: CIRCUMFERENCE * (1 - progress.get()) }));
  const keyDown = (event: { key?: string; preventDefault?: () => void }) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault?.();
    finish();
  };
  const webKeys = (Platform.OS === "web" ? { onKeyDown: keyDown } : {}) as object;

  return (
    <PressTarget
      target="child"
      testID={testID}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityHint={screenReader ? undefined : holdLabel}
      accessibilityActions={[{ name: "magicTap", label: confirmLabel }, { name: "activate" }]}
      onAccessibilityAction={event => {
        if (event.nativeEvent.actionName === "magicTap" || event.nativeEvent.actionName === "activate") finish();
      }}
      onPressIn={start}
      onPressOut={() => { if (!done.current) reset(); }}
      onPress={() => { if (screenReader) finish(); }}
      style={styles.button}
      {...webKeys}
    >
      <View style={styles.ring}>
        <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
          <Circle cx={RING / 2} cy={RING / 2} r={RADIUS} stroke={theme.colors.track} strokeWidth={STROKE} fill="none" />
          <AnimatedCircle
            testID="hold-progress"
            cx={RING / 2}
            cy={RING / 2}
            r={RADIUS}
            stroke={theme.colors.lagoon}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            rotation={-90}
            origin={`${RING / 2}, ${RING / 2}`}
            animatedProps={ring}
          />
        </Svg>
        <Icon glyph={glyph} tone="lagoon" size={20} />
      </View>
      <View style={styles.words}>
        <Text variant="body" style={styles.label}>{label}</Text>
        <Text variant="small" tone="muted">{holdLabel}</Text>
      </View>
    </PressTarget>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.lagoonSoft,
    alignSelf: "flex-start",
  },
  ring: { width: RING, height: RING, alignItems: "center", justifyContent: "center" },
  words: { flexShrink: 1 },
  label: { fontWeight: "800" },
});
