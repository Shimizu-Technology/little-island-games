import React from "react";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import type { SplashItemKind } from "./engine";

const INK = "#3D2B24";

export function BeachItemArt({ kind, counted, size = 56 }: { kind: SplashItemKind; counted: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {counted && <Circle cx="50" cy="50" r="46" fill="#FFE8A3" opacity={0.55} />}
      {kind === "shell" && (
        <G>
          <Path
            d="M16 62Q11 31 31 23Q39 13 50 18Q61 13 69 23Q89 31 84 62L66 80H34Z"
            fill={counted ? "#FF7A5C" : "#F6A082"}
            stroke={INK}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <Path d="M50 22V74M32 29L42 74M68 29L58 74M22 44L36 74M78 44L64 74" stroke="#FFFDF8" strokeWidth="3" strokeLinecap="round" opacity={0.85} />
          <Rect x="32" y="74" width="36" height="10" rx="5" fill="#E86244" stroke={INK} strokeWidth="3" />
        </G>
      )}
      {kind === "starfish" && (
        <G>
          <Path
            d="M50 10L61 36L89 39L68 58L74 86L50 72L26 86L32 58L11 39L39 36Z"
            fill={counted ? "#F6C344" : "#F8D77E"}
            stroke={INK}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <Circle cx="44" cy="49" r="3" fill={INK} />
          <Circle cx="56" cy="49" r="3" fill={INK} />
          <Path d="M45 57Q50 62 55 57" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        </G>
      )}
      {kind === "coconut" && (
        <G>
          <Circle cx="50" cy="53" r="34" fill={counted ? "#8F5A34" : "#AC764E"} stroke={INK} strokeWidth="3.5" />
          <Ellipse cx="39" cy="39" rx="9" ry="6" fill="#C9966B" opacity={0.55} transform="rotate(-25 39 39)" />
          <Circle cx="41" cy="48" r="4.5" fill={INK} />
          <Circle cx="59" cy="48" r="4.5" fill={INK} />
          <Circle cx="50" cy="61" r="5" fill={INK} />
          <Path d="M50 19Q57 9 68 15Q60 22 50 19Z" fill="#4E9F68" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        </G>
      )}
    </Svg>
  );
}

/** Pictorial dot group rendered inside giant numeral choice cards (up to 10 dots in clean 5-frame rows). */
export function DotGroup({ count, color = "#FF7A5C" }: { count: number; color?: string }) {
  const top = Math.min(count, 5);
  const bottom = Math.max(0, count - 5);
  const dotR = count > 5 ? 4.5 : 5.5;
  const spacing = count > 5 ? 14 : 16;
  const width = Math.max(top, bottom) * spacing + 8;
  const height = bottom > 0 ? 32 : 18;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: top }, (_, i) => (
        <Circle
          key={`t-${i}`}
          cx={4 + spacing / 2 + i * spacing}
          cy={9}
          r={dotR}
          fill={color}
          stroke={INK}
          strokeWidth={1.6}
        />
      ))}
      {Array.from({ length: bottom }, (_, i) => (
        <Circle
          key={`b-${i}`}
          cx={4 + spacing / 2 + i * spacing}
          cy={23}
          r={dotR}
          fill={color}
          stroke={INK}
          strokeWidth={1.6}
        />
      ))}
    </Svg>
  );
}

export function SplashCountArt({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect x="4" y="4" width="92" height="92" rx="24" fill="#FFF0D2" stroke={INK} strokeWidth="3" />
      <Path d="M10 74Q30 65 50 74T90 74V88Q90 94 82 94H18Q10 94 10 88Z" fill="#7CC4C9" />
      <Path d="M22 58Q18 36 33 31Q40 24 47 31Q62 36 58 58L47 68H33Z" fill="#FF7A5C" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <Path d="M72 26L76 38L88 40L79 49L82 61L72 55L62 61L65 49L56 40L68 38Z" fill="#F6C344" stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
    </Svg>
  );
}
