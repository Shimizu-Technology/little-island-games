import React, { useCallback, useEffect, useLayoutEffect, useRef, memo, useMemo, useState } from "react";
import { AccessibilityInfo, View, Platform, type GestureResponderEvent, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import { HeartsHud, HitReaction } from "../../LivesHud";
import { GridFeedback } from "../grid/Feedback";
import { Copy, Button } from "../../../components/ui";
import { Text } from "../../../components/Text";
import { PictureObject } from "../../../learn/art/Objects";
import { useReducedMotion } from "../../../components/motion";
import { StarDisplay } from "../../Art";
import { ArcadeSprite, type SpritePose } from "../../Sprite";
import { useArcadeLoop } from "../../loop";
import type { ArcadeResult } from "../../types";
import type { OutfitId } from "../../progress";
import { GridBackdrop, GridObject } from "../grid/Art";
import { DirectionPad, GridBudget, Shake, useGridInput } from "../grid/Controls";
import { RailArt, RailFern } from "../grid/RailArt";
import { delta, type Direction } from "../grid/rules";
import {
  FIREFLY_START,
  PARADE_SLOTS,
  RailBursts,
  RailCollectible,
  RailSegment,
  SNAKE_START,
  useRailFeedback,
} from "./RailMotion";
import {
  RAIL_COLS,
  RAIL_LEARN_MOVE,
  RAIL_ROWS,
  railHedges,
  railWaiting,
  railBodyPose,
  railTick,
  railLearning,
  railResult,
  railStars,
  railSnake,
  railStep,
  railTarget,
  railTransition,
  type RailInput,
  type RailState,
} from "./engine";

const tick: RailInput = { type: "tick" };

type AriaLabelHost = { setAttribute?: (name: string, value: string) => void };

function railGoalStars(s: RailState) {
  return railStars({ ...s, phase: "cleared" });
}

function railPlayfieldLabel(s: RailState) {
  const learning = railLearning(s);
  const target = railTarget(s);
  const sequence = s.level !== "endless" ? s.level.sequence : [];
  const next = sequence[s.collected];
  const atNest = !learning && target !== Infinity && s.collected >= target - 1;
  const targetName = learning ? `Tile ${next ?? "finish"}` : atNest ? "Nest" : "Mango";
  const objective = learning
    ? `Find ${next ?? "the finish"}`
    : atNest
      ? "Reach the cozy nest"
      : "Collect the mango";
  return `Garden playfield. Rilla at column ${s.body[0].x + 1}, row ${s.body[0].y + 1}. ${targetName} at column ${s.food.x + 1}, row ${s.food.y + 1}. ${s.moves} steps, ${s.collected} collected, ${s.bumps} bumps. ${objective}.${s.message ? ` ${s.message}` : ""}`;
}

function railPlayfieldLabelChanged(before: RailState | null, after: RailState) {
  return (
    !before ||
    before.body[0]?.x !== after.body[0]?.x ||
    before.body[0]?.y !== after.body[0]?.y ||
    before.food.x !== after.food.x ||
    before.food.y !== after.food.y ||
    before.moves !== after.moves ||
    before.collected !== after.collected ||
    before.bumps !== after.bumps ||
    before.message !== after.message
  );
}

function railHudChanged(before: RailState, after: RailState, screenReader = false) {
  return (
    before.phase !== after.phase ||
    before.collected !== after.collected ||
    before.bumps !== after.bumps ||
    before.lives.hit !== after.lives.hit ||
    before.lives.hearts !== after.lives.hearts ||
    before.lives.maxHearts !== after.lives.maxHearts ||
    (before.respawn > 0) !== (after.respawn > 0) ||
    before.helper !== after.helper ||
    railGoalStars(before) !== railGoalStars(after) ||
    (railLearning(after) && before.message !== after.message) ||
    (screenReader &&
      (before.moves !== after.moves ||
        before.message !== after.message ||
        before.body[0]?.x !== after.body[0]?.x ||
        before.body[0]?.y !== after.body[0]?.y))
  );
}

export function RailBoard({
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
  initial: RailState;
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
  const touchHeld = useRef(false);
  const [touchReleases, setTouchReleases] = useState(0);
  const readyResult = useRef<ArcadeResult | null>(null);
  const activeRef = useRef(active);
  const onResultRef = useRef(onResult);
  useLayoutEffect(() => {
    activeRef.current = active;
    onResultRef.current = onResult;
  }, [active, onResult]);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  useEffect(() => {
    // React Native Web 0.21.4 resolves isScreenReaderEnabled() to true unconditionally for all visitors.
    // Keep native VoiceOver/TalkBack subscribed to React commits; on web, update DOM aria-label directly via ref.
    if (Platform.OS === "web") return;
    let live = true;
    const query = AccessibilityInfo?.isScreenReaderEnabled?.();
    if (query && typeof query.then === "function") {
      void query
        .then((enabled) => {
          if (live) setScreenReaderEnabled(Boolean(enabled));
        })
        .catch(() => {});
    }
    const subscription = AccessibilityInfo?.addEventListener?.("screenReaderChanged", (enabled) => {
      if (live) setScreenReaderEnabled(Boolean(enabled));
    });
    return () => {
      live = false;
      subscription?.remove?.();
    };
  }, []);
  const size = Math.max(
    120,
    Math.min(
      allottedSize - (wide ? 46 : 12),
      wide ? Infinity : (availableHeight - 284 - (initial.level === "endless" ? 54 : 0) - (debug ? 37 : 0)) * 1
    )
  );
  const poses = useSharedValue<SpritePose[]>([]);
  const reduced = useReducedMotion();
  const unit = (size - 6) / RAIL_COLS;
  const heroSize = unit * 1.14;
  const chickSize = unit * 0.96;
  const feedback = useRailFeedback(initial, active, reduced, onTone);
  const observeFeedback = feedback.observe;
  const playfieldRef = useRef<View | null>(null);
  const lastAriaState = useRef<RailState | null>(null);
  const syncWebPlayfieldLabel = useCallback((current: RailState, force = false) => {
    if (Platform.OS !== "web") return;
    const node = playfieldRef.current as AriaLabelHost | null;
    if (!node || typeof node.setAttribute !== "function") return;
    if (!force && !railPlayfieldLabelChanged(lastAriaState.current, current)) return;
    lastAriaState.current = current;
    node.setAttribute("aria-label", railPlayfieldLabel(current));
  }, []);
  const observeFrame = useCallback(
    (current: RailState) => {
      observeFeedback(current);
      syncWebPlayfieldLabel(current);
    },
    [observeFeedback, syncWebPlayfieldLabel]
  );
  const clearVisual = useRef<{ state: RailState | null; started: number }>({ state: null, started: 0 });
  const facing = useRef<{ hit: number; left: boolean[]; length: number }>({
    hit: initial.lives.hit,
    left: Array.from({ length: PARADE_SLOTS }, () => initial.direction === "left"),
    length: initial.body.length,
  });

  // Kit v3: pose-only presentation interpolation; engine and authored rules stay untouched.
  const build = useCallback(
    (s: RailState) => {
      const learning = railLearning(s);
      let learningClearAge: number | undefined;
      if (learning && s.phase === "cleared") {
        const now = performance.now();
        if (clearVisual.current.state !== s) clearVisual.current = { state: s, started: now };
        learningClearAge = (now - clearVisual.current.started) / 1000;
      }
      if (facing.current.hit !== s.lives.hit) {
        facing.current = {
          hit: s.lives.hit,
          left: Array.from({ length: PARADE_SLOTS }, () => s.direction === "left"),
          length: s.body.length,
        };
      }
      const fraction = s.respawn > 0 || s.phase !== "play" ? 0 : s.elapsed / railTick(s);
      const snake = railSnake(s, learning ? 0 : fraction);
      const body = railBodyPose(s, learningClearAge);
      const moving =
        !reduced &&
        s.phase === "play" &&
        s.respawn === 0 &&
        (learning ? s.moves > 0 && s.elapsed < RAIL_LEARN_MOVE : !railWaiting(s));
      const stepFrac = learning
        ? Math.min(1, s.elapsed / RAIL_LEARN_MOVE)
        : Math.min(1, s.elapsed / railTick(s));

      const parade: SpritePose[] = Array.from({ length: PARADE_SLOTS }, (_, i) => {
        const p = body[i];
        const spriteSize = i === 0 ? heroSize : chickSize;
        if (!p) {
          return { identity: s.lives.hit, x: 0, y: 0, opacity: 0, angle: 0, scale: i === 0 ? 1 : 0.94, frame: 1 };
        }

        let dx = 0;
        let dy = 0;
        if (i === 0) {
          if (learning && s.previous[0]) {
            dx = s.body[0].x - s.previous[0].x;
            dy = s.body[0].y - s.previous[0].y;
          }
          if (dx === 0 && dy === 0) {
            dx = delta[s.direction].x;
            dy = delta[s.direction].y;
          }
        } else {
          if (learning && s.previous[i]) {
            dx = s.body[i].x - s.previous[i].x;
            dy = s.body[i].y - s.previous[i].y;
          }
          if (dx === 0 && dy === 0 && s.body[i - 1]) {
            dx = s.body[i - 1].x - s.body[i].x;
            dy = s.body[i - 1].y - s.body[i].y;
          }
        }

        if (Math.abs(dx) > 0.001) {
          facing.current.left[i] = dx < 0;
        } else if (i >= facing.current.length && i > 0) {
          facing.current.left[i] = facing.current.left[i - 1];
        }
        const isLeft = facing.current.left[i];

        const wave = (s.moves + stepFrac) * Math.PI + i * 0.85;
        const bounce = moving ? Math.abs(Math.sin(wave)) : 0;
        const waddle = moving ? Math.sin(wave) * (i === 0 ? 0.085 : 0.07) : 0;
        const verticalPitch = moving && dy !== 0 ? (dy < 0 ? -0.045 : 0.045) * (isLeft ? -1 : 1) : 0;
        const hopLift = bounce * unit * (i === 0 ? 0.08 : 0.06);
        const baseScale = i === 0 ? 1 : 0.94;
        const cellX = Math.max(0, Math.min(RAIL_COLS - 1, p.x));
        const cellY = Math.max(0, Math.min(RAIL_ROWS - 1, p.y));
        return {
          identity: s.lives.hit,
          x: (cellX + 0.5) * unit - spriteSize / 2,
          y: (cellY + 0.5) * unit - spriteSize / 2 - hopLift,
          opacity: 1,
          angle: waddle + verticalPitch,
          scale: baseScale + bounce * (i === 0 ? 0.04 : 0.03),
          frame: (isLeft ? -1 : 1) * (1 + bounce * 0.05),
        };
      });
      facing.current.length = s.body.length;

      return [
        ...parade,
        ...Array.from({ length: 6 }, (_, i) => ({
          // The head drawing points right: keep it at the right end of the connected body.
          x: (snake[snake.length - 1 - i]?.x ?? 0) * unit,
          y: (snake[snake.length - 1 - i]?.y ?? 0) * unit,
          opacity: snake[i] ? 1 : 0,
        })),
        ...[0, 1, 2].map((i) => ({
          x: (2 + i * 3) * unit + (reduced ? 0 : Math.sin((s.moves + s.elapsed) * 0.7 + i) * 9),
          y: (2 + i * 2) * unit + (reduced ? 0 : Math.cos((s.moves + s.elapsed) * 0.5 + i) * 6),
          opacity: 0.65,
        })),
      ];
    },
    [chickSize, heroSize, reduced, unit]
  );

  const liveScreenReader = Platform.OS !== "web" && screenReaderEnabled;
  const shouldPublish = useCallback(
    (before: RailState, after: RailState) => railHudChanged(before, after, liveScreenReader),
    [liveScreenReader]
  );
  const pose = useMemo(() => ({ build, target: poses, snapDistance: unit * 2 }), [build, poses, unit]);
  const {
    snapshot: s,
    dispatch,
    state,
    budget,
  } = useArcadeLoop({
    initial,
    step: railStep,
    reduce: railTransition,
    input: tick,
    active,
    pose,
    onFrame: observeFrame,
    shouldPublish,
    measureBudget: debug,
  });
  const reported = useRef(false);
  const cleared = s.phase === "cleared";

  const clearTouchHold = useCallback(() => {
    if (!touchHeld.current) return;
    touchHeld.current = false;
    const pending = readyResult.current;
    if (pending && activeRef.current && !reported.current) {
      readyResult.current = null;
      reported.current = true;
      onResultRef.current(pending);
      return;
    }
    if (cleared) setTouchReleases((count) => count + 1);
  }, [cleared]);

  const handleTouchStart = useCallback((event?: GestureResponderEvent) => {
    const activeTouches = event?.nativeEvent?.touches?.length;
    touchHeld.current = activeTouches === undefined ? true : activeTouches > 0;
  }, []);

  const handleTouchRelease = useCallback(
    (event?: GestureResponderEvent) => {
      const remainingTouches = event?.nativeEvent?.touches?.length ?? 0;
      if (remainingTouches > 0) {
        touchHeld.current = true;
        return;
      }
      clearTouchHold();
    },
    [clearTouchHold]
  );

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    window.addEventListener("blur", clearTouchHold);
    return () => window.removeEventListener("blur", clearTouchHold);
  }, [clearTouchHold]);

  useEffect(() => {
    if (active && state.current.helper !== helper) dispatch({ type: "helper", value: helper });
  }, [active, helper, dispatch, state]);

  useEffect(() => {
    if (!active) {
      readyResult.current = null;
      return;
    }
    const r = railResult(s);
    if (r && (!r.cleared || !touchHeld.current) && !reported.current) {
      // Keep the winning control mounted through finger-up, then show the shared result.
      // This also gives the cozy nest celebration pop a brief, unobstructed beat.
      const timer = setTimeout(
        () => {
          if (reported.current || !activeRef.current) return;
          if (r.cleared && touchHeld.current) {
            readyResult.current = r;
            return;
          }
          readyResult.current = null;
          reported.current = true;
          onResultRef.current(r);
        },
        r.cleared ? 320 : 0
      );
      return () => clearTimeout(timer);
    }
  }, [s, active, touchReleases]);

  const move = useCallback(
    (direction: Direction) => {
      if (active) dispatch({ type: "turn", direction });
    },
    [active, dispatch]
  );

  const pan = useGridInput(active, move);
  const learning = railLearning(s);
  const target = railTarget(s);
  const sequence = s.level !== "endless" ? s.level.sequence : [];
  const next = sequence[s.collected];
  const world = s.level === "endless" ? "w3" : s.level.world;
  const hedges = useMemo(() => railHedges(initial), [initial]);
  const atNest = !learning && target !== Infinity && s.collected >= target - 1;
  const goalStars = railGoalStars(s);
  const playfieldLabel = railPlayfieldLabel(s);
  useLayoutEffect(() => {
    if (Platform.OS !== "web") return;
    syncWebPlayfieldLabel(state.current, state.current !== s);
  }, [playfieldLabel, s, state, syncWebPlayfieldLabel]);
  const waitingVisible = feedback.waitingVisible;
  const earlyHintVisible = feedback.earlyHintVisible;
  const readyPromptStyle = useAnimatedStyle(() => ({ opacity: waitingVisible.value ? 1 : 0 }));
  const earlyPromptStyle = useAnimatedStyle(() => ({ opacity: !waitingVisible.value && earlyHintVisible.value ? 1 : 0 }));
  const steadyPromptStyle = useAnimatedStyle(() => ({ opacity: !waitingVisible.value && !earlyHintVisible.value ? 1 : 0 }));

  return (
    <View
      testID="rail-world"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchRelease}
      onTouchCancel={handleTouchRelease}
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
              gap: 6,
              backgroundColor: "#143536D9",
              borderRadius: 16,
              paddingHorizontal: 9,
              minHeight: 36,
            }}
          >
            <RailArt size={26} chick outfit="island" shadow={false} testID="rail-hud-chick" />
            <Copy maxFontSizeMultiplier={1.5} style={{ color: "#FFF2C4", fontWeight: "800", fontSize: 16 }}>
              {learning ? `Next ${next ?? "✓"}` : `${s.collected}/${target === Infinity ? "∞" : target}`}
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
            testID="rail-star-hud"
            accessibilityLabel={`Star goal ${goalStars} of 3, score ${s.score}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: "#143536D9",
              borderRadius: 16,
              paddingHorizontal: 9,
              minHeight: 36,
            }}
          >
            <StarDisplay stars={goalStars} size={13} />
            <Text maxFontSizeMultiplier={1.5} style={{ color: "#FFF2C4", fontSize: 13, fontWeight: "800" }}>{s.score}</Text>
          </View>
        </View>
        {!learning && (
          <View style={{ alignItems: "center", marginBottom: 6 }}>
            <HeartsHud lives={s.lives} />
          </View>
        )}
        <Shake event={s.bumps}>
          <View
            ref={playfieldRef}
            {...pan}
            testID="rail-playfield"
            accessibilityLabel={playfieldLabel}
            style={{
              width: size,
              height: size,
              overflow: "visible",
              ...(Platform.OS === "web" ? ({ touchAction: "none" } as ViewStyle) : {}),
            }}
          >
            <View
              testID="rail-playfield-frame"
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: size,
                height: size,
                borderRadius: 25,
                overflow: "hidden",
                borderWidth: 3,
                borderColor: "#CFE091",
              }}
            >
              <GridBackdrop crab={false} world={world} width={size} height={size} />
              {Array.from({ length: 10 }, (_, i) => (
                <React.Fragment key={i}>
                  <View
                    pointerEvents="none"
                    style={{ position: "absolute", top: i * unit, width: size, height: 1, backgroundColor: "#FFF8DF", opacity: 0.09 }}
                  />
                  <View
                    pointerEvents="none"
                    style={{ position: "absolute", left: i * unit, height: size, width: 1, backgroundColor: "#FFF8DF", opacity: 0.09 }}
                  />
                </React.Fragment>
              ))}
            </View>
            <View
              testID="rail-playfield-stage"
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 3,
                top: 3,
                width: size - 6,
                height: size - 6,
                overflow: "visible",
              }}
            >
              {hedges.map((p) => (
                <View
                  key={`${p.x}-${p.y}`}
                  style={{ position: "absolute", left: p.x * unit - unit * 0.04, top: p.y * unit - unit * 0.06 }}
                >
                  <RailFern size={unit * 1.08} />
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
                  ...(learning
                    ? {
                        backgroundColor: "#FFE5A0",
                        borderRadius: unit / 2,
                        borderWidth: 1.5,
                        borderColor: "#FFF5C6",
                      }
                    : {}),
                }}
              >
                {learning ? (
                  <Text style={{ fontSize: unit * 0.65, fontWeight: "900", color: "#3A4D4F" }}>{next}</Text>
                ) : (
                  <RailCollectible kind={atNest ? "nest" : "mango"} size={unit * (atNest ? 1.08 : 0.98)} active={active} reduced={reduced} />
                )}
              </View>
              {learning && cleared && (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: s.impact.x * unit,
                    top: s.impact.y * unit,
                    width: unit,
                    height: unit,
                  }}
                >
                  <RailCollectible kind="nest" size={unit * 1.08} active={active} reduced={reduced} />
                </View>
              )}
              {learning && s.phase === "play" && (
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
              <HitReaction hit={s.lives.hit} onTone={onTone}>
                <RailTrain poses={poses} heroSize={heroSize} chickSize={chickSize} outfit={outfit} reduced={reduced} />
              </HitReaction>
              <RailScenery poses={poses} unit={unit} />
              {!reduced && <RailBursts collect={feedback.collect} nest={feedback.nest} unit={unit} />}
              {s.respawn > 0 && (
                <View
                  pointerEvents="none"
                  accessibilityLiveRegion="polite"
                  accessibilityLabel="Gathering the parade. Collected chicks stay counted."
                  style={{
                    position: "absolute",
                    left: Math.min(7 * unit, Math.max(0, (s.body[0].x - 1) * unit)),
                    top: Math.min(7 * unit, Math.max(0, (s.body[0].y - 1) * unit)),
                    width: unit * 3,
                    height: unit * 3,
                    borderRadius: unit * 1.5,
                    borderWidth: 2,
                    borderStyle: "dashed",
                    borderColor: "#FFF0B6",
                    backgroundColor: "#FFF0B61A",
                  }}
                />
              )}
              <GridFeedback
                event={s.collected + s.lives.hit}
                x={s.impact.x}
                y={s.impact.y}
                unit={unit}
                cols={10}
                rows={10}
                kind={s.impactKind}
                text={s.impactKind === "splat" ? "" : cleared ? "HOME!" : "+40"}
                textWidth={cleared ? 84 : 64}
                showParticles={!reduced && s.impactKind === "splat"}
              />
            </View>
          </View>
        </Shake>
      </View>
      <View style={{ gap: 10, alignItems: "center", maxWidth: wide ? 235 : undefined }}>
        {learning ? (
          <Copy maxFontSizeMultiplier={1.5} style={{ color: "#FFF2C9", fontSize: 15, textAlign: "center", minHeight: 21 }}>
            One swipe. One step. No hurry.
          </Copy>
        ) : (
          <View style={{ minHeight: 28, minWidth: 220, justifyContent: "center", alignItems: "center" }}>
            <Animated.View testID="rail-ready-prompt" pointerEvents="none" style={[{ position: "absolute" }, readyPromptStyle]}>
              <Copy maxFontSizeMultiplier={1.5} style={{ color: "#FFF2C9", fontSize: 15, textAlign: "center" }}>Ready · tap a direction</Copy>
            </Animated.View>
            <Animated.View testID="rail-early-prompt" pointerEvents="none" style={[{ position: "absolute" }, earlyPromptStyle]}>
              <Copy maxFontSizeMultiplier={1.5} style={{ color: "#FFF2C9", fontSize: 15, textAlign: "center" }}>Turn toward the mango!</Copy>
            </Animated.View>
            <Animated.View testID="rail-steady-prompt" pointerEvents="none" style={steadyPromptStyle}>
              <Copy maxFontSizeMultiplier={1.5} style={{ color: "#FFF2C9", fontSize: 15, textAlign: "center" }}>
                {atNest ? "Lead the parade to the nest!" : "Keep the parade together!"}
              </Copy>
            </Animated.View>
          </View>
        )}
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

const RailTrain = memo(function RailTrain({
  poses,
  heroSize,
  chickSize,
  outfit,
  reduced,
}: {
  poses: SharedValue<SpritePose[]>;
  heroSize: number;
  chickSize: number;
  outfit: OutfitId;
  reduced: boolean;
}) {
  // Draw tail-to-head so Rilla always stays crisply on top of her trailing baby chicks.
  return (
    <>
      {Array.from({ length: PARADE_SLOTS }, (_, offset) => {
        const i = PARADE_SLOTS - 1 - offset;
        return (
          <RailSegment
            key={i}
            poses={poses}
            index={i}
            size={i === 0 ? heroSize : chickSize}
            outfit={outfit}
            reduced={reduced}
          />
        );
      })}
    </>
  );
});

const RailScenery = memo(function RailScenery({ poses, unit }: { poses: SharedValue<SpritePose[]>; unit: number }) {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <ArcadeSprite key={i} poses={poses} index={SNAKE_START + i} width={unit} height={unit}>
          <GridObject kind={i === 0 ? "snake" : "snake-body"} size={unit} />
        </ArcadeSprite>
      ))}
      {[0, 1, 2].map((i) => (
        <ArcadeSprite key={`fly-${i}`} poses={poses} index={FIREFLY_START + i} width={10} height={10}>
          <View style={{ width: 5, height: 5, backgroundColor: "#FFE6A2", borderRadius: 5 }} />
        </ArcadeSprite>
      ))}
    </>
  );
});
