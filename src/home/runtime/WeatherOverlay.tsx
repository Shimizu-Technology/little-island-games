import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import type { Atmosphere } from '../atmosphere';

export const WEATHER_PARTICLES = 24;
/** A house has four window layers (4 each) and one exterior layer (8): 24 total. */
export function weatherRuns(weather: Atmosphere['weather'], reduced: boolean, active: boolean) {
  return weather !== 'clear' && !reduced && active;
}
function Particle({ index: n, weather, phase, width, height }: { index: number; weather: Atmosphere['weather']; phase: SharedValue<number>; width: number; height: number }) {
  const firefly = weather === 'fireflies', rain = weather === 'rain', leaf = weather === 'leaves';
  const size = rain ? 2 : firefly ? 5 : leaf ? 12 : 5;
  const style = useAnimatedStyle(() => {
    const t = (phase.value + n * .173) % 1;
    const drift = Math.sin(t * Math.PI * 2 + n) * (firefly ? 22 : 12);
    return { opacity: firefly ? .3 + Math.sin(t * Math.PI) * .6 : .72,
      transform: [{ translateX: (n * 79 + 17) % Math.max(1, width - 24) + drift + (rain ? t * 22 : 0) },
        { translateY: firefly ? height * (.25 + (n % 4) * .14) + Math.sin(t * Math.PI * 2) * 20 : t * (height + 20) - 12 },
        { rotate: `${rain ? 18 : leaf ? Math.sin(t * Math.PI * 2) * 40 : 0}deg` }] };
  });
  return <Animated.View testID="weather-particle" style={[{ position: 'absolute', width: size, height: rain ? 15 : size,
    borderRadius: leaf ? 0 : 6, backgroundColor: leaf ? 'transparent' : firefly ? '#FFECA4' : rain ? '#C7E7F2' : '#FFF7E8' }, style]}>
    {leaf && <Svg width={12} height={14} viewBox="0 0 12 14"><Path d="M2 12Q-2 2 11 1Q14 11 2 12M2 12L9 4" fill={n % 2 ? '#E7AB59' : '#D78463'} stroke="#C98749" strokeWidth={.6}/></Svg>}
    {firefly && <View style={{ position: 'absolute', left: -5, top: -5, width: 15, height: 15, borderRadius: 9, backgroundColor: '#FFDA7D', opacity: .2 }}/>} 
  </Animated.View>;
}
export function WeatherOverlay({ weather, reduced, active, width, height, count = 4 }: { weather: Atmosphere['weather']; reduced: boolean; active: boolean; width: number; height: number; count?: number }) {
  // Child mounts only for non-clear weather; clear adds neither shared values nor animations.
  if (weather === 'clear') return null;
  return <WeatherField weather={weather} reduced={reduced} active={active} width={width} height={height} count={Math.min(WEATHER_PARTICLES, Math.max(0, count))}/>;
}
function WeatherField({ weather, reduced, active, width, height, count }: { weather: Atmosphere['weather']; reduced: boolean; active: boolean; width: number; height: number; count: number }) {
  const phase = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(phase);
    phase.value = 0;
    if (weatherRuns(weather, reduced, active)) phase.value = withRepeat(withTiming(1, { duration: weather === 'rain' ? 2600 : weather === 'fireflies' ? 14000 : 18000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(phase);
  }, [weather, reduced, active, phase]);
  return <View testID="weather-overlay" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
    {Array.from({ length: reduced ? Math.min(count, 3) : count }, (_, n) => <Particle key={n} index={n} weather={weather} phase={phase} width={width} height={height}/>)}
  </View>;
}
