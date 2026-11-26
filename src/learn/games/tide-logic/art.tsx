import React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { C } from "../../../components/ui";
import type { Item } from "./engine";
import { bell, coral, shell, small } from "./rules";

/** A catch as the legacy rounds describe it, from a version 3 catch number. */
export const itemOf = (c: number): Item => ({ color: coral(c) ? "coral" : "blue", size: small(c) ? "small" : "big", kind: shell(c) ? "shell" : "fish", bell: bell(c) });
export function Cargo({ item, size = 56 }: { item: Item; size?: number }) {
  const fill = item.color === "blue" ? "#4E9BB9" : "#E9826B";
  return <Svg width={size} height={size} viewBox="0 0 64 64" accessible accessibilityLabel={`${item.size} ${item.color} ${item.kind}${item.bell ? ", bell" : ""}`}>
    {item.kind === "fish" ? <><Path d="M8 32 Q28 8 51 32 Q28 56 8 32 M48 32 L61 19 V45 Z" fill={fill} stroke={C.ink} strokeWidth="2"/><Circle cx="23" cy="28" r="2" fill={C.ink}/></> : <><Path d="M8 47 Q9 12 32 12 Q55 12 56 47 L32 56 Z" fill={fill} stroke={C.ink} strokeWidth="2"/><Path d="M32 15V51M18 23L28 51M46 23L36 51" stroke="#FFF" strokeWidth="2"/></>}
    {/* A bell, as the rule builder names it. */}
    {item.bell && <><Circle cx="51" cy="12" r="10" fill="#F1C75A" stroke={C.ink} strokeWidth="1"/><Path d="M45.5 16 Q46 7 51 7 Q56 7 56.5 16 Z" fill="#B8860B" stroke={C.ink} strokeWidth="1"/><Circle cx="51" cy="17.5" r="1.8" fill={C.ink}/></>}
  </Svg>;
}
// Arrows are joined to their words with no-break spaces, so a wrap never leaves "→" alone on a line.
export const bucketLabel = (value: string) => value === "left" ? "← left bucket" : value === "right" ? "right bucket →" : value === "count left" ? "← left bucket + count" : "choose bucket";
export function BucketPicture({ side }: { side: "left" | "right" }) { return <Svg width={30} height={30} viewBox="0 0 32 32" accessible accessibilityLabel={`${side} bucket picture`}><Path d="M5 8H27L24 27H8Z" fill={side === "left" ? "#5AAAB5" : "#EB9A79"} stroke={C.ink} strokeWidth="2"/><Path d="M4 8Q16 -2 28 8" fill="none" stroke={C.ink} strokeWidth="2"/></Svg>; }
