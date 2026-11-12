import type { BridgesPuzzle } from './core';

/**
 * A second Bridges counter, written apart from the grader and its search. It reads the clue grid
 * itself, visits islands in reading order and settles each island's right and down bridges so its
 * number is met exactly, marks water cells to refuse crossings, and checks connection at the end.
 */
export function independentCount(p: BridgesPuzzle, cap = 2, budget = 2_000_000): { status: 'counted'; count: number } | { status: 'budget-exhausted' } {
  const w = p.width, h = p.height, cells: number[] = [], index = new Map<number, number>();
  p.clues.forEach((c, i) => { if (c > 0) { index.set(i, cells.length); cells.push(i); } });
  const n = cells.length, need = cells.map(c => p.clues[c]);
  // right[i] / down[i]: [neighbour island, water cells between] or null.
  const look = (i: number, dx: number, dy: number): [number, number[]] | null => {
    const path: number[] = [];
    let x = cells[i] % w + dx, y = Math.floor(cells[i] / w) + dy;
    while (x < w && y < h) { const c = y * w + x; if (index.has(c)) return [index.get(c)!, path]; path.push(c); x += dx; y += dy; }
    return null;
  };
  const right = cells.map((_, i) => look(i, 1, 0)), down = cells.map((_, i) => look(i, 0, 1));
  // Undecided bridge places still touching each island, for a capacity bound.
  const open = cells.map(() => 0);
  cells.forEach((_, i) => { for (const nb of [right[i], down[i]]) if (nb) { open[i]++; open[nb[0]]++; } });
  // A water cell lies under at most one across and one down place, so one flag per direction is enough.
  const have = cells.map(() => 0), across = new Uint8Array(w * h), upright = new Uint8Array(w * h), pairs: [number, number, number][] = [];
  let count = 0, nodes = 0, exhausted = false;
  const lay = (path: number[], flags: Uint8Array, on: number) => { for (const c of path) flags[c] = on; };
  const clear = (path: number[], crossing: Uint8Array) => path.every(c => !crossing[c]);
  const connected = () => {
    const seen = new Set([0]), queue = [0];
    while (queue.length) { const a = queue.pop()!; for (const [x, y, k] of pairs) if (k > 0) { const b = x === a ? y : y === a ? x : -1; if (b >= 0 && !seen.has(b)) { seen.add(b); queue.push(b); } } }
    return seen.size === n;
  };
  const visit = (i: number): void => {
    if (exhausted || count >= cap) return;
    if (++nodes > budget) { exhausted = true; return; }
    if (i === n) { if (connected()) count++; return; }
    const r = right[i], d = down[i], left = need[i] - have[i];
    for (let a = 0; a <= (r ? 2 : 0); a++) for (let b = 0; b <= (d ? 2 : 0); b++) {
      if (a + b !== left) continue;
      // Partners must still be able to finish, and a bridge cannot share water with a crossing one.
      if (r && (have[r[0]] + a > need[r[0]] || a && !clear(r[1], upright))) continue;
      if (d && (have[d[0]] + b > need[d[0]] || b && !clear(d[1], across))) continue;
      if (r) { open[r[0]]--; have[r[0]] += a; if (a) lay(r[1], across, 1); pairs.push([i, r[0], a]); }
      if (d) { open[d[0]]--; have[d[0]] += b; if (b) lay(d[1], upright, 1); pairs.push([i, d[0], b]); }
      const ok = [r?.[0], d?.[0]].every(j => j === undefined || need[j] - have[j] <= 2 * open[j]);
      if (ok) visit(i + 1);
      if (d) { pairs.pop(); if (b) lay(d[1], upright, 0); have[d[0]] -= b; open[d[0]]++; }
      if (r) { pairs.pop(); if (a) lay(r[1], across, 0); have[r[0]] -= a; open[r[0]]++; }
      if (exhausted || count >= cap) return;
    }
  };
  visit(0);
  return exhausted ? { status: 'budget-exhausted' } : { status: 'counted', count };
}
