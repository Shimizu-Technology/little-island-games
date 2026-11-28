import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useReducedMotion } from '../components/motion';
import { useAppForeground } from '../hub/foreground';
import { WeatherOverlay } from '../home/runtime/WeatherOverlay';
import { atmosphereOverlayTint, atmosphereSkyPalette, type Atmosphere } from './palette';

/** Shared sky art is separate from weather, so foreground sprites and controls stay crisp. */
export function AtmosphereSky({ atmosphere, width, height, gradient = false }: { atmosphere: Atmosphere; width: number; height: number; gradient?: boolean }) {
  const colors = atmosphereSkyPalette(atmosphere);
  if (atmosphere.timeOfDay === 'day') return null;
  return <Svg testID={`atmosphere-sky-${atmosphere.timeOfDay}`} width={width} height={height} accessible={false} style={StyleSheet.absoluteFill}>
    {gradient && <><Defs><LinearGradient id="island-atmosphere-sky" x1="0" y1="0" x2="0" y2="1">{colors.map((color, i) => <Stop key={color} offset={i / 2} stopColor={color}/>)}</LinearGradient></Defs><Rect width={width} height={height} fill="url(#island-atmosphere-sky)"/></>}
    {atmosphere.timeOfDay === 'night' ? <>
      {Array.from({ length: 18 }, (_, i) => <Circle key={i} cx={width * (.05 + ((i * 37) % 89) / 100)} cy={height * (.025 + ((i * 13) % 23) / 100)} r={i % 3 ? 1.3 : 2} fill="#FFF5CC" opacity={.6 + (i % 3) * .15}/>)}
      <Circle cx={width * .84} cy={height * .105} r={26} fill="#FFE8A0" opacity={.12}/>
      <Path d={`M${width * .84} ${height * .105 - 18}a18 18 0 1 0 17 25 19 19 0 0 1-17-25Z`} fill="#FFF0C2"/>
    </> : <><Circle cx={width * .8} cy={height * .17} r={49} fill="#FFD386" opacity={.17}/><Circle cx={width * .8} cy={height * .17} r={27} fill="#FFE0A2" opacity={.8}/></>}
  </Svg>;
}
/** One reused UI-thread particle field; no frame-by-frame React updates. */
type LayerProps = {
  atmosphere: Atmosphere; width: number; height: number; active?: boolean; reduced?: boolean; tint?: boolean; sky?: boolean; subtle?: boolean;
};
export function GlobalWeatherLayer(props: LayerProps) {
  if (props.atmosphere.timeOfDay === 'day' && props.atmosphere.weather === 'clear') return null;
  return <WeatherLayer {...props}/>;
}
function WeatherLayer({ atmosphere, width, height, active = true, reduced = false, tint = true, sky = false, subtle = false }: LayerProps) {
  const preference = useReducedMotion(), foreground = useAppForeground();
  if (atmosphere.timeOfDay === 'day' && atmosphere.weather === 'clear') return null;
  return <View testID="global-weather-layer" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
    {tint && atmosphere.timeOfDay !== 'day' && <View testID={`atmosphere-tint-${atmosphere.timeOfDay}`} style={[StyleSheet.absoluteFill, { backgroundColor: atmosphereOverlayTint(atmosphere), opacity: subtle ? .3 : 1 }]}/>}
    {sky && <AtmosphereSky atmosphere={atmosphere} width={width} height={height}/>}
    <WeatherOverlay weather={atmosphere.weather} width={width} height={height} reduced={reduced || preference} active={active && foreground} count={subtle ? 6 : 18}/>
  </View>;
}
