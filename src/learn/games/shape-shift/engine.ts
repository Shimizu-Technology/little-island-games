import { levelOf } from "../../levelOptions";
import type { LearnEngine } from "../../types";
import { createRng } from "../../../puzzles/rng";
import { exactKeys, plain, uint } from "../../../state/saveBits";
import {
  INVALID_CUBE_NETS,
  VALID_CUBE_NETS,
  foldCubeNet,
  orientNet,
} from "./cubeNet";
import {
  chooseCube as legacyChooseCube,
  engine as legacyEngine,
  flip,
  help as legacyHelp,
  normalize,
  place as legacyPlace,
  rotate,
  sameCells,
  taskAt as legacyTaskAt,
  type Cell,
  type LegacyShapeState,
} from "./legacy";
import { POLY_BLUEPRINTS, TANGRAM_SILHOUETTES, type TangramPuzzleDef } from "./silhouettes";
import {
  atomKey,
  canPlaceAtoms,
  connectedGroups,
  flipAtoms,
  normalizeAtoms,
  rotateAtoms,
  solveExactCover,
  translateAtoms,
  validatePlacement,
  type Atom,
  type PlacedPiece,
  type TriCell,
} from "./solver";

export { flip, normalize, rotate, sameCells, type Cell };

export type PlacedRecord = {
  pieceIndex: number;
  /** Encoded orientation: turns (0..3) and mirrored (0|1) applied to piece's starting cells. */
  turns: 0 | 1 | 2 | 3;
  flipped: boolean;
  x: number;
  y: number;
};

export type ShapeStateV2 = {
  version: 2;
  level: number;
  seed: number;
  index: number;
  total: 4;
  /** Mode inside Shape Shift: classic island polyominoes or Tangram mode (SP-06, no new game entry!). */
  mode: "poly" | "tangram";
  /** Placed pieces on the current task (any order, any valid exact fill!). */
  placed: PlacedRecord[];
  helped: boolean;
  /** Optional revealed help piece index (gold corner or next-step clue). */
  hintPiece: number | null;
};

export type ShapeState = LegacyShapeState | ShapeStateV2;

export type ShapePiece = {
  name: string;
  /** Starting cells shown in the tray (pre-rotated/flipped per level). */
  cells: Atom[];
  /** Reference target cells from the blueprint (used ONLY for Level 1 gold corner / Help fallback). */
  target: Atom[];
  color: string;
};

export type CubeQuestion =
  | {
      kind: "opposite";
      netName: string;
      cells: Cell[];
      faces: string[];
      askIndex: number;
      answer: string;
    }
  | {
      kind: "which-folds";
      options: { id: string; name: string; cells: Cell[]; valid: boolean }[];
      answerIndex: number;
    };

export type ShapeTask = {
  kind: "poly" | "tangram" | "cube";
  pieces: ShapePiece[];
  silhouette: Atom[];
  picture: string;
  pictureId: string;
  width: number;
  height: number;
  title: string;
  hint: string;
  /** Whether the child can choose pieces in any order (true from Level 2+ and Tangram mode). */
  freeOrder: boolean;
  /** Whether a gold corner marks the selected piece's target (Level 1–2 only; removed at Level 3+ unless Help is tapped!). */
  showGoldCorner: boolean;
  /** Whether internal blueprint grid lines are hidden (true at Level 4+ and Tangram mode). */
  outlineOnly: boolean;
  allowRotate: boolean;
  allowFlip: boolean;
  cube?: CubeQuestion;
};

/** Apply (flipped, turns) to a piece's starting cells and normalize. */
export function transformPiece(base: readonly Atom[], turns: number, flipped: boolean): Atom[] {
  let out: Atom[] = base.map((a) => [...a] as Atom);
  if (flipped) out = flipAtoms(out);
  for (let t = 0; t < (turns & 3); t++) out = rotateAtoms(out);
  return normalizeAtoms(out);
}

export function placedToSolver(task: ShapeTask, records: readonly PlacedRecord[]): PlacedPiece[] {
  return records.map((r) => ({
    pieceIndex: r.pieceIndex,
    cells: transformPiece(task.pieces[r.pieceIndex].cells, r.turns, r.flipped),
    x: r.x,
    y: r.y,
  }));
}

function buildCubeTask(seed: number, whichFolds: boolean): ShapeTask {
  const rng = createRng((seed ^ 0x4c7b91) >>> 0);
  if (whichFolds) {
    const validIdx = rng.below(VALID_CUBE_NETS.length);
    const validTpl = VALID_CUBE_NETS[validIdx];
    const invalidPicks = rng.shuffle([...INVALID_CUBE_NETS]).slice(0, 2);
    const all = rng.shuffle([
      {
        id: validTpl.id,
        name: validTpl.name,
        cells: orientNet(validTpl.cells, rng.below(4), rng.below(2) === 1),
        valid: true,
      },
      ...invalidPicks.map((inv) => ({
        id: inv.id,
        name: inv.name,
        cells: orientNet(inv.cells, rng.below(4), rng.below(2) === 1),
        valid: false,
      })),
    ]);
    const answerIndex = all.findIndex((o) => o.valid);
    return {
      kind: "cube",
      pieces: [],
      silhouette: [],
      picture: "Cube net",
      pictureId: "cube-folds",
      width: 6,
      height: 6,
      title: "Which net folds into a cube?",
      hint: "Picture one square as the base and fold its neighbors up. A real cube net has no overlapping faces.",
      freeOrder: true,
      showGoldCorner: false,
      outlineOnly: true,
      allowRotate: false,
      allowFlip: false,
      cube: { kind: "which-folds", options: all, answerIndex },
    };
  }

  // Opposite-face question across ALL 11 varied cube nets, randomly rotated/flipped!
  const netTpl = VALID_CUBE_NETS[rng.below(VALID_CUBE_NETS.length)];
  const cells = orientNet(netTpl.cells, rng.below(4), rng.below(2) === 1);
  const folded = foldCubeNet(cells);
  const letters = ["A", "B", "C", "D", "E", "F"];
  const shift = rng.below(6);
  const faces = letters.map((_, i) => letters[(i + shift) % 6]);
  const askIndex = rng.below(6);
  const answer = faces[folded.opposites[askIndex]];
  return {
    kind: "cube",
    pieces: [],
    silhouette: [],
    picture: netTpl.name,
    pictureId: netTpl.id,
    width: Math.max(...cells.map((c) => c[0])) + 1,
    height: Math.max(...cells.map((c) => c[1])) + 1,
    title: "Fold the cube in your mind",
    hint: `Set ${faces[askIndex]} on the bottom and fold the neighbors up around it. Skip one face across the fold to find the top.`,
    freeOrder: true,
    showGoldCorner: false,
    outlineOnly: true,
    allowRotate: false,
    allowFlip: false,
    cube: { kind: "opposite", netName: netTpl.name, cells, faces, askIndex, answer },
  };
}

function buildTangramTask(level: number, seed: number, index: number): ShapeTask {
  const rng = createRng((seed ^ Math.imul(index + 1, 14533) ^ Math.imul(level, 8191)) >>> 0);
  // Levels 1-2 start with gentle 4-piece mini tangrams + Classic square; Levels 3-5 draw from all 14 full 7-piece Tangrams!
  const pool: readonly TangramPuzzleDef[] =
    level <= 1 ? TANGRAM_SILHOUETTES.slice(14) : level === 2 ? [TANGRAM_SILHOUETTES[0], ...TANGRAM_SILHOUETTES.slice(14), TANGRAM_SILHOUETTES[2]] : TANGRAM_SILHOUETTES.slice(0, 14);
  const def = pool[(index + rng.below(pool.length)) % pool.length];
  const allowRotate = level >= 2;
  const allowFlip = level >= 3;

  const nameCounts = new Map<string, number>();
  for (const p of def.pieces) nameCounts.set(p.name, (nameCounts.get(p.name) ?? 0) + 1);
  const nameSeen = new Map<string, number>();

  const pieces: ShapePiece[] = def.pieces.map((p) => {
    let cells: TriCell[] = normalizeAtoms(p.target) as TriCell[];
    if (allowFlip && rng.below(2) === 1) cells = flipAtoms(cells) as TriCell[];
    if (allowRotate) {
      const turns = 1 + rng.below(3);
      for (let t = 0; t < turns; t++) cells = rotateAtoms(cells) as TriCell[];
    }
    const n = (nameSeen.get(p.name) ?? 0) + 1;
    nameSeen.set(p.name, n);
    const label = (nameCounts.get(p.name) ?? 1) > 1 ? `${p.name} ${n}` : p.name;
    return {
      name: label,
      cells: normalizeAtoms(cells),
      target: p.target,
      color: p.color,
    };
  });

  return {
    kind: "tangram",
    pieces,
    silhouette: def.silhouette,
    picture: def.name,
    pictureId: def.id,
    width: def.width,
    height: def.height,
    title: `Tangram · ${def.name}`,
    hint: "Fit the big triangles into the widest part of the outline first, then tuck in the smaller pieces.",
    freeOrder: true,
    showGoldCorner: level === 1,
    outlineOnly: true,
    allowRotate,
    allowFlip,
  };
}

const taskCache = new Map<string, ShapeTask>();

export function taskAt(s: ShapeState): ShapeTask {
  if (s.version === 1) {
    const lt = legacyTaskAt(s);
    const silhouette = lt.pieces.flatMap((p) => p.target);
    return {
      kind: "poly",
      pieces: lt.pieces,
      silhouette,
      picture: lt.picture,
      pictureId: lt.picture.toLowerCase(),
      width: lt.width,
      height: lt.height,
      title: lt.title,
      hint: lt.hint,
      freeOrder: false,
      showGoldCorner: true,
      outlineOnly: false,
      allowRotate: s.level >= 2,
      allowFlip: s.level >= 3,
      ...(lt.cube
        ? {
            cube: {
              kind: "opposite" as const,
              netName: "Cross net",
              cells: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [1, 3]],
              faces: lt.cube.faces,
              askIndex: 2,
              answer: lt.cube.answer,
            },
          }
        : {}),
    };
  }

  const key = `${s.mode}:${s.level}:${s.seed}:${s.index}`;
  const hit = taskCache.get(key);
  if (hit) return hit;

  const taskSeed = (Math.imul(s.seed ^ 0x9e3779b9, 1664525) + Math.imul(s.index + 1, 11717) + s.level * 97) >>> 0;
  let task: ShapeTask;

  if (s.mode === "tangram") {
    task = buildTangramTask(s.level, s.seed, s.index);
  } else if (s.level === 5 && (s.index === 1 || s.index === 3)) {
    // Level 5 mixes outline-only 4-piece silhouettes (tasks 0, 2) with varied cube nets (task 1: opposite face, task 3: which folds!)
    task = buildCubeTask(taskSeed, s.index === 3);
  } else {
    const rng = createRng(taskSeed);
    // Spread across all 20 hand-crafted silhouettes deterministically without repeats in one 4-task round.
    const order = rng.shuffle(POLY_BLUEPRINTS.map((_, i) => i));
    const bp = POLY_BLUEPRINTS[order[(s.index + s.level * 3) % order.length]];
    const count = s.level === 1 ? 2 : s.level === 2 ? (s.index % 2 === 0 ? 2 : 3) : s.level === 3 ? 3 : 4;
    const groups = connectedGroups(bp.parts, count);

    const allowRotate = s.level >= 2;
    const allowFlip = s.level >= 3;
    const pieces: ShapePiece[] = groups.map((group) => {
      const target = group.flatMap((j) => bp.parts[j].cells);
      let cells: Atom[] = normalizeAtoms(target);
      if (allowFlip && rng.below(2) === 1) cells = flipAtoms(cells);
      if (allowRotate) {
        const turns = 1 + rng.below(3);
        for (let t = 0; t < turns; t++) cells = rotateAtoms(cells);
      }
      return {
        name: group.length > 1 ? group.map((j) => bp.parts[j].name).join(" + ") : bp.parts[group[0]].name,
        cells: normalizeAtoms(cells),
        target,
        color: bp.parts[group[0]].color,
      };
    });

    const silhouette = pieces.flatMap((p) => p.target);
    task = {
      kind: "poly",
      pieces,
      silhouette,
      picture: bp.name,
      pictureId: bp.id,
      width: bp.width,
      height: bp.height,
      title: `Build the ${bp.name.toLowerCase()}`,
      hint:
        s.level === 1
          ? "Move each piece to the gold corner until its outline fits."
          : s.level === 2
            ? "Pick any piece from the tray, turn it, and place it where every square fits inside the outline."
            : s.level === 3
              ? "Pick any piece, turn or flip it, and drop it into the open outline."
              : "Every square of the outline must be filled with no overlap. Any exact fill wins!",
      freeOrder: s.level >= 2,
      showGoldCorner: s.level <= 2,
      outlineOnly: s.level >= 4,
      allowRotate,
      allowFlip,
    };
  }

  taskCache.set(key, task);
  if (taskCache.size > 64) taskCache.delete(taskCache.keys().next().value!);
  return task;
}

/** Legacy helper kept exported for compatibility tests. */
export function fits(piece: { target: Cell[] }, cells: Cell[], x: number, y: number): boolean {
  return sameCells(normalize(cells).map(([a, b]) => [a + x, b + y]), piece.target);
}

/**
 * Pure placement rule (W0-06 + SC-08):
 * Places `pieceIndex` at the EXACT `(x, y)` dropped/tapped coordinate — NEVER snaps a wrong drop
 * into the target slot! Accepts ANY valid exact fill of the silhouette (not only hardcoded target coords!).
 */
export function place(
  s: ShapeState,
  pieceIndex: number,
  cells: Atom[],
  x: number,
  y: number,
  orientation?: { turns: 0 | 1 | 2 | 3; flipped: boolean },
): ShapeState {
  if (s.version === 1) return legacyPlace(s, pieceIndex, cells as Cell[], x, y);
  if (s.index >= s.total) return s;
  const task = taskAt(s);
  if (task.kind === "cube") return s;
  if (!Number.isInteger(pieceIndex) || pieceIndex < 0 || pieceIndex >= task.pieces.length) return s;
  if (s.placed.some((p) => p.pieceIndex === pieceIndex)) return s;
  if (!task.freeOrder && pieceIndex !== s.placed.length) return s;

  // Determine exact (turns, flipped) matching `cells` (respecting level's rotate/flip permissions)
  let turns: 0 | 1 | 2 | 3 = orientation?.turns ?? 0;
  let flipped = orientation?.flipped ?? false;
  const wantSig = normalizeAtoms(cells).map(atomKey).join(";");
  let matched = false;
  const flipOpts = task.allowFlip ? [false, true] : [false];
  const turnOpts: (0 | 1 | 2 | 3)[] = task.allowRotate ? [0, 1, 2, 3] : [0];
  for (const fl of flipOpts) {
    for (const tr of turnOpts) {
      const cand = transformPiece(task.pieces[pieceIndex].cells, tr, fl);
      if (cand.map(atomKey).join(";") === wantSig) {
        turns = tr;
        flipped = fl;
        matched = true;
        break;
      }
    }
    if (matched) break;
  }
  if (!matched) return s;

  const placedCells = transformPiece(task.pieces[pieceIndex].cells, turns, flipped);
  const silSet = new Set(task.silhouette.map(atomKey));
  const occupied = new Set<string>();
  for (const existing of placedToSolver(task, s.placed)) {
    for (const a of translateAtoms(existing.cells, existing.x, existing.y)) occupied.add(atomKey(a));
  }

  // TRUE DROP-WHERE-DROPPED CHECK: every atom at (x, y) must fit inside open silhouette cells!
  if (!canPlaceAtoms(silSet, occupied, placedCells, x, y)) return s;

  const nextPlaced: PlacedRecord[] = [...s.placed, { pieceIndex, turns, flipped, x, y }];
  const totalCovered = occupied.size + placedCells.length;
  if (totalCovered === silSet.size) {
    return { ...s, index: s.index + 1, placed: [], hintPiece: null };
  }
  return { ...s, placed: nextPlaced, hintPiece: null };
}

/** Lift a placed piece back to the tray (so the child can freely rearrange an alternative fill). */
export function removePlaced(s: ShapeState, pieceIndex: number): ShapeState {
  if (s.version === 1) return s;
  if (!s.placed.some((p) => p.pieceIndex === pieceIndex)) return s;
  return { ...s, placed: s.placed.filter((p) => p.pieceIndex !== pieceIndex), hintPiece: null };
}

/** Switch between Island Shapes and Tangram mode inside Shape Shift (SP-06). */
export function setMode(s: ShapeState, mode: "poly" | "tangram"): ShapeState {
  if (s.version === 1 || s.mode === mode) return s;
  return { ...s, mode, index: 0, placed: [], hintPiece: null };
}

export function chooseCube(s: ShapeState, answer: string | number): ShapeState {
  if (s.version === 1) return legacyChooseCube(s, String(answer));
  const task = taskAt(s);
  if (task.kind !== "cube" || !task.cube) return s;
  if (task.cube.kind === "opposite") {
    return String(answer) === task.cube.answer ? { ...s, index: s.index + 1, placed: [], hintPiece: null } : s;
  }
  return Number(answer) === task.cube.answerIndex ? { ...s, index: s.index + 1, placed: [], hintPiece: null } : s;
}

/**
 * Shared pure hint engine for Shape Shift:
 * Runs exact-cover search from the player's CURRENT placed pieces!
 * Returns a concrete valid next placement if completable, or advises lifting a blocking piece if dead-ended.
 */
export function shapeHint(s: ShapeState): {
  deadEnd: boolean;
  text: string;
  suggestion: PlacedPiece | null;
} {
  const task = taskAt(s);
  if (s.version === 1) {
    const p = task.pieces[s.placed.length];
    return { deadEnd: false, text: task.hint, suggestion: p ? { pieceIndex: s.placed.length, cells: normalizeAtoms(p.target), x: Math.min(...p.target.map((a) => a[0])), y: Math.min(...p.target.map((a) => a[1])) } : null };
  }
  if (task.kind === "cube" && task.cube) {
    if (task.cube.kind === "opposite") {
      return {
        deadEnd: false,
        text: `${task.hint} Face ${task.cube.answer} lands directly across from ${task.cube.faces[task.cube.askIndex]}.`,
        suggestion: null,
      };
    }
    return {
      deadEnd: false,
      text: `${task.hint} Try net ${task.cube.answerIndex + 1} (${task.cube.options[task.cube.answerIndex].name}).`,
      suggestion: null,
    };
  }

  const already = placedToSolver(task, s.placed);
  const res = solveExactCover(
    task.silhouette,
    task.pieces.map((p) => p.cells),
    { allowRotate: task.allowRotate, allowFlip: task.allowFlip, maxSolutions: 1, alreadyPlaced: already },
  );
  if (res.count === 0) {
    return {
      deadEnd: true,
      text: "The pieces placed so far block the remaining shapes. Tap a placed piece to lift it back and try another spot.",
      suggestion: null,
    };
  }
  const nextMove = !task.freeOrder
    ? res.solutions[0].find((pl) => pl.pieceIndex === s.placed.length) ?? null
    : res.solutions[0].find((pl) => !s.placed.some((r) => r.pieceIndex === pl.pieceIndex)) ?? null;
  if (!nextMove) return { deadEnd: false, text: task.hint, suggestion: null };
  const pieceName = task.pieces[nextMove.pieceIndex].name;
  return {
    deadEnd: false,
    text: `Try placing ${pieceName} near column ${nextMove.x + 1}, row ${nextMove.y + 1} (shown by the gold corner).`,
    suggestion: nextMove,
  };
}

export function help(s: ShapeState): ShapeState {
  if (s.version === 1) return legacyHelp(s);
  const h = shapeHint(s);
  return { ...s, helped: true, hintPiece: h.suggestion?.pieceIndex ?? null };
}

export const engine: LearnEngine<ShapeState> = {
  id: legacyEngine.id,
  name: legacyEngine.name,
  island: legacyEngine.island,
  ages: legacyEngine.ages,
  ownLevels: legacyEngine.ownLevels,
  tagline: legacyEngine.tagline,
  description: legacyEngine.description,
  color: legacyEngine.color,
  surface: legacyEngine.surface,
  modes: legacyEngine.modes,
  skills: legacyEngine.skills,
  levelNames: [
    { name: "Big pieces", description: "Fit two big pieces into the island outline." },
    { name: "Pick & turn", description: "Choose pieces in any order and turn them to fit." },
    { name: "No gold corner", description: "Turn and flip three pieces into the silhouette without a corner guide." },
    { name: "Outline only", description: "Fill full outlines with four pieces — any exact fill wins." },
    { name: "Fold & fit", description: "Solve varied cube nets, fold checks, and full silhouettes." },
  ],
  help: "Pick any piece from the tray. Tap Turn or Flip, then drag it onto the exact spot in the outline (or tap a square). Tap a placed piece to lift it back. Switch to Tangrams at the top anytime.",
  spokenIntro: "Fit the shapes into the island outline!",
  spokenHelp: "Pick any piece from the tray. Tap Turn or Flip, then drag it onto the exact spot in the outline, or tap a square. Tap a placed piece to lift it back.",
  create: (o, ctx): ShapeStateV2 => ({
    version: 2,
    level: levelOf(o),
    seed: Math.floor(ctx.rng() * 0xffffffff) >>> 0,
    index: 0,
    total: 4,
    mode: "poly",
    placed: [],
    helped: false,
    hintPiece: null,
  }),
  validate: (v, o): v is ShapeState => {
    if (!plain(v)) return false;
    if (v.version === 1) return legacyEngine.validate(v, o);
    if (!exactKeys(v, ["helped", "hintPiece", "index", "level", "mode", "placed", "seed", "total", "version"])) return false;
    const s = v as ShapeStateV2;
    if (
      s.version !== 2 ||
      s.level !== levelOf(o) ||
      s.total !== 4 ||
      !uint(s.seed, 0xffffffff) ||
      !uint(s.index, 4) ||
      (s.mode !== "poly" && s.mode !== "tangram") ||
      typeof s.helped !== "boolean" ||
      !(s.hintPiece === null || uint(s.hintPiece, 10)) ||
      !Array.isArray(s.placed)
    ) {
      return false;
    }
    if (s.index === 4) return s.placed.length === 0;
    const task = taskAt(s);
    if (task.kind === "cube") return s.placed.length === 0;
    for (const r of s.placed) {
      if (
        !plain(r) ||
        !exactKeys(r, ["flipped", "pieceIndex", "turns", "x", "y"]) ||
        !uint(r.pieceIndex, task.pieces.length - 1) ||
        !uint(r.turns, 3) ||
        typeof r.flipped !== "boolean" ||
        !Number.isInteger(r.x) || r.x < 0 || r.x > 12 ||
        !Number.isInteger(r.y) || r.y < 0 || r.y > 12
      ) {
        return false;
      }
    }
    const check = validatePlacement(
      task.silhouette,
      task.pieces.map((p) => p.cells),
      placedToSolver(task, s.placed),
      task.allowRotate,
      task.allowFlip,
    );
    return check.valid && !check.complete;
  },
  outcome: (s) => (s.index === 4 ? "done" : null),
};
