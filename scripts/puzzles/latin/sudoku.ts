import { createRng, type Rng } from '../../../src/puzzles/rng';
import type { LatinPuzzle } from '../../../src/puzzles/latin/core';
import { latinRungs, type RungInfo } from '../../../src/puzzles/latin/rungs';
import { grade, rank, search, type Grade, type Technique } from '../../../src/puzzles/latin/solver';
import type { Candidate, LatinGenerator } from './family';

/** Generation settings per rung. The ladder itself (sizes, tiers, technique windows) is the app's. */
export type Rung = RungInfo & { givens: [number, number]; target: number; floor: number };
const settings: Record<string, Pick<Rung, 'givens' | 'target' | 'floor'>> = {
  sprout: { givens: [4, 11], target: 240, floor: 128 },
  shell: { givens: [15, 20], target: 300, floor: 128 },
  coral: { givens: [9, 14], target: 300, floor: 128 },
  lagoon: { givens: [30, 38], target: 365, floor: 192 },
  tidepool: { givens: [24, 30], target: 365, floor: 192 },
  reef: { givens: [22, 30], target: 365, floor: 192 },
  deep: { givens: [22, 30], target: 365, floor: 192 },
  trench: { givens: [20, 30], target: 365, floor: 128 },
};
export const sudokuRungs: readonly Rung[] = latinRungs.sudoku.map(r => ({ ...r, ...settings[r.id] }));
/** Clue patterns. Symmetry is presentation only, but it gives each band several families of look. */
export const templates = ['turn', 'mirror', 'diagonal', 'quarter', 'cross', 'scatter'] as const;
export type Template = typeof templates[number];

export const blankSudoku = (n: number): LatinPuzzle => ({ kind: 'sudoku', size: n, box: n === 9 ? 3 : 2, givens: Array<number>(n * n).fill(0), cages: [], less: [], sights: [], mask: Array<number>(n * n).fill(0) });
/** Cells that rise and fall together under a template's symmetry. */
export function orbits(n: number, template: Template): number[][] {
  const at = (r: number, c: number) => r * n + c, m = n - 1;
  const images = (i: number): number[] => {
    const r = Math.floor(i / n), c = i % n;
    if (template === 'turn') return [i, at(m - r, m - c)];
    if (template === 'mirror') return [i, at(r, m - c)];
    if (template === 'diagonal') return [i, at(c, r)];
    if (template === 'quarter') return [i, at(c, m - r), at(m - r, m - c), at(m - c, r)];
    if (template === 'cross') return [i, at(r, m - c), at(m - r, c), at(m - r, m - c)];
    return [i];
  };
  const seen = new Set<number>(), out: number[][] = [];
  for (let i = 0; i < n * n; i++) { if (seen.has(i)) continue; const o = [...new Set(images(i))]; o.forEach(j => seen.add(j)); out.push(o); }
  return out;
}
const stopRank = (rung: Rung) => rank(rung.max);
/**
 * One candidate per seed. A random solved grid, then symmetric clue removal while the answer stays
 * unique and the rung's hardest idea still finishes it. Deterministic in the seed.
 */
export function generateSudoku(rung: Rung, seed: number): Candidate | null {
  const rng: Rng = createRng(seed), n = rung.size, template = templates[seed % templates.length];
  const p = blankSudoku(n), full = search(p, 1, 2_000_000, () => rng.uint32() / 0x100000000).first;
  if (!full) return null;
  p.givens = [...full];
  const keep = (g: Grade) => g.status === 'complete';
  // Gentle rungs stop at a random clue count inside their range, so a rung runs from plenty of
  // starting numbers down to few. Harder rungs remove as far as their technique window allows.
  const floor = rank(rung.min) <= rank('hidden-single') ? rung.givens[0] + rng.below(rung.givens[1] - rung.givens[0] + 1) : rung.givens[0];
  for (const orbit of rng.shuffle(orbits(n, template))) {
    const left = p.givens.filter(Boolean).length;
    if (left - orbit.length < floor) continue;
    const old = orbit.map(i => p.givens[i]);
    orbit.forEach(i => { p.givens[i] = 0; });
    const unique = search(p, 2, 400_000);
    if (unique.status !== 'counted' || unique.count !== 1 || !keep(grade(p, 400_000, p.givens, stopRank(rung)))) orbit.forEach((i, k) => { p.givens[i] = old[k]; });
  }
  const g = grade(p, 800_000);
  const count = p.givens.filter(Boolean).length;
  if (g.status !== 'complete' || count > rung.givens[1] || rank(g.ceiling) < rank(rung.min) || rank(g.ceiling) > rank(rung.max)) return null;
  return { seed, puzzle: p, template, grade: g };
}
const weights: Record<Technique, number> = { single: 0, 'hidden-single': 1, inequality: 1, 'cage-sum': 1, 'skyline-line': 2, 'locked-candidates': 4, 'naked-pair': 6, 'hidden-pair': 7, 'naked-triple': 9, 'hidden-triple': 10, 'x-wing': 14, swordfish: 18, 'xy-wing': 16, 'simple-coloring': 18 };
/** Order inside a rung: how many and how hard the steps are, then how much there is to fill. */
export function workload(c: Pick<Candidate, 'grade' | 'puzzle'>): number {
  const blanks = c.puzzle.givens.filter(v => !v).length;
  return Object.entries(c.grade.counts).reduce((a, [t, k]) => a + weights[t as Technique] * (k ?? 0), 0) + blanks / 8;
}
export const sudokuGenerator: LatinGenerator = {
  kind: 'sudoku', rungs: sudokuRungs, workload,
  generate: (rung, seed) => generateSudoku(sudokuRungs.find(r => r.id === rung.id)!, seed),
};
