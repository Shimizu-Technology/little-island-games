import type { FamilySpec } from '../../../src/puzzles/types';
import { lagoonLatinAdapter } from '../../../src/puzzles/adapters/lagoon-latin';
import type { LatinPuzzle } from '../../../src/puzzles/latin/core';
import { generateCages, generateGreater, type VariantRung } from '../latin/variants';
import { describe } from '../latin/family';
import { clueSinglesBot } from './clue-bot';

export const lagoonRungs: readonly VariantRung[] = [
  { id: 'cages', tier: 3, size: 4, title: 'Cages without starters', summary: 'Add the cage totals. Notes help keep the choices.', min: 'cage-sum', max: 'cage-sum', cage: [2, 3], target: 200, floor: 200 },
  { id: 'wide-cages', tier: 4, size: 6, title: 'Six-wide cages', summary: 'A larger cage puzzle, with no starting numbers.', min: 'cage-sum', max: 'locked-candidates', cage: [2, 4], target: 100, floor: 100 },
  { id: 'marks-only', tier: 5, size: 4, title: 'Only arrows', summary: 'No starting numbers: reason from arrows alone.', min: 'inequality', max: 'hidden-triple', clues: 0.65, givens: 0, target: 200, floor: 100 },
  { id: 'school-cages', tier: 5, size: 4, title: 'School cage combinations', summary: 'No prefilled squares; use the cage totals together.', min: 'cage-sum', max: 'cage-sum', cage: [2, 3], target: 1600, floor: 1600 },
];
export const logicLagoonFamily: FamilySpec<LatinPuzzle> = {
  id: 'logic-lagoon', adapter: lagoonLatinAdapter,
  sources: ['src/puzzles/adapters/lagoon-latin.ts', 'src/puzzles/latin/core.ts', 'src/puzzles/latin/solver.ts', 'src/puzzles/latin/independent.ts', 'scripts/puzzles/logic-lagoon/family.ts', 'scripts/puzzles/logic-lagoon/clue-bot.ts', 'scripts/puzzles/latin/variants.ts'],
  bands: lagoonRungs.map(r => ({ id: r.id, target: r.target, floor: r.floor, advanced: true })),
  maxRowBytes: 512, requiresUnique: true, requiresTrace: true, hiddenInformation: false,
  provenance: { source: 'original', note: 'T1 original sum cages and arrow-only Latin grids. Sudoku small descriptors are reused separately and are not counted in these receipts.' },
  review: { ids: [], complete: false },
  generate: (seed, band) => {
    const r = lagoonRungs.find(r => r.id === band.id)!;
    const c = r.id === 'marks-only' ? generateGreater(r, seed) : generateCages('killer', r, seed);
    return c && (!c.puzzle.givens.some(Boolean)) && (r.id !== 'school-cages' || !clueSinglesBot(c.puzzle).solved) ? describe(c, band.id) : null;
  },
};
