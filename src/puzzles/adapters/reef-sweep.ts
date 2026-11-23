import { boardFromMines, urchins } from "../../board/reef-sweep/redraw";
import {
  deducePublic,
  exactMinOpenings,
  findCounterfactualTwins,
  neighbors,
  publicView,
  revealCell,
  solvePublicNoGuess,
} from "../../board/reef-sweep/solver";
import { exactKeys, plain, uint } from "../../state/saveBits";
import { smallest, squareSymmetries } from "../semantic";
import type { Claim, DescriptorCore, HiddenTwin, PuzzleAdapter, SolveResult, TechniqueResult } from "../types";

/**
 * Pack tuple: [size, start, mines] where `start` is the shown safe opening cell
 * and `mines` is a sorted list of urchin cell indices outside `{start} U neighbors(start)`.
 */
export type ReefPayload = {
  size: number;
  start: number;
  mines: number[];
};

/** Public board state only (no hidden mine locations). */
export type ReefState = {
  marks: number[];
  outcome: 0 | 1 | null;
};

/** 0..size*size-1 opens a cell. */
export type ReefAction = number;

type D = DescriptorCore<ReefPayload>;

function validPayload(x: unknown): x is ReefPayload {
  if (!plain(x) || !exactKeys(x, ["size", "start", "mines"])) return false;
  if (![5, 6, 7].includes(x.size as number)) return false;
  const size = x.size as number;
  const count = size * size;
  if (!uint(x.start, count - 1) || !Array.isArray(x.mines) || x.mines.length !== urchins(size)) return false;
  const excluded = new Set([x.start as number, ...neighbors(size, x.start as number)]);
  let prev = -1;
  for (const m of x.mines) {
    if (!uint(m, count - 1) || (m as number) <= prev || excluded.has(m as number)) return false;
    prev = m as number;
  }
  return true;
}

const create = (d: D): ReefState => ({
  marks: Array<number>(d.payload.size * d.payload.size).fill(0),
  outcome: null,
});

function validState(x: unknown, d: D): x is ReefState {
  if (!plain(x) || !exactKeys(x, ["marks", "outcome"])) return false;
  const size = d.payload.size;
  const count = size * size;
  if (!Array.isArray(x.marks) || x.marks.length !== count) return false;
  if (!x.marks.every((m) => m === 0 || m === 1 || m === 2)) return false;
  if (x.outcome !== null && x.outcome !== 0 && x.outcome !== 1) return false;
  const marks = x.marks as number[];
  const board = boardFromMines(size, d.payload.mines);
  const hitMine = marks.some((m, i) => m === 1 && board[i] === -1);
  const allSafeOpen = board.every((v, i) => v === -1 || marks[i] === 1);
  if (hitMine && x.outcome !== 1) return false;
  if (!hitMine && allSafeOpen && x.outcome !== 0) return false;
  if (!hitMine && !allSafeOpen && x.outcome !== null) return false;
  return true;
}

function reduce(s: ReefState, a: ReefAction, d: D): ReefState {
  const { size, start, mines } = d.payload;
  const count = size * size;
  if (s.outcome !== null || !uint(a, count - 1)) return s;
  if (s.marks[a] !== 0) return s;
  const unopened = !s.marks.includes(1);
  if (unopened && a !== start) return s;
  const board = boardFromMines(size, mines);
  const marks = revealCell(board, size, s.marks, a);
  const hitMine = board[a] === -1;
  const won = !hitMine && board.every((v, i) => v === -1 || marks[i] === 1);
  return { marks, outcome: hitMine ? 1 : won ? 0 : null };
}

function actions(s: ReefState, d: D): ReefAction[] {
  if (s.outcome !== null) return [];
  if (!s.marks.includes(1)) return s.marks[d.payload.start] === 0 ? [d.payload.start] : [];
  const out: number[] = [];
  for (let i = 0; i < s.marks.length; i++) if (s.marks[i] === 0) out.push(i);
  return out;
}

function solve(d: D, budget: number): SolveResult<ReefAction> {
  const { size, start, mines } = d.payload;
  const board = boardFromMines(size, mines);
  const res = solvePublicNoGuess(board, size, start, { nodeBudget: budget });
  if (res.status === "budget-exhausted") return { status: "budget-exhausted", nodes: res.nodes };
  if (res.status === "stalled") return { status: "unsolved" };
  const lower = exactMinOpenings(board, size);
  const upper = res.opens.length;
  return { status: "solved", witness: res.opens, metric: "steps", lower, upper, exact: lower === upper };
}

function technique(d: D, budget: number): TechniqueResult {
  const { size, start, mines } = d.payload;
  const board = boardFromMines(size, mines);
  const res = solvePublicNoGuess(board, size, start, { nodeBudget: budget });
  if (res.status !== "solved") return { status: "stalled" };
  return { status: "complete", ceiling: res.ceiling, steps: res.steps, trace: res.trace };
}

function hint(s: ReefState, d: D): ReefAction | null {
  if (s.outcome !== null) return null;
  if (!s.marks.includes(1)) return s.marks[d.payload.start] === 0 ? d.payload.start : null;
  const board = boardFromMines(d.payload.size, d.payload.mines);
  const view = publicView(d.payload.size, d.payload.mines.length, board, s.marks);
  const res = deducePublic(view);
  return res.status === "deduced" && res.step.kind === "open" ? res.step.cell : null;
}

function semanticKey(d: D): string {
  const { size, start, mines } = d.payload;
  return smallest(
    squareSymmetries(size).map((map) => {
      const s = map[start];
      const m = mines.map((c) => map[c]).sort((a, b) => a - b);
      return `${size}:${s}:${m.join(",")}`;
    })
  );
}

function claims(d: D, budget: number): Claim[] {
  const { size, start, mines } = d.payload;
  const board = boardFromMines(size, mines);
  if (d.band === "single-5" || d.band === "single-6") {
    const single = solvePublicNoGuess(board, size, start, { maxTier: "single-cell", nodeBudget: budget });
    return [
      {
        id: "no-guess-single",
        proven: single.status === "solved",
        evidence: single.status === "solved" ? `steps:${single.steps}` : single.status,
      },
    ];
  }
  if (d.band === "subset-7") {
    const single = solvePublicNoGuess(board, size, start, { maxTier: "single-cell", nodeBudget: budget });
    const sub = solvePublicNoGuess(board, size, start, { maxTier: "subset", nodeBudget: budget });
    return [
      {
        id: "needs-subset",
        proven: single.status === "stalled",
        evidence: single.status === "stalled" ? `single-stalled:${single.revealed}` : single.status,
      },
      {
        id: "no-guess-subset",
        proven: sub.status === "solved" && sub.ceiling === "subset",
        evidence: sub.status === "solved" ? `subset-steps:${sub.tierCounts.subset}` : sub.status,
      },
    ];
  }
  if (d.band === "coupled-7") {
    const sub = solvePublicNoGuess(board, size, start, { maxTier: "subset", nodeBudget: budget });
    const full = solvePublicNoGuess(board, size, start, { maxTier: "coupled", nodeBudget: budget });
    return [
      {
        id: "needs-coupled",
        proven: sub.status === "stalled",
        evidence: sub.status === "stalled" ? `subset-stalled:${sub.revealed}` : sub.status,
      },
      {
        id: "no-guess-coupled",
        proven: full.status === "solved" && full.ceiling === "coupled",
        evidence: full.status === "solved" ? `coupled-steps:${full.tierCounts.coupled}` : full.status,
      },
    ];
  }
  return [];
}

function hiddenView(s: ReefState, d: D) {
  const board = boardFromMines(d.payload.size, d.payload.mines);
  return {
    ...publicView(d.payload.size, d.payload.mines.length, board, s.marks),
    start: d.payload.start,
    outcome: s.outcome,
  };
}

function hiddenTwins(s: ReefState, d: D): HiddenTwin<ReefPayload, ReefState>[] {
  if (s.outcome !== null) return [];
  const board = boardFromMines(d.payload.size, d.payload.mines);
  const view = publicView(d.payload.size, d.payload.mines.length, board, s.marks);
  const twins = findCounterfactualTwins(view, d.payload.mines, d.payload.start, 2, 6000);
  return twins.map((mines) => ({
    state: { marks: [...s.marks], outcome: s.outcome },
    descriptor: {
      ...d,
      payload: { size: d.payload.size, start: d.payload.start, mines },
    },
  }));
}

/**
 * Hidden-information Reef Sweep adapter.
 * Deliberately omits `progress` because greedy bots evaluate `reduce(s, a)` on every untried cell,
 * which would leak hidden mine outcomes. Hints and solver use strictly public visible counts.
 */
export const reefSweepAdapter: PuzzleAdapter<ReefPayload, ReefState, ReefAction> = {
  engine: "reef-sweep",
  rules: 1,
  needsCheck: false,
  isPayload: validPayload,
  isAction: (x): x is ReefAction => Number.isInteger(x) && (x as number) >= 0 && (x as number) < 49,
  encodePayload: (p) => [p.size, p.start, p.mines],
  decodePayload: (x) => {
    if (!Array.isArray(x) || x.length !== 3 || !Number.isInteger(x[0]) || !Number.isInteger(x[1]) || !Array.isArray(x[2])) {
      return null;
    }
    const candidate = { size: x[0] as number, start: x[1] as number, mines: x[2] as number[] };
    return validPayload(candidate) ? candidate : null;
  },
  create,
  validState,
  reduce,
  actions,
  solved: (s) => s.outcome === 0,
  metrics: (_, acts) => ({ steps: acts.length }),
  solve,
  semanticKey,
  hint,
  hidden: {
    view: hiddenView,
    twins: hiddenTwins,
  },
  technique,
  claims,
};
