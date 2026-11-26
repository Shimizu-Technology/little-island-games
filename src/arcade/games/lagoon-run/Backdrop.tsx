import React, { memo, useEffect } from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import type { WorldId } from '../../types';
import { useReducedMotion } from '../../../components/motion';
import { Landmark } from '../scrolling/Environment';
import { lagoonLook, type LagoonLook } from './look';
import { illustrated } from './illustrated';
import { HERO_ZOOM, WASH_SPAN, projectTrack, roadEdge, type StageLayout } from './camera';
import { FLOOR_FAR } from './floorBands';

const HORIZON_IMAGE_ASPECT = 960 / 540;
/** Painted shoreline in horizon-morning.webp sits at y = 324 / 540 (60.0% from top). */
const HORIZON_SHORELINE = 324 / 540;

/** Place the full-bleed morning horizon so its 60% shoreline locks to the stage horizon on every aspect ratio. */
export function morningHorizonFrame(layout: StageLayout, width: number, height: number) {
  const hzScreen = height * (layout.horizon / layout.height);
  const imageHeight = Math.max(hzScreen / HORIZON_SHORELINE, width / HORIZON_IMAGE_ASPECT);
  const imageTop = hzScreen - imageHeight * HORIZON_SHORELINE;
  const clipHeight = Math.min(height, Math.floor(imageTop + imageHeight), Math.ceil(hzScreen + Math.max(24, (height - hzScreen) * .08)));
  return { hzScreen, imageHeight, imageTop, clipHeight };
}

/**
 * LG-S3 sky, hills and water, drawn once at the arena's real size (never upscaled) behind the
 * camera. The horizon sits at 34% of the stage on every screen. Nothing here changes per frame.
 */
export const RunBackdrop = memo(function RunBackdrop({ world, layout, width, height }: { world: WorldId; layout: StageLayout; width: number; height: number }) {
  const look = lagoonLook(world), W = layout.width, H = layout.height, hz = layout.horizon, cx = W / 2;
  const [sx, sy, core, glow] = look.sun, sun = { x: W * sx, y: hz * sy };
  const horizon = look.id === 'morning' ? illustrated.horizonMorning() : undefined;
  const painted = horizon !== undefined ? morningHorizonFrame(layout, width, height) : undefined;
  return <>
    {painted && (
      <View testID="run-horizon-morning" pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height: painted.clipHeight, overflow: 'hidden' }}>
        <Image source={horizon} resizeMode="cover" fadeDuration={0} accessible={false} style={{ position: 'absolute', left: 0, top: painted.imageTop, width, height: painted.imageHeight }}/>
      </View>
    )}
    <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: 'absolute' }} accessible={false}>
      <Defs>
        {!painted && <>
          <LinearGradient id="lr-sky" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={look.sky[0]}/><Stop offset=".72" stopColor={look.sky[1]}/><Stop offset="1" stopColor={look.sky[2]}/></LinearGradient>
          <RadialGradient id="lr-sun" cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={glow} stopOpacity={.9}/><Stop offset=".35" stopColor={glow} stopOpacity={.42}/><Stop offset="1" stopColor={glow} stopOpacity={0}/></RadialGradient>
        </>}
        {painted
          ? <LinearGradient id="lr-water" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={look.water[0]} stopOpacity={0}/><Stop offset=".06" stopColor={look.water[0]} stopOpacity={1}/><Stop offset="1" stopColor={look.water[1]} stopOpacity={1}/></LinearGradient>
          : <LinearGradient id="lr-water" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={look.water[0]}/><Stop offset="1" stopColor={look.water[1]}/></LinearGradient>}
        <LinearGradient id="lr-haze" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={look.haze} stopOpacity={0}/><Stop offset="1" stopColor={look.haze} stopOpacity={look.hazeOpacity}/></LinearGradient>
      </Defs>
      {!painted && <>
        <Rect width={W} height={hz + 2} fill="url(#lr-sky)"/>
        <Circle cx={sun.x} cy={sun.y} r={Math.min(150, hz * .7)} fill="url(#lr-sun)"/>
        <Circle cx={sun.x} cy={sun.y} r={look.id === 'festival' ? 20 : 26} fill={core}/>
        <SkyDetail look={look} W={W} hz={hz}/>
        <Hills look={look} W={W} hz={hz}/>
        <G transform={`translate(${cx - 195 * HERO_ZOOM} ${hz - 209 * HERO_ZOOM}) scale(${HERO_ZOOM})`}><Landmark world={world}/></G>
      </>}
      <Rect y={hz - .5} width={W} height={H - hz + 1} fill="url(#lr-water)"/>
      <Rect y={hz - 34} width={W} height={36} fill="url(#lr-haze)"/>
      <Water look={look} W={W} H={H} hz={hz} sun={sun.x}/>
    </Svg>
  </>;
});
function SkyDetail({ look, W, hz }: { look: LagoonLook; W: number; hz: number }) {
  if (look.id === 'festival') {
    // Dusk: the first stars, and a soft band of warm cloud lit from below.
    return <G>{Array.from({ length: 16 }, (_, i) => <Circle key={i} cx={(i * 137 + 23) % W} cy={12 + (i * 53) % Math.max(40, hz * .45)} r={i % 4 ? 1.1 : 1.8} fill="#FFF3D6" opacity={.75}/>)}
      <Path d={`M${W * .52} ${hz * .5}q40-14 84-2q30-12 62 3q-60 10-146-1Z`} fill="#F7B48C" opacity={.55}/><Path d={`M${W * .05} ${hz * .66}q36-10 70 0q24-9 48 2q-58 8-118-2Z`} fill="#E89A8B" opacity={.45}/></G>;
  }
  // Long, flat paper-cut clouds catching the light.
  return <G fill="#FFFDF8" opacity={look.id === 'rain' ? .25 : .5}><Path d={`M${W * .06} ${hz * .3}q22-15 48-3q16-10 34 1h40q-60 8-122 2Z`}/><Path d={`M${W * .5} ${hz * .46}q30-14 62-2q18-8 36 2h48q-74 7-146 0Z`}/><Path d={`M${W * .22} ${hz * .72}q16-8 34-1h30q-34 5-64 1Z`} opacity={.7}/></G>;
}
function Hills({ look, W, hz }: { look: LagoonLook; W: number; hz: number }) {
  const [far, mid, near] = look.hills;
  // Three paper-cut bands sitting on the horizon; the far one is hazed into the sky.
  return <G>
    <Path d={`M0 ${hz}V${hz - 30}Q${W * .12} ${hz - 64} ${W * .26} ${hz - 34}Q${W * .38} ${hz - 18} ${W * .5} ${hz - 40}Q${W * .66} ${hz - 72} ${W * .8} ${hz - 36}Q${W * .92} ${hz - 22} ${W} ${hz - 44}V${hz}Z`} fill={far} opacity={.7}/>
    <Path d={`M0 ${hz}V${hz - 16}Q${W * .1} ${hz - 38} ${W * .22} ${hz - 14}L${W * .3} ${hz}ZM${W * .7} ${hz}Q${W * .8} ${hz - 34} ${W * .9} ${hz - 20}Q${W * .96} ${hz - 30} ${W} ${hz - 24}V${hz}Z`} fill={mid}/>
    <Path d={`M0 ${hz}V${hz - 7}Q${W * .05} ${hz - 16} ${W * .12} ${hz}ZM${W * .86} ${hz}Q${W * .93} ${hz - 14} ${W} ${hz - 9}V${hz}Z`} fill={near}/>
  </G>;
}
function Water({ look, W, H, hz, sun }: { look: LagoonLook; W: number; H: number; hz: number; sun: number }) {
  // Glints are densest under the sun and spread with depth.
  const glints = Array.from({ length: 34 }, (_, i) => {
    const t = ((i * 0.618) % 1), y = hz + 6 + t * t * (H - hz) * .9, spread = 20 + (y - hz) * .8;
    return { x: sun + (((i * 0.381) % 1) - .5) * spread * 2, y, w: 5 + ((i * 0.77) % 1) * 22 * (.4 + t) };
  });
  return <G fill={look.water[2]} opacity={.42}>{glints.map((g, i) => <Rect key={i} x={g.x - g.w / 2} y={g.y} width={g.w} height={1.4} rx={.7}/>)}</G>;
}

/** Camera space: hazed far deck, pier skirts and the water shadow under the boards. Static. */
export const DeckBase = memo(function DeckBase({ world }: { world: WorldId }) {
  const look = lagoonLook(world), h = projectTrack(1, -1.2), farL = roadEdge(FLOOR_FAR + .02, false), farR = roadEdge(FLOOR_FAR + .02, true);
  const nearL = projectTrack(-.56, 1.9), nearR = projectTrack(2.56, 1.9), skirtL = projectTrack(-.62, 1.9), skirtR = projectTrack(2.62, 1.9);
  return <Svg width={390} height={660} style={{ position: 'absolute', overflow: 'visible' }} accessible={false}>
    <Defs><LinearGradient id="lr-far" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={look.haze}/><Stop offset="1" stopColor={look.planks[1]}/></LinearGradient></Defs>
    <Path d={`M${h.x} ${h.y}L${skirtR.x} ${skirtR.y + 30}H${skirtL.x}Z`} fill={look.shade} opacity={.35}/>
    <Path d={`M${h.x} ${h.y}L${nearR.x} ${nearR.y + 22}H${nearL.x}Z`} fill={look.side}/>
    <Path d={`M${h.x} ${h.y}L${nearR.x} ${nearR.y}H${nearL.x}Z`} fill={look.planks[1]}/>
    <Path d={`M${h.x - .6} ${h.y}L${farR.x} ${farR.y}H${farL.x}Z`} fill="url(#lr-far)"/>
  </Svg>;
});
/**
 * A full-width vertical wash. An Svg clips to its own 390-unit frame, and a wider bitmap would cost
 * tens of MB, so it is drawn 390 wide and stretched about the camera centre to WASH_SPAN. A purely
 * vertical gradient is unchanged by horizontal stretching.
 */
function Wash({ id, y, height, children }: { id: string; y: number; height: number; children: React.ReactNode }) {
  return <Svg width={390} height={660} style={{ position: 'absolute', transform: [{ scaleX: WASH_SPAN.width / 390 }] }} accessible={false}>
    <Defs>{children}</Defs>
    <Rect x={0} y={y} width={390} height={height} fill={`url(#${id})`}/>
  </Svg>;
}
/** Near-deck light falloff: the boards darken gently toward the camera, away from the light. */
export const DeckLight = memo(function DeckLight({ world }: { world: WorldId }) {
  const look = lagoonLook(world), c = projectTrack(1, .7), b = projectTrack(1, 1.62);
  return <Wash id="lr-near" y={c.y} height={b.y - c.y + 40}><LinearGradient id="lr-near" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={look.shade} stopOpacity={0}/><Stop offset=".38" stopColor="#F5C249" stopOpacity={.14}/><Stop offset="1" stopColor={look.shade} stopOpacity={.18}/></LinearGradient></Wash>;
});
/** Over the deck but under every actor: the far deck and rails melt into the air. */
export const DeckHaze = memo(function DeckHaze({ world }: { world: WorldId }) {
  const look = lagoonLook(world), h = projectTrack(1, -1.2), far = projectTrack(1, -.35);
  return <Wash id="lr-deckhaze" y={h.y - 2} height={far.y - h.y + 2}><LinearGradient id="lr-deckhaze" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={look.haze} stopOpacity={look.hazeOpacity + .2}/><Stop offset="1" stopColor={look.haze} stopOpacity={0}/></LinearGradient></Wash>;
});

/** Screen-space frame above the horizon only, so it can never hide a hazard. */
export const RunForeground = memo(function RunForeground({ world, layout, width, height }: { world: WorldId; layout: StageLayout; width: number; height: number }) {
  const look = lagoonLook(world), W = layout.width, hz = layout.horizon;
  return <Svg pointerEvents="none" width={width} height={height} viewBox={`0 0 ${W} ${layout.height}`} preserveAspectRatio="none" style={{ position: 'absolute' }} accessible={false}>
    {look.id === 'festival' ? <Bunting look={look} W={W} hz={hz}/> : null}
  </Svg>;
});
function Bunting({ look, W, hz }: { look: LagoonLook; W: number; hz: number }) {
  const y0 = Math.max(128, hz * .48), sag = 22, flags = 13, colors = ['#F6C760', '#EE8A7E', '#7FC8C4', '#F4E6C2', '#B79AE0'];
  const point = (t: number) => ({ x: -8 + (W + 16) * t, y: y0 + Math.sin(t * Math.PI) * sag });
  return <G>
    <Path d={`M-8 ${y0}Q${W / 2} ${y0 + sag * 2} ${W + 8} ${y0}`} fill="none" stroke={look.shade} strokeWidth={1.6} opacity={.8}/>
    {Array.from({ length: flags }, (_, i) => { const a = point((i + .2) / flags), b = point((i + .8) / flags); return <Path key={i} d={`M${a.x} ${a.y}L${b.x} ${b.y}L${(a.x + b.x) / 2} ${(a.y + b.y) / 2 + 17}Z`} fill={colors[i % colors.length]} stroke={look.shade} strokeWidth={.8} strokeOpacity={.5}/>; })}
    {[.22, .5, .78].map(t => { const p = point(t); return <G key={t}><Path d={`M${p.x} ${p.y}V${p.y + 10}`} stroke={look.shade} strokeWidth={1}/><Circle cx={p.x} cy={p.y + 20} r={20} fill={look.glow} opacity={.4}/><Ellipse cx={p.x} cy={p.y + 20} rx={7} ry={9} fill="#F48A62" stroke={look.shade} strokeWidth={1}/><Path d={`M${p.x - 7} ${p.y + 20}H${p.x + 7}M${p.x} ${p.y + 11}V${p.y + 29}`} stroke="#FFD57A" strokeWidth={1}/></G>; })}
  </G>;
}

/** Light ambient life in screen space: gulls in the morning, drifting petals at the festival.
 * Few views, slow timing animations on the UI thread; nothing with Reduce Motion. */
export const RunAmbient = memo(function RunAmbient({ world, layout, active }: { world: WorldId; layout: StageLayout; active: boolean }) {
  const reduced = useReducedMotion(), look = lagoonLook(world);
  if (look.id === 'morning') return <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: layout.width, height: layout.height }}>{[0, 1, 2].map(i => <Gull key={i} index={i} layout={layout} moving={active && !reduced}/>)}</View>;
  if (look.id === 'festival' && !reduced) return <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: layout.width, height: layout.height }}>{Array.from({ length: 7 }, (_, i) => <Petal key={i} index={i} layout={layout} moving={active}/>)}</View>;
  return null;
});
function useLoop(moving: boolean, duration: number, offset: number) {
  const t = useSharedValue(offset);
  useEffect(() => {
    if (!moving) { cancelAnimation(t); return; }
    t.set(offset);
    t.set(withRepeat(withTiming(offset + 1, { duration: duration * (1 - (offset % 1)), easing: Easing.linear }), -1, false));
    return () => cancelAnimation(t);
  }, [moving, duration, offset, t]);
  return t;
}
function Gull({ index, layout, moving }: { index: number; layout: StageLayout; moving: boolean }) {
  const t = useLoop(moving, 26000 + index * 7000, index * .37);
  const W = layout.width, y = layout.horizon * (.24 + index * .14);
  const style = useAnimatedStyle(() => {
    const p = t.value % 1;
    return { transform: [{ translateX: -40 + p * (W + 80) }, { translateY: y + Math.sin(p * 18 + index) * 5 }, { scaleY: .75 + .25 * Math.abs(Math.sin(p * 60)) }] };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 36, height: 15 }, style]}><Svg width={36} height={15} viewBox="0 0 24 10"><Path d="M1 7Q6 0 12 6Q18 0 23 7" fill="none" stroke="#2E5566" strokeWidth={2} strokeLinecap="round"/></Svg></Animated.View>;
}
function Petal({ index, layout, moving }: { index: number; layout: StageLayout; moving: boolean }) {
  const t = useLoop(moving, 9000 + index * 1300, (index * .29) % 1);
  const W = layout.width, H = layout.height, x0 = ((index * .41) % 1) * W;
  const style = useAnimatedStyle(() => {
    const p = t.value % 1;
    return { opacity: p < .08 ? p / .08 : p > .9 ? (1 - p) / .1 : 1, transform: [{ translateX: x0 + Math.sin(p * 6 + index) * 26 - p * 40 }, { translateY: -10 + p * H * .62 }, { rotate: `${p * 9 + index}rad` }] };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 10, height: 8 }, style]}><Svg width={10} height={8}><Path d="M1 4Q5 -1 9 4Q5 9 1 4Z" fill={['#F9B9C4', '#FFE1A1', '#F6A3A0'][index % 3]}/></Svg></Animated.View>;
}
