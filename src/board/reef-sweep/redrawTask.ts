import {
  boardFromMines,
  candidateMines,
  REDRAW_MAX_ATTEMPTS,
  REDRAW_NODE_BUDGET,
  urchins,
} from "./redraw";
import { createPublicSolve, stepPublicSolve, type DeductionTier } from "./solver";

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
 * Never blocks a UI frame callback: steps candidate solves incrementally, yields within
 * `sliceMs` (default 8 ms), checks cancellation and `budgetMs` mid-candidate and before
 * returning `found`, and stops cleanly without silently moving the tap.
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

  const shouldStop = () => cancel.cancelled || clock() - started >= budgetMs;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (cancel.cancelled) return { status: "cancelled", attempts: attempt, durationMs: clock() - started };
    const spentBefore = clock() - started;
    if (spentBefore >= budgetMs) return { status: "exhausted", attempts: attempt, durationMs: spentBefore };

    const mines = candidateMines(seed, size, firstCell, attempt, mineCount);
    const board = boardFromMines(size, mines);
    const stepper = createPublicSolve(board, size, firstCell);
    if (!stepper) continue;

    let solvedCeiling: DeductionTier | null = null;
    for (;;) {
      const stepRes = stepPublicSolve(stepper, { nodeBudget, shouldStop });
      if (cancel.cancelled) return { status: "cancelled", attempts: attempt + 1, durationMs: clock() - started };
      const elapsed = clock() - started;
      if (elapsed >= budgetMs) {
        return { status: "exhausted", attempts: attempt + 1, durationMs: elapsed };
      }
      if (stepRes.status === "solved") {
        solvedCeiling = stepRes.ceiling;
        break;
      }
      if (stepRes.status !== "continue") break;
      if (elapsed - (sliceStart - started) >= sliceMs) {
        await pause();
        if (cancel.cancelled) return { status: "cancelled", attempts: attempt + 1, durationMs: clock() - started };
        const afterYield = clock() - started;
        if (afterYield >= budgetMs) return { status: "exhausted", attempts: attempt + 1, durationMs: afterYield };
        sliceStart = started + afterYield;
      }
    }

    if (solvedCeiling !== null) {
      const finalDuration = clock() - started;
      if (finalDuration >= budgetMs) {
        return { status: "exhausted", attempts: attempt + 1, durationMs: finalDuration };
      }
      return { status: "found", board, mines, attempt, ceiling: solvedCeiling, durationMs: finalDuration };
    }

    if (clock() - sliceStart >= sliceMs) {
      await pause();
      if (cancel.cancelled) return { status: "cancelled", attempts: attempt + 1, durationMs: clock() - started };
      sliceStart = clock();
    }
  }
  return { status: "exhausted", attempts: maxAttempts, durationMs: clock() - started };
}
