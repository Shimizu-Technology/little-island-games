import React, { useCallback, useEffect, useRef } from "react";
import { View, Platform, type ViewStyle } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { Copy, Button } from "../../../components/ui";
import { Text } from "../../../components/Text";
import { PictureObject } from "../../../learn/art/Objects";
import { useReducedMotion } from "../../../components/motion";
import { StarDisplay } from "../../Art";
import { ArcadeSprite, type SpritePose } from "../../Sprite";
import { useArcadeLoop } from "../../loop";
import type { ArcadeResult } from "../../types";
import type { OutfitId } from "../../progress";
import { GridBackdrop, GridHero, GridObject } from "../grid/Art";
import { DirectionPad, GridBudget, Juice, Shake, useGridInput } from "../grid/Controls";
import type { Direction } from "../grid/rules";
import {
  railHedges,
  railLearning,
  railResult,
  railSnake,
  railStep,
  railTarget,
  railTransition,
  type RailInput,
  type RailState,
} from "./engine";
const tick: RailInput = { type: "tick" };
export function RailBoard({
  initial,
  active,
  helper,
  outfit,
  onResult,
  onTone,
  size,
  wide,
  debug,
}: {
  initial: RailState;
  active: boolean;
  helper: boolean;
  outfit: OutfitId;
  onResult: (r: ArcadeResult) => void;
  onTone: (s: string, haptic?: boolean) => void;
  size: number;
  wide: boolean;
  debug: boolean;
}) {
  const poses = useSharedValue<SpritePose[]>([]),
    reduced = useReducedMotion(),
    unit = (size - 6) / 10;
  const onFrame = useCallback(
    (s: RailState) => {
      const snake = railSnake(s),
        wiggle = reduced
          ? 0
          : Math.sin(s.elapsed * (s.message.includes("Oops") ? 35 : 12)) * (s.message.includes("Oops") ? 0.18 : 0.06);
      poses.set([
        ...Array.from({ length: 40 }, (_, i) => ({
          x: (s.body[i]?.x ?? 0) * unit,
          y: (s.body[i]?.y ?? 0) * unit,
          opacity: s.body[i] ? 1 : 0,
          angle: i === 0 ? wiggle : 0,
          scale: i === 0 ? 1 + Math.abs(wiggle) : 0.85,
        })),
        ...Array.from({ length: 5 }, (_, i) => ({
          x: (snake[i]?.x ?? 0) * unit,
          y: (snake[i]?.y ?? 0) * unit,
          opacity: snake[i] ? 1 : 0,
        })),
        ...[0, 1, 2].map((i) => ({
          x: (2 + i * 3) * unit + (reduced ? 0 : Math.sin((s.moves + s.elapsed) * 0.7 + i) * 9),
          y: (2 + i * 2) * unit + (reduced ? 0 : Math.cos((s.moves + s.elapsed) * 0.5 + i) * 6),
          opacity: 0.65,
        })),
      ]);
    },
    [poses, reduced, unit]
  );
  const {
      snapshot: s,
      dispatch,
      state,
      budget,
    } = useArcadeLoop({ initial, step: railStep, reduce: railTransition, input: tick, active, onFrame }),
    reported = useRef(false),
    last = useRef({ collected: 0, bumps: 0 });
  useEffect(() => {
    if (active && state.current.helper !== helper) dispatch({ type: "helper", value: helper });
  }, [active, helper, dispatch, state]);
  useEffect(() => {
    if (s.collected > last.current.collected) onTone("coral");
    if (s.bumps > last.current.bumps) onTone("shell-0");
    last.current = { collected: s.collected, bumps: s.bumps };
    const r = railResult(s);
    if (r && !reported.current) {
      reported.current = true;
      onResult(r);
    }
  }, [s, onResult, onTone]);
  const move = useCallback(
    (direction: Direction) => {
      if (active) {
        dispatch({ type: "turn", direction });
        onTone("shell-2", false);
      }
    },
    [active, dispatch, onTone]
  );
  const pan = useGridInput(active, move),
    learning = railLearning(s),
    sequence = s.level !== "endless" ? s.level.sequence : [],
    next = sequence[s.collected],
    world = s.level === "endless" ? "w3" : s.level.world;
  return (
    <View
      style={{
        alignItems: "center",
        gap: 8,
        flexDirection: wide ? "row" : "column",
        justifyContent: "center",
        flex: 1,
      }}
    >
      <View>
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            justifyContent: "space-between",
            marginBottom: 8,
            alignItems: "center",
          }}
        >
          <View
            accessibilityLabel="Chick goal"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: "#102F39CC",
              borderRadius: 16,
              paddingHorizontal: 8,
              minHeight: 36,
            }}
          >
            <GridHero chick size={28} />
            <Copy style={{ color: "#FFF0BE", fontWeight: "800", fontSize: 16 }}>
              {learning ? `Next ${next ?? "✓"}` : `${s.collected}/${railTarget(s) === Infinity ? "∞" : railTarget(s)}`}
            </Copy>
          </View>
          {s.level !== "endless" && s.level.word && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#FFEDC6",
                borderRadius: 12,
                paddingHorizontal: 6,
              }}
            >
              <PictureObject name={s.level.word} size={34} />
              <Text style={{ fontSize: 20, color: "#384B4C", letterSpacing: 3 }}>
                {sequence.map((t, i) => (i < s.collected ? t : "_")).join("")}
              </Text>
            </View>
          )}
          <View
            accessibilityLabel={`Star goal ${s.bumps === 0 ? 3 : s.bumps <= 2 ? 2 : 1} of 3, score ${s.score}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: "#102F39CC",
              borderRadius: 16,
              paddingHorizontal: 8,
              minHeight: 36,
            }}
          >
            <StarDisplay stars={s.bumps === 0 ? 3 : s.bumps <= 2 ? 2 : 1} size={13} />
            <Text style={{ color: "#FFF0BE", fontSize: 13, fontWeight: "800" }}>{s.score}</Text>
          </View>
        </View>
        <Shake event={s.bumps}>
          <View
            {...pan}
            accessibilityLabel={`Garden playfield. Mama at column ${s.body[0].x + 1}, row ${s.body[0].y + 1}. Chick at column ${s.food.x + 1}, row ${s.food.y + 1}. ${s.moves} steps, ${s.collected} chicks, ${s.bumps} bumps. ${learning ? `Find ${next}` : "Collect the chick"}. ${s.message}`}
            style={{
              width: size,
              height: size,
              borderRadius: 25,
              overflow: "hidden",
              borderWidth: 3,
              borderColor: "#B8CF81",
              ...(Platform.OS === "web" ? ({ touchAction: "none" } as ViewStyle) : {}),
            }}
          >
            <GridBackdrop crab={false} world={world} width={size} height={size} />
            {Array.from({ length: 10 }, (_, i) => (
              <View
                key={i}
                style={{
                  position: "absolute",
                  top: i * unit,
                  width: size,
                  height: 1,
                  backgroundColor: "#FFFFFF",
                  opacity: 0.05,
                }}
              />
            ))}
            {railHedges(s).map((p) => (
              <View key={`${p.x}-${p.y}`} style={{ position: "absolute", left: p.x * unit, top: p.y * unit }}>
                <GridObject kind="hedge" size={unit} />
              </View>
            ))}
            <View
              style={{
                position: "absolute",
                left: s.food.x * unit,
                top: s.food.y * unit,
                width: unit,
                height: unit,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: learning ? "#FFE5A0" : "#FFF8D333",
                borderRadius: unit / 3,
                borderWidth: 2,
                borderColor: "#FFE5A0",
              }}
            >
              {learning ? (
                <Text style={{ fontSize: unit * 0.65, fontWeight: "900", color: "#3A4D4F" }}>{next}</Text>
              ) : (
                <GridHero size={unit} chick />
              )}
            </View>
            {learning && (
              <View
                style={{
                  position: "absolute",
                  left: s.decoy.x * unit,
                  top: s.decoy.y * unit,
                  width: unit,
                  height: unit,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#D1E9C8",
                  borderRadius: unit / 2,
                  borderWidth: 2,
                  borderColor: "#648F70",
                }}
              >
                <Text style={{ fontSize: unit * 0.6, fontWeight: "800", color: "#384F4B" }}>
                  {s.level !== "endless" && s.level.word ? (next === "a" ? "o" : "a") : String(Number(next) + 1)}
                </Text>
              </View>
            )}
            {Array.from({ length: 40 }, (_, i) => (
              <ArcadeSprite key={i} poses={poses} index={i} width={unit} height={unit}>
                <GridHero size={unit} chick={i > 0} outfit={outfit} />
              </ArcadeSprite>
            ))}
            {Array.from({ length: 5 }, (_, i) => (
              <ArcadeSprite key={`snake-${i}`} poses={poses} index={40 + i} width={unit} height={unit}>
                <GridObject kind={i === 0 ? "snake" : "snake-body"} size={unit} />
              </ArcadeSprite>
            ))}
            {[0, 1, 2].map((i) => (
              <ArcadeSprite key={`firefly-${i}`} poses={poses} index={45 + i} width={10} height={10}>
                <View style={{ width: 5, height: 5, backgroundColor: "#FFE6A2", borderRadius: 5 }} />
              </ArcadeSprite>
            ))}
            <Juice event={s.collected + s.bumps} text={s.message} bump={s.message.includes("Oops")} />
          </View>
        </Shake>
      </View>
      <View style={{ gap: 10, alignItems: "center", maxWidth: wide ? 235 : undefined }}>
        <Copy style={{ color: "#FFF0C7", fontSize: 15, textAlign: "center", minHeight: 21 }}>
          {learning
            ? "One swipe. One step. No hurry."
            : s.moves < 4
              ? "Mama keeps moving. Turn toward the chick!"
              : "Keep the parade together!"}
        </Copy>
        <DirectionPad active={active} onMove={move} horizontal={wide} />
        {s.level === "endless" && (
          <Button quiet compact disabled={!active} onPress={() => dispatch({ type: "finish" })}>
            Finish parade
          </Button>
        )}
        {debug && <GridBudget budget={budget} />}
      </View>
    </View>
  );
}
