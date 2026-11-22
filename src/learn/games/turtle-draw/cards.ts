/** Hints for the cards board. The cards board can do only five things: tap a card to add it at the end, remove a top-level block,
 * change a block to another of its kind (a Repeat's count too), and wrap the whole plan in a Repeat. A hint here names one of those and
 * nothing else, so every hint can be tapped. The block editor's own hints (distance.ts) can place a block anywhere; these cannot. */
import type { Block, Task } from './engine';
import { blockCost } from './dsl';
import { blockLabel } from './labels';
import { solves } from './engine';

export const FORWARDS = [60, 70, 80, 90, 100] as const, TURNS = [45, 60, 90, 120] as const, PENS = ['coral', 'teal', 'gold'] as const, COUNTS = [2, 3, 4, 6, 8] as const;
export type CardsOp =
  | { op: 'add'; block: Block }
  | { op: 'remove'; index: number; block: Block }
  | { op: 'change'; path: number[]; from: Block; to: Block }
  | { op: 'count'; path: number[]; from: number; to: number }
  | { op: 'wrap'; times: number };
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const at = (list: Block[], path: number[]): { list: Block[]; i: number } => { let l = list; for (const k of path.slice(0, -1)) l = (l[k] as Extract<Block, { kind: 'repeat' }>).body; return { list: l, i: path[path.length - 1] }; };
/** The one place a cards-board action changes a plan. The board's buttons and the hints both call it. */
export function applyCardsOp(program: readonly Block[], op: CardsOp): Block[] {
  const out = clone(program) as Block[];
  if (op.op === 'add') out.push(clone(op.block));
  else if (op.op === 'remove') out.splice(op.index, 1);
  else if (op.op === 'wrap') return [{ kind: 'repeat', times: op.times, body: out }];
  else { const { list, i } = at(out, op.path); if (op.op === 'change') list[i] = clone(op.to); else (list[i] as Extract<Block, { kind: 'repeat' }>).times = op.to; }
  return out;
}
const sameKind = (a: Block, b: Block) => a.kind === b.kind;
const primitives = (): Block[] => [...FORWARDS.map(n => ({ kind: 'forward', n }) as Block), ...TURNS.map(angle => ({ kind: 'turn', angle }) as Block), ...PENS.map(color => ({ kind: 'color', color }) as Block)];
/** Every cards-board action from here. */
export function cardsMoves(program: readonly Block[], only?: readonly Block[]): CardsOp[] {
  const offered = only ?? primitives();
  const moves: CardsOp[] = offered.map(block => ({ op: 'add', block }));
  program.forEach((block, index) => moves.push({ op: 'remove', index, block }));
  const nested = (list: readonly Block[], prefix: number[]) => list.forEach((block, i) => {
    const path = [...prefix, i];
    if (block.kind === 'repeat') { for (const to of COUNTS) if (to !== block.times) moves.push({ op: 'count', path, from: block.times, to }); nested(block.body, path); }
    else for (const to of offered) if (sameKind(block, to) && JSON.stringify(block) !== JSON.stringify(to)) moves.push({ op: 'change', path, from: block, to });
  });
  nested(program, []);
  if (program.length) for (const times of COUNTS) moves.push({ op: 'wrap', times });
  return moves;
}
const same = (a: readonly Block[], b: readonly Block[]) => JSON.stringify(a) === JSON.stringify(b);
const hasRepeat = (list: readonly Block[]): boolean => list.some(b => b.kind === 'repeat');
/** Flat plans: keep some blocks in order, change some to another of their kind, drop the rest, then add the missing ones at the end. */
function flatPlan(program: readonly Block[], target: readonly Block[]): CardsOp | null {
  const n = program.length, m = target.length, INF = 1e9;
  // cost[i][j]: fewest actions after looking at the first i blocks of the plan having made the first j blocks of the target.
  const cost = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(INF)), from = Array.from({ length: n + 1 }, () => Array<'drop' | 'keep' | null>(m + 1).fill(null));
  cost[0][0] = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j <= m; j++) {
    if (cost[i][j] >= INF) continue;
    if (cost[i][j] + 1 < cost[i + 1][j]) { cost[i + 1][j] = cost[i][j] + 1; from[i + 1][j] = 'drop'; }
    if (j < m && sameKind(program[i], target[j])) { const c = cost[i][j] + (same([program[i]], [target[j]]) ? 0 : 1); if (c < cost[i + 1][j + 1]) { cost[i + 1][j + 1] = c; from[i + 1][j + 1] = 'keep'; } }
  }
  let best = 0;
  for (let j = 0; j <= m; j++) if (cost[n][j] + (m - j) < cost[n][best] + (m - best)) best = j;
  const steps: ('drop' | 'keep')[] = [], map: number[] = [];
  for (let i = n, j = best; i > 0; i--) { const step = from[i][j]!; steps.unshift(step); if (step === 'keep') { map.unshift(j - 1); j--; } else map.unshift(-1); }
  for (let i = 0; i < n; i++) {
    if (steps[i] === 'drop') return { op: 'remove', index: i, block: program[i] };
    if (!same([program[i]], [target[map[i]]])) return { op: 'change', path: [i], from: program[i], to: target[map[i]] };
  }
  return best < m ? { op: 'add', block: target[best] } : null;
}
/** Loops: the fewest actions to any plan that solves the task, by breadth-first search over the cards board's own actions. */
function searchPlan(task: Task, program: readonly Block[]): CardsOp | null {
  // Only blocks the picture uses are worth suggesting.
  const useful: Block[] = []; const gather = (l: readonly Block[]) => l.forEach(b => { if (b.kind === 'repeat') gather(b.body); else if (!useful.some(u => same([u], [b]))) useful.push(b); }); gather(task.target); gather(program);
  const queue: { plan: Block[]; first: CardsOp | null }[] = [{ plan: clone(program) as Block[], first: null }], seen = new Set([JSON.stringify(program)]);
  for (let head = 0; head < queue.length && queue.length < 60000; head++) {
    const { plan, first } = queue[head];
    if (first && solves(task, plan)) return first;
    for (const move of cardsMoves(plan, useful)) {
      const next = applyCardsOp(plan, move), key = JSON.stringify(next);
      if (seen.has(key) || blockCost(next) > task.limit || next.length > 30) continue;
      seen.add(key); queue.push({ plan: next, first: first ?? move });
    }
  }
  return null;
}
/** The next cards-board action toward the picture, or null when the plan already solves it or no short way is found. */
export function cardsHint(task: Task, program: readonly Block[]): CardsOp | null {
  if (solves(task, program as Block[])) return null;
  if (!hasRepeat(task.target) && !hasRepeat(program)) return flatPlan(program, task.target);
  return task.limit <= 5 ? searchPlan(task, program) : null;
}
const where = (path: readonly number[]) => path.map(i => i + 1).join('.');
export function cardsText(op: CardsOp): string {
  if (op.op === 'add') return `Tap ${blockLabel(op.block)} to add it at the end.`;
  if (op.op === 'remove') return `Tap ✕ beside block ${op.index + 1} (${blockLabel(op.block)}) to remove it.`;
  if (op.op === 'change') return `Tap block ${where(op.path)} (${blockLabel(op.from)}), then choose ${blockLabel(op.to)}.`;
  if (op.op === 'count') return `Tap block ${where(op.path)} (Repeat ×${op.from}), then choose ×${op.to}.`;
  return `Tap Repeat ×${op.times} under "Wrap plan" to loop your blocks.`;
}
