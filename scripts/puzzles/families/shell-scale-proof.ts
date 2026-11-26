import { closure, linearExtensions, popcount, SORT_PAR, ODD_HEAVY_PAR, ODD_EITHER_PAR } from '../../../src/learn/games/shell-scale/rules';

/**
 * Build-time exhaustive minimax proof for Shell Scale's par table.
 * NEVER imported at app runtime — runs only in build scripts and unit tests to certify:
 *   - Sort par: 2->1, 3->3, 4->5, 5->7, 6->10
 *   - Odd-heavy par: 3->1, 9->2
 *   - Odd-either par: 12->3 (and 13->4, proving 12 is the maximum in 3 weighings)
 */

function perms(arr: number[]): number[][] {
  if (arr.length <= 1) return [arr.slice()];
  const out: number[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of perms(rest)) out.push([arr[i], ...p]);
  }
  return out;
}

function canon(n: number, rel: readonly number[]): string {
  const down = rel.map(m => popcount(m));
  const up = Array.from({ length: n }, (_, i) => rel.reduce((c, m) => c + ((m >> i) & 1), 0));
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => down[a] - down[b] || up[a] - up[b]);
  const groups: number[][] = [];
  for (const i of order) {
    const g = groups[groups.length - 1];
    if (g && down[g[0]] === down[i] && up[g[0]] === up[i]) g.push(i);
    else groups.push([i]);
  }
  let best: string | null = null;
  const rec = (gi: number, cur: number[]) => {
    if (gi === groups.length) {
      const pos = new Array<number>(n);
      cur.forEach((x, idx) => { pos[x] = idx; });
      const code = cur.map(x => {
        let m = 0;
        for (let j = 0; j < n; j++) if ((rel[x] >> j) & 1) m |= 1 << pos[j];
        return m;
      }).join(',');
      if (best === null || code < best) best = code;
      return;
    }
    for (const p of perms(groups[gi])) rec(gi + 1, cur.concat(p));
  };
  rec(0, []);
  return best!;
}

/** Exact minimax number of weighings to guarantee sorting `n` items. */
export function proveSortMinimax(n: number): { weighings: number; states: number } {
  const memo = new Map<string, boolean>();
  const solve = (rel: readonly number[], budget: number): boolean => {
    const e = linearExtensions(n, rel);
    if (e === 1) return true;
    if (budget <= 0 || (1 << budget) < e) return false;
    const key = `${canon(n, rel)}|${budget}`;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    const pairs: [number, number[], number[]][] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (((rel[i] >> j) & 1) || ((rel[j] >> i) & 1)) continue;
        const a = rel.slice(); a[i] |= 1 << j; const A = closure(n, a);
        const b = rel.slice(); b[j] |= 1 << i; const B = closure(n, b);
        const ea = linearExtensions(n, A), eb = linearExtensions(n, B);
        if (Math.max(ea, eb) > (1 << (budget - 1))) continue;
        pairs.push([Math.max(ea, eb), A, B]);
      }
    }
    pairs.sort((x, y) => x[0] - y[0]);
    let ok = false;
    for (const [, A, B] of pairs) {
      if (solve(A, budget - 1) && solve(B, budget - 1)) { ok = true; break; }
    }
    memo.set(key, ok);
    return ok;
  };
  const start = new Array<number>(n).fill(0);
  for (let b = 0; b < 20; b++) {
    if (solve(start, b)) return { weighings: b, states: memo.size };
  }
  throw new Error(`Sort minimax failed for n=${n}`);
}

/** Exact minimax weighings for `n` pearls with 1 heavy pearl. */
export function proveOddHeavyMinimax(n: number): number {
  const memo = new Map<number, number>();
  const go = (c: number): number => {
    if (c <= 1) return 0;
    const hit = memo.get(c);
    if (hit !== undefined) return hit;
    let best = Infinity;
    for (let k = 1; k * 2 <= c; k++) {
      best = Math.min(best, 1 + Math.max(go(k), go(c - 2 * k)));
    }
    memo.set(c, best);
    return best;
  };
  return go(n);
}

/** Exact minimax weighings for `n` pearls with 1 odd pearl (heavy OR light unknown), identifying pearl + heavy/light. */
export function proveOddEitherMinimax(n: number, cap = 4): number | null {
  const memo = new Map<string, boolean>();
  const can = (u: number, h: number, l: number, g: number, b: number): boolean => {
    if (u === 0 && h + l <= 1) return true;
    if (u === 1 && h + l === 0) return g > 0 && b >= 1;
    if (b === 0 || 3 ** b < 2 * u + h + l) return false;
    const key = `${u},${h},${l},${Math.min(g, 1)},${b}`;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    let ok = false;
    outer: for (let ul = 0; ul <= u; ul++) {
      for (let ur = 0; ul + ur <= u; ur++) {
        for (let hl = 0; hl <= h; hl++) {
          for (let hr = 0; hl + hr <= h; hr++) {
            for (let ll = 0; ll <= l; ll++) {
              for (let lr = 0; ll + lr <= l; lr++) {
                const L = ul + hl + ll, R = ur + hr + lr;
                if (L === 0 && R === 0) continue;
                const need = Math.abs(L - R);
                if (need > g) continue;
                if (!can(0, ul + hl, ur + lr, n - (ul + hl + ur + lr), b - 1)) continue;
                if (!can(0, ur + hr, ul + ll, n - (ur + hr + ul + ll), b - 1)) continue;
                if (can(u - ul - ur, h - hl - hr, l - ll - lr, n - (u - ul - ur) - (h - hl - hr) - (l - ll - lr), b - 1)) {
                  ok = true;
                  break outer;
                }
              }
            }
          }
        }
      }
    }
    memo.set(key, ok);
    return ok;
  };
  for (let b = 1; b <= cap; b++) if (can(n, 0, 0, 0, b)) return b;
  return null;
}

/** Verify the entire shipped par table against exhaustive minimax proofs. */
export function verifyShippedParTable(): {
  sort: Record<number, { par: number; states: number }>;
  oddHeavy: Record<number, number>;
  oddEither: Record<number, number | null>;
} {
  const sort: Record<number, { par: number; states: number }> = {};
  for (const n of [2, 3, 4, 5, 6]) {
    const res = proveSortMinimax(n);
    if (res.weighings !== SORT_PAR[n]) throw new Error(`SORT_PAR[${n}] = ${SORT_PAR[n]}, proven = ${res.weighings}`);
    sort[n] = { par: res.weighings, states: res.states };
  }
  const oddHeavy: Record<number, number> = {};
  for (const n of [3, 9]) {
    const res = proveOddHeavyMinimax(n);
    if (res !== ODD_HEAVY_PAR[n]) throw new Error(`ODD_HEAVY_PAR[${n}] = ${ODD_HEAVY_PAR[n]}, proven = ${res}`);
    oddHeavy[n] = res;
  }
  const oddEither: Record<number, number | null> = {};
  for (const n of [12, 13]) {
    oddEither[n] = proveOddEitherMinimax(n, 4);
  }
  if (oddEither[12] !== ODD_EITHER_PAR[12]) throw new Error(`ODD_EITHER_PAR[12] = ${ODD_EITHER_PAR[12]}, proven = ${oddEither[12]}`);
  if (oddEither[13] !== 4) throw new Error(`Expected oddEither(13) = 4, got ${oddEither[13]}`);
  return { sort, oddHeavy, oddEither };
}
