import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { skyPalette, type Atmosphere } from '../atmosphere';
import type { RoomId } from '../catalogMore';
import { WeatherOverlay } from '../runtime/WeatherOverlay';

/** Authored glass bounds in the painted 800 × 560 room. Curtains and wooden frames stay intact. */
const windows: Record<RoomId, { x: number; y: number; width: number; height: number; round?: number }[]> = {
  'tumon-beach': [],
  'chamorro-village': [],
  home: [{ x: 174, y: 104, width: 57, height: 155 }, { x: 249, y: 104, width: 50, height: 155 }],
  kitchen: [{ x: 328, y: 99, width: 139, height: 133 }],
  treehouse: [{ x: 328, y: 106, width: 144, height: 144, round: 72 }],
  beach: [{ x: 279, y: 105, width: 243, height: 141 }],
};
function WindowSky({ time, width, height, moon }: { moon: boolean; time: Atmosphere['timeOfDay']; width: number; height: number }) {
  const id = React.useId().replace(/:/g, ''), palette = skyPalette[time];
  return <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} accessible={false}>
    <Defs><LinearGradient id={id} x2="0" y2="1"><Stop offset="0" stopColor={palette[0]}/><Stop offset="1" stopColor={palette[2]}/></LinearGradient></Defs>
    <Rect width={width} height={height} fill={`url(#${id})`}/>
    {time === 'night' ? <>
      {Array.from({ length: 15 }, (_, n) => <Circle key={n} cx={6 + n * 29 % (width - 12)} cy={6 + n * 17 % (height * .6)} r={n % 3 ? .8 : 1.3} fill="#FFF1C7" opacity={.85}/>)}
      {moon && <Path d={`M${width * .72} 17a12 12 0 1 0 10 18a12 12 0 0 1-10-18Z`} fill="#FFF1C7"/>}
    </> : <Circle cx={width * .7} cy={height * .49} r={14} fill="#FFE7A4"/>}
    <Path d={`M0 ${height * .7}Q${width * .3} ${height * .59} ${width} ${height * .69}V${height}H0Z`} fill={time === 'night' ? '#2D5367' : '#C78E8D'}/>
    <Path d={`M0 ${height * .82}Q${width * .5} ${height * .73} ${width} ${height * .82}`} fill="none" stroke={time === 'night' ? '#8FA7B0' : '#FDD5B0'} strokeWidth={2} opacity={.6}/>
    <Path d={`M${width * .12} ${height}q8-${height * .4} 0-${height * .7}q-16-10-26 0q13-22 26 0q19-22 35-5q-19-4-35 5q26 2 31 21q-21-15-31-21`} fill={time === 'night' ? '#1B3C48' : '#675C67'}/>
  </Svg>;
}
/** Lighting affects the room illustration, never target contrast, actors, or chrome. */
export function AtmosphereLighting({ room, atmosphere: a, reduced, active }: { room: RoomId; atmosphere: Atmosphere; reduced: boolean; active: boolean }) {
  const id = React.useId().replace(/:/g, '');
  return <View testID={`room-lighting-${a.timeOfDay}`} pointerEvents="none" style={{ position: 'absolute', width: '100%', height: '100%' }}>
    {a.timeOfDay !== 'day' && <Svg width="100%" height="100%" viewBox="0 0 800 560" style={{ position: 'absolute' }}>
      <Defs><RadialGradient id={id}><Stop offset="0" stopColor="#FFD599" stopOpacity={.4}/><Stop offset="1" stopColor="#FFD599" stopOpacity={0}/></RadialGradient></Defs>
      <Rect width={800} height={560} fill={a.timeOfDay === 'night' ? '#283254' : '#E78E6E'} opacity={a.timeOfDay === 'night' ? .48 : .19}/>
      <Ellipse cx={410} cy={365} rx={390} ry={260} fill={`url(#${id})`}/>
    </Svg>}
    {windows[room].map((w, n, all) => <View key={n} style={{ position: 'absolute', left: `${w.x / 8}%`, top: `${w.y / 5.6}%`, width: `${w.width / 8}%`, height: `${w.height / 5.6}%`, borderRadius: w.round ?? 1, overflow: 'hidden' }}>
      {a.timeOfDay !== 'day' && <WindowSky time={a.timeOfDay} width={w.width} height={w.height} moon={n === all.length - 1}/>}
      <WeatherOverlay weather={a.weather} width={w.width} height={w.height} reduced={reduced} active={active} count={4 / all.length}/>
    </View>)}
  </View>;
}
