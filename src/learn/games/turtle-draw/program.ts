import { validProgram, type Node, type Program } from '../../program/model';
import { decodeProgram } from '../../program/codec';
import { interpret } from '../../program/interpreter';
import type { Block } from './engine';
export type Primitive = Exclude<Block, { kind: 'repeat' }>;
/** School and every published draft: codes 0–11, never reordered. */
export const programCodes: Primitive[] = [
  ...[60, 70, 80, 90, 100].map(n => ({ kind: 'forward' as const, n })),
  ...[45, 60, 90, 120].map(angle => ({ kind: 'turn' as const, angle })),
  ...(['coral', 'teal', 'gold'] as const).map(color => ({ kind: 'color' as const, color })),
];
/** C2c Deep Water appends codes 12–17 (short sides, the 40°, 72° and 144° turns, and Grow +10).
 * School readers keep checking against `programCodes`, so no earlier save can reach these. */
export const deepCodes: Primitive[] = [
  ...programCodes,
  { kind: 'forward', n: 40 }, { kind: 'forward', n: 50 },
  { kind: 'turn', angle: 40 }, { kind: 'turn', angle: 72 }, { kind: 'turn', angle: 144 },
  { kind: 'grow' },
];
export const growStep = 10;
const same = (a: Block, b: Block) => JSON.stringify(a) === JSON.stringify(b);
const node = (block: Block, codes: readonly Primitive[]): Node => block.kind === 'repeat' ? { kind: 'repeat', times: block.times, body: block.body.map(b => node(b, codes)) } : { kind: 'command', command: codes.findIndex(c => same(c, block)) };
export const turtleProgram = (blocks: readonly Block[], codes: readonly Primitive[] = programCodes): Program => ({ version: 1, body: blocks.map(b => node(b, codes)), songs: [] });
export function turtleBlocks(program: Program, codes: readonly Primitive[] = programCodes): Block[] | null {
  if (!validProgram(program, code => code < codes.length)) return null;
  const read = (nodes: Node[]): Block[] | null => {
    const out: Block[] = [];
    for (const n of nodes) {
      if (n.kind === 'command') { if (!codes[n.command]) return null; out.push({ ...codes[n.command] }); }
      else if (n.kind === 'repeat') { const body = read(n.body); if (!body) return null; if (body.length) out.push({ kind: 'repeat', times: n.times, body }); }
      else if (n.kind === 'if') return null; // Turtle has no obstacle sensor.
      else { const body = read(n.kind === 'call' ? program.songs[n.song] : n.body); if (!body) return null; out.push(...body); }
    }
    return out;
  };
  return read(program.body);
}
export function turtlePrimitives(program: Program, codes: readonly Primitive[] = programCodes): Primitive[] | null {
  if (!validProgram(program, code => code < codes.length)) return null;
  const result = interpret(program, 0, { step: n => n + 1, blocked: () => false });
  return result ? result.frames.map(frame => codes[frame.command]) : null;
}
export function readTurtleDraft(draft: unknown, codes: readonly Primitive[] = programCodes) {
  const program = decodeProgram(draft, code => code < codes.length);
  if (!program) return null;
  const blocks = turtleBlocks(program, codes);
  return blocks ? { program, blocks } : null;
}
