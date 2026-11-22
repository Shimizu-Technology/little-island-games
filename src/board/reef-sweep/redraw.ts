import { shuffle } from "../types";
import { neighbors, solvePublicNoGuess, type DeductionTier } from "./solver";

export const urchins = (n: number) => (n === 5 ? 3 : n === 6 ? 5 : 8);

/** Deterministic attempt cap for first-tap no-guess redraw. */
export const REDRAW_MAX_ATTEMPTS = 128;
/** Bounded per-candidate solver node budget so one candidate never stalls the device. */
export const REDRAW_NODE_BUDGET = 12_000;

export type PureRedrawResult =
  | { status: "found"; board: number[]; mines: number[]; attempt: number; ceiling: DeductionTier }
  | { status: "exhausted"; attempts: number };

/** Builds a full Reef Sweep board array (-1 for urchins, 0..8 for pearl counts) from sorted mine indices. */
export function boardFromMines(size: number, mines: readonly number[]): number[] {
  const count = size * size;
  const board = new Array<number>(count).fill(0);
  for (const m of mines) board[m] = -1;
  for (let i = 0; i < count; i++) {
    if (board[i] !== -1) board[i] = neighbors(size, i).filter((j) => board[j] === -1).length;
  }
  return board;
}

/** Extracts sorted mine indices from a Reef Sweep board array. */
export function minesFromBoard(board: readonly number[]): number[] {
  const mines: number[] = [];
  for (let i = 0; i < board.length; i++) if (board[i] === -1) mines.push(i);
  return mines;
}

/** Exact legacy Reef Sweep single-shuffle board generator (preserved for legacy paused rounds). */
export function legacyBoard(seed: number, size: number, firstCell: number): number[] {
  const count = size * size;
  const excluded = [firstCell, ...neighbors(size, firstCell)];
  const mines = shuffle(
    Array.from({ length: count }, (_, i) => i).filter((i) => !excluded.includes(i)),
    seed
  ).slice(0, urchins(size));
  return boardFromMines(size, mines);
}

/** Mixes (seed, firstCell, attempt) deterministically into a 32-bit LCG seed. */
export function redrawSeed(seed: number, firstCell: number, attempt: number): number {
  if (attempt === 0) return seed >>> 0;
  let h = (seed ^ Math.imul(firstCell + 1, 0x9e3779b1) ^ Math.imul(attempt, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Candidate sorted mine indices for `(seed, size, firstCell, attempt)`, keeping `firstCell` and neighbors safe. */
export function candidateMines(
  seed: number,
  size: number,
  firstCell: number,
  attempt: number,
  mineCount: number = urchins(size)
): number[] {
  const count = size * size;
  const excluded = new Set([firstCell, ...neighbors(size, firstCell)]);
  const pool = Array.from({ length: count }, (_, i) => i).filter((i) => !excluded.has(i));
  return shuffle(pool, redrawSeed(seed, firstCell, attempt))
    .slice(0, mineCount)
    .sort((a, b) => a - b);
}

/**
 * Deterministic bounded first-tap no-guess redraw.
 * Preserves the player's exact `firstCell` and proves zero-guess solvability via `solvePublicNoGuess`.
 */
export function redrawBoard(
  seed: number,
  size: number,
  firstCell: number,
  options: { maxAttempts?: number; nodeBudget?: number; mineCount?: number } = {}
): PureRedrawResult {
  const maxAttempts = options.maxAttempts ?? REDRAW_MAX_ATTEMPTS;
  const nodeBudget = options.nodeBudget ?? REDRAW_NODE_BUDGET;
  const mineCount = options.mineCount ?? urchins(size);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const mines = candidateMines(seed, size, firstCell, attempt, mineCount);
    const board = boardFromMines(size, mines);
    const solved = solvePublicNoGuess(board, size, firstCell, { nodeBudget });
    if (solved.status === "solved") {
      return { status: "found", board, mines, attempt, ceiling: solved.ceiling };
    }
  }
  return { status: "exhausted", attempts: maxAttempts };
}
