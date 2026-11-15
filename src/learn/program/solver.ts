import { nodeCost, sequence, validProgram, type Node, type Program } from './model';
import { interpret, type Machine } from './interpreter';

/** Exact dynamic programming compression of a known witness: minimum recursive node cost
 * amongst sequence/repeat encodings of that exact command stream. Not a claim of global par. */
export function compress(commands: readonly number[]): Program | null {
  if (commands.length > 512) return null;
  const memo = new Map<string, Node[]>();
  let work = 0;
  const exhausted = Symbol('compression budget');
  const cost = (body: Node[]) => nodeCost({ version: 1, body, songs: [] });
  const best = (lo: number, hi: number, depth: number): Node[] => {
    const key = `${lo}/${hi}/${depth}`, cached = memo.get(key); if (cached) return cached;
    if (++work > 100000) throw exhausted;
    let result = sequence(commands.slice(lo, hi)).body;
    for (let split = lo + 1; split < hi; split++) {
      const candidate = [...best(lo, split, depth), ...best(split, hi, depth)];
      if (cost(candidate) < cost(result)) result = candidate;
    }
    if (depth < 4) for (let width = 1; width <= (hi - lo) / 2; width++) {
      const times = (hi - lo) / width;
      if (!Number.isInteger(times) || times > 16 || !commands.slice(lo, hi).every((c, i) => c === commands[lo + i % width])) continue;
      const candidate: Node[] = [{ kind: 'repeat', times, body: best(lo, lo + width, depth + 1) }];
      if (cost(candidate) < cost(result)) result = candidate;
    }
    memo.set(key, result); return result;
  };
  try {
    const program: Program = { version: 1, body: best(0, commands.length, 1), songs: [] };
    return validProgram(program) ? program : null;
  } catch (error) { if (error === exhausted) return null; throw error; }
}

/** Bounded search over caller-supplied block candidates, replayed on the very same machine.
 * A caller can enumerate songs/conditions; exhaustion is distinct from no winner. */
export function* solvePrograms<S>(candidates: Iterable<Program>, initial: S, machine: Machine<S>, solved: (state: S) => boolean, budget = 10000): Generator<void, { status: 'solved'; program: Program; cost: number } | { status: 'budget-exhausted'; program?: Program; cost?: number } | { status: 'unsolved' }> {
  let tried = 0, best: { program: Program; cost: number } | null = null;
  for (const program of candidates) {
    if (tried++ >= budget) return { status: 'budget-exhausted', ...(best ?? {}) };
    yield;
    const result = interpret(program, initial, machine);
    if (result && solved(result.state)) { const cost = nodeCost(program); if (!best || cost < best.cost) best = { program, cost }; }
  }
  return best ? { status: 'solved', ...best } : { status: 'unsolved' };
}
