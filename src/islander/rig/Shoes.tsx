import React from 'react';
import { G, Path } from 'react-native-svg';
import { shoeColors, skinTones, type IslanderLook } from '../look';
import type { Point } from './poses';

export function Shoes({ look, foot, back, lifted, compact }: { look: IslanderLook; foot: Point; back: boolean; lifted: boolean; compact: boolean }) {
  const [x, y] = foot, style = look.shoes ?? 'sneakers', color = shoeColors[look.shoeColor ?? 'cream'];
  const boot = style === 'boots' || style === 'rain-boots', open = style === 'sandals' || style === 'flip-flops';
  const sole = back && lifted && !compact;

  const upper = sole
    ? 'M-4.9-5.2Q0-9.4 4.9-5.2L5.3 1.4Q0 5.4-5.3 1.4Z'
    : boot
      ? (style === 'rain-boots'
          ? 'M-4.0-12.6Q0-13.6 4.0-12.6L4.4-3.0Q7.4-1.6 6.4 1.3Q0 3.5-5.6 1.3L-4.3-3.0Z'
          : 'M-3.9-11.6H3.9L4.5-2.8Q7.5-1.5 6.4 1.4Q0 3.5-5.6 1.4L-4.3-2.8Z')
      : open
        ? 'M-4.2-3.2Q0-6.8 4.2-3.2L5.6 0Q5.7 3.0 0 3.0Q-5.7 3.0-5.6 0Z'
        : 'M-4.3-4.0Q0-7.6 4.3-4.0L6.0-.2Q6.1 3.2 0 3.2Q-6.1 3.2-6.0-.2Z';

  // Chunky cream sneaker soles & rounded toe caps + cozy ankle socks, dark lug boot soles, contoured sandal footbeds.
  const soleAndCap = sole
    ? 'M-3.2-4.2Q0-6.4 3.2-4.2L3.2 .2Q0 2.4-3.2 .2Z'
    : open
      ? 'M-5.8 .2Q0 2.3 5.8 .2V2.4Q0 4.3-5.8 2.4Z'
      : boot
        ? (style === 'rain-boots'
            ? 'M-5.8 .4Q0 2.4 6.4 .4V2.5Q0 4.3-5.8 2.5ZM-4.2-12.6Q0-13.6 4.2-12.6V-10.4Q0-11.4-4.2-10.4Z'
            : 'M-5.8 .4Q0 2.4 6.4 .4V2.7Q0 4.4-5.8 2.7ZM-3.9-11.6H3.9V-9.8H-3.9Z')
        : 'M-6.0 .1Q0 2.2 6.0 .1V2.5Q0 4.4-6.0 2.5ZM-5.1 -.1Q0 -2.9 5.1 -.1Q0 1.6-5.1 -.1Z' + (!compact ? 'M-3.2-9.2H3.2L3.4-5.0H-3.4ZM-3.2-7.2H3.2' : '');

  const detail = sole
    ? 'M-1.6-3.2h3.2m-3.2 2.4h3.2m-2.4 2.2h1.6'
    : open
      ? (style === 'sandals' ? 'M-4.4-3.4Q0-1.6 4.4-3.4M-4.6-1.0Q0 .4 4.6-1.0M-3.8-3.0L3.8-1.2' : 'M-4.4-2.8L0-.5L4.4-2.8M0-.5V.9')
      : boot
        ? (style === 'boots' ? 'M-2.2-8.2h4.4M-2.2-6.0h4.4M-2.2-3.8h4.4M-2.8-1.4Q0-2.8 3.0-1.4' : 'M-1.8-9.6Q-2.4-5.6 -1.4-2.0')
        : 'M-2.4-4.6l4.8 2.0m-4.8 0l4.8-2.0M-5.2 1.4Q0 2.9 5.2 1.4';

  const soleFill = boot && !sole && style === 'boots' ? '#634330' : open && !sole ? '#C89B6E' : '#FFF6E4';
  const detailStroke = open ? color : style === 'rain-boots' && !sole ? '#FFFBF0' : style === 'sneakers' && !sole ? '#FFFBF0' : back ? '#B39E82' : '#5B4031';

  return <G data-shoe={style} transform={`translate(${x} ${y}) scale(1.16 1)`} strokeWidth={1.15}>
    <Path d={upper} fill={open ? skinTones[look.skinTone] : color}/>
    <Path data-sole={sole ? 'lifted' : 'ground'} d={soleAndCap} fill={soleFill}/>
    <Path d={detail} fill="none" stroke={detailStroke} strokeWidth={open ? 2.05 : style === 'rain-boots' && !sole ? 1.55 : style === 'sneakers' && !sole ? 1.15 : .95}/>
  </G>;
}
