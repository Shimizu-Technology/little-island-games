import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, View, type ViewStyle } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import Svg, { Path } from "react-native-svg";
import { Text } from "../../components/Text";
import { Button, Heading } from "../../components/ui";
import { useReducedMotion } from "../../components/motion";
import { beachWallContact } from "../feelArt";
import { ArcadeSprite } from "../Sprite";
import { uiThreadDrag, multiTouchDrag, type DragPoint, type TouchPoints } from "../Input";
import { palmPoses, beachPoses, type PalmArtPose } from "./poses";
import { HIDDEN_POSE } from "../poses";
import { palmHud, beachHud } from "../publication";
import { useArcadeUiLoop } from "../uiLoop";
import { HeartsHud, HitReaction } from "../LivesHud";
import type { ArcadeResult } from "../types";
import type { OutfitId } from "../progress";
import { BeachIllustration, BeachSpark, BeachWallSplash, NetArt, PalmIllustration, PalmSpark, Scene, TurtleArt } from "./Art";
import {
  BeachBallMotion,
  BeachPaddleMotion,
  BeachPaddleShine,
  BeachTurtleMotion,
  PalmBossFlash,
  PalmRecoil,
  useBeachSounds,
  usePalmSounds,
  type BeachArtPose,
} from "./Motion";
import { palmActorLayout, type PalmActor } from "../games/palm-patrol/illustrated";
import { beachBallLayout, beachPaddleLayout } from "../games/beach-ball/illustrated";
import { palmWorkedHint, palmResult, type PalmState } from "../games/palm-patrol/engine";
import { beachResult, paddleWidth, type BeachState } from "../games/beach-ball/engine";
import { arenaTransform, arenaTouch, type Arena, PALM_ACTOR_SIZE } from "./arena";
import {
  aimPoint,
  mapSeatPointers,
  palmFrameStep,
  beachFrameStep,
  type SeatPointers,
  type PalmFrame,
  type BeachFrame,
} from "./controls";
const gestureStyle: ViewStyle = Platform.OS === "web" ? ({ touchAction: "none", userSelect: "none" } as ViewStyle) : {};
function useArena(width: number, height: number) {
  const [size, setSize] = useState({ width, height });
  const arena = useSharedValue(arenaTransform(width, height));
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
      <Scene palm={palm} world={world} width={camera.width} height={camera.height} court={!palm} />
    </View>
  );
});
const PalmSprite = memo(function PalmSprite({ kind, poses, index, scale, testID, outfit }: {
  kind: PalmActor;
  poses: SharedValue<PalmArtPose[]>;
  index: number;
  scale: number;
  testID?: string;
  outfit?: OutfitId;
}) {
  const size = PALM_ACTOR_SIZE[kind] * scale;
  const { image, padding, canvas } = palmActorLayout(kind, size);
  const art = <PalmIllustration kind={kind} frame={image} outfit={outfit} />;
  return (
    <ArcadeSprite poses={poses} index={index} width={size} height={size} padding={padding}>
      <View testID={testID} style={{ width: canvas, height: canvas }}>
        {kind === "launcher" ? <PalmRecoil poses={poses} scale={scale} canvas={canvas}>{art}</PalmRecoil> : art}
        {kind === "boss" && (
          <PalmBossFlash poses={poses} canvas={canvas}>
            <PalmIllustration kind="boss" frame={image} flash />
          </PalmBossFlash>
        )}
      </View>
    </ArcadeSprite>
  );
});

/** Stable layer: the HUD never rebuilds the beetles, nets, husks or impact art. */
const PalmSprites = memo(function PalmSprites({ poses, scale, reduced }: {
  poses: SharedValue<PalmArtPose[]>;
  scale: number;
  reduced: boolean;
}) {
  return (
    <>
      {Array.from({ length: 15 }, (_, i) => (
        <React.Fragment key={i}>
          <PalmSprite kind="beetle" poses={poses} index={i} scale={scale} testID={`palm-beetle-${i}`} />
          {i === 0 && <PalmSprite kind="boss" poses={poses} index={15} scale={scale} testID="palm-boss-0" />}
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
        <PalmSprite kind="coconut" key={i} poses={poses} index={45 + i} scale={scale} testID={`palm-coconut-${i}`} />
      ))}
      {!reduced && Array.from({ length: 8 }, (_, i) => (
        <ArcadeSprite key={`p${i}`} poses={poses} index={58 + i} width={6 * scale} height={6 * scale}>
          <View testID={`palm-spark-${i}`}><PalmSpark size={6 * scale} star={i % 2 === 1} /></View>
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
  poses: SharedValue<PalmArtPose[]>;
  scale: number;
  outfit: OutfitId;
  hit: number;
  onTone: (key: string, haptic?: boolean) => void;
}) {
  return (
    <HitReaction hit={hit} onTone={onTone}>
      <PalmSprite kind="launcher" poses={poses} index={57} scale={scale} outfit={outfit} testID="palm-launcher" />
    </HitReaction>
  );
});
function selectPalmBoardHud(state: PalmState) {
  "worklet";
  const { shots, event, cue, ...hud } = palmHud(state);
  return hud;
}
export function PalmBoard({
  initial,
  width = 360,
  height = 600,
  active,
  helper,
  outfit,
  onResult,
  onTone,
  debug,
}: {
  initial: PalmState;
  width?: number;
  height?: number;
  active: boolean;
  helper: boolean;
  outfit: OutfitId;
  onResult: (r: ArcadeResult, assisted: boolean) => void;
  onTone: (key: string, haptic?: boolean) => void;
  debug: boolean;
}) {
  const { size, camera, arena, layout } = useArena(width, height),
    reduced = useReducedMotion(),
    point = useSharedValue<DragPoint>({ x: 180, y: 552, down: false }),
    flags = useSharedValue({ helper, taps: 0, finish: false, help: false }),
    keyboard = useSharedValue({ x: 180, firing: false, used: false }),
    poses = useSharedValue<PalmArtPose[]>(Array(88).fill(HIDDEN_POSE)),
    entrance = useSharedValue({ group: "", started: 0 }),
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
    help: flags.value.help,
  }));
  const build = useCallback(
    (s: PalmState) => {
      "worklet";
      const group = `${s.wave}-${s.relay}-${s.fact}`;
      if (entrance.value.group !== group) entrance.set({ group, started: s.time });
      const entry = Math.max(0, 1 - (s.time - entrance.value.started) / 0.2);
      return palmPoses(s, arena.value, reduced, entry);
    },
    [arena, reduced, entrance]
  );
  const pose = useMemo(() => ({ build, target: poses }), [build, poses]);
  const { snapshot: s, outcome, state, clock } = useArcadeUiLoop({ initial, input, active, step: palmFrameStep, result: palmResult, select: selectPalmBoardHud, pose });
  usePalmSounds(state, onTone);
  useEffect(() => {
    flags.set({ ...flags.value, helper });
    if (!active) {
      point.set({ ...point.value, down: false });
      keyboard.set({ ...keyboard.value, firing: false });
    }
  }, [active, helper, flags, point, keyboard]);
  useEffect(() => {
    const r = outcome;
    if (r && active && !reported.current) {
      reported.current = true;
      onResult(r, s.helped);
    }
  }, [s, outcome, active, onResult]);
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
  const learning = s.world === "learn",
    scale = camera.scale;
  return (
    <View style={{ flex: 1 }}>
    <GestureDetector gesture={gesture} touchAction="none">
      <Animated.View
        collapsable={false}
        testID="palm-playfield"
        accessibilityLabel={learning ? "Palm Patrol playfield. Slide to aim. Press once for each math fact." : "Palm Patrol playfield. Slide to aim. Hold to toss."}
        onLayout={layout}
        style={[{ flex: 1, overflow: "hidden", minHeight: 210, backgroundColor: "#335C4D" }, gestureStyle]}
      >
        <ArenaScene palm world={s.world} camera={camera} />
        <PalmSprites poses={poses} scale={scale} reduced={reduced} />
        {[72, 180, 288].map((x, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: camera.x + (x - 38) * scale,
              top: camera.y + 475 * scale,
              width: 76 * scale,
              height: 20 * scale,
            }}
          >
            <Svg width={76 * scale} height={20 * scale} viewBox="0 0 76 20" accessible={false}>
              <Path d="M2 19Q38 10 74 19" fill="none" stroke="#4B5036" strokeWidth={3} opacity={.25}/>
              {s.shields[i] ? <>
                <Path d="M1 17Q5 1 38 1Q71 1 75 17Z" fill={s.shields[i] === 1 ? "#A7BE63" : "#68BC70"} stroke="#285D43" strokeWidth={2}/>
                <Path d="M5 15Q38 5 71 15" fill="none" stroke="#CBE89A" strokeWidth={2}/>
                <Path d="M38 16V3M22 16L29 7M54 16L47 7M10 15L17 9M66 15L59 9" fill="none" stroke="#347A4D" strokeWidth={1.5}/>
                {s.shields[i] < 3 && <Path d="M23 3L29 10L25 17" fill="none" stroke="#285D43" strokeWidth={2}/>}
                {s.shields[i] < 2 && <Path d="M53 3L47 10L51 17" fill="none" stroke="#285D43" strokeWidth={2}/>}
              </> : <Path d="M6 17Q38 11 70 17" fill="none" stroke="#936D43" strokeWidth={2} strokeDasharray="4 5"/>}
            </Svg>
          </View>
        ))}
        <PalmHero poses={poses} scale={scale} outfit={outfit} hit={s.lives.hit} onTone={onTone} />
        {learning &&
          s.answers.map((b) => (
            <ArcadeSprite
              key={b.id}
              poses={poses}
              index={b.id}
              width={PALM_ACTOR_SIZE.beetle * scale}
              height={PALM_ACTOR_SIZE.beetle * scale}
              padding={{ left: 0, top: 0, right: 0, bottom: 32 * scale }}
            >
              <View
                testID={`palm-answer-${b.id}`}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: 4 * scale,
                  top: 48 * scale,
                  width: 50 * scale,
                  alignItems: "center",
                  backgroundColor: "#17382D",
                  borderColor: "#FFE6A6",
                  borderWidth: scale,
                  borderRadius: 10 * scale,
                }}
              >
                <Text numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3} style={{ color: "#FFF4CD", fontWeight: "700", fontSize: 20 * scale, lineHeight: 26 * scale }}>{b.value}</Text>
              </View>
            </ArcadeSprite>
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
          <View accessible accessibilityLabel={`Wave ${s.wave} of ${s.level === "endless" ? "endless" : s.level.waves}, group ${s.relay} of ${s.relays}, ${s.caught} beetles netted`} style={{ padding: 7, gap: 4, backgroundColor: "#123F51EE", borderRadius: 14 }}>
            <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}><Text style={{ color: "#FFF3C7", fontWeight: "800", fontSize: 13 }}>Wave {s.wave}/{s.level === "endless" ? "∞" : s.level.waves}</Text>{Array.from({ length: s.waves }, (_, i) => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: "#FFF0BE", backgroundColor: i + 1 <= s.wave ? "#B6EFCC" : "transparent" }}/>)}</View>
            <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
              <Text style={{ color: "#D3EEE0", fontSize: 11 }}>Group</Text>
              {Array.from({ length: s.relays }, (_, i) => <View key={i} style={{ width: 9, height: 9, borderRadius: i + 1 < s.relay ? 2 : 5, borderWidth: 1.5, borderColor: "#FFF0BE", backgroundColor: i + 1 <= s.relay ? "#FFCE74" : "transparent" }}/>) }
            </View>
          </View>
          {!learning && (
            <View style={camera.x >= 150 ? { position: "absolute", left: 0, top: 44 } : undefined}>
              <HeartsHud lives={s.lives} />
            </View>
          )}
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
        {s.breather && (
          <View
            testID="palm-breather"
            pointerEvents="none"
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel="The beetles rest a moment, then play goes on."
            style={{ position: "absolute", top: 54, alignSelf: "center" }}
          >
            <Pill>The beetles rest a moment</Pill>
          </View>
        )}
        {s.tip && (camera.x >= 150 || camera.y >= 30) && (
          <View
            testID="palm-aim-tip"
            pointerEvents="none"
            style={{ position: "absolute", bottom: 12, ...(camera.x >= 150 ? { left: 8 } : { alignSelf: "center" }) }}
          >
            <Pill>{learning ? "Slide · press for each fact ↑" : "← Slide · hold to toss ↑"}</Pill>
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
        {learning && <View style={{ position: "absolute", top: camera.y + 260 * scale, left: 14, right: 14, alignItems: "center", gap: 6 }}>
          <Button quiet compact disabled={!active} onPress={() => flags.set({ ...flags.value, help: true })}>Help · count it together</Button>
          {s.helped && <View pointerEvents="none" accessibilityLiveRegion="polite" style={{ backgroundColor: "#FFF5D8", padding: 10, borderRadius: 18, maxWidth: 430, gap: 5 }}>
            <Text style={{ color: "#294D43", fontSize: 16, textAlign: "center" }}>{palmWorkedHint(s).text}</Text>
            {palmWorkedHint(s).groups.map((g,i) => <View key={i} accessible accessibilityLabel={`${g.filter(Boolean).length} objects${g.some(v => !v) ? `, ${g.filter(v => !v).length} crossed out` : ""}`} style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, justifyContent: "center" }}>{g.map((v,j) => <Text key={j} style={{ color: v ? i ? "#99452F" : "#246858" : "#89796E", fontSize: 22 }}>{v ? "●" : "×"}</Text>)}</View>)}
          </View>}
        </View>}
    </View>
  );
}
function BeachPill({
  children,
  label,
  tone = "lagoon",
  testID,
  maxWidth,
}: {
  children: React.ReactNode;
  label?: string;
  tone?: "lagoon" | "coral" | "learn";
  testID?: string;
  maxWidth?: number;
}) {
  const backgroundColor = tone === "coral" ? "#6D2B3AEF" : tone === "learn" ? "#1E5954F2" : "#144859F0";
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={label}
      style={{
        maxWidth,
        paddingHorizontal: 11,
        paddingVertical: 5,
        borderRadius: 16,
        backgroundColor,
        borderWidth: 1.5,
        borderColor: "#4D301E",
        borderTopColor: "#FFF2C2",
      }}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.3}
        style={{ color: "#FFF7DC", fontSize: 15, lineHeight: 19, fontWeight: "800" }}
      >
        {children}
      </Text>
    </View>
  );
}

const BeachSprites = memo(function BeachSprites({
  poses,
  scale,
  helper,
  together,
  reduced,
}: {
  poses: SharedValue<BeachArtPose[]>;
  scale: number;
  helper: boolean;
  together: boolean;
  reduced: boolean;
}) {
  const ball = beachBallLayout(scale);
  const turtleSize = 86 * scale;
  const turtlePad = Math.ceil(turtleSize * 0.14);
  const turtleCanvas = turtleSize + turtlePad * 2;
  const sparkBox = 5 * scale;
  const sparkPad = Math.ceil(3 * scale);
  const sparkSize = sparkBox + sparkPad * 2;
  return (
    <>
      {[0, 1].map((i) => (
        <ArcadeSprite
          key={`b${i}`}
          poses={poses}
          index={i}
          width={ball.size}
          height={ball.size}
          padding={ball.padding}
        >
          <BeachBallMotion poses={poses} index={i} canvas={ball.canvas} inkDiameter={ball.inkDiameter}>
            <BeachIllustration kind="ball" frame={ball.image} testID={`beach-ball-${i}-image`} />
          </BeachBallMotion>
        </ArcadeSprite>
      ))}
      {[0, 1].map((i) => {
        const seat = i as 0 | 1;
        const logicalWidth = helper && (i === 0 || together) ? 116 : 86;
        const paddle = beachPaddleLayout(logicalWidth, scale, seat);
        const badgeSize = 13 * scale;
        return (
          <ArcadeSprite
            key={`p${i}`}
            poses={poses}
            index={2 + i}
            width={paddle.width}
            height={paddle.height}
            padding={paddle.padding}
          >
            <BeachPaddleMotion
              poses={poses}
              index={2 + i}
              seat={seat}
              scale={scale}
              width={paddle.canvasWidth}
              height={paddle.canvasHeight}
            >
              <BeachIllustration kind="paddle" frame={paddle.image} testID={`beach-paddle-${i}-image`} />
              <BeachPaddleShine poses={poses} index={2 + i} seat={seat} inkBox={paddle.inkBox} />
              <View
                testID={`beach-paddle-badge-${i}`}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: paddle.inkBox.left + paddle.inkBox.width * 0.12,
                  top: paddle.inkBox.top + (paddle.inkBox.height - badgeSize) / 2,
                  width: badgeSize,
                  height: badgeSize,
                  borderRadius: badgeSize / 2,
                  backgroundColor: i ? "#BA4653" : "#1B6E7D",
                  borderWidth: Math.max(1, 1.2 * scale),
                  borderColor: "#FFF7DC",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                  style={{ fontSize: 8.5 * scale, lineHeight: 10 * scale, color: "#FFF7DC", fontWeight: "800" }}
                >
                  {i ? "◆" : "●"}
                </Text>
              </View>
            </BeachPaddleMotion>
          </ArcadeSprite>
        );
      })}
      <ArcadeSprite
        poses={poses}
        index={12}
        width={turtleSize}
        height={turtleSize}
        padding={{ left: turtlePad, right: turtlePad, top: turtlePad, bottom: turtlePad }}
      >
        <BeachTurtleMotion poses={poses} size={turtleCanvas}>
          <View style={{ position: "absolute", left: turtlePad, top: turtlePad, width: turtleSize, height: turtleSize }}>
            <TurtleArt size={turtleSize} />
          </View>
        </BeachTurtleMotion>
      </ArcadeSprite>
      {!reduced &&
        Array.from({ length: 48 }, (_, i) => (
          <ArcadeSprite
            key={`s${i}`}
            poses={poses}
            index={14 + i}
            width={sparkBox}
            height={sparkBox}
            padding={{ left: sparkPad, right: sparkPad, top: sparkPad, bottom: sparkPad }}
          >
            <View testID={`beach-spark-${i}`} style={{ width: sparkSize, height: sparkSize }}>
              <BeachSpark size={sparkSize} kind={i % 3 === 0 ? "star" : i % 3 === 1 ? "drop" : "coral"} />
            </View>
          </ArcadeSprite>
        ))}
    </>
  );
});

function selectBeachBoardHud(state: BeachState) {
  "worklet";
  const { event, cue, score, bestRally, ...hud } = beachHud(state);
  return hud;
}

export function BeachBoard({
  initial,
  width = 360,
  height = 600,
  active,
  helper,
  onResult,
  onTone,
  debug,
  names,
}: {
  initial: BeachState;
  width?: number;
  height?: number;
  active: boolean;
  helper: boolean;
  onResult: (r: ArcadeResult, winner?: 0 | 1 | null) => void;
  onTone: (key: string, haptic?: boolean) => void;
  debug: boolean;
  names: [string, string];
}) {
  const { camera, arena, layout } = useArena(width, height),
    reduced = useReducedMotion(),
    poses = useSharedValue<BeachArtPose[]>(Array(72).fill(HIDDEN_POSE)),
    feel = useSharedValue<{
      time: number;
      balls: BeachState["balls"];
      spins: [number, number];
      wallSquash: [number, number];
      paddleHitAt: [number, number];
      paddleHitOffset: [number, number];
      turtleHitAt: number;
      lastEvent: number;
      serial: number;
      sparks: { x: number; y: number; at: number }[];
    }>({
      time: initial.time,
      balls: initial.balls,
      spins: [0, 0],
      wallSquash: [0, 0],
      paddleHitAt: [-10, -10],
      paddleHitOffset: [0, 0],
      turtleHitAt: -10,
      lastEvent: initial.event,
      serial: 0,
      sparks: [],
    }),
    points = useSharedValue<TouchPoints>({}),
    mapping = useSharedValue<SeatPointers>({ owners: [null, null], seats: {} }),
    input = useSharedValue<BeachFrame>({ x: [null, null], helper, finish: false }),
    reported = useRef(false);
  const gesture = useMemo(() => multiTouchDrag(points).enabled(active), [points, active]);
  // Audio is an observer of the UI-owned wall serial; builders capture only worklet-safe values.
  useAnimatedReaction(() => feel.value.serial, (serial, before) => {
    if (before !== null && serial > before) runOnJS(onTone)("wall", false);
  }, [feel, onTone]);
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
  const build = useCallback(
    (s: BeachState) => {
      "worklet";
      const previous = feel.value,
        dt = s.time - previous.time;
      const sparks = previous.sparks.filter((e) => s.time - e.at < 0.14);
      let serial = previous.serial;
      const spins: [number, number] = [previous.spins[0], previous.spins[1]];
      const wallSquash: [number, number] = [
        Math.max(0, previous.wallSquash[0] - Math.max(0, dt)),
        Math.max(0, previous.wallSquash[1] - Math.max(0, dt)),
      ];
      const paddleHitAt: [number, number] = [previous.paddleHitAt[0], previous.paddleHitAt[1]];
      const paddleHitOffset: [number, number] = [previous.paddleHitOffset[0], previous.paddleHitOffset[1]];
      let turtleHitAt = previous.turtleHitAt;
      if (dt > 0) {
        for (let i = 0; i < s.balls.length; i++) {
          const b = s.balls[i];
          const contact = previous.balls[i] && beachWallContact(previous.balls[i], b, dt);
          if (contact) {
            sparks.push({ ...contact, at: s.time });
            serial++;
            wallSquash[i] = 0.14;
          }
          if (b.wait > 0) {
            wallSquash[i] = 0;
          } else if (!reduced) {
            const speed = Math.hypot(b.vx, b.vy);
            const dir = b.vx === 0 ? (b.vy < 0 ? -1 : 1) : b.vx > 0 ? 1 : -1;
            spins[i] += (dir * Math.max(2.4, speed * 0.022) + b.spin * 0.12) * dt;
          }
        }
        if (s.event !== previous.lastEvent) {
          if (s.cue === "paddle") {
            const seat: 0 | 1 = s.feedbackY > 300 ? 0 : 1;
            paddleHitAt[seat] = s.time;
            const halfWidth = paddleWidth(s, seat) / 2;
            paddleHitOffset[seat] = Math.max(-1, Math.min(1, (s.feedbackX - s.paddles[seat]) / halfWidth));
          } else if (s.cue === "turtle") {
            turtleHitAt = s.time;
          }
        }
        feel.set({
          time: s.time,
          balls: s.balls,
          spins,
          wallSquash,
          paddleHitAt,
          paddleHitOffset,
          turtleHitAt,
          lastEvent: s.event,
          serial,
          sparks: sparks.slice(-2),
        });
      }
      const next = beachPoses(s, arena.value, reduced, sparks.slice(-2)) as BeachArtPose[];
      for (let i = 0; i < s.balls.length; i++) {
        const b = s.balls[i];
        const padSquash = !reduced && b.squash > 0 ? Math.min(1, b.squash / 0.18) : 0;
        const sideSquash = !reduced && wallSquash[i] > 0 ? Math.min(1, wallSquash[i] / 0.14) : 0;
        next[i] = {
          ...next[i],
          angle: 0,
          scale: 1,
          spin: reduced ? 0 : spins[i],
          squash: padSquash,
          wallSquash: sideSquash,
          glow: reduced ? 0 : Math.max(padSquash, sideSquash) * 0.72,
        };
      }
      for (let seat = 0; seat < 2; seat++) {
        const hitAge = s.time - paddleHitAt[seat];
        const dip =
          reduced || hitAge < 0 || hitAge >= 0.16
            ? 0
            : hitAge < 0.07
              ? (1 - hitAge / 0.07) ** 2
              : -0.22 * Math.max(0, 1 - Math.abs(hitAge - 0.115) / 0.045);
        const shine = !reduced && hitAge >= 0 && hitAge < 0.22 ? (1 - hitAge / 0.22) ** 1.6 : 0;
        const tilt =
          !reduced && hitAge >= 0 && hitAge < 0.16
            ? paddleHitOffset[seat] * 0.055 * (1 - hitAge / 0.16) * (seat === 0 ? 1 : -1)
            : 0;
        next[2 + seat] = { ...next[2 + seat], dip, tilt, shine };
      }
      if (next[12] && next[12].opacity !== 0) {
        const tAge = s.time - turtleHitAt;
        const bump = !reduced && tAge >= 0 && tAge < 0.2 ? Math.sin((1 - tAge / 0.2) * Math.PI) * (1 - tAge / 0.2) : 0;
        next[12] = { ...next[12], bump };
      }
      return next;
    },
    [arena, reduced, feel]
  );
  const pose = useMemo(() => ({ build, target: poses }), [build, poses]);
  const { snapshot: s, outcome, state, clock } = useArcadeUiLoop({
    initial,
    input,
    active,
    step: beachFrameStep,
    result: beachResult,
    select: selectBeachBoardHud,
    pose,
  });
  useBeachSounds(state, onTone);
  useEffect(() => {
    input.set({ ...input.value, helper });
    if (!active) {
      points.set({});
      mapping.set({ owners: [null, null], seats: {} });
    }
  }, [active, helper, input, points, mapping]);
  useEffect(() => {
    const r = outcome;
    if (r && active && !reported.current) {
      reported.current = true;
      onResult(r, s.winner);
    }
  }, [s, outcome, active, onResult]);
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
  const config = s.config,
    scale = camera.scale,
    wallSize = 18 * scale,
    wallPad = Math.ceil(2 * scale),
    sideHud = camera.x >= 130,
    learnInLetterbox = !sideHud && camera.y >= 54,
    pillMaxWidth = sideHud ? Math.max(120, camera.x - 20) : Math.max(120, camera.width - 16),
    learnMaxWidth = sideHud ? Math.max(96, camera.x - 20) : Math.max(96, camera.width * 0.44),
    scoreEdge = Math.max(4, camera.y + 4 * scale),
    stackLearn = !sideHud && !learnInLetterbox && config.countBy > 1;
  return (
    <GestureDetector gesture={gesture} touchAction="none">
      <Animated.View
        collapsable={false}
        testID="beach-playfield"
        accessibilityLabel="Beach Ball court. Drag your paddle. Two players use opposite ends."
        onLayout={layout}
        style={[{ flex: 1, overflow: "hidden", minHeight: 210, backgroundColor: "#1E5668" }, gestureStyle]}
      >
        <ArenaScene palm={false} world={config.world} camera={camera} />
        {(config.turtle || config.balls === 2
          ? [
              { x: 132, y: config.turtle ? 250 : 300 },
              { x: 228, y: config.turtle ? 350 : 300 },
            ]
          : [{ x: 180, y: 300 }]
        ).map((p, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: camera.x + (p.x - 9) * scale,
              top: camera.y + (p.y - 9) * scale,
              width: 18 * scale,
              height: 18 * scale,
              borderRadius: 9 * scale,
              borderWidth: 2 * scale,
              borderColor: "#FFF8DCAA",
              backgroundColor: "#FFF5C826",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View style={{ width: 4 * scale, height: 4 * scale, borderRadius: 2 * scale, backgroundColor: "#FFF8DCCC" }} />
          </View>
        ))}
        {!reduced &&
          [68, 69, 70, 71].map((i) => (
            <ArcadeSprite key={`trail${i}`} poses={poses} index={i} width={7 * scale} height={7 * scale}>
              <View
                testID={`beach-trail-${i - 68}`}
                style={{
                  width: 7 * scale,
                  height: 7 * scale,
                  borderRadius: 3.5 * scale,
                  backgroundColor: "#FFF6D1",
                  borderWidth: Math.max(0.5, 0.8 * scale),
                  borderColor: "#E2A64F88",
                }}
              />
            </ArcadeSprite>
          ))}
        <BeachSprites poses={poses} scale={scale} helper={s.helper} together={s.mode === "together"} reduced={reduced} />
        {[0, 1].map((i) => (
          <ArcadeSprite
            key={`wall${i}`}
            poses={poses}
            index={66 + i}
            width={wallSize}
            height={wallSize}
            padding={{ left: wallPad, right: wallPad, top: wallPad, bottom: wallPad }}
          >
            <View testID={`beach-wall-splash-${i}`} style={{ width: wallSize + wallPad * 2, height: wallSize + wallPad * 2 }}>
              <BeachWallSplash size={wallSize + wallPad * 2} />
            </View>
          </ArcadeSprite>
        ))}
        {[0, 1].map((i) => (
          <ArcadeSprite key={`pop${i}`} poses={poses} index={62 + i} width={65 * scale} height={26 * scale}>
            <View
              testID={`beach-pop-${i}`}
              style={{
                minWidth: 44 * scale,
                paddingHorizontal: 6 * scale,
                paddingVertical: 1 * scale,
                borderRadius: 11 * scale,
                backgroundColor: "#144859DD",
                borderWidth: Math.max(1, 1.2 * scale),
                borderColor: "#4D301E",
                borderTopColor: "#FFF2C2",
                alignSelf: "center",
                alignItems: "center",
              }}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1.3}
                style={{
                  color: "#FFF8CE",
                  fontSize: 18 * scale,
                  lineHeight: 22 * scale,
                  fontWeight: "800",
                  textAlign: "center",
                }}
              >
                +{config.countBy}
              </Text>
            </View>
          </ArcadeSprite>
        ))}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            ...(sideHud ? { right: 10, bottom: 10 } : { bottom: scoreEdge, alignSelf: "center" }),
            maxWidth: pillMaxWidth,
          }}
        >
          <BeachPill
            testID="beach-score-pill-0"
            tone="lagoon"
            maxWidth={pillMaxWidth}
            label={`${names[0]}, ${s.points[0] * config.countBy} points`}
          >
            ● {names[0]} · {s.points[0] * config.countBy}/{config.target * config.countBy}
          </BeachPill>
        </View>
        {sideHud ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              right: 10,
              top: 10,
              maxWidth: pillMaxWidth,
              transform: s.mode === "together" ? [{ rotate: "180deg" }] : [],
            }}
          >
            <BeachPill
              testID="beach-score-pill-1"
              tone="coral"
              maxWidth={pillMaxWidth}
              label={`${names[1]}, ${s.points[1] * config.countBy} points`}
            >
              ◆ {names[1]} · {s.points[1] * config.countBy}/{config.target * config.countBy}
            </BeachPill>
          </View>
        ) : (
          <View
            testID="beach-top-hud"
            pointerEvents="none"
            style={{
              position: "absolute",
              top: scoreEdge,
              left: camera.x,
              width: camera.width,
              paddingHorizontal: 8,
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <View
              style={{
                maxWidth: pillMaxWidth,
                transform: s.mode === "together" ? [{ rotate: "180deg" }] : [],
              }}
            >
              <BeachPill
                testID="beach-score-pill-1"
                tone="coral"
                maxWidth={pillMaxWidth}
                label={`${names[1]}, ${s.points[1] * config.countBy} points`}
              >
                ◆ {names[1]} · {s.points[1] * config.countBy}/{config.target * config.countBy}
              </BeachPill>
            </View>
            {stackLearn && (
              <View
                testID="beach-learn-slot"
                style={{ alignSelf: "flex-start", marginLeft: Math.max(0, 14 * scale - 8) }}
              >
                <BeachPill
                  testID="beach-learn-badge"
                  tone="learn"
                  maxWidth={learnMaxWidth}
                  label={`Count by ${config.countBy}`}
                >
                  Count +{config.countBy}
                </BeachPill>
              </View>
            )}
          </View>
        )}
        {config.countBy > 1 && !stackLearn && (
          <View
            pointerEvents="none"
            style={{ position: "absolute", left: sideHud ? 10 : camera.x + 14 * scale, top: sideHud ? 10 : 8 }}
          >
            <BeachPill
              testID="beach-learn-badge"
              tone="learn"
              maxWidth={learnMaxWidth}
              label={`Count by ${config.countBy}`}
            >
              Count +{config.countBy}
            </BeachPill>
          </View>
        )}
        {s.tip && (
          <View
            pointerEvents="none"
            style={{ position: "absolute", left: camera.x + 16 * scale, top: camera.y + 458 * scale }}
          >
            <View
              style={{
                paddingHorizontal: 10 * scale,
                paddingVertical: 4 * scale,
                borderRadius: 12 * scale,
                backgroundColor: "#144859D9",
                borderWidth: Math.max(1, scale),
                borderColor: "#4D301E",
              }}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1.3}
                style={{ color: "#FFF7DC", fontSize: 13 * scale, fontWeight: "700" }}
              >
                ← Drag ● →
              </Text>
            </View>
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
            UI loop · {clock.value.ticks} ticks · rally {state.value.bestRally}
          </Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}
