import { PressControl, PlayButton } from "../../Input";
import React, { memo, useEffect, useRef, useState } from "react";
import { Image, View, useWindowDimensions } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";
import { Button, Copy, Heading } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { useReducedMotion } from "../../../components/motion";
import { PictureObject } from "../../../learn/art/Objects";
import { wordAudio } from "../../../learn/kit/reading";
import { Hero, HudPill, MiniStars } from "../../Juice";
import { useArcadeLoop, type FrameBudget } from "../../loop";
import {
  glowingShell,
  noteDuration,
  songChunks,
  songResult,
  songStep,
  songTiles,
  songTransition,
  type SongInput,
  type SongState,
} from "./engine";
import { shellArt, shellImageFrame, shellStageMetrics, type ShellSymbol } from "./illustrated";
import type { ArcadeResult } from "../../types";
import type { OutfitId } from "../../progress";
import { HeartsHud, HitReaction } from "../../LivesHud";

const tick: SongInput = { type: "tick" };
const OUTFIT_ACCENT: Record<Exclude<OutfitId, "island">, string> = {
  sunhat: "#FFD06A",
  explorer: "#A3F5E0",
  starlight: "#E3BEFE",
};

const ShellSymbolMark = memo(function ShellSymbolMark({
  symbol,
  size,
  glow,
  lit,
}: {
  symbol: ShellSymbol;
  size: number;
  glow: string;
  lit: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Circle
        cx={12}
        cy={12}
        r={10.5}
        fill={lit ? "#FFF7DF" : "#252D52CC"}
        stroke={lit ? glow : "#F2E2C9A8"}
        strokeWidth={1.6}
      />
      {symbol === "circle" ? (
        <Circle cx={12} cy={12} r={4.5} fill={lit ? "#53385E" : glow} />
      ) : symbol === "triangle" ? (
        <Path d="M12 6.8L17.4 16.2H6.6Z" fill={lit ? "#53385E" : glow} />
      ) : symbol === "diamond" ? (
        <Path d="M12 6.2L17.6 12L12 17.8L6.4 12Z" fill={lit ? "#53385E" : glow} />
      ) : symbol === "square" ? (
        <Rect x={7.4} y={7.4} width={9.2} height={9.2} rx={1.6} fill={lit ? "#53385E" : glow} />
      ) : symbol === "star" ? (
        <Path
          d="M12 5.7L13.9 9.7L18.3 10.3L15.1 13.4L15.9 17.8L12 15.7L8.1 17.8L8.9 13.4L5.7 10.3L10.1 9.7Z"
          fill={lit ? "#53385E" : glow}
        />
      ) : (
        <Path
          d="M14.2 6.8A5.6 5.6 0 1 0 16.4 16.4A4.9 4.9 0 0 1 14.2 6.8Z"
          fill={lit ? "#53385E" : glow}
        />
      )}
    </Svg>
  );
});

const ShellOutfitCharm = memo(function ShellOutfitCharm({
  outfit,
  size,
}: {
  outfit: OutfitId;
  size: number;
}) {
  if (outfit === "island") return null;
  const accent = OUTFIT_ACCENT[outfit];
  return (
    <View
      testID={`shell-outfit-${outfit}`}
      pointerEvents="none"
      style={{ position: "absolute", right: 2, top: 2 }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
        <Circle cx={12} cy={12} r={10} fill={accent} stroke="#6E473A" strokeWidth={2} />
        <Path
          d={
            outfit === "sunhat"
              ? "M6 14H18M8 13Q8 5 12 6Q16 5 16 13"
              : outfit === "explorer"
                ? "M12 5L17 12L12 19L7 12Z"
                : "M12 5L14 10L19 12L14 14L12 19L10 14L5 12L10 10Z"
          }
          fill="none"
          stroke="#5A3F45"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
});

export const SingingShell = memo(function SingingShell({
  index,
  lit,
  cue,
  size,
  outfit,
  wrong,
}: {
  index: number;
  lit: boolean;
  cue: string;
  size: number;
  outfit: OutfitId;
  wrong: boolean;
}) {
  const reduced = useReducedMotion();
  const art = shellArt(index);
  const metrics = shellStageMetrics(size);
  const imageFrame = shellImageFrame(art, size);
  const bounce = useSharedValue(0);
  const notes = useSharedValue(0);
  const shake = useSharedValue(0);
  const halo = useSharedValue(0);
  const ripple = useSharedValue(0);

  useEffect(() => {
    shake.value = 0;
    if (wrong && !reduced) {
      shake.value = withSequence(
        withTiming(-1, { duration: 40 }),
        withTiming(1, { duration: 50 }),
        withTiming(-0.6, { duration: 50 }),
        withTiming(0, { duration: 60 }),
      );
    }
    return () => {
      cancelAnimation(shake);
    };
  }, [wrong, cue, reduced, shake]);

  useEffect(() => {
    bounce.value = 0;
    notes.value = 0;
    ripple.value = 0;
    halo.value = lit ? (reduced ? 1 : 0.72) : 0;
    if (lit && !reduced) {
      bounce.value = withSequence(
        withTiming(1, { duration: 85, easing: Easing.out(Easing.quad) }),
        withSpring(0, { damping: 10, stiffness: 220 }),
      );
      halo.value = withSequence(
        withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }),
        withRepeat(withTiming(0.76, { duration: 360, easing: Easing.inOut(Easing.sin) }), -1, true),
      );
      ripple.value = withTiming(1, { duration: 540, easing: Easing.out(Easing.cubic) });
      notes.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) });
    }
    return () => {
      cancelAnimation(bounce);
      cancelAnimation(notes);
      cancelAnimation(halo);
      cancelAnimation(ripple);
    };
  }, [lit, cue, reduced, bounce, notes, halo, ripple]);

  const { canvas, bottom, lift, shakeAmp, maxTiltDeg } = metrics;
  const centerY = canvas * 0.51;
  const haloSize = canvas * 0.76;
  const rippleSize = canvas * 0.66;
  const shadowWidth = canvas * 0.62;
  const shadowHeight = Math.max(7, canvas * 0.12);
  const badgeSize = Math.max(14, Math.min(24, Math.round(canvas * 0.22)));
  const noteWidth = Math.max(22, Math.min(36, Math.round(canvas * 0.3)));
  const noteHeight = Math.round(noteWidth * 1.28);
  const noteTop = Math.round(canvas * 0.22);
  const noteRight = Math.round(canvas * 0.08);
  const noteLift = Math.round(canvas * 0.18);
  const noteDriftX = Math.round(canvas * 0.05);

  const shellStyle = useAnimatedStyle(() => {
    const pop = Math.max(0, bounce.value);
    const settle = Math.min(0, bounce.value);
    return {
      opacity: wrong ? 0.68 : 1,
      transform: [
        { translateX: shake.value * shakeAmp },
        { translateY: -pop * lift },
        { rotate: `${shake.value * maxTiltDeg}deg` },
        { scaleX: 1 + pop * 0.095 - settle * 0.04 },
        { scaleY: 1 + pop * 0.095 + settle * 0.05 },
      ],
    };
  });

  const shadowStyle = useAnimatedStyle(() => {
    const pop = Math.max(0, bounce.value);
    return {
      opacity: (lit ? 0.28 : 0.42) - pop * 0.14,
      transform: [{ scaleX: 1 - pop * 0.16 }, { scaleY: 1 - pop * 0.1 }],
    };
  });

  const haloStyle = useAnimatedStyle(() => ({
    opacity: lit ? (reduced ? 0.85 : halo.value * 0.92) : 0,
    transform: [{ scale: reduced ? 1.02 : 0.92 + halo.value * 0.18 }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: lit && !reduced ? (1 - ripple.value) * 0.85 : 0,
    transform: [{ scale: 0.86 + ripple.value * 0.48 }],
  }));

  const noteStyle = useAnimatedStyle(() => ({
    opacity: reduced ? 1 : 1 - notes.value * 0.78,
    transform: [
      { translateY: reduced ? 0 : -notes.value * noteLift },
      { translateX: reduced ? 0 : notes.value * noteDriftX },
      { scale: reduced ? 1 : 0.88 + notes.value * 0.16 },
    ],
  }));

  return (
    <View
      testID={`shell-stage-${index}`}
      style={{
        width: canvas,
        height: canvas,
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Warm pulsing radial halo behind the shell */}
      <Animated.View
        testID={`shell-halo-${index}`}
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: (canvas - haloSize) / 2,
            top: centerY - haloSize / 2,
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            backgroundColor: `${art.glow}45`,
            borderWidth: 2,
            borderColor: "#FFF6D9CC",
            alignItems: "center",
            justifyContent: "center",
          },
          haloStyle,
        ]}
      >
        <View
          style={{
            width: haloSize * 0.66,
            height: haloSize * 0.66,
            borderRadius: haloSize / 2,
            backgroundColor: "#FFF6D86E",
          }}
        />
      </Animated.View>

      {/* Expanding musical ripple ring on onset */}
      {!reduced && (
        <Animated.View
          testID={`shell-ripple-${index}`}
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: (canvas - rippleSize) / 2,
              top: centerY - rippleSize / 2,
              width: rippleSize,
              height: rippleSize,
              borderRadius: rippleSize / 2,
              borderWidth: 3,
              borderColor: art.glow,
            },
            rippleStyle,
          ]}
        />
      )}

      {/* Grounded twilight shore shadow */}
      <Animated.View
        testID={`shell-shadow-${index}`}
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: (canvas - shadowWidth) / 2,
            top: bottom - shadowHeight * 0.55,
            width: shadowWidth,
            height: shadowHeight,
            borderRadius: shadowHeight,
            backgroundColor: "#1B1E3E",
          },
          shadowStyle,
        ]}
      />

      {/* Android-safe padded animated shell wrapper */}
      <Animated.View
        testID={`shell-body-${index}`}
        style={[
          {
            position: "absolute",
            left: 0,
            top: 0,
            width: canvas,
            height: canvas,
            transformOrigin: [canvas / 2, bottom, 0],
          },
          shellStyle,
        ]}
      >
        <Image
          testID={`shell-art-${index}`}
          source={art.source()}
          resizeMode="contain"
          fadeDuration={0}
          accessible={false}
          style={imageFrame}
        />
      </Animated.View>

      {/* Colorblind-friendly shape cue */}
      <View
        testID={`shell-symbol-${index}`}
        pointerEvents="none"
        style={{ position: "absolute", left: 2, top: 2 }}
      >
        <ShellSymbolMark symbol={art.symbol} size={badgeSize} glow={art.glow} lit={lit} />
      </View>

      {/* Equipped outfit charm */}
      <ShellOutfitCharm outfit={outfit} size={badgeSize} />

      {/* Floating golden musical note burst */}
      {lit && (
        <Animated.View
          testID={`shell-notes-${index}`}
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              right: noteRight,
              top: noteTop,
            },
            noteStyle,
          ]}
        >
          <Svg width={noteWidth} height={noteHeight} viewBox="0 0 44 58" accessible={false}>
            <Path
              d="M14 47V19L32 13V38M14 24L32 18"
              stroke="#FFE8A8"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Ellipse cx={9} cy={47} rx={7} ry={5} fill="#FFE394" />
            <Ellipse cx={27} cy={38} rx={7} ry={5} fill="#FFE394" />
            <Path
              d="M36 2L37.4 5.4L40.8 6.8L37.4 8.2L36 11.6L34.6 8.2L31.2 6.8L34.6 5.4Z"
              fill={art.glow}
            />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
});

export type SongBoardChromeMeasurement = {
  hud?: number;
  header?: number;
  progress?: number;
  controls?: number;
};

export type SongBoardLayoutInput = {
  width: number;
  arenaHeight: number;
  shells: number;
  patternLength: number;
  learning: boolean;
  hasShortPhrases: boolean;
  chunksOpen: boolean;
  hasTwist: boolean;
  isEndless: boolean;
  measuredChrome?: SongBoardChromeMeasurement;
};

export type SongBoardLayout = {
  wide: boolean;
  compactWidth: boolean;
  compactHeight: boolean;
  ultraShort: boolean;
  tight: boolean;
  inlineControls: boolean;
  compactHearts: boolean;
  columns: number;
  rows: number;
  boardGap: number;
  boardPadTop: number;
  boardPadBottom: number;
  hudPadH: number;
  hudGap: number;
  hudMaxWidth: number;
  heroSize: number;
  headingFontSize: number;
  headingLineHeight: number;
  subtitleFontSize: number;
  subtitleLineHeight: number;
  twistFontSize: number;
  twistLineHeight: number;
  headerTextGap: number;
  showTwistInHeader: boolean;
  inlineTwist: boolean;
  showChunkCaptionInControls: boolean;
  dotSize: number;
  dotGap: number;
  progressPadV: number;
  progressPadH: number;
  controlsGap: number;
  colGap: number;
  rowGap: number;
  stagePadH: number;
  stagePadV: number;
  cardPadTop: number;
  cardPadBottom: number;
  badgeFontSize: number;
  badgeLineHeight: number;
  badgePadV: number;
  badgeBorder: number;
  shellCanvas: number;
  shellCardWidth: number;
  shellCardHeight: number;
  stageMaxWidth: number;
  stageHeight: number;
  hudHeight: number;
  headerHeight: number;
  progressHeight: number;
  controlsHeight: number;
  totalHeight: number;
  justifyContent: "flex-start" | "center";
};

/**
 * Pure vertical and horizontal layout budget for SongBoard.
 * Reserves the full HUD (including compact portrait wrap), heading, pattern progress,
 * stage chrome, shell card borders/labels, and 44 px+ action targets before sizing shells.
 */
export function computeSongBoardLayout({
  width,
  arenaHeight,
  shells,
  patternLength,
  learning,
  hasShortPhrases,
  chunksOpen,
  hasTwist,
  isEndless,
  measuredChrome,
}: SongBoardLayoutInput): SongBoardLayout {
  const safeWidth = Math.max(240, width);
  const safeArenaHeight = Math.max(240, arenaHeight);
  const wide = safeWidth >= 560 && safeArenaHeight < 440;
  const compactWidth = safeWidth < 380;
  const compactHeight = safeArenaHeight < 560;
  const ultraShort = !wide && safeArenaHeight < 480;
  const tight = wide || compactHeight || compactWidth;
  const inlineControls = wide || (safeWidth >= 540 && safeArenaHeight < 520);
  const compactHearts = compactWidth || wide || compactHeight;

  const columns = wide ? shells : shells === 4 ? (safeWidth >= 680 ? 4 : 2) : 3;
  const rows = Math.max(1, Math.ceil(shells / columns));

  const boardGap = wide ? 3 : ultraShort ? 3 : compactHeight ? 4 : 9;
  const boardPadTop = wide ? 2 : ultraShort ? 2 : compactHeight ? 3 : 4;
  const boardPadBottom = wide ? 4 : ultraShort ? 3 : compactHeight ? 5 : 8;
  // Five vertical bands when !showPicture: HUD, Hero/Heading, Progress, Stage, Controls.
  const gapsTotal = boardGap * 4;

  const hudPadH = compactWidth ? 6 : 14;
  const hudGap = compactWidth ? 4 : 6;
  const hudMaxWidth = Math.min(safeWidth, wide ? 860 : 540);
  // Conservatively reserve 2 wrapped rows on narrow portrait until onLayout measures exact height.
  const estimatedHudHeight = !learning && compactWidth ? 44 + hudGap + 44 + 2 : 46;
  const hudHeight = measuredChrome?.hud ?? estimatedHudHeight;

  const heroSize = wide
    ? 36
    : ultraShort
      ? 34
      : compactHeight
        ? chunksOpen
          ? 36
          : 42
        : safeArenaHeight < 650
          ? 56
          : 66;
  const headingFontSize = wide
    ? 19
    : ultraShort
      ? 18
      : compactHeight
        ? chunksOpen
          ? 18
          : 22
        : chunksOpen
          ? 24
          : 29;
  const headingLineHeight = Math.round(headingFontSize * 1.2) + 2;
  const subtitleFontSize = wide ? 13 : ultraShort ? 12 : compactHeight ? 13 : 15;
  const subtitleLineHeight = subtitleFontSize + 4;
  const twistFontSize = ultraShort ? 11 : 12;
  const twistLineHeight = ultraShort ? 14 : 16;
  const headerTextGap = wide || compactHeight ? 1 : 3;
  // Avoid repeating twist instructions while short-phrase practice is open on compact viewports.
  const showTwistInHeader = hasTwist && !(chunksOpen && (wide || compactHeight));
  const inlineTwist = wide && showTwistInHeader;
  const showChunkCaptionInControls = chunksOpen && !wide && !compactHeight;

  const twistLines = !showTwistInHeader || inlineTwist ? 0 : compactWidth && !ultraShort ? 2 : 1;
  const headerTextHeight =
    headingLineHeight +
    headerTextGap +
    subtitleLineHeight +
    (twistLines > 0 ? headerTextGap + twistLines * twistLineHeight : 0);
  const estimatedHeaderHeight = Math.max(heroSize, headerTextHeight) + 2;
  const headerHeight = measuredChrome?.header ?? estimatedHeaderHeight;

  const dotSize = wide || compactHeight ? 10 : 13;
  const dotGap = wide || compactHeight ? 5 : 7;
  const progressPadV = wide || compactHeight ? 3 : 5;
  const progressPadH = wide || compactHeight ? 10 : 14;
  const innerProgressWidth = Math.max(120, safeWidth - 24 - progressPadH * 2);
  const dotsPerRow = Math.max(1, Math.floor((innerProgressWidth + dotGap) / (dotSize + dotGap)));
  const progressRows = Math.max(1, Math.ceil(Math.max(1, patternLength) / dotsPerRow));
  const estimatedProgressHeight =
    progressPadV * 2 + 2 + progressRows * dotSize + (progressRows - 1) * dotGap;
  const progressHeight = measuredChrome?.progress ?? estimatedProgressHeight;

  const controlsGap = wide || compactHeight ? 6 : 8;
  // Button compact is >=44px (budget 46px); PlayButton compact renders Copy (25px lineHeight) + padding/border = 49px (budget 51px).
  const buttonRowHeight = 46;
  const playButtonHeight = 51;
  let estimatedControlsHeight: number;
  if (chunksOpen) {
    estimatedControlsHeight = inlineControls
      ? buttonRowHeight
      : buttonRowHeight * 2 + controlsGap + (showChunkCaptionInControls ? 44 + controlsGap : 0);
  } else if (inlineControls) {
    estimatedControlsHeight = playButtonHeight;
  } else {
    estimatedControlsHeight =
      playButtonHeight +
      (hasShortPhrases ? controlsGap + buttonRowHeight : 0) +
      (isEndless ? controlsGap + buttonRowHeight : 0);
  }
  const controlsHeight = measuredChrome?.controls ?? estimatedControlsHeight;

  const safetySlack = ultraShort ? 4 : 6;
  const nonStageHeight =
    boardPadTop +
    boardPadBottom +
    gapsTotal +
    hudHeight +
    headerHeight +
    progressHeight +
    controlsHeight +
    safetySlack;

  const colGap = safeWidth >= 600 ? 10 : compactWidth ? 5 : 6;
  const rowGap = wide ? 4 : ultraShort ? 4 : compactHeight ? 5 : 10;
  const stagePadH = safeWidth >= 600 ? 14 : compactWidth ? 6 : 8;
  const stagePadV = wide ? 4 : ultraShort ? 4 : compactHeight ? 5 : 10;
  const stageBorderV = 4;

  const availableStageHeight = Math.max(0, safeArenaHeight - nonStageHeight);
  const availableRowsHeight = Math.max(
    0,
    availableStageHeight - stagePadV * 2 - stageBorderV - rowGap * (rows - 1),
  );
  const maxRowHeight = Math.floor(availableRowsHeight / rows);

  const widthCap = safeWidth >= 600 ? (rows === 2 ? 148 : 176) : 114;
  const stageOuterMax = Math.min(1080, safeWidth - 12);
  const maxCardWidthFromWidth = Math.floor(
    (stageOuterMax - stagePadH * 2 - 4 - colGap * (columns - 1)) / columns,
  );
  const maxCardWidth = Math.max(44, Math.min(widthCap, maxCardWidthFromWidth));

  const ultraTightCards = maxRowHeight < 68;
  const cardPadTop = wide || compactHeight ? 1 : 2;
  const cardPadBottom = ultraTightCards ? 2 : wide || compactHeight ? 3 : 6;
  const cardBorderV = 7; // borderTop (up to 2.5) + borderBottom (up to 4)
  const badgePadV = ultraTightCards ? 0 : 1;
  const badgeBorder = ultraTightCards ? 1 : 1.5;

  const tentativeCanvas = Math.max(
    32,
    maxRowHeight - (cardPadTop + cardPadBottom + cardBorderV + (learning ? 30 : ultraTightCards ? 18 : 24)),
  );
  const badgeBasis = Math.min(maxCardWidth, tentativeCanvas + 6);
  const badgeFontSize = learning
    ? Math.min(32, Math.max(18, Math.round(badgeBasis * 0.28)))
    : ultraTightCards
      ? 13
      : Math.min(22, Math.max(14, Math.round(badgeBasis * 0.22)));
  const badgeLineHeight = badgeFontSize + (ultraTightCards ? 3 : 4);
  const badgeHeight = badgeLineHeight + badgePadV * 2 + Math.ceil(badgeBorder * 2);
  const cardChromeV = cardPadTop + cardPadBottom + cardBorderV + badgeHeight;

  const maxCanvasByHeight = maxRowHeight - cardChromeV;
  const maxCanvasByWidth = maxCardWidth - 6;
  const shellCanvas = Math.floor(
    Math.max(32, Math.min(widthCap - 6, maxCanvasByWidth, maxCanvasByHeight)),
  );
  const shellCardHeight = Math.max(44, shellCanvas + cardChromeV);
  const shellCardWidth = Math.max(
    44,
    Math.min(maxCardWidth, Math.max(shellCanvas + 6, Math.min(maxCardWidth, shellCanvas + 18))),
  );
  const stageMaxWidth = Math.min(
    stageOuterMax,
    shellCardWidth * columns + colGap * (columns - 1) + stagePadH * 2 + 4,
  );
  const stageHeight = stagePadV * 2 + stageBorderV + rows * shellCardHeight + (rows - 1) * rowGap;
  const totalHeight =
    boardPadTop +
    boardPadBottom +
    gapsTotal +
    hudHeight +
    headerHeight +
    progressHeight +
    stageHeight +
    controlsHeight;

  return {
    wide,
    compactWidth,
    compactHeight,
    ultraShort,
    tight,
    inlineControls,
    compactHearts,
    columns,
    rows,
    boardGap,
    boardPadTop,
    boardPadBottom,
    hudPadH,
    hudGap,
    hudMaxWidth,
    heroSize,
    headingFontSize,
    headingLineHeight,
    subtitleFontSize,
    subtitleLineHeight,
    twistFontSize,
    twistLineHeight,
    headerTextGap,
    showTwistInHeader,
    inlineTwist,
    showChunkCaptionInControls,
    dotSize,
    dotGap,
    progressPadV,
    progressPadH,
    controlsGap,
    colGap,
    rowGap,
    stagePadH,
    stagePadV,
    cardPadTop,
    cardPadBottom,
    badgeFontSize,
    badgeLineHeight,
    badgePadV,
    badgeBorder,
    shellCanvas,
    shellCardWidth,
    shellCardHeight,
    stageMaxWidth,
    stageHeight,
    hudHeight,
    headerHeight,
    progressHeight,
    controlsHeight,
    totalHeight,
    justifyContent: totalHeight + 6 >= safeArenaHeight ? "flex-start" : "center",
  };
}

export function SongBoard({
  initial,
  active,
  helper,
  outfit,
  onResult,
  onTone,
  onSay,
  debug,
  width: arenaWidth,
  height: availableHeight,
}: {
  initial: SongState;
  active: boolean;
  helper: boolean;
  outfit: OutfitId;
  onResult: (result: ArcadeResult, helped?: boolean) => void;
  onTone: (tone: string, haptic?: boolean) => void;
  onSay: (key: string, automatic?: boolean) => boolean;
  debug?: boolean;
  width?: number;
  height?: number;
}) {
  const [chunks, setChunks] = useState(false);
  const [chunk, setChunk] = useState(0);
  const [chunkPlaying, setChunkPlaying] = useState(false);
  const restartWhole = useRef(false);
  const chunkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heard = useRef(initial.onset);
  const { snapshot: s, dispatch, state, budget } = useArcadeLoop({
    initial,
    reduce: songTransition,
    step: songStep,
    input: tick,
    active: active && !chunks,
    onFrame: current => {
      // The event clock publishes sound and the glow snapshot in the same animation frame.
      if (current.onset === heard.current) return;
      heard.current = current.onset;
      const note = glowingShell(current);
      if (note === null) return;
      const word = current.level !== "endless" && !!current.level.word;
      if (!(word && onSay(`arcade-phoneme-${songTiles(current)[note]}`, true))) {
        onTone(`shell-${note}`, false);
      }
    },
  });
  const [manualGlow, setManualGlow] = useState<number | null>(null);
  const [tapCue, setTapCue] = useState(0);
  const [status, setStatus] = useState<{ id: number; text: string } | null>(null);
  const [wrongShell, setWrongShell] = useState<number | null>(null);
  const reported = useRef(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useReducedMotion();
  const window = useWindowDimensions();
  const width = arenaWidth ?? window.width;
  const arenaHeight = availableHeight ?? window.height - 62;
  const glow = chunks ? null : glowingShell(s);
  const learning = s.level !== "endless" && !!s.level.word;
  const tiles = songTiles(s);
  const noteKey = String(s.onset);
  const showPicture = s.phase === "picture" && manualGlow === null;

  useEffect(() => {
    if (active && !chunks && state.current.helper !== helper) {
      dispatch({ type: "helper", value: helper });
    }
  }, [active, helper, chunks, dispatch, state]);
  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => {
      setStatus(null);
      setWrongShell(null);
    }, 450);
    return () => clearTimeout(timer);
  }, [status]);
  useEffect(() => {
    const result = songResult(s);
    if (!result || !active || reported.current) return;
    const timer = setTimeout(
      () => {
        if (!reported.current) {
          reported.current = true;
          onResult(result, s.helped);
        }
      },
      result.cleared ? (reduced ? 150 : 700) : 0,
    );
    return () => clearTimeout(timer);
  }, [s, active, onResult, reduced]);
  useEffect(() => {
    if (active) return;
    if (chunkTimer.current) clearTimeout(chunkTimer.current);
    const reset = setTimeout(() => {
      setManualGlow(null);
      setChunkPlaying(false);
    }, 0);
    return () => clearTimeout(reset);
  }, [active]);
  useEffect(
    () => () => {
      if (chunkTimer.current) clearTimeout(chunkTimer.current);
    },
    [],
  );

  function playChunk() {
    if (!active || chunkPlaying) return;
    const notes = songChunks(s.pattern)[chunk];
    if (!notes) return;
    setChunkPlaying(true);
    let i = 0;
    const next = () => {
      setManualGlow(notes[i]);
      setTapCue(n => n + 1);
      onTone(`shell-${notes[i]}`, false);
      chunkTimer.current = setTimeout(() => {
        setManualGlow(null);
        i++;
        if (i < notes.length) chunkTimer.current = setTimeout(next, 180);
        else setChunkPlaying(false);
      }, Math.max(450, noteDuration(s)));
    };
    next();
  }

  useEffect(() => {
    if (active && !chunks && restartWhole.current) {
      restartWhole.current = false;
      dispatch({ type: "replay" });
    }
  }, [active, chunks, dispatch]);

  function closeChunks() {
    if (chunkTimer.current) clearTimeout(chunkTimer.current);
    setManualGlow(null);
    setChunkPlaying(false);
    restartWhole.current = true;
    setChunks(false);
  }

  function tap(index: number) {
    if (!active || chunks || state.current.phase !== "repeat") return;
    const before = state.current;
    const next = dispatch({ type: "shell", index });
    if (!(learning && onSay(`arcade-phoneme-${tiles[index]}`))) {
      onTone(`shell-${index}`, false);
    }
    setManualGlow(index);
    setTapCue(n => n + 1);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setManualGlow(null), 220);
    if (next.slips > before.slips) {
      if (learning) onTone("bump");
      setWrongShell(index);
      setStatus({ id: before.score + next.slips, text: "Once more" });
    } else if (next.rounds > before.rounds) {
      onTone("clear");
      setStatus({ id: next.score, text: "+ phrase!" });
    }
  }

  const [measuredHud, setMeasuredHud] = useState<{ key: string; height: number } | null>(null);
  const [measuredHeader, setMeasuredHeader] = useState<{ key: string; height: number } | null>(null);
  const [measuredProgress, setMeasuredProgress] = useState<{ key: string; height: number } | null>(null);
  const [measuredControls, setMeasuredControls] = useState<{ key: string; height: number } | null>(null);

  // The parent arena is the space below the app chrome, not the entire display.
  const hasShortPhrases =
    s.level !== "endless" &&
    ["w5", "w6"].includes(s.level.world) &&
    !["over", "cleared", "rest"].includes(s.phase);
  const twistLabel =
    s.level === "endless"
      ? "Growing song"
      : s.level.twist === "response"
        ? "New call each round"
        : s.level.twist === "twins"
          ? "Twin echoes · play each note twice"
          : s.level.twist === "finale"
            ? "Two new notes each round"
            : "";
  const isWideArena = width >= 560 && arenaHeight < 440;
  const isCompactArena = arenaHeight < 560;
  const hudMeasureKey = `${Math.round(width)}:${learning ? 1 : 0}:${s.lives.maxHearts}:${isWideArena ? 1 : 0}:${isCompactArena ? 1 : 0}`;
  const headerMeasureKey = `${Math.round(width)}:${Math.round(arenaHeight)}:${chunks ? 1 : 0}:${twistLabel ? 1 : 0}:${s.phase}`;
  const progressMeasureKey = `${Math.round(width)}:${isCompactArena ? 1 : 0}:${isWideArena ? 1 : 0}:${s.pattern.length}`;
  const controlsMeasureKey = `${Math.round(width)}:${isCompactArena ? 1 : 0}:${isWideArena ? 1 : 0}:${chunks ? 1 : 0}:${hasShortPhrases ? 1 : 0}:${s.level === "endless" ? 1 : 0}`;

  const layout = computeSongBoardLayout({
    width,
    arenaHeight,
    shells: s.shells,
    patternLength: s.pattern.length,
    learning,
    hasShortPhrases,
    chunksOpen: chunks && hasShortPhrases,
    hasTwist: !!twistLabel,
    isEndless: s.level === "endless",
    measuredChrome: {
      hud: measuredHud?.key === hudMeasureKey ? measuredHud.height : undefined,
      header: measuredHeader?.key === headerMeasureKey ? measuredHeader.height : undefined,
      progress: measuredProgress?.key === progressMeasureKey ? measuredProgress.height : undefined,
      controls: measuredControls?.key === controlsMeasureKey ? measuredControls.height : undefined,
    },
  });
  const { wide } = layout;
  const totalChunks = songChunks(s.pattern).length;
  const phraseStart = chunk * 3 + 1;
  const phraseEnd = Math.min(s.pattern.length, chunk * 3 + 3);
  const phraseSummary = `Phrase ${chunk + 1}/${totalChunks} · notes ${phraseStart}–${phraseEnd}`;
  const phase = chunks
    ? "Short listening phrases"
    : s.phase === "watch"
      ? "Watch"
      : s.phase === "picture"
        ? "Find the picture"
        : s.phase === "cleared"
          ? "Bravo!"
          : s.phase === "over"
            ? "Game over"
            : s.phase === "rest"
              ? "Again?"
              : "Your turn";
  const subtitleBase = chunks
    ? phraseSummary
    : s.phase === "watch"
      ? "Follow the glow"
      : s.phase === "repeat"
        ? "Play it back · no hurry"
        : s.phase === "picture"
          ? "Blend the sounds"
          : s.phase === "cleared"
            ? "A beautiful song"
            : "A fresh song is waiting";
  const subtitle =
    layout.inlineTwist && twistLabel ? `${subtitleBase} · ${twistLabel}` : subtitleBase;
  const compactButtonStyle = layout.compactWidth ? { paddingHorizontal: 10 } : undefined;
  const compactButtonTextStyle = layout.compactWidth ? { fontSize: 14 } : undefined;

  return (
    <View
      testID="shell-song-board"
      style={{
        flex: 1,
        width: "100%",
        alignItems: "center",
        justifyContent: showPicture ? "center" : layout.justifyContent,
        gap: layout.boardGap,
        paddingTop: layout.boardPadTop,
        paddingBottom: layout.boardPadBottom,
      }}
    >
      {!(wide && showPicture) && (
        <View
          testID="shell-song-hud"
          onLayout={event => {
            const next = Math.ceil(event.nativeEvent.layout.height);
            if (next <= 0) return;
            setMeasuredHud(prev =>
              prev?.key === hudMeasureKey && prev.height === next
                ? prev
                : { key: hudMeasureKey, height: next },
            );
          }}
          style={{
            width: "100%",
            maxWidth: layout.hudMaxWidth,
            paddingHorizontal: layout.hudPadH,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: layout.hudGap,
            flexWrap: "wrap",
          }}
        >
          <HudPill icon={<Icon name="flag" color="#986940" />}>
            {learning
              ? "Sound a word"
              : s.level === "endless"
                ? `Pattern ${s.rounds + 1}`
                : `${Math.min(s.rounds + 1, s.level.rounds)}/${s.level.rounds} tunes`}
          </HudPill>
          {!learning && <HeartsHud lives={s.lives} compact={layout.compactHearts} />}
          <HudPill>
            <MiniStars stars={s.slips === 0 ? 3 : s.slips <= 1 ? 2 : 1} />
          </HudPill>
        </View>
      )}
      <View
        testID="shell-song-header"
        onLayout={event => {
          const next = Math.ceil(event.nativeEvent.layout.height);
          if (next <= 0) return;
          setMeasuredHeader(prev =>
            prev?.key === headerMeasureKey && prev.height === next
              ? prev
              : { key: headerMeasureKey, height: next },
          );
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: layout.tight ? 8 : 10,
          paddingHorizontal: 8,
          maxWidth: width,
        }}
      >
        <HitReaction hit={s.lives.hit} onTone={onTone}>
          <Hero
            game="shell-song"
            size={layout.heroSize}
            outfit={outfit}
            cue={`${s.rounds}-${s.slips}-${s.cursor}`}
            mood={s.slips && s.cursor === 0 ? "dizzy" : s.cursor || s.rounds ? "happy" : "idle"}
            active={active}
          />
        </HitReaction>
        <View accessibilityLiveRegion="polite" style={{ gap: layout.headerTextGap, flexShrink: 1 }}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Heading
              style={{
                color: "#FFF3D4",
                fontSize: layout.headingFontSize,
                lineHeight: layout.headingLineHeight,
                maxWidth: width - layout.heroSize - 36,
              }}
            >
              {phase}
            </Heading>
            {status && (
              <Copy
                style={{
                  color: "#FFDB8C",
                  fontSize: layout.tight ? 14 : 16,
                  lineHeight: layout.tight ? 18 : 22,
                }}
              >
                {status.text}
              </Copy>
            )}
          </View>
          <Copy
            style={{
              color: "#F5E5D9",
              fontSize: layout.subtitleFontSize,
              lineHeight: layout.subtitleLineHeight,
              maxWidth: width - layout.heroSize - 36,
            }}
          >
            {subtitle}
          </Copy>
          {layout.showTwistInHeader && !layout.inlineTwist && !!twistLabel && (
            <Copy
              style={{
                color: "#F5E5D9",
                fontSize: layout.twistFontSize,
                lineHeight: layout.twistLineHeight,
                maxWidth: width - layout.heroSize - 36,
              }}
            >
              {twistLabel}
            </Copy>
          )}
        </View>
      </View>
      {!showPicture ? (
        <>
          <View
            testID="shell-song-progress"
            onLayout={event => {
              const next = Math.ceil(event.nativeEvent.layout.height);
              if (next <= 0) return;
              setMeasuredProgress(prev =>
                prev?.key === progressMeasureKey && prev.height === next
                  ? prev
                  : { key: progressMeasureKey, height: next },
              );
            }}
            accessibilityLabel={`Pattern progress, ${s.cursor} of ${s.pattern.length}`}
            style={{
              flexDirection: "row",
              gap: layout.dotGap,
              justifyContent: "center",
              flexWrap: "wrap",
              paddingHorizontal: layout.progressPadH,
              paddingVertical: layout.progressPadV,
              marginHorizontal: 12,
              borderRadius: 18,
              backgroundColor: "rgba(28, 34, 66, 0.42)",
              borderWidth: 1,
              borderColor: "rgba(255, 240, 210, 0.24)",
            }}
          >
            {s.pattern.map((_, i) => {
              const reached = s.phase === "repeat" && i < s.cursor;
              return (
                <View
                  key={i}
                  style={{
                    width: layout.dotSize,
                    height: layout.dotSize,
                    borderRadius: reached ? 4 : Math.ceil(layout.dotSize / 2),
                    backgroundColor: reached ? "#FFDB8C" : "#6D79A4",
                    borderWidth: 2,
                    borderColor: reached ? "#FFF7DF" : "#D4D0E0",
                  }}
                />
              );
            })}
          </View>
          <View
            testID="shell-shore-stage"
            style={{
              width: "100%",
              maxWidth: layout.stageMaxWidth,
              alignItems: "center",
              position: "relative",
              paddingHorizontal: layout.stagePadH,
              paddingVertical: layout.stagePadV,
              borderRadius: layout.tight ? 24 : 30,
              backgroundColor: "rgba(32, 38, 72, 0.36)",
              borderWidth: 1.5,
              borderColor: "rgba(255, 236, 198, 0.28)",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
                columnGap: layout.colGap,
                rowGap: layout.rowGap,
                width: "100%",
              }}
            >
              {tiles.map((tile, index) => {
                const art = shellArt(index);
                const lit = glow === index || manualGlow === index;
                const next =
                  learning && helper && s.phase === "repeat" && s.pattern[s.cursor] === index;
                const disabled = !active || chunks || s.phase !== "repeat";
                return (
                  <PressControl
                    key={index}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={`Shell ${index + 1}${learning ? `, sound ${tile}` : ""}${next ? ", Helper suggests this shell" : ""}`}
                    accessibilityState={{ disabled, selected: lit }}
                    onPress={() => tap(index)}
                    style={{
                      width: layout.shellCardWidth,
                      minHeight: layout.shellCardHeight,
                      paddingBottom: layout.cardPadBottom,
                      paddingTop: layout.cardPadTop,
                      borderRadius: layout.tight ? 22 : 28,
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderWidth: lit || next ? 2.5 : 1.5,
                      borderBottomWidth: lit ? 3.5 : 4,
                      borderColor: lit
                        ? "#FFF3CF"
                        : next
                          ? "#FFE5A1"
                          : "rgba(255, 238, 206, 0.28)",
                      backgroundColor: lit
                        ? `${art.glow}38`
                        : next
                          ? "rgba(94, 101, 140, 0.78)"
                          : "rgba(44, 52, 92, 0.48)",
                    }}
                  >
                    <SingingShell
                      index={index}
                      size={layout.shellCanvas}
                      lit={lit}
                      wrong={wrongShell === index}
                      cue={manualGlow === index ? `tap-${tapCue}` : noteKey}
                      outfit={index === 0 ? outfit : "island"}
                    />
                    <Heading
                      style={{
                        fontSize: layout.badgeFontSize,
                        lineHeight: layout.badgeLineHeight,
                        color: "#3D385F",
                        backgroundColor: lit ? "#FFF9E4" : "#FFF1D5",
                        minWidth: learning
                          ? Math.max(36, layout.badgeFontSize + 12)
                          : Math.max(30, layout.badgeFontSize + 14),
                        paddingHorizontal: layout.tight ? 7 : 9,
                        paddingVertical: layout.badgePadV,
                        borderRadius: 14,
                        borderWidth: layout.badgeBorder,
                        borderColor: lit ? art.glow : "rgba(182, 152, 114, 0.55)",
                        textAlign: "center",
                      }}
                    >
                      {learning ? tile : index + 1}
                    </Heading>
                  </PressControl>
                );
              })}
            </View>
          </View>
        </>
      ) : (
        <View style={{ gap: wide ? 5 : 14, alignItems: "center", width: "100%" }}>
          <View
            style={{
              flexDirection: width >= 600 ? "row" : "column",
              alignItems: "center",
              gap: width >= 600 ? 6 : 14,
            }}
          >
            <Heading style={{ fontSize: wide ? 24 : 38, letterSpacing: wide ? 2 : 5, color: "#FFF0CC" }}>
              {tiles.join(" · ")}
            </Heading>
            <PlayButton
              quiet
              compact
              onPress={() => {
                if (s.level !== "endless" && s.level.word) onSay(wordAudio(s.level.word));
              }}
            >
              {wide ? "Hear word" : "Hear the blended word"}
            </PlayButton>
            {wide && (
              <PlayButton quiet compact onPress={() => dispatch({ type: "show" })}>
                Help · show the picture
              </PlayButton>
            )}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {s.choices.map(word => (
              <PressControl
                key={word}
                accessibilityRole="button"
                accessibilityLabel={`Word picture: ${word}`}
                disabled={!active}
                onPress={() => {
                  const next = dispatch({ type: "picture", word });
                  if (next.phase === "cleared") onTone("clear");
                  else onTone("bump");
                }}
                style={{
                  width: Math.min(196, (width - 48) / 3),
                  minHeight: wide ? 84 : width >= 600 ? 190 : 118,
                  padding: 8,
                  backgroundColor: "#FFF4D8",
                  borderRadius: 26,
                  borderWidth: 3,
                  borderColor:
                    s.helped && s.level !== "endless" && s.level.word === word
                      ? "#F8BD54"
                      : "#B9AED1",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <PictureObject name={word} size={wide ? 62 : width >= 600 ? 130 : 78} />
              </PressControl>
            ))}
          </View>
          <View accessibilityLiveRegion="polite">
            <Copy style={{ color: "#FFF3D4", textAlign: "center" }}>
              {s.helped && s.level !== "endless"
                ? `Blend it: ${s.level.word}.`
                : s.slips
                  ? "Try blending the sounds again."
                  : "Which picture?"}
            </Copy>
          </View>
          {!wide && (
            <PlayButton quiet compact onPress={() => dispatch({ type: "show" })}>
              Help · show the picture
            </PlayButton>
          )}
        </View>
      )}
      <View
        testID="shell-song-controls"
        onLayout={event => {
          const next = Math.ceil(event.nativeEvent.layout.height);
          if (next <= 0) return;
          setMeasuredControls(prev =>
            prev?.key === controlsMeasureKey && prev.height === next
              ? prev
              : { key: controlsMeasureKey, height: next },
          );
        }}
        style={{
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          gap: layout.controlsGap,
          paddingHorizontal: layout.compactWidth ? 6 : 12,
          flexDirection: layout.inlineControls && !chunks ? "row" : "column",
          flexWrap: layout.inlineControls && !chunks ? "wrap" : "nowrap",
        }}
      >
        {hasShortPhrases && chunks ? (
          <>
            {layout.showChunkCaptionInControls && (
              <Copy
                style={{
                  color: "#FFF3D4",
                  textAlign: "center",
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                {phraseSummary}. Listen again whenever you like, then try the whole song.
              </Copy>
            )}
            <View
              style={{
                flexDirection: "row",
                gap: layout.controlsGap,
                justifyContent: "center",
                alignItems: "center",
                flexWrap: layout.inlineControls ? "nowrap" : "wrap",
              }}
            >
              <Button
                quiet
                compact
                style={compactButtonStyle}
                textStyle={compactButtonTextStyle}
                disabled={!active || chunkPlaying}
                onPress={playChunk}
              >
                Listen to this phrase
              </Button>
              <Button
                quiet
                compact
                style={compactButtonStyle}
                textStyle={compactButtonTextStyle}
                disabled={!active || chunkPlaying}
                onPress={() => setChunk(n => (n + 1) % totalChunks)}
              >
                Next phrase
              </Button>
              {layout.inlineControls && (
                <Button quiet compact disabled={!active} onPress={closeChunks}>
                  Back to the whole song
                </Button>
              )}
            </View>
            {!layout.inlineControls && (
              <Button
                quiet
                compact
                style={compactButtonStyle}
                textStyle={compactButtonTextStyle}
                disabled={!active}
                onPress={closeChunks}
              >
                Back to the whole song
              </Button>
            )}
          </>
        ) : (
          <>
            {hasShortPhrases && (
              <Button
                quiet
                compact
                style={compactButtonStyle}
                textStyle={compactButtonTextStyle}
                disabled={!active}
                onPress={() => {
                  setChunk(0);
                  setChunks(true);
                  setManualGlow(null);
                }}
              >
                Listen in short phrases
              </Button>
            )}
            <PlayButton
              quiet
              compact
              icon="refresh"
              disabled={
                !active ||
                chunks ||
                s.phase === "cleared" ||
                s.phase === "rest" ||
                s.phase === "over"
              }
              onPress={() => {
                dispatch({ type: "replay" });
                onTone("coral");
              }}
            >
              Listen & watch again
            </PlayButton>
            {s.level === "endless" && (
              <Button
                quiet
                compact
                style={compactButtonStyle}
                textStyle={compactButtonTextStyle}
                disabled={!active}
                onPress={() => dispatch({ type: "finish" })}
              >
                Finish my free-play song
              </Button>
            )}
          </>
        )}
      </View>
      {debug && <BudgetOverlay budget={budget} />}
    </View>
  );
}

export function BudgetOverlay({ budget }: { budget: FrameBudget }) {
  return (
    <View testID="arcade-budget">
      <Copy
        style={{
          fontSize: 12,
          color: "#FFF0CC",
          backgroundColor: "#29385D",
          borderRadius: 10,
          paddingHorizontal: 10,
        }}
      >
        {budget.fps.toFixed(1)} fps · p95 {budget.p95.toFixed(1)} ms / 16.7 ms · {budget.ticks} fixed
        steps · {budget.dropped.toFixed(2)} s clamped
      </Copy>
    </View>
  );
}
