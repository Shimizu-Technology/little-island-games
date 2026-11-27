import React from "react";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { COLOR_PALETTE, type ColorCard, type ColorId, type ColorObjectId, type ShapeId } from "./engine";

const INK = "#3D2B24";

function ObjectArtwork({ id, size }: { id: ColorObjectId; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {id === "red-hibiscus" && (
        <G>
          <Circle cx="50" cy="28" r="19" fill="#E54B4B" stroke={INK} strokeWidth="3" />
          <Circle cx="72" cy="44" r="19" fill="#E54B4B" stroke={INK} strokeWidth="3" />
          <Circle cx="63" cy="70" r="19" fill="#E54B4B" stroke={INK} strokeWidth="3" />
          <Circle cx="37" cy="70" r="19" fill="#E54B4B" stroke={INK} strokeWidth="3" />
          <Circle cx="28" cy="44" r="19" fill="#E54B4B" stroke={INK} strokeWidth="3" />
          <Circle cx="50" cy="51" r="13" fill="#FF8E7B" />
          <Path d="M50 51L50 26" stroke="#F6C344" strokeWidth="4.5" strokeLinecap="round" />
          <Circle cx="50" cy="24" r="5" fill="#FFE073" stroke={INK} strokeWidth="2" />
          <Circle cx="44" cy="50" r="2.6" fill={INK} />
          <Circle cx="56" cy="50" r="2.6" fill={INK} />
          <Path d="M45 57Q50 61 55 57" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        </G>
      )}
      {id === "yellow-sun" && (
        <G>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <Path
              key={deg}
              d="M50 8L55 21H45Z"
              fill="#F6C344"
              stroke={INK}
              strokeWidth="2.5"
              strokeLinejoin="round"
              transform={`rotate(${deg} 50 50)`}
            />
          ))}
          <Circle cx="50" cy="50" r="26" fill="#F6C344" stroke={INK} strokeWidth="3.2" />
          <Circle cx="42" cy="42" r="5" fill="#FFE594" />
          <Circle cx="41" cy="48" r="3" fill={INK} />
          <Circle cx="59" cy="48" r="3" fill={INK} />
          <Circle cx="35" cy="55" r="4" fill="#FF9876" opacity={0.65} />
          <Circle cx="65" cy="55" r="4" fill="#FF9876" opacity={0.65} />
          <Path d="M43 58Q50 64 57 58" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
        </G>
      )}
      {id === "blue-wave" && (
        <G>
          <Path
            d="M12 74Q14 34 45 25Q71 18 76 40Q65 34 55 43Q48 51 60 56Q73 61 88 53L88 78Q50 88 12 78Z"
            fill="#3B92C4"
            stroke={INK}
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          <Path
            d="M46 25Q66 19 75 37Q63 32 54 39Q51 31 46 25Z"
            fill="#FFFDF8"
            stroke={INK}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <Path d="M22 68Q38 61 54 68T84 68" fill="none" stroke="#BEE6FA" strokeWidth="3.5" strokeLinecap="round" />
          <Circle cx="80" cy="27" r="4" fill="#BEE6FA" stroke={INK} strokeWidth="2" />
          <Circle cx="86" cy="39" r="3" fill="#FFFDF8" stroke={INK} strokeWidth="1.8" />
        </G>
      )}
      {id === "green-turtle" && (
        <G>
          <Ellipse cx="26" cy="37" rx="11" ry="7" fill="#4E9F68" stroke={INK} strokeWidth="3" transform="rotate(-30 26 37)" />
          <Ellipse cx="74" cy="37" rx="11" ry="7" fill="#4E9F68" stroke={INK} strokeWidth="3" transform="rotate(30 74 37)" />
          <Ellipse cx="30" cy="74" rx="10" ry="6" fill="#4E9F68" stroke={INK} strokeWidth="3" transform="rotate(30 30 74)" />
          <Ellipse cx="70" cy="74" rx="10" ry="6" fill="#4E9F68" stroke={INK} strokeWidth="3" transform="rotate(-30 70 74)" />
          <Circle cx="50" cy="22" r="13" fill="#63B87D" stroke={INK} strokeWidth="3" />
          <Circle cx="45" cy="20" r="2.4" fill={INK} />
          <Circle cx="55" cy="20" r="2.4" fill={INK} />
          <Path d="M46 26Q50 30 54 26" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
          <Ellipse cx="50" cy="56" rx="25" ry="26" fill="#4E9F68" stroke={INK} strokeWidth="3.2" />
          <Path d="M50 36L64 46L61 67L50 75L39 67L36 46Z" fill="#8CD49B" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          <Path d="M50 36V75M36 46L64 46M39 67L61 67" stroke={INK} strokeWidth="1.8" opacity={0.5} />
        </G>
      )}
      {id === "coral-shell" && (
        <G>
          <Path
            d="M17 62Q12 31 31 24Q39 14 50 18Q61 14 69 24Q88 31 83 62L66 80H34Z"
            fill="#FF7A5C"
            stroke={INK}
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          <Path d="M50 22V74M32 29L42 74M68 29L58 74M22 44L36 74M78 44L64 74" stroke="#FFFDF8" strokeWidth="2.8" strokeLinecap="round" opacity={0.85} />
          <Rect x="32" y="74" width="36" height="10" rx="5" fill="#F26041" stroke={INK} strokeWidth="3" />
        </G>
      )}
      {id === "purple-starfish" && (
        <G>
          <Path
            d="M50 10L61 36L89 39L68 58L74 86L50 72L26 86L32 58L11 39L39 36Z"
            fill="#8E64B8"
            stroke={INK}
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          <Circle cx="50" cy="24" r="2.6" fill="#D5B8F5" />
          <Circle cx="74" cy="43" r="2.6" fill="#D5B8F5" />
          <Circle cx="65" cy="72" r="2.6" fill="#D5B8F5" />
          <Circle cx="35" cy="72" r="2.6" fill="#D5B8F5" />
          <Circle cx="26" cy="43" r="2.6" fill="#D5B8F5" />
          <Circle cx="44" cy="48" r="2.8" fill={INK} />
          <Circle cx="56" cy="48" r="2.8" fill={INK} />
          <Path d="M45 56Q50 61 55 56" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        </G>
      )}
    </Svg>
  );
}

function ShapeArtwork({ shape, color, size }: { shape: ShapeId; color: ColorId; size: number }) {
  const palette = COLOR_PALETTE[color];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {shape === "circle" && (
        <G>
          <Circle cx="50" cy="50" r="36" fill={palette.fill} stroke={INK} strokeWidth="3.5" />
          <Circle cx="37" cy="36" r="8" fill="#FFFDF8" opacity={0.35} />
          <Circle cx="42" cy="49" r="3" fill={INK} />
          <Circle cx="58" cy="49" r="3" fill={INK} />
          <Path d="M44 59Q50 64 56 59" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
        </G>
      )}
      {shape === "star" && (
        <G>
          <Path
            d="M50 11L61 36L88 39L67 57L73 84L50 70L27 84L33 57L12 39L39 36Z"
            fill={palette.fill}
            stroke={INK}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <Circle cx="44" cy="48" r="2.8" fill={INK} />
          <Circle cx="56" cy="48" r="2.8" fill={INK} />
          <Path d="M45 57Q50 61 55 57" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        </G>
      )}
      {shape === "square" && (
        <G>
          <Rect x="16" y="16" width="68" height="68" rx="14" fill={palette.fill} stroke={INK} strokeWidth="3.5" />
          <Rect x="24" y="24" width="18" height="8" rx="4" fill="#FFFDF8" opacity={0.35} />
          <Circle cx="41" cy="49" r="3" fill={INK} />
          <Circle cx="59" cy="49" r="3" fill={INK} />
          <Path d="M43 59Q50 64 57 59" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
        </G>
      )}
      {shape === "triangle" && (
        <G>
          <Path
            d="M50 13L87 82H13Z"
            fill={palette.fill}
            stroke={INK}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <Circle cx="43" cy="57" r="2.8" fill={INK} />
          <Circle cx="57" cy="57" r="2.8" fill={INK} />
          <Path d="M45 66Q50 70 55 66" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        </G>
      )}
      {shape === "heart" && (
        <G>
          <Path
            d="M50 84C22 65 13 47 15 33C17 20 28 14 39 18C44 20 48 25 50 30C52 25 56 20 61 18C72 14 83 20 85 33C87 47 78 65 50 84Z"
            fill={palette.fill}
            stroke={INK}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <Circle cx="33" cy="31" r="5" fill="#FFFDF8" opacity={0.35} />
          <Circle cx="42" cy="47" r="2.8" fill={INK} />
          <Circle cx="58" cy="47" r="2.8" fill={INK} />
          <Path d="M44 56Q50 61 56 56" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        </G>
      )}
    </Svg>
  );
}

export function ColorCardArt({ card, size = 86 }: { card: ColorCard; size?: number }) {
  return card.kind === "object" ? (
    <ObjectArtwork id={card.id} size={size} />
  ) : (
    <ShapeArtwork shape={card.shape} color={card.color} size={size} />
  );
}

export function IslandColorsArt({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect x="4" y="4" width="92" height="92" rx="24" fill="#FFF0D2" stroke={INK} strokeWidth="3" />
      <Circle cx="32" cy="35" r="16" fill="#E54B4B" stroke={INK} strokeWidth="3" />
      <Path d="M68 18L73 30L86 32L76 41L79 54L68 47L57 54L60 41L50 32L63 30Z" fill="#F6C344" stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
      <Path d="M22 80L36 54L50 80Z" fill="#3B92C4" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <Rect x="56" y="57" width="26" height="24" rx="6" fill="#4E9F68" stroke={INK} strokeWidth="3" />
    </Svg>
  );
}
