import { exactKeys, plain, uint } from '../../state/saveBits';

/**
 * Bridges: islands on a grid, each with the number of bridges it needs. Bridges run straight between
 * two islands that can see each other along a row or column, at most two per pair, never crossing,
 * and every island ends up connected.
 */
export type BridgesPuzzle = { kind: 'bridges'; width: number; height: number; clues: number[] };
export type Island = { cell: number; x: number; y: number; clue: number };
/** A place a bridge could go: two islands that see each other, and the water cells between them. */
export type Link = { a: number; b: number; horizontal: boolean; water: number[] };
export type Shape = { islands: Island[]; links: Link[]; crosses: number[][]; around: number[][]; islandAt: number[] };

export const MIN_SIDE = 3, MAX_SIDE = 15;
const shapes = new WeakMap<BridgesPuzzle, Shape>();
/** Islands, links, which links cross and each island's links. Derived once per puzzle object. */
export function shapeOf(p: BridgesPuzzle): Shape {
  const hit = shapes.get(p);
  if (hit) return hit;
  const { width: w, height: h } = p, islandAt = p.clues.map(() => -1), islands: Island[] = [];
  p.clues.forEach((clue, cell) => { if (clue) { islandAt[cell] = islands.length; islands.push({ cell, x: cell % w, y: Math.floor(cell / w), clue }); } });
  const links: Link[] = [];
  for (const [a, island] of islands.entries()) {
    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      const water: number[] = [];
      for (let x = island.x + dx, y = island.y + dy; x < w && y < h; x += dx, y += dy) {
        const cell = y * w + x;
        if (islandAt[cell] >= 0) { links.push({ a, b: islandAt[cell], horizontal: dx === 1, water }); break; }
        water.push(cell);
      }
    }
  }
  const crosses = links.map(() => [] as number[]);
  links.forEach((l, i) => {
    if (!l.horizontal) return;
    const cells = new Set(l.water);
    links.forEach((m, j) => { if (!m.horizontal && m.water.some(c => cells.has(c))) { crosses[i].push(j); crosses[j].push(i); } });
  });
  const around = islands.map(() => [] as number[]);
  links.forEach((l, i) => { around[l.a].push(i); around[l.b].push(i); });
  const shape = { islands, links, crosses, around, islandAt };
  shapes.set(p, shape);
  return shape;
}
export const other = (l: Link, island: number) => l.a === island ? l.b : l.a;

export function validPuzzle(x: unknown): x is BridgesPuzzle {
  if (!plain(x) || !exactKeys(x, ['kind', 'width', 'height', 'clues']) || x.kind !== 'bridges') return false;
  if (!uint(x.width, MAX_SIDE) || !uint(x.height, MAX_SIDE) || x.width < MIN_SIDE || x.height < MIN_SIDE) return false;
  const clues = x.clues;
  if (!Array.isArray(clues) || clues.length !== x.width * x.height || !clues.every(c => uint(c, 8))) return false;
  const p = x as BridgesPuzzle, { islands, around } = shapeOf(p);
  return islands.length >= 2 && islands.every((s, i) => s.clue <= 2 * around[i].length);
}
/** Pack tuple: [width, height, one character per cell, '.' for water]. */
export const encodePuzzle = (p: BridgesPuzzle): unknown => [p.width, p.height, p.clues.map(c => c ? String(c) : '.').join('')];
export function decodePuzzle(x: unknown): BridgesPuzzle | null {
  if (!Array.isArray(x) || x.length !== 3 || typeof x[2] !== 'string' || !/^[.1-8]*$/.test(x[2])) return null;
  const p = { kind: 'bridges' as const, width: x[0] as number, height: x[1] as number, clues: [...x[2]].map(c => c === '.' ? 0 : Number(c)) };
  return validPuzzle(p) ? p : null;
}

/** Bridges on each link, 0 to 2. */
export type Counts = readonly number[];
export const degree = (p: BridgesPuzzle, counts: Counts, island: number) => shapeOf(p).around[island].reduce((n, l) => n + counts[l], 0);
/** Pairs of links that both carry bridges and cross. */
export function crossings(p: BridgesPuzzle, counts: Counts): [number, number][] {
  const { crosses } = shapeOf(p), out: [number, number][] = [];
  crosses.forEach((list, i) => { if (counts[i]) for (const j of list) if (j > i && counts[j]) out.push([i, j]); });
  return out;
}
/** Island groups joined by the bridges placed so far. */
export function groups(p: BridgesPuzzle, counts: Counts): number[] {
  const { islands, links } = shapeOf(p), group = islands.map((_, i) => i);
  const find = (i: number): number => group[i] === i ? i : (group[i] = find(group[i]));
  links.forEach((l, i) => { if (counts[i]) group[find(l.a)] = find(l.b); });
  return islands.map((_, i) => find(i));
}
export function solved(p: BridgesPuzzle, counts: Counts): boolean {
  const { islands, links } = shapeOf(p);
  if (counts.length !== links.length || counts.some(c => !uint(c, 2))) return false;
  if (islands.some((s, i) => degree(p, counts, i) !== s.clue) || crossings(p, counts).length) return false;
  const g = groups(p, counts);
  return g.every(x => x === g[0]);
}
/** Visible rule breaks: islands with too many bridges, and (never placed by the board) crossing pairs. */
export function overfull(p: BridgesPuzzle, counts: Counts): number[] {
  return shapeOf(p).islands.flatMap((s, i) => degree(p, counts, i) > s.clue ? [i] : []);
}
