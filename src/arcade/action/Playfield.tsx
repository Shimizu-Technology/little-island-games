import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, View, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import { Text } from "../../components/Text";
import { Button, Heading } from "../../components/ui";
import { useReducedMotion } from "../../components/motion";
import { ArcadeSprite, type SpritePose } from "../Sprite";
import { uiThreadDrag, multiTouchDrag, type DragPoint, type TouchPoints } from "../Input";
import { useArcadeUiLoop } from "../uiLoop";
import { HeartsHud, HitReaction } from "../LivesHud";
import type { ArcadeResult } from "../types";
import type { OutfitId } from "../progress";
import { ActionHero, BallArt, BeetleArt, HuskArt, NetArt, Scene, TurtleArt } from "./Art";
import { palmConfig, palmResult, type PalmState } from "../games/palm-patrol/engine";
import { beachConfig, beachResult, paddleWidth, turtleX, type BeachState } from "../games/beach-ball/engine";
import { arenaTransform, arenaTouch, type Arena, BALL_RADIUS } from "./arena";
import {
  aimPoint,
  mapSeatPointers,
  palmFrameStep,
  beachFrameStep,
  type SeatPointers,
  type PalmFrame,
  type BeachFrame,
} from "./controls";
const hidden: SpritePose = { x: -200, y: -200, opacity: 0 };
const gestureStyle: ViewStyle = Platform.OS === "web" ? ({ touchAction: "none", userSelect: "none" } as ViewStyle) : {};
function useArena() {
  const [size, setSize] = useState({ width: 360, height: 600 });
  const arena = useSharedValue(arenaTransform(360, 600));
  const camera = useMemo(() => arenaTransform(size.width, size.height), [size.width, size.height]);
  return {
    size,
    camera,
    arena,
    layout: (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = e.nativeEvent.layout;
      arena.set(arenaTransform(width, height));
      setSize({ width, height });
    },
  };
}
function position(a: Arena, x: number, y: number, w: number, h = w): SpritePose {
  "worklet";
  return { x: a.x + (x - w / 2) * a.scale, y: a.y + (y - h / 2) * a.scale, opacity: 1 };
}
function Pill({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 18,
        backgroundColor: "#123F51EE",
        borderWidth: 1,
        borderColor: "#CFF4DE66",
      }}
    >
      <Heading style={{ color: "#FFF3C7", fontSize: 16 }}>{children}</Heading>
    </View>
  );
}
const ArenaScene = memo(function ArenaScene({
  palm,
  world,
  camera,
}: {
  palm: boolean;
  world: "w1" | "w2" | "w3" | "w4" | "w5" | "w6" | "learn";
  camera: Arena;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: camera.x,
        top: camera.y,
        width: camera.width,
        height: camera.height,
        overflow: "hidden",
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: "#FFFFFF44",
      }}
    >
      <Scene palm={palm} world={world} width={camera.width} height={camera.height} />
    </View>
  );
});
/** Stable layer: the HUD never rebuilds the beetles, nets, husks or impact art. */
const PalmSprites = memo(function PalmSprites({ poses, scale }: { poses: SharedValue<SpritePose[]>; scale: number }) {
  return (
    <>
      {Array.from({ length: 15 }, (_, i) => (
        <React.Fragment key={i}>
          <ArcadeSprite poses={poses} index={i} width={58 * scale} height={58 * scale}>
            <View testID={`palm-beetle-${i}`}>
              <BeetleArt size={58 * scale} />
            </View>
          </ArcadeSprite>
          {i === 0 && (
            <ArcadeSprite poses={poses} index={15} width={87 * scale} height={87 * scale}>
              <View testID="palm-boss-0">
                <BeetleArt size={87 * scale} boss />
              </View>
            </ArcadeSprite>
          )}
          <ArcadeSprite poses={poses} index={30 + i} width={58 * scale} height={58 * scale}>
            <NetArt size={58 * scale} />
          </ArcadeSprite>
          <ArcadeSprite poses={poses} index={73 + i} width={14 * scale} height={7 * scale}>
            <View
              style={{
                width: 14 * scale,
                height: 7 * scale,
                backgroundColor: "#FFE174",
                borderRadius: 4 * scale,
                borderWidth: scale,
                borderColor: "#69402D",
              }}
            />
          </ArcadeSprite>
        </React.Fragment>
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <ArcadeSprite key={`h${i}`} poses={poses} index={45 + i} width={20 * scale} height={20 * scale}>
          <HuskArt size={20 * scale} />
        </ArcadeSprite>
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <ArcadeSprite key={`p${i}`} poses={poses} index={58 + i} width={6 * scale} height={6 * scale}>
          <View
            style={{
              width: 6 * scale,
              height: 6 * scale,
              borderRadius: 3 * scale,
              backgroundColor: i % 2 ? "#FFE58C" : "#B6F7DF",
            }}
          />
        </ArcadeSprite>
      ))}
    </>
  );
});
const PalmHero = memo(function PalmHero({
  poses,
  scale,
  outfit,
  hit,
  onTone,
}: {
  poses: SharedValue<SpritePose[]>;
  scale: number;
  outfit: OutfitId;
  hit: number;
  onTone: (key: string, haptic?: boolean) => void;
}) {
  return (
    <HitReaction hit={hit} onTone={onTone}>
      <ArcadeSprite poses={poses} index={57} width={78 * scale} height={78 * scale}>
        <View testID="palm-launcher">
          <ActionHero palm size={78 * scale} outfit={outfit} />
        </View>
      </ArcadeSprite>
    </HitReaction>
  );
});
export function PalmBoard({
  initial,
  active,
  helper,
  outfit,
  onResult,
  onTone,
  debug,
}: {
  initial: PalmState;
  active: boolean;
  helper: boolean;
  outfit: OutfitId;
  onResult: (r: ArcadeResult, assisted: boolean) => void;
  onTone: (key: string, haptic?: boolean) => void;
  debug: boolean;
}) {
  const { size, camera, arena, layout } = useArena(),
    reduced = useReducedMotion(),
    point = useSharedValue<DragPoint>({ x: 180, y: 552, down: false }),
    flags = useSharedValue({ helper, taps: 0, finish: false }),
    keyboard = useSharedValue({ x: 180, firing: false, used: false }),
    poses = useSharedValue<SpritePose[]>([]),
    reported = useRef(false);
  const gesture = useMemo(
    () =>
      uiThreadDrag(point)
        .enabled(active)
        .onTouchesDown(() => {
          "worklet";
          flags.set({ ...flags.value, taps: flags.value.taps + 1 });
        }),
    [point, active, flags]
  );
  const input = useDerivedValue<PalmFrame>(() => ({
    x: point.value.down
      ? aimPoint(point.value, arena.value)
      : keyboard.value.used
        ? keyboard.value.x
        : flags.value.taps
          ? aimPoint(point.value, arena.value)
          : 180,
    down: point.value.down || keyboard.value.firing,
    taps: flags.value.taps,
    helper: flags.value.helper,
    finish: flags.value.finish,
  }));
  const onFrame = useCallback(
    (s: PalmState) => {
      "worklet";
      const a = arena.value,
        next: SpritePose[] = Array.from({ length: 88 }, () => hidden);
      for (const b of s.beetles) {
        const size = b.boss ? 87 : 58,
          p = position(a, b.x, b.y, size);
        p.angle = reduced
          ? 0
          : b.caught
            ? Math.sin(s.time * 20) * 0.25
            : b.diving
              ? Math.sin(s.time * 6 + b.id) * 0.2
              : s.direction * 0.035;
        p.scale = b.caught ? 0.85 : 1;
        next[(b.boss ? 15 : 0) + b.id] = p;
        if (b.caught) next[30 + b.id] = { ...position(a, b.x, b.y, 58), angle: p.angle };
        if (b.hp > 1 && !b.boss) next[73 + b.id] = position(a, b.x, b.y - 12, 14, 7);
      }
      for (let i = 0; i < s.husks.length; i++)
        next[45 + i] = { ...position(a, s.husks[i].x, s.husks[i].y, 20), angle: reduced ? 0 : s.time * 8 };
      next[57] = {
        ...position(a, s.launcher, 552 + (!reduced && s.lives.invulnerable > 1 ? 7 : 0), 78),
        scale: !reduced && s.cooldown > 0.16 ? 0.94 : 1,
        angle: reduced
          ? 0
          : Math.max(
              -0.18,
              Math.min(
                0.18,
                (position(a, s.launcher, 552, 78).x - (poses.value[57]?.x ?? position(a, s.launcher, 552, 78).x)) /
                  (30 * a.scale)
              )
            ),
      };
      if (s.pulse > 0 && s.cue !== "fire") {
        const age = 1 - s.pulse / 0.45;
        for (let i = 0; i < 8; i++)
          next[58 + i] = {
            ...position(
              a,
              s.feedbackX + Math.cos((i * Math.PI) / 4) * age * 42,
              s.feedbackY + Math.sin((i * Math.PI) / 4) * age * 42,
              6
            ),
            opacity: reduced ? 0 : 1 - age,
          };
        next[66] = {
          ...position(a, Math.max(55, Math.min(300, s.feedbackX)), Math.max(76, s.feedbackY - 38 - age * 16), 110, 24),
          opacity: s.pulse / 0.45,
        };
      }
      poses.set(next);
    },
    [arena, poses, reduced]
  );
  const { snapshot: s, state, clock } = useArcadeUiLoop({ initial, input, active, step: palmFrameStep, onFrame });
  const sounds = useRef({ event: 0, shots: 0 });
  useEffect(() => {
    flags.set({ ...flags.value, helper });
    if (!active) {
      point.set({ ...point.value, down: false });
      keyboard.set({ ...keyboard.value, firing: false });
    }
  }, [active, helper, flags, point, keyboard]);
  useEffect(() => {
    const r = palmResult(s);
    if (r && !reported.current) {
      reported.current = true;
      onResult(r, s.helped);
    }
  }, [s, onResult]);
  useEffect(() => {
    const shots = s.shots - sounds.current.shots;
    if (shots > 0) onTone("coral", false);
    if (s.event - sounds.current.event > shots && s.cue !== "hit")
      onTone(s.cue === "net" ? "clear" : s.cue === "shield" ? "shell-1" : "shell-2", true);
    sounds.current = { shots: s.shots, event: s.event };
  }, [s.event, s.shots, s.cue, onTone]);
  useEffect(() => {
    if (!active || Platform.OS !== "web") return;
    const down = (e: KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight", " "].includes(e.key)) return;
      e.preventDefault();
      const k = keyboard.value;
      keyboard.set({
        x: e.key === " " ? k.x : Math.max(24, Math.min(336, state.value.launcher + (e.key === "ArrowLeft" ? -18 : 18))),
        firing: e.key === " " || k.firing,
        used: true,
      });
      if (e.key === " " && !e.repeat) flags.set({ ...flags.value, taps: flags.value.taps + 1 });
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === " ") keyboard.set({ ...keyboard.value, firing: false });
    };
    const blur = () => keyboard.set({ ...keyboard.value, firing: false });
    document.addEventListener("keydown", down);
    document.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [active, keyboard, flags, state]);
  const learning = palmConfig(s).world === "learn",
    scale = camera.scale;
  return (
    <GestureDetector gesture={gesture} touchAction="none">
      <Animated.View
        collapsable={false}
        testID="palm-playfield"
        accessibilityLabel="Palm Patrol playfield. Slide to aim. Hold to toss."
        onLayout={layout}
        style={[{ flex: 1, overflow: "hidden", minHeight: 210, backgroundColor: "#143E3D" }, gestureStyle]}
      >
        <ArenaScene palm world={palmConfig(s).world} camera={camera} />
        <PalmSprites poses={poses} scale={scale} />
        {[72, 180, 288].map((x, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: camera.x + (x - 38) * scale,
              top: camera.y + 475 * scale,
              width: 76 * scale,
              height: 17 * scale,
              borderTopLeftRadius: 55,
              borderTopRightRadius: 55,
              backgroundColor: s.shields[i] ? "#6FC666" : "#966A4233",
              borderWidth: scale * 2,
              borderColor: "#2D6745",
              opacity: s.shields[i] ? 0.45 + s.shields[i] * 0.18 : 0.25,
            }}
          />
        ))}
        <PalmHero poses={poses} scale={scale} outfit={outfit} hit={s.lives.hit} onTone={onTone} />
        {learning &&
          s.beetles.map((b) => (
            <View
              key={b.id}
              testID={`palm-answer-${b.id}`}
              pointerEvents="none"
              style={{
                position: "absolute",
                left: camera.x + (b.x - 25) * scale,
                top: camera.y + (b.y + 19) * scale,
                width: 50 * scale,
                alignItems: "center",
                backgroundColor: "#173F38",
                borderRadius: 12,
              }}
            >
              <Heading style={{ color: "#FFF4CD", fontSize: 22 * scale }}>{b.value}</Heading>
            </View>
          ))}
        <ArcadeSprite poses={poses} index={66} width={110 * scale} height={24 * scale}>
          <Text
            style={{
              color: "#FFF9D0",
              fontSize: 18 * scale,
              textAlign: "center",
              textShadowColor: "#26394C",
              textShadowRadius: 3,
            }}
          >
            {s.feedback}
          </Text>
        </ArcadeSprite>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 7,
            left: 8,
            right: 8,
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 3,
            alignItems: "center",
          }}
        >
          <Pill label={`Wave ${s.wave}, ${s.caught} beetles netted`}>
            ♧ {s.wave}/{s.level === "endless" ? "∞" : s.level.waves} · {s.caught}
          </Pill>
          {!learning && <HeartsHud lives={s.lives} />}
          <Pill label={`${s.score} points`}>★ {s.score}</Pill>
        </View>
        {learning && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 54,
              alignSelf: "center",
              backgroundColor: "#FFF5D8",
              borderRadius: 18,
              paddingHorizontal: 18,
              paddingVertical: 4,
            }}
          >
            <Text accessibilityLabel={`Math fact ${s.prompt}`} style={{ fontSize: 26, color: "#294D43" }}>
              {s.prompt}
            </Text>
          </View>
        )}
        {s.time < 4 && (
          <View pointerEvents="none" style={{ position: "absolute", bottom: 12, alignSelf: "center" }}>
            <Pill>← Slide · hold to toss ↑</Pill>
          </View>
        )}
        {s.level === "endless" && (
          <View style={{ position: "absolute", bottom: 12, left: 10 }}>
            <Button quiet compact disabled={!active} onPress={() => flags.set({ ...flags.value, finish: true })}>
              Finish
            </Button>
          </View>
        )}
        {debug && (
          <Text style={{ position: "absolute", bottom: 2, left: 4, color: "white", fontSize: 10 }}>
            {size.width}×{size.height} · UI loop · {clock.value.ticks} ticks
          </Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}
const BallStretch = memo(function BallStretch({
  poses,
  index,
  scale,
}: {
  poses: SharedValue<SpritePose[]>;
  index: number;
  scale: number;
}) {
  const style = useAnimatedStyle(() => {
    const squash = poses.value[index]?.scale ?? 1;
    return { transform: [{ scaleX: 1 / squash }, { scaleY: squash }] };
  });
  return (
    <Animated.View testID={`beach-ball-${index}`} style={style}>
      <BallArt size={((BALL_RADIUS * 2) / 0.95) * scale} />
    </Animated.View>
  );
});
const BeachSprites = memo(function BeachSprites({
  poses,
  scale,
  helper,
  together,
}: {
  poses: SharedValue<SpritePose[]>;
  scale: number;
  helper: boolean;
  together: boolean;
}) {
  return (
    <>
      {[0, 1].map((i) => (
        <ArcadeSprite
          key={`b${i}`}
          poses={poses}
          index={i}
          width={((BALL_RADIUS * 2) / 0.95) * scale}
          height={((BALL_RADIUS * 2) / 0.95) * scale}
        >
          <BallStretch poses={poses} index={i} scale={scale} />
        </ArcadeSprite>
      ))}
      {[0, 1].map((i) => {
        const width = (helper && (i === 0 || together) ? 116 : 86) * scale;
        return (
          <ArcadeSprite key={`p${i}`} poses={poses} index={2 + i} width={width} height={20 * scale}>
            <View
              testID={`beach-paddle-${i}`}
              style={{
                width,
                height: 20 * scale,
                borderRadius: 10 * scale,
                borderWidth: 2 * scale,
                borderColor: i ? "#773B45" : "#1B6372",
                borderTopColor: "#FFF6D8",
                backgroundColor: i ? "#EC8177" : "#3AC9C0",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 15 * scale, color: "#163F4B", lineHeight: 16 * scale }}>{i ? "◆" : "●"}</Text>
            </View>
          </ArcadeSprite>
        );
      })}
      <ArcadeSprite poses={poses} index={12} width={86 * scale} height={86 * scale}>
        <TurtleArt size={86 * scale} />
      </ArcadeSprite>
      {Array.from({ length: 48 }, (_, i) => (
        <ArcadeSprite key={`s${i}`} poses={poses} index={14 + i} width={5 * scale} height={5 * scale}>
          <View style={{ width: 5 * scale, height: 5 * scale, borderRadius: 2 * scale, backgroundColor: "#FFE275" }} />
        </ArcadeSprite>
      ))}
    </>
  );
});
export function BeachBoard({
  initial,
  active,
  helper,
  onResult,
  onTone,
  debug,
  names,
}: {
  initial: BeachState;
  active: boolean;
  helper: boolean;
  onResult: (r: ArcadeResult, winner?: 0 | 1 | null) => void;
  onTone: (key: string, haptic?: boolean) => void;
  debug: boolean;
  names: [string, string];
}) {
  const { camera, arena, layout } = useArena(),
    reduced = useReducedMotion(),
    poses = useSharedValue<SpritePose[]>([]),
    points = useSharedValue<TouchPoints>({}),
    mapping = useSharedValue<SeatPointers>({ owners: [null, null], seats: {} }),
    input = useSharedValue<BeachFrame>({ x: [null, null], helper, finish: false }),
    reported = useRef(false);
  const gesture = useMemo(() => multiTouchDrag(points).enabled(active), [points, active]);
  useAnimatedReaction(
    () => points.value,
    (next) => {
      mapping.value = mapSeatPointers(mapping.value, next, arena.value);
      const x: BeachFrame["x"] = [...input.value.x];
      for (let seat = 0; seat < 2; seat++) {
        const id = mapping.value.owners[seat];
        if (id !== null && next[id]) x[seat] = arenaTouch(arena.value, next[id].x, next[id].y).x;
      }
      input.value = { ...input.value, x };
    }
  );
  const onFrame = useCallback(
    (s: BeachState) => {
      "worklet";
      const a = arena.value,
        config = beachConfig(s),
        next: SpritePose[] = Array.from({ length: 66 }, () => hidden),
        ballSize = (BALL_RADIUS * 2) / 0.95;
      for (let i = 0; i < s.balls.length; i++) {
        const b = s.balls[i];
        next[i] = {
          ...position(a, b.x, b.y, ballSize),
          angle: reduced ? 0 : s.time * (b.vy < 0 ? -3 : 3),
          scale: !reduced && b.squash ? 1 - b.squash * 0.8 : 1,
        };
      }
      for (let i = 0; i < 2; i++) next[2 + i] = position(a, s.paddles[i], i ? 65 : 535, paddleWidth(s, i as 0 | 1), 20);
      if (config.turtle) next[12] = position(a, turtleX(s), 300, 86);
      let pop = 0;
      for (let j = 0; j < s.effects.length; j++) {
        const e = s.effects[j],
          age = 1 - e.remaining / e.duration;
        for (let i = 0; i < 8; i++)
          next[14 + j * 8 + i] = {
            ...position(
              a,
              e.x + Math.cos((i * Math.PI) / 4) * age * 28,
              e.y + Math.sin((i * Math.PI) / 4) * age * 28,
              5
            ),
            opacity: reduced ? 0 : 1 - age,
          };
        if (e.point && pop < 2) next[62 + pop++] = { ...position(a, e.x, e.y - age * 18, 65, 26), opacity: 1 - age };
      }
      poses.set(next);
    },
    [arena, poses, reduced]
  );
  const { snapshot: s, state, clock } = useArcadeUiLoop({ initial, input, active, step: beachFrameStep, onFrame });
  useEffect(() => {
    input.set({ ...input.value, helper });
    if (!active) {
      points.set({});
      mapping.set({ owners: [null, null], seats: {} });
    }
  }, [active, helper, input, points, mapping]);
  useEffect(() => {
    const r = beachResult(s);
    if (r && !reported.current) {
      reported.current = true;
      onResult(r, s.winner);
    }
  }, [s, onResult]);
  useEffect(() => {
    if (s.event) onTone(s.cue === "point" ? "clear" : "shell-0", s.cue === "point");
  }, [s.event, s.cue, onTone]);
  useEffect(() => {
    if (!active || Platform.OS !== "web") return;
    const down = (e: KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(e.key)) return;
      e.preventDefault();
      const seat = ["a", "d", "A", "D"].includes(e.key) ? 1 : 0,
        x: BeachFrame["x"] = [...input.value.x];
      x[seat] = state.value.paddles[seat] + (["ArrowLeft", "a", "A"].includes(e.key) ? -18 : 18);
      input.set({ ...input.value, x });
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [active, input, state]);
  const config = beachConfig(s),
    scale = camera.scale;
  return (
    <GestureDetector gesture={gesture} touchAction="none">
      <Animated.View
        collapsable={false}
        testID="beach-playfield"
        accessibilityLabel="Beach Ball court. Drag your paddle. Two players use opposite ends."
        onLayout={layout}
        style={[{ flex: 1, overflow: "hidden", minHeight: 210, backgroundColor: "#173E50" }, gestureStyle]}
      >
        <ArenaScene palm={false} world={config.world} camera={camera} />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: camera.x + 172 * scale,
            top: camera.y + 292 * scale,
            width: 16 * scale,
            height: 16 * scale,
            borderRadius: 8 * scale,
            borderWidth: 2 * scale,
            borderColor: "#FFFAE199",
          }}
        />
        <BeachSprites poses={poses} scale={scale} helper={s.helper} together={s.mode === "together"} />
        {[0, 1].map((i) => (
          <ArcadeSprite key={`pop${i}`} poses={poses} index={62 + i} width={65 * scale} height={26 * scale}>
            <Text
              style={{
                color: "#FFF8CE",
                fontSize: 22 * scale,
                textAlign: "center",
                textShadowColor: "#365063",
                textShadowRadius: 3,
              }}
            >
              +{config.countBy}
            </Text>
          </ArcadeSprite>
        ))}
        {[0, 1].map((i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              top: camera.y + (i ? 5 : 562) * scale,
              alignSelf: "center",
              maxWidth: camera.width - 16,
              transform: i && s.mode === "together" ? [{ rotate: "180deg" }] : [],
            }}
          >
            <Pill label={`${names[i]}, ${s.points[i] * config.countBy} points`}>
              {i ? "◆" : "●"} {names[i]} · {s.points[i] * config.countBy}/{config.target * config.countBy}
            </Pill>
          </View>
        ))}
        {config.countBy > 1 && (
          <View pointerEvents="none" style={{ position: "absolute", left: 8, top: 8 }}>
            <Pill>Count +{config.countBy}</Pill>
          </View>
        )}
        {s.time < 4 && (
          <View
            pointerEvents="none"
            style={{ position: "absolute", left: camera.x + 12 * scale, top: camera.y + 455 * scale }}
          >
            <Text style={{ color: "#FFF6D8", fontSize: 14 * scale }}>← Drag ● →</Text>
          </View>
        )}
        {s.level === "endless" && (
          <View style={{ position: "absolute", bottom: 12, left: 10 }}>
            <Button quiet compact disabled={!active} onPress={() => input.set({ ...input.value, finish: true })}>
              Finish
            </Button>
          </View>
        )}
        {debug && (
          <Text style={{ position: "absolute", bottom: 2, left: 4, color: "white", fontSize: 10 }}>
            UI loop · {clock.value.ticks} ticks · rally {s.bestRally}
          </Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}
