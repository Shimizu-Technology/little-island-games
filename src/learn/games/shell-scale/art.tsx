import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { SHELL_META, type ScaleOutcome } from './rules';

export const ink = '#243238';
const woodDark = '#6B462B';
const woodMid = '#A67247';
const woodLight = '#D7A876';
const brass = '#D99E32';
const brassLight = '#F6D67B';
const panGold = '#E4BA66';
const panRim = '#9B6C2F';

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
        /* 3: Teal Nautilus — round chambered spiral shell */
        <G>
          <Circle cx={32} cy={33} r={22} fill="#1F7A70" stroke={ink} strokeWidth={2.5} />
          <Circle cx={34} cy={35} r={16} fill="#E8F4EF" stroke={ink} strokeWidth={2} />
          <Path
            d="M34 35 C34 30 40 30 40 35 C40 42 29 43 27 35 C25 24 39 20 46 28"
            fill="none"
            stroke="#1F7A70"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Line x1={32} y1={11} x2={34} y2={22} stroke="#A8DDD4" strokeWidth={2.2} strokeLinecap="round" />
          <Line x1={18} y1={18} x2={25} y2={26} stroke="#A8DDD4" strokeWidth={2.2} strokeLinecap="round" />
          <Line x1={11} y1={32} x2={20} y2={34} stroke="#A8DDD4" strokeWidth={2.2} strokeLinecap="round" />
          <Line x1={17} y1={46} x2={25} y2={42} stroke="#A8DDD4" strokeWidth={2.2} strokeLinecap="round" />
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
  const fill = tone === 'ruled-out' ? '#D6D9DB' : tone === 'left' ? '#D9EFF8' : tone === 'right' ? '#FDE4DC' : tone === 'picked' ? '#FFF0C2' : palette.body;
  const stroke = tone === 'ruled-out' ? '#8A9499' : tone === 'left' ? '#247396' : tone === 'right' ? '#C75438' : tone === 'picked' ? '#1E7A6E' : tone === 'hint' ? '#D69A1F' : palette.rim;
  const textColor = tone === 'ruled-out' ? '#5E686D' : palette.text;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={20} fill={fill} stroke={stroke} strokeWidth={tone === 'picked' || tone === 'hint' ? 3.2 : 2.4} />
      <Circle cx={24} cy={24} r={16} fill="none" stroke={palette.sheen} strokeWidth={1.6} opacity={tone === 'ruled-out' ? 0.25 : 0.7} />
      <Ellipse cx={17} cy={14} rx={5.5} ry={3.2} fill="#FFFFFF" opacity={tone === 'ruled-out' ? 0.25 : 0.85} />
      <SvgText
        x={24}
        y={29.5}
        textAnchor="middle"
        fontSize={16}
        fontWeight="800"
        fill={textColor}
      >
        {String(number)}
      </SvgText>
      {tone === 'ruled-out' && (
        <Line x1={12} y1={36} x2={36} y2={12} stroke="#7A868C" strokeWidth={2.2} strokeLinecap="round" opacity={0.65} />
      )}
    </Svg>
  );
}

/**
 * Hand-crafted original animated Balance Scale!
 * Animates ONLY via UI-thread Reanimated transforms (`rotate` on the beam, `translateY` on the level pans)
 * around static SVG art — 60 fps and zero per-frame SVG path repainting.
 */
export function BalanceScale({
  width,
  height,
  outcome,
  weighCount,
  reduced,
  leftContent,
  rightContent,
  leftLabel,
  rightLabel,
}: {
  width: number;
  height: number;
  outcome: ScaleOutcome | null;
  weighCount: number;
  reduced: boolean;
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  leftLabel?: string;
  rightLabel?: string;
}) {
  const tilt = useSharedValue(0);
  const targetDeg = outcome === 'L' ? -12 : outcome === 'R' ? 12 : 0;

  useEffect(() => {
    if (reduced) {
      tilt.set(targetDeg);
      return;
    }
    if (outcome === '=' && weighCount > 0) {
      tilt.set(
        withSequence(
          withTiming(-4, { duration: 110, easing: Easing.inOut(Easing.quad) }),
          withTiming(3, { duration: 110, easing: Easing.inOut(Easing.quad) }),
          withSpring(0, { damping: 12, stiffness: 200 }),
        ),
      );
    } else if (outcome === 'L' || outcome === 'R') {
      tilt.set(withSpring(targetDeg, { damping: 11, stiffness: 140, mass: 0.9 }));
    } else {
      tilt.set(withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) }));
    }
  }, [outcome, weighCount, reduced, targetDeg, tilt]);

  const armHalf = Math.min(width * 0.34, 128);
  const panW = Math.min(Math.max(width * 0.34, 96), 148);
  const panH = Math.min(Math.max(height * 0.36, 56), 80);
  const pivotY = Math.round(height * 0.24);
  const panRestY = pivotY;
  const radFactor = Math.PI / 180;

  const beamStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${tilt.get()}deg` }],
  }));
  const leftPanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.sin(tilt.get() * radFactor) * armHalf }],
  }));
  const rightPanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.sin(tilt.get() * radFactor) * armHalf }],
  }));

  const beamW = armHalf * 2 + 28;
  const centerX = width / 2;

  return (
    <View style={{ width, height, alignSelf: 'center', position: 'relative' }}>
      {/* Static driftwood base & pillar */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Soft reef sand halo under scale */}
          <Ellipse cx={centerX} cy={height - 10} rx={Math.min(width * 0.42, 165)} ry={8} fill="#DFCFAF" opacity={0.75} />
          {/* Carved wooden base */}
          <Path
            d={`M${centerX - 58} ${height - 10} Q${centerX} ${height - 28} ${centerX + 58} ${height - 10} Z`}
            fill={woodMid}
            stroke={ink}
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
          <Path
            d={`M${centerX - 42} ${height - 13} Q${centerX} ${height - 22} ${centerX + 42} ${height - 13}`}
            fill="none"
            stroke={woodLight}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          {/* Vertical driftwood pillar */}
          <Rect
            x={centerX - 7}
            y={pivotY}
            width={14}
            height={Math.max(24, height - pivotY - 16)}
            rx={6}
            fill={woodMid}
            stroke={ink}
            strokeWidth={2.4}
          />
          <Line x1={centerX - 2} y1={pivotY + 10} x2={centerX - 2} y2={height - 24} stroke={woodLight} strokeWidth={2} strokeLinecap="round" />
          {/* Fulcrum medallion */}
          <Circle cx={centerX} cy={pivotY} r={10} fill={brass} stroke={ink} strokeWidth={2.4} />
          <Circle cx={centerX} cy={pivotY} r={4} fill={brassLight} />
        </Svg>
      </View>

      {/* Rotating balance beam (UI thread transform) */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: centerX - beamW / 2,
            top: pivotY - 14,
            width: beamW,
            height: 28,
          },
          beamStyle,
        ]}
      >
        <Svg width={beamW} height={28} viewBox={`0 0 ${beamW} 28`}>
          <Rect x={8} y={10} width={beamW - 16} height={8} rx={4} fill={woodDark} stroke={ink} strokeWidth={2.2} />
          <Line x1={18} y1={13} x2={beamW - 18} y2={13} stroke={woodLight} strokeWidth={1.8} strokeLinecap="round" />
          {/* Center pointer needle */}
          <Polygon points={`${beamW / 2},1 ${beamW / 2 - 5},11 ${beamW / 2 + 5},11`} fill={brass} stroke={ink} strokeWidth={1.8} />
          {/* End hooks */}
          <Circle cx={14} cy={14} r={5} fill={brass} stroke={ink} strokeWidth={2} />
          <Circle cx={beamW - 14} cy={14} r={5} fill={brass} stroke={ink} strokeWidth={2} />
        </Svg>
      </Animated.View>

      {/* Left hanging pan (stays level, translates vertically with tilt) */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: Math.max(2, centerX - armHalf - panW / 2),
            top: panRestY,
            width: panW,
            height: panH + 22,
            alignItems: 'center',
          },
          leftPanStyle,
        ]}
      >
        <View pointerEvents="none" style={{ width: panW, height: 22 }}>
          <Svg width={panW} height={22} viewBox={`0 0 ${panW} 22`}>
            <Line x1={panW / 2} y1={0} x2={14} y2={22} stroke={panRim} strokeWidth={2} />
            <Line x1={panW / 2} y1={0} x2={panW - 14} y2={22} stroke={panRim} strokeWidth={2} />
          </Svg>
        </View>
        <View style={{ width: panW, height: panH, alignItems: 'center', justifyContent: 'flex-end', position: 'relative' }}>
          <View style={{ zIndex: 2, width: panW - 10, minHeight: panH - 14, alignItems: 'center', justifyContent: 'center', paddingBottom: 8 }}>
            {leftContent}
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, width: panW, height: 24 }}>
            <Svg width={panW} height={24} viewBox={`0 0 ${panW} 24`}>
              <Path d={`M4 4 L${panW - 4} 4 Q${panW - 10} 22 ${panW / 2} 22 Q10 22 4 4 Z`} fill={panGold} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
              <Line x1={12} y1={9} x2={panW - 12} y2={9} stroke="#FFF5D6" strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </View>
        </View>
        {!!leftLabel && (
          <View pointerEvents="none" style={{ marginTop: 1 }}>
            <Svg width={panW} height={14} viewBox={`0 0 ${panW} 14`}>
              <SvgText x={panW / 2} y={11} textAnchor="middle" fontSize={10} fontWeight="800" fill={ink}>
                {leftLabel}
              </SvgText>
            </Svg>
          </View>
        )}
      </Animated.View>

      {/* Right hanging pan (stays level, translates vertically with tilt) */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: Math.min(width - panW - 2, centerX + armHalf - panW / 2),
            top: panRestY,
            width: panW,
            height: panH + 22,
            alignItems: 'center',
          },
          rightPanStyle,
        ]}
      >
        <View pointerEvents="none" style={{ width: panW, height: 22 }}>
          <Svg width={panW} height={22} viewBox={`0 0 ${panW} 22`}>
            <Line x1={panW / 2} y1={0} x2={14} y2={22} stroke={panRim} strokeWidth={2} />
            <Line x1={panW / 2} y1={0} x2={panW - 14} y2={22} stroke={panRim} strokeWidth={2} />
          </Svg>
        </View>
        <View style={{ width: panW, height: panH, alignItems: 'center', justifyContent: 'flex-end', position: 'relative' }}>
          <View style={{ zIndex: 2, width: panW - 10, minHeight: panH - 14, alignItems: 'center', justifyContent: 'center', paddingBottom: 8 }}>
            {rightContent}
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, width: panW, height: 24 }}>
            <Svg width={panW} height={24} viewBox={`0 0 ${panW} 24`}>
              <Path d={`M4 4 L${panW - 4} 4 Q${panW - 10} 22 ${panW / 2} 22 Q10 22 4 4 Z`} fill={panGold} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
              <Line x1={12} y1={9} x2={panW - 12} y2={9} stroke="#FFF5D6" strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </View>
        </View>
        {!!rightLabel && (
          <View pointerEvents="none" style={{ marginTop: 1 }}>
            <Svg width={panW} height={14} viewBox={`0 0 ${panW} 14`}>
              <SvgText x={panW / 2} y={11} textAnchor="middle" fontSize={10} fontWeight="800" fill={ink}>
                {rightLabel}
              </SvgText>
            </Svg>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

/** Iconic shelf & Cove tile artwork: tipped driftwood balance scale holding a Coral Cowrie & Lagoon Scallop. */
export function ShelfArt({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      <Rect x={4} y={4} width={88} height={88} rx={22} fill="#E7F2F4" />
      <Path d="M8 74 Q32 68 48 73 Q66 78 88 72 L88 86 Q88 92 82 92 L14 92 Q8 92 8 86 Z" fill="#C4E2E6" />
      {/* Base & pillar */}
      <Path d="M26 78 Q48 66 70 78 Z" fill={woodMid} stroke={ink} strokeWidth={2.5} strokeLinejoin="round" />
      <Rect x={44} y={26} width={8} height={46} rx={4} fill={woodMid} stroke={ink} strokeWidth={2.5} />
      {/* Tilted beam (left heavy) */}
      <G rotation={-11} origin="48, 28">
        <Rect x={14} y={24} width={68} height={7} rx={3.5} fill={woodDark} stroke={ink} strokeWidth={2.4} />
        <Circle cx={18} cy={27.5} r={4} fill={brass} stroke={ink} strokeWidth={2} />
        <Circle cx={78} cy={27.5} r={4} fill={brass} stroke={ink} strokeWidth={2} />
      </G>
      <Circle cx={48} cy={28} r={6.5} fill={brass} stroke={ink} strokeWidth={2.4} />
      {/* Left pan (lower, Coral Cowrie) */}
      <Line x1={19} y1={34} x2={12} y2={52} stroke={panRim} strokeWidth={2} />
      <Line x1={19} y1={34} x2={27} y2={52} stroke={panRim} strokeWidth={2} />
      <Ellipse cx={19.5} cy={47} rx={10} ry={7.5} fill="#E06B4F" stroke={ink} strokeWidth={2} />
      <Path d="M12 47 Q19.5 44 27 47" stroke="#FFF4E4" strokeWidth={2} fill="none" />
      <Path d="M7 52 L32 52 Q29 63 19.5 63 Q10 63 7 52 Z" fill={panGold} stroke={ink} strokeWidth={2.2} />
      {/* Right pan (higher, Lagoon Scallop) */}
      <Line x1={77} y1={22} x2={69} y2={40} stroke={panRim} strokeWidth={2} />
      <Line x1={77} y1={22} x2={85} y2={40} stroke={panRim} strokeWidth={2} />
      <Path d="M70 39 C68 31 73 27 77 27 C81 27 86 31 84 39 Z" fill="#2D85A8" stroke={ink} strokeWidth={2} />
      <Path d="M64 40 L89 40 Q86 51 76.5 51 Q67 51 64 40 Z" fill={panGold} stroke={ink} strokeWidth={2.2} />
    </Svg>
  );
}
