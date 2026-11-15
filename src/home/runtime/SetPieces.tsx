import React, { memo } from "react";
import { View } from "react-native";
import Svg from "react-native-svg";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { stagePieces, type PieceKind, type StagePiece } from "../art/Stage";
import type { RoomId } from "../catalogMore";
import type { HomeSound } from "./homeSound";

/**
 * HC-01: the painted jars, pans, shelf books, plants and lanterns each answer a touch with a
 * small motion and sound: a jar hops and clinks, a pan swings, a book tips out and back. The
 * art is the room's own (art/Stage), lifted into one small layer per piece. Nothing is saved.
 */
export const pieceLength: Record<PieceKind, number> = { jar: 420, toy: 420, book: 520, pan: 900, plant: 800, lantern: 1100, sink: 1300 };
export const pieceSound: Record<PieceKind, HomeSound> = { jar: "shell", toy: "wood", book: "wood", pan: "clang", plant: "rustle", lantern: "shell", sink: "splash" };
/** Rotation (degrees about the pivot), rise, and opacity for one piece at 0…1 of its motion. */
export function pieceMotion(kind: PieceKind, t: number, reduced: boolean): { deg: number; dy: number; opacity: number } {
  "worklet";
  if (t <= 0 || t >= 1) return { deg: 0, dy: 0, opacity: kind === "sink" ? 0 : 1 };
  if (kind === "sink") return { deg: 0, dy: 0, opacity: t < 0.06 ? t / 0.06 : t > 0.85 ? (1 - t) / 0.15 : 1 };
  // Reduce Motion: no movement, a brief dim so the touch is still answered.
  if (reduced) return { deg: 0, dy: 0, opacity: t < 0.5 ? 0.6 : 1 };
  switch (kind) {
    case "jar": case "toy": return { deg: t > 0.55 ? Math.sin(((t - 0.55) / 0.45) * Math.PI * 3) * 3 * (1 - t) : 0,
      dy: t < 0.55 ? -10 * Math.sin((t / 0.55) * Math.PI) : 0, opacity: 1 };
    case "book": return { deg: -13 * Math.sin(Math.min(1, t / 0.8) * Math.PI) + (t > 0.8 ? 2 * Math.sin(((t - 0.8) / 0.2) * Math.PI) : 0), dy: 0, opacity: 1 };
    case "pan": return { deg: 14 * Math.sin(t * Math.PI * 3.2) * (1 - t), dy: 0, opacity: 1 };
    case "plant": return { deg: 5 * Math.sin(t * Math.PI * 4) * (1 - t), dy: 0, opacity: 1 };
    case "lantern": return { deg: 4 * Math.sin(t * Math.PI * 2.4) * (1 - t), dy: 0, opacity: 1 };
  }
}
/** The piece under a room point, if any. Pieces later in paint order win. */
export function pieceAt(room: RoomId, x: number, y: number, slop = 6): StagePiece | undefined {
  const pieces = stagePieces[room];
  for (let i = pieces.length - 1; i >= 0; i--) {
    const h = pieces[i].hit;
    if (x >= h.left - slop && x <= h.left + h.width + slop && y >= h.top - slop && y <= h.top + h.height + slop) return pieces[i];
  }
  return undefined;
}
export type Poke = { id: string; serial: number };
const MARGIN = 26;
const Piece = memo(function Piece({ piece, serial, reduced }: { piece: StagePiece; serial: number; reduced: boolean }) {
  const progress = useSharedValue(0);
  React.useEffect(() => {
    if (!serial) return;
    progress.set(0);
    // Always run: under Reduce Motion pieceMotion is a stationary dim (and the sink still runs).
    progress.set(withTiming(1, { duration: pieceLength[piece.kind], easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
  }, [serial, piece.kind, progress]);
  const kind = piece.kind;
  // The layer box covers the piece and its swing; a pan or lantern swings from its hook.
  const reach = kind === "lantern" || kind === "pan" ? 60 : MARGIN;
  const left = Math.min(piece.hit.left, piece.pivot.x) - reach, top = Math.min(piece.hit.top, piece.pivot.y) - MARGIN;
  const right = Math.max(piece.hit.left + piece.hit.width, piece.pivot.x) + reach, bottom = Math.max(piece.hit.top + piece.hit.height, piece.pivot.y) + MARGIN;
  const width = right - left, height = bottom - top;
  const style = useAnimatedStyle(() => {
    const m = pieceMotion(kind, progress.value, reduced);
    return { opacity: m.opacity, transform: [{ translateY: m.dy }, { rotate: `${m.deg}deg` }] };
  });
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left, top, width, height,
    transformOrigin: [piece.pivot.x - left, piece.pivot.y - top, 0] }, style]}>
    <Svg width={width} height={height} viewBox={`${left} ${top} ${width} ${height}`} accessible={false}>{piece.draw()}</Svg>
  </Animated.View>;
});
/** Drawn over the room art and under every thing in the room, in the same room units. */
export function SetPieces({ room, poke, reduced }: { room: RoomId; poke?: Poke; reduced: boolean }) {
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none"
    style={{ position: "absolute", left: 0, top: 0, width: 800, height: 560 }}>
    {stagePieces[room].map((piece) => <Piece key={piece.id} piece={piece} reduced={reduced} serial={poke?.id === piece.id ? poke.serial : 0} />)}
  </View>;
}
