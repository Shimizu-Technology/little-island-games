import React, { memo } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { SlipPuzzle } from './rules';

/** Every crab differs in colour and shell mark, so the board never relies on colour alone. */
export const crabLooks = [
  { fill: '#E97356', dark: '#B9472F', mark: 'star', name: 'coral crab with a star' },
  { fill: '#F0B43A', dark: '#B97F16', mark: 'ring', name: 'golden crab with a ring' },
  { fill: '#55B394', dark: '#2F7F67', mark: 'drop', name: 'green crab with a drop' },
  { fill: '#A77ACB', dark: '#6F4A91', mark: 'moon', name: 'purple crab with a moon' },
] as const;
type Mark = (typeof crabLooks)[number]['mark'];
const ink = '#20474A';
const hide = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

function ShellMark({ mark, size, color, x = 0, y = 0 }: { mark: Mark; size: number; color: string; x?: number; y?: number }) {
  const s = size;
  if (mark === 'star') return <Path transform={`translate(${x} ${y})`} d={`M0 ${-s}L${0.28 * s} ${-0.34 * s}L${s} ${-0.3 * s}L${0.42 * s} ${0.14 * s}L${0.62 * s} ${0.86 * s}L0 ${0.46 * s}L${-0.62 * s} ${0.86 * s}L${-0.42 * s} ${0.14 * s}L${-s} ${-0.3 * s}L${-0.28 * s} ${-0.34 * s}Z`} fill={color} />;
  if (mark === 'ring') return <Circle cx={x} cy={y} r={0.68 * s} fill="none" stroke={color} strokeWidth={0.42 * s} />;
  if (mark === 'drop') return <Path transform={`translate(${x} ${y})`} d={`M0 ${-s}C${0.74 * s} ${-0.1 * s} ${0.8 * s} ${0.34 * s} ${0.42 * s} ${0.72 * s}C${0.12 * s} ${s} ${-0.12 * s} ${s} ${-0.42 * s} ${0.72 * s}C${-0.8 * s} ${0.34 * s} ${-0.74 * s} ${-0.1 * s} 0 ${-s}Z`} fill={color} />;
  return <Path transform={`translate(${x} ${y})`} d={`M${0.42 * s} ${-0.92 * s}A${s} ${s} 0 1 0 ${0.42 * s} ${0.92 * s}A${0.72 * s} ${0.72 * s} 0 1 1 ${0.42 * s} ${-0.92 * s}Z`} fill={color} />;
}

export const CrabSprite = memo(function CrabSprite({ index, size }: { index: number; size: number }) {
  const look = crabLooks[index % crabLooks.length];
  return <Svg width={size} height={size} viewBox="0 0 100 100" {...hide}>
    <Ellipse cx="50" cy="83" rx="33" ry="7" fill="#1C5C60" opacity={0.22} />
    {/* legs */}
    <G stroke={look.dark} strokeWidth="6.5" strokeLinecap="round" fill="none">
      <Path d="M23 62Q11 62 7 75" /><Path d="M22 53Q9 50 4 60" /><Path d="M77 62Q89 62 93 75" /><Path d="M78 53Q91 50 96 60" />
    </G>
    {/* claws */}
    <G stroke={ink} strokeWidth="3" fill={look.fill}>
      <Path d="M22 42Q10 36 9 24Q13 17 19 22Q18 13 25 12Q33 18 31 31Q30 40 24 44Z" strokeLinejoin="round" />
      <Path d="M78 42Q90 36 91 24Q87 17 81 22Q82 13 75 12Q67 18 69 31Q70 40 76 44Z" strokeLinejoin="round" />
    </G>
    {/* body */}
    <Path d="M50 30C72 30 84 42 83 58C82 76 66 84 50 84C34 84 18 76 17 58C16 42 28 30 50 30Z" fill={look.fill} stroke={ink} strokeWidth="3.5" />
    <Path d="M27 46Q37 37 50 36" fill="none" stroke="#FFF4E0" strokeWidth="5" strokeLinecap="round" opacity={0.55} />
    <ShellMark mark={look.mark} size={12} color="#FFF8EA" x={50} y={62} />
    {/* eyes on little stalks */}
    <Path d="M40 32V22M60 32V22" stroke={ink} strokeWidth="4" strokeLinecap="round" />
    <Circle cx="40" cy="19" r="8" fill="#FFFDF5" stroke={ink} strokeWidth="2.6" />
    <Circle cx="60" cy="19" r="8" fill="#FFFDF5" stroke={ink} strokeWidth="2.6" />
    <Circle cx="41" cy="19" r="3.6" fill={ink} />
    <Circle cx="61" cy="19" r="3.6" fill={ink} />
    <Path d="M41 46Q50 53 59 46" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
  </Svg>;
});

const rockShapes = ['M16 72C10 48 22 26 42 22C63 16 86 30 86 54C88 72 70 84 46 82C30 84 19 80 16 72Z', 'M14 66C12 42 30 18 52 20C76 20 90 42 84 66C78 82 56 84 38 82C24 82 16 78 14 66Z', 'M20 76C8 54 22 30 38 24C60 12 88 26 86 56C86 76 66 86 44 84C32 84 24 84 20 76Z'];
const Rock = memo(function Rock({ x, y, size, seed }: { x: number; y: number; size: number; seed: number }) {
  return <G transform={`translate(${x} ${y}) scale(${size / 100})`}>
    <Ellipse cx="52" cy="82" rx="38" ry="9" fill="#17585C" opacity={0.28} />
    <Path d={rockShapes[seed % 3]} fill="#9AA08C" stroke="#39544F" strokeWidth="3.5" />
    <Path d="M28 56C30 40 42 32 56 32" fill="none" stroke="#D9DEC8" strokeWidth="6" strokeLinecap="round" opacity={0.75} />
    <Path d="M46 68Q60 62 72 66" fill="none" stroke="#6F7A69" strokeWidth="5" strokeLinecap="round" opacity={0.7} />
    <Circle cx="66" cy="44" r="4" fill="#6F7A69" opacity={0.65} />
  </G>;
});
const Pool = memo(function Pool({ x, y, size, index }: { x: number; y: number; size: number; index: number }) {
  const look = crabLooks[index % crabLooks.length];
  return <G transform={`translate(${x} ${y}) scale(${size / 100})`}>
    <Circle cx="50" cy="50" r="42" fill="#CDB98B" stroke="#7E6E4A" strokeWidth="3" />
    <Circle cx="50" cy="50" r="32" fill="#2B8FA0" stroke={look.dark} strokeWidth="6" />
    <Path d="M28 44Q39 37 50 44T72 44" fill="none" stroke="#BCEAE5" strokeWidth="4" strokeLinecap="round" opacity={0.75} />
    <ShellMark mark={look.mark} size={15} color={look.fill} x={50} y={58} />
  </G>;
});

/** Static layer: one SVG, redrawn only when the board changes. */
export const LagoonArt = memo(function LagoonArt({ puzzle, cell }: { puzzle: SlipPuzzle; cell: number }) {
  const size = puzzle.size * cell, cells = Array.from({ length: puzzle.size * puzzle.size }, (_, i) => i), at = (i: number) => ({ x: (i % puzzle.size) * cell, y: Math.floor(i / puzzle.size) * cell });
  return <Svg width={size} height={size} {...hide}>
    <Rect x={0} y={0} width={size} height={size} fill="#6EC6C4" />
    {cells.filter(i => (i + Math.floor(i / puzzle.size)) % 2 === 0).map(i => <Rect key={i} x={at(i).x} y={at(i).y} width={cell} height={cell} fill="#7ED2CD" />)}
    <G opacity={0.45}>
      {cells.filter(i => (i * 7 + 3) % 5 === 0).map(i => <Path key={i} d={`M${at(i).x + cell * 0.2} ${at(i).y + cell * 0.55}q${cell * 0.15} ${-cell * 0.1} ${cell * 0.3} 0t${cell * 0.3} 0`} fill="none" stroke="#E2F7F2" strokeWidth={Math.max(1.5, cell * 0.04)} strokeLinecap="round" />)}
    </G>
    {puzzle.pools.map((c, i) => <Pool key={`p${i}`} x={at(c).x} y={at(c).y} size={cell} index={i} />)}
    {puzzle.rocks.map((c, i) => <Rock key={`r${i}`} x={at(c).x} y={at(c).y} size={cell} seed={c + i} />)}
  </Svg>;
});

export function Arrow({ dir, size, color }: { dir: 0 | 1 | 2 | 3; size: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 40 40" {...hide}>
    <G transform={`rotate(${dir * 90} 20 20)`}>
      <Path d="M20 7L33 21H25V33H15V21H7Z" fill={color} stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
    </G>
  </Svg>;
}
export function ShelfArt({ size }: { size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 100 100" {...hide}>
    <Rect x="4" y="8" width="92" height="84" rx="20" fill="#6EC6C4" stroke="#20474A" strokeWidth="3" />
    <Path d="M14 30Q28 22 42 30T70 30" fill="none" stroke="#E2F7F2" strokeWidth="4" strokeLinecap="round" opacity={0.75} />
    <Circle cx="74" cy="68" r="15" fill="#2B8FA0" stroke="#7E6E4A" strokeWidth="4" />
    <Path d="M20 72Q10 62 14 52Q20 46 30 50" fill="none" stroke="#20474A" strokeWidth="3" strokeLinecap="round" />
    <G transform="translate(14 28) scale(0.62)"><Path d="M23 62Q11 62 7 75M22 53Q9 50 4 60M77 62Q89 62 93 75M78 53Q91 50 96 60" stroke="#B9472F" strokeWidth="6.5" strokeLinecap="round" fill="none" /><Path d="M50 30C72 30 84 42 83 58C82 76 66 84 50 84C34 84 18 76 17 58C16 42 28 30 50 30Z" fill="#E97356" stroke="#20474A" strokeWidth="3.5" /><Circle cx="41" cy="19" r="8" fill="#FFFDF5" stroke="#20474A" strokeWidth="2.6" /><Circle cx="61" cy="19" r="8" fill="#FFFDF5" stroke="#20474A" strokeWidth="2.6" /><Circle cx="42" cy="19" r="3.6" fill="#20474A" /><Circle cx="62" cy="19" r="3.6" fill="#20474A" /></G>
    <Path d="M56 30H84M78 22L88 30L78 38" stroke="#FFF8EA" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>;
}
