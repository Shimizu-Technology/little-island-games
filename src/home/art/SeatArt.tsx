import React from 'react';
import { Image, View } from 'react-native';
import { PaintedTint } from './PropShape';
import { illustratedProps } from './illustrated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { ArtLayer, ItemVisualState } from '../world';
import { material, shade } from './Tint';
import type { TintId } from '../catalogMore';

import { seatSockets } from './sockets';

const ink = '#4A3328',
  wood = '#C88E5B',
  woodLight = '#E5B582',
  woodDark = '#9E693D',
  cream = '#FFF7E6',
  creamShade = '#EFE1C6',
  shine = '#FFFDF7',
  brass = '#D9A452',
  brassLight = '#FFE38A';

export { seatSockets } from './sockets';
export const hasSeatArt = (id: string) => !!seatSockets[id];

export function SeatShape({ id, layer = 'all', tint = 'original', state }: { id: string; layer?: ArtLayer; tint?: TintId; state?: ItemVisualState }) {
  const baseColor = id === 'beanbag' ? '#A98FD1' : ['hammock', 'chair', 'armchair'].includes(id) ? '#FF7A5C' : '#4FA99F';
  const color = material(tint, baseColor);
  const light = shade(color, 0.34);
  const paleTint = shade(color, 0.56);
  const dark = shade(color, -0.2);
  const back = layer !== 'front', front = layer !== 'back';
  const bed = id === 'bed' || id === 'cloud-bed' || id === 'bunk-bed';

  const bedding = (y: number) => (
    <G transform={`translate(0 ${y})`}>
      {back && (
        <>
          {id !== 'bunk-bed' && (
            <>
              <Path d="M10 94V40Q11 32 23 32H131V94" fill={wood} />
              <Path d="M16 39Q20 35 28 35H124" stroke={woodLight} strokeWidth={3} fill="none" />
              <Path d="M22 47H122" stroke={woodDark} strokeWidth={1.6} opacity={0.55} fill="none" />
              <Circle cx={20} cy={36} r={3.2} fill={woodLight} />
              <Circle cx={127} cy={36} r={3.2} fill={woodLight} />
            </>
          )}
          <Rect x={12} y={56} width={126} height={39} rx={10} fill={cream} />
          <Path d="M15 84H135V89Q135 94 129 94H21Q15 94 15 89Z" fill={creamShade} stroke="none" />
          <Path d="M20 62H130" stroke={shine} strokeWidth={2.5} opacity={0.8} fill="none" />
          {/* Plump marshmallow pillow */}
          <Path data-pillow="white" d="M4 44Q30 35 65 44L66 99Q35 110 4 100Q-1 73 4 44Z" fill="#FFFDF7" />
          <Path d="M8 92Q35 103 63 94L64 98Q35 108 6 98Z" fill={creamShade} stroke="none" />
          <Path d="M10 49Q33 41 59 48" stroke={creamShade} strokeWidth={1.8} fill="none" />
          <Path d="M10 95Q33 103 59 95" stroke={creamShade} strokeWidth={1.6} fill="none" />
          <Path d="M15 54Q28 50 42 54" stroke="#FFFFFF" strokeWidth={3} opacity={0.9} fill="none" />
        </>
      )}
      {front && (
        <>
          {/* Quilted plump blanket draped over occupant */}
          <Path d="M60 61Q65 40 85 48Q96 64 105 56Q111 42 124 54Q129 61 134 56Q138 51 142 56Q147 54 147 67V96Q105 106 60 98Z" fill={color} />
          {/* Soft underside fold shadow */}
          <Path d="M62 88Q104 97 145 89V95Q105 104 62 96Z" fill={dark} stroke="none" opacity={0.55} />
          {/* Cozy folded blanket cuff */}
          <Path d="M62 61Q72 51 84 56L83 66Q72 62 62 70Z" fill={light} />
          <Path d="M65 59Q74 54 81 57" stroke={paleTint} strokeWidth={2} fill="none" />
          {/* Quilted puff highlights and stitched folds */}
          <Path d="M77 61q-7 10-4 24m42-22q-8 9-5 22m26-17q-4 7-3 13" stroke={light} strokeWidth={2.2} fill="none" />
          <Path d="M87 68q8 4 16 1m15-5q7 3 13 0M86 82q10 4 20 1m14-3q8 2 14-1" stroke={dark} strokeWidth={1.3} opacity={0.5} fill="none" />
          <Path d="M90 61q6-2 11 1m14-6q5-2 10 2" stroke={paleTint} strokeWidth={1.8} opacity={0.8} fill="none" />
          {/* Warm honey wood bed frame rail and rounded legs */}
          <Path d="M5 103H147V110H5Z" fill={wood} />
          <Path d="M8 105H144" stroke={woodLight} strokeWidth={2} fill="none" />
          <Path d="M10 110v7m132-7v7" stroke={woodDark} strokeWidth={7} />
          <Path d="M10 110v6m132-6v6" stroke={wood} strokeWidth={4.5} />
        </>
      )}
    </G>
  );

  return (
    <G fill="none" stroke={ink} strokeWidth={2.1} strokeLinejoin="round" strokeLinecap="round">
      {bed ? (
        id === 'bunk-bed' ? (
          <>
            {back && (
              <>
                <Ellipse cx={75} cy={145} rx={65} ry={4.5} fill={ink} opacity={0.13} stroke="none" />
                <Path d="M8 12V144M141 12V144" stroke={woodDark} strokeWidth={8.5} />
                <Path d="M8 12V144M141 12V144" stroke={wood} strokeWidth={5.5} />
                <Circle cx={8} cy={12} r={4.5} fill={woodLight} />
                <Circle cx={141} cy={12} r={4.5} fill={woodLight} />
              </>
            )}
            {bedding(29)}
            {bedding(-31)}
            {front && (
              <>
                <Path d="M121 65v78m17-78v78m-17-57h17m-17 20h17m-17 20h17" stroke={woodDark} strokeWidth={5.5} />
                <Path d="M121 65v78m17-78v78m-17-57h17m-17 20h17m-17 20h17" stroke={woodLight} strokeWidth={2.5} />
              </>
            )}
          </>
        ) : (
          <>
            {back && <Ellipse cx={76} cy={118} rx={68} ry={5.5} fill={ink} opacity={0.13} stroke="none" />}
            {bedding(0)}
          </>
        )
      ) : id === 'hammock' ? (
        <>
          {back && (
            <>
              <Ellipse cx={75} cy={133} rx={62} ry={5} fill={ink} opacity={0.12} stroke="none" />
              {state?.on && (
                <G stroke={brassLight} strokeWidth={2.2} fill="none">
                  <Path d="M53 23q13-8 27 0m-20 8q12-7 25 0" />
                  <Circle cx={87} cy={22} r={2} fill={brassLight} stroke="none" />
                </G>
              )}
              <Path d="M9 27L15 130M141 27L135 130M5 130h24m92 0h24" stroke={woodDark} strokeWidth={7.5} />
              <Path d="M9 27L15 130M141 27L135 130M5 130h24m92 0h24" stroke={wood} strokeWidth={4.5} />
              <Circle cx={9} cy={26} r={4} fill={woodLight} />
              <Circle cx={141} cy={26} r={4} fill={woodLight} />
              {/* Woven sling back */}
              <Path d="M11 48Q75 101 139 48L125 100Q75 129 25 100Z" fill={light} />
              <Path d="M22 65Q75 107 128 65" stroke={cream} strokeWidth={3} fill="none" opacity={0.75} />
              {/* Cozy bolster pillow */}
              <Ellipse cx={35} cy={76} rx={23} ry={24} fill={cream} />
              <Ellipse cx={33} cy={70} rx={13} ry={8} fill={shine} stroke="none" opacity={0.85} />
              <Path d="M18 82Q35 94 52 82" stroke={creamShade} strokeWidth={1.8} fill="none" />
            </>
          )}
          {front && (
            <>
              <Path d="M57 59Q67 44 85 50Q98 63 108 55Q118 47 129 54Q139 53 148 45L148 101Q100 132 27 107L22 91Q43 102 57 101Z" fill={color} />
              <Path d="M29 101Q77 120 144 92V99Q100 128 28 106Z" fill={dark} stroke="none" opacity={0.45} />
              <Path d="M32 103Q77 121 124 88" fill="none" stroke={cream} strokeWidth={3.2} />
              <Path d="M64 76v32m19-23v26m20-23v18m19-16v14" fill="none" stroke={light} strokeWidth={2.2} />
              <Path d="M62 60q12-7 22-3m24 3q10-6 21-1" fill="none" stroke={paleTint} strokeWidth={2} opacity={0.85} />
            </>
          )}
        </>
      ) : id === 'sofa' ? (
        <>
          {back && (
            <>
              <Ellipse cx={75} cy={125} rx={64} ry={5.5} fill={ink} opacity={0.14} stroke="none" />
              <Path d="M16 112v12m117-12v12" stroke={woodDark} strokeWidth={7.5} />
              <Path d="M16 112v11m117-11v11" stroke={wood} strokeWidth={4.5} />
              <Rect x={8} y={40} width={134} height={69} rx={20} fill={color} />
              <Rect x={14} y={48} width={122} height={46} rx={14} fill={light} />
              <Path d="M24 53H126" stroke={paleTint} strokeWidth={3} opacity={0.7} fill="none" />
              {/* Cozy tufting buttons on sofa back */}
              <Path d="M75 50V91" stroke={dark} strokeWidth={1.6} opacity={0.55} />
              <Circle cx={50} cy={67} r={2.6} fill={dark} stroke="none" opacity={0.65} />
              <Circle cx={100} cy={67} r={2.6} fill={dark} stroke="none" opacity={0.65} />
              {/* Plump throw pillow on left */}
              <Rect x={5} y={49} width={58} height={62} rx={14} fill={cream} />
              <Path d="M11 56Q34 51 57 56" stroke={shine} strokeWidth={3} fill="none" />
              <Path d="M11 98Q34 105 57 98" stroke={creamShade} strokeWidth={2.4} fill="none" />
            </>
          )}
          {front && (
            <>
              {/* Quilted throw blanket draped across the sleeper */}
              <Path d="M58 64Q70 49 86 56Q99 71 109 62Q122 52 132 66V111H58Z" fill={color} />
              <Path d="M60 66Q70 57 81 62m25 9q10-10 21-1" stroke={light} strokeWidth={4.5} />
              <Path d="M66 80q14 5 26 1m10 1q11 4 23 0M66 91q16 4 30 0" stroke={dark} strokeWidth={1.5} opacity={0.45} />
              {/* Plush front base apron */}
              <Rect x={7} y={99} width={136} height={14} rx={7} fill={color} />
              <Path d="M13 108H137" stroke={dark} strokeWidth={2.4} opacity={0.5} />
              <Path d="M14 102H136" stroke={light} strokeWidth={2} opacity={0.7} />
              {/* Plump right bolster armrest */}
              <Rect x={129} y={67} width={15} height={44} rx={7.5} fill={light} />
              <Path d="M134 72V105" stroke={paleTint} strokeWidth={2.4} opacity={0.8} />
            </>
          )}
        </>
      ) : id === 'bathtub' || id === 'bubble-bath' ? (
        <>
          {back && (
            <>
              <Ellipse cx={75} cy={138} rx={58} ry={6} fill={ink} opacity={0.14} stroke="none" />
              {/* Back tub lip and cozy lagoon bathwater */}
              <Path d="M13 72Q75 47 137 72V108H13Z" fill={cream} />
              <Path d="M19 69Q75 51 131 69" stroke={shine} strokeWidth={3} fill="none" />
              <Ellipse cx={75} cy={76} rx={61} ry={19} fill="#7CD4CC" />
              <Ellipse cx={75} cy={75} rx={50} ry={13} fill="#A7E8E1" stroke="none" opacity={0.7} />
              {/* Warm brushed brass faucet & knobs */}
              <Path d="M119 62V38Q119 29 108 33v9" stroke={ink} strokeWidth={8} fill="none" />
              <Path d="M119 62V38Q119 29 108 33v9" stroke={brass} strokeWidth={4.5} fill="none" />
              <Path d="M118 55V38Q118 32 110 34" stroke={brassLight} strokeWidth={1.6} fill="none" />
              <Circle cx={112} cy={59} r={3.5} fill={brassLight} />
              <Circle cx={126} cy={61} r={3.5} fill={brassLight} />
            </>
          )}
          {front && (
            <>
              {/* Glossy porcelain tub shell */}
              <Path d="M12 76Q75 85 138 76L130 121Q75 140 20 121Z" fill={material(tint, cream)} />
              <Path d="M22 114Q75 132 128 114L126 121Q75 138 24 121Z" fill={shade(material(tint, cream), -0.14)} stroke="none" />
              {/* Glossy porcelain specular shine */}
              <Path d="M25 89Q30 107 44 114" stroke={shine} strokeWidth={4.5} opacity={0.85} fill="none" />
              <Path d="M15 70H135V84H15Z" fill="#7CD4CC" stroke="none" />
              <Path d="M28 77Q75 82 122 77" stroke="#C5F5F0" strokeWidth={2.5} fill="none" opacity={0.85} />
              <Path d="M13 76Q75 85 137 76" stroke={shine} strokeWidth={7} />
              <Path d="M13 76Q75 85 137 76" stroke={ink} strokeWidth={2} />
              {/* Claw/wood feet */}
              <Path d="M30 127v9m90-9v9" stroke={brass} strokeWidth={7} />
              <Path d="M30 127v9m90-9v9" stroke={brassLight} strokeWidth={2.5} />
              {/* Iridescent pearlescent floating bubbles */}
              {(id === 'bubble-bath' ? [22, 37, 53, 94, 110, 125] : [27, 47, 98, 120]).map((x, i) => {
                const rBig = id === 'bubble-bath' ? (i % 2 === 0 ? 10.5 : 8.5) : 5.5;
                const rSmall = id === 'bubble-bath' ? 6.2 : 3.2;
                const y = 76 - (i % 3) * 2.5;
                const tintFill = i % 3 === 0 ? '#FFFDF7' : i % 3 === 1 ? '#E6FAF8' : '#FFF1F4';
                return (
                  <G key={x} stroke="#7DBEB8" strokeWidth={1.1}>
                    <Circle cx={x} cy={y} r={rBig} fill={tintFill} />
                    <Circle cx={x - rBig * 0.32} cy={y - rBig * 0.32} r={rBig * 0.28} fill="#FFFFFF" stroke="none" />
                    <Circle cx={x + rBig * 0.72} cy={y + 1.5} r={rSmall} fill="#FFFDF7" />
                    <Circle cx={x + rBig * 0.56} cy={y} r={rSmall * 0.28} fill="#FFFFFF" stroke="none" />
                  </G>
                );
              })}
            </>
          )}
        </>
      ) : (
        <>
          {back && (
            <>
              <Ellipse cx={75} cy={id === 'rocking-chair' ? 139 : id === 'floor-cushion' ? 129 : 132} rx={id === 'stool' ? 44 : 58} ry={5} fill={ink} opacity={0.13} stroke="none" />
              {['armchair', 'chair', 'rocking-chair', 'beanbag'].includes(id) && (
                <>
                  <Rect x={16} y={40} width={118} height={70} rx={id === 'beanbag' ? 36 : 18} fill={color} />
                  {id === 'beanbag' ? (
                    <>
                      <Path d="M48 44Q36 72 44 102M102 44Q114 72 106 102" stroke={dark} strokeWidth={1.8} opacity={0.45} fill="none" />
                      <Path d="M40 52Q75 42 110 52" stroke={light} strokeWidth={4} opacity={0.85} fill="none" />
                      <Circle cx={75} cy={72} r={4} fill={dark} stroke="none" opacity={0.4} />
                    </>
                  ) : (
                    <>
                      <Rect x={23} y={47} width={104} height={54} rx={12} fill={light} stroke="none" opacity={0.65} />
                      <Path d="M31 51H119" stroke={paleTint} strokeWidth={3} opacity={0.8} fill="none" />
                      {id === 'chair' || id === 'rocking-chair' ? (
                        <Path d="M46 53V90M75 52V90M104 53V90" stroke={dark} strokeWidth={2.4} opacity={0.45} />
                      ) : (
                        <>
                          <Circle cx={54} cy={68} r={3} fill={dark} stroke="none" opacity={0.55} />
                          <Circle cx={96} cy={68} r={3} fill={dark} stroke="none" opacity={0.55} />
                        </>
                      )}
                    </>
                  )}
                </>
              )}
              {id === 'rocking-chair' ? (
                <>
                  <Path d="M39 103v29m73-29v29M19 130Q75 148 131 130" stroke={woodDark} strokeWidth={7.5} fill="none" />
                  <Path d="M39 103v29m73-29v29M19 130Q75 148 131 130" stroke={wood} strokeWidth={4.5} fill="none" />
                </>
              ) : !['floor-cushion', 'beanbag'].includes(id) && (
                <>
                  <Path d="M35 102v29m80-29v29" stroke={woodDark} strokeWidth={7.5} />
                  <Path d="M35 102v28m80-28v28" stroke={wood} strokeWidth={4.5} />
                </>
              )}
              <Ellipse cx={75} cy={id === 'stool' ? 94 : id === 'floor-cushion' ? 117 : 100} rx={id === 'bench' ? 69 : id === 'stool' ? 46 : 59} ry={12} fill={light} />
              <Ellipse cx={75} cy={id === 'stool' ? 92 : id === 'floor-cushion' ? 115 : 98} rx={id === 'bench' ? 56 : id === 'stool' ? 34 : 44} ry={6.5} fill={paleTint} stroke="none" opacity={0.75} />
            </>
          )}
          {back && id === 'stool' && (
            <>
              <Path d="M35 119h80" stroke={woodDark} strokeWidth={5.5} />
              <Path d="M35 119h80" stroke={woodLight} strokeWidth={2.2} />
              <Circle cx={75} cy={93} r={2.5} fill={dark} stroke="none" opacity={0.55} />
            </>
          )}
          {back && id === 'bench' && (
            <>
              <Path d="M9 99H141V107H9Z" fill={wood} />
              <Path d="M13 101H137" stroke={woodLight} strokeWidth={2.5} />
              <Path d="M15 94H135" stroke={cream} strokeWidth={2.2} />
            </>
          )}
          {back && id === 'floor-cushion' && (
            <>
              <Path d="M18 117Q75 98 132 117V124Q75 139 18 124Z" fill={color} />
              <Ellipse cx={75} cy={115} rx={55} ry={13.5} fill={light} />
              <Path d="M25 121Q75 135 125 121" stroke={dark} strokeWidth={2} opacity={0.5} fill="none" />
              <Path d="M36 112Q75 103 114 112" stroke={paleTint} strokeWidth={2.8} opacity={0.85} fill="none" />
              <Path d="M75 103v28M44 107Q58 116 75 117M106 107Q92 116 75 117" stroke={dark} strokeWidth={1.3} opacity={0.35} fill="none" />
              <Circle cx={75} cy={116} r={4} fill={cream} />
            </>
          )}
          {front && id === 'armchair' && (
            <>
              <Rect x={23} y={72} width={16} height={40} rx={8} fill={color} />
              <Rect x={111} y={72} width={16} height={40} rx={8} fill={color} />
              <Path d="M26 77h10m78 0h10" stroke={paleTint} strokeWidth={3.2} />
              <Path d="M27 104h8m80 0h8" stroke={dark} strokeWidth={2} opacity={0.5} />
            </>
          )}
          {front && id === 'beanbag' && (
            <>
              <Path d="M23 95Q29 92 43 101L45 119Q18 122 18 104ZM107 101Q121 92 127 95L132 104Q132 122 105 119Z" fill={color} />
              <Path d="M24 101Q31 99 39 105M111 105Q119 99 126 101" stroke={light} strokeWidth={2.6} fill="none" />
            </>
          )}
        </>
      )}
    </G>
  );
}

export function SeatArt({ id, size = 120, layer = 'all', mirrored = false, rotation = 0, tint, state, motion, occupied = false }: { occupied?: boolean; id: string; size?: number; layer?: ArtLayer; mirrored?: boolean; rotation?: number; tint?: TintId; state?: ItemVisualState; motion?: (art: React.ReactNode) => React.ReactNode }) {
  const flip = mirrored !== (rotation === 180 || rotation === 270);
  if (['bed', 'sofa', 'bathtub', 'bubble-bath'].includes(id)) {
    const key = id === 'bubble-bath' ? 'bathtub' : id as 'bed' | 'sofa' | 'bathtub';
    // Pixel-registered front cutouts: the pillow/head remain behind the friend. The
    // repeated quilt/tub body covers their lower body at the published socket height.
    const top = id === 'bed' ? .47 : id === 'sofa' ? .77 : .43;
    const left = id === 'bed' ? .27 : 0;
    const sprite = <Image source={illustratedProps[key]()} resizeMode="contain" fadeDuration={0} accessible={false}
      style={{ position: 'absolute', width: size, height: size, left: -left * size, top: -top * size }}/>;
    return <View pointerEvents="none" accessible={false} style={{ width: size, height: size, transform: [{ scaleX: flip ? -1 : 1 }] }}>
      {layer !== 'front' && <Image testID={`painted-seat-${id}`} source={illustratedProps[key]()} resizeMode="contain" fadeDuration={0} accessible={false} style={{ width: size, height: size }}/>}
      {layer !== 'front' && tint && tint !== 'original' && <PaintedTint id={key} size={size} tint={tint}/>}
      {occupied && layer !== 'back' && <View testID={`painted-seat-front-${id}`} style={{ position: 'absolute', left: left * size, top: top * size, width: (1-left) * size, height: (1-top) * size, overflow: 'hidden' }}>{sprite}</View>}
      {occupied && layer !== 'back' && id === 'bed' && <Svg width={size} height={size} viewBox="0 0 150 150" style={{ position:'absolute' }} accessible={false}>
        <G stroke="#326F66" strokeWidth={1.4} strokeLinejoin="round" fill="none">
          <Path d='M59 64Q71 49 91 57Q113 50 144 63L145 96Q103 107 59 96Z' fill={material(tint ?? 'original', '#319C93')}/>
          <Path d='M61 65Q75 56 90 62Q111 56 141 65' stroke={shade(material(tint ?? 'original', '#319C93'), .35)} strokeWidth={3}/>
          <Path d='M79 61q-7 13-3 32m22-33q-7 14-3 36m23-34q-7 14-4 33M65 79q35 11 76 0' stroke="#247D78" opacity={.75}/>
          <Path d='M112 58l15 1-7 41-16 1Z' fill="#F18F71" stroke="#D47256"/>
          <Path d="M68 91q14 5 29 3" stroke="#6CBDAA" strokeWidth={2}/>
        </G>
      </Svg>}
      {occupied && layer !== 'back' && (id === 'bathtub' || id === 'bubble-bath') && <Svg width={size} height={size} viewBox="0 0 150 150" style={{ position: 'absolute' }} accessible={false}>
        <G fill="#E5FFF5" stroke="#9CCDC4" strokeWidth={.7}>
          {[24,42,112,130].map((x,n) => <G key={x}><Circle cx={x} cy={62 + n%2*6} r={n%2 ? 6 : 8} opacity={.86}/><Circle cx={x-2} cy={59+n%2*6} r={2} fill="#FFFFFF" stroke="none"/></G>)}
        </G>
      </Svg>}
    </View>;
  }
  const art = <SeatShape id={id} layer={layer} tint={tint} state={state} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 150 150" accessible={false}>
      <G transform={flip ? 'translate(150 0) scale(-1 1)' : undefined}>{motion ? motion(art) : art}</G>
    </Svg>
  );
}
