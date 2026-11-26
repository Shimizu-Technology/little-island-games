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

type StickerCharm =
  | "bubble"
  | "rainbow"
  | "note"
  | "star"
  | "swirl"
  | "heart"
  | "wave"
  | "ripple"
  | "moon"
  | "sun"
  | "leaf"
  | "sparkle"
  | "frond"
  | "blossom"
  | "trail"
  | "seastar";

type StickerTheme = {
  game: ArcadeId;
  bg: string;
  ring: string;
  ribbon: string;
  charmBg: string;
  charm: StickerCharm;
};

export const stickerThemes: Record<StickerId, StickerTheme> = {
  "moon-canoe": { game: "canoe-cargo", bg: "#F9EBD2", ring: "#D98E36", ribbon: "#4A66A0", charmBg: "#E8EEFC", charm: "moon" },
  "flying-fox": { game: "fruit-bat-flight", bg: "#ECE6FA", ring: "#7C5CB8", ribbon: "#E6A93B", charmBg: "#FFF3CE", charm: "leaf" },
  "jelly-light": { game: "fruit-bat-flight", bg: "#DFF4F1", ring: "#2D9A93", ribbon: "#9F72D8", charmBg: "#F3E8FC", charm: "sparkle" },
  "sea-turtle": { game: "lagoon-run", bg: "#DDF3EC", ring: "#288E7D", ribbon: "#52B59C", charmBg: "#E3F8F2", charm: "wave" },
  "lagoon-ray": { game: "lagoon-run", bg: "#DCEEFB", ring: "#3B84B8", ribbon: "#6CBCE6", charmBg: "#E8F5FE", charm: "ripple" },
  "reef-fish": { game: "reef-builder", bg: "#DDF3EE", ring: "#2E9689", ribbon: "#FF7A5C", charmBg: "#FFEBE4", charm: "bubble" },
  "rainbow-fish": { game: "reef-builder", bg: "#FFF0D6", ring: "#EB7E44", ribbon: "#FFCE45", charmBg: "#FFF5C8", charm: "rainbow" },
  "singing-shell": { game: "shell-song", bg: "#F1E8FB", ring: "#9167C2", ribbon: "#EC7A9B", charmBg: "#FDE8F0", charm: "note" },
  "star-shell": { game: "shell-song", bg: "#FFF3D6", ring: "#D99A2B", ribbon: "#9167C2", charmBg: "#F2E7FC", charm: "star" },
  "tiny-rail": { game: "rail-parade", bg: "#E8F3D8", ring: "#5B9246", ribbon: "#C98548", charmBg: "#F8ECDA", charm: "trail" },
  "island-flower": { game: "rail-parade", bg: "#FCE8EA", ring: "#DF6779", ribbon: "#FFCE45", charmBg: "#FFF3CA", charm: "blossom" },
  "little-crab": { game: "crab-crossing", bg: "#FFEADF", ring: "#E66D4E", ribbon: "#2D9A93", charmBg: "#E0F6F3", charm: "swirl" },
  "hermit-home": { game: "crab-crossing", bg: "#F9EED7", ring: "#C5883C", ribbon: "#E66D4E", charmBg: "#FFEBE5", charm: "heart" },
  coconut: { game: "palm-patrol", bg: "#E9F4D8", ring: "#4B8E55", ribbon: "#9C693D", charmBg: "#F4E8D6", charm: "frond" },
  "sun-coral": { game: "palm-patrol", bg: "#FFF0D8", ring: "#EA7844", ribbon: "#FFCE45", charmBg: "#FFF5C8", charm: "sun" },
  "sea-star": { game: "beach-ball", bg: "#DFF1FA", ring: "#3B95C4", ribbon: "#FFCE45", charmBg: "#FFF3C6", charm: "seastar" },
};

function StickerCharmIcon({ charm, size }: { charm: StickerCharm; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" accessible={false}>
      {charm === "moon" ? (
        <G>
          <Path d="M16.5 6.5 A7.5 7.5 0 1 0 21.5 18.5 A6 6 0 1 1 16.5 6.5 Z" fill="#FFCE45" stroke="#3D2B24" strokeWidth={1.8} strokeLinejoin="round" />
          <Circle cx={19.5} cy={9.5} r={1.6} fill="#4A66A0" />
        </G>
      ) : charm === "leaf" ? (
        <G>
          <Path d="M7 20 Q7 8 21 7 Q20 20 7 20 Z" fill="#6BB66B" stroke="#3D2B24" strokeWidth={1.8} strokeLinejoin="round" />
          <Path d="M8.5 18.5 L16.5 11.5" stroke="#3D2B24" strokeWidth={1.6} strokeLinecap="round" />
        </G>
      ) : charm === "sparkle" ? (
        <G>
          <Path d="M14 4 L16.4 11.6 L24 14 L16.4 16.4 L14 24 L11.6 16.4 L4 14 L11.6 11.6 Z" fill="#B583EB" stroke="#3D2B24" strokeWidth={1.7} strokeLinejoin="round" />
          <Circle cx={21} cy={7} r={1.8} fill="#FFCE45" stroke="#3D2B24" strokeWidth={1} />
        </G>
      ) : charm === "wave" ? (
        <G fill="none" strokeLinecap="round">
          <Path d="M4.5 13 Q8.5 8 12.5 13 T20.5 13 T23.5 12" stroke="#288E7D" strokeWidth={2.8} />
          <Path d="M5.5 18.5 Q9.5 14 13.5 18.5 T21.5 18.5" stroke="#3D2B24" strokeWidth={2} />
        </G>
      ) : charm === "ripple" ? (
        <G fill="none" strokeLinecap="round">
          <Path d="M5 10.5 Q14 6.5 23 10.5" stroke="#3B84B8" strokeWidth={2.4} />
          <Path d="M5 15 Q14 11 23 15" stroke="#3D2B24" strokeWidth={2} />
          <Path d="M8 19.5 Q14 16.5 20 19.5" stroke="#3B84B8" strokeWidth={2.2} />
        </G>
      ) : charm === "bubble" ? (
        <G>
          <Circle cx={11.5} cy={16} r={5.5} fill="#8AE0D5" stroke="#3D2B24" strokeWidth={1.8} />
          <Circle cx={19} cy={10} r={3.4} fill="#FF9E84" stroke="#3D2B24" strokeWidth={1.6} />
          <Circle cx={9.8} cy={14.3} r={1.4} fill="#FFFDF8" />
        </G>
      ) : charm === "rainbow" ? (
        <G fill="none" strokeLinecap="round">
          <Path d="M5 19 A9 9 0 0 1 23 19" stroke="#FF7A5C" strokeWidth={2.8} />
          <Path d="M8 19 A6 6 0 0 1 20 19" stroke="#FFCE45" strokeWidth={2.8} />
          <Path d="M11 19 A3 3 0 0 1 17 19" stroke="#2E9689" strokeWidth={2.6} />
        </G>
      ) : charm === "note" ? (
        <G>
          <Path d="M12 18.5 V8.5 L21 6.5 V16.5" fill="none" stroke="#3D2B24" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          <Ellipse cx={9.5} cy={19} rx={3.3} ry={2.4} fill="#EC7A9B" stroke="#3D2B24" strokeWidth={1.6} />
          <Ellipse cx={18.5} cy={17} rx={3.3} ry={2.4} fill="#EC7A9B" stroke="#3D2B24" strokeWidth={1.6} />
        </G>
      ) : charm === "star" ? (
        <G>
          <Path d={plumpStar} transform="translate(14 14.5) scale(.74)" fill="#FFCE45" stroke="#3D2B24" strokeWidth={2.2} strokeLinejoin="round" />
          <Circle cx={22} cy={7} r={1.6} fill="#9167C2" />
        </G>
      ) : charm === "trail" ? (
        <G>
          <Path d="M8 21 Q13 14 20 7" fill="none" stroke="#5B9246" strokeWidth={2.2} strokeLinecap="round" />
          <Ellipse cx={10} cy={12} rx={3.2} ry={2} transform="rotate(-35 10 12)" fill="#7DC05C" stroke="#3D2B24" strokeWidth={1.4} />
          <Ellipse cx={17.5} cy={16} rx={3.2} ry={2} transform="rotate(20 17.5 16)" fill="#C98548" stroke="#3D2B24" strokeWidth={1.4} />
        </G>
      ) : charm === "blossom" ? (
        <G>
          {[0, 72, 144, 216, 288].map(angle => (
            <Ellipse key={angle} cx={14} cy={8.5} rx={3.1} ry={4.6} transform={`rotate(${angle} 14 14)`} fill="#F27E91" stroke="#3D2B24" strokeWidth={1.2} />
          ))}
          <Circle cx={14} cy={14} r={3.2} fill="#FFCE45" stroke="#3D2B24" strokeWidth={1.4} />
        </G>
      ) : charm === "swirl" ? (
        <G fill="none" strokeLinecap="round">
          <Path d="M14 14 C14 11.5 17 11.5 17 14 C17 17.5 11.5 18 10.5 14.5 C9.5 10 14.5 7 19 9 C22 10.5 22.5 15.5 19.5 19 C16 22.5 9.5 22 7 18" stroke="#E66D4E" strokeWidth={2.4} />
          <Circle cx={14} cy={14} r={1.4} fill="#3D2B24" />
        </G>
      ) : charm === "heart" ? (
        <Path
          d="M14 21.5 C14 21.5 6 16.5 6 11 C6 8 8.3 6 10.8 6 C12.4 6 13.5 6.9 14 8 C14.5 6.9 15.6 6 17.2 6 C19.7 6 22 8 22 11 C22 16.5 14 21.5 14 21.5 Z"
          fill="#FF7A5C"
          stroke="#3D2B24"
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      ) : charm === "frond" ? (
        <G>
          <Path d="M14 22 V10" stroke="#9C693D" strokeWidth={2.4} strokeLinecap="round" />
          <Path d="M14 11 Q7 6 5 12 Q10 12 14 11 Z" fill="#4B8E55" stroke="#3D2B24" strokeWidth={1.4} strokeLinejoin="round" />
          <Path d="M14 11 Q21 6 23 12 Q18 12 14 11 Z" fill="#6BB66B" stroke="#3D2B24" strokeWidth={1.4} strokeLinejoin="round" />
          <Path d="M14 11 Q11 4 17 5 Q15.5 8.5 14 11 Z" fill="#7AC778" stroke="#3D2B24" strokeWidth={1.3} strokeLinejoin="round" />
        </G>
      ) : charm === "sun" ? (
        <G>
          <Circle cx={14} cy={14} r={5} fill="#FFCE45" stroke="#3D2B24" strokeWidth={1.8} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
            <Path key={angle} d="M14 4.5 V6.8" transform={`rotate(${angle} 14 14)`} stroke="#EA7844" strokeWidth={2.2} strokeLinecap="round" />
          ))}
        </G>
      ) : (
        <Path d={plumpStar} transform="translate(14 14.5) scale(.76)" fill="#FFCE45" stroke="#3D2B24" strokeWidth={2.2} strokeLinejoin="round" />
      )}
    </Svg>
  );
}

/**
 * Storybook die-cut sticker medallion backed by the approved illustrated WebP artwork.
 * Each sticker keeps a unique border palette, inner ribbon ring, and corner charm emblem.
 */
export function StickerArt({ id, size = 90 }: { id: StickerId; size?: number }) {
  const spec = stickerThemes[id];
  const outerBorder = Math.max(2, Math.round(size * 0.036));
  const innerSize = Math.max(16, Math.round(size * 0.84));
  const artSize = Math.max(14, Math.round(size * 0.68));
  const badgeSize = Math.max(16, Math.round(size * 0.34));
  const pipSize = Math.max(8, Math.round(size * 0.14));

  return (
    <View
      testID={`sticker-art-${id}`}
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#FFFDF8",
        borderWidth: outerBorder,
        borderColor: spec.ring,
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 3px 0 rgba(61, 43, 36, 0.14)",
      }}
    >
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: spec.bg,
          borderWidth: Math.max(1.5, Math.round(size * 0.022)),
          borderColor: spec.ribbon,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IllustratedArcadeArt id={spec.game} size={artSize} />
      </View>

      {size >= 52 && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: Math.round(size * 0.04),
            bottom: Math.round(size * 0.04),
            width: pipSize,
            height: pipSize,
            borderRadius: pipSize / 2,
            backgroundColor: spec.ribbon,
            borderWidth: 1.5,
            borderColor: "#FFFDF8",
          }}
        />
      )}

      <View
        testID={`sticker-charm-${id}`}
        pointerEvents="none"
        style={{
          position: "absolute",
          right: -Math.round(badgeSize * 0.08),
          top: -Math.round(badgeSize * 0.08),
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          backgroundColor: spec.charmBg,
          borderWidth: size >= 48 ? 1.8 : 1.3,
          borderColor: "#3D2B24",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1.5px 0 rgba(61, 43, 36, 0.22)",
        }}
      >
        <StickerCharmIcon charm={spec.charm} size={Math.round(badgeSize * 0.78)} />
      </View>
    </View>
  );
}
