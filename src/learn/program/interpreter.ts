import { validProgram, type Node, type Program } from './model';

export type Frame<S> = { command: number; path: string; iteration: number[]; before: S; after: S };
export type Machine<S> = { step: (state: S, command: number) => S; blocked: (state: S) => boolean; halt?: (state: S) => boolean };
/** Each frame identifies the actual nested card, not its expanded position in an arrow string. */
export function interpret<S>(program: Program, initial: S, machine: Machine<S>): { state: S; frames: Frame<S>[] } | null {
  if (!validProgram(program)) return null;
  let state = initial;
  const frames: Frame<S>[] = [];
  const visit = (nodes: Node[], path: string, iteration: number[]) => {
    for (let i = 0; i < nodes.length; i++) {
      if (machine.halt?.(state)) return;
      const node = nodes[i], address = `${path}.${i}`;
      if (node.kind === 'command') { const before = state; state = machine.step(state, node.command); frames.push({ command: node.command, path: address, iteration: [...iteration], before, after: state }); }
      else if (node.kind === 'repeat') for (let turn = 0; turn < node.times; turn++) visit(node.body, `${address}.body`, [...iteration, turn]);
      else if (node.kind === 'sequence') visit(node.body, `${address}.body`, iteration);
      else if (node.kind === 'call') visit(program.songs[node.song], `song${node.song}`, iteration);
      else { const blocked = machine.blocked(state); visit(blocked ? node.yes : node.no, `${address}.${blocked ? 'yes' : 'no'}`, iteration); }
    }
  };
  visit(program.body, 'main', []);
  return { state, frames };
}
