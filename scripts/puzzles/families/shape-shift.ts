import {
  INVALID_CUBE_NETS,
  VALID_CUBE_NETS,
  foldCubeNet,
  orientNet,
} from "../../../src/learn/games/shape-shift/cubeNet";
import type { Cell } from "../../../src/learn/games/shape-shift/legacy";
import { POLY_BLUEPRINTS, TANGRAM_BASE, tangramTopology, type TangramKind } from "../../../src/learn/games/shape-shift/silhouettes";
import {
  atomKey,
  connectedGroups,
  normalizeAtoms,
  solveExactCover,
  translateAtoms,
  uniqueOrientations,
  type TriCell,
} from "../../../src/learn/games/shape-shift/solver";
import { shapeShiftAdapter, type ShapePackPayload } from "../../../src/puzzles/adapters/shape-shift";
import { createRng } from "../../../src/puzzles/rng";
import { parFrom } from "../../../src/puzzles/solver";
import type { BandQuota, DescriptorCore, FamilySpec } from "../../../src/puzzles/types";

const BASE_TETROS: readonly { id: string; cells: Cell[] }[] = [
  { id: "i4", cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { id: "o4", cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { id: "t4", cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
  { id: "l4", cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
  { id: "s4", cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
];
const BASE_TROMINOS: readonly { id: string; cells: Cell[] }[] = [
  { id: "i3", cells: [[0, 0], [1, 0], [2, 0]] },
  { id: "l3", cells: [[0, 0], [0, 1], [1, 1]] },
  { id: "d2", cells: [[0, 0], [1, 0]] },
  { id: "p5", cells: [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1]] },
];

/** Assemble a connected odd polyomino silhouette from `chosen` pieces on a bounded grid. */
function buildPolySilhouette(
  seed: number,
  chosen: readonly { id: string; cells: Cell[] }[],
  maxW: number,
  maxH: number,
  spare?: { id: string; cells: Cell[] },
): { silhouette: Cell[]; pieces: Cell[][]; width: number; height: number } | null {
  const rng = createRng(seed);
  const occupied = new Set<string>();
  const placed: Cell[][] = [];

  for (const item of chosen) {
    const orients = uniqueOrientations(item.cells, true, true) as Cell[][];
    let ok = false;
    for (let tries = 0; tries < 70; tries++) {
      const o = orients[rng.below(orients.length)];
      const mx = Math.max(...o.map((c) => c[0]));
      const my = Math.max(...o.map((c) => c[1]));
      if (mx >= maxW || my >= maxH) continue;
      const x = rng.below(maxW - mx);
      const y = rng.below(maxH - my);
      const cells = translateAtoms(o, x, y) as Cell[];
      if (cells.some(([cx, cy]) => occupied.has(`${cx},${cy}`))) continue;
      if (
        occupied.size > 0 &&
        !cells.some(([cx, cy]) =>
          [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => occupied.has(`${cx + dx},${cy + dy}`)),
        )
      ) {
        continue;
      }
      for (const [cx, cy] of cells) occupied.add(`${cx},${cy}`);
      placed.push(cells);
      ok = true;
      break;
    }
    if (!ok) return null;
  }

  const all = placed.flat();
  const minX = Math.min(...all.map((c) => c[0]));
  const minY = Math.min(...all.map((c) => c[1]));
  const silhouette = normalizeAtoms(all.map(([x, y]): Cell => [x - minX, y - minY])) as Cell[];
  const width = Math.max(...silhouette.map((c) => c[0])) + 1;
  const height = Math.max(...silhouette.map((c) => c[1])) + 1;
  // Reject plain rectangles (SPEC.md / puzzles/REPORT.md: odd silhouettes, not rectangles!)
  if (width * height === silhouette.length) return null;

  const pieces: Cell[][] = chosen.map((c) => normalizeAtoms(c.cells) as Cell[]);
  if (spare) pieces.push(normalizeAtoms(spare.cells) as Cell[]);
  return { silhouette, pieces, width, height };
}

/** Assemble a connected original Tangram silhouette on the quarter-triangle lattice. */
function buildTangramCluster(
  seed: number,
  kinds: readonly TangramKind[],
): { silhouette: TriCell[]; pieces: TriCell[][]; width: number; height: number } | null {
  const rng = createRng(seed);
  const occupied = new Set<string>();
  const occXY = new Set<string>();
  const placed: TriCell[][] = [];

  for (const kind of kinds) {
    const base = TANGRAM_BASE[kind].cells;
    const orients = uniqueOrientations(base, true, true) as TriCell[][];
    let ok = false;
    for (let tries = 0; tries < 90; tries++) {
      const o = orients[rng.below(orients.length)];
      const mx = Math.max(...o.map((a) => a[0]));
      const my = Math.max(...o.map((a) => a[1]));
      const x = rng.below(Math.max(1, 6 - mx));
      const y = rng.below(Math.max(1, 6 - my));
      const cells = translateAtoms(o, x, y) as TriCell[];
      if (cells.some((a) => occupied.has(atomKey(a)))) continue;
      // Ensure piece shares a grid cell or edge-neighbor cell with already-placed silhouette
      if (
        occupied.size > 0 &&
        !cells.some(([cx, cy]) =>
          occXY.has(`${cx},${cy}`) ||
          [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => occXY.has(`${cx + dx},${cy + dy}`)),
        )
      ) {
        continue;
      }
      for (const a of cells) {
        occupied.add(atomKey(a));
        occXY.add(`${a[0]},${a[1]}`);
      }
      placed.push(cells);
      ok = true;
      break;
    }
    if (!ok) return null;
  }

  const all = placed.flat();
  const minX = Math.min(...all.map((a) => a[0]));
  const minY = Math.min(...all.map((a) => a[1]));
  const silhouette = normalizeAtoms(all.map(([x, y, q]): TriCell => [x - minX, y - minY, q])) as TriCell[];
  const width = Math.max(...silhouette.map((a) => a[0])) + 1;
  const height = Math.max(...silhouette.map((a) => a[1])) + 1;
  if (width > 6 || height > 6) return null;
  const topo = tangramTopology(silhouette);
  if (topo.comps !== 1 || topo.pinches !== 0) return null;
  return { silhouette, pieces: kinds.map((k) => TANGRAM_BASE[k].cells), width, height };
}

export const shapeShiftFamily: FamilySpec<ShapePackPayload> = {
  id: "shape-shift",
  adapter: shapeShiftAdapter,
  sources: [
    "src/learn/games/shape-shift/solver.ts",
    "src/learn/games/shape-shift/cubeNet.ts",
    "src/learn/games/shape-shift/silhouettes.ts",
    "src/puzzles/adapters/shape-shift.ts",
    "scripts/puzzles/families/shape-shift.ts",
  ],
  bands: [
    { id: "a", target: 50, floor: 16, advanced: false }, // Picture silhouettes (2-3 pieces)
    { id: "b", target: 50, floor: 18, advanced: false }, // Shaped silhouettes (3-4 pieces)
    { id: "c", target: 50, floor: 18, advanced: true },  // Free-order 5-piece unique odd silhouettes
    { id: "d", target: 50, floor: 16, advanced: true },  // Spare-piece & multi-way silhouettes
    { id: "e", target: 50, floor: 16, advanced: false }, // Varied cube nets & fold checks
    { id: "f", target: 50, floor: 16, advanced: true },  // Tangram silhouettes
  ],
  provenance: {
    source: "original",
    note: "Hand-crafted and exact-cover-certified island silhouettes, cube nets, and Tangram silhouettes.",
  },
  review: { ids: [], complete: false },
  maxRowBytes: 384,
  requiresUnique: false,
  requiresTrace: false,
  hiddenInformation: false,
  generate(seed: number, band: BandQuota): DescriptorCore<ShapePackPayload> | null {
    const rng = createRng(seed);

    if (band.id === "a") {
      // Picture & 3-piece odd silhouettes
      const useBlueprint = rng.below(3) === 0;
      if (useBlueprint) {
        const bp = POLY_BLUEPRINTS[rng.below(POLY_BLUEPRINTS.length)];
        const groupMode = rng.below(3);
        const groups = connectedGroups(bp.parts, groupMode === 0 ? 2 : groupMode === 1 ? 3 : 4);
        const pieces = groups.map((g) => normalizeAtoms(g.flatMap((j) => bp.parts[j].cells)) as Cell[]);
        const sil = normalizeAtoms(bp.parts.flatMap((pt) => pt.cells)) as Cell[];
        const w = Math.max(...sil.map((c) => c[0])) + 1;
        const h = Math.max(...sil.map((c) => c[1])) + 1;
        const payload: ShapePackPayload = {
          kind: "poly", name: bp.name, width: w, height: h, silhouette: sil, pieces,
          allowRotate: true, allowFlip: groupMode > 0,
        };
        return {
          format: 1, seed, rng: 1, band: "a", layout: `bp-${bp.id}-${groupMode}`, template: `bp-${bp.id.slice(0, 4)}`,
          payload, objectives: [], limits: [], par: parFrom("placements", pieces.length, pieces.length),
          teaches: ["picture-fit"], speech: null,
        };
      }
      const pool = [...BASE_TETROS, ...BASE_TROMINOS];
      const chosen = rng.shuffle(pool).slice(0, 3);
      const built = buildPolySilhouette(seed, chosen, 6, 5);
      if (!built) return null;
      const payload: ShapePackPayload = {
        kind: "poly", name: "Island shape", width: built.width, height: built.height,
        silhouette: built.silhouette, pieces: built.pieces, allowRotate: true, allowFlip: true,
      };
      return {
        format: 1, seed, rng: 1, band: "a", layout: `p3-${chosen.map((c) => c.id).sort().join("")}`, template: `t3-${chosen[0].id}-${built.width}`,
        payload, objectives: [], limits: [], par: parFrom("placements", 3, 3),
        teaches: ["free-order"], speech: null,
      };
    }

    if (band.id === "b") {
      // 4-piece shaped silhouettes (unique exact cover!)
      const pool = [...BASE_TETROS, ...BASE_TROMINOS];
      const chosen = rng.shuffle(pool).slice(0, 4);
      const built = buildPolySilhouette(seed, chosen, 6, 6);
      if (!built) return null;
      const res = solveExactCover(built.silhouette, built.pieces, { maxSolutions: 2, nodeBudget: 25_000 });
      if (res.count !== 1) return null;
      const payload: ShapePackPayload = {
        kind: "poly", name: "Reef outline", width: built.width, height: built.height,
        silhouette: built.silhouette, pieces: built.pieces, allowRotate: true, allowFlip: true, uniqueRequired: true,
      };
      return {
        format: 1, seed, rng: 1, band: "b", layout: `p4-${chosen.map((c) => c.id).sort().join("")}`, template: `t4-${chosen[0].id}-${chosen[1].id}`,
        payload, objectives: [], limits: [], par: parFrom("placements", 4, 4),
        teaches: ["outline-only"], speech: null,
      };
    }

    if (band.id === "c") {
      // 5-piece odd silhouettes (L, T, S, O, I) with UNIQUE exact cover!
      const chosen = rng.shuffle([...BASE_TETROS]);
      const built = buildPolySilhouette(seed, chosen, 7, 6);
      if (!built) return null;
      const res = solveExactCover(built.silhouette, built.pieces, { maxSolutions: 2, nodeBudget: 40_000 });
      if (res.count !== 1) return null;
      const payload: ShapePackPayload = {
        kind: "poly", name: "Five-piece island", width: built.width, height: built.height,
        silhouette: built.silhouette, pieces: built.pieces, allowRotate: true, allowFlip: true, uniqueRequired: true,
      };
      return {
        format: 1, seed, rng: 1, band: "c", layout: `p5-${built.width}x${built.height}-${seed % 7}`, template: `t5-${built.width}x${built.height}-${chosen[0].id}`,
        payload, objectives: [], limits: [{ metric: "placements", max: 5 }], par: parFrom("placements", 5, 5),
        teaches: ["five-piece-unique"], speech: null,
      };
    }

    if (band.id === "d") {
      // Spare-piece silhouettes (4-piece silhouette + 1 spare decoy = 5 pieces in tray) or multi-way silhouettes!
      const spareMode = rng.below(2) === 0;
      const shuffled = rng.shuffle([...BASE_TETROS]);
      if (spareMode) {
        const chosen = shuffled.slice(0, 4);
        const spare = shuffled[4];
        const built = buildPolySilhouette(seed, chosen, 6, 6, spare);
        if (!built) return null;
        const res = solveExactCover(built.silhouette, built.pieces, { maxSolutions: 3, nodeBudget: 30_000 });
        if (res.count < 1) return null;
        const payload: ShapePackPayload = {
          kind: "poly", name: "Spare piece reef", width: built.width, height: built.height,
          silhouette: built.silhouette, pieces: built.pieces, allowRotate: true, allowFlip: true,
        };
        return {
          format: 1, seed, rng: 1, band: "d", layout: `sp-${spare.id}-${built.width}`, template: `sp-${spare.id}-${built.height}`,
          payload, objectives: [], limits: [{ metric: "placements", max: 4 }], par: parFrom("placements", 4, 4),
          teaches: ["spare-piece"], speech: null,
        };
      }
      // Multi-way silhouette (2+ distinct exact covers, any fill accepted!)
      const chosen = [BASE_TETROS[3], BASE_TETROS[3], shuffled[0], shuffled[1]];
      const built = buildPolySilhouette(seed, chosen, 6, 6);
      if (!built) return null;
      const res = solveExactCover(built.silhouette, built.pieces, { maxSolutions: 3, nodeBudget: 30_000 });
      if (res.count < 2) return null;
      const payload: ShapePackPayload = {
        kind: "poly", name: "Multi-way reef", width: built.width, height: built.height,
        silhouette: built.silhouette, pieces: built.pieces, allowRotate: true, allowFlip: true,
      };
      return {
        format: 1, seed, rng: 1, band: "d", layout: `mw-${shuffled[0].id}-${built.width}`, template: `mw-${shuffled[0].id}-${shuffled[1].id}`,
        payload, objectives: [], limits: [{ metric: "placements", max: 4 }], par: parFrom("placements", 4, 4),
        teaches: ["any-exact-fill"], speech: null,
      };
    }

    if (band.id === "e") {
      // Varied cube nets across all 11 valid nets + fold-check questions!
      const isFoldCheck = rng.below(3) === 0;
      if (isFoldCheck) {
        const validTpl = VALID_CUBE_NETS[rng.below(VALID_CUBE_NETS.length)];
        const invs = rng.shuffle([...INVALID_CUBE_NETS]).slice(0, 2);
        const list = rng.shuffle([
          { id: validTpl.id, valid: true, cells: orientNet(validTpl.cells, rng.below(4), rng.below(2) === 1) },
          ...invs.map((inv) => ({ id: inv.id, valid: false, cells: orientNet(inv.cells, rng.below(4), rng.below(2) === 1) })),
        ]);
        const answerIndex = list.findIndex((o) => o.valid);
        const payload: ShapePackPayload = { kind: "cube-fold", options: list.map((o) => o.cells), answerIndex };
        return {
          format: 1, seed, rng: 1, band: "e", layout: `fold-${validTpl.id}`, template: `fold-${validTpl.id.slice(0, 5)}`,
          payload, objectives: [], limits: [], par: parFrom("placements", 1, 1),
          teaches: ["cube-fold"], speech: null,
        };
      }
      const netTpl = VALID_CUBE_NETS[rng.below(VALID_CUBE_NETS.length)];
      const cells = orientNet(netTpl.cells, rng.below(4), rng.below(2) === 1);
      const folded = foldCubeNet(cells);
      const letters = ["A", "B", "C", "D", "E", "F"];
      const shift = rng.below(6);
      const faces = letters.map((_, i) => letters[(i + shift) % 6]);
      const askIndex = rng.below(6);
      const payload: ShapePackPayload = {
        kind: "cube-opp", netName: netTpl.name, cells, faces, askIndex, answer: faces[folded.opposites[askIndex]],
      };
      return {
        format: 1, seed, rng: 1, band: "e", layout: `opp-${netTpl.id}`, template: `opp-${netTpl.id}`,
        payload, objectives: [], limits: [], par: parFrom("placements", 1, 1),
        teaches: ["cube-opposite"], speech: null,
      };
    }

    // Band f: Tangram silhouettes (4-to-5-piece compact tangram puzzles certified by exact-cover solver; full 7-piece showcase lives in inline bank 296!)
    const subsets: readonly (readonly TangramKind[])[] = [
      ["L1", "M", "SQ", "P"],
      ["L1", "M", "SQ", "S1", "S2"],
      ["L1", "L2", "SQ", "P"],
      ["L1", "M", "P", "S1", "S2"],
      ["L1", "L2", "M", "S1"],
    ];
    const subIdx = rng.below(subsets.length);
    const kinds = subsets[subIdx];
    const built = buildTangramCluster(seed, kinds);
    if (!built) return null;
    const res = solveExactCover(built.silhouette, built.pieces, { maxSolutions: 2, nodeBudget: 35_000 });
    if (res.count < 1) return null;
    const payload: ShapePackPayload = {
      kind: "tangram", name: "Island tangram", width: built.width, height: built.height,
      silhouette: built.silhouette, pieces: built.pieces, allowRotate: true, allowFlip: true,
    };
    return {
      format: 1, seed, rng: 1, band: "f", layout: `tg-${subIdx}-${built.width}x${built.height}`, template: `tg-${subIdx}-${built.width}`,
      payload, objectives: [], limits: [{ metric: "placements", max: kinds.length }], par: parFrom("placements", kinds.length, kinds.length),
      teaches: ["tangram"], speech: null,
    };
  },
};
