import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../../components/Text';
import { C } from '../../components/ui';
import type { LatinPuzzle } from './core';

const opGlyph: Record<string, string> = { '+': '+', '-': '−', '*': '×', '/': '÷', '=': '' };
/** A one-cell cage reads "=5", so it is not mistaken for a small starting number. */
const cageLabel = (c: { op: string; target: number }) => c.op === '=' ? `=${c.target}` : `${c.target}${opGlyph[c.op]}`;
/** Cage totals sit in each cage's first cell; Cage Sudoku also draws its cages as dashed outlines. */
export function cageLayer(p: LatinPuzzle) {
  const n = p.size, cage = p.givens.map(() => -1);
  p.cages.forEach((c, k) => c.cells.forEach(i => { cage[i] = k; }));
  return function CageLayer(cell: number) {
    const inset = Math.max(3, cell * 0.08);
    let dashed = '';
    if (p.kind === 'killer') for (let i = 0; i < n * n; i++) {
      const r = Math.floor(i / n), c = i % n, x0 = c * cell, y0 = r * cell, x1 = x0 + cell, y1 = y0 + cell, k = cage[i];
      const top = r === 0 || cage[i - n] !== k, bottom = r === n - 1 || cage[i + n] !== k, left = c === 0 || cage[i - 1] !== k, right = c === n - 1 || cage[i + 1] !== k;
      // Edges run to the cell's edge where the cage continues, so outlines stay joined.
      const ax = left ? x0 + inset : x0, bx = right ? x1 - inset : x1, ay = top ? y0 + inset : y0, by = bottom ? y1 - inset : y1;
      if (top) dashed += `M${ax} ${y0 + inset}H${bx}`;
      if (bottom) dashed += `M${ax} ${y1 - inset}H${bx}`;
      if (left) dashed += `M${x0 + inset} ${ay}V${by}`;
      if (right) dashed += `M${x1 - inset} ${ay}V${by}`;
    }
    const size = Math.max(11, Math.min(16, cell * 0.27));
    return <>
      {!!dashed && <Svg width={n * cell} height={n * cell} style={{ position: 'absolute' }}><Path d={dashed} stroke={C.teal} strokeWidth={2} strokeDasharray="5 3" fill="none"/></Svg>}
      {p.cages.map((c, k) => {
        const first = Math.min(...c.cells);
        return <Text key={k} maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ position: 'absolute', left: (first % n) * cell + inset + (p.kind === 'killer' ? 2 : 0), top: Math.floor(first / n) * cell + (p.kind === 'killer' ? inset + 1 : 2), fontSize: size, lineHeight: size * 1.15, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'], ...(p.kind === 'killer' ? { backgroundColor: '#FFFDF7', paddingHorizontal: 1 } : {}) }}>{cageLabel(c)}</Text>;
      })}
    </>;
  };
}
/** A chevron on each marked edge, its point at the smaller number. */
export function markLayer(p: LatinPuzzle) {
  const n = p.size;
  return function MarkLayer(cell: number) {
    const s = Math.max(5, cell * 0.12);
    let d = '', knock = '';
    for (const [small, big] of p.less) {
      const rs = Math.floor(small / n), cs = small % n, rb = Math.floor(big / n), cb = big % n;
      if (rs === rb) {
        const x = Math.max(cs, cb) * cell, y = rs * cell + cell / 2, dir = cs < cb ? -1 : 1;
        d += `M${x - dir * s} ${y - s}L${x + dir * s * 0.2} ${y}L${x - dir * s} ${y + s}`;
        knock += `M${x - s * 1.5} ${y}a${s * 1.5} ${s * 1.5} 0 1 0 ${s * 3} 0a${s * 1.5} ${s * 1.5} 0 1 0 ${-s * 3} 0`;
      } else {
        const x = cs * cell + cell / 2, y = Math.max(rs, rb) * cell, dir = rs < rb ? -1 : 1;
        d += `M${x - s} ${y - dir * s}L${x} ${y + dir * s * 0.2}L${x + s} ${y - dir * s}`;
        knock += `M${x - s * 1.5} ${y}a${s * 1.5} ${s * 1.5} 0 1 0 ${s * 3} 0a${s * 1.5} ${s * 1.5} 0 1 0 ${-s * 3} 0`;
      }
    }
    return <Svg width={n * cell} height={n * cell} style={{ position: 'absolute' }}><Path d={knock} fill={C.cream} stroke={C.line ?? '#D9E2DA'} strokeWidth={1}/><Path d={d} stroke={C.teal} strokeWidth={Math.max(3, cell * 0.075)} strokeLinecap="round" strokeLinejoin="round" fill="none"/></Svg>;
  };
}
/** Skyline clues in a gutter one clue wide around the board, each beside the line it watches. */
export function sightFrame(p: LatinPuzzle) {
  const n = p.size;
  return function SightFrame(cell: number, gutter: number) { return <>{p.sights.map(([id, clue]) => {
    const side = Math.floor(id / n), line = id % n, horizontal = side === 0 || side === 2;
    const left = horizontal ? gutter + line * cell : side === 3 ? 0 : gutter + n * cell, top = horizontal ? (side === 0 ? 0 : gutter + n * cell) : gutter + line * cell;
    return <View key={id} accessible={false} style={{ position: 'absolute', left, top, width: horizontal ? cell : gutter, height: horizontal ? gutter : cell, alignItems: 'center', justifyContent: 'center' }}>
      <Text maxFontSizeMultiplier={1.2} style={{ fontSize: Math.max(15, gutter * 0.55), fontWeight: '800', color: C.teal }}>{clue}</Text>
    </View>;
  })}</>; };
}
const place = (n: number, i: number) => `row ${Math.floor(i / n) + 1} column ${i % n + 1}`;
const joined = (xs: readonly string[]) => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`;
const cageRule: Record<string, (t: number) => string> = { '+': t => `adds to ${t}`, '-': t => `has a difference of ${t}`, '*': t => `multiplies to ${t}`, '/': t => `has one number ${t} times the other`, '=': t => `holds ${t}` };
/** One cage in words: its rule and every square in it. */
export const cageWords = (p: LatinPuzzle, k: number) => { const c = p.cages[k]; return c.cells.length === 1 ? `a one-square cage that ${cageRule[c.op](c.target)}` : `a cage of ${c.cells.length} squares that ${cageRule[c.op](c.target)}${p.kind === 'killer' ? ' with no repeats' : ''}: ${joined(c.cells.map(i => place(p.size, i)))}`; };
/**
 * What a screen reader adds to each square's own label: the cage it belongs to, or the arrows that
 * touch it. The square's label then carries the public clue it is part of.
 */
export function cellClueWords(p: LatinPuzzle): (i: number) => string {
  const n = p.size, cageOf = p.givens.map(() => -1);
  p.cages.forEach((c, k) => c.cells.forEach(i => { cageOf[i] = k; }));
  return i => {
    if (cageOf[i] >= 0) { const c = p.cages[cageOf[i]], others = c.cells.filter(j => j !== i); return c.cells.length === 1 ? `in ${cageWords(p, cageOf[i])}` : `in a cage that ${cageRule[c.op](c.target)} with ${joined(others.map(j => place(n, j)))}`; }
    const arrows = p.less.flatMap(([a, b]) => a === i ? [`smaller than ${place(n, b)}`] : b === i ? [`bigger than ${place(n, a)}`] : []);
    return arrows.length ? joined(arrows) : '';
  };
}
/** The clues in words, for screen readers and for reading aloud together. */
export function clueWords(p: LatinPuzzle): string {
  const n = p.size, sides = ['From the top', 'From the right', 'From the bottom', 'From the left'];
  if (p.kind === 'skyline') return sides.map((side, k) => { const xs = p.sights.filter(([id]) => Math.floor(id / n) === k).map(([id, c]) => `${k === 0 || k === 2 ? 'column' : 'row'} ${id % n + 1} sees ${c}`); return xs.length ? `${side}: ${xs.join(', ')}.` : ''; }).filter(Boolean).join(' ');
  if (p.kind === 'greater-than') return `${p.less.length} marks. ${p.less.slice(0, 40).map(([a, b]) => `row ${Math.floor(a / n) + 1} column ${a % n + 1} is smaller than row ${Math.floor(b / n) + 1} column ${b % n + 1}`).join('; ')}.`;
  if (p.cages.length) return `${p.cages.length} cages. Each square also says its cage. ${p.cages.map((_, k) => `${cageWords(p, k)[0].toUpperCase()}${cageWords(p, k).slice(1)}.`).join(' ')}`;
  return '';
}
