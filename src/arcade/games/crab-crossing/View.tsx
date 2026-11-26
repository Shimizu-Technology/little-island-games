import React, { useCallback, useEffect, useRef, memo, useMemo, useState } from "react";
import { View, Platform, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, useFrameCallback } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { HeartsHud, HitReaction } from "../../LivesHud";
import { GridFeedback } from "../grid/Feedback";
import { Button, Copy, PressableScale } from "../../../components/ui";
import { Text } from "../../../components/Text";
import { useReducedMotion } from "../../../components/motion";

import { ArcadeSprite, type SpritePose } from "../../Sprite";
import { useArcadeLoop } from "../../loop";
import { GridObject } from "../grid/Art";
import { CrabLane, CrabVehicle } from "./CrabArt";
import { CAMERA, CRAB_FEET, CrabActor, CrabBursts, CrabKiko, HERO, SHADOW, TRAFFIC_PER_ROW, useCrabFeedback } from "./CrabMotion";
import { crabFollow, crabFraming, crabProject, crabGroundTransform } from "./camera";
import { GridBudget, Shake, useGridInput } from "../grid/Controls";
import type { Direction } from "../grid/rules";
import type { ArcadeResult } from "../../types";
import type { OutfitId } from "../../progress";
import {
  crabConfig,
  crabPosition,
  CRAB_HOP,
  CRAB_ROWS,
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
/** Same cap as Lagoon's HUD: numbers and hints stop growing at 1.5x so the largest text keeps the road in view. */
const HUD_TEXT_MAX = 1.5;
const tick: CrabInput = { type: "tick" };
const TRAFFIC_TOP = -0.18;

function crabHudChanged(before: CrabState, after: CrabState) {
  return before.phase !== after.phase || before.crossed !== after.crossed || before.cursor !== after.cursor ||
    before.bumps !== after.bumps || before.lives.hit !== after.lives.hit || before.lives.hearts !== after.lives.hearts ||
    before.lives.maxHearts !== after.lives.maxHearts;
}
/** The hint stays left of the arrow keys (three 44-pt keys, 4-pt gaps, 10 pt from the edge, 8-pt clearance). */
const ARROWS_RIGHT = 10 + 44 * 3 + 4 * 2 + 8;
export function CrabBoard({
  initial,
  active,
  helper,
  outfit,
  onResult,
  onTone,
  size: allottedSize,
  height: availableHeight,
  overlayTop = 0,
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
  /** Measured height of the shared header drawn over the world; the HUD starts below it. */
  overlayTop?: number;
  debug: boolean;
}) {
  const touching = useRef(false);
  const [releasedWin, setReleasedWin] = useState(false);
  const viewportWidth = Math.max(1, allottedSize);
  const viewportHeight = Math.max(1, availableHeight);
  const { unit, heroSize } = crabFraming(viewportWidth, viewportHeight);
  const worldWidth = unit * 9;
  const coastTiles = viewportWidth > unit * 8 ? [-1, 0, 1] : [0];
  const poses = useSharedValue<SpritePose[]>([]), reduced = useReducedMotion();
  const [lanes] = useState(() => crabLanes(initial));
  const feedback = useCrabFeedback(initial, lanes, active, reduced, onTone);
  const hintVisible = feedback.hintVisible;
  const hintStyle = useAnimatedStyle(() => ({ opacity: hintVisible.value ? 1 : 0 }));
  const start = crabPosition(initial);
  const startGround = crabProject((start.x + 0.5) * unit, (start.y + 0.5) * unit);
  const cameraIdentity = useSharedValue<string | number | undefined>(initial.lives.hit);
  const camera = useSharedValue({ x: viewportWidth / 2 - startGround.x, y: viewportHeight * 0.76 - startGround.y });
  // Follow ground contact, never the hop arc. Presentation cannot change the rules.
  useFrameCallback(frame => {
    const target = poses.value[CAMERA];
    if (!target || !active) return;
    const identity = poses.value[HERO]?.identity;
    const reset = cameraIdentity.value !== identity;
    if (reset) cameraIdentity.value = identity;
    const dt = (frame.timeSincePreviousFrame ?? 16.67) / 1000;
    const x = crabFollow(camera.value.x, target.x, dt, reduced || reset);
    const y = crabFollow(camera.value.y, target.y, dt, reduced || reset);
    if (Math.abs(camera.value.x - x) + Math.abs(camera.value.y - y) > 0.001) camera.value = { x, y };
  });
  const cameraStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: camera.value.x }, { translateY: camera.value.y }],
  }));
  // Kit v3: pose-only interpolation, including a respawn identity guard.
  const build = useCallback(
    (s: CrabState) => {
      const hero = crabPosition(s);
      const progress = s.hop ? s.hop.age / CRAB_HOP : undefined;
      const bounce = progress === undefined ? 0 : Math.sin(progress * Math.PI);
      const lift = reduced ? 0 : bounce;
      const tilt = s.hop ? Math.sign(s.hop.toX - s.hop.fromX) || (s.hops % 2 ? 1 : -1) : 0;
      const x = (hero.x + 0.5) * unit, groundY = (hero.y + 0.6) * unit;
      const p: SpritePose[] = [{
        identity: s.lives.hit,
        x: x - heroSize / 2,
        y: groundY - hero.arc * unit - heroSize * CRAB_FEET,
        scale: 1 + lift * 0.045,
        frame: progress,
        angle: tilt * lift * 0.14,
      }];
      for (let row = 0; row < CRAB_ROWS - 1; row++) {
        const lane = lanes.find(l => l.row === row);
        const objects = lane ? laneObjects(lane, s.travel) : [];
        for (let i = 0; i < TRAFFIC_PER_ROW; i++)
          p.push({
            x: ((objects[i] ?? 0) - (lane?.span ?? 1) / 2 + 0.5) * unit,
            y: (row + TRAFFIC_TOP) * unit,
            opacity: i < objects.length ? 1 : 0,
          });
      }
      p[SHADOW] = { identity: s.lives.hit, x: x - heroSize * 0.38, y: groundY - heroSize * 0.09, scale: 1 - lift * 0.30, opacity: 0.42 - lift * 0.19 };
      const ground = crabProject(x, (Math.max(3, hero.y) + 0.5) * unit);
      p[CAMERA] = { x: viewportWidth / 2 - ground.x, y: viewportHeight * 0.76 - ground.y };
      return p;
    },
    [reduced, lanes, unit, heroSize, viewportWidth, viewportHeight]
  );
  const pose = useMemo(() => ({ build, target: poses, snapDistance: unit * 2 }), [build, poses, unit]);
  const {
      snapshot: s,
      dispatch,
      state,
      budget,
    } = useArcadeLoop({
      initial, step: crabStep, reduce: crabTransition, input: tick, active, pose,
      onFrame: feedback.observe, shouldPublish: crabHudChanged, measureBudget: debug,
    }),
    reported = useRef(false),
    [homes, setHomes] = useState<{ crossed: number; slots: number[] }>({ crossed: initial.crossed, slots: [] });
  const cleared = s.phase === "cleared";
  const releaseTouch = useCallback(() => {
    if (!touching.current) return;
    touching.current = false;
    if (cleared) setReleasedWin(true);
  }, [cleared]);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    window.addEventListener("blur", releaseTouch);
    return () => window.removeEventListener("blur", releaseTouch);
  }, [releaseTouch]);
  useEffect(() => {
    if (active && state.current.helper !== helper) dispatch({ type: "helper", value: helper });
  }, [active, helper, dispatch, state]);
  useEffect(() => {
    const r = crabResult(s);
    if (r && active && (!r.cleared || !touching.current) && !reported.current) {
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
  }, [s, active, releasedWin, onResult]);
  const splash = s.impact.kind === "splash";
  const hitTone = useCallback((tone: string, haptic?: boolean) => {
    onTone(splash ? "crab-splash" : tone, haptic);
  }, [onTone, splash]);
  if (s.crossed > homes.crossed) {
    const slot = [1, 4, 7].reduce((best, x) => Math.abs(s.impact.x - x) < Math.abs(s.impact.x - best) ? x : best, 1);
    setHomes({ crossed: s.crossed, slots: [...(homes.crossed % 3 === 0 ? [] : homes.slots), slot] });
  }
  const move = useCallback(
    (direction: Direction) => {
      if (active) dispatch({ type: "hop", direction });
    },
    [active, dispatch]
  );
  const pan = useGridInput(active, move, true, () => move("up")),
    learning = crabLearning(s),
    l = crabConfig(s);
  const compactChip = { backgroundColor: "#102F39DC", borderRadius: 16, paddingHorizontal: 9, minHeight: 38, justifyContent: "center" as const };
  return (
    <View onTouchStart={() => { touching.current = true; }} onTouchEnd={releaseTouch} onTouchCancel={releaseTouch}
      testID="crab-world" style={{ flex: 1, overflow: "hidden", backgroundColor: "#4F8D59" }}>
      <Shake event={s.bumps}>
        <View {...pan} accessible accessibilityRole="button" accessibilityLabel={`Crab Crossing world. Tap to hop forward, swipe left, right, or back. ${s.bumps} bumps.`}
          onAccessibilityTap={() => move("up")}
          style={{ width: viewportWidth, height: viewportHeight, overflow: "hidden", ...(Platform.OS === "web" ? ({ touchAction: "none" } as ViewStyle) : {}) }}>
          <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: worldWidth, height: unit * 11 }, cameraStyle]}>
            <View style={{ width: worldWidth, height: unit * 11, transform: crabGroundTransform(worldWidth, unit * 11) }}>
            {Array.from({ length: 40 }, (_, index) => {
              const row = index - 14;
              const lane = lanes.find(item => item.row === row);
              return <View key={row} style={{ position: "absolute", top: row * unit, left: -unit * 4, width: unit * 17, height: unit }}>
                {coastTiles.map(tile => <View key={tile} style={{ position: "absolute", left: tile * unit * 17 }}>
                  <CrabLane row={row} lane={lane} learning={learning} width={unit * 17} height={unit}/>
                </View>)}
              </View>;
            })}
            {[1, 4, 7].map(x => <View key={`burrow-${x}`} style={{ position: "absolute", left: x * unit - unit * 0.1, top: -unit * 0.1 }}>
              <GridObject kind="burrow" size={unit * 1.2}/>
              {homes.slots.includes(x) && <View style={{ position: "absolute", left: unit * 0.3, top: unit * 0.38 }}><CrabKiko size={unit * 0.65}/></View>}
            </View>)}
            {learning && l.numbers.map((n, i) => <React.Fragment key={i}>
              {[l.stones[i], (l.stones[i] + 3) % 9].map((x, j) => <View key={j} style={{ position: "absolute", top: (9 - i) * unit + 2, left: x * unit + 1, width: unit - 2, height: unit - 4, borderRadius: unit / 3, backgroundColor: i < s.cursor ? "#AEDCBA" : "#FFF0C7", borderWidth: 2, borderBottomWidth: 6, borderColor: i === s.cursor && j === 0 && helper ? "#E6A149" : "#7A9A91", justifyContent: "center", alignItems: "center" }}>
                <Text maxFontSizeMultiplier={1.2} style={{ color: "#2E5558", fontSize: unit * 0.42, fontWeight: "900" }}>{j ? n + (n === 1 ? 2 : 1) : n}</Text>
              </View>)}
            </React.Fragment>)}
            <CrabTraffic poses={poses} unit={unit} lanes={lanes} debug={debug}/>
            {!reduced && <CrabBursts landing={feedback.landing} goal={feedback.goal} unit={unit}/>}
            <ArcadeSprite poses={poses} index={SHADOW} width={heroSize * 0.76} height={heroSize * 0.18}>
              <View style={{ width: heroSize * 0.76, height: heroSize * 0.18, borderRadius: unit, backgroundColor: "#214653" }}/>
            </ArcadeSprite>
            <HitReaction hit={s.lives.hit} onTone={hitTone}>
              <CrabActor poses={poses} unit={unit} size={heroSize} outfit={outfit} debug={debug} reduced={reduced}
                landingAge={feedback.landing.age} facingLeft={feedback.facingLeft}/>
            </HitReaction>
            <GridFeedback event={s.crossed + s.lives.hit} x={s.impact.x} y={s.impact.y} kind={s.impact.kind} unit={unit} cols={9} rows={11}
              text={s.impact.kind === "score" ? "+100" : s.impact.kind === "splash" ? "SPLASH!" : "BONK!"} textWidth={110}
              showParticles={!reduced && s.impact.kind !== "score"}/>
            </View>
          </Animated.View>
        </View>
      </Shake>
      <View testID="crab-hud" pointerEvents="box-none" style={{ position: "absolute", top: overlayTop + 10, left: 10, right: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={compactChip} accessibilityLabel={`Score ${s.score}. ${s.crossed} of ${s.level === "endless" ? "endless" : l.target} burrows`}>
          <Text maxFontSizeMultiplier={HUD_TEXT_MAX} style={{ fontSize: 36, lineHeight: 42, fontWeight: "900", color: "#FFF4C7", textShadowColor: "#183B44", textShadowRadius: 2, textShadowOffset: { width: 2, height: 3 } }}>{learning ? l.numbers[s.cursor] ?? "HOME" : s.score}</Text>
          <Text maxFontSizeMultiplier={HUD_TEXT_MAX} style={{ fontSize: 12, fontWeight: "900", color: "#FFF4C7" }}>{learning ? "NEXT STONE" : `BURROWS ${s.crossed}/${s.level === "endless" ? "∞" : l.target}`}</Text>
        </View>
        <View style={{ gap: 5, alignItems: "flex-end" }}>
          {!learning && <View style={compactChip}><HeartsHud lives={s.lives}/></View>}
          <View style={compactChip}><Text maxFontSizeMultiplier={HUD_TEXT_MAX} style={{ color: "#FFF4C7", fontWeight: "900", fontSize: 15 }}>⌂ {s.crossed}/{s.level === "endless" ? "∞" : l.target}</Text></View>
        </View>
      </View>
      <View pointerEvents="box-none" style={{ position: "absolute", right: 10, bottom: 12, gap: 4, alignItems: "center" }}>
        <OverlayArrow label="Move forward" glyph="↑" onPress={() => move("up")} active={active}/>
        <View style={{ flexDirection: "row", gap: 4 }}>
          <OverlayArrow label="Move left" glyph="←" onPress={() => move("left")} active={active}/>
          <OverlayArrow label="Move back" glyph="↓" onPress={() => move("down")} active={active}/>
          <OverlayArrow label="Move right" glyph="→" onPress={() => move("right")} active={active}/>
        </View>
      </View>
      {initial.hops < 3 && <View testID="crab-hint" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={{ position: "absolute", bottom: 12, left: 10, right: ARROWS_RIGHT, alignItems: "flex-start" }}>
        <Animated.View style={[{ backgroundColor: "#102F39CC", padding: 8, borderRadius: 12 }, hintStyle]}>
          <Copy maxFontSizeMultiplier={HUD_TEXT_MAX} style={{ color: "#FFF4C7", fontSize: 13, lineHeight: 18 }}>Tap to hop · swipe to steer</Copy>
        </Animated.View>
      </View>}
      {s.level === "endless" && <View style={{ position: "absolute", left: 10, bottom: 48 }}><Button quiet compact maxFontSizeMultiplier={HUD_TEXT_MAX} disabled={!active} onPress={() => dispatch({ type: "finish" })}>Finish crossing</Button></View>}
      {debug && <View pointerEvents="none" style={{ position: "absolute", left: 10, bottom: 4 }}><GridBudget budget={budget}/></View>}
    </View>
  );
}

function OverlayArrow({ label, glyph, onPress, active }: { label: string; glyph: string; onPress: () => void; active: boolean }) {
  return <PressableScale accessibilityRole="button" accessibilityLabel={label} disabled={!active} onPress={onPress} style={{ width: 44, height: 44, borderRadius: 13, justifyContent: "center", alignItems: "center", backgroundColor: "#102F39B8", borderWidth: 1, borderColor: "#DDF3D2A8" }}><Text maxFontSizeMultiplier={1} style={{ color: "#FFF7D9", fontSize: 27, fontWeight: "900" }}>{glyph}</Text></PressableScale>;
}

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
        Array.from({ length: TRAFFIC_PER_ROW }, (_, i) => (
          <ArcadeSprite
            key={`${l.row}-${i}`}
            poses={poses}
            index={1 + l.row * TRAFFIC_PER_ROW + i}
            width={unit * l.span}
            height={unit * 1.18}
          >
            <CrabVehicle kind={l.kind} width={unit * l.span} height={unit * 1.18} left={l.speed < 0} />
            {debug && (
              <View
                style={{
                  position: "absolute",
                  left: waterLane(l) ? 0 : unit * l.span * 0.04,
                  top: unit * (0.26 - TRAFFIC_TOP),
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
