import React from 'react';
import { Circle, G, Path, Rect } from 'react-native-svg';
import { type IslanderLook } from '../look';
import type { Pose } from './poses';
import { anchorsFor } from './wardrobe';

const leiFlowers = [-1, 1].flatMap(side => [0, 1, 2].map(i => ({ x: side * (10.4 - i * 3.1), y: 4 + i * 6.2, coral: i === 1 })));
const flowerPath = (x: number, y: number) => `M${x} ${y - 4.3}q5.2-1 3.1 4.2q4.2 4.2-1 4.2q-2.1 4.2-4.2 0q-5.2 0-1-4.2q-2.1-5.2 3.1-4.2Z`;
const leiLeaves = 'M-12.5 7Q-16.2 9.2 -12 11.8Q-10.2 9.2 -12.5 7ZM12.5 7Q16.2 9.2 12 11.8Q10.2 9.2 12.5 7ZM-8.8 15.8Q-11.5 19.4 -6.8 19.4Q-6.8 16.8 -8.8 15.8ZM8.8 15.8Q11.5 19.4 6.8 19.4Q6.8 16.8 8.8 15.8Z';

/** Reward details use the same rig coordinates and inherited ink as starter clothing. */
export function RewardArt({ look, pose, layer }: { look: IslanderLook; pose: Pose; layer: 'hat' | 'accessory' | 'wrist' | 'neckwear' }) {
  const a = anchorsFor(pose), [x, y] = pose.joints.head, front = pose.view === 'front', small = !!pose.compact;

  if (layer === 'hat') return <G transform={`translate(${a.headTop[0]} ${a.headTop[1]}) scale(${small ? .55 : look.hat === 'runner-headband' ? 1.3 : 1.13} ${small ? .55 : 1})`}>
    {look.hat === 'bookworm-beanie' && <G fill="#9A6D90">
      <Path d={small ? "M-22 7Q-24-5 0-5Q24-5 22 7Z" : "M-24.4 8.2C-25.4 -7.4 -11 -10.4 0 -10.4C11 -10.4 25.4 -7.4 24.4 8.2Z"}/>
      {!small && front && <Path d="M-16.5 -4.6Q-6 -9.4 6.5 -7.4Q-4 -5.2 -16.5 -4.6Z" fill="#D5B2CA" fillOpacity={.48} strokeWidth={0}/>}
      <Rect x={-25.6} y={2.8} width={51.2} height={10.4} rx={3.8} fill="#825779"/>
      {front && <Path d="M-4.8 4.6Q-2.4 3.8 0 4.8Q2.4 3.8 4.8 4.6V11.4Q2.4 10.6 0 11.6Q-2.4 10.6 -4.8 11.4ZM0 4.8V11.6" fill="#FFF6E2" strokeWidth={.85}/>}
      <Path d="M-16.5 4v8.2M-9.2 4v8.2M9.2 4v8.2M16.5 4v8.2M-13.2-5v6.4M13.2-5v6.4" fill="none" stroke="#D5B2CA" strokeWidth={1.15}/>
    </G>}
    {look.hat === 'woven-sunhat' && <G fill="#E5C27D">
      <Path d={small ? "M-19 6L-15-3Q0-5 15-3L19 6ZM-29 8Q-27 3-18 4H18Q27 3 29 8Q0 19-29 8Z" : "M-31.6 10.2C-27.4 4.6 -18 5.4 0 5.4C18 5.4 27.4 4.6 31.6 10.2C25 17.6 -25 17.6 -31.6 10.2ZM-19.0 9.0C-19.0 -6.8 -10.2 -9.4 0 -9.4C10.2 -9.4 19.0 -6.8 19.0 9.0Z"}/>
      {!small && front && <Path d="M-13.5 -5.0Q-3 -8.6 9.0 -6.6Q-2 -4.8 -13.5 -5.0Z" fill="#FFF4D4" fillOpacity={.62} strokeWidth={0}/>}
      {!small && <Path d="M-19.0 5.4C-9.2 9.2 9.2 9.2 19.0 5.4L19.0 1.4C9.2 5.2 -9.2 5.2 -19.0 1.4Z" fill="#469D95" strokeWidth={.85}/>}
      <Path d="M-14.4 -6L13 5M-8 -8.2L18 2M-14.4 4L8 -8.2M-5 6L15 -5M-24 10.4Q0 15.2 24 10.4M-18 1.2Q0 5.2 18 1.2" fill="none" stroke="#9A7643" strokeWidth={.92}/>
    </G>}
    {look.hat === 'runner-headband' && <G>
      <Path d="M-22 10Q0 2.8 22 10L22 16.2Q0 9 -22 16.2Z" fill="#5CB5AA"/>
      <Path d="M-20 12.2Q0 6.2 20 12.2M-20 14.4Q0 8.4 20 14.4" fill="none" stroke="#FFF6E2" strokeWidth={1.2}/>
      {front && <Path d="M0 7.2L1.0 9.5L3.4 9.7L1.5 11.3L2.1 13.6L0 12.3L-2.1 13.6L-1.5 11.3L-3.4 9.7L-1.0 9.5Z" fill="#FAD25E" strokeWidth={.65}/>}
    </G>}
    {look.hat === 'captain-cap' && <G>
      <Path d="M-23.4 5.2Q-27.6-4.8 0-4.8Q27.6-4.8 23.4 5.2Z" fill="#FFF6E2"/>
      <Path d="M-22.2 5.2H22.2V11.2H-22.2Z" fill="#354D6E"/>
      {front && <Path d="M-16.8 11.2Q0 22.4 16.8 11.2Z" fill="#2A3D57"/>}
      {front && <Path d="M-19 10.8Q0 12.8 19 10.8M0-4.0v7.8m-4.4-3.6q4.4 7.8 8.8 0" fill="none" stroke="#F4C454" strokeWidth={1.95}/>}
    </G>}
  </G>;

  const neckwear = ['flower-lei', 'checker-scarf'].includes(look.accessory);
  const accessory = layer === 'wrist' ? (look.accessory === 'calculator-watch' ? look.accessory : 'none') : layer === 'neckwear' ? (!front && neckwear ? look.accessory : 'none') : (look.accessory === 'calculator-watch' || (!front && neckwear) ? 'none' : look.accessory);

  return <G>
    {['reading-glasses', 'safety-goggles'].includes(accessory) && (front ? <G transform={`translate(${x} ${y + 6.6})`} fill="#FFF4DC" fillOpacity={.22} strokeWidth={1.75}>
      {accessory === 'reading-glasses' ? <>
        <Circle cx={-10.2} r={6.8} stroke="#633622"/>
        <Circle cx={10.2} r={6.8} stroke="#633622"/>
        <Path d="M-14.2-3.4q3.6-2.0 7.4-.4M6.8-3.8q3.8-1.6 7.4 .4" fill="none" stroke="#C57B40" strokeWidth={1.15}/>
        <Path d="M-13.2-2.2l3.0-2.0M7.2-2.2l3.0-2.0" fill="none" stroke="#FFFFFF" strokeOpacity={.85} strokeWidth={1.25}/>
      </> : <>
        <Rect x={-18.8} y={-6.4} width={37.6} height={13.0} rx={5.0} fill="#D2EFEA" fillOpacity={.30} stroke="#44968F"/>
        <Path d="M0-5.4V5.6" stroke="#44968F"/>
        <Path d="M-14.2-2.8l3.6-1.9M6.2-2.8l3.6-1.9" fill="none" stroke="#FFFFFF" strokeWidth={1.25}/>
      </>}
      <Path d="M-3.2 0Q0-1.4 3.2 0M-23.4-1.2L-17.2-.4M17.2-.4L23.4-1.2" fill="none" stroke={accessory === 'safety-goggles' ? '#44968F' : '#633622'}/>
    </G> : <Path d={`M${x - (small ? 12 : 28.4)} ${y + 6}Q${x} ${y + 13} ${x + (small ? 12 : 28.4)} ${y + 6}`} fill="none" stroke={accessory === 'safety-goggles' ? '#5CB5AA' : '#8D6282'} strokeWidth={3}/>)}
    {accessory === 'coder-headset' && <G transform={`translate(${x} ${y}) scale(${small ? .5 : 1})`}>
      <Path d="M-24 6Q-25-22.4 0-23.4Q25-22.4 24 6" fill="none" stroke="#365386" strokeWidth={4.4}/>
      <Rect x={-27.2} y={1.8} width={8.8} height={18.4} rx={4.4} fill="#6E95CE"/>
      <Rect x={18.4} y={1.8} width={8.8} height={18.4} rx={4.4} fill="#6E95CE"/>
      <Path d="M-22.8 6.4v9.2M22.8 6.4v9.2" fill="none" stroke="#7CEFD2" strokeWidth={1.7}/>
      <Path d="M22.8 17.2q-1 12.6-14.6 12.6" fill="none" stroke="#365386" strokeWidth={2.05}/>
      <Circle cx={8.2} cy={29.8} r={3.0} fill="#F4C25E"/>
    </G>}
    {accessory === 'calculator-watch' && (() => { const e = pose.joints.rightElbow, h = pose.joints.rightHand; const wx = e[0] + (h[0] - e[0]) * .8, wy = e[1] + (h[1] - e[1]) * .8; return <G transform={`translate(${wx} ${wy}) rotate(${Math.atan2(h[1] - e[1], h[0] - e[0]) * 180 / Math.PI - 90}) scale(.76)`}><Rect x={-5.2} y={-4.4} width={10.4} height={8.8} rx={2.4} fill="#3C5670"/><Rect x={-3.4} y={-3.1} width={6.8} height={3.4} rx={.8} fill="#9EE6CF"/><Path d="M-2.2 2.2h1m2 0h1" stroke="#FFF4DC" strokeWidth={1.25}/></G>; })()}
    {accessory === 'flower-lei' && <G transform={`translate(${a.neck[0]} ${a.neck[1]}) scale(${small ? .45 : .82})`}>
      <Path d="M-10.4 0Q-12.4 18.4 0 20.4Q12.4 18.4 10.4 0" stroke="#538D63" fill="none" strokeWidth={3.1}/>
      {front && <Path d={leiLeaves} fill="#6CA97B" strokeWidth={.5}/>}
      {[false, true].map(coral => <Path key={String(coral)} d={leiFlowers.filter(f => f.coral === coral).map(f => flowerPath(f.x, f.y)).join('')} fill={coral ? '#F77E64' : '#FFF7E4'} strokeWidth={.6}/>)}
      {leiFlowers.map(f => <Circle key={`${f.x}:${f.y}`} cx={f.x} cy={f.y} r={1.45} fill="#F4AA3C" strokeWidth={.55}/>)}
    </G>}
    {accessory === 'checker-scarf' && <G transform={`translate(${a.neck[0]} ${a.neck[1]}) scale(${small ? .45 : .82})`}>
      <Path d="M-11.4-1Q0 5.4 11.4-1L10.4 6.2Q0 12.4-10.4 6.2ZM5 6.2L12.2 7.2L15.4 23.4L7.2 22.4Z" fill="#FFF6E2"/>
      <Path d="M-9.2 1h3v3h-3ZM-3 3h3v3h-3ZM3.2 2h3v3H3.2ZM9.2 1h2v3H9.2ZM8.2 9.2h3v3H8.2ZM11.2 12.2h3v3h-3ZM9.2 15.2h3v3H9.2ZM12.2 18.2h3v3h-3Z" fill="#926286" strokeWidth={0}/>
      <Path d="M8.6 22.8v2.6M11.2 23.1v2.6M13.8 23.3v2.6" fill="none" stroke="#926286" strokeWidth={1.15}/>
    </G>}
  </G>;
}
