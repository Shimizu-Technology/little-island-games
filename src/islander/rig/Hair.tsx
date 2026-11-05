import React from 'react';
import { G, Path } from 'react-native-svg';
import type { IslanderLook } from '../look';
import { hairFor, hairSpecial, hairTones, type HairLayer, type HairTones } from './hairArt';
import type { Pose } from './poses';

/** Tie colours stay readable against hair that would swallow them. */
const tieOn = (color: IslanderLook['hairColor'], tie?: string) => ['pink', 'copper', 'auburn', 'plum'].includes(color) ? '#FFF1D6' : color === 'honey' || color === 'blonde' ? '#EF6F8E' : tie;
function Piece({ layer, t, tie }: { layer?: HairLayer; t: HairTones; tie?: string }) {
  if (!layer) return null;
  return <>
    {layer.fade && <Path d={layer.fade} fill={t.fade} strokeWidth={0}/>}
    {layer.fadeHigh && <Path d={layer.fadeHigh} fill={t.fadeHigh} strokeWidth={0}/>}
    {layer.rim && <Path d={layer.rim} fill="none"/>}
    {layer.under && <Path d={layer.under} fill={t.under} strokeWidth={0}/>}
    {layer.base && <Path d={layer.base} fill={t.base} strokeWidth={0}/>}
    {layer.shade && <Path d={layer.shade} fill={t.shade} strokeWidth={0}/>}
    {layer.shine && <Path d={layer.shine} fill={t.shine} strokeWidth={0}/>}
    {(layer.edge || layer.base) && <Path d={layer.edge ?? layer.base} fill="none"/>}
    {layer.ties && <Path d={layer.ties} fill={tie} strokeWidth={1}/>}
  </>;
}
/** Static compound paths in head-local coordinates; a new pose only moves the group. No clipping IDs. */
export function Hair({ look, pose, rear = false }: { look: IslanderLook; pose: Pose; rear?: boolean }) {
  const style = look.hairStyle, back = pose.view !== 'front', compact = !!pose.compact, [x, y] = pose.joints.head;
  if (rear && (back || compact)) return null;
  const covered = !['none', 'flower-crown', 'runner-headband'].includes(look.hat);
  const art = hairFor(style, covered, compact), tones = hairTones(look.hairColor, look.skinTone);
  // Gold glints only suit strands; on a buzz cut they read as dust, so the bolt carries the colour alone.
  const t = style === 'buzz-cut' && look.hairColor === 'lightning-streak' ? { ...tones, shine: tones.fadeHigh } : tones;
  const tie = tieOn(look.hairColor, art.tieColor), running = pose.frame !== undefined && (pose.frame < 8 || pose.frame >= 16);
  const swing = running ? Math.sin((pose.frame! >= 16 ? pose.frame! - 16 + .5 : pose.frame!) * Math.PI / 4) * 7 : 0;
  const shared = { 'data-hair': style, transform: `translate(${x} ${y})`, stroke: t.line, strokeWidth: 1.3, strokeLinejoin: 'round' } as const;
  if (rear) return <G {...shared}><Piece layer={art.crown} t={t} tie={tie}/><Piece layer={art.rear} t={t} tie={tie}/></G>;
  const length = art.swing && <G transform={`rotate(${swing} ${art.root![0]} ${art.root![1]})`}><Piece layer={art.swing} t={t} tie={tie}/></G>;
  const special = hairSpecial(style, look.hairColor, back, covered, compact);
  return <G {...shared} data-back-hair={back ? style : undefined}>
    {back ? <>
      {!compact && <Piece layer={art.backCrown} t={t} tie={tie}/>}
      <Piece layer={art.backBehind} t={t} tie={tie}/>
      {!compact && art.swingBehind && length}
      <Piece layer={art.back} t={t} tie={tie}/>
      {!compact && art.swing && !art.swingBehind && length}
    </> : <Piece layer={art.front} t={t} tie={tie}/>}
    {special?.stars && <Path data-hair-special="galaxy" d={special.stars} fill="#FFF2B8" strokeWidth={0}/>}
    {special?.bolt && <Path data-hair-special="lightning" d={special.bolt} fill="#FFD84D" stroke="#B9791F" strokeWidth={.8}/>}
  </G>;
}
