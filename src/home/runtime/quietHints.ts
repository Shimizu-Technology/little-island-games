/**
 * Quiet affordances (rule 52). After 6 s without a touch, one interactive thing gives a
 * single small wiggle, at most once every 20 s, and only three times per quiet spell.
 * The next touch resets the spell. Never a sound, a badge, a prompt or a reason to wait.
 */
export const HINT_IDLE_MS = 6000;
export const HINT_GAP_MS = 20000;
export const HINTS_PER_QUIET = 3;
export const HINT_WIGGLE_MS = 180;
export const HINT_WIGGLE_DEGREES = 3;

export type HintState = { lastInput: number; lastHint: number; count: number; cursor: number };
export const freshHints = (now: number): HintState => ({ lastInput: now, lastHint: -Infinity, count: 0, cursor: 0 });
export const touchedHints = (state: HintState, now: number): HintState => ({ ...state, lastInput: now, count: 0 });

/** When the next hint may run, or undefined when this quiet spell has used its hints. */
export function nextHintAt(state: HintState): number | undefined {
  if (state.count >= HINTS_PER_QUIET) return undefined;
  return Math.max(state.lastInput + HINT_IDLE_MS, state.lastHint + HINT_GAP_MS);
}
/** Chooses one candidate in turn. Nothing happens under Reduced Motion or with no candidate. */
export function takeHint(state: HintState, now: number, candidates: readonly string[], reduced: boolean): { id?: string; state: HintState } {
  const due = nextHintAt(state);
  if (reduced || !candidates.length || due === undefined || now < due) return { state };
  const id = candidates[state.cursor % candidates.length];
  return { id, state: { ...state, lastHint: now, count: state.count + 1, cursor: state.cursor + 1 } };
}
/** One full ±3° wiggle over 180 ms that eases out. Worklet-safe. */
export function hintWiggle(elapsed: number): number {
  "worklet";
  if (elapsed < 0 || elapsed >= HINT_WIGGLE_MS) return 0;
  const t = elapsed / HINT_WIGGLE_MS;
  return Math.sin(t * Math.PI * 2) * HINT_WIGGLE_DEGREES * (1 - t);
}
