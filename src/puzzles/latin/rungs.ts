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
  'cage-math': [],
  'greater-than': [],
  skyline: [],
  killer: [],
  'cross-sums': [],
};
export const rungFor = (kind: LatinKind, band: string) => latinRungs[kind].find(x => x.id === band);
