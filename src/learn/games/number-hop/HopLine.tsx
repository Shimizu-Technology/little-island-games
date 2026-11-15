import React from "react";
import { View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { C } from "../../../components/ui";

export type HopLineProps = {
  width: number;
  /** The visible part of the line. */
  lo: number;
  hi: number;
  /** Where the frog started; null when the start is the question (drawn as "?"). */
  start: number | null;
  /** Where each jump landed, in order. Forward jumps arc above the line, back jumps below. */
  landings: readonly number[];
  /** The flag to reach, if any. */
  target?: number | null;
  /** A start to draw the jumps from when `start` is hidden: the arcs are still drawn from it, but its label reads "?". */
  from?: number;
  /** Highlight a jump Help suggests, drawn dashed from the frog. */
  suggest?: number | null;
  label: string;
};

/** The visible window for a puzzle: every number involved, with a little room, on fives. Never narrower than ten. */
export function hopWindow(points: readonly number[], min: number, max: number): { lo: number; hi: number } {
  let lo = Math.max(min, Math.floor((Math.min(...points) - 2) / 5) * 5), hi = Math.min(max, Math.ceil((Math.max(...points) + 2) / 5) * 5);
  if (hi - lo < 10) { hi = Math.min(max, lo + 10); lo = Math.max(min, hi - 10); }
  return { lo, hi };
}

/** A number line with the frog, the flag and one arc per jump. It draws what it is given; the board decides what a touch means. */
export function HopLine({ width, lo, hi, start, landings, target = null, from, suggest = null, label }: HopLineProps) {
  const pad = 16, w = Math.max(240, width), span = Math.max(1, hi - lo), x = (n: number) => pad + ((n - lo) / span) * (w - pad * 2), y = 58;
  const origin = start ?? from ?? null;
  const points = origin === null ? [] : [origin, ...landings];
  const at = points.length ? points[points.length - 1] : null;
  const every = span > 40 ? 10 : span > 15 ? 5 : 1;
  const ticks = span <= 120 ? Array.from({ length: span + 1 }, (_, i) => lo + i) : [];
  return <View accessible accessibilityLabel={label} style={{ alignItems: "center" }}>
    <Svg width={w} height={112} viewBox={`0 0 ${w} 112`}>
      <Line x1={x(lo)} y1={y} x2={x(hi)} y2={y} stroke={C.ink} strokeWidth={2.4} />
      {ticks.map((n) => {
        const big = n % every === 0 || n === target || points.indexOf(n) >= 0;
        return <G key={n}>
          <Line x1={x(n)} y1={y - (big ? 7 : 4)} x2={x(n)} y2={y + (big ? 7 : 4)} stroke={C.ink} strokeWidth={big ? 2 : 1.1} />
          {big && n % every === 0 && <SvgText x={x(n)} y={y + 24} textAnchor="middle" fontSize={13} fontWeight="700" fill={C.ink}>{n}</SvgText>}
        </G>;
      })}
      {target !== null && target >= lo && target <= hi && <G>
        <Line x1={x(target)} y1={y - 4} x2={x(target)} y2={y - 34} stroke={C.ink} strokeWidth={2} />
        <Path d={`M${x(target)} ${y - 34}L${x(target) + 16} ${y - 28}L${x(target)} ${y - 22}Z`} fill={C.gold} stroke={C.ink} strokeWidth={1.4} />
        <SvgText x={x(target)} y={y + 45} textAnchor="middle" fontSize={14} fontWeight="900" fill={C.ink}>{target}</SvgText>
      </G>}
      {points.slice(1).map((to, i) => {
        const f = points[i], up = to >= f, mid = (x(f) + x(to)) / 2, rise = Math.min(26, 8 + Math.abs(x(to) - x(f)) * 0.25);
        const yy = up ? y - 7 : y + 7, peak = up ? yy - rise * 2 : yy + rise * 2;
        return <G key={i}>
          <Path d={`M${x(f)} ${yy} Q${mid} ${peak} ${x(to)} ${yy}`} stroke={up ? C.teal : C.coral} strokeWidth={3} fill="none" />
          <Path d={up ? `M${x(to) - 5} ${yy - 9}L${x(to)} ${yy - 1}L${x(to) + 5} ${yy - 9}` : `M${x(to) - 5} ${yy + 9}L${x(to)} ${yy + 1}L${x(to) + 5} ${yy + 9}`}
            stroke={up ? C.teal : C.coral} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </G>;
      })}
      {suggest !== null && at !== null && at + suggest >= lo && at + suggest <= hi && <Path
        d={`M${x(at)} ${y - 7} Q${(x(at) + x(at + suggest)) / 2} ${suggest > 0 ? y - 50 : y + 36} ${x(at + suggest)} ${y - 7}`}
        stroke={C.teal} strokeWidth={2.4} strokeDasharray="5 5" fill="none" />}
      {origin !== null && <G>
        <Rect x={x(origin) - 13} y={y + 30} width={26} height={20} rx={6} fill={start === null ? C.gold : C.paper} stroke={C.ink} strokeWidth={1.4} />
        <SvgText x={x(origin)} y={y + 45} textAnchor="middle" fontSize={13} fontWeight="900" fill={C.ink}>{start === null ? "?" : origin}</SvgText>
      </G>}
      {at !== null && <G>
        <Circle cx={x(at)} cy={y} r={9} fill={C.teal} stroke={C.ink} strokeWidth={1.6} />
        <Circle cx={x(at) - 3} cy={y - 3} r={1.6} fill="#FFF" />
        <Circle cx={x(at) + 3} cy={y - 3} r={1.6} fill="#FFF" />
      </G>}
    </Svg>
  </View>;
}
