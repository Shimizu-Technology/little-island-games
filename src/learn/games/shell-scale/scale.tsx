import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { ink, palette } from './art';
import type { ScaleOutcome } from './rules';

/**
 * Hand-crafted original animated Balance Scale!
 * Kept in its own module so `art.tsx` (used by Home/Cove/School shelf tiles) stays pure SVG
 * with zero `react-native-reanimated` dependency.
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
  const { woodDark, woodMid, woodLight, brass, brassLight, panGold, panRim } = palette;
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
  const panW = Math.min(Math.max(width * 0.36, 102), 156);
  const panH = Math.min(Math.max(height * 0.38, 60), 84);
  const pivotY = Math.round(height * 0.23);
  const panRestY = pivotY + 5;
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
      {/* Static driftwood base, pillar & level-balance reference tick */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Ellipse cx={centerX} cy={height - 10} rx={Math.min(width * 0.42, 165)} ry={8} fill="#DFCFAF" opacity={0.75} />
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
          <Line x1={centerX} y1={Math.max(2, pivotY - 21)} x2={centerX} y2={Math.max(7, pivotY - 14)} stroke={panRim} strokeWidth={2.2} strokeLinecap="round" />
          <Circle cx={centerX} cy={pivotY} r={10} fill={brass} stroke={ink} strokeWidth={2.4} />
          <Circle cx={centerX} cy={pivotY} r={4} fill={brassLight} />
        </Svg>
      </View>

      {/* Rotating balance beam (UI thread transform) with underside hanging eyelets */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: centerX - beamW / 2,
            top: pivotY - 14,
            width: beamW,
            height: 32,
          },
          beamStyle,
        ]}
      >
        <Svg width={beamW} height={32} viewBox={`0 0 ${beamW} 32`}>
          <Rect x={8} y={10} width={beamW - 16} height={8} rx={4} fill={woodDark} stroke={ink} strokeWidth={2.2} />
          <Line x1={18} y1={13} x2={beamW - 18} y2={13} stroke={woodLight} strokeWidth={1.8} strokeLinecap="round" />
          <Polygon points={`${beamW / 2},1 ${beamW / 2 - 5},11 ${beamW / 2 + 5},11`} fill={brass} stroke={ink} strokeWidth={1.8} />
          <Circle cx={14} cy={19} r={3.8} fill="none" stroke={panRim} strokeWidth={2.2} />
          <Circle cx={beamW - 14} cy={19} r={3.8} fill="none" stroke={panRim} strokeWidth={2.2} />
          <Circle cx={14} cy={14} r={4.8} fill={brass} stroke={ink} strokeWidth={2} />
          <Circle cx={beamW - 14} cy={14} r={4.8} fill={brass} stroke={ink} strokeWidth={2} />
        </Svg>
      </Animated.View>

      {/* Left hanging pan */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: Math.max(2, centerX - armHalf - panW / 2),
            top: panRestY,
            width: panW,
            height: panH + 26,
            alignItems: 'center',
          },
          leftPanStyle,
        ]}
      >
        <View pointerEvents="none" style={{ width: panW, height: 26 }}>
          <Svg width={panW} height={26} viewBox={`0 0 ${panW} 26`}>
            <Line x1={panW / 2} y1={0} x2={9} y2={26} stroke={panRim} strokeWidth={2.2} />
            <Line x1={panW / 2} y1={0} x2={panW - 9} y2={26} stroke={panRim} strokeWidth={2.2} />
          </Svg>
        </View>
        <View style={{ width: panW, height: panH, alignItems: 'center', justifyContent: 'flex-end', position: 'relative' }}>
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 14, left: 4, width: panW - 8, height: 12, zIndex: 1 }}>
            <Svg width={panW - 8} height={12} viewBox={`0 0 ${panW - 8} 12`}>
              <Ellipse cx={(panW - 8) / 2} cy={7} rx={(panW - 12) / 2} ry={5} fill="#C69745" stroke={ink} strokeWidth={1.8} />
            </Svg>
          </View>
          <View style={{ zIndex: 2, width: panW - 14, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 15 }}>
            {leftContent}
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, width: panW, height: 22, zIndex: 3 }}>
            <Svg width={panW} height={22} viewBox={`0 0 ${panW} 22`}>
              <Path d={`M4 2 L${panW - 4} 2 Q${panW - 10} 20 ${panW / 2} 20 Q10 20 4 2 Z`} fill={panGold} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
              <Line x1={12} y1={7} x2={panW - 12} y2={7} stroke="#FFF5D6" strokeWidth={2} strokeLinecap="round" />
              <SvgText x={panW / 2} y={16.5} textAnchor="middle" fontSize={9.5} fontWeight="900" fill={woodDark}>
                {leftLabel ?? 'LEFT'}
              </SvgText>
            </Svg>
          </View>
        </View>
      </Animated.View>

      {/* Right hanging pan */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: Math.min(width - panW - 2, centerX + armHalf - panW / 2),
            top: panRestY,
            width: panW,
            height: panH + 26,
            alignItems: 'center',
          },
          rightPanStyle,
        ]}
      >
        <View pointerEvents="none" style={{ width: panW, height: 26 }}>
          <Svg width={panW} height={26} viewBox={`0 0 ${panW} 26`}>
            <Line x1={panW / 2} y1={0} x2={9} y2={26} stroke={panRim} strokeWidth={2.2} />
            <Line x1={panW / 2} y1={0} x2={panW - 9} y2={26} stroke={panRim} strokeWidth={2.2} />
          </Svg>
        </View>
        <View style={{ width: panW, height: panH, alignItems: 'center', justifyContent: 'flex-end', position: 'relative' }}>
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 14, left: 4, width: panW - 8, height: 12, zIndex: 1 }}>
            <Svg width={panW - 8} height={12} viewBox={`0 0 ${panW - 8} 12`}>
              <Ellipse cx={(panW - 8) / 2} cy={7} rx={(panW - 12) / 2} ry={5} fill="#C69745" stroke={ink} strokeWidth={1.8} />
            </Svg>
          </View>
          <View style={{ zIndex: 2, width: panW - 14, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 15 }}>
            {rightContent}
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, width: panW, height: 22, zIndex: 3 }}>
            <Svg width={panW} height={22} viewBox={`0 0 ${panW} 22`}>
              <Path d={`M4 2 L${panW - 4} 2 Q${panW - 10} 20 ${panW / 2} 20 Q10 20 4 2 Z`} fill={panGold} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
              <Line x1={12} y1={7} x2={panW - 12} y2={7} stroke="#FFF5D6" strokeWidth={2} strokeLinecap="round" />
              <SvgText x={panW / 2} y={16.5} textAnchor="middle" fontSize={9.5} fontWeight="900" fill={woodDark}>
                {rightLabel ?? 'RIGHT'}
              </SvgText>
            </Svg>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
