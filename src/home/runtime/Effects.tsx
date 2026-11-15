import React, { memo } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import type { RoomId } from "../catalogMore";

/**
 * H4 effects: crumbs after eating (HD-05), a burp puff, bath bubbles and sink splashes (HD-08),
 * steam from the pan (HD-07) and a sleepy "z" when a friend stirs (HD-09). Each one is a few
 * small views animated once on the UI thread, then removed by the screen. Nothing loops,
 * nothing waits, and under Reduce Motion each is a short fade in place.
 */
export type EffectKind = "crumbs" | "bubbles" | "splash" | "steam" | "burp" | "zzz";
export type Effect = { key: string; kind: EffectKind; room: RoomId; x: number; y: number };
export const effectLength: Record<EffectKind, number> = { crumbs: 700, bubbles: 1500, splash: 600, steam: 900, burp: 760, zzz: 1100 };
type Particle = { x0: number; y0: number; x1: number; y1: number; size: number; color: string; delay: number; ring?: boolean; text?: boolean };
/** Deterministic per effect, so the same action always looks the same. */
function spread(n: number, i: number) {
  return ((Math.sin(n * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1;
}
export function particlesOf(kind: EffectKind, seed: number): Particle[] {
  const r = (i: number) => spread(seed, i);
  switch (kind) {
    case "crumbs":
      return Array.from({ length: 6 }, (_, i) => ({ x0: (r(i) - 0.5) * 14, y0: 4, x1: (r(i) - 0.5) * 46, y1: 46 + r(i + 9) * 22,
        size: 4 + r(i + 3) * 3, color: ["#D9A35F", "#F2CF8A", "#C88A4E"][i % 3], delay: i * 35 }));
    case "bubbles":
      return Array.from({ length: 8 }, (_, i) => ({ x0: (r(i) - 0.5) * 90, y0: 0, x1: (r(i) - 0.5) * 120, y1: -90 - r(i + 4) * 70,
        size: 9 + r(i + 7) * 12, color: "#F4FAEF", delay: i * 110, ring: true }));
    case "splash":
      return Array.from({ length: 7 }, (_, i) => {
        const a = Math.PI * (0.15 + (0.7 * i) / 6);
        return { x0: 0, y0: 0, x1: Math.cos(a) * (34 + r(i) * 18) * (i % 2 ? 1 : -1), y1: -Math.sin(a) * (30 + r(i + 2) * 24),
          size: 6 + r(i + 5) * 5, color: "#9FD8E0", delay: i * 18 };
      });
    case "steam":
      return Array.from({ length: 4 }, (_, i) => ({ x0: (i - 1.5) * 12, y0: 0, x1: (i - 1.5) * 18 + (r(i) - 0.5) * 10, y1: -60 - r(i + 2) * 20,
        size: 14 + r(i + 4) * 8, color: "#EEF5EF", delay: i * 140 }));
    case "burp":
      return [{ x0: 6, y0: 0, x1: 22, y1: -26, size: 26, color: "#E7F4F1", delay: 0, ring: true },
        { x0: 10, y0: -4, x1: 34, y1: -46, size: 12, color: "#E7F4F1", delay: 140, ring: true }];
    case "zzz":
      return [0, 1].map((i) => ({ x0: 8, y0: -6, x1: 30 + i * 12, y1: -46 - i * 16, size: 14 + i * 4, color: "#7C8FB2", delay: i * 260, text: true }));
  }
}
function Dot({ p, progress, length, reduced }: { p: Particle; progress: SharedValue<number>; length: number; reduced: boolean }) {
  const start = p.delay / length, span = Math.max(0.2, 1 - start);
  const style = useAnimatedStyle(() => {
    const t = Math.max(0, Math.min(1, (progress.value - start) / span));
    if (reduced) return { opacity: t > 0 && t < 1 ? 0.9 : 0, transform: [{ translateX: (p.x0 + p.x1) / 2 }, { translateY: (p.y0 + p.y1) / 2 }] };
    const fade = t < 0.15 ? t / 0.15 : t > 0.7 ? (1 - t) / 0.3 : 1;
    return { opacity: t > 0 && t < 1 ? fade : 0, transform: [
      { translateX: p.x0 + (p.x1 - p.x0) * t }, { translateY: p.y0 + (p.y1 - p.y0) * t },
      { scale: p.ring ? 0.6 + 0.5 * t : 1 },
    ] };
  });
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: -p.size / 2, top: -p.size / 2, width: p.size, height: p.size,
    borderRadius: p.size / 2, backgroundColor: p.ring || p.text ? "transparent" : p.color,
    borderWidth: p.ring ? 2 : p.text ? 0 : 0, borderColor: p.ring ? "#B1D6CE" : undefined }, style]}>
    {p.ring && <View style={{ position: "absolute", left: p.size * 0.18, top: p.size * 0.18, width: p.size * 0.22, height: p.size * 0.22,
      borderRadius: p.size, backgroundColor: "#FFFFFF" }} />}
    {p.text && <ZMark size={p.size} color={p.color} />}
  </Animated.View>;
}
/** A drawn "z" (two short strokes and a diagonal), not a letter in a font. */
function ZMark({ size, color }: { size: number; color: string }) {
  const w = size * 0.7, stroke = Math.max(2, size / 7);
  return <View style={{ width: size, height: size }}>
    <View style={{ position: "absolute", left: (size - w) / 2, top: size * 0.15, width: w, height: stroke, borderRadius: stroke, backgroundColor: color }} />
    <View style={{ position: "absolute", left: size * 0.12, top: size / 2 - stroke / 2, width: w * 1.25, height: stroke, borderRadius: stroke,
      backgroundColor: color, transform: [{ rotate: "-45deg" }] }} />
    <View style={{ position: "absolute", left: (size - w) / 2, top: size * 0.85 - stroke, width: w, height: stroke, borderRadius: stroke, backgroundColor: color }} />
  </View>;
}
const OneEffect = memo(function OneEffect({ effect, reduced }: { effect: Effect; reduced: boolean }) {
  const length = effectLength[effect.kind];
  const progress = useSharedValue(0);
  React.useEffect(() => {
    progress.set(withTiming(1, { duration: reduced ? Math.min(length, 400) : length, easing: Easing.linear }));
  }, [progress, length, reduced]);
  const seed = [...effect.key].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7);
  return <View pointerEvents="none" style={{ position: "absolute", left: effect.x, top: effect.y }}>
    {particlesOf(effect.kind, seed).map((p, i) => <Dot key={i} p={p} progress={progress} length={length} reduced={reduced} />)}
  </View>;
});
export function Effects({ effects, reduced }: { effects: readonly Effect[]; reduced: boolean }) {
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none"
    style={{ position: "absolute", left: 0, top: 0 }}>
    {effects.map((effect) => <OneEffect key={effect.key} effect={effect} reduced={reduced} />)}
  </View>;
}
