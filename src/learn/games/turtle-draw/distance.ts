/** The hint engine: the fewest editor actions from a child's program to a certified one, and the first of them.
 * The same pure code serves the School board, Deep Water and the tests, so a hint can never name an edit the editor cannot make. */
import type { Block } from './engine';
import { blockCost } from './dsl';
import { blockLabel } from './labels';
export type Edit =
  | { op: 'change'; path: number[]; from: Block; to: Block }
  | { op: 'count'; path: number[]; from: number; to: number }
  | { op: 'remove'; path: number[]; from: Block }
  | { op: 'insert'; path: number[]; block: Block };
type Alignment = { cost: number; edits: Edit[] };
const same = (a: Block, b: Block) => JSON.stringify(a) === JSON.stringify(b);
const shell = (b: Block): Block => b.kind === 'repeat' ? { ...b, body: [] } : b;
/** Cost of putting node `a` in the place of `b`, or null when the editor would delete and add instead. */
function substitute(a: Block, b: Block, prefix: number[], index: number): Alignment | null {
  if (a.kind === 'repeat' && b.kind === 'repeat') {
    const inner = align(a.body, b.body, [...prefix, index]);
    return { cost: (a.times === b.times ? 0 : 1) + inner.cost, edits: [...(a.times === b.times ? [] : [{ op: 'count', path: [...prefix, index], from: a.times, to: b.times } as Edit]), ...inner.edits] };
  }
  if (a.kind === 'repeat' || b.kind === 'repeat') return null;
  return same(a, b) ? { cost: 0, edits: [] } : { cost: 1, edits: [{ op: 'change', path: [...prefix, index], from: a, to: b }] };
}
export function align(a: readonly Block[], b: readonly Block[], prefix: number[] = []): Alignment {
  const memo = new Map<string, Alignment>();
  // `at` is the position in the child's list, which grows as inserts are applied left to right.
  const go = (i: number, j: number, at: number): Alignment => {
    const key = `${i}/${j}/${at}`, cached = memo.get(key);
    if (cached) return cached;
    let best: Alignment;
    if (i === a.length && j === b.length) best = { cost: 0, edits: [] };
    else {
      const options: Alignment[] = [];
      if (i < a.length && j < b.length) {
        const match = substitute(a[i], b[j], prefix, at);
        if (match) { const rest = go(i + 1, j + 1, at + 1); options.push({ cost: match.cost + rest.cost, edits: [...match.edits, ...rest.edits] }); }
      }
      if (i < a.length) { const rest = go(i + 1, j, at); options.push({ cost: 1 + rest.cost, edits: [{ op: 'remove', path: [...prefix, at], from: a[i] }, ...rest.edits] }); }
      if (j < b.length) {
        const rest = go(i, j + 1, at + 1), inner = b[j].kind === 'repeat' ? align([], (b[j] as Extract<Block, { kind: 'repeat' }>).body, [...prefix, at]) : { cost: 0, edits: [] as Edit[] };
        options.push({ cost: 1 + inner.cost + rest.cost, edits: [{ op: 'insert', path: [...prefix, at], block: shell(b[j]) }, ...inner.edits, ...rest.edits] });
      }
      best = options.reduce((x, y) => y.cost < x.cost ? y : x);
    }
    memo.set(key, best);
    return best;
  };
  return go(0, 0, 0);
}
/** The nearest of several equally good certified programs, and its first edit. Null when the program already matches one. */
export function nearestEdit(program: readonly Block[], winners: readonly (readonly Block[])[], options: { full?: boolean } = {}): { edit: Edit; distance: number; winner: readonly Block[] } | null {
  let best: { alignment: Alignment; winner: readonly Block[] } | null = null;
  for (const winner of winners) {
    const alignment = align(program, winner);
    if (!best || alignment.cost < best.alignment.cost) best = { alignment, winner };
  }
  if (!best || best.alignment.cost === 0) return null;
  const edits = best.alignment.edits;
  let edit = edits[0];
  // A full tray refuses any insert, so name the first edit that makes room instead (with its place worked out as if the inserts before it had not happened).
  if (options.full && edit.op === 'insert') {
    const later = edits.findIndex(e => e.op !== 'insert');
    if (later > 0) {
      const skipped = edits.slice(0, later);
      const path = [...edits[later].path];
      for (let j = 0; j < path.length; j++) path[j] -= skipped.filter(e => e.path.length === j + 1 && e.path.slice(0, j).every((v, k) => v === path[k]) && e.path[j] < path[j]).length;
      edit = { ...edits[later], path } as Edit;
    }
  }
  return { edit, distance: best.alignment.cost, winner: best.winner };
}
export function applyEdit(program: readonly Block[], edit: Edit): Block[] {
  const clone = JSON.parse(JSON.stringify(program)) as Block[];
  let list = clone;
  for (const step of edit.path.slice(0, -1)) list = (list[step] as Extract<Block, { kind: 'repeat' }>).body;
  const at = edit.path[edit.path.length - 1];
  if (edit.op === 'insert') list.splice(at, 0, JSON.parse(JSON.stringify(edit.block)) as Block);
  else if (edit.op === 'remove') list.splice(at, 1);
  else if (edit.op === 'change') list[at] = JSON.parse(JSON.stringify(edit.to)) as Block;
  else (list[at] as Extract<Block, { kind: 'repeat' }>).times = edit.to;
  return clone;
}
const where = (path: readonly number[]): string => path.length === 1 ? `block ${path[0] + 1}` : `block ${path[path.length - 1] + 1} inside ${where(path.slice(0, -1))}`;
/** One sentence, in the words on the buttons. Edits inside a repeat change every turn of it. */
export function editText(edit: Edit, program: readonly Block[]): string {
  const at = edit.path[edit.path.length - 1], parent = edit.path.slice(0, -1);
  const position = at > 0 ? `after ${where([...parent, at - 1])}` : parent.length ? `as the first block inside ${where(parent)}` : 'at the start';
  if (edit.op === 'change') return `Change ${where(edit.path)} (${blockLabel(edit.from)}) to ${blockLabel(edit.to)}.`;
  if (edit.op === 'count') return `Change ${where(edit.path)} from Repeat ×${edit.from} to ×${edit.to}.`;
  if (edit.op === 'remove') return `Remove ${where(edit.path)} (${blockLabel(edit.from)}).`;
  const list = parent.reduce<readonly Block[]>((l, step) => (l[step] as Extract<Block, { kind: 'repeat' }>).body, program);
  return `Add ${blockLabel(edit.block)} ${at >= list.length && at > 0 ? `after ${where([...parent, at - 1])}` : position}.`;
}
export const editsToGo = (program: readonly Block[], winners: readonly (readonly Block[])[]): number => Math.min(...winners.map(w => align(program, w).cost));
export { blockCost };
