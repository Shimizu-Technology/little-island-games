import React, { memo } from "react";
import { View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import type { RoomId } from "../catalogMore";

/**
 * H4 effects: crumbs after eating (HD-05), a burp puff, bath bubbles and sink splashes (HD-08),
 * steam from the pan (HD-07) and a sleepy "z" when a friend stirs (HD-09). Each one is a few
 * small views animated once on the UI thread, then removed by the screen. Nothing loops,
 * nothing waits, and under Reduce Motion each is a short fade in place.
 */
export type EffectKind = "crumbs" | "bubbles" | "splash" | "steam" | "burp" | "zzz" | "sparkle";
export type Effect = { key: string; kind: EffectKind; room: RoomId; x: number; y: number };
export const effectLength: Record<EffectKind, number> = { crumbs: 700, bubbles: 1500, splash: 600, steam: 900, burp: 760, zzz: 1100, sparkle: 650 };
type Particle = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  size: number;
  color: string;
  delay: number;
  ring?: boolean;
  text?: boolean;
  /** Splash droplet gleam dot. */
  gloss?: boolean;
  /** Border tint for pearlescent rings. */
  rim?: string;
  /** Steam: a soft, see-through puff that grows as it rises. */
  soft?: boolean;
};

/** Deterministic per effect, so the same action always looks the same. */
function spread(n: number, i: number) {
  return ((Math.sin(n * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1;
}

export function particlesOf(kind: EffectKind, seed: number): Particle[] {
  const r = (i: number) => spread(seed, i);
  switch (kind) {
    case "crumbs":
      return Array.from({ length: 3 }, (_, i) => ({
        x0: (r(i) - 0.5) * 10,
        y0: 5,
        x1: (r(i) - 0.5) * 28,
        y1: 18 + r(i + 9) * 10,
        size: 4 + r(i + 3) * 2,
        color: ["#C8823B", "#F5C249", "#A65E2B"][i % 3],
        delay: i * 30,
      }));
    case "bubbles":
      // From the tub's two ends, rising up and out, so they never cross a bathing friend's face.
      return Array.from({ length: 8 }, (_, i) => {
        const side = i % 2 ? 1 : -1;
        return {
          x0: side * (40 + r(i) * 30),
          y0: 6,
          x1: side * (70 + r(i) * 50),
          y1: -80 - r(i + 4) * 70,
          size: 14 + r(i + 7) * 14,
          color: i % 3 === 0 ? "rgba(255, 253, 247, 0.52)" : i % 3 === 1 ? "rgba(220, 248, 245, 0.52)" : "rgba(255, 236, 242, 0.48)",
          rim: i % 2 === 0 ? "#8AD4CE" : "#A6E2DD",
          delay: i * 110,
          ring: true,
        };
      });
    case "splash":
      return Array.from({ length: 7 }, (_, i) => {
        const a = Math.PI * (0.15 + (0.7 * i) / 6);
        return {
          x0: 0,
          y0: 0,
          x1: Math.cos(a) * (34 + r(i) * 18) * (i % 2 ? 1 : -1),
          y1: -Math.sin(a) * (30 + r(i + 2) * 24),
          size: 11 + r(i + 5) * 7,
          color: ["#5BC4D0", "#8AE3EA", "#43AEB9"][i % 3],
          delay: i * 18,
          gloss: true,
        };
      });
    case "steam":
      return Array.from({ length: 5 }, (_, i) => ({
        x0: (i - 2) * 10,
        y0: 0,
        x1: (i - 2) * 16 + (r(i) - 0.5) * 14,
        y1: -70 - r(i + 2) * 25,
        size: 22 + r(i + 4) * 12,
        color: "#FFFDF7",
        delay: i * 110,
        soft: true,
      }));
    case "burp":
      return [
        { x0: 6, y0: 0, x1: 22, y1: -26, size: 26, color: "rgba(255, 247, 230, 0.58)", rim: "#7FC7BF", delay: 0, ring: true },
        { x0: 10, y0: -4, x1: 34, y1: -46, size: 12, color: "rgba(255, 247, 230, 0.58)", rim: "#F5C249", delay: 140, ring: true },
      ];
    case "zzz":
      return [0, 1, 2].map((i) => ({
        x0: 10,
        y0: -8,
        x1: 34 + i * 16,
        y1: -54 - i * 22,
        size: 22 + i * 6,
        color: i === 2 ? "#4FA99F" : "#4A618A",
        delay: i * 220,
        text: true,
      }));
    case "sparkle":
      return Array.from({ length: 5 }, (_, i) => {
        const angle = (i / 5) * Math.PI * 2 + r(i) * 0.4;
        const reach = 24 + r(i + 3) * 18;
        return {
          x0: Math.cos(angle) * 6,
          y0: Math.sin(angle) * 6,
          x1: Math.cos(angle) * reach,
          y1: Math.sin(angle) * reach - 14,
          size: 7 + r(i + 5) * 4,
          color: ["#F5C249", "#FFE38A", "#7FC7BF", "#FF9A76"][i % 4],
          delay: i * 35,
          gloss: true,
        };
      });
  }
}

function Dot({ p, progress, length, reduced }: { p: Particle; progress: SharedValue<number>; length: number; reduced: boolean }) {
  const start = p.delay / length, span = Math.max(0.2, 1 - start);
  const style = useAnimatedStyle(() => {
    const t = Math.max(0, Math.min(1, (progress.value - start) / span));
    if (reduced) return { opacity: t > 0 && t < 1 ? 0.9 : 0, transform: [{ translateX: (p.x0 + p.x1) / 2 }, { translateY: (p.y0 + p.y1) / 2 }] };
    const fade = t < 0.15 ? t / 0.15 : t > 0.7 ? (1 - t) / 0.3 : 1;
    return {
      opacity: t > 0 && t < 1 ? fade * (p.soft ? 0.58 : 1) : 0,
      transform: [
        { translateX: p.x0 + (p.x1 - p.x0) * t },
        { translateY: p.y0 + (p.y1 - p.y0) * t },
        { scale: p.ring ? 0.6 + 0.5 * t : p.soft ? 0.5 + 0.9 * t : 1 },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: -p.size / 2,
          top: -p.size / 2,
          width: p.size,
          height: p.size,
          borderRadius: p.size / 2,
          backgroundColor: p.text ? "transparent" : p.color,
          borderWidth: p.ring ? 2 : 0,
          borderColor: p.ring ? (p.rim ?? "#8AD4CE") : undefined,
        },
        style,
      ]}
    >
      {(p.ring || p.gloss) && (
        <View
          style={{
            position: "absolute",
            left: p.size * 0.18,
            top: p.size * 0.18,
            width: p.size * 0.24,
            height: p.size * 0.24,
            borderRadius: p.size,
            backgroundColor: "#FFFDF7",
          }}
        />
      )}
      {p.text && <ZMark size={p.size} color={p.color} />}
    </Animated.View>
  );
}

/** A drawn "z" (two short strokes and a diagonal), not a letter in a font. */
function ZMark({ size, color }: { size: number; color: string }) {
  const w = size * 0.7, stroke = Math.max(3, size / 5);
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: "absolute", left: (size - w) / 2, top: size * 0.15, width: w, height: stroke, borderRadius: stroke, backgroundColor: color }} />
      <View
        style={{
          position: "absolute",
          left: size * 0.12,
          top: size / 2 - stroke / 2,
          width: w * 1.25,
          height: stroke,
          borderRadius: stroke,
          backgroundColor: color,
          transform: [{ rotate: "-45deg" }],
        }}
      />
      <View style={{ position: "absolute", left: (size - w) / 2, top: size * 0.85 - stroke, width: w, height: stroke, borderRadius: stroke, backgroundColor: color }} />
    </View>
  );
}

const OneEffect = memo(function OneEffect({ effect, reduced }: { effect: Effect; reduced: boolean }) {
  const length = effectLength[effect.kind];
  const progress = useSharedValue(0);
  React.useEffect(() => {
    // Always run the clock: under Reduce Motion the cue is a stationary fade (see Dot), which the
    // system setting would otherwise skip straight to its invisible end.
    progress.set(withTiming(1, { duration: reduced ? Math.min(length, 400) : length, easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
  }, [progress, length, reduced]);
  const seed = [...effect.key].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: effect.x, top: effect.y }}>
      {particlesOf(effect.kind, seed).map((p, i) => (
        <Dot key={i} p={p} progress={progress} length={length} reduced={reduced} />
      ))}
    </View>
  );
});

export function Effects({ effects, reduced }: { effects: readonly Effect[]; reduced: boolean }) {
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      {effects.map((effect) => (
        <OneEffect key={effect.key} effect={effect} reduced={reduced} />
      ))}
    </View>
  );
}
