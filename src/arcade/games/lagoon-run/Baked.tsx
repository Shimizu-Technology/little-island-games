import React, { memo } from 'react';
import { Image } from 'react-native';
import Animated, { useAnimatedReaction, useSharedValue, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import type { SpritePose } from '../../poses';
import { projectTrack } from './camera';
import { matrix4, multiply3, quadHomography, type Quad } from './quad';
import atlas from '../../../../assets/arcade/lagoon/manifest.json';
import { RAMP_SECTIONS } from './surface';
export const TRAVEL_SLOT = 35;
const floorSources = () => [
  require('../../../../assets/arcade/lagoon/floor-0.png'),
  require('../../../../assets/arcade/lagoon/floor-1.png'),
  require('../../../../assets/arcade/lagoon/floor-2.png'),
  require('../../../../assets/arcade/lagoon/floor-3.png'),
  require('../../../../assets/arcade/lagoon/floor-4.png'),
  require('../../../../assets/arcade/lagoon/floor-5.png'),
  require('../../../../assets/arcade/lagoon/floor-6.png'),
  require('../../../../assets/arcade/lagoon/floor-7.png'),
  require('../../../../assets/arcade/lagoon/floor-8.png'),
  require('../../../../assets/arcade/lagoon/floor-9.png'),
  require('../../../../assets/arcade/lagoon/floor-10.png'),
  require('../../../../assets/arcade/lagoon/floor-11.png'),
];
const stillCanoes = () => [
  require('../../../../assets/arcade/lagoon/canoe-still-0.png'),
  require('../../../../assets/arcade/lagoon/canoe-still-1.png'),
  require('../../../../assets/arcade/lagoon/canoe-still-2.png'),
  require('../../../../assets/arcade/lagoon/canoe-still-3.png'),
];
const movingCanoes = () => [
  require('../../../../assets/arcade/lagoon/canoe-moving-0.png'),
  require('../../../../assets/arcade/lagoon/canoe-moving-1.png'),
  require('../../../../assets/arcade/lagoon/canoe-moving-2.png'),
  require('../../../../assets/arcade/lagoon/canoe-moving-3.png'),
];
const deckSource = () => require('../../../../assets/arcade/lagoon/deck.png'), roofSource = () => require('../../../../assets/arcade/lagoon/roof.png'), inclineSource = () => require('../../../../assets/arcade/lagoon/incline.png');
const leftSource=()=>require('../../../../assets/arcade/lagoon/deck-left.png'),rightSource=()=>require('../../../../assets/arcade/lagoon/deck-right.png');
const railSource = () => require('../../../../assets/arcade/lagoon/rail.png'), supportSource = () => require('../../../../assets/arcade/lagoon/support.png');
const absolute={position:'absolute' as const,left:0,top:0};
export function floorFrame(travel:number) {
  'worklet';
  return Math.floor(((travel % .065 + .065) % .065) / .065 * 12) % 12;
}
function FloorFrame({poses,frame}:{poses:SharedValue<SpritePose[]>;frame:number}) {
  const visible=useSharedValue(frame===0);
  useAnimatedReaction(()=>{const p=poses.value[TRAVEL_SLOT];return floorFrame(p?.opacity===0?0:p?.x??0)===frame;},next=>{if(next!==visible.value)visible.set(next);},[poses,frame]);
  const style=useAnimatedStyle(()=>({opacity:visible.value?1:0}));
  return <Animated.View style={[absolute,{top:290,width:390,height:370},style]}><Image accessible={false} source={floorSources()[frame]} resizeMode="stretch" style={{width:390,height:370}} fadeDuration={0}/></Animated.View>;
}
/** Twelve decoded material frames. No path generation, parsing or CPU SVG paint per frame. */
export const BakedFloor=memo(function BakedFloor({poses}:{poses:SharedValue<SpritePose[]>}) {
 return <>{floorSources().map((_,frame)=><FloorFrame key={frame} poses={poses} frame={frame}/>)}<Rails poses={poses}/></>;
});
function Rail({poses,index,side}:{poses:SharedValue<SpritePose[]>;index:number;side:number}) {
 const style=useAnimatedStyle(()=>{
  const travel=poses.value[TRAVEL_SLOT]?.x??0,z=((travel+index*.26)%2.86+2.86)%2.86-1.2;
  if(z<=-1.17||z>=1.45)return {opacity:0,transform:[{scale:0}]};
  const a=projectTrack(1+side*1.55,z),b=projectTrack(1+side*1.55,z+.26);
  const q:Quad=[a,b,{x:b.x,y:b.y-57*b.scale},{x:a.x,y:a.y-57*a.scale}];
  return {opacity:1,transform:[{matrix:matrix4(multiply3(quadHomography(q),[1/128,0,-16/128,0,-1/128,1,0,0,1]))}]};
 });
 return <Animated.View style={[absolute,{width:160,height:144,transformOrigin:[0,0,0]},style]}><Image accessible={false} source={railSource()} style={{width:160,height:144}} fadeDuration={0}/></Animated.View>;
}
const Rails=memo(function Rails({poses}:{poses:SharedValue<SpritePose[]>}) {return <>{Array.from({length:11},(_,i)=><React.Fragment key={i}><Rail poses={poses} index={i} side={-1}/><Rail poses={poses} index={i} side={1}/></React.Fragment>)}</>;});
function TextureQuad({poses,index,source,width,height,side}:{poses:SharedValue<SpritePose[]>;index:number;source:number;width:number;height:number;side?:'left'|'right'}) {
 const slot=useSharedValue<SpritePose[]>([]);
 useAnimatedReaction(()=>poses.value[index]?.opacity===0?null:poses.value.slice(index,index+4),q=>{if(q)slot.set(q);else if(slot.value.length)slot.set([]);},[poses,index]);
 const style=useAnimatedStyle(()=>{
  let q=slot.value as unknown as Quad;
  if(q.length<4)return {opacity:0,transform:[{scale:0}]};
  if(side){const a=q[side==='left'?0:1],b=q[side==='left'?3:2];q=[a,b,{x:b.x,y:b.y+5},{x:a.x,y:a.y+5}];}
  const h=quadHomography(q);
  return {opacity:1,transform:[{matrix:matrix4(multiply3(h,[1/width,0,0,0,1/height,0,0,0,1]))}]};
 });
 return <Animated.View style={[absolute,{width,height,transformOrigin:[0,0,0]},style]}><Image accessible={false} source={source} style={{width,height}} fadeDuration={0}/></Animated.View>;
}
function Support({poses,index}:{poses:SharedValue<SpritePose[]>;index:number}) {
 const style=useAnimatedStyle(()=>{
  const p=poses.value[index],h=p?.scale??0;
  return {opacity:!p || p.opacity===0 || h<=0?0:1,transform:[{translateX:(p?.x??0)-4},{translateY:p?.y??0},{scaleY:h/128},{scaleX:.5}]};
 });
 return <Animated.View style={[absolute,{width:16,height:128,transformOrigin:[0,0,0]},style]}><Image accessible={false} source={supportSource()} style={{width:16,height:128}} fadeDuration={0}/></Animated.View>;
}
export const BakedDeck=memo(function BakedDeck({poses,index,surface,incline=false}:{poses:SharedValue<SpritePose[]>;index:number;surface:string;incline?:boolean}) {
 return <><TextureQuad poses={poses} index={index} source={leftSource()} width={16} height={16} side="left"/><TextureQuad poses={poses} index={index} source={rightSource()} width={16} height={16} side="right"/>{!incline && <><Support poses={poses} index={index}/><Support poses={poses} index={index+1}/><Support poses={poses} index={index+2}/></>}{Array.from({length:incline?RAMP_SECTIONS:1},(_,i)=><TextureQuad key={i} poses={poses} index={index+i*4} source={incline&&i===0?inclineSource():surface==='canoe-roof'?roofSource():deckSource()} width={128} height={incline&&i===0?128:256}/>)}</>;
});
function CanoeFrame({poses,index,frame,moving}:{poses:SharedValue<SpritePose[]>;index:number;frame:number;moving:boolean}) {
 const meta=atlas.canoes[frame];
 const slot=useSharedValue<SpritePose[]>([]);
 useAnimatedReaction(()=>{
  const p=poses.value[index];if(!p||p.opacity===0)return null;
  const scale=p.scale??0,z=2.2*(2*scale/(1+scale))-1.2,selected=z<.35?0:z<.8?1:z<1.2?2:3;
  return selected===frame?poses.value.slice(index,index+4):null;
 },q=>{if(q)slot.set(q);else if(slot.value.length)slot.set([]);},[poses,index,frame]);
 const style=useAnimatedStyle(()=>{
  const q=slot.value as unknown as Quad;if(q.length<4)return {opacity:0,transform:[{scale:0}]};
  return {opacity:1,transform:[{matrix:matrix4(multiply3(quadHomography(q),meta.inverse))}]};
 });
 return <Animated.View style={[absolute,{width:meta.width,height:meta.height,transformOrigin:[0,0,0]},style]}><Image accessible={false} source={(moving?movingCanoes():stillCanoes())[frame]} style={{width:meta.width,height:meta.height}} fadeDuration={0}/></Animated.View>;
}
export const BakedCanoe=memo(function BakedCanoe({poses,index,moving}:{poses:SharedValue<SpritePose[]>;index:number;moving:boolean}) {
 return <>{atlas.canoes.map((_,frame)=><CanoeFrame key={frame} poses={poses} index={index} frame={frame} moving={moving}/>)}</>;
});
