import type { RunState } from './engine';
import { KITE_STRINGS } from '../scrolling/runnerAnchors';
import React, { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import type { SpritePose } from '../../poses';
import { CUE_MOVES } from './drawOrder';
import { POWER_LABELS, POWER_SECONDS, type PowerKind } from './course';
const ink='#3E424F';
export const PowerIcon = memo(function PowerIcon({kind,size=42}:{kind:PowerKind;size?:number}) {
  return <Svg width={size} height={size} viewBox="0 0 64 64" accessible={false}><Circle cx={32} cy={32} r={29} fill="#FFF4CD" stroke={ink} strokeWidth={3}/><G stroke={ink} strokeWidth={3} strokeLinejoin="round">
    {kind==='magnet'?<><Path d="M14 14V35Q15 56 32 56Q50 56 50 35V14H38V34Q38 43 32 43Q26 43 26 34V14Z" fill="#EF977F"/><Path d="M14 23H26M38 23H50" stroke="#FFF7DA" strokeWidth={6}/><Path d="M5 14L10 19M54 20L60 14" stroke="#E4AA4E"/></>:
    kind==='kite'?<><Path d="M32 7L53 26L32 44L11 26Z" fill="#6FC0C8"/><Path d="M32 7V44M11 26H53" fill="none" stroke="#FFE4A0"/><Path d="M32 44Q17 49 35 57" fill="none"/><Path d="M24 47L36 52M25 54L36 58" stroke="#EF977F"/></>:
    kind==='sandals'?<><Path d="M19 12Q26 12 25 25L20 36Q17 43 10 39Q6 35 11 26L13 16Q14 12 19 12M44 10Q52 11 50 25L46 35Q43 43 36 38Q32 35 36 26L38 14Q40 10 44 10" fill="#F4C86A"/><Path d="M9 45L21 48L10 52L22 56M34 44L48 47L37 52L50 55" fill="none" stroke="#5B9A87"/></>:
    <><Path d="M32 9L52 18V34Q48 49 32 57Q16 49 12 34V18Z" fill="#8EBE85"/><Ellipse cx={32} cy={31} rx={14} ry={17} fill="#4F8A76"/><Path d="M24 19L32 27L41 20M32 27V43M19 34L32 27L46 34" fill="none" stroke="#D5E5A1"/></>}
  </G></Svg>;
});
/** Steps once a second with the published whole seconds. An animated SVG prop here was pushed every
 * frame and repainted on the main thread, which dropped frames for as long as a power lasted (L2). */
export const PowerRing = memo(function PowerRing({kind,remaining}:{kind:Exclude<PowerKind,'none'>;remaining:number;state?:SharedValue<RunState>}) {
  const fraction=kind==='shield'?1:Math.min(1,remaining/POWER_SECONDS[kind]);
  return <View accessible accessibilityLabel={`${POWER_LABELS[kind]}${kind==='shield'?' ready':` ${Math.ceil(remaining)} seconds`}`} testID={`run-power-${kind}`} style={{alignItems:'center',width:52}}><View style={{width:48,height:48}}><PowerIcon kind={kind} size={48}/><Svg width={48} height={48} style={{position:'absolute'}} viewBox="0 0 48 48"><Circle cx={24} cy={24} r={22} fill="none" stroke="#2F806F" strokeWidth={4} strokeDasharray={`${138.23*fraction} 138.23`} rotation={-90} origin="24,24"/>{kind!=="shield"&&<><Circle cx={39} cy={38} r={9} fill="#293B49"/><SvgText x={39} y={42} fontSize={11} fontWeight="900" textAnchor="middle" fill="#FFF4CD">{Math.ceil(remaining)}</SvgText></>}</Svg></View></View>;
});
export { BakedDeck as Deck, BakedCanoe as Canoe } from './Baked';
export function GhostMove({move}:{move:string}) {
  return <Svg width={110} height={60} viewBox="0 0 110 60" accessible={false}><Rect x={1} y={1} width={108} height={58} rx={18} fill="#FFF3D3" stroke={ink} strokeWidth={2}/><Path d="M28 49V27Q28 22 32 22Q36 22 36 27V34L41 33Q46 33 46 38L43 50H31Z" stroke={ink} strokeWidth={2} fill="#E3AE82"/><SvgText x={70} y={30} textAnchor="middle" fontSize={27} fontWeight="900" fill={ink}>{move==='jump'?'↑':move==='duck'?'↓':move==='right'?'→':'←'}</SvgText><SvgText x={70} y={48} textAnchor="middle" fontSize={12} fontWeight="800" fill={ink}>{move==='jump'?'Jump':move==='duck'?'Roll':'Move'}</SvgText></Svg>;
}

export const KiteRig = memo(function KiteRig(){return <Svg width={72} height={110} viewBox="0 0 72 110" accessible={false}><G stroke="#3E424F" strokeWidth={2.5} strokeLinejoin="round"><Path d="M36 3L68 36L36 72L4 36Z" fill="#79CFD1"/><Path d="M36 3V72L4 36Z" fill="#F3B178"/><Path d="M36 3V72M4 36H68" stroke="#FFF1CB"/><Path d={KITE_STRINGS} fill="none" stroke="#FFF0C9"/><Path d="M36 72Q24 80 39 88Q47 96 34 101" fill="none" stroke="#EF9B83"/></G></Svg>});

/** Teaching never travels: opacity-only avoids a hidden-sprite transform flash on web.
 * All four moves are pre-mounted; the pose picks one on the UI thread. A passing row never
 * re-renders SVG text (that re-render was the remaining pickup hitch, L2). */
function CueVariant({poses,index}:{poses:SharedValue<SpritePose[]>;index:number}) {
  const style=useAnimatedStyle(()=>{const p=poses.value[57];return {opacity:p&&p.frame===index?p.opacity??0:0};});
  return <Animated.View pointerEvents="none" style={[{position:'absolute',left:0,top:0,width:110,height:60},style]}><GhostMove move={CUE_MOVES[index]}/></Animated.View>;
}
export const RunTeachingCue = memo(function RunTeachingCue({poses}:{poses:SharedValue<SpritePose[]>}) {
  return <View pointerEvents="none" style={{width:110,height:60}}>{CUE_MOVES.map((_,i)=><CueVariant key={i} poses={poses} index={i}/>)}</View>;
});
