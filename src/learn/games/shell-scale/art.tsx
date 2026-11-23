import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { SHELL_META } from './rules';

export const ink = '#243238';
export const palette = {
  woodDark: '#6B462B',
  woodMid: '#A67247',
  woodLight: '#D7A876',
  brass: '#D99E32',
  brassLight: '#F6D67B',
  panGold: '#E4BA66',
  panRim: '#9B6C2F',
} as const;
const { woodDark, woodMid, brass, panGold } = palette;

/**
 * Six hand-crafted original shells — clearly distinguishable by silhouette, interior pattern, AND colour,
 * readable even at small phone sizes and in grayscale. Zero external or traced assets.
 */
export function ShellArt({ pool, size }: { pool: number; size: number }) {
  const idx = ((pool % SHELL_META.length) + SHELL_META.length) % SHELL_META.length;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {idx === 0 && (
        /* 0: Coral Cowrie — plump spotted oval dome with bold central ridge */
        <G>
          <Ellipse cx={32} cy={34} rx={24} ry={18} fill="#E06B4F" stroke={ink} strokeWidth={2.5} />
          <Ellipse cx={32} cy={31} rx={20} ry={12} fill="#EE8D72" />
          <Path d="M12 34 Q32 28 52 34" fill="none" stroke="#FFF4E4" strokeWidth={3.5} strokeLinecap="round" />
          <Path d="M16 34 Q32 30 48 34" fill="none" stroke="#7A2E1E" strokeWidth={2} strokeDasharray="3 4" strokeLinecap="round" />
          <Circle cx={22} cy={24} r={3} fill="#7A2E1E" />
          <Circle cx={33} cy={22} r={3.4} fill="#7A2E1E" />
          <Circle cx={44} cy={25} r={2.8} fill="#7A2E1E" />
          <Circle cx={25} cy={43} r={2.6} fill="#7A2E1E" />
          <Circle cx={39} cy={43} r={2.8} fill="#7A2E1E" />
          <Ellipse cx={25} cy={27} rx={4.5} ry={2} fill="#FFF7EE" opacity={0.55} />
        </G>
      )}
      {idx === 1 && (
        /* 1: Lagoon Scallop — scalloped fan silhouette with wing ears & radiating ribs */
        <G>
          <Path
            d="M22 50 L15 44 L19 42 C10 34 10 21 18 15 C23 11 27 10 32 10 C37 10 41 11 46 15 C54 21 54 34 45 42 L49 44 L42 50 Z"
            fill="#2D85A8"
            stroke={ink}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <Path d="M32 48 L32 12" stroke="#BFE7F5" strokeWidth={2.4} strokeLinecap="round" />
          <Path d="M31 48 L21 15" stroke="#BFE7F5" strokeWidth={2.2} strokeLinecap="round" />
          <Path d="M33 48 L43 15" stroke="#BFE7F5" strokeWidth={2.2} strokeLinecap="round" />
          <Path d="M30 48 L14 24" stroke="#BFE7F5" strokeWidth={2} strokeLinecap="round" />
          <Path d="M34 48 L50 24" stroke="#BFE7F5" strokeWidth={2} strokeLinecap="round" />
          <Rect x={24} y={46} width={16} height={6} rx={2.5} fill="#1B5C78" stroke={ink} strokeWidth={2} />
        </G>
      )}
      {idx === 2 && (
        /* 2: Golden Conch — pointed spire with flared lip and bold spiral bands */
        <G>
          <Path
            d="M32 6 L41 18 L48 26 C53 33 51 44 43 50 C37 54 27 54 21 50 C14 45 14 33 19 25 L25 17 Z"
            fill="#E5A938"
            stroke={ink}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <Path d="M27 18 Q32 21 39 18" fill="none" stroke="#8A5810" strokeWidth={2.4} strokeLinecap="round" />
          <Path d="M21 27 Q32 32 45 27" fill="none" stroke="#8A5810" strokeWidth={2.5} strokeLinecap="round" />
          <Path d="M18 37 Q32 43 47 36" fill="none" stroke="#8A5810" strokeWidth={2.5} strokeLinecap="round" />
          <Ellipse cx={37} cy={41} rx={7} ry={10} fill="#FCE4C4" stroke={ink} strokeWidth={2} />
          <Path d="M35 35 C38 38 38 44 35 47" fill="none" stroke="#D97B4A" strokeWidth={2.2} strokeLinecap="round" />
          <Polygon points="32,8 28,15 36,15" fill="#F8D882" />
        </G>
      )}
      {idx === 3 && (
        /* 3: Teal Nautilus — chambered spiral shell with flared lower-right aperture lip (distinct silhouette from Sand Dollar) */
        <G>
          <Path
            d="M32 10 C18 10 10 21 10 34 C10 47 20 55 34 55 L52 55 C55 55 56 50 53 46 L49 41 C53 36 54 27 50 20 C46 13 39 10 32 10 Z"
            fill="#1F7A70"
            stroke={ink}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <Path
            d="M33 20 C24 20 19 26 19 34 C19 42 25 48 35 48 L47 48 L43 41 C47 36 47 28 43 23 C40 21 37 20 33 20 Z"
            fill="#E8F4EF"
            stroke={ink}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <Path
            d="M34 35 C34 30 40 30 40 35 C40 42 29 43 27 35 C25 25 38 22 44 29"
            fill="none"
            stroke="#1F7A70"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Line x1={31} y1={11} x2={33} y2={20} stroke="#A8DDD4" strokeWidth={2.2} strokeLinecap="round" />
          <Line x1={18} y1={18} x2={24} y2={25} stroke="#A8DDD4" strokeWidth={2.2} strokeLinecap="round" />
          <Line x1={11} y1={32} x2={19} y2={34} stroke="#A8DDD4" strokeWidth={2.2} strokeLinecap="round" />
          <Line x1={17} y1={46} x2={24} y2={42} stroke="#A8DDD4" strokeWidth={2.2} strokeLinecap="round" />
          <Circle cx={35} cy={35} r={3.2} fill={ink} />
        </G>
      )}
      {idx === 4 && (
        /* 4: Sand Dollar — warm disc with crisp five-petal star flower & keyhole notches */
        <G>
          <Circle cx={32} cy={32} r={23} fill="#E8D2A4" stroke={ink} strokeWidth={2.5} />
          <Circle cx={32} cy={32} r={18.5} fill="#F5E7C8" stroke="#C5A46A" strokeWidth={1.5} />
          {[0, 72, 144, 216, 288].map(deg => (
            <G key={deg} rotation={deg} origin="32, 32">
              <Ellipse cx={32} cy={21} rx={3.5} ry={7.5} fill="#B88746" stroke={ink} strokeWidth={1.5} />
              <Circle cx={32} cy={13} r={1.8} fill="#7B5624" />
            </G>
          ))}
          <Circle cx={32} cy={32} r={4.2} fill="#F5E7C8" stroke={ink} strokeWidth={1.8} />
        </G>
      )}
      {idx === 5 && (
        /* 5: Plum Auger — tall tapered corkscrew cone with diagonal cream stripes */
        <G>
          <Path
            d="M32 6 L46 48 C42 54 22 54 18 48 Z"
            fill="#7C4C8A"
            stroke={ink}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <Path d="M28 16 L38 20" stroke="#F4E6F8" strokeWidth={3} strokeLinecap="round" />
          <Path d="M25 25 L41 30" stroke="#F4E6F8" strokeWidth={3.2} strokeLinecap="round" />
          <Path d="M22 35 L44 41" stroke="#F4E6F8" strokeWidth={3.2} strokeLinecap="round" />
          <Path d="M20 45 L44 49" stroke="#D9B6E4" strokeWidth={2.6} strokeLinecap="round" />
          <Circle cx={32} cy={9} r={2} fill="#F4E6F8" />
        </G>
      )}
    </Svg>
  );
}

const PEARL_THEMES = [
  { body: '#FFF8EA', rim: '#C79E59', sheen: '#FFFFFF', text: '#243238' },
  { body: '#F4FAFD', rim: '#5B9BB5', sheen: '#FFFFFF', text: '#1A3A4A' },
  { body: '#FDF3F0', rim: '#C77A6B', sheen: '#FFFFFF', text: '#42221D' },
  { body: '#F2FAF6', rim: '#4C9A82', sheen: '#FFFFFF', text: '#1B3F35' },
  { body: '#F8F3FC', rim: '#8C6BA8', sheen: '#FFFFFF', text: '#352246' },
  { body: '#FCF8EC', rim: '#B89546', sheen: '#FFFFFF', text: '#3B2D12' },
] as const;

export type PearlTone = 'normal' | 'ruled-out' | 'left' | 'right' | 'picked' | 'hint';

/**
 * Hand-crafted numbered reef pearl with distinct surface lustre, collar ring, and accessible state treatment.
 */
export function PearlArt({
  number,
  size,
  theme = 0,
  tone = 'normal',
}: {
  number: number;
  size: number;
  theme?: number;
  tone?: PearlTone;
}) {
  const palette = PEARL_THEMES[((theme % PEARL_THEMES.length) + PEARL_THEMES.length) % PEARL_THEMES.length];
  const fill =
    tone === 'ruled-out'
      ? '#DDE2E5'
      : tone === 'left'
        ? '#D9EFF8'
        : tone === 'right'
          ? '#FDE4DC'
          : tone === 'picked'
            ? '#FFEAA6'
            : tone === 'hint'
              ? '#FFF5CC'
              : palette.body;
  const stroke =
    tone === 'ruled-out'
      ? '#7C878E'
      : tone === 'left'
        ? '#1F6F94'
        : tone === 'right'
          ? '#C24D32'
          : tone === 'picked'
            ? '#166E62'
            : tone === 'hint'
              ? '#C97B0E'
              : palette.rim;
  const textColor = tone === 'ruled-out' ? '#3E4B52' : palette.text;
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52">
      {/* Hint focus: unmistakable dashed outer halo + corner sparkle ticks (never confuses with Normal!) */}
      {tone === 'hint' && (
        <G>
          <Circle cx={26} cy={26} r={24} fill="none" stroke="#C97B0E" strokeWidth={2.4} strokeDasharray="4.5 3.5" />
          <Line x1={26} y1={0.5} x2={26} y2={4.5} stroke="#C97B0E" strokeWidth={2.2} strokeLinecap="round" />
          <Line x1={26} y1={47.5} x2={26} y2={51.5} stroke="#C97B0E" strokeWidth={2.2} strokeLinecap="round" />
        </G>
      )}
      {/* Picked odd pearl: crisp double outer ring */}
      {tone === 'picked' && (
        <Circle cx={26} cy={26} r={23.5} fill="none" stroke="#166E62" strokeWidth={2.2} />
      )}
      {/* Pearl body */}
      <Circle
        cx={26}
        cy={26}
        r={19.5}
        fill={fill}
        stroke={stroke}
        strokeWidth={tone === 'picked' || tone === 'hint' ? 3 : 2.3}
        strokeDasharray={tone === 'ruled-out' ? '4 3' : undefined}
      />
      {/* Pearlescent crescent sheen */}
      <Path
        d="M14 21 C15 14 21 10 28 11"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={tone === 'ruled-out' ? 0.35 : 0.9}
      />
      <Circle cx={18} cy={15} r={2.2} fill="#FFFFFF" opacity={tone === 'ruled-out' ? 0.3 : 0.95} />
      {/* Bold high-contrast numeral (never crossed out by a slash!) */}
      <SvgText
        x={26}
        y={32}
        textAnchor="middle"
        fontSize={17}
        fontWeight="900"
        fill={textColor}
      >
        {String(number)}
      </SvgText>
      {/* Non-color state badges so every state is distinguishable in grayscale & color-vision deficiency */}
      {tone === 'left' && (
        <G>
          <Rect x={2} y={2} width={15} height={15} rx={5} fill="#1F6F94" stroke="#FFFFFF" strokeWidth={1.5} />
          <SvgText x={9.5} y={13} textAnchor="middle" fontSize={10.5} fontWeight="900" fill="#FFFFFF">L</SvgText>
        </G>
      )}
      {tone === 'right' && (
        <G>
          <Rect x={35} y={2} width={15} height={15} rx={5} fill="#C24D32" stroke="#FFFFFF" strokeWidth={1.5} />
          <SvgText x={42.5} y={13} textAnchor="middle" fontSize={10.5} fontWeight="900" fill="#FFFFFF">R</SvgText>
        </G>
      )}
      {tone === 'picked' && (
        <G>
          <Circle cx={42} cy={10} r={8.5} fill="#166E62" stroke="#FFFFFF" strokeWidth={1.5} />
          <Polygon points="42,4.5 43.7,8.2 47.6,8.7 44.7,11.3 45.5,15.1 42,13.2 38.5,15.1 39.3,11.3 36.4,8.7 40.3,8.2" fill="#FFEAA6" />
        </G>
      )}
      {tone === 'ruled-out' && (
        <G>
          <Circle cx={42} cy={10} r={7.5} fill="#66737A" stroke="#FFFFFF" strokeWidth={1.4} />
          <Line x1={38.8} y1={6.8} x2={45.2} y2={13.2} stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
          <Line x1={45.2} y1={6.8} x2={38.8} y2={13.2} stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
        </G>
      )}
    </Svg>
  );
}

/** Iconic shelf & Cove tile artwork: tipped driftwood balance scale holding a ribbed Coral Scallop & spiral Teal Nautilus. */
export function ShelfArt({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      <Rect x={4} y={4} width={88} height={88} rx={22} fill="#E7F2F4" />
      <Path d="M8 74 Q32 68 48 73 Q66 78 88 72 L88 86 Q88 92 82 92 L14 92 Q8 92 8 86 Z" fill="#C4E2E6" />
      {/* Base & pillar */}
      <Path d="M26 80 Q48 68 70 80 Z" fill={woodMid} stroke={ink} strokeWidth={2.6} strokeLinejoin="round" />
      <Rect x={44} y={24} width={8} height={48} rx={4} fill={woodMid} stroke={ink} strokeWidth={2.6} />
      {/* Tilted beam (left heavy) */}
      <G rotation={-12} origin="48, 26">
        <Rect x={14} y={22} width={68} height={7.5} rx={3.5} fill={woodDark} stroke={ink} strokeWidth={2.4} />
        <Circle cx={18} cy={25.8} r={4} fill={brass} stroke={ink} strokeWidth={2} />
        <Circle cx={78} cy={25.8} r={4} fill={brass} stroke={ink} strokeWidth={2} />
      </G>
      <Circle cx={48} cy={26} r={6.5} fill={brass} stroke={ink} strokeWidth={2.4} />
      {/* Left pan (lower, unmistakable ribbed Coral Scallop fan) */}
      <Line x1={18.5} y1={34} x2={9} y2={56} stroke={woodDark} strokeWidth={2.6} strokeLinecap="round" />
      <Line x1={18.5} y1={34} x2={31} y2={56} stroke={woodDark} strokeWidth={2.6} strokeLinecap="round" />
      <Path
        d="M14 55 L11 50 C8 43 13 36 20 36 C27 36 32 43 29 50 L26 55 Z"
        fill="#D95338"
        stroke={ink}
        strokeWidth={2.3}
        strokeLinejoin="round"
      />
      <Line x1={20} y1={54} x2={20} y2={38} stroke="#FFF2E2" strokeWidth={2} strokeLinecap="round" />
      <Line x1={19} y1={54} x2={14} y2={41} stroke="#FFF2E2" strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={21} y1={54} x2={26} y2={41} stroke="#FFF2E2" strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M7 55 L33 55 Q30 66 20 66 Q10 66 7 55 Z" fill={panGold} stroke={ink} strokeWidth={2.3} strokeLinejoin="round" />
      {/* Right pan (higher, unmistakable spiral Teal Nautilus) */}
      <Line x1={77.5} y1={21} x2={66} y2={43} stroke={woodDark} strokeWidth={2.6} strokeLinecap="round" />
      <Line x1={77.5} y1={21} x2={88} y2={43} stroke={woodDark} strokeWidth={2.6} strokeLinecap="round" />
      <Path
        d="M76 24 C69 24 65 29 65 35 C65 40 69 43 75 43 L85 43 L83 37 C85 34 85 29 82 26 C80 24.5 78 24 76 24 Z"
        fill="#1E7B71"
        stroke={ink}
        strokeWidth={2.3}
        strokeLinejoin="round"
      />
      <Path
        d="M75 35 C75 31.5 79 31.5 79 35 C79 38.5 72.5 39 71.5 34.5 C70.5 29.5 77 28 80.5 31"
        fill="none"
        stroke="#E8F6F2"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <Path d="M64 43 L90 43 Q87 54 77 54 Q67 54 64 43 Z" fill={panGold} stroke={ink} strokeWidth={2.3} strokeLinejoin="round" />
    </Svg>
  );
}
