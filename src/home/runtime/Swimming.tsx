import React, { memo } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { HomeMotionContext } from './HomeMotionContext';

/** Concentric glowing turquoise/white water ripples when a character is in the lagoon; gated by HomeMotionContext. */
export const WaterRipples = memo(function WaterRipples({ slot, width, height, reduced, live, buoyant }: { slot: number; width: number; height: number; reduced: boolean; live: boolean; buoyant: boolean }) {
  const motionLive = React.useContext(HomeMotionContext);
  const animating = motionLive && live && !reduced;
  const pulse = useSharedValue(0);
  React.useEffect(() => {
    if (!animating) {
      cancelAnimation(pulse);
      pulse.set(0);
      return;
    }
    pulse.set(withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => {
      cancelAnimation(pulse);
      pulse.set(0);
    };
  }, [pulse, animating]);
  const outer = useAnimatedStyle(() => ({
    opacity: animating ? 0.75 - pulse.value * 0.35 : 0.65,
    transform: [{ scaleX: animating ? 0.92 + pulse.value * 0.22 : 1 }, { scaleY: animating ? 0.92 + pulse.value * 0.16 : 1 }],
  }));
  const inner = useAnimatedStyle(() => ({
    opacity: animating ? 0.55 + pulse.value * 0.35 : 0.85,
    transform: [{ scaleX: animating ? 1.06 - pulse.value * 0.14 : 1 }, { scaleY: animating ? 1.04 - pulse.value * 0.1 : 1 }],
  }));
  const kicks = useAnimatedStyle(() => ({
    opacity: animating ? .35 + pulse.value * .6 : .65,
    transform: [{ translateY: animating ? -pulse.value * 10 : 0 }, { scale: animating ? .8 + pulse.value * .4 : 1 }],
  }));
  const ringW = Math.max(54, width * (buoyant ? 1.08 : .86));
  const ringH = Math.max(16, Math.min(26, height * 0.16));
  const top = height * (buoyant ? .69 : .83) - ringH * .5;
  return (
    <View testID={`water-ripples-${slot}`} pointerEvents="none" accessible={false}
      style={{ position: "absolute", left: (width - ringW) / 2, top, width: ringW, height: ringH, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ position: "absolute", width: ringW, height: ringH, borderRadius: ringW / 2, borderWidth: 2.5, borderColor: "#7CEAE8", backgroundColor: "rgba(124, 234, 232, 0.22)" }, outer]} />
      <Animated.View testID={`swim-kicks-${slot}`} style={[{ position: "absolute", left: -10, top: -8, width: ringW + 20, height: 28 }, kicks]}>
        <View style={{ position: "absolute", left: 0, top: 6, width: 6, height: 10, borderRadius: 5, backgroundColor: "#E6FFFF", transform: [{ rotate: "-32deg" }] }}/>
        <View style={{ position: "absolute", right: 2, top: 0, width: 7, height: 11, borderRadius: 5, backgroundColor: "#CBFFFF", transform: [{ rotate: "32deg" }] }}/>
        <View style={{ position: "absolute", left: 12, top: 17, width: 15, height: 8, borderTopWidth: 3, borderColor: "#F2FFFF", borderRadius: 12 }}/>
        <View style={{ position: "absolute", right: 14, top: 18, width: 15, height: 8, borderTopWidth: 3, borderColor: "#F2FFFF", borderRadius: 12 }}/>
      </Animated.View>
      <Animated.View style={[{ position: "absolute", width: ringW * 0.72, height: ringH * 0.68, borderRadius: ringW / 2, borderWidth: 2, borderColor: "#F2FFFF" }, inner]} />
    </View>
  );
});

/** Drives the gentle swimming bob loop only for mounted swimming characters, gated by HomeMotionContext so resting furniture never re-renders on overview/room changes. */
export const SwimBobDriver = memo(function SwimBobDriver({
  live,
  reduced,
  swimBob,
}: {
  live: boolean;
  reduced: boolean;
  swimBob: SharedValue<number>;
}) {
  const motionLive = React.useContext(HomeMotionContext);
  const animating = motionLive && live && !reduced;
  React.useEffect(() => {
    if (!animating) {
      cancelAnimation(swimBob);
      swimBob.set(0);
      return;
    }
    swimBob.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => {
      cancelAnimation(swimBob);
      swimBob.set(0);
    };
  }, [animating, swimBob]);
  return null;
});

