import type { Code } from '../../program/codec';
import { blockPosition } from '../../program/hints';
import type { Node, Program } from '../../program/model';
import { programOperations, type Operation, type Path } from '../../program/operations';

/** An operation path as the editor's block address (main.1.body.0), so hints name blocks the way the plan does. */
export function addressOf(path: Path, withIndex = true): string {
  let out = path[0] === -1 ? 'main' : `song${path[0]}`;
  const end = withIndex ? path.length : path.length - 1;
  for (let i = 1; i < end; i++) out += i % 2 ? `.${path[i]}` : `.${['body', 'yes', 'no'][path[i]]}`;
  return out;
}
const container = (path: Path) => {
  const parent = addressOf(path, false);
  return parent === 'main' ? 'the plan' : parent.startsWith('song') && !parent.includes('.') ? `song ${Number(parent.slice(4)) + 1}` : `${blockPosition(parent.replace(/\.(body|yes|no)$/, ''))}`;
};
const nodeName = (code: Code, name: (command: number) => string) => code[0] === 0 ? name(code[1]) : code[0] === 2 ? `a Repeat ${code[1]} block` : code[0] === 3 ? `Song ${code[1] + 1}` : 'a block';
const listLength = (program: Program, path: Path): number => {
  let list: Node[] | undefined = path[0] === -1 ? program.body : program.songs[path[0]];
  for (let i = 1; list && i < path.length - 1; i += 2) { const n: Node | undefined = list[path[i]]; list = n && (n.kind === 'repeat' || n.kind === 'sequence') ? n.body : undefined; }
  return list?.length ?? 0;
};
/** One structural edit in words. Inserting a Repeat names only the block, so its cards stay for the next step. */
export function describeOperation(op: Operation, program: Program, name: (command: number) => string): string {
  if (op[0] === 0) {
    // The editor adds Repeat ×2; the count is changed after, so a Repeat hint says both steps.
    const at = op[1].at(-1)!, inside = container(op[1]), what = op[2][0] === 2 ? 'a Repeat block' : nodeName(op[2], name), then = op[2][0] === 2 && op[2][1] !== 2 ? ` Then set it to ${op[2][1]} times.` : '';
    if (at >= listLength(program, op[1])) return (inside === 'the plan' ? `Add ${what} at the end of the plan.` : `Add ${what} inside ${inside}.`) + then;
    return `Insert ${what} before ${blockPosition(addressOf(op[1]))}.${then}`;
  }
  if (op[0] === 1) return `Remove ${blockPosition(addressOf(op[1]))}.`;
  if (op[0] === 6) return `Change ${blockPosition(addressOf(op[1]))} to ${name(op[2])}.`;
  if (op[0] === 3) return `Set the Repeat at ${blockPosition(addressOf(op[1]))} to ${op[2]} times.`;
  if (op[0] === 2) return `Move ${blockPosition(addressOf(op[1]))} to ${blockPosition(addressOf(op[2]))}.`;
  return 'Change one block.';
}
/** The whole plan in words, for the last help step. */
export function describeProgram(program: Program, name: (command: number) => string): string {
  const say = (nodes: Node[]): string => nodes.map(n => n.kind === 'command' ? name(n.command) : n.kind === 'repeat' ? `Repeat ${n.times} times [${say(n.body)}]` : n.kind === 'call' ? `Song ${n.song + 1}` : 'a block').join(', ');
  return say(program.body);
}
/** The certified winner fewest structural edits away, and its first edit. Ties keep the cheaper winner. */
export function nearestBlocks(program: Program, solutions: readonly Program[]): { target: Program; first: Operation | null; edits: number } | null {
  let best: { target: Program; first: Operation | null; edits: number } | null = null;
  for (const target of solutions) {
    let ops: Operation[];
    try { ops = programOperations(program, target); } catch { continue; }
    if (!best || ops.length < best.edits) best = { target, first: ops[0] ?? null, edits: ops.length };
  }
  return best;
}
