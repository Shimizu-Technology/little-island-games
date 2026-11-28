import { BoardTouchView } from '../../../gestures/BoardPan';
import React, { useMemo, useRef, useState } from "react";
import { Platform, View, useWindowDimensions, type ViewStyle } from "react-native";
import type { ChallengeViewProps } from "../../../challenge/types";
import { Button, C, Copy, PressableScale } from "../../../components/ui";
import { atLarge } from "../../../components/wordFit";
import {
  challengeShapeHint,
  completeShapeDraft,
  type Action,
  type State,
} from "./challenge-engine";
import {
  CubeNetView,
  PiecePreview,
  SilhouetteSvg,
  dropGridCoord,
  placedPieceAtCell,
  type PlacedVisual,
} from "./ShapeCanvas";
import { atomKey, canPlaceAtoms, translateAtoms, uniqueOrientations } from "./solver";

const PIECE_COLORS = ["#E07A5F", "#5C9FA0", "#E9B949", "#69A27B", "#9C7BB0", "#D69457", "#6B8EC4", "#C96F63"];

export function ChallengeBoard({ state, dispatch, active, width }: ChallengeViewProps<State, Action>) {
  const p = state.descriptor.payload;
  const { fontScale } = useWindowDimensions();
  const buttonCap = atLarge(fontScale, 1.35);

  const placedIndices = useMemo(() => new Set(state.placed.map((pl) => pl.pieceIndex)), [state.placed]);
  const unplaced = useMemo(
    () => (p.kind === "poly" || p.kind === "tangram" ? p.pieces.map((_, i) => i).filter((i) => !placedIndices.has(i)) : []),
    [p, placedIndices],
  );

  const [selectedPiece, setSelectedPiece] = useState<number>(unplaced[0] ?? 0);
  const boardRef = useRef<View>(null);
  const boardBox = useRef<{ left: number; top: number } | null>(null);
  const dragStart = useRef<[number, number]>([0, 0]);

  const activePieceIdx = unplaced.includes(selectedPiece) ? selectedPiece : (unplaced[0] ?? -1);

  const [pieceUi, setPieceUi] = useState<{
    desc: typeof state.descriptor;
    piece: number;
    orientIdx: number;
    turnsThisPiece: number;
    dragOffset: [number, number];
    ghost: { x: number; y: number; valid: boolean } | null;
  }>({ desc: state.descriptor, piece: activePieceIdx, orientIdx: 0, turnsThisPiece: 0, dragOffset: [0, 0], ghost: null });

  const currentUi = pieceUi.desc === state.descriptor && pieceUi.piece === activePieceIdx
    ? pieceUi
    : { desc: state.descriptor, piece: activePieceIdx, orientIdx: 0, turnsThisPiece: 0, dragOffset: [0, 0] as [number, number], ghost: null };
  const { orientIdx, turnsThisPiece, dragOffset, ghost } = currentUi;

  const patchUi = (patch: Partial<Omit<typeof currentUi, "desc" | "piece">>) =>
    setPieceUi((prev) => ({
      ...(prev.desc === state.descriptor && prev.piece === activePieceIdx
        ? prev
        : { desc: state.descriptor, piece: activePieceIdx, orientIdx: 0, turnsThisPiece: 0, dragOffset: [0, 0] as [number, number], ghost: null }),
      ...patch,
    }));
  const setOrientIdx = (next: number) => patchUi({ orientIdx: next });
  const setTurnsThisPiece = (fn: (prev: number) => number) =>
    setPieceUi((prev) => {
      const base = prev.desc === state.descriptor && prev.piece === activePieceIdx
        ? prev
        : { desc: state.descriptor, piece: activePieceIdx, orientIdx: 0, turnsThisPiece: 0, dragOffset: [0, 0] as [number, number], ghost: null };
      return { ...base, turnsThisPiece: fn(base.turnsThisPiece) };
    });
  const setDragOffset = (next: [number, number]) => patchUi({ dragOffset: next });
  const setGhost = (next: { x: number; y: number; valid: boolean } | null) => patchUi({ ghost: next });

  const hintInfo = useMemo(() => challengeShapeHint(state), [state]);
  const ready = completeShapeDraft(state);

  const isCube = p.kind === "cube-opp" || p.kind === "cube-fold";
  const helpSaturated =
    state.hintStage >= 2 &&
    (isCube ? hintInfo.nextCubePick === null : !hintInfo.deadEnd && !hintInfo.nextPlacement);

  const applyHint = () => {
    if (!active || state.won || helpSaturated) return;
    if (isCube) {
      if (state.hintStage < 2) {
        dispatch(["h"]);
      } else if (hintInfo.nextCubePick !== null) {
        dispatch(["a", hintInfo.nextCubePick]);
      }
      return;
    }
    if (state.hintStage >= 1 && hintInfo.deadEnd) {
      dispatch(["x"]);
    } else if (state.hintStage < 2) {
      dispatch(["h"]);
    } else if (hintInfo.nextPlacement) {
      const [pi, oi, x, y] = hintInfo.nextPlacement;
      dispatch(["s", pi, oi, x, y]);
    }
  };

  const helpLabel =
    state.hintStage === 0
      ? isCube ? "Look (fold clue)" : "Look (shape clue)"
      : isCube
        ? state.hintStage === 1
          ? "Reveal answer"
          : hintInfo.nextCubePick !== null
            ? "Select answer"
            : "Answer selected"
        : hintInfo.deadEnd
          ? "Clear dead end"
          : state.hintStage === 1
            ? "Think"
            : hintInfo.nextPlacement
              ? "One step"
              : "Hint shown";

  // =========================================================================
  // Cube Net Challenge Board (opposite face & fold check)
  // =========================================================================
  if (p.kind === "cube-opp" || p.kind === "cube-fold") {
    return (
      <View style={{ gap: 12, paddingVertical: 4 }}>
        {p.kind === "cube-opp" ? (
          <>
            <Copy style={{ color: C.ink, fontSize: 16 }}>
              When this {p.netName === "T net" ? "T-net" : p.netName.toLowerCase()} folds into a cube, which face is opposite <Copy style={{ fontWeight: "900" }}>{p.faces[p.askIndex]}</Copy>?
            </Copy>
            <CubeNetView cells={p.cells} faces={p.faces} highlightIndex={p.askIndex} cellSize={Math.min(52, Math.floor((width - 60) / 5))} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
              {p.faces.map((face, idx) => {
                if (idx === p.askIndex) return null;
                const chosen = state.cubePick === idx;
                return (
                  <PressableScale
                    key={face}
                    testID={`shape-ch-face-${face}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: chosen }}
                    disabled={!active || state.won}
                    onPress={() => dispatch(["k", idx])}
                    style={{
                      width: 54, minHeight: 54, alignItems: "center", justifyContent: "center",
                      borderRadius: 14, backgroundColor: chosen ? "#DFF2EC" : "#FFFDF8",
                      borderWidth: chosen ? 3 : 1.5, borderBottomWidth: 3, borderColor: chosen ? "#1E6B66" : "#E8D8BE",
                    }}
                  >
                    <Copy maxFontSizeMultiplier={1.4} style={{ fontSize: 22, fontWeight: "900", color: C.ink }}>{face}</Copy>
                  </PressableScale>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <Copy style={{ color: C.ink, fontSize: 16 }}>
              Choose the one net that folds into a closed cube without overlapping faces, then tap Check.
            </Copy>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
              {p.options.map((cells, idx) => {
                const chosen = state.cubePick === idx;
                return (
                  <PressableScale
                    key={idx}
                    testID={`shape-ch-fold-${idx}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: chosen }}
                    disabled={!active || state.won}
                    onPress={() => dispatch(["k", idx])}
                    style={{
                      padding: 10, borderRadius: 16,
                      backgroundColor: chosen ? "#DFF2EC" : "#FFFDF8",
                      borderWidth: chosen ? 3 : 1.5,
                      borderBottomWidth: 3,
                      borderColor: chosen ? "#1E6B66" : "#E8D8BE",
                      alignItems: "center", gap: 6,
                    }}
                  >
                    <CubeNetView cells={cells} cellSize={24} />
                    <Copy maxFontSizeMultiplier={buttonCap} style={{ color: C.ink, fontWeight: "800", fontSize: 14 }}>
                      Net {idx + 1}
                    </Copy>
                  </PressableScale>
                );
              })}
            </View>
          </>
        )}

        {state.lastFeedback && !state.won && (
          <Copy accessibilityLiveRegion="polite" style={{ color: "#9A542E", fontWeight: "800" }}>{state.lastFeedback}</Copy>
        )}

        {!state.won && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Button disabled={!active || !ready || state.checked} maxFontSizeMultiplier={buttonCap} onPress={() => dispatch(["c"])}>
              Check
            </Button>
            <Button quiet disabled={!active || helpSaturated} maxFontSizeMultiplier={buttonCap} onPress={applyHint}>
              {helpLabel}
            </Button>
          </View>
        )}
        {state.hintStage > 0 && !state.won && (
          <View style={{ backgroundColor: "#FFF8DC", borderRadius: 16, padding: 12, borderWidth: 1.5, borderColor: "#E8D8BE" }}>
            <Copy accessibilityLiveRegion="polite" style={{ color: C.ink, fontSize: 15 }}>{hintInfo.text}</Copy>
          </View>
        )}
      </View>
    );
  }

  // =========================================================================
  // Polyomino & Tangram Challenge Board (any exact fill + true drop + Check!)
  // =========================================================================
  const orients = activePieceIdx >= 0 ? uniqueOrientations(p.pieces[activePieceIdx], p.allowRotate, p.allowFlip) : [];
  const safeOrient = orients.length ? orientIdx % orients.length : 0;
  const activeCells = orients[safeOrient] ?? [];

  const compact = width < 420;
  const maxBoardH = compact ? 205 : 296;
  const step = Math.max(
    26,
    Math.min(
      46,
      Math.floor(Math.min(width - 28, 410) / Math.max(p.width, 4)),
      Math.floor(maxBoardH / Math.max(p.height, 4)),
    ),
  );
  const silSet = new Set(p.silhouette.map(atomKey));
  const placedVisuals: PlacedVisual[] = state.placed.map((pl) => ({
    ...pl,
    color: PIECE_COLORS[pl.pieceIndex % PIECE_COLORS.length],
  }));
  const occSet = new Set<string>();
  for (const pl of placedVisuals) {
    for (const at of translateAtoms(pl.cells, pl.x, pl.y)) occSet.add(atomKey(at));
  }

  const goldCorner =
    !state.won && (state.descriptor.goldCornerDefault && !state.supportOff || state.hintStage > 0) && hintInfo.nextPlacement
      ? { x: hintInfo.nextPlacement[2], y: hintInfo.nextPlacement[3] }
      : null;

  const tryPlaceAt = (x: number, y: number) => {
    if (!active || state.won || activePieceIdx < 0) return;
    if (canPlaceAtoms(silSet, occSet, activeCells, x, y)) {
      dispatch(["p", activePieceIdx, safeOrient, x, y, Math.min(turnsThisPiece, 12)]);
    } else {
      dispatch(["m"]);
    }
  };

  const handleCellTap = (x: number, y: number) => {
    if (!active || state.won) return;
    const owner = placedPieceAtCell(placedVisuals, x, y);
    if (owner !== null && (activePieceIdx < 0 || !canPlaceAtoms(silSet, occSet, activeCells, x, y))) {
      dispatch(state.hintStage >= 1 && hintInfo.deadEnd ? ["x", owner] : ["r", owner]);
      setSelectedPiece(owner);
      return;
    }
    tryPlaceAt(x, y);
  };

  const handleDrop = (pageX: number, pageY: number) => {
    setDragOffset([0, 0]);
    setGhost(null);
    boardRef.current?.measureInWindow((left, top) => {
      const { x, y } = dropGridCoord(pageX, pageY, left, top, step, activeCells);
      tryPlaceAt(x, y);
    });
  };

  return (
    <View style={{ gap: compact ? 9 : 12, paddingVertical: 4 }}>
      {state.descriptor.hint && (
        <Copy maxFontSizeMultiplier={1.4} style={{ color: "#665247", fontSize: 14 }}>{state.descriptor.hint}</Copy>
      )}

      <View
        ref={boardRef}
        testID="shape-ch-board"
        style={{
          alignSelf: "center",
          backgroundColor: "#FFF0D2",
          borderRadius: 22,
          padding: 4,
          borderWidth: 2,
          borderColor: state.won ? "#2E7D54" : "#E8D8BE",
        }}
      >
        <View style={{ width: p.width * step + 8, height: p.height * step + 8 }}>
          <SilhouetteSvg
            width={p.width}
            height={p.height}
            step={step}
            silhouette={p.silhouette}
            placed={placedVisuals}
            outlineOnly={state.descriptor.outlineOnly ?? true}
            goldCorner={goldCorner}
            ghost={ghost ? { cells: activeCells, x: ghost.x, y: ghost.y, valid: ghost.valid } : null}
            reveal={state.won}
          />
          <View style={{ position: "absolute", left: 4, top: 4, width: p.width * step, height: p.height * step }}>
            {Array.from({ length: p.height }, (_, y) => (
              <View key={y} style={{ flexDirection: "row" }}>
                {Array.from({ length: p.width }, (_, x) => (
                  <PressableScale
                    key={`${x},${y}`}
                    testID={`shape-ch-cell-${x}-${y}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Column ${x + 1}, row ${y + 1}`}
                    disabled={!active || state.won}
                    onPress={() => handleCellTap(x, y)}
                    style={{ width: step, height: step, backgroundColor: "transparent" }}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>

      {!state.won && unplaced.length > 0 && (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {unplaced.map((idx) => {
              const selected = idx === activePieceIdx;
              return (
                <PressableScale
                  key={idx}
                  testID={`shape-ch-tray-${idx}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Select piece ${idx + 1}`}
                  disabled={!active}
                  onPress={() => setSelectedPiece(idx)}
                  style={{
                    padding: p.kind === "tangram" ? 5 : 7,
                    width: p.kind === "tangram" ? (compact ? 52 : 58) : undefined,
                    height: p.kind === "tangram" ? (compact ? 52 : 58) : undefined,
                    minWidth: 52, minHeight: 52, borderRadius: 14,
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: selected ? "#FFEBB0" : "#FFFDF8",
                    borderWidth: selected ? 3 : 1.5,
                    borderBottomWidth: 3,
                    borderColor: selected ? "#FF7A5C" : "#E8D8BE",
                  }}
                >
                  <PiecePreview atoms={p.pieces[idx]} color={PIECE_COLORS[idx % PIECE_COLORS.length]} cellSize={p.kind === "tangram" ? 11 : 15} />
                </PressableScale>
              );
            })}
          </View>

          {activePieceIdx >= 0 && (
            <BoardTouchView enabled={active}><View testID="shape-ch-active" accessible accessibilityLabel={`Drag piece ${activePieceIdx + 1} onto the outline`} onStartShouldSetResponder={() => active} onMoveShouldSetResponder={() => active} onResponderTerminationRequest={() => false} onResponderGrant={(e) => {
                dragStart.current = [e.nativeEvent.pageX, e.nativeEvent.pageY];
                boardRef.current?.measureInWindow((left, top) => {
                  boardBox.current = { left, top };
                });
              }} onResponderMove={(e) => {
                setDragOffset([e.nativeEvent.pageX - dragStart.current[0], e.nativeEvent.pageY - dragStart.current[1]]);
                if (boardBox.current) {
                  const { x, y } = dropGridCoord(e.nativeEvent.pageX, e.nativeEvent.pageY, boardBox.current.left, boardBox.current.top, step, activeCells);
                  setGhost({ x, y, valid: canPlaceAtoms(silSet, occSet, activeCells, x, y) });
                }
              }} onResponderRelease={(e) => handleDrop(e.nativeEvent.pageX, e.nativeEvent.pageY)} onResponderTerminate={() => { setDragOffset([0, 0]); setGhost(null); }} style={[
                {
                  alignSelf: "center", padding: 10, backgroundColor: "#FFF9E9", borderRadius: 18,
                  borderWidth: 2, borderColor: PIECE_COLORS[activePieceIdx % PIECE_COLORS.length],
                  transform: [{ translateX: dragOffset[0] }, { translateY: dragOffset[1] }], zIndex: 5,
                },
                Platform.OS === "web" ? ({ touchAction: "none" } as unknown as ViewStyle) : {},
              ]}>
              <PiecePreview atoms={activeCells} color={PIECE_COLORS[activePieceIdx % PIECE_COLORS.length]} cellSize={Math.min(32, step - 4)} />
            </View></BoardTouchView>
          )}
        </>
      )}

      {state.lastFeedback && !state.won && (
        <Copy accessibilityLiveRegion="polite" style={{ color: "#9A542E", fontWeight: "800", textAlign: "center" }}>
          {state.lastFeedback}
        </Copy>
      )}

      {!state.won && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {orients.length > 1 && (
            <Button
              quiet
              disabled={!active}
              maxFontSizeMultiplier={buttonCap}
              onPress={() => {
                setOrientIdx((safeOrient + 1) % orients.length);
                setTurnsThisPiece((t) => Math.min(t + 1, 12));
              }}
            >
              {p.allowFlip ? "Turn / Flip" : "Turn"}
            </Button>
          )}
          <Button
            disabled={!active || !ready || state.checked}
            maxFontSizeMultiplier={buttonCap}
            onPress={() => dispatch(["c"])}
          >
            Check
          </Button>
          <Button
            quiet
            disabled={!active || state.placed.length === 0}
            maxFontSizeMultiplier={buttonCap}
            onPress={() => dispatch(state.hintStage >= 1 && hintInfo.deadEnd ? ["x"] : ["z"])}
          >
            Clear
          </Button>
          <Button
            quiet
            disabled={!active || helpSaturated}
            maxFontSizeMultiplier={buttonCap}
            onPress={applyHint}
          >
            {helpLabel}
          </Button>
        </View>
      )}

      {state.hintStage > 0 && !state.won && (
        <View style={{ backgroundColor: "#F4F8EC", borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: "#BFD4B4" }}>
          <Copy accessibilityLiveRegion="polite" style={{ color: C.ink, fontSize: 15 }}>{hintInfo.text}</Copy>
        </View>
      )}
    </View>
  );
}
