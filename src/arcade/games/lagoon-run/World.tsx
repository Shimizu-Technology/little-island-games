import React, { memo } from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import type { SpritePose } from '../../poses';
import type { WorldId } from '../../types';
import { ArcadeSprite } from '../../Sprite';
import { CAMERA_SLOT, CONTACT, FOV_KICK, HERO_ZOOM } from './camera';
import { useStage } from './stage';
import { impactMotion } from './kinetics';
import { TRAVEL_SLOT } from './Baked';
import { Image } from 'react-native';
import { propArt } from './art.generated';
import { lagoonLook } from './look';
import { SCENE_COUNT, SCENE_START } from '../scrolling/environmentPoses';

/** Only presentation consumes this slot. Engine state and contact projection stay unchanged. */

export function RunCamera({ poses, impact, reduced = false, children }: { poses: SharedValue<SpritePose[]>; impact?: SharedValue<number>; reduced?: boolean; children: React.ReactNode }) {
  const stage = useStage(), offsetX = stage.x, offsetY = stage.y;
  const style = useAnimatedStyle(() => {
    const p = poses.value[CAMERA_SLOT], shake = impactMotion(impact?.value ?? 1, reduced);
    // Speed-line intensity (0..0.65, zero with Reduce Motion) widens the view a little: a small FOV kick.
    const zoom = HERO_ZOOM * (1 - FOV_KICK * Math.min(1, (p?.scale ?? 0) / .65));
    return { transform: [{ translateX: offsetX + (p?.x ?? 0) + shake.x }, { translateY: offsetY + (p?.y ?? 0) + shake.y - (zoom - 1) * (660 * CONTACT - 330) }, { rotate: `${p?.angle ?? 0}rad` }, { scale: zoom }] };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 390, height: 660 }, style]}>{children}</Animated.View>;
}
const HarborProp=memo(function HarborProp({index}:{index:number}) {
  const kind=Math.floor(index/2)%3;
  return <Svg width={100} height={240} viewBox="0 0 100 140" preserveAspectRatio="xMidYMax meet" accessible={false}><Ellipse cx={50} cy={135} rx={43} ry={5} fill="#165B5C" opacity={.25}/><G stroke="#164B53" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
    {kind===0?<><Path d="M42 138Q62 76 48 25L57 23Q74 79 53 138Z" fill="#AB7445"/><Path d="M49 131L58 133M53 114L63 117M57 94L67 98M58 75L67 78M56 56L64 57" stroke="#E2AD67" strokeWidth={3}/><Path d="M52 29Q22-7 0 29Q22 14 52 29Q75-6 100 25Q78 14 52 29Q12 23 4 65Q24 39 52 29Q88 24 99 63Q76 40 52 29Q33 47 38 75Q52 53 52 29Z" fill="#087C50"/><Path d="M7 29L51 29L95 25M12 56L52 29L91 55" fill="none" stroke="#9FD94C"/><Circle cx={48} cy={35} r={6} fill="#B38A4E"/><Circle cx={58} cy={38} r={5} fill="#805D3B"/></>:kind===1?<><Path d="M11 135V76L65 62L92 78V134Z" fill="#F7B43F"/><Path d="M65 62L92 78V134L65 128Z" fill="#9D4939"/><Path d="M4 80L42 32L99 78L65 87Z" fill="#C77C45"/><Path d="M4 80L42 32L65 87Z" fill="#F0BF65"/><Path d="M14 73L41 42M27 78L44 50M40 81L48 59M67 77L54 49M83 76L62 54" stroke="#A66A3D"/><Path d="M24 134V98H45V134" fill="#275D5E"/><Path d="M70 95H85V111H70Z" fill="#FFD878"/><Path d="M18 93L55 87M16 117H56M15 127H55" stroke="#BB804F"/><Path d="M7 86L65 94L96 85" fill="none" stroke="#FFF0BC" strokeWidth={3}/><Path d="M8 93v42M61 95v40" stroke="#795A3C" strokeWidth={4}/></>:<><Path d="M1 137L7 66L28 33L60 45L91 93L99 137Z" fill="#347B86"/><Path d="M7 66L28 33L41 82L60 45L91 93L66 114L41 82L23 137H1Z" fill="#99B194"/><Path d="M41 82L66 114L58 137H23Z" fill="#28546E"/><Path d="M18 58L27 44M68 91L79 98" stroke="#CCD4A6"/><Path d="M76 137V58" stroke="#765139" strokeWidth={5}/><Path d="M66 62L64 40H88L86 62Z" fill="#C48245"/><Path d="M76 48Q53 32 75 10Q91 30 76 48Z" fill="#FFD16D" stroke="#E8A14B"/><Path d="M76 43Q68 33 77 25Q84 38 76 43Z" fill="#FFF5BE" strokeWidth={0}/><Path d="M4 134q9-26 24-3q8-24 19 6" fill="#40895F"/></>}
  </G></Svg>;
});
/** Shore props for the current world. Baked worlds use 3–4 uniform-proportion images; older
 * worlds keep their three drawn shapes, no longer stretched (LG-S3 prop proportions). */
export const HarborEnvironment=memo(function HarborEnvironment({poses,world}:{poses:SharedValue<SpritePose[]>;world:WorldId}) {
  const baked=propArt[lagoonLook(world).id]?.();
  return <>{Array.from({length:SCENE_COUNT},(_,j)=>{const i=SCENE_COUNT-1-j;return <ArcadeSprite key={i} poses={poses} index={SCENE_START+i} width={100} height={240}>{baked?<Image accessible={false} source={baked[(i+Math.floor(i/4))%baked.length]} style={{width:100,height:240}} fadeDuration={0}/>:<HarborProp index={i}/>}</ArcadeSprite>;})}</>;
});
const windMarks = [
  { x: 101, y: 362, dx: 17, dy: 43 }, { x: 81, y: 404, dx: 21, dy: 54 },
  { x: 53, y: 446, dx: 27, dy: 66 }, { x: 23, y: 493, dx: 31, dy: 77 },
];
function WindBank({ poses, side }: { poses: SharedValue<SpritePose[]>; side: number }) {
  const style = useAnimatedStyle(() => {
    const intensity = poses.value[CAMERA_SLOT]?.scale ?? 0;
    const phase = ((poses.value[TRAVEL_SLOT]?.x ?? 0) * 9 + (side > 0 ? .5 : 0)) % 1;
    const drift = Math.sin(phase * Math.PI * 2);
    return {
      opacity: intensity * (.5 + .24 * drift),
      transform: [{ translateX: side * (1 + drift * 6) }, { translateY: drift * 16 }, { scaleY: .91 + intensity * .2 }],
    };
  });
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 390, height: 660 }, style]}>
    <Svg width={390} height={660} accessible={false}><G stroke="#FFFDF8" strokeLinecap="round" fill="none">
      {windMarks.map(({ x, y, dx, dy }, i) => <Path key={x} d={`M${side < 0 ? x : 390 - x} ${y}l${side * dx} ${dy}`} strokeWidth={1.25 + i * .5}/>)}
    </G></Svg>
  </Animated.View>;
}
export const SpeedLines = memo(function SpeedLines({ poses }: { poses: SharedValue<SpritePose[]> }) {
  return <><WindBank poses={poses} side={-1}/><WindBank poses={poses} side={1}/></>;
});
export function Shell({size=30}:{size?:number}) {return <Svg width={size} height={size} viewBox="0 0 32 32" accessible={false}><Circle cx={16} cy={16} r={15} fill="#FFF1A0" opacity={.24}/><Path d="M8 24L3 14Q2 8 7 7Q9 2 14 5Q19 1 23 6Q30 5 29 13L24 24L19 28H13Z" fill="#FFD476" stroke="#9B693F" strokeWidth={1.7}/><Path d="M14 24L8 10M17 24V8M20 24L25 10" stroke="#FFF3BF" strokeWidth={2} strokeLinecap="round"/><Path d="M10 25H23L20 29H13Z" fill="#E9A957" stroke="#9B693F" strokeWidth={1.3}/><Circle cx={8} cy={9} r={2} fill="#FFFBE0"/></Svg>;}

export { BakedFloor as HarborPlanks } from './Baked';
