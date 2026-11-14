import { validProgram, type Node, type Program } from '../../program/model';
import { decodeProgram } from '../../program/codec';
import { interpret } from '../../program/interpreter';
import type { Block } from './engine';
export type Primitive = Exclude<Block, { kind: 'repeat' }>;
export const programCodes: Primitive[] = [
  ...[60, 70, 80, 90, 100].map(n => ({ kind: 'forward' as const, n })),
  ...[45, 60, 90, 120].map(angle => ({ kind: 'turn' as const, angle })),
  ...(['coral', 'teal', 'gold'] as const).map(color => ({ kind: 'color' as const, color })),
];
const node = (block: Block): Node => block.kind === 'repeat' ? { kind: 'repeat', times: block.times, body: block.body.map(node) } : { kind: 'command', command: programCodes.findIndex(c => JSON.stringify(c) === JSON.stringify(block)) };
export const turtleProgram = (blocks: readonly Block[]): Program => ({ version: 1, body: blocks.map(node), songs: [] });
export function turtleBlocks(program: Program): Block[] | null {
  if (!validProgram(program, code => code < programCodes.length)) return null;
  const read = (nodes: Node[]): Block[] | null => {
    const out: Block[] = [];
    for (const n of nodes) {
      if (n.kind === 'command') { if (!programCodes[n.command]) return null; out.push({ ...programCodes[n.command] }); }
      else if (n.kind === 'repeat') { const body = read(n.body); if (!body) return null; if (body.length) out.push({ kind: 'repeat', times: n.times, body }); }
      else if (n.kind === 'if') return null; // Turtle has no obstacle sensor.
      else { const body = read(n.kind === 'call' ? program.songs[n.song] : n.body); if (!body) return null; out.push(...body); }
    }
    return out;
  };
  return read(program.body);
}
export function turtlePrimitives(program: Program): Primitive[] | null {
  if (!validProgram(program, code => code < programCodes.length)) return null;
  const result = interpret(program, 0, { step: n => n + 1, blocked: () => false });
  return result ? result.frames.map(frame => programCodes[frame.command]) : null;
}
export function readTurtleDraft(draft: unknown) {
  const program = decodeProgram(draft, code => code < programCodes.length);
  if (!program) return null;
  const blocks = turtleBlocks(program);
  return blocks ? { program, blocks } : null;
}
