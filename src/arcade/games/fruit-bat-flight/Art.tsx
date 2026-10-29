import React, { memo } from "react";
import Svg, { Circle, G, Path } from "react-native-svg";
import type { SharedValue } from "react-native-reanimated";
import { ArcadeSprite, type SpritePose } from "../../Sprite";

/** Trunk edges retain the original 28px collision width and exact gap endpoints. */
export const FlightPalm = memo(function FlightPalm({ bottom = false }: { bottom?: boolean }) {
  return <Svg width={46} height={660} viewBox="0 0 46 660" accessible={false}>
    <G transform={bottom ? "translate(46 660) rotate(180)" : undefined} strokeLinejoin="round">
      <Path d="M10-3H36L35 648Q23 654 11 648Z" fill="#AE7772" stroke="#49394E" strokeWidth={2.5}/>
      <Path d="M14 0L15 643" stroke="#D7A18B" strokeWidth={4}/>
      {Array.from({ length: 15 }, (_, i) => <G key={i}><Path d={`M12 ${i * 45}q11 8 23 3`} fill="none" stroke="#724C5B" strokeWidth={2}/><Path d={`M18 ${i * 45 + 12}l9 2`} stroke="#C78F7F" strokeWidth={1.5}/></G>)}
      <Path d="M23 642Q7 627 1 650L16 647L9 657Q20 659 24 650Q33 661 43 653L31 646L45 648Q39 629 23 642Z" fill="#71AE8C" stroke="#294E54" strokeWidth={2.5}/>
      <Path d="M5 648L23 644L39 647M23 645L15 653M24 645L35 652" fill="none" stroke="#ADD3A0" strokeWidth={1.3}/>
    </G>
  </Svg>;
});
const ForestBand = memo(function ForestBand({ near }: { near: boolean }) {
  return <Svg width={780} height={660} viewBox="0 0 780 660" accessible={false}>
    <G fill={near ? "#244C56" : "#688389"} opacity={near ? .26 : .14}>
      {[0, 1].map(repeat => [25, 170, 320].map((offset, i) => {
        const x = repeat * 390 + offset, y = 270 + i % 2 * 45;
        return <G key={`${repeat}-${i}`}>
          <Path d={`M${x-7} 650Q${x+14} 440 ${x} ${y}h10q28 220 12 ${650-y}Z`}/>
          <Path d={`M${x+5} ${y+8}q-53-62-91-8q49-25 91 8q43-64 91-9q-53-20-91 9q-56 2-65 52q40-28 65-52q50 3 67 48q-41-28-67-48Z`}/>
        </G>;
      }))}
    </G>
  </Svg>;
});
/** Quiet, looping mid/far silhouettes leave the bat, fruit and gap edges dominant. */
export const FlightForest = memo(function FlightForest({ poses, debug = false }: { poses: SharedValue<SpritePose[]>; debug?: boolean }) {
  return <>
    {[0, 1].map(i => <ArcadeSprite key={i} poses={poses} index={34 + i} width={780} height={660}><ForestBand near={i === 1}/></ArcadeSprite>)}
    <Svg width={390} height={660} style={{ position: "absolute" }} accessible={false}>
      <Path d="M0 650H390V660H0Z" fill="#243F43"/>
      <Path d="M0 650Q40 643 79 650T158 650T237 650T316 650T395 650" fill="none" stroke="#91AD86" strokeWidth={2}/>
      {[20, 85, 145, 215, 280, 350].map((x, i) => <Circle key={x} cx={x} cy={654 + i % 2 * 3} r={1} fill="#D8D19E" opacity={.6}/>)}
      {debug && <G stroke="#72FFB7" strokeWidth={1} opacity={.8}><Path d="M0 10H390M0 650H390"/></G>}
    </Svg>
  </>;
});
