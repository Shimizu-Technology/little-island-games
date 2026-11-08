import type { RunState } from './engine';
import { KITE_STRINGS } from '../scrolling/runnerAnchors';
import React, { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import Animated, { useAnimatedProps, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import type { SpritePose } from '../../poses';
import { HAZARDS, POWER_LABELS, POWER_SECONDS, type HazardKind, type PowerKind } from './course';
const AnimatedCircle=Animated.createAnimatedComponent(Circle);
const AnimatedGroup=Animated.createAnimatedComponent(G);
function Coconut({poses,index=0}:{poses?:SharedValue<SpritePose[]>;index?:number}) {
  const rotation=useAnimatedProps(()=>{const a=poses?.value[index]?.angle??0,c=Math.cos(a),s=Math.sin(a);return {opacity:1,matrix:[c,s,-s,c,49-49*c+72*s,72-49*s-72*c]};});
  return <AnimatedGroup animatedProps={rotation}><Circle cx={49} cy={72} r={23} fill="#AE7950"/><Path d="M34 59Q49 44 63 61" stroke="#E4BA7D" strokeWidth={5} fill="none"/><Path d="M38 85Q35 69 48 55" stroke="#815743" fill="none"/>{[43,51,47].map((x,i)=><Circle key={i} cx={x} cy={66+i*6} r={2} fill="#493C37" strokeWidth={0}/>)}</AnimatedGroup>;
}
const ink='#3E424F';
/** Solids share a top-left light, ground contact and a 3-unit outline. */
export const RunHazard = memo(function RunHazard({kind,size=72,poses,index}:{kind:string;size?:number;poses?:SharedValue<SpritePose[]>;index?:number}) {
  const mode=HAZARDS[kind as HazardKind],duck=mode==='duck',low=mode==='jump',canoe=kind==='canoe'||kind==='moving-canoe';
  return <Svg width={duck?112:size} height={size*(low?1:1.8)} preserveAspectRatio="none" viewBox={`0 0 100 ${low?100:180}`} accessible={false}>
    <Ellipse cx={50} cy={low?94:175} rx={46} ry={low?5:5} fill="#344B50" opacity={.22}/>
    <G stroke={ink} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round">
      {duck ? <>
        <Path d="M5 177V26L13 21V172M87 172V21L95 26V177" fill="#B48358"/>
        <Path d="M4 27L12 20H88L96 27V92L88 101H12L4 92Z" fill={kind==='frond'?'#568B66':kind==='banner'?'#DC8872':'#80B5A2'}/>
        <Path d="M4 27L12 20H88L96 27Z" fill="#D2D998" strokeWidth={0}/><Path d="M88 29L96 27V92L88 101Z" fill="#214E52" opacity={.3} strokeWidth={0}/><Path d="M4 27H96M12 101H88" stroke="#FFE2AA" strokeWidth={5}/>
        {kind==='net'?<G stroke="#437767" strokeWidth={1.8}>{[14,32,50,68,86].map(x=><Path key={x} d={`M${x} 34l-10 58M${x} 34l10 58`}/>)}<Path d="M8 53H92M8 75H92"/></G>:kind==='frond'?<G fill="#92BE78">{[12,30,48,66,84].map(x=><Path key={x} d={`M${x} 32q15 17 7 58q-16-20-7-58Z`}/>)}</G>:<Path d="M15 37L29 79L43 37L57 79L71 37L85 79" stroke="#FFE8AC" strokeWidth={6} fill="none"/>}
        <Path d="M8 120V151M92 120V151" stroke="#F0C78B" strokeWidth={2}/>
      </> : canoe ? <>
        <Path d="M11 154L34 80Q49 61 63 78L90 151Q78 177 50 177Q23 174 11 154Z" fill={kind==='moving-canoe'?'#E8AE63':'#CE8768'}/>
        <Path d="M17 147L36 86Q49 74 60 86L82 147Q53 166 17 147Z" fill="#654E4B"/>
        <Path d="M26 126L37 104H64L76 130L51 142Z" fill="#E1BC7E"/>
        <Path d="M34 112V55L55 43L72 57V118L51 131Z" fill="#A58C62"/>
        <Path d="M34 55L51 66L72 57M51 66V131M36 77L69 102M68 74L37 105" stroke="#FFE4A4" fill="none" strokeWidth={4}/>
        <Path d="M11 154Q50 183 90 151M17 147L36 86M82 147L60 86" stroke="#F8D696" strokeWidth={4} fill="none"/>
        <Path d="M82 121L96 127V168L84 164M20 127H81" fill="none" stroke="#F8D696" strokeWidth={4}/>
      </> : kind==='log' ? <><Path d="M13 58L78 43L90 77L23 92Z" fill="#A77250"/><Path d="M15 58L78 43L85 52L22 70Z" fill="#DDA56D"/><Ellipse cx={22} cy={75} rx={15} ry={17} fill="#E9C38B"/><Ellipse cx={22} cy={75} rx={7} ry={10} fill="none" stroke="#AF7D55"/><Path d="M41 70L80 61M45 82L84 73" stroke="#7E5945" fill="none" strokeWidth={2}/></> :
      kind==='crate'||kind==='cooler' ? <><Path d="M8 58L70 44L92 58V83L29 96L8 80Z" fill={kind==='crate'?'#B88054':'#58A4B7'}/><Path d="M8 58L70 44L92 58L29 72Z" fill={kind==='crate'?'#E7BE7C':'#EAF2CC'}/><Path d="M29 72V96" fill="none"/>{kind==='crate'?<Path d="M36 74L83 86M83 64L36 91" stroke="#F6D699" strokeWidth={4}/>:<Path d="M48 72V82H68V68" stroke="#E7EDCF" strokeWidth={4} fill="none"/>}</> :
      kind==='coconut' ? <Coconut poses={poses} index={index}/> :
      kind==='crab' ? <><Path d="M28 77L12 67L5 75M26 84L9 85L4 93M73 77L88 67L95 75M75 84L92 85L97 93" fill="none" stroke="#B96450" strokeWidth={5}/><Ellipse cx={50} cy={78} rx={27} ry={17} fill="#E28E6F"/><Path d="M30 72L19 59L9 64L7 49L18 44L28 55M70 72L81 59L91 64L93 49L82 44L72 55" fill="#F3AC84"/><Path d="M39 64V54M61 64V54" strokeWidth={4}/><Circle cx={39} cy={52} r={4} fill="#FFF0C6"/><Circle cx={61} cy={52} r={4} fill="#FFF0C6"/><Path d="M39 52h1M61 52h1" strokeWidth={3}/><Path d="M41 82Q50 87 59 82" fill="none" strokeWidth={2}/></> :
      kind==='rock' ? <><Path d="M7 163L14 79L39 47L70 58L92 117L86 172L44 177Z" fill="#78979D"/><Path d="M14 79L45 99L39 47L70 58L45 99Z" fill="#B8CFC6"/><Path d="M45 99L44 177L86 172L92 117Z" fill="#5F7E89"/><Path d="M14 79L45 99L70 58M45 99L44 177" fill="none"/></> : <>{[[8,112,42,60],[51,112,40,60],[26,51,49,60]].map(([x,y,w,h],i)=><G key={i}><Path d={`M${x} ${y}l8-9h${w}v${h}l-8 9Z`} fill="#936047"/><Path d={`M${x} ${y}h${w}v${h}H${x}Z`} fill={i===2?'#C18B54':'#B37D50'}/><Path d={`M${x} ${y}l8-9h${w}l-8 9Z`} fill="#E3B77A"/><Path d={`M${x+5} ${y+6}l${w-10} ${h-12}M${x+w-5} ${y+6}l${10-w} ${h-12}`} fill="none" stroke="#F0CC8B" strokeWidth={5}/><Path d={`M${x+5} ${y+4}h${w-10}M${x+5} ${y+h-4}h${w-10}`} stroke="#75523E" strokeWidth={3}/></G>)}</>}
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
export function PowerRing({kind,remaining,state}:{kind:Exclude<PowerKind,'none'>;remaining:number;state?:SharedValue<RunState>}) {
  const ring=useAnimatedProps(()=>{const t=state?.value;const v=kind==='shield'?1:t?t[kind]/POWER_SECONDS[kind]:remaining/POWER_SECONDS[kind];return {strokeDasharray:[138.23*v,138.23]};});
  const fraction=kind==='shield'?1:remaining/POWER_SECONDS[kind];
  return <View accessible accessibilityLabel={`${POWER_LABELS[kind]}${kind==='shield'?' ready':` ${Math.ceil(remaining)} seconds`}`} testID={`run-power-${kind}`} style={{alignItems:'center',width:52}}><View style={{width:48,height:48}}><PowerIcon kind={kind} size={48}/><Svg width={48} height={48} style={{position:'absolute'}} viewBox="0 0 48 48"><AnimatedCircle animatedProps={ring} cx={24} cy={24} r={22} fill="none" stroke="#2F806F" strokeWidth={4} strokeDasharray={`${138.23*fraction} 138.23`} rotation={-90} origin="24,24"/>{kind!=="shield"&&<><Circle cx={39} cy={38} r={9} fill="#293B49"/><SvgText x={39} y={42} fontSize={11} fontWeight="900" textAnchor="middle" fill="#FFF4CD">{Math.ceil(remaining)}</SvgText></>}</Svg></View></View>;
}
export { BakedDeck as Deck, BakedCanoe as Canoe } from './Baked';
export function GhostMove({move}:{move:string}) {
  return <Svg width={110} height={60} viewBox="0 0 110 60" accessible={false}><Rect x={1} y={1} width={108} height={58} rx={18} fill="#FFF3D3" stroke={ink} strokeWidth={2}/><Path d="M28 49V27Q28 22 32 22Q36 22 36 27V34L41 33Q46 33 46 38L43 50H31Z" stroke={ink} strokeWidth={2} fill="#E3AE82"/><SvgText x={70} y={30} textAnchor="middle" fontSize={27} fontWeight="900" fill={ink}>{move==='jump'?'↑':move==='duck'?'↓':move==='right'?'→':'←'}</SvgText><SvgText x={70} y={48} textAnchor="middle" fontSize={12} fontWeight="800" fill={ink}>{move==='jump'?'Jump':move==='duck'?'Roll':'Move'}</SvgText></Svg>;
}

export const KiteRig = memo(function KiteRig(){return <Svg width={72} height={110} viewBox="0 0 72 110" accessible={false}><G stroke="#3E424F" strokeWidth={2.5} strokeLinejoin="round"><Path d="M36 3L68 36L36 72L4 36Z" fill="#79CFD1"/><Path d="M36 3V72L4 36Z" fill="#F3B178"/><Path d="M36 3V72M4 36H68" stroke="#FFF1CB"/><Path d={KITE_STRINGS} fill="none" stroke="#FFF0C9"/><Path d="M36 72Q24 80 39 88Q47 96 34 101" fill="none" stroke="#EF9B83"/></G></Svg>});

/** Teaching never travels: opacity-only avoids a hidden-sprite transform flash on web. */
export function RunTeachingCue({poses,move}:{poses:SharedValue<SpritePose[]>;move:string}) {
  const style=useAnimatedStyle(()=>({opacity:poses.value[57]?.opacity??0}));
  return <Animated.View pointerEvents="none" style={[{position:'absolute',left:260,top:78,width:110,height:60},style]}><GhostMove move={move}/></Animated.View>;
}
