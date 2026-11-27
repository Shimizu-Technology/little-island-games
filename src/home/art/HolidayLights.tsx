import { HomeMotionContext } from "../runtime/HomeMotionContext";
import React, { useContext, useEffect } from 'react';
import Animated, { cancelAnimation, Easing, useAnimatedProps, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';

const AnimatedGroup = Animated.createAnimatedComponent(G);

/** Opacity only, with one clock. Background/unfocused Home supplies reduced=true. */
export function HolidayLights({ size, on, reduced }: { size: number; on: boolean; reduced: boolean }) {
  const active = useContext(HomeMotionContext);
  const still = reduced || !active;
  const glow = useSharedValue(.65);
  useEffect(() => {
    cancelAnimation(glow);
    if (on && !still) glow.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(glow);
  }, [on, still, glow]);
  const props = useAnimatedProps(() => ({ opacity: still ? 1 : glow.value }));
  return <Svg testID={on ? 'holiday-lights-on' : 'holiday-lights-off'} width={size} height={size} viewBox="0 0 384 384" style={{ position: 'absolute' }} accessible={false}><AnimatedGroup animatedProps={props}>
      {[[180,92],[216,118],[148,138],[233,160],[176,186],[127,214],[244,218],[185,250],[272,269],[123,281]].map(([x,y], n) => <G key={n}>
        {on && <Circle cx={x} cy={y} r={13} fill="#FFD67A" opacity={.2}/>}
        <Circle cx={x} cy={y} r={3.5} fill={on ? n%3 === 0 ? '#FFEAB7' : n%3 === 1 ? '#FFD379' : '#FFB79C' : '#6D7955'}/>
      </G>)}
      {on && <Path d="M191 36l3 8 9 1-7 6 2 9-7-5-8 5 2-9-7-6 9-1Z" fill="#FFF0B5"/>}
    </AnimatedGroup></Svg>;
}
