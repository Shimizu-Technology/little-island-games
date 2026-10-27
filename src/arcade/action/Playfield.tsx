import { PressControl } from "../Input";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, View, type GestureResponderEvent, type ViewStyle } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { Text } from "../../components/Text";
import { Button, Heading } from "../../components/ui";
import { useReducedMotion } from "../../components/motion";
import { ArcadeSprite, type SpritePose } from "../Sprite";
import { useArcadeLoop, type FrameBudget } from "../loop";
import type { ArcadeResult } from "../types";
import type { OutfitId } from "../progress";
import { ActionHero, AmbientFriend, BallArt, BeetleArt, HuskArt, NetArt, Scene, TurtleArt } from "./Art";
import { palmResult, palmStep, palmTransition, type PalmInput, type PalmState } from "../games/palm-patrol/engine";
import {
  beachConfig,
  beachResult,
  beachStep,
  beachTransition,
  paddleWidth,
  type BeachInput,
  type BeachState,
} from "../games/beach-ball/engine";
const palmTick: PalmInput = { type: "tick" },
  beachTick: BeachInput = { type: "tick" };
const hidden = { x: -200, y: -200, opacity: 0 };
const gestureStyle: ViewStyle =
  Platform.OS === "web" ? ({ touchAction: "none" as const, userSelect: "none" as const } as ViewStyle) : {};
export function Budget({ value }: { value: FrameBudget }) {
  return (
    <Text
      accessibilityLabel="Frame budget"
      style={{
        position: "absolute",
        bottom: 3,
        left: 8,
        fontSize: 10,
        color: "#FFF7DC",
        backgroundColor: "#17384BCC",
        padding: 3,
      }}
    >
      {value.fps.toFixed(1)} fps · p95 {value.p95.toFixed(1)} ms · max {value.max.toFixed(1)} · clamp{" "}
      {value.dropped.toFixed(3)}s · {value.ticks} ticks
    </Text>
  );
}
function useArena() {
  const ref = useRef<View>(null),
    origin = useRef({ x: 0, y: 0 }),
    [size, setSize] = useState({ width: 360, height: 600 });
  function measure() {
    ref.current?.measureInWindow((x, y) => {
      origin.current = { x, y };
    });
  }
  return {
    ref,
    origin,
    size,
    layout: (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = event.nativeEvent.layout;
      setSize({ width, height });
      measure();
    },
    measure,
  };
}
function Pill({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 25,
        backgroundColor: "#123F51E8",
        borderWidth: 1,
        borderColor: "#CFF4DE66",
      }}
    >
      <Heading style={{ color: "#FFF3C7", fontSize: 18 }}>{children}</Heading>
    </View>
  );
}
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
  const { ref: arenaRef, origin, size, layout, measure } = useArena(),
    { width, height } = size,
    reduced = useReducedMotion(),
    poses = useSharedValue<SpritePose[]>([]),
    scale = Math.min(width / 360, height / 600),
    bugSize = Math.max(40, 58 * scale),
    huskSize = 25 * scale,
    heroSize = Math.max(58, 78 * scale),
    reported = useRef(false);
  const onFrame = useCallback(
    (s: PalmState) => {
      const point = (x: number, y: number, size: number) => ({
        x: (x / 360) * width - size / 2,
        y: (y / 600) * height - size / 2,
      });
      poses.set([
        ...Array.from({ length: 12 }, (_, i) => {
          const b = s.beetles.find((b) => b.id === i);
          return b
            ? {
                ...point(b.x, b.y, bugSize),
                opacity: 1,
                angle: reduced ? 0 : b.caught ? Math.sin(s.time * 20) * 0.4 : Math.sin(s.time * 4 + i) * 0.07,
                scale: b.boss ? 1.5 : b.caught ? 0.85 : 1,
              }
            : hidden;
        }),
        ...Array.from({ length: 12 }, (_, i) => {
          const h = s.husks[i];
          return h ? { ...point(h.x, h.y, huskSize), opacity: 1, angle: reduced ? 0 : s.time * 8 } : hidden;
        }),
        {
          ...point(s.launcher, 552, heroSize),
          scale: !reduced && s.cooldown > 0.2 ? 1.08 : 1,
          angle: !reduced ? Math.sin(s.time * 2) * 0.04 : 0,
        },
        ...Array.from({ length: 8 }, (_, i) =>
          s.pulse > 0
            ? {
                ...point(
                  s.feedbackX + Math.cos((i * Math.PI) / 4) * (1 - s.pulse / 0.65) * 50,
                  s.feedbackY + Math.sin((i * Math.PI) / 4) * (1 - s.pulse / 0.65) * 50,
                  8 * scale
                ),
                opacity: reduced ? 0 : s.pulse / 0.65,
                scale: 0.5 + s.pulse,
              }
            : hidden
        ),
        { x: !reduced && s.feedback === "Dizzy detour" && s.pulse ? Math.sin(s.time * 45) * 2 : 0, y: 0, opacity: 1 },
        {
          x: reduced ? width * 0.12 : ((s.time * 12) % (width + 44)) - 44,
          y: height * 0.31 + (reduced ? 0 : Math.sin(s.time) * 5),
          opacity: 0.65,
        },
      ]);
    },
    [width, height, poses, bugSize, huskSize, heroSize, scale, reduced]
  );
  const {
    snapshot: s,
    dispatch,
    state,
    budget,
  } = useArcadeLoop({ initial, active, step: palmStep, reduce: palmTransition, input: palmTick, onFrame });
  useEffect(() => {
    if (active) dispatch({ type: "helper", value: helper });
  }, [active, helper, dispatch]);
  useEffect(() => {
    const result = palmResult(s);
    if (result && !reported.current) {
      reported.current = true;
      onResult(result, s.helped);
    }
  }, [s, onResult]);
  useEffect(() => {
    if (s.event) onTone(s.feedback.startsWith("+40") || s.feedback.startsWith("+100") ? "clear" : "shell-2");
  }, [s.event, s.feedback, onTone]);
  useEffect(() => {
    if (s.shots) onTone("coral", false);
  }, [s.shots, onTone]);
  useEffect(() => {
    if (!active || Platform.OS !== "web") return;
    const key = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
        if (e.key === " ") dispatch({ type: "toss" });
        else dispatch({ type: "move", x: state.current.launcher + (e.key === "ArrowLeft" ? -18 : 18) });
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [active, dispatch, state]);
  function move(e: GestureResponderEvent, toss = false) {
    if (!active) return;
    const t = e.nativeEvent.touches[0] ?? e.nativeEvent;
    dispatch({ type: "move", x: ((t.pageX - origin.current.x) / width) * 360 });
    if (toss) dispatch({ type: "toss" });
  }
  const learning = s.level !== "endless" && s.level.world === "learn";
  return (
    <View
      ref={arenaRef}
      testID="palm-playfield"
      accessibilityLabel="Palm Patrol playfield. Slide to aim. Tap to toss."
      onLayout={layout}
      onStartShouldSetResponder={() => active}
      onResponderGrant={(e) => {
        measure();
        move(e, true);
      }}
      onResponderStart={(e) => {
        if (e.nativeEvent.touches.length > 1 && active) dispatch({ type: "toss" });
      }}
      onResponderMove={(e) => move(e)}
      style={[{ flex: 1, overflow: "hidden", minHeight: 210 }, gestureStyle]}
    >
      <ArcadeSprite poses={poses} index={33} width={width} height={height}>
        <Scene palm world={s.level === "endless" ? "w3" : s.level.world} width={width} height={height} />
      </ArcadeSprite>
      <ArcadeSprite poses={poses} index={34} width={44} height={32}>
        <AmbientFriend night={s.level === "endless" || s.level.world === "w3"} />
      </ArcadeSprite>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          right: 8,
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 4,
        }}
      >
        <Pill label={`${s.caught} beetles guided`}>♧ {s.caught}</Pill>
        <Pill label={`${s.palms} happy palms`}>♧ {"♥".repeat(s.palms)}</Pill>
        <Pill label={`${s.score} points`}>★ {s.score}</Pill>
      </View>
      {learning && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 56,
            alignSelf: "center",
            backgroundColor: "#FFF5D8",
            borderRadius: 22,
            paddingHorizontal: 22,
            paddingVertical: 4,
            borderWidth: 3,
            borderColor: "#D99D3F",
          }}
        >
          <Text
            accessibilityLabel={`Math fact ${s.prompt}`}
            style={{ fontSize: Math.max(24, 30 * scale), color: "#294D43" }}
          >
            {s.prompt}
          </Text>
        </View>
      )}
      {Array.from({ length: 12 }, (_, i) => (
        <ArcadeSprite key={`bug${i}`} poses={poses} index={i} width={bugSize} height={bugSize}>
          <BeetleArt size={bugSize} boss={s.beetles.find((b) => b.id === i)?.boss} />
          {!!s.beetles.find((b) => b.id === i)?.caught && (
            <View style={{ position: "absolute", top: 0 }}>
              <NetArt size={bugSize} />
            </View>
          )}
          {learning && s.beetles.find((b) => b.id === i) && (
            <Heading
              style={{
                position: "absolute",
                top: "55%",
                width: "100%",
                textAlign: "center",
                fontSize: Math.max(20, 23 * scale),
                color: "#FFF7D2",
                textShadowColor: "#432B31",
                textShadowRadius: 2,
              }}
            >
              {s.beetles.find((b) => b.id === i)!.value}
            </Heading>
          )}
        </ArcadeSprite>
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <ArcadeSprite key={`husk${i}`} poses={poses} index={12 + i} width={huskSize} height={huskSize}>
          <HuskArt size={huskSize} />
        </ArcadeSprite>
      ))}
      {[72, 180, 288].map((x, i) => (
        <View
          key={x}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: (x / 360) * width - 38 * scale,
            top: (475 / 600) * height,
            width: 76 * scale,
            height: 17 * scale,
            borderTopLeftRadius: 55,
            borderTopRightRadius: 55,
            backgroundColor: s.shields[i] ? "#6FC666" : "#966A4266",
            borderWidth: 2,
            borderColor: "#2D6745",
            opacity: s.shields[i] ? 0.45 + s.shields[i] * 0.18 : 0.3,
          }}
        >
          <View style={{ width: "100%", height: 2, backgroundColor: "#D5EE94", marginTop: 5 }} />
        </View>
      ))}
      <ArcadeSprite poses={poses} index={24} width={heroSize} height={heroSize}>
        <ActionHero palm size={heroSize} outfit={outfit} />
      </ArcadeSprite>
      {Array.from({ length: 8 }, (_, i) => (
        <ArcadeSprite key={`spark${i}`} poses={poses} index={25 + i} width={8 * scale} height={8 * scale}>
          <View
            style={{
              width: 8 * scale,
              height: 8 * scale,
              borderRadius: 4 * scale,
              backgroundColor: i % 2 ? "#FFE58C" : "#B6F7DF",
            }}
          />
        </ArcadeSprite>
      ))}
      {!!s.pulse && (
        <Text
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{
            position: "absolute",
            top: Math.max(110, (s.feedbackY / 600) * height - 50),
            left: Math.max(6, Math.min(width - 165, (s.feedbackX / 360) * width - 70)),
            color: "#FFF9D0",
            fontSize: 25,
            textShadowColor: "#26394C",
            textShadowRadius: 3,
          }}
        >
          {s.feedback}
        </Text>
      )}
      <View style={{ position: "absolute", bottom: debug ? 24 : 12, right: 14 }}>
        <PressControl
          accessibilityLabel="Toss coconut husk"
          disabled={!active}
          repeat={{ das: 180, arr: 120 }} onPress={() => dispatch({ type: "toss" })}
          style={{ backgroundColor: "#FFE49D", minWidth: 88, borderWidth: 3, borderColor: "#764E2D" }}
        >
          <Heading style={{ color: "#62412C", fontSize: 18 }}>Toss ↑</Heading>
        </PressControl>
      </View>
      {s.level === "endless" && (
        <View style={{ position: "absolute", bottom: 24, left: 12 }}>
          <Button
            quiet
            compact
            disabled={!active}
            onPress={() => {
              const r = palmResult(dispatch({ type: "finish" }));
              if (r && !reported.current) {
                reported.current = true;
                onResult(r, state.current.helped);
              }
            }}
          >
            Finish
          </Button>
        </View>
      )}
      {debug && <Budget value={budget} />}
    </View>
  );
}
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
  const { ref: arenaRef, origin, size, layout, measure } = useArena(),
    { width, height } = size,
    reduced = useReducedMotion(),
    poses = useSharedValue<SpritePose[]>([]),
    scale = Math.min(width / 360, height / 600),
    ballSize = Math.max(24, 28 * scale),
    pointers = useRef(new Map<string, 0 | 1>()),
    reported = useRef(false);
  const onFrame = useCallback(
    (s: BeachState) => {
      const point = (x: number, y: number, w: number, h = w) => ({
        x: (x / 360) * width - w / 2,
        y: (y / 600) * height - h / 2,
      });
      poses.set([
        ...Array.from({ length: 2 }, (_, i) => {
          const b = s.balls[i];
          return b
            ? {
                ...point(b.x, b.y, ballSize),
                opacity: 1,
                angle: reduced ? 0 : s.time * (b.vy < 0 ? -3 : 3),
                scale: !reduced && s.pulse > 0.2 && s.pulse < 0.4 ? 1.12 : 1,
              }
            : hidden;
        }),
        ...s.paddles.map((x, i) => ({
          ...point(x, i ? 65 : 535, (paddleWidth(s, i as 0 | 1) / 360) * width, Math.max(20, 20 * scale)),
          scale: 1,
        })),
        ...Array.from({ length: 8 }, (_, i) =>
          s.pulse > 0.3
            ? {
                ...point(
                  180 + Math.cos((i * Math.PI) / 4) * (1 - s.pulse / 0.8) * 90,
                  300 + Math.sin((i * Math.PI) / 4) * (1 - s.pulse / 0.8) * 90,
                  8 * scale
                ),
                opacity: reduced ? 0 : s.pulse,
                scale: 1,
              }
            : hidden
        ),
        {
          x: reduced ? width * 0.14 : ((s.time * 11) % (width + 44)) - 44,
          y: height * 0.25 + (reduced ? 0 : Math.sin(s.time) * 4),
          opacity: 0.65,
        },
      ]);
    },
    [width, height, poses, scale, ballSize, reduced]
  );
  const {
    snapshot: s,
    dispatch,
    state,
    budget,
  } = useArcadeLoop({ initial, active, step: beachStep, reduce: beachTransition, input: beachTick, onFrame });
  useEffect(() => {
    if (active) dispatch({ type: "helper", value: helper });
  }, [active, helper, dispatch]);
  useEffect(() => {
    if (!active) pointers.current.clear();
  }, [active]);
  useEffect(() => {
    const result = beachResult(s);
    if (result && !reported.current) {
      reported.current = true;
      onResult(result, s.winner);
    }
  }, [s, onResult]);
  useEffect(() => {
    if (s.event) onTone(s.feedback.includes("Splash") ? "clear" : "shell-0");
  }, [s.event, s.feedback, onTone]);
  useEffect(() => {
    if (!active || Platform.OS !== "web") return;
    const key = (e: KeyboardEvent) => {
      const seat = ["a", "d", "A", "D"].includes(e.key) ? 1 : 0;
      if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(e.key)) {
        e.preventDefault();
        dispatch({
          type: "paddle",
          seat,
          x: state.current.paddles[seat] + (["ArrowLeft", "a", "A"].includes(e.key) ? -20 : 20),
        });
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [active, dispatch, state]);
  function touch(e: GestureResponderEvent) {
    if (!active) return;
    const touches = e.nativeEvent.touches;
    for (const id of pointers.current.keys())
      if (!touches.some((t) => t.identifier === id)) pointers.current.delete(id);
    for (const t of touches) {
      if (!pointers.current.has(t.identifier))
        pointers.current.set(t.identifier, t.pageY - origin.current.y < height / 2 ? 1 : 0);
      dispatch({
        type: "paddle",
        seat: pointers.current.get(t.identifier)!,
        x: ((t.pageX - origin.current.x) / width) * 360,
      });
    }
  }
  const config = beachConfig(s);
  return (
    <View
      ref={arenaRef}
      testID="beach-playfield"
      accessibilityLabel="Beach Ball court. Drag the bottom paddle. A second player drags the top paddle."
      onLayout={layout}
      onStartShouldSetResponder={() => active}
      onResponderGrant={(e) => {
        measure();
        touch(e);
      }}
      onResponderStart={touch}
      onResponderMove={touch}
      onResponderEnd={touch}
      onResponderRelease={() => pointers.current.clear()}
      onResponderTerminate={() => pointers.current.clear()}
      style={[{ flex: 1, overflow: "hidden", minHeight: 210 }, gestureStyle]}
    >
      <Scene palm={false} world={s.level === "endless" ? "w3" : s.level.world} width={width} height={height} />
      <ArcadeSprite poses={poses} index={12} width={44} height={32}>
        <AmbientFriend night={s.level === "endless" || s.level.world === "w3"} />
      </ArcadeSprite>
      {config.turtle && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: width / 2 - 43 * scale, top: height / 2 - 43 * scale }}
        >
          <TurtleArt size={86 * scale} />
        </View>
      )}
      {config.wind > 0 && (
        <Text
          pointerEvents="none"
          style={{ position: "absolute", left: 10, top: height * 0.4, color: "#FFFAE1", fontSize: 28 }}
        >
          ≋ →
        </Text>
      )}
      {[0, 1].map((i) => (
        <ArcadeSprite key={`ball${i}`} poses={poses} index={i} width={ballSize} height={ballSize}>
          <BallArt size={ballSize} />
        </ArcadeSprite>
      ))}
      {[0, 1].map((i) => (
        <ArcadeSprite
          key={`paddle${i}`}
          poses={poses}
          index={i + 2}
          width={(paddleWidth(s, i as 0 | 1) / 360) * width}
          height={Math.max(20, 20 * scale)}
        >
          <View
            style={{
              width: (paddleWidth(s, i as 0 | 1) / 360) * width,
              height: Math.max(20, 20 * scale),
              borderRadius: 15,
              backgroundColor: i ? "#EC8177" : "#3AC9C0",
              borderWidth: 3,
              borderColor: i ? "#773B45" : "#1B6372",
              borderTopColor: "#FFF6D8",
              boxShadow: "0px 4px 0px #304F5833",
            }}
          >
            <Heading
              style={{
                position: "absolute",
                top: -7,
                width: "100%",
                textAlign: "center",
                fontSize: 19,
                color: "#FFFADD",
              }}
            >
              {i ? "◆" : "●"}
            </Heading>
          </View>
        </ArcadeSprite>
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <ArcadeSprite key={`spark${i}`} poses={poses} index={4 + i} width={8 * scale} height={8 * scale}>
          <View style={{ width: 8 * scale, height: 8 * scale, borderRadius: 2, backgroundColor: "#FFE275" }} />
        </ArcadeSprite>
      ))}
      {[0, 1].map((i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: "absolute",
            top: i ? 6 : undefined,
            bottom: i ? undefined : 16,
            alignSelf: "center",
            alignItems: "center",
            transform: i && s.mode === "together" ? [{ rotate: "180deg" }] : [],
          }}
        >
          <Pill label={`${names[i]}, ${s.points[i] * config.countBy} points`}>
            {i ? "◆" : "●"} {names[i]} · {s.points[i] * config.countBy}
          </Pill>
        </View>
      ))}
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: height / 2 - 24, left: 8, right: 8, alignItems: "center" }}
      >
        {s.pulse > 0.3 ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: "#FFF8CE", fontSize: 30, textShadowColor: "#365063", textShadowRadius: 3 }}
          >
            {s.feedback}
          </Text>
        ) : config.countBy > 1 ? (
          <Pill>
            +{config.countBy} →{" "}
            {Array.from({ length: Math.max(...s.points) + 1 }, (_, i) => i * config.countBy).join(" · ")}
          </Pill>
        ) : null}
      </View>
      {s.level === "endless" && (
        <View style={{ position: "absolute", bottom: 14, left: 10 }}>
          <Button
            quiet
            compact
            disabled={!active}
            onPress={() => {
              const r = beachResult(dispatch({ type: "finish" }));
              if (r && !reported.current) {
                reported.current = true;
                onResult(r, null);
              }
            }}
          >
            Finish
          </Button>
        </View>
      )}
      {debug && <Budget value={budget} />}
    </View>
  );
}
