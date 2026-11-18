import type { LatinPuzzle } from '../../../puzzles/latin/core';
import { createRng } from '../../../puzzles/rng';
import givens from './pictures-v2.json';
/** Catalog 2 teaching clues are data. Solver traversal order cannot change paused grids. */
export function teachingPictures(size: 2 | 3, seed: number): LatinPuzzle {
  const rng = createRng(seed), names = rng.shuffle(Array.from({ length: size }, (_, i) => i + 1));
  const rows = rng.shuffle(Array.from({ length: size }, (_, i) => i)), columns = rng.shuffle(Array.from({ length: size }, (_, i) => i));
  const grid = givens[String(size) as '2' | '3'];
  return { kind: 'sudoku', size, box: 0, givens: grid.map((_, i) => { const v = grid[rows[Math.floor(i / size)] * size + columns[i % size]]; return v ? names[v - 1] : 0; }), cages: [], less: [], sights: [], mask: grid.map(() => 0) };
}
