import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import type { Atmosphere } from '../atmosphere';

export const WEATHER_PARTICLES = 24;
/** Four room window layers (4 each) plus one foreground layer (8): 24 total. */
export function weatherRuns(weather: Atmosphere['weather'], reduced: boolean, active: boolean) {
  return weather !== 'clear' && !reduced && active;
}
/** Evenly spaced phases, including the static/first frame. Coordinates leave room for the glyph. */
export function weatherPosition(index: number, count: number, phase: number) {
  'worklet';
  const fraction = (index + .5) / count;
  // Alternate upper/lower lanes so the evenly spaced accents never form a diagonal row.
  const row = index % 2 === 0 ? index / 2 : count - 1 - (index - 1) / 2;
  const t = (phase + (row + .5) / count) % 1;
  return { x: Math.max(.08, Math.min(.92, .08 + .84 * fraction + Math.sin(t * Math.PI * 2 + index) * Math.min(.02, .2 / count))), y: .08 + t * .84, t };
}
function Particle({ index: n, count, weather, phase, width, height, foreground }: { index: number; count: number; weather: Atmosphere['weather']; phase: SharedValue<number>; width: number; height: number; foreground: boolean }) {
  const firefly = weather === 'fireflies', rain = weather === 'rain', leaf = weather === 'leaves';
  const size = rain ? 3 : firefly ? 7 : leaf ? (foreground ? 18 : 14) : (foreground ? 12 : 9);
  const glyphHeight = rain ? 20 : size;
  const style = useAnimatedStyle(() => {
    const { x, y, t } = weatherPosition(n, count, phase.value);
    return { opacity: firefly ? .55 + Math.sin(t * Math.PI) * .4 : foreground ? .8 : .95,
      transform: [{ translateX: x * Math.max(0, width - size) },
        { translateY: y * Math.max(0, height - glyphHeight) },
        { rotate: `${rain ? 12 : leaf ? Math.sin(t * Math.PI * 2) * 30 : 0}deg` }] };
  });
  return <Animated.View testID="weather-particle" style={[{ position: 'absolute', width: size, height: glyphHeight,
    borderRadius: 6, backgroundColor: leaf || weather === 'snow' ? 'transparent' : firefly ? '#FFF2A8' : '#83B6CF' }, style]}>
    {weather === 'snow' && <Svg width={size} height={size} viewBox="0 0 12 12"><Path d="M6 1v10M1.7 3.5l8.6 5M1.7 8.5l8.6-5" stroke="#6895AC" strokeWidth={2.8} strokeLinecap="round"/><Path d="M6 1v10M1.7 3.5l8.6 5M1.7 8.5l8.6-5" stroke="#FFFDF1" strokeWidth={1.5} strokeLinecap="round"/></Svg>}
    {leaf && <Svg width={size} height={size} viewBox="0 0 14 14"><Path d="M3 12Q-1 8 2 3L5 5L7 1L9 5L13 3Q15 10 4 12M3 13L10 6" fill={n % 2 ? '#E9A344' : '#BF5F38'} stroke="#75472E" strokeWidth={.8}/></Svg>}
    {firefly && <View style={{ position: 'absolute', left: -3, top: -3, width: 13, height: 13, borderRadius: 9, backgroundColor: '#FFDA7D', opacity: .3 }}/>}
  </Animated.View>;
}
export function WeatherOverlay({ weather, reduced, active, width, height, count = 4, foreground = false }: { weather: Atmosphere['weather']; reduced: boolean; active: boolean; width: number; height: number; count?: number; foreground?: boolean }) {
  // Child mounts only for non-clear weather; clear adds neither shared values nor animations.
  if (weather === 'clear') return null;
  return <WeatherField weather={weather} reduced={reduced} active={active} width={width} height={height} foreground={foreground} count={Math.min(WEATHER_PARTICLES, Math.max(0, Math.floor(count)))}/>;
}
function WeatherField({ weather, reduced, active, width, height, count, foreground }: { weather: Atmosphere['weather']; reduced: boolean; active: boolean; width: number; height: number; count: number; foreground: boolean }) {
  const phase = useSharedValue(0);
  const visibleCount = reduced ? Math.min(count, 3) : count;
  useEffect(() => {
    cancelAnimation(phase);
    phase.value = 0;
    if (visibleCount && weatherRuns(weather, reduced, active)) phase.value = withRepeat(withTiming(1, { duration: weather === 'rain' ? (foreground ? 6500 : 2600) : weather === 'fireflies' ? 14000 : 18000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(phase);
  }, [weather, reduced, active, phase, visibleCount, foreground]);
  return <View testID="weather-overlay" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
    {Array.from({ length: visibleCount }, (_, n) => <Particle key={n} index={n} count={visibleCount} weather={weather} phase={phase} width={width} height={height} foreground={foreground}/>)}
  </View>;
}
