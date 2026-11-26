import React from 'react';
import { Ellipse, G, Path } from 'react-native-svg';
import { clampRig, type Gaze, type MealFrame, type MealPlayback } from './character';
import { MealLayer, mealGroups } from './MealLayer';
import type { IslanderLook } from '../look';
import type { Expression, Pose } from './poses';
/** Small circle built with quadratic curves only (no SVG arc commands). */
const dot = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}Q${cx - r} ${cy - r} ${cx} ${cy - r}Q${cx + r} ${cy - r} ${cx + r} ${cy}Q${cx + r} ${cy + r} ${cx} ${cy + r}Q${cx - r} ${cy + r} ${cx - r} ${cy}Z`;
const star = (cx: number) =>
  `M${cx} 3.2l1.6 3.1 3.4 .5 -2.5 2.4 .6 3.4 -3.1-1.6 -3.1 1.6 .6-3.4 -2.5-2.4 3.4-.5Z`;
export function Face({look,pose,expression,blink=false,gaze,meal,playback,sipping=false}: {look: IslanderLook; pose: Pose; expression?: Expression; blink?: boolean; gaze?: Gaze; meal?: MealFrame; playback?: MealPlayback; sipping?: boolean}) {
  if(pose.view !== 'front') return null;
  const [x,y]=pose.joints.head, e=expression??pose.expression, stars=!expression&&(pose.id==='cheer'||pose.id==='dance-1'||pose.id==='dance-3'), wink=!expression&&(pose.id==='dance-0'||pose.id==='dance-2');
  const gx=clampRig(gaze?.x,-1,1)*2.2, gy=clampRig(gaze?.y,-1,1)*1.6;
  const brows=look.brows??'soft', lash=look.lashes==='lashes'||(look.lashes===undefined&&look.presentation==='girl');
  // Warm storybook espresso ink deepens on cocoa/earth so features stay lively on every skin tone.
  const dark=look.skinTone==='cocoa'||look.skinTone==='earth';
  const line=dark?'#231512':'#3B2418', iris=dark?'#1D110D':'#2A1A14';
  const openSmile=!playback&&!meal&&!sipping&&(stars||e==='proud');
  const eyeRy=e==='surprised'?4.15:3.85;
  const irisGlow=(cx:number)=>`M${cx-2.3} ${7.4+eyeRy*.38}Q${cx} ${7.4+eyeRy*1.08} ${cx+2.3} ${7.4+eyeRy*.38}Q${cx} ${7.4+eyeRy*.72} ${cx-2.3} ${7.4+eyeRy*.38}Z`;
  const catchlights=(cx:number)=>dot(cx-1.15,7.4-1.35,1.25)+dot(cx+1.25,7.4+1.35,.55);
  return <G transform={`translate(${x} ${y})`} stroke={line} data-expression={stars?'star-eyes':wink?'wink':e}>
    {look.cheeks!=='none'&&<G fill="#E88D7D" fillOpacity={dark?(look.cheeks==='rosy'?.48:.30):look.cheeks==='rosy'?.64:.44} strokeWidth={0}>
      <Ellipse cx={-15.8} cy={12.9} rx={5.1} ry={3.1}/><Ellipse cx={15.8} cy={12.9} rx={5.1} ry={3.1}/>
      {look.cheeks==='rosy'&&<Path d="M-18.3 12.7Q-15.8 11.1-13.3 12.7Q-15.8 14.3-18.3 12.7ZM13.3 12.7Q15.8 11.1 18.3 12.7Q15.8 14.3 13.3 12.7Z" fill="#F47968" fillOpacity={dark?.32:.38}/>}
    </G>}
    <Path d={e==='thinking'?'M-14.2 -1.2q3.4-4 7.4-2.8M6.8-1.4q3.4 0 7.4 2.2':e==='focused'?'M-14.2-1.8l7.2 2.1M7 .3l7.2-2.1':e==='surprised'?'M-14.2-4.4q3.6-3.2 7.4 0M6.8-4.4q3.6-3.2 7.4 0':brows==='straight'?'M-14-1.6h6.6M7.4-1.6h6.6':brows==='arched'?'M-14.2 -.8q3.6-4.8 7.4-1M6.8-1.8q3.8-3.8 7.4 1':'M-14.2-1.4q3.6-2.4 7.2-.2M7-1.6q3.6-2.2 7.2 .2'} fill="none" strokeWidth={brows==='bold'?2.55:2.05}/>
    {stars?<G>
      <Path d={star(-9.8)+star(9.8)} fill="#F8CE5C" strokeWidth={1.15}/>
      <Path d={dot(-10.3,7.3,1.25)+dot(9.3,7.3,1.25)} fill="#FFFDF6" strokeWidth={0}/>
    </G>:<G>
      {(blink||e==='proud'||e==='sleepy'||e==='yum')&&!wink?<Path data-eyes={e==='sleepy'||blink?'closed-arcs':undefined} d={e==='sleepy'||blink?'M-15.5 7.2q6 7.4 12 0M3.5 7.2q6 7.4 12 0':'M-13.6 8.3q4.3-5.1 8.6 0M5 8.3q4.3-5.1 8.6 0'} fill="none" strokeWidth={e==='sleepy'?1.85:1.75}/>:<G data-gaze="pupils" transform={`translate(${gx} ${gy})`} fill={iris} strokeWidth={0}>
        {wink?<Path d="M-13.6 8.2q4.3-4.8 8.6 0" fill="none" stroke={line} strokeWidth={1.85}/>:<Ellipse cx={-9.3} cy={7.4} rx={3.45} ry={eyeRy}/>}
        <Ellipse cx={9.3} cy={7.4} rx={3.45} ry={eyeRy}/>
        <Path d={`${wink?'':irisGlow(-9.3)}${irisGlow(9.3)}`} fill="#7A4934" fillOpacity={.62}/>
        <Path d={`${wink?'':catchlights(-9.3)}${catchlights(9.3)}`} fill="#FFFFFF"/>
      </G>}
      {lash&&<Path d="M-12 7l-3-2M12 7l3-2M-12.5 5.2l-2.5-2.1M12.5 5.2l2.5-2.1" fill="none" strokeWidth={1.45}/>}
    </G>}
    <Path d={`M-1.1 11.5Q0 13.7 1.3 11.7${playback||openSmile||e==='surprised'||e==='anticipate'||e==='chew'?'':e==='thinking'?'M-2.6 19.6q3-2.2 5.4 0':e==='sleepy'?'M-2.4 19.6q2.4 1.6 4.8 0':e==='yum'?(pose.id==='drink'?'M-2 20q2-3 4 0q-2 3-4 0':'M-4.6 18.6q4.6 5.2 9.2 0M2.8 18.6q2.6-1.8 3.6 .2'):e==='focused'||e==='neutral'?'M-3.2 19.6q3.2 1.4 6.4 0':'M-4.6 18.5q4.6 5 9.2 0'}`} fill="none" strokeWidth={1.25}/>
    {playback ? mealGroups(playback,f=>sipping?'sip':f.meal.bite?'bite':f.face==='chew'?`chew-${f.meal.chew}`:f.face).map(({frame:f,indices}) => <MealLayer key={indices[0]} playback={playback} index={indices}><MealMouth meal={f.meal} expression={f.face} sipping={sipping}/></MealLayer>) : <MealMouth stars={openSmile} meal={meal} expression={e} sipping={sipping}/>}
    {look.freckles==='freckles'&&<Path d="M-18.4 11.2h.1m3.7-.5h.1m1.7 2.8h.1M18.4 11.2h.1m-3.7-.5h.1m-1.7 2.8h.1" stroke={dark?'#BE8060':'#A46246'} strokeWidth={1.35}/>}
  </G>;
}

function MealMouth({ meal, expression: e = 'chew', sipping, stars = false }: { meal?: MealFrame; expression?: Expression; sipping: boolean; stars?: boolean }) {
  if (meal && !meal.bite && e === 'neutral' && !sipping) return <Path d="M-3.2 19.6q3.2 1.2 6.4 0" fill="none" strokeWidth={1.2}/>;
  if (sipping) return <Path data-mouth="sip" d="M-3 20q3-3 6 0q-3 3-6 0" fill="none" strokeWidth={1.7}/>;
  return <>{meal?.bite ? <><Path data-mouth="bite" d="M-7 17Q0 14 7 17L6 22Q0 27-6 22Z" fill="#9A484E" strokeWidth={1.4}/><Path d="M-6 17Q0 15 6 17V19H-6Z" fill="#FFF9EC" strokeWidth={0}/></> : (e==='anticipate'||e==='surprised')?<Ellipse cx={0} cy={20} rx={e==='anticipate'?4:2.7} ry={e==='anticipate'?4:3.2} fill="#9A484E" strokeWidth={1.15}/>:e==='chew'?<><Ellipse data-mouth="chew" cx={meal?.chew ? -9 : 9} cy={20} rx={4.4} ry={3.1} fill="#E88D7D" strokeWidth={0}/><Path d={meal?.chew ? "M-6 20q6 4.2 12 0" : "M-5 20q5 3.4 10 0"} fill="none" strokeWidth={1.8}/></>:stars?<><Path d="M-5.2 17.8Q0 16.8 5.2 17.8Q5 24.4 0 24.4Q-5 24.4-5.2 17.8Z" fill="#A64B52" strokeWidth={1.1}/><Path d="M-4.2 18Q0 17.4 4.2 18V19.6H-4.2Z" fill="#FFF9EE" strokeWidth={0}/></>:null}</>;
}
