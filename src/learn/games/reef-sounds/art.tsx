import React from "react";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import type { AnimalId } from "./engine";

const INK = "#3D2B24";

export function AnimalArt({ id, size = 86 }: { id: AnimalId; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {id === "turtle" && (
        <G>
          <Ellipse cx="24" cy="40" rx="12" ry="7" fill="#4E9F68" stroke={INK} strokeWidth="3" transform="rotate(-28 24 40)" />
          <Ellipse cx="76" cy="40" rx="12" ry="7" fill="#4E9F68" stroke={INK} strokeWidth="3" transform="rotate(28 76 40)" />
          <Ellipse cx="30" cy="75" rx="10" ry="6" fill="#4E9F68" stroke={INK} strokeWidth="3" transform="rotate(28 30 75)" />
          <Ellipse cx="70" cy="75" rx="10" ry="6" fill="#4E9F68" stroke={INK} strokeWidth="3" transform="rotate(-28 70 75)" />
          <Circle cx="50" cy="23" r="13" fill="#68BC82" stroke={INK} strokeWidth="3" />
          <Circle cx="45" cy="21" r="2.5" fill={INK} />
          <Circle cx="55" cy="21" r="2.5" fill={INK} />
          <Path d="M46 27Q50 31 54 27" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
          <Ellipse cx="50" cy="57" rx="25" ry="25" fill="#4E9F68" stroke={INK} strokeWidth="3.2" />
          <Path d="M50 37L64 47L61 67L50 75L39 67L36 47Z" fill="#97DA9F" stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
        </G>
      )}
      {id === "crab" && (
        <G>
          <Path d="M24 62L11 72M26 70L14 82M76 62L89 72M74 70L86 82" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <Path d="M28 48L18 33M72 48L82 33" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <Path d="M10 24Q21 15 26 28L19 36Q8 34 10 24Z" fill="#FF7A5C" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <Path d="M90 24Q79 15 74 28L81 36Q92 34 90 24Z" fill="#FF7A5C" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <Path d="M40 42V30M60 42V30" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <Circle cx="40" cy="27" r="6" fill="#FFFDF8" stroke={INK} strokeWidth="2.5" />
          <Circle cx="60" cy="27" r="6" fill="#FFFDF8" stroke={INK} strokeWidth="2.5" />
          <Circle cx="41" cy="27" r="2.5" fill={INK} />
          <Circle cx="59" cy="27" r="2.5" fill={INK} />
          <Ellipse cx="50" cy="60" rx="28" ry="20" fill="#FF7A5C" stroke={INK} strokeWidth="3.2" />
          <Circle cx="36" cy="63" r="4" fill="#FFA892" />
          <Circle cx="64" cy="63" r="4" fill="#FFA892" />
          <Path d="M42 66Q50 72 58 66" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
        </G>
      )}
      {id === "whale" && (
        <G>
          <Path d="M46 29Q43 13 33 15M46 29Q49 13 59 15" fill="none" stroke="#6AC4EC" strokeWidth="4" strokeLinecap="round" />
          <Path d="M77 56L91 41Q92 54 83 59L91 71Q79 69 75 61Z" fill="#3B92C4" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <Path d="M14 58Q14 31 46 31Q76 31 79 58Q78 79 47 79Q14 79 14 58Z" fill="#3B92C4" stroke={INK} strokeWidth="3.2" />
          <Path d="M18 65Q39 74 62 67Q50 80 28 77Q19 74 18 65Z" fill="#D5EFFC" stroke={INK} strokeWidth="2.2" />
          <Circle cx="31" cy="52" r="3.4" fill={INK} />
          <Circle cx="30" cy="51" r="1.2" fill="#FFFDF8" />
          <Path d="M20 62Q28 67 36 62" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        </G>
      )}
      {id === "frog" && (
        <G>
          <Ellipse cx="24" cy="76" rx="13" ry="8" fill="#4E9F68" stroke={INK} strokeWidth="3" />
          <Ellipse cx="76" cy="76" rx="13" ry="8" fill="#4E9F68" stroke={INK} strokeWidth="3" />
          <Circle cx="34" cy="31" r="12" fill="#63BA7A" stroke={INK} strokeWidth="3" />
          <Circle cx="66" cy="31" r="12" fill="#63BA7A" stroke={INK} strokeWidth="3" />
          <Circle cx="34" cy="31" r="6" fill="#FFFDF8" stroke={INK} strokeWidth="2" />
          <Circle cx="66" cy="31" r="6" fill="#FFFDF8" stroke={INK} strokeWidth="2" />
          <Circle cx="35" cy="31" r="3" fill={INK} />
          <Circle cx="65" cy="31" r="3" fill={INK} />
          <Ellipse cx="50" cy="58" rx="31" ry="24" fill="#63BA7A" stroke={INK} strokeWidth="3.2" />
          <Ellipse cx="50" cy="65" rx="19" ry="13" fill="#CFF0C8" />
          <Circle cx="28" cy="54" r="4" fill="#FF9876" opacity={0.65} />
          <Circle cx="72" cy="54" r="4" fill="#FF9876" opacity={0.65} />
          <Path d="M36 53Q50 64 64 53" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
        </G>
      )}
      {id === "duck" && (
        <G>
          <Ellipse cx="54" cy="65" rx="28" ry="19" fill="#F6C344" stroke={INK} strokeWidth="3.2" />
          <Path d="M78 58L90 48L84 65Z" fill="#F6C344" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <Circle cx="36" cy="38" r="18" fill="#F6C344" stroke={INK} strokeWidth="3.2" />
          <Path d="M18 39Q8 41 11 47Q19 49 24 44Z" fill="#FF7A5C" stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
          <Circle cx="31" cy="34" r="3.2" fill={INK} />
          <Circle cx="30" cy="33" r="1.1" fill="#FFFDF8" />
          <Path d="M44 63Q57 55 68 65Q55 75 44 63Z" fill="#FFE07D" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <Path d="M12 85Q31 79 50 85T88 85" fill="none" stroke="#6AC4EC" strokeWidth="4" strokeLinecap="round" />
        </G>
      )}
      {id === "rooster" && (
        <G>
          <Path d="M68 50Q85 26 89 44Q78 46 86 58Q74 60 72 68" fill="#2A7B76" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <Path d="M33 21Q36 10 43 19Q48 11 53 22" fill="#E54B4B" stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
          <Ellipse cx="51" cy="63" rx="24" ry="19" fill="#FFF6E5" stroke={INK} strokeWidth="3.2" />
          <Circle cx="39" cy="38" r="15" fill="#F6C344" stroke={INK} strokeWidth="3.2" />
          <Path d="M24 38L14 42L25 45Z" fill="#FF7A5C" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
          <Circle cx="28" cy="48" r="4" fill="#E54B4B" stroke={INK} strokeWidth="2" />
          <Circle cx="35" cy="35" r="3" fill={INK} />
          <Path d="M44 62Q57 54 66 64Q54 73 44 62Z" fill="#E54B4B" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          <Path d="M44 82V90M58 82V90" stroke="#E0872B" strokeWidth="3.5" strokeLinecap="round" />
        </G>
      )}
      {id === "cat" && (
        <G>
          <Path d="M74 73Q90 66 86 48" fill="none" stroke="#B68EDB" strokeWidth="7" strokeLinecap="round" />
          <Path d="M25 40L22 17L43 29Z" fill="#B68EDB" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <Path d="M75 40L78 17L57 29Z" fill="#B68EDB" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <Path d="M27 36L26 23L38 30Z" fill="#FFBDD0" />
          <Path d="M73 36L74 23L62 30Z" fill="#FFBDD0" />
          <Circle cx="50" cy="54" r="28" fill="#B68EDB" stroke={INK} strokeWidth="3.2" />
          <Circle cx="39" cy="50" r="3.4" fill={INK} />
          <Circle cx="61" cy="50" r="3.4" fill={INK} />
          <Path d="M46 57H54L50 61Z" fill="#FF7A5C" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <Path d="M44 65Q50 69 56 65" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
          <Path d="M16 55H31M16 62H31M69 55H84M69 62H84" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        </G>
      )}
      {id === "dog" && (
        <G>
          <Ellipse cx="21" cy="53" rx="10" ry="20" fill="#B47644" stroke={INK} strokeWidth="3" transform="rotate(14 21 53)" />
          <Ellipse cx="79" cy="53" rx="10" ry="20" fill="#B47644" stroke={INK} strokeWidth="3" transform="rotate(-14 79 53)" />
          <Circle cx="50" cy="52" r="27" fill="#E3AD74" stroke={INK} strokeWidth="3.2" />
          <Ellipse cx="50" cy="61" rx="14" ry="11" fill="#FFF4DE" />
          <Circle cx="39" cy="46" r="3.4" fill={INK} />
          <Circle cx="61" cy="46" r="3.4" fill={INK} />
          <Ellipse cx="50" cy="56" rx="6" ry="4.5" fill={INK} />
          <Path d="M43 64Q50 70 57 64" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <Path d="M47 68Q50 76 53 68" fill="#FF7A5C" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        </G>
      )}
      {id === "bird" && (
        <G>
          <Path d="M22 60L10 47L14 66Z" fill="#FF7A5C" stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
          <Ellipse cx="48" cy="58" rx="25" ry="20" fill="#3FA6B8" stroke={INK} strokeWidth="3.2" />
          <Circle cx="62" cy="37" r="16" fill="#3FA6B8" stroke={INK} strokeWidth="3.2" />
          <Path d="M77 35L91 40L76 45Z" fill="#F6C344" stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
          <Circle cx="65" cy="34" r="3" fill={INK} />
          <Circle cx="64" cy="33" r="1" fill="#FFFDF8" />
          <Path d="M36 56Q48 45 58 58Q46 70 36 56Z" fill="#F6C344" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <Path d="M45 78V88M55 78V88" stroke="#E0872B" strokeWidth="3.2" strokeLinecap="round" />
        </G>
      )}
    </Svg>
  );
}

export function ReefSoundsArt({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect x="4" y="4" width="92" height="92" rx="24" fill="#E2F4EA" stroke={INK} strokeWidth="3" />
      <Ellipse cx="50" cy="64" rx="25" ry="18" fill="#F6C344" stroke={INK} strokeWidth="3" />
      <Circle cx="38" cy="40" r="15" fill="#F6C344" stroke={INK} strokeWidth="3" />
      <Path d="M23 41L14 45L25 48Z" fill="#FF7A5C" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <Circle cx="34" cy="37" r="2.8" fill={INK} />
      <Path d="M68 25Q78 32 68 41M76 20Q89 32 76 46" fill="none" stroke="#1E6B66" strokeWidth="3.5" strokeLinecap="round" />
    </Svg>
  );
}
