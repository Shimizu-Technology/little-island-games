import React, { memo } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import Animated, { useAnimatedProps, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import type { SpritePose } from '../../poses';
import type { WorldId } from '../../types';
import { ArcadeSprite } from '../../Sprite';
import { CAMERA_SLOT, projectTrack, roadEdge } from './camera';
import { SCENE_COUNT, SCENE_START } from '../scrolling/environmentPoses';
import { palette } from '../scrolling/Art';

/** Only presentation consumes this slot. Engine state and contact projection stay unchanged. */

export function RunCamera({ poses, children }: { poses: SharedValue<SpritePose[]>; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => {
    const p = poses.value[CAMERA_SLOT];
    return { transform: [{ translateX: p?.x ?? 0 }, { translateY: p?.y ?? 0 }, { rotate: `${p?.angle ?? 0}rad` }, { scale: 1.035 }] };
  });
  return <Animated.View style={[{ position: 'absolute', width: 390, height: 660 }, style]}>{children}</Animated.View>;
}
export const HarborBackdrop = memo(function HarborBackdrop({ world }: { world: WorldId }) {
  const [sky,horizon,sea] = palette('lagoon-run',world), h=projectTrack(1,0), l=roadEdge(1.18,false),r=roadEdge(1.18,true);
  return <Svg width={390} height={660} viewBox="0 0 390 660" accessible={false}>
    <Defs><LinearGradient id="harbor-sky" x2="0" y2="1"><Stop stopColor={sky}/><Stop offset="1" stopColor="#FFF0B3"/></LinearGradient><LinearGradient id="harbor-water" x2="0" y2="1"><Stop stopColor={sea}/><Stop offset="1" stopColor="#168F9D"/></LinearGradient><LinearGradient id="harbor-deck" x2="0" y2="1"><Stop stopColor="#EDD398"/><Stop offset="1" stopColor="#C78A51"/></LinearGradient><LinearGradient id="harbor-fog" x2="0" y2="1"><Stop stopColor="#FFF4D4" stopOpacity={.85}/><Stop offset="1" stopColor="#FFF4D4" stopOpacity={0}/></LinearGradient></Defs>
    <Rect width={390} height={660} fill="url(#harbor-sky)"/><Circle cx={290} cy={72} r={48} fill="#FFE9AB" opacity={.3}/><Circle cx={290} cy={72} r={29} fill="#FFF2BC"/>
    <Path d="M0 65q24-15 49 0h36q13-22 35 0h28M230 119q15-14 30 0h58q14-22 37 0h35" fill="none" stroke="#FFF7DC" strokeWidth={11} strokeLinecap="round" opacity={.6}/>
    <Path d="M0 213V135Q20 94 42 128L58 174Q84 132 102 183L143 213M245 213Q269 158 294 180L317 129Q344 85 365 134L390 157V213" fill={horizon}/><Path d="M0 213V179Q23 143 43 181Q60 153 80 183L112 213M275 213Q303 162 328 192Q356 140 390 173V213" fill="#4B9E87"/>
    <Rect y={211} width={390} height={449} fill="url(#harbor-water)"/>
    <G fill="none" stroke="#9FE4CF" strokeWidth={3} opacity={.6}><Path d="M0 247h53m264 0h73M0 300h74m240 0h76M0 387h36m322 0h32M0 498h27m339 12h24"/></G>
    <Path d={`M${h.x} ${h.y}L${r.x} ${r.y}H${l.x}Z`} fill="url(#harbor-deck)"/>
    {[-.5,.5,1.5,2.5].map(lane=>{const p=projectTrack(lane,1.18);return <Path key={lane} d={`M195 211L${p.x} ${p.y}`} stroke={lane===-.5||lane===2.5?'#FFE5A6':'#9A653E'} strokeWidth={lane===-.5||lane===2.5?7:2} opacity={.8}/>;})}
    <Path d="M165 260L116 660M225 260L274 660" stroke="#FFE0A1" strokeWidth={2} opacity={.3}/>
    <Path d="M80 211H310L390 302H0Z" fill="url(#harbor-fog)"/>
    <G fill="#23785E" stroke="#195E53" strokeWidth={2}><Path d="M0 0H101Q62 20 84 49Q42 30 49 69Q13 47 0 93Z"/><Path d="M390 0H307Q328 21 302 52Q349 25 341 74Q378 48 390 96Z"/></G>
    <G stroke="#E4B76E" strokeWidth={2} opacity={.6}><Path d="M0 8L64 31M390 8L325 32"/></G>
  </Svg>;
});
const HarborProp=memo(function HarborProp({index}:{index:number}) {
  const kind=Math.floor(index/2)%3;
  return <Svg width={100} height={240} viewBox="0 0 100 140" preserveAspectRatio="none" accessible={false}><Ellipse cx={50} cy={135} rx={43} ry={5} fill="#165B5C" opacity={.25}/><G stroke="#31544A" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
    {kind===0?<><Path d="M42 138Q62 76 48 25L57 23Q74 79 53 138Z" fill="#AB7445"/><Path d="M49 131L58 133M53 114L63 117M57 94L67 98M58 75L67 78M56 56L64 57" stroke="#E2AD67" strokeWidth={3}/><Path d="M52 29Q22-7 0 29Q22 14 52 29Q75-6 100 25Q78 14 52 29Q12 23 4 65Q24 39 52 29Q88 24 99 63Q76 40 52 29Q33 47 38 75Q52 53 52 29Z" fill="#25855D"/><Path d="M7 29L51 29L95 25M12 56L52 29L91 55" fill="none" stroke="#72B86B"/><Circle cx={48} cy={35} r={6} fill="#B38A4E"/><Circle cx={58} cy={38} r={5} fill="#805D3B"/></>:kind===1?<><Path d="M11 135V76L65 62L92 78V134Z" fill="#E2AD6A"/><Path d="M65 62L92 78V134L65 128Z" fill="#A66641"/><Path d="M4 80L42 32L99 78L65 87Z" fill="#C77C45"/><Path d="M4 80L42 32L65 87Z" fill="#F0BF65"/><Path d="M14 73L41 42M27 78L44 50M40 81L48 59M67 77L54 49M83 76L62 54" stroke="#A66A3D"/><Path d="M24 134V98H45V134" fill="#275D5E"/><Path d="M70 95H85V111H70Z" fill="#FFD878"/><Path d="M18 93L55 87M16 117H56M15 127H55" stroke="#BB804F"/><Path d="M7 86L65 94L96 85" fill="none" stroke="#FFF0BC" strokeWidth={3}/><Path d="M8 93v42M61 95v40" stroke="#795A3C" strokeWidth={4}/></>:<><Path d="M1 137L7 66L28 33L60 45L91 93L99 137Z" fill="#628D7C"/><Path d="M7 66L28 33L41 82L60 45L91 93L66 114L41 82L23 137H1Z" fill="#99B194"/><Path d="M41 82L66 114L58 137H23Z" fill="#4E756B"/><Path d="M18 58L27 44M68 91L79 98" stroke="#CCD4A6"/><Path d="M76 137V58" stroke="#765139" strokeWidth={5}/><Path d="M66 62L64 40H88L86 62Z" fill="#C48245"/><Path d="M76 48Q53 32 75 10Q91 30 76 48Z" fill="#FFD16D" stroke="#E8A14B"/><Path d="M76 43Q68 33 77 25Q84 38 76 43Z" fill="#FFF5BE" strokeWidth={0}/><Path d="M4 134q9-26 24-3q8-24 19 6" fill="#40895F"/></>}
  </G></Svg>;
});
export const HarborEnvironment=memo(function HarborEnvironment({poses}:{poses:SharedValue<SpritePose[]>}) {
  return <>{Array.from({length:SCENE_COUNT},(_,j)=>{const i=SCENE_COUNT-1-j;return <ArcadeSprite key={i} poses={poses} index={SCENE_START+i} width={100} height={240}><HarborProp index={i}/></ArcadeSprite>;})}</>;
});
export function SpeedLines({poses}:{poses:SharedValue<SpritePose[]>}) {
  const style=useAnimatedStyle(()=>({opacity:poses.value[CAMERA_SLOT]?.scale??0}));
  return <Animated.View pointerEvents="none" style={[{position:'absolute',width:390,height:660},style]}><Svg width={390} height={660}><G stroke="#FFF9DE" strokeLinecap="round" fill="none" opacity={.6}>{[0,1,2,3].map(i=><G key={i}><Path d={`M${22+i*9} ${320+i*57}l${-13-i*4} ${45+i*7}`} strokeWidth={2+i*.5}/><Path d={`M${368-i*9} ${320+i*57}l${13+i*4} ${45+i*7}`} strokeWidth={2+i*.5}/></G>)}</G></Svg></Animated.View>;
}
export function Shell({size=30}:{size?:number}) {return <Svg width={size} height={size} viewBox="0 0 32 32" accessible={false}><Circle cx={16} cy={16} r={15} fill="#FFF1A0" opacity={.24}/><Path d="M8 24L3 14Q2 8 7 7Q9 2 14 5Q19 1 23 6Q30 5 29 13L24 24L19 28H13Z" fill="#FFD476" stroke="#9B693F" strokeWidth={1.7}/><Path d="M14 24L8 10M17 24V8M20 24L25 10" stroke="#FFF3BF" strokeWidth={2} strokeLinecap="round"/><Path d="M10 25H23L20 29H13Z" fill="#E9A957" stroke="#9B693F" strokeWidth={1.3}/><Circle cx={8} cy={9} r={2} fill="#FFFBE0"/></Svg>;}

const MovingPath=Animated.createAnimatedComponent(Path);
export function HarborPlanks({poses}:{poses:SharedValue<SpritePose[]>}) {
  const props=useAnimatedProps(()=>{
    let d='';
    for(let i=0;i<7;i++) {
      const p=poses.value[35+i*2];if(!p||(p.opacity??1)===0)continue;
      const scale=p.scale??1,y=p.y+18+18*scale,w=179.4*scale;
      d+=`M${195-w} ${y}H${195+w} M${195-w*.7} ${y+3*scale}q${w*.2} ${5*scale} ${w*.4} 0`;
    }
    return {d};
  });
  return <Svg width={390} height={660} style={{position:'absolute'}} accessible={false}><MovingPath animatedProps={props} stroke="#9F6942" strokeWidth={1.5} fill="none"/></Svg>;
}

/** Foreground palms frame the route without entering its collision corridor. */
export const HarborFrame=memo(function HarborFrame(){return <Svg width={390} height={660} style={{position:'absolute'}} accessible={false}><G stroke="#315448" strokeWidth={2} strokeLinejoin="round">
  <Path d="M-39 660Q18 378 21 164L33 164Q43 395-15 660Z" fill="#94623E"/><Path d="M-26 619L-7 625M-15 555L5 561M-3 487L16 493M7 418L25 423M15 350L32 354M20 281L36 284M23 218L36 220" stroke="#DBA86A" strokeWidth={4}/>
  <Path d="M23 173Q-9 107-53 145Q-5 145 23 173Q44 102 97 135Q55 139 23 173Q-23 152-40 218Q-2 182 23 173Q70 158 94 210Q56 182 23 173Q17 211 36 237Q45 198 23 173Z" fill="#287F57"/><Path d="M-19 148L23 173L76 137M-23 200L23 173L77 196M23 173L35 219" fill="none" stroke="#90C56B"/>
  <Path d="M428 660Q372 382 365 150L353 150Q346 404 404 660Z" fill="#78533D"/><Path d="M420 616L400 623M409 548L389 555M397 481L378 488M386 414L367 420M375 346L359 351M367 279L353 283M363 215L350 217" stroke="#C9945C" strokeWidth={4}/>
  <Path d="M360 158Q328 94 281 135Q327 130 360 158Q385 91 433 131Q388 131 360 158Q313 142 295 210Q333 173 360 158Q404 142 431 196Q387 170 360 158Q349 193 369 224Q379 183 360 158Z" fill="#236F53"/><Path d="M302 130L360 158L410 127M311 190L360 158L413 183M360 158L368 207" fill="none" stroke="#6FAB68"/>
</G></Svg>;});
