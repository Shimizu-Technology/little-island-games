import React, { memo, useCallback, useEffect, useRef } from "react";
import { Image, View } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { ArcadeSprite, type SpritePose } from "../../Sprite";
import type { OutfitId } from "../../progress";
import { CRAB_ROWS, CRAB_RX, CRAB_RY, crabLearning, waterLane, type CrabState, type Lane } from "./engine";
import { crabActorFrame, illustrated } from "./illustrated";

export const HERO = 0;
export const TRAFFIC_PER_ROW = 6;
export const SHADOW = 1 + (CRAB_ROWS - 1) * TRAFFIC_PER_ROW;
export const CAMERA = SHADOW + 1;
export const CRAB_FEET = 0.84;
const LAND_MS = 180;
const GOAL_MS = 290;
const outfits = { sunhat: "#FFD06A", explorer: "#A3F5E0", starlight: "#E3BEFE" } as const;

type GroundPoint = { x: number; y: number; water: boolean };
type Burst = { point: SharedValue<GroundPoint | null>; age: SharedValue<number> };

export function useCrabFeedback(initial: CrabState, lanes: Lane[], active: boolean, reduced: boolean, onTone: (key: string, haptic?: boolean) => void) {
  const previous = useRef(initial);
  const landingPoint = useSharedValue<GroundPoint | null>(null), landingAge = useSharedValue(1);
  const goalPoint = useSharedValue<GroundPoint | null>(null), goalAge = useSharedValue(1);
  const facingLeft = useSharedValue(false), hintVisible = useSharedValue(initial.hops < 3);

  useEffect(() => {
    if (!active || reduced) return;
    return () => {
      cancelAnimation(landingAge);
      cancelAnimation(goalAge);
      landingAge.set(1);
      goalAge.set(1);
    };
  }, [active, reduced, landingAge, goalAge]);

  const observe = useCallback((s: CrabState) => {
    const before = previous.current;
    previous.current = s;
    const started = s.hop && (!before.hop || s.hops > before.hops || s.hop.age < before.hop.age);
    if (started && s.hop) {
      facingLeft.set(s.hop.toX < s.hop.fromX);
      if (before.hops < 3 && s.hops >= 3) hintVisible.set(false);
      onTone("crab-hop", true);
    }

    if (s.crossed > before.crossed) {
      onTone("crab-goal", true);
      if (!reduced) {
        goalPoint.set({ x: s.impact.x, y: s.impact.y, water: false });
        goalAge.set(0);
        goalAge.set(withTiming(1, { duration: GOAL_MS }));
      }
      return;
    }
    if (s.cursor > before.cursor) onTone("coral");
    if (s.bumps > before.bumps && crabLearning(s)) onTone("shell-0");

    // A queued hop can start in the same tick. Its origin is the previous hop's actual landing point.
    const landed = before.hop && (!s.hop || started) && s.bumps === before.bumps && s.respawn === 0;
    if (reduced || !landed) return;
    const x = s.hop?.fromX ?? s.x;
    const y = s.hop?.fromY ?? s.y;
    const water = crabLearning(s) ? y > 0 && y < 10 : lanes.some(lane => lane.row === y && waterLane(lane));
    landingPoint.set({ x, y, water });
    landingAge.set(0);
    landingAge.set(withTiming(1, { duration: LAND_MS }));
  }, [facingLeft, goalAge, goalPoint, hintVisible, landingAge, landingPoint, lanes, onTone, reduced]);

  return { observe, facingLeft, hintVisible, landing: { point: landingPoint, age: landingAge }, goal: { point: goalPoint, age: goalAge } };
}

export const CrabKiko = memo(function CrabKiko({ size, outfit = "island" }: { size: number; outfit?: OutfitId }) {
  const art = illustrated.crab;
  const accent = outfit === "island" ? undefined : outfits[outfit];
  return (
    <>
      <Image testID="crab-kiko-art" accessible={false} fadeDuration={0} source={art.source()} resizeMode="contain"
        style={crabActorFrame(art, size, size, size * CRAB_FEET)}/>
      {accent && <View testID={`crab-outfit-${outfit}`} style={{ position: "absolute", left: size * 0.60, top: size * 0.59 }}>
        <Svg width={size * 0.22} height={size * 0.22} viewBox="0 0 24 24" accessible={false}>
          <Circle cx={12} cy={12} r={10} fill={accent} stroke="#6E473A" strokeWidth={2}/>
          <Path d={outfit === "sunhat" ? "M6 14H18M8 13Q8 5 12 6Q16 5 16 13" :
            outfit === "explorer" ? "M12 5L17 12L12 19L7 12Z" : "M12 5L14 10L19 12L14 14L12 19L10 14L5 12L10 10Z"}
            fill="none" stroke="#654649" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
      </View>}
    </>
  );
});

export const CrabActor = memo(function CrabActor({ poses, unit, size, outfit, debug, reduced, landingAge, facingLeft }: {
  poses: SharedValue<SpritePose[]>; unit: number; size: number; outfit: OutfitId; debug: boolean; reduced: boolean;
  landingAge: SharedValue<number>; facingLeft: SharedValue<boolean>;
}) {
  const pad = size * 0.45;
  const body = useAnimatedStyle(() => {
    const progress = poses.value[HERO]?.frame;
    const launch = progress === undefined ? 0 : Math.max(0, 1 - progress * 5);
    const stretch = progress === undefined ? 0 : Math.sin(progress * Math.PI) * 0.17;
    const landing = Math.max(0, 1 - landingAge.value * 2);
    const squash = reduced ? 0 : Math.max(launch, landing) * 0.16 - stretch;
    return { transform: [
      { scaleX: (facingLeft.value ? -1 : 1) * (1 + squash * 0.9) },
      { scaleY: 1 - squash },
    ] };
  });
  // Reserve room for the complete decoded image canvas under non-uniform hop poses and tilt on Android.
  return <ArcadeSprite poses={poses} index={HERO} width={size} height={size} padding={{ left: pad, right: pad, top: pad, bottom: pad }}>
    <Animated.View testID="crab-kiko-body" style={[{
      position: "absolute", left: pad, top: pad, width: size, height: size, transformOrigin: [size / 2, size * CRAB_FEET, 0],
    }, body]}>
      <CrabKiko size={size} outfit={outfit}/>
    </Animated.View>
    {debug && <View style={{
      position: "absolute", left: pad + size / 2 - unit * CRAB_RX, top: pad + size * CRAB_FEET - unit * CRAB_RY,
      width: unit * CRAB_RX * 2, height: unit * CRAB_RY * 2, borderWidth: 1, borderColor: "#FF3366", borderRadius: unit * 0.2,
    }}/>}
  </ArcadeSprite>;
});

const CrabBurst = memo(function CrabBurst({ burst, kind, unit }: { burst: Burst; kind: "sand" | "water" | "goal"; unit: number }) {
  const size = unit * (kind === "goal" ? 1.75 : 0.92);
  const { point, age } = burst;
  const motion = useAnimatedStyle(() => {
    const p = point.value, t = age.value;
    const visible = p && (kind === "goal" || p.water === (kind === "water"));
    return {
      opacity: visible ? (1 - t) ** 1.35 : 0,
      transform: [
        { translateX: p ? (p.x + 0.5) * unit - size / 2 : 0 },
        { translateY: p ? (p.y + 0.6) * unit - size / 2 - (kind === "goal" ? t * unit * 0.36 : 0) : 0 },
        { scale: (kind === "goal" ? 0.86 : 0.68) + t * 0.55 },
      ],
    };
  });
  return <Animated.View pointerEvents="none" testID={`crab-${kind}-burst`} style={[{ position: "absolute", left: 0, top: 0, width: size, height: size }, motion]}>
    <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
      {kind === "water" ? <Ellipse cx={50} cy={51} rx={43} ry={17} fill="none" stroke="#E6FFF0" strokeWidth={4}/> :
        kind === "sand" ? <>
          <Path d="M12 57Q28 43 38 54Q50 40 60 53Q72 43 88 57Q73 69 50 66Q27 69 12 57Z" fill="#FFE6AF" fillOpacity={0.84}/>
          <Circle cx={22} cy={42} r={4} fill="#FFF3CF"/><Circle cx={78} cy={40} r={4} fill="#FFF3CF"/>
        </> : <>
          <Path d="M50 15Q54 43 74 47Q54 51 50 79Q46 51 26 47Q46 43 50 15Z" fill="#FFF8DC" stroke="#F4AC5A" strokeWidth={3}/>
          <Path d="M17 24L21 34L31 38L21 42L17 52L13 42L3 38L13 34Z M84 52L87 62L97 65L87 68L84 78L81 68L71 65L81 62Z" fill="#FFE398"/>
        </>}
    </Svg>
  </Animated.View>;
});

export function CrabBursts({ landing, goal, unit }: { landing: Burst; goal: Burst; unit: number }) {
  return <>
    <CrabBurst burst={landing} kind="sand" unit={unit}/>
    <CrabBurst burst={landing} kind="water" unit={unit}/>
    <CrabBurst burst={goal} kind="goal" unit={unit}/>
  </>;
}
