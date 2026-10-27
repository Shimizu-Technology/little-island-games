import { PressControl } from "../../Input";
import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { Text } from "../../../components/Text";
import { nativeDriver, useReducedMotion } from "../../../components/motion";
import { ArcadeSprite, type SpritePose } from "../../Sprite";
import { useArcadeLoop } from "../../loop";
import type { OutfitId } from "../../progress";
import type { ArcadeResult } from "../../types";
import { CargoCaptain, CargoCanoe, CargoScene, CargoTile } from "./Art";
import { COLS, ROWS, cargoGoalValue, cargoResult, cargoStep, cargoTransition, pieceCells, type CargoInput, type CargoPiece, type CargoState } from "./engine";
const idle: CargoInput = { type: "idle" };
const ink = "#FFF5D7";
const SettledCargo = memo(function SettledCargo({ board, cell, learning }: { board: CargoState["board"]; cell: number; learning: boolean }) {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>{board.map((tile, i) => tile && <View key={i} style={{ position: "absolute", left: i % COLS * cell, top: Math.floor(i / COLS) * cell }}><CargoTile kind={tile.kind} value={learning ? tile.value : 0} stuck={tile.stuck} size={cell}/></View>)}</View>;
});
function Bundle({ piece, cell, learning }: { piece: CargoPiece; cell: number; learning: boolean }) {
  const cells = pieceCells(piece);
  return <View style={{ width: (Math.max(...cells.map(c => c[1])) + 1) * cell, height: (Math.max(...cells.map(c => c[0])) + 1) * cell }}>{cells.map(([r, c], i) => <View key={i} style={{ position: "absolute", top: r * cell, left: c * cell }}><CargoTile kind={piece.kind} size={cell} value={learning ? piece.value : 0}/></View>)}</View>;
}
function Control({ label, children, onPress, disabled = false, testID }: { label: string; children: React.ReactNode; onPress: () => void; disabled?: boolean; testID?: string }) {
  return <PressControl repeat={label.includes("left") || label.includes("right")} testID={testID} accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={{ minWidth: 48, minHeight: 50, paddingHorizontal: 13, alignItems: "center", justifyContent: "center", backgroundColor: disabled ? "#57717A" : "#F5D894", borderRadius: 16, borderWidth: 2, borderBottomWidth: 5, borderColor: "#755535", opacity: disabled ? .55 : 1 }}><Text style={{ color: "#293F49", fontWeight: "900", fontSize: 22 }}>{children}</Text></PressControl>;
}
export function CargoBoard({ initial, active, helper, outfit, onResult, onTone, debug = false }: { initial: CargoState; active: boolean; helper: boolean; outfit: OutfitId; onResult: (result: ArcadeResult, helped?: boolean) => void; onTone: (tone: string) => void; debug?: boolean }) {
  const { width, height } = useWindowDimensions(), reduced = useReducedMotion(), wide = width >= 700, compact = wide && height < 500;
  const cell = Math.max(compact ? 12 : 15, Math.min(46, (width - 52) / COLS, (height - (compact ? 184 : wide ? 282 : 252)) / ROWS));
  const boardW = cell * COLS, boardH = cell * ROWS, learning = initial.level !== "endless" && !!initial.level.targetSum;
  const poses = useSharedValue<SpritePose[]>([]), decor = useSharedValue<SpritePose[]>([]), reported = useRef(false), eventAge = useRef(3), seenEvent = useRef(0), phase = useRef(0);
  const publish = useCallback((s: CargoState) => {
    const age = eventAge.current;
    if (s.event !== seenEvent.current) { seenEvent.current = s.event; eventAge.current = 0; } else eventAge.current += 1 / 60;
    phase.current += 1 / 60;
    poses.set(pieceCells(s.piece).map(([r, c]) => ({ x: (s.col + c) * cell, y: (s.row + r) * cell, opacity: s.status === "playing" ? 1 : 0, scale: !reduced && age < .18 ? .92 + age / .18 * .08 : 1 })));
    decor.set([
      { x: 0, y: reduced ? 0 : Math.sin(phase.current * 2) * 3, angle: reduced ? 0 : Math.sin(phase.current) * .025 },
      { x: reduced ? 0 : age * 160, y: 0, opacity: s.lastRows.length && age < 1.4 ? 1 : 0 },
      { x: 0, y: reduced ? 0 : -Math.min(45, age * 35), opacity: age < 1.5 ? 1 : 0, scale: reduced ? 1 : 1 + Math.max(0, .15 - age) },
      ...Array.from({ length: 8 }, (_, i) => ({ x: reduced ? 0 : Math.cos(i * .9) * age * 85, y: reduced ? 0 : -Math.sin(i * .9) * age * 100 + age * age * 55, opacity: !reduced && s.lastRows.length && age < .85 ? 1 : 0, scale: Math.max(.3, 1 - age) })),
    ]);
  }, [cell, decor, poses, reduced]);
  const { snapshot: s, dispatch, state, budget } = useArcadeLoop({ initial, step: cargoStep, reduce: cargoTransition, input: idle, active, onFrame: publish });
  const [shake] = useState(() => new Animated.Value(0));
  const heard = useRef(0), bump = useRef(0), helped = useRef(helper);
  useEffect(() => { if (active) { dispatch({ type: "helper", value: helper }); if (helper) helped.current = true; } }, [active, helper, dispatch]);
  useEffect(() => { const result = cargoResult(s); if (result && !reported.current) { reported.current = true; onResult(result, helped.current || !!s.helped); } }, [s, onResult]);
  useEffect(() => {
    if (s.event !== heard.current) { heard.current = s.event; onTone(s.lastRows.length ? "clear" : "coral"); }
    if (s.bump !== bump.current) { bump.current = s.bump; onTone("shell-0"); }
  }, [s.event, s.lastRows.length, s.bump, onTone]);
  useEffect(() => {
    if (reduced || !active || !s.bump) { shake.setValue(0); return; }
    const wobble = Animated.sequence([Animated.timing(shake, { toValue: -3, duration: 40, useNativeDriver: nativeDriver }), Animated.timing(shake, { toValue: 3, duration: 50, useNativeDriver: nativeDriver }), Animated.timing(shake, { toValue: 0, duration: 70, useNativeDriver: nativeDriver })]);
    wobble.start(); return () => { wobble.stop(); shake.setValue(0); };
  }, [s.bump, reduced, active, shake]);
  const act = useCallback((input: CargoInput) => {
    if (!active) return;
    const before = state.current, after = dispatch(input);
    if (after !== before && after.loads === before.loads) onTone(input.type === "rotate" ? "shell-2" : input.type === "hold" ? "shell-3" : "coral");
  }, [active, state, dispatch, onTone]);
  useEffect(() => {
    if (Platform.OS !== "web" || !active) return;
    const key = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.matches?.("input,textarea,select")) return;
      const keys: Record<string, CargoInput["type"]> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "rotate", ArrowDown: "down", " ": "drop", h: "hold", H: "hold" };
      if (keys[event.key]) { event.preventDefault(); act({ type: keys[event.key] } as CargoInput); }
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [act, active]);
  const live = useRef({ active, act, cell }), origin = useRef({ x: 0, y: 0, col: 0, row: 0, shape: [] as readonly (readonly [number, number])[], moved: 0, dropped: false });
  useLayoutEffect(() => { live.current = { active, act, cell }; }, [active, act, cell]);
  // eslint-disable-next-line react-hooks/refs -- Gesture callbacks read current simulation state only when invoked by a touch.
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => live.current.active,
    onMoveShouldSetPanResponder: () => live.current.active,
    onPanResponderGrant: event => { const now = state.current; origin.current = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY, col: now.col, row: now.row, shape: pieceCells(now.piece), moved: 0, dropped: false }; },
    onPanResponderMove: (_, g) => {
      if (!live.current.active || origin.current.dropped) return;
      origin.current.moved = Math.max(origin.current.moved, Math.abs(g.dx), Math.abs(g.dy));
      const offset = Math.round(g.dx / live.current.cell), maxCol = COLS - 1 - Math.max(...pieceCells(state.current.piece).map(c => c[1]));
      const target = Math.max(0, Math.min(maxCol, origin.current.col + offset)), delta = target - state.current.col;
      for (let i = 0; i < Math.min(9, Math.abs(delta)); i++) live.current.act({ type: delta > 0 ? "right" : "left" });
      if (g.dy > Math.max(36, live.current.cell * 1.2) && g.dy > Math.abs(g.dx) * 1.25) { origin.current.dropped = true; live.current.act({ type: "drop" }); }
    },
    onPanResponderRelease: (_, g) => {
      if (!live.current.active || origin.current.dropped || origin.current.moved > 10 || Math.abs(g.dx) > 10 || Math.abs(g.dy) > 10) return;
      const o = origin.current, c = Math.floor(o.x / live.current.cell), r = Math.floor(o.y / live.current.cell);
      live.current.act({ type: o.shape.some(([pr, pc]) => r === o.row + pr && c === o.col + pc) ? "rotate" : c < o.col ? "left" : "right" });
    },
    onPanResponderTerminationRequest: () => false,
  }), [state]);
  const goal = s.level === "endless" ? `${s.score}` : `${cargoGoalValue(s)}/${s.level.target}`;
  const sum = s.level !== "endless" ? s.level.targetSum : 0;
  const previews = <View style={{ alignItems: "center", gap: wide && !compact ? 16 : 5, flexDirection: wide ? "column" : "row" }}>
    <View style={{ alignItems: "center", gap: 5 }}><Text style={ui.label}>NEXT</Text><View style={{ flexDirection: "row", gap: 12, minHeight: wide && !compact ? 70 : 36, alignItems: "center" }}>{s.next.slice(0, helper ? 2 : 1).map((p, i) => <View key={i} accessibilityLabel={`Next ${i + 1}: ${p.kind}, ${pieceCells(p).length} parcels${learning ? ` of ${p.value}` : ""}`}><Bundle piece={p} cell={wide && !compact ? 24 : 18} learning={learning}/></View>)}</View></View>
    {helper && <Pressable testID="cargo-hold" accessibilityRole="button" accessibilityLabel={s.holdUsed ? "Cargo set aside. Hold already used this level" : "Hold this cargo, once this level"} disabled={!active || s.holdUsed} onPressIn={() => act({ type: "hold" })} style={{ minHeight: 48, padding: 8, borderRadius: 13, borderWidth: 1, borderColor: "#B2C1A5", backgroundColor: "#234F5D", opacity: s.holdUsed ? .6 : 1, flexDirection: "row", gap: 8, alignItems: "center" }}>{s.held && <Bundle piece={s.held} cell={14} learning={learning}/>}<Text style={ui.label}>{s.holdUsed ? s.held ? "BACK NEXT" : "HOLD USED" : "HOLD · 1"}</Text></Pressable>}
  </View>;
  const controls = <View style={{ flexDirection: "row", justifyContent: "center", gap: 7, alignItems: "center", flexWrap: compact ? "wrap" : "nowrap", width: compact ? 116 : undefined }}>
      <Control testID="cargo-left" label="Move cargo left" onPress={() => act({ type: "left" })} disabled={!active}>←</Control><Control testID="cargo-rotate" label="Rotate cargo" onPress={() => act({ type: "rotate" })} disabled={!active}>↻</Control><Control testID="cargo-right" label="Move cargo right" onPress={() => act({ type: "right" })} disabled={!active}>→</Control><Control testID="cargo-drop" label="Drop cargo" onPress={() => act({ type: "drop" })} disabled={!active}>↓</Control>
      {!wide && <View style={{ width: 47, height: 50 }}><ArcadeSprite poses={decor} index={0} width={47} height={50}><CargoCaptain size={48} outfit={outfit} happy={s.lastRows.length > 0} dizzy={s.bump > 0 && !s.lastRows.length}/></ArcadeSprite></View>}
    </View>;
  return <View testID="cargo-scene" style={{ width: "100%", backgroundColor: "#2B6677", borderRadius: 24, overflow: "hidden", padding: wide && !compact ? 16 : 9, gap: 8 }}>
    <View style={StyleSheet.absoluteFill}><CargoScene world={s.level === "endless" ? "w3" : s.level.world}/></View>
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 5, alignItems: "center" }}>
      <View style={[ui.pill, { flexDirection: "row", alignItems: "center", gap: 6 }]}>{s.level !== "endless" && s.level.goal === "crates" ? <CargoTile kind="crate" size={24}/> : <CargoCanoe size={30}/>}<Text accessibilityLabel={`Goal progress ${goal}`} style={ui.stat}>{goal}</Text></View>
      {!!sum && <View style={[ui.pill, { backgroundColor: "#FFF0B4" }]}><Text style={[ui.stat, { color: "#263F47" }]}>Σ {sum}</Text></View>}
      <View style={ui.pill}><Text style={ui.stat}>★ {s.score}</Text></View>
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: wide ? 30 : 0 }}>
      <View>
        {!wide && <View style={{ minHeight: 50, justifyContent: "center", alignItems: "center" }}>{previews}</View>}
        <Animated.View style={{ transform: [{ translateX: shake }] }}><View testID="cargo-board" accessibilityLabel="Cargo hold. Tap sides to move, tap the falling cargo to rotate, swipe down to drop." style={{ width: boardW + 10, height: boardH + 10, borderWidth: 5, borderColor: "#A8794B", borderRadius: 11, backgroundColor: "#193E4C", overflow: "hidden", ...(Platform.OS === "web" ? { touchAction: "none" as const } : {}) }} {...pan.panHandlers}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>{Array.from({ length: ROWS }, (_, r) => <View key={r} style={{ position: "absolute", top: r * cell, width: boardW, height: cell, borderBottomWidth: 1, borderColor: "#315460", backgroundColor: r % 2 ? "#204653" : "#1B3E4C" }}/>)}</View>
          <SettledCargo board={s.board} cell={cell} learning={learning}/>
          {pieceCells(s.piece).map((_, i) => <ArcadeSprite key={i} poses={poses} index={i} width={cell} height={cell}><CargoTile kind={s.piece.kind} value={learning ? s.piece.value : 0} size={cell}/></ArcadeSprite>)}
          <View pointerEvents="none" style={{ position: "absolute", top: boardH * .55, left: boardW / 2 - 70 }}><ArcadeSprite poses={decor} index={2} width={140} height={70}><Text style={{ color: "#FFE2A0", fontSize: 30, fontWeight: "900", textAlign: "center", textShadowColor: "#163640", textShadowRadius: 3, textShadowOffset: { width: 1, height: 2 } }}>{s.lastBonus ? "DOUBLE!" : s.combo > 1 ? "Combo!" : "Great!"}{"\n"}+{s.lastPoints}</Text></ArcadeSprite>{Array.from({ length: 8 }, (_, i) => <ArcadeSprite key={i} poses={decor} index={i + 3} width={10} height={10}><View style={{ width: 9, height: 9, borderRadius: i % 2 ? 5 : 1, backgroundColor: i % 2 ? "#F5D47D" : "#BFDBBA" }}/></ArcadeSprite>)}</View>
          <View pointerEvents="none" style={{ position: "absolute", bottom: 12, left: 0 }}><ArcadeSprite poses={decor} index={1} width={100} height={50}><CargoCanoe/></ArcadeSprite></View>
        </View></Animated.View>
      </View>
      {wide && <View style={{ width: Math.min(220, width * .2), alignItems: "center", gap: compact ? 8 : 25 }}>{!compact && <View style={{ width: 160, height: 160 }}><ArcadeSprite poses={decor} index={0} width={160} height={160}><CargoCaptain size={160} outfit={outfit} happy={s.lastRows.length > 0} dizzy={s.bump > 0 && !s.lastRows.length}/></ArcadeSprite></View>}{previews}{compact && controls}{!!sum && !compact && <Text style={[ui.label, { fontSize: 18, textAlign: "center" }]}>{helper ? "Take your time.\nDrop when ready." : "Match the sum.\nSend two canoes!"}</Text>}</View>}
    </View>
    {!compact && controls}
    {!compact && <Text accessibilityLiveRegion="polite" style={{ color: ink, textAlign: "center", fontSize: 12 }}>{(s.held ? "Stored cargo returns after this load" : "") || (learning && helper ? "No falling clock · count, then ↓" : "Tap sides · tap cargo to turn · swipe ↓")}</Text>}
    {s.level === "endless" && <Pressable accessibilityRole="button" accessibilityLabel="Finish cargo free play" onPress={() => act({ type: "finish" })} disabled={!active} style={{ minHeight: 48, justifyContent: "center", alignItems: "center" }}><Text style={ui.label}>Dock my canoe · finish</Text></Pressable>}
    {debug && !compact && <Text testID="cargo-budget" style={{ color: ink, fontSize: 11, textAlign: "center" }}>{budget.fps.toFixed(1)} fps · p95 {budget.p95.toFixed(1)} ms · max {budget.max.toFixed(1)} ms · clamp {budget.dropped.toFixed(3)} s · {budget.ticks} ticks</Text>}
  </View>;
}
const ui = StyleSheet.create({ pill: { backgroundColor: "#173E50", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#7FB0B4" }, stat: { fontSize: 20, fontWeight: "900", color: ink }, label: { color: ink, fontSize: 12, fontWeight: "800", letterSpacing: .7 } });
