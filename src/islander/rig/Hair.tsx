import React, { useId } from 'react';
import * as RNSvg from 'react-native-svg';
import { G, Path } from 'react-native-svg';
import type { IslanderLook } from '../look';
import { hairFor, hairSpecial, hairTones, mix, type HairLayer, type HairTones } from './hairArt';
import type { Pose } from './poses';

const svgEl = <K extends keyof typeof RNSvg>(k: K): (typeof RNSvg)[K] | undefined => {
  try { return Object.prototype.hasOwnProperty.call(RNSvg, k) ? RNSvg[k] : undefined; } catch { return undefined; }
};
const Defs = svgEl('Defs') as typeof RNSvg.Defs, LinearGradient = svgEl('LinearGradient') as typeof RNSvg.LinearGradient, Stop = svgEl('Stop') as typeof RNSvg.Stop;
const hasGradients = Boolean(Defs && LinearGradient && Stop);
/** Tie colours stay readable against hair that would swallow them. */
const tieOn = (color: IslanderLook['hairColor'], tie?: string) => ['pink', 'copper', 'auburn', 'plum'].includes(color) ? '#FFF1D6' : color === 'honey' || color === 'blonde' ? '#F07562' : tie;

function Piece({ layer, t, tie, baseFill }: { layer?: HairLayer; t: HairTones; tie?: string; baseFill?: string }) {
  if (!layer) return null;
  return <>
    {layer.fade && <Path d={layer.fade} fill={t.fade} strokeWidth={0}/>}
    {layer.fadeHigh && <Path d={layer.fadeHigh} fill={t.fadeHigh} strokeWidth={0}/>}
    {layer.rim && <Path d={layer.rim} fill="none"/>}
    {layer.under && <Path d={layer.under} fill={t.under} strokeWidth={0}/>}
    {layer.base && <Path d={layer.base} fill={baseFill ?? t.base} strokeWidth={0}/>}
    {layer.shade && <Path d={layer.shade} fill={t.shade} strokeWidth={0}/>}
    {layer.shine && <Path d={layer.shine} fill={t.shine} strokeWidth={0}/>}
    {(layer.edge || layer.base) && <Path d={layer.edge ?? layer.base} fill="none"/>}
    {layer.ties && <Path d={layer.ties} fill={tie} strokeWidth={1.05}/>}
  </>;
}

/** Static compound paths in head-local coordinates; a new pose only moves the group. */
export function Hair({ look, pose, rear = false }: { look: IslanderLook; pose: Pose; rear?: boolean }) {
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const style = look.hairStyle, back = pose.view !== 'front', compact = !!pose.compact, [x, y] = pose.joints.head;
  if (rear && (back || compact)) return null;
  const covered = !['none', 'flower-crown', 'runner-headband'].includes(look.hat);
  const art = hairFor(style, covered, compact), tones = hairTones(look.hairColor, look.skinTone);
  // A buzz cut is matte: strand-like gloss reads as a swim cap, and gold glints as dust. The bolt carries Lightning Streak alone.
  const shorn = style === 'buzz-cut' || style === 'mohawk-fade', matte = style === 'buzz-cut' ? { ...tones, shine: tones.sheen } : tones;
  // No forehead to stand apart from behind: shorn hair keeps its true colour and fades softly.
  const t = shorn && back ? { ...matte, fade: style === 'buzz-cut' ? tones.napeFade : tones.backFade, fadeHigh: tones.base } : matte;
  const tie = tieOn(look.hairColor, art.tieColor), running = pose.frame !== undefined && (pose.frame < 8 || pose.frame >= 16);
  const swing = running ? Math.sin((pose.frame! >= 16 ? pose.frame! - 16 + .5 : pose.frame!) * Math.PI / 4) * 7 : 0;
  const useGrad = hasGradients && !compact && style !== 'buzz-cut';
  const hKey = `${t.base.slice(1)}-${t.shade.slice(1)}`;
  const gradTop = mix(t.base, t.shine, .24);
  const gradDeep = mix(t.base, t.shade, .30);
  const mainFill = useGrad ? `url(#${uid}-hg-${hKey})` : t.base;
  const rearFill = useGrad ? `url(#${uid}-hr-${hKey})` : t.base;
  const shared = { 'data-hair': style, transform: `translate(${x} ${y})`, stroke: t.line, strokeWidth: 1.32, strokeLinejoin: 'round' } as const;

  if (rear) {
    return <G {...shared}>
      {useGrad && <Defs>
        <LinearGradient id={`${uid}-hr-${hKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={t.base}/>
          <Stop offset="62%" stopColor={gradDeep}/>
          <Stop offset="100%" stopColor={t.under}/>
        </LinearGradient>
      </Defs>}
      <Piece layer={art.crown} t={t} tie={tie} baseFill={rearFill}/>
      <Piece layer={art.rear} t={t} tie={tie} baseFill={rearFill}/>
    </G>;
  }

  const length = art.swing && <G transform={`rotate(${swing} ${art.root![0]} ${art.root![1]})`}><Piece layer={art.swing} t={t} tie={tie} baseFill={mainFill}/></G>;
  const special = hairSpecial(style, look.hairColor, back, covered, compact);
  const castY = art.hairline;
  const bangShadow = !back && !compact && !shorn && !covered
    ? <Path d={`M-25 ${castY + 1.4}Q-12 ${castY + 5.6} 0 ${castY + 3.4}Q12 ${castY + 5.6} 25 ${castY + 1.4}Q12 ${castY + 2.0} 0 ${castY + .2}Q-12 ${castY + 2.0} -25 ${castY + 1.4}Z`} fill="#6B3624" fillOpacity={.12} strokeWidth={0}/>
    : null;

  return <G {...shared} data-back-hair={back ? style : undefined}>
    {useGrad && <Defs>
      <LinearGradient id={`${uid}-hg-${hKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor={gradTop}/>
        <Stop offset="48%" stopColor={t.base}/>
        <Stop offset="100%" stopColor={gradDeep}/>
      </LinearGradient>
    </Defs>}
    {back ? <>
      {!compact && <Piece layer={art.backCrown} t={t} tie={tie} baseFill={mainFill}/>}
      <Piece layer={art.backBehind} t={t} tie={tie} baseFill={mainFill}/>
      {!compact && art.swingBehind && length}
      <Piece layer={art.back} t={t} tie={tie} baseFill={mainFill}/>
      {!compact && art.swing && !art.swingBehind && length}
    </> : <>{bangShadow}<Piece layer={art.front} t={t} tie={tie} baseFill={mainFill}/></>}
    {special?.stars && <Path data-hair-special="galaxy" d={special.stars} fill="#FFF2B8" strokeWidth={0}/>}
    {special?.bolt && <Path data-hair-special="lightning" d={special.bolt} fill="#FFD84D" stroke="#B9791F" strokeWidth={.8}/>}
  </G>;
}
