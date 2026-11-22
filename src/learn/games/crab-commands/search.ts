import { nodeCost, validProgram, type Node, type Program } from '../../program/model';

/** A beach as a search machine. `step` returns null on a bump; `won` is checked after every card,
 * because a run stops the moment the crab is home with every shell. */
export type Sim<S> = {
  start: S; step: (state: S, command: number) => S | null; won: (state: S) => boolean; key: (state: S) => string; blocked?: (state: S) => boolean;
  /** Several beaches at once (fog): each beach takes its own If branch. */
  runIf?: (state: S, yes: readonly Node[], no: readonly Node[]) => { state: S; won: boolean } | null;
};
/** Repeat counts the block editor can set (Repeat ×2, then ×3, ×4, ×6 or ×8). */
export const REPEAT_COUNTS = [2, 3, 4, 6, 8] as const;
const TURNS = [5, 6];
/** Turns that undo or triple each other never help a plan: Left then Right, or three of one turn. */
const wasteful = (body: readonly Node[], c: number) => {
  if (!TURNS.includes(c)) return false;
  const a = body.at(-1), b = body.at(-2), last = a?.kind === 'command' ? a.command : -1, before = b?.kind === 'command' ? b.command : -1;
  return (TURNS.includes(last) && last !== c) || (last === c && before === c);
};
/** A repeated group that only turns is the same as fewer turns. */
const moves = (body: readonly Node[]): boolean => body.some(n => n.kind === 'command' ? !TURNS.includes(n.command) : n.kind === 'repeat' && moves(n.body));

/** Fewest flat cards, by breadth-first search over the same machine. */
export function flatBest<S>(sim: Sim<S>, commands: readonly number[], limit = 80): { cards: number; plan: number[] } | null {
  if (sim.won(sim.start)) return { cards: 0, plan: [] };
  const queue: { state: S; plan: number[] }[] = [{ state: sim.start, plan: [] }], seen = new Set([sim.key(sim.start)]);
  for (let i = 0; i < queue.length; i++) {
    const { state, plan } = queue[i];
    if (plan.length >= limit) continue;
    for (const c of commands) {
      const next = sim.step(state, c);
      if (next === null) continue;
      if (sim.won(next)) return { cards: plan.length + 1, plan: [...plan, c] };
      const k = sim.key(next);
      if (seen.has(k)) continue;
      seen.add(k); queue.push({ state: next, plan: [...plan, c] });
    }
  }
  return null;
}

type Run<S> = { state: S; won: boolean } | null;
/** Runs nodes from a state; null on a bump. Stops early, won, at home. */
export function runNodes<S>(sim: Sim<S>, state: S, nodes: readonly Node[]): Run<S> {
  for (const node of nodes) {
    if (node.kind === 'command') {
      const next = sim.step(state, node.command);
      if (next === null) return null;
      state = next;
      if (sim.won(state)) return { state, won: true };
    } else if (node.kind === 'repeat') {
      for (let t = 0; t < node.times; t++) {
        const r = runNodes(sim, state, node.body);
        if (!r || r.won) return r;
        state = r.state;
      }
    } else if (node.kind === 'sequence') {
      const r = runNodes(sim, state, node.body);
      if (!r || r.won) return r;
      state = r.state;
    } else if (node.kind === 'if' && (sim.runIf || sim.blocked)) {
      const r = sim.runIf ? sim.runIf(state, node.yes, node.no) : runNodes(sim, state, sim.blocked!(state) ? node.yes : node.no);
      if (!r || r.won) return r;
      state = r.state;
    } else return null;
  }
  return { state, won: false };
}

export type BlockSearch = { best: number | null; witness: Program | null; solutions: Program[]; expanded: number; exhausted: boolean };
/**
 * Fewest blocks among plans of cards and Repeat blocks (nested at most `nest` deep), every block counted
 * as the editor counts it. Dijkstra over the crab's state between top-level blocks: two plans that leave
 * the crab in the same state can be finished the same way, so only the cheaper one is kept. `solutions`
 * collects distinct winners within `limit` blocks, cheapest first, for hints.
 */
export function blockBest<S>(sim: Sim<S>, commands: readonly number[], limit: number, options: { nest?: number; keep?: number; work?: number; conditions?: boolean } = {}): BlockSearch {
  // Deepen the limit one block at a time: the first limit with a winner is the fewest blocks, and small
  // limits never enumerate the long bodies a large limit would allow.
  let expanded = 0;
  for (let at = 0; at <= limit; at++) {
    const result = blocksWithin(sim, commands, at, { ...options, keep: 0, work: (options.work ?? 4_000_000) - expanded });
    expanded += result.expanded;
    if (result.exhausted) return { ...result, expanded };
    if (result.best !== null) {
      if (!options.keep) return { ...result, expanded };
      const all = blocksWithin(sim, commands, limit, { ...options, work: (options.work ?? 4_000_000) - expanded });
      return { ...all, best: result.best, witness: result.witness, expanded: expanded + all.expanded };
    }
  }
  return { best: null, witness: null, solutions: [], expanded, exhausted: false };
}
/** If blocked with up to two cards in each branch: what the fog searches add to cards and Repeats. */
function conditionNodes(commands: readonly number[]): Node[] {
  const seqs: number[][] = [[]];
  for (const a of commands) { seqs.push([a]); for (const b of commands) seqs.push([a, b]); }
  const cmd = (c: number): Node => ({ kind: 'command', command: c });
  return seqs.flatMap(yes => seqs.filter(no => (yes.length || no.length) && JSON.stringify(yes) !== JSON.stringify(no)).map(no => ({ kind: 'if', condition: { kind: 'blocked' }, yes: yes.map(cmd), no: no.map(cmd) } as Node)));
}
function blocksWithin<S>(sim: Sim<S>, commands: readonly number[], limit: number, options: { nest?: number; keep?: number; work?: number; conditions?: boolean }): BlockSearch {
  const ifs = options.conditions ? conditionNodes(commands) : [];
  const nest = options.nest ?? 2, keep = options.keep ?? 0, work = options.work ?? 4_000_000;
  const dist = new Map<string, number>(), from = new Map<string, { parent: string | null; item: Node | null }>();
  const states = new Map<string, S>();
  const buckets: string[][] = Array.from({ length: limit + 1 }, () => []);
  const k0 = sim.key(sim.start);
  dist.set(k0, 0); from.set(k0, { parent: null, item: null }); states.set(k0, sim.start); buckets[0].push(k0);
  let best: number | null = sim.won(sim.start) ? 0 : null, witness: Program | null = best === 0 ? { version: 1, body: [], songs: [] } : null;
  const found: { cost: number; program: Program }[] = [], seenSolutions = new Set<string>();
  let expanded = 0, exhausted = false;
  const pathTo = (k: string): Node[] => { const out: Node[] = []; for (let at: string | null = k; at !== null;) { const f: { parent: string | null; item: Node | null } = from.get(at)!; if (f.item) out.unshift(f.item); at = f.parent; } return out; };
  const record = (cost: number, body: Node[]) => {
    const program: Program = { version: 1, body: JSON.parse(JSON.stringify(body)) as Node[], songs: [] };
    if (best === null || cost < best) { best = cost; witness = program; }
    if (keep && found.length < keep * 4) { const id = JSON.stringify(program.body); if (!seenSolutions.has(id)) { seenSolutions.add(id); found.push({ cost, program }); } }
  };
  // Bodies are built card by card while the first pass runs, so a body that bumps on its first pass is never extended.
  const bodies = function* (state: S, budget: number, depth: number): Generator<{ body: Node[]; first: Run<S> }> {
    const grow = function* (prefix: Node[], at: S, size: number): Generator<{ body: Node[]; first: Run<S> }> {
      if (size >= budget) return;
      for (const c of commands) {
        if (wasteful(prefix, c)) continue;
        if (++expanded > work) { exhausted = true; return; }
        const next = sim.step(at, c);
        if (next === null) continue;
        const body = [...prefix, { kind: 'command', command: c } as Node];
        if (sim.won(next)) { yield { body, first: { state: next, won: true } }; continue; }
        if (moves(body)) yield { body, first: { state: next, won: false } };
        yield* grow(body, next, size + 1);
      }
      // At most one If in a group, with plain cards in its branches.
      if (!prefix.some(n => n.kind === 'if')) for (const node of ifs) {
        const cost = size + count([node]);
        if (cost > budget) continue;
        if (++expanded > work) { exhausted = true; return; }
        const r = runNodes(sim, at, [node]);
        if (!r) continue;
        const body = [...prefix, node];
        yield { body, first: r };
        if (!r.won) yield* grow(body, r.state, cost);
      }
      if (depth < nest) for (const inner of bodies(at, budget - size - 1, depth + 1)) for (const times of REPEAT_COUNTS) {
        if (++expanded > work) { exhausted = true; return; }
        const r = runNodes(sim, at, [{ kind: 'repeat', times, body: inner.body }]);
        if (!r) continue;
        const body = [...prefix, { kind: 'repeat', times, body: inner.body } as Node], cost = size + 1 + count(inner.body);
        if (cost > budget) continue;
        yield { body, first: r };
        if (!r.won) yield* grow(body, r.state, cost);
      }
    };
    yield* grow([], state, 0);
  };
  for (let g = 0; g <= limit; g++) {
    for (let i = 0; i < buckets[g].length; i++) {
      const k = buckets[g][i];
      if (dist.get(k) !== g) continue;
      // Anything cheaper than the best so far must start below it.
      const cap = keep || best === null ? limit : Math.min(limit, best - 1);
      if (g >= cap) break;
      const state = states.get(k)!, room = cap - g;
      const push = (item: Node, cost: number, r: Run<S>) => {
        if (!r) return;
        if (r.won) { record(g + cost, [...pathTo(k), item]); return; }
        const nk = sim.key(r.state), total = g + cost;
        if (total > cap || (dist.get(nk) ?? Infinity) <= total) return;
        dist.set(nk, total); from.set(nk, { parent: k, item }); states.set(nk, r.state); buckets[total].push(nk);
      };
      for (const c of commands) { if (room < 1) break; const n = sim.step(state, c); push({ kind: 'command', command: c }, 1, n === null ? null : { state: n, won: sim.won(n) }); }
      for (const node of ifs) { const cost = count([node]); if (cost <= room) push(node, cost, runNodes(sim, state, [node])); }
      if (room >= 2) for (const { body } of bodies(state, room - 1, 1)) for (const times of REPEAT_COUNTS) {
        if (++expanded > work) { exhausted = true; break; }
        const item: Node = { kind: 'repeat', times, body };
        push(item, 1 + count(body), runNodes(sim, state, [item]));
      }
      if (exhausted) break;
    }
    if (exhausted) break;
  }
  const solutions = found.sort((a, b) => a.cost - b.cost).slice(0, keep).map(f => f.program);
  return { best, witness, solutions, expanded, exhausted };
}
const count = (nodes: readonly Node[]) => nodeCost({ version: 1, body: nodes as Node[], songs: [] });
/** Deepest repeat nesting in a plan: 0 for flat cards, 1 for one Repeat, 2 for a Repeat inside a Repeat. */
export function nesting(program: Program): number {
  const depth = (nodes: Node[]): number => nodes.reduce((d, n) => Math.max(d, n.kind === 'repeat' ? 1 + depth(n.body) : n.kind === 'sequence' ? depth(n.body) : n.kind === 'if' ? Math.max(depth(n.yes), depth(n.no)) : 0), 0);
  return Math.max(depth(program.body), ...program.songs.map(depth));
}
export const validBlocks = (program: Program) => validProgram(program);
