import React, { memo } from 'react';
import { Image, View } from 'react-native';
import Animated, { useAnimatedReaction, useSharedValue, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import type { SpritePose } from '../../poses';
import { projectTrack } from './camera';
import { matrix4, multiply3, quadHomography, type Quad } from './quad';
import { deckFrame } from './bakedGeometry';
import { actorImageFrame, canoeBow, illustrated, illustratedHazard } from './illustrated';
import { RAMP_SECTIONS } from './surface';
import { FLOOR_BANDS, floorBandMatrix, type FloorBand } from './floorBands';
import { floorArt, hazardArt, powerArt, railArt } from './art.generated';
import { lagoonLook } from './look';
import type { WorldId } from '../../types';
export const TRAVEL_SLOT = 35;
const deckSource = () => require('../../../../assets/arcade/lagoon/deck.png'), roofSource = () => require('../../../../assets/arcade/lagoon/roof.png'), inclineSource = () => require('../../../../assets/arcade/lagoon/incline.png');
const leftSource=()=>require('../../../../assets/arcade/lagoon/deck-side-left.png'),rightSource=()=>require('../../../../assets/arcade/lagoon/deck-side-right.png');
const railSource = () => require('../../../../assets/arcade/lagoon/rail.png'), supportSource = () => require('../../../../assets/arcade/lagoon/support.png');
const absolute={position:'absolute' as const,left:0,top:0};
/** One camera band of the scrolling deck: a static clip and one projective transform per frame. */
function FloorBandView({poses,band,source}:{poses:SharedValue<SpritePose[]>;band:FloorBand;source:number}) {
 const clipTop=Math.floor(band.top)-.5,clipHeight=Math.ceil(band.bottom)-Math.floor(band.top)+1;
 const style=useAnimatedStyle(()=>{
  const p=poses.value[TRAVEL_SLOT];
  return {transform:[{matrix:floorBandMatrix(band,p?.opacity===0?0:p?.x??0,FLOOR_CLIP_LEFT,clipTop)}]};
 });
 return <View style={{position:'absolute',left:FLOOR_CLIP_LEFT,top:clipTop,width:390-2*FLOOR_CLIP_LEFT,height:clipHeight,overflow:'hidden'}}><Animated.View style={[absolute,{width:band.width,height:band.height,transformOrigin:[0,0,0]},style]}><Image accessible={false} source={source} style={{width:band.width,height:band.height}} fadeDuration={0}/></Animated.View></View>;
}
const FLOOR_CLIP_LEFT=-460;
/** Scrolling deck (floorBands.ts) and rails. Seams stay locked to track depth. */
export const BakedFloor=memo(function BakedFloor({poses,world}:{poses:SharedValue<SpritePose[]>;world:WorldId}) {
 const sources=floorArt[lagoonLook(world).id]();
 return <>{FLOOR_BANDS.map((band,i)=><FloorBandView key={band.index} poses={poses} band={band} source={sources[i]}/>)}<Rails poses={poses} world={world}/></>;
});
function Rail({poses,index,side,source}:{poses:SharedValue<SpritePose[]>;index:number;side:number;source:number}) {
 const style=useAnimatedStyle(()=>{
  const travel=poses.value[TRAVEL_SLOT]?.x??0,z=((travel+index*.26)%2.86+2.86)%2.86-1.2;
  if(z<=-1.17||z>=1.45)return {opacity:0,transform:[{scale:0}]};
  const a=projectTrack(1+side*1.55,z),b=projectTrack(1+side*1.55,z+.26);
  const q:Quad=[a,b,{x:b.x,y:b.y-57*b.scale},{x:a.x,y:a.y-57*a.scale}];
  return {opacity:1,transform:[{matrix:matrix4(multiply3(quadHomography(q),[1/128,0,-16/128,0,-1/128,1,0,0,1]))}]};
 });
 return <Animated.View style={[absolute,{width:160,height:144,transformOrigin:[0,0,0]},style]}><Image accessible={false} source={source} style={{width:160,height:144}} fadeDuration={0}/></Animated.View>;
}
const Rails=memo(function Rails({poses,world}:{poses:SharedValue<SpritePose[]>;world:WorldId}) {const source=railArt[lagoonLook(world).id]?.()??railSource();return <>{Array.from({length:11},(_,i)=><React.Fragment key={i}><Rail poses={poses} index={i} side={-1} source={source}/><Rail poses={poses} index={i} side={1} source={source}/></React.Fragment>)}</>;});
function TextureQuad({ frames, segment, face, source, width, height, side, warm = false }: {
 frames: SharedValue<number[][][]>; segment: number; face: number; source: number; width: number; height: number;
 side?: 'left' | 'right' | 'shadow'; warm?: boolean;
}) {
 const style = useAnimatedStyle(() => {
  const matrix = frames.value[segment]?.[face];
  return matrix ? { opacity: side === 'shadow' ? .22 : 1, transform: [{ matrix }] } : { opacity: 0, transform: [{ scale: 0 }] };
 });
 return <Animated.View style={[absolute, { width, height, transformOrigin: [0, 0, 0] }, style]}>
  {side === 'shadow' ? <View style={{ width, height, backgroundColor: '#344B50' }}/> : <>
   <Image accessible={false} source={source} style={{ width, height }} fadeDuration={0}/>
   {warm && <View pointerEvents="none" style={[absolute, { width, height, backgroundColor: '#FFD59524', borderLeftWidth: 3, borderRightWidth: 3, borderColor: '#FFE7A86B' }]}/>}
  </>}
 </Animated.View>;
}
function Support({poses,index}:{poses:SharedValue<SpritePose[]>;index:number}) {
 const style=useAnimatedStyle(()=>{
  const p=poses.value[index],h=p?.scale??0;
  return {opacity:!p || p.opacity===0 || h<=0?0:1,transform:[{translateX:(p?.x??0)-4},{translateY:p?.y??0},{scaleY:h/128},{scaleX:.5}]};
 });
 return <Animated.View style={[absolute,{width:16,height:128,transformOrigin:[0,0,0]},style]}><Image accessible={false} source={supportSource()} style={{width:16,height:128}} fadeDuration={0}/></Animated.View>;
}
export const BakedDeck=memo(function BakedDeck({poses,index,surface,incline=false}:{poses:SharedValue<SpritePose[]>;index:number;surface:string;incline?:boolean}) {
 const frames=useSharedValue<number[][][]>([]);
 useAnimatedReaction(()=>{
  const next:number[][][]=[];let visible=false;
  for(let i=0;i<(incline?RAMP_SECTIONS:1);i++){
   const start=index+i*4,p=poses.value[start];
   if(!p||p.opacity===0){next.push([]);continue;}
   visible=true;next.push(deckFrame(poses.value.slice(start,start+4),incline,incline&&i===0?128:256));
  }
  return visible?next:null;
 },next=>{if(next)frames.set(next);else if(frames.value.length)frames.set([]);},[poses,index,incline]);
 return <>{Array.from({length:incline?RAMP_SECTIONS:1},(_,i)=><React.Fragment key={`side${i}`}><TextureQuad frames={frames} segment={i} face={0} source={leftSource()} width={16} height={16} side="shadow"/>{[0,1].map(triangle=><React.Fragment key={triangle}><TextureQuad frames={frames} segment={i} face={1+triangle} source={leftSource()} width={32} height={32} side="left"/><TextureQuad frames={frames} segment={i} face={3+triangle} source={rightSource()} width={32} height={32} side="right"/></React.Fragment>)}</React.Fragment>)}{!incline&&<><Support poses={poses} index={index}/><Support poses={poses} index={index+1}/><Support poses={poses} index={index+2}/></>}{Array.from({length:incline?RAMP_SECTIONS:1},(_,i)=><TextureQuad key={i} frames={frames} segment={i} face={5} warm={incline||surface==='canoe-roof'} source={incline&&i===0?inclineSource():surface==='canoe-roof'?roofSource():deckSource()} width={128} height={incline&&i===0?128:256}/>)}</>;
});
// Fit the upright bow separately from the waterline so the illustration never crosses a
// projective pole. Its contact stays on the same front edge as the four-point hull footprint.
const bowFrame = actorImageFrame(illustrated.canoe, 72, 74, 0);
const wakeFoam = [
 { left: 18, top: 2, length: 28, angle: 21 }, { left: 10, top: 12, length: 19, angle: 29 },
 { left: 88, top: 2, length: 28, angle: -21 }, { left: 96, top: 12, length: 19, angle: -29 },
];
function CanoeWaterline({ poses, index, moving, reduced }: { poses: SharedValue<SpritePose[]>; index: number; moving: boolean; reduced: boolean }) {
 const style = useAnimatedStyle(() => {
  const a = poses.value[index], b = poses.value[index + 1], c = poses.value[index + 2], d = poses.value[index + 3];
  if (!a || a.opacity === 0 || b.x - a.x < .05 || c.x - d.x < .05 || Math.abs(a.y - d.y) < .05) return { opacity: 0 };
  const q: Quad = [d, c, b, a];
  const travel = poses.value[TRAVEL_SLOT]?.x ?? 0;
  return {
   opacity: moving && !reduced ? .74 + .18 * Math.sin(travel * 48) : .72,
   transform: [{ matrix: matrix4(multiply3(quadHomography(q), [1 / 72, 0, -.25, 0, 1 / 32, 0, 0, 0, 1])) }],
  };
 });
 return <Animated.View style={[absolute, { width: 108, height: 32, transformOrigin: [0, 0, 0] }, style]}>
  <View style={{ position: 'absolute', left: 19, top: 1, width: 70, height: 30, borderRadius: 16, backgroundColor: '#28797773' }}/>
  {moving && wakeFoam.map(({ left, top, length, angle }) => <View key={left} style={{
   position: 'absolute', left, top, width: 2, height: length, borderRadius: 2, backgroundColor: '#FFFDF8',
   transform: [{ rotate: `${angle}deg` }],
  }}/>)}
 </Animated.View>;
}
export const BakedCanoe = memo(function BakedCanoe({ poses, index, moving, reduced = false }: { poses: SharedValue<SpritePose[]>; index: number; moving: boolean; reduced?: boolean }) {
 const style = useAnimatedStyle(() => {
  const a = poses.value[index], b = poses.value[index + 1];
  if (!a || a.opacity === 0 || b.x - a.x < .05) return { opacity: 0 };
  const bow = canoeBow(a, b);
  return { opacity: 1, transform: [{ translateX: bow.x }, { translateY: bow.y - 74 }, { scale: bow.scale }] };
 });
 return <><CanoeWaterline poses={poses} index={index} moving={moving} reduced={reduced}/>
  <Animated.View style={[absolute, { width: 72, height: 74, transformOrigin: [0, 74, 0] }, style]}>
   <Image accessible={false} source={illustrated.canoe.source()} style={[absolute, { ...bowFrame, top: bowFrame.top + 74 }]} resizeMode="stretch" fadeDuration={0}/>
  </Animated.View></>;
});

/** Hazards, shells and power-ups as baked images (LG-S3 bake pipeline). A pre-mounted front twin
 * shows an already-decoded image: nothing is drawn on the CPU when it first becomes visible. */
export const BakedHazard=memo(function BakedHazard({kind,width,height,poses,index}:{kind:string;width:number;height:number;poses:SharedValue<SpritePose[]>;index:number}) {
 const picture = illustratedHazard(kind);
 if (picture) {
  const frame = actorImageFrame(picture, width, picture.contactHeight, height);
  return <><View style={{ position: 'absolute', left: width * .07, bottom: 0, width: width * .86, height: 4, borderRadius: 10, backgroundColor: '#554638', opacity: .22 }}/>
   <Image accessible={false} source={picture.source()} style={[absolute, frame]} resizeMode="stretch" fadeDuration={0}/></>;
 }
 const art=hazardArt()[kind];
 if(!art)return null;
 return <>{<Image accessible={false} source={art.art} style={{width,height}} fadeDuration={0}/>}{art.ball!==undefined&&<CoconutBall source={art.ball} width={width} height={height} poses={poses} index={index}/>}</>;
});
/** The ball rolls about its own centre (49,72 in the 100-unit source); its ground shadow stays put. */
function CoconutBall({source,width,height,poses,index}:{source:number;width:number;height:number;poses:SharedValue<SpritePose[]>;index:number}) {
 const style=useAnimatedStyle(()=>({transform:[{rotate:`${poses.value[index]?.angle??0}rad`}]}));
 return <Animated.View style={[absolute,{width,height,transformOrigin:[width*.49,height*.72,0]},style]}><Image accessible={false} source={source} style={{width,height}} fadeDuration={0}/></Animated.View>;
}
export function BakedShell({ size = 30 }: { size?: number }) {
 const ink = size * .93, inset = (size - ink) / 2;
 const frame = actorImageFrame(illustrated.shell, ink, ink, size - inset);
 return <Image accessible={false} source={illustrated.shell.source()} style={[absolute, { ...frame, left: frame.left + inset }]} resizeMode="stretch" fadeDuration={0}/>;
}
export function BakedPower({kind,size=44}:{kind:string;size?:number}) { const source=powerArt()[kind]; return source===undefined?null:<Image accessible={false} source={source} style={{width:size,height:size}} fadeDuration={0}/>; }
