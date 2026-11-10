import React from "react";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Copy, Heading, PressableScale } from "../components/ui";
import type { ArcadeDare } from "./dares";

/** A small shell-and-star mark. Filled once earned; an outline marks a dare still waiting. */
export function DareMark({ earned, size = 28 }: { earned: boolean; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 32 32" accessible={false}>
    <Path d="M16 3 C8 3 3 10 4 19 C5 26 11 29 16 29 C21 29 27 26 28 19 C29 10 24 3 16 3 Z" fill={earned ? "#F6C452" : "#FFF7E2"} stroke="#9A6A2E" strokeWidth={2.2}/>
    <Path d="M16 9 L18 14.5 L23.5 14.8 L19.2 18.2 L20.7 23.6 L16 20.5 L11.3 23.6 L12.8 18.2 L8.5 14.8 L14 14.5 Z" fill={earned ? "#FFF8E6" : "none"} stroke={earned ? "#B9792C" : "#C9A35F"} strokeWidth={1.6} strokeLinejoin="round"/>
    {earned && <Circle cx={24.5} cy={7.5} r={2.2} fill="#FFF8E6"/>}
  </Svg>;
}

/** Optional dares before Start. Choosing none is the default and changes nothing. */
export function DareChoice({ dares, selected, marked, onSelect }: { dares: readonly ArcadeDare[]; selected: number | null; marked: (slot: number) => boolean; onSelect: (slot: number | null) => void }) {
  return <View testID="arcade-dares" style={{ width: "100%", gap: 8 }}>
    <Heading style={{ fontSize: 18, textAlign: "center" }}>Want a dare?</Heading>
    <Copy style={{ fontSize: 14, textAlign: "center", color: "#4E6B70" }}>Optional. Stars count the same either way.</Copy>
    {dares.map(d => {
      const on = selected === d.slot, earned = marked(d.slot);
      return <PressableScale key={d.slot} testID={`dare-${d.slot}`} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`Dare: ${d.title}. ${d.detail}${earned ? " You have this mark." : ""} ${on ? "Chosen. Tap to play without it." : "Tap to choose."}`} onPress={() => onSelect(on ? null : d.slot)}
        style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, padding: 10, borderRadius: 18, borderWidth: 3, borderColor: on ? "#B9792C" : "#E3CF9F", backgroundColor: on ? "#FFE7A8" : "#FFFBEF" }}>
        <DareMark earned={earned}/>
        <View style={{ flex: 1, gap: 2 }}><Copy style={{ fontWeight: "800", color: "#4A3320", fontSize: 16 }}>{d.title}{earned ? " · earned" : ""}</Copy><Copy style={{ fontSize: 14, color: "#4E5F63" }}>{d.detail}</Copy></View>
        <Copy style={{ fontWeight: "800", color: on ? "#7A4B1E" : "#8C7A55", fontSize: 14 }}>{on ? "Chosen" : "Choose"}</Copy>
      </PressableScale>;
    })}
  </View>;
}

/** What happened to the chosen dare. Missing it never costs anything. */
export function DareResult({ dare, proved, marked, cleared }: { dare: ArcadeDare; proved: boolean; marked: boolean; cleared: boolean }) {
  const text = proved && marked ? `Dare earned: ${dare.title}!` : marked ? `Not this time. Your ${dare.title} mark is kept.` : cleared ? `The ${dare.title} dare is still waiting. Your stars are saved.` : `The ${dare.title} dare is still waiting.`;
  return <View testID="arcade-dare-result" accessibilityLabel={text} style={{ width: "100%", flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 20, backgroundColor: proved && marked ? "#FFE7A8" : "#FFF4DA", borderWidth: 3, borderColor: proved && marked ? "#C98D33" : "#E3CF9F" }}>
    <DareMark earned={marked} size={proved && marked ? 44 : 32}/>
    <Copy style={{ flex: 1, color: "#4A3320", fontWeight: proved && marked ? "800" : "600", fontSize: 16 }}>{text}</Copy>
  </View>;
}
