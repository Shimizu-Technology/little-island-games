import { crossings, groups, other, overfull, shapeOf, solved, type BridgesPuzzle, type Counts } from './core';

/**
 * Named human techniques, simplest first. `tidy` is bookkeeping every player does without thinking
 * (a finished island takes no more bridges; a bridge blocks the ones it would cross) and never sets a
 * rung. `what-if` follows one bridge choice through the island rules until a number cannot be met;
 * `chain` follows it through every rule, groups and crossings included. Both are one level deep.
 */
export const techniques = ['tidy', 'full', 'must-reach', 'isolation', 'way-out', 'what-if', 'chain'] as const;
export type Technique = (typeof techniques)[number];
export const rank = (t: string) => techniques.indexOf(t as Technique);

/** Lower and upper bounds on each link's bridge count. */
export type Bounds = { lo: number[]; hi: number[] };
export type Step = { technique: Technique; island: number; links: number[]; lo: number[]; hi: number[] };
export type Grade = { status: 'complete'; ceiling: Technique; steps: Step[]; counts: number[] } | { status: 'stalled'; steps: Step[] };

export function initialBounds(p: BridgesPuzzle, from?: Counts): Bounds {
  const { islands, links } = shapeOf(p);
  return { lo: links.map((_, i) => from?.[i] ?? 0), hi: links.map(l => Math.min(2, islands[l.a].clue, islands[l.b].clue)) };
}
const copy = (b: Bounds): Bounds => ({ lo: [...b.lo], hi: [...b.hi] });
const sum = (xs: readonly number[], list: readonly number[]) => list.reduce((n, i) => n + xs[i], 0);

/** Closed group: every island in it is finished by the bridges certain so far, and it is not everything. */
function closedGroup(p: BridgesPuzzle, lo: readonly number[]): boolean {
  const { islands, around } = shapeOf(p), g = groups(p, lo), full = new Map<number, boolean>(), size = new Map<number, number>();
  islands.forEach((s, i) => { full.set(g[i], (full.get(g[i]) ?? true) && sum(lo, around[i]) === s.clue); size.set(g[i], (size.get(g[i]) ?? 0) + 1); });
  return [...full].some(([root, done]) => done && size.get(root)! < islands.length);
}
/** The links that might still carry a bridge cannot join every island. */
function cutOff(p: BridgesPuzzle, hi: readonly number[]): boolean {
  const g = groups(p, hi);
  return g.some(x => x !== g[0]);
}
/** Bookkeeping to a fixed point. Returns false when the bounds break a rule. */
export function tidy(p: BridgesPuzzle, b: Bounds): boolean {
  const { islands, links, crosses, around } = shapeOf(p);
  for (let changed = true; changed;) {
    changed = false;
    for (let e = 0; e < links.length; e++) {
      if (b.lo[e] > b.hi[e]) return false;
      if (b.lo[e] > 0) for (const f of crosses[e]) if (b.hi[f] > 0) { if (b.lo[f] > 0) return false; b.hi[f] = 0; changed = true; }
      for (const end of [links[e].a, links[e].b]) {
        const room = islands[end].clue - (sum(b.lo, around[end]) - b.lo[e]);
        if (room < b.lo[e]) return false;
        if (b.hi[e] > room) { b.hi[e] = room; changed = true; }
      }
    }
  }
  return islands.every((s, i) => sum(b.hi, around[i]) >= s.clue && sum(b.lo, around[i]) <= s.clue);
}
/** Every rule a solution must keep, applied to bounds. False means these bounds hold no solution. */
export function consistent(p: BridgesPuzzle, b: Bounds): boolean {
  return tidy(p, b) && !closedGroup(p, b.lo) && !cutOff(p, b.hi);
}

type Found = { island: number; links: number[]; lo?: number[]; hi?: number[] };
/** Raise lower bounds at one island when the rest of its links cannot carry its number otherwise. */
function islandRule(p: BridgesPuzzle, b: Bounds, full: boolean): Found | null {
  const { islands, around } = shapeOf(p);
  for (const [i, s] of islands.entries()) {
    const list = around[i], top = sum(b.hi, list);
    if (full !== (top === s.clue)) continue;
    const raise = list.filter(e => b.lo[e] < Math.max(0, s.clue - (top - b.hi[e])));
    if (raise.length) return { island: i, links: raise, lo: raise.map(e => s.clue - (top - b.hi[e])) };
  }
  return null;
}
/** One more bridge here would finish a group that does not reach every island. */
function isolation(p: BridgesPuzzle, b: Bounds): Found | null {
  const { links } = shapeOf(p);
  for (let e = 0; e < links.length; e++) {
    if (b.lo[e] >= b.hi[e]) continue;
    const lo = [...b.lo]; lo[e]++;
    if (closedGroup(p, lo)) return { island: links[e].a, links: [e], hi: [b.lo[e]] };
  }
  return null;
}
/**
 * The only way across: a link that might still carry a bridge, without which the links that remain
 * possible could no longer join every island. A group with a single way out is the everyday case.
 */
function wayOut(p: BridgesPuzzle, b: Bounds): Found | null {
  const { links } = shapeOf(p);
  for (let e = 0; e < links.length; e++) {
    if (b.lo[e] > 0 || b.hi[e] === 0) continue;
    const hi = [...b.hi]; hi[e] = 0;
    if (cutOff(p, hi)) return { island: links[e].a, links: [e], lo: [1] };
  }
  return null;
}
/** Simpler rules, applied until nothing changes. False when they reach a broken board. */
function settle(p: BridgesPuzzle, b: Bounds, upTo: number): boolean {
  for (;;) {
    if (!consistent(p, b)) return false;
    const found = findBelow(p, b, upTo);
    if (!found) return true;
    apply(b, found.found);
  }
}
/** Suppose one more (or one fewer) bridge here, apply rules below `upTo`, and look for a broken rule. */
function whatIf(p: BridgesPuzzle, b: Bounds, upTo: number, local: boolean): Found | null {
  const { links } = shapeOf(p);
  const broken = (t: Bounds) => local ? !settleLocal(p, t) : !settle(p, t, upTo);
  for (let e = 0; e < links.length; e++) {
    if (b.lo[e] >= b.hi[e]) continue;
    const more = copy(b); more.lo[e]++;
    if (broken(more)) return { island: links[e].a, links: [e], hi: [b.lo[e]] };
    const fewer = copy(b); fewer.hi[e]--;
    if (broken(fewer)) return { island: links[e].a, links: [e], lo: [b.hi[e]] };
  }
  return null;
}
/** Island rules only, and a broken number as the only contradiction: the short what-if. */
function settleLocal(p: BridgesPuzzle, b: Bounds): boolean {
  for (;;) {
    if (!tidy(p, b)) return false;
    const found = islandRule(p, b, true) ?? islandRule(p, b, false);
    if (!found) return true;
    apply(b, found);
  }
}
function apply(b: Bounds, f: Found) {
  f.links.forEach((e, k) => { if (f.lo) b.lo[e] = Math.max(b.lo[e], f.lo[k]); if (f.hi) b.hi[e] = Math.min(b.hi[e], f.hi[k]); });
}
/** The simplest technique below `upTo` that changes something, not counting bookkeeping. */
function findBelow(p: BridgesPuzzle, b: Bounds, upTo: number): { technique: Technique; found: Found } | null {
  const rules: [Technique, () => Found | null][] = [
    ['full', () => islandRule(p, b, true)], ['must-reach', () => islandRule(p, b, false)], ['isolation', () => isolation(p, b)],
    ['way-out', () => wayOut(p, b)], ['what-if', () => whatIf(p, b, 0, true)], ['chain', () => whatIf(p, b, rank('what-if'), false)],
  ];
  for (const [technique, rule] of rules) {
    if (rank(technique) >= upTo) break;
    const found = rule();
    if (found) return { technique, found };
  }
  return null;
}

/** Simplest-first deduction from the clues (and any trusted bridges), with no guessing. */
export function grade(p: BridgesPuzzle, from?: Counts, limit = 4000): Grade {
  const b = initialBounds(p, from), steps: Step[] = [];
  let ceiling = 0;
  for (let n = 0; n < limit; n++) {
    if (!consistent(p, b)) return { status: 'stalled', steps };
    if (b.lo.every((v, e) => v === b.hi[e])) return solved(p, b.lo) ? { status: 'complete', ceiling: techniques[ceiling], steps, counts: b.lo } : { status: 'stalled', steps };
    const next = findBelow(p, b, techniques.length);
    if (!next) return { status: 'stalled', steps };
    apply(b, next.found);
    ceiling = Math.max(ceiling, rank(next.technique));
    steps.push({ technique: next.technique, island: next.found.island, links: next.found.links, lo: next.found.links.map(e => b.lo[e]), hi: next.found.links.map(e => b.hi[e]) });
  }
  return { status: 'stalled', steps };
}

/** Counts solutions up to `cap` by branching on links after the deductive rules. */
export function search(p: BridgesPuzzle, cap = 2, budget = 200_000): { status: 'counted'; count: number; first: number[] | null } | { status: 'budget-exhausted'; nodes: number } {
  let nodes = 0, count = 0, first: number[] | null = null;
  const fast = rank('what-if');
  const walk = (b: Bounds): boolean => {
    if (++nodes > budget) return false;
    if (!settle(p, b, fast)) return true;
    const open = b.lo.findIndex((v, e) => v < b.hi[e]);
    if (open < 0) { if (solved(p, b.lo)) { count++; first ??= [...b.lo]; } return true; }
    for (let v = b.hi[open]; v >= b.lo[open]; v--) {
      const next = copy(b); next.lo[open] = next.hi[open] = v;
      if (!walk(next) ) return false;
      if (count >= cap) return true;
    }
    return true;
  };
  return walk(initialBounds(p)) ? { status: 'counted', count, first } : { status: 'budget-exhausted', nodes };
}
const solutions = new WeakMap<BridgesPuzzle, number[] | null>();
export function solutionOf(p: BridgesPuzzle): number[] | null {
  if (!solutions.has(p)) { const r = search(p, 1); solutions.set(p, r.status === 'counted' ? r.first : null); }
  return solutions.get(p)!;
}

export type Plan =
  | { kind: 'solved' }
  | { kind: 'clash'; island: number; link: number }
  | { kind: 'mistake'; link: number }
  | { kind: 'place'; technique: Technique; island: number; links: number[]; counts: number[] };
/**
 * The next hint for this board. A visible rule break comes first, then a bridge the puzzle cannot
 * keep, then the next certain bridge and the simplest idea that proves it.
 */
export function planHint(p: BridgesPuzzle, counts: Counts): Plan {
  if (solved(p, counts)) return { kind: 'solved' };
  const answer = solutionOf(p), { around } = shapeOf(p);
  const over = overfull(p, counts)[0];
  if (over !== undefined) return { kind: 'clash', island: over, link: around[over].find(e => answer && counts[e] > answer[e]) ?? around[over].find(e => counts[e] > 0)! };
  const crossed = crossings(p, counts)[0];
  if (crossed) return { kind: 'clash', island: shapeOf(p).links[crossed[0]].a, link: answer && counts[crossed[0]] > answer[crossed[0]] ? crossed[0] : crossed[1] };
  if (answer) { const wrong = counts.findIndex((c, e) => c > answer[e]); if (wrong >= 0) return { kind: 'mistake', link: wrong }; }
  const b = initialBounds(p, counts);
  for (let n = 0; n < 4000 && consistent(p, b); n++) {
    const next = findBelow(p, b, techniques.length);
    if (!next) break;
    apply(b, next.found);
    const shows = next.found.links.filter(e => b.lo[e] > counts[e]);
    if (shows.length) return { kind: 'place', technique: next.technique, island: next.found.island, links: shows, counts: shows.map(e => b.lo[e]) };
  }
  // Only reachable on a board the rules above cannot read; the unique answer still tells the next bridge.
  const e = answer ? counts.findIndex((c, i) => c < answer[i]) : -1;
  return e >= 0 ? { kind: 'place', technique: 'what-if', island: shapeOf(p).links[e].a, links: [e], counts: [answer![e]] } : { kind: 'solved' };
}
export { other };
