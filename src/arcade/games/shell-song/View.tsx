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
  const badgeSize = Math.max(18, Math.min(24, Math.round(canvas * 0.22)));
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

  // The parent arena is the space below the app chrome, not the entire display.
  const wide = width >= 700 && arenaHeight < 440;
  const columns = wide
    ? s.shells
    : s.shells === 4
      ? width >= 680
        ? 4
        : 2
      : 3;
  const rows = Math.ceil(s.shells / columns);
  const colGap = width >= 600 ? 10 : 6;
  const rowGap = arenaHeight < 520 ? 6 : 10;
  const stagePadH = width >= 600 ? 14 : 8;
  const widthCap = width >= 600 ? (rows === 2 ? 148 : 176) : 114;
  const widthBudget = (Math.min(1080, width) - 20 - stagePadH * 2 - colGap * (columns - 1)) / columns;
  const chromeBudget = learning
    ? 265
    : chunks
      ? 410
      : s.level !== "endless" && ["w5", "w6"].includes(s.level.world)
        ? 300
        : 245;
  const heightBudget = (arenaHeight - chromeBudget) / rows - 34;
  const shellSize = Math.floor(Math.max(54, Math.min(widthCap, widthBudget, heightBudget)));
  const stageMaxWidth = Math.min(
    width - 16,
    shellSize * columns + colGap * (columns - 1) + stagePadH * 2 + 4,
  );
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

  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        gap: arenaHeight < 440 ? 4 : 9,
        paddingBottom: 8,
      }}
    >
      {!(wide && showPicture) && (
        <View
          style={{
            width: "100%",
            maxWidth: Math.max(stageMaxWidth, 320),
            paddingHorizontal: 14,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 6,
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
          {!learning && <HeartsHud lives={s.lives} />}
          <HudPill>
            <MiniStars stars={s.slips === 0 ? 3 : s.slips <= 1 ? 2 : 1} />
          </HudPill>
        </View>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <HitReaction hit={s.lives.hit} onTone={onTone}>
          <Hero
            game="shell-song"
            size={wide ? 44 : arenaHeight < 650 ? 58 : 66}
            outfit={outfit}
            cue={`${s.rounds}-${s.slips}-${s.cursor}`}
            mood={s.slips && s.cursor === 0 ? "dizzy" : s.cursor || s.rounds ? "happy" : "idle"}
            active={active}
          />
        </HitReaction>
        <View accessibilityLiveRegion="polite" style={{ gap: 3 }}>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Heading style={{ color: "#FFF3D4", fontSize: chunks ? 24 : 29, maxWidth: width - 110 }}>
              {phase}
            </Heading>
            {status && <Copy style={{ color: "#FFDB8C", fontSize: 16 }}>{status.text}</Copy>}
          </View>
          <Copy style={{ color: "#F5E5D9", fontSize: 15 }}>
            {s.phase === "watch"
              ? "Follow the glow"
              : s.phase === "repeat"
                ? "Play it back · no hurry"
                : s.phase === "picture"
                  ? "Blend the sounds"
                  : s.phase === "cleared"
                    ? "A beautiful song"
                    : "A fresh song is waiting"}
          </Copy>
          {!!twistLabel && (
            <Copy style={{ color: "#F5E5D9", fontSize: 12, maxWidth: width - 120 }}>
              {twistLabel}
            </Copy>
          )}
        </View>
      </View>
      {!showPicture ? (
        <>
          <View
            accessibilityLabel={`Pattern progress, ${s.cursor} of ${s.pattern.length}`}
            style={{
              flexDirection: "row",
              gap: 7,
              justifyContent: "center",
              flexWrap: "wrap",
              paddingHorizontal: 14,
              paddingVertical: 5,
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
                    width: 13,
                    height: 13,
                    borderRadius: reached ? 4 : 7,
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
              maxWidth: stageMaxWidth,
              alignItems: "center",
              position: "relative",
              paddingHorizontal: stagePadH,
              paddingVertical: arenaHeight < 520 ? 6 : 10,
              borderRadius: 30,
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
                columnGap: colGap,
                rowGap: rowGap,
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
                      width: shellSize,
                      minHeight: shellSize + 30,
                      paddingBottom: 6,
                      paddingTop: 2,
                      borderRadius: 28,
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
                      size={shellSize - 6}
                      lit={lit}
                      wrong={wrongShell === index}
                      cue={manualGlow === index ? `tap-${tapCue}` : noteKey}
                      outfit={index === 0 ? outfit : "island"}
                    />
                    <Heading
                      style={{
                        fontSize: learning
                          ? Math.min(32, Math.max(22, Math.round(shellSize * 0.3)))
                          : Math.min(22, Math.max(16, Math.round(shellSize * 0.22))),
                        color: "#3D385F",
                        backgroundColor: lit ? "#FFF9E4" : "#FFF1D5",
                        minWidth: learning ? 44 : 36,
                        paddingHorizontal: 9,
                        paddingVertical: 1,
                        borderRadius: 14,
                        borderWidth: 1.5,
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
      {s.level !== "endless" &&
        ["w5", "w6"].includes(s.level.world) &&
        !["over", "cleared", "rest"].includes(s.phase) && (
          <View style={{ gap: 6, alignItems: "center", paddingHorizontal: 12 }}>
            <Button
              quiet
              compact
              disabled={!active}
              onPress={() => {
                if (chunks) closeChunks();
                else {
                  setChunk(0);
                  setChunks(true);
                  setManualGlow(null);
                }
              }}
            >
              {chunks ? "Back to the whole song" : "Listen in short phrases"}
            </Button>
            {chunks && (
              <>
                <Copy style={{ color: "#FFF3D4", textAlign: "center", fontSize: 14 }}>
                  Phrase {chunk + 1}/{songChunks(s.pattern).length} · notes {chunk * 3 + 1}–
                  {Math.min(s.pattern.length, chunk * 3 + 3)}. Listen again whenever you like, then
                  try the whole song.
                </Copy>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button quiet compact disabled={!active || chunkPlaying} onPress={playChunk}>
                    Listen to this phrase
                  </Button>
                  <Button
                    quiet
                    compact
                    disabled={!active || chunkPlaying}
                    onPress={() => setChunk(n => (n + 1) % songChunks(s.pattern).length)}
                  >
                    Next phrase
                  </Button>
                </View>
              </>
            )}
          </View>
        )}
      {!chunks && (
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
      )}
      {s.level === "endless" && (
        <Button quiet compact disabled={!active} onPress={() => dispatch({ type: "finish" })}>
          Finish my free-play song
        </Button>
      )}
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
