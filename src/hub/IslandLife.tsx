import React, { memo, useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAppForeground } from './foreground';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';

/** Small composited lagoon overlays keep idle motion off the static SVG scene and clear of the six illustrated doors.
 * The tide runs only while the map has focus and the app is in front; it stops in the background and starts again from rest on return. */
export const IslandLife = memo(function IslandLife({ width, height, reduced, active }: { width: number; height: number; fontScale: number; reduced: boolean; active: boolean }) {
  const wide = width > height * 1.15;
  const tide = useSharedValue(0), foreground = useAppForeground(), moving = active && foreground && !reduced;
  useEffect(() => {
    if (!moving) { cancelAnimation(tide); tide.set(0); return; }
    tide.set(withRepeat(withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(tide);
  }, [moving, tide]);
  const waves = useAnimatedStyle(() => ({ opacity: .35 + tide.get() * .35, transform: [{ translateY: tide.get() * 4 }] }));
  const boat = useAnimatedStyle(() => ({ transform: [{ translateY: tide.get() * 3 }, { rotate: `${tide.get() * 3 - 1.5}deg` }] }));
  const breeze = useAnimatedStyle(() => ({ opacity: .28 + tide.get() * .28, transform: [{ translateX: tide.get() * 6 - 3 }] }));
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', width, height }}>
    <Animated.View style={[{ position: 'absolute', width, height }, waves]}><Svg width="100%" height="100%" viewBox="0 0 400 660" preserveAspectRatio="none"><Path d="M6 127Q14 135 22 129M376 209Q388 217 397 210M9 508Q17 516 26 509M299 635Q314 644 327 635M13 550Q21 558 30 551" stroke="#F0F5D8" strokeWidth={3} fill="none" strokeLinecap="round"/></Svg></Animated.View>
    <Animated.View style={[{ position: 'absolute', left: width * (wide ? .015 : .03), top: height * (wide ? .83 : .90), width: 48, height: 56 }, boat]}><Svg width="100%" height="100%" viewBox="0 0 60 70"><Path d="M6 48H55L47 61H17Z" fill="#C98066" stroke="#425F55" strokeWidth={2.5}/><Path d="M31 48V5L51 39H31Z" fill="#FFF1C7" stroke="#425F55" strokeWidth={2.5}/><Path d="M7 66Q21 70 35 66T57 66" fill="none" stroke="#EBF1D8" strokeWidth={2.5}/></Svg></Animated.View>
    <Animated.View style={[{ position: 'absolute', left: width * .76, top: height * .02, width: 52, height: 22 }, breeze]}><Svg width="100%" height="100%" viewBox="0 0 52 22"><Path d="M4 12Q18 6 32 11T48 9M12 18Q24 14 38 17" stroke="#FFF9E6" strokeWidth={2.5} fill="none" strokeLinecap="round"/></Svg></Animated.View>
  </View>;
});
