import React from "react";
import { View } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { C } from "../../../components/ui";

export type BridgeProps = {
  width: number;
  /** Where the child starts and the landing points of each hop, in order. */
  start: number;
  hops: readonly number[];
  /** The ten the bridge stands on, drawn as a post. */
  ten?: number;
  /** Number line is lo..hi. */
  lo: number;
  hi: number;
  /** How many hops the child has made. Only those are drawn and spoken, so the line never shows an answer before it is found. */
  made?: number;
  /** Drawing height; 74 unless a measured host gives less or more. The numbers keep 28 pt below the line. */
  height?: number;
};
/** What VoiceOver says for the line: where the child started and the hops made so far, exactly what is drawn. */
export const bridgeLabel = (start: number, hops: readonly number[], made = hops.length): string =>
  `Number line. Start ${start}${made > 0 ? `, then ${hops.slice(0, made).join(", then ")}` : ""}.`;
/** A number line with one arc per hop. The arcs make the idea of "bridging a ten" visible. */
export function Bridge({ width, start, hops, ten, lo, hi, made = hops.length, height = 74 }: BridgeProps) {
  const h = Math.max(56, Math.round(height)), pad = 14, w = Math.max(220, width), span = hi - lo, x = (n: number) => pad + ((n - lo) / span) * (w - pad * 2), y = h - 28;
  const points = [start, ...hops.slice(0, made)];
  const every = span > 40 ? 10 : span > 12 ? 5 : 1;
  return <View accessible accessibilityLabel={bridgeLabel(start, hops, made)} style={{ alignItems: "center" }}>
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Line x1={x(lo)} y1={y} x2={x(hi)} y2={y} stroke={C.ink} strokeWidth={2.4} />
      {Array.from({ length: span + 1 }, (_, i) => {
        const n = lo + i, big = n % every === 0 || points.indexOf(n) >= 0 || (n === ten && made > 0);
        return <G key={n}>
          <Line x1={x(n)} y1={y - (big ? 7 : 4)} x2={x(n)} y2={y + (big ? 7 : 4)} stroke={C.ink} strokeWidth={big ? 2.2 : 1.2} />
          {big && <SvgText x={x(n)} y={y + 22} textAnchor="middle" fontSize={13} fontWeight="700" fill={C.ink}>{n}</SvgText>}
        </G>;
      })}
      {ten !== undefined && made > 0 && <G>
        <Line x1={x(ten)} y1={y - 8} x2={x(ten)} y2={y + 8} stroke={C.teal} strokeWidth={4} />
        <Circle cx={x(ten)} cy={y} r={5} fill={C.teal} />
      </G>}
      {hops.slice(0, made).map((to, i) => {
        const from = points[i], mid = (x(from) + x(to)) / 2, rise = Math.min(30, (y - 12) / 2, 12 + Math.abs(x(to) - x(from)) * 0.2);
        return <G key={i}>
          <Path d={`M${x(from)} ${y - 8} Q${mid} ${y - 8 - rise * 2} ${x(to)} ${y - 8}`} stroke={C.teal} strokeWidth={3} fill="none" />
          <Path d={`M${x(to) - 5} ${y - 18}L${x(to)} ${y - 9}L${x(to) + 5} ${y - 18}`} stroke={C.teal} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </G>;
      })}
      <Circle cx={x(points[points.length - 1])} cy={y} r={6.5} fill={C.coral} stroke={C.ink} strokeWidth={1.6} />
    </Svg>
  </View>;
}
