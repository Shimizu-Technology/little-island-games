import { exactKeys, plain, uint } from '../../state/saveBits';
export const kinds = ['sudoku', 'cage-math', 'greater-than', 'skyline', 'killer', 'cross-sums'] as const;
export type LatinKind = typeof kinds[number];
export type Cage = { cells: number[]; op: '+' | '-' | '*' | '/' | '='; target: number };
export type LatinPuzzle = { kind: LatinKind; size: number; box: number; givens: number[]; cages: Cage[]; less: [number, number][]; sights: [number, number][]; mask: number[] };
export const digits = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
export const cellsOf = (p: LatinPuzzle) => Array.from({ length: p.size * p.size }, (_, i) => i).filter(i => !p.mask[i]);
export function groups(p: LatinPuzzle): number[][] {
  const n = p.size;
  if (p.kind === 'cross-sums') return p.cages.map(c => c.cells);
  const out = digits(n).flatMap((_, r) => [digits(n).map((_, c) => r * n + c), digits(n).map((_, c) => c * n + r)]);
  if (p.box) for (let r = 0; r < n; r += p.box) for (let c = 0; c < n; c += n / p.box) out.push(digits(n).map((_, i) => (r + Math.floor(i / (n / p.box))) * n + c + i % (n / p.box)));
  if (p.kind === 'killer') out.push(...p.cages.map(c => c.cells));
  return out;
}
export const visible = (values: readonly number[]) => { let top = 0, count = 0; for (const v of values) if (v > top) { top = v; count++; } return count; };
/** Sight IDs: top, right, bottom, left; each indexed in screen order. */
export function sightCells(p: LatinPuzzle, id: number): number[] {
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
function connected(cells: readonly number[], n: number) {
  if (!cells.length) return false;
  const seen = new Set([cells[0]]);
  for (let changed = true; changed;) { changed = false; for (const i of cells) if (!seen.has(i) && [...seen].some(j => Math.abs(Math.floor(i / n) - Math.floor(j / n)) + Math.abs(i % n - j % n) === 1)) { seen.add(i); changed = true; } }
  return seen.size === cells.length;
}
export function validPuzzle(x: unknown): x is LatinPuzzle {
  if (!plain(x) || !exactKeys(x, ['kind', 'size', 'box', 'givens', 'cages', 'less', 'sights', 'mask']) || !kinds.includes(x.kind as LatinKind) || !uint(x.size, 9) || x.size < 2) return false;
  const p = x as LatinPuzzle, n = p.size, max = p.kind === 'cross-sums' ? 9 : n;
  if (![0, 2, 3].includes(p.box) || p.box && n % p.box || !Array.isArray(p.givens) || p.givens.length !== n * n || !p.givens.every(v => uint(v, max)) || !Array.isArray(p.mask) || p.mask.length !== n * n || !p.mask.every(v => v === 0 || v === 1) || p.mask.some((v, i) => v && p.givens[i])) return false;
  const cell = (i: unknown) => uint(i, n * n - 1) && !p.mask[i];
  if (!Array.isArray(p.cages) || p.cages.length > n * n || !p.cages.every(c => plain(c) && exactKeys(c, ['cells', 'op', 'target']) && Array.isArray(c.cells) && c.cells.length > 0 && c.cells.length <= 9 && c.cells.every(cell) && new Set(c.cells).size === c.cells.length && ['+', '-', '*', '/', '='].includes(c.op as string) && uint(c.target, 387420489) && c.target > 0 && (c.op === '=' ? c.cells.length === 1 : c.op === '-' || c.op === '/' ? c.cells.length === 2 : true) && connected(c.cells as number[], n))) return false;
  if (!Array.isArray(p.less) || p.less.length > n * n * 2 || !p.less.every(e => Array.isArray(e) && e.length === 2 && e.every(cell) && Math.abs(Math.floor(e[0] / n) - Math.floor(e[1] / n)) + Math.abs(e[0] % n - e[1] % n) === 1) || new Set(p.less.map(e => [...e].sort((a,b)=>a-b).join())).size !== p.less.length) return false;
  if (!Array.isArray(p.sights) || p.sights.length > 4 * n || !p.sights.every(e => Array.isArray(e) && e.length === 2 && uint(e[0], n * 4 - 1) && uint(e[1], n) && e[1] > 0) || new Set(p.sights.map(e => e[0])).size !== p.sights.length) return false;
  if (p.kind !== 'cross-sums' && p.mask.some(Boolean) || !['sudoku', 'killer'].includes(p.kind) && p.box !== 0 || ['sudoku', 'killer'].includes(p.kind) && !p.box || p.kind !== 'greater-than' && p.less.length || p.kind !== 'skyline' && p.sights.length || !['cage-math', 'killer', 'cross-sums'].includes(p.kind) && p.cages.length) return false;
  if (p.kind === 'cage-math' || p.kind === 'killer') { const all = p.cages.flatMap(c => c.cells); if (all.length !== n * n || new Set(all).size !== all.length || p.kind === 'killer' && p.cages.some(c => c.op !== '+' && c.op !== '=')) return false; }
  if (p.kind === 'cross-sums') {
    if (p.cages.some(c => c.op !== '+' || c.cells.length < 2 || !c.cells.every((v,i,a)=>!i || v === a[i-1] + (Math.floor(a[0] / n) === Math.floor(a[1] / n) ? 1 : n)))) return false;
    for (const i of cellsOf(p)) if (p.cages.filter(c => c.cells.includes(i)).length !== 2) return false;
    if (!connected(cellsOf(p), n)) return false;
  }
  return conflicts(p, p.givens).length === 0;
}
/** Public-rule conflicts only, never a comparison with an answer. */
export function conflicts(p: LatinPuzzle, values: readonly number[]): number[] {
  const out = new Set<number>();
  for (const g of groups(p)) for (const i of g) if (values[i] && g.some(j => j !== i && values[i] === values[j])) out.add(i);
  for (const c of p.cages) if (c.cells.every(i => values[i]) && !cageOK(c, c.cells.map(i => values[i]))) c.cells.forEach(i => out.add(i));
  for (const [a, b] of p.less) if (values[a] && values[b] && values[a] >= values[b]) { out.add(a); out.add(b); }
  for (const [id, clue] of p.sights) { const line = sightCells(p, id); if (line.every(i => values[i]) && visible(line.map(i => values[i])) !== clue) line.forEach(i => out.add(i)); }
  return [...out].sort((a, b) => a - b);
}
export function solved(p: LatinPuzzle, v: readonly number[]): boolean { return v.length === p.givens.length && cellsOf(p).every(i => Number.isInteger(v[i]) && v[i] > 0 && v[i] <= (p.kind === 'cross-sums' ? 9 : p.size) && (!p.givens[i] || v[i] === p.givens[i])) && p.mask.every((m,i)=>!m || v[i] === 0) && !conflicts(p, v).length; }
/** Compact, explicit, solution-free pack tuple. */
export const encodePuzzle = (p: LatinPuzzle) => [kinds.indexOf(p.kind), p.size, p.box, p.givens.join(''), p.cages.map(c => [c.cells, c.op, c.target]), p.less, p.sights, p.mask.join('')];
export function decodePuzzle(x: unknown): LatinPuzzle | null {
  if (!Array.isArray(x) || x.length !== 8 || !uint(x[0], 5) || typeof x[3] !== 'string' || !/^[0-9]+$/.test(x[3]) || !Array.isArray(x[4]) || !x[4].every(c=>Array.isArray(c)&&c.length===3) || typeof x[7] !== 'string' || !/^[01]+$/.test(x[7])) return null;
  const p = { kind: kinds[x[0]], size: x[1], box: x[2], givens: [...x[3]].map(Number), cages: x[4].map(([cells, op, target]) => ({ cells, op, target })), less: x[5], sights: x[6], mask: [...x[7]].map(Number) };
  return validPuzzle(p) ? p : null;
}
