import React from "react";
import { View } from "react-native";
import Svg, { Line, Polygon, Rect } from "react-native-svg";
import { Copy } from "../../../components/ui";
import type { Cell } from "./legacy";
import { atomKey, isTriAtom, normalizeAtoms, translateAtoms, type Atom, type Quarter, type TriCell } from "./solver";

const INK = "#365034";

function triPoints(x: number, y: number, q: Quarter, step: number): string {
  const x0 = x * step, y0 = y * step, x1 = (x + 1) * step, y1 = (y + 1) * step;
  const cx = (x + 0.5) * step, cy = (y + 0.5) * step;
  if (q === 0) return `${x0},${y0} ${x1},${y0} ${cx},${cy}`;
  if (q === 1) return `${x1},${y0} ${x1},${y1} ${cx},${cy}`;
  if (q === 2) return `${x1},${y1} ${x0},${y1} ${cx},${cy}`;
  return `${x0},${y1} ${x0},${y0} ${cx},${cy}`;
}

type EdgeSeg = [number, number, number, number];

/**
 * Compute ONLY the exterior boundary edges of a set of atoms (polyominoes OR Tangram quarter-triangles).
 * Internal shared edges cancel out, producing a razor-sharp clean outer outline!
 */
export function boundaryEdges(atoms: readonly Atom[]): EdgeSeg[] {
  const counts = new Map<string, { seg: EdgeSeg; n: number }>();
  const addEdge = (ax: number, ay: number, bx: number, by: number) => {
    const forward = ax < bx || (ax === bx && ay < by);
    const k = forward ? `${ax},${ay}-${bx},${by}` : `${bx},${by}-${ax},${ay}`;
    const prev = counts.get(k);
    if (prev) prev.n++;
    else counts.set(k, { seg: [ax, ay, bx, by], n: 1 });
  };

  if (atoms.length === 0) return [];
  if (isTriAtom(atoms[0])) {
    // Use doubled integer coords (2x) so centers (x+0.5) are exact integers!
    for (const [x, y, q] of atoms as readonly TriCell[]) {
      const x0 = x * 2, y0 = y * 2, x1 = x0 + 2, y1 = y0 + 2, cx = x0 + 1, cy = y0 + 1;
      if (q === 0) { addEdge(x0, y0, x1, y0); addEdge(x1, y0, cx, cy); addEdge(cx, cy, x0, y0); }
      else if (q === 1) { addEdge(x1, y0, x1, y1); addEdge(x1, y1, cx, cy); addEdge(cx, cy, x1, y0); }
      else if (q === 2) { addEdge(x1, y1, x0, y1); addEdge(x0, y1, cx, cy); addEdge(cx, cy, x1, y1); }
      else { addEdge(x0, y1, x0, y0); addEdge(x0, y0, cx, cy); addEdge(cx, cy, x0, y1); }
    }
    return [...counts.values()]
      .filter((e) => e.n === 1)
      .map(({ seg: [a, b, c, d] }): EdgeSeg => [a / 2, b / 2, c / 2, d / 2]);
  }

  for (const [x, y] of atoms as readonly Cell[]) {
    addEdge(x, y, x + 1, y);
    addEdge(x + 1, y, x + 1, y + 1);
    addEdge(x + 1, y + 1, x, y + 1);
    addEdge(x, y + 1, x, y);
  }
  return [...counts.values()].filter((e) => e.n === 1).map((e) => e.seg);
}

/** Crisp SVG preview of a single tray piece (polyomino or Tangram polygon). */
export function PiecePreview({ atoms, color, cellSize = 22 }: { atoms: readonly Atom[]; color: string; cellSize?: number }) {
  const norm = normalizeAtoms(atoms);
  if (norm.length === 0) return null;
  const maxX = Math.max(...norm.map((a) => a[0])) + 1;
  const maxY = Math.max(...norm.map((a) => a[1])) + 1;
  const pad = 3;
  const w = maxX * cellSize + pad * 2;
  const h = maxY * cellSize + pad * 2;
  const edges = boundaryEdges(norm);
  const tri = isTriAtom(norm[0]);

  return (
    <Svg width={w} height={h} viewBox={`-${pad} -${pad} ${w} ${h}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {tri
        ? (norm as TriCell[]).map(([x, y, q], i) => (
            <Polygon key={i} points={triPoints(x, y, q, cellSize)} fill={color} stroke={color} strokeWidth={0.5} />
          ))
        : (norm as Cell[]).map(([x, y], i) => (
            <Rect key={i} x={x * cellSize + 0.5} y={y * cellSize + 0.5} width={cellSize - 1} height={cellSize - 1} rx={3} fill={color} />
          ))}
      {edges.map(([x1, y1, x2, y2], i) => (
        <Line key={`e-${i}`} x1={x1 * cellSize} y1={y1 * cellSize} x2={x2 * cellSize} y2={y2 * cellSize} stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
      ))}
    </Svg>
  );
}

export type PlacedVisual = {
  pieceIndex: number;
  cells: Atom[];
  x: number;
  y: number;
  color: string;
};

/**
 * Unified Silhouette Board Canvas (handles both Polyomino and Tangram boards):
 * - Outline-only silhouettes (no internal grid seams when `outlineOnly` is true)
 * - Gold corner marker ONLY when `goldCorner` is provided (L1–L2 or Help)
 * - Live drag ghost at exact dropped grid cell `(ghost.x, ghost.y)`
 */
export function SilhouetteSvg({
  width,
  height,
  step,
  silhouette,
  placed,
  outlineOnly,
  goldCorner,
  ghost,
  reveal,
}: {
  width: number;
  height: number;
  step: number;
  silhouette: readonly Atom[];
  placed: readonly PlacedVisual[];
  outlineOnly: boolean;
  goldCorner?: { x: number; y: number } | null;
  ghost?: { cells: Atom[]; x: number; y: number; valid: boolean } | null;
  reveal?: boolean;
}) {
  const pad = 4;
  const pxW = width * step + pad * 2;
  const pxH = height * step + pad * 2;
  const tri = silhouette.length > 0 && isTriAtom(silhouette[0]);
  const silEdges = boundaryEdges(silhouette);

  return (
    <Svg
      width={pxW}
      height={pxH}
      viewBox={`-${pad} -${pad} ${pxW} ${pxH}`}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Subtle grid guide dots on empty background */}
      {Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => (
          <Rect
            key={`bg-${x}-${y}`}
            x={x * step + 1}
            y={y * step + 1}
            width={step - 2}
            height={step - 2}
            rx={tri ? 2 : 6}
            fill="#D8E5D3"
            opacity={0.45}
          />
        )),
      )}

      {/* Target silhouette fill */}
      {tri
        ? (silhouette as readonly TriCell[]).map(([x, y, q], i) => (
            <Polygon key={`s-${i}`} points={triPoints(x, y, q, step)} fill="#FFF9E9" stroke="#FFF9E9" strokeWidth={0.5} />
          ))
        : (silhouette as readonly Cell[]).map(([x, y], i) => (
            <Rect
              key={`s-${i}`}
              x={x * step + (outlineOnly ? 0 : 1)}
              y={y * step + (outlineOnly ? 0 : 1)}
              width={step - (outlineOnly ? 0 : 2)}
              height={step - (outlineOnly ? 0 : 2)}
              rx={outlineOnly ? 0 : 6}
              fill="#FFF9E9"
              stroke={outlineOnly ? "none" : "#B5C9A8"}
              strokeWidth={outlineOnly ? 0 : 1.5}
            />
          ))}

      {/* Optional gold corner guide (L1-L2 or explicit Help) */}
      {goldCorner && !reveal && (
        <Rect
          x={goldCorner.x * step + 2}
          y={goldCorner.y * step + 2}
          width={step - 4}
          height={step - 4}
          rx={6}
          fill="#FFEBB0"
          stroke="#D29E35"
          strokeWidth={3}
        />
      )}

      {/* Placed pieces with crisp clean polygons */}
      {placed.map((pl) => {
        const abs = translateAtoms(normalizeAtoms(pl.cells), pl.x, pl.y);
        const edges = boundaryEdges(abs);
        return (
          <React.Fragment key={`pl-${pl.pieceIndex}`}>
            {tri
              ? (abs as TriCell[]).map(([x, y, q], i) => (
                  <Polygon key={i} points={triPoints(x, y, q, step)} fill={pl.color} stroke={pl.color} strokeWidth={0.5} />
                ))
              : (abs as Cell[]).map(([x, y], i) => (
                  <Rect key={i} x={x * step + 0.5} y={y * step + 0.5} width={step - 1} height={step - 1} rx={3} fill={pl.color} />
                ))}
            {edges.map(([x1, y1, x2, y2], i) => (
              <Line key={`pe-${i}`} x1={x1 * step} y1={y1 * step} x2={x2 * step} y2={y2 * step} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
            ))}
          </React.Fragment>
        );
      })}

      {/* Live drag preview ghost at exact dropped cell */}
      {ghost && !reveal && (() => {
        const abs = translateAtoms(normalizeAtoms(ghost.cells), ghost.x, ghost.y);
        const fill = ghost.valid ? "#5E9B75" : "#D9755A";
        return abs.map((a, i) =>
          isTriAtom(a) ? (
            <Polygon key={`g-${i}`} points={triPoints(a[0], a[1], a[2], step)} fill={fill} opacity={0.45} />
          ) : (
            <Rect key={`g-${i}`} x={a[0] * step + 2} y={a[1] * step + 2} width={step - 4} height={step - 4} rx={5} fill={fill} opacity={0.45} />
          ),
        );
      })()}

      {/* Crisp outer silhouette boundary */}
      {silEdges.map(([x1, y1, x2, y2], i) => (
        <Line
          key={`se-${i}`}
          x1={x1 * step}
          y1={y1 * step}
          x2={x2 * step}
          y2={y2 * step}
          stroke={reveal ? "#D8A138" : INK}
          strokeWidth={reveal ? 3.5 : 3}
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}

/** Crisp varied cube-net renderer (supports ANY of the 11 valid nets + invalid fold-check nets). */
export function CubeNetView({
  cells,
  faces,
  highlightIndex,
  cellSize = 52,
}: {
  cells: readonly Cell[];
  faces?: readonly string[];
  highlightIndex?: number;
  cellSize?: number;
}) {
  const maxX = Math.max(...cells.map((c) => c[0])) + 1;
  const maxY = Math.max(...cells.map((c) => c[1])) + 1;
  const idxMap = new Map<string, number>();
  cells.forEach(([x, y], i) => idxMap.set(`${x},${y}`, i));

  return (
    <View style={{ alignSelf: "center", padding: 8, backgroundColor: "#E6EBD7", borderRadius: 16 }}>
      {Array.from({ length: maxY }, (_, y) => (
        <View key={y} style={{ flexDirection: "row" }}>
          {Array.from({ length: maxX }, (_, x) => {
            const idx = idxMap.get(`${x},${y}`);
            const isHighlighted = idx !== undefined && idx === highlightIndex;
            return (
              <View
                key={x}
                style={{
                  width: cellSize,
                  height: cellSize,
                  margin: 1.5,
                  borderRadius: 7,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: idx === undefined ? "transparent" : isHighlighted ? "#E9BF5C" : "#B889B9",
                  borderWidth: idx === undefined ? 0 : isHighlighted ? 3 : 2,
                  borderColor: isHighlighted ? "#8E5E12" : INK,
                }}
              >
                {idx !== undefined && faces && (
                  <Copy maxFontSizeMultiplier={1.3} style={{ fontSize: Math.round(cellSize * 0.44), fontWeight: "900", color: INK }}>
                    {faces[idx]}
                  </Copy>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Helper to check which placed piece owns a tapped grid cell `(x, y)`. */
export function placedPieceAtCell(placed: readonly PlacedVisual[], x: number, y: number): number | null {
  for (let i = placed.length - 1; i >= 0; i--) {
    const abs = translateAtoms(normalizeAtoms(placed[i].cells), placed[i].x, placed[i].y);
    if (abs.some((a) => a[0] === x && a[1] === y)) return placed[i].pieceIndex;
  }
  return null;
}

/** Helper to compute the exact dropped grid coordinate `(dropX, dropY)` from pointer coordinates. */
export function dropGridCoord(
  pageX: number,
  pageY: number,
  boardLeft: number,
  boardTop: number,
  step: number,
  pieceCells: readonly Atom[],
): { x: number; y: number } {
  const norm = normalizeAtoms(pieceCells);
  const wCells = norm.length ? Math.max(...norm.map((a) => a[0])) + 1 : 1;
  const hCells = norm.length ? Math.max(...norm.map((a) => a[1])) + 1 : 1;
  // Center the piece around the finger drop point, then map its top-left cell to exact integer grid coordinates!
  const relX = pageX - boardLeft - 4 - (wCells * step) / 2;
  const relY = pageY - boardTop - 4 - (hCells * step) / 2;
  return { x: Math.round(relX / step), y: Math.round(relY / step) };
}

export { atomKey };
