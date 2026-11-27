import React, { useId } from 'react';
import Svg, { Path, Rect, Circle, G, Defs, LinearGradient, Stop, Ellipse } from 'react-native-svg';
import type { Building } from './camera';
/** One roof, floor beams and shoreline tie the rooms into a single island house. */
export const BuildingArt = React.memo(function BuildingArt({building:b}:{building:Building}) {
 const bottom=b.height-60;
 const id=`building-${useId().replace(/[^a-zA-Z0-9_-]/g,'')}`;
 const roof=`${id}-roof-grad`,glass=`${id}-porthole-grad`;
 const archCount=Math.floor((b.width-16)/16);
 const archStart=(b.width-archCount*16)/2;
 const scallops=Array.from({length:archCount},()=>'q8 13 16 0').join('');
 return <Svg width="100%" height="100%" viewBox={`0 0 ${b.width} ${b.height}`} accessible={false}>
  <Defs>
   <LinearGradient id={roof} x1="0" y1="0" x2="0%" y2="100%"><Stop offset="0" stopColor="#EFAD78"/><Stop offset=".45" stopColor="#D77D58"/><Stop offset="1" stopColor="#AE523E"/></LinearGradient>
   <LinearGradient id={glass} x1="0" y1="0" x2="100%" y2="100%"><Stop offset="0" stopColor="#FFF7CB"/><Stop offset="1" stopColor="#F2B85E"/></LinearGradient>
  </Defs>
  <Rect x={12} y={110} width={b.width-24} height={bottom-110} rx={14} fill="#C88E5B" stroke="#4A3328" strokeWidth={10}/>
  <Path d={`M4 118L${b.width*.12} 12H${b.width*.88}L${b.width-4} 118Z`} fill={`url(#${roof})`} stroke="#4A3328" strokeWidth={10} strokeLinejoin="round"/>
  <Path d={`M${b.width*.12} 34H${b.width*.88}M${b.width*.08} 64H${b.width*.92}M${b.width*.045} 94H${b.width*.955}`} stroke="#E8AA80" strokeWidth={7}/>
  {[{y:35,inset:.12},{y:65,inset:.08},{y:95,inset:.045}].map(({y,inset},row)=><G key={y}>
   <Path d={`M${b.width*inset} ${y+4}H${b.width*(1-inset)}`} stroke="#A95540" strokeWidth={3}/>
   {Array.from({length:Math.floor(b.width*(1-2*inset)/66)},(_,n)=>b.width*inset+32+n*66+(row%2)*22).filter(x=>x<b.width*(1-inset)-12).map(x=><Path key={x} d={`M${x} ${y+5}l-5 19`} stroke="#B76148" strokeWidth={2.5}/>)}
  </G>)}
  <Path d={`M${b.width*.13} 20H${b.width*.87}`} stroke="#FFE0A1" strokeWidth={5} strokeLinecap="round"/>
  <Path d={`M${archStart} 118${scallops}`} fill="none" stroke="#4A3328" strokeWidth={5}/>
  {[40,b.width-40].map((x,n)=><G key={x} transform={`translate(${x} 99) scale(${n?-1:1} 1)`}>
   <Path d="M0 0Q-26 -35 -32 -13Q-28 4 0 0M0 0Q15 -37 25 -22Q29 -5 0 0" fill="#72A66A" stroke="#4A3328" strokeWidth={3}/>
   {[0,72,144,216,288].map(a=><Ellipse key={a} cx={0} cy={-9} rx={7} ry={11} rotation={a} origin="0,0" fill="#F18D78" stroke="#4A3328" strokeWidth={2}/>)}<Circle r={5} fill="#FFD378"/>
  </G>)}
  <Circle cx={b.width/2} cy={69} r={25} fill={`url(#${glass})`} stroke="#4A3328" strokeWidth={7}/>
  <Path d={`M${b.width/2-21} 69h42M${b.width/2} 48v42`} stroke="#A87248" strokeWidth={5}/>
  <Path d={`M${b.width/2-15} 57q7 -9 15 -7`} stroke="#FFFCE8" strokeWidth={3} fill="none" strokeLinecap="round"/>
  {Array.from({length:b.floors-1},(_,n)=><Rect key={n} x={12} y={b.roof+(n+1)*b.roomHeight+n*b.gap} width={b.width-24} height={b.gap} fill="#A87248" stroke="#4A3328" strokeWidth={3}/>)}
  <Path d={`M0 ${bottom}Q${b.width*.3} ${bottom-18} ${b.width} ${bottom}V${b.height}H0Z`} fill="#ECD3A0"/>
  <Path d={`M0 ${b.height-12}Q${b.width*.25} ${b.height-36} ${b.width*.5} ${b.height-12}T${b.width} ${b.height-12}`} fill="none" stroke="#8EC8BE" strokeWidth={22}/>
 </Svg>;
});

/** Upstairs has a timber terrace; the shoreline belongs below the ground floor. */
export const TerraceArt = React.memo(function TerraceArt() {
 return <Svg width="100%" height="100%" viewBox="0 0 800 35" accessible={false}>
  <Rect width={800} height={35} fill="#C88E5B"/>
  <Path d="M0 4H800M0 26H800" stroke="#A87248" strokeWidth={2}/>
  {Array.from({length:8},(_,n)=><G key={n}><Path d={`M${n*110+30} 5v21`} stroke="#4A3328" strokeWidth={2}/><Path d={`M${n*110+44} 13q20 -4 47 0m-38 6h24`} stroke="#A87248" strokeWidth={1.5} fill="none"/></G>)}
  <Path d="M0 2H800" stroke="#FFE0A1" strokeWidth={4}/>
  <Path d="M0 32H800" stroke="#F3D3A1" strokeWidth={3}/>
 </Svg>;
});
export const BuildingTrim = React.memo(function BuildingTrim({building:b}:{building:Building}) {
 return <Svg width="100%" height="100%" viewBox={`0 0 ${b.width} ${b.height}`} accessible={false}>
  <Path d={`M12 120V${b.height-60}M${b.width-12} 120V${b.height-60}`} stroke="#4A3328" strokeWidth={18}/>
  <Path d={`M12 120V${b.height-60}M${b.width-12} 120V${b.height-60}`} stroke="#C88E5B" strokeWidth={11}/>
  <Path d={`M9 125V${b.height-68}M${b.width-15} 125V${b.height-68}`} stroke="#F4CE8F" strokeWidth={3}/>
  {Array.from({length:b.floors-1},(_,n)=>{
   const y=b.roof+(n+1)*b.roomHeight+n*b.gap;
   return <G key={n}><Rect x={12} y={y} width={b.width-24} height={b.gap} fill="#A87248" stroke="#4A3328" strokeWidth={3}/><Path d={`M12 ${y+4}H${b.width-12}`} stroke="#E0B886" strokeWidth={4}/></G>;
  })}
  {b.floors>1&&<G stroke="#4A3328" strokeLinecap="round"><Path d={`M${b.frame+800-14} ${b.roof+355}V${b.height-100}M${b.frame+800+14} ${b.roof+355}V${b.height-100}`} strokeWidth={10}/><Path d={`M${b.frame+786} ${b.roof+355}V${b.height-100}M${b.frame+814} ${b.roof+355}V${b.height-100}`} stroke="#C88E5B" strokeWidth={5}/>{Array.from({length:Math.floor((b.height-b.roof-455)/45)},(_,n)=><Path key={n} d={`M${b.frame+800-14} ${b.roof+380+n*45}h28`} strokeWidth={8}/>) }{Array.from({length:Math.floor((b.height-b.roof-455)/45)},(_,n)=><Path key={n} d={`M${b.frame+786} ${b.roof+379+n*45}h28`} stroke="#F4CE8F" strokeWidth={3}/>)}</G>}
 </Svg>;
});
