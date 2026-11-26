import React, { memo } from "react";
import { Image, StyleSheet, View } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import type { SharedValue } from "react-native-reanimated";
import { ArcadeSprite, type SpritePose } from "../../Sprite";
import type { WorldId } from "../../types";
import { flightArt } from "./assets";
import { FLIGHT_H, FLIGHT_W } from "./hull";
import { FLIGHT_SLOT, PALM_CAP_HEIGHT, PALM_WIDTH } from "./presentation";

/** The gap-facing cap ends flush with the engine's rectangle. Only the upper cap is mirrored. */
export const FlightPalm = memo(function FlightPalm({ bottom = false }: { bottom?: boolean }) {
  const shaftHeight = FLIGHT_H - PALM_CAP_HEIGHT + 2;
  return <View style={{ width: PALM_WIDTH, height: FLIGHT_H }}>
    {[0, 1, 2, 3].map(i => <Image key={i} source={flightArt.shaft()} accessible={false} resizeMode="stretch" fadeDuration={0}
      style={{ position: "absolute", width: PALM_WIDTH, height: shaftHeight / 4 + (i < 3 ? 1 : 0), top: (bottom ? FLIGHT_H - shaftHeight : 0) + i * shaftHeight / 4 }}/>)}
    <Image source={flightArt.cap()} accessible={false} resizeMode="stretch" fadeDuration={0}
      style={{ position: "absolute", width: PALM_WIDTH, height: PALM_CAP_HEIGHT, top: bottom ? 0 : FLIGHT_H - PALM_CAP_HEIGHT, transform: [{ scaleY: bottom ? 1 : -1 }] }}/>
  </View>;
});

const CloudBand = memo(function CloudBand({ near }: { near: boolean }) {
  const cloudRibbon = "M0 22C8 15 22 12 33 15C40 3 65 2 75 15C90 10 113 18 118 25C70 31 40 29 0 28Z";
  return <Svg width={FLIGHT_W * 2} height={225} accessible={false}>
    <G fill="#FFFDF8" opacity={near ? .33 : .22}>
      {[0, FLIGHT_W].map(x => <G key={x} transform={`translate(${x} 0)`}>
        <Path d={cloudRibbon} transform={near ? "translate(25 100) scale(1.08)" : "translate(68 42) scale(.72)"}/>
        <Path d={cloudRibbon} transform={near ? "translate(227 151) scale(.83)" : "translate(211 66) scale(1.1)"}/>
      </G>)}
    </G>
  </Svg>;
});

/** Two soft cloud bands above the flight lane at independent speeds. */
export const FlightForest = memo(function FlightForest({ poses, storm }: { poses: SharedValue<SpritePose[]>; storm: boolean }) {
  return <>
    {[0, 1].map(i => <ArcadeSprite key={i} poses={poses} index={FLIGHT_SLOT.clouds + i} width={FLIGHT_W * 2} height={225}><CloudBand near={i === 1}/></ArcadeSprite>)}
    {storm && <Svg width={FLIGHT_W} height={240} style={StyleSheet.absoluteFill} accessible={false}>
      <Path d="M36 92l-7 14M87 51l-7 14M129 172l-7 14M186 83l-7 14M254 51l-7 14M296 161l-7 14M345 104l-7 14M372 173l-7 14" fill="none" stroke="#FFFDF8" strokeWidth={1.6} strokeLinecap="round" opacity={.43}/>
    </Svg>}
  </>;
});

const ShoreTile = memo(function ShoreTile() {
  return <Svg width={FLIGHT_W} height={10} accessible={false}>
    <Rect width={FLIGHT_W} height={10} fill="#C98C56"/>
    <Path d="M0 1.5Q24 3 48.75 1.5T97.5 1.5T146.25 1.5T195 1.5T243.75 1.5T292.5 1.5T341.25 1.5T390 1.5" fill="none" stroke="#2A8C82" strokeWidth={3}/>
    <Path d="M0 3.5Q24 5 48.75 3.5T97.5 3.5T146.25 3.5T195 3.5T243.75 3.5T292.5 3.5T341.25 3.5T390 3.5" fill="none" stroke="#FFFDF8" strokeWidth={1.4}/>
    {[29, 121, 200, 282, 356].map(x => <G key={x} transform={`translate(${x} 7)`} stroke="#8E533F" strokeWidth={.65} fill="#FFF2D9">
      <Path d="M-3 1Q0-5 3 1Z"/><Circle cx={12} cy={.6} r={.8} stroke="none"/>
    </G>)}
  </Svg>;
});
export const FlightShore = memo(function FlightShore({ poses }: { poses: SharedValue<SpritePose[]> }) {
  return <>{[0, 1].map(i => <ArcadeSprite key={i} poses={poses} index={FLIGHT_SLOT.shore + i} width={FLIGHT_W} height={10}><ShoreTile/></ArcadeSprite>)}</>;
});

type SkyProps = { world?: WorldId; storm?: boolean };
export const FlightSky = memo(function FlightSky({ world = "w1", storm = false }: SkyProps) {
  const sunset = storm || world === "w4" || world === "w5" || world === "w6";
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: sunset ? "#F7C48F" : "#A9DCD3" }]}>
    <Image source={sunset ? flightArt.sunset() : flightArt.day()} accessible={false} fadeDuration={0} resizeMode="cover" style={{ width: "100%", height: "100%" }}/>
    {storm && <View style={[StyleSheet.absoluteFill, { backgroundColor: "#47497424" }]}/>}
  </View>;
});
export const FlightWideSky = FlightSky;

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
