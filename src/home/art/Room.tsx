import React, { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Rect, Defs, Pattern, ClipPath, Text as SvgText } from "react-native-svg";
import { RoomWallFinish, RoomFloorFinish } from "./RoomFinish";
import { BadgeGlyph } from "../../badges/BadgeArt";
import { tracks, badgeInfo, type BadgeId } from "../../badges/engine";
import type { HomeState } from "../model";
export const wallColors = { cream: "#F5E6C8", lagoon: "#C5DED3", night: "#A5ADC9", peach: "#F1CEC0", "math-lab": "#B6CABE", library: "#E7CFAD", "night-sky": "#B5BDD3", "arcade-neon": "#C9C5DA" };
export const floorColors = { sand: "#EBD7B2", honey: "#DDAE7D", seafoam: "#AACDC1", rose: "#DCB9AA", "island-breeze": "#D9C79B", "game-room": "#BCCBC0" };
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
  onBadgePress,
  reduced = false,
}: {
  theme: HomeState["theme"];
  badges?: readonly BadgeId[];
  onBadgePress?: (id: BadgeId) => void;
  reduced?: boolean;
}) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 800 560" accessible={false}>
      <Defs>
        <Pattern id="math-lab" patternUnits="userSpaceOnUse" width={48} height={48}><Rect width={48} height={48} fill="#47655B"/><Path d="M0 0H48M0 0V48M24 0V48M0 24H48" stroke="#86A696" strokeWidth={.7}/><SvgText x={7} y={17} fontSize={9} fill="#CEDBC4">2</SvgText><SvgText x={31} y={40} fontSize={9} fill="#CEDBC4">5</SvgText></Pattern>
        <Pattern id="library" patternUnits="userSpaceOnUse" width={64} height={48}><Rect width={64} height={48} fill="#E7CFAD"/><Path d="M0 43H64" stroke="#A68164" strokeWidth={5}/>{[0,1,2,3,4].map(i=><G key={i}><Rect x={4+i*12} y={9+i%2*6} width={9} height={32-i%2*6} rx={1} fill={['#79516F','#6B9692','#DCA578'][i%3]}/><Path d={`M${6+i*12} 33h5`} stroke="#F5E6C8"/></G>)}</Pattern>
        <Pattern id="night-sky" patternUnits="userSpaceOnUse" width={128} height={96}><Rect width={128} height={96} fill="#414C70"/><Path d="M20 15v8m-4-4h8M90 63v8m-4-4h8M55 47v5m-2-2h4" stroke="#F5D99A" strokeWidth={1.5}/><Path d="M99 13Q80 30 104 36Q81 42 80 25Q80 12 99 13Z" fill="#FFF0BC"/></Pattern>
        <Pattern id="arcade-neon" patternUnits="userSpaceOnUse" width={104} height={88}><Rect width={104} height={88} fill="#565679"/><Path d="M12 18h24v17H12ZM68 51l13 20H55Z" fill="none" stroke="#A0CEC6" strokeWidth={3}/><Circle cx={72} cy={19} r={9} fill="none" stroke="#E3AFB8" strokeWidth={3}/><Path d="M15 64h18m-9-9v18" stroke="#E8C990" strokeWidth={3}/></Pattern>
        <Pattern id="island-breeze" patternUnits="userSpaceOnUse" width={16} height={16}><Rect width={16} height={16} fill="#D9C79B"/><Path d="M0 2h16M0 6h16M2 8v8M6 8v8M10 0v8M14 0v8M8 10h8M8 14h8" stroke="#AC956D" strokeWidth={1.5}/></Pattern>
        <Pattern id="game-room" patternUnits="userSpaceOnUse" width={96} height={96}><Rect width={96} height={96} fill="#E9DAB8"/><Path d="M0 0H48V48H0ZM48 48H96V96H48Z" fill="#81968B"/></Pattern>
      </Defs>
      <Path d="M22 80L143 6L775 56L758 76L145 40L34 98Z" fill="#C68061" stroke="#47655B" strokeWidth={3} />
      <Path d="M145 6L145 40M154 20L752 61" fill="none" stroke="#F4C99A" strokeWidth={5} />
      <Ellipse cx={402} cy={528} rx={368} ry={22} fill="#D6D7BB" opacity={0.5} />
      <Path
        d="M34 82L145 28L758 71V330L145 291L34 374Z"
        fill={["math-lab", "library", "night-sky", "arcade-neon"].includes(theme.wallpaper) ? `url(#${theme.wallpaper})` : wallColors[theme.wallpaper]}
        stroke="#47655B"
        strokeWidth={3}
      />
      <Path d="M34 82L145 28V291L34 374Z" fill="#D0C9AB" opacity={0.55} />
      <RoomWallFinish room="home"/>
      <Path
        d="M34 374L145 291L758 330L779 508L162 535Z"
        fill={["island-breeze", "game-room"].includes(theme.floor) ? `url(#${theme.floor})` : floorColors[theme.floor]}
        stroke="#47655B"
        strokeWidth={3}
      />
      <Defs><ClipPath id="home-floor-finish"><Path d="M34 374L145 291L758 330L779 508L162 535Z"/></ClipPath></Defs>
      <G stroke="#AE885F" strokeWidth={1.5} opacity={0.4}>
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <Path key={n} d={`M${53 + n * 20} ${359 + n * 29}L${762 + n * 3} ${351 + n * 31}`} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <Path key={n} d={`M${151 + n * 68} ${294 + n * 4}L${170 + n * 67} ${535 - n * 3}`} />
        ))}
      </G>
      <G clipPath="url(#home-floor-finish)"><RoomFloorFinish room="home"/></G>
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
      <G transform="translate(448 86)">
        <Rect width={136} height={186} rx={12} fill="#D1A774" stroke="#6D6C50" strokeWidth={3}/>
        <Rect x={6} y={6} width={124} height={174} rx={8} fill="#B98F60"/>
        <Circle cx={13} cy={13} r={3} fill="#ECA28B"/><Circle cx={123} cy={13} r={3} fill="#A7C7B3"/>
        <SvgText x={68} y={25} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#FFF4DA">LITTLE BIG MOMENTS</SvgText>
        {tracks.flatMap((track, row) => ([1, 2, 3, 4] as const).map((tier, col) => {
          const id: BadgeId = `${track}-${tier}`, earned = badges.includes(id), info = badgeInfo(id);
          return <G key={id} transform={`translate(${11 + col * 29} ${35 + row * 24})`} onPress={() => onBadgePress?.(id)} accessible accessibilityLabel={`${info.name}. ${earned ? 'Earned' : info.rule}. Open My badges`}>
            <Rect width={26} height={22} rx={3} fill={earned ? '#F8E9C7' : '#CCAB7D'} stroke="#E7CFA8" strokeWidth={.7}/>
            <G transform="translate(3 1) scale(.25)"><BadgeGlyph id={id} earned={earned}/></G>
          </G>;
        }))}
      </G>
      <Path d="M78 162Q109 147 110 174Q102 194 82 185Z" fill="#E9BA84" stroke="#65755C" strokeWidth={2} />
      <Path d="M94 156V184M82 169H107" stroke="#FFF2D2" strokeWidth={2} />
    </Svg>
  );
}

/** Quiet outdoor layers fill portrait space without changing the room projection. */
export function SkyArt() {
  return <Svg width="100%" height="100%" viewBox="0 0 800 1200" preserveAspectRatio="xMidYMid slice" accessible={false}>
    <Rect width={800} height={1200} fill="#C5E5E1"/>
    <Path d="M0 0H800V690Q420 650 0 720Z" fill="#D8EEDE" opacity={.34}/>
    <Circle cx={650} cy={190} r={56} fill="#FFF0BA"/>
    <Circle cx={650} cy={190} r={78} fill="#FFF0BA" opacity={.13}/>
    <G fill="#F7F6E9" opacity={0.85}>
      <Path d="M50 185Q38 158 70 151Q75 116 111 131Q142 115 157 151Q189 151 187 177Q135 194 50 185Z"/>
      <Path d="M490 320Q470 295 502 286Q510 252 541 271Q575 255 585 287Q618 289 611 312Z"/>
      <Path d="M250 430q-20-14 0-24q2-21 25-16q21-8 31 10q20 0 23 16q-34 23-79 14Z" opacity={.62}/>
    </G>
    <Path d="M0 942Q180 900 360 948T800 934V1080H0Z" fill="#A6C9AA" opacity={.5}/>
    <Path d="M0 995Q220 949 412 1001T800 985V1120H0Z" fill="#91C3B2" opacity={.7}/>
    <Path d="M0 1050Q300 1010 800 1040V1200H0Z" fill="#78BCBA"/>
    <Path d="M0 1090Q230 1052 450 1093T800 1081" fill="none" stroke="#D9F3DC" strokeWidth={8} opacity={.6}/>
  </Svg>;
}
export function ShoreArt({ depth = 215 }: { depth?: number }) {
  return <Svg width="100%" height="100%" viewBox={`0 0 800 ${depth}`} accessible={false}>
    <Rect width={800} height={depth} fill="#F0D9AB"/>
    <Path d={`M0 27Q245 45 491 17T800 19V${depth}H0Z`} fill="#F7E5BA" opacity={.55}/>
    <Path d="M130 0L780 0L760 35L158 50L85 20Z" fill="#C79A70" stroke="#577162" strokeWidth={3}/>
    <Path d="M153 18L765 8M159 34L759 22" stroke="#E8BD89" strokeWidth={3}/>
    <Path d={`M0 ${depth - 45}Q180 ${depth - 83} 400 ${depth - 46}T800 ${depth - 52}V${depth}H0Z`} fill="#76BDBB"/>
    <Path d={`M0 ${depth - 46}Q180 ${depth - 84} 400 ${depth - 47}T800 ${depth - 53}`} fill="none" stroke="#FFF4D6" strokeWidth={9}/>
    <Path d={`M0 ${depth - 31}Q180 ${depth - 70} 400 ${depth - 33}T800 ${depth - 38}`} fill="none" stroke="#C2E2D5" strokeWidth={3} opacity={.8}/>
    <Path d="M723 134Q681 72 713 15" fill="none" stroke="#AE7D59" strokeWidth={13}/>
    <Path d="M712 23Q669-3 646 30Q681 17 712 23Q748-10 780 20Q746 16 712 23Q668 31 667 65Q689 44 712 23Q751 22 776 61Q740 41 712 23" fill="#649B77" stroke="#4C7861" strokeWidth={2}/>
    <G fill="none" stroke="#D7B889" strokeWidth={3}><Path d="M95 102l20-4M310 144l15 3M528 82l20-3M620 126l12 4"/></G>
    <G fill="#C5A476" opacity={.65}>{Array.from({length:38},(_,n)=><Circle key={n} cx={31+(n*103)%739} cy={31+(n*47)%Math.max(70,depth-95)} r={n%5===0?2:1}/>)}</G>
    {[ [160,99],[361,66],[570,116] ].map(([x,y],i)=><G key={x} transform={`translate(${x} ${y}) rotate(${i*29})`}><Path d="M-12 8Q-16-9-5-10Q0-16 5-10Q16-9 12 8Z" fill={i%2?'#F1C0AA':'#FFF2D6'} stroke="#B8997D" strokeWidth={2}/><Path d="M0 6V-8M-8 5l5-10M8 5L3-5" stroke="#D0A994" strokeWidth={1.2}/></G>)}
  </Svg>;
}
