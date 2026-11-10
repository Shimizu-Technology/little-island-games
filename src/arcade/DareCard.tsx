import React from "react";
import { Switch, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { C, Copy, Heading, font } from "../components/ui";
import { Text } from "../components/Text";
import type { ArcadeDare } from "./dares";

/** A scallop shell, never a star, so a dare never reads as a fourth level star. Gold with a sparkle once earned. */
export function DareMark({ earned, size = 30 }: { earned: boolean; size?: number }) {
  // A light backing disc keeps the mark readable on any world colour. Waiting: an empty outline. Earned: solid gold with a sparkle.
  return <Svg width={size} height={size} viewBox="0 0 36 36" accessible={false}>
    <Circle cx={18} cy={18} r={17} fill="#FFF8E6" stroke={earned ? "#C98D33" : "#D9C49A"} strokeWidth={1.5}/>
    <Path d="M18 7 C12 7 7.5 11.5 7.5 17.5 C7.5 19.7 8.4 21.4 9.7 22.7 L15.4 27 Q18 28.8 20.6 27 L26.3 22.7 C27.6 21.4 28.5 19.7 28.5 17.5 C28.5 11.5 24 7 18 7 Z" fill={earned ? "#F2B93E" : "none"} stroke="#8F5E28" strokeWidth={2.2} strokeLinejoin="round" strokeDasharray={earned ? undefined : "3.2 2.4"}/>
    <Path d="M18 25.5 L18 10 M18 25.5 L13 11.5 M18 25.5 L23 11.5 M18 25.5 L10 15.5 M18 25.5 L26 15.5" stroke={earned ? "#FFF3D1" : "#B48A4E"} strokeWidth={1.7} strokeLinecap="round"/>
    {earned && <><Circle cx={28.5} cy={8} r={2.8} fill="#FFFFFF" stroke="#8F5E28" strokeWidth={1}/><Circle cx={31} cy={14} r={1.3} fill="#FFFFFF"/></>}
  </Svg>;
}

/** Optional dares before Start, as switches like Helper. Off is the default and changes nothing. */
export function DareChoice({ dares, selected, marked, onSelect }: { dares: readonly ArcadeDare[]; selected: number | null; marked: (slot: number) => boolean; onSelect: (slot: number | null) => void }) {
  return <View testID="arcade-dares" style={{ width: "100%", gap: 8 }}>
    <Heading style={{ fontSize: 18, textAlign: "center" }}>Want a dare?</Heading>
    <Copy style={{ fontSize: 14, textAlign: "center", color: "#4E6B70" }}>Optional. Stars count the same either way.</Copy>
    {dares.map(d => {
      const on = selected === d.slot, earned = marked(d.slot), label = `Dare: ${d.title}`;
      return <View key={d.slot} testID={`dare-${d.slot}`} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 16, borderWidth: on ? 2 : 1, borderColor: on ? "#C98D33" : C.line, backgroundColor: C.paper }}>
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
  return proved && marked ? `Dare done: ${dare.title}!` : marked ? "Not this time. Your dare mark stays yours." : "Your dare will wait for you. Try it any time!";
}
export function DareResult({ dare, proved, marked }: { dare: ArcadeDare; proved: boolean; marked: boolean }) {
  const won = proved && marked, text = dareResultText(dare, proved, marked);
  return <View testID="arcade-dare-result" accessible accessibilityLabel={text} style={{ width: "100%", flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#FFF1CF", borderWidth: won ? 3 : 2, borderColor: won ? "#DFB363" : "#E3CF9F" }}>
    <DareMark earned={marked} size={won ? 44 : 32}/>
    <Copy style={{ flex: 1, color: "#4A3320", fontWeight: won ? "800" : "600", fontSize: 16 }}>{text}</Copy>
  </View>;
}
