/** Hints for the cards board. The cards board can do only five things: tap a card to add it at the end, remove a top-level block,
 * change a block to another of its kind (a Repeat's count too), and wrap the whole plan in a Repeat. A hint here names one of those and
 * nothing else, so every hint can be tapped. The block editor's own hints (distance.ts) can place a block anywhere; these cannot. */
import type { Block, Task } from './engine';
import { blockCost } from './dsl';
import { blockLabel } from './labels';
import { programIssue, solves } from './engine';

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
export function cardsMoves(program: readonly Block[], only?: readonly Block[], counts: readonly number[] = COUNTS): CardsOp[] {
  const offered = only ?? primitives();
  const moves: CardsOp[] = offered.map(block => ({ op: 'add', block }));
  program.forEach((block, index) => moves.push({ op: 'remove', index, block }));
  const nested = (list: readonly Block[], prefix: number[]) => list.forEach((block, i) => {
    const path = [...prefix, i];
    if (block.kind === 'repeat') { for (const to of counts) if (to !== block.times) moves.push({ op: 'count', path, from: block.times, to }); nested(block.body, path); }
    else for (const to of offered) if (sameKind(block, to) && JSON.stringify(block) !== JSON.stringify(to)) moves.push({ op: 'change', path, from: block, to });
  });
  nested(program, []);
  if (program.length) for (const times of counts) moves.push({ op: 'wrap', times });
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
type Loop = Extract<Block, { kind: 'repeat' }>;
/** A picture that is one Repeat around plain blocks: every Level 3 picture. */
const loopOf = (target: readonly Block[]): Loop | null => target.length === 1 && target[0].kind === 'repeat' && target[0].body.every(b => b.kind !== 'repeat') ? target[0] : null;
/** Single-loop pictures, in straight lines with no search: clear what does not belong, build the body flat, then wrap it.
 * A crowded or tangled plan costs the same few steps as an empty one, and every action is one the board offers. */
function loopPlan(program: readonly Block[], loop: Loop): CardsOp | null {
  const k = program.findIndex(b => b.kind === 'repeat');
  if (k < 0) return flatPlan(program, loop.body) ?? { op: 'wrap', times: loop.times };
  const mine = program[k] as Loop;
  // Blocks inside a Repeat can only change value, so a Repeat whose body has other kinds in other places goes (✕ beside it).
  if (mine.body.length !== loop.body.length || mine.body.some((b, i) => !sameKind(b, loop.body[i]))) return { op: 'remove', index: k, block: mine };
  if (program.length > 1) { const index = program.findIndex((_, i) => i !== k); return { op: 'remove', index, block: program[index] }; }
  const i = mine.body.findIndex((b, j) => !same([b], [loop.body[j]]));
  if (i >= 0) return { op: 'change', path: [0, i], from: mine.body[i], to: loop.body[i] };
  return mine.times !== loop.times ? { op: 'count', path: [0], from: mine.times, to: loop.times } : null;
}
/** Other shapes: the fewest actions to any plan that solves the task, by breadth-first search over the cards board's own actions. */
function searchPlan(task: Task, program: readonly Block[]): CardsOp | null {
  // Only blocks and counts the picture itself uses are worth suggesting, never the child's own extras.
  const useful: Block[] = [], counts: number[] = [];
  const gather = (l: readonly Block[]) => l.forEach(b => { if (b.kind === 'repeat') { if (!counts.includes(b.times)) counts.push(b.times); gather(b.body); } else if (!useful.some(u => same([u], [b]))) useful.push(b); });
  gather(task.target);
  const queue: { plan: Block[]; first: CardsOp | null }[] = [{ plan: clone(program) as Block[], first: null }], seen = new Set([JSON.stringify(program)]);
  for (let head = 0; head < queue.length && queue.length < 8000; head++) {
    const { plan, first } = queue[head];
    if (first && solves(task, plan)) return first;
    for (const move of cardsMoves(plan, useful, counts)) {
      const next = applyCardsOp(plan, move), key = JSON.stringify(next);
      // programIssue also covers a wrap that nests too deep or runs past the command cap.
      if (seen.has(key) || blockCost(next) > task.limit || programIssue(next)) continue;
      seen.add(key); queue.push({ plan: next, first: first ?? move });
    }
  }
  // No short way found: still name one tap toward the picture — clear a block it never uses, else the last block.
  if (!program.length) return useful.length ? { op: 'add', block: useful[0] } : null;
  const unused = program.findIndex(b => b.kind !== 'repeat' && !useful.some(u => same([u], [b]))), index = unused < 0 ? program.length - 1 : unused;
  return { op: 'remove', index, block: program[index] };
}
/** The next cards-board action toward the picture, or null when the plan already solves it. */
export function cardsHint(task: Task, program: readonly Block[]): CardsOp | null {
  if (solves(task, program as Block[])) return null;
  if (!hasRepeat(task.target) && !hasRepeat(program)) return flatPlan(program, task.target);
  const loop = loopOf(task.target);
  if (loop) return loopPlan(program, loop);
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
