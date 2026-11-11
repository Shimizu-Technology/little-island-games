import React, { memo, useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { mapLayout } from './model';
import { useAppForeground } from './foreground';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
/** Small composited overlays keep idle motion off the static SVG scene. The tide runs only while the map has
 * focus and the app is in front; it stops in the background and starts again from rest on return. */
export const IslandLife = memo(function IslandLife({ width, height, reduced, active, fontScale }: { width: number; height: number; reduced: boolean; active: boolean; fontScale: number }) {
 const { targets, artWidth, artHeight } = mapLayout(width, height, fontScale);
 const school = targets.find(place => place.id === 'school')!, home = targets.find(place => place.id === 'home')!;
 const tide = useSharedValue(0), foreground = useAppForeground(), moving = active && foreground && !reduced;
 useEffect(() => {
  if (!moving) { cancelAnimation(tide); tide.set(0); return; }
  tide.set(withRepeat(withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.sin) }), -1, true));
  return () => cancelAnimation(tide);
 }, [moving, tide]);
 const waves = useAnimatedStyle(() => ({ opacity: .35 + tide.get() * .35, transform: [{ translateY: tide.get() * 4 }] }));
 const boat = useAnimatedStyle(() => ({ transform: [{ translateY: tide.get() * 3 }, { rotate: `${tide.get() * 3 - 1.5}deg` }] }));
 const flag = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 - tide.get() * .12 }] }));
 const smoke = useAnimatedStyle(() => ({ opacity: .2 + tide.get() * .25, transform: [{ translateY: -tide.get() * 9 }, { scale: 1 + tide.get() * .15 }] }));
 return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', width, height }}>
  <Animated.View style={[{ position: 'absolute', width, height }, waves]}><Svg width="100%" height="100%" viewBox="0 0 400 660" preserveAspectRatio="none"><Path d="M6 127Q14 135 22 129M376 209Q388 217 397 210M9 508Q17 516 26 509M299 635Q314 644 327 635M13 550Q21 558 30 551" stroke="#F0F5D8" strokeWidth={3} fill="none" strokeLinecap="round"/></Svg></Animated.View>
  <Animated.View style={[{ position: 'absolute', left: width*.035, top: height*.91, width: 52, height: 60 }, boat]}><Svg width="100%" height="100%" viewBox="0 0 60 70"><Path d="M6 48H55L47 61H17Z" fill="#C98066" stroke="#425F55" strokeWidth={2.5}/><Path d="M31 48V5L51 39H31Z" fill="#FFF1C7" stroke="#425F55" strokeWidth={2.5}/><Path d="M7 66Q21 70 35 66T57 66" fill="none" stroke="#EBF1D8" strokeWidth={2.5}/></Svg></Animated.View>
  <Animated.View style={[{ position: 'absolute', left: school.left+artWidth*158/180, top: school.top+artHeight*20/142, width: artWidth*20/180, height: artHeight*23/142 }, flag]}><Svg width="100%" height="100%" viewBox="0 0 20 23"><Path d="M1 3Q12 -2 18 6V20Q10 13 1 18" fill="#D18D70" stroke="#54705B" strokeWidth={2}/></Svg></Animated.View>
  <Animated.View style={[{ position: 'absolute', left: home.left+artWidth*128/180, top: home.top-artHeight*.15, width: artWidth*.13, height: artHeight*.22 }, smoke]}><Svg width="100%" height="100%" viewBox="0 0 20 29"><Path d="M9 28Q-2 20 10 14Q21 7 10 1" stroke="#FFF7DD" strokeWidth={7} fill="none" strokeLinecap="round"/></Svg></Animated.View>
 </View>;
});
