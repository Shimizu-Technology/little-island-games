import data from './supply-v1.json';
import { decodePuzzle, type LatinPuzzle } from '../../../puzzles/latin/core';
import { createRng } from '../../../puzzles/rng';

/** Immutable catalog 1. Do not regenerate/replace existing rows after publication. */
export function schoolPuzzle(level: number, seed: number): LatinPuzzle {
  const rng = createRng(seed), pool = level === 3 ? data.sprout : level === 4 ? data.coral : data.cages;
  const p = decodePuzzle(pool[rng.below(pool.length)].puzzle)!;
  if (p.kind !== 'sudoku') return p;
  // Full rule-keeping shuffles, rather than rotating the same cyclic answer.
  const n = p.size, h = p.box, w = n / h, names = rng.shuffle(Array.from({ length: n }, (_, i) => i + 1));
  const lines = (block: number) => rng.shuffle(Array.from({ length: n / block }, (_, i) => i)).flatMap(b => rng.shuffle(Array.from({ length: block }, (_, j) => b * block + j)));
  const rows = lines(h), cols = lines(w);
  return { ...p, givens: p.givens.map((_, i) => { const v = p.givens[rows[Math.floor(i / n)] * n + cols[i % n]]; return v ? names[v - 1] : 0; }) };
}
