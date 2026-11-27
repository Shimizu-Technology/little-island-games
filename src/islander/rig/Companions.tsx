import React, { useId } from 'react';
import Svg, * as RNSvg from 'react-native-svg';
import { Circle, Ellipse, G, Path } from 'react-native-svg';
import { companionContacts, crabAnchors, crabOrigin, pipAnchors, pipOrigin, rigTransform } from './anchors';
import { clampRig, rigFace, rigIdle, type CharacterAction, type CharacterBase, type CharacterFace, type Facing, type RigLife, type Gaze, type MealFrame, type MealPlayback, type CarryGrip } from './character';
import { MealLayer, MealMorph, mealGroups } from './MealLayer';

const svgEl = <K extends keyof typeof RNSvg>(k: K): (typeof RNSvg)[K] | undefined => {
  try { return Object.prototype.hasOwnProperty.call(RNSvg, k) ? RNSvg[k] : undefined; } catch { return undefined; }
};
const Defs = svgEl('Defs') as typeof RNSvg.Defs, LinearGradient = svgEl('LinearGradient') as typeof RNSvg.LinearGradient, RadialGradient = svgEl('RadialGradient') as typeof RNSvg.RadialGradient, Stop = svgEl('Stop') as typeof RNSvg.Stop;
const hasGradients = Boolean(Defs && LinearGradient && RadialGradient && Stop);

export type CompanionProps = RigLife & {
  base?: CharacterBase;
  action?: CharacterAction;
  face?: CharacterFace | null;
  facing?: Facing;
  size?: number;
  held?: React.ReactNode;
  gaze?: Gaze;
  meal?: MealFrame;
  mealPlayback?: MealPlayback;
  carryGrip?: CarryGrip;
  tilt?: number;
  limbLag?: number;
  reduced?: boolean;
};

const ink = '#3B2418';

function PetEyes({ x, y, face, blink, r = 3.8, gaze }: { x: number; y: number; face: string; blink: boolean; r?: number; gaze?: Gaze }) {
  const rad = face === 'surprised' ? r + .9 : r;
  return face === 'sleepy' || blink
    ? <Path d={`M${x - r - 1} ${y}q${r + 1} ${r + 1.3} ${2 * r + 2} 0`} fill="none" strokeWidth={2.05}/>
    : <G data-gaze="pupils" transform={`translate(${clampRig(gaze?.x, -1, 1) * 2} ${clampRig(gaze?.y, -1, 1) * 1.5})`}>
        <Circle cx={x} cy={y} r={rad} fill="#2A1A14" strokeWidth={0}/>
        <Path d={`M${x - rad * .66} ${y + rad * .28}Q${x} ${y + rad * 1.04} ${x + rad * .66} ${y + rad * .28}Q${x} ${y + rad * .68} ${x - rad * .66} ${y + rad * .28}Z`} fill="#7A4934" fillOpacity={.78} strokeWidth={0}/>
        <Circle cx={x} cy={y} r={rad * .46} fill="#190E0B" strokeWidth={0}/>
        <Circle cx={x - rad * .36} cy={y - rad * .38} r={Math.max(1.15, rad * .38)} fill="#FFFFFF" strokeWidth={0}/>
        <Circle cx={x + rad * .38} cy={y + rad * .38} r={Math.max(.6, rad * .19)} fill="#FFFFFF" strokeWidth={0}/>
      </G>;
}

function PetMouth({ x, y, face, meal }: { x: number; y: number; face: string; meal?: MealFrame }) {
  return <G data-expression={face}>
    {face === 'sip' ? <Path data-mouth="sip" d={`M${x - 3} ${y}q3-3 6 0q-3 3-6 0`} fill="none" strokeWidth={1.85}/>
    : meal?.bite ? <>
      <Path data-mouth="bite" d={`M${x - 5.2} ${y - 3}q5.2-2 10.4 0v5.2q-5.2 6-10.4 0Z`} fill="#9E3F47"/>
      <Path d={`M${x - 3.2} ${y + 2.5}q3.2-2.2 6.4 0q-3.2 2.2-6.4 0Z`} fill="#F48B85" strokeWidth={0}/>
    </> : face === 'anticipate' || face === 'surprised' ? <Ellipse cx={x} cy={y} rx={face === 'anticipate' ? 4.6 : 3.1} ry={4.6} fill="#A4424A" strokeWidth={1.35}/>
    : <Path d={face === 'sleepy' || face === 'neutral' ? `M${x - 3.2} ${y}q3.2 1.8 6.4 0` : face === 'chew' ? `M${x - 4.2} ${y}q4.2 3.8 8.4 0` : `M${x - 6.4} ${y - 1.0}q6.4 8.2 12.8 0`} fill="none" strokeWidth={1.95}/>}
  </G>;
}

function Held({ at, facing, children }: { at: readonly [number, number]; facing: Facing; children?: React.ReactNode }) {
  return <G data-layer="held" transform={`translate(${at[0]} ${at[1]}) scale(${facing === 'left' ? -1 : 1} 1) translate(-12 -12)`}>{children}</G>;
}

/** Pure storybook coral crab puppet. Legs hang in carry; feeding moves one claw only. */
export function RigCrab({ base = 'stand', action = null, face, facing = 'right', size = 120, held, tilt, limbLag, reduced = false, mood, clock, seed, blink, breath, gaze, meal, mealPlayback }: CompanionProps) {
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const life = rigIdle(clock, seed, reduced), options = { action, tilt, limbLag, reduced, meal, gaze, breath: breath ?? life.breath };
  const box = crabAnchors(base, facing, options).bounds, origin = crabOrigin(base);
  const c = companionContacts('crab', base, action, meal), expression = rigFace(face, mood, action);
  const carry = base === 'carry', tucked = base === 'sit' || base === 'bathe' || base === 'lie';
  const lag = reduced ? 0 : -clampRig(limbLag, 0, 1) * clampRig(tilt, -6, 6) / 6 * 10 * (facing === 'left' ? -1 : 1);
  const shellFill = hasGradients ? `url(#${uid}-crab)` : '#EF7660';
  const clawFill = hasGradients ? `url(#${uid}-claw)` : '#EF7660';

  return <Svg style={{ overflow: 'visible' }} width={box.width * size / 120} height={box.height * size / 120} viewBox={`${box.left} ${box.top} ${box.width} ${box.height}`} accessible={false}>
    {hasGradients && <Defs>
      <RadialGradient id={`${uid}-crab`} cx="38%" cy="28%" r="72%" fx="34%" fy="24%">
        <Stop offset="0%" stopColor="#FFA489"/>
        <Stop offset="52%" stopColor="#F0735D"/>
        <Stop offset="100%" stopColor="#C84D3D"/>
      </RadialGradient>
      <LinearGradient id={`${uid}-claw`} x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FF9E84"/>
        <Stop offset="55%" stopColor="#EF725C"/>
        <Stop offset="100%" stopColor="#C94E3E"/>
      </LinearGradient>
    </Defs>}
    <G data-rig="crab" data-base={base} data-action={action ?? 'none'} transform={rigTransform(facing, options)} stroke={ink} strokeWidth={2.35} strokeLinecap="round" strokeLinejoin="round">
      <G transform={`translate(${-origin[0]} ${-origin[1]})`}>
        <G data-joint="legs" transform={`rotate(${lag} 60 73)`}>{[0, 1, 2].map(n => <Path key={n} d={`M37 ${68 + n * 6}Q${carry ? 27 + n * 2 : tucked ? 29 : 19 - n * 2} ${carry ? 80 + n * 3 : 73 + n * 7} ${carry ? 27 + n * 2 : tucked ? 34 : 12 - n * 2} ${carry ? 94 + n * 3 : 84 + n * 7}M83 ${68 + n * 6}Q${carry ? 93 - n * 2 : tucked ? 91 : 101 + n * 2} ${carry ? 80 + n * 3 : 73 + n * 7} ${carry ? 93 - n * 2 : tucked ? 86 : 108 + n * 2} ${carry ? 94 + n * 3 : 84 + n * 7}`} fill="none"/>)}</G>
        <G data-joint="left-claw" transform={`rotate(${carry ? -90 + lag : 0} 35 66)`}>
          <Path d="M35 66L23 53" stroke={ink} strokeWidth={11.8}/>
          <Path d="M35 66L23 53" stroke="#E86A54" strokeWidth={7.4}/>
          <Path d="M23 56.5Q6.5 56.5 9.5 36.5L22.5 46L28.5 33Q41.5 51.5 23 56.5Z" fill={clawFill}/>
          <Path d="M13 43.5Q13.8 49.5 19.6 52.4" fill="none" stroke="#FFE0D2" strokeWidth={2.3}/>
        </G>
        <Ellipse cx={60} cy={73} rx={32.5} ry={23.2} fill={shellFill}/>
        <Path d="M35 62Q48 51.5 71 53.5Q52 57 35 62Z" fill="#FFE6DA" fillOpacity={.78} strokeWidth={0}/>
        <Ellipse cx={60} cy={82.5} rx={22.4} ry={11.8} fill="#FAD09A"/>
        <Path d="M42 82.5Q60 91 78 82.5Q60 87.5 42 82.5Z" fill="#E0A16A" fillOpacity={.42} strokeWidth={0}/>
        <Ellipse cx={41.5} cy={73.5} rx={5.2} ry={3.0} fill="#E45A4A" fillOpacity={.50} strokeWidth={0}/>
        <Ellipse cx={78.5} cy={73.5} rx={5.2} ry={3.0} fill="#E45A4A" fillOpacity={.50} strokeWidth={0}/>
        <Circle cx={39.6} cy={72.2} r={1.0} fill="#FFFDF6" fillOpacity={.72} strokeWidth={0}/>
        <Circle cx={80.4} cy={72.2} r={1.0} fill="#FFFDF6" fillOpacity={.72} strokeWidth={0}/>
        <Path d="M45 55V42M75 55V42" stroke={ink} strokeWidth={11.6}/>
        <Path d="M45 55V42M75 55V42" stroke="#E86A54" strokeWidth={7.2}/>
        {[45, 75].map(x => <G key={x} transform={`translate(${clampRig(gaze?.x, -1, 1)} 0)`}><Circle cx={x} cy={38} r={9.6} fill="#FFFBF2"/><PetEyes x={x} y={38} r={3.9} gaze={gaze} face={expression} blink={!reduced && (blink ?? life.blink)}/></G>)}
        {mealPlayback ? <>
          {mealGroups(mealPlayback, f => action === 'drink' ? 'sip' : f.meal.bite ? 'bite' : f.face).map(({ frame: f, indices }) => <MealLayer key={indices[0]} playback={mealPlayback} index={indices}><PetMouth meal={f.meal} x={60} y={73} face={action === 'drink' ? 'sip' : f.face}/></MealLayer>)}
          <MealMorph playback={mealPlayback}>{f => {
            const c = companionContacts('crab', base, action, f.meal);
            return <>
              <Path d={`M85 66Q${carry ? 98 : 92} ${carry ? 76 : 64} ${c.hand[0]} ${c.hand[1]}`} fill="none" stroke={ink} strokeWidth={11.8}/>
              <Path d={`M85 66Q${carry ? 98 : 92} ${carry ? 76 : 64} ${c.hand[0]} ${c.hand[1]}`} fill="none" stroke="#E86A54" strokeWidth={7.4}/>
              <G data-joint="right-claw" transform={`translate(${c.hand[0]} ${c.hand[1]}) rotate(${carry ? 35 + lag : action ? -50 : 0})`}><Path d="M0 3.5Q-17.5-2-5-20L1.5-7L13.5-15.5Q16 3.5 0 3.5Z" fill={clawFill}/></G>
              {f.held && <Path d={`M${c.hand[0] - 4} ${c.hand[1] + 3}q4 5 8 0`} fill="none" stroke="#E86A54" strokeWidth={4}/>}
            </>;
          }}</MealMorph>
        </> : <>
          <PetMouth meal={meal} x={60} y={73} face={expression}/>
          <Path d={`M85 66Q${carry ? 98 : 92} ${carry ? 76 : 64} ${c.hand[0]} ${c.hand[1]}`} fill="none" stroke={ink} strokeWidth={11.8}/>
          <Path d={`M85 66Q${carry ? 98 : 92} ${carry ? 76 : 64} ${c.hand[0]} ${c.hand[1]}`} fill="none" stroke="#E86A54" strokeWidth={7.4}/>
          <G data-joint="right-claw" transform={`translate(${c.hand[0]} ${c.hand[1]}) rotate(${carry ? 35 + lag : action ? -50 : 0})`}><Path d="M0 3.5Q-17.5-2-5-20L1.5-7L13.5-15.5Q16 3.5 0 3.5Z" fill={clawFill}/></G>
          <Held at={c.hand} facing={facing}>{held}</Held>
          {held && <Path d={`M${c.hand[0] - 4} ${c.hand[1] + 3}q4 5 8 0`} fill="none" stroke="#E56852" strokeWidth={4}/>}
        </>}
      </G>
    </G>
  </Svg>;
}

/** Pip keeps ReefFish's honey body, coral tail, two pale stripes and one soulful eye.
 * Stand=float, sit/bathe=tucked bowl posture, lie=rest curl, carry=loose fins. */
export function Pip({ base = 'stand', action = null, face, facing = 'right', size = 120, held, tilt, limbLag, reduced = false, mood, clock, seed, blink, breath, gaze, meal, mealPlayback, carryGrip }: CompanionProps) {
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const life = rigIdle(clock, seed, reduced), options = { action, tilt, limbLag, reduced, meal, gaze, breath: breath ?? life.breath };
  const box = pipAnchors(base, facing, options).bounds, origin = pipOrigin(base);
  const c = companionContacts('pip', base, action, meal), expression = rigFace(face, mood, action);
  const carry = base === 'carry', rest = base === 'lie', tucked = base === 'sit' || base === 'bathe';
  const lag = reduced ? 0 : -clampRig(limbLag, 0, 1) * clampRig(tilt, -6, 6) / 6 * 10 * (facing === 'left' ? -1 : 1);
  const bodyFill = hasGradients ? `url(#${uid}-pip)` : '#F2C66E';
  const tailFill = hasGradients ? `url(#${uid}-tail)` : '#E47B60';
  const fin = (finAction: CharacterAction) => <Path data-joint="fin" stroke="#C98836" strokeWidth={1.6} d={`M68 98Q${finAction ? 58 : 78} ${finAction ? 120 : 115} ${c.hand[0]} ${c.hand[1]}Q${finAction ? 40 : 57} ${finAction ? 100 : 99} 68 98Z`} fill="#F4CA74"/>;

  return <Svg style={{ overflow: 'visible' }} width={box.width * size / 160} height={box.height * size / 160} viewBox={`${box.left} ${box.top} ${box.width} ${box.height}`} accessible={false}>
    {hasGradients && <Defs>
      <RadialGradient id={`${uid}-pip`} cx="36%" cy="28%" r="74%" fx="32%" fy="24%">
        <Stop offset="0%" stopColor="#FFE9A8"/>
        <Stop offset="54%" stopColor="#F4C76A"/>
        <Stop offset="100%" stopColor="#D6923B"/>
      </RadialGradient>
      <LinearGradient id={`${uid}-tail`} x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#F5967B"/>
        <Stop offset="100%" stopColor="#D4664D"/>
      </LinearGradient>
    </Defs>}
    <G data-rig="pip" data-base={base} data-action={action ?? 'none'} transform={rigTransform(facing, options)} stroke={ink} strokeWidth={2.05} strokeLinecap="round" strokeLinejoin="round">
      <G transform={`translate(${-origin[0]} ${-origin[1]}) rotate(${rest ? -18 : 0} ${origin[0]} ${origin[1]})`}>
        <G data-joint="tail" transform={`rotate(${carry ? 12 + lag : rest ? 20 : tucked ? 8 : 0} 110 85)`}><Path d="M106 81L148 53Q154 80 148 110Z" fill={tailFill}/><Path d="M126 77l16-12m-14 22 15 9" stroke="#FFD6C6" fill="none"/></G>
        <Path d={carry ? 'M66 64Q66 44 82 44L93 65M68 101Q69 126 82 122L91 102' : tucked ? 'M66 64Q71 54 91 58L103 71M68 101Q76 114 96 110L99 96' : 'M66 64Q67 41 92 47L103 71M68 101Q75 124 96 112L99 96'} fill="#DF9E46"/>
        <Ellipse cx={75} cy={85} rx={49.5} ry={32.4} fill={bodyFill}/>
        <Path d="M40 67Q66 52.5 97 61Q68 59 40 67Z" fill="#FFF7DA" fillOpacity={.74} strokeWidth={0}/>
        <Path d="M44 103Q74 116.5 104 102Q74 110.5 44 103Z" fill="#C98430" fillOpacity={.30} strokeWidth={0}/>
        <Path d="M94 63Q77 84 94 108M109 69Q94 86 108 102" fill="none" stroke="#FFEAB2" strokeWidth={7.2}/>
        <G data-joint="head-look" transform={`translate(${clampRig(gaze?.x, -1, 1) * 1.4} ${clampRig(gaze?.y, -1, 1) * .6})`}>
          <Circle cx={48} cy={78} r={9.2} fill="#FFFBF2" strokeWidth={1.1}/>
          <PetEyes x={47} y={79} r={4.6} gaze={gaze} face={expression} blink={!reduced && (blink ?? life.blink)}/>
          <Ellipse cx={49} cy={95.5} rx={7.6} ry={4.4} fill="#EE836B" fillOpacity={.74} strokeWidth={0}/>
          <Circle cx={46.5} cy={94.2} r={1.1} fill="#FFFDF6" fillOpacity={.75} strokeWidth={0}/>
          {mealPlayback ? mealGroups(mealPlayback, f => action === 'drink' ? 'sip' : f.meal.bite ? 'bite' : f.face).map(({ frame: f, indices }) => <MealLayer key={indices[0]} playback={mealPlayback} index={indices}><PetMouth meal={f.meal} x={34} y={94} face={action === 'drink' ? 'sip' : f.face}/></MealLayer>) : <PetMouth meal={meal} x={34} y={94} face={expression}/>}
        </G>
        {mealPlayback ? <MealMorph playback={mealPlayback}>{f => {
          const c = companionContacts('pip', base, action, f.meal);
          return <>
            <Path data-joint="fin" stroke="#C98836" strokeWidth={1.6} d={`M68 98Q${action ? 58 : 78} ${action ? 120 : 115} ${c.hand[0]} ${c.hand[1]}Q${action ? 40 : 57} ${action ? 100 : 99} 68 98Z`} fill="#F4CA74"/>
            {f.held && <Path d={`M${c.hand[0] - 3} ${c.hand[1] + 4}q5 4 8-1`} fill="none" stroke="#C98836" strokeWidth={4}/>}
          </>;
        }}</MealMorph> : <>
          {carryGrip ? <>{carryGrip.renderLayer(false, fin(null))}{carryGrip.renderLayer(true, fin('hold'))}</> : fin(action)}
          <Held at={c.hand} facing={facing}>{held}</Held>
          {held && <Path d={`M${c.hand[0] - 3} ${c.hand[1] + 4}q5 4 8-1`} fill="none" stroke="#C98836" strokeWidth={4}/>}
        </>}
      </G>
    </G>
  </Svg>;
}
