import React, { memo } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { crabNames, lightTile, type SlipPuzzle } from './rules';

/** Every crab differs in colour and shell mark, so the board never relies on colour alone. */
export const crabLooks = [
  { fill: '#E97356', dark: '#B9472F', mark: 'flower', name: crabNames[0] },
  { fill: '#F0B43A', dark: '#B97F16', mark: 'fish', name: crabNames[1] },
  { fill: '#55B394', dark: '#2F7F67', mark: 'drop', name: crabNames[2] },
  { fill: '#A77ACB', dark: '#6F4A91', mark: 'moon', name: crabNames[3] },
] as const;
type Mark = (typeof crabLooks)[number]['mark'];
const ink = '#20474A';
const hide = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

function ShellMark({ mark, size, color, x = 0, y = 0, line = '#FFF8EA' }: { mark: Mark; size: number; color: string; x?: number; y?: number; line?: string }) {
  const s = size;
  if (mark === 'flower') return <G transform={`translate(${x} ${y})`}>{[0, 1, 2, 3, 4].map(i => { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; return <Circle key={i} cx={Math.cos(a) * 0.56 * s} cy={Math.sin(a) * 0.56 * s} r={0.44 * s} fill={color} />; })}<Circle cx={0} cy={0} r={0.34 * s} fill={line} /></G>;
  if (mark === 'fish') return <Path transform={`translate(${x} ${y})`} d={`M${-0.42 * s} 0C${-0.1 * s} ${-0.72 * s} ${0.62 * s} ${-0.62 * s} ${s} 0C${0.62 * s} ${0.62 * s} ${-0.1 * s} ${0.72 * s} ${-0.42 * s} 0L${-s} ${-0.62 * s}L${-s} ${0.62 * s}Z`} fill={color} />;
  if (mark === 'drop') return <Path transform={`translate(${x} ${y})`} d={`M0 ${-s}C${0.74 * s} ${-0.1 * s} ${0.8 * s} ${0.34 * s} ${0.42 * s} ${0.72 * s}C${0.12 * s} ${s} ${-0.12 * s} ${s} ${-0.42 * s} ${0.72 * s}C${-0.8 * s} ${0.34 * s} ${-0.74 * s} ${-0.1 * s} 0 ${-s}Z`} fill={color} />;
  return <Path transform={`translate(${x} ${y})`} d={`M${0.42 * s} ${-0.92 * s}A${s} ${s} 0 1 0 ${0.42 * s} ${0.92 * s}A${0.72 * s} ${0.72 * s} 0 1 1 ${0.42 * s} ${-0.92 * s}Z`} fill={color} />;
}

function CrabBody({ index }: { index: number }) {
  const look = crabLooks[index % crabLooks.length];
  return <>
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
    <ShellMark mark={look.mark} size={17} color="#FFF8EA" line={look.dark} x={50} y={61} />
    {/* eyes on little stalks */}
    <Path d="M40 32V22M60 32V22" stroke={ink} strokeWidth="4" strokeLinecap="round" />
    <Circle cx="40" cy="19" r="8" fill="#FFFDF5" stroke={ink} strokeWidth="2.6" />
    <Circle cx="60" cy="19" r="8" fill="#FFFDF5" stroke={ink} strokeWidth="2.6" />
    <Circle cx="41" cy="19" r="3.6" fill={ink} />
    <Circle cx="61" cy="19" r="3.6" fill={ink} />
    <Path d="M41 46Q50 53 59 46" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
  </>;
}
export const CrabSprite = memo(function CrabSprite({ index, size }: { index: number; size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 100 100" {...hide}><CrabBody index={index} /></Svg>;
});

const rockShapes = ['M14 74L20 40L44 18L74 26L88 56L78 80L40 84Z', 'M12 68L24 32L54 18L82 36L88 66L68 84L30 82Z', 'M18 76L14 48L38 22L68 20L86 44L84 74L52 86Z'];
const rockFacets = ['M20 40L44 50L44 18M44 50L74 26M44 50L60 84', 'M24 32L46 48L54 18M46 48L82 36M46 48L40 82', 'M14 48L42 52L38 22M42 52L68 20M42 52L56 86'];
const Rock = memo(function Rock({ x, y, size, seed }: { x: number; y: number; size: number; seed: number }) {
  const v = seed % 3;
  return <G transform={`translate(${x} ${y}) scale(${size / 100})`}>
    <Ellipse cx="52" cy="84" rx="40" ry="8" fill="#17585C" opacity={0.3} />
    <Path d={rockShapes[v]} fill="#A9A68F" stroke="#3B4F4A" strokeWidth="3.5" strokeLinejoin="round" />
    <Path d={v === 0 ? 'M44 18L74 26L44 50Z' : v === 1 ? 'M54 18L82 36L46 48Z' : 'M38 22L68 20L42 52Z'} fill="#D3CFB6" />
    <Path d={v === 0 ? 'M44 50L74 26L88 56L78 80L60 84Z' : v === 1 ? 'M46 48L82 36L88 66L68 84L40 82Z' : 'M42 52L68 20L86 44L84 74L56 86Z'} fill="#878973" />
    <Path d={rockFacets[v]} fill="none" stroke="#3B4F4A" strokeWidth="2.2" strokeLinejoin="round" opacity={0.55} />
  </G>;
});
const lip = 'M49 7C66 3 86 13 92 31C98 49 95 72 79 85C64 96 37 97 21 86C6 75 3 52 9 34C14 18 32 10 49 7Z';
const poolEdge = 'M50 20C63 18 76 26 80 39C84 52 80 67 69 75C58 83 42 83 31 76C20 69 16 54 20 41C24 29 37 22 50 20Z';
const Pool = memo(function Pool({ x, y, size, index }: { x: number; y: number; size: number; index: number }) {
  const look = crabLooks[index % crabLooks.length];
  return <G transform={`translate(${x} ${y}) scale(${size / 100})`}>
    <Path d={lip} fill="#DCC892" stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
    <Path d={poolEdge} fill="#A4E3DC" stroke={look.fill} strokeWidth="7" strokeLinejoin="round" />
    <ShellMark mark={look.mark} size={19} color={look.dark} line="#FFF2CF" x={50} y={50} />
  </G>;
});

/** Static layer: one SVG, redrawn only when the board changes. */
export const LagoonArt = memo(function LagoonArt({ puzzle, cell }: { puzzle: SlipPuzzle; cell: number }) {
  const size = puzzle.size * cell, cells = Array.from({ length: puzzle.size * puzzle.size }, (_, i) => i), at = (i: number) => ({ x: (i % puzzle.size) * cell, y: Math.floor(i / puzzle.size) * cell });
  return <Svg width={size} height={size} {...hide}>
    <Rect x={0} y={0} width={size} height={size} fill="#6EC6C4" />
    {cells.filter(i => lightTile(i, puzzle.size)).map(i => <Rect key={i} x={at(i).x} y={at(i).y} width={cell} height={cell} fill="#7ED2CD" />)}
    <G opacity={0.45}>
      {cells.filter(i => (Math.floor(i / puzzle.size) * 3 + (i % puzzle.size) * 4 + 1) % 7 === 0).map(i => <Path key={i} d={`M${at(i).x + cell * 0.2} ${at(i).y + cell * 0.55}q${cell * 0.15} ${-cell * 0.1} ${cell * 0.3} 0t${cell * 0.3} 0`} fill="none" stroke="#E2F7F2" strokeWidth={Math.max(1.5, cell * 0.04)} strokeLinecap="round" />)}
    </G>
    {puzzle.pools.map((c, i) => <Pool key={`p${i}`} x={at(c).x} y={at(c).y} size={cell} index={i} />)}
    {puzzle.rocks.map((c, i) => <Rock key={`r${i}`} x={at(c).x} y={at(c).y} size={cell} seed={c + i} />)}
  </Svg>;
});

/** A crab that made it home: tucked into the pool, happy, with its mark still on show. */
export const HomeEyes = memo(function HomeEyes({ index, size }: { index: number; size: number }) {
  const look = crabLooks[index % crabLooks.length];
  return <Svg width={size} height={size} viewBox="0 0 100 100" {...hide}>
    <Path d={poolEdge} fill="#A4E3DC" />
    <Path d="M26 60Q18 50 22 42Q26 38 29 42Q30 35 35 37Q38 44 36 53Z" fill={look.fill} stroke="#FFF8EA" strokeWidth="5" strokeLinejoin="round" />
    <Path d="M74 60Q82 50 78 42Q74 38 71 42Q70 35 65 37Q62 44 64 53Z" fill={look.fill} stroke="#FFF8EA" strokeWidth="5" strokeLinejoin="round" />
    <Path d="M26 60Q18 50 22 42Q26 38 29 42Q30 35 35 37Q38 44 36 53Z" fill={look.fill} stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
    <Path d="M74 60Q82 50 78 42Q74 38 71 42Q70 35 65 37Q62 44 64 53Z" fill={look.fill} stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
    <Path d="M31 68C29 44 40 36 50 36C60 36 71 44 69 68Z" fill={look.fill} stroke={ink} strokeWidth="2.8" />
    <Path d="M38 49Q43 42 48 49M52 49Q57 42 62 49" fill="none" stroke={ink} strokeWidth="3.6" strokeLinecap="round" />
    <Path d="M42 56Q50 64 58 56" fill="none" stroke={ink} strokeWidth="3.2" strokeLinecap="round" />
    <Path d="M30 68Q40 62 50 68T70 68" fill="none" stroke="#2B8FA0" strokeWidth="3.6" strokeLinecap="round" />
  </Svg>;
});

/** Keeps a pool's mark visible while some other crab is parked on top of it. */
export const PoolBadge = memo(function PoolBadge({ index, size }: { index: number; size: number }) {
  const look = crabLooks[index % crabLooks.length];
  return <Svg width={size} height={size} viewBox="0 0 40 40" {...hide}>
    <Circle cx="20" cy="20" r="17" fill="#EDE0B6" stroke="#8D7A4B" strokeWidth="3" />
    <ShellMark mark={look.mark} size={10.5} color={look.dark} x={20} y={20} />
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
    <Rect x="4" y="6" width="92" height="88" rx="20" fill="#6EC6C4" stroke="#20474A" strokeWidth="3" />
    <Path d="M14 80Q24 73 34 80T54 80" fill="none" stroke="#E2F7F2" strokeWidth="3.5" strokeLinecap="round" opacity={0.8} />
    <G transform="translate(62 58) scale(0.3)"><Circle cx="50" cy="50" r="42" fill="#E97356" stroke="#20474A" strokeWidth="4" /><Circle cx="50" cy="50" r="29" fill="#E4F6F1" /><ShellMark mark="flower" size={18} color="#B9472F" line="#FFF2CF" x={50} y={51} /></G>
    <G transform="translate(10 22) scale(0.6)"><CrabBody index={0} /></G>
    <Path d="M58 28H84M76 19L86 28L76 37" stroke="#FFF8EA" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>;
}
