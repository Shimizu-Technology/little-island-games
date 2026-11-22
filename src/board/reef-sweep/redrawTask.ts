import {
  boardFromMines,
  candidateMines,
  REDRAW_MAX_ATTEMPTS,
  REDRAW_NODE_BUDGET,
  urchins,
} from "./redraw";
import { solvePublicNoGuess, type DeductionTier } from "./solver";

/** Time-slice yield cadence (ms) when running off the frame callback. */
export const REDRAW_SLICE_MS = 8;
/** Overall wall-clock budget (ms) for on-device async redraw before asking to use a certified fallback. */
export const REDRAW_BUDGET_MS = 250;

export type RedrawCancel = { cancelled: boolean };

export type RedrawResult =
  | { status: "found"; board: number[]; mines: number[]; attempt: number; ceiling: DeductionTier; durationMs: number }
  | { status: "exhausted"; attempts: number; durationMs: number }
  | { status: "cancelled"; attempts: number; durationMs: number };

const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const nextTurn = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Sliced, cancellable async first-tap no-guess redraw.
 * Lives outside pure engine/save imports so no reading route can reach a clock or timer.
 * Never blocks a UI frame callback: yields after `sliceMs` (default 8 ms) and stops cleanly
 * if cancelled, if `maxAttempts` is reached, or if `budgetMs` passes.
 */
export async function redrawBoardTask(
  seed: number,
  size: number,
  firstCell: number,
  cancel: RedrawCancel,
  options: {
    maxAttempts?: number;
    nodeBudget?: number;
    mineCount?: number;
    sliceMs?: number;
    budgetMs?: number;
    yieldTurn?: () => Promise<void>;
    now?: () => number;
  } = {}
): Promise<RedrawResult> {
  const maxAttempts = options.maxAttempts ?? REDRAW_MAX_ATTEMPTS;
  const nodeBudget = options.nodeBudget ?? REDRAW_NODE_BUDGET;
  const mineCount = options.mineCount ?? urchins(size);
  const sliceMs = options.sliceMs ?? REDRAW_SLICE_MS;
  const budgetMs = options.budgetMs ?? REDRAW_BUDGET_MS;
  const pause = options.yieldTurn ?? nextTurn;
  const clock = options.now ?? nowMs;

  const started = clock();
  let sliceStart = started;

  // Yield once before heavy work so the tap callback returns immediately on the current frame.
  await pause();
  if (cancel.cancelled) return { status: "cancelled", attempts: 0, durationMs: clock() - started };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (cancel.cancelled) return { status: "cancelled", attempts: attempt, durationMs: clock() - started };
    const spent = clock() - started;
    if (spent >= budgetMs) return { status: "exhausted", attempts: attempt, durationMs: spent };

    const mines = candidateMines(seed, size, firstCell, attempt, mineCount);
    const board = boardFromMines(size, mines);
    const solved = solvePublicNoGuess(board, size, firstCell, { nodeBudget });
    if (solved.status === "solved") {
      return { status: "found", board, mines, attempt, ceiling: solved.ceiling, durationMs: clock() - started };
    }

    if (clock() - sliceStart >= sliceMs) {
      await pause();
      sliceStart = clock();
    }
  }
  return { status: "exhausted", attempts: maxAttempts, durationMs: clock() - started };
}
