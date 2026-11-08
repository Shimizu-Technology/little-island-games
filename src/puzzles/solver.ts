import type { Metric, Par, SolveResult } from './types';

export type SearchStatus<A> =
  | { status: 'running'; nodes: number }
  | { status: 'solved'; witness: A[]; cost: number; nodes: number }
  /** The whole reachable space was expanded. Only this status means no route exists. */
  | { status: 'unsolved'; nodes: number }
  | { status: 'budget-exhausted'; nodes: number };
export type SearchProblem<S, A> = {
  start: S;
  /** Must include heading, inventory, hazard phase and objective state where the game has them. */
  key(s: S): string | number;
  moves(s: S): readonly A[];
  apply(s: S, a: A): S;
  goal(s: S): boolean;
  cost?(s: S, a: A): number;
  /** Must never overestimate or go below zero, or `cost` is only an upper bound. It need not be consistent. */
  heuristic?(s: S): number;
  nodeBudget: number;
};
type Node<S, A> = { s: S; parent: number; action: A | undefined; g: number };

/**
 * Resumable best-first search: `run` returns between slices so device hints can stay under a frame.
 * A state reopens whenever its best cost improves, which keeps an admissible estimate exact.
 */
export function createSearch<S, A>(p: SearchProblem<S, A>) {
  const nodes: Node<S, A>[] = [{ s: p.start, parent: -1, action: undefined, g: 0 }];
  const best = new Map<string | number, number>([[p.key(p.start), 0]]);
  const heap: [number, number, number][] = []; // f, insertion order, node index
  let order = 0, expanded = 0, done: SearchStatus<A> | null = null;
  const less = (a: [number, number, number], b: [number, number, number]) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  const push = (item: [number, number, number]) => {
    heap.push(item);
    for (let i = heap.length - 1; i > 0;) {
      const up = (i - 1) >> 1;
      if (!less(heap[i], heap[up])) break;
      [heap[i], heap[up]] = [heap[up], heap[i]];
      i = up;
    }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < heap.length && less(heap[l], heap[m])) m = l;
        if (r < heap.length && less(heap[r], heap[m])) m = r;
        if (m === i) break;
        [heap[i], heap[m]] = [heap[m], heap[i]];
        i = m;
      }
    }
    return top;
  };
  const estimate = (s: S) => {
    const h = p.heuristic?.(s) ?? 0;
    if (!(h >= 0)) throw new Error('Search heuristics cannot be negative.');
    return h;
  };
  push([estimate(p.start), order++, 0]);
  const witness = (index: number) => {
    const out: A[] = [];
    for (let i = index; nodes[i].parent >= 0; i = nodes[i].parent) out.push(nodes[i].action as A);
    return out.reverse();
  };
  return {
    run(maxNodes = Number.POSITIVE_INFINITY, maxMs = Number.POSITIVE_INFINITY): SearchStatus<A> {
      if (done) return done;
      let slice = 0;
      const started = performance.now();
      while (heap.length) {
        if (expanded >= p.nodeBudget) return (done = { status: 'budget-exhausted', nodes: expanded });
        if (slice >= maxNodes || slice > 0 && performance.now() - started >= maxMs) return { status: 'running', nodes: expanded };
        const index = pop()[2], node = nodes[index], key = p.key(node.s);
        // A cheaper route reached this state after this entry was queued, so the entry is stale.
        if (node.g > best.get(key)!) continue;
        expanded++;
        slice++;
        if (p.goal(node.s)) return (done = { status: 'solved', witness: witness(index), cost: node.g, nodes: expanded });
        for (const action of p.moves(node.s)) {
          const next = p.apply(node.s, action);
          if (next === node.s) continue;
          const step = p.cost?.(node.s, action) ?? 1;
          if (!(step >= 0)) throw new Error('Search step costs cannot be negative.');
          const g = node.g + step, nextKey = p.key(next), known = best.get(nextKey);
          if (known !== undefined && known <= g) continue;
          best.set(nextKey, g);
          nodes.push({ s: next, parent: index, action, g });
          push([g + estimate(next), order++, nodes.length - 1]);
        }
      }
      return (done = { status: 'unsolved', nodes: expanded });
    },
  };
}
export function solveExactly<S, A>(p: SearchProblem<S, A>, metric: Metric): SolveResult<A> {
  const r = createSearch(p).run();
  if (r.status === 'solved') return { status: 'solved', witness: r.witness, metric, lower: r.cost, upper: r.cost, exact: true };
  return r.status === 'unsolved' ? { status: 'unsolved' } : { status: 'budget-exhausted', nodes: r.nodes };
}
/** Builds a par whose `exact` flag cannot disagree with its bounds. */
export function parFrom(metric: Metric, lower: number, upper: number): Par {
  if (!Number.isInteger(lower) || !Number.isInteger(upper) || lower < 0 || lower > upper) throw new Error('Par bounds must satisfy 0 <= lower <= upper.');
  return { metric, lower, upper, exact: lower === upper };
}
/** Only a proven par may be worded as the best. Anything else is a budget to try. */
export const parWording = (par: Par): 'best-possible' | 'try-this-budget' => (par.exact ? 'best-possible' : 'try-this-budget');
