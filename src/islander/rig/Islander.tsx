import React, { memo, useId } from 'react';
import Svg, * as RNSvg from 'react-native-svg';
import { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { buildFor, defaultLook, normalizeLook, outfitPalettes, outfitDefaults, skinTones, type IslanderLook } from '../look';
import { resolvePose, isLying, poseBox, type Point, type Pose, type Side, type View } from './poses';
import { anchorsFor } from './wardrobe';
import { characterPose, rigFace, rigIdle, type CharacterAction, type CharacterBase, type CharacterFace, type Facing, type RigLife, type Gaze, type MealFrame, type MealPlayback, type CarryGrip } from './character';
import { islanderAnchors, islanderOrigin, islanderSurface, rigTransform } from './anchors';
import { RewardArt } from './Rewards';
import { Hair } from './Hair';
import { mix } from './hairArt';
import { MealMorph } from './MealLayer';
import { Face } from './Face';
import { Shoes } from './Shoes';
import { buildShape, Clothes, garmentFor, toneOf } from './Clothes';

const svgEl = <K extends keyof typeof RNSvg>(k: K): (typeof RNSvg)[K] | undefined => {
  try { return Object.prototype.hasOwnProperty.call(RNSvg, k) ? RNSvg[k] : undefined; } catch { return undefined; }
};
const Defs = svgEl('Defs') as typeof RNSvg.Defs, LinearGradient = svgEl('LinearGradient') as typeof RNSvg.LinearGradient, RadialGradient = svgEl('RadialGradient') as typeof RNSvg.RadialGradient, Stop = svgEl('Stop') as typeof RNSvg.Stop;
const hasGradients = Boolean(Defs && LinearGradient && RadialGradient && Stop);
const ink = '#3B2418';
const crownSpots = [[-16.8, 5.4], [-8.5, 1.8], [0, 0.6], [8.5, 1.8], [16.8, 5.4]] as const;
const crownPetals = (spots: readonly (readonly [number, number])[]) =>
  spots.map(([x, y]) => [0, 1, 2, 3, 4].map(i => { const t = i * Math.PI * .4 - Math.PI / 2, u = t + .92, w = t - .92, r = 4.7; return `M${x} ${y}Q${(x + Math.cos(u) * r).toFixed(2)} ${(y + Math.sin(u) * r).toFixed(2)} ${(x + Math.cos(t) * r).toFixed(2)} ${(y + Math.sin(t) * r).toFixed(2)}Q${(x + Math.cos(w) * r).toFixed(2)} ${(y + Math.sin(w) * r).toFixed(2)} ${x} ${y}Z`; }).join('')).join('');
const crownCream = crownPetals([crownSpots[0], crownSpots[2], crownSpots[4]]);
const crownCoral = crownPetals([crownSpots[1], crownSpots[3]]);
const crownAll = crownCream + crownCoral;
const crownLeaves = 'M-21 6.4Q-18.8 1.6 -14.8 4.4Q-17.6 7.8 -21 6.4ZM21 6.4Q18.8 1.6 14.8 4.4Q17.6 7.8 21 6.4ZM-13 2.4Q-11.2 -2.2 -7.4 1.2Q-10.2 3.8 -13 2.4ZM13 2.4Q11.2 -2.2 7.4 1.2Q10.2 3.8 13 2.4ZM-4.8 .8Q-2.2 -3.4 0 -1.2Q-2.2 2.2 -4.8 .8ZM4.8 .8Q2.2 -3.4 0 -1.2Q2.2 2.2 4.8 .8Z';

/** A closed, unoutlined fabric cap covers the top of a continuous limb. */
export function boneShape(a: Point, b: Point, r: number, end = r): string {
  const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.max(.001, Math.hypot(dx, dy)), nx = -dy / length, ny = dx / length, ux = dx / length, uy = dy / length;
  return `M${a[0] + nx * r} ${a[1] + ny * r}L${b[0] + nx * end} ${b[1] + ny * end}Q${b[0] + ux * end * 1.8} ${b[1] + uy * end * 1.8} ${b[0] - nx * end} ${b[1] - ny * end}L${a[0] - nx * r} ${a[1] - ny * r}Q${a[0] - ux * r * 1.8} ${a[1] - uy * r * 1.8} ${a[0] + nx * r} ${a[1] + ny * r}Z`;
}
/** Flat mid-thigh hem, perpendicular to the thigh; no rounded knee cap. */
export function shortsShape(a: Point, knee: Point, reach = .5, width = 4): string {
  const b = between(a, knee, reach), length = Math.max(.001, Math.hypot(knee[0]-a[0], knee[1]-a[1]));
  const nx = -(knee[1]-a[1])/length, ny = (knee[0]-a[0])/length;
  return `M${a[0]+nx*(width+.45)} ${a[1]+ny*(width+.45)}L${b[0]+nx*(width+.15)} ${b[1]+ny*(width+.15)}L${b[0]-nx*(width+.15)} ${b[1]-ny*(width+.15)}L${a[0]-nx*(width+.45)} ${a[1]-ny*(width+.45)}Z`;
}
/** A sleeve is cut from the garment: round over the shoulder, with a straight hem on the arm. */
export function sleeveShape(a: Point, end: Point, top: number, hem: number): string {
  const dx = end[0]-a[0], dy = end[1]-a[1], length = Math.max(.001, Math.hypot(dx, dy)), nx = -dy/length, ny = dx/length, ux = dx/length, uy = dy/length;
  return `M${a[0]+nx*top} ${a[1]+ny*top}L${end[0]+nx*hem} ${end[1]+ny*hem}L${end[0]-nx*hem} ${end[1]-ny*hem}L${a[0]-nx*top} ${a[1]-ny*top}Q${a[0]-ux*top*1.85} ${a[1]-uy*top*1.85} ${a[0]+nx*top} ${a[1]+ny*top}Z`;
}
/** One closed organic storybook contour per limb: gentle fullness above and cozy taper to wrist/ankle. */
export function limbShape(a: Point, b: Point, c: Point, r: number, tip: number): string {
  const normal = (p: Point, q: Point): Point => { const d = Math.max(.001, Math.hypot(q[0]-p[0], q[1]-p[1])); return [-(q[1]-p[1])/d, (q[0]-p[0])/d]; };
  const n = normal(a,b), m = normal(b,c), mid = (r + tip) / 2;
  const edge = (p: Point, v: Point, w: number): string => `${p[0]+v[0]*w} ${p[1]+v[1]*w}`;
  const upperMid = between(a, b, .45), before = between(a,b,.78), after = between(b,c,.22);
  const calf = between(b,c,.54);
  const upperOut = `Q${edge(upperMid,n,r*1.08)} ${edge(before,n,mid)}`;
  const upperBack = `Q${edge(upperMid,n,-r*1.08)} ${edge(a,n,-r)}`;
  const shin = (sign: number) => r > 3.2 ? `Q${edge(calf,m,sign*mid*1.16)} ${edge(c,m,sign*tip)}` : `Q${edge(calf,m,sign*mid*1.04)} ${edge(c,m,sign*tip)}`;
  const reverseShin = r > 3.2 ? `Q${edge(calf,m,-mid*1.16)} ${edge(after,m,-mid)}` : `Q${edge(calf,m,-mid*1.04)} ${edge(after,m,-mid)}`;
  const turn: Point = [(n[0]+m[0])/2,(n[1]+m[1])/2];
  // A sharp bend pinches on its inner side: meet at one crease so the outline cannot loop over itself.
  const dot = n[0]*m[0]+n[1]*m[1], cross = n[0]*m[1]-n[1]*m[0], sharp = dot < .35, turnLength = Math.max(.001, Math.hypot(turn[0], turn[1]));
  const crease = (sign: number) => `${b[0]+turn[0]/turnLength*sign*mid*1.05} ${b[1]+turn[1]/turnLength*sign*mid*1.05}`;
  const outward = sharp && cross > 0 ? `L${crease(1)}L${edge(between(b,c,.34),m,mid)}` : `${upperOut}Q${edge(b,turn,mid*.86)} ${edge(after,m,mid)}`;
  return `M${edge(a,n,r)}${outward}${shin(1)}Q${c[0]+m[1]*tip*1.55} ${c[1]-m[0]*tip*1.55} ${edge(c,m,-tip)}${sharp && cross < 0 ? `L${edge(between(b,c,.34),m,-mid)}` : reverseShin}${sharp && cross < 0 ? `L${crease(-1)}L${edge(a,n,-r)}` : `Q${edge(b,turn,-mid*.86)} ${edge(before,n,-mid)}${upperBack}`}Q${a[0]-n[1]*r*1.05} ${a[1]+n[0]*r*1.05} ${edge(a,n,r)}Z`;
}
const between = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function IslanderShape({ pose, look: input = defaultLook, held, reduced = false, expression, blink = false, heldMirrored = false, gaze, meal, mealPlayback, mealBase, actionForMeal = null, carryGrip, holdPose }: { pose: Pose; look?: IslanderLook; held?: React.ReactNode; reduced?: boolean; expression?: import('./poses').Expression; blink?: boolean; heldMirrored?: boolean; gaze?: Gaze; meal?: MealFrame; mealPlayback?: MealPlayback; mealBase?: CharacterBase; actionForMeal?: CharacterAction; carryGrip?:CarryGrip; holdPose?:Pose }) {
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const look = normalizeLook(input), j = pose.joints, a = anchorsFor(pose), compact = !!pose.compact, front = pose.view === 'front';
  const skin = skinTones[look.skinTone], colors = look.palette ? outfitPalettes[look.palette] : outfitDefaults[look.outfit];
  const darkSkin = look.skinTone === 'cocoa' || look.skinTone === 'earth', lineInk = darkSkin ? '#231512' : ink;
  const [hx, hy] = j.head, r = compact ? 12 : 28, sy = j.leftShoulder[1], hip = j.leftHip[1];
  const wear = garmentFor(look), shape = buildShape(buildFor(look));
  const longSleeves = ['long', 'billow', 'bulky'].includes(wear.sleeve), longLegs = wear.legs === 'long', sleeveFill = toneOf(wear.sleeveTone, colors);
  const legFill = wear.legTone === 'primary' ? colors.primary : colors.secondary;
  const rearArm: Side = !front && !compact && j.rightHand[1] < j.leftHand[1] ? 'right' : 'left';
  const frontArm: Side = rearArm === 'left' ? 'right' : 'left';
  const useGrad = hasGradients && front && !compact;
  const skinKey = skin.slice(1);
  const skinLight = mix(skin, '#FFF7E8', darkSkin ? .16 : .26);
  const skinShade = mix(skin, darkSkin ? '#26110B' : '#A96144', darkSkin ? .30 : .22);
  const headFill = useGrad ? `url(#${uid}-sk-${skinKey})` : skin;
  const limbSkinFill = useGrad ? `url(#${uid}-lm-${skinKey})` : skin;

  const limb = (side: Side, arm: boolean, activePose = pose) => {
    const j = activePose.joints;
    // A build widens or narrows the shoulder; the arm bends to reach the same hand joint that held props and Home anchors use.
    const reach = front && arm ? shape.armShift * (side === 'left' ? 1 : -1) : 0, joint = (p: Point, t: number): Point => [p[0] + reach * t, p[1]];
    const start = joint(j[`${side}${arm ? 'Shoulder' : 'Hip'}`], 1), middle = joint(j[`${side}${arm ? 'Elbow' : 'Knee'}`], .6), end = j[`${side}${arm ? 'Hand' : 'Foot'}`];
    const radius = arm ? shape.arm + (wear.sleeve === 'bulky' ? 1 : wear.sleeve === 'billow' ? .4 : 0) : shape.leg + (wear.bottom === 'space' ? 1 : 0), tip = arm ? shape.armTip : shape.legTip;
    const sleeveEnd = between(start, middle, wear.sleeve === 'cap' ? .36 : front ? .62 : .52);
    const cuff = between(middle,end,.82), cuffLength = Math.max(.001,Math.hypot(end[0]-middle[0],end[1]-middle[1]));
    const cuffX = -(end[1]-middle[1])/cuffLength*2.9, cuffY = (end[0]-middle[0])/cuffLength*2.9;
    const cuffLine = arm && longSleeves ? `M${cuff[0]+cuffX} ${cuff[1]+cuffY}L${cuff[0]-cuffX} ${cuff[1]-cuffY}` : '';
    const stance = front && !arm ? shape.legShift * (side === 'left' ? -1 : 1) : 0;
    const legCut = wear.bottom === 'board' ? { reach: .95, width: shape.leg + 1.0 } : wear.bottom === 'cargo' ? { reach: .74, width: shape.leg + .85 } : wear.bottom === 'breeches' ? { reach: 1.02, width: shape.leg + 1.2 } : wear.bottom === 'none' || wear.bottom === 'skirt' ? { reach: .36, width: shape.leg - .1 } : { reach: .56, width: shape.leg + .75 };
    return <G key={`${side}${arm}`} data-stance={stance} transform={`translate(${stance} 0) rotate(0) scale(1 1)`}>
      <Path data-limb={`${side}-${arm ? 'arm' : 'leg'}`} d={limbShape(start, middle, !arm && longLegs ? between(middle, end, .9) : end, radius, tip + (arm || !longLegs ? 0 : .4))+cuffLine} fill={arm ? (longSleeves ? sleeveFill : limbSkinFill) : longLegs ? legFill : limbSkinFill}/>
      {arm && !longSleeves && wear.sleeve !== 'none' && <Path data-garment="sleeve" d={sleeveShape(start, wear.sleeve === 'puff' ? between(start, middle, .52) : sleeveEnd, radius + (wear.sleeve === 'puff' ? 2.3 : .95), radius + (wear.sleeve === 'puff' ? 1.5 : .75))} fill={sleeveFill}/>}
      {arm && wear.band && !longSleeves && <Path d={shortsShape(between(start, sleeveEnd, .72), sleeveEnd, 1, radius + .75)} fill={colors.trim} strokeWidth={.8}/>}
      {!arm && !longLegs && wear.bottom !== 'breeches' && <Path data-garment="shorts" d={shortsShape(start, middle, legCut.reach, legCut.width)} fill={wear.bottom === 'none' ? colors.primary : colors.secondary}/>}
      {!arm && wear.bottom === 'board' && (() => { const low = between(start, middle, legCut.reach-.1), high = between(start, middle, .22), d = Math.max(.001, Math.hypot(middle[0]-start[0], middle[1]-start[1])), nx = -(middle[1]-start[1])/d*(side === 'left' ? 1 : -1)*(legCut.width-2.6), ny = (middle[0]-start[0])/d*(side === 'left' ? 1 : -1)*(legCut.width-2.6); return <Path d={`M${high[0]+nx} ${high[1]+ny}L${low[0]+nx} ${low[1]+ny}`} fill="none" stroke={colors.trim} strokeWidth={1.6}/>; })()}
      {arm && wear.top === 'varsity' && <Path d={shortsShape(between(middle, end, .7), between(middle, end, .9), 1, radius-.3)} fill={colors.primary} strokeWidth={.9}/>}
      {arm && wear.layered && <Path data-garment="sleeve" d={sleeveShape(start, sleeveEnd, radius + .95, radius + .75)} fill={colors.primary}/>}
      {!arm && wear.bottom === 'breeches' && <Path data-garment="breeches" d={shortsShape(start, middle, legCut.reach, legCut.width)} fill={colors.secondary}/>}
      {wear.bottom === 'space' && !arm && <Path d={shortsShape(between(start, middle, .86), between(start, middle, 1.14), .9, radius+.2)} fill={colors.trim} strokeWidth={.9}/>}
      {wear.sleeve === 'billow' && arm && <Path d={shortsShape(between(start, middle, .28), between(start, middle, .52), 1, radius-.5) + shortsShape(between(start, middle, .62), between(start, middle, .86), 1, radius-.7) + (front ? shortsShape(between(middle, end, .24), between(middle, end, .5), 1, radius-1) : '')} fill={colors.primary} strokeWidth={0}/>}
      {wear.sleeve === 'bulky' && arm && <Path d={shortsShape(between(start, middle, .86), between(start, middle, 1.14), .9, radius+.2)} fill={colors.trim} strokeWidth={.9}/>}
      {!arm && <Shoes look={look} foot={end} back={!front} lifted={end[1]<123} compact={compact}/>}
      {arm && side === 'right' && look.accessory === 'calculator-watch' && <RewardArt look={look} pose={activePose} layer="wrist"/>}
    </G>;
  };

  /** Soft rounded cozy storybook hand; first Q endpoint stays at [x, y + 3] for hand-anchor contract. */
  const hand = (side: Side, activePose = pose) => {
    const [x, y] = activePose.joints[`${side}Hand`], s = side === 'left' ? 1 : -1;
    return <Path key={side} data-mitten={side} d={`M${x - s * 2.2} ${y - 2.2}Q${x - s * 3.1} ${y + 2.6} ${x} ${y + 3}Q${x + s * 3.0} ${y + 3.2} ${x + s * 2.6} ${y + .1}Q${x + s * 4.2} ${y - .8} ${x + s * 3.0} ${y - 3.1}Q${x + s * 2.0} ${y - 3.4} ${x + s * 1.4} ${y - 2.1}Q${x} ${y - 2.7} ${x - s * 2.2} ${y - 2.2}Z`} fill={wear.sleeve === 'bulky' ? colors.trim : skin} strokeWidth={1.2}/>;
  };

  const earsVisible = !['long-straight','long-wavy','bob','braids'].includes(look.hairStyle);
  const backpack = <G transform={`translate(${a.torso[0] - (compact ? 10 : 0)} ${a.torso[1]})`}>
    <Rect x={compact ? -9 : -12.5} y={compact ? -3 : -8.5} width={compact ? 18 : 25} height={compact ? 13 : 29} rx={7.5} fill="#D59A4B"/>
    {!compact && <Rect x={-11} y={-2.5} width={22} height={7} rx={3.5} fill="#E8B86A" strokeWidth={0}/>}
    <Rect x={compact ? -6 : -8.5} y={compact ? 1 : 5} width={compact ? 12 : 17} height={compact ? 7 : 11.5} rx={3.8} fill="#F7D98B"/>
    <Path d={compact ? "M-3 -3Q0 -7 3 -3" : "M-4.4 -8.5Q0 -15.5 4.4 -8.5M-11 0Q0 4.6 11 0M-3 8.2h6M-6.2 12.2h12.4"} fill="none" strokeWidth={compact ? 1.9 : 1.55}/>
  </G>;

  // Soft cheek-heavy rounded storybook head contour: crown aligns at ±27.6/-9..0/-28 for hats & buzz-cut, cheeks swell warmly to ±29.6.
  const headPath = `M${hx-27.6} ${hy-9}C${hx-27.6} ${hy-21.5} ${hx-16.5} ${hy-28} ${hx} ${hy-28}C${hx+16.5} ${hy-28} ${hx+27.6} ${hy-21.5} ${hx+27.6} ${hy-9}C${hx+28.2} ${hy-1} ${hx+30.2} ${hy+5.8} ${hx+29.4} ${hy+12.8}C${hx+28.2} ${hy+22.4} ${hx+15.6} ${hy+27.6} ${hx} ${hy+27.6}C${hx-15.6} ${hy+27.6} ${hx-28.2} ${hy+22.4} ${hx-29.4} ${hy+12.8}C${hx-30.2} ${hy+5.8} ${hx-28.2} ${hy-1} ${hx-27.6} ${hy-9}Z`;
  // Scale ear coordinates proportionally by r / 28 around (hx, hy) so compact rolling poses (r = 12) stay attached to the head.
  const earScale = r / 28, ex = (dx: number) => +(hx + dx * earScale).toFixed(2), ey = (dy: number) => +(hy + dy * earScale).toFixed(2);
  const earsPath = earsVisible ? `M${ex(-28.5)} ${ey(4.4)}C${ex(-34.0)} ${ey(3.8)} ${ex(-35.0)} ${ey(10.4)} ${ex(-32.6)} ${ey(14.0)}C${ex(-31.0)} ${ey(16.4)} ${ex(-28.4)} ${ey(15.4)} ${ex(-27.8)} ${ey(13.2)}M${ex(28.5)} ${ey(4.4)}C${ex(34.0)} ${ey(3.8)} ${ex(35.0)} ${ey(10.4)} ${ex(32.6)} ${ey(14.0)}C${ex(31.0)} ${ey(16.4)} ${ex(28.4)} ${ey(15.4)} ${ex(27.8)} ${ey(13.2)}` : '';
  const earInnerShade = earsVisible ? `M${ex(-29.2)} ${ey(7.2)}Q${ex(-32.4)} ${ey(9.4)} ${ex(-29.4)} ${ey(12.4)}Q${ex(-30.6)} ${ey(9.8)} ${ex(-29.2)} ${ey(7.2)}ZM${ex(29.2)} ${ey(7.2)}Q${ex(32.4)} ${ey(9.4)} ${ex(29.4)} ${ey(12.4)}Q${ex(30.6)} ${ey(9.8)} ${ex(29.2)} ${ey(7.2)}Z` : '';

  return <G transform={isLying(pose) ? 'translate(6 86) rotate(-90) scale(1 1)' : 'translate(0 0) rotate(0) scale(1 1)'}>
    {useGrad && <Defs>
      <RadialGradient id={`${uid}-sk-${skinKey}`} cx="36%" cy="28%" r="74%" fx="34%" fy="24%">
        <Stop offset="0%" stopColor={skinLight}/>
        <Stop offset="56%" stopColor={skin}/>
        <Stop offset="100%" stopColor={skinShade}/>
      </RadialGradient>
      <LinearGradient id={`${uid}-lm-${skinKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor={skinLight}/>
        <Stop offset="55%" stopColor={skin}/>
        <Stop offset="100%" stopColor={skinShade}/>
      </LinearGradient>
      <LinearGradient id={`${uid}-straw`} x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#FCE09A"/>
        <Stop offset="55%" stopColor="#F1C568"/>
        <Stop offset="100%" stopColor="#D6A146"/>
      </LinearGradient>
    </Defs>}
    <G stroke={lineInk} strokeWidth={1.35} strokeLinejoin="round" strokeLinecap="round">
    <G data-layer="rear-accessory">{look.accessory === 'backpack' && front && backpack}</G>
    <G data-layer="rear-hair"><Hair look={look} pose={pose} rear/></G>
    <G data-layer="rear-limbs">{limb('left', false)}{limb('right', false)}{!front && limb(rearArm, true)}{!front && !compact && hand(rearArm)}</G>
    <G data-layer="body">
      <Path d={`${compact ? `M${hx+4} ${hy+r-4}L44 ${sy+3}H36L${hx-4} ${hy+r-4}Z` : `M${hx-4} ${hy+r-4}L36 ${sy-3}Q33 ${sy-3} 29 ${sy}L33 ${sy+10}L34 ${hip-2}H46L47 ${sy+10}L51 ${sy}Q47 ${sy-3} 44 ${sy-3}L${hx+4} ${hy+r-4}Z`} ${earsPath}`} fill={skin}/>
      {!compact && <>
        <Path data-head="soft-square" d={headPath} fill={headFill}/>
        <Path d={`M${hx+23.8} ${hy-7}C${hx+25.4} ${hy+2} ${hx+26.4} ${hy+11} ${hx+23.4} ${hy+17.4}C${hx+19.2} ${hy+23.6} ${hx+10} ${hy+26.2} ${hx-4} ${hy+26.6}C${hx+12} ${hy+28.4} ${hx+26.4} ${hy+24.2} ${hx+29.0} ${hy+13.2}C${hx+30.0} ${hy+6.4} ${hx+28.2} ${hy-1} ${hx+27.2} ${hy-7}Z${front ? `M${hx-4.8} ${hy+26.2}Q${hx} ${hy+30.6} ${hx+4.8} ${hy+26.2}L${hx+4.4} ${hy+31.8}Q${hx} ${hy+34.0} ${hx-4.4} ${hy+31.8}Z${earInnerShade}` : ''}`} fill="#6B3624" fillOpacity={darkSkin ? .22 : .13} strokeWidth={0}/>
        {front && <Path d={`M${hx-22.8} ${hy-5.5}C${hx-22.2} ${hy-18.5} ${hx-13} ${hy-24.8} ${hx-3.5} ${hy-25.0}C${hx-13.5} ${hy-21.5} ${hx-19.5} ${hy-15.5} ${hx-20.4} ${hy-5.5}ZM${hx-23.5} ${hy+7.5}Q${hx-26.2} ${hy+12.5} ${hx-21.6} ${hy+17.4}Q${hx-23.4} ${hy+12.2} ${hx-23.5} ${hy+7.5}Z`} fill="#FFF8E8" fillOpacity={darkSkin ? .15 : .28} strokeWidth={0}/>}
      </>}
    </G>
    <G data-layer="clothing"><Clothes look={look} pose={pose} colors={colors}/>{compact && look.accessory === 'backpack' && backpack}</G>
    <G data-layer="front-limbs">{front && limb(rearArm, true)}{!mealPlayback && (carryGrip && holdPose ? <>{carryGrip.renderLayer(false,limb(frontArm,true))}{carryGrip.renderLayer(true,limb(frontArm,true,holdPose))}</>:limb(frontArm,true))}{mealPlayback && <MealMorph playback={mealPlayback}>{f=>limb(frontArm, true, characterPose(mealBase!, actionForMeal, 0, 0, f.meal, gaze))}</MealMorph>}</G>
    { !meal && <G data-layer="held" transform={heldMirrored ? `translate(${j.rightHand[0]} ${j.rightHand[1]}) scale(-1 1) translate(-12 -12)` : `translate(${j.rightHand[0]-12} ${j.rightHand[1]-12})`}>{held}</G>}
    <G data-layer="hands">{front || compact ? <>{hand('left')}{!mealPlayback && (carryGrip && holdPose ? <>{carryGrip.renderLayer(false,hand('right'))}{carryGrip.renderLayer(true,hand('right',holdPose))}</>:hand('right'))}</> : hand(frontArm)}</G>
    <RewardArt look={look} pose={pose} layer="neckwear"/><G data-layer="front-hair"><Hair look={look} pose={pose}/></G>
    <G data-layer="face"><Face look={look} pose={pose} expression={expression} blink={blink} gaze={gaze} meal={meal} playback={mealPlayback} sipping={actionForMeal === 'drink'}/></G>
    {meal && !mealPlayback && <G data-layer="meal-held" transform={heldMirrored ? `translate(${j.rightHand[0]} ${j.rightHand[1]}) scale(-1 1) translate(-12 -12)` : `translate(${j.rightHand[0]-12} ${j.rightHand[1]-12})`}>{held}</G>}
    {mealPlayback && <MealMorph playback={mealPlayback}>{f=>hand('right',characterPose(mealBase!,actionForMeal,0,0,f.meal,gaze))}</MealMorph>}
    <G data-layer="hat" transform={`translate(${a.headTop[0]} ${a.headTop[1]+(compact?0:look.hat==='flower-crown'?2.6:0)}) scale(${compact ? (look.hat==='flower-crown' ? .6 : 1) : look.hat==='flower-crown' ? 1.2 : 1.12} ${compact && look.hat==='flower-crown' ? .6 : 1})`}>
      {look.hat === 'sunhat' && (compact ? <G fill="#F6CF78"><Path d="M-11 3L-10 -2Q0 -5 10 -2L11 3Z"/><Path d="M-15 4Q0 0 15 4Q0 8-15 4Z"/></G> : <G fill={useGrad ? `url(#${uid}-straw)` : '#F6CF78'}>
        <Path d="M-32.4 10.2C-28 4.4 -18 5.2 0 5.2C18 5.2 28 4.4 32.4 10.2C25.5 17.8 -25.5 17.8 -32.4 10.2ZM-19.5 8.8C-19.5 -7.2 -10.4 -9.8 0 -9.8C10.4 -9.8 19.5 -7.2 19.5 8.8Z"/>
        {front && <Path d="M-14 -5Q-3 -9 9.5 -6.8Q-2 -5 -14 -5Z" fill="#FFF7DC" fillOpacity={.68} strokeWidth={0}/>}
        <Path d="M-15 -6L11 3M-7 -9L17 0M-16 2L7 -9M-5 4L15 -6M-27 10.4Q0 14.8 27 10.4" fill="none" stroke="#B6843E" strokeWidth={.8}/>
        <Path d="M-19.5 5.4C-10 9.4 10 9.4 19.5 5.4L19.5 1.2C10 5.2 -10 5.2 -19.5 1.2ZM13.5 3.6Q19.5 .2 19.2 5.6Q16.2 6.6 13.5 3.6Z" fill="#EA755C" strokeWidth={.85}/>
      </G>)}
      {look.hat === 'cap' && (compact ? <G fill={colors.secondary}><Path d="M-12 4Q-11-5 0-5Q11-5 12 4Z"/></G> : <G fill={colors.secondary}>
        <Path d="M-25 11C-26 -7 -11 -10 0 -10C11 -10 26 -7 25 11C12 7 -12 7 -25 11ZM0 -10V7M-2 -10.6Q0 -12.4 2 -10.6Z"/>
        {front && <Path d="M-17.5 -3.6Q-8 -8.8 3.5 -7.8Q-6 -5.2 -17.5 -3.6Z" fill="#FFFFFF" fillOpacity={.26} strokeWidth={0}/>}
        <Path d={front ? 'M-23.5 9C-12 4.8 12 4.8 23.5 9C27.5 12.2 24.5 16.6 20 15.8C8 13 -8 13 -20 15.8C-24.5 16.6 -27.5 12.2 -23.5 9Z' : 'M-8 6Q0 3 8 6V10.6Q0 8 -8 10.6Z'} fill={front ? colors.primary : '#FFF4DE'}/>
        {front && <Path d="M-19 11.4Q0 8.6 19 11.4" fill="none" stroke="#FFFFFF" strokeOpacity={.32} strokeWidth={.95}/>}
      </G>)}
      {look.hat === 'flower-crown' && <G>
        <Path d={front ? 'M-19.5 7Q0 -1.2 19.5 7' : 'M-19.5 7Q0 -1.2 19.5 7M-21 5l2.5 1.5M-12 2.4l1-2.2M12 2.4l-1-2.2M21 5l-2.5 1.5'} stroke="#538D63" strokeWidth={2.6} fill="none"/>
        {front && <Path d={crownLeaves} fill="#6CA97B" strokeWidth={.55}/>}
        {front ? <><Path d={crownCream} fill="#FFF8E6" strokeWidth={.55}/><Path d={crownCoral} fill="#FF9F89" strokeWidth={.55}/></> : <Path d={crownAll} fill="#FFF8E6" strokeWidth={.55}/>}
        {crownSpots.map(([cx, cy], i) => <Circle key={i} cx={cx} cy={cy} r={1.35} fill="#F5A631" strokeWidth={0}/>)}
      </G>}
    </G>
    <RewardArt look={look} pose={pose} layer="hat"/><G data-layer="foreground-accessory"><RewardArt look={look} pose={pose} layer="accessory"/>{look.accessory === 'backpack' && (!front ? !compact && backpack : <G fill="none" stroke="#D59A4B" strokeWidth={3.1}><Path d={`M28 ${sy}L31 ${hip - 9}M52 ${sy}L49 ${hip - 9}`}/></G>)}
      {look.accessory === 'glasses' && front && <G fill="#FFF4DC" fillOpacity={.18} stroke="#4E2816" strokeWidth={2.35}>
        <Rect x={hx - 17.2} y={hy + 0} width={14.0} height={12.8} rx={6.4}/>
        <Rect x={hx + 3.2} y={hy + 0} width={14.0} height={12.8} rx={6.4}/>
        <Path d={`M${hx - 3.2} ${hy + 5.6}Q${hx} ${hy + 4.2} ${hx + 3.2} ${hy + 5.6}M${hx - 20.6} ${hy + 4.8}L${hx - 17.2} ${hy + 5.4}M${hx + 17.2} ${hy + 5.4}L${hx + 20.6} ${hy + 4.8}`} fill="none"/>
        <G fill="none" stroke="#D88E4A" strokeWidth={1.05}>
          <Rect x={hx - 16.95} y={hy + .25} width={13.5} height={12.3} rx={6.15}/>
          <Rect x={hx + 3.45} y={hy + .25} width={13.5} height={12.3} rx={6.15}/>
          <Path d={`M${hx - 3.2} ${hy + 5.6}Q${hx} ${hy + 4.2} ${hx + 3.2} ${hy + 5.6}M${hx - 20.2} ${hy + 4.9}L${hx - 17.2} ${hy + 5.4}M${hx + 17.2} ${hy + 5.4}L${hx + 20.2} ${hy + 4.9}`} strokeWidth={.95}/>
        </G>
        <Path d={`M${hx - 15.6} ${hy + 2.0}q2.8 -1.6 5.4 -.7M${hx + 10.2} ${hy + 1.3}q2.6 -.9 5.4 .7`} fill="none" stroke="#F0B168" strokeWidth={1.05}/>
        <Path d={`M${hx - 14.2} ${hy + 3.0}l3.2-1.8M${hx + 6.2} ${hy + 3.0}l3.2-1.8`} fill="none" stroke="#FFFFFF" strokeOpacity={.85} strokeWidth={1.25}/>
      </G>}
      {look.accessory === 'glasses' && !front && <Path d={`M${hx - r} ${hy + 1}l-2-2M${hx + r} ${hy + 1}l2-2`} fill="none"/>}
    </G>
  </G>{pose.id === 'lie-asleep' && !reduced && <SvgText x={38} y={12} transform="rotate(90 38 12)" fontSize={10} fill={lineInk}>z</SvgText>}</G>;
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
  carryGrip?:CarryGrip;
};
export const Islander = memo(function Islander({ view = 'front', pose = view === 'back' ? 0 : 'idle', look = defaultLook, size = 120, held, reduced = false, base, action = null, face, facing = 'right', tilt = 0, limbLag = 0, mood, clock, seed, blink, breath, gaze, meal, mealPlayback, carryGrip }: IslanderProps) {
  if (base) {
    const life = rigIdle(clock, seed, reduced);
    const options = { action, tilt, limbLag, reduced, meal, gaze, breath: breath ?? life.breath };
    const resolved = characterPose(base, action, reduced ? 0 : limbLag, tilt * (facing === 'left' ? -1 : 1), meal, gaze);
    const box = islanderAnchors(base, facing, options).bounds, origin = islanderOrigin(base);
    const scale = size / 132;
    return <Svg {...islanderSurface(box, scale)} accessible={false}>
      <G data-rig="islander" data-base={base} data-action={action ?? 'none'} transform={rigTransform(facing, options)}>
        <G transform={`translate(${-origin[0]} ${-origin[1]})`}>
          <IslanderShape pose={resolved} look={look} held={held} carryGrip={carryGrip} holdPose={carryGrip?characterPose(base,'hold',reduced?0:limbLag,tilt*(facing==='left'?-1:1),undefined,gaze):undefined} reduced={reduced} gaze={gaze} meal={meal} mealPlayback={mealPlayback} mealBase={base} actionForMeal={action} expression={meal?.bite ? 'anticipate' : rigFace(face, mood, action)} heldMirrored={facing === 'left'} blink={!reduced && (blink ?? life.blink)}/>
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
