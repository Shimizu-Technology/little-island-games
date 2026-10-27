import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { PanResponder, StyleSheet, type ViewProps } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import { Button, Copy, PressableScale } from "../components/ui";
import { feel } from "../components/feel";
import { swipeDirection, type Swipe } from "./clock";
export type Repeat = { das?: number; arr?: number };
type Props = Omit<React.ComponentProps<typeof PressableScale>, "onPress" | "onPressIn" | "onPressOut"> & { onPress: () => void; repeat?: boolean | Repeat; haptic?: boolean };
/** Gameplay only. Menus retain release-to-activate. DAS/ARR are milliseconds. */
export function PressControl({ onPress, repeat = false, haptic = true, disabled, ...props }: Props) {
  const latest = useRef({ onPress, disabled, haptic });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), held = useRef(false);
  useLayoutEffect(() => { latest.current = { onPress, disabled, haptic }; }, [onPress, disabled, haptic]);
  const stop = useCallback(() => { held.current = false; if (timer.current) clearTimeout(timer.current); timer.current = null; }, []);
  const das = typeof repeat === "object" ? repeat.das ?? 170 : 170, arr = typeof repeat === "object" ? repeat.arr ?? 50 : 50;
  const repeating = !!repeat;
  useEffect(() => { if (disabled) stop(); return stop; }, [disabled, repeating, das, arr, stop]);
  function begin() {
    stop(); if (latest.current.disabled) return;
    held.current = true;
    if (latest.current.haptic) feel("select");
    latest.current.onPress();
    if (!repeat) return;
    const again = () => {
      if (!held.current || latest.current.disabled) return;
      latest.current.onPress();
      timer.current = setTimeout(again, Math.max(16, Number.isFinite(arr) ? arr : 50));
    };
    timer.current = setTimeout(again, Math.max(0, Number.isFinite(das) ? das : 170));
  }
  return <PressableScale accessibilityRole="button" {...props} disabled={disabled} onPressIn={begin} onPressOut={stop} onBlur={event => { stop(); props.onBlur?.(event); }} onAccessibilityTap={() => { if (!latest.current.disabled) { if (latest.current.haptic) feel("select"); latest.current.onPress(); } }}/>;
}
/** Labelled gameplay action with the same touch-down timing as a directional control. */
export function PlayButton({ children, onPress, disabled, compact, quiet, label, style, icon }: React.ComponentProps<typeof Button>) {
  return <PressControl onPress={onPress} disabled={disabled} accessibilityLabel={label} style={[{ minHeight: compact ? 44 : 52, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: quiet ? "#FFF4DA" : "#24536A", borderWidth: 2, borderColor: "#DCC28F", opacity: disabled ? .5 : 1 }, style]}><Copy style={{ fontWeight: "800", color: quiet ? "#24536A" : "#FFF4DA" }}>{icon === "refresh" ? "↻ " : ""}{children}</Copy></PressControl>;
}
/** Fire once during the move, never wait for finger-up. Resets on the next touch. */
export function useSwipe(active: boolean, onSwipe: (direction: Swipe) => void, threshold = 24, onTapDown?: (x: number, y: number) => void) {
  const latest = useRef({ active, onSwipe, threshold, onTapDown }), fired = useRef(false);
  useLayoutEffect(() => { latest.current = { active, onSwipe, threshold, onTapDown }; }, [active, onSwipe, threshold, onTapDown]);
  return useMemo(() =>
    // eslint-disable-next-line react-hooks/refs -- PanResponder stores callbacks; refs are read only when a gesture occurs.
    PanResponder.create({
    onStartShouldSetPanResponder: () => latest.current.active,
    onMoveShouldSetPanResponder: () => latest.current.active,
    onPanResponderGrant: event => { fired.current = false; if (latest.current.active) latest.current.onTapDown?.(event.nativeEvent.locationX, event.nativeEvent.locationY); },
    onPanResponderMove: (_, gesture) => {
      if (!latest.current.active || fired.current) return;
      const direction = swipeDirection(gesture.dx, gesture.dy, latest.current.threshold);
      if (direction) { fired.current = true; latest.current.onSwipe(direction); }
    },
    onPanResponderTerminationRequest: () => false,
  }).panHandlers, []);
}
/** A board-wide touch-down / hold surface. Put HUD/menus above or outside it. */
export function PlayfieldTarget({ onPress, active, repeat, children, ...props }: ViewProps & { onPress: () => void; active: boolean; repeat?: boolean | Repeat; children?: React.ReactNode }) {
  return <PressControl accessibilityRole="button" {...props} disabled={!active} onPress={onPress} repeat={repeat} style={[{ flex: 1 }, StyleSheet.flatten(props.style)]}>{children}</PressControl>;
}
export type DragPoint = { x: number; y: number; down: boolean };
/** GestureDetector runs these callbacks on UI. Use two independent targets or multiTouchDrag for two paddles. */
export function uiThreadDrag(point: SharedValue<DragPoint>) {
  return Gesture.Pan().minDistance(0).onBegin(e => { "worklet"; point.value = { x: e.x, y: e.y, down: true }; }).onUpdate(e => { "worklet"; point.value = { x: e.x, y: e.y, down: true }; }).onFinalize(() => { "worklet"; point.value = { ...point.value, down: false }; });
}
export type TouchPoints = Record<number, DragPoint>;
/** Stable native pointer ids allow fingers in both court halves without centroid jumps. */
export function multiTouchDrag(points: SharedValue<TouchPoints>) {
  return Gesture.Manual().onTouchesDown((e, manager) => { "worklet"; const next = { ...points.value }; for (const t of e.changedTouches) next[t.id] = { x: t.x, y: t.y, down: true }; points.value = next; if (e.allTouches.length === e.changedTouches.length) { manager.begin(); manager.activate(); } })
    .onTouchesMove(e => { "worklet"; const next = { ...points.value }; for (const t of e.changedTouches) next[t.id] = { x: t.x, y: t.y, down: true }; points.value = next; })
    .onTouchesUp((e, manager) => { "worklet"; const next = { ...points.value }; for (const t of e.changedTouches) delete next[t.id]; points.value = next; if (!e.allTouches.length) manager.end(); })
    .onTouchesCancelled((_, manager) => { "worklet"; points.value = {}; manager.end(); })
    .onFinalize(() => { "worklet"; points.value = {}; });
}
