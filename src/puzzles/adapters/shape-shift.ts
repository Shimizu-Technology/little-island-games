import { exactKeys, plain, uint } from "../../state/saveBits";
import {
  INVALID_CUBE_NETS,
  VALID_CUBE_NETS,
  foldCubeNet,
  orientNet,
} from "../../learn/games/shape-shift/cubeNet";
import type { Cell } from "../../learn/games/shape-shift/legacy";
import {
  atomKey,
  canPlaceAtoms,
  canonicalTilingHash,
  countExactCoverIndependent,
  isTriAtom,
  normalizeAtoms,
  solveExactCover,
  translateAtoms,
  uniqueOrientations,
  type Atom,
  type PlacedPiece,
  type Quarter,
  type TriCell,
} from "../../learn/games/shape-shift/solver";
import type { Claim, DescriptorCore, PuzzleAdapter } from "../types";

export type ShapePackPayload =
  | {
      kind: "poly" | "tangram";
      name: string;
      width: number;
      height: number;
      silhouette: Atom[];
      pieces: Atom[][];
      allowRotate: boolean;
      allowFlip: boolean;
      /** True when puzzle guarantees a single unique exact cover; false when any exact fill wins (multi-way / spare). */
      uniqueRequired?: boolean;
    }
  | {
      kind: "cube-opp";
      netName: string;
      cells: Cell[];
      faces: string[];
      askIndex: number;
      answer: string;
    }
  | {
      kind: "cube-fold";
      options: Cell[][];
      answerIndex: number;
    };

export type ShapePackState =
  | { kind: "fit"; placed: PlacedPiece[] }
  | { kind: "cube"; pick: number | null };

/**
 * Compact action for Shape Shift puzzle adapter:
 * - For fit puzzles: `[pieceIndex, orientIndex, x, y]` (places piece) or `[-1, pieceIndex]` (lifts piece)
 * - For cube puzzles: integer answer index (`0..5` for face index, `0..2` for net option index)
 */
export type ShapePackAction = readonly [number, number, number, number] | readonly [-1, number] | number;

type D = DescriptorCore<ShapePackPayload>;

const isCell = (v: unknown): v is Cell => Array.isArray(v) && v.length === 2 && uint(v[0], 12) && uint(v[1], 12);
const isTriCell = (v: unknown): v is TriCell => Array.isArray(v) && v.length === 3 && uint(v[0], 12) && uint(v[1], 12) && uint(v[2], 3);
const isAtomList = (v: unknown, tri: boolean): v is Atom[] =>
  Array.isArray(v) && v.length > 0 && v.length <= 96 && v.every(tri ? isTriCell : isCell);

export function validShapePayload(x: unknown): x is ShapePackPayload {
  if (!plain(x) || typeof x.kind !== "string") return false;
  if (x.kind === "poly" || x.kind === "tangram") {
    const keys = "uniqueRequired" in x
      ? ["allowFlip", "allowRotate", "height", "kind", "name", "pieces", "silhouette", "uniqueRequired", "width"]
      : ["allowFlip", "allowRotate", "height", "kind", "name", "pieces", "silhouette", "width"];
    if (!exactKeys(x, keys)) return false;
    const tri = x.kind === "tangram";
    return (
      typeof x.name === "string" && x.name.length > 0 && x.name.length <= 40 &&
      uint(x.width, 12) && x.width > 0 && uint(x.height, 12) && x.height > 0 &&
      typeof x.allowRotate === "boolean" && typeof x.allowFlip === "boolean" &&
      (x.uniqueRequired === undefined || typeof x.uniqueRequired === "boolean") &&
      isAtomList(x.silhouette, tri) &&
      Array.isArray(x.pieces) && x.pieces.length >= 2 && x.pieces.length <= 8 &&
      x.pieces.every((p) => isAtomList(p, tri))
    );
  }
  if (x.kind === "cube-opp") {
    if (!exactKeys(x, ["answer", "askIndex", "cells", "faces", "kind", "netName"])) return false;
    return (
      typeof x.netName === "string" && x.netName.length > 0 && x.netName.length <= 30 &&
      Array.isArray(x.cells) && x.cells.length === 6 && x.cells.every(isCell) &&
      Array.isArray(x.faces) && x.faces.length === 6 && x.faces.every((f) => typeof f === "string" && f.length === 1) &&
      uint(x.askIndex, 5) && typeof x.answer === "string" && (x.faces as string[]).includes(x.answer) &&
      foldCubeNet(x.cells as Cell[]).valid
    );
  }
  if (x.kind === "cube-fold") {
    if (!exactKeys(x, ["answerIndex", "kind", "options"])) return false;
    return (
      Array.isArray(x.options) && x.options.length === 3 &&
      x.options.every((opt) => Array.isArray(opt) && opt.length === 6 && opt.every(isCell)) &&
      uint(x.answerIndex, 2)
    );
  }
  return false;
}

// Compact bit-packed encoding for polyominoes (`x*16+y`) and Tangrams (`(x*16+y)*4+q`) so every row stays well under 384 bytes!
const packAtoms = (atoms: readonly Atom[]): number[] =>
  atoms.map((a) => (isTriAtom(a) ? (a[0] * 16 + a[1]) * 4 + a[2] : a[0] * 16 + a[1]));

const unpackAtoms = (nums: readonly number[], tri: boolean): Atom[] =>
  nums.map((n): Atom => {
    if (tri) {
      const q = (n & 3) as Quarter;
      const xy = n >> 2;
      return [xy >> 4, xy & 15, q];
    }
    return [n >> 4, n & 15];
  });

export function encodeShapeTuple(p: ShapePackPayload): unknown {
  if (p.kind === "poly" || p.kind === "tangram") {
    const flags = (p.allowRotate ? 1 : 0) | (p.allowFlip ? 2 : 0) | (p.uniqueRequired ? 4 : 0);
    return [
      p.kind === "tangram" ? 1 : 0,
      p.name,
      p.width,
      p.height,
      flags,
      packAtoms(p.silhouette),
      p.pieces.map(packAtoms),
    ];
  }
  if (p.kind === "cube-opp") {
    return [2, p.netName, packAtoms(p.cells), p.faces.join(""), p.askIndex, p.answer];
  }
  if (p.kind === "cube-fold") {
    return [3, p.options.map(packAtoms), p.answerIndex];
  }
  return [];
}

export function decodeShapeTuple(x: unknown): ShapePackPayload | null {
  if (!Array.isArray(x) || x.length < 3) return null;
  const tag = x[0];
  if (tag === 0 || tag === 1) {
    if (x.length !== 7) return null;
    const [, name, width, height, flags, silRaw, piecesRaw] = x;
    if (typeof name !== "string" || !uint(width, 12) || !uint(height, 12) || !uint(flags, 7) || !Array.isArray(silRaw) || !Array.isArray(piecesRaw)) return null;
    const tri = tag === 1;
    const payload: ShapePackPayload = {
      kind: tri ? "tangram" : "poly",
      name,
      width,
      height,
      allowRotate: (flags & 1) !== 0,
      allowFlip: (flags & 2) !== 0,
      ...(flags & 4 ? { uniqueRequired: true } : {}),
      silhouette: unpackAtoms(silRaw as number[], tri),
      pieces: (piecesRaw as number[][]).map((arr) => unpackAtoms(arr, tri)),
    };
    return validShapePayload(payload) ? payload : null;
  }
  if (tag === 2 && x.length === 6) {
    const [, netName, cellsRaw, facesStr, askIndex, answer] = x;
    if (typeof netName !== "string" || !Array.isArray(cellsRaw) || typeof facesStr !== "string" || !uint(askIndex, 5) || typeof answer !== "string") return null;
    const payload: ShapePackPayload = {
      kind: "cube-opp",
      netName,
      cells: unpackAtoms(cellsRaw as number[], false) as Cell[],
      faces: [...facesStr],
      askIndex,
      answer,
    };
    return validShapePayload(payload) ? payload : null;
  }
  if (tag === 3 && x.length === 3) {
    const [, optsRaw, answerIndex] = x;
    if (!Array.isArray(optsRaw) || !uint(answerIndex, 2)) return null;
    const payload: ShapePackPayload = {
      kind: "cube-fold",
      options: (optsRaw as number[][]).map((arr) => unpackAtoms(arr, false) as Cell[]),
      answerIndex,
    };
    return validShapePayload(payload) ? payload : null;
  }
  return null;
}

export function isShapeSolved(s: ShapePackState, p: ShapePackPayload): boolean {
  if (p.kind === "cube-opp") return s.kind === "cube" && s.pick !== null && p.faces[s.pick] === p.answer;
  if (p.kind === "cube-fold") return s.kind === "cube" && s.pick === p.answerIndex;
  if (s.kind !== "fit") return false;
  const silSet = new Set(p.silhouette.map(atomKey));
  const occ = new Set<string>();
  for (const pl of s.placed) {
    for (const a of translateAtoms(normalizeAtoms(pl.cells), pl.x, pl.y)) {
      const k = atomKey(a);
      if (!silSet.has(k) || occ.has(k)) return false;
      occ.add(k);
    }
  }
  return occ.size === silSet.size;
}

function fitActions(s: Extract<ShapePackState, { kind: "fit" }>, p: Extract<ShapePackPayload, { kind: "poly" | "tangram" }>): ShapePackAction[] {
  const used = new Set(s.placed.map((pl) => pl.pieceIndex));
  const silSet = new Set(p.silhouette.map(atomKey));
  const occ = new Set<string>();
  for (const pl of s.placed) {
    for (const a of translateAtoms(normalizeAtoms(pl.cells), pl.x, pl.y)) occ.add(atomKey(a));
  }
  const out: ShapePackAction[] = [];
  for (let pIdx = 0; pIdx < p.pieces.length; pIdx++) {
    if (used.has(pIdx)) continue;
    const orients = uniqueOrientations(p.pieces[pIdx], p.allowRotate, p.allowFlip);
    for (let oIdx = 0; oIdx < orients.length; oIdx++) {
      const o = orients[oIdx];
      const maxX = Math.max(...o.map((a) => a[0]));
      const maxY = Math.max(...o.map((a) => a[1]));
      for (let x = 0; x <= p.width - 1 - maxX; x++) {
        for (let y = 0; y <= p.height - 1 - maxY; y++) {
          if (canPlaceAtoms(silSet, occ, o, x, y)) out.push([pIdx, oIdx, x, y]);
        }
      }
    }
  }
  return out;
}

function claims(d: D, budget: number): Claim[] {
  const p = d.payload;
  if (p.kind === "cube-opp") {
    const f = foldCubeNet(p.cells);
    return [
      { id: "cube-net-valid", proven: f.valid && p.faces[f.opposites[p.askIndex]] === p.answer, evidence: `net:${p.netName}` },
    ];
  }
  if (p.kind === "cube-fold") {
    const valids = p.options.map((o) => foldCubeNet(o).valid);
    return [
      { id: "cube-fold-unique", proven: valids.filter(Boolean).length === 1 && valids[p.answerIndex], evidence: `valid:${valids.join(",")}` },
    ];
  }
  const res = solveExactCover(p.silhouette, p.pieces, {
    allowRotate: p.allowRotate,
    allowFlip: p.allowFlip,
    maxSolutions: 2,
    nodeBudget: budget,
  });
  const ind = countExactCoverIndependent(p.silhouette, p.pieces, {
    allowRotate: p.allowRotate,
    allowFlip: p.allowFlip,
    maxSolutions: 2,
    nodeBudget: budget,
  });
  return [
    {
      id: "exact-cover",
      proven: res.count >= 1 && ind.status === "counted" && ind.count === res.count && (!p.uniqueRequired || res.count === 1),
      evidence: `sols:${res.count},ind:${ind.status === "counted" ? ind.count : "budget"}`,
    },
  ];
}

export const shapeShiftAdapter: PuzzleAdapter<ShapePackPayload, ShapePackState, ShapePackAction> = {
  engine: "shape-shift",
  rules: 1,
  needsCheck: true,
  isPayload: validShapePayload,
  isAction: (x): x is ShapePackAction =>
    uint(x, 5) ||
    (Array.isArray(x) && x.length === 2 && x[0] === -1 && uint(x[1], 7)) ||
    (Array.isArray(x) && x.length === 4 && uint(x[0], 7) && uint(x[1], 7) && uint(x[2], 12) && uint(x[3], 12)),
  encodePayload: encodeShapeTuple,
  decodePayload: decodeShapeTuple,
  create: (d) => (d.payload.kind === "poly" || d.payload.kind === "tangram" ? { kind: "fit", placed: [] } : { kind: "cube", pick: null }),
  validState: (x, d): x is ShapePackState => {
    if (!plain(x)) return false;
    const p = d.payload;
    if (p.kind === "poly" || p.kind === "tangram") {
      if (!exactKeys(x, ["kind", "placed"]) || x.kind !== "fit" || !Array.isArray(x.placed)) return false;
      const silSet = new Set(p.silhouette.map(atomKey));
      const occ = new Set<string>();
      const used = new Set<number>();
      for (const pl of x.placed as PlacedPiece[]) {
        if (!plain(pl) || !exactKeys(pl, ["cells", "pieceIndex", "x", "y"]) || !uint(pl.pieceIndex, p.pieces.length - 1) || used.has(pl.pieceIndex)) return false;
        used.add(pl.pieceIndex);
        if (!uint(pl.x, p.width) || !uint(pl.y, p.height) || !isAtomList(pl.cells, p.kind === "tangram")) return false;
        if (!canPlaceAtoms(silSet, occ, pl.cells, pl.x, pl.y)) return false;
        for (const a of translateAtoms(normalizeAtoms(pl.cells), pl.x, pl.y)) occ.add(atomKey(a));
      }
      return true;
    }
    return exactKeys(x, ["kind", "pick"]) && x.kind === "cube" && (x.pick === null || uint(x.pick, p.kind === "cube-opp" ? 5 : 2));
  },
  reduce: (s, a, d) => {
    const p = d.payload;
    if (p.kind === "cube-opp" || p.kind === "cube-fold") {
      if (s.kind !== "cube" || typeof a !== "number") return s;
      const max = p.kind === "cube-opp" ? 5 : 2;
      if (!uint(a, max) || s.pick === a) return s;
      if (p.kind === "cube-opp" && a === p.askIndex) return s;
      return { kind: "cube", pick: a };
    }
    if (s.kind !== "fit" || !Array.isArray(a)) return s;
    if (a.length === 2 && a[0] === -1) {
      const idx = a[1];
      if (!s.placed.some((pl) => pl.pieceIndex === idx)) return s;
      return { kind: "fit", placed: s.placed.filter((pl) => pl.pieceIndex !== idx) };
    }
    if (a.length !== 4) return s;
    const [pIdx, oIdx, x, y] = a;
    if (pIdx >= p.pieces.length || s.placed.some((pl) => pl.pieceIndex === pIdx)) return s;
    const orients = uniqueOrientations(p.pieces[pIdx], p.allowRotate, p.allowFlip);
    if (oIdx >= orients.length) return s;
    const cells = orients[oIdx];
    const silSet = new Set(p.silhouette.map(atomKey));
    const occ = new Set<string>();
    for (const pl of s.placed) for (const at of translateAtoms(normalizeAtoms(pl.cells), pl.x, pl.y)) occ.add(atomKey(at));
    if (!canPlaceAtoms(silSet, occ, cells, x, y)) return s;
    return { kind: "fit", placed: [...s.placed, { pieceIndex: pIdx, cells, x, y }] };
  },
  actions: (s, d) => {
    const p = d.payload;
    if (p.kind === "cube-opp") return [0, 1, 2, 3, 4, 5].filter((i) => i !== p.askIndex && (s.kind !== "cube" || s.pick !== i));
    if (p.kind === "cube-fold") return [0, 1, 2].filter((i) => s.kind !== "cube" || s.pick !== i);
    return s.kind === "fit" ? fitActions(s, p) : [];
  },
  solved: (s, d) => isShapeSolved(s, d.payload),
  metrics: (_s, actions) => ({ placements: actions.length }),
  solve: (d, budget) => {
    const p = d.payload;
    if (p.kind === "cube-opp") {
      const ans = p.faces.indexOf(p.answer);
      return ans >= 0 ? { status: "solved", witness: [ans], metric: "placements", lower: 1, upper: 1, exact: true } : { status: "unsolved" };
    }
    if (p.kind === "cube-fold") {
      return { status: "solved", witness: [p.answerIndex], metric: "placements", lower: 1, upper: 1, exact: true };
    }
    const res = solveExactCover(p.silhouette, p.pieces, {
      allowRotate: p.allowRotate,
      allowFlip: p.allowFlip,
      maxSolutions: 1,
      nodeBudget: budget,
    });
    if (res.exhausted) return { status: "budget-exhausted", nodes: budget };
    if (res.count === 0) return { status: "unsolved" };
    const witness: ShapePackAction[] = res.solutions[0].map((pl) => {
      const orients = uniqueOrientations(p.pieces[pl.pieceIndex], p.allowRotate, p.allowFlip);
      const sig = normalizeAtoms(pl.cells).map(atomKey).join(";");
      const oIdx = orients.findIndex((o) => o.map(atomKey).join(";") === sig);
      return [pl.pieceIndex, Math.max(0, oIdx), pl.x, pl.y] as const;
    });
    return { status: "solved", witness, metric: "placements", lower: witness.length, upper: witness.length, exact: true };
  },
  solutionHash: (s, d) => {
    if (s.kind === "fit") return canonicalTilingHash(s.placed);
    return `${d.payload.kind}:${s.pick}`;
  },
  semanticKey: (d) => {
    const p = d.payload;
    if (p.kind === "cube-opp") return `opp|${p.cells.map(atomKey).sort().join(";")}|${p.askIndex}|${p.faces.join("")}`;
    if (p.kind === "cube-fold") return `fold|${p.options.map((o) => o.map(atomKey).sort().join(";")).join("/")}|${p.answerIndex}`;
    return `${p.kind}|${p.silhouette.map(atomKey).sort().join(";")}|${p.pieces.map((pc) => pc.map(atomKey).sort().join(",")).sort().join("/")}`;
  },
  hint: (s, d) => {
    const p = d.payload;
    if (p.kind === "cube-opp") return p.faces.indexOf(p.answer);
    if (p.kind === "cube-fold") return p.answerIndex;
    if (s.kind !== "fit") return null;
    const res = solveExactCover(p.silhouette, p.pieces, {
      allowRotate: p.allowRotate,
      allowFlip: p.allowFlip,
      maxSolutions: 1,
      alreadyPlaced: s.placed,
    });
    if (res.count === 0) return s.placed.length ? [-1, s.placed[s.placed.length - 1].pieceIndex] : null;
    const next = res.solutions[0].find((pl) => !s.placed.some((e) => e.pieceIndex === pl.pieceIndex));
    if (!next) return null;
    const orients = uniqueOrientations(p.pieces[next.pieceIndex], p.allowRotate, p.allowFlip);
    const sig = normalizeAtoms(next.cells).map(atomKey).join(";");
    const oIdx = orients.findIndex((o) => o.map(atomKey).join(";") === sig);
    return [next.pieceIndex, Math.max(0, oIdx), next.x, next.y];
  },
  claims,
};

export { INVALID_CUBE_NETS, VALID_CUBE_NETS, orientNet };
