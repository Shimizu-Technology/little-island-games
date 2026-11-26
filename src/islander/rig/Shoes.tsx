import React from 'react';
import { G, Path } from 'react-native-svg';
import { shoeColors, skinTones, type IslanderLook } from '../look';
import type { Point } from './poses';
export function Shoes({look,foot,back,lifted,compact}: {look:IslanderLook;foot:Point;back:boolean;lifted:boolean;compact:boolean}) {
 const [x,y]=foot, style=look.shoes??'sneakers', color=shoeColors[look.shoeColor??'cream'];
 const boot=style==='boots'||style==='rain-boots', open=style==='sandals'||style==='flip-flops';
 const sole=back&&lifted&&!compact;
 const upper = sole
   ? 'M-4.7-5Q0-9.2 4.7-5L5.1 1.2Q0 5.2-5.1 1.2Z'
   : boot
     ? (style==='rain-boots' ? 'M-3.8-12.5Q0-13.4 3.8-12.5L4.1-3Q7.2-1.8 6.1 1.1Q0 3.2-5.2 1.1L-4.1-3Z' : 'M-3.6-11.8H3.6L4.1-3Q7.1-1.9 6 1.1Q0 3.2-5.2 1.1L-4-3Z')
     : 'M-4.1-3.2Q0-7.2 4.1-3.2L5.6-.1Q5.7 3.1 0 3.1Q-5.7 3.1-5.6-.1Z';
 const soleAndCap = sole
   ? 'M-3.1-4.1Q0-6.2 3.1-4.1L3.1 .1Q0 2.2-3.1 .1Z'
   : (open
       ? 'M-5.6 .1Q0 2.1 5.6 .1V2.2Q0 4.1-5.6 2.2Z'
       : boot
         ? (style==='rain-boots'
             ? 'M-5.4 .4Q0 2.2 6 .4V2.3Q0 4.1-5.4 2.3ZM-4-12.5Q0-13.5 4-12.5V-10.6Q0-11.5-4-10.6Z'
             : 'M-5.4 .3Q0 2.1 6 .3V2.4Q0 4.2-5.4 2.4ZM-3.7-11.8H3.7V-10H-3.7Z')
         : 'M-5.6 0Q0 2 5.6 0V2.1Q0 4.1-5.6 2.1ZM-4.8-.2Q0-2.6 4.8-.2Q0 1.4-4.8-.2Z' + (!compact ? 'M-3.1-9H3.1L3.3-5H-3.3ZM-3.1-7.2H3.1' : ''));
 const detail = sole
   ? 'M-1.5-3.2h3m-3 2.4h3m-2.4 2.2h1.8'
   : open
     ? (style==='sandals' ? 'M-4.2-3.2Q0-2.1 4.2-3.2M-4.3-1Q0 .1 4.3-1' : 'M-4.2-2.8L0-.6L4.2-2.8M0-.6V.8')
     : boot
       ? (style==='boots' ? 'M-2.2-8.2h4.4M-2.2-6h4.4M-2.2-3.8h4.4M-2.6-1.4Q0-2.8 2.8-1.4' : 'M-1.6-9.4Q-2.2-5.5 -1.4-2.2')
       : 'M-2.2-4.4l4.4 2m-4.4 0l4.4-2';
 const detailStroke = open ? color : style==='rain-boots' && !sole ? '#FFF9EE' : back ? '#B39E82' : '#6A5344';
 return <G data-shoe={style} transform={`translate(${x} ${y}) scale(1.15 1)`} strokeWidth={1.15}>
   <Path d={upper} fill={open?skinTones[look.skinTone]:color}/>
   <Path data-sole={sole?'lifted':'ground'} d={soleAndCap} fill={boot&&!sole&&style==='boots'?'#6F513E':'#FFF4DE'}/>
   <Path d={detail} fill="none" stroke={detailStroke} strokeWidth={open?2:style==='rain-boots'&&!sole?1.35:.9}/>
 </G>;
}
