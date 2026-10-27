import React, { useCallback, useEffect, useRef } from "react";
import { View, Platform, type ViewStyle } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { Button, Copy } from "../../../components/ui";
import { Text } from "../../../components/Text";
import { useReducedMotion } from "../../../components/motion";
import { ArcadeSprite, type SpritePose } from "../../Sprite";
import { useArcadeLoop } from "../../loop";
import { GridBackdrop, GridHero, GridObject } from "../grid/Art";
import { DirectionPad, GridBudget, Juice, Shake, useGridInput } from "../grid/Controls";
import type { Direction } from "../grid/rules";
import type { ArcadeResult } from "../../types";
import type { OutfitId } from "../../progress";
import {
  crabConfig,
  crabLanes,
  crabLearning,
  crabResult,
  crabStep,
  crabTransition,
  laneObjects,
  waterLane,
  type CrabInput,
  type CrabState,
} from "./engine";
const tick: CrabInput = { type: "tick" };
export function CrabBoard({
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
  initial: CrabState;
  active: boolean;
  helper: boolean;
  outfit: OutfitId;
  onResult: (r: ArcadeResult) => void;
  onTone: (s: string, haptic?: boolean) => void;
  size: number;
  wide: boolean;
  debug: boolean;
}) {
  const unit = (size - 6) / 9,
    poses = useSharedValue<SpritePose[]>([]),
    reduced = useReducedMotion(),
    hop = useRef({ hops: 0, time: 0 });
  const onFrame = useCallback(
    (s: CrabState) => {
      if (hop.current.hops !== s.hops) hop.current = { hops: s.hops, time: s.time };
      const bounce = reduced ? 0 : Math.max(0, 1 - (s.time - hop.current.time) * 7),
        lanes = crabLanes(s),
        p: SpritePose[] = [
          {
            x: s.x * unit,
            y: s.y * unit - bounce * unit * 0.13,
            scale: 1 + bounce * 0.12,
            angle: reduced ? 0 : Math.sin(s.time * 3) * 0.025,
          },
        ];
      for (let row = 0; row < 9; row++) {
        const l = lanes.find((l) => l.row === row),
          objects = l ? laneObjects(l, s.time) : [];
        for (let i = 0; i < 5; i++)
          p.push({
            x: ((objects[i] ?? 0) - (l?.span ?? 1) / 2 + 0.5) * unit,
            y: row * unit,
            opacity: l && i < objects.length ? 1 : 0,
          });
      }
      for (let i = 0; i < 3; i++)
        p.push({ x: ((i * 3 + (reduced ? 0 : s.time * 0.4)) % 9) * unit, y: (2.4 + i * 0.6) * unit, opacity: 0.3 });
      poses.set(p);
    },
    [poses, reduced, unit]
  );
  const {
      snapshot: s,
      dispatch,
      state,
      budget,
    } = useArcadeLoop({ initial, step: crabStep, reduce: crabTransition, input: tick, active, onFrame }),
    reported = useRef(false),
    last = useRef({ crossed: 0, bumps: 0, cursor: 0 });
  useEffect(() => {
    if (active && state.current.helper !== helper) dispatch({ type: "helper", value: helper });
  }, [active, helper, dispatch, state]);
  useEffect(() => {
    if (s.crossed > last.current.crossed || s.cursor > last.current.cursor) onTone("coral");
    if (s.bumps > last.current.bumps) onTone("shell-0");
    last.current = { crossed: s.crossed, bumps: s.bumps, cursor: s.cursor };
    const r = crabResult(s);
    if (r && !reported.current) {
      reported.current = true;
      onResult(r);
    }
  }, [s, onResult, onTone]);
  const move = useCallback(
    (direction: Direction) => {
      if (active) {
        dispatch({ type: "hop", direction });
        onTone("shell-3", false);
      }
    },
    [active, dispatch, onTone]
  );
  const pan = useGridInput(active, move),
    learning = crabLearning(s),
    l = crabConfig(s),
    world = s.level === "endless" ? "w3" : s.level.world,
    lanes = crabLanes(s);
  return (
    <View
      style={{
        flexDirection: wide ? "row" : "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        flex: 1,
      }}
    >
      <View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 7, alignItems: "center" }}>
          <Copy style={{ color: "#FFF0BE", fontSize: 16, fontWeight: "800" }}>
            {learning
              ? `Next ${l.numbers[s.cursor] ?? "Home!"}`
              : `Burrows ${s.crossed}/${s.level === "endless" ? "∞" : l.target}`}
          </Copy>
          <Copy style={{ color: "#FFF0BE", fontSize: 14 }}>★ {s.score}</Copy>
        </View>
        <Shake event={s.bumps}>
          <View
            {...pan}
            accessibilityLabel={`Coastal playfield. Crab at column ${Math.round(s.x) + 1}, row ${s.y + 1}. ${s.hops} hops, ${s.bumps} bumps. ${learning ? `Next number ${l.numbers[s.cursor] ?? "home"}` : "Reach the sea"}. ${s.message}`}
            style={{
              width: size,
              height: unit * 11 + 6,
              borderRadius: 23,
              overflow: "hidden",
              borderWidth: 3,
              borderColor: "#AADFD5",
              ...(Platform.OS === "web" ? ({ touchAction: "none" } as ViewStyle) : {}),
            }}
          >
            <GridBackdrop crab world={world} width={size} height={unit * 11} />
            {Array.from({ length: 11 }, (_, row) => {
              const lane = lanes.find((lane) => lane.row === row),
                road = lane && !waterLane(lane),
                water = learning ? row > 0 && row < 10 : lane && waterLane(lane);
              return (
                <View
                  key={row}
                  style={{
                    position: "absolute",
                    top: row * unit,
                    width: size,
                    height: unit,
                    backgroundColor: road ? "#3D5362" : water ? "#1B799633" : "#E7D79C",
                    borderBottomWidth: road ? 1 : 0,
                    borderColor: "#FBE5A855",
                    justifyContent: "center",
                  }}
                >
                  {road ? (
                    <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <View key={i} style={{ width: unit * 0.5, height: 2, backgroundColor: "#E7E2BE66" }} />
                      ))}
                    </View>
                  ) : (
                    !water && (
                      <Text style={{ color: "#6C815C", textAlign: "center", fontSize: unit * 0.28 }}>
                        {row === 0 ? "⌂       ⌂       ⌂" : row === 5 ? "❧       ❧       ❧" : "·      ·      ·      ·"}
                      </Text>
                    )
                  )}
                </View>
              );
            })}
            {[1, 4, 7].map((x) => (
              <View key={`burrow-${x}`} style={{ position: "absolute", left: x * unit - unit * 0.1, top: -unit * 0.1 }}>
                <GridObject kind="burrow" size={unit * 1.2} />
              </View>
            ))}
            {[0, 1, 2].map((i) => (
              <ArcadeSprite key={`wave-${i}`} poses={poses} index={46 + i} width={unit} height={unit / 3}>
                <Text style={{ color: "#D0F2E2", fontSize: unit * 0.4 }}>〰</Text>
              </ArcadeSprite>
            ))}
            {learning &&
              l.numbers.map((n, i) => (
                <React.Fragment key={i}>
                  {[l.stones[i], (l.stones[i] + 3) % 9].map((x, j) => (
                    <View
                      key={j}
                      style={{
                        position: "absolute",
                        top: (9 - i) * unit + 2,
                        left: x * unit + 1,
                        width: unit - 2,
                        height: unit - 4,
                        borderRadius: unit / 3,
                        backgroundColor: i < s.cursor ? "#AEDCBA" : "#FFF0C7",
                        borderWidth: 2,
                        borderBottomWidth: 4,
                        borderColor: i === s.cursor && j === 0 && helper ? "#E6A149" : "#7A9A91",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#2E5558", fontSize: unit * 0.48, fontWeight: "900" }}>
                        {j ? n + (n === 1 ? 2 : 1) : n}
                      </Text>
                    </View>
                  ))}
                </React.Fragment>
              ))}
            {Array.from({ length: 9 }, (_, row) => {
              const lane = lanes.find((l) => l.row === row);
              return (
                lane &&
                Array.from({ length: 5 }, (_, i) => (
                  <ArcadeSprite
                    key={`${row}-${i}`}
                    poses={poses}
                    index={1 + row * 5 + i}
                    width={unit * lane.span}
                    height={unit}
                  >
                    <View
                      style={{
                        width: unit * lane.span,
                        height: unit,
                        alignItems: "center",
                        justifyContent: "center",
                        transform: [{ scaleX: lane.span * 1.06 }],
                      }}
                    >
                      <GridObject kind={lane.kind} size={unit} />
                    </View>
                  </ArcadeSprite>
                ))
              );
            })}
            <ArcadeSprite poses={poses} index={0} width={unit} height={unit}>
              <GridHero crab size={unit} outfit={outfit} />
            </ArcadeSprite>
            <Juice event={s.crossed + s.cursor + s.bumps} text={s.message} bump={s.message.includes("Boop")} />
          </View>
        </Shake>
      </View>
      <View style={{ gap: 10, alignItems: "center", maxWidth: wide ? 235 : undefined }}>
        <Copy style={{ color: "#FFF0C7", fontSize: 15, textAlign: "center", minHeight: 21 }}>
          {learning
            ? `${l.name} · one hop at a time`
            : s.hops < 3
              ? "Look for a gap, then hop!"
              : "Ride the logs. Find your burrow!"}
        </Copy>
        <DirectionPad active={active} onMove={move} horizontal={wide} />
        {s.level === "endless" && (
          <Button quiet compact disabled={!active} onPress={() => dispatch({ type: "finish" })}>
            Finish crossing
          </Button>
        )}
        {debug && <GridBudget budget={budget} />}
      </View>
    </View>
  );
}
