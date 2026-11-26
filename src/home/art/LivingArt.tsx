import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { ItemVisualState } from '../world';
import type { TintId } from '../catalogMore';
import { material, shade } from './Tint';
import { HandProp } from './PropShape';
import { holdableIds, type HoldableId } from './living';

const ink = '#4A3328',
  cream = '#FFF7E6',
  creamShade = '#EDE0C7',
  shine = '#FFFDF7',
  wood = '#C88E5B',
  woodLight = '#E5B582',
  woodDark = '#9E693D',
  coral = '#FF7A5C',
  gold = '#F5C249',
  goldGlow = '#FFE38A',
  palm = '#4E9F5A',
  palmLight = '#7AC778';

export const livingIds = [...holdableIds, 'floor-lamp', 'table-lamp', 'lamp', 'sink-counter', 'stove', 'kitchen-table', 'tv', 'radio', 'fridge', 'fruit-bowl'] as const;
export const hasLivingArt = (id: string) => (livingIds as readonly string[]).includes(id);

export function LivingShape({ id, state = {}, tint = 'original', reduced = false }: { id: string; state?: ItemVisualState; tint?: TintId; reduced?: boolean }) {
  const color = material(tint, '#4FA99F');
  const light = shade(color, 0.34);
  const dark = shade(color, -0.2);
  const on = !!state.on;

  return (
    <G fill="none" stroke={ink} strokeWidth={2.1} strokeLinejoin="round" strokeLinecap="round">
      {(holdableIds as readonly string[]).includes(id) ? (
        <G transform="translate(30 28) scale(3.6)">
          <HandProp id={id as HoldableId} state={state} tint={tint} />
        </G>
      ) : ['lamp', 'floor-lamp', 'table-lamp'].includes(id) ? (
        <G>
          {/* Warm ambient floor pool and golden halo when lit */}
          {on && (
            <G stroke="none">
              <Ellipse cx={75} cy={132} rx={66} ry={13} fill={gold} opacity={0.18} />
              <Ellipse cx={75} cy={131} rx={48} ry={8} fill={goldGlow} opacity={0.28} />
              <Ellipse cx={75} cy={130} rx={28} ry={4.5} fill="#FFF4CC" opacity={0.35} />
              <Circle cx={75} cy={57} r={54} fill={goldGlow} opacity={0.16} />
              <Circle cx={75} cy={57} r={41} fill="#FFF2BE" opacity={0.25} />
              <Circle cx={75} cy={57} r={26} fill="#FFF8DC" opacity={0.28} />
            </G>
          )}
          <G transform={id === 'table-lamp' ? 'translate(15 38) scale(.8 .7)' : undefined}>
            {!on && <Ellipse cx={75} cy={129} rx={30} ry={5} fill={ink} opacity={0.13} stroke="none" />}
            <Ellipse cx={75} cy={126} rx={27} ry={7} fill={wood} />
            <Path d="M56 124Q75 121 94 124" stroke={woodLight} strokeWidth={2.4} fill="none" />
            <Path d="M75 122V61" stroke={woodDark} strokeWidth={8.5} />
            <Path d="M75 122V61" stroke={wood} strokeWidth={5.5} />
            {/* Warm glowing or tinted lampshade */}
            <Path d="M49 20H101L122 68Q75 87 28 68Z" fill={on ? '#FFEA9E' : color} />
            {on && <Path d="M49 20H101L114 62Q75 76 36 62Z" fill="#FFF5CC" stroke="none" opacity={0.55} />}
            <Path d="M54 24H96" stroke={shine} strokeWidth={2.5} opacity={0.75} />
            {/* Gentle shade pleats */}
            <Path d="M61 24L53 69M75 24V74M89 24L97 69" stroke={on ? '#E6B95E' : dark} strokeWidth={1.3} opacity={0.45} />
            <Path d="M41 64Q75 76 109 64" fill="none" stroke={on ? shine : cream} strokeWidth={4.2} />
            <Path d="M107 76v14" strokeWidth={2} />
            <Circle cx={107} cy={93} r={3.6} fill={on ? gold : coral} />
          </G>
        </G>
      ) : id === 'sink-counter' ? (
        <>
          <Ellipse cx={75} cy={140} rx={64} ry={5} fill={ink} opacity={0.13} stroke="none" />
          <Rect data-front="sink" x={10} y={65} width={130} height={73} rx={6} fill={color} />
          <Path d="M13 130H137V135Q137 137 134 137H16Q13 137 13 135Z" fill={dark} stroke="none" opacity={0.45} />
          {/* Beveled warm cream countertop */}
          <Rect x={8} y={59} width={134} height={8} rx={3.5} fill={cream} />
          <Path d="M12 61H138" stroke={shine} strokeWidth={2.2} opacity={0.85} />
          {/* Porcelain/lagoon recessed basin */}
          <Ellipse cx={76} cy={62} rx={32} ry={4.5} fill="#88D2D4" />
          <Path d="M52 62Q76 66 100 62" stroke={shine} strokeWidth={1.6} opacity={0.7} />
          {/* Brushed gooseneck faucet + hot/cold handles */}
          <Path d="M99 57V34Q99 19 83 24V40" fill="none" stroke={ink} strokeWidth={8.5} />
          <Path d="M99 57V34Q99 19 83 24V40" fill="none" stroke="#BFCAC6" strokeWidth={5.2} />
          <Path d="M98 51V34Q98 23 86 25" fill="none" stroke={shine} strokeWidth={1.8} />
          <Circle cx={109} cy={56} r={3.2} fill={coral} />
          <Circle cx={90} cy={56} r={3.2} fill="#6BC4D1" />
          {/* Paneled cabinet doors with brass knobs */}
          <Path d="M75 70v65" stroke={dark} strokeWidth={2} />
          <Rect x={16} y={73} width={53} height={57} rx={4} fill={light} opacity={0.28} stroke={dark} strokeWidth={1.6} />
          <Rect x={81} y={73} width={53} height={57} rx={4} fill={light} opacity={0.28} stroke={dark} strokeWidth={1.6} />
          <Circle cx={61} cy={96} r={3.2} fill={gold} />
          <Circle cx={89} cy={96} r={3.2} fill={gold} />
          {on && (
            <G data-water="running">
              {/* Sparkling clear water stream, foamy bubbles, and splash droplets */}
              <Path d="M83 40V61" stroke="#5BC4D0" strokeWidth={6.5} />
              <Path d="M83 40V61" stroke="#B6F0F5" strokeWidth={3.2} />
              <Path d="M82 42V58" stroke={shine} strokeWidth={1.3} />
              <Circle cx={75} cy={61} r={4} fill={shine} stroke="#6CC8D1" strokeWidth={1.2} />
              <Circle cx={84} cy={62} r={4.5} fill="#E6FAF8" stroke="#6CC8D1" strokeWidth={1.2} />
              <Circle cx={91} cy={61} r={3.2} fill={shine} stroke="#6CC8D1" strokeWidth={1.2} />
              <Path d="M79 58q-10-8-16-2m21 2q10-8 17-3" fill="none" stroke="#8FE4EB" strokeWidth={2.4} />
              <Circle cx={63} cy={51} r={2} fill="#8FE4EB" stroke="none" />
              <Circle cx={99} cy={50} r={2.2} fill="#B6F0F5" stroke="none" />
            </G>
          )}
        </>
      ) : id === 'stove' ? (
        <>
          {/* HD-07: the pan is the stove's own cooking place. Food dropped on the stove sits in it;
              tapping the stove lights the burner under it. */}
          <Ellipse cx={75} cy={139} rx={61} ry={5} fill={ink} opacity={0.13} stroke="none" />
          <Rect data-front="oven" x={13} y={61} width={124} height={76} rx={6} fill={color} />
          <Path d="M16 129H134V134Q134 136 131 136H19Q16 136 16 134Z" fill={dark} stroke="none" opacity={0.45} />
          <Rect x={10} y={55} width={130} height={7} rx={2.5} fill={cream} />
          <Path d="M14 57H136" stroke={shine} strokeWidth={2} opacity={0.85} />
          <Ellipse cx={24} cy={56} rx={9} ry={2.2} fill={ink} />
          <Ellipse cx={126} cy={56} rx={9} ry={2.2} fill={ink} />
          {on && <Ellipse cx={75} cy={55} rx={30} ry={6} fill={goldGlow} opacity={0.32} stroke="none" />}
          <Ellipse data-burner={on ? 'lit' : 'off'} cx={75} cy={56} rx={24} ry={3.5} fill={on ? '#FF7A45' : ink} stroke={on ? '#D9532A' : ink} />
          {on && (
            <Path data-flame="lit" d="M52 55q3-7 5 0m8 1q3-8 6 0m9 0q3-8 6 0m8-1q3-7 5 0" fill={gold} stroke="#E86532" strokeWidth={1.3} />
          )}
          <Path data-pan="stove" d="M44 46Q75 56 106 46L103 52Q75 61 47 52Z" fill="#4E5B5E" />
          <Ellipse cx={75} cy={46} rx={31} ry={5} fill="#6A7A7E" />
          <Ellipse cx={75} cy={46} rx={25} ry={3.4} fill="#87989C" stroke="none" />
          <Path d="M55 45Q75 43 95 45" stroke="#B6C6CA" strokeWidth={1.2} opacity={0.7} />
          <Path d="M105 47L134 40" stroke={woodDark} strokeWidth={7} />
          <Path d="M105 47L134 40" stroke={woodLight} strokeWidth={3.2} />
          <Path d="M105 47L134 40" stroke={ink} strokeWidth={1.2} />
          {[43, 75, 107].map((x, i) => (
            <G key={x}>
              <Circle cx={x} cy={73} r={4.6} fill={on && i === 1 ? gold : cream} />
              <Circle cx={x - 1} cy={71.8} r={1.3} fill={shine} stroke="none" opacity={0.8} />
              {i === 1 && <Path d={on ? 'M75 73l3-3' : 'M75 73v-4'} stroke={ink} strokeWidth={1.6} />}
            </G>
          ))}
          <Rect x={30} y={85} width={90} height={43} rx={6} fill={on ? '#5C463B' : '#45595B'} />
          {on && <Rect x={34} y={91} width={82} height={33} rx={4} fill="#F5B849" opacity={0.18} stroke="none" />}
          <Path d="M39 98h72m-67 11h62m-62 10h62" stroke="#C5DDD5" strokeWidth={2} opacity={0.8} />
          <Path d="M35 86h80" stroke={woodDark} strokeWidth={6} />
          <Path d="M36 85h78" stroke={woodLight} strokeWidth={2.5} />
        </>
      ) : id === 'kitchen-table' ? (
        <>
          <Ellipse cx={75} cy={138} rx={58} ry={5} fill={ink} opacity={0.13} stroke="none" />
          <Path d="M27 71v66m96-66v66" stroke={woodDark} strokeWidth={9.5} />
          <Path d="M27 71v65m96-65v65" stroke={wood} strokeWidth={6} />
          <Rect data-front="table" x={10} y={59} width={130} height={13} rx={5} fill={color} />
          <Path d="M13 68H137" stroke={dark} strokeWidth={2.5} opacity={0.45} />
          <Path d="M14 61.5h122" stroke={cream} strokeWidth={3} />
        </>
      ) : id === 'tv' ? (
        <>
          <Ellipse cx={75} cy={134} rx={46} ry={5} fill={ink} opacity={0.13} stroke="none" />
          <Path d="M60 117l-8 16m42-16 8 16" stroke={woodDark} strokeWidth={8} />
          <Path d="M60 117l-8 16m42-16 8 16" stroke={wood} strokeWidth={4.5} />
          {/* Warm retro-cute rounded bezel */}
          <Rect x={10} y={30} width={130} height={88} rx={15} fill={material(tint, wood)} />
          <Path d="M22 33H128" stroke={tint === 'original' ? woodLight : light} strokeWidth={3} opacity={0.8} />
          <Rect x={18} y={38} width={114} height={70} rx={9} fill={on ? '#AEE6E3' : '#3E5354'} />
          {on ? (
            <>
              {/* Charming sunlit Guam lagoon & palm mini painting */}
              <Circle cx={104} cy={54} r={10} fill={goldGlow} />
              <Circle cx={104} cy={54} r={6.5} fill="#FFF7C8" stroke="none" />
              <Path d="M31 53Q39 45 49 51Q56 47 62 53Z" fill={shine} stroke="none" opacity={0.9} />
              <Path d="M20 83Q45 58 75 80Q102 64 130 82V106H20Z" fill={palm} />
              <Path d="M20 88Q50 75 82 88Q108 77 130 88V106H20Z" fill={palmLight} stroke="none" opacity={0.55} />
              {/* Tiny island palm silhouette */}
              <Path d="M44 82Q42 70 46 61" stroke={woodDark} strokeWidth={2.4} fill="none" />
              <Path d="M46 61Q37 59 34 65M46 61Q54 57 58 63M46 61Q43 54 38 55" stroke={palm} strokeWidth={2.2} fill="none" />
              {/* Sparkling lagoon water strip */}
              <Path d="M20 93Q76 85 130 93V106H20Z" fill="#4FA99F" stroke="none" />
              <Path d="M24 98Q75 90 126 99" fill="none" stroke="#E4FAF7" strokeWidth={2.8} />
            </>
          ) : (
            <Path d="M27 50L44 43M27 60L53 49" stroke="#6B8385" strokeWidth={3} opacity={0.45} />
          )}
          <Rect x={18} y={38} width={114} height={70} rx={9} fill="none" stroke={ink} strokeWidth={2} />
          <Circle cx={125} cy={113} r={2.6} fill={on ? gold : '#7A8C84'} />
          <Path d="M24 113h14" stroke={ink} strokeWidth={2} opacity={0.45} />
        </>
      ) : id === 'radio' ? (
        <>
          <Ellipse cx={75} cy={128} rx={58} ry={5} fill={ink} opacity={0.13} stroke="none" />
          <Path d="M43 45V30Q75 17 108 30V45" fill="none" stroke={woodDark} strokeWidth={6} />
          <Path d="M43 45V30Q75 17 108 30V45" fill="none" stroke={wood} strokeWidth={3.2} />
          <Path d="M112 48l14-28" fill="none" stroke="#9AA8A5" strokeWidth={4} />
          <Circle cx={126} cy={20} r={3.5} fill={gold} />
          <Rect x={13} y={48} width={126} height={78} rx={17} fill={color} />
          <Path d="M26 52H126" stroke={light} strokeWidth={3.2} opacity={0.85} />
          <Path d="M20 118H132" stroke={dark} strokeWidth={2.5} opacity={0.45} />
          {/* Woven retro speaker grille */}
          <Circle cx={49} cy={87} r={25} fill={cream} />
          <Circle cx={49} cy={87} r={18} fill="#D9C7A3" />
          <Path d="M37 81h24m-26 6h28m-26 6h24" stroke="#8C6D4F" strokeWidth={2.2} />
          {/* Glowing warm tuning dial */}
          <Rect x={84} y={64} width={40} height={15} rx={5} fill={on ? '#FFF2BD' : cream} />
          <Path d="M90 71h26" stroke={woodDark} strokeWidth={1.6} />
          <Path d={on ? 'M108 66v10' : 'M96 66v10'} stroke={coral} strokeWidth={2.5} />
          <Circle cx={97} cy={103} r={8.5} fill={wood} />
          <Circle cx={95} cy={101} r={2.2} fill={woodLight} stroke="none" />
          <Circle cx={121} cy={103} r={5.5} fill={coral} />
          {on && (
            <G data-notes={reduced ? 'static' : 'still'}>
              <Circle cx={24} cy={22} r={15} fill={goldGlow} opacity={0.32} stroke="none" />
              <Path d="M20 31V14l13-3v16" fill="none" stroke={ink} strokeWidth={2.4} />
              <Ellipse cx={16} cy={32} rx={4.5} ry={3.2} fill={gold} />
              <Ellipse cx={29} cy={28} rx={4.5} ry={3.2} fill={gold} />
              <Circle cx={42} cy={13} r={2} fill={coral} stroke="none" />
            </G>
          )}
        </>
      ) : id === 'fridge' ? (
        <>
          <Ellipse cx={75} cy={145} rx={46} ry={4.5} fill={ink} opacity={0.14} stroke="none" />
          <Rect x={27} y={8} width={94} height={132} rx={12} fill={color} />
          <Path d="M36 12H112" stroke={light} strokeWidth={3} opacity={0.8} />
          <Rect x={35} y={17} width={78} height={114} rx={5} fill={on ? '#E8F7F4' : cream} />
          {on ? (
            <>
              {/* Cool lit interior stocked with yummy snacks */}
              <Rect x={37} y={19} width={74} height={110} rx={4} fill="#F3FCFA" stroke="none" />
              <Path d="M36 53H112M36 86H112M36 117H112" stroke={creamShade} strokeWidth={4.5} />
              {/* Top shelf: milk bottle, golden mango & jam jar */}
              <Rect x={42} y={28} width={13} height={22} rx={3} fill={shine} strokeWidth={1.6} />
              <Path d="M44 37h9" stroke="#68B5CC" strokeWidth={3} />
              <Ellipse cx={71} cy={41} rx={9} ry={7.5} fill={gold} strokeWidth={1.6} />
              <Circle cx={75} cy={39} r={3} fill={coral} stroke="none" opacity={0.65} />
              <Rect x={88} y={33} width={16} height={17} rx={4} fill={coral} strokeWidth={1.6} />
              <Rect x={90} y={30} width={12} height={4} rx={1.5} fill={gold} strokeWidth={1.3} />
              {/* Middle shelf: leafy bowl & juice box */}
              <Circle cx={55} cy={73} r={9} fill={palmLight} strokeWidth={1.6} />
              <Path d="M43 75Q55 86 67 75Z" fill={cream} strokeWidth={1.6} />
              <Rect x={78} y={62} width={18} height={22} rx={3} fill="#E9BF69" strokeWidth={1.6} />
              <Circle cx={87} cy={74} r={4} fill="#EC9989" stroke="none" />
              {/* Bottom drawer: fresh veggies/fruit */}
              <Rect x={42} y={96} width={64} height={17} rx={4} fill="#CBEFE9" strokeWidth={1.6} />
              <Circle cx={58} cy={104} r={5} fill={coral} strokeWidth={1.4} />
              <Circle cx={74} cy={104} r={5} fill={gold} strokeWidth={1.4} />
              <Circle cx={90} cy={104} r={5} fill={palmLight} strokeWidth={1.4} />
              {/* Open door with door pockets */}
              <Rect data-front="open-door" x={120} y={17} width={27} height={114} rx={4} fill={light} />
              <Rect x={125} y={42} width={17} height={27} rx={3} fill={cream} />
              <Circle cx={133} cy={42} r={4} fill={gold} strokeWidth={1.3} />
              <Rect x={125} y={91} width={17} height={28} rx={3} fill={cream} />
              <Rect x={128} y={83} width={11} height={11} rx={2} fill="#68B5CC" strokeWidth={1.3} />
              <Path d="M119 17v114M117 29h5m-5 89h5" stroke={woodDark} strokeWidth={3} />
            </>
          ) : (
            <>
              <Rect x={35} y={17} width={78} height={42} rx={6} fill={color} />
              <Rect x={35} y={64} width={78} height={67} rx={6} fill={color} />
              {/* Glossy vertical door highlight */}
              <Path d="M104 23v30M104 71v52" stroke={shine} strokeWidth={3} opacity={0.45} />
              {/* Chunky cream handles */}
              <Path d="M46 28v20m0 29v25" stroke={cream} strokeWidth={5.5} />
              <Path d="M46 28v20m0 29v25" stroke={ink} strokeWidth={1.4} />
              {/* Cute island star fridge magnet */}
              <Circle cx={88} cy={38} r={5.5} fill={gold} strokeWidth={1.5} />
              <Circle cx={88} cy={38} r={2} fill={shine} stroke="none" />
            </>
          )}
          <Path d="M37 140v4m74-4v4" stroke={woodDark} strokeWidth={5.5} />
        </>
      ) : id === 'fruit-bowl' ? (
        <G transform="translate(0 -8)">
          <Ellipse cx={75} cy={135} rx={46} ry={5} fill={ink} opacity={0.13} stroke="none" />
          {/* Overflowing yummy tropical fruit nestled in the bowl */}
          <Path d="M36 86Q42 74 54 78" stroke={palm} strokeWidth={4} fill="none" />
          <Path d="M112 85Q107 73 95 77" stroke={palmLight} strokeWidth={4} fill="none" />
          <Circle cx={50} cy={83} r={14} fill={coral} />
          <Circle cx={46} cy={79} r={3.5} fill={shine} stroke="none" opacity={0.65} />
          <Circle cx={99} cy={83} r={14} fill={palmLight} />
          <Circle cx={95} cy={79} r={3.5} fill={shine} stroke="none" opacity={0.6} />
          <Ellipse cx={75} cy={81} rx={16} ry={13} fill={gold} />
          <Ellipse cx={71} cy={76} rx={5.5} ry={2.8} fill="#FFF4B8" stroke="none" opacity={0.85} />
          {/* Glazed ceramic bowl */}
          <Path d="M16 83Q75 107 134 83Q126 135 75 136Q25 135 16 83Z" fill={color} />
          <Path d="M27 115Q75 135 123 115Q112 135 75 136Q38 135 27 115Z" fill={dark} stroke="none" opacity={0.35} />
          <Path d="M28 95Q75 114 122 95" fill="none" stroke={cream} strokeWidth={4.2} />
          <Path d="M33 105Q75 121 117 105" fill="none" stroke={light} strokeWidth={2.2} opacity={0.8} />
          <Path d="M31 92Q35 108 45 118" fill="none" stroke={shine} strokeWidth={3} opacity={0.45} />
        </G>
      ) : null}
    </G>
  );
}

export function LivingArt({ id, size = 120, state, mirrored = false, rotation = 0, tint, reduced = false }: { id: string; size?: number; state?: ItemVisualState; mirrored?: boolean; rotation?: number; tint?: TintId; reduced?: boolean }) {
  const flip = mirrored !== (rotation === 180 || rotation === 270);
  return (
    <Svg width={size} height={size} viewBox="0 0 150 150" accessible={false}>
      <G transform={flip ? 'translate(150 0) scale(-1 1)' : undefined}>
        <LivingShape id={id} state={state} tint={tint} reduced={reduced} />
      </G>
    </Svg>
  );
}
