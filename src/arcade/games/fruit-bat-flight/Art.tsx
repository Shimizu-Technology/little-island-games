import { AtmosphereSky } from '../../../atmosphere/GlobalWeatherLayer';
import { defaultAtmosphere, type Atmosphere } from '../../../atmosphere/palette';
import React, { memo, useId } from "react";
import { Image, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, G, Image as SvgImage, LinearGradient, Mask, Path, Rect, Stop } from "react-native-svg";
import type { SharedValue } from "react-native-reanimated";
import { ArcadeSprite, type SpritePose } from "../../Sprite";
import type { WorldId } from "../../types";
import { flightArt } from "./assets";
import { FLIGHT_H, FLIGHT_W } from "./hull";
import {
  FLIGHT_CHROME_TINT, FLIGHT_SLOT, PALM_CAP_HEIGHT, PALM_CAP_WIDTH, PALM_COLUMN_HEIGHT,
  PALM_TILE_HEIGHT, PALM_TILE_OVERLAP, PALM_WIDTH, SHORE_TILE_OVERLAP,
} from "./presentation";

const shaftJoin = PALM_CAP_HEIGHT - PALM_TILE_OVERLAP;
const shaftHeight = PALM_COLUMN_HEIGHT - shaftJoin;
const shaftStride = PALM_TILE_HEIGHT - PALM_TILE_OVERLAP;
const shaftTiles = Array.from({ length: Math.ceil((shaftHeight - PALM_TILE_OVERLAP) / shaftStride) }, (_, i) => i * shaftStride);

export const FlightPalm = memo(function FlightPalm({ bottom = false }: { bottom?: boolean }) {
  const shaft = flightArt.shaft();
  return <View style={{ width: PALM_CAP_WIDTH, height: PALM_COLUMN_HEIGHT }}>
    <View style={{
      position: "absolute", left: (PALM_CAP_WIDTH - PALM_WIDTH) / 2, top: bottom ? shaftJoin : 0,
      width: PALM_WIDTH, height: shaftHeight, overflow: "hidden",
    }}>
      {shaftTiles.map(top => <Image key={top} source={shaft} accessible={false} resizeMode="cover" fadeDuration={0}
        style={{ position: "absolute", left: 0, top, width: PALM_WIDTH, height: PALM_TILE_HEIGHT }}/>)}
    </View>
    <Image source={flightArt.cap()} accessible={false} resizeMode="cover" fadeDuration={0}
      style={{ position: "absolute", left: 0, width: PALM_CAP_WIDTH, height: PALM_CAP_HEIGHT, top: bottom ? 0 : PALM_COLUMN_HEIGHT - PALM_CAP_HEIGHT, transform: [{ scaleY: bottom ? 1 : -1 }] }}/>
  </View>;
});

const CloudBand = memo(function CloudBand({ near, tiles }: { near: boolean; tiles: number }) {
  const cloudRibbon = "M0 22C8 15 22 12 33 15C40 3 65 2 75 15C90 10 113 18 118 25C70 31 40 29 0 28Z";
  return <Svg width={FLIGHT_W * tiles} height={225} accessible={false}>
    <G fill="#FFFDF8" opacity={near ? .33 : .22}>
      {Array.from({ length: tiles }, (_, i) => <G key={i} transform={`translate(${i * FLIGHT_W} 0)`}>
        <Path d={cloudRibbon} transform={near ? "translate(25 100) scale(1.08)" : "translate(68 42) scale(.72)"}/>
        <Path d={cloudRibbon} transform={near ? "translate(227 151) scale(.83)" : "translate(211 66) scale(1.1)"}/>
      </G>)}
    </G>
  </Svg>;
});

/** Two soft cloud bands above the flight lane at independent speeds. */
export const FlightForest = memo(function FlightForest({ poses, storm, tiles }: { poses: SharedValue<SpritePose[]>; storm: boolean; tiles: number }) {
  return <>
    {[0, 1].map(i => <ArcadeSprite key={i} poses={poses} index={FLIGHT_SLOT.clouds + i} width={FLIGHT_W * (tiles + 1)} height={225}><CloudBand near={i === 1} tiles={tiles + 1}/></ArcadeSprite>)}
    {storm && <Svg width={FLIGHT_W * tiles} height={240} style={StyleSheet.absoluteFill} accessible={false}>
      {Array.from({ length: tiles }, (_, i) => <Path key={i} transform={`translate(${i * FLIGHT_W} 0)`}
        d="M36 92l-7 14M87 51l-7 14M129 172l-7 14M186 83l-7 14M254 51l-7 14M296 161l-7 14M345 104l-7 14M372 173l-7 14" fill="none" stroke="#FFFDF8" strokeWidth={1.6} strokeLinecap="round" opacity={.43}/>)}
    </Svg>}
  </>;
});

const ShoreTile = memo(function ShoreTile({ x }: { x: number }) {
  return <G transform={`translate(${x} 0)`}>
    <Rect width={FLIGHT_W + SHORE_TILE_OVERLAP} height={10} fill="#C98C56"/>
    <Path d="M0 1.5Q24 3 48.75 1.5T97.5 1.5T146.25 1.5T195 1.5T243.75 1.5T292.5 1.5T341.25 1.5T390 1.5L392 1.62" fill="none" stroke="#2A8C82" strokeWidth={3}/>
    <Path d="M0 3.5Q24 5 48.75 3.5T97.5 3.5T146.25 3.5T195 3.5T243.75 3.5T292.5 3.5T341.25 3.5T390 3.5L392 3.62" fill="none" stroke="#FFFDF8" strokeWidth={1.4}/>
    {[29, 121, 200, 282, 356].map(x => <G key={x} transform={`translate(${x} 7)`} stroke="#8E533F" strokeWidth={.65} fill="#FFF2D9">
      <Path d="M-3 1Q0-5 3 1Z"/><Circle cx={12} cy={.6} r={.8} stroke="none"/>
    </G>)}
  </G>;
});
export const FlightShore = memo(function FlightShore({ poses, tiles }: { poses: SharedValue<SpritePose[]>; tiles: number }) {
  const width = FLIGHT_W * (tiles + 1) + SHORE_TILE_OVERLAP;
  return <ArcadeSprite poses={poses} index={FLIGHT_SLOT.shore} width={width} height={10}>
    <Svg width={width} height={10} accessible={false}>
      {Array.from({ length: tiles + 1 }, (_, i) => <ShoreTile key={i} x={i * FLIGHT_W}/>)}
    </Svg>
  </ArcadeSprite>;
});

const dayHorizon = [[0, "#96DBD6"], [26, "#DEE6CF"], [54, "#F9E4C9"], [65, "#FCF6E4"], [79, "#77C9CB"], [92, "#8FD7CA"], [100, "#EFCA91"]] as const;
const sunsetHorizon = [[0, "#C08794"], [40, "#FBAE80"], [68, "#FCDD9B"], [80, "#D5AC8C"], [94, "#91C9B8"], [100, "#D89361"]] as const;

type SkyProps = { atmosphere?: Atmosphere; world?: WorldId; storm?: boolean; width?: number; height?: number };
export const FlightWideSky = memo(function FlightWideSky({ world = "w1", storm = false, width = FLIGHT_W, height = FLIGHT_H, atmosphere = defaultAtmosphere }: SkyProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const sunset = atmosphere.timeOfDay === 'sunset' || storm || world === "w4" || world === "w5" || world === "w6";
  const stops = sunset ? sunsetHorizon : dayHorizon;
  const source = sunset ? flightArt.sunset() : flightArt.day();
  const wide = width / height > FLIGHT_W / FLIGHT_H;
  // Keep all 1290 source rows. A modest horizontal expansion gives the island more room on wide displays.
  const artWidth = Math.min(width, height * (720 / 1290) * 1.25);
  const artLeft = (width - artWidth) / 2;
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[StyleSheet.absoluteFill, { backgroundColor: sunset ? sunsetHorizon[0][1] : FLIGHT_CHROME_TINT }]}>
    {wide ? <Svg width={width} height={height} accessible={false}>
      <Defs>
        <LinearGradient id={`${id}-horizon`} x1="0%" y1="0%" x2="0%" y2="100%">
          {stops.map(([offset, color]) => <Stop key={offset} offset={`${offset}%`} stopColor={color}/>)}
        </LinearGradient>
        <LinearGradient id={`${id}-feather`} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="white" stopOpacity={0}/>
          <Stop offset="18%" stopColor="white"/>
          <Stop offset="82%" stopColor="white"/>
          <Stop offset="100%" stopColor="white" stopOpacity={0}/>
        </LinearGradient>
        <Mask id={`${id}-art`} maskUnits="userSpaceOnUse" x={artLeft} y={0} width={artWidth} height={height}>
          <Rect x={artLeft} width={artWidth} height={height} fill={`url(#${id}-feather)`}/>
        </Mask>
      </Defs>
      <Rect width={width} height={height} fill={`url(#${id}-horizon)`}/>
      <SvgImage href={source} x={artLeft} y={0} width={artWidth} height={height} preserveAspectRatio="none" mask={`url(#${id}-art)`}/>
    </Svg> : <Image source={source} accessible={false} fadeDuration={0} resizeMode="cover" style={{ width: "100%", height: "100%" }}/>}
    {atmosphere.timeOfDay !== 'day' && <AtmosphereSky atmosphere={atmosphere} width={width} height={height} gradient/>}
    {storm && <View style={[StyleSheet.absoluteFill, { backgroundColor: "#47497424" }]}/>}
  </View>;
});

export const Fruit = memo(function Fruit({ size = 50 }: { size?: number }) {
  return <View style={{ width: size, height: size }}>
    <View style={{ position: "absolute", inset: size * .12, borderRadius: size / 2, backgroundColor: "#FAD06D50" }}/>
    <View style={{ position: "absolute", inset: size * .2, borderRadius: size / 2, backgroundColor: "#FFE7A16E" }}/>
    <Image source={flightArt.mango()} accessible={false} fadeDuration={0} style={{ width: size, height: size }}/>
  </View>;
});
export function ShellMedal({ score }: { score: number }) {
  const fill = score >= 30 ? "#F4D687" : score >= 15 ? "#DCE5E0" : score >= 5 ? "#D99D7A" : "#C9DECF";
  return <Svg width={78} height={78} viewBox="0 0 78 78" accessible={false}><Circle cx={39} cy={39} r={36} fill="#FFF4D7"/><Circle cx={39} cy={39} r={31} fill="#E8C68E"/><Path d="M39 16Q57 11 63 31Q65 49 48 60H30Q13 49 15 31Q21 11 39 16Z" fill={fill} stroke="#8E674F" strokeWidth={2.5}/><Path d="M39 21V57M39 27Q24 24 21 36M39 27Q54 24 57 36M39 35Q25 35 24 46M39 35Q53 35 54 46M39 43Q30 45 30 52M39 43Q48 45 48 52" stroke="#FFF7DD" strokeWidth={2.6} fill="none" strokeLinecap="round"/><Path d="M29 59H49" stroke="#8E674F" strokeWidth={3}/></Svg>;
}
