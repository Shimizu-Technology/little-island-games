import type { Cell } from "./legacy";
import {
  atomKey,
  flipAtoms,
  normalizeAtoms,
  rotateAtoms,
  translateAtoms,
  type TriCell,
} from "./solver";

export type BlueprintPart = { name: string; color: string; cells: Cell[] };
export type PolyBlueprint = {
  id: string;
  name: string;
  width: number;
  height: number;
  parts: readonly BlueprintPart[];
};

/**
 * 20 hand-crafted, original island silhouettes for Shape Shift (SC-08).
 * Every silhouette is an odd/shaped figure (not a plain rectangle) split into 4 connected parts
 * so Levels 1–4 can group them into 2, 3, or 4 pieces cleanly.
 */
export const POLY_BLUEPRINTS: readonly PolyBlueprint[] = [
  {
    id: "boat", name: "Boat", width: 6, height: 6,
    parts: [
      { name: "Sail tip", color: "#EFBF75", cells: [[2, 0], [2, 1], [3, 1]] },
      { name: "Sail", color: "#F3D599", cells: [[2, 2], [3, 2]] },
      { name: "Hull left", color: "#5C9FA0", cells: [[0, 3], [1, 3], [2, 3], [1, 4], [2, 4]] },
      { name: "Hull right", color: "#4A8792", cells: [[3, 3], [4, 3], [5, 3], [3, 4], [4, 4]] },
    ],
  },
  {
    id: "house", name: "House", width: 6, height: 6,
    parts: [
      { name: "Roof left", color: "#DA836C", cells: [[2, 0], [1, 1], [2, 1]] },
      { name: "Roof right", color: "#C96F63", cells: [[3, 0], [3, 1], [4, 1]] },
      { name: "Wall left", color: "#DAB87D", cells: [[1, 2], [2, 2], [1, 3], [2, 3], [1, 4], [2, 4]] },
      { name: "Wall right", color: "#EACB94", cells: [[3, 2], [4, 2], [3, 3], [4, 3], [3, 4], [4, 4]] },
    ],
  },
  {
    id: "fish", name: "Fish", width: 6, height: 6,
    parts: [
      { name: "Tail", color: "#E9BA61", cells: [[0, 1], [1, 2], [0, 3]] },
      { name: "Back", color: "#63A9A5", cells: [[2, 1], [2, 2], [2, 3], [3, 0], [3, 1]] },
      { name: "Face", color: "#79C2B5", cells: [[3, 2], [4, 1], [4, 2], [5, 2]] },
      { name: "Fin", color: "#4F969C", cells: [[3, 3], [3, 4], [4, 3]] },
    ],
  },
  {
    id: "rocket", name: "Rocket", width: 6, height: 6,
    parts: [
      { name: "Nose", color: "#D9826B", cells: [[2, 0], [3, 0], [2, 1], [3, 1]] },
      { name: "Body", color: "#79ACBC", cells: [[2, 2], [3, 2], [2, 3], [3, 3]] },
      { name: "Left wing", color: "#E4B760", cells: [[1, 3], [1, 4], [2, 4], [2, 5]] },
      { name: "Right wing", color: "#D69E4E", cells: [[4, 3], [4, 4], [3, 4], [3, 5]] },
    ],
  },
  {
    id: "turtle", name: "Turtle", width: 6, height: 6,
    parts: [
      { name: "Shell top", color: "#5E9B75", cells: [[1, 1], [2, 1], [3, 1], [2, 0]] },
      { name: "Shell low", color: "#4B8663", cells: [[1, 2], [2, 2], [3, 2], [2, 3]] },
      { name: "Head", color: "#80B58E", cells: [[4, 1], [4, 2], [5, 1]] },
      { name: "Flippers", color: "#6BA17F", cells: [[0, 2], [1, 3], [3, 3], [4, 3]] },
    ],
  },
  {
    id: "lighthouse", name: "Lighthouse", width: 6, height: 6,
    parts: [
      { name: "Lantern", color: "#E9BF5C", cells: [[2, 0], [3, 0], [2, 1], [3, 1]] },
      { name: "Mid tower", color: "#DE795C", cells: [[2, 2], [3, 2], [2, 3]] },
      { name: "Right wall", color: "#F1DEC0", cells: [[3, 3], [3, 4], [4, 4]] },
      { name: "Base rock", color: "#6E8E87", cells: [[1, 4], [2, 4], [1, 5], [2, 5], [3, 5], [4, 5]] },
    ],
  },
  {
    id: "crab", name: "Crab", width: 6, height: 6,
    parts: [
      { name: "Left claw", color: "#D9755A", cells: [[0, 1], [0, 2], [1, 2]] },
      { name: "Right claw", color: "#C8654C", cells: [[5, 1], [5, 2], [4, 2]] },
      { name: "Shell", color: "#E38B6E", cells: [[2, 2], [3, 2], [1, 3], [2, 3], [3, 3], [4, 3]] },
      { name: "Legs", color: "#B85942", cells: [[1, 4], [2, 4], [3, 4], [4, 4]] },
    ],
  },
  {
    id: "whale", name: "Whale", width: 6, height: 6,
    parts: [
      { name: "Spout", color: "#8CC2D0", cells: [[4, 0], [3, 1], [4, 1]] },
      { name: "Tail", color: "#5089A8", cells: [[0, 1], [0, 2], [1, 2], [1, 3]] },
      { name: "Back", color: "#5D97B8", cells: [[2, 2], [3, 2], [4, 2], [5, 2]] },
      { name: "Belly", color: "#79B2C9", cells: [[2, 3], [3, 3], [4, 3], [5, 3], [3, 4]] },
    ],
  },
  {
    id: "palm", name: "Palm tree", width: 6, height: 6,
    parts: [
      { name: "Left fronds", color: "#5E9B75", cells: [[0, 1], [1, 0], [1, 1], [2, 1]] },
      { name: "Right fronds", color: "#4D8A65", cells: [[3, 0], [4, 0], [3, 1], [4, 1], [5, 1]] },
      { name: "Trunk", color: "#B8895A", cells: [[2, 2], [2, 3], [3, 3], [3, 4]] },
      { name: "Sand mound", color: "#E2C07A", cells: [[1, 5], [2, 5], [3, 5], [4, 5]] },
    ],
  },
  {
    id: "hut", name: "Beach hut", width: 6, height: 6,
    parts: [
      { name: "Thatch top", color: "#D4A359", cells: [[2, 0], [3, 0], [1, 1], [2, 1], [3, 1], [4, 1]] },
      { name: "Eaves", color: "#C29049", cells: [[0, 2], [1, 2], [4, 2], [5, 2]] },
      { name: "Post left", color: "#9C7552", cells: [[1, 3], [2, 3], [1, 4], [1, 5]] },
      { name: "Post right", color: "#B08962", cells: [[3, 3], [4, 3], [4, 4], [4, 5]] },
    ],
  },
  {
    id: "canoe", name: "Canoe", width: 6, height: 6,
    parts: [
      { name: "Prow", color: "#C97D55", cells: [[0, 2], [0, 3], [1, 3], [1, 4]] },
      { name: "Mid hull", color: "#B56B45", cells: [[2, 3], [3, 3], [2, 4], [3, 4]] },
      { name: "Stern", color: "#D68E64", cells: [[4, 3], [5, 3], [5, 2], [4, 4]] },
      { name: "Outrigger", color: "#689B96", cells: [[2, 1], [2, 2], [3, 1], [4, 1]] },
    ],
  },
  {
    id: "starfish", name: "Starfish", width: 6, height: 6,
    parts: [
      { name: "Top arm", color: "#E7A854", cells: [[2, 0], [3, 0], [2, 1], [3, 1]] },
      { name: "Left arm", color: "#DC9747", cells: [[0, 2], [1, 2], [1, 3], [2, 2]] },
      { name: "Right arm", color: "#EDB768", cells: [[3, 2], [4, 2], [5, 2], [4, 3]] },
      { name: "Bottom arms", color: "#CF893C", cells: [[2, 3], [3, 3], [1, 4], [4, 4]] },
    ],
  },
  {
    id: "pelican", name: "Pelican", width: 6, height: 6,
    parts: [
      { name: "Beak", color: "#E8B75C", cells: [[4, 0], [5, 0], [5, 1], [4, 1]] },
      { name: "Neck", color: "#DCD4BE", cells: [[3, 1], [3, 2], [3, 3]] },
      { name: "Wing", color: "#9CB2B8", cells: [[1, 2], [2, 2], [1, 3], [2, 3], [0, 3]] },
      { name: "Legs", color: "#D69A4B", cells: [[2, 4], [3, 4], [2, 5], [3, 5]] },
    ],
  },
  {
    id: "anchor", name: "Anchor", width: 6, height: 6,
    parts: [
      { name: "Ring", color: "#688996", cells: [[2, 0], [3, 0], [2, 1]] },
      { name: "Crossbar", color: "#557684", cells: [[1, 2], [2, 2], [3, 2], [4, 2]] },
      { name: "Shank", color: "#7B9BA8", cells: [[2, 3], [2, 4], [3, 4]] },
      { name: "Flukes", color: "#4A6875", cells: [[0, 4], [1, 5], [2, 5], [3, 5], [4, 5], [5, 4]] },
    ],
  },
  {
    id: "shell", name: "Sea shell", width: 6, height: 6,
    parts: [
      { name: "Crown", color: "#E7A88C", cells: [[2, 0], [3, 0], [1, 1], [2, 1], [3, 1], [4, 1]] },
      { name: "Left fan", color: "#DC9679", cells: [[0, 2], [1, 2], [2, 2], [1, 3]] },
      { name: "Right fan", color: "#EFB9A1", cells: [[3, 2], [4, 2], [5, 2], [4, 3]] },
      { name: "Hinge", color: "#C98268", cells: [[2, 3], [3, 3], [2, 4], [3, 4]] },
    ],
  },
  {
    id: "volcano", name: "Volcano", width: 6, height: 6,
    parts: [
      { name: "Plume", color: "#E38262", cells: [[2, 0], [3, 0], [2, 1]] },
      { name: "Cone left", color: "#7C6E63", cells: [[1, 2], [2, 2], [1, 3], [2, 3]] },
      { name: "Cone right", color: "#8F8073", cells: [[3, 1], [3, 2], [4, 2], [3, 3], [4, 3]] },
      { name: "Foothills", color: "#5F8A64", cells: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4]] },
    ],
  },
  {
    id: "crown", name: "Crown", width: 6, height: 6,
    parts: [
      { name: "Left peak", color: "#E4B854", cells: [[0, 1], [0, 2], [1, 2], [1, 3]] },
      { name: "Center peak", color: "#F0CB6E", cells: [[2, 0], [3, 0], [2, 1], [3, 1], [2, 2], [3, 2]] },
      { name: "Right peak", color: "#D8A944", cells: [[5, 1], [5, 2], [4, 2], [4, 3]] },
      { name: "Band", color: "#C79636", cells: [[0, 3], [2, 3], [3, 3], [5, 3], [1, 4], [2, 4], [3, 4], [4, 4]] },
    ],
  },
  {
    id: "butterfly", name: "Butterfly", width: 6, height: 6,
    parts: [
      { name: "Upper left", color: "#D6829B", cells: [[0, 1], [1, 1], [0, 2], [1, 2]] },
      { name: "Upper right", color: "#C8708A", cells: [[4, 1], [5, 1], [4, 2], [5, 2]] },
      { name: "Body", color: "#5E5468", cells: [[2, 1], [3, 1], [2, 2], [3, 2], [2, 3], [3, 3]] },
      { name: "Lower wings", color: "#E6A3B6", cells: [[1, 3], [1, 4], [4, 3], [4, 4]] },
    ],
  },
  {
    id: "submarine", name: "Submarine", width: 6, height: 6,
    parts: [
      { name: "Periscope", color: "#E3B252", cells: [[3, 0], [2, 0], [2, 1], [2, 2]] },
      { name: "Tower", color: "#D39D3E", cells: [[3, 1], [3, 2]] },
      { name: "Stern", color: "#598FA1", cells: [[0, 3], [1, 3], [2, 3], [1, 4], [2, 4]] },
      { name: "Bow", color: "#487B8E", cells: [[3, 3], [4, 3], [5, 3], [3, 4], [4, 4]] },
    ],
  },
  {
    id: "windmill", name: "Windmill", width: 6, height: 6,
    parts: [
      { name: "Top blade", color: "#E8C374", cells: [[2, 0], [3, 0], [2, 1]] },
      { name: "Left blade", color: "#DBB05E", cells: [[0, 1], [1, 1], [1, 2]] },
      { name: "Right blade", color: "#F1D28E", cells: [[3, 1], [4, 1], [4, 2], [5, 2]] },
      { name: "Mill tower", color: "#B87E62", cells: [[2, 2], [3, 2], [2, 3], [3, 3], [1, 4], [2, 4], [3, 4], [4, 4]] },
    ],
  },
];

// =============================================================================
// Classic 7-piece Tangram base pieces (on exact quarter-triangle grid!)
// Each unit cell (x,y) has 4 quarter-triangles: 0=N, 1=E, 2=S, 3=W.
// Total area of the classic 7-piece set = 16 + 16 + 8 + 8 + 8 + 4 + 4 = 64 quarter-triangles (= 4x4 square).
// =============================================================================
const fullCell = (x: number, y: number): TriCell[] => [
  [x, y, 0], [x, y, 1], [x, y, 2], [x, y, 3],
];
const halfNE = (x: number, y: number): TriCell[] => [[x, y, 0], [x, y, 1]];
const halfNW = (x: number, y: number): TriCell[] => [[x, y, 0], [x, y, 3]];
const halfSE = (x: number, y: number): TriCell[] => [[x, y, 1], [x, y, 2]];
const halfSW = (x: number, y: number): TriCell[] => [[x, y, 2], [x, y, 3]];

export type TangramKind = "L1" | "L2" | "M" | "SQ" | "P" | "S1" | "S2";

export const TANGRAM_BASE: Record<TangramKind, { name: string; color: string; cells: TriCell[] }> = {
  // Large right isosceles triangle (vertices (0,0)-(4,0)-(2,2), area 4 = 16 q-tris)
  L1: {
    name: "Big triangle",
    color: "#E07A5F",
    cells: normalizeAtoms([
      ...halfNE(0, 0), ...fullCell(1, 0), ...fullCell(2, 0), ...halfNW(3, 0),
      ...halfNE(1, 1), ...halfNW(2, 1),
    ]) as TriCell[],
  },
  L2: {
    name: "Big triangle",
    color: "#5C9FA0",
    cells: normalizeAtoms([
      ...halfNE(0, 0), ...fullCell(1, 0), ...fullCell(2, 0), ...halfNW(3, 0),
      ...halfNE(1, 1), ...halfNW(2, 1),
    ]) as TriCell[],
  },
  // Medium right isosceles triangle (vertices (0,0)-(2,0)-(2,2), area 2 = 8 q-tris)
  M: {
    name: "Medium triangle",
    color: "#E9B949",
    cells: normalizeAtoms([...halfNE(0, 0), ...fullCell(1, 0), ...halfNE(1, 1)]) as TriCell[],
  },
  // Diamond square (vertices (1,0)-(2,1)-(1,2)-(0,1), side √2, area 2 = 8 q-tris)
  SQ: {
    name: "Square",
    color: "#69A27B",
    cells: normalizeAtoms([...halfSE(0, 0), ...halfSW(1, 0), ...halfNE(0, 1), ...halfNW(1, 1)]) as TriCell[],
  },
  // Parallelogram (vertices (0,1)-(1,0)-(3,0)-(2,1), base 2, area 2 = 8 q-tris, flippable!)
  P: {
    name: "Parallelogram",
    color: "#9C7BB0",
    cells: normalizeAtoms([...halfSE(0, 0), ...fullCell(1, 0), ...halfNW(2, 0)]) as TriCell[],
  },
  // Small right isosceles triangles (vertices (0,0)-(2,0)-(1,1), area 1 = 4 q-tris)
  S1: {
    name: "Small triangle",
    color: "#D69457",
    cells: normalizeAtoms([...halfNE(0, 0), ...halfNW(1, 0)]) as TriCell[],
  },
  S2: {
    name: "Small triangle",
    color: "#6B8EC4",
    cells: normalizeAtoms([...halfNE(0, 0), ...halfNW(1, 0)]) as TriCell[],
  },
};

export type TangramPlacementSpec = {
  kind: TangramKind;
  turns: 0 | 1 | 2 | 3;
  flipped?: boolean;
  x: number;
  y: number;
};

export type TangramPuzzleDef = {
  id: string;
  name: string;
  width: number;
  height: number;
  pieces: { kind: TangramKind; name: string; color: string; baseCells: TriCell[]; target: TriCell[] }[];
  silhouette: TriCell[];
};

/**
 * Construct a Tangram puzzle from exact non-overlapping piece placements.
 * Throws at build/test time if any two pieces overlap!
 */
export function buildTangramDef(id: string, name: string, placements: readonly TangramPlacementSpec[]): TangramPuzzleDef {
  const seen = new Set<string>();
  const rawTargets: { kind: TangramKind; target: TriCell[] }[] = [];

  for (const spec of placements) {
    let cells: TriCell[] = TANGRAM_BASE[spec.kind].cells;
    if (spec.flipped) cells = flipAtoms(cells) as TriCell[];
    for (let t = 0; t < spec.turns; t++) cells = rotateAtoms(cells) as TriCell[];
    const placed = translateAtoms(normalizeAtoms(cells), spec.x, spec.y) as TriCell[];
    for (const a of placed) {
      const k = atomKey(a);
      if (seen.has(k)) throw new Error(`Tangram ${id} (${name}) has overlapping pieces at ${k}`);
      seen.add(k);
    }
    rawTargets.push({ kind: spec.kind, target: placed });
  }

  // Shift entire silhouette so minX = 0, minY = 0
  const all = rawTargets.flatMap((r) => r.target);
  const minX = Math.min(...all.map((a) => a[0]));
  const minY = Math.min(...all.map((a) => a[1]));
  const maxX = Math.max(...all.map((a) => a[0]));
  const maxY = Math.max(...all.map((a) => a[1]));

  const pieces = rawTargets.map(({ kind, target }) => ({
    kind,
    name: TANGRAM_BASE[kind].name,
    color: TANGRAM_BASE[kind].color,
    baseCells: TANGRAM_BASE[kind].cells,
    target: translateAtoms(target, -minX, -minY) as TriCell[],
  }));
  const silhouette = normalizeAtoms(all) as TriCell[];
  return {
    id,
    name,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    pieces,
    silhouette,
  };
}

/**
 * Hand-crafted original Tangram silhouettes (SP-06).
 * Includes 4-piece gentle starter Tangrams + 12 full classic 7-piece Tangrams!
 * Every single silhouette is exact-cover verified in tests.
 */
export const TANGRAM_SILHOUETTES: readonly TangramPuzzleDef[] = [
  // 1. Classic Square (7 pieces, 4x4 — multiple exact-cover solutions!)
  buildTangramDef("tg-square", "Classic square", [
    { kind: "L1", turns: 0, x: 0, y: 0 },
    { kind: "L2", turns: 3, x: 0, y: 0 },
    { kind: "S1", turns: 1, x: 3, y: 0 },
    { kind: "SQ", turns: 0, x: 2, y: 1 },
    { kind: "S2", turns: 2, x: 1, y: 2 },
    { kind: "P", turns: 0, x: 0, y: 3 },
    { kind: "M", turns: 1, x: 2, y: 2 },
  ]),

  // 2. Island Sailboat (7 pieces, 7x6: tall left sail + pennant + jib sail + sleek hull)
  buildTangramDef("tg-boat", "Island boat", [
    { kind: "L1", turns: 1, x: 1, y: 0 }, // left main sail
    { kind: "S1", turns: 3, x: 3, y: 0 }, // pennant flag
    { kind: "M", turns: 2, x: 3, y: 2 },  // right jib sail
    { kind: "L2", turns: 0, x: 0, y: 4 }, // main hull
    { kind: "P", turns: 0, x: 2, y: 5 },  // keel right
    { kind: "S2", turns: 2, x: 3, y: 4 }, // stern deck
    { kind: "SQ", turns: 0, x: 5, y: 3 }, // stern flag
  ]),

  // 3. Island House (7 pieces, 5x6: pitched roof + chimney + walls)
  buildTangramDef("tg-house", "Island house", [
    { kind: "L1", turns: 2, x: 0, y: 0 }, // roof
    { kind: "SQ", turns: 0, x: 3, y: 0 }, // chimney
    { kind: "L2", turns: 3, x: 0, y: 2 }, // left wall
    { kind: "M", turns: 0, x: 2, y: 2 },  // upper right wall
    { kind: "P", turns: 1, x: 2, y: 2 },  // center pillar
    { kind: "S1", turns: 3, x: 3, y: 3 }, // right lower wall (complements M's 3,3:NE!)
    { kind: "S2", turns: 2, x: 1, y: 4 }, // front base
  ]),

  // 4. Island Cat (7 pieces, 7x6: twin ears + diamond head + seated body + tail)
  buildTangramDef("tg-cat", "Island cat", [
    { kind: "S1", turns: 3, x: 0, y: 0 }, // left ear (0,0:SW 0,1:NW)
    { kind: "S2", turns: 1, x: 1, y: 0 }, // right ear (1,0:SE 1,1:NE)
    { kind: "SQ", turns: 0, x: 0, y: 1 }, // head (0,1:SE 1,1:SW 0,2:NE 1,2:NW)
    { kind: "M", turns: 3, x: 0, y: 3 },  // chest (0,3:FULL 0,4:NW 1,3:NW)
    { kind: "L1", turns: 2, x: 0, y: 4 }, // base paws (0,5:SE 1,4:SE 1,5:FULL 2,4:SW 2,5:FULL 3,5:SW)
    { kind: "L2", turns: 1, x: 2, y: 1 }, // back (2,2:SE 2,3:NE 3,1:SE 3,2:FULL 3,3:FULL 3,4:NE)
    { kind: "P", turns: 0, x: 4, y: 4 },  // tail (4,4:SE 5,4:FULL 6,4:NW)
  ]),

  // 5. Star Rocket (7 pieces, 6x6: pointed nose + flanked cabin + twin booster fins)
  buildTangramDef("tg-rocket", "Star rocket", [
    { kind: "L1", turns: 2, x: 1, y: 0 }, // nose cone (1,1:SE 2,0:SE 2,1:FULL 3,0:SW 3,1:FULL 4,1:SW)
    { kind: "SQ", turns: 0, x: 2, y: 2 }, // cabin (2,2:SE 3,2:SW 2,3:NE 3,3:NW)
    { kind: "S1", turns: 3, x: 1, y: 2 }, // left flank (1,2:SW 1,3:NW)
    { kind: "S2", turns: 1, x: 4, y: 2 }, // right flank (4,2:SE 4,3:NE)
    { kind: "L2", turns: 0, x: 1, y: 4 }, // thruster hull (1,4:NE 2,4:FULL 2,5:NE 3,4:FULL 3,5:NW 4,4:NW)
    { kind: "M", turns: 2, x: 0, y: 4 },  // left booster fin (0,4:SW 0,5:FULL 1,5:SW)
    { kind: "P", turns: 1, flipped: true, x: 4, y: 4 }, // right booster fin (4,4:SE 4,5:FULL 4,6:NW) — complements L2's 4,4:NW!
  ]),

  // 6. Reef Fish (7 pieces, 8x5: diamond body + forked tail + snout + lower fin)
  buildTangramDef("tg-fish", "Reef fish", [
    { kind: "L1", turns: 2, x: 2, y: 0 }, // upper back
    { kind: "L2", turns: 0, x: 2, y: 2 }, // lower belly
    { kind: "S1", turns: 0, x: 0, y: 0 }, // upper tail lobe
    { kind: "M", turns: 1, x: 0, y: 1 },  // tail center
    { kind: "S2", turns: 2, x: 0, y: 3 }, // lower tail lobe
    { kind: "SQ", turns: 0, x: 6, y: 1 }, // snout
    { kind: "P", turns: 0, x: 2, y: 4 },  // lower fin
  ]),

  // 7. Lagoon Swan (7 pieces, 7x6: beak + long neck + chest + raised wing + tail)
  buildTangramDef("tg-swan", "Lagoon swan", [
    { kind: "S1", turns: 0, x: 0, y: 0 },
    { kind: "P", turns: 1, flipped: true, x: 1, y: 0 },
    { kind: "SQ", turns: 0, x: 1, y: 2 },
    { kind: "M", turns: 0, x: 2, y: 2 },
    { kind: "L1", turns: 0, x: 2, y: 4 },
    { kind: "L2", turns: 2, x: 3, y: 0 },
    { kind: "S2", turns: 2, x: 5, y: 4 },
  ]),

  // 8. Twin Peaks (7 pieces, 7x4: two mountain peaks + solid base)
  buildTangramDef("tg-peaks", "Twin peaks", [
    { kind: "L1", turns: 2, x: 0, y: 1 },
    { kind: "L2", turns: 2, x: 3, y: 0 },
    { kind: "M", turns: 0, x: 3, y: 2 },
    { kind: "SQ", turns: 0, x: 5, y: 2 },
    { kind: "P", turns: 0, x: 0, y: 3 },
    { kind: "S1", turns: 2, x: 2, y: 3 },
    { kind: "S2", turns: 1, x: 6, y: 0 },
  ]),

  // 9. Island Fox (7 pieces, 7x7)
  buildTangramDef("tg-fox", "Island fox", [
    { kind: "S1", turns: 3, x: 0, y: 0 },
    { kind: "S2", turns: 1, x: 1, y: 0 },
    { kind: "SQ", turns: 0, x: 0, y: 1 },
    { kind: "L1", turns: 3, x: 1, y: 3 },
    { kind: "L2", turns: 1, x: 2, y: 2 },
    { kind: "M", turns: 1, x: 3, y: 5 },
    { kind: "P", turns: 0, x: 4, y: 4 },
  ]),

  // 10. Outrigger Canoe (7 pieces, 8x4)
  buildTangramDef("tg-canoe", "Outrigger canoe", [
    { kind: "L1", turns: 0, x: 0, y: 2 }, // left hull: 0,2:NE 1,2:FULL 1,3:NE 2,2:FULL 2,3:NW 3,2:NW
    { kind: "L2", turns: 0, x: 4, y: 2 }, // right hull: 4,2:NE 5,2:FULL 5,3:NE 6,2:FULL 6,3:NW 7,2:NW
    { kind: "S1", turns: 2, x: 3, y: 2 }, // center deck: 3,2:SE 4,2:SW (3,2:NW+SE = FULL, 4,2:NE+SW = FULL!)
    { kind: "SQ", turns: 0, x: 3, y: 0 }, // sail: 3,0:SE 4,0:SW 3,1:NE 4,1:NW
    { kind: "M", turns: 2, x: 1, y: 0 },  // left canopy: 1,0:SW 1,1:FULL 2,1:SW
    { kind: "P", turns: 0, x: 5, y: 1 },  // outrigger arm: 5,1:SE 6,1:FULL 7,1:NW
    { kind: "S2", turns: 2, x: 2, y: 3 }, // keel: 2,3:SE 3,3:SW (2,3:NW+SE = FULL!)
  ]),

  // 11. Sea Turtle Tangram (7 pieces, 7x5)
  buildTangramDef("tg-turtle", "Sea turtle", [
    { kind: "L1", turns: 2, x: 1, y: 0 },
    { kind: "L2", turns: 0, x: 1, y: 2 },
    { kind: "SQ", turns: 0, x: 5, y: 1 },
    { kind: "S1", turns: 1, x: 0, y: 1 },
    { kind: "M", turns: 3, x: 0, y: 3 },
    { kind: "P", turns: 0, x: 3, y: 3 },
    { kind: "S2", turns: 2, x: 4, y: 0 },
  ]),

  // 12. Island Tower / Pagoda (7 pieces, 5x8)
  buildTangramDef("tg-pagoda", "Island tower", [
    { kind: "S1", turns: 2, x: 1, y: 0 },
    { kind: "SQ", turns: 0, x: 1, y: 1 },
    { kind: "L1", turns: 2, x: 0, y: 3 },
    { kind: "L2", turns: 0, x: 0, y: 5 },
    { kind: "M", turns: 2, x: 0, y: 6 },
    { kind: "P", turns: 0, x: 2, y: 6 },
    { kind: "S2", turns: 2, x: 3, y: 5 },
  ]),

  // 13. Butterfly Tangram (7 pieces, 6x6)
  buildTangramDef("tg-butterfly", "Butterfly", [
    { kind: "L1", turns: 1, x: 0, y: 0 },
    { kind: "L2", turns: 3, x: 2, y: 0 },
    { kind: "SQ", turns: 0, x: 1, y: 4 },
    { kind: "S1", turns: 2, x: 0, y: 3 },
    { kind: "S2", turns: 2, x: 2, y: 3 },
    { kind: "M", turns: 0, x: 3, y: 1 },
    { kind: "P", turns: 0, x: 3, y: 4 },
  ]),

  // 14. Blue Whale Tangram (7 pieces, 7x4)
  buildTangramDef("tg-whale", "Blue whale", [
    { kind: "L1", turns: 2, x: 2, y: 0 },
    { kind: "L2", turns: 0, x: 2, y: 2 },
    { kind: "SQ", turns: 0, x: 0, y: 2 },
    { kind: "S1", turns: 3, x: 0, y: 0 },
    { kind: "S2", turns: 1, x: 1, y: 0 },
    { kind: "M", turns: 0, x: 5, y: 1 },
    { kind: "P", turns: 0, x: 4, y: 3 },
  ]),

  // 15. Mini Tangram Starter A (4 pieces: 2 Large + Medium + Square — Arrow!)
  buildTangramDef("tg-mini-arrow", "Island arrow", [
    { kind: "L1", turns: 2, x: 0, y: 0 },
    { kind: "L2", turns: 0, x: 0, y: 2 },
    { kind: "SQ", turns: 0, x: 4, y: 1 },
    { kind: "M", turns: 0, x: 4, y: 0 },
  ]),

  // 16. Mini Tangram Starter B (4 pieces: Large + Medium + Small + Square — Sail!)
  buildTangramDef("tg-mini-sail", "Little sail", [
    { kind: "L1", turns: 1, x: 0, y: 0 },
    { kind: "M", turns: 2, x: 2, y: 2 },
    { kind: "S1", turns: 2, x: 0, y: 3 },
    { kind: "SQ", turns: 0, x: 1, y: 4 },
  ]),
];

// =============================================================================
// Odd 5-piece polyomino silhouettes for Deep Water (unique, spare-piece, and find-two-ways!)
// =============================================================================
export type PolyChallengeDef = {
  id: string;
  name: string;
  width: number;
  height: number;
  silhouette: Cell[];
  /** Tray pieces (may include 1 spare piece when `spare` is true). */
  pieces: { name: string; color: string; cells: Cell[] }[];
  spare?: boolean;
  twoWays?: boolean;
};

const PALETTE = ["#E07A5F", "#5C9FA0", "#E9B949", "#69A27B", "#9C7BB0", "#D69457"];

function polyDef(
  id: string,
  name: string,
  placements: readonly { name: string; cells: Cell[] }[],
  extras?: { spare?: { name: string; cells: Cell[] }; twoWays?: boolean },
): PolyChallengeDef {
  const all = placements.flatMap((p) => p.cells);
  const minX = Math.min(...all.map((c) => c[0]));
  const minY = Math.min(...all.map((c) => c[1]));
  const silhouette = all.map(([x, y]): Cell => [x - minX, y - minY]);
  const width = Math.max(...silhouette.map((c) => c[0])) + 1;
  const height = Math.max(...silhouette.map((c) => c[1])) + 1;
  const pieces = placements.map((p, i) => ({
    name: p.name,
    color: PALETTE[i % PALETTE.length],
    cells: normalizeAtoms(p.cells) as Cell[],
  }));
  if (extras?.spare) {
    pieces.push({
      name: extras.spare.name,
      color: PALETTE[pieces.length % PALETTE.length],
      cells: normalizeAtoms(extras.spare.cells) as Cell[],
    });
  }
  return {
    id,
    name,
    width,
    height,
    silhouette,
    pieces,
    ...(extras?.spare ? { spare: true } : {}),
    ...(extras?.twoWays ? { twoWays: true } : {}),
  };
}

export const DEEP_POLY_DEFS: readonly PolyChallengeDef[] = [
  // Teach (5 unique-solution 5-piece odd silhouettes — L, T, S, O, I, each proved exact-cover count === 1!)
  polyDef("dw-unique-1", "Reef bridge", [
    { name: "I bar", cells: [[0, 2], [1, 2], [2, 2], [3, 2]] },
    { name: "O block", cells: [[4, 1], [4, 2], [5, 1], [5, 2]] },
    { name: "T piece", cells: [[0, 3], [0, 4], [0, 5], [1, 4]] },
    { name: "L corner", cells: [[3, 3], [3, 4], [3, 5], [4, 5]] },
    { name: "S wave", cells: [[0, 1], [1, 0], [1, 1], [2, 0]] },
  ]),
  polyDef("dw-unique-2", "Harbor dock", [
    { name: "I bar", cells: [[0, 1], [0, 2], [0, 3], [0, 4]] },
    { name: "O block", cells: [[1, 1], [1, 2], [2, 1], [2, 2]] },
    { name: "T piece", cells: [[2, 3], [3, 3], [3, 4], [4, 3]] },
    { name: "L corner", cells: [[4, 0], [4, 1], [4, 2], [5, 2]] },
    { name: "S wave", cells: [[1, 4], [2, 4], [2, 5], [3, 5]] },
  ]),
  polyDef("dw-unique-3", "Coral arch", [
    { name: "I bar", cells: [[1, 3], [2, 3], [3, 3], [4, 3]] },
    { name: "O block", cells: [[0, 1], [0, 2], [1, 1], [1, 2]] },
    { name: "T piece", cells: [[2, 2], [3, 1], [3, 2], [4, 2]] },
    { name: "L corner", cells: [[2, 4], [3, 4], [4, 4], [4, 5]] },
    { name: "S wave", cells: [[4, 1], [5, 0], [5, 1], [6, 0]] },
  ]),
  polyDef("dw-unique-4", "Lagoon cape", [
    { name: "L corner", cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
    { name: "S wave", cells: [[1, 0], [2, 0], [2, 1], [3, 1]] },
    { name: "T piece", cells: [[2, 2], [3, 2], [4, 2], [3, 3]] },
    { name: "O block", cells: [[0, 3], [1, 3], [0, 4], [1, 4]] },
    { name: "I bar", cells: [[2, 3], [2, 4], [2, 5], [2, 6]] },
  ]),
  polyDef("dw-unique-5", "Tide tower", [
    { name: "I bar", cells: [[0, 1], [0, 2], [0, 3], [0, 4]] },
    { name: "O block", cells: [[1, 0], [1, 1], [2, 0], [2, 1]] },
    { name: "T piece", cells: [[1, 2], [1, 3], [1, 4], [2, 3]] },
    { name: "L corner", cells: [[2, 5], [3, 3], [3, 4], [3, 5]] },
    { name: "S wave", cells: [[3, 0], [4, 0], [4, 1], [5, 1]] },
  ]),

  // Develop (5 spare-piece silhouettes: 4 pieces fill the silhouette, 1 extra decoy piece is NOT needed!)
  polyDef(
    "dw-spare-1", "Spare reef",
    [
      { name: "L corner", cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
      { name: "T piece", cells: [[1, 0], [2, 0], [3, 0], [2, 1]] },
      { name: "O block", cells: [[3, 1], [4, 1], [3, 2], [4, 2]] },
      { name: "I bar", cells: [[1, 3], [2, 3], [3, 3], [4, 3]] },
    ],
    { spare: { name: "Extra S", cells: [[0, 0], [1, 0], [1, 1], [2, 1]] } },
  ),
  polyDef(
    "dw-spare-2", "Extra wing",
    [
      { name: "O block", cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
      { name: "T piece", cells: [[2, 0], [3, 0], [4, 0], [3, 1]] },
      { name: "L corner", cells: [[1, 2], [2, 2], [3, 2], [3, 3]] },
      { name: "S wave", cells: [[0, 2], [0, 3], [1, 3], [1, 4]] },
    ],
    { spare: { name: "Extra bar", cells: [[0, 0], [1, 0], [2, 0], [3, 0]] } },
  ),
  polyDef(
    "dw-spare-3", "Hidden spare",
    [
      { name: "I bar", cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
      { name: "L corner", cells: [[0, 1], [0, 2], [0, 3], [1, 3]] },
      { name: "T piece", cells: [[1, 1], [2, 1], [3, 1], [2, 2]] },
      { name: "O block", cells: [[3, 2], [4, 2], [3, 3], [4, 3]] },
    ],
    { spare: { name: "Extra wave", cells: [[0, 0], [1, 0], [1, 1], [2, 1]] } },
  ),
  polyDef(
    "dw-spare-4", "Five of six",
    [
      { name: "L corner", cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
      { name: "T piece", cells: [[2, 0], [3, 0], [4, 0], [3, 1]] },
      { name: "S wave", cells: [[0, 2], [1, 2], [1, 3], [2, 3]] },
      { name: "O block", cells: [[3, 2], [4, 2], [3, 3], [4, 3]] },
    ],
    { spare: { name: "Extra T", cells: [[0, 0], [1, 0], [2, 0], [1, 1]] } },
  ),
  polyDef(
    "dw-spare-5", "Extra anchor",
    [
      { name: "I bar", cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
      { name: "O block", cells: [[1, 0], [2, 0], [1, 1], [2, 1]] },
      { name: "T piece", cells: [[1, 2], [2, 2], [3, 2], [2, 3]] },
      { name: "L corner", cells: [[3, 1], [4, 1], [4, 2], [4, 3]] },
    ],
    { spare: { name: "Extra square", cells: [[0, 0], [1, 0], [0, 1], [1, 1]] } },
  ),

  // Twist (5 Find-two-ways silhouettes — each proved to have >= 2 distinct exact covers!)
  polyDef(
    "dw-twoways-1", "Two-way reef",
    [
      { name: "L one", cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
      { name: "L two", cells: [[1, 0], [2, 0], [3, 0], [3, 1]] },
      { name: "O block", cells: [[0, 2], [1, 2], [0, 3], [1, 3]] },
      { name: "I bar", cells: [[2, 2], [3, 2], [4, 2], [5, 2]] },
    ],
    { twoWays: true },
  ),
  polyDef(
    "dw-twoways-2", "Twin harbor",
    [
      { name: "L one", cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
      { name: "L two", cells: [[1, 0], [2, 0], [3, 0], [3, 1]] },
      { name: "T piece", cells: [[1, 2], [2, 2], [3, 2], [2, 3]] },
      { name: "S wave", cells: [[0, 2], [0, 3], [1, 3], [1, 4]] },
    ],
    { twoWays: true },
  ),
  polyDef(
    "dw-twoways-3", "Double deck",
    [
      { name: "I one", cells: [[0, 0], [1, 0], [2, 0]] },
      { name: "I two", cells: [[0, 1], [1, 1], [2, 1]] },
      { name: "I three", cells: [[0, 2], [1, 2], [2, 2]] },
      { name: "L tail", cells: [[3, 1], [3, 2], [4, 2]] },
    ],
    { twoWays: true },
  ),
  polyDef(
    "dw-twoways-4", "Sandbar split",
    [
      { name: "L one", cells: [[0, 0], [1, 0], [0, 1]] },
      { name: "L two", cells: [[2, 0], [1, 1], [2, 1]] },
      { name: "L three", cells: [[0, 2], [1, 2], [0, 3]] },
      { name: "L four", cells: [[2, 2], [1, 3], [2, 3]] },
      { name: "I dock", cells: [[3, 1], [3, 2], [4, 2]] },
    ],
    { twoWays: true },
  ),
  polyDef(
    "dw-twoways-5", "Coral courtyard",
    [
      { name: "L one", cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
      { name: "L two", cells: [[1, 0], [2, 0], [3, 0], [3, 1]] },
      { name: "O one", cells: [[0, 2], [1, 2], [0, 3], [1, 3]] },
      { name: "O two", cells: [[2, 2], [3, 2], [2, 3], [3, 3]] },
    ],
    { twoWays: true },
  ),
];
