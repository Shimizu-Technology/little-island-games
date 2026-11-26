/** Plain difficulty words over the engine tiers. Presentation only: tiers, bands and saved refs are unchanged. */
export const searchTiers = [
  { tier: 1, label: 'Easy', size: 6, directions: 'Across and down' },
  { tier: 2, label: 'Medium', size: 9, directions: 'Across and down' },
  { tier: 3, label: 'Hard', size: 12, directions: 'Across, down and slanted' },
  { tier: 4, label: 'Expert', size: 15, directions: 'Every direction' },
  { tier: 5, label: 'Master', size: null, directions: 'Every direction' },
  { tier: 6, label: 'Master+', size: null, directions: 'Every direction' },
] as const;
export const searchTier = (tier: number) => searchTiers.find(t => t.tier === tier);
const directionWords = { 2: 'Across and down', 4: 'Across, down and slanted', 8: 'Every direction' } as const;
/** What `scripts/puzzles/words/plan.mjs` bakes per band: grid size and how many of the eight directions words may take. */
const bakedBands: Record<string, { size: number; directionCount: 2 | 4 | 8 }> = {
  paddling: { size: 6, directionCount: 2 }, shallows: { size: 8, directionCount: 4 }, lagoon: { size: 10, directionCount: 8 },
  reef: { size: 12, directionCount: 8 }, deep: { size: 15, directionCount: 8 }, trench: { size: 16, directionCount: 8 },
};
/** The grid a bank really holds: its own recorded size and directions, else its baked band, else the plain tier. */
export function searchBankShape(bank: { band: string; tier: number; size?: number; directionCount?: 2 | 4 | 8 }): { size: number | null; directions: string } | undefined {
  const band = bakedBands[bank.band], tier = searchTier(bank.tier);
  const size = bank.size ?? band?.size ?? tier?.size, count = bank.directionCount ?? band?.directionCount;
  if (size === undefined && count === undefined && !tier) return undefined;
  return { size: size ?? null, directions: count ? directionWords[count] : tier?.directions ?? 'Every direction' };
}
/** The shape of a baked set of puzzles, read from the cells and answers themselves (for `SearchBank.size`/`directionCount`). */
export function measureSearchBank(puzzles: readonly { cells: readonly unknown[][]; words: readonly { cells: readonly number[] }[] }[]): { size: number; directionCount: 2 | 4 | 8 } {
  let size = 0, count: 2 | 4 | 8 = 2;
  for (const p of puzzles) {
    const columns = p.cells[0].length; size = Math.max(size, columns, p.cells.length);
    for (const { cells } of p.words) {
      const dr = Math.sign(Math.floor(cells[1] / columns) - Math.floor(cells[0] / columns)), dc = Math.sign(cells[1] % columns - cells[0] % columns);
      // The generator's first four directions are right, down, down-right and down-left; the rest run backwards.
      if (dr < 0 || dr === 0 && dc < 0) count = 8; else if (dr > 0 && dc !== 0 && count === 2) count = 4;
    }
  }
  return { size, directionCount: count };
}
