import { skyPalette, defaultAtmosphere, type Atmosphere } from "../atmosphere";
import React from "react";
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { StageRoom } from "./Stage";
import type { BadgeId } from "../../badges/engine";
import type { HomeState } from "../model";
export { wallColors, floorColors } from "./roomPalette";
export const RoomArt = React.memo(function RoomArt({theme, badges, onBadgePress, live, atmosphere, reduced, weatherActive}: {theme: HomeState["theme"]; badges?: readonly BadgeId[]; onBadgePress?: (id: BadgeId) => void; reduced?: boolean; live?: boolean; atmosphere?: Atmosphere; weatherActive?: boolean}) {
  return <StageRoom room="home" theme={theme} badges={badges} onBadgePress={onBadgePress} live={live} atmosphere={atmosphere} reduced={reduced} weatherActive={weatherActive}/>;
});

/** Quiet outdoor layers extend the stage below its floor in tall layouts. */
export const SkyArt = React.memo(function SkyArt({ time = defaultAtmosphere.timeOfDay, moon = true }: { time?: Atmosphere["timeOfDay"]; moon?: boolean }) {
  const palette = skyPalette[time];
  const orb = time !== "night" || moon;
  const id = "cottage-sky-" + React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return <Svg width="100%" height="100%" viewBox="0 0 800 1200" preserveAspectRatio="xMidYMid slice" accessible={false}>
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={palette[0]}/><Stop offset=".65" stopColor={palette[1]}/><Stop offset="1" stopColor={palette[2]}/>
      </LinearGradient>
      <RadialGradient id={id + "-halo"}>
        <Stop offset="0" stopColor="#FFF4B7"/><Stop offset="1" stopColor="#FFF4B7" stopOpacity={0}/>
      </RadialGradient>
    </Defs>
    <Rect width={800} height={1200} fill={`url(#${id})`}/>
    {orb && <Circle cx={650} cy={190} r={155} fill={`url(#${id}-halo)`}/>}
    <Path d="M0 0H800V690Q420 650 0 720Z" fill="#D8EEDE" opacity={.34}/>
    {time === 'night' ? <G fill="#FFF1CA">{Array.from({length: 36}, (_, n) => <Circle key={n} cx={30+n*107%740} cy={40+n*79%780} r={n%3 ? 1.5 : 2.5}/>)}{moon && <Path d="M659 143a48 48 0 1 0 33 77a48 48 0 0 1-33-77Z"/>}</G> : <Circle cx={650} cy={190} r={56} fill="#FFF0BA"/>}
    {orb && <Circle cx={650} cy={190} r={78} fill="#FFF0BA" opacity={.13}/>}
    <G fill="#F7F6E9" opacity={0.85}>
      <Path d="M50 185Q38 158 70 151Q75 116 111 131Q142 115 157 151Q189 151 187 177Q135 194 50 185Z"/>
      <Path d="M490 320Q470 295 502 286Q510 252 541 271Q575 255 585 287Q618 289 611 312Z"/>
      <Path d="M250 430q-20-14 0-24q2-21 25-16q21-8 31 10q20 0 23 16q-34 23-79 14Z" opacity={.62}/>
    </G>
    <Path d="M0 942Q95 851 186 912Q280 808 392 912Q492 849 576 935Q696 878 800 934V1080H0Z" fill="#6EB28C" opacity={.5}/>
    <Path d="M0 995Q220 949 412 1001T800 985V1120H0Z" fill="#91C3B2" opacity={.7}/>
    <Path d="M0 1050Q300 1010 800 1040V1200H0Z" fill="#78BCBA"/>
    <Path d="M90 1115h83m120 40h104m94-45h86m47 55h102m-666-1h44" stroke="#FDF4C9" opacity={.58} strokeWidth={4} strokeLinecap="round"/>
    <Path d="M0 1090Q230 1052 450 1093T800 1081" fill="none" stroke="#D9F3DC" strokeWidth={8} opacity={.6}/>
  </Svg>;
});
export const ShoreArt = React.memo(function ShoreArt({ depth = 215 }: { depth?: number }) {
  const id = "cottage-shore-" + React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return <Svg width="100%" height="100%" viewBox={`0 0 800 ${depth}`} accessible={false}>
    <Defs>
      <LinearGradient id={id + "-sand"} x1="0" x2="0" y1="0" y2="1">
        <Stop offset="0" stopColor="#E5B779"/><Stop offset=".6" stopColor="#FFE5A9"/><Stop offset="1" stopColor="#DBA66A"/>
      </LinearGradient>
      <LinearGradient id={id + "-reef"} x1="0" x2="0" y1="0" y2="1">
        <Stop offset="0" stopColor="#9BE7CC"/><Stop offset="1" stopColor="#3BAEB4"/>
      </LinearGradient>
    </Defs>
    <Rect width={800} height={depth} fill={`url(#${id}-sand)`}/>
    <Path d="M0 66Q147 56 280 82T578 62T800 64M0 89q161-13 272 11t300-9" fill="none" stroke="#FFF1CC" strokeWidth={5} opacity={.65}/>
    <Path d={`M0 27Q245 45 491 17T800 19V${depth}H0Z`} fill="#F7E5BA" opacity={.55}/>
    <Path d="M130 0L780 0L760 35L158 50L85 20Z" fill="#C79A70" stroke="#577162" strokeWidth={3}/>
    <Path d="M128 18L767 8M142 34L759 22" stroke="#8F5E43" strokeWidth={2}/>
    {[184,277,370,463,556,649].map((x,i) => <G key={x}>
      <Path d={`M${x} ${i%2 ? 0 : 17}l-10 17m24 1q19-4 40-2`} stroke="#9B6747" fill="none" strokeWidth={1.5}/>
      <Path d={`M${x+9} 12q18-5 33-1`} stroke="#F5CC97" fill="none" strokeWidth={2}/>
      <Circle cx={x+5} cy={i%2 ? 6 : 24} r={1.7} fill="#704D3A"/>
    </G>)}
    <Path d={`M0 ${depth - 45}Q180 ${depth - 83} 400 ${depth - 46}T800 ${depth - 52}V${depth}H0Z`} fill={`url(#${id}-reef)`}/>
    <Path d={`M0 ${depth - 46}Q180 ${depth - 84} 400 ${depth - 47}T800 ${depth - 53}`} fill="none" stroke="#FFF4D6" strokeWidth={9}/>
    <Path d={`M0 ${depth - 31}Q180 ${depth - 70} 400 ${depth - 33}T800 ${depth - 38}`} fill="none" stroke="#C2E2D5" strokeWidth={3} opacity={.8}/>
    <Path d="M723 134Q681 72 713 15" fill="none" stroke="#AE7D59" strokeWidth={13}/>
    <Path d="M712 23Q669-3 646 30Q681 17 712 23Q748-10 780 20Q746 16 712 23Q668 31 667 65Q689 44 712 23Q751 22 776 61Q740 41 712 23" fill="#649B77" stroke="#4C7861" strokeWidth={2}/>
    <Path d="M723 134Q691 81 709 30" fill="none" stroke="#E2AC70" strokeWidth={3}/>
    <Path d="M712 25q-35-32-62 5q33-17 62-5q30-24 64-6q-36-8-64 6q-29 11-42 33m42-33q36 5 58 30" fill="none" stroke="#BBD480" strokeWidth={2.5} strokeLinecap="round"/>
    {[47,168,294,467,606,745].map((x,i) => <Path key={x} d={`M${x} ${depth-19-i%3*6}q12-4 25 0m8 0h7`} fill="none" stroke="#E2FFF0" strokeWidth={2} strokeLinecap="round"/>)}
    <G fill="none" stroke="#D7B889" strokeWidth={3}><Path d="M95 102l20-4M310 144l15 3M528 82l20-3M620 126l12 4"/></G>
    <G fill="#C5A476" opacity={.65}>{Array.from({length:38},(_,n)=><Circle key={n} cx={31+(n*103)%739} cy={31+(n*47)%Math.max(70,depth-95)} r={n%5===0?2:1}/>)}</G>
    {/* HC-02: the beach shells are real objects (runtime/portions shoreShells), drawn above this art. */}
  </Svg>;
});
