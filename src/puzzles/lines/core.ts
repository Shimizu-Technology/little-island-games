import { exactKeys, plain, uint } from '../../state/saveBits';

/**
 * Loop games draw one closed line with no branches and no crossings.
 * - Loop: the line runs along the dots between cells; a number in a cell says how many of its four
 *   sides the line uses.
 * - Pearl Loop: the line runs through cell centres. It must pass through every pearl. On a black
 *   pearl it turns, then goes straight through the next cell on both sides. On a white pearl it goes
 *   straight, and turns in the cell just before or just after (or both).
 */
export type LoopPuzzle = { kind: 'loop'; rows: number; cols: number; clues: number[] };
export type PearlPuzzle = { kind: 'pearl-loop'; rows: number; cols: number; pearls: number[] };
export type LinePuzzle = LoopPuzzle | PearlPuzzle;
export const WHITE = 1, BLACK = 2, NONE = -1;
/** Mark values on the board: unknown, line, or a cross saying "no line here". */
export const EMPTY = 0, LINE = 1, CROSS = 2;

/**
 * The lattice the line lives on. Vertices are dots (Loop) or cell centres (Pearl Loop), numbered
 * row by row on a `vr`×`vc` grid. Edges: all across edges row by row, then all down edges.
 */
export type Lattice = {
  vr: number; vc: number; edges: [number, number][]; around: number[][];
  /** step[v][d]: the edge from v in direction d (0 right, 1 down, 2 left, 3 up), or -1 at the border. */
  step: number[][];
  /** Loop only: each cell's four sides (top, right, bottom, left) and each edge's two cells (-1 is outside). */
  sides: number[][]; faces: [number, number][];
};
const lattices = new Map<string, Lattice>();
export function latticeOf(p: LinePuzzle): Lattice {
  const key = `${p.kind}:${p.rows}:${p.cols}`, hit = lattices.get(key);
  if (hit) return hit;
  const vr = p.kind === 'loop' ? p.rows + 1 : p.rows, vc = p.kind === 'loop' ? p.cols + 1 : p.cols;
  const edges: [number, number][] = [], step = Array.from({ length: vr * vc }, () => [-1, -1, -1, -1]);
  for (let r = 0; r < vr; r++) for (let c = 0; c + 1 < vc; c++) { const v = r * vc + c; step[v][0] = step[v + 1][2] = edges.length; edges.push([v, v + 1]); }
  for (let r = 0; r + 1 < vr; r++) for (let c = 0; c < vc; c++) { const v = r * vc + c; step[v][1] = step[v + vc][3] = edges.length; edges.push([v, v + vc]); }
  const around = step.map(s => s.filter(e => e >= 0));
  const sides: number[][] = [], faces: [number, number][] = edges.map(() => [-1, -1]);
  if (p.kind === 'loop') for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) {
    const v = r * vc + c, cell = r * p.cols + c, four = [step[v][0], step[v + 1][1], step[v + vc][0], step[v][1]];
    sides.push(four);
    four.forEach(e => { const f = faces[e]; if (f[0] < 0) f[0] = cell; else f[1] = cell; });
  }
  const lattice = { vr, vc, edges, around, step, sides, faces };
  lattices.set(key, lattice);
  return lattice;
}
export const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
/** The vertex one step from v in direction d, or -1. */
export const next = (l: Lattice, v: number, d: number) => { const e = l.step[v][d]; return e < 0 ? -1 : l.edges[e][0] === v ? l.edges[e][1] : l.edges[e][0]; };

export const MIN_SIDE = 3, MAX_SIDE = 14;
export function validPuzzle(x: unknown): x is LinePuzzle {
  if (!plain(x) || x.kind !== 'loop' && x.kind !== 'pearl-loop') return false;
  const list = x.kind === 'loop' ? 'clues' : 'pearls';
  if (!exactKeys(x, ['kind', 'rows', 'cols', list]) || !uint(x.rows, MAX_SIDE) || !uint(x.cols, MAX_SIDE) || x.rows < MIN_SIDE || x.cols < MIN_SIDE) return false;
  const values = x[list];
  return Array.isArray(values) && values.length === x.rows * x.cols && values.every(v => Number.isInteger(v) && v >= (x.kind === 'loop' ? NONE : 0) && v <= (x.kind === 'loop' ? 3 : BLACK))
    && (x.kind === 'loop' ? values.some(v => v >= 0) : values.some(v => v > 0));
}
/** Pack tuple: [rows, cols, one character per cell]. Loop uses '.', 0–3; Pearl Loop '.', 'w', 'b'. */
export const encodePuzzle = (p: LinePuzzle): unknown => [p.rows, p.cols, p.kind === 'loop' ? p.clues.map(v => v < 0 ? '.' : String(v)).join('') : p.pearls.map(v => '.wb'[v]).join('')];
export function decodePuzzle(kind: LinePuzzle['kind'], x: unknown): LinePuzzle | null {
  if (!Array.isArray(x) || x.length !== 3 || typeof x[2] !== 'string' || !(kind === 'loop' ? /^[.0-3]*$/ : /^[.wb]*$/).test(x[2])) return null;
  const [rows, cols, text] = x as [number, number, string];
  const p: LinePuzzle = kind === 'loop' ? { kind, rows, cols, clues: [...text].map(c => c === '.' ? NONE : Number(c)) } : { kind, rows, cols, pearls: [...text].map(c => '.wb'.indexOf(c)) };
  return validPuzzle(p) ? p : null;
}

/** Lines at a vertex. */
export const lines = (l: Lattice, marks: readonly number[], v: number) => l.around[v].reduce((n, e) => n + (marks[e] === LINE ? 1 : 0), 0);
/** True when the lines form exactly one closed loop with no branches. */
export function oneLoop(l: Lattice, marks: readonly number[]): boolean {
  const used = marks.flatMap((m, e) => m === LINE ? [e] : []);
  if (used.length < 4) return false;
  for (let v = 0; v < l.around.length; v++) { const n = lines(l, marks, v); if (n !== 0 && n !== 2) return false; }
  // Walk from the first line; a single loop visits every line edge.
  let seen = 0, prev = -1, at = l.edges[used[0]][0];
  const start = at;
  do {
    const e = l.around[at].find(x => marks[x] === LINE && x !== prev)!;
    seen++; prev = e; at = l.edges[e][0] === at ? l.edges[e][1] : l.edges[e][0];
  } while (at !== start && seen <= used.length);
  return seen === used.length;
}
/** The direction a loop through v leaves by, other than `from`, or -1. */
const leaves = (l: Lattice, marks: readonly number[], v: number, from: number) => [0, 1, 2, 3].find(d => d !== from && l.step[v][d] >= 0 && marks[l.step[v][d]] === LINE) ?? -1;
/** Does the line go straight through v (needs both lines present)? */
export const straightAt = (l: Lattice, marks: readonly number[], v: number) => {
  const ds = [0, 1, 2, 3].filter(d => l.step[v][d] >= 0 && marks[l.step[v][d]] === LINE);
  return ds.length === 2 && ds[1] - ds[0] === 2;
};
/** Clue numbers or pearls the drawn lines break, as cell indexes. Usable mid-solve: only certain breaks. */
export function brokenClues(p: LinePuzzle, marks: readonly number[]): number[] {
  const l = latticeOf(p);
  if (p.kind === 'loop') return p.clues.flatMap((n, cell) => {
    if (n < 0) return [];
    const four = l.sides[cell], on = four.filter(e => marks[e] === LINE).length, off = four.filter(e => marks[e] === CROSS).length;
    return on > n || 4 - off < n ? [cell] : [];
  });
  return p.pearls.flatMap((kind, v) => {
    if (!kind) return [];
    const ds = [0, 1, 2, 3].filter(d => l.step[v][d] >= 0 && marks[l.step[v][d]] === LINE);
    if (ds.length < 2) return [];
    const turn = ds[1] - ds[0] !== 2;
    if (kind === BLACK) {
      if (!turn) return [v];
      // Each leg must continue straight through the next cell once that cell's line is drawn.
      return ds.some(d => { const u = next(l, v, d); return lines(l, marks, u) === 2 && leaves(l, marks, u, (d + 2) % 4) !== d; }) ? [v] : [];
    }
    if (turn) return [v];
    const ends = ds.map(d => next(l, v, d));
    return ends.every(u => lines(l, marks, u) === 2 && straightAt(l, marks, u)) ? [v] : [];
  });
}
export function solved(p: LinePuzzle, marks: readonly number[]): boolean {
  const l = latticeOf(p);
  if (marks.length !== l.edges.length || !oneLoop(l, marks) || brokenClues(p, marks).length) return false;
  if (p.kind === 'loop') return p.clues.every((n, cell) => n < 0 || l.sides[cell].filter(e => marks[e] === LINE).length === n);
  return p.pearls.every((kind, v) => !kind || lines(l, marks, v) === 2);
}
