import React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { C } from "../../../components/ui";
import type { Item } from "./engine";
import { bell, coral, shell, small } from "./rules";

/** A catch as the legacy rounds describe it, from a version 3 catch number. */
export const itemOf = (c: number): Item => ({ color: coral(c) ? "coral" : "blue", size: small(c) ? "small" : "big", kind: shell(c) ? "shell" : "fish", bell: bell(c) });
export function Cargo({ item, size = 56 }: { item: Item; size?: number }) {
  const fill = item.color === "blue" ? "#3E92DC" : "#FF7A5C";
  return <Svg width={size} height={size} viewBox="0 0 64 64" accessible accessibilityLabel={`${item.size} ${item.color} ${item.kind}${item.bell ? ", bell" : ""}`}>
    {item.kind === "fish" ? <><Path d="M8 32 Q28 8 51 32 Q28 56 8 32 M48 32 L61 19 V45 Z" fill={fill} stroke={C.ink} strokeWidth="2.2" strokeLinejoin="round"/><Circle cx="23" cy="28" r="2.2" fill={C.ink}/></> : <><Path d="M8 47 Q9 12 32 12 Q55 12 56 47 L32 56 Z" fill={fill} stroke={C.ink} strokeWidth="2.2" strokeLinejoin="round"/><Path d="M32 15V51M18 23L28 51M46 23L36 51" stroke="#FFFDF8" strokeWidth="2"/></>}
    {/* A bell, as the rule builder names it. */}
    {item.bell && <><Circle cx="51" cy="12" r="10" fill="#FFE48A" stroke={C.ink} strokeWidth="1.4"/><Path d="M45.5 16 Q46 7 51 7 Q56 7 56.5 16 Z" fill="#C98A12" stroke={C.ink} strokeWidth="1.2"/><Circle cx="51" cy="17.5" r="1.8" fill={C.ink}/></>}
  </Svg>;
}
/** Geometric SVG badges for color and bell clues (replaces raw emoji across rule builders). */
export function ClueIcon({ kind, size = 16 }: { kind: string; size?: number }) {
  if (kind === "blue" || kind === "coral") {
    const fill = kind === "blue" ? "#3E92DC" : "#FF7A5C";
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Circle cx="12" cy="12" r="9.5" fill={fill} stroke={C.ink} strokeWidth="2" />
        <Circle cx="9" cy="9" r="2.2" fill="#FFFDF8" opacity={0.75} />
      </Svg>
    );
  }
  if (kind === "bell") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Path d="M6 17Q6.5 6 12 6Q17.5 6 18 17Z" fill="#F1C75A" stroke={C.ink} strokeWidth="2" strokeLinejoin="round" />
        <Path d="M4 17H20" stroke={C.ink} strokeWidth="2" strokeLinecap="round" />
        <Circle cx="12" cy="19.5" r="2" fill={C.ink} />
      </Svg>
    );
  }
  return null;
}
// Arrows are joined to their words with no-break spaces, so a wrap never leaves "→" alone on a line.
export const bucketLabel = (value: string) => value === "left" ? "← left bucket" : value === "right" ? "right bucket →" : value === "count left" ? "← left bucket + count" : "choose bucket";
export function BucketPicture({ side }: { side: "left" | "right" }) { return <Svg width={30} height={30} viewBox="0 0 32 32" accessible accessibilityLabel={`${side} bucket picture`}><Path d="M5 8H27L24 27H8Z" fill={side === "left" ? "#3E92DC" : "#FF7A5C"} stroke={C.ink} strokeWidth="2" strokeLinejoin="round"/><Path d="M4 8Q16 -2 28 8" fill="none" stroke={C.ink} strokeWidth="2"/></Svg>; }
