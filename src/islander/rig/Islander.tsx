import React, { memo } from 'react';
import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { buildFor, defaultLook, normalizeLook, outfitPalettes, outfitDefaults, skinTones, type IslanderLook } from '../look';
import { resolvePose, isLying, poseBox, type Point, type Pose, type Side, type View } from './poses';
import { anchorsFor } from './wardrobe';
import { characterPose, rigFace, rigIdle, type CharacterAction, type CharacterBase, type CharacterFace, type Facing, type RigLife, type Gaze, type MealFrame, type MealPlayback } from './character';
import { islanderAnchors, islanderOrigin, islanderSurface, rigTransform } from './anchors';
import { RewardArt } from './Rewards';
import { Hair } from './Hair';
import { MealLayer } from './MealLayer';
import { Face } from './Face';
import { Shoes } from './Shoes';
import { buildShape, Clothes, garmentFor, toneOf } from './Clothes';
const ink = '#493E38';
const crownSpots = [[-16.6, 5.6], [-8.4, 2.2], [0, 1], [8.4, 2.2], [16.6, 5.6]] as const;
const crownFlowers = crownSpots.map(([x, y]) => [0, 1, 2, 3, 4].map(i => { const t = i * Math.PI * .4 - Math.PI / 2, u = t + .9, w = t - .9, r = 4.4; return `M${x} ${y}Q${(x + Math.cos(u) * r).toFixed(2)} ${(y + Math.sin(u) * r).toFixed(2)} ${(x + Math.cos(t) * r).toFixed(2)} ${(y + Math.sin(t) * r).toFixed(2)}Q${(x + Math.cos(w) * r).toFixed(2)} ${(y + Math.sin(w) * r).toFixed(2)} ${x} ${y}Z`; }).join('')).join('');
const crownHearts = crownSpots.map(([x, y]) => `M${x - 1.1} ${y}Q${x - 1.1} ${y - 1.1} ${x} ${y - 1.1}Q${x + 1.1} ${y - 1.1} ${x + 1.1} ${y}Q${x + 1.1} ${y + 1.1} ${x} ${y + 1.1}Q${x - 1.1} ${y + 1.1} ${x - 1.1} ${y}Z`).join('');
/** A closed, unoutlined fabric cap covers the top of a continuous limb. */
export function boneShape(a: Point, b: Point, r: number, end = r): string {
  const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.max(.001, Math.hypot(dx, dy)), nx = -dy / length, ny = dx / length, ux = dx / length, uy = dy / length;
  return `M${a[0] + nx * r} ${a[1] + ny * r}L${b[0] + nx * end} ${b[1] + ny * end}Q${b[0] + ux * end * 1.8} ${b[1] + uy * end * 1.8} ${b[0] - nx * end} ${b[1] - ny * end}L${a[0] - nx * r} ${a[1] - ny * r}Q${a[0] - ux * r * 1.8} ${a[1] - uy * r * 1.8} ${a[0] + nx * r} ${a[1] + ny * r}Z`;
}
/** Flat mid-thigh hem, perpendicular to the thigh; no rounded knee cap. */
export function shortsShape(a: Point, knee: Point, reach = .5, width = 4): string {
  const b = between(a, knee, reach), length = Math.max(.001, Math.hypot(knee[0]-a[0], knee[1]-a[1]));
  const nx = -(knee[1]-a[1])/length, ny = (knee[0]-a[0])/length;
  return `M${a[0]+nx*(width+.3)} ${a[1]+ny*(width+.3)}L${b[0]+nx*width} ${b[1]+ny*width}L${b[0]-nx*width} ${b[1]-ny*width}L${a[0]-nx*(width+.3)} ${a[1]-ny*(width+.3)}Z`;
}
/** A sleeve is cut from the garment: round over the shoulder, with a straight hem on the arm. */
export function sleeveShape(a: Point, end: Point, top: number, hem: number): string {
  const dx = end[0]-a[0], dy = end[1]-a[1], length = Math.max(.001, Math.hypot(dx, dy)), nx = -dy/length, ny = dx/length, ux = dx/length, uy = dy/length;
  return `M${a[0]+nx*top} ${a[1]+ny*top}L${end[0]+nx*hem} ${end[1]+ny*hem}L${end[0]-nx*hem} ${end[1]-ny*hem}L${a[0]-nx*top} ${a[1]-ny*top}Q${a[0]-ux*top*1.8} ${a[1]-uy*top*1.8} ${a[0]+nx*top} ${a[1]+ny*top}Z`;
}
/** One closed contour per limb; the quadratic tangent passes smoothly around the bend. */
export function limbShape(a: Point, b: Point, c: Point, r: number, tip: number): string {
  const normal = (p: Point, q: Point): Point => { const d = Math.max(.001, Math.hypot(q[0]-p[0], q[1]-p[1])); return [-(q[1]-p[1])/d, (q[0]-p[0])/d]; };
  const n = normal(a,b), m = normal(b,c), mid = (r + tip) / 2;
  const edge = (p: Point, v: Point, w: number): string => `${p[0]+v[0]*w} ${p[1]+v[1]*w}`;
  const before = between(a,b,.78), after = between(b,c,.22);
  const calf = between(b,c,.55), shin = (sign: number) => r > 3.2 ? `Q${edge(calf,m,sign*mid*1.15)} ${edge(c,m,sign*tip)}` : `L${edge(c,m,sign*tip)}`;
  const reverseShin = r > 3.2 ? `Q${edge(calf,m,-mid*1.15)} ${edge(after,m,-mid)}` : `L${edge(after,m,-mid)}`;
  const turn: Point = [(n[0]+m[0])/2,(n[1]+m[1])/2];
  // A sharp bend pinches on its inner side: meet at one crease so the outline cannot loop over itself.
  const dot = n[0]*m[0]+n[1]*m[1], cross = n[0]*m[1]-n[1]*m[0], sharp = dot < .35, turnLength = Math.max(.001, Math.hypot(turn[0], turn[1]));
  const crease = (sign: number) => `${b[0]+turn[0]/turnLength*sign*mid*1.05} ${b[1]+turn[1]/turnLength*sign*mid*1.05}`;
  const outward = sharp && cross > 0 ? `L${crease(1)}L${edge(between(b,c,.34),m,mid)}` : `L${edge(before,n,mid)}Q${edge(b,turn,mid*.82)} ${edge(after,m,mid)}`;
    return `M${edge(a,n,r)}${outward}${shin(1)}Q${c[0]+m[1]*tip*1.5} ${c[1]-m[0]*tip*1.5} ${edge(c,m,-tip)}${sharp && cross < 0 ? `L${edge(between(b,c,.34),m,-mid)}` : reverseShin}${sharp && cross < 0 ? `L${crease(-1)}` : `Q${edge(b,turn,-mid*.82)} ${edge(before,n,-mid)}`}L${edge(a,n,-r)}Q${a[0]-n[1]*r} ${a[1]+n[0]*r} ${edge(a,n,r)}Z`;
}
const between = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export function IslanderShape({ pose, look: input = defaultLook, held, reduced = false, expression, blink = false, heldMirrored = false, gaze, meal, mealPlayback, mealBase, actionForMeal = null }: { pose: Pose; look?: IslanderLook; held?: React.ReactNode; reduced?: boolean; expression?: import('./poses').Expression; blink?: boolean; heldMirrored?: boolean; gaze?: Gaze; meal?: MealFrame; mealPlayback?: MealPlayback; mealBase?: CharacterBase; actionForMeal?: CharacterAction }) {
  const look = normalizeLook(input), j = pose.joints, a = anchorsFor(pose), compact = !!pose.compact, front = pose.view === 'front';
  const skin = skinTones[look.skinTone], colors = look.palette ? outfitPalettes[look.palette] : outfitDefaults[look.outfit];
  const [hx, hy] = j.head, r = compact ? 12 : 28, sy = j.leftShoulder[1], hip = j.leftHip[1];
  const wear = garmentFor(look), shape = buildShape(buildFor(look));
  const longSleeves = ['long', 'billow', 'bulky'].includes(wear.sleeve), longLegs = wear.legs === 'long', sleeveFill = toneOf(wear.sleeveTone, colors);
  const legFill = wear.legTone === 'primary' ? colors.primary : colors.secondary;
  const rearArm: Side = !front && !compact && j.rightHand[1] < j.leftHand[1] ? 'right' : 'left';
  const frontArm: Side = rearArm === 'left' ? 'right' : 'left';
  const limb = (side: Side, arm: boolean, activePose = pose) => {
    const j = activePose.joints;
    // A build widens or narrows the shoulder; the arm bends to reach the same hand joint that held props and Home anchors use.
    const reach = front && arm ? shape.armShift * (side === 'left' ? 1 : -1) : 0, joint = (p: Point, t: number): Point => [p[0] + reach * t, p[1]];
    const start = joint(j[`${side}${arm ? 'Shoulder' : 'Hip'}`], 1), middle = joint(j[`${side}${arm ? 'Elbow' : 'Knee'}`], .6), end = j[`${side}${arm ? 'Hand' : 'Foot'}`];
    const radius = arm ? shape.arm + (wear.sleeve === 'bulky' ? 1 : wear.sleeve === 'billow' ? .4 : 0) : shape.leg + (wear.bottom === 'space' ? 1 : 0), tip = arm ? shape.armTip : shape.legTip;
    const sleeveEnd = between(start, middle, wear.sleeve === 'cap' ? .34 : front ? .62 : .52);
    const cuff = between(middle,end,.83), cuffLength = Math.max(.001,Math.hypot(end[0]-middle[0],end[1]-middle[1]));
    const cuffX = -(end[1]-middle[1])/cuffLength*2.6, cuffY = (end[0]-middle[0])/cuffLength*2.6;
    const cuffLine = arm && longSleeves ? `M${cuff[0]+cuffX} ${cuff[1]+cuffY}L${cuff[0]-cuffX} ${cuff[1]-cuffY}` : '';
    const stance = front && !arm ? shape.legShift * (side === 'left' ? -1 : 1) : 0;
    const legCut = wear.bottom === 'board' ? { reach: .95, width: shape.leg + .9 } : wear.bottom === 'cargo' ? { reach: .72, width: shape.leg + .7 } : wear.bottom === 'breeches' ? { reach: 1.02, width: shape.leg + 1.2 } : wear.bottom === 'none' || wear.bottom === 'skirt' ? { reach: .36, width: shape.leg - .1 } : { reach: .55, width: shape.leg + .6 };
    return <G key={`${side}${arm}`} data-stance={stance} transform={`translate(${stance} 0) rotate(0) scale(1 1)`}>
      <Path data-limb={`${side}-${arm ? 'arm' : 'leg'}`} d={limbShape(start, middle, !arm && longLegs ? between(middle, end, .9) : end, radius, tip + (arm || !longLegs ? 0 : .4))+cuffLine} fill={arm ? (longSleeves ? sleeveFill : skin) : longLegs ? legFill : skin}/>
      {arm && !longSleeves && wear.sleeve !== 'none' && <Path data-garment="sleeve" d={sleeveShape(start, wear.sleeve === 'puff' ? between(start, middle, .5) : sleeveEnd, radius + (wear.sleeve === 'puff' ? 2.2 : .9), radius + (wear.sleeve === 'puff' ? 1.4 : .7))} fill={sleeveFill}/>}
      {arm && wear.band && !longSleeves && <Path d={shortsShape(between(start, sleeveEnd, .72), sleeveEnd, 1, radius + .7)} fill={colors.trim} strokeWidth={.8}/>}
      {!arm && !longLegs && wear.bottom !== 'breeches' && <Path data-garment="shorts" d={shortsShape(start, middle, legCut.reach, legCut.width)} fill={wear.bottom === 'none' ? colors.primary : colors.secondary}/>}
      {!arm && wear.bottom === 'board' && (() => { const low = between(start, middle, legCut.reach-.1), high = between(start, middle, .22), d = Math.max(.001, Math.hypot(middle[0]-start[0], middle[1]-start[1])), nx = -(middle[1]-start[1])/d*(side === 'left' ? 1 : -1)*(legCut.width-2.6), ny = (middle[0]-start[0])/d*(side === 'left' ? 1 : -1)*(legCut.width-2.6); return <Path d={`M${high[0]+nx} ${high[1]+ny}L${low[0]+nx} ${low[1]+ny}`} fill="none" stroke={colors.trim} strokeWidth={1.6}/>; })()}
      {arm && wear.top === 'varsity' && <Path d={shortsShape(between(middle, end, .7), between(middle, end, .9), 1, radius-.3)} fill={colors.primary} strokeWidth={.9}/>}
      {arm && wear.layered && <Path data-garment="sleeve" d={sleeveShape(start, sleeveEnd, radius + .9, radius + .7)} fill={colors.primary}/>}
      {!arm && wear.bottom === 'breeches' && <Path data-garment="breeches" d={shortsShape(start, middle, legCut.reach, legCut.width)} fill={colors.secondary}/>}
      {wear.bottom === 'space' && !arm && <Path d={shortsShape(between(start, middle, .86), between(start, middle, 1.14), .9, radius+.2)} fill={colors.trim} strokeWidth={.9}/>}
      {wear.sleeve === 'billow' && arm && <Path d={shortsShape(between(start, middle, .28), between(start, middle, .52), 1, radius-.5) + shortsShape(between(start, middle, .62), between(start, middle, .86), 1, radius-.7) + (front ? shortsShape(between(middle, end, .24), between(middle, end, .5), 1, radius-1) : '')} fill={colors.primary} strokeWidth={0}/>}
      {wear.sleeve === 'bulky' && arm && <Path d={shortsShape(between(start, middle, .86), between(start, middle, 1.14), .9, radius+.2)} fill={colors.trim} strokeWidth={.9}/>}
      {!arm && <Shoes look={look} foot={end} back={!front} lifted={end[1]<123} compact={compact}/>}
      {arm && side === 'right' && <RewardArt look={look} pose={activePose} layer="wrist"/>}
    </G>;
  };
  const hand = (side: Side, activePose = pose) => { const [x, y] = activePose.joints[`${side}Hand`], s = side === 'left' ? 1 : -1; return <Path key={side} data-mitten={side} d={`M${x - s * 1.9} ${y - 2}Q${x - s * 2.6} ${y + 2.5} ${x} ${y + 3}Q${x + s * 2.6} ${y + 3} ${x + s * 2.3} ${y}Q${x + s * 3.8} ${y - 1} ${x + s * 2.6} ${y - 3}Q${x + s * 1.9} ${y - 3} ${x + s * 1.5} ${y - 2}Z`} fill={wear.sleeve === 'bulky' ? colors.trim : skin} strokeWidth={1.2}/>; };
  const backpack = <G transform={`translate(${a.torso[0] - (compact ? 10 : 0)} ${a.torso[1]})`}><Rect x={compact ? -9 : -12} y={compact ? -3 : -8} width={compact ? 18 : 24} height={compact ? 13 : 28} rx={7} fill="#D2A45E"/><Rect x={compact ? -6 : -8} y={compact ? 1 : 5} width={compact ? 12 : 16} height={compact ? 7 : 11} rx={3} fill="#F4CC76"/><Path d={compact ? "M-3 -3Q0 -7 3 -3" : "M-4 -8Q0 -16 4 -8"} fill="none" strokeWidth={2}/></G>;
  return <G transform={isLying(pose) ? 'translate(6 86) rotate(-90) scale(1 1)' : 'translate(0 0) rotate(0) scale(1 1)'}>

    <G stroke={ink} strokeWidth={1.35} strokeLinejoin="round" strokeLinecap="round">
    <G data-layer="rear-accessory">{look.accessory === 'backpack' && front && backpack}</G>
    <G data-layer="rear-hair"><Hair look={look} pose={pose} rear/></G>
    <G data-layer="rear-limbs">{limb('left', false)}{limb('right', false)}{!front && limb(rearArm, true)}{!front && !compact && hand(rearArm)}</G>
    <G data-layer="body"><Path d={`${compact ? `M${hx+4} ${hy+r-4}L44 ${sy+3}H36L${hx-4} ${hy+r-4}Z` : `M${hx-4} ${hy+r-4}L36 ${sy-3}Q33 ${sy-3} 29 ${sy}L33 ${sy+10}L34 ${hip-2}H46L47 ${sy+10}L51 ${sy}Q47 ${sy-3} 44 ${sy-3}L${hx+4} ${hy+r-4}Z`} ${['long-straight','long-wavy','bob','braids'].includes(look.hairStyle) ? '' : `M${hx-r+1} ${hy+7}q-5-2-4 2q0 4 4 4M${hx+r-1} ${hy+7}q5-2 4 2q0 4-4 4`}`} fill={skin}/>
      {!compact && <><Path data-head="soft-square" d={`M${hx-r} ${hy-9}Q${hx-r} ${hy-28} ${hx} ${hy-28}Q${hx+r} ${hy-28} ${hx+r} ${hy-9}L${hx+r} ${hy+11}Q${hx+r} ${hy+28} ${hx} ${hy+28}Q${hx-r} ${hy+28} ${hx-r} ${hy+11}Z`} fill={skin}/><Path d={`M${hx+24} ${hy-7}V${hy+10}Q${hx+24} ${hy+24} ${hx+4} ${hy+26}Q${hx+28} ${hy+29} ${hx+28} ${hy+11}V${hy-7}Z`} fill="#7E5142" fillOpacity={.10} strokeWidth={0}/></>}</G>
    <G data-layer="clothing"><Clothes look={look} pose={pose} colors={colors}/>{compact && look.accessory === 'backpack' && backpack}</G>
    <G data-layer="front-limbs">{front && limb(rearArm, true)}{!mealPlayback && limb(frontArm, true)}{mealPlayback?.frames.map((f, i) => <MealLayer key={i} playback={mealPlayback} index={i}>{limb(frontArm, true, characterPose(mealBase!, actionForMeal, 0, 0, f.meal, gaze))}</MealLayer>)}</G>
    { !meal && <G data-layer="held" transform={heldMirrored ? `translate(${j.rightHand[0]} ${j.rightHand[1]}) scale(-1 1) translate(-12 -12)` : `translate(${j.rightHand[0]-12} ${j.rightHand[1]-12})`}>{held}</G>}
    <G data-layer="hands">{front || compact ? <>{hand('left')}{!mealPlayback && hand('right')}</> : hand(frontArm)}</G>
    <RewardArt look={look} pose={pose} layer="neckwear"/><G data-layer="front-hair"><Hair look={look} pose={pose}/></G>
    <G data-layer="face"><Face look={look} pose={pose} expression={expression} blink={blink} gaze={gaze} meal={meal} playback={mealPlayback} sipping={actionForMeal === 'drink'}/></G>
    {meal && !mealPlayback && <G data-layer="meal-held" transform={heldMirrored ? `translate(${j.rightHand[0]} ${j.rightHand[1]}) scale(-1 1) translate(-12 -12)` : `translate(${j.rightHand[0]-12} ${j.rightHand[1]-12})`}>{held}</G>}
    {mealPlayback?.frames.map((f,i) => {
      const p = characterPose(mealBase!, actionForMeal, 0, 0, f.meal, gaze), at = p.joints.rightHand;
      return <MealLayer key={i} playback={mealPlayback} index={i}>
        <G data-layer="meal-held" transform={`translate(${at[0]} ${at[1]}) scale(${heldMirrored ? -1 : 1} 1) translate(-12 -12)`}>{f.held}</G>
        {hand('right', p)}
      </MealLayer>;
    })}
    <G data-layer="hat" transform={`translate(${a.headTop[0]} ${a.headTop[1]+(compact?0:look.hat==='flower-crown'?2.5:0)}) scale(${compact ? (look.hat==='flower-crown' ? .6 : 1) : look.hat==='flower-crown' ? 1.2 : 1.12} ${compact && look.hat==='flower-crown' ? .6 : 1})`}>
      {look.hat === 'sunhat' && (compact ? <G fill="#F4CC76"><Path d="M-11 3L-10 -2Q0 -5 10 -2L11 3Z"/><Path d="M-15 4Q0 0 15 4Q0 8-15 4Z"/></G> : <G fill="#F4CC76"><Path d="M-19 9C-19 -6 -10 -9 0 -9C10 -9 19 -6 19 9ZM-32 10C-28 5 -18 6 0 6C18 6 28 5 32 10C25 17 -25 17 -32 10Z"/><Path d="M-19 5C-10 9 10 9 19 5L19 1C10 5 -10 5 -19 1Z" fill="#E2856C" strokeWidth={.8}/></G>)}
      {look.hat === 'cap' && (compact ? <G fill={colors.secondary}><Path d="M-12 4Q-11-5 0-5Q11-5 12 4Z"/></G> : <G fill={colors.secondary}><Path d="M-25 11C-26 -7 -11 -10 0 -10C11 -10 26 -7 25 11C12 7 -12 7 -25 11ZM0 -10V7M-1.4 -10.6h2.8"/><Path d={front ? 'M-23 9C-12 5 12 5 23 9C27 12 24 16.4 20 15.6C8 13 -8 13 -20 15.6C-24 16.4 -27 12 -23 9Z' : 'M-8 6Q0 3 8 6V10.6Q0 8 -8 10.6Z'} fill={front ? colors.primary : '#FFF3DC'}/></G>)}
      {look.hat === 'flower-crown' && <G><Path d="M-19 7Q0 -1 19 7" stroke="#639477" strokeWidth={2.6} fill="none"/><Path d={crownFlowers} fill="#FFF6DE" strokeWidth={.5}/><Path d={crownHearts} fill="#F2A23C" strokeWidth={0}/></G>}
    </G>
    <RewardArt look={look} pose={pose} layer="hat"/><G data-layer="foreground-accessory"><RewardArt look={look} pose={pose} layer="accessory"/>{look.accessory === 'backpack' && (!front ? !compact && backpack : <G fill="none" stroke="#D2A45E" strokeWidth={3}><Path d={`M28 ${sy}L31 ${hip - 9}M52 ${sy}L49 ${hip - 9}`}/></G>)}
      {look.accessory === 'glasses' && front && <G fill="#E7F5ED" fillOpacity={.22} strokeWidth={1.3}><Rect x={hx - 13} y={hy + 3} width={11} height={9} rx={3}/><Rect x={hx + 2} y={hy + 3} width={11} height={9} rx={3}/><Path d={`M${hx - 2} ${hy + 6}h4M${hx - 16} ${hy + 5}h3M${hx + 13} ${hy + 5}h3`} fill="none"/></G>}
      {look.accessory === 'glasses' && !front && <Path d={`M${hx - r} ${hy + 1}l-2-2M${hx + r} ${hy + 1}l2-2`} fill="none"/>}
    </G>
  </G>{pose.id === 'lie-asleep' && !reduced && <SvgText x={38} y={12} transform="rotate(90 38 12)" fontSize={10} fill={ink}>z</SvgText>}</G>;
}
/** Static SVG; callers pre-render frames and swap opacity. Never runs a timer or worklet. */
export type IslanderProps = RigLife & {
  view?: View;
  pose?: string | number | Pose;
  look?: IslanderLook;
  size?: number;
  held?: React.ReactNode;
  reduced?: boolean;
  base?: CharacterBase;
  action?: CharacterAction;
  face?: CharacterFace | null;
  facing?: Facing;
  tilt?: number;
  limbLag?: number;
  gaze?: Gaze;
  meal?: MealFrame;
  mealPlayback?: MealPlayback;
};
export const Islander = memo(function Islander({ view = 'front', pose = view === 'back' ? 0 : 'idle', look = defaultLook, size = 120, held, reduced = false, base, action = null, face, facing = 'right', tilt = 0, limbLag = 0, mood, clock, seed, blink, breath, gaze, meal, mealPlayback }: IslanderProps) {
  if (base) {
    const life = rigIdle(clock, seed, reduced);
    const options = { action, tilt, limbLag, reduced, meal, gaze, breath: breath ?? life.breath };
    const resolved = characterPose(base, action, reduced ? 0 : limbLag, tilt * (facing === 'left' ? -1 : 1), meal, gaze);
    const box = islanderAnchors(base, facing, options).bounds, origin = islanderOrigin(base);
    const scale = size / 132;
    return <Svg {...islanderSurface(box, scale)} accessible={false}>
      <G data-rig="islander" data-base={base} data-action={action ?? 'none'} transform={rigTransform(facing, options)}>
        <G transform={`translate(${-origin[0]} ${-origin[1]})`}>
          <IslanderShape pose={resolved} look={look} held={held} reduced={reduced} gaze={gaze} meal={meal} mealPlayback={mealPlayback} mealBase={base} actionForMeal={action} expression={meal?.bite ? 'anticipate' : rigFace(face, mood, action)} heldMirrored={facing === 'left'} blink={!reduced && (blink ?? life.blink)}/>
        </G>
      </G>
    </Svg>;
  }
  const resolved = resolvePose(view, pose), box = poseBox(resolved), scale = size / 132;
  return <Svg key={`${view}:${resolved.id}`} {...islanderSurface(box, scale)} accessible={false}><IslanderShape pose={resolved} look={look} held={held} reduced={reduced}/></Svg>;
});
/** Separate foreground prop: does not distort or hide the character's skeleton. */
export const IslanderDesk = memo(function IslanderDesk({ size = 120 }: { size?: number }) {
  return <Svg width={size * 80 / 132} height={size} viewBox="0 0 80 132" accessible={false}><G stroke={ink} strokeWidth={1.35} strokeLinejoin="round"><Path d="M13 90H67L72 97H8Z" fill="#D2A45E"/><Path d="M15 97V130H20V97M60 97V130H65V97" fill="#B98458"/><Path d="M29 89L44 87L51 92L36 94Z" fill="#FFF7DE"/><Path d="M48 89L53 81" stroke="#364D79" strokeWidth={2}/></G></Svg>;
});
