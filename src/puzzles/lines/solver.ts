import { BLACK, CROSS, EMPTY, LINE, WHITE, brokenClues, latticeOf, next, oneLoop, solved, type Lattice, type LinePuzzle } from './core';

/**
 * Named techniques, simplest first, per game. The first idea of each game is its rules read
 * directly: a number's sides and a dot's two lines (Loop), a pearl and a dot (Pearl Loop).
 * - `loop`: never close a small loop while other lines are still apart.
 * - `corner` (Loop): a number together with the dots at its corners.
 * - `sides` (Loop): every cell is inside or outside; a line separates the two, a cross joins them.
 * - `what-if`: suppose one line (or cross), follow the first idea until a rule breaks.
 * - `chain`: the same, following every earlier idea. Both are one level deep: no guessing.
 */
export const loopTechniques = ['count', 'loop', 'corner', 'sides', 'what-if', 'chain'] as const;
export const pearlTechniques = ['pearl', 'loop', 'what-if', 'chain'] as const;
export type Technique = (typeof loopTechniques)[number] | (typeof pearlTechniques)[number];
export const techniquesOf = (kind: LinePuzzle['kind']): readonly Technique[] => kind === 'loop' ? loopTechniques : pearlTechniques;
export const rank = (kind: LinePuzzle['kind'], t: string) => techniquesOf(kind).indexOf(t as never);

/** One deduction: what it sets, and the cells or dots it is about (a Pearl Loop dot is a cell centre). */
export type Found = { cells: number[]; dots: number[]; set: [edge: number, value: number][] };
type Result = Found | null | 'broken';
const BROKEN = 'broken' as const;
const unknownAt = (l: Lattice, s: readonly number[], v: number) => l.around[v].filter(e => s[e] === EMPTY);
const linesAt = (l: Lattice, s: readonly number[], v: number) => l.around[v].filter(e => s[e] === LINE).length;

/** A dot has no lines or exactly two. A pearl's dot always has two. */
function dots(p: LinePuzzle, l: Lattice, s: readonly number[]): Result {
  for (let v = 0; v < l.around.length; v++) {
    const on = linesAt(l, s, v), open = unknownAt(l, s, v), pearl = p.kind === 'pearl-loop' && p.pearls[v] > 0;
    if (on > 2 || on === 1 && !open.length || pearl && on + open.length < 2) return BROKEN;
    if (!open.length) continue;
    const focus = { cells: [], dots: [v] };
    if (on === 2) return { ...focus, set: open.map(e => [e, CROSS]) };
    if (on === 1 && open.length === 1) return { ...focus, set: [[open[0], LINE]] };
    if (on === 0 && pearl && open.length === 2) return { ...focus, set: open.map(e => [e, LINE]) };
    if (on === 0 && !pearl && open.length === 1) return { ...focus, set: [[open[0], CROSS]] };
  }
  return null;
}
/** A number uses exactly that many of its four sides. */
function numbers(p: LinePuzzle, l: Lattice, s: readonly number[]): Result {
  if (p.kind !== 'loop') return null;
  for (const [cell, n] of p.clues.entries()) {
    if (n < 0) continue;
    const four = l.sides[cell], on = four.filter(e => s[e] === LINE).length, open = four.filter(e => s[e] === EMPTY);
    if (on > n || on + open.length < n) return BROKEN;
    if (!open.length) continue;
    if (on === n) return { cells: [cell], dots: [], set: open.map(e => [e, CROSS]) };
    if (on + open.length === n) return { cells: [cell], dots: [], set: open.map(e => [e, LINE]) };
  }
  return null;
}
const legOpen = (l: Lattice, s: readonly number[], v: number, d: number) => { const e = l.step[v][d]; return e >= 0 && s[e] !== CROSS; };
/** Pearl rules read directly, on one pearl at a time. */
function pearls(p: LinePuzzle, l: Lattice, s: readonly number[]): Result {
  if (p.kind !== 'pearl-loop') return null;
  for (const [v, kind] of p.pearls.entries()) {
    if (!kind) continue;
    const set: [number, number][] = [], want = (e: number, value: number) => {
      if (e < 0) return value === CROSS;
      if (s[e] === value) return true;
      if (s[e] !== EMPTY) return false;
      const had = set.find(x => x[0] === e);
      if (had) return had[1] === value;
      set.push([e, value]);
      return true;
    };
    if (kind === BLACK) {
      // A leg in direction d: this edge, then straight on through the next cell.
      const leg = (d: number) => { if (!legOpen(l, s, v, d)) return false; const u = next(l, v, d); return legOpen(l, s, u, d) && s[l.step[u][(d + 1) % 4]] !== LINE && s[l.step[u][(d + 3) % 4]] !== LINE; };
      for (const d of [0, 1, 2, 3]) {
        const e = l.step[v][d], opposite = (d + 2) % 4;
        if (e >= 0 && s[e] === LINE) {
          const u = next(l, v, d);
          if (!want(l.step[v][opposite], CROSS) || !want(l.step[u][d], LINE) || !want(l.step[u][(d + 1) % 4], CROSS) || !want(l.step[u][(d + 3) % 4], CROSS)) return BROKEN;
        } else if (!leg(d)) {
          if (!leg(opposite)) return BROKEN;
          if (!want(e, CROSS) || !want(l.step[v][opposite], LINE)) return BROKEN;
        }
      }
    } else if (kind === WHITE) {
      // Straight through on one axis; the axis is closed if a side is missing, crossed, or both outer edges already run straight.
      const axis = (d: number) => {
        if (!legOpen(l, s, v, d) || !legOpen(l, s, v, d + 2)) return false;
        const u = next(l, v, d), w = next(l, v, d + 2);
        return !(s[l.step[u][d]] === LINE && s[l.step[w][d + 2]] === LINE);
      };
      for (const d of [0, 1]) {
        const a = l.step[v][d], b = l.step[v][d + 2], other = [l.step[v][d + 1], l.step[v][(d + 3) % 4]];
        if (s[a] === LINE || b >= 0 && s[b] === LINE || !axis(1 - d)) {
          if (!axis(d)) return BROKEN;
          if (!want(a, LINE) || !want(b, LINE) || !other.every(e => want(e, CROSS))) return BROKEN;
          // It must turn on at least one side: if one side runs straight on, the other side turns.
          const u = next(l, v, d), w = next(l, v, d + 2), out1 = l.step[u][d], out2 = l.step[w][d + 2];
          if (out1 >= 0 && s[out1] === LINE && !want(out2, CROSS)) return BROKEN;
          if (out2 >= 0 && s[out2] === LINE && !want(out1, CROSS)) return BROKEN;
        }
      }
    }
    if (set.length) return { cells: [], dots: [v], set };
  }
  return null;
}
/** Union-find over dots joined by lines. */
function components(l: Lattice, s: readonly number[]) {
  const parent = l.around.map((_, v) => v), find = (v: number): number => parent[v] === v ? v : (parent[v] = find(parent[v]));
  let cycle = false;
  l.edges.forEach(([a, b], e) => { if (s[e] !== LINE) return; const x = find(a), y = find(b); if (x === y) cycle = true; else parent[x] = y; });
  return { find, cycle };
}
/** The board with every unknown edge crossed. */
const closedUp = (s: readonly number[]) => s.map(m => m === EMPTY ? CROSS : m);
/** No early loop: an edge that would close a loop is crossed, unless that loop could be the whole answer. */
function smallLoops(p: LinePuzzle, l: Lattice, s: readonly number[]): Result {
  const { find, cycle } = components(l, s);
  if (cycle) return solved(p, closedUp(s)) ? null : BROKEN;
  for (let e = 0; e < s.length; e++) {
    if (s[e] !== EMPTY) continue;
    const [a, b] = l.edges[e];
    if (linesAt(l, s, a) !== 1 || linesAt(l, s, b) !== 1 || find(a) !== find(b)) continue;
    // Closing here is fine only if that loop is a whole answer. Even then a longer loop might be too,
    // so nothing is learned; otherwise the edge must stay open.
    const t = [...s]; t[e] = LINE;
    if (!solved(p, closedUp(t))) return { cells: [], dots: [a, b], set: [[e, CROSS]] };
  }
  return null;
}
/** A number and the four dots at its corners, tried every way that keeps their rules. */
function corners(p: LinePuzzle, l: Lattice, s: readonly number[]): Result {
  if (p.kind !== 'loop') return null;
  for (const [cell, n] of p.clues.entries()) {
    if (n < 0) continue;
    const r = Math.floor(cell / p.cols), c = cell % p.cols, at = [r * l.vc + c, r * l.vc + c + 1, (r + 1) * l.vc + c, (r + 1) * l.vc + c + 1];
    const window = [...new Set(at.flatMap(v => l.around[v]))], open = window.filter(e => s[e] === EMPTY);
    if (!open.length || open.length > 12) continue;
    const t = [...s], seen = open.map(() => 0);
    let ways = 0;
    const ok = () => l.sides[cell].filter(e => t[e] === LINE).length === n && at.every(v => { const k = linesAt(l, t, v); return k === 0 || k === 2; });
    const walk = (i: number) => {
      if (i === open.length) { if (ok()) { ways++; open.forEach((e, k) => { seen[k] |= t[e] === LINE ? 1 : 2; }); } return; }
      for (const v of [LINE, CROSS]) { t[open[i]] = v; walk(i + 1); }
      t[open[i]] = EMPTY;
    };
    walk(0);
    if (!ways) return BROKEN;
    const set = open.flatMap((e, k) => seen[k] === 1 ? [[e, LINE] as [number, number]] : seen[k] === 2 ? [[e, CROSS] as [number, number]] : []);
    if (set.length) return { cells: [cell], dots: [], set };
  }
  return null;
}
/** Inside and outside: a line separates two cells, a cross keeps them on the same side. The border is outside. */
function sides(p: LinePuzzle, l: Lattice, s: readonly number[]): Result {
  if (p.kind !== 'loop') return null;
  const outside = p.rows * p.cols, parent = Array.from({ length: outside + 1 }, (_, i) => i), flip = parent.map(() => 0);
  const find = (x: number): [number, number] => { let par = 0; while (parent[x] !== x) { par ^= flip[x]; x = parent[x]; } return [x, par]; };
  const join = (a: number, b: number, differ: number) => { const [x, px] = find(a), [y, py] = find(b); if (x === y) return (px ^ py) === differ; parent[x] = y; flip[x] = px ^ py ^ differ; return true; };
  const face = (f: number) => f < 0 ? outside : f;
  for (let e = 0; e < s.length; e++) if (s[e] !== EMPTY && !join(face(l.faces[e][0]), face(l.faces[e][1]), s[e] === LINE ? 1 : 0)) return BROKEN;
  for (let e = 0; e < s.length; e++) {
    if (s[e] !== EMPTY) continue;
    const [x, px] = find(face(l.faces[e][0])), [y, py] = find(face(l.faces[e][1]));
    if (x === y) return { cells: l.faces[e].filter(f => f >= 0), dots: [], set: [[e, px === py ? CROSS : LINE]] };
  }
  return null;
}
const rules: Record<Technique, (p: LinePuzzle, l: Lattice, s: readonly number[]) => Result> = {
  count: (p, l, s) => { const a = numbers(p, l, s); return a ?? dots(p, l, s); },
  pearl: (p, l, s) => { const a = pearls(p, l, s); return a ?? dots(p, l, s); },
  loop: smallLoops, corner: corners, sides,
  'what-if': (p, l, s) => trial(p, l, s, 1),
  chain: (p, l, s) => trial(p, l, s, rank(p.kind, 'what-if')),
};
/** Applies techniques below `upTo` until nothing changes. False when the board breaks a rule. */
export function settle(p: LinePuzzle, s: number[], upTo: number): boolean {
  const l = latticeOf(p), list = techniquesOf(p.kind).slice(0, upTo);
  for (let guard = 0; guard < 10000; guard++) {
    let found: Found | null = null;
    for (const t of list) {
      const r = rules[t](p, l, s);
      if (r === BROKEN) return false;
      if (r) { found = r; break; }
    }
    if (!found) return brokenClues(p, s).length === 0;
    for (const [e, v] of found.set) s[e] = v;
  }
  return false;
}
/** Suppose a line or a cross on each open edge in turn; a broken board proves the other. */
function trial(p: LinePuzzle, l: Lattice, s: readonly number[], upTo: number): Result {
  for (let e = 0; e < s.length; e++) {
    if (s[e] !== EMPTY) continue;
    // Edges touching a drawn line first: that is where a person looks.
    if (!l.edges[e].some(v => linesAt(l, s, v) > 0)) continue;
    for (const v of [LINE, CROSS]) { const t = [...s]; t[e] = v; if (!settle(p, t, upTo)) return { cells: [], dots: [...l.edges[e]], set: [[e, v === LINE ? CROSS : LINE]] }; }
  }
  for (let e = 0; e < s.length; e++) {
    if (s[e] !== EMPTY || l.edges[e].some(v => linesAt(l, s, v) > 0)) continue;
    for (const v of [LINE, CROSS]) { const t = [...s]; t[e] = v; if (!settle(p, t, upTo)) return { cells: [], dots: [...l.edges[e]], set: [[e, v === LINE ? CROSS : LINE]] }; }
  }
  return null;
}

export type Step = { technique: Technique } & Found;
export type Grade = { status: 'complete'; ceiling: Technique; steps: Step[]; marks: number[] } | { status: 'stalled'; steps: Step[] };
/** Simplest-first deduction from the clues (and any trusted marks). Finished means one loop that keeps every clue. */
export function grade(p: LinePuzzle, from?: readonly number[], limit = 4000, upTo = techniquesOf(p.kind).length): Grade {
  const l = latticeOf(p), s = from ? [...from] : l.edges.map(() => EMPTY), list = techniquesOf(p.kind).slice(0, upTo), steps: Step[] = [];
  let ceiling = 0;
  for (let n = 0; n < limit; n++) {
    if (oneLoop(l, s) && solved(p, closedUp(s))) return { status: 'complete', ceiling: list[ceiling], steps, marks: closedUp(s) };
    let step: Step | null = null;
    for (const [k, t] of list.entries()) {
      const r = rules[t](p, l, s);
      if (r === BROKEN) return { status: 'stalled', steps };
      if (r) { step = { technique: t, ...r }; ceiling = Math.max(ceiling, k); break; }
    }
    if (!step) return { status: 'stalled', steps };
    for (const [e, v] of step.set) s[e] = v;
    steps.push(step);
  }
  return { status: 'stalled', steps };
}

/** Counts loops up to `cap`, branching on edges at the end of a drawn line after the cheap rules. */
export function search(p: LinePuzzle, cap = 2, budget = 200_000): { status: 'counted'; count: number; first: number[] | null } | { status: 'budget-exhausted'; nodes: number } {
  // Every idea short of a trial is cheap and sound, so the search uses all of them between branches.
  const l = latticeOf(p), fast = rank(p.kind, 'what-if');
  let nodes = 0, count = 0, first: number[] | null = null;
  const walk = (s: number[]): boolean => {
    if (++nodes > budget) return false;
    if (!settle(p, s, fast)) return true;
    // Before branching, every idea including the one-level trials: a board the grader can finish
    // needs no branch at all, and anything else branches only where those ideas run out.
    if (!oneLoop(l, s) && s.includes(EMPTY) && !settle(p, s, techniquesOf(p.kind).length)) return true;
    if (oneLoop(l, s)) { const done = closedUp(s); if (solved(p, done)) { count++; first ??= done; } return true; }
    let e = s.findIndex((m, i) => m === EMPTY && l.edges[i].some(v => linesAt(l, s, v) === 1));
    if (e < 0) e = s.indexOf(EMPTY);
    if (e < 0) return true;
    for (const v of [LINE, CROSS]) { const t = [...s]; t[e] = v; if (!walk(t)) return false; if (count >= cap) return true; }
    return true;
  };
  return walk(l.edges.map(() => EMPTY)) ? { status: 'counted', count, first } : { status: 'budget-exhausted', nodes };
}
const answers = new WeakMap<LinePuzzle, number[] | null>();
export function solutionOf(p: LinePuzzle): number[] | null {
  if (!answers.has(p)) { const r = search(p, 1); answers.set(p, r.status === 'counted' ? r.first : null); }
  return answers.get(p)!;
}

export type Plan =
  | { kind: 'solved' }
  | { kind: 'clash'; cells: number[]; dots: number[]; edges: number[] }
  | { kind: 'mistake'; edge: number }
  | ({ kind: 'place'; technique: Technique } & Found);
/**
 * The next hint for this board. A visible rule break comes first (a branching dot, a broken number
 * or pearl, a closed small loop), then a mark the answer cannot keep, then the next certain line or
 * cross and the simplest idea that proves it.
 */
export function planHint(p: LinePuzzle, marks: readonly number[]): Plan {
  const l = latticeOf(p);
  if (solved(p, marks.map(m => m === CROSS ? EMPTY : m))) return { kind: 'solved' };
  const answer = solutionOf(p);
  const branch = l.around.findIndex((_, v) => linesAt(l, marks, v) > 2);
  if (branch >= 0) return { kind: 'clash', cells: [], dots: [branch], edges: l.around[branch].filter(e => marks[e] === LINE && answer?.[e] !== LINE) };
  const bad = brokenClues(p, marks)[0];
  if (bad !== undefined) {
    const near = p.kind === 'loop' ? l.sides[bad] : [...l.around[bad], ...l.around[bad].flatMap(e => l.around[l.edges[e][0] === bad ? l.edges[e][1] : l.edges[e][0]])];
    return { kind: 'clash', cells: p.kind === 'loop' ? [bad] : [], dots: p.kind === 'loop' ? [] : [bad], edges: [...new Set(near)].filter(e => marks[e] !== EMPTY && answer?.[e] !== marks[e]) };
  }
  if (components(l, marks).cycle) { const wrong = marks.findIndex((m, e) => m === LINE && answer?.[e] !== LINE); if (wrong >= 0) return { kind: 'mistake', edge: wrong }; }
  if (answer) { const wrong = marks.findIndex((m, e) => m !== EMPTY && m !== answer[e]); if (wrong >= 0) return { kind: 'mistake', edge: wrong }; }
  const list = techniquesOf(p.kind);
  for (const t of list) {
    const r = rules[t](p, l, marks);
    if (r === BROKEN) break;
    if (r) return { kind: 'place', technique: t, ...r };
  }
  // Only reachable when the rules cannot read the board; the unique answer still names the next line.
  const e = answer ? answer.findIndex((m, i) => m === LINE && marks[i] !== LINE) : -1;
  return e >= 0 ? { kind: 'place', technique: list.at(-1)!, cells: [], dots: [...l.edges[e]], set: [[e, LINE]] } : { kind: 'solved' };
}
