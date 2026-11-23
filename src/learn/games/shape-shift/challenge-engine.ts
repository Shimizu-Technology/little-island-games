import type { ReplayEngine, ReplayPayload } from "../../../challenge/types";
import {
  isShapeSolved,
  shapeShiftAdapter,
  type ShapePackPayload,
} from "../../../puzzles/adapters/shape-shift";
import { sha256Hex } from "../../../puzzles/sha256";
import { uint } from "../../../state/saveBits";
import {
  atomKey,
  canPlaceAtoms,
  canonicalTilingHash,
  normalizeAtoms,
  solveExactCover,
  translateAtoms,
  uniqueOrientations,
  type PlacedPiece,
} from "./solver";

export type ShapeChallengeDescriptor = {
  payload: ShapePackPayload;
  title: string;
  /** True when the puzzle's default mode offers a gold corner unless `supportOff` (Blind dare) hides it. */
  goldCornerDefault?: boolean;
  /** True when internal grid lines are hidden (Level 4+, Deep Water, Tangrams). */
  outlineOnly?: boolean;
  /** Optional hint copy. */
  hint?: string;
};

/**
 * Compact replay actions for Shape Shift Challenge:
 * - `['p', pieceIndex, orientIndex, x, y, turnsUsed]` — place piece at exact (x, y) (records turnsUsed for L2 Par dare!)
 * - `['r', pieceIndex]` — lift placed piece back to tray
 * - `['m']` — record a missed drop (wrong spot) so Plan ("First drop each piece") detects wrong drops honestly!
 * - `['c']` — whole-answer Check
 * - `['k', choiceIdx]` — pick cube face or fold-net option
 * - `['z']` — reset draft
 * - `['h']` — Help ladder step (Look -> Think / reveal answer; bounded so saturated Help never fills the log)
 * - `['s', pieceIndex, orientIndex, x, y]` — hinted One-step placement (records help!)
 * - `['x']` / `['x', pieceIndex]` — assisted clear of a dead-end board or lift of one placed piece (records help and fits inside the assistance reserve)
 * - `['a', choiceIdx]` — assisted cube face/net selection after Help (records help and fits inside the assistance reserve)
 */
export type Action =
  | readonly ["p", number, number, number, number, number]
  | readonly ["r", number]
  | readonly ["m"]
  | readonly ["c"]
  | readonly ["k", number]
  | readonly ["z"]
  | readonly ["h"]
  | readonly ["s", number, number, number, number]
  | readonly ["x"]
  | readonly ["x", number]
  | readonly ["a", number];

export type Initial = 0;
export type Payload = ReplayPayload<Initial, Action>;

export type State = {
  descriptor: ShapeChallengeDescriptor;
  supportOff: boolean;
  placed: PlacedPiece[];
  cubePick: number | null;
  turns: number;
  placements: number;
  misses: number;
  hintStage: number;
  checked: boolean;
  won: boolean;
  lastFeedback: string | null;
};

// Worst-case recovery reserve: 1st miss (1) + 2 Help steps (2) + assisted clear (1) + up to 7 Tangram placements (7) + Check (1) + terminal result payload (~260 B) <= 16 actions / 600 bytes.
export const ASSIST_ACTIONS = 16;
export const ASSIST_BYTES = 600;
export const isHelpAction = (a: Action): boolean => a[0] === "h" || a[0] === "s" || a[0] === "x" || a[0] === "a";

export function isAction(v: unknown): v is Action {
  if (!Array.isArray(v) || v.length === 0) return false;
  const tag = v[0];
  if (tag === "m" || tag === "c" || tag === "z" || tag === "h") return v.length === 1;
  if (tag === "x") return v.length === 1 || (v.length === 2 && uint(v[1], 7));
  if (tag === "r") return v.length === 2 && uint(v[1], 7);
  if (tag === "k" || tag === "a") return v.length === 2 && uint(v[1], 5);
  if (tag === "p") return v.length === 6 && uint(v[1], 7) && uint(v[2], 7) && uint(v[3], 12) && uint(v[4], 12) && uint(v[5], 12);
  if (tag === "s") return v.length === 5 && uint(v[1], 7) && uint(v[2], 7) && uint(v[3], 12) && uint(v[4], 12);
  return false;
}

export function completeShapeDraft(s: State): boolean {
  const p = s.descriptor.payload;
  if (p.kind === "cube-opp" || p.kind === "cube-fold") return s.cubePick !== null;
  const silSet = new Set(p.silhouette.map(atomKey));
  let covered = 0;
  for (const pl of s.placed) covered += pl.cells.length;
  return covered === silSet.size;
}

/** Shared pure hint engine for Shape Shift Challenge (calls exact-cover solver from current draft!). */
export function challengeShapeHint(s: State): {
  text: string;
  deadEnd: boolean;
  nextPlacement: readonly [number, number, number, number] | null;
  nextCubePick: number | null;
} {
  const p = s.descriptor.payload;
  if (p.kind === "cube-opp") {
    const face = p.faces[p.askIndex];
    const correctIdx = p.faces.indexOf(p.answer);
    const nextCubePick = correctIdx >= 0 && s.cubePick !== correctIdx ? correctIdx : null;
    if (s.hintStage <= 1) return { text: `Picture ${face} resting flat on the table and fold its touching squares straight up.`, deadEnd: false, nextPlacement: null, nextCubePick };
    return { text: `Across the folded cube from ${face}, the opposite face is ${p.answer}.`, deadEnd: false, nextPlacement: null, nextCubePick };
  }
  if (p.kind === "cube-fold") {
    const nextCubePick = s.cubePick !== p.answerIndex ? p.answerIndex : null;
    if (s.hintStage <= 1) return { text: "Check if any two squares fold onto the same side of the cube. A valid net covers all 6 sides with no overlap.", deadEnd: false, nextPlacement: null, nextCubePick };
    return { text: `Net ${p.answerIndex + 1} folds into a closed cube with all 6 sides covered.`, deadEnd: false, nextPlacement: null, nextCubePick };
  }

  const res = solveExactCover(p.silhouette, p.pieces, {
    allowRotate: p.allowRotate,
    allowFlip: p.allowFlip,
    maxSolutions: 1,
    alreadyPlaced: s.placed,
  });
  if (res.count === 0) {
    return {
      text: "The placed pieces leave a gap no remaining piece can fill. Tap Clear dead end or tap a placed piece to lift it back.",
      deadEnd: true,
      nextPlacement: null,
      nextCubePick: null,
    };
  }
  const next = res.solutions[0].find((pl) => !s.placed.some((e) => e.pieceIndex === pl.pieceIndex));
  if (!next) {
    return { text: "Every square is covered! Tap Check to finish.", deadEnd: false, nextPlacement: null, nextCubePick: null };
  }
  const orients = uniqueOrientations(p.pieces[next.pieceIndex], p.allowRotate, p.allowFlip);
  const sig = normalizeAtoms(next.cells).map(atomKey).join(";");
  const oIdx = Math.max(0, orients.findIndex((o) => o.map(atomKey).join(";") === sig));

  if (s.hintStage <= 1) {
    return {
      text: `Look at piece ${next.pieceIndex + 1}: it fits snugly around column ${next.x + 1}, row ${next.y + 1}.`,
      deadEnd: false,
      nextPlacement: [next.pieceIndex, oIdx, next.x, next.y],
      nextCubePick: null,
    };
  }
  return {
    text: `Turn or flip piece ${next.pieceIndex + 1} to match the outline at column ${next.x + 1}, row ${next.y + 1}, or tap One step.`,
    deadEnd: false,
    nextPlacement: [next.pieceIndex, oIdx, next.x, next.y],
    nextCubePick: null,
  };
}

export const challengeEngine: ReplayEngine<ShapeChallengeDescriptor, Initial, Action, State> = {
  initial: () => 0,
  validInitial: (v): v is Initial => v === 0,
  create: (d, _init, options) => ({
    descriptor: d,
    supportOff: options.supportOff,
    placed: [],
    cubePick: null,
    turns: 0,
    placements: 0,
    misses: 0,
    hintStage: 0,
    checked: false,
    won: false,
    lastFeedback: null,
  }),
  validAction: isAction,
  step: (s, a, d) => {
    if (s.won) return null;
    const p = d.payload;

    if (a[0] === "h") {
      if (s.hintStage >= 2) return null;
      return {
        state: { ...s, hintStage: s.hintStage + 1 },
        event: "help",
      };
    }

    if (a[0] === "z") {
      if (s.placed.length === 0 && s.cubePick === null) return null;
      return {
        state: { ...s, placed: [], cubePick: null, checked: false, lastFeedback: null },
        event: "reset",
      };
    }

    if (a[0] === "x") {
      if ((p.kind !== "poly" && p.kind !== "tangram") || s.placed.length === 0) return null;
      if (a.length === 2) {
        const idx = a[1];
        if (!s.placed.some((pl) => pl.pieceIndex === idx)) return null;
        return {
          state: { ...s, placed: s.placed.filter((pl) => pl.pieceIndex !== idx), checked: false, lastFeedback: null },
          event: "help",
        };
      }
      return {
        state: { ...s, placed: [], checked: false, lastFeedback: null },
        event: "help",
      };
    }

    if (a[0] === "m") {
      // First wrong drop emits a failed run (locking monotonic failed evidence for Plan/Clean dares);
      // further misses stay ordinary edits so repeated misses cannot spend the completion/assistance reserve.
      const nextState = {
        ...s,
        misses: s.misses + 1,
        lastFeedback: "It did not fit at that spot. Try another square, turn, or flip!",
      };
      if (s.misses === 0) {
        return { state: nextState, event: "run", correct: false };
      }
      return { state: nextState, event: "edit" };
    }

    if (a[0] === "k" || a[0] === "a") {
      if (p.kind !== "cube-opp" && p.kind !== "cube-fold") return null;
      const idx = a[1];
      if (p.kind === "cube-opp" && (idx > 5 || idx === p.askIndex)) return null;
      if (p.kind === "cube-fold" && idx > 2) return null;
      if (s.cubePick === idx) return null;
      return {
        state: { ...s, cubePick: idx, checked: false, lastFeedback: null },
        event: a[0] === "a" ? "help" : "edit",
      };
    }

    if (a[0] === "c") {
      if (!completeShapeDraft(s) || s.checked) return null;
      const adapterState =
        p.kind === "cube-opp" || p.kind === "cube-fold"
          ? ({ kind: "cube", pick: s.cubePick } as const)
          : ({ kind: "fit", placed: s.placed } as const);
      const ok = isShapeSolved(adapterState, p);
      return {
        state: {
          ...s,
          misses: s.misses + (ok ? 0 : 1),
          checked: !ok,
          won: ok,
          lastFeedback: ok ? null : p.kind === "cube-opp" ? "That face touches the highlighted square. Try another face!" : "Not quite — try a different choice!",
        },
        event: "check",
        correct: ok,
      };
    }

    if (p.kind !== "poly" && p.kind !== "tangram") return null;

    if (a[0] === "r") {
      const idx = a[1];
      if (!s.placed.some((pl) => pl.pieceIndex === idx)) return null;
      return {
        state: { ...s, placed: s.placed.filter((pl) => pl.pieceIndex !== idx), checked: false, lastFeedback: null },
        event: "edit",
      };
    }

    // Placement ('p' ordinary or 's' hinted one-step)
    const isHinted = a[0] === "s";
    const pIdx = a[1], oIdx = a[2], x = a[3], y = a[4];
    const turnsUsed = a[0] === "p" ? a[5] : 0;
    if (pIdx >= p.pieces.length || s.placed.some((pl) => pl.pieceIndex === pIdx)) return null;
    const orients = uniqueOrientations(p.pieces[pIdx], p.allowRotate, p.allowFlip);
    if (oIdx >= orients.length) return null;
    const cells = orients[oIdx];
    const silSet = new Set(p.silhouette.map(atomKey));
    const occ = new Set<string>();
    for (const pl of s.placed) for (const at of translateAtoms(normalizeAtoms(pl.cells), pl.x, pl.y)) occ.add(atomKey(at));
    if (!canPlaceAtoms(silSet, occ, cells, x, y)) return null;

    const placed = [...s.placed, { pieceIndex: pIdx, cells, x, y }];
    return {
      state: {
        ...s,
        placed,
        turns: s.turns + turnsUsed,
        placements: s.placements + 1,
        checked: false,
        lastFeedback: null,
      },
      event: isHinted ? "help" : "edit",
    };
  },
  inspect: (s, d) => {
    const p = d.payload;
    let solution: string | null = null;
    if (s.won) {
      if (p.kind === "poly" || p.kind === "tangram") {
        // Canonical board partition hash so Two Ways dares prove genuinely different tilings!
        solution = canonicalTilingHash(s.placed);
      } else {
        solution = sha256Hex(`shape-cube|${p.kind}|${s.cubePick}`);
      }
    }
    return {
      solved: s.won,
      metrics: { placements: s.placements, turns: s.turns },
      edits: s.placements,
      solution,
      objectives: [],
    };
  },
};

export { shapeShiftAdapter };
