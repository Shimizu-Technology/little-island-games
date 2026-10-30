import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { ArtLayer, ItemVisualState } from '../world';
import { material, shade } from './Tint';
import type { TintId } from '../catalogMore';

import { seatSockets } from './sockets';

const ink = '#385451', wood = '#D99E6C', cream = '#FFF1D3';
export { seatSockets } from './sockets';
export const hasSeatArt = (id: string) => !!seatSockets[id];
export function SeatShape({ id, layer = 'all', tint = 'original', state }: { id: string; layer?: ArtLayer; tint?: TintId; state?: ItemVisualState }) {
  const color = material(tint, id === 'beanbag' ? '#B9A8CE' : ['hammock','chair','armchair'].includes(id) ? '#EC9989' : '#79BDB1'), light = shade(color, .35);
  const back = layer !== 'front', front = layer !== 'back';
  const bed = id === 'bed' || id === 'cloud-bed' || id === 'bunk-bed';
  const bedding = (y: number) => <G transform={`translate(0 ${y})`}>
    {back && <>{id !== 'bunk-bed' && <Path d="M10 94V40Q11 32 23 32H131V94" fill={wood}/>}<Rect x={12} y={56} width={126} height={39} rx={9} fill={cream}/><Rect x={15} y={53} width={38} height={38} rx={10} fill="#FFF9E9"/><Path d="M20 60Q32 55 46 61" stroke="#E9DFCA" fill="none"/></>}
    {front && <><Path d="M57 55Q95 52 138 58V97H57Z" fill={color}/><Path d="M59 57H136V65H59Z" fill={light}/>{[74,94,114].map(x=><Path key={x} d={`M${x} 68v22`} stroke={light} strokeWidth={2}/ >)}<Path d="M12 97H139V105H12Z" fill={wood}/><Path d="M16 105v12m119-12v12" stroke={wood} strokeWidth={6}/></>}
  </G>;
  return <G stroke={ink} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
    {bed ? id === 'bunk-bed' ? <>{back && <Path d="M8 12V144M141 12V144" stroke={wood} strokeWidth={7}/ >}{bedding(29)}{bedding(-31)}{front && <Path d="M121 65v78m17-78v78m-17-57h17m-17 20h17m-17 20h17" stroke={wood} strokeWidth={4}/>}</> : bedding(0)
    : id === 'hammock' ? <>
      {back && <>{state?.on && <Path d="M55 23q12-7 25 0m-18 7q12-7 25 0" fill="none" stroke={light}/>}<Path d="M9 27L15 130M141 27L135 130M5 130h24m92 0h24" stroke={wood} strokeWidth={6}/><Path d="M11 48Q75 101 139 48L125 100Q75 129 25 100Z" fill={light}/><Ellipse cx={35} cy={76} rx={23} ry={24} fill={cream}/></>}
      {front && <><Path d="M57 46Q103 63 148 45L148 101Q100 132 27 107L22 91Q43 102 57 101Z" fill={color}/><Path d="M32 103Q77 121 124 88M64 78v32m19-23v26m20-23v16" fill="none" stroke={light} strokeWidth={2}/></>}
    </> : id === 'sofa' ? <>
      {back && <><Rect x={8} y={40} width={134} height={69} rx={18} fill={color}/><Rect x={14} y={49} width={122} height={45} rx={12} fill={light}/><Rect x={12} y={65} width={39} height={37} rx={12} fill={cream}/><Path d="M16 112v12m117-12v12" stroke={wood} strokeWidth={6}/></>}
      {front && <><Path d="M57 59Q94 62 132 67V111H57Z" fill={color}/><Path d="M59 63Q94 66 129 72" stroke={light} strokeWidth={5}/><Rect x={7} y={99} width={136} height={14} rx={6} fill={color}/><Rect x={129} y={67} width={15} height={44} rx={7} fill={light}/></>}
    </> : id === 'bathtub' || id === 'bubble-bath' ? <>
      {back && <><Path d="M13 72Q75 47 137 72V108H13Z" fill={cream}/><Ellipse cx={75} cy={76} rx={61} ry={19} fill="#A7D7D3"/><Path d="M119 62V38Q119 29 108 33v9" stroke={wood} strokeWidth={6} fill="none"/></>}
      {front && <><Path d="M12 79Q75 100 138 79L130 121Q75 140 20 121Z" fill={material(tint, cream)}/><Path d="M13 79Q75 99 137 79" stroke="#F9FAF0" strokeWidth={7}/><Path d="M30 127v9m90-9v9" stroke={wood} strokeWidth={6}/>{(id === 'bubble-bath' || state?.on) && [27,47,98,120].map((x,i)=><G key={x}><Circle cx={x} cy={81-i%2*3} r={10} fill="#F4FAEF"/><Circle cx={x+8} cy={75} r={6} fill="#F4FAEF"/></G>)}</>}
    </> : <>
      {back && <>
        {['armchair','chair','rocking-chair','beanbag'].includes(id) && <Rect x={30} y={44} width={90} height={66} rx={id === 'beanbag' ? 36 : 15} fill={color}/>}
        {id === 'rocking-chair' ? <Path d="M39 103v29m73-29v29M19 130Q75 148 131 130" stroke={wood} strokeWidth={6} fill="none"/> : !['floor-cushion','beanbag'].includes(id) && <Path d="M35 102v29m80-29v29" stroke={wood} strokeWidth={6}/>}
        <Ellipse cx={75} cy={id === 'stool' ? 89 : id === 'floor-cushion' ? 117 : 100} rx={id === 'bench' ? 67 : 49} ry={12} fill={light}/>
      </>}
      {back && id === 'stool' && <Path d="M35 119h80" stroke={wood} strokeWidth={4}/>}
      {back && id === 'bench' && <><Path d="M9 99H141V107H9Z" fill={wood}/><Path d="M15 94H135" stroke={cream} strokeWidth={2}/></>}
      {back && id === 'floor-cushion' && <Path d="M26 114Q75 99 124 114V124Q75 137 26 124Z" fill={color}/>}
      {front && id === 'armchair' && <><Rect x={23} y={72} width={16} height={40} rx={8} fill={color}/><Rect x={111} y={72} width={16} height={40} rx={8} fill={color}/><Path d="M26 77h10m78 0h10" stroke={light} strokeWidth={3}/></>}
      {front && id === 'beanbag' && <Path d="M23 95Q29 92 43 101L45 119Q18 122 18 104ZM107 101Q121 92 127 95L132 104Q132 122 105 119Z" fill={color}/>}

    </>}
  </G>;
}
export function SeatArt({ id, size = 120, layer = 'all', mirrored = false, rotation = 0, tint, state, motion }: { id: string; size?: number; layer?: ArtLayer; mirrored?: boolean; rotation?: number; tint?: TintId; state?: ItemVisualState; motion?: (art: React.ReactNode) => React.ReactNode }) {
  const flip = mirrored !== (rotation === 180 || rotation === 270);
  const art = <SeatShape id={id} layer={layer} tint={tint} state={state}/>;
  return <Svg width={size} height={size} viewBox="0 0 150 150" accessible={false}><G transform={flip ? 'translate(150 0) scale(-1 1)' : undefined}>{motion ? motion(art) : art}</G></Svg>;
}
