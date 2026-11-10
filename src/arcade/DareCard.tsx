import React from "react";
import { Switch, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { C, Copy, Heading, font } from "../components/ui";
import { Text } from "../components/Text";
import type { ArcadeDare } from "./dares";

/** A scallop shell, never a star, so a dare never reads as a fourth level star. Gold with a sparkle once earned. */
export function DareMark({ earned, size = 30 }: { earned: boolean; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 32 32" accessible={false}>
    <Path d="M16 4 C9 4 4 9.5 4 16.5 C4 19 5 21 6.5 22.5 L13 27.5 Q16 29.5 19 27.5 L25.5 22.5 C27 21 28 19 28 16.5 C28 9.5 23 4 16 4 Z" fill={earned ? "#F4BE4A" : "#FFF7E2"} stroke="#8F5E28" strokeWidth={2.4} strokeLinejoin="round"/>
    <Path d="M16 26 L16 7.5 M16 26 L10 9.5 M16 26 L22 9.5 M16 26 L6.5 14 M16 26 L25.5 14" stroke={earned ? "#FFF3D1" : "#C9A35F"} strokeWidth={1.8} strokeLinecap="round"/>
    {earned && <><Circle cx={26.5} cy={5.5} r={2.6} fill="#FFFFFF" stroke="#8F5E28" strokeWidth={1}/><Circle cx={29.5} cy={11} r={1.3} fill="#FFFFFF"/></>}
  </Svg>;
}

/** Optional dares before Start, as switches like Helper. Off is the default and changes nothing. */
export function DareChoice({ dares, selected, marked, onSelect }: { dares: readonly ArcadeDare[]; selected: number | null; marked: (slot: number) => boolean; onSelect: (slot: number | null) => void }) {
  return <View testID="arcade-dares" style={{ width: "100%", gap: 8 }}>
    <Heading style={{ fontSize: 18, textAlign: "center" }}>Want a dare?</Heading>
    <Copy style={{ fontSize: 14, textAlign: "center", color: "#4E6B70" }}>Optional. Stars count the same either way.</Copy>
    {dares.map(d => {
      const on = selected === d.slot, earned = marked(d.slot), label = `Dare: ${d.title}`;
      return <View key={d.slot} testID={`dare-${d.slot}`} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: on ? 2 : 1, borderColor: on ? "#B9792C" : C.line, backgroundColor: on ? "#FFF0C7" : C.paper }}>
        <DareMark earned={earned} size={32}/>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: font, fontSize: 17, fontWeight: "700", color: C.ink }}>{label}</Text>
          <Copy style={{ fontSize: 13, lineHeight: 18 }}>{d.detail}{earned ? " You already have this mark." : ""}</Copy>
        </View>
        <Switch accessibilityLabel={`${label}. ${d.detail}`} value={on} onValueChange={value => onSelect(value ? d.slot : null)} trackColor={{ true: "#B9792C", false: "#CBD3CA" }} thumbColor="#FFFFFF" ios_backgroundColor="#CBD3CA"/>
      </View>;
    })}
  </View>;
}

/** What happened to the chosen dare. Missing it never costs anything, and nothing was at risk. */
export function dareResultText(dare: ArcadeDare, proved: boolean, marked: boolean): string {
  return proved && marked ? `You did the dare: ${dare.title}!` : marked ? "Not this time. Your dare mark stays yours." : "Your dare will wait for you. Try it any time!";
}
export function DareResult({ dare, proved, marked }: { dare: ArcadeDare; proved: boolean; marked: boolean }) {
  const won = proved && marked, text = dareResultText(dare, proved, marked);
  return <View testID="arcade-dare-result" accessible accessibilityLabel={text} style={{ width: "100%", flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, backgroundColor: won ? "#FFE7A8" : "#FFF4DA", borderWidth: won ? 3 : 2, borderColor: won ? "#C98D33" : "#E3CF9F" }}>
    <DareMark earned={marked} size={won ? 44 : 32}/>
    <Copy style={{ flex: 1, color: "#4A3320", fontWeight: won ? "800" : "600", fontSize: 16 }}>{text}</Copy>
  </View>;
}
