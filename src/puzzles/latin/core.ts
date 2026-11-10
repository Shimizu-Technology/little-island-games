import { exactKeys, plain, uint } from '../../state/saveBits';

/** Every Latin-family game shares this one rules core. Arithmetic and edge clues are public facts. */
export const kinds = ['sudoku', 'cage-math', 'greater-than', 'skyline', 'killer', 'cross-sums'] as const;
export type LatinKind = typeof kinds[number];
export type CageOp = '+' | '-' | '*' | '/' | '=';
export type Cage = { cells: number[]; op: CageOp; target: number };
/**
 * `box` is the number of rows in one box (0 for none): 2 on 4×4 and 6×6 (2×2, 2×3), 3 on 9×9.
 * `less` holds [smaller, larger] neighbour pairs. `sights` holds [edge id, visible count].
 * `mask` marks Cross Sums clue cells, which never take a number.
 */
export type LatinPuzzle = { kind: LatinKind; size: number; box: number; givens: number[]; cages: Cage[]; less: [number, number][]; sights: [number, number][]; mask: number[] };

export const digits = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
export const maxValue = (p: Pick<LatinPuzzle, 'kind' | 'size'>) => p.kind === 'cross-sums' ? 9 : p.size;
export const rowOf = (p: Pick<LatinPuzzle, 'size'>, i: number) => Math.floor(i / p.size);
export const colOf = (p: Pick<LatinPuzzle, 'size'>, i: number) => i % p.size;
export const boxOf = (p: Pick<LatinPuzzle, 'size' | 'box'>, i: number) => p.box ? Math.floor(rowOf(p, i) / p.box) * p.box + Math.floor(colOf(p, i) / (p.size / p.box)) : -1;

export type GroupKind = 'row' | 'column' | 'box' | 'cage' | 'run';
export type Group = { kind: GroupKind; index: number; cells: number[] };
type Shape = { cells: number[]; groups: Group[]; peers: number[][] };
const frozenShapes = new WeakMap<LatinPuzzle, Shape>(), keyedShapes = new Map<string, Shape>();
/** Open cells, no-repeat groups and peers. Givens never affect the shape, so drafts share one entry. */
export function shapeOf(p: LatinPuzzle): Shape {
  const frozen = frozenShapes.get(p);
  if (frozen) return frozen;
  const key = `${p.kind}|${p.size}|${p.box}|${p.cages.length ? JSON.stringify(p.cages) : ''}|${p.mask.includes(1) ? p.mask.join('') : ''}`, hit = keyedShapes.get(key);
  if (hit) { if (Object.isFrozen(p)) frozenShapes.set(p, hit); return hit; }
  const n = p.size, cells = Array.from({ length: n * n }, (_, i) => i).filter(i => !p.mask[i]), groups: Group[] = [];
  if (p.kind === 'cross-sums') p.cages.forEach((c, index) => groups.push({ kind: 'run', index, cells: c.cells }));
  else {
    for (let r = 0; r < n; r++) groups.push({ kind: 'row', index: r, cells: digits(n).map((_, c) => r * n + c) });
    for (let c = 0; c < n; c++) groups.push({ kind: 'column', index: c, cells: digits(n).map((_, r) => r * n + c) });
    if (p.box) {
      const w = n / p.box;
      for (let b = 0; b < n; b++) { const r0 = Math.floor(b / p.box) * p.box, c0 = (b % p.box) * w; groups.push({ kind: 'box', index: b, cells: digits(n).map((_, k) => (r0 + Math.floor(k / w)) * n + c0 + k % w) }); }
    }
    if (p.kind === 'killer') p.cages.forEach((c, index) => { if (c.cells.length > 1) groups.push({ kind: 'cage', index, cells: c.cells }); });
  }
  const peers = p.givens.map(() => new Set<number>());
  for (const g of groups) for (const a of g.cells) for (const b of g.cells) if (a !== b) peers[a].add(b);
  const shape = { cells, groups, peers: peers.map(s => [...s].sort((a, b) => a - b)) };
  keyedShapes.set(key, shape);
  if (keyedShapes.size > 256) keyedShapes.delete(keyedShapes.keys().next().value!);
  if (Object.isFrozen(p)) frozenShapes.set(p, shape);
  return shape;
}
export const cellsOf = (p: LatinPuzzle) => shapeOf(p).cells;
export const groups = (p: LatinPuzzle) => shapeOf(p).groups;

/** Rooftops seen from one edge: each taller roof hides every shorter one behind it. */
export const visible = (values: readonly number[]) => { let top = 0, count = 0; for (const v of values) if (v > top) { top = v; count++; } return count; };
/** Sight IDs: top, right, bottom, left; within an edge, screen order. Cells run away from that edge. */
export function sightCells(p: Pick<LatinPuzzle, 'size'>, id: number): number[] {
  const n = p.size, side = Math.floor(id / n), line = id % n;
  return digits(n).map((_, i) => side === 0 ? i * n + line : side === 1 ? line * n + n - 1 - i : side === 2 ? (n - 1 - i) * n + line : line * n + i);
}
export function cageOK(c: Cage, v: readonly number[]): boolean {
  if (v.some(x => !x)) return false;
  if (c.op === '=') return v[0] === c.target;
  if (c.op === '+') return v.reduce((a, b) => a + b, 0) === c.target;
  if (c.op === '*') return v.reduce((a, b) => a * b, 1) === c.target;
  if (c.op === '-') return Math.abs(v[0] - v[1]) === c.target;
  return Math.max(...v) === c.target * Math.min(...v);
}
const adjacent = (n: number, a: number, b: number) => Math.abs(Math.floor(a / n) - Math.floor(b / n)) + Math.abs(a % n - b % n) === 1;
function connected(cells: readonly number[], n: number) {
  if (!cells.length) return false;
  const seen = new Set([cells[0]]), queue = [cells[0]];
  for (let q = 0; q < queue.length; q++) for (const j of cells) if (!seen.has(j) && adjacent(n, queue[q], j)) { seen.add(j); queue.push(j); }
  return seen.size === cells.length;
}
const sizes: Record<LatinKind, readonly number[]> = { sudoku: [4, 6, 9], killer: [4, 6, 9], 'cage-math': [3, 4, 5, 6, 7, 8, 9], 'greater-than': [4, 5, 6, 7, 8, 9], skyline: [4, 5, 6, 7], 'cross-sums': [4, 5, 6, 7, 8, 9, 10] };
const boxRows = (n: number) => n === 9 ? 3 : 2;

/** Bounded structural validation. Every accepted puzzle has consistent givens under its public rules. */
export function validPuzzle(x: unknown): x is LatinPuzzle {
  if (!plain(x) || !exactKeys(x, ['kind', 'size', 'box', 'givens', 'cages', 'less', 'sights', 'mask']) || !kinds.includes(x.kind as LatinKind) || !uint(x.size, 10)) return false;
  const p = x as LatinPuzzle, n = p.size, max = maxValue(p), boxed = p.kind === 'sudoku' || p.kind === 'killer';
  if (!sizes[p.kind].includes(n) || p.box !== (boxed ? boxRows(n) : 0)) return false;
  if (!Array.isArray(p.givens) || p.givens.length !== n * n || !p.givens.every(v => uint(v, max)) || !Array.isArray(p.mask) || p.mask.length !== n * n || !p.mask.every(v => v === 0 || v === 1) || p.mask.some((v, i) => v && p.givens[i])) return false;
  if (p.kind !== 'cross-sums' && p.mask.some(Boolean)) return false;
  const open = (i: unknown): i is number => uint(i, n * n - 1) && !p.mask[i];
  if (!Array.isArray(p.cages) || p.cages.length > n * n || !p.cages.every(c => plain(c) && exactKeys(c, ['cells', 'op', 'target']) && Array.isArray(c.cells) && c.cells.length > 0 && c.cells.length <= 9 && c.cells.every(open) && new Set(c.cells).size === c.cells.length
    && ['+', '-', '*', '/', '='].includes(c.op as string) && uint(c.target, 387420489) && c.target > 0 && (c.op === '=' ? c.cells.length === 1 : c.cells.length > 1) && (c.op === '-' || c.op === '/' ? c.cells.length === 2 : true) && connected(c.cells as number[], n))) return false;
  if (!Array.isArray(p.less) || p.less.length > 2 * n * n || !p.less.every(e => Array.isArray(e) && e.length === 2 && e.every(open) && adjacent(n, e[0], e[1])) || new Set(p.less.map(e => [...e].sort((a, b) => a - b).join())).size !== p.less.length) return false;
  if (!Array.isArray(p.sights) || p.sights.length > 4 * n || !p.sights.every(e => Array.isArray(e) && e.length === 2 && uint(e[0], 4 * n - 1) && uint(e[1], n) && e[1] > 0) || new Set(p.sights.map(e => e[0])).size !== p.sights.length) return false;
  if (p.kind !== 'greater-than' && p.less.length || p.kind !== 'skyline' && p.sights.length || !['cage-math', 'killer', 'cross-sums'].includes(p.kind) && p.cages.length) return false;
  if (p.kind === 'cage-math' || p.kind === 'killer') {
    const all = p.cages.flatMap(c => c.cells);
    if (all.length !== n * n || new Set(all).size !== all.length) return false;
    if (p.kind === 'killer' && p.cages.some(c => c.op !== '+' && c.op !== '=')) return false;
  }
  if (p.kind === 'cross-sums') {
    // Runs are maximal horizontal or vertical strips of open cells, each clued with its sum.
    const runs = crossRuns(p.mask, n);
    if (p.cages.length !== runs.length || p.cages.some((c, i) => c.op !== '+' || c.cells.join() !== runs[i].join() || c.target < triangular(c.cells.length) || c.target > 45 - triangular(9 - c.cells.length))) return false;
    if (cellsOf(p).length < 4 || !connected(cellsOf(p), n) || cellsOf(p).some(i => runs.filter(r => r.includes(i)).length !== 2)) return false;
  }
  return conflicts(p, p.givens).length === 0;
}
const triangular = (k: number) => k * (k + 1) / 2;
/** Rows first, then columns, each in reading order. A run has at least two cells. */
export function crossRuns(mask: readonly number[], n: number): number[][] {
  const runs: number[][] = [];
  for (const axis of [0, 1]) for (let line = 0; line < n; line++) {
    let run: number[] = [];
    const flush = () => { if (run.length >= 2) runs.push(run); run = []; };
    for (let at = 0; at < n; at++) { const i = axis ? at * n + line : line * n + at; if (mask[i]) flush(); else run.push(i); }
    flush();
  }
  return runs;
}
/** Public-rule conflicts only, never a comparison with an answer. */
export function conflicts(p: LatinPuzzle, values: readonly number[]): number[] {
  const out = new Set<number>();
  for (const g of groups(p)) for (const i of g.cells) if (values[i] && g.cells.some(j => j !== i && values[i] === values[j])) out.add(i);
  for (const c of p.cages) if (c.cells.every(i => values[i]) && !cageOK(c, c.cells.map(i => values[i]))) c.cells.forEach(i => out.add(i));
  for (const [a, b] of p.less) if (values[a] && values[b] && values[a] >= values[b]) { out.add(a); out.add(b); }
  for (const [id, clue] of p.sights) { const line = sightCells(p, id); if (line.every(i => values[i]) && visible(line.map(i => values[i])) !== clue) line.forEach(i => out.add(i)); }
  return [...out].sort((a, b) => a - b);
}
export function solved(p: LatinPuzzle, v: readonly number[]): boolean {
  const max = maxValue(p);
  return v.length === p.givens.length && cellsOf(p).every(i => Number.isInteger(v[i]) && v[i] > 0 && v[i] <= max && (!p.givens[i] || v[i] === p.givens[i])) && p.mask.every((m, i) => !m || v[i] === 0) && !conflicts(p, v).length;
}

/**
 * Compact, solution-free pack tuple: [kind index, size, givens digits, cages, less, sights, mask digits].
 * `box` follows from kind and size. Digits are one character each (Cross Sums givens stay 1–9).
 */
export const encodePuzzle = (p: LatinPuzzle): unknown[] => {
  const row: unknown[] = [kinds.indexOf(p.kind), p.size, p.givens.join(''), p.cages.map(c => [c.cells, c.op, c.target]), p.less, p.sights, p.mask.some(Boolean) ? p.mask.join('') : 0];
  while (row.length > 3 && (row[row.length - 1] === 0 || Array.isArray(row[row.length - 1]) && !(row[row.length - 1] as unknown[]).length)) row.pop();
  return row;
};
export function decodePuzzle(x: unknown): LatinPuzzle | null {
  if (!Array.isArray(x) || x.length < 3 || x.length > 7 || !uint(x[0], kinds.length - 1) || !uint(x[1], 10) || typeof x[2] !== 'string' || !/^[0-9]{1,100}$/.test(x[2])) return null;
  const [kind, size, givens, cages = [], less = [], sights = [], mask = 0] = x as [number, number, string, unknown, unknown, unknown, unknown];
  if (!Array.isArray(cages) || cages.length > 100 || !cages.every(c => Array.isArray(c) && c.length === 3) || !(mask === 0 || typeof mask === 'string' && /^[01]{1,100}$/.test(mask))) return null;
  const k = kinds[kind], boxed = k === 'sudoku' || k === 'killer';
  const p = { kind: k, size, box: boxed ? boxRows(size) : 0, givens: [...givens].map(Number), cages: (cages as unknown[][]).map(([cells, op, target]) => ({ cells, op, target })), less, sights, mask: mask === 0 ? Array<number>(size * size).fill(0) : [...mask].map(Number) };
  return validPuzzle(p) ? p : null;
}
