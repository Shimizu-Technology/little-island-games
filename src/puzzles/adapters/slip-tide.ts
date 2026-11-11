import { dirs, distanceLeft, explore, gridOf, hintMove, homeAll, needsStopper, puzzleTuple, routeSearch, slideOn, tuplePuzzle, validPuzzle, type Crabs, type Dir, type SlipPuzzle } from '../../learn/games/slip-tide/rules';
import { exactKeys, plain, uint } from '../../state/saveBits';
import { smallest, squareSymmetries } from '../semantic';
import { solveExactly } from '../solver';
import type { Claim, DescriptorCore, PuzzleAdapter, SolveResult } from '../types';

/** Pack tuple: [size, rocks, crabs, pools, route]. Cells are one base-62 digit each, row by row; route is U, R, D or L per swipe. */
export type SlipState = { crabs: Crabs };
export type SlipAction = Dir;
type D = DescriptorCore<SlipPuzzle>;

/** Which rungs carry extra proven promises, and how many shortest routes they allow. */
export const rungRules: Record<string, { noDeadEnds: boolean; stopper: boolean; maxShortest: number }> = {
  a: { noDeadEnds: true, stopper: false, maxShortest: 99 },
  b: { noDeadEnds: true, stopper: false, maxShortest: 3 },
  c: { noDeadEnds: true, stopper: false, maxShortest: 4 },
  d: { noDeadEnds: false, stopper: false, maxShortest: 2 },
  e: { noDeadEnds: false, stopper: true, maxShortest: 2 },
  f: { noDeadEnds: false, stopper: true, maxShortest: 2 },
  g: { noDeadEnds: false, stopper: true, maxShortest: 4 },
};

function validCrabs(x: unknown, p: SlipPuzzle): x is Crabs {
  if (!Array.isArray(x) || x.length !== p.crabs.length || !x.every(c => c === -1 || uint(c, p.size * p.size - 1))) return false;
  const live = x.filter(c => c !== -1), grid = gridOf(p);
  return new Set(live).size === live.length && x.every((c, i) => c === -1 || (!grid.rocks[c] && c !== p.pools[i]));
}
const moves = (s: SlipState, d: D) => {
  const grid = gridOf(d.payload);
  return dirs.filter(dir => slideOn(grid, s.crabs, dir) !== s.crabs);
};
const solve = (p: SlipPuzzle, budget: number): SolveResult<Dir> => {
  const grid = gridOf(p);
  return solveExactly<Crabs, Dir>({ start: p.crabs, key: routeKey, moves: s => dirs.filter(dir => slideOn(grid, s, dir) !== s), apply: (s, dir) => slideOn(grid, s, dir), goal: homeAll, nodeBudget: budget }, 'steps');
};
const routeKey = (crabs: Crabs) => crabs.join();
function semantic(p: SlipPuzzle): string {
  return smallest(squareSymmetries(p.size).map(map => {
    const rocks = p.rocks.map(c => map[c]).sort((a, b) => a - b).join();
    const pairs = p.crabs.map((c, i) => `${map[c]}>${map[p.pools[i]]}`).sort().join();
    return `${rocks}/${pairs}`;
  }));
}
/** Replays and fully searches the board, so every shipped entry carries its own proof. */
function claims(d: D, budget: number): Claim[] {
  const p = d.payload, graph = explore(p, budget), rule = rungRules[d.band];
  const stored = [...p.route].reduce<Crabs>((at, letter) => slideOn(gridOf(p), at, 'URDL'.indexOf(letter) as Dir), p.crabs);
  const out: Claim[] = [{ id: 'exhaustive', proven: graph.complete, evidence: `states:${graph.states}` }];
  out.push({ id: 'stored-route', proven: homeAll(stored) && p.route.length === graph.dist, evidence: `${p.route.length}/${graph.dist}` });
  if (rule) {
    out.push({ id: 'few-shortest', proven: graph.complete && graph.shortest >= 1 && graph.shortest <= rule.maxShortest, evidence: `routes:${graph.shortest}` });
    if (rule.noDeadEnds) out.push({ id: 'no-dead-ends', proven: graph.complete && graph.dead === 0, evidence: `dead:${graph.dead}` });
    if (rule.stopper) out.push({ id: 'needs-stopper', proven: needsStopper(p), evidence: 'a crab cannot reach home alone' });
  }
  return out;
}
export const slipTideAdapter: PuzzleAdapter<SlipPuzzle, SlipState, SlipAction> = {
  engine: 'slip-tide', rules: 1, needsCheck: false,
  isPayload: (x): x is SlipPuzzle => plain(x) && exactKeys(x, ['size', 'rocks', 'crabs', 'pools', 'route']) && Array.isArray(x.rocks) && Array.isArray(x.crabs) && Array.isArray(x.pools) && validPuzzle(x as SlipPuzzle),
  isAction: (x): x is SlipAction => x === 0 || x === 1 || x === 2 || x === 3,
  encodePayload: puzzleTuple,
  decodePayload: tuplePuzzle,
  create: d => ({ crabs: d.payload.crabs }),
  validState: (x, d): x is SlipState => plain(x) && exactKeys(x, ['crabs']) && validCrabs(x.crabs, d.payload),
  reduce: (s, a, d) => {
    const crabs = slideOn(gridOf(d.payload), s.crabs, a);
    return crabs === s.crabs ? s : { crabs };
  },
  actions: moves,
  solved: s => homeAll(s.crabs),
  metrics: (_, actions) => ({ steps: actions.length }),
  solve: (d, budget) => solve(d.payload, budget),
  semanticKey: d => semantic(d.payload),
  progress: (s, d) => -distanceLeft(d.payload, s.crabs),
  hint: (s, d) => hintMove(d.payload, s.crabs),
  claims,
};
export { routeSearch };
