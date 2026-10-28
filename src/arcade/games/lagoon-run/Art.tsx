import React, { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import type { SpritePose } from '../../poses';
import { Hazard } from '../scrolling/Art';
import { HAZARDS, POWER_LABELS, POWER_SECONDS, type HazardKind, type PowerKind, type Surface } from './course';
const AnimatedPath = Animated.createAnimatedComponent(Path);
const ink='#3E424F';
export const RunHazard = memo(function RunHazard({kind,size=72}:{kind:string;size?:number}) {
  if (['coconut','crab','frond','line'].includes(kind)) return <Hazard kind={kind} size={size} height={size*(HAZARDS[kind as HazardKind]==='jump'?1:1.8)}/>;
  const canoe=kind==='canoe'||kind==='moving-canoe', high=kind==='net'||kind==='banner';
  return <Svg width={size} height={size*(HAZARDS[kind as HazardKind]==='jump'?1:1.8)} viewBox="0 0 100 100" preserveAspectRatio="none" accessible={false}>
    <Ellipse cx={50} cy={90} rx={43} ry={6} fill={ink} opacity={.18}/>
    <G stroke={ink} strokeWidth={3.5} strokeLinejoin="round">
      {kind==='log' ? <><Path d="M14 52L79 41L88 79L23 88Z" fill="#AE7850"/><Ellipse cx={22} cy={70} rx={15} ry={19} fill="#E9BE85"/><Ellipse cx={22} cy={70} rx={7} ry={11} fill="none" stroke="#A46B49"/><Path d="M38 54L74 48M41 77L80 70" fill="none" stroke="#E3AC70"/></> :
      kind==='crate' ? <><Path d="M16 42L71 30L87 44V85L31 94L16 79Z" fill="#BD8258"/><Path d="M31 52L87 44M31 52V94M16 42L31 52M38 57L79 82M79 52L39 88" fill="none" stroke="#FFE0A0" strokeWidth={5}/><Circle cx={63} cy={40} r={12} fill="#A6B66B"/></> :
      kind==='cooler' ? <><Path d="M13 48L76 39L89 52V84L27 94L13 81Z" fill="#73C4CB"/><Path d="M13 48L76 39L89 52L27 64Z" fill="#FFF3CD"/><Path d="M27 64V94M45 65V76H65V62" fill="none"/><Rect x={46} y={76} width={17} height={9} rx={3} fill="#FFC878"/></> :
      high ? <><Path d="M7 91V10M93 91V10" stroke="#966B4D" strokeWidth={7}/><Path d="M7 13Q50 20 93 13V51Q51 58 7 51Z" fill={kind==='net'?'#A6D4C2':'#EF9E85'}/>{kind==='net'?<G stroke="#477668" strokeWidth={2}>{[20,37,54,71,88].map(x=><Path key={x} d={`M${x} 17l-15 36M${x-12} 17l20 37`}/>)}</G>:<Path d="M17 21L30 43L43 22L56 43L70 22L84 42" stroke="#FFE4A0" strokeWidth={6} fill="none"/>}<Path d="M25 77H75M29 77L38 69M29 77L38 85" stroke="#FFF0C3" strokeWidth={4}/></> :
      canoe ? <><Path d="M20 83L25 25Q48-2 70 25L78 83Q50 99 20 83Z" fill={kind==='moving-canoe'?'#F3B05D':'#D88D67'}/><Path d="M34 74V27Q49 12 60 27V75Z" fill="#6B6C68"/><Path d="M22 43H78M24 69H77M77 40L94 46V86L77 80" fill="none" stroke="#FFE4A3" strokeWidth={5}/>{kind==='moving-canoe'&&<Path d="M7 92L17 87M86 96L94 91M6 76L14 72" stroke="#D9FFF1" strokeWidth={4}/>}</> :
      kind==='rock' ? <><Path d="M5 82L15 41L39 20L72 27L94 59L88 87L46 95Z" fill="#7D98A0"/><Path d="M15 41L48 50L39 20M48 50L72 27M48 50L46 95M48 50L88 87" fill="none" stroke="#B4CAC6"/></> : <><Path d="M10 88V26L50 6L91 26V88Z" fill="#CA9B70"/><Path d="M5 29L50 5L95 29" stroke="#718F67" strokeWidth={12}/><Path d="M14 46H87M14 64H87M14 81H87" stroke="#A16E58"/><Path d="M31 25V89M72 24V89" stroke="#FFE0A2" strokeWidth={7}/></>}
    </G>
  </Svg>;
});
export const PowerIcon = memo(function PowerIcon({kind,size=42}:{kind:PowerKind;size?:number}) {
  return <Svg width={size} height={size} viewBox="0 0 64 64" accessible={false}><Circle cx={32} cy={32} r={29} fill="#FFF4CD" stroke={ink} strokeWidth={3}/><G stroke={ink} strokeWidth={3} strokeLinejoin="round">
    {kind==='magnet'?<><Path d="M14 14V35Q15 56 32 56Q50 56 50 35V14H38V34Q38 43 32 43Q26 43 26 34V14Z" fill="#EF977F"/><Path d="M14 23H26M38 23H50" stroke="#FFF7DA" strokeWidth={6}/><Path d="M5 14L10 19M54 20L60 14" stroke="#E4AA4E"/></>:
    kind==='kite'?<><Path d="M32 7L53 26L32 44L11 26Z" fill="#6FC0C8"/><Path d="M32 7V44M11 26H53" fill="none" stroke="#FFE4A0"/><Path d="M32 44Q17 49 35 57" fill="none"/><Path d="M24 47L36 52M25 54L36 58" stroke="#EF977F"/></>:
    kind==='sandals'?<><Path d="M19 12Q26 12 25 25L20 36Q17 43 10 39Q6 35 11 26L13 16Q14 12 19 12M44 10Q52 11 50 25L46 35Q43 43 36 38Q32 35 36 26L38 14Q40 10 44 10" fill="#F4C86A"/><Path d="M9 45L21 48L10 52L22 56M34 44L48 47L37 52L50 55" fill="none" stroke="#5B9A87"/></>:
    <><Path d="M32 9L52 18V34Q48 49 32 57Q16 49 12 34V18Z" fill="#8EBE85"/><Ellipse cx={32} cy={31} rx={14} ry={17} fill="#4F8A76"/><Path d="M24 19L32 27L41 20M32 27V43M19 34L32 27L46 34" fill="none" stroke="#D5E5A1"/></>}
  </G></Svg>;
});
export function PowerRing({kind,remaining}:{kind:Exclude<PowerKind,'none'>;remaining:number}) {
  const fraction=kind==='shield'?1:remaining/POWER_SECONDS[kind];
  return <View accessible accessibilityLabel={`${POWER_LABELS[kind]}${kind==='shield'?' ready':` ${Math.ceil(remaining)} seconds`}`} testID={`run-power-${kind}`} style={{alignItems:'center',width:52}}><View style={{width:48,height:48}}><PowerIcon kind={kind} size={48}/><Svg width={48} height={48} style={{position:'absolute'}} viewBox="0 0 48 48"><Circle cx={24} cy={24} r={22} fill="none" stroke="#2F806F" strokeWidth={4} strokeDasharray={`${138.23*fraction} 138.23`} rotation={-90} origin="24,24"/>{kind!=="shield"&&<><Circle cx={39} cy={38} r={9} fill="#293B49"/><SvgText x={39} y={42} fontSize={11} fontWeight="900" textAnchor="middle" fill="#FFF4CD">{Math.ceil(remaining)}</SvgText></>}</Svg></View></View>;
}
/** The deck corners are projected in runPoses on UI using the same camera as the runner. */
export const Deck = memo(function Deck({poses,index,surface,incline=false}:{poses:SharedValue<SpritePose[]>;index:number;surface:Surface;incline?:boolean}) {
  const top=useAnimatedProps(()=>{
    const a=poses.value[index],b=poses.value[index+1],c=poses.value[index+2],d=poses.value[index+3];
    if(!a||!b||!c||!d||a.opacity===0)return {d:'M0 0',opacity:0};
    const middleX=(a.x+b.x)/2,backX=(c.x+d.x)/2;
    const hull=surface==='canoe-roof'?`M${a.x} ${a.y}Q${middleX} ${a.y+18} ${b.x} ${b.y}L${c.x} ${c.y}Q${backX} ${c.y-8} ${d.x} ${d.y}Z`:`M${a.x} ${a.y}L${b.x} ${b.y}L${c.x} ${c.y}L${d.x} ${d.y}Z`;
    let slats='';for(let i=1;i<(incline?2:6);i++){const t=i/(incline?2:6);slats+=` M${a.x+(d.x-a.x)*t} ${a.y+(d.y-a.y)*t}L${b.x+(c.x-b.x)*t} ${b.y+(c.y-b.y)*t}`;}
    return {d:hull+slats,opacity:1};
  });
  const side=useAnimatedProps(()=>{
    const a=poses.value[index],b=poses.value[index+1],c=poses.value[index+2],d=poses.value[index+3];
    if(!a||!b||!c||!d||a.opacity===0)return {d:'M0 0',opacity:0};
    const lift=a.scale??0,back=d.scale??0;
    if(incline)return {d:`M${b.x} ${b.y}L${b.x} ${b.y+lift}L${c.x} ${c.y+back}L${c.x} ${c.y}Z`,opacity:1};
    return {d:`M${a.x} ${a.y}L${a.x} ${a.y+lift}L${b.x} ${b.y+lift}L${c.x} ${c.y+back}L${c.x} ${c.y}L${b.x} ${b.y}Z`,opacity:1};
  });
  return <><AnimatedPath animatedProps={side} fill="#8F6655" stroke="#4E5254" strokeWidth={2}/><AnimatedPath animatedProps={top} fill={surface==='canoe-roof'?'#D99768':'#D5B783'} stroke="#725B4F" strokeWidth={3} strokeLinejoin="round"/></>;
});
export function GhostMove({move}:{move:string}) {
  return <Svg width={110} height={60} viewBox="0 0 110 60" accessible={false}><Rect x={1} y={1} width={108} height={58} rx={18} fill="#FFF3D3" stroke={ink} strokeWidth={2}/><Path d="M28 49V27Q28 22 32 22Q36 22 36 27V34L41 33Q46 33 46 38L43 50H31Z" stroke={ink} strokeWidth={2} fill="#E3AE82"/><SvgText x={70} y={30} textAnchor="middle" fontSize={27} fontWeight="900" fill={ink}>{move==='jump'?'↑':move==='duck'?'↓':move==='right'?'→':'←'}</SvgText><SvgText x={70} y={48} textAnchor="middle" fontSize={12} fontWeight="800" fill={ink}>{move==='jump'?'Jump':move==='duck'?'Roll':'Move'}</SvgText></Svg>;
}

export const KiteRig = memo(function KiteRig(){return <Svg width={72} height={110} viewBox="0 0 72 110" accessible={false}><G stroke="#3E424F" strokeWidth={2.5} strokeLinejoin="round"><Path d="M36 3L68 36L36 72L4 36Z" fill="#79CFD1"/><Path d="M36 3V72L4 36Z" fill="#F3B178"/><Path d="M36 3V72M4 36H68" stroke="#FFF1CB"/><Path d="M36 72L19 107M36 72L54 107" fill="none" stroke="#FFF0C9"/><Path d="M36 72Q24 80 39 88Q47 96 34 101" fill="none" stroke="#EF9B83"/></G></Svg>});
