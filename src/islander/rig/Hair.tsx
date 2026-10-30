import React from 'react';
import { G, Path } from 'react-native-svg';
import { hairColors, type IslanderLook } from '../look';
import type { Pose } from './poses';

/** Original island silhouettes, drawn in head-local coordinates. No clipping IDs. */
export function Hair({ look, pose, rear = false }: { look: IslanderLook; pose: Pose; rear?: boolean }) {
  const style = look.hairStyle, front = pose.view === 'front', [x,y] = pose.joints.head;
  const covered = !['none','flower-crown','runner-headband'].includes(look.hat);
  const swing = pose.frame !== undefined && (pose.frame < 8 || pose.frame >= 16) ? Math.sin((pose.frame >= 16 ? pose.frame-16+.5 : pose.frame)*Math.PI/4)*4 : 0;
  const long = ['long-straight','long-wavy','bob'].includes(style);
  const cap = 'M-27 2Q-31-11-24-23Q-17-31 0-29Q19-32 26-21Q31-10 27 3L23 12Q12 18 0 18Q-13 18-23 12Z';
  const fringe: Record<IslanderLook['hairStyle'], string> = {
    crop: 'M-27 3Q-31-12-24-23Q-13-31 0-29Q19-31 26-21Q31-11 27 3L22-5Q15-4 11-10Q-3-3-13-11L-20 1Z',
    curls: 'M-27 4Q-34-2-28-9Q-34-18-23-22Q-25-32-13-29Q-9-33 0-30Q12-34 17-28Q30-29 28-18Q36-11 28-4L25 5Q17 9 14 0Q5 3 0-3Q-9 4-15-2Q-22 9-27 4Z',
    ponytail: 'M-27 4Q-31-14-22-24Q-11-31 3-29Q23-29 28-11L27 5L21-8Q12-9 5-17Q-4-5-20-5L-23 6Z',
    braids: 'M-27 5Q-33-15-22-24Q-9-32 0-28Q12-32 24-21Q31-10 27 5L22 9L19-9Q7-9 0-20Q-6-9-20-7L-22 10Z',
    'buzz-cut': 'M-27-1Q-28-27 0-27Q28-27 27-1L23-6Q0-13-23-6Z',
    'short-spiky': 'M-27 3L-29-13L-22-12L-24-26L-14-22L-9-33L0-26L9-32L15-24L25-27L24-17L30-15L27 3L20-5L11-11L1-7L-12-11L-21-3Z',
    'side-part': 'M-27 4Q-32-12-23-23Q-12-32 4-29Q25-29 28-10L27 4L22-6Q14-9 10-18Q0-4-21-2L-23 6Z',
    'afro-puffs': 'M-27 4Q-30-12-20-22Q-8-29 0-26Q14-30 23-18Q29-9 27 5L22 8L20-5Q7-7 0-16Q-7-5-20-4L-22 8Z',
    'top-knot': 'M-27 5Q-31-17-16-25Q0-31 16-25Q31-17 27 5L22 9L19-7Q8-10 0-20Q-8-10-19-7L-22 9Z',
    'long-straight': 'M-28 7Q-32-14-23-25Q-11-32 0-28Q12-32 24-23Q31-13 28 7L25 24L19 20L20-8Q8-8 0-18Q-8-8-20-8L-19 20L-25 24Z',
    'long-wavy': 'M-28 8Q-34-5-28-14Q-29-27-15-28Q-6-33 1-28Q16-32 25-23Q33-13 28-4Q35 7 28 18L30 30L24 33L23 17Q27 7 21-5Q8-6 1-17Q-7-8-20-5Q-27 6-23 17L-24 33L-30 30L-27 18Z',
    pigtails: 'M-27 5Q-32-14-20-24Q-9-31 0-27Q13-32 24-20Q31-10 27 5L22 9L20-7Q9-7 0-19Q-8-8-20-7L-22 9Z',
    bob: 'M-28 10Q-33-14-22-25Q-9-32 0-28Q14-32 25-21Q32-9 28 12L24 27L17 25L19-7Q4-6-4-16Q-7-6-20-5L-18 26L-25 27Z',
    'mohawk-fade': 'M-27 1Q-28-23-10-25L-8-32L0-28L7-33L10-25Q28-23 27 1L23-5Q16-9 10-17L7-9L0-12L-6-8L-12-17L-23-4Z',
  };
  const tail = style === 'ponytail' ? `M8-18Q32-24 30 0Q27 11 30 23Q18 33 11 25Q22 12 14 1L4-7Z` : style === 'braids' ? 'M-23-1Q-32 9-27 16Q-31 23-24 29Q-27 35-20 40L-14 37Q-18 30-16 25Q-13 18-19 13L-17 2ZM23-1Q32 9 27 16Q31 23 24 29Q27 35 20 40L14 37Q18 30 16 25Q13 18 19 13L17 2Z' : style === 'pigtails' ? 'M-23-9Q-33-12-34 5Q-34 17-28 28Q-18 25-21 15Q-27 6-19-1ZM23-9Q38-12 34 5Q39 17 28 28Q18 25 21 15Q27 6 19-1Z' : style === 'afro-puffs' ? 'M-21-13Q-34-7-33-20Q-34-26-32-30Q-32-33-24-34Q-15-34-12-31Q-5-26-13-20Q-13-13-21-13ZM21-13Q35-7 36-20Q39-26 32-30Q32-33 24-34Q15-34 12-31Q5-26 13-20Q13-13 21-13Z' : style === 'top-knot' ? 'M-12-24Q-17-37 0-37Q17-37 12-24Z' : '';
  const curtain = style === 'long-wavy' ? 'M-25-9H25Q34 5 28 20Q34 32 26 44Q17 49 8 44Q-2 49-12 45Q-25 49-29 39Q-34 29-28 17Q-34 4-25-9Z' : style === 'bob' ? 'M-26-9H26L29 25Q17 34 0 30Q-18 34-29 25Z' : 'M-25-9H25L28 44Q0 50-28 44Z';
  const strands = style === 'braids' ? 'M-26 12L-18 17M-26 23L-18 28M-24 32L-17 36M26 12L18 17M26 23L18 28M24 32L17 36' : style === 'long-wavy' ? 'M-22 5Q-28 13-22 21Q-17 29-22 39M23 3Q28 13 22 22Q17 32 22 39M-10 25Q-14 33-9 41M10 25Q15 34 10 41' : style === 'curls' ? 'M-23-16q-4-6 2-7M-12-21q-2-7 4-5M2-22q2-7 7-3M19-16q6-4 6 2' : style === 'buzz-cut' || style === 'mohawk-fade' ? 'M-23-7l2-2m1-5l2-2m38 9l-2-2m-1-5l-2-2M-14-19l2-1m24 0l2 1' : 'M-20-14Q-18-22-9-23M5-24Q15-24 21-16';
  const crownStrands = ['curls','buzz-cut','mohawk-fade'].includes(style) ? strands : style === 'braids' || style === 'pigtails' ? 'M0-26Q-6-12-21-6M0-26Q6-12 21-6' : 'M-20-14Q-18-22-9-23M5-24Q15-24 21-16';
  const backCap = style === 'curls' ? 'M-27 6Q-34 1-28-6Q-35-14-27-19Q-28-29-17-27Q-13-35-4-29Q5-35 12-29Q23-32 26-23Q35-21 29-11Q36-4 28 3Q32 12 23 14Q18 23 10 17Q0 24-8 18Q-18 24-22 15Q-31 16-27 6Z' : style === 'crop' ? 'M-27 2Q-31-11-24-23Q-17-31 0-29Q19-32 26-21Q31-10 27 3L21 10L16 15L8 13L0 17L-8 13L-17 15L-23 10Z' : cap;
  if (pose.compact) return rear ? null : <G data-back-hair={style}><Path d={`M${x-12} ${y}Q${x-13} ${y-12} ${x} ${y-12}Q${x+13} ${y-12} ${x+12} ${y}Q${x} ${y+13} ${x-12} ${y}Z`} fill={hairColors[look.hairColor]}/></G>;
  if (rear && !front) return null;
  const showTail = rear || !front;
  return <G data-back-hair={!front ? style : undefined} data-hair={style} transform={`translate(${x} ${y})`} fill={hairColors[look.hairColor]}>
    {showTail && <G transform={`translate(${swing} 0)`}>
      {long && <><Path d={curtain}/><Path d="M18 0Q28 21 22 43L12 45Q19 24 15 0Z" fill="#201D26" fillOpacity={.25} strokeWidth={0}/></>}
      {long && <Path d={strands} fill="none" stroke="#201D26" strokeOpacity={.45} strokeWidth={1.1}/>}
      {tail && !(covered && style === 'top-knot') && <><Path d={tail}/><Path d={strands} fill="none" stroke="#201D26" strokeOpacity={.45} strokeWidth={1.1}/></>}
    </G>}
    {(!rear || front) && <G transform={covered ? 'translate(0 2) scale(1 .88)' : undefined}>
      <Path d={rear ? backCap : front ? fringe[style] : style==='buzz-cut' ? 'M-27 0Q-30-28 0-27Q30-28 27 0L22 8Q0 4-22 8Z' : backCap}/>
      <Path d={front && !rear ? 'M-26-1Q-21-7-18-10L-21 0L-23 7Z' : 'M-24 6Q0 17 24 6L23 12Q0 23-23 12Z'} fill="#201D26" fillOpacity={.25} strokeWidth={0}/>
      <Path d={crownStrands} fill="none" stroke="#201D26" strokeOpacity={.5} strokeWidth={1.05}/>
      <Path d="M-19-19Q-12-27-3-25Q-9-20-18-17Z" fill="#FFF4DA" fillOpacity={.22} strokeWidth={0}/>
      {!front && style === 'side-part' && <Path d="M7-23Q0-10-20-5M9-20Q18-14 21-6" fill="none" strokeWidth={1.1}/>}
      {!front && style === 'short-spiky' && <Path d="M-25-18l1-9 10 4 6-9 9 7 8-6 6 8 9-2 -1 8"/>}
      {!front && style === 'mohawk-fade' && <Path d="M-8 11L-10-26L-7-32L0-28L7-33L10-26L8 11Q0 17-8 11Z"/>}
    </G>}
    {showTail && ['ponytail','braids','pigtails'].includes(style) && <Path d={style==='ponytail'?'M12-10l7 2':style==='braids'?'M-24 35l7-1M17 34l7 1':'M-27 4l7 2M20 6l7-2'} fill="none" stroke="#E5B77D" strokeWidth={2.6}/ >}
  </G>;
}
