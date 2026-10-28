import React, { useCallback, useEffect, useRef, memo, useState } from "react";
import { View, Platform, type ViewStyle } from "react-native";
import { crabHopFrame } from "../../feelArt";
import type { ArtPose } from "../../ArtPose";
import { useSharedValue } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { HeartsHud, HitReaction } from "../../LivesHud";
import { GridFeedback } from "../grid/Feedback";
import { Button, Copy } from "../../../components/ui";
import { Text } from "../../../components/Text";
import { useReducedMotion } from "../../../components/motion";
import { StarDisplay } from "../../Art";
import { ArcadeSprite, type SpritePose } from "../../Sprite";
import { useArcadeLoop } from "../../loop";
import { GridBackdrop, GridHero, GridObject, CoastalObject } from "../grid/Art";
import { DirectionPad, GridBudget, Shake, useGridInput, useGridTouch } from "../grid/Controls";
import type { Direction } from "../grid/rules";
import type { ArcadeResult } from "../../types";
import type { OutfitId } from "../../progress";
import {
  crabConfig,
  crabPosition,
  CRAB_HOP,
  crabLanes,
  crabLearning,
  crabResult,
  crabStars,
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
  size: allottedSize,
  height: availableHeight,
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
  height: number;
  wide: boolean;
  debug: boolean;
}) {
  const touch = useGridTouch();
  const size = Math.max(
    120,
    Math.min(
      allottedSize - (wide ? 40 : 12),
      wide ? Infinity : (availableHeight - 284 - (initial.level === "endless" ? 54 : 0) - (debug ? 37 : 0)) * (9 / 11)
    )
  );
  const unit = (size - 6) / 9,
    poses = useSharedValue<ArtPose[]>([]),
    reduced = useReducedMotion();
  const onFrame = useCallback(
    (s: CrabState) => {
      const hero = crabPosition(s),
        bounce = s.hop ? Math.sin((s.hop.age / CRAB_HOP) * Math.PI) : 0,
        lanes = crabLanes(s),
        p: ArtPose[] = [
          {
            x: hero.x * unit,
            y: (hero.y - hero.arc) * unit,
            scale: 1 + bounce * 0.08,
            frame: reduced ? 0 : crabHopFrame(s.hop?.age, CRAB_HOP),
            angle: reduced ? 0 : s.respawn > 0 ? 0.18 : Math.sin(s.time * 3) * 0.025,
          },
        ];
      for (let row = 0; row < 9; row++) {
        const l = lanes.find((l) => l.row === row),
          objects = l ? laneObjects(l, s.travel) : [];
        for (let i = 0; i < 6; i++)
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
    [homes, setHomes] = useState<{ crossed: number; slots: number[] }>({ crossed: initial.crossed, slots: [] }),
    last = useRef({ crossed: 0, bumps: 0, cursor: 0 });
  useEffect(() => {
    if (active && state.current.helper !== helper) dispatch({ type: "helper", value: helper });
  }, [active, helper, dispatch, state]);
  useEffect(() => {
    if (s.crossed > last.current.crossed || s.cursor > last.current.cursor) onTone("coral");
    if (crabLearning(s) && s.bumps > last.current.bumps) onTone("shell-0");
    last.current = { crossed: s.crossed, bumps: s.bumps, cursor: s.cursor };
    const r = crabResult(s);
    if (r && active && (!r.cleared || !touch.touching) && !reported.current) {
      // Keep the winning control mounted through finger-up, then show the shared result.
      // This also gives the local clear pose/particles a brief, unobstructed beat.
      const timer = setTimeout(
        () => {
          if (!reported.current) {
            reported.current = true;
            onResult(r);
          }
        },
        r.cleared ? 300 : 0
      );
      return () => clearTimeout(timer);
    }
  }, [s, active, touch.touching, onResult, onTone]);
  if (s.crossed > homes.crossed) {
    const slot = [1, 4, 7].reduce((best, x) => Math.abs(s.impact.x - x) < Math.abs(s.impact.x - best) ? x : best, 1);
    setHomes({ crossed: s.crossed, slots: [...(homes.crossed % 3 === 0 ? [] : homes.slots), slot] });
  }
  const move = useCallback(
    (direction: Direction) => {
      if (active) {
        dispatch({ type: "hop", direction });
        onTone("shell-3", false);
      }
    },
    [active, dispatch, onTone]
  );
  const pan = useGridInput(active, move, true),
    learning = crabLearning(s),
    l = crabConfig(s),
    world = s.level === "endless" ? "w3" : s.level.world,
    [lanes] = useState(() => crabLanes(initial));
  return (
    <View
      {...touch.handlers}
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
          <View
            accessibilityLabel="Burrow goal"
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
            <GridObject kind="burrow" size={28} />
            <Copy style={{ color: "#FFF0BE", fontSize: 16, fontWeight: "800" }}>
              {learning
                ? `Next ${l.numbers[s.cursor] ?? "Home!"}`
                : `${s.crossed}/${s.level === "endless" ? "∞" : l.target}`}
            </Copy>
          </View>
          <View
            accessibilityLabel={`Star goal ${crabStars({ ...s, phase: "cleared" })} of 3, score ${s.score}`}
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
            <StarDisplay stars={crabStars({ ...s, phase: "cleared" })} size={13} />
            <Text style={{ color: "#FFF0BE", fontSize: 13, fontWeight: "800" }}>{s.score}</Text>
          </View>
        </View>
        {!learning && (
          <View style={{ alignItems: "center", marginBottom: 6 }}>
            <HeartsHud lives={s.lives} />
          </View>
        )}
        <Shake event={s.bumps}>
          <View
            {...pan}
            accessibilityLabel={`Coastal playfield. Crab at column ${(crabPosition(s).x + 1).toFixed(2)}, row ${(crabPosition(s).y + 1).toFixed(2)}. ${s.hops} hops, ${s.bumps} bumps. ${learning ? `Next number ${l.numbers[s.cursor] ?? "home"}` : "Reach the sea"}. ${s.message}`}
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
                {homes.slots.includes(x) && <View accessibilityLabel="Crab resting in a reached burrow" style={{ position: "absolute", left: unit * 0.3, top: unit * 0.38 }}><GridHero crab happy size={unit * 0.65} /></View>}
              </View>
            ))}
            {[0, 1, 2].map((i) => (
              <ArcadeSprite key={`wave-${i}`} poses={poses} index={55 + i} width={unit} height={unit / 3}>
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
            <CrabTraffic poses={poses} unit={unit} lanes={lanes} debug={debug} />
            <HitReaction hit={s.lives.hit} onTone={onTone}>
              <CrabActor poses={poses} unit={unit} outfit={outfit} debug={debug} happy={s.phase === "cleared"} />
            </HitReaction>
            <GridFeedback
              event={s.crossed + s.lives.hit}
              x={s.impact.x}
              y={s.impact.y}
              kind={s.impact.kind}
              unit={unit}
              cols={9}
              rows={11}
              text={s.impact.kind === "score" ? "+100" : ""}
            />
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
        <DirectionPad repeat active={active} onMove={move} horizontal={wide} />
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

const CrabActor = memo(function CrabActor({
  poses,
  unit,
  outfit,
  happy,
  debug,
}: {
  poses: SharedValue<SpritePose[]>;
  unit: number;
  outfit: OutfitId;
  debug: boolean;
  happy: boolean;
}) {
  return (
    <ArcadeSprite poses={poses} index={0} width={unit} height={unit}>
      <GridHero crab size={unit} outfit={outfit} happy={happy} poses={poses} />
      {debug && (
        <View
          style={{
            position: "absolute",
            left: unit * 0.2,
            top: unit * 0.38,
            width: unit * 0.6,
            height: unit * 0.44,
            borderWidth: 1,
            borderColor: "#FF3366",
            borderRadius: unit * 0.2,
          }}
        />
      )}
    </ArcadeSprite>
  );
});
const CrabTraffic = memo(function CrabTraffic({
  poses,
  unit,
  lanes,
  debug,
}: {
  poses: SharedValue<SpritePose[]>;
  unit: number;
  lanes: ReturnType<typeof crabLanes>;
  debug: boolean;
}) {
  return (
    <>
      {lanes.map((l) =>
        Array.from({ length: 6 }, (_, i) => (
          <ArcadeSprite
            key={`${l.row}-${i}`}
            poses={poses}
            index={1 + l.row * 6 + i}
            width={unit * l.span}
            height={unit}
          >
            <CoastalObject kind={l.kind} width={unit * l.span} height={unit} left={l.speed < 0} />
            {debug && (
              <View
                style={{
                  position: "absolute",
                  left: waterLane(l) ? 0 : unit * l.span * 0.04,
                  top: unit * 0.26,
                  width: unit * l.span * (waterLane(l) ? 1 : 0.92),
                  height: unit * 0.58,
                  borderWidth: 1,
                  borderColor: waterLane(l) ? "#C1FFE4" : "#FF3366",
                }}
              />
            )}
          </ArcadeSprite>
        ))
      )}
    </>
  );
});
