import type { LatinPuzzle } from './core';

/**
 * Second solution counter, written apart from the grader: plain backtracking over used-number masks
 * per unit, with each clue tested directly on partial assignments. It imports no domain, deduction
 * or tuple code, so a bug in the grader's propagation cannot make both counters agree by accident.
 */
export function independentCount(p: LatinPuzzle, cap = 2, budget = 400_000) {
  const n = p.size, max = p.kind === 'cross-sums' ? 9 : n, grid = [...p.givens], all = n * n;
  const open: number[] = [];
  for (let i = 0; i < all; i++) if (!p.mask[i]) open.push(i);
  // Units: rows, columns and boxes for Latin kinds; Killer cages; Cross Sums runs.
  const units: number[][] = [];
  if (p.kind === 'cross-sums') for (const c of p.cages) units.push(c.cells);
  else {
    for (let r = 0; r < n; r++) units.push(Array.from({ length: n }, (_, c) => r * n + c));
    for (let c = 0; c < n; c++) units.push(Array.from({ length: n }, (_, r) => r * n + c));
    if (p.box) { const h = p.box, w = n / p.box; for (let r = 0; r < n; r += h) for (let c = 0; c < n; c += w) { const u: number[] = []; for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) u.push(y * n + x); units.push(u); } }
    if (p.kind === 'killer') for (const c of p.cages) if (c.cells.length > 1) units.push(c.cells);
  }
  const unitsOf: number[][] = Array.from({ length: all }, () => []);
  units.forEach((u, k) => u.forEach(i => unitsOf[i].push(k)));
  const used = units.map(() => 0);
  const cagesOf: number[][] = Array.from({ length: all }, () => []);
  p.cages.forEach((c, k) => c.cells.forEach(i => cagesOf[i].push(k)));
  const lessOf: number[][] = Array.from({ length: all }, () => []);
  p.less.forEach((e, k) => e.forEach(i => lessOf[i].push(k)));
  const line = (id: number) => { const side = Math.floor(id / n), at = id % n; return Array.from({ length: n }, (_, k) => side === 0 ? k * n + at : side === 1 ? at * n + n - 1 - k : side === 2 ? (n - 1 - k) * n + at : at * n + k); };
  const lines = p.sights.map(([id]) => line(id));
  const sightsOf: number[][] = Array.from({ length: all }, () => []);
  lines.forEach((l, k) => l.forEach(i => sightsOf[i].push(k)));

  const cageFine = (k: number) => {
    const c = p.cages[k], vs = c.cells.map(i => grid[i]), unknown = vs.filter(v => !v).length;
    let sum = 0, product = 1;
    for (const v of vs) if (v) { sum += v; product *= v; }
    if (c.op === '+') return sum + unknown <= c.target && sum + unknown * max >= c.target && (unknown || sum === c.target);
    if (c.op === '*') return c.target % product === 0 && (unknown || product === c.target);
    if (unknown) return true;
    if (c.op === '=') return vs[0] === c.target;
    if (c.op === '-') return Math.abs(vs[0] - vs[1]) === c.target;
    return Math.max(vs[0], vs[1]) === c.target * Math.min(vs[0], vs[1]);
  };
  const sightFine = (k: number) => {
    const vs = lines[k].map(i => grid[i]);
    let seen = 0, top = 0;
    // Count roofs certainly visible before the first gap; a complete line must match exactly.
    for (const v of vs) { if (!v) break; if (v > top) { top = v; seen++; } }
    // Once the tallest roof is known, nothing behind it can be seen.
    if (vs.every(Boolean) || top === n) return seen === p.sights[k][1];
    return seen <= p.sights[k][1];
  };
  const fits = (i: number, v: number) => {
    for (const k of unitsOf[i]) if (used[k] & (1 << v)) return false;
    grid[i] = v;
    let ok = true;
    for (const k of lessOf[i]) { const [a, b] = p.less[k]; if (grid[a] && grid[b] && grid[a] >= grid[b]) ok = false; }
    for (const k of cagesOf[i]) if (ok && !cageFine(k)) ok = false;
    for (const k of sightsOf[i]) if (ok && !sightFine(k)) ok = false;
    grid[i] = 0;
    return ok;
  };
  const place = (i: number, v: number) => { grid[i] = v; for (const k of unitsOf[i]) used[k] |= 1 << v; };
  const lift = (i: number, v: number) => { grid[i] = 0; for (const k of unitsOf[i]) used[k] &= ~(1 << v); };

  let nodes = 0, count = 0, exhausted = false;
  let first = null as number[] | null;
  // Givens must stand up by themselves: a filled invalid board is never a counted solution.
  for (const i of open) if (grid[i]) {
    const v = grid[i]; grid[i] = 0;
    if (!fits(i, v)) return { status: 'counted' as const, count: 0, first: null, nodes };
    place(i, v);
  }
  const walk = () => {
    if (count >= cap || exhausted) return;
    if (++nodes > budget) { exhausted = true; return; }
    let best = -1, options: number[] = [];
    for (const i of open) {
      if (grid[i]) continue;
      const vs: number[] = [];
      for (let v = 1; v <= max; v++) if (fits(i, v)) vs.push(v);
      if (!vs.length) return;
      if (best < 0 || vs.length < options.length) { best = i; options = vs; if (vs.length === 1) break; }
    }
    if (best < 0) { count++; first ??= [...grid]; return; }
    for (const v of options) { place(best, v); walk(); lift(best, v); if (count >= cap || exhausted) return; }
  };
  walk();
  return { status: exhausted ? 'budget-exhausted' as const : 'counted' as const, count, first, nodes };
}
