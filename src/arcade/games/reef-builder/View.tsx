import { PlayButton, PressControl } from "../../Input";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Animated as DragView, PanResponder, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { Text } from "../../../components/Text";
import { Button, Copy } from "../../../components/ui";
import { useReducedMotion } from "../../../components/motion";
import { Icon } from "../../../components/Icon";
import { useArcadeReducer } from "../../loop";
import { Hero, HudPill, ActionBurst, MiniStars } from "../../Juice";
import { snapDrop, type BoardRect } from "../../clock";
import { previewReefPlacement, reefGoalValue, reefResult, reefTransition, type CoralPiece, type ReefState } from "./engine";
import type { ArcadeResult } from "../../types";
const coralColors = ["#F58D8D", "#FFC45D", "#57CDB0", "#AB87DC"];
export function Coral({ color, variant = 0, fish = false, size }: { color: string; variant?: number; fish?: boolean; size: number }) {
  const shapes = ["M17 35V18L8 15V7Q8 3 13 5V11L18 12V5Q18 1 23 3V17L28 14V8Q33 4 34 9V18L23 24V35Z", "M9 35Q0 25 7 15Q8 6 15 9Q22-1 29 8Q40 11 35 22Q41 32 30 35Z", "M7 34Q-1 27 7 23L15 21L6 17Q2 10 10 10L20 17L17 6Q21-2 26 5L25 17L32 10Q40 9 37 17L27 25L34 29Q38 37 29 35Z", "M7 34L4 19Q3 11 9 13L13 20L12 8Q14 1 19 6L22 19L27 8Q33 3 34 10L32 24Q42 34 30 35Z"];
  return <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}><Ellipse cx={21} cy={35} rx={16} ry={3} fill="#365D72" opacity={.24}/><Path d={shapes[variant % 4]} fill={color} stroke="#47697B" strokeWidth={1.7} strokeLinejoin="round"/><Path d={variant % 2 ? "M11 17Q14 10 18 12M26 12L29 15M12 29L15 30" : "M19 29V23M11 9V12M29 12V15"} fill="none" stroke="#FFF2C6" strokeWidth={2.6} strokeLinecap="round"/>{fish && <><Path d="M23 26L33 20V32Z" fill="#EF8D91" stroke="#546079" strokeWidth={1}/><Ellipse cx={18} cy={26} rx={9} ry={6} fill="#FFF1AE" stroke="#536F83" strokeWidth={1}/><Circle cx={15} cy={24} r={1.8} fill="#294D50"/></>}</Svg>;
}
function PieceArt({ piece, cell = 26, numbers = false }: { piece: CoralPiece; cell?: number; numbers?: boolean }) {
  const w = Math.max(...piece.cells.map(c => c[1])) + 1, h = Math.max(...piece.cells.map(c => c[0])) + 1;
  return <View style={{ width: w * cell, height: h * cell }}>{piece.cells.map(([r, c], i) => <View key={i} style={{ position: "absolute", top: r * cell, left: c * cell, width: cell, height: cell, alignItems: "center", justifyContent: "center" }}><Coral color={coralColors[piece.color % 4]} variant={piece.color} size={cell}/>{numbers && <View style={{ position: "absolute", backgroundColor: "#FFF4D9", borderRadius: 7, paddingHorizontal: 4 }}><Text style={{ fontSize: cell * .58, fontWeight: "900", color: "#244D60" }}>{piece.value}</Text></View>}</View>)}</View>;
}
function DraggablePiece({ piece, slot, selected, active, board, numbers, compact, onSelect, onHover, onDrop }: { piece: CoralPiece; slot: number; selected: boolean; active: boolean; board: React.RefObject<View | null>; numbers: boolean; compact: boolean; onSelect: (slot: number) => void; onHover: (spot: { row: number; col: number } | null) => void; onDrop: (slot: number, row: number, col: number) => void }) {
  const [position] = useState(() => new DragView.ValueXY()), rect = useRef<BoardRect | null>(null), dragged = useRef(false);
  const latest = useRef({ active, onSelect, onHover, onDrop });
  useLayoutEffect(() => { latest.current = { active, onSelect, onHover, onDrop }; }, [active, onSelect, onHover, onDrop]);
  // eslint-disable-next-line react-hooks/refs -- These callbacks run only during gestures, never during render.
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => latest.current.active,
    onMoveShouldSetPanResponder: () => latest.current.active,
    onPanResponderGrant: () => { dragged.current = false; latest.current.onSelect(slot); board.current?.measureInWindow((x, y, width, height) => { rect.current = { x, y, width, height }; }); },
    onPanResponderMove: (_, g) => {
      if (!latest.current.active) return;
      dragged.current = Math.max(Math.abs(g.dx), Math.abs(g.dy)) > 8;
      position.setValue({ x: g.dx, y: g.dy });
      latest.current.onHover(rect.current ? snapDrop(g.moveX, g.moveY, rect.current, 8, 8) : null);
    },
    onPanResponderRelease: (_, g) => {
      position.setValue({ x: 0, y: 0 });
      if (dragged.current && latest.current.active && rect.current) { const spot = snapDrop(g.moveX, g.moveY, rect.current, 8, 8); if (spot) latest.current.onDrop(slot, spot.row, spot.col); }
      latest.current.onHover(null);
    },
    onPanResponderTerminate: () => { position.setValue({ x: 0, y: 0 }); latest.current.onHover(null); },
    onPanResponderTerminationRequest: () => false,
  }), [board, slot, position]);
  const description = numbers ? `number ${piece.value}` : `${piece.cells.length} coral${piece.cells.length === 1 ? "" : "s"}`;
  return <DragView.View style={{ transform: position.getTranslateTransform(), zIndex: selected ? 10 : 1 }} {...responder.panHandlers}>
    <PressControl testID={`coral-piece-${slot}`} accessibilityRole="button" accessibilityLabel={`Piece ${slot + 1}, ${description}${selected ? ", selected" : ""}. Drag to the reef or tap then tap a cell.`} accessibilityState={{ selected, disabled: !active }} disabled={!active} onPress={() => latest.current.onSelect(slot)} style={{ minHeight: compact ? 92 : 100, minWidth: 104, padding: 9, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: selected ? "#FFF0C5" : "#D8E9D5", borderColor: selected ? "#F2BD55" : "#7BAAA6", borderWidth: 3, borderRadius: 24, boxShadow: "0 4px 0 #346C78" }}>
      <PieceArt piece={piece} numbers={numbers} cell={compact ? 25 : 29}/><Text style={{ color: "#345C67", fontSize: 11, fontWeight: "800" }}>{selected ? "READY" : slot + 1}</Text>
    </PressControl>
  </DragView.View>;
}
export function ReefBoard({ initial, active, helper, onResult, onTone }: { initial: ReefState; active: boolean; helper: boolean; onResult: (result: ArcadeResult, helped?: boolean) => void; onTone: (tone: string) => void }) {
  const { snapshot: s, dispatch, state } = useArcadeReducer(initial, reefTransition, active);
  const [selected, setSelected] = useState<number | null>(0), [hover, setHover] = useState<{ row: number; col: number } | null>(null), board = useRef<View>(null), reported = useRef(false);
  const [burst, setBurst] = useState<{ id: number; text: string; fish: boolean; originY?: number } | null>(null), [bumped, setBumped] = useState(false);
  const { width, height } = useWindowDimensions(), side = width > height && width >= 800, size = Math.floor(Math.min(736, side ? Math.max(360, Math.min(width - 300, height - 174)) : width - 16, side ? 736 : Math.max(360, height - 300))), cell = size / 8;
  const reduced = useReducedMotion(), shake = useSharedValue(0), shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  useEffect(() => { if (active && state.current.helper !== helper) dispatch({ type: "helper", value: helper }); }, [active, helper, dispatch, state]);
  useEffect(() => { if (!burst) return; const timer = setTimeout(() => setBurst(null), 1150); return () => clearTimeout(timer); }, [burst]);
  // Keep the final fish release visible before handing the already-terminal engine result to the frame.
  useEffect(() => { const result = reefResult(s); if (!result || !active || reported.current) return; const timer = setTimeout(() => { if (!reported.current) { reported.current = true; onResult(result, helper || !!s.helped); } }, reduced ? 150 : 800); return () => clearTimeout(timer); }, [s, active, onResult, helper, reduced]);
  function place(slot: number, row: number, col: number) {
    if (!active || s.status !== "playing") return;
    const before = state.current, next = dispatch({ type: "place", slot, row, col });
    if (next.moves !== before.moves) {
      onTone(next.lastClear.length ? "clear" : "coral"); setBumped(false); setSelected(next.pieces[slot] ? slot : next.pieces.findIndex(Boolean)); setHover(null);
      setBurst({ id: next.moves, text: `${next.lines - before.lines > 1 ? "Combo! " : next.lastClear.length ? "Great! " : ""}+${next.score - before.score}`, fish: !!next.lastClear.length, originY: next.lastClear.length ? next.lastClear.reduce((sum, i) => sum + (Math.floor(i / 8) + .5) / 8 * 100, 0) / next.lastClear.length : undefined });
    } else { setBumped(true); onTone("bump"); if (!reduced) shake.set(withSequence(withTiming(-3, { duration: 45 }), withTiming(3, { duration: 65 }), withTiming(0, { duration: 70 }))); }
  }
  const piece = selected === null ? null : s.pieces[selected], preview = piece && hover ? previewReefPlacement(s, piece, hover.row, hover.col) : null;
  const target = s.level !== "endless" ? s.level.targetSum : undefined, value = reefGoalValue(s), goal = s.level === "endless" ? "points" : s.level.goal, progress = s.level === "endless" ? `${s.score}` : `${value}/${s.level.target}`;
  const stars = s.level === "endless" ? 0 : s.moves <= s.level.greatMoves ? 3 : s.moves <= s.level.goodMoves ? 2 : 1;
  return <View style={{ flex: 1, width: "100%", alignItems: "center", justifyContent: "center", gap: 10, paddingBottom: 16 }}>
    <View style={{ width: "100%", maxWidth: 1000, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}><HudPill label={`${value} of ${s.level === "endless" ? "free play" : s.level.target} ${goal}`} icon={goal === "fish" ? <View style={{ width: 28, height: 28 }}><Hero size={28} active={false}/></View> : <Icon name={goal === "score" || goal === "points" ? "star-filled" : "flag"} color="#B67A35"/>}>{progress} {goal}</HudPill><HudPill><MiniStars stars={stars}/></HudPill><Copy style={{ color: "#FFF4D5", fontSize: 13, backgroundColor: "#24536A", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14 }}>{s.moves} moves</Copy></View>
    <View style={{ flexDirection: side ? "row" : "column", alignItems: "center", justifyContent: "center", gap: side ? 28 : 12, width: "100%" }}>
      <Animated.View style={shakeStyle}><View ref={board} testID="reef-board" style={{ width: size, height: size, backgroundColor: "#DBDDB4", borderRadius: 22, borderWidth: 3, borderColor: "#F0E5BA", overflow: "hidden", flexDirection: "row", flexWrap: "wrap", boxShadow: "0 7px 0 #286777" }}>
        <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}><Svg width="100%" height="100%" viewBox="0 0 600 600" accessible={false}><Defs><LinearGradient id="reef-bed" x1="0" y1="0" x2=".8" y2="1"><Stop stopColor="#8FCABC"/><Stop offset=".6" stopColor="#C9D8A9"/><Stop offset="1" stopColor="#E9D8AA"/></LinearGradient></Defs><Rect width={600} height={600} fill="url(#reef-bed)"/><Path d="M0 0H105L400 600H275ZM260 0H320L600 510V600Z" fill="#FFFAD5" opacity={.19}/>{[0, 1, 2, 3].map(i => <Path key={i} d={`M-50 ${90 + i * 150}Q75 ${30 + i * 150} 185 ${100 + i * 150}T410 ${95 + i * 150}T650 ${100 + i * 150}`} fill="none" stroke="#FFF7CB" strokeWidth={4} opacity={.2}/>)}<Path d="M0 600Q30 540 12 510Q57 555 25 600M600 600Q559 549 580 511Q548 541 564 600" fill="#418D7D" opacity={.2}/></Svg></View>
        {s.board.map((value, i) => {
          const fish = s.fish.includes(i), highlighted = preview?.cells.includes(i), clears = preview?.clear.cells.includes(i), row = Math.floor(i / 8), col = i % 8;
          const invalid = !preview && hover && piece?.cells.some(([r, c]) => row === hover.row + r && col === hover.col + c);
          return <PressControl key={i} accessibilityRole="button" accessibilityLabel={`Reef row ${row + 1}, column ${col + 1}, ${value ? target ? `number ${value}` : "coral" : "open"}${fish ? ", trapped fish" : ""}`} accessibilityState={{ disabled: !active || !!value || s.status !== "playing" }} disabled={!active || !!value || s.status !== "playing"} onPress={() => { if (selected !== null) place(selected, row, col); }} style={{ width: (size - 6) / 8, height: (size - 6) / 8, borderWidth: clears || highlighted || invalid ? 2 : .5, borderColor: invalid ? "#A4454F" : clears ? "#FFF5AB" : highlighted ? "#C88530" : "#428F8740", backgroundColor: invalid ? "#EDB7A6" : clears ? "#F2D77F" : highlighted ? "#FFF0BA" : (row + col) % 2 ? "#E7E4B11A" : "#4B9D9D0D", alignItems: "center", justifyContent: "center" }}>
            {value > 0 || highlighted ? <><View style={{ opacity: highlighted ? .7 : 1 }}><Coral color={coralColors[highlighted && piece ? piece.color % 4 : (i + value) % 4]} variant={highlighted && piece ? piece.color : (i + value) % 4} fish={fish} size={cell * .9}/></View>{target && <View style={{ position: "absolute", backgroundColor: "#FFF4D9", borderRadius: 8, paddingHorizontal: 5 }}><Text style={{ color: "#244D60", fontSize: cell * .45, fontWeight: "900" }}>{highlighted ? piece?.value : value}</Text></View>}</> : i % 7 === 0 ? <View style={{ width: 5, height: 3, borderRadius: 2, backgroundColor: "#7AA99B", opacity: .4 }}/> : null}
          </PressControl>;
        })}
      </View>{burst && <ActionBurst key={burst.id} text={burst.text} fish={burst.fish} originY={burst.originY}/>}</Animated.View>
      <View style={{ alignItems: "center", gap: 12, maxWidth: side ? 240 : undefined }}>
        {side && <Hero game="reef-builder" size={100} cue={s.moves} mood={bumped ? "dizzy" : s.lastClear.length ? "happy" : "idle"} active={active}/>}
        <View style={{ flexDirection: side ? "column" : "row", gap: 8, zIndex: 2 }}>{s.pieces.map((p, slot) => p ? <DraggablePiece key={slot} piece={p} slot={slot} numbers={!!target} compact={!side} selected={selected === slot} active={active && s.status === "playing"} board={board} onSelect={slot => { setSelected(slot); setHover(null); onTone("coral"); }} onHover={spot => setHover(old => old?.row === spot?.row && old?.col === spot?.col ? old : spot)} onDrop={place}/> : <View key={slot} style={{ minWidth: 104, minHeight: side ? 100 : 92, borderRadius: 24, borderWidth: 2, borderStyle: "dashed", borderColor: "#C6E2CF", justifyContent: "center", alignItems: "center" }}><Icon name="flag" color="#C6E2CF"/></View>)}</View>
        {helper && <PlayButton quiet compact disabled={!active || selected === null || !piece || s.status !== "playing"} onPress={() => { if (selected !== null) { dispatch({ type: "reroll", slot: selected }); onTone("coral"); } }}>Smaller piece</PlayButton>}
      </View>
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 12 }}>
      {!side && <Hero game="reef-builder" size={58} cue={`${s.moves}-${bumped}`} mood={bumped ? "dizzy" : s.lastClear.length ? "happy" : "idle"} active={active}/>}
      <View accessibilityLiveRegion="polite" style={{ flexShrink: 1, maxWidth: 520 }}><Copy style={{ color: "#244C55", textAlign: "center", fontSize: 15, backgroundColor: "#FFF1D5", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 }}>{bumped ? "Try another spot." : s.status === "cleared" ? "Fish swimming free!" : preview?.clear.count ? `${preview.clear.count} line${preview.clear.count === 1 ? "" : "s"} will clear!` : target ? `${target} makes a line · find a partner` : s.moves === 0 ? "Fit the coral in the gap." : "Drag coral · fill a line"}</Copy></View>
    </View>
    {s.level === "endless" && <Button quiet compact disabled={!active} onPress={() => dispatch({ type: "finish" })}>Finish my free-play reef</Button>}
  </View>;
}
