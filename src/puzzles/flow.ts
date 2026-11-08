export type TideDirection = 'easier' | 'same' | 'harder';
export const tideDirections = ['easier', 'same', 'harder'] as const;
/** Original rounds end after four completed puzzles. Skips and Show me never place a player. */
export const ORIGINAL_ROUND_LIMIT = 4;
export type OriginalRound = { finished: readonly string[] };
export function finishOriginalPuzzle(round: OriginalRound, puzzle: string): OriginalRound {
  if (!puzzle || round.finished.includes(puzzle) || originalRoundDone(round)) return round;
  return { finished: [...round.finished, puzzle] };
}
export const originalRoundDone = (round: OriginalRound) => round.finished.length >= ORIGINAL_ROUND_LIMIT;
/** Hosts choose the next puzzle only on an explicit tap. No time, score or inferred placement input. */
export function adjacentTide<T extends { tier: number }>(puzzles: readonly T[], current: T, direction: TideDirection, recent: readonly T[] = []): T | null {
  const choices = puzzles.filter(p => p !== current && (direction === 'same' ? p.tier === current.tier : direction === 'easier' ? p.tier < current.tier : p.tier > current.tier));
  const nearest = choices.reduce((n, p) => Math.min(n, Math.abs(p.tier - current.tier)), Infinity);
  const tier = choices.filter(p => Math.abs(p.tier - current.tier) === nearest);
  // Catalog order supplies a stable cycle even when the bounded recent list has wrapped.
  const start = puzzles.indexOf(current);
  const cycle = [...puzzles.slice(start + 1), ...puzzles.slice(0, start)];
  const ordered = cycle.filter(p => tier.includes(p));
  return ordered.find(p => !recent.includes(p)) ?? ordered.reduce<T | null>((oldest, p) => !oldest || recent.indexOf(p) < recent.indexOf(oldest) ? p : oldest, null);
}
/** The board uses focus to highlight the failing step; the line is spoken by its character. */
export type PuzzleFailure = { character: string; line: string; focus: readonly string[] };
