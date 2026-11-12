import type { Technique } from './solver';

/**
 * The Loop and Pearl Loop ladders. One rung is one packed bank. `min`/`max` bound the hardest idea a
 * board needs and `needs` asks that the idea is really used. `keep` is the share of cells that keep a
 * clue, so gentle rungs stay generous.
 */
export type LineRung = {
  id: string; tier: 1 | 2 | 3 | 4 | 5 | 6; rows: number; cols: number; title: string; summary: string;
  min: Technique; max: Technique; needs?: Technique; keep: number;
};
const r = (id: string, tier: LineRung['tier'], rows: number, cols: number, title: string, summary: string, min: Technique, max: Technique, needs: Technique | null, keep: number): LineRung =>
  ({ id, tier, rows, cols, title, summary, min, max, ...(needs ? { needs } : {}), keep });
export const loopRungs: readonly LineRung[] = [
  r('pebble', 2, 5, 5, 'Pebble', 'Count each number’s sides. Every dot has no lines or two.', 'count', 'count', null, 0.45),
  r('cove', 3, 6, 6, 'Cove', 'Never close a small loop while other lines are still apart.', 'loop', 'loop', 'loop', 0.35),
  r('reef', 3, 6, 6, 'Reef', 'Look at a number with the dots at its corners.', 'corner', 'corner', 'corner', 0.3),
  r('kelp', 4, 7, 7, 'Kelp', 'Every cell is inside the loop or outside it. A line always separates the two.', 'sides', 'sides', 'sides', 0.25),
  r('current', 5, 7, 7, 'Current', 'Think ahead: if a line went here, which rule would break?', 'what-if', 'what-if', 'what-if', 0.2),
  r('abyss', 6, 10, 10, 'Abyss', 'Grown-up boards, best on iPad. Follow one choice through every idea.', 'chain', 'chain', 'chain', 0.2),
];
export const pearlRungs: readonly LineRung[] = [
  r('seed', 3, 6, 6, 'Seed Pearls', 'Turn on black pearls, go straight on white ones. Each pearl tells you a little.', 'pearl', 'loop', null, 0.1),
  r('string', 4, 7, 7, 'Pearl String', 'Think ahead: would a line here leave a pearl with no way through?', 'what-if', 'what-if', 'what-if', 0.08),
  r('deep', 5, 8, 8, 'Deep Pearls', 'Grown-up boards. Follow one choice past several pearls until something breaks.', 'chain', 'chain', 'chain', 0.06),
];
export const lineRungFor = (kind: 'loop' | 'pearl-loop', band: string) => (kind === 'loop' ? loopRungs : pearlRungs).find(x => x.id === band);
