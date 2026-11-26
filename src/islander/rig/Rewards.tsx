import React from 'react';
import { Circle, G, Path, Rect } from 'react-native-svg';
import { type IslanderLook } from '../look';
import type { Pose } from './poses';
import { anchorsFor } from './wardrobe';
const leiFlowers = [-1, 1].flatMap(side => [0, 1, 2].map(i => ({ x: side * (10 - i * 3), y: 4 + i * 6, coral: i === 1 })));
const flowerPath = (x: number, y: number) => `M${x} ${y-4}q5-1 3 4q4 4-1 4q-2 4-4 0q-5 0-1-4q-2-5 3-4Z`;
const leiLeaves = 'M-12 7Q-15.5 9 -11.5 11.5Q-10 9 -12 7ZM12 7Q15.5 9 11.5 11.5Q10 9 12 7ZM-8.5 15.5Q-11 19 -6.5 19Q-6.5 16.5 -8.5 15.5ZM8.5 15.5Q11 19 6.5 19Q6.5 16.5 8.5 15.5Z';
/** Reward details use the same rig coordinates and inherited ink as starter clothing. */
export function RewardArt({look, pose, layer}: {look: IslanderLook; pose: Pose; layer: 'hat' | 'accessory' | 'wrist' | 'neckwear'}) {
  const a = anchorsFor(pose), [x,y] = pose.joints.head, front = pose.view === 'front', small = !!pose.compact;

  if (layer === 'hat') return <G transform={`translate(${a.headTop[0]} ${a.headTop[1]}) scale(${small?.55:look.hat==='runner-headband'?1.3:1.13} ${small?.55:1})`}>
    {look.hat === 'bookworm-beanie' && <G fill="#986D8E">
      <Path d={small ? "M-22 7Q-24-5 0-5Q24-5 22 7Z" : "M-24 8C-25 -7 -11 -10 0 -10C11 -10 25 -7 24 8Z"}/>
      {!small && front && <Path d="M-16 -4.5Q-6 -9 6 -7.2Q-4 -5.2 -16 -4.5Z" fill="#C9A2BE" fillOpacity={.45} strokeWidth={0}/>}
      <Rect x={-25.4} y={3} width={50.8} height={10} rx={3.4} fill="#845B7B"/>
      {front && <Path d="M-4.6 4.6Q-2.3 3.9 0 4.8Q2.3 3.9 4.6 4.6V11.2Q2.3 10.4 0 11.4Q-2.3 10.4 -4.6 11.2ZM0 4.8V11.4" fill="#FFF4DD" strokeWidth={.85}/>}
      <Path d="M-16 4v8M-9 4v8M9 4v8M16 4v8M-13-5v6M12-5v6" fill="none" stroke="#CFA9C1" strokeWidth={1.1}/>
    </G>}
    {look.hat === 'woven-sunhat' && <G fill="#DFBD7A">
      <Path d={small ? "M-19 6L-15-3Q0-5 15-3L19 6ZM-29 8Q-27 3-18 4H18Q27 3 29 8Q0 19-29 8Z" : "M-18.6 9C-18.6 -6 -10 -8.6 0 -8.6C10 -8.6 18.6 -6 18.6 9ZM-31 10C-27 5 -18 6 0 6C18 6 27 5 31 10C25 17 -25 17 -31 10Z"}/>
      {!small && <Path d="M-18.6 5C-9 8.8 9 8.8 18.6 5L18.6 1.2C9 5 -9 5 -18.6 1.2Z" fill="#469A92" strokeWidth={.85}/>}
      <Path d="M-14 -6L13 5M-8 -8L18 2M-14 4L8 -8M-5 6L15 -5M-22 10Q0 15 22 10M-18 1Q0 5 18 1" fill="none" stroke="#9B7B4B" strokeWidth={.95}/>
    </G>}
    {look.hat === 'runner-headband' && <G>
      <Path d="M-22 10Q0 3 22 10L22 16Q0 9-22 16Z" fill="#6BB6AC"/>
      <Path d="M-20 12.2Q0 6.2 20 12.2M-20 14.3Q0 8.3 20 14.3" fill="none" stroke="#FFF4DC" strokeWidth={1.15}/>
      {front && <Path d="M0 7.4L.9 9.5L3.2 9.7L1.4 11.2L2 13.4L0 12.2L-2 13.4L-1.4 11.2L-3.2 9.7L-.9 9.5Z" fill="#F8CD5C" strokeWidth={.65}/>}
    </G>}
    {look.hat === 'captain-cap' && <G>
      <Path d="M-23 5Q-27-4.4 0-4.4Q27-4.4 23 5Z" fill="#FFF4DE"/>
      <Path d="M-22 5H22V11H-22Z" fill="#3A5170"/>
      {front && <Path d="M-16.5 11Q0 22 16.5 11Z" fill="#2F425D"/>}
      {front && <Path d="M-19 10.6Q0 12.6 19 10.6M0-3.8v7.6m-4.2-3.6q4.2 7.6 8.4 0" fill="none" stroke="#F0BE52" strokeWidth={1.9}/>}
    </G>}
  </G>;
  const neckwear = ['flower-lei', 'checker-scarf'].includes(look.accessory);
  const accessory = layer === 'wrist' ? (look.accessory === 'calculator-watch' ? look.accessory : 'none') : layer === 'neckwear' ? (!front && neckwear ? look.accessory : 'none') : (look.accessory === 'calculator-watch' || (!front && neckwear) ? 'none' : look.accessory);
  return <G>
    {['reading-glasses','safety-goggles'].includes(accessory) && (front ? <G transform={`translate(${x} ${y+7})`} fill="#D2EFEA" fillOpacity={.28} strokeWidth={1.65}>{accessory === 'reading-glasses' ? <><Circle cx={-8.4} r={6.1} stroke="#5D3A46"/><Circle cx={8.4} r={6.1} stroke="#5D3A46"/><Path d="M-11.2-2.2l2.6-1.8M5.6-2.2l2.6-1.8" fill="none" stroke="#FFFFFF" strokeWidth={1.15}/></> : <><Rect x={-17.5} y={-6} width={35} height={12.4} rx={4.5} stroke="#4C968F"/><Path d="M0-5V5.4" stroke="#4C968F"/><Path d="M-13-2.6l3.4-1.8M5-2.6l3.4-1.8" fill="none" stroke="#FFFFFF" strokeWidth={1.2}/></>}<Path d="M-2.2 0H2.2M-22-1H-15M15-1H22" fill="none" stroke={accessory === 'safety-goggles' ? '#4C968F' : '#5D3A46'}/></G> : <Path d={`M${x-(small?12:28)} ${y+6}Q${x} ${y+13} ${x+(small?12:28)} ${y+6}`} fill="none" stroke={accessory === 'safety-goggles' ? '#6BB6AC' : '#8D6282'} strokeWidth={3}/>)}
    {accessory === 'coder-headset' && <G transform={`translate(${x} ${y}) scale(${small?.5:1})`}><Path d="M-23 6Q-24-22 0-23Q24-22 23 6" fill="none" stroke="#395588" strokeWidth={4.2}/><Rect x={-26.2} y={2} width={8.4} height={18} rx={4.2} fill="#6F95CE"/><Rect x={17.8} y={2} width={8.4} height={18} rx={4.2} fill="#6F95CE"/><Path d="M-22 6.5v9M22 6.5v9" fill="none" stroke="#7CEFD2" strokeWidth={1.6}/><Path d="M22 17q-1 12.5-14 12.5" fill="none" stroke="#395588" strokeWidth={2}/><Circle cx={8} cy={29.5} r={2.9} fill="#F2BE5C"/></G>}
    {accessory === 'calculator-watch' && (()=>{const e=pose.joints.rightElbow,h=pose.joints.rightHand; const wx=e[0]+(h[0]-e[0])*.8,wy=e[1]+(h[1]-e[1])*.8; return <G transform={`translate(${wx} ${wy}) rotate(${Math.atan2(h[1]-e[1],h[0]-e[0])*180/Math.PI-90}) scale(.74)`}><Rect x={-5} y={-4.2} width={10} height={8.4} rx={2.2} fill="#3F5770"/><Rect x={-3.2} y={-3} width={6.4} height={3.2} rx={.7} fill="#9EE6CF"/><Path d="M-2.2 2.2h1m2 0h1" stroke="#FFF4DC" strokeWidth={1.2}/></G>;})()}
    {accessory === 'flower-lei' && <G transform={`translate(${a.neck[0]} ${a.neck[1]}) scale(${small?.45:.8})`}><Path d="M-10 0Q-12 18 0 20Q12 18 10 0" stroke="#5A8F6B" fill="none" strokeWidth={3}/>{front && <Path d={leiLeaves} fill="#5A8F6B" strokeWidth={.5}/>}{[false,true].map(coral=><Path key={String(coral)} d={leiFlowers.filter(f=>f.coral===coral).map(f=>flowerPath(f.x,f.y)).join('')} fill={coral?'#F67D63':'#FFF5DE'} strokeWidth={.6}/>)}{leiFlowers.map(f=><Circle key={`${f.x}:${f.y}`} cx={f.x} cy={f.y} r={1.35} fill="#F2A63B" strokeWidth={.55}/>)}</G>}
    {accessory === 'checker-scarf' && <G transform={`translate(${a.neck[0]} ${a.neck[1]}) scale(${small?.45:.8})`}><Path d="M-11-1Q0 5 11-1L10 6Q0 12-10 6ZM5 6L12 7L15 23L7 22Z" fill="#FFF4DE"/><Path d="M-9 1h3v3h-3ZM-3 3h3v3h-3ZM3 2h3v3H3ZM9 1h2v3H9ZM8 9h3v3H8ZM11 12h3v3h-3ZM9 15h3v3H9ZM12 18h3v3h-3Z" fill="#926286" strokeWidth={0}/><Path d="M8.5 22.5v2.4M11 22.8v2.4M13.5 23v2.4" fill="none" stroke="#926286" strokeWidth={1.1}/></G>}
  </G>;
}
