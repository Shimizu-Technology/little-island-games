import React from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";
import { C } from "../../../components/ui";

export type PartWholeProps = {
  size: number;
  whole: number | null;
  left: number | null;
  right: number | null;
  label: string;
};
/** Two parts and the whole they make. A null part is drawn as a question mark. */
export function PartWhole({ size, whole, left, right, label }: PartWholeProps) {
  const r = size * 0.19, w = size, h = size * 0.78;
  const bubble = (cx: number, cy: number, v: number | null) => <>
    <Circle cx={cx} cy={cy} r={r} fill={v === null ? C.cream : C.soft} stroke={C.ink} strokeWidth={2.4} />
    <SvgText x={cx} y={cy + r * 0.38} textAnchor="middle" fontSize={r * 1.05} fontWeight="900" fill={C.ink}>{v === null ? "?" : v}</SvgText>
  </>;
  return <View accessible accessibilityLabel={label} style={{ alignItems: "center" }}>
    <Svg width={w} height={h}>
      <Line x1={w / 2} y1={r * 1.9} x2={w * 0.22} y2={h - r * 1.9} stroke={C.ink} strokeWidth={2.4} />
      <Line x1={w / 2} y1={r * 1.9} x2={w * 0.78} y2={h - r * 1.9} stroke={C.ink} strokeWidth={2.4} />
      {bubble(w / 2, r * 1.15, whole)}
      {bubble(w * 0.22, h - r * 1.15, left)}
      {bubble(w * 0.78, h - r * 1.15, right)}
    </Svg>
  </View>;
}
