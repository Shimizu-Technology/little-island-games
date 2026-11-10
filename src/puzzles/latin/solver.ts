import { cageOK, cellsOf, colOf, digits, groups, maxValue, rowOf, shapeOf, sightCells, solved, visible, type Cage, type Group, type LatinPuzzle } from './core';

export const bit = (v: number) => 1 << (v - 1);
export const valuesOf = (mask: number) => { const out: number[] = []; for (let v = 1; mask >> (v - 1); v++) if (mask & bit(v)) out.push(v); return out; };
export const singleton = (m: number) => m > 0 && !(m & (m - 1));
export const countBits = (m: number) => { let n = 0; for (; m; m &= m - 1) n++; return n; };
export const only = (m: number) => valuesOf(m)[0];

/**
 * Named, sound human deductions in teaching order. The grader always uses the first one that makes
 * progress, so a puzzle's ceiling is the hardest idea it cannot do without. No step ever guesses.
 */
export const techniques = ['single', 'hidden-single', 'inequality', 'cage-sum', 'skyline-line', 'locked-candidates', 'naked-pair', 'hidden-pair', 'naked-triple', 'hidden-triple', 'x-wing', 'swordfish', 'xy-wing', 'simple-coloring'] as const;
export type Technique = typeof techniques[number];
export const rank = (t: string) => techniques.indexOf(t as Technique);
/** The deepest technique the clue-propagation search uses; anything beyond is pure grading. */
const CLUES = rank('skyline-line');

export type Step = {
  technique: Technique;
  /** Cells whose candidates prove the step (the pattern a person looks at). */
  focus: number[];
  /** The group or lines the idea is about, for teaching text. */
  groups: Group[];
  digits: number[];
  remove: [cell: number, mask: number][];
};
export class Work {
  left: number;
  constructor(budget: number) { this.left = budget; }
  tick(n = 1) { this.left -= n; if (this.left < 0) throw new Error('latin-budget'); }
}
export function startDomains(p: LatinPuzzle, grid: readonly number[] = p.givens): number[] {
  const all = (1 << maxValue(p)) - 1;
  return grid.map((v, i) => p.mask[i] ? 0 : v ? bit(v) : all);
}
export function applyStep(d: readonly number[], step: Step) { const next = [...d]; for (const [i, m] of step.remove) next[i] &= ~m; return next; }
const trim = (d: readonly number[], cells: readonly number[], keep: readonly number[], technique: Technique, focus: number[], gs: Group[], ds: number[]): Step | null => {
  const remove: [number, number][] = [];
  cells.forEach((i, j) => { const m = d[i] & ~keep[j]; if (m) remove.push([i, m]); });
  return remove.length ? { technique, focus, groups: gs, digits: ds, remove } : null;
};
/** One empty domain, or a full Latin group missing a number, means the board cannot be finished. */
export function contradiction(p: LatinPuzzle, d: readonly number[]): boolean {
  const n = p.size;
  for (const i of cellsOf(p)) if (!d[i]) return true;
  for (const g of groups(p)) {
    if (g.cells.length === n && p.kind !== 'cross-sums') { let union = 0; for (const i of g.cells) union |= d[i]; if (union !== (1 << n) - 1) return true; }
    const placed = g.cells.filter(i => singleton(d[i]));
    for (let a = 0; a < placed.length; a++) for (let b = a + 1; b < placed.length; b++) if (d[placed[a]] === d[placed[b]]) return true;
  }
  return false;
}

/** Enumerates one public clue at a time, never a whole-board assumption. */
function supports(p: LatinPuzzle, cells: readonly number[], d: readonly number[], accept: (v: readonly number[]) => boolean, distinct: (a: number, b: number) => boolean, work: Work, sum?: number): number[] {
  const out = cells.map(() => 0), chosen: number[] = [], max = maxValue(p), k = cells.length;
  const walk = (at: number, total: number) => {
    work.tick();
    if (at === k) { if (accept(chosen)) chosen.forEach((v, j) => { out[j] |= bit(v); }); return; }
    for (const v of valuesOf(d[cells[at]])) {
      let clash = false;
      for (let j = 0; j < at && !clash; j++) clash = chosen[j] === v && distinct(j, at);
      if (clash) continue;
      if (sum !== undefined && (total + v + (k - at - 1) > sum || total + v + (k - at - 1) * max < sum)) continue;
      chosen[at] = v; walk(at + 1, total + v);
    }
  };
  walk(0, 0);
  return out;
}
function combinations<T>(items: readonly T[], k: number): T[][] {
  const out: T[][] = [];
  const visit = (at: number, a: T[]) => { if (a.length === k) { out.push(a); return; } for (let i = at; i <= items.length - k + a.length; i++) visit(i + 1, [...a, items[i]]); };
  visit(0, []);
  return out;
}
const sameLine = (p: LatinPuzzle, a: number, b: number) => rowOf(p, a) === rowOf(p, b) || colOf(p, a) === colOf(p, b);
const cageDistinct = (p: LatinPuzzle, c: Cage) => p.kind === 'cage-math' ? (a: number, b: number) => sameLine(p, c.cells[a], c.cells[b]) : () => true;

/** The single next step at or below `ceiling`, simplest first. Returns null when nothing applies. */
export function nextDeduction(p: LatinPuzzle, d: readonly number[], work = new Work(200_000), ceiling: number = techniques.length - 1): Step | null {
  const n = p.size, { groups: gs, peers } = shapeOf(p), latin = p.kind !== 'cross-sums';
  const full = latin ? gs.filter(g => g.cells.length === n) : [];
  // A placed number leaves every peer. A cell with one candidate left is a single.
  for (const i of cellsOf(p)) {
    if (!singleton(d[i])) continue;
    work.tick();
    const others = peers[i].filter(j => d[j] & d[i]);
    if (others.length) return { technique: 'single', focus: [i], groups: gs.filter(g => g.cells.includes(i)), digits: [only(d[i])], remove: others.map(j => [j, d[i]]) };
  }
  if (ceiling < 1) return null;
  for (const g of full) for (let v = 1; v <= n; v++) {
    work.tick();
    let spot = -1, spots = 0;
    for (const i of g.cells) if (d[i] & bit(v)) { spot = i; spots++; }
    if (spots === 1 && !singleton(d[spot])) return { technique: 'hidden-single', focus: [spot], groups: [g], digits: [v], remove: [[spot, d[spot] & ~bit(v)]] };
  }
  if (ceiling < 2) return null;
  for (const [a, b] of p.less) {
    work.tick();
    const top = Math.max(...valuesOf(d[b])), bottom = Math.min(...valuesOf(d[a]));
    const s = trim(d, [a, b], [(1 << (top - 1)) - 1, ((1 << maxValue(p)) - 1) & ~((1 << bottom) - 1)], 'inequality', [a, b], [], []);
    if (s) return s;
  }
  if (ceiling < 3) return null;
  for (const c of p.cages) {
    if (c.cells.every(i => singleton(d[i]))) continue;
    const keep = supports(p, c.cells, d, v => cageOK(c, v), p.kind === 'cage-math' ? cageDistinct(p, c) : () => true, work, c.op === '+' ? c.target : undefined);
    const s = trim(d, c.cells, keep, 'cage-sum', [...c.cells], [{ kind: p.kind === 'cross-sums' ? 'run' : 'cage', index: p.cages.indexOf(c), cells: c.cells }], [c.target]);
    if (s) return s;
  }
  if (ceiling < 4) return null;
  for (const [id, clue] of p.sights) {
    const line = sightCells(p, id);
    if (line.every(i => singleton(d[i]))) continue;
    const s = trim(d, line, supports(p, line, d, v => visible(v) === clue, () => true, work), 'skyline-line', line, [], [clue]);
    if (s) return s;
  }
  if (ceiling < 5 || !latin) return null;
  // An intersection: when a number's spots in one group all sit inside another group, the rest of
  // that other group cannot have it. This covers pointing (box to line) and claiming (line to box).
  for (const a of full) for (const b of full) {
    if (a === b) continue;
    const common = a.cells.filter(i => b.cells.includes(i));
    if (common.length < 2) continue;
    for (let v = 1; v <= n; v++) {
      work.tick();
      const spots = a.cells.filter(i => d[i] & bit(v));
      if (spots.length < 2 || spots.some(i => singleton(d[i])) || !spots.every(i => common.includes(i))) continue;
      const rest = b.cells.filter(i => !common.includes(i));
      const s = trim(d, rest, rest.map(i => d[i] & ~bit(v)), 'locked-candidates', spots, [a, b], [v]);
      if (s) return s;
    }
  }
  const subset = (k: number, naked: boolean): Step | null => {
    const technique = (naked ? (k === 2 ? 'naked-pair' : 'naked-triple') : (k === 2 ? 'hidden-pair' : 'hidden-triple')) as Technique;
    for (const g of naked ? gs : full) {
      const open = g.cells.filter(i => !singleton(d[i]));
      if (open.length <= k) continue;
      if (naked) {
        for (const set of combinations(open.filter(i => countBits(d[i]) <= k), k)) {
          work.tick();
          let union = 0; for (const i of set) union |= d[i];
          if (countBits(union) !== k) continue;
          const rest = open.filter(i => !set.includes(i));
          const s = trim(d, rest, rest.map(i => d[i] & ~union), technique, set, [g], valuesOf(union));
          if (s) return s;
        }
      } else {
        const free = digits(n).filter(v => !g.cells.some(i => d[i] === bit(v)));
        for (const vs of combinations(free, k)) {
          work.tick();
          const mask = vs.reduce((m, v) => m | bit(v), 0), spots = open.filter(i => d[i] & mask);
          if (spots.length !== k || vs.some(v => !spots.some(i => d[i] & bit(v)))) continue;
          const s = trim(d, spots, spots.map(i => d[i] & mask), technique, spots, [g], vs);
          if (s) return s;
        }
      }
    }
    return null;
  };
  if (ceiling < 6) return null;
  const pair = subset(2, true); if (pair) return pair;
  if (ceiling < 7) return null;
  const hidden = subset(2, false); if (hidden) return hidden;
  if (ceiling < 8) return null;
  const triple = subset(3, true); if (triple) return triple;
  if (ceiling < 9) return null;
  const hiddenTriple = subset(3, false); if (hiddenTriple) return hiddenTriple;
  const fish = (k: number): Step | null => {
    const technique = k === 2 ? 'x-wing' : 'swordfish';
    for (const axis of ['row', 'column'] as const) for (let v = 1; v <= n; v++) {
      const lines = full.filter(g => g.kind === axis).map(g => ({ g, spots: g.cells.filter(i => (d[i] & bit(v)) && !singleton(d[i])) })).filter(l => l.spots.length >= 2 && l.spots.length <= k && !l.g.cells.some(i => d[i] === bit(v)));
      for (const set of combinations(lines, k)) {
        work.tick();
        const cover = [...new Set(set.flatMap(l => l.spots.map(i => axis === 'row' ? colOf(p, i) : rowOf(p, i))))];
        if (cover.length !== k) continue;
        const crossing = full.filter(g => g.kind !== axis && g.kind !== 'box' && cover.includes(g.index));
        const rest = crossing.flatMap(g => g.cells).filter(i => !set.some(l => l.g.cells.includes(i)));
        const s = trim(d, rest, rest.map(i => d[i] & ~bit(v)), technique, set.flatMap(l => l.spots), [...set.map(l => l.g), ...crossing], [v]);
        if (s) return s;
      }
    }
    return null;
  };
  if (ceiling < 10) return null;
  const xWing = fish(2); if (xWing) return xWing;
  if (ceiling < 11) return null;
  const swordfish = fish(3); if (swordfish) return swordfish;
  if (ceiling < 12) return null;
  const twins = cellsOf(p).filter(i => countBits(d[i]) === 2);
  for (const pivot of twins) {
    const wings = twins.filter(i => peers[pivot].includes(i));
    for (const [a, b] of combinations(wings, 2)) {
      work.tick();
      const z = d[a] & d[b], x = d[pivot] & d[a], y = d[pivot] & d[b];
      if (!singleton(z) || !singleton(x) || !singleton(y) || x === y || d[pivot] & z) continue;
      const rest = peers[a].filter(i => i !== pivot && i !== b && peers[b].includes(i));
      const s = trim(d, rest, rest.map(i => d[i] & ~z), 'xy-wing', [pivot, a, b], [], [only(x), only(y), only(z)]);
      if (s) return s;
    }
  }
  if (ceiling < 13) return null;
  for (let v = 1; v <= n; v++) {
    const links = new Map<number, number[]>();
    for (const g of full) {
      const spots = g.cells.filter(i => (d[i] & bit(v)) && !singleton(d[i]));
      if (spots.length === 2 && !g.cells.some(i => d[i] === bit(v))) for (const [a, b] of [[spots[0], spots[1]], [spots[1], spots[0]]]) links.set(a, [...(links.get(a) ?? []), b]);
    }
    const seen = new Set<number>();
    for (const root of links.keys()) {
      if (seen.has(root)) continue;
      const color = new Map<number, 0 | 1>([[root, 0]]), queue = [root];
      for (let q = 0; q < queue.length; q++) { const a = queue[q]; seen.add(a); for (const b of links.get(a) ?? []) if (!color.has(b)) { color.set(b, color.get(a) ? 0 : 1); queue.push(b); } }
      work.tick(color.size);
      if (color.size < 3) continue;
      const chain = [...color.keys()];
      for (const c of [0, 1] as const) {
        const same = chain.filter(i => color.get(i) === c);
        if (same.some(a => same.some(b => a !== b && peers[a].includes(b)))) {
          const s = trim(d, same, same.map(i => d[i] & ~bit(v)), 'simple-coloring', chain, [], [v]);
          if (s) return s;
        }
      }
      const rest = cellsOf(p).filter(i => !color.has(i) && (d[i] & bit(v)) && [0, 1].every(c => chain.some(j => color.get(j) === c && peers[i].includes(j))));
      const s = trim(d, rest, rest.map(i => d[i] & ~bit(v)), 'simple-coloring', chain, [], [v]);
      if (s) return s;
    }
  }
  return null;
}

export type Grade =
  | { status: 'complete'; ceiling: Technique; steps: Step[]; domains: number[]; counts: Partial<Record<Technique, number>> }
  | { status: 'stalled' | 'contradiction' | 'budget-exhausted'; ceiling: null; steps: Step[]; domains: number[]; counts: Partial<Record<Technique, number>> };
/** A complete no-guess trace, or an honest stall. Never a guess, and never a stall labelled hard. */
export function grade(p: LatinPuzzle, budget = 400_000, grid: readonly number[] = p.givens, ceiling: number = techniques.length - 1): Grade {
  let domains = startDomains(p, grid);
  const steps: Step[] = [], work = new Work(budget), counts: Partial<Record<Technique, number>> = {};
  const done = (status: 'stalled' | 'contradiction' | 'budget-exhausted'): Grade => ({ status, ceiling: null, steps, domains, counts });
  try {
    for (let i = 0; i < 4096; i++) {
      if (contradiction(p, domains)) return done('contradiction');
      const next = nextDeduction(p, domains, work, ceiling);
      if (!next) {
        const answer = domains.map((m, j) => p.mask[j] ? 0 : singleton(m) ? only(m) : 0);
        if (!solved(p, answer)) return done('stalled');
        const top = steps.reduce((a, s) => Math.max(a, rank(s.technique)), 0);
        return { status: 'complete', ceiling: techniques[top], steps, domains, counts };
      }
      steps.push(next);
      counts[next.technique] = (counts[next.technique] ?? 0) + 1;
      domains = applyStep(domains, next);
    }
  } catch (e) { if (!(e instanceof Error) || e.message !== 'latin-budget') throw e; }
  return done('budget-exhausted');
}

/**
 * Fast propagation for counting and hints: placed numbers leave their peers, hidden singles, then
 * each clue rule. Records no steps. Returns null when the board cannot be finished.
 */
export function propagate(p: LatinPuzzle, start: readonly number[], work: Work): number[] | null {
  const d = [...start], { peers, groups: gs } = shapeOf(p), n = p.size, cells = cellsOf(p), done = new Set<number>();
  const full = p.kind === 'cross-sums' ? [] : gs.filter(g => g.cells.length === n);
  for (let changed = true; changed;) {
    changed = false;
    for (let moved = true; moved;) {
      moved = false;
      for (const i of cells) {
        if (!d[i]) return null;
        if (done.has(i) || !singleton(d[i])) continue;
        done.add(i); work.tick();
        for (const j of peers[i]) if (d[j] & d[i]) { d[j] &= ~d[i]; if (!d[j]) return null; moved = true; }
      }
    }
    for (const g of full) for (let v = 1; v <= n; v++) {
      let spot = -1, spots = 0;
      for (const i of g.cells) if (d[i] & bit(v)) { spot = i; spots++; }
      if (!spots) return null;
      if (spots === 1 && d[spot] !== bit(v)) { d[spot] = bit(v); changed = true; }
    }
    work.tick(full.length);
    if (changed || !(p.less.length || p.cages.length || p.sights.length)) continue;
    const s = clueStep(p, d, work);
    if (s) { for (const [i, m] of s.remove) d[i] &= ~m; changed = true; }
  }
  return contradiction(p, d) ? null : d;
}
/** The first clue deduction (inequality, cage or sight line), or null. */
const clueStep = (p: LatinPuzzle, d: readonly number[], work: Work): Step | null => {
  const s = nextDeduction(p, d, work, CLUES);
  return s && s.technique !== 'single' && s.technique !== 'hidden-single' ? s : null;
};

/** MRV search with clue propagation. Exhaustion is never reported as zero solutions. */
export function search(p: LatinPuzzle, cap = 2, budget = 400_000, random?: () => number) {
  let count = 0, first = null as number[] | null, nodes = 0, spent = false;
  const work = new Work(budget), cells = cellsOf(p), found: number[][] = [];
  const walk = (start: number[]) => {
    if (count >= cap) return;
    work.tick(); nodes++;
    const d = propagate(p, start, work);
    if (!d) return;
    let best = -1;
    for (const i of cells) if (!singleton(d[i]) && (best < 0 || countBits(d[i]) < countBits(d[best]))) best = i;
    if (best < 0) { const v = d.map((m, i) => p.mask[i] ? 0 : only(m)); if (solved(p, v)) { count++; first ??= v; found.push(v); } return; }
    const vs = valuesOf(d[best]);
    if (random) for (let j = vs.length - 1; j > 0; j--) { const k = Math.floor(random() * (j + 1)); [vs[j], vs[k]] = [vs[k], vs[j]]; }
    for (const v of vs) { const next = [...d]; next[best] = bit(v); walk(next); if (count >= cap) return; }
  };
  try { walk(startDomains(p)); } catch (e) { if (!(e instanceof Error) || e.message !== 'latin-budget') throw e; spent = true; }
  return { status: spent ? 'budget-exhausted' as const : 'counted' as const, count, first, nodes, found };
}

export type HintPlan =
  /** A number the board already breaks a rule with: the public rule names the clash. */
  | { kind: 'clash'; cells: number[]; erase: number }
  /** An entry that no chain of public deductions from the givens can keep. */
  | { kind: 'mistake'; cell: number }
  | { kind: 'place'; cell: number; value: number; technique: Technique; steps: Step[] }
  | { kind: 'none' };
/**
 * The next teaching move from the givens and the current public board only. Entries are premises,
 * so a wrong entry is cleared first: a visible clash, then any entry the givens' logic cannot keep.
 */
export function planHint(p: LatinPuzzle, values: readonly number[], budget = 400_000): HintPlan {
  const work = new Work(budget), clash = conflictsOf(p, values);
  const opening = cachedOpening(p, budget);
  const wrong = (i: number) => !p.givens[i] && values[i] && opening && opening[i] !== values[i];
  if (clash.length) {
    const erase = clash.find(wrong) ?? clash.find(i => !p.givens[i]);
    if (erase !== undefined) return { kind: 'clash', cells: clash, erase };
  }
  const mistake = cellsOf(p).find(i => wrong(i));
  if (mistake !== undefined) return { kind: 'mistake', cell: mistake };
  try {
    let d = startDomains(p, values);
    const steps: Step[] = [], open = (i: number) => !values[i];
    for (let i = 0; i < 4096; i++) {
      // Fast peer clearing first, so the explanation names only the step a person needs.
      const quick = peerClear(p, d, work);
      if (!quick) return { kind: 'none' };
      d = quick;
      const placed = cellsOf(p).find(c => open(c) && singleton(d[c]));
      if (placed !== undefined) {
        const technique = steps.reduce<Technique>((a, s) => rank(s.technique) > rank(a) ? s.technique : a, 'single');
        return { kind: 'place', cell: placed, value: only(d[placed]), technique, steps };
      }
      const next = nextDeduction(p, d, work);
      if (!next) return { kind: 'none' };
      if (next.technique !== 'single') steps.push(next);
      d = applyStep(d, next);
    }
  } catch (e) { if (!(e instanceof Error) || e.message !== 'latin-budget') throw e; }
  return { kind: 'none' };
}
const conflictsOf = (p: LatinPuzzle, values: readonly number[]) => {
  const out = new Set<number>();
  for (const g of groups(p)) for (const i of g.cells) if (values[i] && g.cells.some(j => j !== i && values[i] === values[j])) out.add(i);
  for (const c of p.cages) if (c.cells.every(i => values[i]) && !cageOK(c, c.cells.map(i => values[i]))) c.cells.forEach(i => out.add(i));
  for (const [a, b] of p.less) if (values[a] && values[b] && values[a] >= values[b]) { out.add(a); out.add(b); }
  for (const [id, clue] of p.sights) { const line = sightCells(p, id); if (line.every(i => values[i]) && visible(line.map(i => values[i])) !== clue) line.forEach(i => out.add(i)); }
  return [...out].sort((a, b) => a - b);
};
function peerClear(p: LatinPuzzle, start: readonly number[], work: Work): number[] | null {
  const d = [...start], { peers } = shapeOf(p);
  for (let moved = true; moved;) {
    moved = false;
    for (const i of cellsOf(p)) {
      if (!singleton(d[i])) continue;
      work.tick();
      for (const j of peers[i]) if (d[j] & d[i]) { d[j] &= ~d[i]; if (!d[j]) return null; moved = true; }
    }
  }
  return d;
}
/** The board every chain of public deductions from the givens reaches, when that chain finishes. */
const openings = new WeakMap<LatinPuzzle, number[] | null>();
function cachedOpening(p: LatinPuzzle, budget: number): number[] | null {
  if (openings.has(p)) return openings.get(p)!;
  const g = grade(p, budget), answer = g.status === 'complete' ? g.domains.map((m, i) => p.mask[i] ? 0 : only(m)) : null;
  if (Object.isFrozen(p)) openings.set(p, answer);
  return answer;
}
