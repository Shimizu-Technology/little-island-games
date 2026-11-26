/**
 * Shell Scale pure rules, proven par table, and strictly public-knowledge deduction.
 *
 * Every public-knowledge function takes `PublicBoard` (no `weights`, `odd`, or `dir` fields exist
 * on the type), so hints and known-link views cannot read hidden weights by construction.
 */

export type PuzzleKind = 'sort' | 'odd-heavy' | 'odd-either';
export type ScaleOutcome = 'L' | 'R' | '=';
export type OddDir = 'heavy' | 'light';

export type SortPuzzle = { kind: 'sort'; n: number; cast: number[]; weights: number[] };
export type OddHeavyPuzzle = { kind: 'odd-heavy'; n: number; cast: number[]; odd: number };
export type OddEitherPuzzle = { kind: 'odd-either'; n: number; cast: number[]; odd: number; dir: OddDir };
export type ShellPuzzle = SortPuzzle | OddHeavyPuzzle | OddEitherPuzzle;

/**
 * Compact JSON-safe pack tuple:
 * - Sort: ['s', n, castDigits, weightDigits]
 * - Odd-heavy: ['h', n, castTheme, odd]
 * - Odd-either: ['e', n, castTheme, odd, 0|1] (0 = heavy, 1 = light)
 */
export type ShellTuple =
  | ['s', number, string, string]
  | ['h', number, number, number]
  | ['e', number, number, number, 0 | 1];

export type Weighing = { left: number; right: number; outcome: ScaleOutcome };

/** Strictly public board view: contains ZERO hidden weight / odd-pearl fields. */
export type PublicBoard = {
  kind: PuzzleKind;
  n: number;
  cast: readonly number[];
  history: readonly Weighing[];
};

export const SHELL_META = [
  { id: 'cowrie', name: 'Coral Cowrie', short: 'Cowrie', pattern: 'spotted oval', color: '#E06B4F' },
  { id: 'scallop', name: 'Lagoon Scallop', short: 'Scallop', pattern: 'ribbed fan', color: '#2D85A8' },
  { id: 'conch', name: 'Golden Conch', short: 'Conch', pattern: 'pointed spire', color: '#E5A938' },
  { id: 'nautilus', name: 'Teal Nautilus', short: 'Nautilus', pattern: 'coiled spiral', color: '#1F7A70' },
  { id: 'sand-dollar', name: 'Sand Dollar', short: 'Sand Dollar', pattern: 'five-petal star', color: '#D6B67A' },
  { id: 'auger', name: 'Plum Auger', short: 'Auger', pattern: 'striped cone', color: '#7C4C8A' },
] as const;

export const MAX_SHELLS = 6;
export const MAX_PEARLS = 12;

/**
 * Proven minimax worst-case weighing par table.
 * Verified at build/test time against the exhaustive minimax solver (scripts/puzzles/families/shell-scale-proof.ts).
 * Ships as a constant lookup table; no heavy minimax search runs at runtime.
 */
export const SORT_PAR: Readonly<Record<number, number>> = {
  2: 1,
  3: 3,
  4: 5,
  5: 7,
  6: 10,
};

export const ODD_HEAVY_PAR: Readonly<Record<number, number>> = {
  3: 1,
  9: 2,
};

export const ODD_EITHER_PAR: Readonly<Record<number, number>> = {
  12: 3,
};

export function provenPar(p: Pick<ShellPuzzle, 'kind' | 'n'>): number {
  if (p.kind === 'sort') {
    const v = SORT_PAR[p.n];
    if (v !== undefined) return v;
    return Math.ceil((p.n * (p.n - 1)) / 2);
  }
  if (p.kind === 'odd-heavy') {
    const v = ODD_HEAVY_PAR[p.n];
    if (v !== undefined) return v;
    return Math.ceil(Math.log(p.n) / Math.log(3));
  }
  return ODD_EITHER_PAR[p.n] ?? 3;
}

export function popcount(mask: number): number {
  let m = mask | 0;
  let c = 0;
  while (m) {
    m &= m - 1;
    c++;
  }
  return c;
}

export function bitsOf(mask: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) if ((mask >> i) & 1) out.push(i);
  return out;
}

export function maskOf(items: readonly number[]): number {
  let m = 0;
  for (const i of items) m |= 1 << i;
  return m;
}

export function itemName(p: Pick<PublicBoard, 'kind' | 'cast'>, index: number): string {
  if (p.kind === 'sort') {
    const meta = SHELL_META[p.cast[index] ?? index];
    return meta ? meta.short : `Shell ${index + 1}`;
  }
  return `Pearl ${index + 1}`;
}

export function itemFullName(p: Pick<PublicBoard, 'kind' | 'cast'>, index: number): string {
  if (p.kind === 'sort') {
    const meta = SHELL_META[p.cast[index] ?? index];
    return meta ? meta.name : `Shell ${index + 1}`;
  }
  return `Pearl ${index + 1}`;
}

export function panLabel(p: Pick<PublicBoard, 'kind' | 'n' | 'cast'>, mask: number): string {
  const items = bitsOf(mask, p.n);
  if (!items.length) return 'empty';
  if (p.kind === 'sort') return items.map(i => itemName(p, i)).join(', ');
  if (items.length === 1) return `Pearl ${items[0] + 1}`;
  return `Pearls ${items.map(i => i + 1).join(', ')}`;
}

/** Validate a ShellPuzzle strictly. */
export function validPuzzle(p: unknown): p is ShellPuzzle {
  if (!p || typeof p !== 'object') return false;
  const x = p as Record<string, unknown>;
  if (x.kind === 'sort') {
    if (!Number.isInteger(x.n) || (x.n as number) < 2 || (x.n as number) > MAX_SHELLS) return false;
    const n = x.n as number;
    if (!Array.isArray(x.cast) || x.cast.length !== n || !Array.isArray(x.weights) || x.weights.length !== n) return false;
    const seenCast = new Set<number>();
    const seenW = new Set<number>();
    for (let i = 0; i < n; i++) {
      const c = x.cast[i], w = x.weights[i];
      if (!Number.isInteger(c) || c < 0 || c >= SHELL_META.length || seenCast.has(c)) return false;
      if (!Number.isInteger(w) || w < 0 || w >= n || seenW.has(w)) return false;
      seenCast.add(c);
      seenW.add(w);
    }
    return true;
  }
  if (x.kind === 'odd-heavy') {
    if (!Number.isInteger(x.n) || ((x.n as number) !== 3 && (x.n as number) !== 9)) return false;
    const n = x.n as number;
    if (!Array.isArray(x.cast) || x.cast.length !== 1 || !Number.isInteger(x.cast[0]) || x.cast[0] < 0 || x.cast[0] > 5) return false;
    if (!Number.isInteger(x.odd) || (x.odd as number) < 0 || (x.odd as number) >= n) return false;
    return true;
  }
  if (x.kind === 'odd-either') {
    if (x.n !== 12) return false;
    if (!Array.isArray(x.cast) || x.cast.length !== 1 || !Number.isInteger(x.cast[0]) || x.cast[0] < 0 || x.cast[0] > 5) return false;
    if (!Number.isInteger(x.odd) || (x.odd as number) < 0 || (x.odd as number) >= 12) return false;
    if (x.dir !== 'heavy' && x.dir !== 'light') return false;
    return true;
  }
  return false;
}

export function puzzleTuple(p: ShellPuzzle): ShellTuple {
  if (p.kind === 'sort') return ['s', p.n, p.cast.join(''), p.weights.join('')];
  if (p.kind === 'odd-heavy') return ['h', p.n, p.cast[0], p.odd];
  return ['e', p.n, p.cast[0], p.odd, p.dir === 'heavy' ? 0 : 1];
}

export function tuplePuzzle(t: unknown): ShellPuzzle | null {
  if (!Array.isArray(t)) return null;
  if (t[0] === 's' && t.length === 4 && Number.isInteger(t[1]) && typeof t[2] === 'string' && typeof t[3] === 'string') {
    const n = t[1] as number;
    if (t[2].length !== n || t[3].length !== n || !/^\d+$/.test(t[2]) || !/^\d+$/.test(t[3])) return null;
    const p: SortPuzzle = { kind: 'sort', n, cast: [...t[2]].map(Number), weights: [...t[3]].map(Number) };
    return validPuzzle(p) ? p : null;
  }
  if (t[0] === 'h' && t.length === 4 && Number.isInteger(t[1]) && Number.isInteger(t[2]) && Number.isInteger(t[3])) {
    const p: OddHeavyPuzzle = { kind: 'odd-heavy', n: t[1] as number, cast: [t[2] as number], odd: t[3] as number };
    return validPuzzle(p) ? p : null;
  }
  if (t[0] === 'e' && t.length === 5 && Number.isInteger(t[1]) && Number.isInteger(t[2]) && Number.isInteger(t[3]) && (t[4] === 0 || t[4] === 1)) {
    const p: OddEitherPuzzle = { kind: 'odd-either', n: t[1] as number, cast: [t[2] as number], odd: t[3] as number, dir: t[4] === 0 ? 'heavy' : 'light' };
    return validPuzzle(p) ? p : null;
  }
  return null;
}

/** Whether (leftMask, rightMask) is a legal weighing for this puzzle kind and item count. */
export function validPanPair(p: Pick<PublicBoard, 'kind' | 'n'>, left: number, right: number): boolean {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) return false;
  if (!Number.isInteger(p.n) || p.n < 2 || p.n > MAX_PEARLS) return false;
  const full = (1 << p.n) - 1;
  if (left < 1 || left > full || right < 1 || right > full) return false;
  if ((left & right) !== 0) return false;
  const lc = popcount(left), rc = popcount(right);
  if (lc !== rc) return false;
  if (p.kind === 'sort') return lc === 1;
  return lc >= 1 && lc * 2 <= p.n;
}

/** True scale evaluation against the hidden setup. Used ONLY by the engine and Scale Holder. */
export function weighOnScale(p: ShellPuzzle, left: number, right: number): ScaleOutcome | null {
  if (!validPanPair(p, left, right)) return null;
  if (p.kind === 'sort') {
    const li = bitsOf(left, p.n)[0], ri = bitsOf(right, p.n)[0];
    return p.weights[li] > p.weights[ri] ? 'L' : 'R';
  }
  const oddBit = 1 << p.odd;
  const inLeft = (left & oddBit) !== 0;
  const inRight = (right & oddBit) !== 0;
  if (!inLeft && !inRight) return '=';
  const heavy = p.kind === 'odd-heavy' || p.dir === 'heavy';
  if (inLeft) return heavy ? 'L' : 'R';
  return heavy ? 'R' : 'L';
}

/** True lightest-to-heaviest order for a sort puzzle. */
export function trueSortOrder(p: SortPuzzle): number[] {
  return Array.from({ length: p.n }, (_, i) => i).sort((a, b) => p.weights[a] - p.weights[b]);
}

export function emptyOrder(n: number): number[] {
  return Array.from({ length: n }, () => -1);
}

/** Place shell `item` into answer-row slot `slot` (-1 removes it; swapping if another shell sits in `slot`). */
export function placeInOrder(order: readonly number[], n: number, item: number, slot: number): number[] {
  if (!Number.isInteger(item) || item < 0 || item >= n) return order as number[];
  if (!Number.isInteger(slot) || slot < -1 || slot >= n) return order as number[];
  const currentSlot = order.indexOf(item);
  if (currentSlot === slot) return order as number[];
  const next = [...order];
  if (slot === -1) {
    next[currentSlot] = -1;
    return next;
  }
  const occupant = next[slot];
  next[slot] = item;
  if (currentSlot !== -1) next[currentSlot] = occupant;
  return next;
}

export function validOrder(n: number, order: unknown): order is number[] {
  if (!Array.isArray(order) || order.length !== n) return false;
  const seen = new Set<number>();
  for (const x of order) {
    if (!Number.isInteger(x) || x < -1 || x >= n) return false;
    if (x >= 0) {
      if (seen.has(x)) return false;
      seen.add(x);
    }
  }
  return true;
}

export function orderComplete(order: readonly number[]): boolean {
  return order.every(x => x >= 0);
}

export function acceptsSort(p: SortPuzzle, order: readonly number[]): boolean {
  if (order.length !== p.n || !orderComplete(order)) return false;
  for (let s = 0; s + 1 < p.n; s++) {
    if (p.weights[order[s]] >= p.weights[order[s + 1]]) return false;
  }
  return true;
}

export function acceptsOdd(p: OddHeavyPuzzle | OddEitherPuzzle, pearl: number | null, dir: OddDir | null): boolean {
  if (pearl !== p.odd) return false;
  if (p.kind === 'odd-heavy') return true;
  return dir === p.dir;
}

export function acceptsAnswer(
  p: ShellPuzzle,
  draft: { order: readonly number[]; oddPick: number | null; oddDir: OddDir | null },
): boolean {
  if (p.kind === 'sort') return acceptsSort(p, draft.order);
  return acceptsOdd(p, draft.oddPick, draft.oddDir);
}

export function draftComplete(
  p: Pick<PublicBoard, 'kind' | 'n'>,
  draft: { order: readonly number[]; oddPick: number | null; oddDir: OddDir | null },
): boolean {
  if (p.kind === 'sort') return draft.order.length === p.n && orderComplete(draft.order);
  if (p.kind === 'odd-heavy') return draft.oddPick !== null && draft.oddPick >= 0 && draft.oddPick < p.n;
  return draft.oddPick !== null && draft.oddPick >= 0 && draft.oddPick < p.n && (draft.oddDir === 'heavy' || draft.oddDir === 'light');
}

// ---------------------------------------------------------------------------
// Strictly public-knowledge closure, deductions, and optimal next weighing
// ---------------------------------------------------------------------------

/** Transitive closure of `rel`, where bit `j` in `rel[i]` means `i` is heavier than `j`. */
export function closure(n: number, rel: readonly number[]): number[] {
  const r = rel.slice();
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      if (r[i] & (1 << k)) r[i] |= r[k];
    }
  }
  return r;
}

/** Build transitive closure from public sort weighings only. */
export function sortRelation(n: number, history: readonly Weighing[]): number[] {
  const rel = new Array<number>(n).fill(0);
  for (const w of history) {
    if (popcount(w.left) !== 1 || popcount(w.right) !== 1) continue;
    const li = bitsOf(w.left, n)[0], ri = bitsOf(w.right, n)[0];
    if (w.outcome === 'L') rel[li] |= 1 << ri;
    else if (w.outcome === 'R') rel[ri] |= 1 << li;
  }
  return closure(n, rel);
}

/** Whether pair (a, b) is already publicly ordered by transitive closure. */
export function isPairKnown(rel: readonly number[], a: number, b: number): boolean {
  return a === b || (((rel[a] >> b) & 1) !== 0) || (((rel[b] >> a) & 1) !== 0);
}

/** Direct (Hasse) edges `[lighter, heavier]` for visual known-links display. */
export function directLinks(n: number, rel: readonly number[]): [number, number][] {
  const edges: [number, number][] = [];
  for (let heavy = 0; heavy < n; heavy++) {
    for (let light = 0; light < n; light++) {
      if (!((rel[heavy] >> light) & 1)) continue;
      let indirect = false;
      for (let mid = 0; mid < n; mid++) {
        if (mid !== heavy && mid !== light && ((rel[heavy] >> mid) & 1) && ((rel[mid] >> light) & 1)) {
          indirect = true;
          break;
        }
      }
      if (!indirect) edges.push([light, heavy]);
    }
  }
  return edges;
}

/** Exact count of total orders consistent with `rel` (n <= 6 -> at most 64 DP states). */
export function linearExtensions(n: number, rel: readonly number[]): number {
  const full = (1 << n) - 1;
  const memo = new Int32Array(1 << n).fill(-1);
  const go = (mask: number): number => {
    if (mask === full) return 1;
    if (memo[mask] >= 0) return memo[mask];
    let total = 0;
    for (let i = 0; i < n; i++) {
      if (!((mask >> i) & 1) && (rel[i] & ~mask) === 0) {
        total += go(mask | (1 << i));
      }
    }
    memo[mask] = total;
    return total;
  };
  return go(0);
}

export type SortPublicKnowledge = {
  rel: number[];
  knownPairs: [number, number][];
  unknownPairs: [number, number][];
  links: [number, number][];
  consistentOrders: number;
  /** Non-null only when public weighings uniquely determine the full lightest->heaviest order. */
  deducedOrder: number[] | null;
};

export function analyzeSort(n: number, history: readonly Weighing[]): SortPublicKnowledge {
  const rel = sortRelation(n, history);
  const knownPairs: [number, number][] = [];
  const unknownPairs: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (isPairKnown(rel, i, j)) knownPairs.push([i, j]);
      else unknownPairs.push([i, j]);
    }
  }
  const consistentOrders = linearExtensions(n, rel);
  const deducedOrder = consistentOrders === 1
    ? Array.from({ length: n }, (_, i) => i).sort((a, b) => popcount(rel[a]) - popcount(rel[b]))
    : null;
  return { rel, knownPairs, unknownPairs, links: directLinks(n, rel), consistentOrders, deducedOrder };
}

export type OddHypothesis = { odd: number; dir: OddDir };

export type OddPublicKnowledge = {
  hypotheses: OddHypothesis[];
  /** Pearls proven normal (neither heavy nor light survives). */
  ruledOut: number[];
  /** Pearls that could still be heavy. */
  maybeHeavy: number[];
  /** Pearls that could still be light (always empty for odd-heavy). */
  maybeLight: number[];
  /** Pearls that could be either heavy or light. */
  unknownBoth: number[];
  /** Non-null only when public weighings uniquely determine the odd pearl (and direction for odd-either). */
  deduced: OddHypothesis | null;
};

function expectedOutcomeForHypothesis(left: number, right: number, h: OddHypothesis): ScaleOutcome {
  const bit = 1 << h.odd;
  if (left & bit) return h.dir === 'heavy' ? 'L' : 'R';
  if (right & bit) return h.dir === 'heavy' ? 'R' : 'L';
  return '=';
}

export function analyzeOdd(kind: 'odd-heavy' | 'odd-either', n: number, history: readonly Weighing[]): OddPublicKnowledge {
  const all: OddHypothesis[] = [];
  for (let i = 0; i < n; i++) {
    all.push({ odd: i, dir: 'heavy' });
    if (kind === 'odd-either') all.push({ odd: i, dir: 'light' });
  }
  const hypotheses = all.filter(h =>
    history.every(w => expectedOutcomeForHypothesis(w.left, w.right, h) === w.outcome),
  );
  const heavySet = new Set<number>();
  const lightSet = new Set<number>();
  for (const h of hypotheses) {
    if (h.dir === 'heavy') heavySet.add(h.odd);
    else lightSet.add(h.odd);
  }
  const ruledOut: number[] = [];
  const unknownBoth: number[] = [];
  const maybeHeavy: number[] = [];
  const maybeLight: number[] = [];
  for (let i = 0; i < n; i++) {
    const canH = heavySet.has(i), canL = lightSet.has(i);
    if (!canH && !canL) ruledOut.push(i);
    else if (canH && canL) unknownBoth.push(i);
    else if (canH) maybeHeavy.push(i);
    else maybeLight.push(i);
  }
  return {
    hypotheses,
    ruledOut,
    maybeHeavy,
    maybeLight,
    unknownBoth,
    deduced: hypotheses.length === 1 ? hypotheses[0] : null,
  };
}

/**
 * Check if a sort partial order `rel` can be resolved within `budget` weighings.
 * Used only for tiny remaining depth (n <= 6, fast memoized check) to guarantee the
 * public-knowledge next weighing never misses par on 5 or 6 shells.
 */
function canResolveSortIn(n: number, rel: readonly number[], budget: number, memo: Map<string, boolean>): boolean {
  const e = linearExtensions(n, rel);
  if (e <= 1) return true;
  if (budget <= 0 || (1 << budget) < e) return false;
  if (budget === 1) return e === 2;
  const key = `${rel.join(',')}|${budget}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  const cands: [number, number[], number[]][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (isPairKnown(rel, i, j)) continue;
      const a = rel.slice(); a[i] |= 1 << j; const A = closure(n, a);
      const b = rel.slice(); b[j] |= 1 << i; const B = closure(n, b);
      const ea = linearExtensions(n, A), eb = linearExtensions(n, B);
      const worst = Math.max(ea, eb);
      if (worst > (1 << (budget - 1))) continue;
      cands.push([worst, A, B]);
    }
  }
  cands.sort((x, y) => x[0] - y[0]);
  for (const [, A, B] of cands) {
    if (canResolveSortIn(n, A, budget - 1, memo) && canResolveSortIn(n, B, budget - 1, memo)) {
      memo.set(key, true);
      return true;
    }
  }
  memo.set(key, false);
  return false;
}

/**
 * Optimal public-knowledge next weighing for Sort (`n <= 6`).
 * Strictly a function of `(n, history)` — NEVER reads hidden weights!
 * Picks an unknown pair minimizing worst-case remaining orders; when `n <= 6` and a pair
 * guarantees finishing within the minimum remaining weighing budget, picks the first such pair.
 */
export function bestSortWeighing(n: number, history: readonly Weighing[]): { left: number; right: number } | null {
  const info = analyzeSort(n, history);
  if (info.consistentOrders <= 1 || !info.unknownPairs.length) return null;

  // Score every unknown pair by worst-case remaining linear extensions (halving split).
  const scored = info.unknownPairs.map(([i, j]) => {
    const a = info.rel.slice(); a[i] |= 1 << j; const A = closure(n, a);
    const b = info.rel.slice(); b[j] |= 1 << i; const B = closure(n, b);
    const ea = linearExtensions(n, A), eb = linearExtensions(n, B);
    return { i, j, A, B, worst: Math.max(ea, eb) };
  }).sort((x, y) => x.worst - y.worst || x.i - y.i || x.j - y.j);

  // On the opening move (0 weighings) every pair is symmetric; return (0, 1) immediately in O(1).
  if (history.length === 0) return { left: 1 << 0, right: 1 << 1 };

  // Check exact remaining minimax budget (at most 9 for n=6 after >=1 weighing) when close to tight splits
  // so 5-shell (par 7) and 6-shell (par 10) NEVER miss par on merge-insertion branches!
  const minBits = Math.ceil(Math.log2(info.consistentOrders));
  if (n <= 6 && minBits <= 5) {
    const memo = new Map<string, boolean>();
    for (let budget = minBits; budget <= minBits + 1; budget++) {
      for (const c of scored) {
        if (c.worst > (1 << (budget - 1))) continue;
        if (canResolveSortIn(n, c.A, budget - 1, memo) && canResolveSortIn(n, c.B, budget - 1, memo)) {
          return { left: 1 << c.i, right: 1 << c.j };
        }
      }
    }
  }

  return { left: 1 << scored[0].i, right: 1 << scored[0].j };
}

/**
 * Optimal public-knowledge next weighing for Odd-Heavy (`n` pearls, 1 heavy).
 * Strictly public — splits remaining suspects into three balanced groups `(k, k, c - 2k)`.
 */
export function bestOddHeavyWeighing(n: number, history: readonly Weighing[]): { left: number; right: number } | null {
  const info = analyzeOdd('odd-heavy', n, history);
  const cands = info.maybeHeavy;
  if (cands.length <= 1) return null;
  let bestK = 1, bestWorst = Infinity;
  for (let k = 1; k * 2 <= cands.length; k++) {
    const worst = Math.max(k, cands.length - 2 * k);
    if (worst < bestWorst) {
      bestWorst = worst;
      bestK = k;
    }
  }
  const left = maskOf(cands.slice(0, bestK));
  const right = maskOf(cands.slice(bestK, bestK * 2));
  return { left, right };
}

/** Tiny exact feasibility check for odd-either canonical counts `(u, h, l, g)` within `b` weighings (`b <= 3`). */
function canResolveOddEither(n: number, u: number, h: number, l: number, g: number, b: number, memo: Map<string, boolean>): boolean {
  if (u === 0 && h + l <= 1) return true;
  if (u === 1 && h + l === 0) return g > 0 && b >= 1;
  if (b <= 0 || 3 ** b < 2 * u + h + l) return false;
  const key = `${u},${h},${l},${Math.min(g, n)},${b}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  for (let ul = 0; ul <= u; ul++) {
    for (let ur = 0; ur <= u - ul; ur++) {
      for (let hl = 0; hl <= h; hl++) {
        for (let hr = 0; hr <= h - hl; hr++) {
          for (let ll = 0; ll <= l; ll++) {
            for (let lr = 0; lr <= l - ll; lr++) {
              const L = ul + hl + ll, R = ur + hr + lr;
              if (L === 0 && R === 0) continue;
              const needG = Math.abs(L - R);
              if (needG > g) continue;
              if (Math.max(L, R) * 2 > n) continue;
              const leftCount = ul + hl + ur + lr;
              const rightCount = ur + hr + ul + ll;
              const balU = u - ul - ur, balH = h - hl - hr, balL = l - ll - lr;
              const balCount = 2 * balU + balH + balL;
              const cap = 3 ** (b - 1);
              if (leftCount > cap || rightCount > cap || balCount > cap) continue;
              if (
                canResolveOddEither(n, 0, ul + hl, ur + lr, n - leftCount, b - 1, memo) &&
                canResolveOddEither(n, 0, ur + hr, ul + ll, n - rightCount, b - 1, memo) &&
                canResolveOddEither(n, balU, balH, balL, n - balU - balH - balL, b - 1, memo)
              ) {
                memo.set(key, true);
                return true;
              }
            }
          }
        }
      }
    }
  }
  memo.set(key, false);
  return false;
}

/**
 * Optimal public-knowledge next weighing for Odd-Either (`n = 12` pearls, 1 heavy or light).
 * Strictly public — operates ONLY on `(unknownBoth, maybeHeavy, maybeLight, ruledOut)`!
 */
export function bestOddEitherWeighing(n: number, history: readonly Weighing[]): { left: number; right: number } | null {
  const info = analyzeOdd('odd-either', n, history);
  if (info.hypotheses.length <= 1) return null;

  const U = info.unknownBoth, H = info.maybeHeavy, L = info.maybeLight, G = info.ruledOut;
  const u = U.length, h = H.length, l = L.length, g = G.length;

  // Classic opening on 12 pearls is always 4 vs 4 (only weighing that splits 24 into 8/8/8).
  if (history.length === 0 && n === 12) {
    return { left: maskOf([0, 1, 2, 3]), right: maskOf([4, 5, 6, 7]) };
  }

  const memo = new Map<string, boolean>();
  const buildMasks = (ul: number, ur: number, hl: number, hr: number, ll: number, lr: number) => {
    const leftItems = [...U.slice(0, ul), ...H.slice(0, hl), ...L.slice(0, ll)];
    const rightItems = [...U.slice(ul, ul + ur), ...H.slice(hl, hl + hr), ...L.slice(ll, ll + lr)];
    const diff = leftItems.length - rightItems.length;
    if (diff > 0) rightItems.push(...G.slice(0, diff));
    else if (diff < 0) leftItems.push(...G.slice(0, -diff));
    return { left: maskOf(leftItems), right: maskOf(rightItems) };
  };

  for (let budget = 1; budget <= 4; budget++) {
    if (3 ** budget < info.hypotheses.length) continue;
    let bestPick: { left: number; right: number; size: number } | null = null;
    for (let ul = 0; ul <= u; ul++) {
      for (let ur = 0; ur <= u - ul; ur++) {
        for (let hl = 0; hl <= h; hl++) {
          for (let hr = 0; hr <= h - hl; hr++) {
            for (let ll = 0; ll <= l; ll++) {
              for (let lr = 0; lr <= l - ll; lr++) {
                const lc = ul + hl + ll, rc = ur + hr + lr;
                if (lc === 0 && rc === 0) continue;
                const needG = Math.abs(lc - rc);
                if (needG > g) continue;
                const panSize = Math.max(lc, rc);
                if (panSize * 2 > n) continue;
                const leftCount = ul + hl + ur + lr;
                const rightCount = ur + hr + ul + ll;
                const balU = u - ul - ur, balH = h - hl - hr, balL = l - ll - lr;
                const balCount = 2 * balU + balH + balL;
                const cap = 3 ** (budget - 1);
                if (leftCount > cap || rightCount > cap || balCount > cap) continue;
                if (
                  canResolveOddEither(n, 0, ul + hl, ur + lr, n - leftCount, budget - 1, memo) &&
                  canResolveOddEither(n, 0, ur + hr, ul + ll, n - rightCount, budget - 1, memo) &&
                  canResolveOddEither(n, balU, balH, balL, n - balU - balH - balL, budget - 1, memo)
                ) {
                  if (!bestPick || panSize < bestPick.size) {
                    const masks = buildMasks(ul, ur, hl, hr, ll, lr);
                    bestPick = { ...masks, size: panSize };
                  }
                }
              }
            }
          }
        }
      }
    }
    if (bestPick) return { left: bestPick.left, right: bestPick.right };
  }

  // Fallback for unexpected counts: weigh first two remaining suspects.
  const suspects = [...U, ...H, ...L];
  if (suspects.length >= 2) return { left: 1 << suspects[0], right: 1 << suspects[1] };
  if (suspects.length === 1 && G.length >= 1) return { left: 1 << suspects[0], right: 1 << G[0] };
  return null;
}

/** Optimal public-knowledge next weighing for ANY Shell Scale board. NEVER reads hidden weights. */
export function bestPublicWeighing(board: PublicBoard): { left: number; right: number } | null {
  if (board.kind === 'sort') return bestSortWeighing(board.n, board.history);
  if (board.kind === 'odd-heavy') return bestOddHeavyWeighing(board.n, board.history);
  return bestOddEitherWeighing(board.n, board.history);
}

/**
 * Enumerate up to `limit` distinct valid hidden puzzles consistent with EVERY public weighing in `board.history`.
 * Used by `HiddenWorlds.twins` (certify Gate 3) and public-hint-purity tests.
 */
export function consistentWorlds(board: PublicBoard, limit = 8): ShellPuzzle[] {
  const out: ShellPuzzle[] = [];
  if (board.kind === 'sort') {
    const rel = sortRelation(board.n, board.history);
    const n = board.n;
    const used = new Array<boolean>(n).fill(false);
    const order: number[] = [];
    const dfs = () => {
      if (out.length >= limit) return;
      if (order.length === n) {
        const weights = new Array<number>(n);
        order.forEach((shell, rank) => { weights[shell] = rank; });
        out.push({ kind: 'sort', n, cast: [...board.cast], weights });
        return;
      }
      const placedMask = maskOf(order);
      for (let i = 0; i < n; i++) {
        if (used[i]) continue;
        // All shells lighter than `i` must already be placed.
        if ((rel[i] & ~placedMask) !== 0) continue;
        used[i] = true;
        order.push(i);
        dfs();
        order.pop();
        used[i] = false;
        if (out.length >= limit) return;
      }
    };
    dfs();
    return out;
  }
  const info = analyzeOdd(board.kind, board.n, board.history);
  for (const h of info.hypotheses) {
    if (out.length >= limit) break;
    if (board.kind === 'odd-heavy') {
      out.push({ kind: 'odd-heavy', n: board.n, cast: [...board.cast], odd: h.odd });
    } else {
      out.push({ kind: 'odd-either', n: board.n, cast: [...board.cast], odd: h.odd, dir: h.dir });
    }
  }
  return out;
}

/**
 * If a player's submitted sort order contradicts an ALREADY PUBLIC weighing result, return that
 * public pair `[lighter, heavier]` (so we can gently point it out without EVER reading hidden weights!).
 */
export function publicContradiction(board: PublicBoard, order: readonly number[]): [number, number] | null {
  if (board.kind !== 'sort' || !orderComplete(order)) return null;
  const rel = sortRelation(board.n, board.history);
  for (let a = 0; a < order.length; a++) {
    for (let b = a + 1; b < order.length; b++) {
      // Order claims order[a] < order[b]; contradiction if publicly known order[a] > order[b].
      if ((rel[order[a]] >> order[b]) & 1) {
        return [order[b], order[a]];
      }
    }
  }
  return null;
}

/** Canonical secret identity (ignores decorative pearl theme so role swaps always deal a new secret). */
export function secretKey(p: ShellPuzzle): string {
  if (p.kind === 'sort') return `s:${p.n}:${p.weights.join('')}`;
  if (p.kind === 'odd-heavy') return `h:${p.n}:${p.odd}`;
  return `e:${p.n}:${p.odd}:${p.dir}`;
}

/** Generate a fresh open Random Practice puzzle (adds 0 catalog count, never blocks play). */
export function randomPracticePuzzle(kind: PuzzleKind, n: number, rng: () => number, excludeSecret?: string): ShellPuzzle {
  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  if (kind === 'sort') {
    const count = Math.max(2, Math.min(MAX_SHELLS, n));
    const cast = shuffle([0, 1, 2, 3, 4, 5]).slice(0, count);
    let weights = shuffle(Array.from({ length: count }, (_, i) => i));
    let candidate: SortPuzzle = { kind: 'sort', n: count, cast, weights };
    for (let tries = 0; excludeSecret && secretKey(candidate) === excludeSecret && tries < 8; tries++) {
      weights = shuffle(Array.from({ length: count }, (_, i) => i));
      candidate = { kind: 'sort', n: count, cast, weights };
    }
    if (excludeSecret && secretKey(candidate) === excludeSecret) {
      weights = weights.slice();
      [weights[0], weights[1]] = [weights[1], weights[0]];
      candidate = { kind: 'sort', n: count, cast, weights };
    }
    return candidate;
  }
  const theme = Math.floor(rng() * 6);
  if (kind === 'odd-heavy') {
    const count = n === 3 ? 3 : 9;
    const all = Array.from({ length: count }, (_, odd) => odd);
    const pool = excludeSecret ? all.filter(odd => `h:${count}:${odd}` !== excludeSecret) : all;
    const odd = pool[Math.floor(rng() * pool.length)] ?? all[0];
    return { kind: 'odd-heavy', n: count, cast: [theme], odd };
  }
  const allEither: { odd: number; dir: OddDir }[] = [];
  for (let odd = 0; odd < 12; odd++) {
    allEither.push({ odd, dir: 'heavy' }, { odd, dir: 'light' });
  }
  const pool = excludeSecret ? allEither.filter(h => `e:12:${h.odd}:${h.dir}` !== excludeSecret) : allEither;
  const pick = pool[Math.floor(rng() * pool.length)] ?? allEither[0];
  return { kind: 'odd-either', n: 12, cast: [theme], odd: pick.odd, dir: pick.dir };
}
