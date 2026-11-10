/**
 * Independent Sudoku grader for corpus comparison. Written separately from src/puzzles/latin/solver.ts:
 * boolean candidate tables, explicit placements, and each technique coded from its textbook statement
 * (pointing and claiming as two rules, fish on rows then columns). It imports nothing from the app.
 */
export const ladder = ['single', 'hidden-single', 'locked-candidates', 'naked-pair', 'hidden-pair', 'naked-triple', 'hidden-triple', 'x-wing', 'swordfish', 'xy-wing', 'simple-coloring'] as const;
export type RefTechnique = typeof ladder[number];
type Board = { n: number; bh: number; bw: number; value: number[]; cand: boolean[][] };

function setup(givens: readonly number[], n: number): Board | null {
  const bh = n === 9 ? 3 : 2, bw = n / bh, value = Array<number>(n * n).fill(0);
  const cand = Array.from({ length: n * n }, () => Array<boolean>(n + 1).fill(true));
  const b: Board = { n, bh, bw, value, cand };
  for (let i = 0; i < n * n; i++) if (givens[i] && !place(b, i, givens[i])) return null;
  return b;
}
const row = (b: Board, r: number) => Array.from({ length: b.n }, (_, c) => r * b.n + c);
const col = (b: Board, c: number) => Array.from({ length: b.n }, (_, r) => r * b.n + c);
const box = (b: Board, k: number) => { const r0 = Math.floor(k / (b.n / b.bw)) * b.bh, c0 = (k % (b.n / b.bw)) * b.bw, out: number[] = []; for (let r = 0; r < b.bh; r++) for (let c = 0; c < b.bw; c++) out.push((r0 + r) * b.n + c0 + c); return out; };
const units = (b: Board) => [...Array.from({ length: b.n }, (_, k) => row(b, k)), ...Array.from({ length: b.n }, (_, k) => col(b, k)), ...Array.from({ length: b.n }, (_, k) => box(b, k))];
const sees = (b: Board, x: number, y: number) => x !== y && (Math.floor(x / b.n) === Math.floor(y / b.n) || x % b.n === y % b.n || boxIndex(b, x) === boxIndex(b, y));
const boxIndex = (b: Board, i: number) => Math.floor(Math.floor(i / b.n) / b.bh) * (b.n / b.bw) + Math.floor((i % b.n) / b.bw);
const options = (b: Board, i: number) => b.value[i] ? [] : Array.from({ length: b.n }, (_, k) => k + 1).filter(d => b.cand[i][d]);
function place(b: Board, i: number, d: number): boolean {
  if (b.value[i] || !b.cand[i][d]) return false;
  b.value[i] = d;
  for (let j = 0; j < b.n * b.n; j++) if (sees(b, i, j)) b.cand[j][d] = false;
  for (let k = 1; k <= b.n; k++) b.cand[i][k] = k === d;
  return true;
}
/** Removes digit d from the listed cells. True when anything changed. */
const strike = (b: Board, cells: readonly number[], d: number) => { let changed = false; for (const i of cells) if (!b.value[i] && b.cand[i][d]) { b.cand[i][d] = false; changed = true; } return changed; };
const subsets = <T,>(xs: readonly T[], k: number): T[][] => k === 0 ? [[]] : xs.flatMap((x, i) => subsets(xs.slice(i + 1), k - 1).map(s => [x, ...s]));

const rules: Record<RefTechnique, (b: Board) => boolean> = {
  single: b => { for (let i = 0; i < b.n * b.n; i++) { const o = options(b, i); if (o.length === 1) return place(b, i, o[0]); } return false; },
  'hidden-single': b => { for (const u of units(b)) for (let d = 1; d <= b.n; d++) { if (u.some(i => b.value[i] === d)) continue; const at = u.filter(i => !b.value[i] && b.cand[i][d]); if (at.length === 1) return place(b, at[0], d); } return false; },
  'locked-candidates': b => {
    for (let k = 0; k < b.n; k++) for (let d = 1; d <= b.n; d++) {
      const at = box(b, k).filter(i => !b.value[i] && b.cand[i][d]);
      if (at.length < 2) continue;
      const rows = new Set(at.map(i => Math.floor(i / b.n))), cols = new Set(at.map(i => i % b.n));
      if (rows.size === 1 && strike(b, row(b, [...rows][0]).filter(i => !at.includes(i)), d)) return true; // pointing
      if (cols.size === 1 && strike(b, col(b, [...cols][0]).filter(i => !at.includes(i)), d)) return true;
    }
    for (const line of [...Array.from({ length: b.n }, (_, k) => row(b, k)), ...Array.from({ length: b.n }, (_, k) => col(b, k))]) for (let d = 1; d <= b.n; d++) {
      const at = line.filter(i => !b.value[i] && b.cand[i][d]);
      if (at.length < 2) continue;
      const boxes = new Set(at.map(i => boxIndex(b, i)));
      if (boxes.size === 1 && strike(b, box(b, [...boxes][0]).filter(i => !line.includes(i)), d)) return true; // claiming
    }
    return false;
  },
  'naked-pair': b => naked(b, 2), 'naked-triple': b => naked(b, 3), 'hidden-pair': b => hidden(b, 2), 'hidden-triple': b => hidden(b, 3),
  'x-wing': b => fish(b, 2), swordfish: b => fish(b, 3),
  'xy-wing': b => {
    const bi = Array.from({ length: b.n * b.n }, (_, i) => i).filter(i => options(b, i).length === 2);
    for (const p of bi) { const [x, y] = options(b, p);
      for (const w1 of bi.filter(i => sees(b, p, i))) for (const w2 of bi.filter(i => sees(b, p, i) && i !== w1)) {
        const a = options(b, w1), c = options(b, w2);
        if (!(a.includes(x) && !a.includes(y) && c.includes(y) && !c.includes(x))) continue;
        const z = a.find(v => v !== x)!;
        if (c.find(v => v !== y) !== z || z === x || z === y) continue;
        const targets = Array.from({ length: b.n * b.n }, (_, i) => i).filter(i => i !== p && sees(b, i, w1) && sees(b, i, w2));
        if (strike(b, targets, z)) return true;
      } }
    return false;
  },
  'simple-coloring': b => {
    for (let d = 1; d <= b.n; d++) {
      const edges: [number, number][] = [];
      for (const u of units(b)) { if (u.some(i => b.value[i] === d)) continue; const at = u.filter(i => !b.value[i] && b.cand[i][d]); if (at.length === 2) edges.push([at[0], at[1]]); }
      const color = new Map<number, number>();
      let comp = 0;
      for (const [s] of edges) {
        if (color.has(s)) continue;
        color.set(s, comp * 2); const stack = [s], members = [s];
        while (stack.length) { const a = stack.pop()!; for (const [x, y] of edges) { const other = x === a ? y : y === a ? x : -1; if (other < 0 || color.has(other)) continue; color.set(other, color.get(a)! ^ 1); stack.push(other); members.push(other); } }
        comp++;
        if (members.length < 3) continue;
        for (const c of [color.get(s)!, color.get(s)! ^ 1]) { const same = members.filter(i => color.get(i) === c); if (same.some(i => same.some(j => sees(b, i, j))) && strike(b, same, d)) return true; } // colour wrap
        const both = Array.from({ length: b.n * b.n }, (_, i) => i).filter(i => !members.includes(i) && [0, 1].every(t => members.some(m => (color.get(m)! & 1) === ((color.get(s)! & 1) ^ t) && sees(b, i, m))));
        if (strike(b, both, d)) return true; // colour trap
      }
    }
    return false;
  },
};
function naked(b: Board, k: number) {
  for (const u of units(b)) {
    const open = u.filter(i => !b.value[i] && options(b, i).length <= k && options(b, i).length >= 2);
    for (const set of subsets(open, k)) { const digits = [...new Set(set.flatMap(i => options(b, i)))]; if (digits.length !== k) continue;
      let changed = false; for (const d of digits) changed = strike(b, u.filter(i => !set.includes(i)), d) || changed; if (changed) return true; }
  }
  return false;
}
function hidden(b: Board, k: number) {
  for (const u of units(b)) {
    const free = Array.from({ length: b.n }, (_, i) => i + 1).filter(d => !u.some(i => b.value[i] === d));
    for (const ds of subsets(free, k)) { const at = [...new Set(u.filter(i => !b.value[i] && ds.some(d => b.cand[i][d])))]; if (at.length !== k || ds.some(d => !at.some(i => b.cand[i][d]))) continue;
      let changed = false; for (const i of at) for (let d = 1; d <= b.n; d++) if (!ds.includes(d) && b.cand[i][d]) { b.cand[i][d] = false; changed = true; } if (changed) return true; }
  }
  return false;
}
function fish(b: Board, k: number) {
  for (const byRow of [true, false]) for (let d = 1; d <= b.n; d++) {
    const lines = Array.from({ length: b.n }, (_, k2) => byRow ? row(b, k2) : col(b, k2)).filter(l => !l.some(i => b.value[i] === d)).map(l => l.filter(i => !b.value[i] && b.cand[i][d])).filter(at => at.length >= 2 && at.length <= k);
    for (const set of subsets(lines, k)) {
      const cover = [...new Set(set.flat().map(i => byRow ? i % b.n : Math.floor(i / b.n)))];
      if (cover.length !== k) continue;
      const base = new Set(set.flat().map(i => byRow ? Math.floor(i / b.n) : i % b.n));
      const targets = cover.flatMap(c => byRow ? col(b, c) : row(b, c)).filter(i => !base.has(byRow ? Math.floor(i / b.n) : i % b.n));
      if (strike(b, targets, d)) return true;
    }
  }
  return false;
}
export type RefGrade = { status: 'complete' | 'stalled' | 'invalid'; ceiling: RefTechnique | null; counts: Partial<Record<RefTechnique, number>> };
export function referenceGrade(givens: readonly number[], n: number): RefGrade {
  const b = setup(givens, n), counts: Partial<Record<RefTechnique, number>> = {};
  if (!b) return { status: 'invalid', ceiling: null, counts };
  let top = -1;
  for (let guard = 0; guard < 5000; guard++) {
    if (b.value.every(Boolean)) return { status: 'complete', ceiling: ladder[Math.max(0, top)], counts };
    if (b.cand.some((c, i) => !b.value[i] && c.slice(1).every(x => !x))) return { status: 'invalid', ceiling: null, counts };
    const used = ladder.findIndex(t => rules[t](b));
    if (used < 0) return { status: 'stalled', ceiling: null, counts };
    counts[ladder[used]] = (counts[ladder[used]] ?? 0) + 1;
    top = Math.max(top, used);
  }
  return { status: 'stalled', ceiling: null, counts };
}
