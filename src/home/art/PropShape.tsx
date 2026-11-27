import React from 'react';
import { Image, View } from 'react-native';
import { illustratedProps, type IllustratedProp } from './illustrated';
import Svg, { Image as SvgImage, Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { material, shade } from './Tint';
import type { TintId } from '../catalogMore';
import type { HoldableId } from './living';
import type { ItemVisualState } from '../world';

const ink = '#4A3328';
const deepInk = '#3D2B24';
const shine = '#FFFDF7';

/** HD-07: cooked food keeps its shape and gains warm browned marks. */
function Grill({ d }: { d: string }) {
  return <Path d={d} fill="none" stroke="#8A4F26" strokeWidth={1.15} opacity={0.85} />;
}

/** SVG content in a 24×24 box. Pass directly to Islander.held, without a View. */
export function HandProp({ id, state = {}, tint = 'original', longStraw = false }: { longStraw?: boolean; id: HoldableId; state?: ItemVisualState; tint?: TintId }) {
  if (['pumpkin-pie', 'fiesta-platter', 'hot-cocoa', 'gift-box', 'shaved-ice', 'surfboard'].includes(id)) return <G>
    <SvgImage href={illustratedProps[id as IllustratedProp]()} x={0} y={0} width={24} height={24}/>
    {id === 'hot-cocoa' && state.empty && <Ellipse cx={11.6} cy={10.5} rx={4.2} ry={1.8} fill="#6D493B" stroke="#E3C3A2" strokeWidth={.8}/>}
  </G>;
  const paint = (color: string) => material(tint, color);
  return (
    <G fill="none" stroke={ink} strokeWidth={0.85} strokeLinecap="round" strokeLinejoin="round">
      {id === 'mango' ? (
        <>
          <Path d="M17 5Q24 10 18 19Q11 25 5 18Q0 11 8 6Q13 3 17 5Z" fill={state.on ? '#E69335' : '#F5BA45'} />
          {/* Rosy tropical sunset cheek blush */}
          <Ellipse cx={15.5} cy={13.5} rx={4.5} ry={5.5} fill="#FF7A5C" stroke="none" opacity={state.on ? 0.3 : 0.45} />
          <Path d="M8 8.2Q3.5 12 7.2 17" fill="none" stroke="#FFF1B5" strokeWidth={1.6} />
          <Circle cx={6.8} cy={10.2} r={0.9} fill={shine} stroke="none" />
          <Path d="M14 6Q14 1 20 2Q20 6 14 6Z" fill="#4E9F5A" />
          <Path d="M14.5 5.2L18.5 2.8" stroke="#7AC778" strokeWidth={0.7} />
          {state.on && <Grill d="M5 11l11-4M5 15l13-5M8 19l9-4" />}
        </>
      ) : id === 'banana' ? (
        <>
          <Path d="M4 4Q3 17 20 17Q15 25 5 18Q-1 13 2 5Z" fill={state.on ? '#E7AA48' : '#F7D154'} />
          <Path d="M4.2 7.5Q6.2 17 16.5 18.2" fill="none" stroke="#FFF4BE" strokeWidth={1.3} />
          <Path d="M3.5 11.5Q6.5 20.5 16.5 20" fill="none" stroke="#D19438" strokeWidth={0.9} />
          {state.on && <Grill d="M3 9l4 3M5 14l5 3M10 17l4 2" />}
          <Path d="M2 4l3-1m14 14 2-1" stroke={deepInk} strokeWidth={1.8} />
        </>
      ) : id === 'rice-ball' ? (
        <>
          <Path d="M9 4Q12-1 15 4L22 17Q23 22 18 22H6Q1 22 3 17Z" fill={state.on ? '#F0CF89' : '#FFF9EB'} />
          <Path d="M4.5 18Q12 20.5 19.5 18L18.5 21.3H5.5Z" fill="#EFE0C2" stroke="none" opacity={0.7} />
          <Path d="M9.5 6.5Q7 11 5.5 14" stroke={shine} strokeWidth={1.4} opacity={0.9} />
          {state.on && <Grill d="M7 9l10 0M5 13l14 0" />}
          {/* Crisp seaweed nori wrap */}
          <Rect x={7.5} y={13.5} width={9} height={8.5} rx={1.3} fill="#2F594B" />
          <Path d="M9 15.2v5" stroke="#4F8573" strokeWidth={1} opacity={0.75} />
          {/* Toasted sesame seeds */}
          <Circle cx={10.2} cy={7.5} r={0.55} fill="#C88E5B" stroke="none" />
          <Circle cx={13.8} cy={6.8} r={0.55} fill="#C88E5B" stroke="none" />
          <Circle cx={15.2} cy={10.5} r={0.55} fill="#C88E5B" stroke="none" />
          <Circle cx={8.2} cy={10.8} r={0.55} fill="#C88E5B" stroke="none" />
        </>
      ) : id === 'cupcake' ? (
        <>
          {state.on && <Path d="M9 1q-2-2 0-4m4 4q-2-2 0-4m4 4q-2-2 0-4" stroke="#E0D5C5" strokeWidth={1} />}
          {/* Fluted lagoon paper cup */}
          <Path d="M5 13H20L18 23H7Z" fill="#4FA99F" />
          <Path d="M9 15v6m3.5-6v6.5m3.5-6.5v6" stroke="#A6E4DC" strokeWidth={1} />
          {/* Swirled strawberry-cream frosting */}
          <Path d="M4 13Q1 9 6 7Q5 2 11 3Q15-1 18 5Q24 6 21 11L20 13Z" fill="#FFB5A3" />
          <Path d="M6.5 10Q12 8.2 18.2 10.2M8.5 6.5Q12.5 5.2 16.5 6.8" stroke="#FFE6DF" strokeWidth={1.2} fill="none" />
          {/* Colorful festive sprinkles */}
          <Path d="M7.5 8.5l1.2-.5M15.5 8.5l1.1.6" stroke="#F5C249" strokeWidth={1} />
          <Path d="M10.5 11.2l1.3-.3M16.5 11.2l-1.1.4" stroke="#4FA99F" strokeWidth={1} />
          {/* Glossy berry on top */}
          <Circle cx={13} cy={3} r={2.2} fill="#E65A48" />
          <Circle cx={12.3} cy={2.3} r={0.65} fill={shine} stroke="none" />
        </>
      ) : id === 'coconut-drink' ? (
        <>
          {/* Textured tropical island coconut shell */}
          <Path d="M4 10Q1 22 12 23Q23 22 20 10Z" fill="#C88E5B" />
          <Path d="M5 17Q12 22.8 19 17Q18 22.5 12 22.8Q6 22.5 5 17Z" fill="#9E693D" stroke="none" opacity={0.65} />
          <Path d="M6 13.5Q5.5 17.5 8 19.5" stroke="#E5B582" strokeWidth={1.1} opacity={0.8} />
          <Path d="M16 14.5l-.8 3.2m-8.5-1.2.8 2.8" stroke="#8C5932" strokeWidth={0.85} />
          {/* Snowy coconut meat rim */}
          <Ellipse cx={12} cy={10} rx={8} ry={4} fill="#FFF7E6" />
          {!state.empty ? (
            <>
              <Ellipse cx={12} cy={10} rx={6} ry={2.4} fill="#9CE0D8" />
              <Path d="M8.5 9.8Q12 9 15 9.8" stroke={shine} strokeWidth={0.9} opacity={0.85} />
            </>
          ) : (
            <Ellipse cx={12} cy={10} rx={5.8} ry={2.2} fill="#E2D3B8" stroke="none" />
          )}
          {/* Tropical mini-umbrella / hibiscus accent on left rim */}
          <Path d="M8.5 10L5.8 5.2" stroke="#D9A452" strokeWidth={0.9} />
          <Path d="M3 6.2Q5.8 2.8 8.8 5.5Z" fill="#FF7A5C" strokeWidth={0.65} />
          {/* Colorful striped bendy straw */}
          <Path d={longStraw ? 'M13 12L18 -10H20' : 'M13 12L15 2H10'} fill="none" stroke="#4FA99F" strokeWidth={1.8} />
          <Path d={longStraw ? 'M14 7.5L15.2 2.5M16 -2.5L17.2 -7.5' : 'M13.8 8.2L14.4 5.2'} fill="none" stroke={shine} strokeWidth={1} />
          {state.empty && <Path d="M8 16h8" stroke="#E5C89E" strokeWidth={0.9} />}
        </>
      ) : id === 'juice' ? (
        <>
          {/* Warm golden juice carton — keeps #E9BF69 & #EC9989 contract */}
          <Path d="M5 7L8 3H19L21 7V23H5Z" fill="#E9BF69" />
          <Path d="M18.2 7.5V22" stroke="#D4A44A" strokeWidth={1.8} opacity={0.55} />
          <Path d="M6.8 8.2V21.5" stroke="#FFE49E" strokeWidth={1.1} opacity={0.7} />
          <Path d="M5 7H21M8 3L11 7" fill="none" />
          <Rect x={7} y={10} width={12} height={10} rx={2.2} fill="#FFF7E6" />
          {/* Cute coral fruit emblem on label */}
          <Circle cx={13} cy={15.2} r={3.1} fill="#EC9989" />
          <Circle cx={12} cy={14.2} r={0.8} fill={shine} stroke="none" opacity={0.8} />
          <Path d="M13 12.2l2.2-1.8" stroke="#4E9F5A" strokeWidth={1.1} />
          {/* Bendy lagoon straw */}
          <Path d={state.empty ? 'M16 11L15 2H10' : longStraw ? 'M16 11L18 -9H18' : 'M16 11V1H10'} fill="none" stroke="#4FA99F" strokeWidth={1.6} />
          {state.empty && <Path d="M9 16h8" stroke="#B89E7A" strokeWidth={0.9} />}
        </>
      ) : id === 'teddy' ? (
        <>
          {/* Adorable stitched plush teddy bear */}
          <Circle cx={5} cy={5} r={4} fill={paint('#D49B6A')} />
          <Circle cx={5} cy={5} r={2} fill="#FFF2DC" stroke="none" />
          <Circle cx={19} cy={5} r={4} fill={paint('#D49B6A')} />
          <Circle cx={19} cy={5} r={2} fill="#FFF2DC" stroke="none" />
          <Path d={state.on ? 'M4 15l-2-6m18 6 2 4M7 22h-3m13 0h3' : 'M4 15l-2 4m18-4 2 4M7 22h-3m13 0h3'} stroke={paint('#D49B6A')} strokeWidth={4.2} />
          <Ellipse cx={12} cy={17} rx={7} ry={6} fill={paint('#D49B6A')} />
          <Ellipse cx={12} cy={17.5} rx={4.2} ry={3.8} fill="#FFF2DC" stroke="none" />
          <Circle cx={12} cy={9} r={8} fill={paint('#D49B6A')} />
          <Path d="M8 3.5Q12 2.2 16 3.5" stroke={shade(paint('#D49B6A'), 0.35)} strokeWidth={1.2} opacity={0.8} />
          <Ellipse cx={12} cy={12} rx={4.2} ry={3.1} fill="#FFF7E6" />
          {/* Glossy button eyes with catchlights + rosy cheeks */}
          <Circle cx={8.8} cy={8} r={1.05} fill={deepInk} stroke="none" />
          <Circle cx={8.4} cy={7.6} r={0.35} fill={shine} stroke="none" />
          <Circle cx={15.2} cy={8} r={1.05} fill={deepInk} stroke="none" />
          <Circle cx={14.8} cy={7.6} r={0.35} fill={shine} stroke="none" />
          <Ellipse cx={6.8} cy={10.5} rx={1.3} ry={0.8} fill="#FF9482" stroke="none" opacity={0.7} />
          <Ellipse cx={17.2} cy={10.5} rx={1.3} ry={0.8} fill="#FF9482" stroke="none" opacity={0.7} />
          <Path d="M10.8 10.8h2.4l-1.2 1.2Z" fill={deepInk} />
          <Path d="M12 12v1m-1.3.4q1.3.9 2.6 0" stroke={deepInk} strokeWidth={0.7} />
        </>
      ) : id === 'ball' ? (
        <>
          <Circle cx={12} cy={12} r={10} fill={paint('#FF7A5C')} />
          <Path d="M4 6Q15 6 19 19M6 20Q10 8 21 8" fill="none" stroke="#FFF7E6" strokeWidth={2.2} />
          <Path d="M12 2Q16 12 12 22" fill="none" stroke="#F5C249" strokeWidth={1.6} opacity={0.85} />
          <Circle cx={12} cy={11.5} r={1.8} fill="#FFF7E6" />
          <Ellipse cx={8} cy={6.8} rx={2.4} ry={1.3} fill={shine} stroke="none" opacity={state.on ? 0.95 : 0.7} />
        </>
      ) : id === 'book' ? (
        <>
          <Path d="M3 3L20 1V20L3 23Z" fill={paint('#4FA99F')} />
          <Path d="M3 20L20 17V21L3 23Z" fill="#FFF7E6" />
          <Path d="M6 3.5V18.5" stroke={shade(paint('#4FA99F'), 0.4)} strokeWidth={1.2} />
          <Circle cx={13} cy={9.5} r={2.3} fill="#F5C249" strokeWidth={0.6} />
          <Path d="M9.5 14l6.5-1" stroke="#FFF7E6" strokeWidth={1.1} />
          <Path d="M15 20.5v2.4l1-.8 1 .8v-2.6" fill="#FF7A5C" stroke="none" />
        </>
      ) : (
        <>
          {/* Pearlescent swirled scalloped seashell */}
          <Path d="M11 22Q-2 15 2 7Q4 3 8 6Q11-2 15 5Q21 0 22 8Q27 16 13 22Z" fill={paint('#F5B8A0')} />
          <Path d="M6 12Q12 6 18 11Q15 17 12 19Q8 17 6 12Z" fill="#FFF4E6" stroke="none" opacity={0.55} />
          <Path d="M12 20L5 8m8 12L12 6m2 14 5-12" stroke={shade(paint('#F5B8A0'), -0.28)} strokeWidth={0.85} fill="none" />
          <Circle cx={10.5} cy={9} r={1.2} fill={shine} stroke="none" opacity={0.8} />
        </>
      )}
    </G>
  );
}

/** Room-space bitmap only. HandProp above intentionally stays SVG for the rig's hand joint. */
export function PaintedProp({ id, size, mirrored = false, rotation = 0, tint = 'original', active = false, children }: {
  id: IllustratedProp; size: number; mirrored?: boolean; rotation?: number; tint?: TintId; active?: boolean; children?: React.ReactNode;
}) {
  const flip = mirrored !== (rotation === 180 || rotation === 270);
  return <View pointerEvents="none" accessible={false} style={{ width: size, height: size, transform: [{ scaleX: flip ? -1 : 1 }] }}>
    <Image testID={`painted-prop-${id}`} source={illustratedProps[id]()} resizeMode="contain" fadeDuration={0} accessible={false}
      style={{ position: 'absolute', width: size, height: size }}/>
    {tint !== 'original' && <PaintedTint id={id} size={size} tint={tint}/>}
    {active && <Svg width={size} height={size} viewBox="0 0 150 150" style={{ position:'absolute' }} accessible={false}><Path d="M112 19v12m-6-6h12" fill="none" stroke="#FFE2A0" strokeWidth={3} strokeLinecap="round"/></Svg>}
    {children}
  </View>;
}

/** A translucent dye on the fabric/foliage, leaving the lower wooden frame intact. */
export function PaintedTint({ id, size, tint }: { id: IllustratedProp; size: number; tint: TintId }) {
  return <View pointerEvents="none" style={{ position:'absolute', left:0, top:0, width:size, height:size*.68, overflow:'hidden' }}>
    <Image source={illustratedProps[id]()} resizeMode="contain" fadeDuration={0} accessible={false}
      style={{ width:size, height:size, tintColor:material(tint, '#4FA99F'), opacity:.28 }}/>
  </View>;
}
