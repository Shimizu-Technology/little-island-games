import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import type { SpritePose } from '../../poses';
import { impactMotion } from './kinetics';

/** Pose 36 is written in the same fixed step as contact, before the UI flush. */
export const RunHit = memo(function RunHit({ poses, children }: { poses: SharedValue<SpritePose[]>; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => ({ opacity: poses.value[36]?.scale ?? 1 }));
  return <Animated.View style={[{ position: 'absolute', width: 390, height: 660 }, style]}>{children}</Animated.View>;
});
export const RunHitFlash = memo(function RunHitFlash({ impact, reduced }: { impact: SharedValue<number>; reduced: boolean }) {
  const style = useAnimatedStyle(() => ({ opacity: impactMotion(impact.value, reduced).flash }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFD3B4' }, style]}/>;
});
