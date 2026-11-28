import type { Atmosphere } from '../home/atmosphere';
import React, { memo, useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAppForeground } from './foreground';
import type { MapExtrasLayout } from './model';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';

export type MapEasterEggEvent = {
  id: number;
  kind: 'splash' | 'sail' | 'dolphin' | 'hibiscus' | 'shooting-star';
  x: number;
  y: number;
  toX?: number;
  toY?: number;
};

/** Small composited lagoon overlays keep idle motion off the static SVG scene and clear of the six illustrated doors.
 * The tide runs only while the map has focus and the app is in front; it stops in the background and starts again from rest on return. */
export const IslandLife = memo(function IslandLife({
  width,
  height,
  reduced,
  active,
  atmosphere,
  extras,
  easterEgg,
}: {
  width: number;
  height: number;
  fontScale: number;
  reduced: boolean;
  active: boolean;
  atmosphere?: Atmosphere;
  extras?: MapExtrasLayout;
  easterEgg?: MapEasterEggEvent | null;
}) {
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
  const boatLeft = extras ? extras.sailboat.x - 24 : width * (wide ? .015 : .03);
  const boatTop = extras ? extras.sailboat.y - 28 : height * (wide ? .83 : .90);
  const sailing = easterEgg?.kind === 'sail';
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', width, height }}>
    {atmosphere?.timeOfDay === 'night' && <Animated.View testID="island-star-glints" style={[{ position: 'absolute', width, height: height * .25 }, waves]}><Svg width="100%" height="100%" viewBox="0 0 400 165"><Path d="M45 28l2 5 5 2-5 2-2 5-2-5-5-2 5-2ZM175 45l2 5 5 2-5 2-2 5-2-5-5-2 5-2ZM270 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#FFF5CC"/></Svg></Animated.View>}
    <Animated.View style={[{ position: 'absolute', width, height }, waves]}><Svg width="100%" height="100%" viewBox="0 0 400 660" preserveAspectRatio="none"><Path d="M6 127Q14 135 22 129M376 209Q388 217 397 210M9 508Q17 516 26 509M299 635Q314 644 327 635M13 550Q21 558 30 551" stroke="#F0F5D8" strokeWidth={3} fill="none" strokeLinecap="round"/></Svg></Animated.View>
    {/* Subtle shimmering water ripple cue at the Tumon Beach pier/lagoon hotspot */}
    {extras && (
      <Animated.View testID="map-ocean-shimmer" style={[{ position: 'absolute', left: extras.ocean.x - 22, top: extras.ocean.y - 10, width: 44, height: 20 }, waves]}>
        <Svg width="100%" height="100%" viewBox="0 0 44 20">
          <Path d="M6 10Q22 4 38 10Q22 16 6 10Z" fill="none" stroke="#E8FFF9" strokeWidth={2} opacity={0.78} />
          <Path d="M13 10Q22 7 31 10" fill="none" stroke="#FFF9E6" strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </Animated.View>
    )}
    {/* Landscape miniature Cocos Islet SVG in the bottom-left lagoon beside the sailboat */}
    {wide && extras && (
      <View testID="landscape-cocos-islet" style={{ position: 'absolute', left: extras.cocos.x - 26, top: extras.cocos.y - 24, width: 52, height: 48 }}>
        <Svg width="100%" height="100%" viewBox="0 0 64 58">
          <Path d="M8 38Q18 22 38 24Q56 26 58 38Q54 50 32 52Q10 52 8 38Z" fill="#7CE4E0" opacity={0.62} />
          <Path d="M14 38Q22 28 38 29Q50 30 51 39Q47 46 31 47Q16 46 14 38Z" fill="#F2E2B5" stroke="#C7B27E" strokeWidth={1.6} />
          <Path d="M19 36Q26 29 38 30Q46 32 45 38Q39 42 29 42Q20 41 19 36Z" fill="#8CC077" />
          <Path d="M31 35Q29 22 25 14" stroke="#9B754B" strokeWidth={3} strokeLinecap="round" fill="none" />
          <Path d="M25 14Q15 11 12 18Q19 16 25 15Q22 6 31 7Q28 11 25 14Q34 9 39 16Q32 15 25 15Q29 19 34 24Q27 21 25 15" fill="#5D9468" stroke="#3F6B4E" strokeWidth={1.2} />
        </Svg>
      </View>
    )}
    {/* Subtle Secret Cocos Lagoon sparkle halo */}
    {extras && (
      <Animated.View style={[{ position: 'absolute', left: extras.cocos.x - 24, top: extras.cocos.y - 20, width: 48, height: 40 }, waves]}>
        <Svg width="100%" height="100%" viewBox="0 0 48 40">
          <Path d="M8 32Q24 38 40 31" fill="none" stroke="#EBFDF9" strokeWidth={2.2} strokeLinecap="round" opacity={0.75} />
          <Path d="M38 10l1.5 3.5L43 15l-3.5 1.5L38 20l-1.5-3.5L33 15l3.5-1.5Z" fill="#FFF4B8" />
        </Svg>
      </Animated.View>
    )}
    {/* Little Sailboat (bobbing in lagoon, plus sparkling wake ripples when sailing to Cocos!) */}
    <Animated.View testID="map-sailboat-art" style={[{ position: 'absolute', left: boatLeft, top: boatTop, width: 48, height: 56 }, boat]}>
      <Svg width="100%" height="100%" viewBox="0 0 60 70">
        {sailing && <Path d="M2 62Q18 69 34 62T58 63M6 68Q22 73 42 67" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />}
        <Path d="M6 48H55L47 61H17Z" fill="#C98066" stroke="#425F55" strokeWidth={2.5}/>
        <Path d="M31 48V5L51 39H31Z" fill="#FFF1C7" stroke="#425F55" strokeWidth={2.5}/>
        <Path d="M7 66Q21 70 35 66T57 66" fill="none" stroke="#EBF1D8" strokeWidth={2.5}/>
      </Svg>
    </Animated.View>
    <Animated.View style={[{ position: 'absolute', left: width * .76, top: height * .02, width: 52, height: 22 }, breeze]}><Svg width="100%" height="100%" viewBox="0 0 52 22"><Path d="M4 12Q18 6 32 11T48 9M12 18Q24 14 38 17" stroke="#FFF9E6" strokeWidth={2.5} fill="none" strokeLinecap="round"/></Svg></Animated.View>
    {/* Active Map Easter Egg visual flourishes (respect Reduce Motion) */}
    {easterEgg?.kind === 'splash' && (
      <View testID="map-egg-splash" style={{ position: 'absolute', left: easterEgg.x - 32, top: easterEgg.y - 24, width: 64, height: 48 }}>
        <Svg width="100%" height="100%" viewBox="0 0 64 48">
          <Path d="M8 28Q32 16 56 28Q32 40 8 28Z" fill="none" stroke="#B7FAF6" strokeWidth={2.5} />
          <Path d="M16 28Q32 21 48 28Q32 35 16 28Z" fill="none" stroke="#FFFFFF" strokeWidth={2.2} />
          {!reduced && <Path d="M22 18l-4-8M32 14V6M42 18l4-8" stroke="#E8FFFF" strokeWidth={2.5} strokeLinecap="round" />}
        </Svg>
      </View>
    )}
    {easterEgg?.kind === 'sail' && (
      <View testID="map-egg-sail-wake" style={{ position: 'absolute', left: (easterEgg.toX ?? easterEgg.x) - 34, top: (easterEgg.toY ?? easterEgg.y) - 22, width: 68, height: 44 }}>
        <Svg width="100%" height="100%" viewBox="0 0 68 44">
          <Path d="M6 26Q22 18 38 26T62 24" fill="none" stroke="#FFFFFF" strokeWidth={2.8} strokeLinecap="round" />
          <Path d="M14 33Q30 27 52 33" fill="none" stroke="#A6F5F0" strokeWidth={2.4} strokeLinecap="round" />
          <Path d="M34 6l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#FFF4B8" />
        </Svg>
      </View>
    )}
    {easterEgg?.kind === 'dolphin' && (
      <View testID="map-egg-dolphin" style={{ position: 'absolute', left: easterEgg.x - 36, top: easterEgg.y - 34, width: 72, height: 58 }}>
        <Svg width="100%" height="100%" viewBox="0 0 72 58">
          <Path d="M10 42Q36 34 62 42" fill="none" stroke="#D8FFFF" strokeWidth={2.6} strokeLinecap="round" />
          <Path d="M16 36Q26 10 46 18Q54 22 57 32Q49 28 42 30Q30 26 24 38Z" fill="#63B4D1" stroke="#2F5F73" strokeWidth={2} />
          <Path d="M35 17L39 9L43 17" fill="#63B4D1" stroke="#2F5F73" strokeWidth={1.8} />
          {!reduced && <Path d="M16 30l-5-6M56 30l5-6" stroke="#EBFDF9" strokeWidth={2.2} strokeLinecap="round" />}
        </Svg>
      </View>
    )}
    {easterEgg?.kind === 'hibiscus' && (
      <View testID="map-egg-hibiscus" style={{ position: 'absolute', left: easterEgg.x - 34, top: easterEgg.y - 26, width: 68, height: 52 }}>
        <Svg width="100%" height="100%" viewBox="0 0 68 52">
          <Path d="M12 20q-6-5-1-9q5-4 8 2q6-3 7 3q1 6-6 6q-4 5-8-2Z" fill="#FF847C" />
          <Path d="M38 14q-5-4-1-8q4-3 7 2q5-2 6 3q1 5-5 5q-3 4-7-2Z" fill="#FFA48E" />
          <Path d="M26 36q-5-4-1-7q4-3 6 2q4-2 5 2q1 4-4 4q-3 4-6-1Z" fill="#FFD166" />
          <Path d="M46 28q6-6 12-2q-5 1-8 5q5 0 9 3" fill="none" stroke="#FFF9E6" strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
      </View>
    )}
    {easterEgg?.kind === 'shooting-star' && (
      <View testID="map-egg-shooting-star" style={{ position: 'absolute', left: Math.max(8, easterEgg.x - 110), top: Math.max(4, easterEgg.y - 16), width: 140, height: 64 }}>
        <Svg width="100%" height="100%" viewBox="0 0 140 64">
          <Path d={reduced ? 'M96 22L116 14' : 'M12 52L116 14'} stroke="#FFF2A6" strokeWidth={3} strokeLinecap="round" opacity={0.9} />
          <Path d="M116 8l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#FFF9D6" />
        </Svg>
      </View>
    )}
  </View>;
});
