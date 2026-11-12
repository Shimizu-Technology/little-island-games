/** Freezes a Sudoku corpus labelled by both graders: `node --import ./scripts/puzzles/register.mjs scripts/puzzles/latin/corpus.ts`. */
import { writeFileSync } from 'node:fs';
import { grade } from '../../../src/puzzles/latin/solver';
import { referenceGrade } from './reference-grader';
import { generateSudoku, sudokuRungs } from './sudoku';

export const corpusFile = 'tests/fixtures/latin-sudoku-corpus.json';
if (process.argv[1]?.endsWith('corpus.ts')) {
  const per = 24, rows: [string, number, string, string][] = [];
  sudokuRungs.forEach((rung, k) => {
    // Seeds well away from the bake's, so the corpus is not a copy of shipped puzzles.
    for (let s = 0, got = 0; got < per && s < 50000; s++) {
      const c = generateSudoku(rung, (0x40000000 + k * 0x01000000 + s) >>> 0);
      if (!c) continue;
      const a = grade(c.puzzle), b = referenceGrade(c.puzzle.givens, c.puzzle.size);
      if (a.status !== 'complete' || b.status !== 'complete' || a.ceiling !== b.ceiling) throw new Error(`Graders disagree on ${c.puzzle.givens.join('')}.`);
      rows.push([rung.id, rung.size, c.puzzle.givens.join(''), a.ceiling]); got++;
    }
  });
  writeFileSync(corpusFile, `${JSON.stringify(rows, null, 0).replace(/\],\[/g, '],\n[')}\n`);
  console.log(`${rows.length} puzzles frozen.`);
}
