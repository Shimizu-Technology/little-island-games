import React from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { C } from "../../../components/ui";

/** Original scallop used as the counter in every K4 manipulative. */
export function ShellCounter({ size, tone = "gold", muted = false, struck = false }: { size: number; tone?: "gold" | "teal" | "blue"; muted?: boolean; struck?: boolean }) {
  const fill = muted ? "#E9E5D3" : tone === "teal" ? "#A9D9CD" : tone === "blue" ? "#9CC3E3" : "#F2CA85";
  return <Svg width={size} height={size} viewBox="0 0 44 40" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Path d="M22 35C15 35 3 24 3 17C3 12 7 9 11 10C12 2 19 1 22 7C26 1 33 3 33 10C39 8 42 13 41 18C40 26 29 35 22 35Z" fill={fill} stroke={muted ? "#B9B59F" : C.ink} strokeWidth="2.2" />
    <Path d="M22 33L12 14M22 33V10M22 33L32 14" stroke={muted ? "#B9B59F" : C.ink} strokeWidth="1.6" fill="none" />
    {struck && <Path d="M6 36L38 4" stroke={C.error} strokeWidth="4" strokeLinecap="round" />}
  </Svg>;
}

/** The smallest touch target, in points, for a shell a child must choose. */
export const MIN_TOUCH = 44;
export type TenFrameProps = {
  /** Width of one cell, in points. */
  cell: number;
  filled: number;
  /** Shells of the second group, drawn in blue right after the filled ones. */
  second?: number;
  /** Pale shells still waiting to join, drawn after the filled ones. */
  ghost?: number;
  /** The last `struck` filled shells are crossed out: taken away. */
  struck?: number;
  tone?: "gold" | "teal" | "blue";
  /** Cells in the frame; 10 for a ten-frame. */
  cells?: number;
  label: string;
  /** When set, shell number k (from 1) can be touched to choose "move k shells". Cells touch each other, so a touchable frame needs `cell` of at least MIN_TOUCH. */
  onPick?: (k: number) => void;
  /** What a touched shell is called for VoiceOver, e.g. which way the shells would go. */
  pickLabel?: (k: number) => string;
  /** Ring the frame once it holds exactly ten. */
  celebrateFull?: boolean;
};
/** Two rows of five cells. Static, so a ten-frame costs one render when it changes. */
export function TenFrame({ cell, filled, second = 0, ghost = 0, struck = 0, tone = "gold", cells = 10, label, onPick, celebrateFull = true, pickLabel }: TenFrameProps) {
  const cols = Math.min(5, cells), rows = Math.ceil(cells / cols), pad = Math.max(2, Math.round(cell * 0.06));
  const full = celebrateFull && filled + second === cells && ghost === 0 && struck === 0;
  return <View accessible={!onPick} accessibilityLabel={label} style={{ borderRadius: 10, borderWidth: 2.5, borderColor: full ? C.teal : C.ink, backgroundColor: full ? "#EAF4EC" : C.paper, padding: 3 }}>
    {Array.from({ length: rows }, (_, r) => <View key={r} style={{ flexDirection: "row" }}>
      {Array.from({ length: cols }, (_, c) => {
        const i = r * cols + c;
        if (i >= cells) return <View key={c} style={{ width: cell, height: cell }} />;
        const gold = i < filled, blue = !gold && i < filled + second, on = gold || blue;
        const waiting = !on && i < filled + second + ghost, gone = gold && i >= filled - struck;
        const body = <View style={{ width: cell, height: cell, padding: pad, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.line }}>
          {(on || waiting) ? <ShellCounter size={cell - pad * 2 - 2} tone={blue ? "blue" : tone} muted={waiting || gone} struck={gone} /> : null}
        </View>;
        return onPick && on && !gone
          ? <Pressable key={c} accessibilityRole="button" accessibilityLabel={pickLabel ? pickLabel(i + 1) : `Move ${i + 1} ${i === 0 ? "shell" : "shells"}`} onPress={() => onPick(i + 1)}>{body}</Pressable>
          : <View key={c}>{body}</View>;
      })}
    </View>)}
  </View>;
}
