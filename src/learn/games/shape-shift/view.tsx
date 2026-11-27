import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, View, useWindowDimensions, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { C, Copy, PressableScale } from "../../../components/ui";
import { atLarge } from "../../../components/wordFit";
import type { BoardProps } from "../../types";
import {
  chooseCube,
  help,
  place,
  placedToSolver,
  removePlaced,
  setMode,
  shapeHint,
  taskAt,
  transformPiece,
  type ShapeState,
} from "./engine";
import { LegacyBoard } from "./legacy-view";
import {
  CubeNetView,
  PiecePreview,
  SilhouetteSvg,
  dropGridCoord,
  placedPieceAtCell,
  type PlacedVisual,
} from "./ShapeCanvas";
import { atomKey, canPlaceAtoms, translateAtoms } from "./solver";

export function Board(props: BoardProps<ShapeState>) {
  if (props.session.state.version === 1) {
    return <LegacyBoard {...(props as BoardProps<Extract<ShapeState, { version: 1 }>>)} />;
  }
  return <ShapeBoardV2 {...props} stateV2={props.session.state} />;
}

function ShapeBoardV2({ stateV2: s, update, practice, assistance, cheer, coach, active, width }: BoardProps<ShapeState> & { stateV2: Extract<ShapeState, { version: 2 }> }) {
  const task = taskAt(s);
  const { fontScale } = useWindowDimensions();
  const buttonCap = atLarge(fontScale, 1.35);

  const placedIndices = useMemo(() => new Set(s.placed.map((p) => p.pieceIndex)), [s.placed]);
  const unplaced = useMemo(
    () => task.pieces.map((_, i) => i).filter((i) => !placedIndices.has(i)),
    [task.pieces, placedIndices],
  );

  const [selectedPiece, setSelectedPiece] = useState<number>(unplaced[0] ?? 0);
  const [reveal, setReveal] = useState<boolean>(false);

  const boardRef = useRef<View>(null);
  const boardBox = useRef<{ left: number; top: number } | null>(null);
  const dragStart = useRef<[number, number]>([0, 0]);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (revealTimer.current) clearTimeout(revealTimer.current); }, []);

  // Reset selection/orientation when switching task or when selected piece gets placed.
  const activePieceIdx = !task.freeOrder
    ? s.placed.length
    : unplaced.includes(selectedPiece)
      ? selectedPiece
      : (unplaced[0] ?? 0);

  const taskKey = `${s.index}:${s.mode}`;
  const pieceKey = `${taskKey}:${activePieceIdx}`;
  const [pieceUi, setPieceUi] = useState<{
    key: string;
    turns: 0 | 1 | 2 | 3;
    flipped: boolean;
    wrong: boolean;
    dragOffset: [number, number];
    ghost: { x: number; y: number; valid: boolean } | null;
  }>({ key: "", turns: 0, flipped: false, wrong: false, dragOffset: [0, 0], ghost: null });
  const [hintKey, setHintKey] = useState<string | null>(null);

  const currentUi = pieceUi.key === pieceKey
    ? pieceUi
    : { key: pieceKey, turns: 0 as const, flipped: false, wrong: false, dragOffset: [0, 0] as [number, number], ghost: null };
  const { turns, flipped, wrong, dragOffset, ghost } = currentUi;
  const hintOpen = hintKey === taskKey;

  const patchUi = (patch: Partial<Omit<typeof currentUi, "key">>) =>
    setPieceUi((prev) => ({
      ...(prev.key === pieceKey
        ? prev
        : { key: pieceKey, turns: 0 as const, flipped: false, wrong: false, dragOffset: [0, 0] as [number, number], ghost: null }),
      ...patch,
    }));
  const setTurns = (next: 0 | 1 | 2 | 3) => patchUi({ turns: next });
  const setFlipped = (next: boolean) => patchUi({ flipped: next });
  const setWrong = (next: boolean) => patchUi({ wrong: next });
  const setDragOffset = (next: [number, number]) => patchUi({ dragOffset: next });
  const setGhost = (next: { x: number; y: number; valid: boolean } | null) => patchUi({ ghost: next });
  const setHintOpen = (open: boolean) => setHintKey(open ? taskKey : null);

  const piece = task.pieces[activePieceIdx];
  const currentCells = useMemo(
    () => (piece ? transformPiece(piece.cells, turns, flipped) : []),
    [piece, turns, flipped],
  );

  const compact = width < 420;
  const maxBoardH = compact ? 156 : 296;
  const step = Math.max(
    24,
    Math.min(
      48,
      Math.floor(Math.min(width - 36, 420) / Math.max(task.width, 4)),
      Math.floor(maxBoardH / Math.max(task.height, 4)),
    ),
  );
  const silSet = useMemo(() => new Set(task.silhouette.map(atomKey)), [task.silhouette]);

  const placedVisuals: PlacedVisual[] = useMemo(
    () =>
      placedToSolver(task, s.placed).map((pl) => ({
        ...pl,
        color: task.pieces[pl.pieceIndex].color,
      })),
    [task, s.placed],
  );

  const occupiedSet = useMemo(() => {
    const occ = new Set<string>();
    for (const pl of placedVisuals) {
      for (const a of translateAtoms(pl.cells, pl.x, pl.y)) occ.add(atomKey(a));
    }
    return occ;
  }, [placedVisuals]);

  const hintInfo = useMemo(() => (hintOpen ? shapeHint(s) : null), [hintOpen, s]);

  // Gold corner appears ONLY on L1–L2 (task.showGoldCorner) OR when Help is actively showing a suggestion!
  const goldCorner = useMemo(() => {
    if (reveal) return null;
    if (hintOpen && hintInfo?.suggestion) {
      return { x: hintInfo.suggestion.x, y: hintInfo.suggestion.y };
    }
    if (task.showGoldCorner && piece) {
      return {
        x: Math.min(...piece.target.map((a) => a[0])),
        y: Math.min(...piece.target.map((a) => a[1])),
      };
    }
    return null;
  }, [reveal, hintOpen, hintInfo, task.showGoldCorner, piece]);

  const modeSwitcher = (
    <View testID="shape-mode-switch" style={{ flexDirection: "row", gap: 8, alignSelf: "flex-start" }}>
      {(["poly", "tangram"] as const).map((m) => {
        const on = s.mode === m;
        return (
          <PressableScale
            key={m}
            testID={`shape-mode-${m}`}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            disabled={!active || reveal}
            onPress={() => update(setMode(s, m))}
            style={{
              paddingHorizontal: 14, paddingVertical: compact ? 8 : 9, borderRadius: 16, minHeight: 44, justifyContent: "center",
              backgroundColor: on ? "#1E6B66" : "#FFFDF8",
              borderWidth: 1.5, borderBottomWidth: 3, borderColor: on ? "#144F4B" : "#E8D8BE",
            }}
          >
            <Copy maxFontSizeMultiplier={buttonCap} style={{ color: on ? "#FFFDF8" : C.ink, fontWeight: "800", fontSize: 14 }}>
              {m === "poly" ? "Island Shapes" : "Tangrams"}
            </Copy>
          </PressableScale>
        );
      })}
    </View>
  );

  // =========================================================================
  // Cube Net tasks (Level 5 — opposite face across all 11 nets & which-folds!)
  // =========================================================================
  if (task.kind === "cube" && task.cube) {
    const cube = task.cube;
    return (
      <View style={{ gap: 14, paddingVertical: 6 }}>
        {modeSwitcher}
        <Copy style={{ color: C.ink, fontSize: 21, fontWeight: "900" }}>{task.title}</Copy>
        <Copy maxFontSizeMultiplier={1.4} style={{ color: "#C4573A", fontWeight: "800" }}>
          PUZZLE {s.index + 1} OF 4 · {cube.kind === "opposite" ? cube.netName.toUpperCase() : "FOLD CHECK"}
        </Copy>

        {cube.kind === "opposite" ? (
          <>
            <Copy style={{ color: C.ink, fontSize: 17 }}>
              When this net folds into a cube, which face is opposite <Copy style={{ fontWeight: "900" }}>{cube.faces[cube.askIndex]}</Copy>?
            </Copy>
            <CubeNetView cells={cube.cells} faces={cube.faces} highlightIndex={cube.askIndex} cellSize={Math.min(54, Math.floor((width - 64) / 5))} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
              {cube.faces
                .filter((_, idx) => idx !== cube.askIndex)
                .map((face) => (
                  <PressableScale
                    key={face}
                    testID={`cube-face-${face}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Cube face ${face}`}
                    disabled={!active}
                    onPress={() => {
                      const next = chooseCube(s, face);
                      const right = next !== s;
                      practice("think.spatial", right);
                      if (right) {
                        setWrong(false);
                        setHintOpen(false);
                        update(next);
                        cheer(s.index === 3 ? "big" : "right");
                        coach.done();
                      } else {
                        setWrong(true);
                      }
                    }}
                    style={{
                      width: 54, minHeight: 54, alignItems: "center", justifyContent: "center",
                      borderRadius: 14, backgroundColor: "#FFFDF8", borderWidth: 1.5, borderBottomWidth: 3, borderColor: "#E8D8BE",
                    }}
                  >
                    <Copy maxFontSizeMultiplier={1.4} style={{ fontSize: 22, fontWeight: "900", color: C.ink }}>{face}</Copy>
                  </PressableScale>
                ))}
            </View>
          </>
        ) : (
          <>
            <Copy style={{ color: C.ink, fontSize: 17 }}>
              Only one of these three nets folds into a closed cube without overlapping faces. Tap it!
            </Copy>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
              {cube.options.map((opt, idx) => (
                <PressableScale
                  key={opt.id}
                  testID={`cube-fold-opt-${idx}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Net choice ${idx + 1}`}
                  disabled={!active}
                  onPress={() => {
                    const next = chooseCube(s, idx);
                    const right = next !== s;
                    practice("think.spatial", right);
                    if (right) {
                      setWrong(false);
                      setHintOpen(false);
                      update(next);
                      cheer(s.index === 3 ? "big" : "right");
                      coach.done();
                    } else {
                      setWrong(true);
                    }
                  }}
                  style={{
                    padding: 10, borderRadius: 18, backgroundColor: "#FFFDF8",
                    borderWidth: 1.5, borderBottomWidth: 3, borderColor: "#E8D8BE", alignItems: "center", gap: 6,
                  }}
                >
                  <CubeNetView cells={opt.cells} cellSize={24} />
                  <Copy maxFontSizeMultiplier={buttonCap} style={{ color: C.ink, fontWeight: "800", fontSize: 14 }}>
                    Net {idx + 1}
                  </Copy>
                </PressableScale>
              ))}
            </View>
          </>
        )}

        {wrong && (
          <Copy accessibilityLiveRegion="polite" style={{ color: "#9A542E", fontWeight: "800" }}>
            {cube.kind === "opposite"
              ? "That face touches the highlighted square. Try picturing the folded cube."
              : "That net overlaps two faces when folded. Try another one!"}
          </Copy>
        )}

        <PressableScale
          testID="shape-help-button"
          accessibilityRole="button"
          accessibilityLabel="Help with cube net"
          disabled={!active}
          onPress={() => { assistance?.(); update(help(s)); setHintOpen(true); }}
          style={{ alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#FFFDF8", borderWidth: 1.5, borderBottomWidth: 2, borderColor: "#E8D8BE", borderRadius: 16, minHeight: 46, justifyContent: "center" }}
        >
          <Copy maxFontSizeMultiplier={buttonCap} style={{ color: C.ink, fontWeight: "800" }}>Help</Copy>
        </PressableScale>
        {hintOpen && hintInfo && (
          <View style={{ backgroundColor: "#FFF8DC", borderRadius: 16, padding: 12, borderWidth: 1.5, borderColor: "#E8D8BE" }}>
            <Copy accessibilityLiveRegion="polite" style={{ color: C.ink }}>{hintInfo.text}</Copy>
          </View>
        )}
      </View>
    );
  }

  if (!piece) return null;

  // =========================================================================
  // Polyomino & Tangram Board (W0-06 true drop-where-dropped + SC-08 + SP-06)
  // =========================================================================
  const tryPlaceAt = (x: number, y: number) => {
    if (!active || reveal) return;
    const next = place(s, activePieceIdx, currentCells, x, y, { turns, flipped });
    const right = next !== s;
    practice("think.spatial", right);
    if (right) {
      setHintOpen(false);
      setWrong(false);
      if (next.index > s.index) {
        setReveal(true);
        cheer("big");
        revealTimer.current = setTimeout(() => {
          setReveal(false);
          update(next);
          coach.done();
        }, 720);
      } else {
        update(next);
        cheer("right");
        coach.done();
      }
    } else {
      setWrong(true);
    }
  };

  const handleCellTap = (x: number, y: number) => {
    if (!active || reveal) return;
    // Tapping an already-placed piece lifts it back to the tray so the child can rearrange freely!
    const existing = placedPieceAtCell(placedVisuals, x, y);
    if (existing !== null && !canPlaceAtoms(silSet, occupiedSet, currentCells, x, y)) {
      setWrong(false);
      update(removePlaced(s, existing));
      setSelectedPiece(existing);
      return;
    }
    tryPlaceAt(x, y);
  };

  const handleDrop = (pageX: number, pageY: number) => {
    setDragOffset([0, 0]);
    setGhost(null);
    boardRef.current?.measureInWindow((left, top) => {
      // TRUE DROP-WHERE-DROPPED (W0-06): never snap a wrong drop into the target anchor!
      const { x, y } = dropGridCoord(pageX, pageY, left, top, step, currentCells);
      tryPlaceAt(x, y);
    });
  };

  const handleDragMove = (pageX: number, pageY: number) => {
    setDragOffset([pageX - dragStart.current[0], pageY - dragStart.current[1]]);
    if (boardBox.current) {
      const { x, y } = dropGridCoord(pageX, pageY, boardBox.current.left, boardBox.current.top, step, currentCells);
      const valid = canPlaceAtoms(silSet, occupiedSet, currentCells, x, y);
      setGhost({ x, y, valid });
    }
  };

  return (
    <View style={{ gap: compact ? 6 : 11, paddingVertical: compact ? 2 : 6 }}>
      {modeSwitcher}
      <Copy maxFontSizeMultiplier={1.65} style={{ fontSize: compact ? 17 : 21, fontWeight: "900", color: C.ink }}>{task.title}</Copy>
      {reveal ? (
        <Copy maxFontSizeMultiplier={1.4} style={{ fontWeight: "800", color: "#2E7D54", fontSize: compact ? 13 : 14 }}>
          {`${task.picture.toUpperCase()} COMPLETE!`}
        </Copy>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 10, rowGap: 2, alignItems: "center" }}>
          <Copy maxFontSizeMultiplier={1.35} style={{ fontWeight: "800", color: "#C4573A", fontSize: compact ? 12 : 14 }}>
            {`PUZZLE ${s.index + 1} OF 4 · ${s.placed.length}/${task.pieces.length} PLACED`}
          </Copy>
          <Copy maxFontSizeMultiplier={1.35} style={{ fontWeight: "900", color: C.ink, fontSize: compact ? 12 : 14 }}>
            {`Selected: ${piece.name}`}
          </Copy>
        </View>
      )}

      {/* Interactive Silhouette Board */}
      <View
        ref={boardRef}
        testID="shape-board"
        style={{
          alignSelf: "center",
          backgroundColor: "#FFF0D2",
          borderRadius: 22,
          padding: 4,
          borderWidth: 2,
          borderColor: reveal ? "#E3B657" : "#E8D8BE",
        }}
      >
        <View style={{ width: task.width * step + 8, height: task.height * step + 8 }}>
          <SilhouetteSvg
            width={task.width}
            height={task.height}
            step={step}
            silhouette={task.silhouette}
            placed={placedVisuals}
            outlineOnly={task.outlineOnly}
            goldCorner={goldCorner}
            ghost={ghost ? { cells: currentCells, x: ghost.x, y: ghost.y, valid: ghost.valid } : null}
            reveal={reveal}
          />
          {/* Accessible cell tap overlay for VoiceOver, tap-to-place, and tap-to-lift */}
          <View style={{ position: "absolute", left: 4, top: 4, width: task.width * step, height: task.height * step }}>
            {Array.from({ length: task.height }, (_, y) => (
              <View key={y} style={{ flexDirection: "row" }}>
                {Array.from({ length: task.width }, (_, x) => {
                  const isAnchor = goldCorner?.x === x && goldCorner?.y === y;
                  const owner = placedPieceAtCell(placedVisuals, x, y);
                  return (
                    <PressableScale
                      key={`${x},${y}`}
                      testID={`shape-cell-${x}-${y}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Column ${x + 1}, row ${y + 1}${owner !== null ? `, filled by ${task.pieces[owner].name}, tap to lift` : isAnchor ? ", gold corner" : ""}`}
                      disabled={!active || reveal}
                      onPress={() => handleCellTap(x, y)}
                      style={{ width: step, height: step, backgroundColor: "transparent" }}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Free Piece Tray Selector (Levels 2–5 and Tangrams) */}
      {task.freeOrder && !reveal && (
        <View testID="shape-tray" style={{ flexDirection: "row", flexWrap: "wrap", gap: compact ? 5 : 8, justifyContent: "center" }}>
          {unplaced.map((idx) => {
            const p = task.pieces[idx];
            const selected = idx === activePieceIdx;
            return (
              <PressableScale
                key={idx}
                testID={`shape-tray-${idx}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Select ${p.name}`}
                disabled={!active}
                onPress={() => setSelectedPiece(idx)}
                style={{
                  padding: task.kind === "tangram" ? (compact ? 4 : 5) : (compact ? 5 : 7),
                  width: task.kind === "tangram" ? (compact ? 50 : 60) : undefined,
                  height: task.kind === "tangram" ? (compact ? 50 : 60) : undefined,
                  minWidth: compact ? 48 : 56,
                  minHeight: compact ? 48 : 56,
                  borderRadius: compact ? 13 : 14,
                  alignItems: "center", justifyContent: "center",
                  backgroundColor: selected ? "#FFEBB0" : "#FFFDF8",
                  borderWidth: selected ? 2.5 : 1.5,
                  borderBottomWidth: 3,
                  borderColor: selected ? "#FF7A5C" : "#E8D8BE",
                }}
              >
                <PiecePreview atoms={p.cells} color={p.color} cellSize={task.kind === "tangram" ? (compact ? 9.5 : 11) : (compact ? 11 : 15)} />
              </PressableScale>
            );
          })}
        </View>
      )}

      {/* Draggable Active Piece Stage + Controls (side-by-side on compact phone so everything stays above the fold!) */}
      <View style={compact ? { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "center" } : { gap: 10, alignItems: "center" }}>
        {!reveal && (
          <View
            testID="shape-active-piece"
            accessible
            accessibilityLabel={`Drag ${piece.name} to the outline`}
            onStartShouldSetResponder={() => active}
            onMoveShouldSetResponder={() => active}
            onResponderTerminationRequest={() => false}
            onResponderGrant={(e) => {
              dragStart.current = [e.nativeEvent.pageX, e.nativeEvent.pageY];
              boardRef.current?.measureInWindow((left, top) => {
                boardBox.current = { left, top };
              });
            }}
            onResponderMove={(e) => handleDragMove(e.nativeEvent.pageX, e.nativeEvent.pageY)}
            onResponderRelease={(e) => handleDrop(e.nativeEvent.pageX, e.nativeEvent.pageY)}
            onResponderTerminate={() => { setDragOffset([0, 0]); setGhost(null); }}
            style={[
              {
                alignSelf: "center",
                padding: compact ? 6 : 10,
                backgroundColor: "#FFF9E9",
                borderRadius: compact ? 14 : 18,
                borderWidth: 2,
                borderColor: piece.color,
                transform: [{ translateX: dragOffset[0] }, { translateY: dragOffset[1] }],
                zIndex: 5,
              },
              Platform.OS === "web" ? ({ touchAction: "none" } as unknown as ViewStyle) : {},
            ]}
          >
            <PiecePreview atoms={currentCells} color={piece.color} cellSize={compact ? 16 : Math.min(32, Math.max(20, step - 4))} />
          </View>
        )}

        {/* Controls: Turn, Flip, Undo, Help */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: compact ? 6 : 8, justifyContent: "center" }}>
          {task.allowRotate && (
            <PressableScale
              testID="shape-turn"
              accessibilityRole="button"
              accessibilityLabel="Turn piece clockwise"
              disabled={!active || reveal}
              onPress={() => setTurns(((turns + 1) & 3) as 0 | 1 | 2 | 3)}
              style={{ backgroundColor: "#FFFDF8", borderWidth: 1.5, borderBottomWidth: 2, borderColor: "#E8D8BE", borderRadius: 14, paddingHorizontal: compact ? 12 : 14, paddingVertical: compact ? 8 : 11, minHeight: 44, justifyContent: "center" }}
            >
              <Copy maxFontSizeMultiplier={buttonCap} style={{ color: C.ink, fontWeight: "800", fontSize: compact ? 13 : 15 }}>↻ Turn</Copy>
            </PressableScale>
          )}
          {task.allowFlip && (
            <PressableScale
              testID="shape-flip"
              accessibilityRole="button"
              accessibilityLabel="Flip piece"
              disabled={!active || reveal}
              onPress={() => setFlipped(!flipped)}
              style={{ backgroundColor: "#FFFDF8", borderWidth: 1.5, borderBottomWidth: 2, borderColor: "#E8D8BE", borderRadius: 14, paddingHorizontal: compact ? 12 : 14, paddingVertical: compact ? 8 : 11, minHeight: 44, justifyContent: "center" }}
            >
              <Copy maxFontSizeMultiplier={buttonCap} style={{ color: C.ink, fontWeight: "800", fontSize: compact ? 13 : 15 }}>⇄ Flip</Copy>
            </PressableScale>
          )}
          {s.placed.length > 0 && (
            <PressableScale
              testID="shape-undo"
              accessibilityRole="button"
              accessibilityLabel="Undo last placed piece"
              disabled={!active || reveal}
              onPress={() => {
                const last = s.placed[s.placed.length - 1];
                update(removePlaced(s, last.pieceIndex));
                setSelectedPiece(last.pieceIndex);
                setWrong(false);
              }}
              style={{ backgroundColor: "#FFFDF8", borderWidth: 1.5, borderBottomWidth: 2, borderColor: "#E8D8BE", borderRadius: 14, paddingHorizontal: compact ? 12 : 14, paddingVertical: compact ? 8 : 11, minHeight: 44, justifyContent: "center" }}
            >
              <Copy maxFontSizeMultiplier={buttonCap} style={{ color: C.ink, fontWeight: "800", fontSize: compact ? 13 : 15 }}>Undo</Copy>
            </PressableScale>
          )}
          <PressableScale
            testID="shape-help-button"
            accessibilityRole="button"
            accessibilityLabel="Help with this shape"
            disabled={!active || reveal}
            onPress={() => {
              assistance?.();
              const next = help(s);
              update(next);
              setHintOpen(true);
              if (next.version === 2 && next.hintPiece !== null && task.freeOrder) {
                setSelectedPiece(next.hintPiece);
              }
            }}
            style={{ backgroundColor: "#FFFDF8", borderWidth: 1.5, borderBottomWidth: 2, borderColor: "#E8D8BE", borderRadius: 14, paddingHorizontal: compact ? 12 : 14, paddingVertical: compact ? 8 : 11, minHeight: 44, justifyContent: "center" }}
          >
            <Copy maxFontSizeMultiplier={buttonCap} style={{ color: C.ink, fontWeight: "800", fontSize: compact ? 13 : 15 }}>Help</Copy>
          </PressableScale>
        </View>
      </View>

      <Copy maxFontSizeMultiplier={1.4} style={{ color: C.ink, textAlign: "center", fontSize: compact ? 13 : 14 }}>
        {task.showGoldCorner
          ? "Drag the piece onto the exact spot, or tap the gold corner."
          : task.kind === "tangram"
            ? "Drag a piece into the outline, or tap a square to place it. Tap a placed piece to lift it."
            : "Drag the piece onto the exact spot, or tap its top-left square. Tap a placed piece to lift it."}
      </Copy>

      {wrong && (
        <Copy accessibilityLiveRegion="polite" style={{ color: "#A33B22", fontWeight: "800", textAlign: "center" }}>
          It did not fit at that spot. Try another square, turn, or flip!
        </Copy>
      )}

      {hintOpen && hintInfo && (
        <View testID="shape-hint-box" style={{ backgroundColor: "#FFF8DC", borderRadius: 16, padding: 12, borderWidth: 1.5, borderColor: "#E8D8BE" }}>
          <Copy accessibilityLiveRegion="polite" style={{ color: C.ink, fontSize: 15 }}>{hintInfo.text}</Copy>
        </View>
      )}
    </View>
  );
}

export function Art({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M8 61L42 27L42 61Z" fill="#FF7A5C" stroke="#3D2B24" strokeWidth="3" />
      <Path d="M46 27L86 27L86 65L46 65Z" fill="#5C9FA0" stroke="#3D2B24" strokeWidth="3" />
      <Path d="M16 70L86 70L70 88L31 88Z" fill="#E8B448" stroke="#3D2B24" strokeWidth="3" />
    </Svg>
  );
}
