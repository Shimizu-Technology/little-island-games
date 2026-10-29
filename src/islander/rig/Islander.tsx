import React, { memo } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { defaultLook, hairColors, normalizeLook, outfitPalettes, skinTones, type IslanderLook } from '../look';
import { resolvePose, type Point, type Pose, type Side, type View } from './poses';
import { anchorsFor } from './wardrobe';
const ink = '#493946';
/** A closed capsule follows each individual bone; overlapping rounded ends seal joints. */
export function boneShape(a: Point, b: Point, r: number, end = r): string {
  const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.max(.001, Math.hypot(dx, dy)), nx = -dy / length, ny = dx / length, ux = dx / length, uy = dy / length;
  return `M${a[0] + nx * r} ${a[1] + ny * r}L${b[0] + nx * end} ${b[1] + ny * end}Q${b[0] + ux * end * 1.8} ${b[1] + uy * end * 1.8} ${b[0] - nx * end} ${b[1] - ny * end}L${a[0] - nx * r} ${a[1] - ny * r}Q${a[0] - ux * r * 1.8} ${a[1] - uy * r * 1.8} ${a[0] + nx * r} ${a[1] + ny * r}Z`;
}
const between = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export function IslanderShape({ pose, look: input = defaultLook }: { pose: Pose; look?: IslanderLook }) {
  const look = normalizeLook(input), j = pose.joints, a = anchorsFor(pose), compact = !!pose.compact, front = pose.view === 'front';
  const skin = skinTones[look.skinTone], hair = hairColors[look.hairColor], colors = outfitPalettes[look.palette ?? (look.outfit === 'hoodie' ? 'twilight' : look.outfit === 'explorer' ? 'lagoon' : 'coral')];
  const [hx, hy] = j.head, r = compact ? 12 : 17, sy = j.leftShoulder[1], hip = j.leftHip[1], hasHat = look.hat === 'sunhat' || look.hat === 'cap';
  const limb = (side: Side, arm: boolean, clothes = true) => {
    const start = j[`${side}${arm ? 'Shoulder' : 'Hip'}`], middle = j[`${side}${arm ? 'Elbow' : 'Knee'}`], end = j[`${side}${arm ? 'Hand' : 'Foot'}`];
    const hoodie = look.outfit === 'hoodie', dress = look.outfit === 'sundress', radius = arm ? 4 : 4.8;
    return <G key={`${side}${arm}`}><Path d={boneShape(start, middle, radius)} fill={skin}/><Path d={boneShape(middle, end, radius, arm ? 3.5 : 3.8)} fill={skin}/>
      {clothes && (arm ? !dress : true) && <Path d={boneShape(start, hoodie ? middle : between(start, middle, arm ? .48 : .68), radius + 1, radius + .4)} fill={arm ? colors.primary : colors.secondary}/>}
      {clothes && !arm && look.outfit === 'explorer' && <Path d={boneShape(between(start, middle, .32), between(start, middle, .58), 2.3)} fill="#E8C58A" strokeWidth={1}/>}
      {clothes && hoodie && <Path d={boneShape(middle, between(middle, end, .82), radius + .6, radius)} fill={arm ? colors.primary : colors.secondary}/>}
      {!arm && <G><Path d={`M${end[0] - 6} ${end[1] - 3}Q${end[0]} ${end[1] - 7} ${end[0] + 6} ${end[1] - 3}L${end[0] + 7} ${end[1] + 1}Q${end[0]} ${end[1] + 4} ${end[0] - 7} ${end[1] + 1}Z`} fill={colors.trim}/><Path d={`M${end[0] - 4} ${end[1]}H${end[0] + 4}`} strokeWidth={1} stroke="#FFF7DE"/></G>}
    </G>;
  };
  const hand = (side: Side) => { const [x, y] = j[`${side}Hand`]; return <G key={side}><Ellipse cx={x} cy={y} rx={4.2} ry={4.6} fill={skin}/><Path d={`M${x - 1.5} ${y + 1}q1.5 1 3 0`} strokeWidth={.7} fill="none"/></G>; };
  const long = look.hairStyle === 'ponytail' || look.hairStyle === 'braids';
  const rearHair = <G fill={hair}>
    {long && !compact && (look.hairStyle === 'ponytail' ? <Path d={`M${hx + 10} ${hy - 6}Q${hx + 31} ${hy - 11} ${hx + 24} ${hy + 18}Q${hx + 22} ${hy + 33} ${hx + 11} ${hy + 31}Q${hx + 19} ${hy + 17} ${hx + 9} ${hy + 7}Z`}/> : ([-1, 1] as const).map(s => <G key={s}><Path d={`M${hx + s * 13} ${hy + 3}Q${hx + s * 25} ${hy + 13} ${hx + s * 19} ${hy + 31}L${hx + s * 12} ${hy + 31}Q${hx + s * 15} ${hy + 17} ${hx + s * 10} ${hy + 8}Z`}/>{[14, 21, 28].map(y => <Path key={y} d={`M${hx + s * 13} ${hy + y}l${s * 6} -3`} strokeWidth={1}/>) }<Circle cx={hx + s * 15} cy={hy + 31} r={2.8} fill={colors.trim}/></G>))}
    <Ellipse cx={hx} cy={hy} rx={r + .7} ry={r + (hasHat ? 0 : 2)}/>
  </G>;
  const backpack = <G transform={`translate(${a.torso[0] - (compact ? 10 : 0)} ${a.torso[1]})`}><Rect x={compact ? -9 : -12} y={compact ? -3 : -8} width={compact ? 18 : 24} height={compact ? 13 : 28} rx={7} fill="#D2A45E"/><Rect x={compact ? -6 : -8} y={compact ? 1 : 5} width={compact ? 12 : 16} height={compact ? 7 : 11} rx={3} fill="#F4CC76"/><Path d={compact ? "M-3 -3Q0 -7 3 -3" : "M-4 -8Q0 -16 4 -8"} fill="none" strokeWidth={2}/></G>;
  return <G stroke={ink} strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round">
    <G data-layer="rear-accessory">{look.accessory === 'backpack' && front && backpack}</G>
    <G data-layer="rear-hair">{rearHair}</G>
    <G data-layer="rear-limbs">{limb('left', false)}{look.outfit === 'sundress' && limb('right', false)}{limb('left', true)}</G>
    <G data-layer="body"><Path d={`M${hx - 5} ${hy + r - 3}L35 ${sy + 3}H45L${hx + 5} ${hy + r - 3}Z`} fill={skin}/><Path d={`M26 ${sy}Q40 ${sy - (compact ? 2 : 7)} 54 ${sy}L54 ${hip + 2}H26Z`} fill={skin}/><Ellipse cx={hx - r} cy={hy + 3} rx={3} ry={4} fill={skin}/><Ellipse cx={hx + r} cy={hy + 3} rx={3} ry={4} fill={skin}/>
      {!compact && <Circle cx={hx} cy={hy} r={r} fill={front ? skin : hair}/>}</G>
    <G data-layer="clothing"><Path d={`M27 ${hip - 8}H53L55 ${hip + 8}H43L40 ${hip + 2}L37 ${hip + 8}H25Z`} fill={colors.secondary}/>
      <Path d={`M26 ${sy - 1}Q40 ${sy - (compact ? 2 : 7)} 54 ${sy - 1}L${look.outfit === 'sundress' ? 60 : 55} ${hip + (look.outfit === 'sundress' ? 12 : -5)}Q40 ${hip + (look.outfit === 'sundress' ? 17 : 0)} ${look.outfit === 'sundress' ? 20 : 25} ${hip + (look.outfit === 'sundress' ? 12 : -5)}Z`} fill={!front && look.outfit === 'explorer' ? '#E8C58A' : colors.primary}/>
      {!compact && <>{!front && look.outfit === 'hoodie' && <Path d={`M30 ${sy}Q40 ${sy + 22} 50 ${sy}Q40 ${sy - 5} 30 ${sy}Z`} fill={colors.secondary} strokeWidth={1.2}/>}<Path d={`M34 ${sy - 3}Q40 ${sy + 5} 46 ${sy - 3}`} fill="none" stroke={colors.trim} strokeWidth={2.5}/>
        {front && look.outfit === 'island' && <G strokeWidth={0} fill={colors.trim}><Path d={`M39 ${sy + 11}q-10 -7 -9 3q1 7 10 9q9-5 9-11q-1-7-10-1Z`}/><Path d={`M40 ${sy + 13}v8`} stroke={colors.primary} strokeWidth={1}/></G>}
        {front && look.outfit === 'explorer' && <G fill="#E8C58A"><Path d={`M27 ${sy}L35 ${sy + 3}L35 ${hip - 5}H25Z`}/><Path d={`M53 ${sy}L45 ${sy + 3}L45 ${hip - 5}H55Z`}/><Path d={`M28 ${sy + 17}H33V${sy + 23}H28ZM47 ${sy + 17}H52V${sy + 23}H47Z`} fill={colors.secondary} strokeWidth={1}/></G>}
        {front && look.outfit === 'hoodie' && <><Path d={`M34 ${hip - 15}Q40 ${hip - 19} 46 ${hip - 15}L48 ${hip - 8}H32Z`} fill={colors.secondary} strokeWidth={1}/><Path d={`M36 ${sy + 3}v8M44 ${sy + 3}v8`} stroke={colors.trim} strokeWidth={1.2}/></>}
        {look.outfit === 'sundress' && <G fill={colors.trim} strokeWidth={0}>{[31, 43, 51].map((x, i) => <Circle key={x} cx={x} cy={sy + 15 + i * 8} r={2.3}/>)}</G>}
      </>}
      {compact && look.accessory === 'backpack' && backpack}
    </G>
    <G data-layer="front-limbs">{look.outfit !== 'sundress' && limb('right', false)}{limb('right', true)}</G>
    <G data-layer="hands">{hand('left')}{hand('right')}</G>
    <G data-layer="front-hair">{compact && <Circle cx={hx} cy={hy} r={r} fill={hair}/>}

      {front ? <Path d={`M${hx - r} ${hy}Q${hx - r - 2} ${hy - r - (hasHat ? 0 : 4)} ${hx + 1} ${hy - r}Q${hx + r + 4} ${hy - r - 1} ${hx + r} ${hy + 1}L${hx + 10} ${hy - 7}Q${hx - 2} ${hy - 3} ${hx - 9} ${hy - 10}L${hx - 13} ${hy + 2}Z`} fill={hair}/> : <Path d={`M${hx - 9} ${hy - 8}Q${hx} ${hy - 13} ${hx + 8} ${hy - 8}`} stroke="#FFFFFF" opacity={.17} fill="none" strokeWidth={2}/>}
      {look.hairStyle === 'curls' && !compact && [-12, -5, 3, 11].map((x, i) => <Circle key={x} cx={hx + x} cy={hy - (hasHat ? 10 : 14) + (i % 2 ? -1 : 1)} r={hasHat ? 4 : 5.5} fill={hair} strokeWidth={1}/>)}
    </G>
    <G data-layer="face">{front && <G><Ellipse cx={hx - 10} cy={hy + 7} rx={3.5} ry={1.7} fill="#E88D7D" opacity={.5} strokeWidth={0}/><Ellipse cx={hx + 10} cy={hy + 7} rx={3.5} ry={1.7} fill="#E88D7D" opacity={.5} strokeWidth={0}/>
      {pose.expression === 'proud' ? <Path d={`M${hx - 9} ${hy + 2}q3-4 6 0M${hx + 3} ${hy + 2}q3-4 6 0`} fill="none"/> : <G fill={ink} strokeWidth={0}><Ellipse cx={hx - 6} cy={hy + 2} rx={1.9} ry={2.4}/><Ellipse cx={hx + 6} cy={hy + 2} rx={1.9} ry={2.4}/><Circle cx={hx - 5.5} cy={hy + 1} r={.6} fill="white"/><Circle cx={hx + 6.5} cy={hy + 1} r={.6} fill="white"/></G>}
      <Path d={`M${hx} ${hy + 4}l-1 3h2`} strokeWidth={.8} opacity={.5} fill="none"/>
      {pose.expression === 'surprised' ? <Ellipse cx={hx} cy={hy + 11} rx={2.8} ry={3} fill="#7A494B"/> : <Path d={`M${hx - 4} ${hy + 10}q4 ${pose.expression === 'focused' || pose.expression === 'thinking' ? 0 : 5} 8 0`} fill="none" strokeWidth={1.3}/>}
      {pose.expression === 'thinking' && <Path d={`M${hx - 10} ${hy - 3}l6-2M${hx + 4} ${hy - 4}l6 2`} fill="none" strokeWidth={1.1}/>}
    </G>}</G>
    <G data-layer="hat" transform={`translate(${a.headTop[0]} ${a.headTop[1]})`}>
      {look.hat === 'sunhat' && <G fill="#F4CC76"><Path d={compact ? 'M-11 3L-10 -2Q0 -5 10 -2L11 3Z' : 'M-13 5L-11 -4Q0 -6 11 -4L13 5Z'}/><Path d={compact ? 'M-15 4Q0 0 15 4Q0 8-15 4Z' : 'M-22 7Q-20 2-13 3H13Q20 2 22 7Q0 15-22 7Z'}/><Path d={compact ? 'M-10 1H10' : 'M-12 2Q0 5 12 2'} stroke="#D47F66" strokeWidth={3}/></G>}
      {look.hat === 'cap' && <G fill={colors.secondary}><Path d={compact ? 'M-12 4Q-11-5 0-5Q11-5 12 4Z' : 'M-16 6Q-17-5 0-5Q16-4 16 6Z'}/><Path d={front ? 'M0 5Q20 1 22 8Q12 12 0 8Z' : 'M-8 5H8V10H-8Z'} fill={colors.primary}/></G>}
      {look.hat === 'flower-crown' && <G><Path d="M-16 6Q0-1 16 6" stroke="#639477" strokeWidth={3} fill="none"/>{[-12, 0, 12].map((x, i) => <G key={x} transform={`translate(${x} ${i === 1 ? 1 : 5})`} strokeWidth={.6}>{[0, 72, 144, 216, 288].map(angle => <Ellipse key={angle} cx={0} cy={-2.3} rx={1.9} ry={2.8} transform={`rotate(${angle})`} fill="#FFF0D1"/>)}<Circle r={1.6} fill="#E9AF4A"/></G>)}</G>}
    </G>
    <G data-layer="foreground-accessory">{look.accessory === 'backpack' && (!front ? !compact && backpack : <G fill="none" stroke="#D2A45E" strokeWidth={3}><Path d={`M28 ${sy}L31 ${hip - 9}M52 ${sy}L49 ${hip - 9}`}/></G>)}
      {look.accessory === 'glasses' && front && <G fill="#E7F5ED" fillOpacity={.22} strokeWidth={1.3}><Rect x={hx - 13} y={hy - 2} width={11} height={9} rx={3}/><Rect x={hx + 2} y={hy - 2} width={11} height={9} rx={3}/><Path d={`M${hx - 2} ${hy + 1}h4M${hx - 16} ${hy}h3M${hx + 13} ${hy}h3`} fill="none"/></G>}
      {look.accessory === 'glasses' && !front && <Path d={`M${hx - r} ${hy + 1}l-2-2M${hx + r} ${hy + 1}l2-2`} fill="none"/>}
    </G>
  </G>;
}
/** Static SVG; callers pre-render frames and swap opacity. Never runs a timer or worklet. */
export const Islander = memo(function Islander({ view = 'front', pose = view === 'back' ? 0 : 'idle', look = defaultLook, size = 120 }: { view?: View; pose?: string | number | Pose; look?: IslanderLook; size?: number }) {
  return <Svg width={size * 80 / 132} height={size} viewBox="0 0 80 132" accessible={false}><IslanderShape pose={resolvePose(view, pose)} look={look}/></Svg>;
});
/** Separate foreground prop: does not distort or hide the character's skeleton. */
export const IslanderDesk = memo(function IslanderDesk({ size = 120 }: { size?: number }) {
  return <Svg width={size * 80 / 132} height={size} viewBox="0 0 80 132" accessible={false}><G stroke={ink} strokeWidth={1.7} strokeLinejoin="round"><Path d="M13 90H67L72 97H8Z" fill="#D2A45E"/><Path d="M15 97V130H20V97M60 97V130H65V97" fill="#B98458"/><Path d="M29 89L44 87L51 92L36 94Z" fill="#FFF7DE"/><Path d="M48 89L53 81" stroke="#364D79" strokeWidth={2}/></G></Svg>;
});
