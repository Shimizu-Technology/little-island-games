/** K7: commands are game-owned small integers; control flow is shared. No eval or recursion. */
/** Add sensors as tagged variants; unknown tags fail closed until their adapter supports them. */
export type Condition = { kind: 'blocked' };
export type Node =
  | { kind: 'command'; command: number }
  | { kind: 'sequence'; body: Node[] }
  | { kind: 'repeat'; times: number; body: Node[] }
  | { kind: 'call'; song: number }
  | { kind: 'if'; condition: Condition; yes: Node[]; no: Node[] };
export type Program = { version: 1; body: Node[]; songs: Node[][] };
export const LIMITS = { nodes: 80, depth: 4, actions: 512, work: 8192, songs: 4, repeat: 16 } as const;
export const emptyProgram = (): Program => ({ version: 1, body: [], songs: [] });
export const sequence = (commands: readonly number[]): Program => ({ version: 1, body: commands.map(command => ({ kind: 'command', command })), songs: [] });
const keys = (v: object, names: string[]) => Object.keys(v).sort().join() === names.sort().join();
const plain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const dense = (v: unknown, max: number): v is unknown[] => Array.isArray(v) && v.length <= max && Object.keys(v).length === v.length;
const uint = (v: unknown, max: number): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;

/** Includes every container, command, call and song definition, including unreachable branches. */
export function validProgram(value: unknown, validCommand: (command: number) => boolean = c => uint(c, 255)): value is Program {
  if (!plain(value) || !keys(value, ['version', 'body', 'songs']) || value.version !== 1 || !dense(value.songs, LIMITS.songs)) return false;
  const songCount = value.songs.length;
  let count = songCount;
  const active = new Set<object>();
  const body = (v: unknown, depth: number): boolean => {
    if (depth > LIMITS.depth || !dense(v, LIMITS.nodes) || active.has(v)) return false;
    active.add(v);
    const ok = v.every(node => {
      if (++count > LIMITS.nodes || !plain(node) || active.has(node)) return false;
      active.add(node);
      let accepted = false;
      if (node.kind === 'command') accepted = keys(node, ['kind', 'command']) && uint(node.command, 255) && validCommand(node.command);
      if (node.kind === 'sequence') accepted = keys(node, ['kind', 'body']) && body(node.body, depth + 1);
      if (node.kind === 'repeat') accepted = keys(node, ['kind', 'times', 'body']) && uint(node.times, LIMITS.repeat) && node.times >= 2 && body(node.body, depth + 1);
      if (node.kind === 'call') accepted = keys(node, ['kind', 'song']) && uint(node.song, songCount - 1);
      if (node.kind === 'if') accepted = keys(node, ['kind', 'condition', 'yes', 'no']) && plain(node.condition) && keys(node.condition, ['kind']) && node.condition.kind === 'blocked' && body(node.yes, depth + 1) && body(node.no, depth + 1);
      active.delete(node);
      return accepted;
    });
    active.delete(v);
    return ok;
  };
  if (!body(value.body, 1) || !value.songs.every(song => body(song, 1))) return false;
  const program = value as Program;
  // Resolve calls through both branches. Cycles, excessive effective depth and expansion fail
  // even when a particular board would choose the other branch or stop early.
  const cost = (nodes: Node[], depth: number, stack: number[]): { actions: number; work: number } | null => {
    if (depth > LIMITS.depth) return null;
    let actions = 0, work = 0;
    for (const node of nodes) {
      work++;
      if (node.kind === 'command') actions++;
      else if (node.kind === 'call') {
        if (stack.includes(node.song)) return null;
        const c = cost(program.songs[node.song], depth + 1, [...stack, node.song]);
        if (!c) return null;
        actions += c.actions; work += c.work;
      } else if (node.kind === 'if') {
        const yes = cost(node.yes, depth + 1, stack), no = cost(node.no, depth + 1, stack);
        if (!yes || !no) return null;
        actions += Math.max(yes.actions, no.actions); work += Math.max(yes.work, no.work);
      } else {
        const c = cost(node.body, depth + 1, stack), times = node.kind === 'repeat' ? node.times : 1;
        if (!c) return null;
        actions += c.actions * times; work += c.work * times;
      }
      if (actions > LIMITS.actions || work > LIMITS.work) return null;
    }
    return { actions, work };
  };
  return !!cost(program.body, 1, []) && program.songs.every((song, i) => !!cost(song, 1, [i]));
}

export function nodeCost(program: Program): number {
  const count = (nodes: Node[]): number => nodes.reduce((sum, n) => sum + 1 + (n.kind === 'repeat' || n.kind === 'sequence' ? count(n.body) : n.kind === 'if' ? count(n.yes) + count(n.no) : 0), 0);
  return count(program.body) + program.songs.reduce((sum, song) => sum + 1 + count(song), 0);
}

/** Migration is a fresh tree. A caller retains its original save; this never writes storage. */
export const fromFlat = (commands: readonly number[]): Program => sequence(commands);
