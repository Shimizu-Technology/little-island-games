import React from 'react';
import Svg, { G, Path, Rect } from 'react-native-svg';
import type { Instance } from './model';
/** Seat fronts paint over the legs; the full seat and back paint behind the friend.
 * Chair uses its existing foreground art. The sofa contract is provisional until art integration. */
export function SeatFront({ item, size }: { item: Instance; size:number }) {
 const flip = item.mirrored !== (item.rotation === 180 || item.rotation === 270);
 return <Svg width={size} height={size} viewBox="0 0 150 130" accessible={false}><G transform={flip ? 'translate(150 0) scale(-1 1)' : undefined} stroke="#385451" strokeWidth={2.5} strokeLinejoin="round">
  {item.item === 'bed' && <Path d="M37 96L131 84V92L36 105Z" fill="#D99E6C"/>}
  {item.item === 'beanbag' && <Path d="M24 103Q75 118 128 98L124 112Q75 130 28 115Z" fill="#79BDB1"/>}
  {item.item === 'sofa' && <Rect x={25} y={91} width={100} height={9} rx={4} fill="#E9B8A6"/>}
 </G></Svg>;
}
