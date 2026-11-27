import React from 'react';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { Point, Segment } from './engine';
import { START } from './picture';
/** The sand canvas: a faint target, the lines drawn so far, and the turtle. Width is height ÷ ASPECT. */
export const ASPECT = 0.8;
export const lengthOf = (a: Segment) => Math.round(Math.hypot(a.to.x - a.from.x, a.to.y - a.from.y));
/** One label per distinct length, on the first line of that length: equal sides share a number instead of crowding the picture. */
const labelled = (goal: Segment[]): Segment[] => { const seen = new Set<number>(); return goal.filter(a => { const n = lengthOf(a); if (seen.has(n) || seen.size >= 4) return false; seen.add(n); return true; }); };
const colorOf = (color: string) => color === 'coral' ? '#E68E82' : color === 'gold' ? '#B9861E' : '#348B7E';
export function SandCanvas({ width, goal, traced, point = START, wrongLine = null, labels = true, label }: {
  width: number; goal: Segment[]; traced: Segment[]; point?: Point; wrongLine?: number | null; labels?: boolean; label: string;
}) {
  // Keep the length labels at least 12 pt wherever the canvas is squeezed.
  const font = Math.max(15, 12 * 400 / width);
  return <Svg width={width} height={width * ASPECT} viewBox="-50 -55 400 320" accessible accessibilityLabel={label}>
    <Rect x={-50} y={-55} width={400} height={320} rx={18} fill="#F8E7BF" />
    {Array.from({ length: 39 }, (_, i) => <Path key={`v${i}`} d={`M${-40 + i * 10} -45V255`} stroke="#E2CEA7" strokeWidth={.6} />)}
    {Array.from({ length: 31 }, (_, i) => <Path key={`h${i}`} d={`M-40 ${-50 + i * 10}H340`} stroke="#E2CEA7" strokeWidth={.6} />)}
    <Path d="M-25 -10V-20H75V-10M25 -20V-13" stroke="#725B36" strokeWidth={2} fill="none" />
    {[0, 50, 100].map((n, i) => <SvgText key={n} x={-25 + i * 50} y={-28} fontSize={13} fill="#58462E" textAnchor="middle">{n}</SvgText>)}
    {goal.map((a, i) => <Path key={i} d={`M${a.from.x} ${a.from.y}L${a.to.x} ${a.to.y}`} stroke={wrongLine === i ? '#AD4D35' : '#9B8868'} strokeWidth={wrongLine === i ? 10 : 7} strokeDasharray="2 7" strokeLinecap="round" fill="none" />)}
    {traced.map((a, i) => <Path key={i} d={`M${a.from.x} ${a.from.y}L${a.to.x} ${a.to.y}`} stroke={wrongLine === i ? '#AD4D35' : colorOf(a.color)} strokeWidth={4} strokeLinecap="round" fill="none" />)}
    {labels && labelled(goal).map(a => <SvgText key={`${a.from.x},${a.from.y}`} x={(a.from.x + a.to.x) / 2} y={(a.from.y + a.to.y) / 2 - font * .6} fontWeight="bold" fontSize={font} fill="#58462E">{lengthOf(a)}</SvgText>)}
    <Circle cx={point.x} cy={point.y} r={10} fill="#6CB5A4" stroke="#3D2B24" strokeWidth={2} /><Circle cx={point.x + 5} cy={point.y - 3} r={2} fill="#3D2B24" />
  </Svg>;
}
/** One picture among four, drawn to the shared frame so size differences between the choices stay visible. */
export function Thumbnail({ lines, frame, size, tone = 'plain' }: { lines: Segment[]; frame: { left: number; top: number; right: number; bottom: number }; size: number; tone?: 'plain' | 'chosen' | 'out' }) {
  const pad = 12, w = frame.right - frame.left + pad * 2, h = frame.bottom - frame.top + pad * 2;
  return <Svg width={size} height={size * h / w} viewBox={`${frame.left - pad} ${frame.top - pad} ${w} ${h}`}>
    <Rect x={frame.left - pad} y={frame.top - pad} width={w} height={h} rx={14} fill={tone === 'out' ? '#E9E2D2' : '#F8E7BF'} />
    {lines.map((a, i) => <Path key={i} d={`M${a.from.x} ${a.from.y}L${a.to.x} ${a.to.y}`} stroke={tone === 'out' ? '#B0A58E' : colorOf(a.color)} strokeWidth={Math.max(3, w / 60)} strokeLinecap="round" fill="none" />)}
    {lines[0] && <Circle cx={lines[0].from.x} cy={lines[0].from.y} r={Math.max(4, w / 40)} fill="#6CB5A4" stroke="#2D756B" strokeWidth={2} />}
  </Svg>;
}
