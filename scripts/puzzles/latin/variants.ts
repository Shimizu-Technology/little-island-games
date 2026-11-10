import { createRng, type Rng } from '../../../src/puzzles/rng';
import { canonicalCages, digits, sightCells, visible, type Cage, type CageOp, type LatinKind, type LatinPuzzle } from '../../../src/puzzles/latin/core';
import { latinRungs } from '../../../src/puzzles/latin/rungs';
import { grade, rank, search, type Technique } from '../../../src/puzzles/latin/solver';
import type { Candidate, GenRung, LatinGenerator } from './family';

/** Generation settings for one variant rung. `ops` are the cage operators it may use. */
export type VariantRung = GenRung & { ops?: readonly CageOp[]; cage?: [number, number]; clues?: number; givens?: number };
const blank = (kind: LatinKind, n: number): LatinPuzzle => ({ kind, size: n, box: kind === 'killer' || kind === 'sudoku' ? (n === 9 ? 3 : 2) : 0, givens: Array<number>(n * n).fill(0), cages: [], less: [], sights: [], mask: Array<number>(n * n).fill(0) });
const near = (n: number, a: number, b: number) => Math.abs(Math.floor(a / n) - Math.floor(b / n)) + Math.abs(a % n - b % n) === 1;
/** A random solved grid of the kind's own rules (Latin square, or Sudoku for cage Sudoku). */
function solvedGrid(kind: LatinKind, n: number, rng: Rng): number[] | null {
  const base = kind === 'killer' ? blank('sudoku', n) : blank('greater-than', n);
  return search(base, 1, 2_000_000, () => rng.uint32() / 0x100000000).first;
}
const unique = (p: LatinPuzzle) => { const c = search(p, 2, 600_000); return c.status === 'counted' && c.count === 1 ? 'one' : c.status === 'counted' && c.count === 0 ? 'none' : 'many'; };
const target = (op: CageOp, vs: number[]) => op === '=' ? vs[0] : op === '+' ? vs.reduce((a, b) => a + b, 0) : op === '*' ? vs.reduce((a, b) => a * b, 1) : op === '-' ? Math.abs(vs[0] - vs[1]) : Math.max(...vs) / Math.min(...vs);
/** Connected cages grown at random. Cage Sudoku cages never repeat a number. */
function partition(kind: LatinKind, n: number, answer: number[], rng: Rng, [low, high]: [number, number], style: string): number[][] {
  const free = new Set(digits(n * n).map(i => i - 1)), out: number[][] = [];
  for (const start of rng.shuffle([...free])) {
    if (!free.has(start)) continue;
    const cells = [start], want = low + rng.below(high - low + 1);
    free.delete(start);
    while (cells.length < want) {
      const options = [...free].filter(i => cells.some(j => near(n, i, j)) && (kind !== 'killer' || !cells.some(j => answer[j] === answer[i])));
      if (!options.length) break;
      // The layout style shapes cages: long across, long down, compact blocks, or winding.
      const score = (i: number) => style === 'across' ? Math.abs(Math.floor(i / n) - Math.floor(start / n)) : style === 'down' ? Math.abs(i % n - start % n) : style === 'blocks' ? Math.abs(Math.floor(i / n) - Math.floor(start / n)) + Math.abs(i % n - start % n) : 0;
      const best = Math.min(...options.map(score)), pool = style === 'winding' ? options : options.filter(i => score(i) === best);
      const next = pool[rng.below(pool.length)];
      cells.push(next); free.delete(next);
    }
    out.push(cells.sort((a, b) => a - b));
  }
  return out;
}
function cageFor(cells: number[], answer: number[], ops: readonly CageOp[], rng: Rng): Cage {
  const vs = cells.map(i => answer[i]);
  if (cells.length === 1) return { cells, op: '=', target: vs[0] };
  const fits = ops.filter(op => op !== '=' && (op === '+' || op === '*' || cells.length === 2) && (op !== '/' || Math.max(...vs) % Math.min(...vs) === 0) && (op !== '-' || vs[0] !== vs[1]));
  // Prefer the rung's newest operator a little, so each rung teaches what it adds.
  const op = fits.length ? fits[Math.min(fits.length - 1, rng.below(fits.length + 1))] : '+';
  return { cells, op, target: target(op, vs) };
}
/** Splits one cell that two solutions disagree on into its own cage, keeping the rest connected. */
function pin(p: LatinPuzzle, answer: number[], ops: readonly CageOp[], rng: Rng): boolean {
  const two = search(p, 2, 600_000);
  if (two.status !== 'counted' || two.count < 2) return false;
  const other = searchOther(p, answer);
  const differ = other ? digits(p.size * p.size).map(i => i - 1).filter(i => other[i] !== answer[i]) : [];
  const cell = differ[rng.below(Math.max(1, differ.length))] ?? 0;
  const k = p.cages.findIndex(c => c.cells.includes(cell)), cage = p.cages[k];
  if (!cage || cage.cells.length === 1) return false;
  const rest = cage.cells.filter(i => i !== cell), groups: number[][] = [];
  for (const i of rest) { const g = groups.find(x => x.some(j => near(p.size, i, j))); if (g) g.push(i); else groups.push([i]); }
  // Merge touching pieces so each piece is one connected cage.
  for (let merged = true; merged;) { merged = false; for (let a = 0; a < groups.length && !merged; a++) for (let b = a + 1; b < groups.length && !merged; b++) if (groups[a].some(i => groups[b].some(j => near(p.size, i, j)))) { groups[a].push(...groups.splice(b, 1)[0]); merged = true; } }
  p.cages.splice(k, 1, { cells: [cell], op: '=', target: answer[cell] }, ...groups.map(g => cageFor(g.sort((a, b) => a - b), answer, ops, rng)));
  return true;
}
/** A second solution, if there is one. */
function searchOther(p: LatinPuzzle, answer: number[]): number[] | null {
  return search(p, 2, 600_000).found.find(sol => sol.some((v, i) => v !== answer[i])) ?? null;
}

/** One cage-family candidate (Cage Math or Cage Sudoku). */
export function generateCages(kind: 'cage-math' | 'killer', rung: VariantRung, seed: number): Candidate | null {
  const rng = createRng(seed), n = rung.size, answer = solvedGrid(kind, n, rng);
  if (!answer) return null;
  const ops = rung.ops ?? ['+'], p = blank(kind, n);
  p.cages = partition(kind, n, answer, rng, rung.cage ?? [2, 3], cageStyles[seed % 4]).map(cells => cageFor(cells, answer, ops, rng));
  for (let tries = 0; tries < n * n && unique(p) === 'many'; tries++) if (!pin(p, answer, ops, rng)) return null;
  if (unique(p) !== 'one' || p.cages.filter(c => c.op === '=').length > Math.ceil(n * n / 6)) return null;
  // The rung's newest operator must actually appear.
  const newest = ops.at(-1)!;
  if (newest !== '+' && !p.cages.some(c => c.op === newest || newest === '*' && c.op === '/')) return null;
  p.cages = canonicalCages(p.cages);
  const g = grade(p, 2_000_000);
  if (g.status !== 'complete' || rank(g.ceiling) > rank(rung.max)) return null;
  return { seed, puzzle: p, template: cageStyles[seed % 4], grade: g };
}
const cageStyles = ['across', 'down', 'blocks', 'winding'], markStyles = ['rows', 'columns', 'mixed', 'edge'], cityStyles = ['north', 'west', 'scatter', 'corners'];
/** One Greater-Than Grid candidate: marks first, then as few starting numbers as stay unique. */
export function generateGreater(rung: VariantRung, seed: number): Candidate | null {
  const rng = createRng(seed), n = rung.size, answer = solvedGrid('greater-than', n, rng);
  if (!answer) return null;
  const p = blank('greater-than', n), pairs: [number, number][] = [];
  for (let i = 0; i < n * n; i++) for (const j of [i % n < n - 1 ? i + 1 : -1, i < n * (n - 1) ? i + n : -1]) if (j >= 0) pairs.push(answer[i] < answer[j] ? [i, j] : [j, i]);
  const style = markStyles[seed % 4], weight = ([a, b]: [number, number]) => style === 'rows' ? (Math.floor(a / n) === Math.floor(b / n) ? 0 : 1) : style === 'columns' ? (a % n === b % n ? 0 : 1) : style === 'edge' ? Math.min(Math.floor(a / n), a % n, n - 1 - Math.floor(b / n), n - 1 - b % n) : 0;
  p.less = rng.shuffle(pairs).sort((x, y) => weight(x) - weight(y)).slice(0, Math.round(pairs.length * (rung.clues ?? 0.45)));
  p.givens = [...answer];
  for (const i of rng.shuffle(digits(n * n).map(x => x - 1))) {
    const v = p.givens[i]; p.givens[i] = 0;
    if (unique(p) !== 'one' || grade(p, 1_000_000, p.givens, rank(rung.max)).status !== 'complete') p.givens[i] = v;
  }
  // Drop marks that add nothing, so the clues that remain all matter.
  for (const e of rng.shuffle([...p.less])) {
    const old = p.less; p.less = p.less.filter(x => x !== e);
    if (unique(p) !== 'one' || grade(p, 1_000_000, p.givens, rank(rung.max)).status !== 'complete') p.less = old;
  }
  if (p.givens.filter(Boolean).length > (rung.givens ?? n)) return null;
  const g = grade(p, 2_000_000);
  if (g.status !== 'complete' || rank(g.ceiling) < rank(rung.min)) return null;
  return { seed, puzzle: { ...p, less: [...p.less].sort((a, b) => a[0] - b[0] || a[1] - b[1]) }, template: style, grade: g };
}
/** One Skyline candidate: every edge clue, then remove clues while the city stays unique. */
export function generateSkyline(rung: VariantRung, seed: number): Candidate | null {
  const rng = createRng(seed), n = rung.size, answer = solvedGrid('skyline', n, rng);
  if (!answer) return null;
  const p = blank('skyline', n);
  p.sights = digits(4 * n).map(x => [x - 1, visible(sightCells(p, x - 1).map(i => answer[i]))] as [number, number]);
  if (unique(p) !== 'one') {
    // A few cities need a starting roof; add the most telling ones until unique.
    for (const i of rng.shuffle(digits(n * n).map(x => x - 1))) { if (unique(p) === 'one') break; p.givens[i] = answer[i]; }
  }
  const style = cityStyles[seed % 4], side = (id: number) => Math.floor(id / n), order = (id: number) => style === 'north' ? (side(id) === 0 ? 1 : 0) : style === 'west' ? (side(id) === 3 ? 1 : 0) : style === 'corners' ? -Math.min(id % n, n - 1 - id % n) : 0;
  // A style keeps some edges whole: the north edge, the west edge, or the clues near corners.
  for (const s of rng.shuffle([...p.sights]).sort((a, b) => order(a[0]) - order(b[0]))) {
    const old = p.sights; p.sights = p.sights.filter(x => x !== s);
    if (unique(p) !== 'one' || grade(p, 1_000_000, p.givens, rank(rung.max)).status !== 'complete') p.sights = old;
  }
  for (const i of rng.shuffle(digits(n * n).map(x => x - 1))) {
    if (!p.givens[i]) continue;
    const v = p.givens[i]; p.givens[i] = 0;
    if (unique(p) !== 'one' || grade(p, 1_000_000, p.givens, rank(rung.max)).status !== 'complete') p.givens[i] = v;
  }
  if (p.givens.filter(Boolean).length > (rung.givens ?? 2) || p.sights.length > Math.round(4 * n * (rung.clues ?? 1))) return null;
  const g = grade(p, 2_000_000);
  if (g.status !== 'complete') return null;
  return { seed, puzzle: { ...p, sights: [...p.sights].sort((a, b) => a[0] - b[0]) }, template: style, grade: g };
}
const weights: Partial<Record<Technique, number>> = { 'hidden-single': 1, inequality: 1, 'cage-sum': 1, 'skyline-line': 2, 'locked-candidates': 4, 'naked-pair': 6, 'hidden-pair': 7, 'naked-triple': 9, 'hidden-triple': 10, 'x-wing': 14, swordfish: 18, 'xy-wing': 16, 'simple-coloring': 18 };
export const variantWorkload = (c: Candidate) => Object.entries(c.grade.counts).reduce((a, [t, k]) => a + (weights[t as Technique] ?? 0) * (k ?? 0), 0) + c.puzzle.givens.filter(v => !v).length / 8;
export function variantGenerator(kind: Exclude<LatinKind, 'sudoku' | 'cross-sums'>, settings: Record<string, Omit<VariantRung, keyof GenRung> & Pick<GenRung, 'target' | 'floor'>>): LatinGenerator {
  const rungs: VariantRung[] = latinRungs[kind].map(r => ({ ...r, ...settings[r.id] }));
  return {
    kind, rungs, workload: variantWorkload,
    generate: (rung, seed) => {
      const r = rungs.find(x => x.id === rung.id)!;
      return kind === 'cage-math' || kind === 'killer' ? generateCages(kind, r, seed) : kind === 'greater-than' ? generateGreater(r, seed) : generateSkyline(r, seed);
    },
  };
}

const all: CageOp[] = ['+', '-', '*', '/'];
/** Cage Math: addition first, then subtraction, then times and divide (PC-06). */
export const cageMathGenerator = variantGenerator('cage-math', {
  add: { ops: ['+'], cage: [2, 3], target: 200, floor: 96 },
  take: { ops: ['+', '-'], cage: [2, 3], target: 200, floor: 96 },
  times: { ops: all, cage: [2, 3], target: 200, floor: 96 },
  seven: { ops: all, cage: [2, 4], target: 200, floor: 96 },
  nine: { ops: all, cage: [2, 4], target: 160, floor: 64 },
});
export const greaterGenerator = variantGenerator('greater-than', {
  gentle: { clues: 0.45, givens: 5, target: 160, floor: 64 },
  tall: { clues: 0.4, givens: 7, target: 160, floor: 64 },
});
export const skylineGenerator = variantGenerator('skyline', {
  low: { givens: 2, target: 160, floor: 64 },
  high: { givens: 3, target: 160, floor: 64 },
});
export const killerGenerator = variantGenerator('killer', {
  small: { cage: [2, 4], target: 160, floor: 64 },
  full: { cage: [2, 5], target: 160, floor: 64 },
});
