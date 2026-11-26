import React, { memo } from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { ALL_SHELL_CODES, shellOf, type ColorIdx, type RulePictureSpec, type ShellCode, type SizeIdx } from './rules';
export { ALL_SHELL_CODES };

/**
 * Gate Crab original vector art (PX-03).
 * Every shell differs in colour, silhouette AND surface marking, plus clear Small vs Big scale,
 * so colourblind players and small phones distinguish every feature at a glance.
 * Drawn on clean 100x100 / 260x140 boxes with the house ink outline (#20474A).
 */
export const ink = '#20474A';
const line = { stroke: ink, strokeWidth: 3.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const hide = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

export const SHELL_PALETTE: Record<ColorIdx, { main: string; light: string; dark: string; accent: string }> = {
  0: { main: '#E5614B', light: '#FFD8CC', dark: '#9C3220', accent: '#FFF2EC' }, // Coral scallop
  1: { main: '#2E82CB', light: '#CFEAFF', dark: '#174A7A', accent: '#EAF6FF' }, // Lagoon blue nautilus
  2: { main: '#E9B024', light: '#FFF2BD', dark: '#9A6808', accent: '#FFF9DF' }, // Island gold crown conch
};

/** Coral Scallop: fluted fan shell with prominent scalloped top rim, hinge tabs, and bold radiating ribs. */
function ScallopBody({ col = 0 as ColorIdx }: { col?: ColorIdx }) {
  const p = SHELL_PALETTE[col];
  return <>
    <Ellipse cx="50" cy="91" rx="28" ry="5.5" fill="#1C4A4C" opacity={0.16} />
    {/* Prominent hinge ears at bottom for crisp 34px silhouette */}
    <Path d="M32 74 L18 85 L43 85 Z M68 74 L82 85 L57 85 Z" fill={p.dark} {...line} strokeWidth={2.8} />
    {/* Scalloped fan silhouette */}
    <Path
      d="M50 84 C31 84 12 69 10 46 C9 35 16 25 23 24 C27 15 37 12 43 16 C47 9 53 9 57 16 C63 12 73 15 77 24 C84 25 91 35 90 46 C88 69 69 84 50 84 Z"
      fill={p.main}
      {...line}
    />
    {/* Warm inner fan sheen */}
    <Path d="M21 44 C25 29 38 20 50 20 C62 20 75 29 79 44 C68 37 32 37 21 44 Z" fill={p.light} opacity={0.7} />
    {/* Bold radiating ribs (high-contrast at 34px grayscale) */}
    <G stroke={p.dark} strokeWidth={4} strokeLinecap="round" fill="none">
      <Path d="M50 80 L50 18" />
      <Path d="M46 80 L30 24" />
      <Path d="M54 80 L70 24" />
      <Path d="M42 79 L17 41" />
      <Path d="M58 79 L83 41" />
    </G>
    <Circle cx="36" cy="33" r="3.6" fill={p.accent} opacity={0.9} />
  </>;
}

/** Blue Nautilus: rounded coiled spiral shell with thick bold inward whirl and bright pearl center. */
function NautilusBody({ col = 1 as ColorIdx }: { col?: ColorIdx }) {
  const p = SHELL_PALETTE[col];
  return <>
    <Ellipse cx="50" cy="91" rx="28" ry="5.5" fill="#1C4A4C" opacity={0.16} />
    <Path
      d="M52 13 C76 13 89 30 89 52 C89 73 72 87 50 87 C28 87 13 73 13 52 C13 33 27 17 45 14 C48 13 50 13 52 13 Z"
      fill={p.main}
      {...line}
    />
    <Path d="M25 36 C32 23 46 19 61 21 C48 25 36 33 28 46 Z" fill={p.light} opacity={0.78} />
    {/* Thick crisp white + dark double-contrast spiral so 34px grayscale stays unmistakable */}
    <Path
      d="M84 52 C82 70 67 80 50 80 C34 80 22 68 22 52 C22 37 34 25 49 25 C61 25 71 35 71 47 C71 57 62 65 52 65 C43 65 37 58 37 50 C37 44 43 39 49 39 C54 39 58 44 56 49"
      fill="none"
      stroke={p.light}
      strokeWidth={7}
      strokeLinecap="round"
      opacity={0.7}
    />
    <Path
      d="M84 52 C82 70 67 80 50 80 C34 80 22 68 22 52 C22 37 34 25 49 25 C61 25 71 35 71 47 C71 57 62 65 52 65 C43 65 37 58 37 50 C37 44 43 39 49 39 C54 39 58 44 56 49"
      fill="none"
      stroke={p.dark}
      strokeWidth={4.4}
      strokeLinecap="round"
    />
    <Circle cx="51" cy="49" r="4.8" fill={p.accent} stroke={ink} strokeWidth={2.2} />
  </>;
}

/** Gold Crown Conch: tall pointed 3-spire crown with bold horizontal chevron bands. */
function ConchBody({ col = 2 as ColorIdx }: { col?: ColorIdx }) {
  const p = SHELL_PALETTE[col];
  return <>
    <Ellipse cx="50" cy="91" rx="24" ry="5" fill="#1C4A4C" opacity={0.16} />
    <Path
      d="M50 9 L62 27 L77 21 L72 39 L85 44 L73 62 C68 74 59 86 50 88 C41 86 32 74 27 62 L15 44 L28 39 L23 21 L38 27 Z"
      fill={p.main}
      {...line}
    />
    <Path d="M50 15 L58 30 L42 30 Z" fill={p.light} opacity={0.88} />
    <G stroke={p.dark} strokeWidth={3.8} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <Path d="M26 44 L50 36 L74 44" />
      <Path d="M28 58 L50 50 L72 58" />
      <Path d="M35 71 L50 65 L65 71" />
    </G>
    <Path d="M50 27 L55 34 L50 41 L45 34 Z" fill={p.accent} stroke={p.dark} strokeWidth={2} />
  </>;
}

/** Colour-neutral token silhouette for size-only rules (never matches Coral fan, Blue spiral, or Gold crown). */
function NeutralShellBody({ big = 1 as SizeIdx }: { big?: SizeIdx }) {
  return <>
    <Rect
      x="14"
      y="14"
      width="72"
      height="72"
      rx="20"
      fill={big ? '#D3E1DF' : '#DCE7E5'}
      stroke={ink}
      strokeWidth={5.2}
    />
    <SvgText
      x="50"
      y="67"
      fontSize="46"
      fontWeight="900"
      fill={ink}
      textAnchor="middle"
    >
      ?
    </SvgText>
  </>;
}

/** One Gate Crab shell piece: dramatic Small (0.6x + dashed ring) vs BIG (0.96x + bold sparkles). */
export const ShellArt = memo(function ShellArt({ code, size = 56 }: { code: ShellCode; size?: number }) {
  const { col, big } = shellOf(code);
  const scale = big ? 0.94 : 0.6;
  const offset = ((1 - scale) * 100) / 2;
  const yNudge = big ? 2 : 11;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" {...hide}>
      {!big && (
        <Circle cx="50" cy="61" r="34" fill="none" stroke="#6E8D8B" strokeWidth={3.2} strokeDasharray="6 5" opacity={0.75} />
      )}
      {big && (
        <G>
          <Path d="M12 18 L16 6 L20 18 L32 22 L20 26 L16 38 L12 26 L0 22 Z" fill="#FFD24A" stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
          <Path d="M84 14 L87 5 L90 14 L99 17 L90 20 L87 29 L84 20 L75 17 Z" fill="#FFD24A" stroke={ink} strokeWidth={2} strokeLinejoin="round" />
        </G>
      )}
      <G transform={`translate(${offset}, ${offset + yNudge}) scale(${scale})`}>
        {col === 0 ? <ScallopBody col={0} /> : col === 1 ? <NautilusBody col={1} /> : <ConchBody col={2} />}
      </G>
    </Svg>
  );
});

export type GateMood = 'idle' | 'pass' | 'block';

/**
 * The Gate Crab guardian standing in front of an island bamboo-and-driftwood reef gate.
 * The gate & crossbar sit cleanly BEHIND the crab in every pose, and the crab raises its claws
 * distinctly for Idle (ready), PASS (cheering wide open), and BLOCK (friendly crossed/bracing claws).
 */
export const GateCrabArt = memo(function GateCrabArt({ mood = 'idle', width = 260, height = 136 }: { mood?: GateMood; width?: number; height?: number }) {
  const open = mood === 'pass';
  const shut = mood === 'block';
  return (
    <Svg width={width} height={height} viewBox="0 0 260 140" {...hide}>
      {/* Lagoon sky backdrop + inset sandy cove */}
      <Rect x="4" y="8" width="252" height="124" rx="24" fill={open ? '#DFF4E8' : shut ? '#FCE9E2' : '#E7F3F4'} stroke={open ? '#2E8B57' : shut ? '#C95A42' : '#6FA4A7'} strokeWidth={2.5} />
      <Path d="M12 104 Q70 95 130 104 Q190 113 248 103 L248 118 Q248 128 236 128 L24 128 Q12 128 12 118 Z" fill="#F2DFBA" />
      <Path d="M12 104 Q70 95 130 104 Q190 113 248 103" fill="none" stroke="#D1B27E" strokeWidth={2.2} strokeLinecap="round" />

      {/* Background bamboo gate posts & arch beam */}
      <G>
        <Rect x="32" y="22" width="18" height="92" rx="8" fill="#B98448" {...line} strokeWidth={2.6} />
        <Line x1="33" y1="50" x2="49" y2="50" stroke="#805528" strokeWidth={2.4} />
        <Line x1="33" y1="80" x2="49" y2="80" stroke="#805528" strokeWidth={2.4} />
        <Rect x="210" y="22" width="18" height="92" rx="8" fill="#B98448" {...line} strokeWidth={2.6} />
        <Line x1="211" y1="50" x2="227" y2="50" stroke="#805528" strokeWidth={2.4} />
        <Line x1="211" y1="80" x2="227" y2="80" stroke="#805528" strokeWidth={2.4} />
        <Rect x="24" y="16" width="212" height="16" rx="8" fill="#C99457" {...line} strokeWidth={2.6} />
        <Path d="M30 30 L52 18 M30 18 L52 30 M208 30 L230 18 M208 18 L230 30" stroke="#E8C98F" strokeWidth={3} strokeLinecap="round" />
      </G>

      {/* Gate doors — strictly BEHIND the crab */}
      {open ? (
        <G>
          <Path d="M58 108 L70 36 L190 36 L202 108 Z" fill="#FFF7D4" opacity={0.82} />
          <Path d="M50 38 L76 46 L76 100 L50 108 Z" fill="#D9A86C" {...line} strokeWidth={2.5} />
          <Path d="M210 38 L184 46 L184 100 L210 108 Z" fill="#D9A86C" {...line} strokeWidth={2.5} />
          <Circle cx="130" cy="24" r="12" fill="#2E8B57" stroke="#FFFDF6" strokeWidth={2.4} />
          <Path d="M124 24 L128.5 28.5 L136.5 19.5" fill="none" stroke="#FFFDF6" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </G>
      ) : shut ? (
        <G>
          <Rect x="50" y="38" width="78" height="66" rx="6" fill="#C99457" {...line} strokeWidth={2.5} />
          <Rect x="132" y="38" width="78" height="66" rx="6" fill="#C99457" {...line} strokeWidth={2.5} />
          <Line x1="66" y1="40" x2="66" y2="102" stroke="#8A5C2B" strokeWidth={2.4} />
          <Line x1="86" y1="40" x2="86" y2="102" stroke="#8A5C2B" strokeWidth={2.4} />
          <Line x1="106" y1="40" x2="106" y2="102" stroke="#8A5C2B" strokeWidth={2.4} />
          <Line x1="154" y1="40" x2="154" y2="102" stroke="#8A5C2B" strokeWidth={2.4} />
          <Line x1="174" y1="40" x2="174" y2="102" stroke="#8A5C2B" strokeWidth={2.4} />
          <Line x1="194" y1="40" x2="194" y2="102" stroke="#8A5C2B" strokeWidth={2.4} />
          {/* Latch bar sits cleanly high on the door behind the crab */}
          <Rect x="56" y="48" width="148" height="9" rx="4.5" fill="#A67139" {...line} strokeWidth={2.2} />
          <Circle cx="130" cy="24" r="12" fill="#C95A42" stroke="#FFFDF6" strokeWidth={2.4} />
          <Path d="M125 19 L135 29 M135 19 L125 29" fill="none" stroke="#FFFDF6" strokeWidth={3} strokeLinecap="round" />
        </G>
      ) : (
        <G>
          {/* Half-ajar doors so Idle -> wide-open PASS -> shut BLOCK reads at a glance */}
          <Path d="M50 38 L98 46 L98 100 L50 106 Z" fill="#D5A367" {...line} strokeWidth={2.4} opacity={0.94} />
          <Path d="M210 38 L162 46 L162 100 L210 106 Z" fill="#D5A367" {...line} strokeWidth={2.4} opacity={0.94} />
          <Circle cx="130" cy="24" r="11" fill="#F2B830" stroke={ink} strokeWidth={2.2} />
          <Circle cx="130" cy="24" r="4.5" fill="#FFFDF6" />
        </G>
      )}

      {/* The Gate Crab Guardian — cleanly in the FOREGROUND in every pose */}
      <G transform={open ? 'translate(130, 84) scale(0.92)' : 'translate(130, 89) scale(0.92)'}>
        <Ellipse cx="0" cy="34" rx="34" ry="6" fill="#1C4A4C" opacity={0.2} />
        {/* Legs */}
        <G stroke="#A63A28" strokeWidth={5.5} strokeLinecap="round" fill="none">
          <Path d="M-24 18 Q-38 20 -42 32" />
          <Path d="M-26 10 Q-42 8 -46 20" />
          <Path d="M24 18 Q38 20 42 32" />
          <Path d="M26 10 Q42 8 46 20" />
        </G>
        {/* Claws — prominent and expressive in ALL three poses */}
        {open ? (
          <>
            <Path d="M-26 4 Q-46 -12 -42 -30 Q-34 -34 -29 -24 Q-25 -36 -17 -32 Q-10 -20 -18 -6 Z" fill="#E85E48" {...line} strokeWidth={2.8} />
            <Path d="M26 4 Q46 -12 42 -30 Q34 -34 29 -24 Q25 -36 17 -32 Q10 -20 18 -6 Z" fill="#E85E48" {...line} strokeWidth={2.8} />
          </>
        ) : shut ? (
          <>
            {/* Raised bracing "halt / stop" guardian claws clearly visible beside the shell */}
            <Path d="M-28 6 Q-48 2 -48 -14 Q-42 -22 -34 -14 Q-32 -24 -24 -18 Q-18 -8 -22 4 Z" fill="#E85E48" {...line} strokeWidth={2.8} />
            <Path d="M28 6 Q48 2 48 -14 Q42 -22 34 -14 Q32 -24 24 -18 Q18 -8 22 4 Z" fill="#E85E48" {...line} strokeWidth={2.8} />
          </>
        ) : (
          <>
            <Path d="M-26 4 Q-42 -4 -40 -18 Q-34 -24 -28 -16 Q-26 -24 -19 -20 Q-14 -12 -20 0 Z" fill="#E85E48" {...line} strokeWidth={2.8} />
            <Path d="M26 4 Q42 -4 40 -18 Q34 -24 28 -16 Q26 -24 19 -20 Q14 -12 20 0 Z" fill="#E85E48" {...line} strokeWidth={2.8} />
          </>
        )}
        {/* Crab shell body */}
        <Path d="M0 -14 C24 -14 34 0 32 14 C30 28 16 32 0 32 C-16 32 -30 28 -32 14 C-34 0 -24 -14 0 -14 Z" fill="#E85E48" {...line} strokeWidth={3} />
        <Path d="M-18 0 Q-8 -8 6 -7" fill="none" stroke="#FFDED2" strokeWidth={4} strokeLinecap="round" opacity={0.75} />
        <Path d="M-14 22 Q0 29 14 22 L0 31 Z" fill="#2E82CB" stroke={ink} strokeWidth={2} />
        {/* Eye stalks & expressive eyes */}
        <Path d="M-10 -12 V-23 M10 -12 V-23" stroke={ink} strokeWidth={3.4} strokeLinecap="round" />
        <Circle cx="-10" cy="-25" r="7.5" fill="#FFFDF6" stroke={ink} strokeWidth={2.4} />
        <Circle cx="10" cy="-25" r="7.5" fill="#FFFDF6" stroke={ink} strokeWidth={2.4} />
        <Circle cx={shut ? -8.5 : -9} cy={open ? -26.5 : -24.5} r="3.6" fill={ink} />
        <Circle cx={shut ? 8.5 : 11} cy={open ? -26.5 : -24.5} r="3.6" fill={ink} />
        <Circle cx="-7.5" cy="-27.5" r="1.3" fill="#FFF" />
        <Circle cx="12.5" cy="-27.5" r="1.3" fill="#FFF" />
        {/* Mouth */}
        {open ? (
          <Path d="M-10 10 Q0 21 10 10 Z" fill="#7D2618" stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
        ) : shut ? (
          <Path d="M-7 14 Q0 11 7 14" fill="none" stroke={ink} strokeWidth={2.8} strokeLinecap="round" />
        ) : (
          <Path d="M-8 11 Q0 18 8 11" fill="none" stroke={ink} strokeWidth={2.8} strokeLinecap="round" />
        )}
      </G>
    </Svg>
  );
});

/** Small inline shell glyph used inside RulePicture cards. */
function MiniShell({ col, big, x, y, s = 26 }: { col: ColorIdx; big: SizeIdx; x: number; y: number; s?: number }) {
  const sc = (s / 100) * (big ? 0.96 : 0.66);
  const dy = big ? 0 : s * 0.17;
  const dx = big ? 0 : s * 0.17;
  return (
    <G transform={`translate(${x + dx}, ${y + dy}) scale(${sc})`}>
      {col === 0 ? <ScallopBody col={0} /> : col === 1 ? <NautilusBody col={1} /> : <ConchBody col={2} />}
    </G>
  );
}

/** Colour-agnostic size glyph: neutral '?' token + crisp dashed ring (small) or inset gold sparkles (BIG). */
function NeutralSizeShell({ big, x, y, s = 30 }: { big: SizeIdx; x: number; y: number; s?: number }) {
  const sc = (s / 100) * (big ? 0.78 : 0.56);
  const pad = big ? s * 0.11 : s * 0.22;
  return (
    <G transform={`translate(${x}, ${y})`}>
      {!big && (
        <Circle cx={s / 2} cy={s / 2} r={s * 0.4} fill="none" stroke="#4B6E70" strokeWidth={2} strokeDasharray="3.2 2.6" />
      )}
      {big === 1 && (
        <G>
          <Path d={`M${s * 0.14} ${s * 0.18} L${s * 0.19} ${s * 0.06} L${s * 0.24} ${s * 0.18} L${s * 0.34} ${s * 0.23} L${s * 0.24} ${s * 0.28} L${s * 0.19} ${s * 0.38} L${s * 0.14} ${s * 0.28} L${s * 0.04} ${s * 0.23} Z`} fill="#FFD24A" stroke={ink} strokeWidth={1.1} />
          <Path d={`M${s * 0.82} ${s * 0.16} L${s * 0.86} ${s * 0.06} L${s * 0.9} ${s * 0.16} L${s * 0.98} ${s * 0.2} L${s * 0.9} ${s * 0.24} L${s * 0.86} ${s * 0.32} L${s * 0.82} ${s * 0.24} L${s * 0.74} ${s * 0.2} Z`} fill="#FFD24A" stroke={ink} strokeWidth={1} />
        </G>
      )}
      <G transform={`translate(${pad}, ${pad}) scale(${sc})`}>
        <NeutralShellBody big={big} />
      </G>
    </G>
  );
}

/** Picture-first icon for any rule, cleanly centered in 120x44 pill for Rule-Maker menu & reveal. */
export const RulePicture = memo(function RulePicture({ spec, width = 120, height = 44 }: { spec: RulePictureSpec; width?: number; height?: number }) {
  const badge = (text: string, x: number, bg = '#20474A', w = 30, fontSize = 11.5) => (
    <G>
      <Rect x={x} y="10" width={w} height="24" rx="8" fill={bg} />
      <SvgText x={x + w / 2} y="26.5" fontSize={fontSize} fontWeight="900" fill="#FFFDF6" textAnchor="middle">{text}</SvgText>
    </G>
  );

  /** Stacked 3-equal-slot position strip for compound position rules so all 3 slots stay roomy and unmistakable. */
  const stackedClause = (p: RulePictureSpec, topY: number): React.ReactNode => {
    if (p.kind === 'pos') {
      return (
        <G>
          {[0, 1, 2].map(slot => {
            const activeSlot = slot === p.pos;
            const x = 40 + slot * 25;
            return (
              <G key={slot}>
                <Rect
                  x={x}
                  y={topY}
                  width={22}
                  height={16}
                  rx={4.5}
                  fill={activeSlot ? (p.negate ? '#FCE2DA' : '#DFF4E8') : '#EFECE4'}
                  stroke={activeSlot ? ink : '#B8C4C2'}
                  strokeWidth={activeSlot ? 1.7 : 1.3}
                />
                {activeSlot && p.col !== undefined && (
                  <MiniShell col={p.col} big={p.big ?? 1} x={x + 4} y={topY + 1} s={14} />
                )}
                {activeSlot && p.col === undefined && (
                  <NeutralSizeShell big={p.big ?? 1} x={x + 4} y={topY + 1} s={14} />
                )}
              </G>
            );
          })}
        </G>
      );
    }
    if (p.kind === 'has-color') {
      return (
        <G>
          <MiniShell col={p.col} big={1} x={56} y={topY} s={16} />
          <SvgText x={82} y={topY + 12} fontSize="11" fontWeight="900" fill={p.negate ? '#C95A42' : '#2E8B57'} textAnchor="middle">{p.negate ? '✕' : '✓'}</SvgText>
        </G>
      );
    }
    if (p.kind === 'has-size') {
      return (
        <G>
          <NeutralSizeShell big={p.big} x={56} y={topY} s={16} />
          <SvgText x={82} y={topY + 12} fontSize="10" fontWeight="900" fill={ink} textAnchor="middle">{p.big ? 'BIG' : 'SM'}</SvgText>
        </G>
      );
    }
    if (p.kind === 'has-shell') {
      const sh = shellOf(p.shell);
      return (
        <G>
          <MiniShell col={sh.col} big={sh.big} x={56} y={topY} s={16} />
          <SvgText x={82} y={topY + 12} fontSize="11" fontWeight="900" fill={p.negate ? '#C95A42' : '#2E8B57'} textAnchor="middle">{p.negate ? '✕' : '✓'}</SvgText>
        </G>
      );
    }
    return <SvgText x={76} y={topY + 12} fontSize="11" fontWeight="900" fill={ink} textAnchor="middle">★</SvgText>;
  };

  /** Compact single-symbol clause for non-positional compound rules. */
  const compactClause = (p: RulePictureSpec, leftX: number): React.ReactNode => {
    if (p.kind === 'has-color') return <MiniShell col={p.col} big={1} x={leftX + 7} y={9} s={26} />;
    if (p.kind === 'has-size') return <NeutralSizeShell big={p.big} x={leftX + 6} y={8} s={28} />;
    if (p.kind === 'has-shell') {
      const sh = shellOf(p.shell);
      return <MiniShell col={sh.col} big={sh.big} x={leftX + 7} y={9} s={26} />;
    }
    return <SvgText x={leftX + 19} y="26" fontSize="12" fontWeight="900" fill={ink} textAnchor="middle">★</SvgText>;
  };

  const renderSpec = (p: RulePictureSpec): React.ReactNode => {
    switch (p.kind) {
      case 'has-color':
        return (
          <G>
            <MiniShell col={p.col} big={1} x={24} y={6} s={32} />
            {badge(p.negate ? '✕' : '✓', 66, p.negate ? '#C95A42' : '#2E8B57', 30)}
          </G>
        );
      case 'has-size':
        return p.all ? (
          <G>
            <NeutralSizeShell big={p.big} x={10} y={6} s={30} />
            <NeutralSizeShell big={p.big} x={41} y={6} s={30} />
            {badge('ALL', 76, '#2E8B57', 34)}
          </G>
        ) : (
          <G>
            <NeutralSizeShell big={p.big} x={10} y={6} s={32} />
            {badge(p.big ? 'BIG' : 'SMALL', 46, '#20474A', 38, 10.5)}
            {badge('✓', 88, '#2E8B57', 22, 12)}
          </G>
        );
      case 'has-shell': {
        const sh = shellOf(p.shell);
        return (
          <G>
            <MiniShell col={sh.col} big={sh.big} x={24} y={6} s={32} />
            {badge(p.negate ? '✕' : '✓', 66, p.negate ? '#C95A42' : '#2E8B57', 30)}
          </G>
        );
      }
      case 'count-color': {
        const tag = p.op === 'eq1' ? '=1' : p.op === 'eq2' ? '=2' : p.op === 'ge2' ? '2+' : p.op === 'le1' ? '0–1' : p.op === 'even' ? '2n' : 'odd';
        return (
          <G>
            <MiniShell col={p.col} big={1} x={22} y={6} s={32} />
            {badge(tag, 64, '#2C6A73', 34)}
          </G>
        );
      }
      case 'count-size':
        return (
          <G>
            <NeutralSizeShell big={p.big} x={22} y={6} s={32} />
            {badge(`=${p.count}`, 64, '#2C6A73', 34)}
          </G>
        );
      case 'count-shell': {
        const sh = shellOf(p.shell);
        return (
          <G>
            <MiniShell col={sh.col} big={sh.big} x={22} y={6} s={32} />
            {badge(p.op === 'eq1' ? '=1' : '2+', 64, '#2C6A73', 34)}
          </G>
        );
      }
      case 'both-colors':
        return (
          <G>
            <MiniShell col={p.c1} big={1} x={18} y={7} s={30} />
            <SvgText x="60" y="27" fontSize="18" fontWeight="900" fill={ink} textAnchor="middle">+</SvgText>
            <MiniShell col={p.c2} big={1} x={72} y={7} s={30} />
          </G>
        );
      case 'pos':
        return (
          <G>
            {[0, 1, 2].map(slot => (
              <G key={slot}>
                <Rect x={11 + slot * 34} y="6" width="30" height="32" rx="8" fill={slot === p.pos ? (p.negate ? '#FCE2DA' : '#DFF4E8') : '#EFECE4'} stroke={slot === p.pos ? ink : '#B8C4C2'} strokeWidth={slot === p.pos ? 2.2 : 1.5} />
                {slot === p.pos && p.col !== undefined && (
                  <MiniShell col={p.col} big={p.big ?? 1} x={14 + slot * 34} y={10} s={24} />
                )}
                {slot === p.pos && p.col === undefined && p.big !== undefined && (
                  <NeutralSizeShell big={p.big} x={14 + slot * 34} y={10} s={24} />
                )}
                {slot === p.pos && p.negate && (
                  <Path d={`M${16 + slot * 34} 11 L${36 + slot * 34} 33`} stroke="#C95A42" strokeWidth={2.8} strokeLinecap="round" />
                )}
              </G>
            ))}
          </G>
        );
      case 'ends':
        return (
          <G>
            <Rect x="11" y="6" width="30" height="32" rx="8" fill={p.negate ? '#FCE2DA' : '#DFF4E8'} stroke={ink} strokeWidth={2.2} />
            <Rect x="48" y="10" width="24" height="24" rx="6" fill="#EFECE4" stroke="#B8C4C2" strokeWidth={1.5} />
            <Rect x="79" y="6" width="30" height="32" rx="8" fill={p.negate ? '#FCE2DA' : '#DFF4E8'} stroke={ink} strokeWidth={2.2} />
            {p.col !== undefined && <><MiniShell col={p.col} big={1} x={14} y={10} s={24} /><MiniShell col={p.col} big={1} x={82} y={10} s={24} /></>}
            {p.col === undefined && p.big !== undefined && <><NeutralSizeShell big={p.big} x={14} y={10} s={24} /><NeutralSizeShell big={p.big} x={82} y={10} s={24} /></>}
            {p.negate && (
              <>
                <Path d="M16 11 L36 33" stroke="#C95A42" strokeWidth={2.8} strokeLinecap="round" />
                <Path d="M84 11 L104 33" stroke="#C95A42" strokeWidth={2.8} strokeLinecap="round" />
              </>
            )}
          </G>
        );
      case 'diversity':
        if (p.mode === 'all-diff') {
          return (
            <G>
              {/* Explicit ≠ separators so "all different colours" reads cleanly without needing the caption */}
              <MiniShell col={0} big={1} x={8} y={10} s={24} />
              <SvgText x="39.5" y="27" fontSize="14" fontWeight="900" fill={ink} textAnchor="middle">≠</SvgText>
              <MiniShell col={1} big={1} x={48} y={10} s={24} />
              <SvgText x="79.5" y="27" fontSize="14" fontWeight="900" fill={ink} textAnchor="middle">≠</SvgText>
              <MiniShell col={2} big={1} x={88} y={10} s={24} />
            </G>
          );
        }
        return (
          <G>
            {/* Equal neutral size across all three shells so colour rules never imply a size difference */}
            <MiniShell col={0} big={1} x={12} y={8} s={28} />
            <MiniShell col={p.mode === 'all-same' ? 0 : 1} big={p.mode === 'dup-shells' ? 0 : 1} x={46} y={8} s={28} />
            <MiniShell col={p.mode === 'all-same' ? 0 : p.mode === 'exact-2' || p.mode === 'at-least-2' ? 0 : 2} big={1} x={80} y={8} s={28} />
          </G>
        );
      case 'pair':
        return (
          <G>
            {[0, 1, 2].map(slot => {
              const active = slot === p.i || slot === p.j;
              return (
                <Rect key={slot} x={12 + slot * 34} y="8" width="28" height="28" rx="8" fill={active ? (p.same ? '#DFF4E8' : '#FCE2DA') : '#EFECE4'} stroke={active ? ink : '#B8C4C2'} strokeWidth={active ? 2.2 : 1.5} />
              );
            })}
            <SvgText x="60" y="27.5" fontSize="15" fontWeight="900" fill={ink} textAnchor="middle">{p.same ? '=' : '≠'}</SvgText>
          </G>
        );
      case 'compare':
        return (
          <G>
            <MiniShell col={p.c1} big={1} x={16} y={7} s={30} />
            <SvgText x="60" y="27.5" fontSize="17" fontWeight="900" fill={ink} textAnchor="middle">{p.op === 'eq' ? '=' : p.op === 'ge' ? '≥' : '>'}</SvgText>
            <MiniShell col={p.c2} big={1} x={74} y={7} s={30} />
          </G>
        );
      case 'compound': {
        const tag = p.op === 'and' ? 'AND' : p.op === 'or' ? 'OR' : p.op === 'unless' ? 'NOT' : p.op === 'xor' ? 'XOR' : 'IF→';
        if (p.left.kind === 'pos' || p.right.kind === 'pos') {
          // Stacked 2-line layout keeps all 3 position slots full-size and unmistakably legible.
          return (
            <G>
              {badge(tag, 7, '#20474A', 28, 10.5)}
              {stackedClause(p.left, 4)}
              {stackedClause(p.right, 24)}
            </G>
          );
        }
        return (
          <G>
            {compactClause(p.left, 6)}
            {badge(tag, 46, '#20474A', 28)}
            {compactClause(p.right, 77)}
          </G>
        );
      }
      default:
        return (
          <G>
            <MiniShell col={0} big={1} x={12} y={8} s={28} />
            <MiniShell col={1} big={1} x={46} y={8} s={28} />
            <MiniShell col={2} big={1} x={80} y={8} s={28} />
          </G>
        );
    }
  };
  return (
    <Svg width={width} height={height} viewBox="0 0 120 44" {...hide}>
      <Rect x="1" y="1" width="118" height="42" rx="12" fill="#FFFDF6" stroke="#CBDAD8" strokeWidth={1.6} />
      {renderSpec(spec)}
    </Svg>
  );
});

/** Shelf / Cove / Home icon for Gate Crab. */
export const ShelfArt = memo(function ShelfArt({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" {...hide}>
      <Rect x="4" y="4" width="92" height="92" rx="22" fill="#E3F2F0" stroke="#4D8A8C" strokeWidth={3} />
      <Rect x="14" y="16" width="10" height="62" rx="4" fill="#B98448" stroke={ink} strokeWidth={2.4} />
      <Rect x="76" y="16" width="10" height="62" rx="4" fill="#B98448" stroke={ink} strokeWidth={2.4} />
      <Rect x="10" y="13" width="80" height="11" rx="5" fill="#C99457" stroke={ink} strokeWidth={2.4} />
      <G transform="translate(50, 50) scale(0.62)">
        <Path d="M-24 2 Q-40 -10 -36 -24 Q-28 -28 -24 -18 Q-20 -28 -14 -24 Q-8 -14 -16 -2 Z" fill="#E85E48" {...line} strokeWidth={3.6} />
        <Path d="M24 2 Q40 -10 36 -24 Q28 -28 24 -18 Q20 -28 14 -24 Q8 -14 16 -2 Z" fill="#E85E48" {...line} strokeWidth={3.6} />
        <Path d="M0 -14 C22 -14 32 0 30 14 C28 26 14 30 0 30 C-14 30 -28 26 -30 14 C-32 0 -22 -14 0 -14 Z" fill="#E85E48" {...line} strokeWidth={3.8} />
        <Path d="M-10 -12 V-22 M10 -12 V-22" stroke={ink} strokeWidth={4} strokeLinecap="round" />
        <Circle cx="-10" cy="-24" r="7" fill="#FFFDF6" stroke={ink} strokeWidth={3} />
        <Circle cx="10" cy="-24" r="7" fill="#FFFDF6" stroke={ink} strokeWidth={3} />
        <Circle cx="-9" cy="-24" r="3.4" fill={ink} />
        <Circle cx="11" cy="-24" r="3.4" fill={ink} />
        <Path d="M-8 10 Q0 18 8 10" fill="none" stroke={ink} strokeWidth={3.4} strokeLinecap="round" />
      </G>
      <MiniShell col={0} big={1} x={14} y={67} s={24} />
      <MiniShell col={1} big={0} x={38} y={67} s={24} />
      <MiniShell col={2} big={1} x={62} y={67} s={24} />
    </Svg>
  );
});
