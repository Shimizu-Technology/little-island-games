import React, { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from "react-native-svg";
import type { BadgeId } from "../catalog";
import type { HomeState } from "../model";
export const wallColors = { cream: "#F5E6C8", lagoon: "#C5DED3", night: "#A5ADC9", peach: "#F1CEC0" };
export const floorColors = { sand: "#EBD7B2", honey: "#DDAE7D", seafoam: "#AACDC1", rose: "#DCB9AA" };
const AnimatedPath = Animated.createAnimatedComponent(Path);
function Beach({ x, y, scale = 1, reduced }: { x: number; y: number; scale?: number; reduced: boolean }) {
  const shimmer = useSharedValue(0.35);
  useEffect(() => {
    if (!reduced)
      shimmer.value = withRepeat(withTiming(0.85, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
    else {
      cancelAnimation(shimmer);
      shimmer.value = 0.6;
    }
    return () => cancelAnimation(shimmer);
  }, [reduced, shimmer]);
  const animated = useAnimatedProps(() => ({ opacity: shimmer.value }));
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Rect width={140} height={180} fill="#BCE2DC" />
      <Circle cx={103} cy={32} r={18} fill="#FFF0B4" />
      <Path d="M0 73Q80 65 140 75V136H0Z" fill="#71BDBB" />
      <Path d="M0 104Q80 91 140 110V180H0Z" fill="#F1DBA6" />
      <AnimatedPath animatedProps={animated} d="M0 109Q65 95 140 112" stroke="#FFF5D8" strokeWidth={5} fill="none" />
      <Path d="M108 160Q88 111 106 64" stroke="#BA855B" strokeWidth={8} fill="none" />
      <Path
        d="M105 65Q74 38 58 68Q85 57 105 65M105 65Q116 37 137 51L105 65Q72 68 74 94Q94 86 105 65M105 65Q128 64 137 87Q111 81 105 65"
        fill="#6B9D76"
      />
      <Path d="M18 87H51M62 80H83M25 123Q38 118 48 123" stroke="#D6F0DA" strokeWidth={3} fill="none" />
    </G>
  );
}
export function RoomArt({
  theme,
  badges = [],
  reduced = false,
}: {
  theme: HomeState["theme"];
  badges?: readonly BadgeId[];
  reduced?: boolean;
}) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 800 560" accessible={false}>
      <Ellipse cx={402} cy={528} rx={368} ry={22} fill="#D6D7BB" opacity={0.5} />
      <Path
        d="M34 82L145 28L758 71V330L145 291L34 374Z"
        fill={wallColors[theme.wallpaper]}
        stroke="#47655B"
        strokeWidth={3}
      />
      <Path d="M34 82L145 28V291L34 374Z" fill="#D0C9AB" opacity={0.55} />
      <Path
        d="M34 374L145 291L758 330L779 508L162 535Z"
        fill={floorColors[theme.floor]}
        stroke="#47655B"
        strokeWidth={3}
      />
      <G stroke="#AE885F" strokeWidth={1.5} opacity={0.4}>
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <Path key={n} d={`M${53 + n * 20} ${359 + n * 29}L${762 + n * 3} ${351 + n * 31}`} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <Path key={n} d={`M${151 + n * 68} ${294 + n * 4}L${170 + n * 67} ${535 - n * 3}`} />
        ))}
      </G>
      <Path d="M146 279L755 318M42 363L144 283" fill="none" stroke="#FFF1CE" strokeWidth={13} />
      <Path d="M145 290L759 330" fill="none" stroke="#9E9275" strokeWidth={3} />
      <G transform="translate(192 85)">
        <Rect x={-10} y={-10} width={222} height={161} rx={28} fill="#E1B47E" stroke="#55716A" strokeWidth={3} />
        <G transform="scale(1.46 .78)">
          <Beach x={0} y={0} reduced={reduced} />
        </G>
        <Rect width={204} height={140} rx={17} fill="none" stroke="#FFF2D4" strokeWidth={12} />
        <Path d="M102 0V140M0 76H204" stroke="#FFF2D4" strokeWidth={8} />
        <Path d="M-15 139H221" stroke="#B8865C" strokeWidth={12} strokeLinecap="round" />
        <Path d="M-4-9Q3 43-11 79M209-9Q201 43 216 79" fill="none" stroke="#E99C87" strokeWidth={18} />
      </G>
      <G transform="translate(611 122)">
        <Path d="M-9-14H138V219H-9Z" fill="#AD815E" stroke="#456356" strokeWidth={3} />
        <Beach x={0} y={0} scale={0.92} reduced={reduced} />
        <Path d="M0 0H130V208H0Z" fill="none" stroke="#FFF0CE" strokeWidth={10} />
        <Path d="M0 1L-39 18V221L0 208Z" fill="#E5B782" stroke="#6C7055" strokeWidth={3} />
        <Path d="M-29 34L-10 26V183L-29 194Z" fill="#EFC89B" />
        <Circle cx={-12} cy={119} r={4} fill="#6C7055" />
      </G>
      <G transform="translate(448 98)">
        <Rect width={127} height={104} rx={12} fill="#D1A774" stroke="#6D6C50" strokeWidth={3} />
        <Rect x={7} y={7} width={113} height={90} rx={8} fill="#B98F60" />
        <Path d="M24 11L29 17M98 11L103 17" stroke="#F8D59D" strokeWidth={3} />
        <SvgText x={64} y={29} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#FFF4DA">
          LITTLE BIG MOMENTS
        </SvgText>
        {badges.slice(0, 6).map((badge, n) => (
          <G key={badge} transform={`translate(${26 + (n % 3) * 37} ${51 + Math.floor(n / 3) * 29})`}>
            <Path d="M-6 5L-9 18L0 14L8 18L5 5" fill="#E9A08A" />
            <Circle r={11} fill={["#E7C66D", "#A8D3C3", "#B3BDD8"][n % 3]} stroke="#FFF0C9" strokeWidth={2} />
            <SvgText y={4} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#395853">
              {badge.slice(0, 1).toUpperCase()}
            </SvgText>
          </G>
        ))}
        {badges.length === 0 && (
          <>
            <Path d="M33 56H94M44 71H83" stroke="#E9CC9C" strokeWidth={3} strokeLinecap="round" />
            <Circle cx={16} cy={15} r={3} fill="#EF9C83" />
          </>
        )}
      </G>
      <Path d="M78 162Q109 147 110 174Q102 194 82 185Z" fill="#E9BA84" stroke="#65755C" strokeWidth={2} />
      <Path d="M94 156V184M82 169H107" stroke="#FFF2D2" strokeWidth={2} />
    </Svg>
  );
}
