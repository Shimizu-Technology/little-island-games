import React, { useId } from 'react';
import * as RNSvg from 'react-native-svg';
import { Circle, Ellipse, G, Path } from 'react-native-svg';
import { clampRig, type Gaze, type MealFrame, type MealPlayback } from './character';
import { MealLayer, mealGroups } from './MealLayer';
import type { IslanderLook } from '../look';
import type { Expression, Pose } from './poses';

const svgEl = <K extends keyof typeof RNSvg>(k: K): (typeof RNSvg)[K] | undefined => {
  try { return Object.prototype.hasOwnProperty.call(RNSvg, k) ? RNSvg[k] : undefined; } catch { return undefined; }
};
const Defs = svgEl('Defs') as typeof RNSvg.Defs, RadialGradient = svgEl('RadialGradient') as typeof RNSvg.RadialGradient, Stop = svgEl('Stop') as typeof RNSvg.Stop;
const hasGradients = Boolean(Defs && RadialGradient && Stop);
/** Small circle built with quadratic curves only (no SVG arc commands). */
const dot = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}Q${cx - r} ${cy - r} ${cx} ${cy - r}Q${cx + r} ${cy - r} ${cx + r} ${cy}Q${cx + r} ${cy + r} ${cx} ${cy + r}Q${cx - r} ${cy + r} ${cx - r} ${cy}Z`;
/** Bright 4-point storybook sparkle star inside the dark iris for star-eyes. */
const fourStar = (cx: number, cy: number, r: number, inner = r * .33) =>
  `M${cx} ${cy - r}Q${cx + inner * .4} ${cy - inner * .4} ${cx + r} ${cy}Q${cx + inner * .4} ${cy + inner * .4} ${cx} ${cy + r}Q${cx - inner * .4} ${cy + inner * .4} ${cx - r} ${cy}Q${cx - inner * .4} ${cy - inner * .4} ${cx} ${cy - r}Z`;

export function Face({ look, pose, expression, blink = false, gaze, meal, playback, sipping = false }: { look: IslanderLook; pose: Pose; expression?: Expression; blink?: boolean; gaze?: Gaze; meal?: MealFrame; playback?: MealPlayback; sipping?: boolean }) {
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, '');
  if (pose.view !== 'front') return null;
  const [x, y] = pose.joints.head;
  const e = expression ?? pose.expression;
  const stars = !expression && (pose.id === 'cheer' || pose.id === 'dance-1' || pose.id === 'dance-3');
  const wink = !expression && (pose.id === 'dance-0' || pose.id === 'dance-2');
  const gx = clampRig(gaze?.x, -1, 1) * 1.9, gy = clampRig(gaze?.y, -1, 1) * 1.3;
  const brows = look.brows ?? 'soft', lash = look.lashes === 'lashes' || (look.lashes === undefined && look.presentation === 'girl');
  // Warm storybook espresso ink deepens on cocoa/earth so features stay lively on every skin tone.
  const dark = look.skinTone === 'cocoa' || look.skinTone === 'earth';
  const line = dark ? '#231512' : '#3B2418', iris = dark ? '#1D110D' : '#2A1A14';
  const openSmile = !playback && !meal && !sipping && (stars || e === 'proud');
  const eyeX = 10.2, eyeY = 6.6;
  const scleraRx = e === 'surprised' ? 5.25 : 4.95, scleraRy = e === 'surprised' ? 5.55 : 5.15;
  const irisRx = e === 'surprised' ? 3.85 : 3.95, irisRy = e === 'surprised' ? 4.1 : 4.25;

  const irisGlow = (cx: number) =>
    `M${cx - irisRx * .72} ${eyeY + irisRy * .22}Q${cx} ${eyeY + irisRy * 1.12} ${cx + irisRx * .72} ${eyeY + irisRy * .22}Q${cx} ${eyeY + irisRy * .64} ${cx - irisRx * .72} ${eyeY + irisRy * .22}Z`;
  const catchlights = (cx: number) =>
    dot(cx - 1.35, eyeY - 1.45, 1.42) + dot(cx + 1.35, eyeY + 1.45, .64);
  const lidArc = (cx: number, side: -1 | 1) =>
    `M${cx - side * (scleraRx + .55)} ${eyeY - .6}Q${cx} ${eyeY - scleraRy - 1.45} ${cx + side * (scleraRx + .95)} ${eyeY + .25}`;
  const closedEyes = (blink || e === 'proud' || e === 'sleepy' || e === 'yum') && !wink;
  const cheekOpacity = dark ? (look.cheeks === 'rosy' ? .58 : .36) : look.cheeks === 'rosy' ? .76 : .50;

  const blushKey = look.cheeks === 'rosy' ? 'r' : 's';
  return <G transform={`translate(${x} ${y})`} stroke={line} data-expression={stars ? 'star-eyes' : wink ? 'wink' : e}>
    {hasGradients && look.cheeks !== 'none' && <Defs>
      <RadialGradient id={`${uid}-bl-${blushKey}`} cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#F47968" stopOpacity={look.cheeks === 'rosy' ? .88 : .68}/>
        <Stop offset="58%" stopColor="#E88D7D" stopOpacity={look.cheeks === 'rosy' ? .56 : .38}/>
        <Stop offset="100%" stopColor="#E88D7D" stopOpacity={0}/>
      </RadialGradient>
    </Defs>}

    {look.cheeks !== 'none' && <G fill={hasGradients ? `url(#${uid}-bl-${blushKey})` : '#E88D7D'} fillOpacity={hasGradients ? (dark ? .78 : .92) : cheekOpacity} strokeWidth={0}>
      <Ellipse cx={-16.8} cy={13.1} rx={6.4} ry={3.8}/><Ellipse cx={16.8} cy={13.1} rx={6.4} ry={3.8}/>
      {!hasGradients && look.cheeks === 'rosy' && <Path d="M-19.6 13.0Q-16.8 11.1-14.0 13.0Q-16.8 14.9-19.6 13.0ZM14.0 13.0Q16.8 11.1 19.6 13.0Q16.8 14.9 14.0 13.0Z" fill="#F47968" fillOpacity={dark ? .38 : .46}/>}
    </G>}

    <Path d={
      e === 'thinking' ? 'M-15.0 -1.8q4.0 -4.0 8.2 -2.6M6.8 -2.0q4.0 0 8.2 2.2'
      : e === 'focused' ? 'M-15.0 -2.4l8.0 2.2M7.0 -.2l8.0 -2.2'
      : e === 'surprised' ? 'M-15.2 -4.8q4.2 -3.6 8.6 -.2M6.6 -5.0q4.4 -3.4 8.6 .2'
      : brows === 'straight' ? 'M-14.8 -2.4h7.4M7.4 -2.4h7.4'
      : brows === 'arched' ? 'M-15.0 -1.4q4.2 -5.0 8.2 -1.0M6.8 -2.4q4.0 -4.0 8.2 1.0'
      : 'M-15.0 -2.0q4.2 -2.8 8.0 -.4M7.0 -2.4q3.8 -2.4 8.0 .4'
    } fill="none" stroke={dark ? '#231512' : '#4A2A1B'} strokeWidth={brows === 'bold' ? 2.65 : 2.15} strokeLinecap="round"/>

    {stars ? <G>
      <Ellipse cx={-eyeX} cy={eyeY} rx={scleraRx} ry={scleraRy} fill="#FFFDF8" strokeWidth={.95}/>
      <Ellipse cx={eyeX} cy={eyeY} rx={scleraRx} ry={scleraRy} fill="#FFFDF8" strokeWidth={.95}/>
      <Ellipse cx={-eyeX} cy={eyeY} rx={4.25} ry={4.55} fill={iris} strokeWidth={0}/>
      <Ellipse cx={eyeX} cy={eyeY} rx={4.25} ry={4.55} fill={iris} strokeWidth={0}/>
      <Path d={fourStar(-eyeX, eyeY, 3.65) + fourStar(eyeX, eyeY, 3.65)} fill="#FFD854" stroke="#F0A52A" strokeWidth={.55}/>
      <Path d={dot(-eyeX, eyeY, 1.05) + dot(eyeX, eyeY, 1.05) + dot(-eyeX + 1.8, eyeY + 1.8, .52) + dot(eyeX + 1.8, eyeY + 1.8, .52)} fill="#FFFFFF" strokeWidth={0}/>
      <Path d={`${lidArc(-eyeX, -1)}${lidArc(eyeX, 1)}`} fill="none" strokeWidth={2.2} strokeLinecap="round"/>
      {lash && <Path data-lashes="true" d="M-15.0 5.4l-2.6-1.8M15.0 5.4l2.6-1.8M-15.4 7.4l-2.2-.8M15.4 7.4l2.2-.8" fill="none" strokeWidth={1.5} strokeLinecap="round"/>}
    </G> : <G>
      {closedEyes ? <Path data-eyes={e === 'sleepy' || blink ? 'closed-arcs' : undefined} d={
        e === 'sleepy' || blink
          ? 'M-15.4 6.6Q-10.2 12.6 -5.0 6.6M5.0 6.6Q10.2 12.6 15.4 6.6M-15.6 7.4l-1.5 1.2M15.6 7.4l1.5 1.2'
          : 'M-15.2 8.2Q-10.2 2.2 -5.2 8.2M5.2 8.2Q10.2 2.2 15.2 8.2M-15.0 7.2l-1.6-1.0M15.0 7.2l1.6-1.0'
      } fill="none" strokeWidth={e === 'sleepy' ? 2.15 : 2.3} strokeLinecap="round"/> : <>
        {!wink && <Ellipse cx={-eyeX} cy={eyeY} rx={scleraRx} ry={scleraRy} fill="#FFFDF8" strokeWidth={.95}/>}
        <Ellipse cx={eyeX} cy={eyeY} rx={scleraRx} ry={scleraRy} fill="#FFFDF8" strokeWidth={.95}/>
        <G data-gaze="pupils" transform={`translate(${gx} ${gy})`} fill={iris} strokeWidth={0}>
          {wink ? <Path d="M-15.2 8.0Q-10.2 2.4 -5.2 8.0" fill="none" stroke={line} strokeWidth={2.25} strokeLinecap="round"/> : <Ellipse cx={-eyeX} cy={eyeY + .15} rx={irisRx} ry={irisRy}/>}
          <Ellipse cx={eyeX} cy={eyeY + .15} rx={irisRx} ry={irisRy}/>
          <Path d={`${wink ? '' : irisGlow(-eyeX)}${irisGlow(eyeX)}`} fill="#7A4934" fillOpacity={.82}/>
          {!wink && <Circle cx={-eyeX} cy={eyeY + .1} r={1.75} fill="#190E0B"/>}
          <Circle cx={eyeX} cy={eyeY + .1} r={1.75} fill="#190E0B"/>
          <Path d={`${wink ? '' : catchlights(-eyeX)}${catchlights(eyeX)}`} fill="#FFFFFF"/>
        </G>
        <Path d={`${wink ? '' : lidArc(-eyeX, -1)}${lidArc(eyeX, 1)}`} fill="none" strokeWidth={2.2} strokeLinecap="round"/>
      </>}
      {lash && !closedEyes && <Path data-lashes="true" d={`${wink ? '' : 'M-15.0 5.4l-2.6-1.8M-15.4 7.4l-2.2-.8'}M15.0 5.4l2.6-1.8M15.4 7.4l2.2-.8`} fill="none" strokeWidth={1.5} strokeLinecap="round"/>}
    </G>}

    <Path d={`M-1.5 11.4Q0 13.6 1.5 11.4${
      playback || openSmile || e === 'surprised' || e === 'anticipate' || e === 'chew' ? ''
      : e === 'thinking' ? 'M-2.8 19.6q3.0 -2.2 5.6 0'
      : e === 'sleepy' ? 'M-3.0 18.8q3.0 2.2 6.0 0'
      : e === 'yum' ? (pose.id === 'drink' ? 'M-2.2 19.4q2.2 -2.8 4.4 0q-2.2 2.8 -4.4 0' : 'M-5.2 17.8q5.2 5.6 10.4 0M3.2 18.0q2.8 -1.8 3.8 .4')
      : e === 'focused' || e === 'neutral' ? 'M-3.6 19.0q3.6 1.8 7.2 0'
      : 'M-5.4 17.6Q0 22.8 5.4 17.6'
    }`} fill="none" strokeWidth={1.45} strokeLinecap="round"/>
    <Circle cx={-.2} cy={10.7} r={.65} fill="#FFF8E8" fillOpacity={dark ? .30 : .62} strokeWidth={0}/>
    {(look.cheeks === 'rosy' || e === 'surprised' || stars) && look.cheeks !== 'none' && <>
      <Circle cx={-18.2} cy={11.8} r={.55} fill="#FFFDF6" fillOpacity={.72} strokeWidth={0}/>
      <Circle cx={18.2} cy={11.8} r={.55} fill="#FFFDF6" fillOpacity={.72} strokeWidth={0}/>
    </>}

    {playback ? mealGroups(playback, f => sipping ? 'sip' : f.meal.bite ? 'bite' : f.face === 'chew' ? `chew-${f.meal.chew}` : f.face).map(({ frame: f, indices }) => <MealLayer key={indices[0]} playback={playback} index={indices}><MealMouth meal={f.meal} expression={f.face} sipping={sipping}/></MealLayer>) : <MealMouth stars={openSmile} meal={meal} expression={e} sipping={sipping}/>}
    {look.freckles === 'freckles' && <Path d="M-19.2 11.4h.1m3.8-.6h.1m1.8 2.9h.1M19.2 11.4h.1m-3.8-.6h.1m-1.8 2.9h.1" stroke={dark ? '#BE8060' : '#A46246'} strokeWidth={1.45} strokeLinecap="round"/>}
  </G>;
}

function MealMouth({ meal, expression: e = 'chew', sipping, stars = false }: { meal?: MealFrame; expression?: Expression; sipping: boolean; stars?: boolean }) {
  if (meal && !meal.bite && e === 'neutral' && !sipping) return <Path d="M-3.6 19.0q3.6 1.6 7.2 0" fill="none" strokeWidth={1.35}/>;
  if (sipping) return <Path data-mouth="sip" d="M-3 19.6q3-3 6 0q-3 3-6 0" fill="none" strokeWidth={1.75}/>;
  return <>
    {meal?.bite ? <>
      <Path data-mouth="bite" d="M-7.2 16.6Q0 13.8 7.2 16.6L6.2 22Q0 26.8-6.2 22Z" fill="#9E3F47" strokeWidth={1.4}/>
      <Path d="M-6.0 16.6Q0 14.8 6.0 16.6V18.8H-6.0Z" fill="#FFFDF6" strokeWidth={0}/>
      <Path d="M-3.6 22.4Q0 19.8 3.6 22.4Q0 25.0-3.6 22.4Z" fill="#F48B85" strokeWidth={0}/>
    </> : (e === 'anticipate' || e === 'surprised') ? <>
      <Ellipse cx={0} cy={19.4} rx={e === 'anticipate' ? 4.1 : 2.55} ry={e === 'anticipate' ? 4.1 : 3.05} fill="#A6434B" strokeWidth={1.25}/>
      <Path d={dot(0, 20.6, e === 'anticipate' ? 1.8 : 1.1)} fill="#F48B85" fillOpacity={.85} strokeWidth={0}/>
    </> : e === 'chew' ? <>
      <Ellipse data-mouth="chew" cx={meal?.chew ? -9.5 : 9.5} cy={19.6} rx={4.6} ry={3.2} fill="#E88D7D" fillOpacity={.85} strokeWidth={0}/>
      <Path d={meal?.chew ? 'M-6.2 19.4q6.2 4.4 12.4 0' : 'M-5.2 19.4q5.2 3.6 10.4 0'} fill="none" strokeWidth={1.8}/>
    </> : stars ? <>
      <Path d="M-6.4 16.8Q0 15.8 6.4 16.8Q6.0 24.4 0 24.4Q-6.0 24.4 -6.4 16.8Z" fill="#A64149" strokeWidth={1.25}/>
      <Path d="M-5.2 17.0Q0 16.4 5.2 17.0V19.0Q0 19.5 -5.2 19.0Z" fill="#FFFDF6" strokeWidth={0}/>
      <Ellipse cx={0} cy={22.3} rx={3.3} ry={1.65} fill="#F48B85" strokeWidth={0}/>
    </> : null}
  </>;
}
