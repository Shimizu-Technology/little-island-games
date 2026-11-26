import { Companion } from "../../../islander/Companion";
import { PlayButton, PressControl, uiThreadDrag } from "../../Input";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  measure,
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type AnimatedRef,
} from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import { Text } from "../../../components/Text";
import { Button, Copy } from "../../../components/ui";
import { useReducedMotion } from "../../../components/motion";
import { useArcadeReducer } from "../../loop";
import { MiniStars } from "../../Juice";
import { reefDrag, reefGrab } from "./geometry";
import {
  legalReefMoves,
  migrateReef,
  previewReefPlacement,
  reefGoalValue,
  reefResult,
  reefTransition,
  type CoralPiece,
  type ReefState,
} from "./engine";
import {
  illustrated,
  reefArt,
  reefImageFrame,
  reefSpriteMetrics,
  type ReefArtId,
  type ReefSpriteMode,
} from "./illustrated";
import type { ArcadeResult } from "../../types";

const INK = "#3D2B24";
const CREAM = "#FFF8EC";

const CORAL_SWATCHES = [
  {
    fill: "#F47B7B",
    deep: "#C64B53",
    glaze: "#FFD8CE",
    highlight: "#FFF1E6",
    motif: "#FFF4D8",
  },
  {
    fill: "#FFBE47",
    deep: "#CA811A",
    glaze: "#FFF1BC",
    highlight: "#FFF9DC",
    motif: "#FFFDF0",
  },
  {
    fill: "#41C4A5",
    deep: "#1E8872",
    glaze: "#C5FAF0",
    highlight: "#E4FDF8",
    motif: "#F4FFFB",
  },
  {
    fill: "#A87CE0",
    deep: "#7247AD",
    glaze: "#EAD7FF",
    highlight: "#F6EEFF",
    motif: "#FCF8FF",
  },
] as const;

const coralColors = CORAL_SWATCHES.map(swatch => swatch.fill);

const CORAL_SHAPES = [
  "M17 35V18L8 15V7Q8 3 13 5V11L18 12V5Q18 1 23 3V17L28 14V8Q33 4 34 9V18L23 24V35Z",
  "M9 35Q0 25 7 15Q8 6 15 9Q22-1 29 8Q40 11 35 22Q41 32 30 35Z",
  "M7 34Q-1 27 7 23L15 21L6 17Q2 10 10 10L20 17L17 6Q21-2 26 5L25 17L32 10Q40 9 37 17L27 25L34 29Q38 37 29 35Z",
  "M7 34L4 19Q3 11 9 13L13 20L12 8Q14 1 19 6L22 19L27 8Q33 3 34 10L32 24Q42 34 30 35Z",
] as const;

export const ReefArtSprite = memo(function ReefArtSprite({
  id,
  size,
  mode = "stage",
  testID,
}: {
  id: ReefArtId;
  size: number;
  mode?: ReefSpriteMode;
  testID?: string;
}) {
  const art = reefArt(id);
  const { canvas } = reefSpriteMetrics(size, mode);
  const frame = reefImageFrame(art, canvas, mode);
  return (
    <View
      testID={testID ? `${testID}-stage` : undefined}
      pointerEvents="none"
      style={{
        width: canvas,
        height: canvas,
        position: "relative",
        overflow: "visible",
      }}
    >
      <Image
        testID={testID}
        source={art.source()}
        resizeMode="contain"
        fadeDuration={0}
        accessible={false}
        style={frame}
      />
    </View>
  );
});

const ReefRock = memo(function ReefRock({ size }: { size: number }) {
  return (
    <Svg width={size * 0.86} height={size * 0.82} viewBox="0 0 40 38" accessible={false}>
      <Ellipse cx={20} cy={34} rx={15} ry={3.2} fill="#1E525E" opacity={0.28} />
      <Path
        d="M5 29Q4 18 11 11Q17 5 26 7Q35 9 36 20Q37 31 28 33H11Q6 33 5 29Z"
        fill="#6D8E8C"
        stroke={INK}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <Path
        d="M8 27Q9 17 16 12Q22 9 29 12Q25 18 22 21Q15 24 8 27Z"
        fill="#9CB9B0"
        opacity={0.7}
      />
      <Ellipse cx={15} cy={14} rx={4.5} ry={2.2} fill="#E4F2E8" opacity={0.62} />
      <Circle cx={27} cy={24} r={2.2} fill="#4E6F70" />
      <Circle cx={13} cy={25} r={1.6} fill="#4E6F70" />
    </Svg>
  );
});

export const Coral = memo(function Coral({
  color,
  variant = 0,
  fish = false,
  size,
}: {
  color: string;
  variant?: number;
  fish?: boolean;
  size: number;
}) {
  const index = ((variant % 4) + 4) % 4;
  const swatch = CORAL_SWATCHES[index];
  const primary = color || swatch.fill;
  const fishBubbleSize = Math.max(20, Math.round(size * 0.84));
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
        {/* Plump glazed storybook coral tile base */}
        <Rect
          x={1.5}
          y={1.5}
          width={37}
          height={37}
          rx={8.5}
          fill={swatch.deep}
          stroke={INK}
          strokeWidth={1.7}
        />
        <Rect x={2.7} y={2.5} width={34.6} height={31.2} rx={7} fill={primary} />
        {/* Warm sunlit top glaze & specular pill */}
        <Path
          d="M9 5.2H31Q35 5.2 35.5 9.2Q28 12.2 20 12.2Q12 12.2 4.5 9.2Q5 5.2 9 5.2Z"
          fill={swatch.glaze}
          opacity={0.72}
        />
        <Rect x={7.5} y={5.8} width={11} height={3.2} rx={1.6} fill={swatch.highlight} opacity={0.92} />
        <Circle cx={22} cy={7.4} r={1.4} fill={swatch.highlight} opacity={0.9} />
        {/* Sculpted coral silhouette */}
        <G transform="translate(8 8.5) scale(.6)">
          <Ellipse cx={21} cy={35} rx={15} ry={3} fill={INK} opacity={0.18} />
          <Path
            d={CORAL_SHAPES[index]}
            fill={swatch.glaze}
            fillOpacity={0.55}
            stroke={INK}
            strokeWidth={2.1}
            strokeLinejoin="round"
          />
          <Path
            d={
              index % 2
                ? "M11 17Q14 10 18 12M26 12L29 15M12 29L15 30"
                : "M19 29V23M11 9V12M29 12V15"
            }
            fill="none"
            stroke={swatch.motif}
            strokeWidth={2.8}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      {fish && (
        <View
          testID="reef-trapped-fish"
          pointerEvents="none"
          style={{
            position: "absolute",
            width: fishBubbleSize,
            height: fishBubbleSize,
            borderRadius: fishBubbleSize / 2,
            backgroundColor: "#E8FBFFCC",
            borderWidth: 1.8,
            borderColor: "#FFF9E2",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ReefArtSprite id="fish" size={fishBubbleSize} mode="badge" />
        </View>
      )}
    </View>
  );
});

export function learnNumberBadgeMetrics(
  cell: number,
  variant: "cell" | "fish" | "tray",
  value = 6,
) {
  const viewBoxSize = 40;
  const circleRadius = 17.5;
  const strokeWidth = 3.6;
  const innerDiameter = (circleRadius - strokeWidth / 2) * 2;
  const twoDigit = Math.abs(value) >= 10;
  const fontSize = twoDigit ? 18 : 22;
  const baselineY = twoDigit ? 26.4 : 27.6;
  const diameter =
    variant === "fish"
      ? Math.max(14, Math.min(Math.max(14, cell - 6), Math.round(cell * 0.52)))
      : variant === "tray"
        ? Math.max(14, Math.min(Math.max(14, cell - 2), Math.round(cell * 0.62)))
        : Math.max(16, Math.min(Math.max(16, cell - 5), Math.round(cell * 0.58)));
  return {
    diameter,
    viewBoxSize,
    circleRadius,
    strokeWidth,
    innerDiameter,
    fontSize,
    baselineY,
  };
}

export const LearnNumberBadge = memo(function LearnNumberBadge({
  value,
  cell,
  variant,
  testID,
}: {
  value: number;
  cell: number;
  variant: "cell" | "fish" | "tray";
  testID?: string;
}) {
  const metrics = learnNumberBadgeMetrics(cell, variant, value);
  return (
    <View
      testID={testID}
      pointerEvents="none"
      style={{
        position: "absolute",
        ...(variant === "fish" ? { top: 1, right: 1 } : null),
        width: metrics.diameter,
        height: metrics.diameter,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={metrics.diameter}
        height={metrics.diameter}
        viewBox={`0 0 ${metrics.viewBoxSize} ${metrics.viewBoxSize}`}
        accessible={false}
      >
        <Circle
          cx={metrics.viewBoxSize / 2}
          cy={metrics.viewBoxSize / 2}
          r={metrics.circleRadius}
          fill={CREAM}
          stroke={INK}
          strokeWidth={metrics.strokeWidth}
        />
        <SvgText
          x={metrics.viewBoxSize / 2}
          y={metrics.baselineY}
          fill={INK}
          fontSize={metrics.fontSize}
          fontWeight="900"
          fontFamily="Avenir Next, Helvetica, Arial, sans-serif"
          textAnchor="middle"
        >
          {value}
        </SvgText>
      </Svg>
    </View>
  );
});

function PieceArt({
  piece,
  cell = 26,
  numbers = false,
  lifted = false,
}: {
  piece: CoralPiece;
  cell?: number;
  numbers?: boolean;
  lifted?: boolean;
}) {
  const w = Math.max(...piece.cells.map(c => c[1])) + 1;
  const h = Math.max(...piece.cells.map(c => c[0])) + 1;
  return (
    <View style={{ width: w * cell, height: h * cell }}>
      {piece.cells.map(([r, c], i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            top: r * cell,
            left: c * cell,
            width: cell,
            height: cell,
            alignItems: "center",
            justifyContent: "center",
            ...(lifted
              ? {
                  borderRadius: Math.max(6, Math.round(cell * 0.22)),
                  boxShadow: "0 6px 12px #14434F59, 0 0 0 2px #FFF7C7B8",
                }
              : null),
          }}
        >
          <Coral color={coralColors[piece.color % 4]} variant={piece.color} size={cell} />
          {numbers && (
            <LearnNumberBadge
              value={piece.value}
              cell={cell}
              variant="tray"
              testID={lifted ? "reef-lift-number-badge" : "reef-tray-number-badge"}
            />
          )}
        </View>
      ))}
    </View>
  );
}

function DraggablePiece({
  piece,
  slot,
  selected,
  active,
  board,
  cell,
  numbers,
  cardWidth,
  cardHeight,
  reduced,
  onSelect,
  onHover,
  onDrop,
}: {
  piece: CoralPiece;
  slot: number;
  selected: boolean;
  active: boolean;
  board: AnimatedRef<Animated.View>;
  cell: number;
  numbers: boolean;
  cardWidth: number;
  cardHeight: number;
  reduced: boolean;
  onSelect: (slot: number) => void;
  onHover: (spot: { row: number; col: number } | null) => void;
  onDrop: (slot: number, row: number, col: number) => void;
}) {
  const point = useSharedValue({ x: 0, y: 0, down: false });
  const card = useAnimatedRef<Animated.View>();
  const art = useAnimatedRef<Animated.View>();
  const grab = useSharedValue({ row: 0, col: 0, x: 0.5, y: 0.5 });
  const origin = useSharedValue({ x: 0, y: 0, startX: 0, startY: 0 });
  const rect = useSharedValue({ x: 0, y: 0, cell });
  const selectLift = useSharedValue(selected ? 1 : 0);

  const maxSpan = Math.max(
    ...piece.cells.map(p => p[0] + 1),
    ...piece.cells.map(p => p[1] + 1),
  );
  const availArt = Math.max(36, Math.min(cardWidth - 18, cardHeight - 30));
  const trayCell = Math.min(27, availArt / maxSpan);

  useEffect(() => {
    if (reduced) {
      selectLift.value = selected ? 1 : 0;
      return;
    }
    selectLift.value = withSpring(selected ? 1 : 0, {
      damping: 13,
      stiffness: 240,
      mass: 0.8,
    });
    return () => {
      cancelAnimation(selectLift);
    };
  }, [selected, reduced, selectLift]);

  const gesture = useMemo(
    () =>
      uiThreadDrag(point)
        .enabled(active)
        // eslint-disable-next-line react-hooks/refs -- Gesture callbacks measure animated refs only on UI-thread touch events.
        .onBegin(e => {
          "worklet";
          // Capture the occupied cell at touch-down, before a quick native drag can move.
          point.set({ x: e.x, y: e.y, down: true });
          const tray = measure(card);
          const pieceRect = measure(art);
          const reef = measure(board);
          if (tray && pieceRect && reef) {
            rect.set({ x: reef.pageX, y: reef.pageY, cell });
            origin.set({ x: tray.pageX, y: tray.pageY, startX: e.x, startY: e.y });
            grab.set(
              reefGrab(
                piece.cells,
                tray.pageX + e.x - pieceRect.pageX,
                tray.pageY + e.y - pieceRect.pageY,
                trayCell,
              ),
            );
          }
          runOnJS(onSelect)(slot);
        })
        .onEnd((e, success) => {
          "worklet";
          if (success && Math.hypot(e.x - origin.value.startX, e.y - origin.value.startY) > 8) {
            const spot = reefDrag(origin.value.x + e.x, origin.value.y + e.y, rect.value, grab.value);
            runOnJS(onDrop)(slot, spot.row, spot.col);
          }
          runOnJS(onHover)(null);
        }),
    [point, active, card, art, board, cell, rect, origin, grab, piece.cells, trayCell, onSelect, slot, onDrop, onHover],
  );

  useAnimatedReaction(
    () => {
      const p = point.value;
      const o = origin.value;
      const dragging = p.down && Math.hypot(p.x - o.startX, p.y - o.startY) > 8;
      const spot = reefDrag(o.x + p.x, o.y + p.y, rect.value, grab.value);
      return { dragging, row: spot.row, col: spot.col };
    },
    (now, before) => {
      if (
        now.dragging !== before?.dragging ||
        (now.dragging && (now.row !== before?.row || now.col !== before?.col))
      ) {
        runOnJS(onHover)(now.dragging ? { row: now.row, col: now.col } : null);
      }
    },
    [onHover],
  );

  const cardMotion = useAnimatedStyle(() => {
    const p = point.value;
    const o = origin.value;
    const dragging = active && p.down && Math.hypot(p.x - o.startX, p.y - o.startY) > 8;
    return {
      opacity: dragging ? 0.36 : 1,
      transform: [
        { translateY: reduced ? 0 : -selectLift.value * 3 },
        { scale: reduced ? 1 : dragging ? 0.96 : 1 + selectLift.value * 0.035 },
      ],
    };
  });

  const floating = useAnimatedStyle(() => {
    const p = point.value;
    const o = origin.value;
    const dragging = active && p.down && Math.hypot(p.x - o.startX, p.y - o.startY) > 8;
    const spot = reefDrag(o.x + p.x, o.y + p.y, rect.value, grab.value);
    return {
      opacity: dragging ? 1 : 0,
      transform: [
        { translateX: spot.left - o.x },
        { translateY: spot.top - o.y },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        ref={card}
        collapsable={false}
        style={{
          zIndex: selected ? 100 : 1,
          ...(Platform.OS === "web" ? { touchAction: "none" as const } : {}),
        }}
      >
        <Animated.View style={cardMotion}>
          <PressControl
            testID={`coral-piece-${slot}`}
            accessibilityLabel={`Piece ${slot + 1}, ${numbers ? `number ${piece.value}` : `${piece.cells.length} corals`}${selected ? ", selected" : ""}. Drag any coral, or tap then tap a reef cell.`}
            accessibilityState={{ selected, disabled: !active }}
            disabled={!active}
            onPress={() => onSelect(slot)}
            style={{
              height: cardHeight,
              width: cardWidth,
              minWidth: 44,
              minHeight: 44,
              paddingHorizontal: 6,
              paddingVertical: 5,
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: selected ? "#FFF2C8" : CREAM,
              borderColor: selected ? "#E69E2E" : "#C9A878",
              borderWidth: selected ? 3 : 2.5,
              borderRadius: 20,
              boxShadow: selected ? "0 5px 0 #BA7922" : "0 4px 0 #26606F",
            }}
          >
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Animated.View ref={art} collapsable={false}>
                <PieceArt piece={piece} numbers={numbers} cell={trayCell} />
              </Animated.View>
            </View>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 1,
                borderRadius: 9,
                backgroundColor: selected ? "#F4B43F" : "#EFE1C4",
                borderWidth: 1,
                borderColor: selected ? INK : "#C9A878",
              }}
            >
              <Text
                style={{
                  color: INK,
                  fontSize: cardHeight < 86 ? 10 : 11,
                  lineHeight: cardHeight < 86 ? 13 : 14,
                  fontWeight: "900",
                }}
              >
                {selected ? "READY" : `#${slot + 1}`}
              </Text>
            </View>
          </PressControl>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          testID={`coral-lift-${slot}`}
          style={[{ position: "absolute", top: 0, left: 0 }, floating]}
        >
          <PieceArt piece={piece} numbers={numbers} cell={cell} lifted />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function SparklingTrail({
  x,
  y,
  cell,
  index,
  reduced,
}: {
  x: number;
  y: number;
  cell: number;
  index: number;
  reduced: boolean;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    if (!reduced) {
      t.value = withDelay(
        (index % 4) * 35,
        withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) }),
      );
    }
    return () => {
      cancelAnimation(t);
    };
  }, [index, reduced, t]);

  const driftX = (index % 2 === 0 ? -1 : 1) * (cell * 0.28 + (index % 3) * 4);
  const style = useAnimatedStyle(() => ({
    opacity: reduced ? 0.85 : Math.max(0, 1 - t.value * 1.1),
    transform: [
      { translateX: reduced ? 0 : t.value * driftX },
      { translateY: reduced ? 0 : -t.value * (cell * 0.95) },
      { scale: reduced ? 1 : 0.7 + (1 - t.value) * 0.55 },
    ],
  }));

  const starSize = Math.max(12, Math.round(cell * 0.36));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: x, top: y }, style]}
    >
      <Svg width={starSize} height={starSize} viewBox="0 0 20 20" accessible={false}>
        <Path
          d="M10 1L12.3 7.7L19 10L12.3 12.3L10 19L7.7 12.3L1 10L7.7 7.7Z"
          fill={index % 2 === 0 ? "#FFF4B2" : "#B8FFF1"}
          stroke="#B47626"
          strokeWidth={1.1}
        />
      </Svg>
    </Animated.View>
  );
}

function ClearFishSwimmer({
  cellIndex,
  order,
  cell,
  reduced,
}: {
  cellIndex: number;
  order: number;
  cell: number;
  reduced: boolean;
}) {
  const swim = useSharedValue(0);
  const wiggle = useSharedValue(0);

  useEffect(() => {
    swim.value = 0;
    wiggle.value = 0;
    if (!reduced) {
      swim.value = withDelay(
        order * 45,
        withTiming(1, { duration: 580, easing: Easing.out(Easing.cubic) }),
      );
      wiggle.value = withRepeat(
        withTiming(1, { duration: 140, easing: Easing.inOut(Easing.sin) }),
        4,
        true,
      );
    }
    return () => {
      cancelAnimation(swim);
      cancelAnimation(wiggle);
    };
  }, [order, reduced, swim, wiggle]);

  const spriteSize = Math.max(38, Math.round(cell * 1.38));
  const left = (cellIndex % 8) * cell + (cell - spriteSize) / 2;
  const top = Math.floor(cellIndex / 8) * cell + (cell - spriteSize) / 2;

  const fishStyle = useAnimatedStyle(() => {
    const progress = swim.value;
    const fade = reduced ? 1 : progress < 0.72 ? 1 : Math.max(0, (1 - progress) / 0.28);
    return {
      opacity: fade,
      transform: [
        { translateX: reduced ? 0 : progress * cell * 0.95 },
        { translateY: reduced ? 0 : -progress * cell * 1.75 },
        { rotate: reduced ? "0deg" : `${(wiggle.value - 0.5) * 10 - progress * 8}deg` },
        { scale: reduced ? 1 : 0.92 + Math.sin(progress * Math.PI) * 0.2 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left, top }, fishStyle]}
    >
      <ReefArtSprite id="fish" size={spriteSize} mode="stage" testID={`reef-clear-fish-${order}`} />
    </Animated.View>
  );
}

export const REDUCED_CLEAR_DISMISS_MS = 650;

function ClearEffects({
  state,
  cell,
  boardSize,
  reduced,
}: {
  state: ReefState;
  cell: number;
  boardSize: number;
  reduced: boolean;
}) {
  const age = useSharedValue(0);
  const pearlPop = useSharedValue(reduced ? 1 : 0);
  const [dismissedMove, setDismissedMove] = useState<number | null>(null);

  useEffect(() => {
    if (!reduced) return;
    const move = state.moves;
    const timer = setTimeout(() => {
      setDismissedMove(move);
    }, REDUCED_CLEAR_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [reduced, state.moves]);

  useEffect(() => {
    age.value = 0;
    pearlPop.value = reduced ? 1 : 0;
    if (!reduced) {
      age.value = withTiming(1, { duration: 560, easing: Easing.out(Easing.quad) });
      pearlPop.value = withSequence(
        withTiming(1.12, { duration: 150, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 10, stiffness: 210 }),
      );
    }
    return () => {
      cancelAnimation(age);
      cancelAnimation(pearlPop);
    };
  }, [age, pearlPop, reduced]);

  const flash = useAnimatedStyle(() => ({
    opacity: reduced ? 0.55 : Math.max(0, 1 - age.value * 2.5),
  }));

  const pearlBanner = useAnimatedStyle(() => ({
    opacity: reduced ? 1 : age.value < 0.7 ? 1 : Math.max(0, (1 - age.value) / 0.3),
    transform: [
      { translateY: reduced ? 0 : -age.value * 24 },
      { scale: reduced ? 1 : 0.85 + pearlPop.value * 0.15 },
    ],
  }));

  if (reduced && dismissedMove === state.moves) return null;

  const at = state.lastClear[0] ?? 0;
  const clearedLines = Math.max(1, Math.round(state.lastClear.length / 8));
  const bannerWidth = Math.min(boardSize - 12, clearedLines >= 2 || state.lastFish > 0 ? 156 : 118);
  const atCol = at % 8;
  const anchorX = state.lastFishCells.length
    ? (atCol < 4 ? (atCol + 2.3) * cell : (atCol - 2.3) * cell)
    : (atCol + 0.5) * cell;
  const rawLeft = anchorX - bannerWidth / 2;
  const bannerLeft = Math.max(6, Math.min(boardSize - bannerWidth - 6, rawLeft));
  const bannerTop = Math.max(8, Math.min(boardSize - 56, Math.floor(at / 8) * cell - 20));
  const sparkleCells = state.lastClear.filter((_, idx) => idx % 2 === 0).slice(0, 8);

  return (
    <View testID="reef-clear-effects" pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, flash]}>
        {state.lastClear.map(i => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: (i % 8) * cell + 1,
              top: Math.floor(i / 8) * cell + 1,
              width: cell - 2,
              height: cell - 2,
              borderRadius: 9,
              backgroundColor: "#FFF3B0",
              borderWidth: 2,
              borderColor: "#FFFCE8",
            }}
          />
        ))}
      </Animated.View>

      {sparkleCells.map((i, idx) => (
        <SparklingTrail
          key={`spark-${i}`}
          x={(i % 8) * cell + cell * 0.25}
          y={Math.floor(i / 8) * cell + cell * 0.15}
          cell={cell}
          index={idx}
          reduced={reduced}
        />
      ))}

      {!!state.lastClear.length && (
        <Animated.View
          testID="reef-clear-pearl-pop"
          style={[
            {
              position: "absolute",
              left: bannerLeft,
              top: bannerTop,
              minWidth: bannerWidth,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: 18,
              backgroundColor: CREAM,
              borderWidth: 2.5,
              borderColor: "#E8A638",
              boxShadow: "0 4px 0 #3D2B2466",
            },
            pearlBanner,
          ]}
        >
          <ReefArtSprite id="pearl" size={32} mode="badge" testID="reef-clear-pearl" />
          <View>
            <Text style={{ color: INK, fontWeight: "900", fontSize: 16, lineHeight: 19 }}>
              +{state.lastPoints}
            </Text>
            {(clearedLines >= 2 || state.lastFish > 0) && (
              <Text style={{ color: "#B8661E", fontWeight: "900", fontSize: 10, lineHeight: 12 }}>
                {state.lastFish > 0 ? `${state.lastFish} FISH FREE!` : `${clearedLines}x PEARL!`}
              </Text>
            )}
          </View>
        </Animated.View>
      )}

      {state.lastFishCells.map((i, order) => (
        <ClearFishSwimmer key={i} cellIndex={i} order={order} cell={cell} reduced={reduced} />
      ))}
    </View>
  );
}

const FloatingCharm = memo(function FloatingCharm({
  id,
  size,
  active,
  reduced,
  testID,
}: {
  id: ReefArtId;
  size: number;
  active: boolean;
  reduced: boolean;
  testID?: string;
}) {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = 0;
    if (active && !reduced) {
      bob.value = withRepeat(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    }
    return () => {
      cancelAnimation(bob);
    };
  }, [active, reduced, bob]);

  const { bobAmp, maxTiltDeg } = reefSpriteMetrics(size, "stage");
  const motion = useAnimatedStyle(() => ({
    transform: [
      { translateY: reduced ? 0 : (bob.value - 0.5) * 2 * bobAmp },
      { rotate: reduced ? "0deg" : `${(bob.value - 0.5) * maxTiltDeg}deg` },
    ],
  }));

  return (
    <Animated.View style={motion}>
      <ReefArtSprite id={id} size={size} mode="stage" testID={testID} />
    </Animated.View>
  );
});

export type ReefBoardLayoutInput = {
  width: number;
  height: number;
  helper: boolean;
  endless: boolean;
};

export type ReefBoardLayout = {
  side: boolean;
  short: boolean;
  compactWidth: boolean;
  trayVertical: boolean;
  hudCompact: boolean;
  outerPadH: number;
  outerPadTop: number;
  outerPadBottom: number;
  sectionGap: number;
  hudHeight: number;
  framePad: number;
  frameBevel: number;
  boardSize: number;
  cell: number;
  cardWidth: number;
  cardHeight: number;
  trayGap: number;
  sideColumnWidth: number;
  showCharm: boolean;
  charmSize: number;
  showCompanion: boolean;
  guidanceHeight: number;
  totalHeight: number;
};

/**
 * Pure deterministic layout solver for ReefBoard so HUD, framed 8x8 board, all 3 piece tray cards,
 * optional Helper/Endless controls, and guidance ribbon fit inside `arcade-arena` with zero clipping
 * across compact portrait (320x568), phone portrait (390x844), phone landscape (844x390), and tablet (1024x768).
 */
export function computeReefBoardLayout({
  width,
  height,
  helper,
  endless,
}: ReefBoardLayoutInput): ReefBoardLayout {
  const safeW = Math.max(280, width);
  const safeH = Math.max(240, height);
  const side = safeW > safeH && safeW >= 540;
  const short = safeH < 460;
  const compactWidth = safeW < 360;
  const hudCompact = compactWidth || short;
  const outerPadH = compactWidth ? 6 : side ? 12 : 10;
  const outerPadTop = short || safeH < 540 ? 4 : 8;
  const outerPadBottom = short || safeH < 540 ? 4 : 10;
  const sectionGap = short || safeH < 540 ? 6 : 10;
  const hudHeight = 44;
  const framePad = compactWidth || short ? 6 : 8;
  const frameBorder = 5;
  const frameBevel = compactWidth || short ? 4 : 6;
  const frameVertical = framePad * 2 + frameBorder + frameBevel;
  const frameHorizontal = framePad * 2 + frameBorder;
  const guidanceHeight = short ? 36 : 44;
  const extraControlsHeight = (helper ? 44 + sectionGap : 0) + (endless ? 44 + sectionGap : 0);

  if (side) {
    const trayVertical = !short && safeH >= 520;
    const trayGap = short ? 6 : 8;
    const cardWidth = trayVertical ? 112 : short ? 92 : 104;
    const cardHeight = trayVertical ? 102 : short ? 82 : 96;
    const sideColumnWidth = trayVertical
      ? Math.max(200, Math.min(270, Math.floor(safeW * 0.28)))
      : Math.max(cardWidth * 3 + trayGap * 2, Math.min(350, Math.floor(safeW * 0.45)));
    const mainGap = short ? 12 : 18;

    const maxBoardW = safeW - outerPadH * 2 - sideColumnWidth - mainGap - frameHorizontal;
    const maxBoardH = safeH - outerPadTop - outerPadBottom - hudHeight - sectionGap - frameVertical;
    const rawBoard = Math.max(128, Math.min(584, maxBoardW, maxBoardH));
    const boardSize = Math.floor(rawBoard / 8) * 8;
    const cell = boardSize / 8;

    const sideUsed =
      (trayVertical ? cardHeight * 3 + trayGap * 2 : cardHeight) +
      sectionGap +
      guidanceHeight +
      extraControlsHeight;
    const charmSize = trayVertical && safeH - hudHeight - sideUsed > 100 ? 74 : 52;
    const showCharm = !short && safeH - hudHeight - outerPadTop - outerPadBottom - sideUsed >= charmSize + 18;
    const showCompanion = showCharm && safeH >= 640;

    return {
      side: true,
      short,
      compactWidth,
      trayVertical,
      hudCompact,
      outerPadH,
      outerPadTop,
      outerPadBottom,
      sectionGap,
      hudHeight,
      framePad,
      frameBevel,
      boardSize,
      cell,
      cardWidth,
      cardHeight,
      trayGap,
      sideColumnWidth,
      showCharm,
      charmSize,
      showCompanion,
      guidanceHeight,
      totalHeight: outerPadTop + hudHeight + sectionGap + boardSize + frameVertical + outerPadBottom,
    };
  }

  // Portrait layout
  const trayGap = compactWidth ? 6 : 8;
  const maxTrayRowWidth = safeW - outerPadH * 2;
  const cardWidth = Math.max(72, Math.min(112, Math.floor((maxTrayRowWidth - trayGap * 2) / 3)));
  const cardHeight = safeH < 560 ? 76 : safeH < 660 ? 88 : 100;
  const showCharm = safeH >= 640;
  const showCompanion = safeH >= 680;
  const charmSize = 54;
  const footerHeight = Math.max(guidanceHeight, showCharm ? charmSize : guidanceHeight);

  // Portrait vertical bands: HUD + BoardFrame + Tray (+ 4px drop shadow) + Footer + optional Helper/Endless
  const fixedBands =
    outerPadTop +
    hudHeight +
    sectionGap +
    frameVertical +
    sectionGap +
    cardHeight +
    4 +
    sectionGap +
    footerHeight +
    extraControlsHeight +
    outerPadBottom;

  const maxBoardW = safeW - outerPadH * 2 - frameHorizontal;
  const maxBoardH = safeH - fixedBands;
  const rawBoard = Math.max(128, Math.min(584, maxBoardW, maxBoardH));
  const boardSize = Math.floor(rawBoard / 8) * 8;
  const cell = boardSize / 8;

  return {
    side: false,
    short,
    compactWidth,
    trayVertical: false,
    hudCompact,
    outerPadH,
    outerPadTop,
    outerPadBottom,
    sectionGap,
    hudHeight,
    framePad,
    frameBevel,
    boardSize,
    cell,
    cardWidth,
    cardHeight,
    trayGap,
    sideColumnWidth: maxTrayRowWidth,
    showCharm,
    charmSize,
    showCompanion,
    guidanceHeight,
    totalHeight: fixedBands + boardSize,
  };
}

function ReefHudPill({
  icon,
  children,
  label,
  compact,
  tone = "cream",
  testID,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  label?: string;
  compact: boolean;
  tone?: "cream" | "lagoon";
  testID?: string;
}) {
  const dark = tone === "lagoon";
  return (
    <View
      testID={testID}
      accessibilityLabel={label}
      style={{
        minHeight: 44,
        paddingHorizontal: compact ? 8 : 12,
        paddingVertical: 6,
        borderRadius: 22,
        backgroundColor: dark ? "#1F5668" : CREAM,
        borderWidth: 2,
        borderColor: dark ? "#76C9C5" : "#D6B076",
        flexDirection: "row",
        alignItems: "center",
        gap: compact ? 4 : 6,
        boxShadow: dark ? "0 3px 0 #133947" : "0 3px 0 #26606F55",
      }}
    >
      {icon}
      <Copy
        maxFontSizeMultiplier={1.4}
        style={{
          color: dark ? CREAM : INK,
          fontWeight: "900",
          fontSize: compact ? 13 : 15,
        }}
      >
        {children}
      </Copy>
    </View>
  );
}

export function ReefBoard({
  initial,
  active,
  helper,
  onResult,
  onTone,
  width,
  height,
  onSave,
}: {
  width: number;
  height: number;
  initial: ReefState;
  onSave?: (state: ReefState) => void;
  active: boolean;
  helper: boolean;
  onResult: (result: ArcadeResult, helped?: boolean) => void;
  onTone: (tone: string) => void;
}) {
  const reduce = useCallback(
    (before: ReefState, input: Parameters<typeof reefTransition>[1]) => {
      const next = reefTransition(before, input);
      if (next !== before && next.status === "playing") onSave?.(next);
      return next;
    },
    [onSave],
  );
  const { snapshot: s, dispatch, state } = useArcadeReducer(
    migrateReef(initial) ?? initial,
    reduce,
    active,
  );
  const firstState = useRef(initial);
  useEffect(() => {
    if (firstState.current.status === "playing") onSave?.(firstState.current);
  }, [onSave]);

  const selection = useRef<number | null>(0);
  const [selected, setSelected] = useState<number | null>(0);
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  const board = useAnimatedRef<Animated.View>();
  const reported = useRef(false);
  const [bumped, setBumped] = useState(false);

  const layout = useMemo(
    () =>
      computeReefBoardLayout({
        width,
        height,
        helper,
        endless: s.level === "endless",
      }),
    [width, height, helper, s.level],
  );
  const { boardSize: size, cell } = layout;

  const reduced = useReducedMotion();
  const shake = useSharedValue(0);
  const boardPulse = useSharedValue(1);
  const pulseGlow = useSharedValue(0);
  const frameMotionStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }, { scale: boardPulse.value }],
  }));
  const frameGlowStyle = useAnimatedStyle(() => ({
    opacity: pulseGlow.value,
    transform: [{ translateX: shake.value }, { scale: boardPulse.value }],
  }));

  useEffect(() => {
    return () => {
      cancelAnimation(shake);
      cancelAnimation(boardPulse);
      cancelAnimation(pulseGlow);
    };
  }, [shake, boardPulse, pulseGlow]);

  useEffect(() => {
    if (active && state.current.helper !== helper) dispatch({ type: "helper", value: helper });
  }, [active, helper, dispatch, state]);

  // Keep the final fish release visible before handing the already-terminal engine result to the frame.
  useEffect(() => {
    const result = reefResult(s);
    if (!result || !active || reported.current) return;
    const timer = setTimeout(() => {
      if (!reported.current) {
        reported.current = true;
        onResult(result, helper || !!s.helped);
      }
    }, result.cleared ? 220 : 0);
    return () => clearTimeout(timer);
  }, [s, active, onResult, helper, reduced]);

  const select = useCallback((slot: number) => {
    selection.current = slot;
    setSelected(slot);
    setHover(null);
  }, []);

  const hoverAt = useCallback((spot: { row: number; col: number } | null) => {
    setHover(old => (old?.row === spot?.row && old?.col === spot?.col ? old : spot));
  }, []);

  const place = useCallback(
    (slot: number, row: number, col: number) => {
      if (!active || state.current.status !== "playing") return;
      const before = state.current;
      const next = dispatch({ type: "place", slot, row, col });
      if (next.moves !== before.moves) {
        onTone(next.lastClear.length ? "clear" : "coral");
        setBumped(false);
        const nextSlot = next.pieces[slot] ? slot : next.pieces.findIndex(Boolean);
        selection.current = nextSlot < 0 ? null : nextSlot;
        setSelected(selection.current);
        setHover(null);
        if (!reduced) {
          boardPulse.set(
            withSequence(
              withTiming(next.lastClear.length ? 1.018 : 0.988, { duration: 75 }),
              withSpring(1, { damping: 12, stiffness: 260 }),
            ),
          );
          pulseGlow.set(
            withSequence(
              withTiming(next.lastClear.length ? 0.9 : 0.45, { duration: 75 }),
              withTiming(0, { duration: 240, easing: Easing.out(Easing.quad) }),
            ),
          );
        }
      } else {
        setBumped(true);
        onTone("bump");
        if (!reduced) {
          shake.set(
            withSequence(
              withTiming(-4, { duration: 42 }),
              withTiming(4, { duration: 55 }),
              withTiming(-2, { duration: 48 }),
              withTiming(0, { duration: 60 }),
            ),
          );
        }
      }
    },
    [active, state, dispatch, onTone, reduced, shake, boardPulse, pulseGlow],
  );

  const piece = selected === null ? null : s.pieces[selected];
  const preview = piece && hover ? previewReefPlacement(s, piece, hover.row, hover.col) : null;
  const target = s.level !== "endless" ? s.level.targetSum : undefined;
  const value = reefGoalValue(s);
  const goal = s.level === "endless" ? "points" : s.level.goal;
  const progress = s.level === "endless" ? `${s.score}` : `${value}/${s.level.target}`;
  const stars =
    s.level === "endless"
      ? 0
      : s.moves <= s.level.greatMoves
        ? 3
        : s.moves <= s.level.goodMoves
          ? 2
          : 1;

  const guidanceText = bumped
    ? s.message
    : s.status === "cleared"
      ? "Fish swimming free!"
      : preview?.clear.count
        ? `${preview.clear.count} line${preview.clear.count === 1 ? "" : "s"} will clear!`
        : target
          ? `${target} makes a line · find a partner`
          : s.moves === 0
            ? "Plan room for all three pieces."
            : "Drag any coral · fill rows or columns";

  const trayCards = (
    <View
      testID="reef-piece-tray"
      style={{
        flexDirection: layout.trayVertical ? "column" : "row",
        gap: layout.trayGap,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 4,
      }}
    >
      {s.pieces.map((p, slot) =>
        p ? (
          <DraggablePiece
            key={slot}
            piece={p}
            slot={slot}
            numbers={!!target}
            cardWidth={layout.cardWidth}
            cardHeight={layout.cardHeight}
            selected={selected === slot}
            active={active && s.status === "playing"}
            board={board}
            cell={cell}
            reduced={reduced}
            onSelect={select}
            onHover={hoverAt}
            onDrop={place}
          />
        ) : (
          <View
            key={slot}
            testID={`coral-slot-empty-${slot}`}
            style={{
              width: layout.cardWidth,
              height: layout.cardHeight,
              borderRadius: 20,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: "#E9DFC5AA",
              backgroundColor: "#FFF8EC38",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View style={{ opacity: 0.45 }}>
              <ReefArtSprite id="pearl" size={28} mode="badge" />
            </View>
          </View>
        ),
      )}
    </View>
  );

  const guidancePill = (
    <View
      accessibilityLiveRegion="polite"
      style={{
        flexShrink: 1,
        maxWidth: layout.side ? layout.sideColumnWidth : 520,
      }}
    >
      <Copy
        maxFontSizeMultiplier={1.35}
        style={{
          color: INK,
          textAlign: "center",
          fontSize: layout.short || layout.compactWidth ? 12 : 14,
          fontWeight: "700",
          backgroundColor: CREAM,
          borderWidth: 2,
          borderColor: preview?.clear.count ? "#E8A638" : "#D6B076",
          paddingHorizontal: layout.compactWidth ? 10 : 12,
          paddingVertical: layout.short || layout.compactWidth ? 5 : 7,
          borderRadius: 16,
        }}
      >
        {guidanceText}
      </Copy>
    </View>
  );

  const helperButton = helper ? (
    <PlayButton
      quiet
      compact
      disabled={!active || selected === null || !piece || s.status !== "playing"}
      onPress={() => {
        const move = legalReefMoves(state.current)[0];
        if (move) {
          select(move.slot);
          hoverAt({ row: move.row, col: move.col });
          onTone("coral");
        }
      }}
    >
      Show a fit
    </PlayButton>
  ) : null;

  const endlessButton =
    s.level === "endless" ? (
      <Button quiet compact disabled={!active} onPress={() => dispatch({ type: "finish" })}>
        Finish my free-play reef
      </Button>
    ) : null;

  return (
    <View
      testID="reef-arena-stage"
      style={{
        flex: 1,
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        gap: layout.sectionGap,
        paddingTop: layout.outerPadTop,
        paddingBottom: layout.outerPadBottom,
        paddingHorizontal: layout.outerPadH,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Sunlit tropical lagoon backdrop */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice" accessible={false}>
          <Defs>
            <LinearGradient id="reef-lagoon-bg" x1="0" y1="0" x2="0.4" y2="1">
              <Stop offset="0" stopColor="#2E9EB0" />
              <Stop offset="0.52" stopColor="#48BEB8" />
              <Stop offset="1" stopColor="#7AD6C6" />
            </LinearGradient>
          </Defs>
          <Rect width={800} height={800} fill="url(#reef-lagoon-bg)" />
          <Path d="M40 0H180L460 800H310Z" fill="#FFFCE2" opacity={0.11} />
          <Path d="M440 0H540L790 800H680Z" fill="#FFFCE2" opacity={0.09} />
          <Ellipse cx={150} cy={140} rx={120} ry={22} fill="#D9FFF5" opacity={0.14} />
          <Ellipse cx={640} cy={220} rx={150} ry={26} fill="#D9FFF5" opacity={0.12} />
          <Ellipse cx={410} cy={690} rx={260} ry={38} fill="#FFE9B5" opacity={0.16} />
        </Svg>
      </View>

      {/* Top HUD Bar */}
      <View
        testID="reef-hud"
        style={{
          width: "100%",
          maxWidth: 960,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: layout.hudCompact ? 5 : 8,
          flexWrap: "wrap",
          zIndex: 2,
        }}
      >
        <ReefHudPill
          testID="reef-hud-goal"
          compact={layout.hudCompact}
          label={`${value} of ${s.level === "endless" ? "free play" : s.level.target} ${goal}`}
          icon={
            <ReefArtSprite
              id={goal === "fish" ? "fish" : "pearl"}
              size={layout.hudCompact ? 24 : 28}
              mode="badge"
              testID="reef-hud-emblem"
            />
          }
        >
          {progress} {goal}
        </ReefHudPill>
        <ReefHudPill testID="reef-hud-stars" compact={layout.hudCompact}>
          <MiniStars stars={stars} />
        </ReefHudPill>
        <ReefHudPill testID="reef-hud-moves" compact={layout.hudCompact} tone="lagoon">
          {s.moves} moves
        </ReefHudPill>
      </View>

      {/* Main Play Row / Column: Framed Reef Board + Piece Tray */}
      <View
        style={{
          flexDirection: layout.side ? "row" : "column",
          alignItems: "center",
          justifyContent: "center",
          gap: layout.side ? (layout.short ? 12 : 18) : layout.sectionGap,
          width: "100%",
          zIndex: 3,
        }}
      >
        {/* Static anchor around exact 8x8 board ref; honey wood frame & glow animate as independent siblings */}
        <View
          testID="reef-board-shell"
          style={{
            position: "relative",
            padding: layout.framePad + 2.5,
          }}
        >
          <Animated.View
            pointerEvents="none"
            testID="reef-board-frame"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 24,
                backgroundColor: "#E4B878",
                borderWidth: 2.5,
                borderColor: INK,
                boxShadow: `0 ${layout.frameBevel}px 0 #9F6D34`,
              },
              frameMotionStyle,
            ]}
          />
          <View style={{ position: "relative", width: size, height: size }}>
            <Animated.View
              ref={board}
              collapsable={false}
              testID="reef-board"
              style={{
                width: size,
                height: size,
                backgroundColor: "#BCE3C7",
                borderRadius: 16,
                borderWidth: 0,
                overflow: "hidden",
                flexDirection: "row",
                flexWrap: "wrap",
              }}
            >
              {/* Luminous shallow-lagoon seabed & sunlit caustics */}
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <Svg width="100%" height="100%" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" accessible={false}>
                    <Defs>
                      <LinearGradient id="reef-bed" x1="0" y1="0" x2="0.85" y2="1">
                        <Stop offset="0" stopColor="#7EDAD1" />
                        <Stop offset="0.55" stopColor="#B6E6C6" />
                        <Stop offset="1" stopColor="#F0DEB0" />
                      </LinearGradient>
                    </Defs>
                    <Rect width={600} height={600} fill="url(#reef-bed)" />
                    <Path
                      d="M0 0H118L415 600H285ZM272 0H334L600 505V600Z"
                      fill="#FFFBE0"
                      opacity={0.22}
                    />
                    {[0, 1, 2, 3].map(i => (
                      <Path
                        key={i}
                        d={`M-50 ${84 + i * 148}Q80 ${32 + i * 148} 195 ${98 + i * 148}T420 ${92 + i * 148}T650 ${98 + i * 148}`}
                        fill="none"
                        stroke="#FFFBE6"
                        strokeWidth={4.2}
                        opacity={0.24}
                      />
                    ))}
                    <Circle cx={105} cy={120} r={34} fill="none" stroke="#FFFCEB" strokeWidth={2.5} opacity={0.2} />
                    <Circle cx={475} cy={420} r={46} fill="none" stroke="#FFFCEB" strokeWidth={2.5} opacity={0.18} />
                    <Path
                      d="M0 600Q32 536 14 504Q60 552 28 600M600 600Q556 544 578 506Q546 538 564 600"
                      fill="#328E7E"
                      opacity={0.22}
                    />
                  </Svg>
                </View>

                {s.board.map((cellValue, i) => {
                  const rock = s.level !== "endless" && s.level.rocks.includes(i);
                  const fish = s.fish.includes(i);
                  const highlighted = !!preview?.cells.includes(i);
                  const clears = !!preview?.clear.cells.includes(i);
                  const row = Math.floor(i / 8);
                  const col = i % 8;
                  const invalid =
                    !preview &&
                    !!hover &&
                    !!piece?.cells.some(([r, c]) => row === hover.row + r && col === hover.col + c);
                  const showCoral = !rock && (cellValue > 0 || highlighted);
                  const coralColorIndex =
                    highlighted && piece
                      ? piece.color
                      : s.appearance[i] >= 0
                        ? s.appearance[i]
                        : 0;

                  return (
                    <PressControl
                      key={i}
                      accessibilityRole="button"
                      accessibilityLabel={`Reef row ${row + 1}, column ${col + 1}, ${rock ? "rock" : cellValue ? (target ? `number ${cellValue}` : "coral") : "open"}${fish ? ", trapped fish" : ""}`}
                      accessibilityState={{ disabled: !active || s.status !== "playing" }}
                      disabled={!active || s.status !== "playing"}
                      onPress={() => {
                        if (selection.current !== null) place(selection.current, row, col);
                      }}
                      style={{
                        width: cell,
                        height: cell,
                        padding: 1.5,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: Math.max(5, Math.round(cell * 0.19)),
                          borderWidth: clears || highlighted || invalid ? 2 : 1,
                          borderColor: invalid
                            ? "#A12E3C"
                            : clears
                              ? "#FFFBE0"
                              : highlighted
                                ? "#E29527"
                                : "#3D2B2424",
                          backgroundColor: invalid
                            ? "#F28B82CC"
                            : clears
                              ? "#FFE77DD9"
                              : highlighted
                                ? "#FFF2BCCC"
                                : (row + col) % 2
                                  ? "#FFF7D828"
                                  : "#2D858C18",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {rock ? (
                          <ReefRock size={cell - 3} />
                        ) : showCoral ? (
                          <>
                            <View style={{ opacity: highlighted && !cellValue ? 0.8 : 1 }}>
                              <Coral
                                color={coralColors[coralColorIndex % 4]}
                                variant={coralColorIndex}
                                fish={fish}
                                size={cell - 4}
                              />
                            </View>
                            {target && (
                              <LearnNumberBadge
                                value={highlighted && piece ? piece.value : cellValue}
                                cell={cell}
                                variant={fish ? "fish" : "cell"}
                                testID={fish ? "reef-fish-number-badge" : "reef-cell-number-badge"}
                              />
                            )}
                          </>
                        ) : invalid ? (
                          <Text
                            allowFontScaling={false}
                            style={{ color: "#7B1E2B", fontWeight: "900", fontSize: Math.max(12, Math.round(cell * 0.42)) }}
                          >
                            ×
                          </Text>
                        ) : i % 7 === 0 ? (
                          <View
                            style={{
                              width: 5,
                              height: 3.5,
                              borderRadius: 2,
                              backgroundColor: "#4D8E84",
                              opacity: 0.36,
                            }}
                          />
                        ) : null}
                      </View>
                    </PressControl>
                  );
                })}
              </Animated.View>

            {!!s.lastClear.length && (
              <ClearEffects
                key={s.moves}
                state={s}
                cell={cell}
                boardSize={size}
                reduced={reduced}
              />
            )}
          </View>
          <Animated.View
            pointerEvents="none"
            testID="reef-board-pulse-glow"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 24,
                borderWidth: 3.5,
                borderColor: "#FFF5B8",
                backgroundColor: "transparent",
              },
              frameGlowStyle,
            ]}
          />
        </View>

        {/* Side Column (landscape) or Tray + Helper Block (portrait) */}
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            gap: layout.sectionGap,
            width: layout.side ? layout.sideColumnWidth : "100%",
            zIndex: 10,
          }}
        >
          {layout.side && layout.showCharm && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <FloatingCharm
                id="fish"
                size={layout.charmSize}
                active={active}
                reduced={reduced}
                testID="reef-hero-fish"
              />
              {layout.showCompanion && (
                <Companion
                  event={s.lastClear.length ? "correct" : "idle"}
                  size={48}
                  active={active}
                />
              )}
            </View>
          )}

          {trayCards}

          {layout.side && guidancePill}

          {(helperButton || (layout.side && endlessButton)) && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {helperButton}
              {layout.side && endlessButton}
            </View>
          )}
        </View>
      </View>

      {/* Portrait Footer Guidance + Charm */}
      {!layout.side && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingHorizontal: 4,
            zIndex: 2,
          }}
        >
          {layout.showCharm && (
            <FloatingCharm
              id="fish"
              size={layout.charmSize}
              active={active}
              reduced={reduced}
              testID="reef-hero-fish"
            />
          )}
          {layout.showCompanion && (
            <Companion
              event={s.lastClear.length ? "correct" : "idle"}
              size={46}
              active={active}
            />
          )}
          {guidancePill}
        </View>
      )}

      {!layout.side && endlessButton}
    </View>
  );
}

// Keep illustrated manifest referenced for static Metro asset bundling even in headless checks.
export { illustrated as reefIllustrated };
