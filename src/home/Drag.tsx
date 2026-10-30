import { spotFromPoint } from "./geometry";
import { clearFootprint } from "./placement";
import React, { type ReactNode } from "react";
import { View, type ViewProps, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  useAnimatedProps,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Polygon, Line } from "react-native-svg";
export type Preview = {
  active: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  wall: boolean;
  valid: boolean;
  on?: string;
  surfaceX?: number;
  surfaceY?: number;
  px?: number;
  py?: number;
};
export const emptyPreview: Preview = { active: false, x: 0, y: 0, w: 1, h: 1, wall: false, valid: false };
export type DragConfig = {
  preview: SharedValue<Preview>;
  origin: { x: number; y: number };
  scale: number;
  footprint?: { w: number; h: number; wall: boolean; id: string; small?: boolean };
  blockers: { id: string; x: number; y: number; w: number; h: number; wall: boolean; layer: string; on?: string; surface?: boolean; sx?: number; sy?: number; radius?: number }[];
  layer?: string;
  /** Scene-local foot point; tray items use the pointer's absolute position. */
  foot?: { x: number; y: number };
};
/** Worklet-only drag feedback. No React state or reducer writes during pointer movement. */
function updatePreview(config: DragConfig, absX: number, absY: number, dx: number, dy: number) {
  "worklet";
  const f = config.footprint;
  if (!f) return;
  const px = config.foot ? config.foot.x + dx / config.scale : (absX - config.origin.x) / config.scale;
  const py = config.foot ? config.foot.y + dy / config.scale : (absY - config.origin.y) / config.scale;
  const parent = f.small ? config.blockers.filter(i => i.id !== f.id && !i.on && i.surface && Math.abs(i.sx! - px) <= i.radius! && Math.abs(i.sy! - py) < 32).sort((a,b) => Math.hypot(a.sx! - px, a.sy! - py) - Math.hypot(b.sx! - px, b.sy! - py))[0] : undefined;
  if (parent) {
    const valid = (f.id !== "" || config.blockers.length < 48) && f.w <= parent.w && f.h <= parent.h && clearFootprint(config.blockers.filter(i => i.on === parent.id), { id:f.id, x:parent.x, y:parent.y, w:f.w, h:f.h, layer:config.layer ?? "furniture" });
    config.preview.value = { active:true, x:parent.x, y:parent.y, w:f.w, h:f.h, wall:false, valid, on:parent.id, surfaceX:parent.sx, surfaceY:parent.sy, px:parent.sx, py:parent.sy };
    return;
  }
  const spot = spotFromPoint(px, py, 1, f.wall);
  if (!spot) { config.preview.value = { ...config.preview.value, active: true, valid: false, px, py }; return; }
  const { x, y } = spot;
  const inside = px >= 0 && px <= 800 && py >= 0 && py <= 560;
  const valid =
    inside &&
    (f.id !== "" || config.blockers.length < 48) &&
    clearFootprint(config.blockers.filter(i => !i.on), { id: f.id, x, y, w: f.w, h: f.h, layer: config.layer ?? "furniture" });
  config.preview.value = { active: true, x, y, w: f.w, h: f.h, wall: f.wall, valid, px, py };
}
export function Drag({
  children,
  style,
  enabled,
  reduced,
  config,
  onDrop,
  onTap,
  onStart,
  tray = false,
  ...a11y
}: ViewProps & {
  children: ReactNode;
  style: ViewStyle;
  enabled: boolean;
  reduced: boolean;
  config: DragConfig;
  onDrop: (x: number, y: number, dx: number, dy: number) => void;
  onTap: () => void;
  onStart?: () => void;
  tray?: boolean;
}) {
  const dx = useSharedValue(0),
    dy = useSharedValue(0),
    lift = useSharedValue(0),
    dragging = useSharedValue(false);
  const preview = config.preview;
  const panBase = Gesture.Pan().enabled(enabled).minDistance(5);
  // Vertical exit preserves the inventory's native horizontal scrolling.
  if (tray) panBase.activeOffsetY([-8, 8]).failOffsetX([-14, 14]);
  const pan = panBase
    .onStart(() => {
      "worklet";
      dragging.value = true;
      lift.value = reduced ? 0 : withTiming(1, { duration: 100 });
      if (onStart) runOnJS(onStart)();
    })
    .onUpdate((e) => {
      "worklet";
      dx.value = e.translationX;
      dy.value = e.translationY;
      updatePreview(config, e.absoluteX, e.absoluteY, e.translationX, e.translationY);
    })
    .onEnd((e) => {
      "worklet";
      runOnJS(onDrop)(e.absoluteX, e.absoluteY, e.translationX, e.translationY);
    })
    .onFinalize(() => {
      "worklet";
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are mutable UI-thread handles, not React props.
      preview.value = emptyPreview;
      dragging.value = false;
      dx.value = 0;
      dy.value = 0;
      lift.value = reduced ? 0 : withSpring(0, { damping: 12, stiffness: 260, mass: 0.45 });
    });
  const tap = Gesture.Tap()
    .maxDistance(5)
    .onEnd((_e, success) => {
      "worklet";
      if (success) runOnJS(onTap)();
    });
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: dx.value }, { translateY: dy.value - lift.value * 7 }, { scale: 1 + lift.value * 0.035 }],
    zIndex: dragging.value ? 500 : 0,
  }));
  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)} touchAction={tray ? "pan-x" : "none"}>
      <Animated.View {...a11y} accessible focusable tabIndex={0} style={[style, animated]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
export function Footprint({
  preview,
  scale,
  width,
  height,
}: {
  preview: SharedValue<Preview>;
  scale: number;
  width: number;
  height: number;
}) {
  const propsFor = (p: Preview, valid: boolean) => {
    "worklet";
    const point = (x: number, y: number) =>
      p.wall
        ? `${(205 + x * 23 - 22) * scale},${(224 + y * 19.5 - 22) * scale}`
        : `${(174 + x * 25.5 + y * 7 - 23) * scale},${(327 + y * 15.5 + x * 1.5 - 12) * scale}`;
    return {
      points: p.on ? [[-48,-12],[48,-12],[48,12],[-48,12]].map(([x,y]) => `${(p.surfaceX!+x)*scale},${(p.surfaceY!+y)*scale}`).join(" ") : [point(p.x, p.y), point(p.x + p.w, p.y), point(p.x + p.w, p.y + p.h), point(p.x, p.y + p.h)].join(" "),
      opacity: p.active && p.valid === valid ? 1 : 0,
    };
  };
  // Animate geometry/opacity only. Static SVG colors avoid platform-specific
  // color adaptation leaving an accepted preview painted with its initial red.
  const validProps = useAnimatedProps(() => propsFor(preview.value, true));
  const invalidProps = useAnimatedProps(() => propsFor(preview.value, false));
  return (
    <View pointerEvents="none" style={{ position: "absolute", width, height }}>
      <Svg width={width} height={height}>
        <AnimatedPolygon
          id="home-valid-footprint"
          animatedProps={validProps}
          fill="#70C3A488"
          stroke="#277961"
          strokeWidth={2}
        />
        <AnimatedPolygon
          id="home-invalid-footprint"
          animatedProps={invalidProps}
          fill="#EF887E88"
          stroke="#AD403C"
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
}
export function FloorGrid({ scale, width, height }: { scale: number; width: number; height: number }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", width, height }}>
      <Svg width={width} height={height} opacity={0.24}>
        {Array.from({ length: 13 }, (_, y) => (
          <Line
            key={`y${y}`}
            x1={(151 + y * 7) * scale}
            y1={(315 + y * 15.5) * scale}
            x2={(661 + y * 7) * scale}
            y2={(345 + y * 15.5) * scale}
            stroke="#427468"
            strokeDasharray="3 5"
          />
        ))}
        {Array.from({ length: 21 }, (_, x) => (
          <Line
            key={`x${x}`}
            x1={(151 + x * 25.5) * scale}
            y1={(315 + x * 1.5) * scale}
            x2={(235 + x * 25.5) * scale}
            y2={(501 + x * 1.5) * scale}
            stroke="#427468"
            strokeDasharray="3 5"
          />
        ))}
      </Svg>
    </View>
  );
}

export function TrayGhost({
  preview,
  children,
  size,
  scale,
}: {
  preview: SharedValue<Preview>;
  children: ReactNode;
  size: number;
  scale: number;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: preview.value.active ? 0.85 : 0,
    transform: [
      { translateX: (preview.value.px ?? 0) * scale - size / 2 },
      { translateY: (preview.value.py ?? 0) * scale - size * 0.85 - 7 },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: 0, top: 0, width: size, height: size, zIndex: 800 }, style]}
    >
      {children}
    </Animated.View>
  );
}
