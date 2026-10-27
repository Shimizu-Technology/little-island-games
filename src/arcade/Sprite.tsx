import React, { memo } from "react";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
export type SpritePose = { x: number; y: number; angle?: number; opacity?: number; scale?: number };
/** Keep art static. Move only this absolute wrapper; no layout or React updates per frame. */
export const ArcadeSprite = memo(function ArcadeSprite({ poses, index, width, height, children }: { poses: SharedValue<SpritePose[]>; index: number; width: number; height: number; children: React.ReactNode }) {
  const motion = useAnimatedStyle(() => {
    const p = poses.value[index];
    return { opacity: p?.opacity ?? 1, transform: [{ translateX: p?.x ?? 0 }, { translateY: p?.y ?? 0 }, { rotate: `${p?.angle ?? 0}rad` }, { scale: p?.scale ?? 1 }] };
  });
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width, height }, motion]}>{children}</Animated.View>;
});
