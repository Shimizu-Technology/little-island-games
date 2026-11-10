/**
 * G5 Loop and Pearl Loop generator. A seeded region of squares grows with no holes and no squares
 * meeting only at a corner, so its border is one loop. Loop: every cell gets its number, then numbers
 * are taken away while the grader still finishes inside the rung's technique window. Pearl Loop: every
 * place a pearl could truthfully sit gets one, then pearls are taken away the same way.
 */
import { createRng, type Rng } from '../../../src/puzzles/rng';
import { BLACK, NONE, WHITE, type LinePuzzle } from '../../../src/puzzles/lines/core';
import { grade, rank, techniquesOf, type Grade, type Technique } from '../../../src/puzzles/lines/solver';
import { loopRungs, pearlRungs, type LineRung } from '../../../src/puzzles/lines/rungs';
import type { EdgeGenerator } from '../edges/family';

type Style = { id: string; fill: number; shape: number; pairs: boolean };
/** Layout styles are the bank's templates: shape of the loop, and whether clues go in mirrored pairs. */
export const lineStyles: readonly Style[] = [
  { id: 'blob', fill: 0.55, shape: 1, pairs: false },
  { id: 'wiggle', fill: 0.5, shape: -1, pairs: false },
  { id: 'coral', fill: 0.45, shape: 0, pairs: false },
  { id: 'twin', fill: 0.5, shape: -1, pairs: true },
  { id: 'open', fill: 0.35, shape: 0, pairs: true },
];

/** A region of `rows`×`cols` squares whose border is a single loop. */
export function region(rng: Rng, rows: number, cols: number, style: Style, blocks = 0): Int8Array {
  const n = rows * cols, inside = new Int8Array(n), at = (r: number, c: number) => r < 0 || c < 0 || r >= rows || c >= cols ? 0 : inside[r * cols + c];
  const neighbours = (i: number) => { const r = Math.floor(i / cols), c = i % cols; return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([y, x]) => y >= 0 && x >= 0 && y < rows && x < cols).map(([y, x]) => y * cols + x); };
  const corners = (i: number) => { const r = Math.floor(i / cols), c = i % cols; return [[r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1]].every(([y, x]) => { const a = at(y - 1, x - 1), b = at(y - 1, x), d = at(y, x - 1), e = at(y, x); return !(a === e && b === d && a !== b); }); };
  const outsideOpen = () => { const seen = new Uint8Array(n), stack: number[] = []; for (let i = 0; i < n; i++) { const r = Math.floor(i / cols), c = i % cols; if (!inside[i] && (r === 0 || c === 0 || r === rows - 1 || c === cols - 1)) { seen[i] = 1; stack.push(i); } } while (stack.length) for (const j of neighbours(stack.pop()!)) if (!inside[j] && !seen[j]) { seen[j] = 1; stack.push(j); } for (let i = 0; i < n; i++) if (!inside[i] && !seen[i]) return false; return true; };
  inside[rng.below(n)] = 1;
  const want = Math.max(2, Math.round(n * style.fill * (0.85 + rng.below(30) / 100)));
  for (let size = 1, tries = 0; size < want && tries < n * 40; tries++) {
    // Several frontier squares are drawn; the style picks the roundest or the thinnest.
    let best = -1, score = -Infinity;
    for (let k = 0; k < 4; k++) {
      const i = rng.below(n);
      if (!inside[i]) continue;
      const out = neighbours(i).filter(j => !inside[j]);
      if (!out.length) continue;
      const j = out[rng.below(out.length)], s = style.shape * neighbours(j).filter(x => inside[x]).length + rng.below(100) / 200;
      if (s > score) { score = s; best = j; }
    }
    if (best < 0) continue;
    // Block growth adds a small rectangle at once, which gives long straight runs and clean corners.
    const add = [best];
    if (blocks) {
      const r = Math.floor(best / cols), c = best % cols, h = 1 + rng.below(blocks), w = 1 + rng.below(blocks), up = rng.below(2), left = rng.below(2);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const rr = up ? r - y : r + y, cc = left ? c - x : c + x; if (rr >= 0 && cc >= 0 && rr < rows && cc < cols && !inside[rr * cols + cc] && (y || x)) add.push(rr * cols + cc); }
    }
    for (const i of add) inside[i] = 1;
    if (!add.every(corners) || !outsideOpen()) { for (const i of add) inside[i] = 0; continue; }
    size += add.length;
  }
  return inside;
}

/** Numbers for every cell of a Loop region. */
function loopClues(inside: Int8Array, rows: number, cols: number): number[] {
  const at = (r: number, c: number) => r < 0 || c < 0 || r >= rows || c >= cols ? 0 : inside[r * cols + c];
  return Array.from(inside, (v, i) => { const r = Math.floor(i / cols), c = i % cols; return [at(r - 1, c), at(r + 1, c), at(r, c - 1), at(r, c + 1)].filter(x => x !== v).length; });
}
/** Every truthful pearl for the loop around a region of squares between cell centres. */
export function pearlsFor(inside: Int8Array, rows: number, cols: number): number[] {
  const sr = rows - 1, sc = cols - 1, at = (r: number, c: number) => r < 0 || c < 0 || r >= sr || c >= sc ? 0 : inside[r * sc + c];
  const dirs = (r: number, c: number) => [at(r - 1, c) !== at(r, c), at(r, c - 1) !== at(r, c), at(r - 1, c - 1) !== at(r, c - 1), at(r - 1, c - 1) !== at(r - 1, c)];
  const DR = [0, 1, 0, -1], DC = [1, 0, -1, 0], goes = (r: number, c: number, d: number) => r >= 0 && c >= 0 && r < rows && c < cols && dirs(r, c)[d];
  return Array.from({ length: rows * cols }, (_, i) => {
    const r = Math.floor(i / cols), c = i % cols, ds = [0, 1, 2, 3].filter(d => goes(r, c, d));
    if (ds.length !== 2) return 0;
    const straight = ds[1] - ds[0] === 2, through = (d: number) => goes(r + DR[d], c + DC[d], d);
    if (!straight && ds.every(through)) return BLACK;
    if (straight && !ds.every(through)) return WHITE;
    return 0;
  });
}

export type LineCandidate = { seed: number; puzzle: LinePuzzle; template: string; grade: Extract<Grade, { status: 'complete' }> };
/** Takes clues away, one cell (or a mirrored pair) at a time, while the grader still finishes below `upTo`. */
function thin(rng: Rng, p: LinePuzzle, upTo: number, pairs: boolean, keep: number): LinePuzzle {
  const values = p.kind === 'loop' ? [...p.clues] : [...p.pearls], blank = p.kind === 'loop' ? NONE : 0, n = values.length;
  const make = (v: number[]): LinePuzzle => p.kind === 'loop' ? { ...p, clues: v } : { ...p, pearls: v };
  for (const i of rng.shuffle(values.map((_, k) => k))) {
    if (values[i] === blank || values.filter(v => v !== blank).length <= keep) continue;
    const trial = [...values], twin = n - 1 - i;
    trial[i] = blank;
    if (pairs) trial[twin] = blank;
    if (grade(make(trial), undefined, 4000, upTo).status === 'complete') { values[i] = blank; if (pairs) values[twin] = blank; }
  }
  return make(values);
}
export function generateLine(kind: LinePuzzle['kind'], rung: LineRung, seed: number): LineCandidate | null {
  const rng = createRng(seed), style = lineStyles[rng.below(lineStyles.length)];
  const rows = rung.rows, cols = rung.cols, squares = kind === 'loop' ? [rows, cols] : [rows - 1, cols - 1];
  const inside = region(rng, squares[0], squares[1], style, kind === 'pearl-loop' ? 3 : 0);
  const full: LinePuzzle = kind === 'loop' ? { kind, rows, cols, clues: loopClues(inside, rows, cols) } : { kind, rows, cols, pearls: pearlsFor(inside, rows, cols) };
  if (kind === 'pearl-loop' && (full as { pearls: number[] }).pearls.filter(Boolean).length < 4) return null;
  const upTo = rank(kind, rung.max) + 1;
  if (grade(full, undefined, 4000, kind === 'loop' ? upTo : techniquesOf(kind).length).status !== 'complete') return null;
  const puzzle = thin(rng, full, upTo, style.pairs, Math.ceil(rows * cols * rung.keep));
  const g = grade(puzzle);
  if (g.status !== 'complete' || rank(kind, g.ceiling) < rank(kind, rung.min) || rank(kind, g.ceiling) > rank(kind, rung.max)) return null;
  if (rung.needs && !g.steps.some(s => s.technique === rung.needs)) return null;
  return { seed, puzzle, template: style.id, grade: g };
}
export const lineWorkload = (kind: LinePuzzle['kind'], g: Extract<Grade, { status: 'complete' }>) => {
  const weights = kind === 'loop' ? [0.3, 1, 2, 3, 6, 12] : [0.3, 1.5, 5, 10];
  return g.steps.reduce((n, s) => n + weights[rank(kind, s.technique)], 0);
};
const loopSupply: Record<string, [number, number]> = { pebble: [240, 100], cove: [240, 100], reef: [240, 100], kelp: [240, 100], current: [240, 100], abyss: [200, 64] };
const pearlSupply: Record<string, [number, number]> = { seed: [48, 32], string: [48, 32], deep: [32, 24] };
const lineGenerator = (kind: LinePuzzle['kind'], rungs: readonly LineRung[], supply: Record<string, [number, number]>): EdgeGenerator<LinePuzzle, LineRung> => ({
  family: kind,
  rungs: rungs.map(r => ({ ...r, target: supply[r.id][0], floor: supply[r.id][1] })),
  generate: (rung, seed) => { const c = generateLine(kind, rung, seed); return c ? { seed, puzzle: c.puzzle, template: c.template, ceiling: c.grade.ceiling, workload: lineWorkload(kind, c.grade) } : null; },
});
export const loopGenerator = lineGenerator('loop', loopRungs, loopSupply);
export const pearlGenerator = lineGenerator('pearl-loop', pearlRungs, pearlSupply);
export const allTechniques = (kind: LinePuzzle['kind']): readonly Technique[] => techniquesOf(kind);
