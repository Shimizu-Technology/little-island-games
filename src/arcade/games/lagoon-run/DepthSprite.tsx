import React, { memo } from 'react';
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { HIDDEN_POSE, type SpritePose } from '../../poses';

/** Painter rank at or above this frame value is nearer than the runner (painterDepth > 1). */
export const FRONT_FRAME = 10000;
/** A stable draw key for one actor's whole lifetime. Rows never overtake each other, so newer
 * serials are always farther away; within a row, shells and power sit nearer than its hazards.
 * The value changes only when a recycled slot gets a new actor, never while it moves. */
export function stableDrawOrder(painterKey: number) {
  'worklet';
  const serial = Math.floor(painterKey / 7), part = painterKey - serial * 7;
  return (1 << 30) - serial * 8 + part;
}
export function depthLayer(p: SpritePose, front: boolean) {
  'worklet';
  const visible = (p.opacity ?? 1) > 0;
  return visible && ((p.frame ?? 0) >= FRONT_FRAME) === front ? p.opacity ?? 1 : 0;
}
type Slot = { x: number; y: number; angle: number; scale: number; opacity: number; order: number };
const HIDDEN_SLOT: Slot = { x: HIDDEN_POSE.x, y: HIDDEN_POSE.y, angle: 0, scale: 1, opacity: 0, order: 0 };
/**
 * Fixed draw order: each depth actor is pre-mounted twice, once behind the runner and once in
 * front. Crossing the runner only swaps opacity between the twins. Native children are never
 * reordered past the runner while visible, and draw order inside a layer never changes while
 * an actor lives (painter rank is a fixed key, not a recomputed rank).
 */
export const DepthSprite = memo(function DepthSprite({ poses, index, width, height, children, rotate = true, front = false }: {
  poses: SharedValue<SpritePose[]>;
  index: number;
  width: number;
  height: number;
  children: React.ReactNode;
  /** A rolling coconut rotates its solid art separately from its ground shadow. */
  rotate?: boolean;
  /** Draw only while this actor is nearer than the runner. */
  front?: boolean;
}) {
  const slot = useSharedValue<Slot>(HIDDEN_SLOT);
  useAnimatedReaction(() => poses.value[index] ?? HIDDEN_POSE, p => {
    const old = slot.value, live = (p.opacity ?? 1) > 0;
    // Both twins take the new key at spawn (while far and hidden in front), never at a crossing.
    const order = live && p.painterKey !== undefined ? stableDrawOrder(p.painterKey) : old.order;
    const opacity = depthLayer(p, front);
    if (opacity === 0) {
      if (old.opacity !== 0 || old.order !== order) slot.set({ ...old, opacity: 0, order });
      return;
    }
    const angle = rotate ? p.angle ?? 0 : 0, scale = p.scale ?? 1;
    if (old.x !== p.x || old.y !== p.y || old.scale !== scale || old.angle !== angle || old.opacity !== opacity || old.order !== order) slot.set({ x: p.x, y: p.y, angle, scale, opacity, order });
  }, [poses, index, front, rotate]);
  const style = useAnimatedStyle(() => {
    const p = slot.value;
    return {
      zIndex: p.order,
      opacity: p.opacity,
      transform: [{ translateX: p.x }, { translateY: p.y }, { rotate: `${p.angle}rad` }, { scale: p.scale }],
    };
  });
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width, height }, style]}>{children}</Animated.View>;
});
