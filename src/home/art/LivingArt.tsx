import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { ItemVisualState } from '../world';
import type { TintId } from '../catalogMore';
import { material } from './Tint';
import { HandProp } from './PropShape';
import { holdableIds, type HoldableId } from './living';
const ink='#385451', cream='#FFF1D3', wood='#D99E6C';
export const livingIds = [...holdableIds,'floor-lamp','table-lamp','lamp','sink-counter','tv','radio','fridge','fruit-bowl'] as const;
export const hasLivingArt = (id: string) => (livingIds as readonly string[]).includes(id);
export function LivingShape({id,state={},tint='original',reduced=false}:{id:string;state?:ItemVisualState;tint?:TintId;reduced?:boolean}) {
  const color=material(tint,'#79BDB1'), on=!!state.on;
  return <G fill="none" stroke={ink} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
    {(holdableIds as readonly string[]).includes(id) ? <G transform="translate(30 28) scale(3.6)"><HandProp id={id as HoldableId} state={state} tint={tint}/></G>
    : ['lamp','floor-lamp','table-lamp'].includes(id) ? <G>
      {on && <G stroke="none"><Ellipse cx={75} cy={132} rx={65} ry={12} fill="#F6CD71" opacity={.14}/><Ellipse cx={75} cy={131} rx={48} ry={7} fill="#F6CD71" opacity={.2}/><Circle cx={75} cy={59} r={51} fill="#FFE1A0" opacity={.12}/><Circle cx={75} cy={59} r={39} fill="#FFE1A0" opacity={.16}/></G>}
      <G transform={id==='table-lamp'?'translate(15 38) scale(.8 .7)':undefined}><Ellipse cx={75} cy={126} rx={27} ry={7} fill={wood}/><Path d="M75 122V61" stroke={wood} strokeWidth={7}/><Path d="M49 20H101L122 68Q75 87 28 68Z" fill={on?'#FFE4A2':color}/><Path d="M43 62Q75 72 108 62" fill="none" stroke={cream} strokeWidth={4}/><Path d="M107 76v14"/><Circle cx={107} cy={93} r={3} fill={wood}/></G>
    </G> : id==='sink-counter' ? <>
      <Path d="M9 65L121 55L141 71V132L27 143L9 127Z" fill={color}/><Path d="M9 65L121 55L141 71L27 83Z" fill={cream}/><Ellipse cx={76} cy={70} rx={32} ry={10} fill="#A7CDD0"/><Path d="M99 61V34Q99 19 83 24V40" fill="none" stroke="#9FAFA6" strokeWidth={7}/><Path d="M40 88v43m49-48v43m-35-29v10m47-14v10" fill="none" stroke="#5B9086"/>
      {on && <G data-water="running"><Path d="M83 40V68" stroke="#8FD3DD" strokeWidth={5}/><Path d="M82 67q-11-8-16-1m18 0q10-8 17-2M72 71h22" fill="none" stroke="#D8F4ED" strokeWidth={3}/></G>}
    </> : id==='tv' ? <>
      <Path d="M60 117l-8 16m42-16 8 16" stroke={wood} strokeWidth={7}/><Rect x={10} y={30} width={130} height={88} rx={12} fill={material(tint,wood)}/><Rect x={18} y={38} width={114} height={70} rx={7} fill={on?'#B9DFDC':'#4D6869'}/>
      {on && <><Circle cx={103} cy={56} r={10} fill="#FFF1C1"/><Path d="M20 83Q45 56 74 81Q102 65 130 83V106H20Z" fill="#91B49A"/><Path d="M20 96Q76 76 130 97" fill="none" stroke="#DAEEDB" strokeWidth={3}/></>}<Circle cx={127} cy={113} r={2} fill={on?'#F6D27F':'#7A8F80'}/>
    </> : id==='radio' ? <>
      <Path d="M43 45V30Q75 17 108 30V45M112 48l14-28" fill="none" stroke={wood} strokeWidth={5}/><Rect x={13} y={48} width={126} height={78} rx={15} fill={color}/><Circle cx={49} cy={87} r={25} fill={cream}/><Circle cx={49} cy={87} r={17} fill="#B3D2C5"/><Path d="M38 81h22m-24 6h26m-24 6h22" stroke="#709C92"/><Rect x={84} y={64} width={38} height={13} rx={4} fill={cream}/><Path d="M92 70h20" stroke={wood}/><Circle cx={97} cy={103} r={8} fill={wood}/><Circle cx={121} cy={103} r={5} fill={cream}/>
      {on && <G data-notes={reduced?'static':'still'} fill={wood} strokeWidth={2}><Path d="M20 31V14l12-3v16" fill="none"/><Ellipse cx={16} cy={32} rx={4} ry={3}/><Ellipse cx={28} cy={28} rx={4} ry={3}/></G>}
    </> : id==='fridge' ? <>
      <Rect x={27} y={8} width={94} height={132} rx={10} fill={color}/><Rect x={35} y={17} width={78} height={114} rx={4} fill={on?'#466D63':cream}/>
      {on ? <><G>{[['mango',39,29],['banana',76,28],['juice',40,78],['rice-ball',77,79]].map(([food,x,y])=><G key={food} transform={`translate(${x} ${y}) scale(1.1)`}><HandProp id={food as HoldableId}/></G>)}</G><Path d="M36 64H112M36 115H112" stroke={cream} strokeWidth={5}/><Path d="M117 16L145 29V135L117 130Z" fill="#BCD9CD"/><Path d="M128 47l12 3v28l-12-3Zm0 47 12 3v24l-12-3Z" fill={cream}/></> : <><Rect x={35} y={17} width={78} height={42} rx={4} fill={color}/><Rect x={35} y={64} width={78} height={67} rx={4} fill={color}/><Path d="M46 29v19m0 29v24" stroke={cream} strokeWidth={5}/></>}
      <Path d="M37 140v4m74-4v4" stroke={wood} strokeWidth={5}/>
    </> : id==='fruit-bowl' ? <>
      <G transform="translate(24 53) scale(1.8)"><HandProp id="mango"/></G><G transform="translate(67 62) scale(1.8)"><HandProp id="banana"/></G><Path d="M16 83Q75 107 134 83Q126 135 75 136Q25 135 16 83Z" fill={color}/><Path d="M28 94Q75 113 122 94" fill="none" stroke={cream} strokeWidth={4}/>
    </> : null}
  </G>;
}
export function LivingArt({id,size=120,state,mirrored=false,rotation=0,tint,reduced=false}:{id:string;size?:number;state?:ItemVisualState;mirrored?:boolean;rotation?:number;tint?:TintId;reduced?:boolean}) {
  const flip=mirrored !== (rotation===180||rotation===270);
  return <Svg width={size} height={size} viewBox="0 0 150 150" accessible={false}><G transform={flip?'translate(150 0) scale(-1 1)':undefined}><LivingShape id={id} state={state} tint={tint} reduced={reduced}/></G></Svg>;
}
