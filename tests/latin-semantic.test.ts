import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { semanticKey, sudokuCanonical } from '../src/puzzles/latin/adapter';
import type { LatinPuzzle } from '../src/puzzles/latin/core';
import { createRng, type Rng } from '../src/puzzles/rng';
import { relabel, smallest } from '../src/puzzles/semantic';

const corpus = JSON.parse(readFileSync('tests/fixtures/latin-sudoku-corpus.json', 'utf8')) as [string, number, string, string][];
const puzzleOf = (n: number, text: string): LatinPuzzle => ({ kind: 'sudoku', size: n, box: n === 9 ? 3 : 2, givens: [...text].map(Number), cages: [], less: [], sights: [], mask: Array<number>(n * n).fill(0) });
const permutations = (k: number): number[][] => k <= 1 ? [[0]] : permutations(k - 1).flatMap(p => Array.from({ length: k }, (_, i) => [...p.slice(0, i), k - 1, ...p.slice(i)]));
/** Written apart from the production key: every cell map of the class, enumerated outright. */
function bruteKey(p: LatinPuzzle): string {
  const n = p.size, h = p.box, w = n / h;
  const orders = (block: number) => {
    const out: number[][] = [];
    const walk = (blocks: number[], at: number, lines: number[]) => { if (at === blocks.length) { out.push(lines); return; } for (const inner of permutations(block)) walk(blocks, at + 1, [...lines, ...inner.map(r => blocks[at] * block + r)]); };
    for (const blocks of permutations(n / block)) walk(blocks, 0, []);
    return out;
  };
  const keys: string[] = [];
  for (const t of h === w ? [false, true] : [false]) for (const rows of orders(h)) for (const cols of orders(w)) {
    keys.push(relabel(Array.from({ length: n * n }, (_, i) => { const r = rows[Math.floor(i / n)], c = cols[i % n]; return t ? p.givens[c * n + r] : p.givens[r * n + c]; })).join(''));
  }
  return smallest(keys);
}
/** A random member of the puzzle's class, built from the same moves a person could make. */
function shuffleInClass(p: LatinPuzzle, rng: Rng): LatinPuzzle {
  const n = p.size, h = p.box, w = n / h;
  const order = (block: number) => rng.shuffle(Array.from({ length: n / block }, (_, i) => i)).flatMap(b => rng.shuffle(Array.from({ length: block }, (_, i) => b * block + i)));
  const rows = order(h), cols = order(w), names = [0, ...rng.shuffle(Array.from({ length: n }, (_, i) => i + 1))], flip = h === w && rng.below(2) === 1;
  const givens = Array.from({ length: n * n }, (_, i) => { const r = rows[Math.floor(i / n)], c = cols[i % n]; return names[flip ? p.givens[c * n + r] : p.givens[r * n + c]]; });
  return { ...p, givens };
}
const swapRows = (p: LatinPuzzle, a: number, b: number): LatinPuzzle => { const n = p.size, g = [...p.givens]; for (let c = 0; c < n; c++) [g[a * n + c], g[b * n + c]] = [g[b * n + c], g[a * n + c]]; return { ...p, givens: g }; };
const swapCols = (p: LatinPuzzle, a: number, b: number): LatinPuzzle => { const n = p.size, g = [...p.givens]; for (let r = 0; r < n; r++) [g[r * n + a], g[r * n + b]] = [g[r * n + b], g[r * n + a]]; return { ...p, givens: g }; };

describe('Sudoku semantic key covers the whole rule-keeping class (review R2)', () => {
  it('matches an outright enumeration of every cell map on 4×4 and 6×6', () => {
    for (const [, n, text] of corpus.filter(r => r[1] < 9)) { const p = puzzleOf(n, text); expect(sudokuCanonical(p)).toBe(bruteKey(p)); }
  });
  it('gives one key to a single-band row swap and a single-stack column swap (the review’s Lagoon 1 copy)', () => {
    const nine = corpus.filter(r => r[1] === 9).slice(0, 24).map(r => puzzleOf(9, r[2]));
    for (const p of nine) {
      const key = semanticKey(p);
      expect(semanticKey(swapRows(p, 0, 1))).toBe(key);
      expect(semanticKey(swapRows(p, 4, 5))).toBe(key);
      expect(semanticKey(swapCols(p, 6, 8))).toBe(key);
      expect(semanticKey(swapCols(swapRows(p, 3, 5), 0, 2))).toBe(key);
    }
  });
  it('gives one key to random members of the class and different keys to different 9×9 corpus puzzles', () => {
    const rng = createRng(0x5eed), keys = new Map<string, string>();
    for (const [band, n, text] of corpus) {
      const p = puzzleOf(n, text), key = semanticKey(p);
      for (let k = 0; k < 3; k++) expect(semanticKey(shuffleInClass(p, rng))).toBe(key);
      // The frozen corpus repeats some 4×4 classes on purpose-free sampling; 9×9 classes must differ.
      if (n === 9) { expect(keys.get(key), `${band} ${text}`).toBeUndefined(); keys.set(key, text); }
    }
  });
  it('stays quick on sparse 9×9 boards', () => {
    const sparse = corpus.filter(r => r[1] === 9).sort((a, b) => [...a[2]].filter(c => c !== '0').length - [...b[2]].filter(c => c !== '0').length).slice(0, 20);
    const started = performance.now();
    for (const [, n, text] of sparse) semanticKey(puzzleOf(n, text));
    expect((performance.now() - started) / sparse.length).toBeLessThan(250);
  });
});
