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
export function adjacentTide<T extends { tier: number }>(puzzles: readonly T[], current: T, direction: TideDirection): T | null {
  if (direction === 'same') return puzzles.find(p => p !== current && p.tier === current.tier) ?? current;
  const choices = puzzles.filter(p => direction === 'easier' ? p.tier < current.tier : p.tier > current.tier);
  return choices.sort((a, b) => Math.abs(a.tier - current.tier) - Math.abs(b.tier - current.tier))[0] ?? null;
}
/** The board uses focus to highlight the failing step; the line is spoken by its character. */
export type PuzzleFailure = { character: string; line: string; focus: readonly string[] };
