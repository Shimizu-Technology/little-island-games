import React from 'react';
import Svg,{Circle,Path,Rect} from 'react-native-svg';
import type {Puzzle} from './movement';
export function Art({size}: {size:number}) {return <Svg width={size} height={size} viewBox="0 0 80 80"><Rect x={12} y={20} width={56} height={50} rx={12} fill="#8EADE4" stroke="#344F83" strokeWidth={3}/><Path d="M40 20V11" stroke="#344F83" strokeWidth={3}/><Circle cx={40} cy={9} r={4} fill="#EDB75E"/><Circle cx={30} cy={40} r={4} fill="#344F83"/><Circle cx={50} cy={40} r={4} fill="#344F83"/><Path d="M29 54Q40 63 51 54" fill="none" stroke="#344F83" strokeWidth={3}/></Svg>}

export function Grid({p,pos,size}:{p:Puzzle;pos:number;size:number}){return <Svg width={size} height={size} viewBox="0 0 250 250" accessibilityLabel={`Robot grid. Beep at row ${Math.floor(Math.max(pos,0)/5)+1}, column ${Math.max(pos,0)%5+1}. Shell at row ${Math.floor(p.shell/5)+1}, column ${p.shell%5+1}. Sandcastles: ${p.rocks.length?p.rocks.map(i=>`row ${Math.floor(i/5)+1}, column ${i%5+1}`).join("; "):"none"}.`}>
<Rect width={250} height={250} rx={18} fill="#D9E8DB"/>{Array.from({length:25},(_,i)=><Rect key={i} x={i%5*50+3} y={Math.floor(i/5)*50+3} width={44} height={44} rx={9} fill={(i+Math.floor(i/5))%2?'#F4E8C7':'#FFF5DA'}/>)}
{p.rocks.map((i)=><Path key={i} d={`M${i%5*50+8} ${Math.floor(i/5)*50+39}Q${i%5*50+9} ${Math.floor(i/5)*50+11} ${i%5*50+26} ${Math.floor(i/5)*50+10}Q${i%5*50+44} ${Math.floor(i/5)*50+17} ${i%5*50+42} ${Math.floor(i/5)*50+39}Z`} fill="#B59D83"/>)}
<Circle cx={p.shell%5*50+25} cy={Math.floor(p.shell/5)*50+25} r={14} fill="#F4BC9A" stroke="#A96955" strokeWidth={2}/><Path d={`M${p.shell%5*50+25} ${Math.floor(p.shell/5)*50+14}v23m-10-18 10 18 10-18`} fill="none" stroke="#C77963" strokeWidth={2}/>
{pos>=0&&<React.Fragment><Rect x={pos%5*50+9} y={Math.floor(pos/5)*50+10} width={32} height={32} rx={8} fill="#85A9E4" stroke="#344F83" strokeWidth={2}/><Circle cx={pos%5*50+20} cy={Math.floor(pos/5)*50+23} r={2} fill="#344F83"/><Circle cx={pos%5*50+30} cy={Math.floor(pos/5)*50+23} r={2} fill="#344F83"/><Path d={`M${pos%5*50+20} ${Math.floor(pos/5)*50+31}q5 5 10 0`} fill="none" stroke="#344F83" strokeWidth={2}/></React.Fragment>}
</Svg>;}
