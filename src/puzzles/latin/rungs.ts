import type { LatinKind } from './core';
import type { Technique } from './solver';

/**
 * The difficulty ladder each Latin game presents. One rung is one packed bank (one save slot).
 * `min`/`max` are the technique window the bank's generator and certification enforce.
 */
export type RungInfo = { id: string; tier: 1 | 2 | 3 | 4 | 5 | 6; size: number; title: string; summary: string; min: Technique; max: Technique };
const r = (id: string, tier: RungInfo['tier'], size: number, title: string, summary: string, min: Technique, max: Technique): RungInfo => ({ id, tier, size, title, summary, min, max });
export const latinRungs: Record<LatinKind, readonly RungInfo[]> = {
  sudoku: [
    r('sprout', 1, 4, 'Sprout', '4×4, from plenty of starting numbers down to just a few.', 'single', 'hidden-single'),
    r('shell', 2, 6, 'Shell', '6×6 with boxes of two rows. Every cell has one number left.', 'single', 'single'),
    r('coral', 2, 6, 'Coral', '6×6 where a number has only one place in a row, column or box.', 'hidden-single', 'hidden-single'),
    r('lagoon', 3, 9, 'Lagoon', 'Full 9×9. Every step is a cell with one number left.', 'single', 'single'),
    r('tidepool', 3, 9, 'Tide Pool', '9×9 that needs “only one place for this number”.', 'hidden-single', 'hidden-single'),
    r('reef', 4, 9, 'Reef', '9×9 that needs pointing and claiming: a number locked inside a box and a line.', 'locked-candidates', 'locked-candidates'),
    r('deep', 5, 9, 'Deep', '9×9 that needs pairs and triples: cells that share a few numbers between them.', 'naked-pair', 'hidden-triple'),
    r('trench', 6, 9, 'Trench', '9×9 for grown-ups: wings, fish and colour chains.', 'x-wing', 'simple-coloring'),
  ],
  'cage-math': [
    r('add', 1, 4, 'Add', '4×4 cages that add up. No number repeats in a row or column.', 'single', 'simple-coloring'),
    r('take', 2, 5, 'Take Away', '5×5 with adding and taking away: a difference cage holds two numbers that far apart.', 'single', 'simple-coloring'),
    r('times', 3, 6, 'Times', '6×6 with all four: add, take away, times and share.', 'single', 'simple-coloring'),
    r('seven', 4, 7, 'Seven', '7×7 with all four operations and bigger cages.', 'single', 'simple-coloring'),
    r('nine', 6, 9, 'Nine', '9×9 for grown-ups, all four operations.', 'single', 'simple-coloring'),
  ],
  'greater-than': [
    r('gentle', 2, 5, 'Gentle', '5×5 with arrows between cells. Each arrow points at the smaller number.', 'single', 'simple-coloring'),
    r('tall', 4, 7, 'Tall', '7×7 with fewer arrows and fewer starting numbers.', 'single', 'simple-coloring'),
  ],
  skyline: [
    r('low', 2, 4, 'Low Town', '4×4 rooftops: the edge numbers say how many roofs you can see from there.', 'single', 'simple-coloring'),
    r('high', 4, 6, 'High Town', '6×6 rooftops with some edge numbers missing.', 'single', 'simple-coloring'),
  ],
  killer: [
    r('small', 3, 6, 'Small Cages', '6×6 Sudoku with dashed cages: each cage adds to its number and never repeats one.', 'single', 'simple-coloring'),
    r('full', 5, 9, 'Full Cages', '9×9 Sudoku with only cages and their totals. iPad recommended.', 'single', 'simple-coloring'),
  ],
  'cross-sums': [],
};
export const rungFor = (kind: LatinKind, band: string) => latinRungs[kind].find(x => x.id === band);
