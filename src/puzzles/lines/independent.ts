import type { LinePuzzle } from './core';

/**
 * A second loop counter, written apart from the grader. It never draws edges: it colours squares
 * inside or outside, row by row. A single loop is exactly the border of an inside region that is
 * connected, with a connected outside (the border counts as outside) and no two squares meeting only
 * at a corner. Loop colours the puzzle's own cells; Pearl Loop colours the squares between cell centres.
 */
export function independentCount(p: LinePuzzle, cap = 2, budget = 4_000_000, found?: (inside: Int8Array) => void): { status: 'counted'; count: number } | { status: 'budget-exhausted' } {
  if (p.kind === 'loop' && !found) return rowCount(p, cap, budget);
  const rows = p.kind === 'loop' ? p.rows : p.rows - 1, cols = p.kind === 'loop' ? p.cols : p.cols - 1, n = rows * cols;
  const inside = new Int8Array(n);
  const at = (r: number, c: number) => r < 0 || c < 0 || r >= rows || c >= cols ? 0 : inside[r * cols + c];
  // Loop numbers: how many of a cell's four neighbours sit on the other side.
  const numberOk = (r: number, c: number) => { const k = p.kind === 'loop' ? p.clues[r * p.cols + c] : -1; if (k < 0) return true; const me = at(r, c); return [at(r - 1, c), at(r + 1, c), at(r, c - 1), at(r, c + 1)].filter(x => x !== me).length === k; };
  // A corner where squares meet diagonally only would put four lines on one dot.
  const cornerOk = (r: number, c: number) => { const a = at(r - 1, c - 1), b = at(r - 1, c), d = at(r, c - 1), e = at(r, c); return !(a === e && b === d && a !== b); };
  // Pearl Loop: the lines at cell centre (r, c), from the four squares around it. Order: right, down, left, up.
  const lineDirs = (r: number, c: number) => [at(r - 1, c) !== at(r, c), at(r, c - 1) !== at(r, c), at(r - 1, c - 1) !== at(r, c - 1), at(r - 1, c - 1) !== at(r - 1, c)];
  const goes = (r: number, c: number, d: number) => r >= 0 && c >= 0 && r < p.rows && c < p.cols && lineDirs(r, c)[d];
  const DR = [0, 1, 0, -1], DC = [1, 0, -1, 0];
  const pearlOk = (r: number, c: number) => {
    if (p.kind !== 'pearl-loop') return true;
    const kind = p.pearls[r * p.cols + c];
    if (!kind) return true;
    const ds = [0, 1, 2, 3].filter(d => goes(r, c, d));
    if (ds.length !== 2) return false;
    const straight = ds[1] - ds[0] === 2, through = (d: number) => goes(r + DR[d], c + DC[d], d);
    if (kind === 2) return !straight && ds.every(through);
    return straight && !ds.every(through);
  };
  // Each check runs once, as soon as every square it reads has its colour.
  const checks: (() => boolean)[][] = Array.from({ length: n + 1 }, () => []);
  const when = (r: number, c: number) => Math.min(n, Math.max(0, Math.min(rows - 1, r)) * cols + Math.max(0, Math.min(cols - 1, c)) + 1);
  const ready = (rMax: number, cMax: number) => rMax >= rows ? n : when(rMax, Math.min(cols - 1, cMax));
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) checks[ready(r, c)].push(() => cornerOk(r, c));
  if (p.kind === 'loop') for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) checks[ready(r + 1, c + 1)].push(() => numberOk(r, c));
  else for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) if (p.pearls[r * p.cols + c]) checks[ready(r + 1, c + 1)].push(() => pearlOk(r, c));
  const connected = () => {
    let start = -1, total = 0;
    for (let i = 0; i < n; i++) if (inside[i]) { total++; if (start < 0) start = i; }
    if (!total) return false;
    const reach = (from: number[], value: number) => { const seen = new Set(from), stack = [...from]; while (stack.length) { const i = stack.pop()!, r = Math.floor(i / cols), c = i % cols; for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) { if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue; const j = nr * cols + nc; if (inside[j] === value && !seen.has(j)) { seen.add(j); stack.push(j); } } } return seen.size; };
    if (reach([start], 1) !== total) return false;
    const rim: number[] = [];
    for (let i = 0; i < n; i++) { const r = Math.floor(i / cols), c = i % cols; if (!inside[i] && (r === 0 || c === 0 || r === rows - 1 || c === cols - 1)) rim.push(i); }
    return reach(rim, 0) === n - total;
  };
  // After each full row: an inside group that cannot grow any more must be the only one, and an
  // outside group that cannot grow must reach the border. Otherwise this branch has no loop.
  const frontierOk = (row: number) => {
    const done = (row + 1) * cols, parent = Array.from({ length: done }, (_, i) => i), find = (i: number): number => parent[i] === i ? i : (parent[i] = find(parent[i]));
    for (let i = 0; i < done; i++) { const c = i % cols; if (c + 1 < cols && inside[i] === inside[i + 1]) parent[find(i)] = find(i + 1); if (i + cols < done && inside[i] === inside[i + cols]) parent[find(i)] = find(i + cols); }
    const open = new Set<number>(), rim = new Set<number>(), groups = new Set<number>();
    for (let i = 0; i < done; i++) {
      const r = Math.floor(i / cols), c = i % cols, g = find(i);
      groups.add(g);
      if (r === row && row + 1 < rows) open.add(g);
      if (!inside[i] && (r === 0 || c === 0 || c === cols - 1 || r === rows - 1)) rim.add(g);
    }
    let insideGroups = 0, sealed = false;
    for (const g of groups) {
      const isIn = inside[g] === 1;
      if (isIn) { insideGroups++; if (!open.has(g)) sealed = true; }
      else if (!open.has(g) && !rim.has(g)) return false;
    }
    return !(sealed && insideGroups > 1);
  };
  let count = 0, nodes = 0, exhausted = false;
  const visit = (i: number) => {
    if (exhausted || count >= cap) return;
    if (++nodes > budget) { exhausted = true; return; }
    if (i === n) { if (checks[n].every(f => f()) && connected()) { count++; found?.(inside.slice()); } return; }
    for (const v of [0, 1]) {
      inside[i] = v;
      if (i + 1 < n && !checks[i + 1].every(f => f())) continue;
      if ((i + 1) % cols === 0 && i + 1 < n && !frontierOk(Math.floor(i / cols))) continue;
      visit(i + 1);
      if (exhausted || count >= cap) break;
    }
    inside[i] = 0;
  };
  if (checks[0].length && !checks[0].every(f => f())) return { status: 'counted', count: 0 };
  visit(0);
  return exhausted ? { status: 'budget-exhausted' } : { status: 'counted', count };
}

/**
 * Loop by whole rows, remembering where it has been. After each row the rest of the board depends
 * only on that row's colours, which of its squares are already joined (the border's outside is one
 * group), what each of its numbers still needs from the row below, and whether an inside group has
 * already closed. Equal frontiers are counted once.
 */
function rowCount(p: Extract<LinePuzzle, { kind: 'loop' }>, cap: number, budget: number): { status: 'counted'; count: number } | { status: 'budget-exhausted' } {
  // FREE marks a square with no number: it needs nothing from the row below.
  const rows = p.rows, cols = p.cols, RIM = 0, FREE = 9;
  type Frontier = { colour: number[]; group: number[]; need: number[]; closed: boolean };
  const memo = new Map<string, number>();
  let work = 0;
  const key = (r: number, f: Frontier) => `${r}|${f.colour.join('')}|${f.group.join(',')}|${f.need.join('')}|${f.closed ? 1 : 0}`;
  /** The next frontier after laying `colour` as row `r` under `f`, or null if a rule breaks. */
  const lay = (r: number, f: Frontier, colour: number[]): Frontier | null => {
    for (let c = 1; c < cols; c++) { const a = f.colour[c - 1], b = f.colour[c], d = colour[c - 1], e = colour[c]; if (a === e && b === d && a !== b) return null; }
    for (let c = 0; c < cols; c++) if (f.need[c] !== FREE && f.need[c] !== (f.colour[c] !== colour[c] ? 1 : 0)) return null;
    const need = colour.map((v, c) => {
      const k = p.clues[r * cols + c];
      if (k < 0) return FREE;
      const left = c ? colour[c - 1] : 0, right = c + 1 < cols ? colour[c + 1] : 0, up = f.colour[c];
      return k - [left, right, up].filter(x => x !== v).length;
    });
    if (need.some(n => n !== FREE && (n < 0 || n > 1))) return null;
    // Groups: old labels are nodes 0..cols-1 offset by cols; new squares are nodes 0..cols-1. Node 2*cols is the rim.
    const parent = Array.from({ length: cols * 2 + 1 }, (_, i) => i), find = (x: number): number => parent[x] === x ? x : (parent[x] = find(parent[x]));
    const join = (a: number, b: number) => { parent[find(a)] = find(b); };
    const rim = cols * 2, oldNode = (c: number) => f.group[c] === RIM ? rim : cols + f.group[c] - 1;
    for (let c = 0; c < cols; c++) {
      if (colour[c] === f.colour[c]) join(c, oldNode(c));
      if (c && colour[c] === colour[c - 1]) join(c, c - 1);
      if (!colour[c] && (c === 0 || c === cols - 1 || r === rows - 1)) join(c, rim);
    }
    // Old groups that reach no square of this row are finished.
    let closed = f.closed;
    const oldGroups = new Map<number, number>();
    f.group.forEach((g, c) => { if (g !== RIM) oldGroups.set(g, f.colour[c]); });
    const reached = new Set(colour.map((_, c) => find(c)));
    for (const [g, v] of oldGroups) {
      if (reached.has(find(cols + g - 1))) continue;
      if (!v) return null; // an outside pocket with no way to the border
      if (closed) return null;
      closed = true;
    }
    if (closed && colour.some(Boolean)) return null;
    const names = new Map<number, number>([[find(rim), RIM]]);
    const group = colour.map((_, c) => { const root = find(c); if (!names.has(root)) names.set(root, names.size); return names.get(root)!; });
    return { colour, group, need, closed };
  };
  const count = (r: number, f: Frontier): number => {
    if (r === rows) {
      // The row below the board is all outside.
      if (f.need.some((n, c) => n !== FREE && n !== f.colour[c])) return 0;
      const insideGroups = new Set(f.group.filter((_, c) => f.colour[c]));
      return insideGroups.size + (f.closed ? 1 : 0) === 1 ? 1 : 0;
    }
    const k = key(r, f), hit = memo.get(k);
    if (hit !== undefined) return hit;
    let total = 0;
    for (let bits = 0; bits < 1 << cols && total < cap; bits++) {
      if (++work > budget) throw new Error('budget');
      const next = lay(r, f, Array.from({ length: cols }, (_, c) => (bits >> c) & 1));
      if (next) total = Math.min(cap, total + count(r + 1, next));
    }
    memo.set(k, total);
    return total;
  };
  try {
    return { status: 'counted', count: count(0, { colour: Array<number>(cols).fill(0), group: Array<number>(cols).fill(RIM), need: Array<number>(cols).fill(FREE), closed: false }) };
  } catch (e) { if (e instanceof Error && e.message === 'budget') return { status: 'budget-exhausted' }; throw e; }
}
