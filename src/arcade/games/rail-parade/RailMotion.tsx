import React, { memo, useCallback, useEffect, useRef } from "react";
import { Image, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { ArcadeSprite, type SpritePose } from "../../Sprite";
import type { OutfitId } from "../../progress";
import { RAIL_FEET, RailFigure } from "../grid/RailArt";
import { railLearning, railWaiting, type RailState } from "./engine";
import { illustrated, railActorFrame } from "./illustrated";

export const PARADE_SLOTS = 40;
export const SNAKE_START = PARADE_SLOTS;
export const FIREFLY_START = SNAKE_START + 6;
export const COLLECT_MS = 280;
export const NEST_MS = 380;

type CellPoint = { x: number; y: number };
type Burst = { point: SharedValue<CellPoint | null>; age: SharedValue<number> };

export function useRailFeedback(
  initial: RailState,
  active: boolean,
  reduced: boolean,
  onTone: (key: string, haptic?: boolean) => void
) {
  const previous = useRef(initial);
  const collectPoint = useSharedValue<CellPoint | null>(null);
  const collectAge = useSharedValue(1);
  const nestPoint = useSharedValue<CellPoint | null>(null);
  const nestAge = useSharedValue(1);
  const waitingVisible = useSharedValue(railWaiting(initial));
  const earlyHintVisible = useSharedValue(!railLearning(initial) && initial.moves < 4);

  useEffect(() => {
    if (!active || reduced) return;
    return () => {
      cancelAnimation(collectAge);
      cancelAnimation(nestAge);
      collectAge.set(1);
      nestAge.set(1);
    };
  }, [active, reduced, collectAge, nestAge]);

  const observe = useCallback(
    (s: RailState) => {
      const before = previous.current;
      previous.current = s;

      if (waitingVisible.value && !railWaiting(s)) waitingVisible.set(false);
      if (earlyHintVisible.value && s.moves >= 4) earlyHintVisible.set(false);

      const learning = railLearning(s);
      const turned = s.queue.length > before.queue.length || (learning && s.moves > before.moves);
      if (turned && s.collected === before.collected && s.bumps === before.bumps) {
        onTone("rail-step", false);
      }

      if (s.phase === "cleared" && before.phase !== "cleared") {
        onTone("rail-nest", true);
        if (!reduced) {
          nestPoint.set({ x: s.impact.x, y: s.impact.y });
          nestAge.set(0);
          nestAge.set(withTiming(1, { duration: NEST_MS }));
        }
        return;
      }

      if (s.collected > before.collected) {
        onTone("rail-chirp", true);
        if (!reduced) {
          collectPoint.set({ x: s.impact.x, y: s.impact.y });
          collectAge.set(0);
          collectAge.set(withTiming(1, { duration: COLLECT_MS }));
        }
        return;
      }

      if (learning && s.bumps > before.bumps) {
        onTone("shell-0");
      }
    },
    [collectAge, collectPoint, earlyHintVisible, nestAge, nestPoint, onTone, reduced, waitingVisible]
  );

  return {
    observe,
    waitingVisible,
    earlyHintVisible,
    collect: { point: collectPoint, age: collectAge },
    nest: { point: nestPoint, age: nestAge },
  };
}

export const RailSegment = memo(function RailSegment({
  poses,
  index,
  size,
  outfit,
  reduced,
}: {
  poses: SharedValue<SpritePose[]>;
  index: number;
  size: number;
  outfit: OutfitId;
  reduced: boolean;
}) {
  const chick = index > 0;
  const pad = size * 0.42;
  const bodyStyle = useAnimatedStyle(() => {
    const raw = poses.value[index]?.frame ?? 1;
    const sign = raw < 0 ? -1 : 1;
    const pulse = reduced ? 0 : Math.max(0, Math.abs(raw) - 1);
    return {
      transform: [{ scaleX: sign * (1 - pulse * 0.6) }, { scaleY: 1 + pulse }],
    };
  });

  // Pad the native bounds around the full decoded image canvas so waddle tilt & mirror transforms never clip on Android.
  return (
    <ArcadeSprite
      poses={poses}
      index={index}
      width={size}
      height={size}
      padding={{ left: pad, right: pad, top: pad, bottom: pad }}
    >
      <Animated.View
        testID={chick ? `rail-chick-body-${index}` : "rail-rilla-body"}
        style={[
          {
            position: "absolute",
            left: pad,
            top: pad,
            width: size,
            height: size,
            transformOrigin: [size / 2, size * RAIL_FEET, 0],
          },
          bodyStyle,
        ]}
      >
        <RailFigure
          size={size}
          chick={chick}
          outfit={outfit}
          testID={chick ? `rail-chick-art-${index}` : "rail-rilla-art"}
        />
      </Animated.View>
    </ArcadeSprite>
  );
});

export const RailCollectible = memo(function RailCollectible({
  kind,
  size,
  active,
  reduced,
}: {
  kind: "mango" | "nest";
  size: number;
  active: boolean;
  reduced: boolean;
}) {
  const art = illustrated[kind];
  const pad = size * 0.24;
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!active || reduced) {
      cancelAnimation(pulse);
      pulse.set(0);
      return;
    }
    const halfMs = kind === "nest" ? 820 : 700;
    pulse.set(withRepeat(withSequence(withTiming(1, { duration: halfMs }), withTiming(0, { duration: halfMs })), -1));
    return () => {
      cancelAnimation(pulse);
      pulse.set(0);
    };
  }, [active, kind, pulse, reduced]);

  const motion = useAnimatedStyle(() => ({
    transform: [
      { translateY: reduced ? 0 : -pulse.value * size * 0.055 },
      { scale: reduced ? 1 : 1 + pulse.value * (kind === "nest" ? 0.065 : 0.045) },
    ],
  }));

  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      <View
        style={{
          position: "absolute",
          left: -pad,
          top: -pad,
          width: size + pad * 2,
          height: size + pad * 2,
        }}
      >
        <View
          style={{
            position: "absolute",
            left: pad - size * (kind === "nest" ? 0.1 : 0.04),
            top: pad - size * (kind === "nest" ? 0.1 : 0.04),
            width: size * (kind === "nest" ? 1.2 : 1.08),
            height: size * (kind === "nest" ? 1.2 : 1.08),
            borderRadius: size,
            backgroundColor: kind === "nest" ? "#FFE79158" : "#FFF3BA42",
            borderWidth: kind === "nest" ? 2 : 1.5,
            borderColor: kind === "nest" ? "#FFF2B2CC" : "#FFF4C499",
          }}
        />
        <View
          style={{
            position: "absolute",
            left: pad + size * (kind === "nest" ? 0.09 : 0.16),
            top: pad + size * 0.81,
            width: size * (kind === "nest" ? 0.82 : 0.68),
            height: size * 0.18,
            borderRadius: size,
            backgroundColor: "#1431234A",
          }}
        />
        <Animated.View
          testID={`rail-${kind}-body`}
          style={[
            {
              position: "absolute",
              left: pad,
              top: pad,
              width: size,
              height: size,
              transformOrigin: [size / 2, size * 0.88, 0],
            },
            motion,
          ]}
        >
          <Image
            testID={`rail-${kind}-art`}
            accessible={false}
            fadeDuration={0}
            source={art.source()}
            resizeMode="contain"
            style={railActorFrame(art, size, size, size * 0.92)}
          />
        </Animated.View>
      </View>
    </View>
  );
});

const RailBurst = memo(function RailBurst({
  burst,
  kind,
  unit,
}: {
  burst: Burst;
  kind: "collect" | "nest";
  unit: number;
}) {
  const size = unit * (kind === "nest" ? 2.2 : 1.55);
  const { point, age } = burst;
  const motion = useAnimatedStyle(() => {
    const p = point.value;
    const t = age.value;
    return {
      opacity: p ? (1 - t) ** 1.3 : 0,
      transform: [
        { translateX: p ? (p.x + 0.5) * unit - size / 2 : 0 },
        { translateY: p ? (p.y + 0.5) * unit - size / 2 - (kind === "nest" ? t * unit * 0.28 : t * unit * 0.16) : 0 },
        { scale: (kind === "nest" ? 0.78 : 0.66) + t * (kind === "nest" ? 0.68 : 0.54) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      testID={`rail-${kind}-burst`}
      style={[{ position: "absolute", left: 0, top: 0, width: size, height: size }, motion]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
        {kind === "collect" ? (
          <>
            <Circle cx={50} cy={50} r={34} fill="none" stroke="#FFE89E" strokeWidth={3.5} opacity={0.78} />
            <Path
              d="M50 12Q54 42 78 48Q54 54 50 86Q46 54 22 48Q46 42 50 12Z"
              fill="#FFF6CF"
              stroke="#F7B84E"
              strokeWidth={2.5}
            />
            <Circle cx={20} cy={22} r={4.5} fill="#FFE280" />
            <Circle cx={82} cy={26} r={3.5} fill="#FFF5C4" />
            <Circle cx={78} cy={78} r={4.5} fill="#FFCB64" />
            <Circle cx={23} cy={76} r={3.5} fill="#FFE89C" />
          </>
        ) : (
          <>
            <Circle cx={50} cy={50} r={40} fill="#FFE895" fillOpacity={0.28} stroke="#FFF0AE" strokeWidth={4} />
            <Path
              d="M50 8Q55 40 86 48Q55 56 50 90Q45 56 14 48Q45 40 50 8Z"
              fill="#FFF8DA"
              stroke="#F5B24C"
              strokeWidth={3}
            />
            <Path
              d="M17 19L21 29L31 33L21 37L17 47L13 37L3 33L13 29Z M83 55L87 64L96 68L87 72L83 81L79 72L70 68L79 64Z"
              fill="#FFE282"
            />
            <Circle cx={80} cy={22} r={5} fill="#FFB97A" />
            <Circle cx={22} cy={78} r={4.5} fill="#FFF2B8" />
          </>
        )}
      </Svg>
    </Animated.View>
  );
});

export function RailBursts({ collect, nest, unit }: { collect: Burst; nest: Burst; unit: number }) {
  return (
    <>
      <RailBurst burst={collect} kind="collect" unit={unit} />
      <RailBurst burst={nest} kind="nest" unit={unit} />
    </>
  );
}
