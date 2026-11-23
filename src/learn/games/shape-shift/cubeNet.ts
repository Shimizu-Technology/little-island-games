import type { Cell } from "./legacy";
import { flip, normalize, rotate } from "./legacy";

type Vec3 = readonly [number, number, number];
type Basis = { n: Vec3; u: Vec3; v: Vec3 };

const neg = (a: Vec3): Vec3 => [-a[0], -a[1], -a[2]];
const vecKey = (a: Vec3) => `${a[0]},${a[1]},${a[2]}`;

function roll(b: Basis, dx: number, dy: number): Basis {
  if (dx === 1 && dy === 0) return { n: b.u, u: neg(b.n), v: b.v };
  if (dx === -1 && dy === 0) return { n: neg(b.u), u: b.n, v: b.v };
  if (dx === 0 && dy === 1) return { n: b.v, u: b.u, v: neg(b.n) };
  if (dx === 0 && dy === -1) return { n: neg(b.v), u: b.u, v: b.n };
  throw new Error("Invalid roll step");
}

export type FoldResult = {
  valid: boolean;
  /** Normal vector key per cell index (valid only when `valid` is true). */
  normals: Vec3[];
  /** Index of the face opposite cell `i`, for each `i` in `0..5`. */
  opposites: number[];
};

/**
 * Pure 3D rolling-cube folder: proves whether ANY 6-cell hexomino folds into a closed unit cube
 * and computes the exact opposite face for every cell!
 */
export function foldCubeNet(cells: readonly Cell[]): FoldResult {
  if (cells.length !== 6) return { valid: false, normals: [], opposites: [] };
  const idxOf = new Map<string, number>();
  for (let i = 0; i < cells.length; i++) {
    const k = `${cells[i][0]},${cells[i][1]}`;
    if (idxOf.has(k)) return { valid: false, normals: [], opposites: [] };
    idxOf.set(k, i);
  }

  const bases: (Basis | null)[] = Array(6).fill(null);
  bases[0] = { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };
  const queue = [0];

  while (queue.length > 0) {
    const i = queue.shift()!;
    const [x, y] = cells[i];
    const b = bases[i]!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const j = idxOf.get(`${x + dx},${y + dy}`);
      if (j !== undefined && bases[j] === null) {
        bases[j] = roll(b, dx, dy);
        queue.push(j);
      }
    }
  }

  if (bases.some((b) => b === null)) return { valid: false, normals: [], opposites: [] };
  const normals = bases.map((b) => b!.n);
  const byNormal = new Map<string, number>();
  for (let i = 0; i < 6; i++) {
    const k = vecKey(normals[i]);
    if (byNormal.has(k)) return { valid: false, normals: [], opposites: [] };
    byNormal.set(k, i);
  }
  const opposites = normals.map((n) => byNormal.get(vecKey(neg(n)))!);
  return { valid: true, normals, opposites };
}

export type CubeNetTemplate = {
  id: string;
  name: string;
  cells: Cell[];
  valid: boolean;
};

/** All 11 mathematically distinct valid cube nets (verified by `foldCubeNet`). */
export const VALID_CUBE_NETS: readonly CubeNetTemplate[] = [
  // 1-4-1 family (6 nets)
  { id: "t-net", name: "T net", valid: true, cells: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2], [1, 3]] },
  { id: "cross", name: "Cross net", valid: true, cells: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [1, 3]] },
  { id: "offset-1", name: "Flag net", valid: true, cells: [[0, 0], [1, 0], [1, 1], [2, 1], [1, 2], [1, 3]] },
  { id: "offset-2", name: "Step net", valid: true, cells: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2], [1, 3]] },
  { id: "offset-3", name: "Wing net", valid: true, cells: [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [2, 3]] },
  { id: "mid-wing", name: "Twin wing net", valid: true, cells: [[1, 0], [0, 1], [1, 1], [1, 2], [2, 2], [1, 3]] },
  // 2-3-1 family (3 nets)
  { id: "hook-1", name: "Hook net", valid: true, cells: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2], [1, 3]] },
  { id: "hook-2", name: "Lantern net", valid: true, cells: [[0, 0], [0, 1], [1, 1], [2, 1], [1, 2], [1, 3]] },
  { id: "hook-3", name: "Arch net", valid: true, cells: [[0, 0], [0, 1], [1, 1], [1, 2], [1, 3], [2, 3]] },
  // 2-2-2 staircase / zigzag (A opposite D!)
  { id: "zigzag", name: "Zigzag net", valid: true, cells: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]] },
  // 3-3 offset
  { id: "double-3", name: "Bridge net", valid: true, cells: [[0, 0], [0, 1], [0, 2], [1, 2], [1, 3], [1, 4]] },
];

/** Genuine non-folding 6-cell hexominoes (including SPEC.md's #### / #... / #...). */
export const INVALID_CUBE_NETS: readonly CubeNetTemplate[] = [
  { id: "bad-l4", name: "Long L", valid: false, cells: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [0, 2]] },
  { id: "bad-rect", name: "2 by 3 block", valid: false, cells: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]] },
  { id: "bad-u", name: "C hook", valid: false, cells: [[0, 0], [1, 0], [0, 1], [0, 2], [1, 2], [2, 2]] },
  { id: "bad-line", name: "Five-in-a-row", valid: false, cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [2, 1]] },
  { id: "bad-clump", name: "Box with tail", valid: false, cells: [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [3, 1]] },
  { id: "bad-same-side", name: "Two wings same side", valid: false, cells: [[0, 0], [1, 0], [1, 1], [0, 2], [1, 2], [1, 3]] },
];

export function orientNet(cells: readonly Cell[], turns: number, mirrored: boolean): Cell[] {
  let out = cells.map(([x, y]): Cell => [x, y]);
  if (mirrored) out = flip(out);
  for (let t = 0; t < (turns & 3); t++) out = rotate(out);
  return normalize(out);
}
