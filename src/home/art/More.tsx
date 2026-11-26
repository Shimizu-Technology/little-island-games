import { BeachPropArt } from '../BeachProps';
import { LivingArt, hasLivingArt } from './LivingArt';
import { SeatArt, hasSeatArt } from './SeatArt';
import type { ArtLayer, ItemVisualState } from '../world';
import React from "react";
import Svg, { Circle, Ellipse, G, Path, Rect, Defs, Filter, FeColorMatrix, LinearGradient, Stop } from "react-native-svg";
import type { HomeState } from "../model";
import { type TintId, type RoomId } from "../catalogMore";
import { material, shade } from "./Tint";
import { StageRoom } from "./Stage";
import { ItemFinish, ItemLife, ItemMotion } from "./Finish";

const ink = "#4A3328",
  wood = "#C88E5B",
  woodLight = "#E5B582",
  woodDark = "#9E693D",
  pale = "#FFF7E6",
  shine = "#FFFDF7",
  leaf = "#4E9F5A",
  leafLight = "#7AC778",
  leafDark = "#367643",
  gold = "#F5C249",
  goldGlow = "#FFE38A",
  coral = "#FF7A5C";

const star = "M75 30L87 55L115 59L94 79L99 106L75 93L51 106L56 79L35 59L63 55Z";

export function MoreItemArt({ id, size = 120, mirrored = false, rotation = 0, active = false, muted = false, tint = "original", animated = false, reduced = false, layer = "all", state }: {
  layer?: ArtLayer; state?: ItemVisualState; id: string; size?: number; mirrored?: boolean; rotation?: 0 | 90 | 180 | 270; active?: boolean; muted?: boolean; tint?: TintId; animated?: boolean; reduced?: boolean;
}) {
  const uid = React.useId().replace(/[^A-Za-z0-9_-]/g, "");
  if (id === 'beach-towel' || id === 'lounger') return <BeachPropArt item={id} size={size} mirrored={mirrored} rotation={rotation} tint={tint} layer={layer} />;
  if (hasLivingArt(id)) return layer === 'front' ? null : <LivingArt id={id} size={size} state={state ?? { on: active }} mirrored={mirrored} rotation={rotation} tint={tint} reduced={reduced} />;
  if (hasSeatArt(id)) return <SeatArt id={id} size={size} layer={layer} mirrored={mirrored} rotation={rotation} tint={tint} state={state ?? { on: active }} motion={art => <ItemMotion active={active} animated={animated} reduced={reduced}>{art}</ItemMotion>} />;
  if (layer === 'front') return null;

  const color = material(tint, ['#4FA99F', '#FF7A5C', '#F5C249'][id.length % 3]);
  const light = shade(color, 0.34), dark = shade(color, -0.2);
  const volId = `more-volume-${id}-${tint}-${uid}`;
  const mutedId = `more-muted-${id}-${uid}`;
  const volume = `url(#${volId})`;

  const legs = (
    <G>
      <Path d="M33 89L29 116M115 86L120 111" stroke={woodDark} strokeWidth={8.5} />
      <Path d="M33 89L29 116M115 86L120 111" stroke={wood} strokeWidth={5.5} />
    </G>
  );

  let art: React.ReactNode;
  switch (id) {
    case 'desk': case 'side-table': case 'coffee-table':
      art = (
        <G transform={id === 'side-table' ? 'translate(20 -5) scale(.73 1)' : id === 'coffee-table' ? 'translate(0 32) scale(1 .73)' : undefined}>
          {legs}
          <Path d="M19 64L111 53L136 73L43 89L19 77Z" fill={woodDark} />
          <Path d="M19 64L111 53L136 73L43 82Z" fill={volume} />
          <Path d="M29 66L108 57" stroke={shine} strokeWidth={3} opacity={0.7} />
          {id === 'desk' && (
            <>
              <Path d="M86 84V104L125 98V77Z" fill={wood} />
              <Path d="M90 88L121 83" stroke={woodLight} strokeWidth={2} opacity={0.7} />
              <Circle cx={106} cy={91} r={3} fill={gold} />
            </>
          )}
        </G>
      );
      break;
    case 'carry-basket':
      art = (
        <>
          <Path d="M36 64Q32 14 75 14Q119 14 115 64" fill="none" stroke={woodDark} strokeWidth={9} />
          <Path d="M36 64Q32 14 75 14Q119 14 115 64" fill="none" stroke={woodLight} strokeWidth={5.5} />
          <Path d="M23 61Q74 43 128 61L118 110Q75 126 34 110Z" fill={wood} />
          <Path d={active ? "M24 61Q75 47 126 61Q75 88 24 61Z" : "M24 61Q75 37 126 61Q75 77 24 61Z"} fill={active ? '#6E4C3B' : light} />
          {active && <Circle cx={74} cy={65} r={8} fill={gold} />}
          <Path d="M28 74Q75 94 124 74M31 91Q75 110 120 91M47 82L51 114M74 88V119M102 82L98 115" stroke={pale} strokeWidth={2.6} fill="none" opacity={0.85} />
          <Path d="M25 63Q75 81 125 63" stroke={color} strokeWidth={3.5} fill="none" />
        </>
      );
      break;
    case 'cupboard':
      art = (
        <>
          {legs}
          <Path d="M26 24L111 16L129 28V102L43 115L26 104Z" fill={dark} />
          <Path d="M26 24L111 16L129 28L43 38Z" fill={light} />
          <Path d="M34 25L108 18" stroke={shine} strokeWidth={2.4} opacity={0.65} />
          <Path d="M43 38L129 28V102L43 115Z" fill={active ? '#6E4C3B' : color} />
          {active ? (
            <>
              <Path d="M46 64L125 55M46 89L125 80" stroke={woodLight} strokeWidth={5} />
              {/* Stocked colorful mugs/dishes inside */}
              <Rect x={56} y={47} width={14} height={14} rx={3} fill={pale} />
              <Circle cx={88} cy={52} r={8} fill={gold} />
              <Rect x={102} y={42} width={14} height={15} rx={3} fill={coral} />
              <Rect x={60} y={71} width={22} height={14} rx={4} fill="#9CE0D8" />
              <Path d="M43 38L24 46V122L43 115ZM129 28L147 36V111L129 102Z" fill={light} />
            </>
          ) : (
            <>
              <Path d="M86 33V108" stroke={dark} strokeWidth={2} />
              <Rect x={50} y={44} width={29} height={58} rx={3} fill="none" stroke={light} strokeWidth={1.6} opacity={0.7} />
              <Rect x={93} y={39} width={29} height={58} rx={3} fill="none" stroke={light} strokeWidth={1.6} opacity={0.7} />
              <Circle cx={78} cy={74} r={3.5} fill={gold} />
              <Circle cx={94} cy={72} r={3.5} fill={gold} />
            </>
          )}
        </>
      );
      break;
    case 'dresser':
      art = (
        <>
          {legs}
          <Path d="M26 24L111 16L129 28V102L43 115L26 104Z" fill={dark} />
          <Path d="M26 24L111 16L129 28L43 38Z" fill={light} />
          <Path d="M35 25L108 18" stroke={shine} strokeWidth={2.4} opacity={0.65} />
          <Path d="M43 38L129 28V102L43 115Z" fill={color} />
          {[0, 1, 2].map(n => (
            <G key={n}>
              {active && <Path d={`M50 ${46 + n * 22}L121 ${36 + n * 22}V${53 + n * 22}L50 ${64 + n * 22}Z`} fill="#6E4C3B" />}
              <G transform={active ? 'translate(-15 7)' : undefined}>
                {active && (
                  <>
                    <Path d={`M50 ${46 + n * 22}L65 ${39 + n * 22}L136 ${29 + n * 22}L121 ${36 + n * 22}Z`} fill={woodLight} />
                    <Path d={`M66 ${42 + n * 22}L116 ${35 + n * 22}`} stroke={[pale, gold, coral][n]} strokeWidth={4} />
                  </>
                )}
                <Path d={`M50 ${46 + n * 22}L121 ${36 + n * 22}V${53 + n * 22}L50 ${64 + n * 22}Z`} fill={light} />
                <Circle cx={85} cy={50 + n * 22} r={3.2} fill={gold} />
              </G>
            </G>
          ))}
        </>
      );
      break;
    case 'bookcase':
      art = (
        <>
          {legs}
          <Path d="M26 24L111 16L129 28V102L43 115L26 104Z" fill={woodDark} />
          <Path d="M26 24L111 16L129 28L43 38Z" fill={woodLight} />
          <Path d="M43 38L129 28V102L43 115Z" fill={wood} />
          {[0, 1, 2].map(n => (
            <G key={n}>
              <Path d={`M50 ${46 + n * 22}L121 ${36 + n * 22}V${53 + n * 22}L50 ${64 + n * 22}Z`} fill="#8E5B37" />
              {[0, 1, 2, 3].map(i => (
                <G key={i}>
                  <Path d={`M${54 + i * 16} ${60 + n * 22 - i * 2}v-${14 + ((i + n) % 2) * 3}h10v${13 + ((i + n) % 2) * 3}`} fill={[color, pale, '#A98FD1', leaf, gold, coral][(i + n * 2) % 6]} />
                  <Path d={`M${56 + i * 16} ${52 + n * 22 - i * 2}h6`} stroke={shine} strokeWidth={1.2} opacity={0.7} />
                </G>
              ))}
            </G>
          ))}
        </>
      );
      break;
    case 'cake-stand':
      art = (
        <>
          <Ellipse cx={75} cy={112} rx={30} ry={7} fill={volume} />
          <Path d="M75 110V83" stroke={color} strokeWidth={9} />
          <Ellipse cx={75} cy={81} rx={49} ry={12} fill={light} />
          <Path d="M36 80Q75 89 114 80" stroke={shine} strokeWidth={2.4} fill="none" opacity={0.8} />
          {/* Fluffy sponge cake with dripping cream frosting */}
          <Path d="M41 77V54Q75 41 109 54V77Q75 91 41 77Z" fill="#F2C692" />
          <Path d="M43 69Q75 79 107 69" stroke="#FF8F7A" strokeWidth={3} fill="none" />
          <Ellipse cx={75} cy={53} rx={34} ry={10} fill={shine} />
          <Path d="M43 56Q49 77 57 60Q66 76 74 61Q86 77 94 60Q102 72 108 56" fill={shine} />
          {/* Colorful sprinkles */}
          <Path d="M55 52l4 1M68 49l4-1M84 50l4 2M95 54l3-2" stroke={coral} strokeWidth={2.2} />
          <Path d="M61 55l3-2M77 54l4 1M89 48l3 2" stroke="#4FA99F" strokeWidth={2.2} />
          {/* Glossy strawberry topper */}
          <Circle cx={75} cy={42} r={6.5} fill="#E65A48" />
          <Circle cx={73} cy={40} r={2} fill={shine} stroke="none" />
          <Path d="M72 36l3 2 3-2" stroke={leaf} strokeWidth={2} fill="none" />
        </>
      );
      break;
    case 'teapot':
      art = (
        <>
          <Path d="M103 66Q139 48 131 82Q126 100 106 94" fill="none" stroke={color} strokeWidth={9} />
          <Path d="M105 66Q134 53 128 80" fill="none" stroke={light} strokeWidth={2.5} />
          <Path d="M46 72L21 57L29 84L50 99" fill={volume} />
          <Path d="M47 59Q75 45 103 59L112 98Q78 125 43 100Z" fill={volume} />
          <Path d="M54 70Q52 86 60 99" stroke={shine} strokeWidth={4} opacity={0.55} fill="none" />
          <Ellipse cx={76} cy={59} rx={29} ry={8} fill={light} />
          <Circle cx={76} cy={47} r={6} fill={wood} />
          <Circle cx={74.5} cy={45.5} r={1.8} fill={woodLight} stroke="none" />
          <Path d="M56 82Q75 92 96 79" fill="none" stroke={pale} strokeWidth={4.5} />
          <Circle cx={76} cy={87} r={3} fill={gold} stroke="none" />
          {active && (
            <G fill="none" stroke={shine} strokeWidth={3.5} opacity={0.9}>
              <Path d="M64 33Q54 24 65 13M85 31Q96 22 86 10M75 28Q72 19 77 12" />
            </G>
          )}
        </>
      );
      break;
    case 'potted-fern': case 'cactus': case 'flower-vase': case 'banana-plant':
      art = (
        <>
          <Path d="M75 91V28" stroke={leafDark} strokeWidth={5} />
          {id === 'cactus' ? (
            <>
              <Path d="M65 89V34Q75 17 85 34V65Q98 69 98 49Q108 39 113 51V71Q111 85 85 82V96M65 65Q43 69 43 48Q32 38 29 52V73Q35 88 65 82" fill={leaf} />
              <Path d="M75 30V84M40 50V72M105 51V72" stroke={leafLight} strokeWidth={2.4} opacity={0.75} />
              {/* Cute island coral cactus bloom */}
              <Circle cx={75} cy={23} r={5.5} fill={coral} />
              <Circle cx={75} cy={23} r={2.2} fill={goldGlow} stroke="none" />
            </>
          ) : id === 'flower-vase' ? (
            [48, 76, 102].map((x, i) => (
              <G key={x}>
                <Path d={`M75 94L${x} ${40 + (i % 2) * 15}`} stroke={leaf} strokeWidth={3} />
                {[0, 1, 2, 3, 4].map(n => (
                  <Ellipse key={n} cx={x} cy={29 + (i % 2) * 15} rx={7.5} ry={11} transform={`rotate(${n * 72} ${x} ${40 + (i % 2) * 15})`} fill={i === 1 ? '#FFB5A3' : light} />
                ))}
                <Circle cx={x} cy={40 + (i % 2) * 15} r={6} fill={gold} />
                <Circle cx={x - 1.5} cy={38.5 + (i % 2) * 15} r={1.8} fill={shine} stroke="none" />
              </G>
            ))
          ) : id === 'banana-plant' ? (
            <>
              <Path d="M75 89Q62 53 75 21M75 69Q99 43 113 34" fill="none" stroke={leafDark} strokeWidth={5} />
              <Path d="M75 34Q38 37 30 8Q61 2 75 34Z" fill={leaf} />
              <Path d="M77 49Q87 4 120 18Q124 45 77 49Z" fill={leafLight} />
              <Path d="M69 62Q31 75 20 46Q48 34 69 62Z" fill={leafLight} />
              <Path d="M86 73Q106 41 133 60Q123 84 86 73Z" fill={leaf} />
              <Path d="M74 34L44 16M80 46L111 24M65 61L34 51M88 73L119 62" stroke={leafDark} strokeWidth={1.6} />
            </>
          ) : (
            [0, 1, 2].map(n => (
              <G key={n} transform={`translate(0 ${n * 20})`}>
                <Path d="M75 37Q34 45 29 15Q64 5 75 37Z" fill={n === 0 ? leafLight : leaf} />
                <Path d="M75 37Q84 2 121 17Q114 44 75 37Z" fill={n === 1 ? leafLight : leaf} />
                <Path d="M75 37L43 22M75 37L108 22" stroke={leafDark} strokeWidth={1.5} />
              </G>
            ))
          )}
          <Path d="M49 87H102L96 113Q75 125 56 113Z" fill={volume} />
          <Path d="M49 87H102V96H51Z" fill={light} />
          <Path d="M55 91H96" stroke={shine} strokeWidth={2.2} opacity={0.75} />
        </>
      );
      break;
    case 'shell-pile':
      art = (
        <>
          {[0, 1, 2].map(n => (
            <G key={n} transform={`translate(${n * 33 - 30} ${(n % 2) * 13})`}>
              <Path d="M60 106Q32 87 43 72Q50 65 56 72Q62 55 70 69Q83 57 88 73Q105 69 105 84Q105 98 78 109Z" fill={n === 1 ? pale : n === 2 ? light : color} />
              <Path d="M69 103L50 78M71 103L66 75M75 103L83 76M78 104L97 84" stroke={dark} fill="none" strokeWidth={1.5} opacity={0.7} />
              <Ellipse cx={64} cy={76} rx={7} ry={3.5} fill={shine} stroke="none" opacity={0.65} />
            </G>
          ))}
        </>
      );
      break;
    case 'lantern':
      art = (
        <G>
          {active && (
            <G stroke="none">
              <Ellipse cx={75} cy={118} rx={52} ry={8} fill={gold} opacity={0.2} />
              <Circle cx={75} cy={65} r={54} fill={goldGlow} opacity={0.26} />
              <Circle cx={75} cy={65} r={34} fill="#FFF2C2" opacity={0.42} />
            </G>
          )}
          <Ellipse cx={75} cy={115} rx={28} ry={6} fill={wood} />
          <Path d="M75 110V98" stroke={woodDark} strokeWidth={7} />
          <Path d="M57 30Q57 5 75 7Q96 6 95 30" fill="none" stroke={wood} strokeWidth={5.5} />
          <Rect x={49} y={33} width={54} height={65} rx={11} fill={active ? '#FFEDA8' : pale} />
          <Path d="M47 33H105M47 99H105M60 36V96M91 36V96" stroke={color} strokeWidth={5} />
          <Path d="M56 44V82" stroke={shine} strokeWidth={2.5} opacity={0.7} />
          <Path d="M75 87Q61 78 75 56Q89 76 75 87Z" fill={active ? '#FF8B47' : gold} />
          {active && <Path d="M75 84Q68 78 75 65Q82 77 75 84Z" fill={shine} stroke="none" />}
        </G>
      );
      break;
    case 'string-lights':
      art = (
        <>
          <Path d="M9 32Q75 95 142 24" fill="none" stroke={woodDark} strokeWidth={3.2} />
          {[0, 1, 2, 3, 4, 5].map(n => (
            <G key={n} transform={`translate(${18 + n * 23} ${43 + Math.sin((n / 5) * Math.PI) * 22 - n * 2})`}>
              {active && (
                <G stroke="none">
                  <Circle r={17} cy={13} fill={goldGlow} opacity={0.35} />
                  <Circle r={10} cy={13} fill="#FFF5C8" opacity={0.6} />
                </G>
              )}
              <Path d="M0 0v8" strokeWidth={2.2} />
              <Ellipse cy={14} rx={7} ry={10} fill={active ? (n % 2 === 0 ? '#FFF2B2' : '#FFD38A') : n % 2 ? light : color} />
              <Circle cx={-2} cy={11} r={2} fill={shine} stroke="none" opacity={0.85} />
            </G>
          ))}
        </>
      );
      break;
    case 'dollhouse':
      art = (
        <>
          <Path d="M24 54L75 14L130 49V113L24 120Z" fill={wood} />
          <Path d="M17 55L75 9L137 47L129 55L75 23L25 63Z" fill={volume} />
          <Path d="M32 48L75 15L122 44" stroke={light} strokeWidth={2.5} fill="none" />
          <Path d="M36 63L116 56V105L36 112Z" fill={pale} />
          {/* Cozy room wallpaper accents inside */}
          <Path d="M36 63L76 59V83L36 86Z" fill="#FFE7DC" stroke="none" />
          <Path d="M76 59L116 56V79L76 83Z" fill="#DDF2EE" stroke="none" />
          <Path d="M76 36V107M36 86L116 79" stroke={wood} strokeWidth={5.5} />
          {/* Attic round window */}
          <Circle cx={75} cy={41} r={7.5} fill="#AEE0D8" />
          <Path d="M75 34V48M68 41H82" stroke={pale} strokeWidth={1.6} />
          {/* Miniature window & door */}
          <Rect x={46} y={66} width={16} height={14} rx={3} fill="#AEE0D8" />
          <Path d="M54 66V80M46 73H62" stroke={shine} strokeWidth={1.4} />
          <Path d="M88 105V89Q97 82 106 87V103" fill={volume} />
          <Circle cx={102} cy={96} r={1.8} fill={gold} stroke="none" />
        </>
      );
      break;
    case 'easel':
      art = (
        <>
          <Path d="M75 17L29 119M75 17L125 116M75 17L83 119" stroke={woodDark} strokeWidth={7} />
          <Path d="M75 17L29 119M75 17L125 116M75 17L83 119" stroke={wood} strokeWidth={4} />
          <Path d="M34 30L113 25V88L34 94Z" fill={shine} />
          {/* Sunlit Guam lagoon mini painting */}
          <Path d="M38 34L109 29V83L38 89Z" fill="#CBEFE9" stroke="none" />
          <Circle cx={92} cy={45} r={9.5} fill={gold} />
          <Path d="M39 81L62 54L81 72L96 59L108 81Z" fill={volume} />
          <Path d="M39 81Q74 75 108 81V84L39 88Z" fill="#4FA99F" stroke="none" />
          <Path d="M28 97L122 89" stroke={wood} strokeWidth={8} />
          <Circle cx={44} cy={92} r={3} fill={coral} stroke="none" />
          <Circle cx={54} cy={91} r={3} fill={gold} stroke="none" />
          <Circle cx={64} cy={90} r={3} fill="#4FA99F" stroke="none" />
        </>
      );
      break;
    case 'guitar':
      art = (
        <G transform="rotate(23 75 70)">
          <Path d="M69 62V17H81V62" fill={wood} />
          <Path d="M70 28H80M70 38H80M70 48H80" stroke={woodLight} strokeWidth={1.3} />
          <Rect x={65} y={7} width={20} height={21} rx={5.5} fill={volume} />
          <Path d="M63 57Q43 52 44 71Q51 83 39 94Q29 121 74 123Q119 121 109 94Q96 83 104 71Q107 52 86 57Z" fill={volume} />
          <Path d="M47 96Q44 109 56 115" stroke={shine} strokeWidth={3.5} opacity={0.5} fill="none" />
          <Circle cx={75} cy={84} r={14} fill={dark} />
          <Circle cx={75} cy={84} r={16.5} fill="none" stroke={goldGlow} strokeWidth={1.6} />
          <Path d="M70 21V109M75 21V109M80 21V109" stroke={pale} strokeWidth={1.1} />
          <Path d="M62 111H88" stroke={woodDark} strokeWidth={5.5} />
          {active && (
            <G fill="none" stroke={gold} strokeWidth={3}>
              <Path d="M112 62Q128 73 116 89M124 53Q145 76 128 99" />
            </G>
          )}
        </G>
      );
      break;
    case 'kite':
      art = (
        <>
          <Path d="M75 15L116 56L77 94L36 55Z" fill={volume} />
          <Path d="M75 15L116 56L76 56Z" fill={light} stroke="none" opacity={0.75} />
          <Path d="M75 15L77 94M36 55L116 56" stroke={pale} strokeWidth={3} />
          <Path d="M77 94Q113 104 83 121" fill="none" stroke={woodDark} strokeWidth={2.2} />
          <Path d="M90 101L81 96V107ZM97 112L106 106V117Z" fill={gold} />
        </>
      );
      break;
    case 'round-rug': case 'striped-rug': case 'star-rug':
      art = (
        <G transform="translate(0 44) scale(1 .58)">
          {id === 'star-rug' ? <Path d={star} fill={volume} /> : <Ellipse cx={75} cy={75} rx={67} ry={40} fill={volume} />}
          <Ellipse cx={75} cy={76} rx={id === 'star-rug' ? 19 : 55} ry={id === 'star-rug' ? 13 : 29} fill="none" stroke={light} strokeWidth={4.5} />
          <Ellipse cx={75} cy={76} rx={id === 'star-rug' ? 10 : 41} ry={id === 'star-rug' ? 7 : 19} fill="none" stroke={pale} strokeWidth={2} opacity={0.7} />
          {id === 'striped-rug' && [0, 1, 2, 3, 4].map(n => <Path key={n} d={`M${38 + n * 18} 47v57`} stroke={light} strokeWidth={6} />)}
        </G>
      );
      break;
    case 'sea-picture': case 'world-map': case 'mirror':
      art = (
        <>
          <Rect x={21} y={25} width={110} height={80} rx={id === 'mirror' ? 28 : 8} fill={id === 'mirror' ? color : wood} />
          <Rect x={28} y={32} width={96} height={66} rx={id === 'mirror' ? 22 : 4} fill={id === 'mirror' ? '#C2E8EC' : id === 'sea-picture' ? '#B9E8E4' : color} />
          {id === 'sea-picture' ? (
            <>
              <Circle cx={100} cy={49} r={10} fill={goldGlow} />
              <Path d="M40 48Q48 40 58 46Q64 42 70 48Z" fill={shine} stroke="none" opacity={0.9} />
              <Path d="M30 69Q52 58 76 71Q100 79 122 66V96H30Z" fill="#4FA99F" />
              <Path d="M30 87Q63 75 122 89" stroke={shine} fill="none" strokeWidth={3.8} opacity={0.85} />
            </>
          ) : id === 'world-map' ? (
            <>
              <Path d="M39 48L65 42L78 52L64 63L60 79L50 83L47 63ZM87 47L113 52L110 66L100 72L108 86L90 82L84 65Z" fill={leafLight} />
              <Path d="M33 65H119M76 37V94" fill="none" stroke={pale} opacity={0.55} />
              <Circle cx={112} cy={43} r={4} fill={goldGlow} strokeWidth={1.2} />
            </>
          ) : (
            <>
              <Path d="M44 79L91 42M59 87L106 50" stroke={shine} strokeWidth={7} opacity={0.8} />
              <Circle cx={104} cy={44} r={3} fill={shine} stroke="none" />
            </>
          )}
          <Path d="M30 29H119" stroke={id === 'mirror' ? light : woodLight} strokeWidth={2.5} />
        </>
      );
      break;
    case 'clock':
      art = (
        <>
          <Circle cx={75} cy={65} r={44} fill={volume} />
          <Circle cx={75} cy={65} r={35} fill={pale} />
          <Path d="M51 47Q62 35 80 35" stroke={shine} strokeWidth={3} opacity={0.85} fill="none" />
          {[0, 1, 2, 3].map(n => <Path key={n} d="M75 34v6" transform={`rotate(${n * 90} 75 65)`} strokeWidth={3} />)}
          {[1, 2, 4, 5, 7, 8, 10, 11].map(n => <Circle key={n} cx={75 + Math.sin((n * Math.PI) / 6) * 29} cy={65 - Math.cos((n * Math.PI) / 6) * 29} r={1.6} fill={woodDark} stroke="none" />)}
          <Path d={active ? 'M75 43V65L95 73' : 'M75 43V65L93 57'} fill="none" stroke={ink} strokeWidth={3.8} />
          <Circle cx={75} cy={65} r={4.5} fill={gold} />
        </>
      );
      break;
    default: return null;
  }

  const flip = mirrored !== (rotation === 180 || rotation === 270);
  const noFloorShadow = ['round-rug', 'striped-rug', 'star-rug', 'string-lights', 'kite', 'sea-picture', 'world-map', 'mirror', 'clock'].includes(id);
  return (
    <Svg width={size} height={size} viewBox="0 0 150 130" accessible={false}>
      <Defs>
        <LinearGradient id={volId} x1="0%" y1="0%" x2="15%" y2="100%">
          <Stop offset="0%" stopColor={light} />
          <Stop offset="46%" stopColor={color} />
          <Stop offset="100%" stopColor={dark} />
        </LinearGradient>
        <Filter id={mutedId}>
          <FeColorMatrix type="saturate" values="0" />
        </Filter>
      </Defs>
      <G filter={muted ? `url(#${mutedId})` : undefined}>
        {!noFloorShadow && <Ellipse cx={75} cy={120} rx={54} ry={6} fill={ink} opacity={0.13} />}
        <G transform={flip ? 'translate(150 0) scale(-1 1)' : undefined} stroke={ink} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
          <ItemMotion active={active} animated={animated} reduced={reduced}>
            {art}
            <ItemFinish id={id} color={color} />
          </ItemMotion>
          <ItemLife id={id} color={color} active={active} animated={animated} reduced={reduced} />
        </G>
      </G>
    </Svg>
  );
}

export function RoomShellArt({ room, theme, live }: { room: Exclude<RoomId, "home">; theme: HomeState["theme"]; live?: boolean }) {
  return <StageRoom room={room} theme={theme} live={live} />;
}
