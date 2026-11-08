import { directions, mazeDone, mazeMove, mazeRoute, type MazeState } from '../../games/maze';
import { defaultOptions } from '../../games/types';
import { exactKeys, plain, uint } from '../../state/saveBits';
import { ATTEMPT_LIMITS } from '../attempt';
import { smallest, squareSymmetries } from '../semantic';
import { solveExactly } from '../solver';
import type { Claim, DescriptorCore, PuzzleAdapter } from '../types';

/** Pack tuple: [size, walls as one hex digit per cell]. Wall bits are the engine's north 1, east 2, south 4, west 8. */
export type MazePayload = { size: number; walls: number[] };
export type MazeAction = number; // next cell index, as the engine takes it
type D = DescriptorCore<MazePayload>;

function closedBoard(walls: readonly number[], size: number) {
  return walls.every((w, cell) => directions.every(d => {
    const r = Math.floor(cell / size) + d.dr, c = (cell % size) + d.dc;
    if (r < 0 || r >= size || c < 0 || c >= size) return !!(w & d.bit);
    return !!(w & d.bit) === !!(walls[r * size + c] & d.opposite);
  }));
}
const openEdges = (walls: readonly number[], size: number, map: readonly number[]) => {
  const edges: string[] = [];
  walls.forEach((w, cell) => {
    if (!(w & 2) && (cell + 1) % size) edges.push([map[cell], map[cell + 1]].sort((a, b) => a - b).join('-'));
    if (!(w & 4) && cell + size < walls.length) edges.push([map[cell], map[cell + size]].sort((a, b) => a - b).join('-'));
  });
  return edges.sort().join();
};
const head = (s: MazeState) => s.path[s.path.length - 1];
const neighbours = (s: MazeState) => directions.flatMap(d => {
  const cell = head(s), r = Math.floor(cell / s.size) + d.dr, c = (cell % s.size) + d.dc;
  return !(s.walls[cell] & d.bit) && r >= 0 && r < s.size && c >= 0 && c < s.size ? [r * s.size + c] : [];
});
/** Each step must be one the engine could have made: open, adjacent, and not a retrace, which it undoes instead. */
function legalPath(path: unknown, walls: readonly number[], size: number): boolean {
  if (!Array.isArray(path) || !path.length || path.length > ATTEMPT_LIMITS.events + 1 || path[0] !== 0) return false;
  return path.every((cell, i) => {
    if (!uint(cell, size * size - 1) || cell === size * size - 1 && i !== path.length - 1) return false;
    if (!i) return true;
    const from = path[i - 1] as number, dir = directions.find(d => d.dr === Math.floor(cell / size) - Math.floor(from / size) && d.dc === (cell % size) - (from % size));
    return !!dir && !(walls[from] & dir.bit) && (i < 2 || path[i - 2] !== cell);
  });
}
const create = (d: D): MazeState => ({ game: 'maze', id: 'bank', options: defaultOptions, size: d.payload.size, walls: d.payload.walls, path: [0], seed: d.seed });

export const mazeAdapter: PuzzleAdapter<MazePayload, MazeState, MazeAction> = {
  engine: 'maze', rules: 1, needsCheck: false,
  isPayload: (x): x is MazePayload => {
    const p = x as MazePayload;
    return !!p && Number.isInteger(p.size) && p.size >= 3 && p.size <= 15 && Array.isArray(p.walls) && p.walls.length === p.size * p.size
      && p.walls.every(w => Number.isInteger(w) && w >= 0 && w <= 15) && closedBoard(p.walls, p.size);
  },
  isAction: (x): x is MazeAction => Number.isInteger(x),
  encodePayload: p => [p.size, p.walls.map(w => w.toString(16)).join('')],
  decodePayload: x => {
    if (!Array.isArray(x) || x.length !== 2 || !Number.isInteger(x[0]) || typeof x[1] !== 'string' || !/^[0-9a-f]+$/.test(x[1])) return null;
    return { size: x[0], walls: Array.from(x[1], c => parseInt(c, 16)) };
  },
  create,
  validState: (x, d): x is MazeState => plain(x) && exactKeys(x, ['game', 'id', 'options', 'size', 'walls', 'path', 'seed']) && x.game === 'maze' && x.id === 'bank' && x.seed === d.seed
    && x.size === d.payload.size && JSON.stringify(x.options) === JSON.stringify(defaultOptions) && JSON.stringify(x.walls) === JSON.stringify(d.payload.walls) && legalPath(x.path, d.payload.walls, d.payload.size),
  reduce: (s, a) => mazeMove(s, a),
  actions: s => (mazeDone(s) ? [] : neighbours(s)),
  solved: s => mazeDone(s),
  metrics: (_, actions) => ({ steps: actions.length }),
  solve: (d, budget) => solveExactly<MazeState, MazeAction>({ start: create(d), key: head, moves: neighbours, apply: mazeMove, goal: mazeDone, nodeBudget: budget }, 'steps'),
  semanticKey: d => `${d.payload.size}:${smallest([0, 2, 6, 7].map(i => openEdges(d.payload.walls, d.payload.size, squareSymmetries(d.payload.size)[i])))}`,
  progress: s => {
    const cell = head(s), goal = s.size * s.size - 1;
    return -(Math.abs(Math.floor(cell / s.size) - Math.floor(goal / s.size)) + Math.abs((cell % s.size) - (goal % s.size)));
  },
  hint: s => mazeRoute(s)[1] ?? null,
  claims: (d): Claim[] => {
    // A puzzle whose walls change nothing is just a corridor with decoration.
    const s = create(d), route = mazeRoute(s), base = route.length;
    for (const cell of route) for (const dir of directions) {
      const r = Math.floor(cell / d.payload.size) + dir.dr, c = (cell % d.payload.size) + dir.dc;
      if (!(d.payload.walls[cell] & dir.bit) || r < 0 || r >= d.payload.size || c < 0 || c >= d.payload.size) continue;
      const next = r * d.payload.size + c, walls = [...d.payload.walls];
      walls[cell] &= ~dir.bit;
      walls[next] &= ~dir.opposite;
      const shorter = mazeRoute({ ...s, walls }).length;
      if (shorter < base) return [{ id: 'wall-matters', proven: true, evidence: `${cell}-${next}:${base}>${shorter}` }];
    }
    return [{ id: 'wall-matters', proven: false, evidence: 'no single wall changes the shortest route' }];
  },
};
