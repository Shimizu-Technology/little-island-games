import React, { useId } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { ArcadeArt as IllustratedArcadeArt, hasArcadeArt } from "../art/illustrated";
import type { ArcadeId } from "./types";
import type { OutfitId, StickerId } from "./progress";

export const shellColors = ["#F08E97", "#6DBEE7", "#F4C365", "#B19CE4", "#6BCEB0", "#E995C1"];
const shellLitColors = ["#FFB0B8", "#99D9F5", "#FFDA87", "#CCB9F7", "#93E7C8", "#F6B5DB"];
const star = "M0-12L3.5-4L12-3L6 3L7 12L0 8L-7 12L-6 3L-12-3L-3.5-4Z";
/** Plump rounded storybook 5-point star centered at (0, 0) in a ~28×28 box. */
const plumpStar =
  "M0-12.5 C1.5-12.5 2.7-7.2 4.1-5.8 C5.5-4.4 11.4-4.5 12-3.1 C12.6-1.7 7.8 1.5 7.4 3.4 C7 5.3 9.1 10.6 7.8 11.6 C6.5 12.6 1.9 9.2 0 9.2 C-1.9 9.2 -6.5 12.6 -7.8 11.6 C-9.1 10.6 -7 5.3 -7.4 3.4 C-7.8 1.5 -12.6-1.7 -12-3.1 C-11.4-4.5 -5.5-4.4 -4.1-5.8 C-2.7-7.2 -1.5-12.5 0-12.5 Z";

const medallionSurfaces: Record<ArcadeId, string> = {
  "reef-builder": "#DDF2EC",
  "shell-song": "#EFE8FA",
  "rail-parade": "#EAF2D8",
  "crab-crossing": "#DCF1F2",
  "palm-patrol": "#ECF3D6",
  "beach-ball": "#DCF0F5",
  "fruit-bat-flight": "#EAE7F7",
  "lagoon-run": "#DDF2EC",
  "canoe-cargo": "#F9EBD2",
};

const outfitRing: Record<OutfitId, string> = {
  island: "#E8D8BE",
  sunhat: "#E8A938",
  explorer: "#24867E",
  starlight: "#936CC4",
};

function OutfitBadge({ outfit, size }: { outfit: Exclude<OutfitId, "island">; size: number }) {
  const badge = Math.max(24, Math.round(size * 0.34));
  const bg = outfit === "sunhat" ? "#FFF2C8" : outfit === "explorer" ? "#DAF4EF" : "#F0E6FA";
  return (
    <View
      testID={`outfit-badge-${outfit}`}
      pointerEvents="none"
      style={{
        position: "absolute",
        right: -Math.round(badge * 0.08),
        top: -Math.round(badge * 0.08),
        width: badge,
        height: badge,
        borderRadius: badge / 2,
        backgroundColor: bg,
        borderWidth: 2,
        borderColor: "#3D2B24",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 0 rgba(61, 43, 36, 0.22)",
      }}
    >
      <Svg width={Math.round(badge * 0.78)} height={Math.round(badge * 0.78)} viewBox="0 0 36 36" accessible={false}>
        {outfit === "sunhat" ? (
          <G>
            <Ellipse cx={18} cy={23} rx={15} ry={4.2} fill="#E5AE44" stroke="#3D2B24" strokeWidth={2} />
            <Path d="M9 22 Q9 10 18 10 Q27 10 27 22 Z" fill="#FFD977" stroke="#3D2B24" strokeWidth={2} />
            <Path d="M9.5 19.5 H26.5" stroke="#FF7A5C" strokeWidth={3.2} strokeLinecap="round" />
          </G>
        ) : outfit === "explorer" ? (
          <G>
            <Rect x={5} y={13} width={21} height={11} rx={5.5} fill="#8FE4DA" stroke="#3D2B24" strokeWidth={2.2} />
            <Path d="M15.5 14 V23" stroke="#3D2B24" strokeWidth={2} />
            <Path d="M9 17 L12 16" stroke="#FFFDF8" strokeWidth={2} strokeLinecap="round" />
            <Path d="M26 18 H30 V9 Q30 6 33 6" fill="none" stroke="#FF7A5C" strokeWidth={3} strokeLinecap="round" />
          </G>
        ) : (
          <G>
            <Path d={plumpStar} transform="translate(17 18) scale(.78)" fill="#FFCE45" stroke="#3D2B24" strokeWidth={2.4} strokeLinejoin="round" />
            <Circle cx={29} cy={9} r={2.4} fill="#FFCE45" stroke="#3D2B24" strokeWidth={1.3} />
          </G>
        )}
      </Svg>
    </View>
  );
}

function Hat({ outfit }: { outfit: OutfitId }) {
  if (outfit === "sunhat") return <G><Ellipse cx={72} cy={49} rx={39} ry={7} fill="#D4A046"/><Path d="M47 48Q47 20 71 24Q94 24 97 49Z" fill="#F1CF76"/><Path d="M47 43L96 43" stroke="#CF785D" strokeWidth={6}/></G>;
  if (outfit === "explorer") return <G><Rect x={33} y={67} width={54} height={23} rx={9} fill="#C9F2EC" stroke="#294D58" strokeWidth={5}/><Path d="M88 77H106V48Q106 40 114 40" fill="none" stroke="#E18F55" strokeWidth={7}/></G>;
  if (outfit === "starlight") return <G fill="#FFE49A" stroke="#996B30" strokeWidth={1}><Path d={star} transform="translate(55 35) scale(.8)"/><Path d={star} transform="translate(88 28) scale(.55)"/><Path d={star} transform="translate(108 45) scale(.4)"/></G>;
  return null;
}

export function ReefFish({ size = 120, outfit = "island" }: { size?: number; outfit?: OutfitId }) {
  return <Svg width={size} height={size} viewBox="0 0 160 160" accessible={false}>
    <Ellipse cx={78} cy={135} rx={50} ry={7} fill="#B5D8CE"/>
    <Path d="M106 81L147 54Q153 80 147 109Z" fill="#DA7C61" stroke="#8D6547" strokeWidth={3}/>
    <Path d="M66 64Q67 42 91 48L103 71M68 101Q75 124 96 112L99 96" fill="#D89843"/>
    <Ellipse cx={75} cy={85} rx={49} ry={32} fill="#F0C36A" stroke="#8D6547" strokeWidth={3}/>
    <Path d="M94 63Q77 84 94 108M109 69Q94 86 108 102" fill="none" stroke="#FFE2A0" strokeWidth={7}/>
    <Circle cx={48} cy={78} r={8} fill="#FFF9E8"/><Circle cx={47} cy={79} r={4} fill="#234846"/><Circle cx={46} cy={77} r={1.5} fill="white"/>
    <Path d="M29 93Q36 98 41 92" stroke="#8D5D37" fill="none" strokeWidth={2.5} strokeLinecap="round"/><Ellipse cx={49} cy={95} rx={7} ry={4} fill="#E6986B"/>
    <Hat outfit={outfit}/><Circle cx={20} cy={49} r={5} fill="none" stroke="#83BDB4" strokeWidth={2}/><Circle cx={33} cy={30} r={3} fill="none" stroke="#83BDB4" strokeWidth={2}/>
  </Svg>;
}

export function Shell({ size = 120, index = 0, glowing = false, outfit = "island" }: { size?: number; index?: number; glowing?: boolean; outfit?: OutfitId }) {
  const gradient = useId().replace(/:/g, "");
  return <Svg width={size} height={size} viewBox="0 0 160 160" accessible={false}>
    <Defs><LinearGradient id={gradient} x1="0" y1="0" x2=".2" y2="1"><Stop stopColor={glowing ? "#FFF9EF" : "#FFE9D1"}/><Stop offset=".35" stopColor={glowing ? shellLitColors[index % shellColors.length] : shellColors[index % shellColors.length]}/><Stop offset="1" stopColor={shellColors[index % shellColors.length]}/></LinearGradient></Defs>
    {glowing && <><Circle cx={80} cy={83} r={73} fill={shellColors[index % shellColors.length]} opacity={.25}/><Circle cx={80} cy={83} r={70} fill="none" stroke="#FFF5E1" strokeWidth={3} opacity={.7}/></>}
    <Ellipse cx={80} cy={140} rx={49} ry={7} fill="#C7BBD6"/>
    <Path d="M61 128L24 77Q13 47 38 39Q45 19 67 29Q80 12 95 29Q117 20 124 40Q150 48 137 78L99 128Z" fill={`url(#${gradient})`} stroke="#4C456E" strokeWidth={4}/>
    <Path d="M66 119L41 52M75 120L65 40M85 120L94 40M94 119L119 52" stroke={glowing ? "#FFF6EC" : "#F5D6C6"} strokeWidth={4} fill="none" strokeLinecap="round"/>
    <Path d="M32 62Q24 47 43 43M52 37L58 36" fill="none" stroke="#FFF8E5" strokeWidth={5} strokeLinecap="round" opacity={.7}/>
    <Rect x={57} y={119} width={46} height={13} rx={6} fill="#F6DDBE" stroke="#5C4E72" strokeWidth={2}/>
    <Ellipse cx={55} cy={104} rx={8} ry={4} fill="#E17F91" opacity={.65}/><Ellipse cx={103} cy={104} rx={8} ry={4} fill="#E17F91" opacity={.65}/>
    <Circle cx={65} cy={96} r={4} fill="#303B4B"/><Circle cx={94} cy={96} r={4} fill="#303B4B"/><Path d="M72 106Q80 114 88 106" fill="none" stroke="#303B4B" strokeWidth={3} strokeLinecap="round"/>
    {index % 6 === 0 ? <Circle cx={80} cy={65} r={7} fill="#FFF7E4"/> : index % 6 === 1 ? <Path d="M80 53L89 69H71Z" fill="#FFF7E4"/> : index % 6 === 2 ? <Rect x={73} y={58} width={14} height={14} rx={2} fill="#FFF7E4" transform="rotate(45 80 65)"/> : index % 6 === 3 ? <Rect x={73} y={58} width={14} height={14} rx={2} fill="#FFF7E4"/> : index % 6 === 4 ? <Path d={star} transform="translate(80 65) scale(.7)" fill="#FFF7E4"/> : <Path d="M84 55A10 10 0 1 0 88 71A9 9 0 0 1 84 55Z" fill="#FFF7E4"/>}
    <G transform={outfit === "sunhat" ? "translate(8 -17)" : outfit === "explorer" ? "translate(20 16)" : "translate(0 -7)"}><Hat outfit={outfit}/></G>
  </Svg>;
}

/**
 * Hand-painted Warm Island Storybook medallion for all nine Arcade games.
 * Replaces legacy flat SVG hero mascots across LevelMap, StartCard, ResultScreen, Pause, and OutfitCloset.
 */
export function ArcadeArt({ game, size = 120, outfit = "island", happy = false, dizzy = false }: { game?: ArcadeId; size?: number; outfit?: OutfitId; happy?: boolean; dizzy?: boolean }) {
  if (!game || !hasArcadeArt(game)) {
    return <ReefFish size={size} outfit={outfit} />;
  }
  const ring = outfitRing[outfit];
  const borderWidth = Math.max(2, Math.round(size * (outfit === "island" ? 0.025 : 0.036)));
  const artSize = Math.round(size * 0.84);
  return (
    <View
      testID={`arcade-medallion-${game}`}
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: medallionSurfaces[game],
        borderWidth,
        borderColor: ring,
        alignItems: "center",
        justifyContent: "center",
        boxShadow: happy
          ? "0 4px 0 rgba(61, 43, 36, 0.16), 0 0 0 4px rgba(255, 206, 69, 0.35)"
          : "0 4px 0 rgba(61, 43, 36, 0.14), 0 6px 14px rgba(61, 43, 36, 0.08)",
      }}
    >
      <View style={{ opacity: dizzy ? 0.88 : 1, transform: dizzy ? [{ rotate: "-6deg" }] : undefined }}>
        <IllustratedArcadeArt id={game} size={artSize} />
      </View>
      {happy && (
        <View pointerEvents="none" style={{ position: "absolute", left: -4, top: 2 }}>
          <Svg width={Math.max(18, Math.round(size * 0.22))} height={Math.max(18, Math.round(size * 0.22))} viewBox="0 0 28 28" accessible={false}>
            <Path d={plumpStar} transform="translate(14 14) scale(.75)" fill="#FFCE45" stroke="#3D2B24" strokeWidth={2.2} strokeLinejoin="round" />
          </Svg>
        </View>
      )}
      {outfit !== "island" && <OutfitBadge outfit={outfit} size={size} />}
    </View>
  );
}

export function ArcadeIsland({ size = 100 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 160 160" accessible={false}><Defs><LinearGradient id="sea" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#BADFD7"/><Stop offset="1" stopColor="#85B8C9"/></LinearGradient></Defs><Ellipse cx={80} cy={107} rx={72} ry={35} fill="url(#sea)" stroke="#397F8E" strokeWidth={2}/><Path d="M14 111Q40 142 81 138Q120 140 145 110" fill="none" stroke="#E3F6DB" strokeWidth={3}/><Path d="M22 100Q31 62 77 70Q111 57 137 101Q92 134 22 100" fill="#F0D8A4"/><Path d="M74 83Q65 58 72 36" stroke="#A46E42" strokeWidth={9} fill="none"/><Path d="M72 37Q45 18 31 42Q54 36 72 37M72 37Q92 12 116 36Q94 30 72 37M72 37Q48 40 43 62Q66 51 72 37M72 37Q94 36 104 59Q81 48 72 37" fill="#4D8C68"/><G transform="translate(25 82) scale(.32)"><Path d="M106 81L147 54V109Z" fill="#DA7C61"/><Ellipse cx={75} cy={85} rx={49} ry={32} fill="#F0C36A"/><Circle cx={47} cy={79} r={6} fill="#234846"/></G><Path d="M101 109Q82 80 99 78Q105 64 113 79Q133 80 118 109Z" fill="#987EA7" stroke="#625778" strokeWidth={2}/><Path d="M109 104V81M104 104L99 85M114 104L121 85" stroke="#E9C4BE" strokeWidth={2}/><G transform="translate(81 103) rotate(-8)"><Path d="M0 9Q0 0 9 0H30Q39 0 39 9V28Q38 33 31 33H8Q1 33 0 28Z" fill="#A86A42" stroke="#604B4D" strokeWidth={2}/><Path d="M0 13H39M8 1V32M31 1V32" stroke="#F3CF7E" strokeWidth={4}/><Rect x={16} y={11} width={8} height={10} rx={2} fill="#FFDE87" stroke="#8B6043" strokeWidth={1.5}/></G><Path d={star} transform="translate(131 48) scale(.55)" fill="#FFD675" stroke="#967046" strokeWidth={2}/><Path d={star} transform="translate(22 67) scale(.38)" fill="#FFD675" stroke="#967046" strokeWidth={2}/><Circle cx={21} cy={130} r={3} fill="#F0C36A"/><Path d={star} transform="translate(133 131) scale(.5)" fill="#F0C36A"/></Svg>;
}

export function StarDisplay({ stars, size = 30 }: { stars: number; size?: number }) {
  const uid = useId().replace(/:/g, "");
  return (
    <Svg width={size * 3 + 12} height={size + 6} viewBox="0 0 108 36" accessibilityLabel={`${stars} of 3 stars`} accessible>
      <Defs>
        <LinearGradient id={`star-gold-${uid}`} x1="0" y1="0" x2="0.2" y2="1">
          <Stop offset="0" stopColor="#FFE066" />
          <Stop offset="0.48" stopColor="#FFCE45" />
          <Stop offset="1" stopColor="#F5B425" />
        </LinearGradient>
      </Defs>
      {[0, 1, 2].map(i => {
        const earned = i < stars;
        return (
          <G key={i} transform={`translate(${18 + i * 36} 18)`}>
            <Path
              d={plumpStar}
              fill={earned ? `url(#star-gold-${uid})` : "#E8DCC8"}
              stroke={earned ? "#3D2B24" : "#BFA98A"}
              strokeWidth={earned ? 2.2 : 1.8}
              strokeLinejoin="round"
            />
            {earned && (
              <Path
                d="M-1.5-8.5 C-3-5.2 -4.8-3.6 -8-2.6"
                stroke="#FFFBE6"
                strokeWidth={2.2}
                strokeLinecap="round"
                fill="none"
                opacity={0.9}
              />
            )}
          </G>
        );
      })}
    </Svg>
  );
}

export const stickerNames: Record<StickerId, string> = { "reef-fish": "Pip's first reef", "singing-shell": "Mina's melody", "little-crab": "Sideways friend", "sea-turtle": "Lagoon traveler", "moon-canoe": "Moon canoe", "sun-coral": "Sun coral", "rainbow-fish": "Rainbow swimmer", "star-shell": "Starry shell", coconut: "Coconut shade", "flying-fox": "Night gardener", "lagoon-ray": "Gentle glider", "island-flower": "Island blossom", "tiny-rail": "Little rail", "hermit-home": "A shell to call home", "sea-star": "Five bright arms", "jelly-light": "Jelly glow" };

export function StickerArt({ id, size = 90 }: { id: StickerId; size?: number }) {
  if (["reef-fish", "rainbow-fish"].includes(id)) return <ReefFish size={size} outfit={id === "rainbow-fish" ? "starlight" : "island"}/>;
  if (["singing-shell", "star-shell", "hermit-home"].includes(id)) return <Shell size={size} index={id === "star-shell" ? 3 : 0} outfit={id === "star-shell" ? "starlight" : "island"}/>;
  return <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
    <Circle cx={50} cy={50} r={44} fill="#FFF7DF" stroke="#EAD6A5" strokeWidth={2}/>
    {id === "little-crab" ? <G fill="#DE8667" stroke="#A55B48" strokeWidth={2}><Ellipse cx={50} cy={57} rx={23} ry={16}/><Path d="M29 52L16 37L13 49L24 56M71 52L84 37L87 49L76 56M29 62L17 68M32 68L22 77M71 62L83 68M68 68L78 77" fill="none" strokeWidth={4}/><Circle cx={41} cy={38} r={4}/><Circle cx={59} cy={38} r={4}/></G> : id === "sea-turtle" ? <G fill="#79A789" stroke="#416D5A" strokeWidth={2}><Ellipse cx={50} cy={54} rx={22} ry={25}/><Ellipse cx={50} cy={23} rx={9} ry={10}/><Path d="M31 43Q10 34 17 57L31 55M69 43Q90 34 83 57L69 55M33 69L22 81L39 76M67 69L78 81L61 76"/><Path d="M50 35L63 46L59 66L42 69L35 50Z" fill="#B3CB8E"/></G> : id === "moon-canoe" ? <G><Path d="M19 59Q50 78 82 59L70 76H31Z" fill="#A37750"/><Path d="M46 57V23L70 56Z" fill="#D9A960"/><Path d="M26 19Q18 37 39 34Q26 46 18 35Q10 25 26 19" fill="#E6BD62"/></G> : id === "coconut" ? <G><Path d="M47 80Q63 56 52 29" stroke="#A3754B" strokeWidth={8} fill="none"/><Path d="M52 29Q23 10 15 38L52 29Q79 9 87 39L52 29Q28 32 28 56L52 29Q79 33 78 58Z" fill="#63916D"/><Circle cx={47} cy={36} r={6} fill="#996846"/></G> : id === "island-flower" ? <G fill="#DB8C86">{[0, 72, 144, 216, 288].map(a => <Ellipse key={a} cx={50} cy={31} rx={13} ry={22} transform={`rotate(${a} 50 50)`}/>)}<Circle cx={50} cy={50} r={11} fill="#E8BE61"/></G> : id === "flying-fox" ? <G fill="#735578"><Path d="M49 41Q20 24 12 61L35 55L50 75L65 55L88 61Q80 24 51 41"/><Circle cx={50} cy={42} r={12} fill="#BD855C"/><Path d="M41 35L40 23L48 31M59 35L60 23L52 31"/></G> : id === "lagoon-ray" ? <G><Path d="M50 27Q29 33 14 57L49 73L85 57Q69 33 50 27" fill="#81AFC0" stroke="#487A90" strokeWidth={2}/><Path d="M49 69Q61 91 70 80" stroke="#487A90" strokeWidth={3} fill="none"/></G> : id === "tiny-rail" ? <G><Ellipse cx={48} cy={55} rx={24} ry={19} fill="#A3815D"/><Circle cx={67} cy={36} r={12} fill="#8F6749"/><Path d="M76 33L91 38L77 42" fill="#C7A05E"/><Path d="M39 71L36 86M55 71L57 86" stroke="#B58A5E" strokeWidth={3}/></G> : id === "jelly-light" ? <G><Path d="M22 56Q23 17 50 23Q77 17 78 56Z" fill="#B9A6CF" stroke="#786495" strokeWidth={2}/><Path d="M33 57Q24 70 35 82M49 57Q60 72 49 85M65 57Q56 69 68 81" stroke="#A086B7" strokeWidth={4} fill="none"/></G> : id === "sun-coral" ? <G stroke="#D28B65" strokeWidth={9} strokeLinecap="round"><Path d="M50 80V31M50 56L29 46V31M50 65L72 51V39M50 45L67 31" fill="none"/></G> : <Path d="M50 18L59 40L83 40L64 56L71 81L50 67L29 81L36 56L17 40L41 40Z" fill="#E2B45F" stroke="#AC803E" strokeWidth={2}/>}
    {!["island-flower", "coconut", "moon-canoe", "sun-coral"].includes(id) && <G fill="#314A4D"><Circle cx={43} cy={51} r={2}/><Circle cx={57} cy={51} r={2}/></G>}
  </Svg>;
}
