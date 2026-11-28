import { paintedProp } from './illustrated';
import { PaintedProp } from './PropShape';
import { LivingArt, hasLivingArt } from './LivingArt';
import { SeatArt, hasSeatArt } from './SeatArt';
import type { ArtLayer, ItemVisualState } from '../world';
import React from "react";
import Svg, { Circle, Ellipse, G, Path, Rect, Defs, Filter, FeColorMatrix, LinearGradient, Stop, Text as SvgText } from "react-native-svg";
import { StickerArt } from "../../arcade/Art";
import type { StickerId } from "../../arcade/progress";
import type { ItemId } from "../catalog";
import { material, shade } from "./Tint";
import type { TintId } from "../catalogMore";
import { ItemFinish, ItemLife, ItemMotion } from "./Finish";

const ink = "#4A3328",
  deepInk = "#3D2B24",
  wood = "#C88E5B",
  woodLight = "#E5B582",
  woodDark = "#9E693D",
  pale = "#FFF7E6",
  shine = "#FFFDF7",
  gold = "#F5C249",
  goldGlow = "#FFE38A",
  palm = "#4E9F5A",
  palmLight = "#7AC778",
  palmDark = "#367643",
  defaultCoral = "#FF7A5C",
  defaultTeal = "#4FA99F";

const star = "M0-10L3-3L10-3L5 2L7 10L0 6L-7 10L-5 2L-10-3L-3-3Z";

export function ItemArt({
  item,
  active = false,
  size = 120,
  mirrored = false,
  rotation = 0,
  foreground = false,
  muted = false,
  tint = "original",
  animated = false,
  reduced = false,
  layer = "all",
  state,
  occupied = false,
}: {
  occupied?: boolean;
  layer?: ArtLayer;
  state?: ItemVisualState;
  item: ItemId;
  active?: boolean;
  size?: number;
  mirrored?: boolean;
  rotation?: number;
  foreground?: boolean;
  muted?: boolean;
  tint?: TintId;
  animated?: boolean;
  reduced?: boolean;
}) {
  const uid = React.useId().replace(/[^A-Za-z0-9_-]/g, "");
  if (hasLivingArt(item)) return layer === 'front' ? null : <LivingArt id={item} size={size} state={state ?? {on: active}} mirrored={mirrored} rotation={rotation} tint={tint} reduced={reduced}/>;
  if (hasSeatArt(item)) return <SeatArt occupied={occupied} id={item} size={size} layer={foreground ? "front" : layer} mirrored={mirrored} rotation={rotation} tint={tint} state={state ?? {on: active}} motion={art => <ItemMotion active={active} animated={animated} reduced={reduced}>{art}</ItemMotion>}/>;
  if (layer === 'front') return null;
  const painted = paintedProp(item);
  if (painted) return <PaintedProp id={painted} size={size} mirrored={mirrored} rotation={rotation} tint={tint} active={active}/>;

  const coral = item === "aquarium" ? defaultCoral : material(tint, defaultCoral);
  const teal = ["plant", "aquarium"].includes(item) ? defaultTeal : item === "surfboard" && tint !== "original" ? shade(material(tint, defaultTeal), 0.35) : material(tint, defaultTeal);
  const paint = (original: string) => material(tint, original);
  const highlight = (original: string) => tint === "original" ? original : shade(material(tint, original), 0.35);

  if (item.startsWith("sticker:")) return <StickerArt id={item.slice(8) as StickerId} size={size} />;
  if (foreground) return <Svg width={size} height={size} viewBox="0 0 150 130" accessible={false}><G transform={`translate(${mirrored !== (rotation === 180 || rotation === 270) ? 150 : 0} 0) scale(${mirrored !== (rotation === 180 || rotation === 270) ? -1 : 1} 1)`} stroke={ink} strokeWidth={2.4} strokeLinejoin="round"><Path d="M44 95L125 87V94L44 102Z" fill={coral}/></G></Svg>;

  const coralGrad = `item-coral-${item}-${tint}-${uid}`;
  const tealGrad = `item-teal-${item}-${tint}-${uid}`;
  const mutedFilter = `muted-${item}-${uid}`;

  const legs = (
    <G stroke={ink} strokeWidth={3} strokeLinecap="round">
      <Path d="M33 92L29 116M112 92L117 116" stroke={woodDark} strokeWidth={8} />
      <Path d="M38 95L35 115M108 96L111 115" stroke={wood} strokeWidth={6} />
      <Path d="M33 92L29 116M112 92L117 116" stroke={ink} strokeWidth={2} />
    </G>
  );

  const books = (
    <G strokeWidth={1.9}>
      {[0, 1, 2, 3, 4].map((n) => (
        <G key={n} transform={`translate(${34 + n * 16} 40) rotate(${n === 4 ? 8 : 0})`}>
          <Rect width={12} height={43 - (n % 2) * 8} rx={2.5} fill={[coral, teal, gold, "#A98FD1", "#68B5CC"][n]} />
          <Path d="M3 6H9M3 26H9" stroke={pale} strokeWidth={1.6} />
          <Path d="M2.5 3V32" stroke={shine} opacity={0.45} strokeWidth={1.4} />
        </G>
      ))}
    </G>
  );

  return (
    <Svg width={size} height={size} viewBox="0 0 150 130" accessible={false}>
      <Defs>
        <LinearGradient id={coralGrad} x1="0%" y1="0%" x2="15%" y2="100%">
          <Stop offset="0%" stopColor={shade(coral, 0.3)} />
          <Stop offset="45%" stopColor={coral} />
          <Stop offset="100%" stopColor={shade(coral, -0.18)} />
        </LinearGradient>
        <LinearGradient id={tealGrad} x1="0%" y1="0%" x2="15%" y2="100%">
          <Stop offset="0%" stopColor={shade(teal, 0.3)} />
          <Stop offset="45%" stopColor={teal} />
          <Stop offset="100%" stopColor={shade(teal, -0.18)} />
        </LinearGradient>
        {muted && <Filter id={mutedFilter}>
          <FeColorMatrix type="saturate" values="0" />
        </Filter>}
      </Defs>
      <G filter={muted ? `url(#${mutedFilter})` : undefined}>
        {!["rug", "mat", "chime"].includes(item) && <Ellipse cx={75} cy={119} rx={57} ry={7} fill={ink} opacity={0.13} />}
        <G
          transform={`translate(${mirrored ? 150 : 0} 0) scale(${mirrored ? -1 : 1} 1)`}
          stroke={ink}
          strokeWidth={2.1}
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <G transform={rotation === 180 || rotation === 270 ? "translate(150 0) scale(-1 1)" : undefined}>
            <ItemMotion active={active} animated={animated} reduced={reduced}>
              {item === "robot-buddy" ? (
                <>
                  <Path d="M51 107V118M99 107V118" stroke={woodDark} strokeWidth={8} />
                  <Path d="M51 107V118M99 107V118" stroke={ink} strokeWidth={2.5} />
                  <Rect x={41} y={39} width={68} height={68} rx={16} fill={`url(#${tealGrad})`} />
                  <Path d="M50 44H100" stroke={shade(teal, 0.48)} strokeWidth={3} opacity={0.8} />
                  <Rect x={48} y={53} width={54} height={38} rx={11} fill="#2F4A4D" />
                  <Path d="M54 58H96" stroke="#6FA3A4" strokeWidth={2} opacity={0.5} />
                  <Path d="M75 39V26" strokeWidth={3} />
                  {active && <Circle cx={75} cy={22} r={11} fill={goldGlow} opacity={0.55} stroke="none" />}
                  <Circle cx={75} cy={22} r={5.5} fill={gold} />
                  <Circle cx={73.5} cy={20.5} r={1.8} fill={shine} stroke="none" />
                  <Circle cx={61} cy={69} r={5.5} fill={pale} stroke="none" />
                  <Circle cx={89} cy={69} r={5.5} fill={pale} stroke="none" />
                  <Circle cx={60} cy={68} r={2} fill={deepInk} stroke="none" />
                  <Circle cx={88} cy={68} r={2} fill={deepInk} stroke="none" />
                  <Circle cx={54} cy={76} r={3} fill="#FF9A8B" opacity={0.75} stroke="none" />
                  <Circle cx={96} cy={76} r={3} fill="#FF9A8B" opacity={0.75} stroke="none" />
                  <Path d="M64 81Q75 90 86 81" fill="none" stroke={goldGlow} strokeWidth={3} />
                  <Circle cx={61} cy={99} r={2.5} fill={coral} stroke="none" />
                  <Circle cx={75} cy={99} r={2.5} fill={gold} stroke="none" />
                  <Circle cx={89} cy={99} r={2.5} fill={pale} stroke="none" />
                </>
              ) : item === "computer-desk" ? (
                <>
                  <Path d="M31 96V119M119 96V119" stroke={woodDark} strokeWidth={9} />
                  <Path d="M31 96V119M119 96V119" stroke={wood} strokeWidth={6} />
                  <Rect x={20} y={81} width={110} height={16} rx={3} fill={wood} />
                  <Path d="M23 84H127" stroke={woodLight} strokeWidth={3} />
                  <Path d="M23 94H127" stroke={woodDark} strokeWidth={2} opacity={0.5} />
                  <Path d="M75 76v9M59 86h32" stroke="#5A4A44" strokeWidth={5} />
                  <Rect x={42} y={23} width={66} height={53} rx={7} fill="#5C4940" />
                  <Rect x={47} y={28} width={56} height={39} rx={3.5} fill="#AEE0D8" />
                  <Path d="M51 32L63 32" stroke={shine} strokeWidth={2.5} opacity={0.75} />
                  <Path d="m62 42-8 6 8 6m27-12 8 6-8 6M73 54l6-15" fill="none" stroke="#2A6D67" strokeWidth={3} />
                  <Circle cx={75} cy={71.5} r={1.8} fill={goldGlow} stroke="none" />
                  {/* Tiny keyboard & warm mug */}
                  <Rect x={54} y={85} width={42} height={5} rx={2} fill={pale} strokeWidth={1.4} />
                  <Rect x={108} y={73} width={9} height={9} rx={2} fill={coral} strokeWidth={1.6} />
                </>
              ) : item === "bed" ? (
                <>
                  <Path d="M18 41L116 34L135 92L36 105Z" fill={wood} />
                  <Path d="M18 42V88L36 105V61Z" fill={woodDark} />
                  <Path d="M19 44Q15 20 27 19L108 14Q121 13 122 35L124 50" fill={woodLight} />
                  <Path d="M23 49L115 42L131 84L37 96Z" fill={pale} />
                  <Path d="M30 64L120 56L130 84L38 96Z" fill={`url(#${tealGrad})`} />
                  <Path d="M39 66L47 94M55 64L64 92M72 63L80 89M88 61L96 87" stroke={highlight("#A7DFD2")} />
                  <Path d="M30 48Q32 38 40 39L72 36Q83 38 83 50L39 55Z" fill={shine} />
                  <Path d="M37 104V117M128 92V107" stroke={woodDark} strokeWidth={7} />
                  <Circle cx={31} cy={29} r={3} fill={pale} />
                </>
              ) : item === "rug" || item === "mat" ? (
                <>
                  <Ellipse cx={75} cy={91} rx={67} ry={26} fill={item === "rug" ? teal : paint("#D9B273")} />
                  <Ellipse
                    cx={75}
                    cy={91}
                    rx={58}
                    ry={20}
                    fill="none"
                    stroke={item === "rug" ? "#DFF3EB" : highlight("#FFF0C9")}
                    strokeWidth={4}
                  />
                  <Ellipse
                    cx={75}
                    cy={91}
                    rx={45}
                    ry={13}
                    fill="none"
                    stroke={item === "rug" ? shade(teal, -0.18) : "#B0824E"}
                    strokeWidth={1.6}
                    opacity={0.65}
                  />
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <Path
                      key={n}
                      d={`M${28 + n * 18} 76L${28 + n * 18} 106`}
                      stroke={item === "rug" ? "#B2E0D5" : "#B0824E"}
                      strokeWidth={2}
                      opacity={0.75}
                    />
                  ))}
                  <Path d="M15 83L5 81M14 93L3 94M18 103L8 107M135 83L145 81M136 93L147 94M132 103L142 107" stroke={pale} strokeWidth={2.5} />
                  <Path d="M15 83L5 81M14 93L3 94M18 103L8 107M135 83L145 81M136 93L147 94M132 103L142 107" stroke={ink} strokeWidth={1.2} />
                </>
              ) : item === "table" || item === "checkers" ? (
                <>
                  {legs}
                  <Ellipse cx={75} cy={79} rx={62} ry={23} fill={wood} />
                  <Ellipse cx={75} cy={74} rx={62} ry={23} fill={pale} />
                  <Path d="M27 68Q75 52 123 68" stroke={shine} strokeWidth={3} fill="none" opacity={0.85} />
                  {item === "checkers" ? (
                    <G transform="translate(39 58)">
                      {Array.from({ length: 24 }, (_, n) => (
                        <Rect
                          key={n}
                          x={(n % 6) * 12}
                          y={Math.floor(n / 6) * 8}
                          width={12}
                          height={8}
                          fill={(n + Math.floor(n / 6)) % 2 ? teal : pale}
                          strokeWidth={0.6}
                        />
                      ))}
                      {[0, 2, 4].map((n) => (
                        <G key={n}>
                          <Ellipse cx={n * 12 + 6} cy={5} rx={4.2} ry={2.2} fill={`url(#${coralGrad})`} />
                          <Ellipse cx={n * 12 + 5} cy={4.4} rx={1.6} ry={0.7} fill={shine} stroke="none" opacity={0.7} />
                        </G>
                      ))}
                      {[1, 3].map((n) => (
                        <Ellipse key={n} cx={n * 12 + 6} cy={27} rx={4.2} ry={2.2} fill={gold} />
                      ))}
                    </G>
                  ) : (
                    <>
                      <Ellipse cx={76} cy={73} rx={21} ry={8.5} fill={`url(#${coralGrad})`} />
                      <Ellipse cx={76} cy={70} rx={17} ry={6} fill={shade(coral, 0.35)} stroke="none" opacity={0.7} />
                      <Circle cx={71} cy={67} r={5.5} fill={gold} />
                      <Path d="M74 67Q81 56 89 64Q83 71 74 67Z" fill={palm} />
                    </>
                  )}
                </>
              ) : item === "chair" ? (
                <>
                  <Path d="M40 74V30Q41 17 54 17H97Q107 17 107 30V76" fill={`url(#${coralGrad})`} />
                  <Path d="M51 32V58M75 31V57M96 32V57" stroke={highlight("#FFC8B8")} strokeWidth={5} />
                  <Path d="M32 83L112 78L125 91L44 99Z" fill={paint("#FFA68F")} />
                  <Path d="M44 100V139M118 93V133M36 84V123" stroke={wood} strokeWidth={7} />
                </>
              ) : item === "shelf" || item === "books" || item === "trophies" ? (
                <>
                  <Rect x={22} y={24} width={106} height={87} rx={8} fill={wood} />
                  <Path d="M27 27H123" stroke={woodLight} strokeWidth={3} />
                  <Rect x={29} y={31} width={92} height={68} rx={4} fill={woodDark} />
                  <Path d="M29 66H121M25 106H125" stroke={woodLight} strokeWidth={7} />
                  <Path d="M29 66H121" stroke={ink} strokeWidth={1.6} />
                  {item === "books" ? (
                    <G transform="translate(0 -5) scale(1 .8)">{books}</G>
                  ) : item === "trophies" ? (
                    <G fill={gold}>
                      <Path d="M58 34H92L86 52L75 57L64 52Z" />
                      <Path d="M64 38H86" stroke={goldGlow} strokeWidth={3} />
                      <Path
                        d="M58 36Q39 33 53 48L64 49M92 36Q111 33 97 48L86 49M75 57V65M63 65H87"
                        fill="none"
                        stroke={gold}
                        strokeWidth={4}
                      />
                      <Path d="M63 65H87" stroke={woodDark} strokeWidth={2.5} />
                      <Circle cx={75} cy={45} r={3.5} fill={shine} stroke="none" opacity={0.8} />
                    </G>
                  ) : (
                    <>
                      <Circle cx={47} cy={49} r={11} fill={`url(#${tealGrad})`} />
                      <Circle cx={43} cy={45} r={3} fill={shine} stroke="none" opacity={0.7} />
                      <Path d={star} transform="translate(94 48)" fill={gold} />
                      <Circle cx={92} cy={45} r={2} fill={shine} stroke="none" opacity={0.85} />
                    </>
                  )}
                  <Rect x={38} y={78} width={29} height={20} rx={5} fill={`url(#${tealGrad})`} />
                  <Path d="M46 84H59" stroke={pale} strokeWidth={2.5} />
                  <Path d="M85 98V78H96V98M102 98V74H112V98" fill={`url(#${coralGrad})`} />
                  <Path d="M88 83H93M105 80H109" stroke={pale} strokeWidth={1.5} />
                </>
              ) : item === "plant" ? (
                <>
                  <Path d="M58 87Q70 66 74 28M76 86Q83 60 107 48" fill="none" stroke={palmDark} strokeWidth={5} />
                  {/* Lush layered island foliage */}
                  <Path d="M73 50Q38 51 34 26Q65 18 73 50Z" fill={palm} />
                  <Path d="M76 37Q72 8 100 12Q109 30 76 37Z" fill={palmLight} />
                  <Path d="M83 66Q88 35 121 41Q122 65 83 66Z" fill={palm} />
                  <Path d="M67 71Q35 75 29 53Q54 43 67 71Z" fill={palmLight} />
                  <Path d="M70 46Q52 40 42 30M79 33Q88 22 97 19M87 60Q101 51 114 48M63 66Q48 63 38 56" stroke={palmDark} strokeWidth={1.5} fill="none" />
                  {/* Glazed terracotta/coral pot */}
                  <Path d="M47 84H100L93 113Q75 124 55 113Z" fill={`url(#${coralGrad})`} />
                  <Path d="M46 84H101V93H48Z" fill={shade(coral, 0.25)} />
                  <Path d="M53 88H94" stroke={shine} strokeWidth={2.5} opacity={0.75} />
                  <Path d="M54 99Q56 108 61 113" stroke={shine} strokeWidth={2.5} opacity={0.45} fill="none" />
                </>
              ) : item === "lamp" || item === "island-lamp" ? (
                <>
                  {active && (
                    <G stroke="none">
                      <Ellipse cx={75} cy={117} rx={58} ry={9} fill={gold} opacity={0.22} />
                      <Ellipse cx={75} cy={116} rx={38} ry={5.5} fill={goldGlow} opacity={0.32} />
                      <Circle cx={75} cy={55} r={56} fill={goldGlow} opacity={0.24} />
                      <Circle cx={75} cy={55} r={38} fill="#FFF2C2" opacity={0.38} />
                    </G>
                  )}
                  <Ellipse cx={75} cy={114} rx={25} ry={7} fill={wood} />
                  <Path d="M58 112Q75 109 92 112" stroke={woodLight} strokeWidth={2.2} fill="none" />
                  <Path d="M75 107V55" stroke={woodDark} strokeWidth={9} />
                  <Path d="M75 107V55" stroke={wood} strokeWidth={6} />
                  <Path d="M50 18H99L118 64Q75 81 32 64Z" fill={active ? "#FFEBAA" : paint("#E8BE6E")} />
                  {item === "island-lamp" ? (
                    [0, 1, 2, 3, 4].map((n) => (
                      <Path
                        key={n}
                        d={`M${52 + n * 11} 23L${39 + n * 18} 61M41 ${35 + n * 9}H109`}
                        stroke={active ? "#C9924A" : "#A57740"}
                        strokeWidth={1.6}
                      />
                    ))
                  ) : (
                    <Path d="M47 56Q76 67 104 56" stroke={pale} strokeWidth={5} />
                  )}
                  <Path d="M55 23H94" stroke={shine} strokeWidth={2.5} opacity={0.7} />
                  <Path d="M100 70V84" strokeWidth={2} />
                  <Circle cx={100} cy={87} r={3.5} fill={`url(#${coralGrad})`} />
                </>
              ) : item === "toy-box" ? (
                <>
                  <Path d="M24 66L121 61V109Q72 127 24 110Z" fill={`url(#${coralGrad})`} />
                  <Path d={active ? "M24 64L36 28L128 26L121 61Z" : "M24 66L33 52L128 49L121 61Z"} fill={woodLight} />
                  {active && (
                    <>
                      <Path d="M28 68Q73 51 118 64L114 80Q72 90 29 79Z" fill="#6F4C3B" />
                      {/* Peeking wooden block & toy ball when open */}
                      <Circle cx={55} cy={66} r={9} fill={gold} />
                      <Rect x={79} y={57} width={16} height={15} rx={3} fill={teal} />
                    </>
                  )}
                  <Path d={star} transform="translate(74 92)" fill={goldGlow} />
                  <Path d="M33 106Q73 119 111 107" fill="none" stroke={tint === "original" ? shade(defaultCoral, -0.22) : shade(material(tint, defaultCoral), -0.2)} strokeWidth={2.5} />
                  <Path d="M31 73H114" stroke={shade(coral, 0.38)} strokeWidth={2.4} opacity={0.75} />
                </>
              ) : item === "blocks" ? (
                <>
                  {[
                    [29, 81, coral, "1"],
                    [74, 81, teal, "2"],
                    [52, 41, gold, "3"],
                  ].map(([x, y, color, label]) => (
                    <G key={String(label)}>
                      <Rect x={Number(x)} y={Number(y)} width={42} height={38} rx={6} fill={String(color)} />
                      <Rect x={Number(x) + 3} y={Number(y) + 3} width={36} height={32} rx={4} fill="none" stroke={shade(String(color), 0.35)} strokeWidth={1.8} />
                      <Path d={`M${Number(x) + 7} ${Number(y) + 5}H${Number(x) + 35}`} stroke={shine} strokeWidth={2.2} opacity={0.75} />
                      <SvgText
                        x={Number(x) + 21}
                        y={Number(y) + 28}
                        fontSize={26}
                        fontWeight="bold"
                        textAnchor="middle"
                        stroke="none"
                        fill={pale}
                      >
                        {label}
                      </SvgText>
                    </G>
                  ))}
                </>
              ) : item === "abacus" ? (
                <>
                  <Path d="M23 114V28Q23 20 32 20H118Q126 20 126 28V114" stroke={woodDark} strokeWidth={10} fill="none" />
                  <Path d="M23 114V28Q23 20 32 20H118Q126 20 126 28V114" stroke={wood} strokeWidth={7} fill="none" />
                  <Path d="M32 19H118" stroke={woodLight} strokeWidth={2.2} />
                  {[0, 1, 2].map((r) => (
                    <G key={r}>
                      <Path d={`M30 ${43 + r * 25}H120`} stroke={ink} strokeWidth={3} />
                      {[0, 1, 2, 3].map((n) => (
                        <G key={n}>
                          <Rect
                            x={36 + n * 19}
                            y={34 + r * 25}
                            width={12}
                            height={18}
                            rx={6}
                            fill={[coral, teal, gold][r]}
                          />
                          <Circle cx={40 + n * 19} cy={39 + r * 25} r={1.8} fill={shine} stroke="none" opacity={0.85} />
                        </G>
                      ))}
                    </G>
                  ))}
                  <Path d="M15 117H43M108 117H137" stroke={woodDark} strokeWidth={6} />
                </>
              ) : item === "beanbag" ? (
                <>
                  <Path d="M21 101Q9 76 37 64Q47 21 87 35Q116 40 126 80Q146 111 114 118H48Q27 118 21 101Z" fill={paint("#A98FD1")} />
                  <Path
                    d="M35 80Q54 64 83 72Q109 79 114 100M43 104Q69 116 98 105"
                    fill="none"
                    stroke={highlight("#D7CBEB")}
                    strokeWidth={5}
                  />
                  <Path d="M47 81L74 75L98 86L72 94Z" fill={pale} />
                  <Path d="M72 94V82" />
                </>
              ) : item === "aquarium" ? (
                <>
                  <Path d="M34 106V119M116 106V119" stroke={woodDark} strokeWidth={8} />
                  <Path d="M34 106V118M116 106V118" stroke={wood} strokeWidth={5} />
                  <Rect x={20} y={27} width={112} height={79} rx={13} fill="#9EE0D9" />
                  <Path d="M25 44Q50 38 76 44Q103 50 127 44" fill="none" stroke={shine} strokeWidth={4} opacity={0.85} />
                  <Path d="M24 94Q75 84 128 94V102Q75 106 24 102Z" fill="#F0D79E" />
                  <Path d="M39 94Q28 75 40 62Q52 76 42 89M111 92Q121 75 108 65" fill={palm} />
                  <Path d="M97 93Q93 84 99 80Q103 85 100 92" fill={coral} strokeWidth={1.5} />
                  <G transform={active ? "translate(23 -6)" : undefined}>
                    <Path d="M76 67L93 59V79Z" fill={`url(#${coralGrad})`} />
                    <Ellipse cx={67} cy={70} rx={17} ry={11} fill={gold} />
                    <Path d="M67 60Q71 70 67 80" stroke={shine} strokeWidth={3} fill="none" opacity={0.85} />
                    <Circle cx={59} cy={68} r={2.3} fill={deepInk} stroke="none" />
                    <Circle cx={58.3} cy={67.3} r={0.8} fill={shine} stroke="none" />
                  </G>
                  <Circle cx={101} cy={54} r={4.2} fill={shine} opacity={0.7} stroke="#63B8B2" strokeWidth={1.2} />
                  <Circle cx={109} cy={41} r={2.4} fill={shine} stroke="none" />
                  <Path d="M29 25H124" stroke={wood} strokeWidth={8} />
                  <Path d="M32 23H121" stroke={woodLight} strokeWidth={2.5} />
                </>
              ) : item === "telescope" ? (
                <>
                  <Path d="M73 67V86L43 118M73 86L105 118M73 86L72 121" fill="none" stroke={woodDark} strokeWidth={6.5} />
                  <Path d="M73 67V86L43 118M73 86L105 118M73 86L72 121" fill="none" stroke={wood} strokeWidth={3.5} />
                  <G transform="rotate(-28 75 50)">
                    <Rect x={27} y={34} width={95} height={28} rx={7} fill={`url(#${tealGrad})`} />
                    <Rect x={19} y={30} width={19} height={36} rx={5.5} fill={gold} />
                    <Rect x={119} y={39} width={15} height={18} rx={3.5} fill={wood} />
                    <Path d="M48 40H95" stroke={shine} strokeWidth={4} opacity={0.7} />
                    <Path d="M25 36V60" stroke={goldGlow} strokeWidth={3} />
                  </G>
                </>
              ) : item === "globe" ? (
                <>
                  <Ellipse cx={75} cy={117} rx={28} ry={6} fill={wood} />
                  <Path d="M56 116Q75 113 94 116" stroke={woodLight} strokeWidth={2} fill="none" />
                  <Path d="M75 114V94M51 22Q23 61 60 91Q93 112 116 63" fill="none" stroke={woodDark} strokeWidth={8} />
                  <Path d="M75 114V94M51 22Q23 61 60 91Q93 112 116 63" fill="none" stroke={wood} strokeWidth={4.5} />
                  <Circle cx={77} cy={54} r={37} fill="#76C5D1" />
                  <Path
                    d="M50 29L69 26L77 44L66 54L48 48M90 54L110 50L110 67L99 78L92 71L82 72L78 61Z"
                    fill={palmLight}
                    strokeWidth={1.5}
                  />
                  <Ellipse cx={77} cy={54} rx={17} ry={36} fill="none" stroke={pale} opacity={0.45} strokeWidth={1.4} />
                  <Path d="M43 54H110" stroke={pale} opacity={0.45} strokeWidth={1.4} />
                  <Path d="M53 38Q62 27 76 26" stroke={shine} strokeWidth={3.5} opacity={0.7} fill="none" />
                </>
              ) : item === "arcade" ? (
                <>
                  <Path d="M40 15H107L115 75L125 110L35 119L28 80Z" fill={`url(#${tealGrad})`} />
                  <Path d="M43 20H104" stroke={gold} strokeWidth={6} />
                  <Path d="M42 32H101L105 72H36Z" fill="#3D2B24" />
                  <Path d="M49 40H93L96 64H44Z" fill="#9CE0D8" />
                  <Path d={star} transform={`translate(70 51) scale(${active ? 1.3 : 0.85})`} fill={gold} />
                  <Path d="M33 77H114L121 91L32 99Z" fill={`url(#${coralGrad})`} />
                  <Path d="M53 85V77" strokeWidth={4} />
                  <Circle cx={53} cy={74} r={5.5} fill={gold} />
                  <Circle cx={51.5} cy={72.5} r={1.8} fill={shine} stroke="none" />
                  <Ellipse cx={88} cy={85} rx={6.5} ry={3} fill={gold} />
                  <Ellipse cx={102} cy={83} rx={5.5} ry={2.6} fill={pale} />
                  <Path d="M53 105H96" stroke={pale} strokeWidth={4} />
                </>
              ) : item === "chime" ? (
                <>
                  <Path d="M75 10V31M43 43Q75 21 107 43M48 42V79M75 36V91M103 42V72" fill="none" stroke={wood} strokeWidth={2.8} />
                  {[0, 1, 2].map((n) => (
                    <G
                      key={n}
                      transform={`translate(${48 + n * 27} ${n === 1 ? 98 : n === 2 ? 79 : 86}) rotate(${active ? (n - 1) * 15 : 0})`}
                    >
                      <Path d="M-13-8Q-16-24 0-19Q16-24 13-8L4 6H-4Z" fill={[coral, pale, teal][n]} />
                      <Path d="M-7-13L-2 2M2 2L7-13" stroke={woodDark} strokeWidth={1.5} opacity={0.65} />
                      <Circle cx={-4} cy={-14} r={2} fill={shine} stroke="none" opacity={0.75} />
                    </G>
                  ))}
                </>
              ) : (
                <>
                  <Path d="M73 117Q41 92 48 53Q51 18 74 7Q99 22 102 56Q109 94 83 118Z" fill={`url(#${coralGrad})`} />
                  <Path d="M74 9L82 118" stroke={pale} strokeWidth={7} />
                  <Path d="M51 58L99 49M49 72L101 63" stroke={teal} strokeWidth={8} />
                  <Path d="M58 28Q53 45 55 62" stroke={shine} strokeWidth={3} opacity={0.65} fill="none" />
                  <Path d="M84 94L95 106L86 116Z" fill={`url(#${tealGrad})`} />
                </>
              )}
              <ItemFinish id={item} color={paint(defaultCoral)} />
            </ItemMotion>
            <ItemLife id={item} color={paint(defaultCoral)} active={active} animated={animated} reduced={reduced} />
          </G>
        </G>
      </G>
    </Svg>
  );
}
