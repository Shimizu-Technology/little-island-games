import type { AwardRule, Puzzle, RegisteredDare } from "../../../challenge/types";
import { encodeShapeTuple, type ShapePackPayload } from "../../../puzzles/adapters/shape-shift";
import { sha256Hex } from "../../../puzzles/sha256";
import type { ShapeChallengeDescriptor } from "./challenge-engine";
import {
  INVALID_CUBE_NETS,
  VALID_CUBE_NETS,
  foldCubeNet,
  orientNet,
} from "./cubeNet";
import type { Cell } from "./legacy";
import { DEEP_POLY_DEFS, POLY_BLUEPRINTS, TANGRAM_SILHOUETTES } from "./silhouettes";
import { normalizeAtoms, solveExactCover } from "./solver";

/**
 * Shape Shift inline Challenge banks (inside T2's reserved 280–297 / dares 900–999):
 * - Bank 294: Deep Water (20 puzzles: 5 unique 5-piece, 5 spare-piece, 5 find-two-ways, 5 varied cube nets & fold checks)
 * - Bank 295: School Dares (16 puzzles: L2 Fewest turns [Par], L3 No gold corner [Blind], L4 First drop [Plan], L5 Fold [Whole])
 * - Bank 296: Tangram Showcase (12 hand-crafted 7-piece original Tangrams, inside Shape Shift Challenge!)
 * - Dares 940–955: School Dares (bank 295)
 * - Dares 956–975: Deep Water Dares (bank 294)
 * - Dares 976–987: Tangram Dares (bank 296)
 */
export const DEEP_BANK = 294;
export const SCHOOL_DARE_BANK = 295;
export const TANGRAM_BANK = 296;
export const FIRST_SCHOOL_DARE = 940;
export const FIRST_DEEP_DARE = 956;
export const FIRST_TANGRAM_DARE = 976;

const cleanAward: AwardRule = { rule: { kind: "clean" }, help: "independent" };
const wholeAward: AwardRule = { rule: { kind: "whole" }, help: "independent" };
const twoWaysAward: AwardRule = { rule: { kind: "two-ways" }, help: "allowed" };

function buildDeepPuzzles(): Puzzle<ShapeChallengeDescriptor>[] {
  const out: Puzzle<ShapeChallengeDescriptor>[] = [];
  let idx = 0;

  // 1. Teach (Tide 3, 5 puzzles): Free order 5-piece unique odd silhouettes
  for (const def of DEEP_POLY_DEFS.slice(0, 5)) {
    const payload: ShapePackPayload = {
      kind: "poly",
      name: def.name,
      width: def.width,
      height: def.height,
      silhouette: def.silhouette,
      pieces: def.pieces.map((p) => p.cells),
      allowRotate: true,
      allowFlip: true,
      uniqueRequired: true,
    };
    const title = `Five pieces · ${def.name}`;
    const dare: RegisteredDare = {
      slot: FIRST_DEEP_DARE + idx,
      id: `shape-dw-u-${idx}`,
      label: "First Check, no help",
      rule: { kind: "clean" },
      help: "independent",
    };
    out.push({
      ref: { bank: DEEP_BANK, puzzle: idx, engine: "shape-shift", rules: 1, hash: sha256Hex(JSON.stringify(encodeShapeTuple(payload))) },
      source: { kind: "deep-water", collection: DEEP_BANK, puzzle: idx },
      path: "deep-water",
      tier: 3,
      title,
      descriptor: { payload, title, outlineOnly: true },
      dares: [dare],
      awards: [cleanAward, null],
      par: { metric: "placements", lower: 5, upper: 5 },
    });
    idx++;
  }

  // 2. Develop (Tide 4, 5 puzzles): Spare piece not needed!
  for (const def of DEEP_POLY_DEFS.slice(5, 10)) {
    const payload: ShapePackPayload = {
      kind: "poly",
      name: def.name,
      width: def.width,
      height: def.height,
      silhouette: def.silhouette,
      pieces: def.pieces.map((p) => p.cells),
      allowRotate: true,
      allowFlip: true,
    };
    const title = `Spare piece · ${def.name}`;
    const dare: RegisteredDare = {
      slot: FIRST_DEEP_DARE + idx,
      id: `shape-dw-s-${idx}`,
      label: "First Check, no help",
      rule: { kind: "clean" },
      help: "independent",
    };
    out.push({
      ref: { bank: DEEP_BANK, puzzle: idx, engine: "shape-shift", rules: 1, hash: sha256Hex(JSON.stringify(encodeShapeTuple(payload))) },
      source: { kind: "deep-water", collection: DEEP_BANK, puzzle: idx },
      path: "deep-water",
      tier: 4,
      title,
      descriptor: { payload, title, outlineOnly: true, hint: "One piece in the tray is a spare and stays out." },
      dares: [dare],
      awards: [cleanAward, null],
      par: { metric: "placements", lower: def.pieces.length - 1, upper: def.pieces.length - 1 },
    });
    idx++;
  }

  // 3. Twist (Tide 5, 5 puzzles): Find two ways (proved >= 2 distinct exact covers!)
  for (const def of DEEP_POLY_DEFS.slice(10, 15)) {
    const payload: ShapePackPayload = {
      kind: "poly",
      name: def.name,
      width: def.width,
      height: def.height,
      silhouette: def.silhouette,
      pieces: def.pieces.map((p) => p.cells),
      allowRotate: true,
      allowFlip: true,
    };
    const title = `Find two ways · ${def.name}`;
    const dare: RegisteredDare = {
      slot: FIRST_DEEP_DARE + idx,
      id: `shape-dw-tw-${idx}`,
      label: "Find a second exact fill",
      rule: { kind: "two-ways" },
      help: "allowed",
    };
    out.push({
      ref: { bank: DEEP_BANK, puzzle: idx, engine: "shape-shift", rules: 1, hash: sha256Hex(JSON.stringify(encodeShapeTuple(payload))) },
      source: { kind: "deep-water", collection: DEEP_BANK, puzzle: idx },
      path: "deep-water",
      tier: 5,
      title,
      descriptor: { payload, title, outlineOnly: true, hint: "This outline has more than one exact fill — try finding a different tiling!" },
      dares: [dare],
      awards: [twoWaysAward, cleanAward],
      par: { metric: "placements", lower: def.pieces.length, upper: def.pieces.length },
    });
    idx++;
  }

  // 4. Hard (Tide 6, 5 puzzles): Varied cube nets (T-net D opp F, Zigzag A opp D, Lantern net, & 2 fold checks including ####/#.../#...)
  const tNet = VALID_CUBE_NETS[0]; // T-net: A B C top, D E F below B -> D (idx 3) opposite F (idx 5)!
  const tFold = foldCubeNet(tNet.cells);
  const zigNet = VALID_CUBE_NETS[9]; // Zigzag 2-2-2: A (idx 0) opposite D (idx 3)!
  const zigFold = foldCubeNet(zigNet.cells);
  const lanternNet = VALID_CUBE_NETS[7];
  const lanternFold = foldCubeNet(lanternNet.cells);

  const cubeSpecs: { title: string; payload: ShapePackPayload }[] = [
    {
      title: "Nets · T-shaped net",
      payload: {
        kind: "cube-opp",
        netName: tNet.name,
        cells: tNet.cells,
        faces: ["A", "B", "C", "D", "E", "F"],
        askIndex: 3,
        answer: ["A", "B", "C", "D", "E", "F"][tFold.opposites[3]],
      },
    },
    {
      title: "Nets · Zigzag net",
      payload: {
        kind: "cube-opp",
        netName: zigNet.name,
        cells: zigNet.cells,
        faces: ["A", "B", "C", "D", "E", "F"],
        askIndex: 0,
        answer: ["A", "B", "C", "D", "E", "F"][zigFold.opposites[0]],
      },
    },
    {
      title: "Nets · Which folds? (Long L trap)",
      payload: {
        kind: "cube-fold",
        options: [INVALID_CUBE_NETS[0].cells, orientNet(VALID_CUBE_NETS[6].cells, 1, false), INVALID_CUBE_NETS[1].cells],
        answerIndex: 1,
      },
    },
    {
      title: "Nets · Lantern fold",
      payload: {
        kind: "cube-opp",
        netName: lanternNet.name,
        cells: orientNet(lanternNet.cells, 1, false),
        faces: ["A", "B", "C", "D", "E", "F"],
        askIndex: 1,
        answer: ["A", "B", "C", "D", "E", "F"][lanternFold.opposites[1]],
      },
    },
    {
      title: "Nets · Which folds? (Bridge test)",
      payload: {
        kind: "cube-fold",
        options: [INVALID_CUBE_NETS[2].cells, INVALID_CUBE_NETS[4].cells, VALID_CUBE_NETS[10].cells],
        answerIndex: 2,
      },
    },
  ];

  for (const spec of cubeSpecs) {
    const dare: RegisteredDare = {
      slot: FIRST_DEEP_DARE + idx,
      id: `shape-dw-c-${idx}`,
      label: "Fold it in your head",
      rule: { kind: "whole" },
      help: "independent",
    };
    out.push({
      ref: { bank: DEEP_BANK, puzzle: idx, engine: "shape-shift", rules: 1, hash: sha256Hex(JSON.stringify(encodeShapeTuple(spec.payload))) },
      source: { kind: "deep-water", collection: DEEP_BANK, puzzle: idx },
      path: "deep-water",
      tier: 6,
      title: spec.title,
      descriptor: { payload: spec.payload, title: spec.title, outlineOnly: true },
      dares: [dare],
      awards: [wholeAward, null],
      par: { metric: "placements", lower: 1, upper: 1 },
    });
    idx++;
  }

  return out;
}

function buildSchoolDarePuzzles(): Puzzle<ShapeChallengeDescriptor>[] {
  const out: Puzzle<ShapeChallengeDescriptor>[] = [];
  let idx = 0;

  // Level 2: Fewest turns (Par on metric 'turns') — 4 blueprints
  for (let i = 0; i < 4; i++) {
    const bp = POLY_BLUEPRINTS[i];
    const pieces = [
      normalizeAtoms([...bp.parts[0].cells, ...bp.parts[1].cells]) as Cell[],
      normalizeAtoms([...bp.parts[2].cells, ...bp.parts[3].cells]) as Cell[],
    ];
    const silhouette = normalizeAtoms(bp.parts.flatMap((pt) => pt.cells)) as Cell[];
    const payload: ShapePackPayload = {
      kind: "poly",
      name: bp.name,
      width: bp.width,
      height: bp.height,
      silhouette,
      pieces,
      allowRotate: true,
      allowFlip: false,
    };
    const title = `Level 2 · ${bp.name}`;
    const dare: RegisteredDare = {
      slot: FIRST_SCHOOL_DARE + idx,
      id: `shape-l2-${idx}`,
      label: "Fewest turns (at most 4)",
      rule: { kind: "par", metric: "turns", max: 4 },
      help: "independent",
    };
    out.push({
      ref: { bank: SCHOOL_DARE_BANK, puzzle: idx, engine: "shape-shift", rules: 1, hash: sha256Hex(JSON.stringify(encodeShapeTuple(payload))) },
      source: { kind: "school", game: "shape-shift", level: 2, puzzle: `l2-${i + 1}` },
      path: "endless",
      tier: 2,
      title,
      descriptor: { payload, title, goldCornerDefault: true, outlineOnly: false },
      dares: [dare],
      awards: [{ rule: { kind: "par", metric: "turns", max: 4 }, help: "independent" }, null],
      par: { metric: "turns", lower: 0, upper: 4 },
    });
    idx++;
  }

  // Level 3: No gold corner (Blind) — 4 blueprints (3 pieces)
  for (let i = 0; i < 4; i++) {
    const bp = POLY_BLUEPRINTS[4 + i];
    const pieces = [
      normalizeAtoms([...bp.parts[0].cells, ...bp.parts[1].cells]) as Cell[],
      normalizeAtoms(bp.parts[2].cells) as Cell[],
      normalizeAtoms(bp.parts[3].cells) as Cell[],
    ];
    const silhouette = normalizeAtoms(bp.parts.flatMap((pt) => pt.cells)) as Cell[];
    const payload: ShapePackPayload = {
      kind: "poly",
      name: bp.name,
      width: bp.width,
      height: bp.height,
      silhouette,
      pieces,
      allowRotate: true,
      allowFlip: true,
    };
    const title = `Level 3 · ${bp.name}`;
    const dare: RegisteredDare = {
      slot: FIRST_SCHOOL_DARE + idx,
      id: `shape-l3-${idx}`,
      label: "No gold corner",
      rule: { kind: "blind" },
      help: "independent",
    };
    out.push({
      ref: { bank: SCHOOL_DARE_BANK, puzzle: idx, engine: "shape-shift", rules: 1, hash: sha256Hex(JSON.stringify(encodeShapeTuple(payload))) },
      source: { kind: "school", game: "shape-shift", level: 3, puzzle: `l3-${i + 1}` },
      path: "endless",
      tier: 3,
      title,
      descriptor: { payload, title, goldCornerDefault: true, outlineOnly: false },
      dares: [dare],
      awards: [{ rule: { kind: "blind" }, help: "independent" }, null],
      par: { metric: "placements", lower: 3, upper: 3 },
    });
    idx++;
  }

  // Level 4: First drop each piece (Plan max 1 — no wrong drops, solved on first Check!) — 4 blueprints (4 pieces, outline-only)
  for (let i = 0; i < 4; i++) {
    const bp = POLY_BLUEPRINTS[8 + i];
    const pieces = bp.parts.map((pt) => normalizeAtoms(pt.cells) as Cell[]);
    const silhouette = normalizeAtoms(bp.parts.flatMap((pt) => pt.cells)) as Cell[];
    const payload: ShapePackPayload = {
      kind: "poly",
      name: bp.name,
      width: bp.width,
      height: bp.height,
      silhouette,
      pieces,
      allowRotate: true,
      allowFlip: true,
    };
    const title = `Level 4 · ${bp.name}`;
    const dare: RegisteredDare = {
      slot: FIRST_SCHOOL_DARE + idx,
      id: `shape-l4-${idx}`,
      label: "First drop each piece",
      rule: { kind: "plan", max: 1 },
      help: "independent",
    };
    out.push({
      ref: { bank: SCHOOL_DARE_BANK, puzzle: idx, engine: "shape-shift", rules: 1, hash: sha256Hex(JSON.stringify(encodeShapeTuple(payload))) },
      source: { kind: "school", game: "shape-shift", level: 4, puzzle: `l4-${i + 1}` },
      path: "endless",
      tier: 4,
      title,
      descriptor: { payload, title, goldCornerDefault: false, outlineOnly: true },
      dares: [dare],
      awards: [{ rule: { kind: "plan", max: 1 }, help: "independent" }, null],
      par: { metric: "placements", lower: 4, upper: 4 },
    });
    idx++;
  }

  // Level 5: Fold it in your head (Whole) — 4 varied cube nets!
  const l5Nets = [VALID_CUBE_NETS[2], VALID_CUBE_NETS[4], VALID_CUBE_NETS[5], VALID_CUBE_NETS[8]];
  for (let i = 0; i < 4; i++) {
    const net = l5Nets[i];
    const cells = orientNet(net.cells, i, i % 2 === 1);
    const fold = foldCubeNet(cells);
    const faces = ["A", "B", "C", "D", "E", "F"];
    const askIndex = (i + 1) % 6;
    const payload: ShapePackPayload = {
      kind: "cube-opp",
      netName: net.name,
      cells,
      faces,
      askIndex,
      answer: faces[fold.opposites[askIndex]],
    };
    const title = `Level 5 · ${net.name}`;
    const dare: RegisteredDare = {
      slot: FIRST_SCHOOL_DARE + idx,
      id: `shape-l5-${idx}`,
      label: "Fold it in your head",
      rule: { kind: "whole" },
      help: "independent",
    };
    out.push({
      ref: { bank: SCHOOL_DARE_BANK, puzzle: idx, engine: "shape-shift", rules: 1, hash: sha256Hex(JSON.stringify(encodeShapeTuple(payload))) },
      source: { kind: "school", game: "shape-shift", level: 5, puzzle: `l5-${i + 1}` },
      path: "endless",
      tier: 5,
      title,
      descriptor: { payload, title, outlineOnly: true },
      dares: [dare],
      awards: [wholeAward, null],
      par: { metric: "placements", lower: 1, upper: 1 },
    });
    idx++;
  }

  return out;
}

function buildTangramShowcasePuzzles(): Puzzle<ShapeChallengeDescriptor>[] {
  const showcase = TANGRAM_SILHOUETTES.slice(0, 12);
  return showcase.map((def, idx) => {
    const payload: ShapePackPayload = {
      kind: "tangram",
      name: def.name,
      width: def.width,
      height: def.height,
      silhouette: def.silhouette,
      pieces: def.pieces.map((p) => p.baseCells),
      allowRotate: true,
      allowFlip: true,
    };
    const sols = solveExactCover(payload.silhouette, payload.pieces, { maxSolutions: 2 }).count;
    const isMulti = sols >= 2;
    const title = `Tangram · ${def.name}`;
    const dare: RegisteredDare = isMulti
      ? { slot: FIRST_TANGRAM_DARE + idx, id: `shape-tg-${idx}`, label: "Find two Tangram tilings", rule: { kind: "two-ways" }, help: "allowed" }
      : { slot: FIRST_TANGRAM_DARE + idx, id: `shape-tg-${idx}`, label: "First Check, no help", rule: { kind: "clean" }, help: "independent" };
    return {
      ref: { bank: TANGRAM_BANK, puzzle: idx, engine: "shape-shift", rules: 1, hash: sha256Hex(JSON.stringify(encodeShapeTuple(payload))) },
      source: { kind: "deep-water", collection: TANGRAM_BANK, puzzle: idx },
      path: "deep-water",
      tier: isMulti ? 5 : 4,
      title,
      descriptor: { payload, title, outlineOnly: true, hint: "Fit the two large triangles first, then build the smaller Tangram pieces around them." },
      dares: [dare],
      awards: [isMulti ? twoWaysAward : cleanAward, null],
      par: { metric: "placements", lower: def.pieces.length, upper: def.pieces.length },
    };
  });
}

export const shapeChallengePuzzles: readonly Puzzle<ShapeChallengeDescriptor>[] = [
  ...buildDeepPuzzles(),
  ...buildSchoolDarePuzzles(),
  ...buildTangramShowcasePuzzles(),
];
