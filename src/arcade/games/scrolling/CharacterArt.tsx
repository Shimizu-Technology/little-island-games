import React, { memo } from "react";
import { View } from "react-native";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import type { SharedValue } from "react-native-reanimated";
import type { OutfitId } from "../../progress";
import { ArcadeSprite, type SpritePose } from "../../Sprite";
import { BAT_RX, BAT_RY } from "../fruit-bat-flight/hull";
import { RUN_EXTRA } from "./character";
import { runnerDrawings, type Point, type RunnerDrawing } from "./character";
const ink = "#493946", skin = "#CB956D";
/** Closed tapered limb, with a rounded joint and a solid silhouette. */
function limb(a: Point, b: Point, c: Point, r: number) {
  const dx=c[0]-a[0],dy=c[1]-a[1],len=Math.max(1,Math.hypot(dx,dy)),x=dy/len*r,y=-dx/len*r;
  return `M${a[0]+x} ${a[1]+y}Q${b[0]+x} ${b[1]+y} ${c[0]+x*.7} ${c[1]+y*.7}Q${c[0]+dx/len*r} ${c[1]+dy/len*r} ${c[0]-x*.7} ${c[1]-y*.7}Q${b[0]-x} ${b[1]-y} ${a[0]-x} ${a[1]-y}Q${a[0]-dx/len*r} ${a[1]-dy/len*r} ${a[0]+x} ${a[1]+y}Z`;
}
function RunnerShape({ frame = 0, outfit = "island", front = false }: { frame?: number; outfit?: OutfitId; front?: boolean }) {
  const crouch = frame >= 11 && frame <= 13, tucked = frame === 12, takeoff = frame === 8, apex = frame === 9, land = frame === 10, stumble = frame === 14, celebrate = frame === 15;
  const step = frame>=16?frame-16:frame%8, left=runnerDrawings[step],right=runnerDrawings[(step+1)%8];
  const mix=(a: Point[],b: Point[])=>a.map(([x,y],i)=>[(x+b[i][0])/2,(y+b[i][1])/2] as Point);
  const base: RunnerDrawing=frame>=16?{bob:(left.bob+right.bob)/2,knee:mix(left.knee,right.knee),foot:mix(left.foot,right.foot),elbow:mix(left.elbow,right.elbow),hand:mix(left.hand,right.hand)}:left;
  const bob = crouch ? tucked ? 51 : 30 : land ? 9 : takeoff ? 12 : stumble ? 9 : apex ? 3 : celebrate ? -2 : base.bob;
  const shoulderY = crouch ? tucked ? 103 : 83 : 51 + bob, hipY = crouch ? tucked ? 116 : 108 : 86 + bob;
  const pose: RunnerDrawing = crouch ? { bob, knee: [[23,116],[57,116]], foot: [[29,128],[51,128]], elbow: [[22,103],[58,103]], hand: [[32,105],[48,105]] }
    : apex ? { bob, knee: [[22,98],[58,98]], foot: [[32,109],[48,109]], elbow: [[18,66],[62,66]], hand: [[24,52],[56,52]] }
    : land ? { bob, knee: [[23,112],[57,112]], foot: [[27,128],[53,128]], elbow: [[18,78],[62,78]], hand: [[24,88],[56,88]] }
    : takeoff ? { bob, knee: [[30,103],[50,103]], foot: [[27,128],[53,128]], elbow: [[20,61],[60,61]], hand: [[26,45],[54,45]] }
    : stumble ? { bob, knee: [[24,107],[55,110]], foot: [[19,128],[57,124]], elbow: [[13,69],[67,71]], hand: [[9,53],[72,59]] }
    : celebrate ? { bob, knee: [[30,105],[50,105]], foot: [[27,128],[53,128]], elbow: [[17,40],[63,40]], hand: [[20,22],[60,22]] } : base;
  const headY = crouch ? tucked ? 87 : 65 : 27 + bob, headR = crouch ? 16 : 18;
  const shirt = outfit === "starlight" ? "#7D6CB5" : "#F58062";
  if(tucked)return <G stroke={ink} strokeWidth={2} strokeLinejoin="round"><Path d="M20 128Q9 120 19 105Q30 86 50 97Q67 99 66 117L58 128Z" fill={shirt}/><Path d="M20 128Q13 119 21 112L36 108L48 126Z" fill="#364D79"/><Path d="M24 123Q31 113 40 119L46 128H25Z" fill={skin}/><Path d="M17 126Q25 119 34 125V130H17Z" fill="#F4CC76"/><Circle cx={57} cy={112} r={15} fill="#403442"/><Path d="M47 104Q54 98 62 103" stroke="#72505B" strokeWidth={3} fill="none"/><Path d="M44 113Q37 109 33 116L37 124L47 123" fill={skin}/></G>;
  return <G stroke={ink} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
    {pose.knee.map((k,i) => <G key={`leg${i}`}><Path d={limb([i?48:32,hipY],k,pose.foot[i],5.2)} fill={i?skin:'#B68061'}/><Path d={`M${pose.foot[i][0]-8} ${pose.foot[i][1]-4}q8-6 16 0v5q-8 3-16 0Z`} fill={i?'#F4CC76':'#D7AC60'}/><Path d={`M${pose.foot[i][0]-6} ${pose.foot[i][1]+1}h12`} stroke="#FFF0BC" strokeWidth={2}/></G>)}
    {pose.elbow.map((e,i) => <G key={`arm${i}`}><Path d={limb([i?54:26,shoulderY],e,pose.hand[i],4.7)} fill={i?skin:'#B68061'}/><Ellipse cx={pose.hand[i][0]} cy={pose.hand[i][1]} rx={4.5} ry={5} fill={skin}/></G>)}
    <Path d={`M25 ${hipY-13}H55L57 ${hipY+7}L43 ${hipY+8}L40 ${hipY}L37 ${hipY+8}L23 ${hipY+7}Z`} fill="#364D79"/>
    <Path d={`M25 ${shoulderY-3}Q40 ${shoulderY-10} 55 ${shoulderY-3}L56 ${hipY-7}Q40 ${hipY+2} 24 ${hipY-7}Z`} fill={shirt}/>
    <Path d={`M25 ${shoulderY+16}Q40 ${shoulderY+11} 55 ${shoulderY+16}`} fill="none" stroke="#FFE4A9" strokeWidth={5}/>
    <Path d={`M34 ${shoulderY-5}V${shoulderY-12}H46V${shoulderY-5}`} fill={skin}/>
    <Ellipse cx={23} cy={headY+4} rx={4} ry={6} fill={skin}/><Ellipse cx={57} cy={headY+4} rx={4} ry={6} fill={skin}/><Circle cx={40} cy={headY} r={headR} fill={front ? skin : "#463643"}/>
    <Path d={`M${40-headR} ${headY-1}Q${19} ${headY-25} 43 ${headY-headR}Q63 ${headY-21} 58 ${headY+1}L52 ${headY-8}Q40 ${headY-2} 28 ${headY-10}Z`} fill="#403442"/>
    {!front && <Path d={`M29 ${headY-12}Q38 ${headY-18} 48 ${headY-13}`} stroke="#72505B" fill="none" strokeWidth={3}/>}
    {front && <G strokeWidth={0}><Circle cx={34} cy={headY+2} r={2.3} fill={ink}/><Circle cx={47} cy={headY+2} r={2.3} fill={ink}/><Path d={`M34 ${headY+10}Q40 ${headY+15} 47 ${headY+9}`} stroke={ink} strokeWidth={2} fill="none"/></G>}
    {outfit === "sunhat" ? <G fill="#F4C96C"><Path d={`M25 ${headY-10}V${headY-20}Q40 ${headY-27} 55 ${headY-20}V${headY-10}Z`}/><Path d={`M18 ${headY-9}H62`} stroke="#F4C96C" strokeWidth={6}/></G> : outfit === "explorer" ? <Path d={`M24 ${headY}Q40 ${headY+8} 56 ${headY}`} fill="none" stroke="#8CE7D6" strokeWidth={4}/> : outfit === "starlight" ? <Path d={`M40 ${headY-21}l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z`} fill="#FFE79B" strokeWidth={1}/> : null}
  </G>;
}
export const RunnerFrameArt = memo(function RunnerFrameArt({ frame, outfit, size = 132, front = false }: { frame: number; outfit: OutfitId; size?: number; front?: boolean }) {
  return <Svg width={size*80/132} height={size} viewBox="0 0 80 132" accessible={false}><RunnerShape frame={frame} outfit={outfit} front={front}/></Svg>;
});
/** Whole authored poses share one root. No independent limb can drift from a shoulder/hip. */
export const RunnerRig = memo(function RunnerRig({ poses, outfit }: { poses: SharedValue<SpritePose[]>; outfit: OutfitId }) {
  return <ArcadeSprite poses={poses} index={0} width={80} height={132}>{Array.from({length:24},(_,i) => <ArcadeSprite key={i} poses={poses} index={i<16?80+i:RUN_EXTRA+i-16} width={80} height={132}><RunnerFrameArt frame={i} outfit={outfit}/></ArcadeSprite>)}</ArcadeSprite>;
});
function BatBody({ outfit }: { outfit: OutfitId }) {
  return <G stroke="#392D45" strokeWidth={2} strokeLinejoin="round"><Ellipse cx={45} cy={41} rx={20} ry={21} fill="#B87569"/><Path d="M51 18L52 5L61 19M61 21L67 10L68 26" fill="#C39189"/><Path d="M52 20Q68 15 71 29L75 34L68 39Q64 51 50 43Q39 31 52 20" fill="#D59470"/><Ellipse cx={62} cy={29} rx={5} ry={6} fill="#FFF3D8" strokeWidth={0}/><Circle cx={64} cy={29} r={2.5} fill="#302B40" strokeWidth={0}/><Circle cx={64.8} cy={28} r={.8} fill="white" strokeWidth={0}/><Path d="M70 32L74 34L70 35Z" fill="#392D45"/><Path d="M64 40Q68 42 71 38" fill="none" strokeWidth={1.5}/><Path d="M31 51Q44 62 58 52" stroke="#EDAD86" fill="none" strokeWidth={4}/><Path d="M32 57L28 63M44 61L41 66" fill="none" strokeWidth={3}/>{outfit === "sunhat" ? <Path d="M46 17H76M53 15V8H69V15" stroke="#FFDA77" strokeWidth={5}/> : outfit === "explorer" ? <Path d="M54 24L70 26" stroke="#8CE7D6" strokeWidth={4}/> : outfit === "starlight" ? <Path d="M54 7L57 14L65 15L59 20L60 27L54 23L48 27L49 20L43 15L51 14Z" fill="#FFE79B"/> : null}</G>;
}
function BatWing({ far = false }: { far?: boolean }) {
  // The shoulder is (0,0), on the right edge of this local drawing.
  return <Svg width={48} height={64} viewBox="-44 -34 48 64"><G stroke="#392D45" strokeWidth={2} strokeLinejoin="round"><Path d={far ? "M0 0Q-16-27-35-29L-30-6Q-19-16-13 7L-5 1Z" : "M0 0Q-19-30-43-29L-37-3Q-25-18-20 10Q-9-4-5 17Z"} fill={far ? "#74618E" : "#A487BC"}/><Path d="M0 0L-36-25M-3 2L-25-12M-5 6L-13-3" stroke={far ? "#A28CB5" : "#D9C3E5"} strokeWidth={1.5} fill="none"/></G></Svg>;
}
export const BatRig = memo(function BatRig({ poses, outfit, debug = false }: { poses: SharedValue<SpritePose[]>; outfit: OutfitId; debug?: boolean }) {
  return <ArcadeSprite poses={poses} index={0} width={96} height={76}><ArcadeSprite poses={poses} index={31} width={0} height={0}><View style={{position:"absolute",left:-44,top:-34}}><BatWing far/></View></ArcadeSprite><Svg width={96} height={76} viewBox="0 0 96 76"><BatBody outfit={outfit}/></Svg><ArcadeSprite poses={poses} index={32} width={0} height={0}><View style={{position:"absolute",left:-44,top:-34}}><BatWing/></View></ArcadeSprite>{debug && <Svg width={96} height={76} style={{position:"absolute"}}><Ellipse cx={48} cy={38} rx={BAT_RX} ry={BAT_RY} stroke="#72FFB7" strokeWidth={1.5} fill="#72FFB722"/><Circle cx={47} cy={34} r={2} fill="#FFDC72"/><Circle cx={52} cy={36} r={2} fill="#FFDC72"/></Svg>}</ArcadeSprite>;
});
export function CharacterPortrait({ bat, size, outfit, happy = false, back = false, frame }: { bat: boolean; size: number; outfit: OutfitId; happy?: boolean; back?: boolean; frame?: number }) {
  return bat ? <Svg width={size} height={size} viewBox="0 0 120 120" accessible={false}><G transform="translate(12 24)"><G transform="translate(47 34)"><G transform="translate(-44 -34)"><BatWing far/></G></G><BatBody outfit={outfit}/><G transform="translate(52 36)"><G transform="translate(-44 -34)"><BatWing/></G></G></G></Svg> : <Svg width={size} height={size} viewBox="-26 -2 132 136" accessible={false}><Ellipse cx={40} cy={131} rx={29} ry={4} fill="#4C6171" opacity={.2}/><RunnerShape frame={frame ?? (happy ? 15 : 0)} outfit={outfit} front={!back}/></Svg>;
}
