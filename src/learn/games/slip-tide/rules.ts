import { createSearch, type SearchStatus } from '../../../puzzles/solver';

/** Pure Slip Tide rules. One swipe slides every crab until something stops it; hints, solver and play all call `slide`. */
export type Dir = 0 | 1 | 2 | 3;
export const DIRS = 'URDL';
export const HOME = -1;
export const dirs: readonly Dir[] = [0, 1, 2, 3];
const steps: readonly (readonly [number, number])[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const MAX_SIZE = 7;
export const MAX_CRABS = 4;
export const MAX_ROUTE = 72;

/** Cells count row by row. `crabs[i]` heads for `pools[i]`. `route` is one certified shortest answer, as swipes. */
export type SlipPuzzle = { size: number; rocks: readonly number[]; crabs: readonly number[]; pools: readonly number[]; route: string };
export type Crabs = readonly number[];

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const cellsText = (cells: readonly number[]) => cells.map(c => alphabet[c]).join('');
const cellsOf = (text: unknown): number[] | null => (typeof text === 'string' && [...text].every(ch => alphabet.includes(ch)) ? [...text].map(ch => alphabet.indexOf(ch)) : null);

export const puzzleTuple = (p: SlipPuzzle) => [p.size, cellsText(p.rocks), cellsText(p.crabs), cellsText(p.pools), p.route];
const distinct = (a: readonly number[]) => new Set(a).size === a.length;
export function validPuzzle(p: SlipPuzzle): boolean {
  const n = p.size * p.size, cells = [...p.rocks, ...p.crabs, ...p.pools];
  return Number.isInteger(p.size) && p.size >= 3 && p.size <= MAX_SIZE && p.crabs.length >= 1 && p.crabs.length <= MAX_CRABS && p.crabs.length === p.pools.length
    && p.rocks.length < n && cells.every(c => Number.isInteger(c) && c >= 0 && c < n) && distinct(cells)
    && typeof p.route === 'string' && p.route.length <= MAX_ROUTE && /^[URDL]*$/.test(p.route);
}
export function tuplePuzzle(x: unknown): SlipPuzzle | null {
  if (!Array.isArray(x) || x.length !== 5 || !Number.isInteger(x[0]) || typeof x[4] !== 'string') return null;
  const rocks = cellsOf(x[1]), crabs = cellsOf(x[2]), pools = cellsOf(x[3]);
  if (!rocks || !crabs || !pools) return null;
  const p = { size: x[0] as number, rocks, crabs, pools, route: x[4] };
  return validPuzzle(p) ? p : null;
}
export const dirOf = (letter: string) => DIRS.indexOf(letter) as Dir;
export const homeAll = (crabs: Crabs) => crabs.every(c => c === HOME);
export const remaining = (crabs: Crabs) => crabs.filter(c => c !== HOME).length;
const rockSet = (p: SlipPuzzle) => {
  const rocks = new Uint8Array(p.size * p.size);
  p.rocks.forEach(c => { rocks[c] = 1; });
  return rocks;
};

/** Packed rock lookup so searches do not rebuild a set per slide. */
export type Grid = { size: number; rocks: Uint8Array; pools: readonly number[] };
export const gridOf = (p: SlipPuzzle): Grid => ({ size: p.size, rocks: rockSet(p), pools: p.pools });

/** Lead crab first, so a crab that goes home vacates its line for the crabs behind it. Returns the same array when nothing moves. */
export function slideOn(g: Grid, crabs: Crabs, d: Dir): Crabs {
  const [dx, dy] = steps[d], n = g.size, length = crabs.length;
  const order = [0, 1, 2, 3].slice(0, length).filter(i => crabs[i] !== HOME)
    .sort((a, b) => dx * (crabs[b] % n - crabs[a] % n) + dy * (Math.floor(crabs[b] / n) - Math.floor(crabs[a] / n)));
  const next = crabs.slice();
  let moved = false;
  for (const i of order) {
    let x = next[i] % n, y = Math.floor(next[i] / n), cell = next[i];
    for (;;) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) break;
      const to = ny * n + nx;
      if (g.rocks[to] || next.includes(to)) break;
      moved = true;
      if (g.pools[i] === to) { cell = HOME; break; }
      x = nx; y = ny; cell = to;
    }
    if (cell !== next[i]) { moved = true; next[i] = cell; }
  }
  return moved ? next : crabs;
}
export const slide = (p: SlipPuzzle, crabs: Crabs, d: Dir) => slideOn(gridOf(p), crabs, d);
/** Base 50 fits every cell plus "home" on a 7x7 board, up to four crabs, inside a safe integer. */
export const crabsKey = (crabs: Crabs) => crabs.reduce((key, c, i) => key + (c + 1) * 50 ** i, 0);

/** Sliced shortest-route search for one starting position. Use the raw search on device so hints stay under a frame. */
export function routeSearch(p: SlipPuzzle, from: Crabs, nodeBudget: number) {
  const g = gridOf(p);
  return createSearch<Crabs, Dir>({ start: from, key: crabsKey, nodeBudget, goal: homeAll, moves: s => dirs.filter(d => slideOn(g, s, d) !== s), apply: (s, d) => slideOn(g, s, d) });
}
export type RouteResult = SearchStatus<Dir>;
/** The next correct swipe from any position: the stored route while the child is on it, otherwise an exact search. */
export function nextOnRoute(p: SlipPuzzle, from: Crabs): Dir | null {
  const g = gridOf(p);
  let at: Crabs = p.crabs;
  for (const letter of p.route) {
    if (crabsKey(at) === crabsKey(from)) return dirOf(letter);
    at = slideOn(g, at, dirOf(letter));
  }
  return null;
}
/** Exact, may take a while on a large board: device callers should slice with `routeSearch`. */
export function shortestRoute(p: SlipPuzzle, from: Crabs, budget = 200_000): { status: 'solved'; route: Dir[] } | { status: 'stuck' } | { status: 'budget' } {
  const r = routeSearch(p, from, budget).run();
  return r.status === 'solved' ? { status: 'solved', route: r.witness } : r.status === 'unsolved' ? { status: 'stuck' } : { status: 'budget' };
}
export const hintMove = (p: SlipPuzzle, from: Crabs): Dir | null => {
  const onRoute = nextOnRoute(p, from);
  if (onRoute !== null) return onRoute;
  const found = shortestRoute(p, from);
  return found.status === 'solved' ? found.route[0] ?? null : null;
};
/** Whole reachable game graph with distances to the goal: the exhaustive search every bank entry must pass. */
export type Explored = { complete: boolean; states: number; dist: number; shortest: number; dead: number };
export function explore(p: SlipPuzzle, stateCap = 200_000, from: Crabs = p.crabs): Explored {
  const g = gridOf(p), index = new Map<number, number>(), list: Crabs[] = [from], edges: number[][] = [];
  index.set(crabsKey(from), 0);
  for (let i = 0; i < list.length; i++) {
    if (list.length > stateCap) return { complete: false, states: list.length, dist: -1, shortest: 0, dead: 0 };
    const s = list[i], out: number[] = [];
    if (!homeAll(s)) for (const d of dirs) {
      const t = slideOn(g, s, d);
      if (t === s) continue;
      const key = crabsKey(t);
      let j = index.get(key);
      if (j === undefined) { j = list.length; index.set(key, j); list.push(t); }
      out.push(j);
    }
    edges.push(out);
  }
  const dist = new Int32Array(list.length).fill(-1), back: number[][] = list.map(() => []), queue: number[] = [];
  edges.forEach((out, i) => out.forEach(j => back[j].push(i)));
  list.forEach((s, i) => { if (homeAll(s)) { dist[i] = 0; queue.push(i); } });
  for (let head = 0; head < queue.length; head++) for (const i of back[queue[head]]) if (dist[i] < 0) { dist[i] = dist[queue[head]] + 1; queue.push(i); }
  let dead = 0;
  for (let i = 0; i < list.length; i++) if (dist[i] < 0) dead++;
  // Each state is seen once, in increasing distance, so one pass counts every shortest route.
  const ways = new Float64Array(list.length);
  queue.forEach(i => {
    ways[i] = dist[i] === 0 ? 1 : edges[i].reduce((n, j) => n + (dist[j] === dist[i] - 1 ? ways[j] : 0), 0);
  });
  return { complete: true, states: list.length, dist: dist[0], shortest: dist[0] >= 0 ? ways[0] : 0, dead };
}
/** Can this one crab get home with every other crab taken off the board? */
export function canGoAlone(p: SlipPuzzle, crab: number): boolean {
  const alone = { ...p, crabs: [p.crabs[crab]], pools: [p.pools[crab]], route: '' };
  return routeSearch(alone, alone.crabs, 200_000).run().status === 'solved';
}
export const needsStopper = (p: SlipPuzzle) => p.crabs.some((_, i) => !canGoAlone(p, i));
/** The straight distance left. Public information, used only by the greedy test bot. */
export const distanceLeft = (p: SlipPuzzle, crabs: Crabs) => crabs.reduce((sum, c, i) => {
  if (c === HOME) return sum;
  const n = p.size, goal = p.pools[i];
  return sum + Math.abs(c % n - goal % n) + Math.abs(Math.floor(c / n) - Math.floor(goal / n));
}, 0);

/** The rest of the stored route when the child is on it. Off the route this is null and a search must take over. */
export function storedRouteFrom(p: SlipPuzzle, from: Crabs): Dir[] | null {
  const g = gridOf(p), route = [...p.route].map(dirOf);
  let at: Crabs = p.crabs;
  for (let i = 0; i <= route.length; i++) {
    if (crabsKey(at) === crabsKey(from)) return route.slice(i);
    if (i < route.length) at = slideOn(g, at, route[i]);
  }
  return null;
}
/** What the ladder points at: the first crab home on this route, and where the next swipe leaves it. */
export type HintFocus = { crab: number; stop: number; blocker: { cell: number; kind: 'rock' | 'crab' } | null; pool: number };
export function hintFocus(p: SlipPuzzle, from: Crabs, route: readonly Dir[]): HintFocus | null {
  if (!route.length) return null;
  const g = gridOf(p);
  let at = from, crab = -1;
  for (const d of route) {
    const next = slideOn(g, at, d);
    crab = next.findIndex((c, i) => c === HOME && at[i] !== HOME);
    if (crab >= 0) break;
    at = next;
  }
  if (crab < 0) crab = from.findIndex(c => c !== HOME);
  if (crab < 0) return null;
  const d = route[0], next = slideOn(g, from, d), stop = next[crab] === HOME ? p.pools[crab] : next[crab], [dx, dy] = steps[d], n = p.size;
  let blocker: HintFocus['blocker'] = null;
  if (next[crab] !== HOME) {
    const x = stop % n + dx, y = Math.floor(stop / n) + dy;
    if (x >= 0 && y >= 0 && x < n && y < n) {
      const cell = y * n + x;
      if (g.rocks[cell]) blocker = { cell, kind: 'rock' };
      else if (next.includes(cell)) blocker = { cell, kind: 'crab' };
    }
  }
  return { crab, stop, blocker, pool: p.pools[crab] };
}
/** Water shading for the board. Row and column both count, so odd-sized boards still make a checkerboard. */
export const lightTile = (cell: number, size: number) => (cell % size + Math.floor(cell / size)) % 2 === 0;
