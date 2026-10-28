import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { Text } from "../../../components/Text";
import { useReducedMotion } from "../../../components/motion";
import { PressControl, uiThreadDrag, useSwipe } from "../../Input";
import { ArcadeSprite, type SpritePose } from "../../Sprite";
import { useArcadeLoop } from "../../loop";
import type { OutfitId } from "../../progress";
import type { ArcadeResult } from "../../types";
import { CargoCaptain, CargoCanoe, CargoScene, CargoTile } from "./Art";
import { COLS, ROWS, cargoGoalValue, cargoResult, cargoStep, cargoTransition, landingRow, pieceCells, type CargoInput, type CargoPiece, type CargoState } from "./engine";
const idle: CargoInput = { type: "idle" }, ink = "#FFF5D7";
const SettledCargo = memo(function SettledCargo({ board, cell, learning }: { board: CargoState["board"]; cell: number; learning: boolean }) {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>{board.map((tile, i) => tile && <View key={i} style={{ position: "absolute", left: i % COLS * cell, top: Math.floor(i / COLS) * cell }}><CargoTile kind={tile.kind} value={learning ? tile.value : 0} stuck={tile.stuck} size={cell}/></View>)}</View>;
});
const Bundle = memo(function Bundle({ piece, cell, learning }: { piece: CargoPiece; cell: number; learning: boolean }) {
  const cells = pieceCells(piece);
  return <View style={{ width: (Math.max(...cells.map(c => c[1])) + 1) * cell, height: (Math.max(...cells.map(c => c[0])) + 1) * cell }}>{cells.map(([r, c], i) => <View key={i} style={{ position: "absolute", top: r * cell, left: c * cell }}><CargoTile kind={piece.kind} size={cell} value={learning ? piece.value : 0}/></View>)}</View>;
});
const MovingCargo = memo(function MovingCargo({ poses, kind, value, cell }: { poses: SharedValue<SpritePose[]>; kind: CargoPiece["kind"]; value: number; cell: number }) {
  return <>{[0, 1, 2, 3].map(i => <React.Fragment key={i}><ArcadeSprite poses={poses} index={i + 4} width={cell} height={cell}><View style={{ margin: 3, width: cell - 6, height: cell - 6, borderRadius: 8, borderWidth: 2, borderStyle: "dashed", borderColor: "#D9EBC1", backgroundColor: "#9FCBB522" }}/></ArcadeSprite><ArcadeSprite poses={poses} index={i} width={cell} height={cell}><CargoTile kind={kind} value={value} size={cell}/></ArcadeSprite></React.Fragment>)}</>;
});
const Captain = memo(function Captain({ size, outfit, cue, bump, clear, active, reduced }: { size: number; outfit: OutfitId; cue: string; bump: number; clear: boolean; active: boolean; reduced: boolean }) {
  const bob = useSharedValue(0), turn = useSharedValue(0), squash = useSharedValue(1);
  useEffect(() => { bob.set(active && !reduced ? withRepeat(withSequence(withTiming(-2, { duration: 1300 }), withTiming(0, { duration: 1300 })), -1) : 0); }, [bob, active, reduced]);
  useEffect(() => { if (reduced) return; squash.set(withSequence(withTiming(clear ? 1.06 : .96, { duration: 65 }), withTiming(1, { duration: 110 }))); }, [cue, clear, reduced, squash]);
  useEffect(() => { if (bump && !reduced) turn.set(withSequence(withTiming(-.1, { duration: 45 }), withTiming(.08, { duration: 55 }), withTiming(0, { duration: 70 }))); }, [bump, reduced, turn]);
  const motion = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }, { rotate: `${turn.value}rad` }, { scale: squash.value }] }));
  return <Animated.View style={motion}><CargoCaptain size={size} outfit={outfit} happy={clear}/></Animated.View>;
});
function LockEffects({ s, cell, reduced }: { s: CargoState; cell: number; reduced: boolean }) {
  const age = useSharedValue(0);
  useEffect(() => { age.set(0); age.set(withTiming(1, { duration: 450, easing: Easing.linear })); }, [s.event, age]);
  const flash = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - age.value * 450 / 160) }));
  const trail = useAnimatedStyle(() => ({ opacity: reduced ? 0 : Math.max(0, 1 - age.value * 450 / 140) * .42 }));
  const pop = useAnimatedStyle(() => ({ opacity: 1 - age.value, transform: [{ translateY: reduced ? 0 : -age.value * 25 }] }));
  const row = s.lastRows.length ? Math.min(...s.lastRows) : ROWS - 1;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {s.lastDrop && <Animated.View style={[StyleSheet.absoluteFill, trail]}>{s.lastDrop.cells.map(i => <View key={i} style={{ position: "absolute", left: i % COLS * cell + cell * .2, top: Math.floor(i / COLS) * cell, width: cell * .6, height: (s.lastDrop!.distance + 1) * cell, borderRadius: cell / 3, backgroundColor: "#C7E5D3" }}/>)}</Animated.View>}
    <Animated.View style={[StyleSheet.absoluteFill, flash]}>{s.lastRows.map(r => <View key={r} style={{ position: "absolute", left: 0, top: r * cell, height: cell, width: COLS * cell, backgroundColor: "#FFF2B1", borderRadius: 8 }}/>)}</Animated.View>
    {!reduced && !!s.lastRows.length && <Animated.View style={[{ position: "absolute", left: COLS * cell / 2, top: row * cell }, pop]}>{[-2, -1, 1, 2].map((v, i) => <View key={v} style={{ position: "absolute", left: v * cell * .65, top: i % 2 * -cell * .4, width: 7, height: 7, borderRadius: i % 2 ? 4 : 1, backgroundColor: "#FFF2B1" }}/>)}</Animated.View>}
    {!!s.lastRows.length && <Animated.View style={[{ position: "absolute", right: 7, top: Math.max(cell, (row - 1) * cell) }, pop]}><Text style={{ color: "#FFF2B1", fontSize: 18, fontWeight: "900", textShadowColor: "#183B49", textShadowRadius: 2 }}>+{s.lastPoints}</Text></Animated.View>}
  </View>;
}
function Control({ label, text, onPress, disabled, testID, repeat = false }: { label: string; text: string; onPress: () => void; disabled: boolean; testID: string; repeat?: boolean }) {
  return <PressControl repeat={repeat} testID={testID} accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[ui.control, { opacity: disabled ? .55 : 1 }]}><Text style={ui.symbol}>{text}</Text></PressControl>;
}
function SoftDrop({ active, onChange, onTap }: { active: boolean; onChange: (held: boolean) => void; onTap: () => void }) {
  const point = useSharedValue({ x: 0, y: 0, down: false });
  const gesture = useMemo(() => uiThreadDrag(point).enabled(active), [point, active]);
  useAnimatedReaction(() => point.value.down, (down, before) => { if (down !== before) runOnJS(onChange)(down); }, [onChange]);
  const style = useAnimatedStyle(() => ({ opacity: point.value.down ? .72 : 1 }));
  return <GestureDetector gesture={gesture}><Animated.View collapsable={false} testID="cargo-soft" accessible accessibilityRole="button" accessibilityLabel="Soft drop, hold to fall twenty times faster" accessibilityState={{ disabled: !active }} onAccessibilityTap={onTap} style={[{ ...ui.control, ...(Platform.OS === "web" ? { touchAction: "none" as const } : {}) }, style]}><Text style={ui.symbol}>↓</Text></Animated.View></GestureDetector>;
}
export function CargoBoard({ initial, active, helper, outfit, onResult, onTone, debug = false, width, height }: { width: number; height: number; initial: CargoState; active: boolean; helper: boolean; outfit: OutfitId; onResult: (result: ArcadeResult, helped?: boolean) => void; onTone: (tone: string) => void; debug?: boolean }) {
  // Kit v3: size from the safe-area-measured arena supplied by the shared frame.
  const reduced = useReducedMotion(), wide = width > height || width >= 700, compact = height < 500;
  const cell = Math.max(10, Math.min(43, (width - (wide ? 250 : 48)) / COLS, (height - (wide ? 175 : 285)) / ROWS));
  const boardW = cell * COLS, boardH = cell * ROWS, learning = initial.level !== "endless" && !!initial.level.targetSum;
  const poses = useSharedValue<SpritePose[]>([]), reported = useRef(false), helped = useRef(helper);
  const build = useCallback((s: CargoState) => {
    const ghost = landingRow(s), visible = s.status === "playing" ? 1 : 0;
    return [...pieceCells(s.piece).map(([r, c]) => ({ x: (s.col + c) * cell, y: (s.row + r) * cell, opacity: visible, identity: `${s.loads}:${s.piece.kind}:${s.piece.turn}` })), ...pieceCells(s.piece).map(([r, c]) => ({ x: (s.col + c) * cell, y: (ghost + r) * cell, opacity: visible, snap: true }))];
  }, [cell]);
  const pose = useMemo(() => ({ build, target: poses, snapDistance: cell * 2 }), [build, poses, cell]);
  const { snapshot: s, dispatch, state, budget } = useArcadeLoop({ initial, step: cargoStep, reduce: cargoTransition, input: idle, active, pose });
  const heard = useRef(0), bumped = useRef(0);
  useEffect(() => { if (active) { dispatch({ type: "helper", value: helper }); dispatch({ type: "soft", value: false }); if (helper) helped.current = true; } }, [active, helper, dispatch]);
  useEffect(() => {
    const result = cargoResult(s); if (!result || !active || reported.current) return;
    const timer = setTimeout(() => { reported.current = true; onResult(result, helped.current || !!s.helped); }, result.cleared ? 200 : 0);
    return () => clearTimeout(timer);
  }, [s, active, onResult]);
  useEffect(() => {
    if (s.event !== heard.current) { heard.current = s.event; onTone(s.lastRows.length ? "clear" : "coral"); }
    if (s.bump !== bumped.current) { bumped.current = s.bump; onTone("bump"); }
  }, [s.event, s.lastRows.length, s.bump, onTone]);
  const act = useCallback((input: CargoInput) => {
    if (!active) return;
    const before = state.current, after = dispatch(input);
    if (after !== before && after.bump === before.bump && after.loads === before.loads && !["helper", "soft", "idle"].includes(input.type)) onTone(input.type === "rotate" ? "shell-2" : "coral");
  }, [active, state, dispatch, onTone]);
  const soft = useCallback((value: boolean) => act({ type: "soft", value }), [act]);
  useEffect(() => {
    if (Platform.OS !== "web" || !active) return;
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.matches?.("input,textarea,select")) return;
      const keys: Record<string, CargoInput["type"]> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "rotate", " ": "drop", h: "hold", H: "hold" };
      if (e.key === "ArrowDown") { e.preventDefault(); soft(e.type === "keydown"); }
      else if (keys[e.key] && e.type === "keydown" && (!e.repeat || e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); act({ type: keys[e.key] } as CargoInput); }
    };
    const blur = () => soft(false);
    window.addEventListener("keydown", key); window.addEventListener("keyup", key); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("keyup", key); window.removeEventListener("blur", blur); };
  }, [act, active, soft]);
  const swipe = useSwipe(active && s.status === "playing", direction => act({ type: direction === "up" ? "rotate" : direction === "down" ? "drop" : direction }), 20);
  const goal = s.level === "endless" ? `${s.score}` : `${cargoGoalValue(s)}/${s.level.target}`;
  const controls = <View style={{ flexDirection: "row", justifyContent: "center", flexWrap: compact ? "wrap" : "nowrap", gap: 6, maxWidth: compact ? 180 : undefined }}>
    <Control testID="cargo-left" label="Move cargo left" text="←" repeat onPress={() => act({ type: "left" })} disabled={!active}/>
    <Control testID="cargo-rotate" label="Rotate cargo" text="↻" onPress={() => act({ type: "rotate" })} disabled={!active}/>
    <Control testID="cargo-right" label="Move cargo right" text="→" repeat onPress={() => act({ type: "right" })} disabled={!active}/>
    <SoftDrop active={active && s.status === "playing"} onChange={soft} onTap={() => act({ type: "down" })}/>
    <Control testID="cargo-drop" label="Hard drop cargo" text="⇓" onPress={() => act({ type: "drop" })} disabled={!active}/>
  </View>;
  const preview = <View style={{ flexDirection: wide ? "column" : "row", alignItems: "center", gap: 12 }}>{!wide && <Captain size={62} outfit={outfit} cue={`${s.event}-${s.col}-${s.piece.turn}`} bump={s.bump} clear={!!s.lastRows.length} active={active} reduced={reduced}/>}<View style={{ alignItems: "center", gap: 7 }}><Text style={ui.label}>NEXT</Text><View style={{ flexDirection: "row", gap: 10 }}>{s.next.map((p, i) => <Bundle key={i} piece={p} cell={compact ? 14 : 18} learning={learning}/>)}</View>
    {helper && <PressControl testID="cargo-hold" disabled={!active || s.holdUsed} accessibilityLabel="Hold this cargo, once this level" onPress={() => act({ type: "hold" })} style={ui.pill}><Text style={ui.label}>{s.holdUsed ? s.held ? "BACK NEXT" : "HOLD USED" : "HOLD · 1"}</Text></PressControl>}
  </View></View>;
  return <View testID="cargo-scene" style={{ width: "100%", backgroundColor: "#2B6677", borderRadius: 24, overflow: "hidden", padding: 9, gap: 8 }}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}><CargoScene world={s.level === "endless" ? "w3" : s.level.world}/></View>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 5 }}><View style={ui.pill}><Text accessibilityLabel={`Goal progress ${goal}`} style={ui.stat}>{goal} {s.level === "endless" || s.level.goal === "score" ? "points" : s.level.goal === "crates" ? "crates" : "canoes"}</Text></View>{learning && <View style={ui.pill}><Text style={ui.stat}>Σ {s.level !== "endless" && s.level.targetSum}</Text></View>}<View style={ui.pill}><Text style={ui.stat}>★ {s.score}</Text></View></View>
    <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: wide ? 24 : 0 }}>
      <View style={{ alignItems: "center", gap: 7 }}>{!wide && preview}<View testID="cargo-board" accessibilityLabel="Cargo hold. Swipe left or right to move, up to turn, down to hard drop." style={{ width: boardW + 10, height: boardH + 10, borderWidth: 5, borderColor: "#A8794B", borderRadius: 11, backgroundColor: "#193E4C", overflow: "hidden", ...(Platform.OS === "web" ? { touchAction: "none" as const } : {}) }} {...swipe}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>{Array.from({ length: ROWS }, (_, r) => <View key={r} style={{ position: "absolute", top: r * cell, width: boardW, height: cell, borderBottomWidth: 1, borderColor: "#315460", backgroundColor: r % 2 ? "#204653" : "#1B3E4C" }}/>)}</View>
        <SettledCargo board={s.board} cell={cell} learning={learning}/><MovingCargo poses={poses} kind={s.piece.kind} value={learning ? s.piece.value : 0} cell={cell}/>
        {!!s.event && <LockEffects key={s.event} s={s} cell={cell} reduced={reduced}/>}
      </View></View>
      {wide && <View style={{ width: compact ? 180 : 200, alignItems: "center", gap: compact ? 8 : 20 }}>{!compact && <Captain size={100} outfit={outfit} cue={`${s.event}-${s.col}-${s.piece.turn}`} bump={s.bump} clear={!!s.lastRows.length} active={active} reduced={reduced}/>}{preview}{controls}</View>}
    </View>
    {!wide && controls}
    <Text style={{ color: ink, textAlign: "center", fontSize: 12 }}>{learning ? "No falling clock · matching sums sail twice" : "Hold ← → to slide · hold ↓ for soft drop · ⇓ to land"}</Text>
    {s.level === "endless" && <Pressable accessibilityRole="button" onPress={() => act({ type: "finish" })} style={{ minHeight: 44, justifyContent: "center", alignItems: "center" }}><CargoCanoe size={40}/><Text style={ui.label}>Dock my canoe · finish</Text></Pressable>}
    {debug && <Text testID="cargo-budget" style={{ color: ink, fontSize: 10, textAlign: "center" }}>{budget.fps.toFixed(1)} fps · p95 {budget.p95.toFixed(1)} ms · max {budget.max.toFixed(1)} ms · clamp {budget.dropped.toFixed(3)} s · {budget.ticks} ticks</Text>}
  </View>;
}
const ui = StyleSheet.create({ control: { minWidth: 48, minHeight: 50, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#F5D894", borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: "#755535" }, symbol: { color: "#293F49", fontWeight: "900", fontSize: 24 }, pill: { backgroundColor: "#173E50", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: "#7FB0B4" }, stat: { fontSize: 16, fontWeight: "900", color: ink }, label: { color: ink, fontSize: 12, fontWeight: "800" } });
