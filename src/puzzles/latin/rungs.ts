import type { LatinKind } from './core';
import type { Technique } from './solver';

/**
 * The difficulty ladder each Latin game presents. One rung is one packed bank (one save slot).
 * `min`/`max` are the technique window the bank's generator, certification and tests enforce.
 *
 * Ceilings follow the tier, the same way across every game:
 * - tiers 1–3 (children): one number left, only one place, and the game's own clue arithmetic
 *   (arrows, cage totals or roof counting) — nothing else;
 * - tier 4: pointing and claiming may also be needed (Sudoku's Reef);
 * - tier 5: pairs and triples may also be needed (Sudoku's Deep);
 * - tier 6 (grown-ups): wings, fish and colour chains (Sudoku's Trench).
 * Across rungs of one game, a rung on the same board size never has a lower ceiling than the rung
 * before it. A bigger board restarts at the simplest ideas on purpose: the size is the new step,
 * and the rung's summary says so.
 */
export type RungInfo = { id: string; tier: 1 | 2 | 3 | 4 | 5 | 6; size: number; title: string; summary: string; min: Technique; max: Technique };
const r = (id: string, tier: RungInfo['tier'], size: number, title: string, summary: string, min: Technique, max: Technique): RungInfo => ({ id, tier, size, title, summary, min, max });
/** The hardest idea a variant rung of this tier may need, given the game's own clue rule. */
export const tierCeiling = (tier: RungInfo['tier'], clue: Technique): Technique => tier <= 3 ? clue : tier === 4 ? 'locked-candidates' : tier === 5 ? 'hidden-triple' : 'simple-coloring';
const v = (clue: Technique) => (id: string, tier: RungInfo['tier'], size: number, title: string, summary: string, min: Technique = 'single') => r(id, tier, size, title, summary, min, tierCeiling(tier, clue));
const cage = v('cage-sum'), arrow = v('inequality'), roof = v('skyline-line');
export const latinRungs: Record<LatinKind, readonly RungInfo[]> = {
  sudoku: [
    r('sprout', 1, 4, 'Sprout', '4×4, from plenty of starting numbers down to just a few.', 'single', 'hidden-single'),
    r('shell', 2, 6, 'Shell', '6×6, a bigger board, so the ideas start simple again: every cell has one number left.', 'single', 'single'),
    r('coral', 2, 6, 'Coral', '6×6 where a number has only one place in a row, column or box.', 'hidden-single', 'hidden-single'),
    r('lagoon', 3, 9, 'Lagoon', 'Full 9×9, a bigger board, so the ideas start simple again. Every step is a cell with one number left.', 'single', 'single'),
    r('tidepool', 3, 9, 'Tide Pool', '9×9 that needs “only one place for this number”.', 'hidden-single', 'hidden-single'),
    r('reef', 4, 9, 'Reef', '9×9 that needs pointing and claiming: a number that only fits where a box and a line cross.', 'locked-candidates', 'locked-candidates'),
    r('deep', 5, 9, 'Deep', '9×9 that needs matching pairs and triples: cells that share a few numbers between them.', 'naked-pair', 'hidden-triple'),
    r('trench', 6, 9, 'Trench', '9×9 for grown-ups: wings, fish and colour chains.', 'x-wing', 'simple-coloring'),
  ],
  'cage-math': [
    cage('add', 1, 4, 'Add', '4×4 cages that add up. No number repeats in a row or column.'),
    cage('take', 2, 5, 'Take Away', '5×5 with adding and taking away: a difference cage holds two numbers that far apart.'),
    cage('times', 3, 6, 'Times', '6×6 with all four: add, take away, times and share.'),
    cage('seven', 4, 7, 'Seven', '7×7 with all four operations and bigger cages.'),
    cage('nine', 6, 9, 'Nine', '9×9 for grown-ups, all four operations.'),
  ],
  'greater-than': [
    arrow('gentle', 2, 5, 'Gentle', '5×5 with arrows between cells. Each arrow points at the smaller number.'),
    arrow('tall', 4, 7, 'Tall', '7×7 with fewer arrows and fewer starting numbers.'),
    arrow('steep', 6, 7, 'Steep', '7×7 for grown-ups: every one needs matching pairs, fish or wings.', 'naked-pair'),
  ],
  skyline: [
    roof('low', 2, 4, 'Low Town', '4×4 rooftops: the edge numbers say how many roofs you can see from there.'),
    roof('high', 4, 6, 'High Town', '6×6 rooftops with some edge numbers missing.'),
  ],
  killer: [
    cage('small', 3, 6, 'Small Cages', '6×6 Sudoku with dashed cages: each cage adds to its number and never repeats one.'),
    cage('full', 5, 9, 'Full Cages', '9×9 Sudoku with only cages and their totals. iPad recommended.'),
  ],
  'cross-sums': [],
};
export const rungFor = (kind: LatinKind, band: string) => latinRungs[kind].find(x => x.id === band);
