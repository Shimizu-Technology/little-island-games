import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, ReduceMotion, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { Text } from '../../../components/Text';
import { ArcadeSprite, type SpritePose } from '../../Sprite';
import { HERO_SCALE, projectTrack } from './camera';
import { runBumped, runSounds } from './feedback';
import { runnerHeight, runLearning, type RunState } from './engine';
import { visualRunHeight } from './geometry';
import { IMPACT_MS, LANDING_DUST } from './kinetics';

type Point = { x: number; y: number };
type Burst = { origin: SharedValue<Point>; age: SharedValue<number> };

function useBurst(): Burst {
  const origin = useSharedValue<Point>({ x: 0, y: 0 }), age = useSharedValue(1);
  return useMemo(() => ({ origin, age }), [origin, age]);
}
function animateAge(age: SharedValue<number>, duration: number) {
  'worklet';
  age.set(0);
  age.set(withTiming(1, { duration, easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
}
function burstAt(burst: Burst, point: Point, duration: number) {
  'worklet';
  burst.origin.set(point);
  animateAge(burst.age, duration);
}
function runnerContact(s: RunState) {
  'worklet';
  const { x, y } = projectTrack(s.poseLane, 1);
  return { x, y: y - visualRunHeight(runnerHeight(s)) * 85 };
}

export function useRunFeedback(reduced: boolean, active: boolean, onTone: (key: string, haptic?: boolean) => void) {
  const dustA = useBurst(), dustB = useBurst(), dustC = useBurst();
  const shellA = useBurst(), shellB = useBurst(), shellC = useBurst(), shellD = useBurst(), shellE = useBurst();
  const dust = useMemo(() => [dustA, dustB, dustC], [dustA, dustB, dustC]);
  const shells = useMemo(() => [shellA, shellB, shellC, shellD, shellE], [shellA, shellB, shellC, shellD, shellE]);
  const cursor = useSharedValue(0), impact = useSharedValue(1);
  const visual = useMemo(() => ({ dust, shells, impact, reduced }), [dust, shells, impact, reduced]);

  useEffect(() => {
    return () => {
      for (const { age } of [...dust, ...shells]) {
        cancelAnimation(age);
        age.set(1);
      }
      cancelAnimation(impact);
      impact.set(1);
    };
  }, [active, dust, shells, impact]);

  const playSounds = useCallback((keys: string[]) => {
    for (const key of keys) onTone(key, key.startsWith('lagoon-') || key === 'clear');
  }, [onTone]);
  const observe = useCallback((before: RunState, after: RunState) => {
    'worklet';
    if (before === after) return;
    if (!reduced) {
      const lateral = after.lane !== before.lane && !before.jump && !before.kite && !before.fastDrop;
      const launched = after.jump > before.jump;
      const landed = after.landing > before.landing;
      const dropContact = (before.fastDrop && !after.fastDrop)
        || (before.elevation > after.elevation && after.coyote > before.coyote);
      // Ordinary landings already have a pose slot. Keep event bursts for steps, takeoffs and deck drops.
      if (!landed && (lateral || launched || dropContact)) {
        const origin = runnerContact(dropContact ? after : before);
        burstAt(dust[cursor.value % dust.length], origin, 205);
        cursor.set(cursor.value + 1);
      }
    }
    if (!runLearning(after) && after.shells > before.shells) {
      const contact = runnerContact(after);
      for (let n = before.shells; n < after.shells && n < before.shells + shells.length; n++) {
        const offset = n === before.shells ? 0 : (n % 2 ? 1 : -1) * (12 + (n - before.shells) * 7);
        burstAt(shells[n % shells.length], { x: contact.x + offset, y: contact.y - 60 * HERO_SCALE }, 330);
      }
    }
    if (runBumped(before, after)) animateAge(impact, IMPACT_MS);
    const keys = runSounds(before, after);
    if (keys.length) runOnJS(playSounds)(keys);
  }, [dust, shells, impact, cursor, reduced, playSounds]);

  return { observe, visual };
}

export type RunFeedbackVisual = ReturnType<typeof useRunFeedback>['visual'];

function DustArt() {
  return <Svg width={48} height={16} accessible={false}>
    <Ellipse cx={13} cy={9} rx={10} ry={5} fill="#FFFDF8"/>
    <Ellipse cx={24} cy={11} rx={13} ry={4} fill="#F6D5A1"/>
    <Ellipse cx={35} cy={7} rx={8} ry={4} fill="#E6FFEF"/>
    <Ellipse cx={6} cy={4} rx={2} ry={1.5} fill="#FFFDF8"/>
    <Ellipse cx={44} cy={4} rx={2.5} ry={1.5} fill="#FFFDF8"/>
  </Svg>;
}

export const LandingDust = memo(function LandingDust({ poses }: { poses: SharedValue<SpritePose[]> }) {
  return <ArcadeSprite poses={poses} index={LANDING_DUST} width={48} height={16}><DustArt/></ArcadeSprite>;
});

const DustPuff = memo(function DustPuff({ origin, age, reduced }: Burst & { reduced: boolean }) {
  const style = useAnimatedStyle(() => {
    const t = age.value;
    return {
      opacity: reduced ? 0 : (1 - t) ** 2 * .88,
      transform: [{ translateX: origin.value.x - 24 }, { translateY: origin.value.y - 9 - t * 9 }, { scaleX: .42 + t * .8 }, { scaleY: .62 + t * .48 }],
    };
  });
  return <Animated.View testID="lagoon-dust" style={[styles.dust, style]}>
    <DustArt/>
  </Animated.View>;
});

const ShellPop = memo(function ShellPop({ origin, age, reduced }: Burst & { reduced: boolean }) {
  const spark = useAnimatedStyle(() => {
    const t = age.value;
    return {
      opacity: reduced ? 0 : (1 - t) ** 1.4,
      transform: [{ translateX: origin.value.x - 27 }, { translateY: origin.value.y - 27 }, { scale: .45 + 1.25 * (1 - (1 - t) ** 2) }],
    };
  });
  const score = useAnimatedStyle(() => {
    const t = age.value;
    return {
      opacity: Math.min(1, (1 - t) * 2.4),
      transform: [{ translateX: origin.value.x - 15 }, { translateY: origin.value.y - 31 - (reduced ? 0 : t * 25) }],
    };
  });
  return <>
    <Animated.View testID="lagoon-shell-spark" style={[styles.spark, spark]}>
      <Svg width={54} height={54} accessible={false}>
        <Path d="M9 8l1.5 4.5L15 14l-4.5 1.5L9 20l-1.5-4.5L3 14l4.5-1.5Zm32 4 2 5 5 2-5 2-2 5-2-5-5-2 5-2ZM17 34l2 4 4 2-4 2-2 4-2-4-4-2 4-2Zm21 3 1.2 3.8L43 42l-3.8 1.2L38 47l-1.2-3.8L33 42l3.8-1.2Z" fill="#F5C249" stroke="#FFFDF8" strokeWidth={1}/>
      </Svg>
    </Animated.View>
    <Animated.View testID="lagoon-shell-pop" style={[styles.score, score]}>
      <Text allowFontScaling={false} style={styles.scoreText}>+1</Text>
    </Animated.View>
  </>;
});

export const LagoonFeedback = memo(function LagoonFeedback({ dust, shells, reduced }: RunFeedbackVisual) {
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    {dust.map((burst, i) => <DustPuff key={i} {...burst} reduced={reduced}/>)}
    {shells.map((burst, i) => <ShellPop key={i} {...burst} reduced={reduced}/>)}
  </View>;
});

const absolute = { position: 'absolute' as const, left: 0, top: 0 };
const styles = {
  dust: { ...absolute, width: 48, height: 16 },
  spark: { ...absolute, width: 54, height: 54 },
  score: { ...absolute, width: 30, borderRadius: 12, backgroundColor: '#FFF3CE', borderColor: '#DEAB49', borderWidth: 1 },
  scoreText: { color: '#664221', fontSize: 14, fontWeight: '900' as const, textAlign: 'center' as const },
};
