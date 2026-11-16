/**
 * Canoe Seats: seat every friend so every picture clue is true. Pure rules shared by play, the
 * certifier, the bots and help. Seats run from the front (seat 1, the bow) to the back.
 *
 * An item is one friend, hat or fruit. With `n` seats and `attrs` kinds of item, item `i` has
 * attribute `Math.floor(i / n)` (0 friends, 1 hats, 2 fruit) and its own cast slot `i % n`.
 * Every item has exactly one seat in the answer, and no two items of one attribute share a seat.
 */

export const friendNames = ['turtle', 'crab', 'fish', 'bird', 'gecko', 'fruit bat', 'octopus', 'frog'] as const;
export const hatNames = ['red cap', 'blue bucket hat', 'gold straw hat', 'green leaf hat', 'purple bobble hat'] as const;
export const fruitNames = ['banana', 'coconut', 'mango', 'star fruit', 'pineapple'] as const;
export const POOLS = [friendNames.length, hatNames.length, fruitNames.length] as const;
export const MAX_SEATS = 5, MAX_ATTRS = 3, MAX_CLUES = 16;

export type Kind = 'at' | 'end' | 'mid' | 'next' | 'far' | 'ahead' | 'gap' | 'same' | 'diff';
/** The nine picture clues, in teaching order. */
export const KINDS: readonly Kind[] = ['at', 'ahead', 'next', 'end', 'far', 'gap', 'mid', 'same', 'diff'];
export const UNARY: ReadonlySet<Kind> = new Set(['at', 'end', 'mid']);
export type Clue = { k: Kind; x: number; y?: number; s?: number };
export type CanoePuzzle = {
  n: number;
  attrs: number;
  /** Pool index per item, attribute by attribute: friends, then hats, then fruit. */
  cast: number[];
  clues: Clue[];
};
/** Seat per item, or -1 while it waits on the shore. */
export type Seating = number[];
export const SHORE = -1;

const letter: Record<Kind, string> = { at: 'S', end: 'E', mid: 'M', next: 'N', far: 'F', ahead: 'A', gap: 'G', same: 'W', diff: 'X' };
const kindOf = Object.fromEntries(Object.entries(letter).map(([k, v]) => [v, k])) as Record<string, Kind>;
export const attrOf = (p: Pick<CanoePuzzle, 'n'>, item: number) => Math.floor(item / p.n);
export const items = (p: Pick<CanoePuzzle, 'n' | 'attrs'>) => p.n * p.attrs;
export const itemsOf = (p: Pick<CanoePuzzle, 'n'>, attr: number) => Array.from({ length: p.n }, (_, v) => attr * p.n + v);

export function nameOf(p: Pick<CanoePuzzle, 'n' | 'cast'>, item: number): string {
  const a = attrOf(p, item), pool = p.cast[item];
  return a === 0 ? friendNames[pool] : a === 1 ? hatNames[pool] : fruitNames[pool];
}
const the = (p: Pick<CanoePuzzle, 'n' | 'cast'>, item: number) => `the ${nameOf(p, item)}`;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
/** The spoken sentence for one clue card. Cards themselves carry no words. */
export function clueText(p: Pick<CanoePuzzle, 'n' | 'cast'>, c: Clue): string {
  const X = the(p, c.x), Y = c.y === undefined ? '' : the(p, c.y);
  switch (c.k) {
    case 'at': return `${cap(X)} sits in seat ${c.s! + 1}.`;
    case 'end': return `${cap(X)} sits at one end of the canoe.`;
    case 'mid': return `${cap(X)} does not sit at either end.`;
    case 'next': return `${cap(X)} sits right next to ${Y}.`;
    case 'far': return `${cap(X)} does not sit next to ${Y}.`;
    case 'ahead': return `${cap(X)} sits somewhere in front of ${Y}.`;
    case 'gap': return `There is exactly one seat between ${X} and ${Y}.`;
    case 'same': return `${cap(X)} and ${Y} share a seat.`;
    case 'diff': return `${cap(X)} and ${Y} do not share a seat.`;
  }
}

/** Is the clue true, given a seat for each of its items? */
export function holdsAt(c: Clue, n: number, a: number, b: number): boolean {
  switch (c.k) {
    case 'at': return a === c.s;
    case 'end': return a === 0 || a === n - 1;
    case 'mid': return a !== 0 && a !== n - 1;
    case 'same': return a === b;
    case 'diff': return a !== b;
    case 'next': return Math.abs(a - b) === 1;
    // Only ever between two of a kind, who can never share a seat.
    case 'far': return Math.abs(a - b) !== 1 && a !== b;
    case 'ahead': return a < b;
    case 'gap': return Math.abs(a - b) === 2;
  }
}
/** A clue is lit only once every item it names is seated and it is true. */
export function lit(p: CanoePuzzle, c: Clue, pos: Seating): boolean {
  const a = pos[c.x], b = c.y === undefined ? 0 : pos[c.y];
  return a !== SHORE && b !== SHORE && holdsAt(c, p.n, a, b);
}
export const complete = (p: CanoePuzzle, pos: Seating) => pos.length === items(p) && pos.every(s => s !== SHORE);
/** The whole-answer predicate: every item seated and every clue true. The answer is unique, so this is the answer. */
export const accepts = (p: CanoePuzzle, pos: Seating) => complete(p, pos) && p.clues.every(c => lit(p, c, pos));
export const litCount = (p: CanoePuzzle, pos: Seating) => p.clues.reduce((n, c) => n + Number(lit(p, c, pos)), 0);

// ---------- Encoding ----------

/** Pack tuple: [seats, attributes, cast digits, clues]. A clue is a kind letter, item letters (a = item 0) and a seat digit. */
export type CanoeTuple = [number, number, string, string];
const itemChar = (i: number) => String.fromCharCode(97 + i);
export function clueToken(c: Clue): string {
  return letter[c.k] + itemChar(c.x) + (c.y !== undefined ? itemChar(c.y) : '') + (c.k === 'at' ? String(c.s! + 1) : '');
}
export const puzzleTuple = (p: CanoePuzzle): CanoeTuple => [p.n, p.attrs, p.cast.join(''), p.clues.map(clueToken).join(',')];
export function tuplePuzzle(x: unknown): CanoePuzzle | null {
  if (!Array.isArray(x) || x.length !== 4) return null;
  const [n, attrs, cast, clues] = x as unknown[];
  if (!Number.isInteger(n) || !Number.isInteger(attrs) || typeof cast !== 'string' || typeof clues !== 'string') return null;
  if ((n as number) < 2 || (n as number) > MAX_SEATS || (attrs as number) < 1 || (attrs as number) > MAX_ATTRS || !/^[0-9]+$/.test(cast) || cast.length !== (n as number) * (attrs as number)) return null;
  const tokens = clues.split(',');
  const parsed: Clue[] = [];
  for (const t of tokens) {
    const k = kindOf[t[0]];
    if (!k) return null;
    const x = t.charCodeAt(1) - 97;
    if (UNARY.has(k)) {
      if (k === 'at') { if (t.length !== 3 || !/[1-9]/.test(t[2])) return null; parsed.push({ k, x, s: Number(t[2]) - 1 }); }
      else { if (t.length !== 2) return null; parsed.push({ k, x }); }
    } else {
      if (t.length !== 3) return null;
      parsed.push({ k, x, y: t.charCodeAt(2) - 97 });
    }
  }
  const p: CanoePuzzle = { n: n as number, attrs: attrs as number, cast: [...cast].map(Number), clues: parsed };
  if (!validPuzzle(p) || puzzleTuple(p)[3] !== clues) return null;
  return p;
}
/** Structure only: shape, cast, and every clue well formed and distinct. Uniqueness is the certifier's proof. */
export function validPuzzle(p: CanoePuzzle): boolean {
  if (!Number.isInteger(p.n) || p.n < 2 || p.n > MAX_SEATS || !Number.isInteger(p.attrs) || p.attrs < 1 || p.attrs > MAX_ATTRS) return false;
  if (!Array.isArray(p.cast) || p.cast.length !== items(p) || !Array.isArray(p.clues) || p.clues.length < 1 || p.clues.length > MAX_CLUES) return false;
  for (let a = 0; a < p.attrs; a++) {
    const row = p.cast.slice(a * p.n, (a + 1) * p.n);
    if (!row.every(v => Number.isInteger(v) && v >= 0 && v < POOLS[a]) || new Set(row).size !== p.n) return false;
  }
  const inRange = (i: unknown): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < items(p);
  const seen = new Set<string>();
  for (const c of p.clues) {
    if (!c || typeof c !== 'object' || !KINDS.includes(c.k) || !inRange(c.x)) return false;
    if (UNARY.has(c.k)) {
      if (c.y !== undefined) return false;
      if (c.k === 'at' ? !(Number.isInteger(c.s) && c.s! >= 0 && c.s! < p.n) : c.s !== undefined) return false;
      if (c.k !== 'at' && p.n < 3) return false;
    } else {
      if (!inRange(c.y) || c.y === c.x || c.s !== undefined) return false;
      const cross = attrOf(p, c.x) !== attrOf(p, c.y);
      // Two friends can never share a seat, so a same-attribute "share" clue says nothing.
      if ((c.k === 'same' || c.k === 'diff') && !cross) return false;
      // "Not next to" a hat its own wearer has on reads both ways, so it only ever compares two of a kind.
      if (c.k === 'far' && cross) return false;
    }
    const token = clueToken(c);
    if (seen.has(token)) return false;
    seen.add(token);
  }
  return true;
}
export function validSeating(p: CanoePuzzle, pos: unknown): pos is Seating {
  if (!Array.isArray(pos) || pos.length !== items(p)) return false;
  if (!pos.every(s => s === SHORE || (Number.isInteger(s) && s >= 0 && s < p.n))) return false;
  for (let a = 0; a < p.attrs; a++) {
    const seated = itemsOf(p, a).map(i => pos[i]).filter(s => s !== SHORE);
    if (new Set(seated).size !== seated.length) return false;
  }
  return true;
}
export const emptySeating = (p: CanoePuzzle): Seating => Array(items(p)).fill(SHORE);

/**
 * Seat an item, or send it to the shore (seat -1). An item of the same kind already in that seat
 * swaps to where the moved item was. Returns the same array when nothing changes.
 */
export function place(p: CanoePuzzle, pos: Seating, item: number, seat: number): Seating {
  if (item < 0 || item >= items(p) || seat < SHORE || seat >= p.n || pos[item] === seat) return pos;
  const next = [...pos];
  if (seat !== SHORE) {
    const a = attrOf(p, item), other = itemsOf(p, a).find(i => i !== item && pos[i] === seat);
    if (other !== undefined) next[other] = pos[item];
  }
  next[item] = seat;
  return next;
}

// ---------- Exhaustive count ----------

const permCache = new Map<number, number[][]>();
/** Every ordering of n seats: perm[v] is the seat of cast slot v. */
export function perms(n: number): number[][] {
  const hit = permCache.get(n);
  if (hit) return hit;
  const out: number[][] = [];
  const walk = (prefix: number[], left: number[]) => {
    if (!left.length) { out.push(prefix); return; }
    left.forEach((s, i) => walk([...prefix, s], [...left.slice(0, i), ...left.slice(i + 1)]));
  };
  walk([], Array.from({ length: n }, (_, i) => i));
  permCache.set(n, out);
  return out;
}
export type Count = { status: 'counted'; count: number; first: Seating | null; seatings: number } | { status: 'budget-exhausted' };
/**
 * Checks every possible seating: each attribute in turn takes every ordering of the seats, and a
 * clue is tested as soon as the attributes it names are all placed. A partial seating a clue
 * already rules out stands for every completion of it, so nothing is skipped and nothing guessed.
 * `seatings` is how many full seatings that accounts for, always the whole universe.
 */
export function countSeatings(p: CanoePuzzle, cap = 2, budget = 4_000_000): Count {
  const P = perms(p.n), byLevel: Clue[][] = Array.from({ length: p.attrs }, () => []);
  for (const c of p.clues) byLevel[Math.max(attrOf(p, c.x), c.y === undefined ? 0 : attrOf(p, c.y))].push(c);
  const pos: Seating = emptySeating(p);
  let count = 0, nodes = 0, first: Seating | null = null, accounted = 0, exhausted = false;
  const universe = (level: number) => P.length ** (p.attrs - level);
  const walk = (level: number): boolean => {
    if (level === p.attrs) { count++; accounted++; if (!first) first = [...pos]; return count >= cap; }
    for (const perm of P) {
      if (++nodes > budget) { exhausted = true; return true; }
      for (let v = 0; v < p.n; v++) pos[level * p.n + v] = perm[v];
      if (byLevel[level].every(c => holdsAt(c, p.n, pos[c.x], c.y === undefined ? 0 : pos[c.y]))) { if (walk(level + 1)) return true; }
      else accounted += universe(level + 1);
    }
    return false;
  };
  const stopped = walk(0);
  for (let i = 0; i < pos.length; i++) pos[i] = SHORE;
  if (exhausted) return { status: 'budget-exhausted' };
  return { status: 'counted', count, first, seatings: stopped ? accounted : P.length ** p.attrs };
}
/** The answer, from the clues alone. Public: anyone can work it out from the cards. */
const answerCache = new WeakMap<CanoePuzzle, Seating | null>();
export function answerOf(p: CanoePuzzle): Seating | null {
  if (answerCache.has(p)) return answerCache.get(p)!;
  const r = countSeatings(p, 2);
  const out = r.status === 'counted' && r.count === 1 ? r.first : null;
  answerCache.set(p, out);
  return out;
}

// ---------- Independent count and the person-style grader ----------

type Domains = number[];
const full = (p: CanoePuzzle): Domains => Array(items(p)).fill((1 << p.n) - 1);
const single = (d: number) => d !== 0 && (d & (d - 1)) === 0;
const bit = (d: number) => 31 - Math.clz32(d);
/** Eliminations a person can make one clue or one "everyone needs a seat" fact at a time. */
type Step = { item: number; seat: number; why: string };
/**
 * Shrinks each item's possible seats until nothing changes. Returns false on a contradiction.
 * Each removed seat is one deduction step, recorded with its reason when `log` is given.
 */
function propagate(p: CanoePuzzle, d: Domains, log: Step[] | null, only?: readonly Clue[]): boolean {
  const clues = only ?? p.clues;
  let changed = true;
  const cut = (item: number, keep: number, why: string) => {
    const was = d[item], now = was & keep;
    if (now === was) return true;
    if (log) for (let s = 0; s < p.n; s++) if ((was & (1 << s)) && !(now & (1 << s))) log.push({ item, seat: s, why });
    d[item] = now; changed = true;
    return now !== 0;
  };
  while (changed) {
    changed = false;
    for (let ci = 0; ci < clues.length; ci++) {
      const c = clues[ci], why = `c${p.clues.indexOf(c)}`;
      if (c.y === undefined) {
        let keep = 0;
        for (let s = 0; s < p.n; s++) if ((d[c.x] & (1 << s)) && holdsAt(c, p.n, s, 0)) keep |= 1 << s;
        if (!cut(c.x, keep, why)) return false;
      } else {
        let kx = 0, ky = 0;
        for (let s = 0; s < p.n; s++) if (d[c.x] & (1 << s)) for (let t = 0; t < p.n; t++) if ((d[c.y] & (1 << t)) && holdsAt(c, p.n, s, t)) { kx |= 1 << s; ky |= 1 << t; }
        if (!cut(c.x, kx, why) || !cut(c.y, ky, why)) return false;
      }
    }
    for (let a = 0; a < p.attrs; a++) {
      const group = itemsOf(p, a);
      for (const i of group) if (single(d[i])) for (const j of group) if (j !== i && (d[j] & d[i]) && !cut(j, ~d[i], 'taken')) return false;
      for (let s = 0; s < p.n; s++) {
        const can = group.filter(i => d[i] & (1 << s));
        if (!can.length) return false;
        if (can.length === 1 && !cut(can[0], 1 << s, 'only')) return false;
      }
    }
  }
  return true;
}
const solvedDomains = (d: Domains) => d.every(single);
/** A second, independent count: branch on possible seats with the same propagation a person uses. */
export function countBySearch(p: CanoePuzzle, cap = 2, budget = 200_000): { status: 'counted'; count: number } | { status: 'budget-exhausted' } {
  let count = 0, nodes = 0;
  const walk = (d: Domains): boolean => {
    if (++nodes > budget) return true;
    if (!propagate(p, d, null)) return false;
    if (solvedDomains(d)) { count++; return count >= cap; }
    let pick = -1, best = 99;
    for (let i = 0; i < d.length; i++) { const k = popcount(d[i]); if (k > 1 && k < best) { best = k; pick = i; } }
    for (let s = 0; s < p.n; s++) if (d[pick] & (1 << s)) { const next = [...d]; next[pick] = 1 << s; if (walk(next)) return true; }
    return false;
  };
  walk(full(p));
  return nodes > budget ? { status: 'budget-exhausted' } : { status: 'counted', count };
}
const popcount = (x: number) => { let n = 0; while (x) { x &= x - 1; n++; } return n; };

export type Grade = {
  /** 0: only direct seat clues; 1: clues chained together; 2: one "what if" needed; 3: a "what if" inside a "what if". */
  tier: 0 | 1 | 2 | 3;
  /** Seats crossed out on the way: the deduction depth. */
  steps: number;
  /** "What if" eliminations: a seat crossed out because trying it led to a contradiction. */
  whatIfs: number;
  answer: Seating;
  trace: string;
};
/**
 * The person-style grader. It never looks at the exhaustive answer: it crosses out seats with one
 * clue at a time, then tries "what if this friend sat here?" and crosses that seat out when the clues
 * then contradict each other. Returns null when even a nested "what if" cannot finish (a stall).
 */
export function grade(p: CanoePuzzle, maxDepth: 2 | 3 = 3): Grade | null {
  const d = full(p), log: Step[] = [];
  let whatIfs = 0;
  if (!propagate(p, d, log)) return null;
  const doneAt = (tier: Grade['tier']): Grade => ({ tier, steps: log.length, whatIfs, answer: d.map(bit), trace: log.map(s => `${s.why}:${s.item}-${s.seat}`).join(';') });
  if (solvedDomains(d)) return doneAt(p.clues.every(c => UNARY.has(c.k)) ? 0 : 1);
  /** One round of "what if": strike every seat whose trial contradicts. Nested trials use one level less. */
  const refute = (dom: Domains, depth: number, record: Step[] | null): boolean | null => {
    let progress = false;
    for (let i = 0; i < dom.length; i++) {
      if (single(dom[i])) continue;
      for (let s = 0; s < p.n; s++) {
        if (!(dom[i] & (1 << s))) continue;
        const trial = [...dom]; trial[i] = 1 << s;
        if (!contradicts(trial, depth - 1)) continue;
        dom[i] &= ~(1 << s);
        if (record) { record.push({ item: i, seat: s, why: `w${depth}` }); whatIfs++; }
        if (!propagate(p, dom, record)) return null;
        progress = true;
      }
    }
    return progress;
  };
  /** True when the clues contradict from here, using at most `depth` levels of "what if". */
  const contradicts = (dom: Domains, depth: number): boolean => {
    const t = [...dom];
    if (!propagate(p, t, null)) return true;
    if (depth <= 0 || solvedDomains(t)) return false;
    for (;;) {
      const r = refute(t, depth, null);
      if (r === null) return true;
      if (!r || solvedDomains(t)) return false;
    }
  };
  for (const depth of [1, 2] as const) {
    if (depth + 1 > maxDepth) break;
    for (;;) {
      const r = refute(d, depth, log);
      if (r === null) return null;
      if (solvedDomains(d)) return doneAt((depth + 1) as 2 | 3);
      if (!r) break;
    }
  }
  return null;
}
/** Propagation alone, the "chain the clues" reasoning: does it finish? */
export function chainsAlone(p: CanoePuzzle): boolean {
  const d = full(p);
  return propagate(p, d, null) && solvedDomains(d);
}

// ---------- Help, from the clues alone ----------

/** Seats a person can cross out using one clue on its own, from a blank canoe. Never reads the draft. */
export function eliminationsBy(p: CanoePuzzle, clue: number): Step[] {
  const d = full(p), log: Step[] = [];
  propagate(p, d, log, [p.clues[clue]]);
  return log;
}
/** The card to look at first: the one that crosses out the most seats by itself. Ties go to the earlier card. */
export function mostUseful(p: CanoePuzzle): number {
  let best = 0, score = -1;
  p.clues.forEach((_, i) => { const n = eliminationsBy(p, i).length; if (n > score) { score = n; best = i; } });
  return best;
}
/** One seat that cannot hold an item, and the clue that shows it. Prefers the first card to look at. */
export function oneImpossible(p: CanoePuzzle): { item: number; seat: number; clue: number } | null {
  const first = mostUseful(p), order = [first, ...p.clues.map((_, i) => i).filter(i => i !== first)];
  for (const clue of order) {
    const hit = eliminationsBy(p, clue).find(s => s.why === `c${clue}`);
    if (hit) return { item: hit.item, seat: hit.seat, clue };
  }
  return null;
}
/**
 * The next helpful placement from this draft: an item whose answer seat differs from where it is.
 * Prefers an item on the shore going to an empty seat, so help never moves a seated item it need not.
 */
export function nextPlacement(p: CanoePuzzle, pos: Seating): { item: number; seat: number } | null {
  const answer = answerOf(p);
  if (!answer) return null;
  const wrong = answer.map((s, i) => i).filter(i => pos[i] !== answer[i]);
  if (!wrong.length) return null;
  const free = (i: number) => !itemsOf(p, attrOf(p, i)).some(j => j !== i && pos[j] === answer[i]);
  const pick = wrong.find(i => pos[i] === SHORE && free(i)) ?? wrong.find(free) ?? wrong[0];
  return { item: pick, seat: answer[pick] };
}
