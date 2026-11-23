import { sha256Hex } from "../../../puzzles/sha256";
import type { Cell } from "./legacy";
import { flip as flipCell, normalize as normCell, rotate as rotCell } from "./legacy";

/**
 * Unified exact-cover solver for BOTH:
 * - Polyominoes: atoms are grid squares `[x, y]`
 * - Tangrams: atoms are quarter-triangles `[x, y, q]` where `q ∈ {0: N, 1: E, 2: S, 3: W}`
 *
 * Every orientation (90° rotations + optional horizontal mirror) is exact discrete arithmetic,
 * with zero floating-point tolerance bugs!
 */
export type Quarter = 0 | 1 | 2 | 3; // 0 = N, 1 = E, 2 = S, 3 = W
export type TriCell = [number, number, Quarter];
export type Atom = Cell | TriCell;

export const isTriAtom = (a: Atom): a is TriCell => a.length === 3;
export const atomKey = (a: Atom): string => (a.length === 3 ? `${a[0]},${a[1]},${a[2]}` : `${a[0]},${a[1]}`);

export function rotateAtoms(atoms: readonly Atom[]): Atom[] {
  if (atoms.length === 0) return [];
  if (isTriAtom(atoms[0])) {
    return (atoms as readonly TriCell[]).map(([x, y, q]): TriCell => [-y, x, ((q + 1) & 3) as Quarter]);
  }
  return rotCell(atoms as Cell[]);
}

export function flipAtoms(atoms: readonly Atom[]): Atom[] {
  if (atoms.length === 0) return [];
  if (isTriAtom(atoms[0])) {
    return (atoms as readonly TriCell[]).map(([x, y, q]): TriCell => [
      -x,
      y,
      (q === 1 ? 3 : q === 3 ? 1 : q) as Quarter,
    ]);
  }
  return flipCell(atoms as Cell[]);
}

export function normalizeAtoms(atoms: readonly Atom[]): Atom[] {
  if (atoms.length === 0) return [];
  if (isTriAtom(atoms[0])) {
    const tris = atoms as readonly TriCell[];
    const minX = Math.min(...tris.map((t) => t[0]));
    const minY = Math.min(...tris.map((t) => t[1]));
    return tris
      .map(([x, y, q]): TriCell => [x - minX, y - minY, q])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  }
  return normCell(atoms as Cell[]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

export function translateAtoms(atoms: readonly Atom[], dx: number, dy: number): Atom[] {
  if (atoms.length === 0) return [];
  if (isTriAtom(atoms[0])) {
    return (atoms as readonly TriCell[]).map(([x, y, q]): TriCell => [x + dx, y + dy, q]);
  }
  return (atoms as readonly Cell[]).map(([x, y]): Cell => [x + dx, y + dy]);
}

export function atomsSignature(atoms: readonly Atom[]): string {
  return normalizeAtoms(atoms).map(atomKey).join(";");
}

export function sameAtoms(a: readonly Atom[], b: readonly Atom[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a.map(atomKey));
  return setA.size === b.length && b.every((x) => setA.has(atomKey(x)));
}

/** Distinct orientations of a piece (up to 4 rotations × 2 flips = 8, deduplicated by exact shape). */
export function uniqueOrientations(
  atoms: readonly Atom[],
  allowRotate = true,
  allowFlip = true,
): Atom[][] {
  const seen = new Set<string>();
  const out: Atom[][] = [];
  const flips = allowFlip ? [false, true] : [false];
  const turns = allowRotate ? [0, 1, 2, 3] : [0];
  for (const fl of flips) {
    let cur = fl ? flipAtoms(atoms) : [...atoms];
    for (const t of turns) {
      if (t > 0) cur = rotateAtoms(cur);
      const norm = normalizeAtoms(cur);
      const sig = norm.map(atomKey).join(";");
      if (!seen.has(sig)) {
        seen.add(sig);
        out.push(norm);
      }
    }
  }
  return out;
}

export type PlacedPiece = {
  pieceIndex: number;
  /** Normalized orientation atoms (relative to `[x, y]`). */
  cells: Atom[];
  x: number;
  y: number;
};

export type ExactCoverResult = {
  /** Number of distinct canonical tilings found (capped at `maxSolutions`). */
  count: number;
  /** Up to `maxSolutions` distinct exact-cover solutions. */
  solutions: PlacedPiece[][];
  /** True if search hit `nodeBudget` before exhausting all branches. */
  exhausted: boolean;
};

/**
 * Canonical partition hash of a complete tiling.
 * Two tilings produce the SAME hash iff they partition the silhouette into the exact same subsets
 * (so swapping two identical Tangram triangles produces the same hash, while genuinely different
 * dissections produce different hashes!).
 */
export function canonicalTilingHash(placed: readonly PlacedPiece[]): string {
  const regions = placed
    .map((pl) =>
      translateAtoms(pl.cells, pl.x, pl.y)
        .map(atomKey)
        .sort()
        .join("|"),
    )
    .sort()
    .join("//");
  return sha256Hex(`tiling|${regions}`);
}

/** Check if a single piece placement lands strictly inside the silhouette without overlapping `occupied`. */
export function canPlaceAtoms(
  silhouetteSet: ReadonlySet<string>,
  occupied: ReadonlySet<string>,
  cells: readonly Atom[],
  x: number,
  y: number,
): boolean {
  const norm = normalizeAtoms(cells);
  for (const a of translateAtoms(norm, x, y)) {
    const k = atomKey(a);
    if (!silhouetteSet.has(k) || occupied.has(k)) return false;
  }
  return true;
}

/** Verify whether `placed` is a valid (partial or complete) placement of `tray` pieces inside `silhouette`. */
export function validatePlacement(
  silhouette: readonly Atom[],
  tray: readonly (readonly Atom[])[],
  placed: readonly PlacedPiece[],
  allowRotate = true,
  allowFlip = true,
): { valid: boolean; complete: boolean; occupied: Set<string> } {
  const silSet = new Set(silhouette.map(atomKey));
  const occupied = new Set<string>();
  const usedPieces = new Set<number>();

  for (const pl of placed) {
    if (!Number.isInteger(pl.pieceIndex) || pl.pieceIndex < 0 || pl.pieceIndex >= tray.length) {
      return { valid: false, complete: false, occupied };
    }
    if (usedPieces.has(pl.pieceIndex)) return { valid: false, complete: false, occupied };
    usedPieces.add(pl.pieceIndex);

    const allowedSigs = new Set(
      uniqueOrientations(tray[pl.pieceIndex], allowRotate, allowFlip).map((o) => o.map(atomKey).join(";")),
    );
    const placedSig = atomsSignature(pl.cells);
    if (!allowedSigs.has(placedSig)) return { valid: false, complete: false, occupied };

    const norm = normalizeAtoms(pl.cells);
    for (const a of translateAtoms(norm, pl.x, pl.y)) {
      const k = atomKey(a);
      if (!silSet.has(k) || occupied.has(k)) return { valid: false, complete: false, occupied };
      occupied.add(k);
    }
  }

  return { valid: true, complete: occupied.size === silSet.size, occupied };
}

type PlacementOption = {
  pieceIndex: number;
  cells: Atom[];
  x: number;
  y: number;
  cellIndices: number[];
  /** Bitmask or array of covered silhouette indices */
  regionKey: string;
};

function buildOptions(
  silhouette: readonly Atom[],
  tray: readonly (readonly Atom[])[],
  allowRotate: boolean,
  allowFlip: boolean,
  skipPieces: ReadonlySet<number>,
  occupiedMask: readonly boolean[],
): { cellToOpts: PlacementOption[][]; pieceOpts: PlacementOption[][] } {
  const indexByKey = new Map<string, number>();
  silhouette.forEach((a, i) => indexByKey.set(atomKey(a), i));

  const minX = Math.min(...silhouette.map((a) => a[0]));
  const maxX = Math.max(...silhouette.map((a) => a[0]));
  const minY = Math.min(...silhouette.map((a) => a[1]));
  const maxY = Math.max(...silhouette.map((a) => a[1]));

  const cellToOpts: PlacementOption[][] = Array.from({ length: silhouette.length }, () => []);
  const pieceOpts: PlacementOption[][] = Array.from({ length: tray.length }, () => []);

  for (let pIdx = 0; pIdx < tray.length; pIdx++) {
    if (skipPieces.has(pIdx)) continue;
    const orients = uniqueOrientations(tray[pIdx], allowRotate, allowFlip);
    for (const orient of orients) {
      const pMaxX = Math.max(...orient.map((a) => a[0]));
      const pMaxY = Math.max(...orient.map((a) => a[1]));
      for (let x = minX; x <= maxX - pMaxX; x++) {
        for (let y = minY; y <= maxY - pMaxY; y++) {
          const translated = translateAtoms(orient, x, y);
          const cellIndices: number[] = [];
          let ok = true;
          for (const a of translated) {
            const ci = indexByKey.get(atomKey(a));
            if (ci === undefined || occupiedMask[ci]) { ok = false; break; }
            cellIndices.push(ci);
          }
          if (!ok) continue;
          cellIndices.sort((a, b) => a - b);
          const regionKey = translated.map(atomKey).sort().join("|");
          const opt: PlacementOption = { pieceIndex: pIdx, cells: orient, x, y, cellIndices, regionKey };
          pieceOpts[pIdx].push(opt);
          for (const ci of cellIndices) cellToOpts[ci].push(opt);
        }
      }
    }
  }
  return { cellToOpts, pieceOpts };
}

/**
 * Primary exact-cover solver (Algorithm X / MRV cell-first backtracking).
 * Works for both exact piece sets AND spare-piece trays (where tray area >= silhouette area),
 * as well as partial drafts (pass `alreadyPlaced` to check completability / compute live hints!).
 */
export function solveExactCover(
  silhouette: readonly Atom[],
  tray: readonly (readonly Atom[])[],
  options?: {
    allowRotate?: boolean;
    allowFlip?: boolean;
    maxSolutions?: number;
    nodeBudget?: number;
    alreadyPlaced?: readonly PlacedPiece[];
  },
): ExactCoverResult {
  const allowRotate = options?.allowRotate ?? true;
  const allowFlip = options?.allowFlip ?? true;
  const maxSolutions = options?.maxSolutions ?? 2;
  const nodeBudget = options?.nodeBudget ?? 200_000;
  const alreadyPlaced = options?.alreadyPlaced ?? [];

  const indexByKey = new Map<string, number>();
  silhouette.forEach((a, i) => indexByKey.set(atomKey(a), i));

  const covered = Array<boolean>(silhouette.length).fill(false);
  const usedPieces = new Set<number>();
  for (const pl of alreadyPlaced) {
    if (usedPieces.has(pl.pieceIndex)) return { count: 0, solutions: [], exhausted: false };
    usedPieces.add(pl.pieceIndex);
    for (const a of translateAtoms(normalizeAtoms(pl.cells), pl.x, pl.y)) {
      const ci = indexByKey.get(atomKey(a));
      if (ci === undefined || covered[ci]) return { count: 0, solutions: [], exhausted: false };
      covered[ci] = true;
    }
  }

  const remainingCells = covered.filter((c) => !c).length;
  if (remainingCells === 0) {
    return { count: 1, solutions: [[...alreadyPlaced]], exhausted: false };
  }
  const availableArea = tray.reduce((sum, p, i) => (usedPieces.has(i) ? sum : sum + p.length), 0);
  if (availableArea < remainingCells) return { count: 0, solutions: [], exhausted: false };

  // Canonical shape signature per tray piece, to avoid symmetric permutation blowup on identical pieces (e.g. 2 Tangram large tris)
  const pieceClass = tray.map((p) => {
    const orients = uniqueOrientations(p, allowRotate, allowFlip).map((o) => o.map(atomKey).join(";")).sort();
    return orients[0] ?? "";
  });

  const { cellToOpts } = buildOptions(silhouette, tray, allowRotate, allowFlip, usedPieces, covered);
  const used = Array<boolean>(tray.length).fill(false);
  for (const idx of usedPieces) used[idx] = true;

  const solutions: PlacedPiece[][] = [];
  const seenHashes = new Set<string>();
  const current: PlacedPiece[] = [...alreadyPlaced];
  let nodes = 0;
  let exhausted = false;

  function dfs(uncoveredCount: number, remArea: number): void {
    if (solutions.length >= maxSolutions || exhausted) return;
    if (++nodes > nodeBudget) { exhausted = true; return; }
    if (uncoveredCount === 0) {
      const hash = canonicalTilingHash(current);
      if (!seenHashes.has(hash)) {
        seenHashes.add(hash);
        solutions.push([...current]);
      }
      return;
    }
    if (remArea < uncoveredCount) return;

    // Pick uncovered cell with Minimum Remaining Values (fewest valid placements).
    let bestCell = -1;
    let bestCount = Infinity;
    for (let c = 0; c < silhouette.length; c++) {
      if (covered[c]) continue;
      let count = 0;
      const seenClassThisCell = new Set<string>();
      for (const opt of cellToOpts[c]) {
        if (used[opt.pieceIndex]) continue;
        // Skip duplicate identical pieces on the same region
        const clsKey = `${pieceClass[opt.pieceIndex]}@${opt.regionKey}`;
        if (seenClassThisCell.has(clsKey)) continue;
        let clash = false;
        for (const ci of opt.cellIndices) if (covered[ci]) { clash = true; break; }
        if (!clash) {
          seenClassThisCell.add(clsKey);
          count++;
        }
      }
      if (count === 0) return;
      if (count < bestCount) {
        bestCount = count;
        bestCell = c;
        if (count === 1) break;
      }
    }

    const tried = new Set<string>();
    for (const opt of cellToOpts[bestCell]) {
      if (solutions.length >= maxSolutions || exhausted) return;
      if (used[opt.pieceIndex]) continue;
      const clsKey = `${pieceClass[opt.pieceIndex]}@${opt.regionKey}`;
      if (tried.has(clsKey)) continue;
      let clash = false;
      for (const ci of opt.cellIndices) if (covered[ci]) { clash = true; break; }
      if (clash) continue;
      tried.add(clsKey);

      used[opt.pieceIndex] = true;
      for (const ci of opt.cellIndices) covered[ci] = true;
      current.push({ pieceIndex: opt.pieceIndex, cells: opt.cells, x: opt.x, y: opt.y });

      dfs(uncoveredCount - opt.cellIndices.length, remArea - opt.cellIndices.length);

      current.pop();
      for (const ci of opt.cellIndices) covered[ci] = false;
      used[opt.pieceIndex] = false;
    }
  }

  dfs(remainingCells, availableArea);
  return { count: solutions.length, solutions, exhausted };
}

/**
 * Independent second exact-cover counter (piece-order DFS, no MRV heuristic)
 * for Gate 2 `independentCount` cross-verification!
 */
export function countExactCoverIndependent(
  silhouette: readonly Atom[],
  tray: readonly (readonly Atom[])[],
  options?: { allowRotate?: boolean; allowFlip?: boolean; maxSolutions?: number; nodeBudget?: number },
): { status: "counted"; count: number } | { status: "budget-exhausted" } {
  const allowRotate = options?.allowRotate ?? true;
  const allowFlip = options?.allowFlip ?? true;
  const maxSolutions = options?.maxSolutions ?? 2;
  const nodeBudget = options?.nodeBudget ?? 200_000;

  const covered = Array<boolean>(silhouette.length).fill(false);
  const { pieceOpts } = buildOptions(silhouette, tray, allowRotate, allowFlip, new Set(), covered);
  const totalArea = tray.reduce((s, p) => s + p.length, 0);
  const allowSkip = totalArea > silhouette.length;
  // Sort pieces largest-first (different order from MRV cell-first!)
  const order = tray.map((_, i) => i).sort((a, b) => tray[b].length - tray[a].length || a - b);
  const suffixArea = Array<number>(order.length + 1).fill(0);
  for (let i = order.length - 1; i >= 0; i--) suffixArea[i] = suffixArea[i + 1] + tray[order[i]].length;

  const seenHashes = new Set<string>();
  const current: PlacedPiece[] = [];
  let nodes = 0;
  let exhausted = false;

  function dfs(pos: number, uncoveredCount: number): void {
    if (seenHashes.size >= maxSolutions || exhausted) return;
    if (++nodes > nodeBudget) { exhausted = true; return; }
    if (uncoveredCount === 0) {
      seenHashes.add(canonicalTilingHash(current));
      return;
    }
    if (pos >= order.length || suffixArea[pos] < uncoveredCount) return;

    const pIdx = order[pos];
    for (const opt of pieceOpts[pIdx]) {
      if (seenHashes.size >= maxSolutions || exhausted) return;
      let clash = false;
      for (const ci of opt.cellIndices) if (covered[ci]) { clash = true; break; }
      if (clash) continue;
      for (const ci of opt.cellIndices) covered[ci] = true;
      current.push({ pieceIndex: pIdx, cells: opt.cells, x: opt.x, y: opt.y });
      dfs(pos + 1, uncoveredCount - opt.cellIndices.length);
      current.pop();
      for (const ci of opt.cellIndices) covered[ci] = false;
    }

    // Only allow skipping a piece when tray has spare area
    if (allowSkip && suffixArea[pos + 1] >= uncoveredCount) {
      dfs(pos + 1, uncoveredCount);
    }
  }

  dfs(0, silhouette.length);
  return exhausted ? { status: "budget-exhausted" } : { status: "counted", count: seenHashes.size };
}

/** True when a non-empty list of square cells forms a single 4-connected (edge-adjacent) component. */
export function is4Connected(cells: readonly Cell[]): boolean {
  if (cells.length === 0) return false;
  const set = new Set(cells.map(([x, y]) => `${x},${y}`));
  const seen = new Set<string>();
  const q: Cell[] = [cells[0]];
  seen.add(`${cells[0][0]},${cells[0][1]}`);
  while (q.length > 0) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const k = `${x + dx},${y + dy}`;
      if (set.has(k) && !seen.has(k)) {
        seen.add(k);
        q.push([x + dx, y + dy]);
      }
    }
  }
  return seen.size === set.size;
}

function groupsTouch4(a: readonly Cell[], b: readonly Cell[]): boolean {
  const bSet = new Set(b.map(([x, y]) => `${x},${y}`));
  for (const [x, y] of a) {
    if (bSet.has(`${x + 1},${y}`) || bSet.has(`${x - 1},${y}`) || bSet.has(`${x},${y + 1}`) || bSet.has(`${x},${y - 1}`)) {
      return true;
    }
  }
  return false;
}

/** Merge 4-connected blueprint parts down to `targetCount` groups so every merged piece stays strictly 4-connected. */
export function connectedGroups(parts: readonly { cells: Cell[] }[], targetCount: number): number[][] {
  const groups = parts.map((_, i) => [i]);
  while (groups.length > targetCount) {
    let best: [number, number] | null = null;
    let bestSize = Infinity;
    for (let i = 0; i < groups.length; i++) {
      const cellsI = groups[i].flatMap((idx) => parts[idx].cells);
      for (let j = i + 1; j < groups.length; j++) {
        const cellsJ = groups[j].flatMap((idx) => parts[idx].cells);
        if (!groupsTouch4(cellsI, cellsJ)) continue;
        const sz = cellsI.length + cellsJ.length;
        if (sz < bestSize) {
          bestSize = sz;
          best = [i, j];
        }
      }
    }
    if (!best) break;
    const [i, j] = best;
    groups[i] = [...groups[i], ...groups[j]];
    groups.splice(j, 1);
  }
  return groups;
}
