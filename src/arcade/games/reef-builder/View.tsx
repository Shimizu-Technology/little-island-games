import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Text } from "../../../components/Text";
import { Button, C, Copy, Heading } from "../../../components/ui";
import { useArcadeReducer } from "../../loop";
import { snapDrop, type BoardRect } from "../../clock";
import { placementCells, reefGoalValue, reefResult, reefTransition, type CoralPiece, type ReefState } from "./engine";
import type { ArcadeResult } from "../../types";
const coralColors = ["#D98A70", "#F1C770", "#7DB8AA", "#A9A0C8"];
function Coral({ color, fish = false, size }: { color: string; fish?: boolean; size: number }) { return <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}><Path d="M9 33Q4 32 7 25L11 10Q12 5 17 8L21 19L25 9Q29 4 32 10L35 29Q36 35 29 35Z" fill={color}/><Path d="M16 27L16 15M25 29L29 17" stroke="#FFF8D9" strokeWidth={2} strokeLinecap="round"/>{fish && <><Path d="M23 25L31 21V31Z" fill="#406D78"/><Circle cx={19} cy={26} r={7} fill="#FFF3BD"/><Circle cx={17} cy={24} r={1.5} fill="#294D50"/></>}</Svg>; }
function PieceArt({ piece, cell = 21 }: { piece: CoralPiece; cell?: number }) {
  const w = Math.max(...piece.cells.map(c => c[1])) + 1, h = Math.max(...piece.cells.map(c => c[0])) + 1;
  return <View style={{ width: w * cell, height: h * cell }}>{piece.cells.map(([r, c], i) => <View key={i} style={{ position: "absolute", top: r * cell, left: c * cell, width: cell, height: cell, borderRadius: 5, backgroundColor: coralColors[piece.color % 4], alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#758C81" }}><Text style={{ fontSize: 15, fontWeight: "800", color: C.ink }}>{piece.value !== 1 || piece.cells.length === 1 ? piece.value : ""}</Text></View>)}</View>;
}
function DraggablePiece({ piece, slot, selected, active, board, onSelect, onHover, onDrop }: { piece: CoralPiece; slot: number; selected: boolean; active: boolean; board: React.RefObject<View | null>; onSelect: (slot: number) => void; onHover: (row: number, col: number) => void; onDrop: (slot: number, row: number, col: number) => void }) {
  const [position] = useState(() => new Animated.ValueXY()), rect = useRef<BoardRect | null>(null), dragged = useRef(false);
  const latest = useRef({ active, onSelect, onHover, onDrop });
  useLayoutEffect(() => { latest.current = { active, onSelect, onHover, onDrop }; }, [active, onSelect, onHover, onDrop]);
  // eslint-disable-next-line react-hooks/refs -- PanResponder stores these callbacks; it does not invoke gesture callbacks during render.
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => latest.current.active,
    onMoveShouldSetPanResponder: () => latest.current.active,
    onPanResponderGrant: () => { dragged.current = false; latest.current.onSelect(slot); board.current?.measureInWindow((x, y, width, height) => { rect.current = { x, y, width, height }; }); },
    onPanResponderMove: (_, g) => {
      if (!latest.current.active) return;
      dragged.current = Math.max(Math.abs(g.dx), Math.abs(g.dy)) > 8;
      position.setValue({ x: g.dx, y: g.dy });
      if (rect.current) { const spot = snapDrop(g.moveX, g.moveY, rect.current, 8, 8); if (spot) latest.current.onHover(spot.row, spot.col); }
    },
    onPanResponderRelease: (_, g) => {
      position.setValue({ x: 0, y: 0 });
      if (dragged.current && latest.current.active && rect.current) { const spot = snapDrop(g.moveX, g.moveY, rect.current, 8, 8); if (spot) latest.current.onDrop(slot, spot.row, spot.col); }
    },
    onPanResponderTerminate: () => position.setValue({ x: 0, y: 0 }),
    onPanResponderTerminationRequest: () => false,
  }), [board, slot, position]);
  const description = piece.cells.length === 1 && piece.value !== 1 ? `number ${piece.value}` : `${piece.cells.length} coral${piece.cells.length === 1 ? "" : "s"}`;
  return <Animated.View style={{ transform: position.getTranslateTransform(), zIndex: selected ? 10 : 1 }} {...responder.panHandlers}>
    <Pressable testID={`coral-piece-${slot}`} accessibilityRole="button" accessibilityLabel={`Piece ${slot + 1}, ${description}${selected ? ", selected" : ""}. Drag to the reef or tap then tap a cell.`} accessibilityState={{ selected, disabled: !active }} disabled={!active} onPress={() => latest.current.onSelect(slot)} style={{ minHeight: 90, minWidth: 90, padding: 10, alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: selected ? "#FFF3D3" : "#F8F7EF", borderColor: selected ? C.teal : C.line, borderWidth: 2, borderRadius: 18 }}>
      <PieceArt piece={piece}/><Text style={{ color: C.ink, fontSize: 12, fontWeight: "700" }}>Piece {slot + 1}{selected ? " · ready" : ""}</Text>
    </Pressable>
  </Animated.View>;
}
export function ReefBoard({ initial, active, helper, onResult, onTone }: { initial: ReefState; active: boolean; helper: boolean; onResult: (result: ArcadeResult, helped?: boolean) => void; onTone: (tone: string) => void }) {
  const { snapshot: s, dispatch, state } = useArcadeReducer(initial, reefTransition, active);
  const [selected, setSelected] = useState<number | null>(0), [hover, setHover] = useState<{ row: number; col: number } | null>(null), board = useRef<View>(null), reported = useRef(false);
  const { width } = useWindowDimensions(), size = Math.min(432, width - 36), cell = size / 8;
  // Helper preference is a configuration action rather than a new round.
  React.useEffect(() => { if (active && state.current.helper !== helper) dispatch({ type: "helper", value: helper }); }, [active, helper, dispatch, state]);
  function finish(next: ReefState) { const result = reefResult(next); if (result && !reported.current) { reported.current = true; onResult(result, helper); } }
  function place(slot: number, row: number, col: number) {
    if (!active) return;
    const before = state.current, next = dispatch({ type: "place", slot, row, col });
    if (next.moves !== before.moves) { onTone(next.lastClear.length ? "clear" : "coral"); setSelected(next.pieces[slot] ? slot : next.pieces.findIndex(Boolean)); setHover(null); }
    finish(next);
  }
  const piece = selected === null ? null : s.pieces[selected], preview = piece && hover ? placementCells(s, piece, hover.row, hover.col) : null;
  const target = s.level !== "endless" ? s.level.targetSum : undefined;
  return <View style={{ gap: 14, alignItems: "center" }}>
    <View style={{ width: "100%", flexDirection: "row", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
      <Heading style={{ fontSize: 20 }}>{s.level === "endless" ? `${s.score} points` : `${reefGoalValue(s)} / ${s.level.target} ${s.level.goal === "lines" ? "lines" : s.level.goal === "fish" ? "fish" : "points"}`}</Heading><Copy>{s.moves} moves · {s.rescued} fish free</Copy>
    </View>
    <View accessibilityLiveRegion="polite" style={{ width: "100%", minHeight: 48, paddingHorizontal: 4 }}><Copy style={{ color: C.ink, textAlign: "center" }}>{s.message}</Copy></View>
    <View ref={board} testID="reef-board" style={{ width: size, height: size, backgroundColor: "#C8E4DE", borderRadius: 14, borderWidth: 1, borderColor: "#80AFA3", overflow: "hidden", flexDirection: "row", flexWrap: "wrap" }}>
      {s.board.map((value, i) => {
        const fish = s.fish.includes(i), highlighted = preview?.includes(i), row = Math.floor(i / 8), col = i % 8;
        return <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Reef row ${row + 1}, column ${col + 1}, ${value ? target ? `number ${value}` : "coral" : "open"}${fish ? ", trapped fish" : ""}`} accessibilityState={{ disabled: !active || !!value }} disabled={!active || !!value} onPress={() => { if (selected !== null) place(selected, row, col); }} style={{ width: (size - 2) / 8, height: (size - 2) / 8, borderWidth: .5, borderColor: "#A6CCC1", backgroundColor: highlighted ? "#F8DE9F" : value ? "#D8EAC9" : (row + col) % 2 ? "#D6EBE3" : "#CBE5DD", alignItems: "center", justifyContent: "center" }}>
          {value > 0 ? target ? <><Text style={{ color: "#204B48", fontSize: cell * .48, fontWeight: "800" }}>{value}</Text>{fish && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#427E95", position: "absolute", bottom: 2 }}/>}</> : <Coral color={coralColors[(i + value) % 4]} fish={fish} size={cell * .9}/> : highlighted ? <View style={{ width: cell * .5, height: cell * .5, borderWidth: 2, borderColor: "#447D69", borderRadius: 6 }}/> : <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: "#A7CDBF" }}/>}
        </Pressable>;
      })}
    </View>
    {target && <Copy style={{ color: C.teal, fontSize: 14 }}>Rows and columns clear at {target}. Two or more number corals make a line.</Copy>}
    <View style={{ flexDirection: "row", gap: 8, zIndex: 2 }}>{s.pieces.map((p, slot) => p ? <DraggablePiece key={slot} piece={p} slot={slot} selected={selected === slot} active={active} board={board} onSelect={slot => { setSelected(slot); setHover(null); }} onHover={(row, col) => setHover(old => old?.row === row && old?.col === col ? old : { row, col })} onDrop={place}/> : <View key={slot} style={{ minWidth: 90, minHeight: 90, borderRadius: 18, borderWidth: 1, borderStyle: "dashed", borderColor: C.line, justifyContent: "center", alignItems: "center" }}><Text style={{ fontSize: 13, color: C.muted }}>Placed</Text></View>)}</View>
    <Copy style={{ fontSize: 14, textAlign: "center" }}>Drag a piece into place, or tap a piece then its top-left spot.</Copy>
    {helper && <Button quiet disabled={!active || selected === null || !piece} onPress={() => { if (selected !== null) { dispatch({ type: "reroll", slot: selected }); onTone("coral"); } }}>Helper · a smaller piece</Button>}
    {s.level === "endless" && <Button quiet disabled={!active} onPress={() => finish(dispatch({ type: "finish" }))}>Finish my free-play reef</Button>}
  </View>;
}
