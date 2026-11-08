import { describe, expect, it } from 'vitest';
import { createRng } from '../src/puzzles/rng';
import { createSearch, parFrom, parWording, solveExactly, type SearchProblem } from '../src/puzzles/solver';

// A line 0..n where each state can step +1 or +2, optionally with walls.
const line = (n: number, walls: number[] = [], budget = 10_000): SearchProblem<number, number> => ({
  start: 0, key: s => s, moves: () => [1, 2], apply: (s, a) => (walls.includes(s + a) || s + a > n ? s : s + a), goal: s => s === n, nodeBudget: budget,
});
describe('bounded search', () => {
  it('finds a shortest witness', () => {
    const r = solveExactly(line(9), 'steps');
    expect(r).toMatchObject({ status: 'solved', lower: 5, upper: 5, exact: true });
    if (r.status === 'solved') expect(r.witness.reduce((a, b) => a + b, 0)).toBe(9);
  });
  it('says unsolved only after exhausting the reachable space', () => {
    const walls = [3, 4];
    const open = createSearch(line(9, walls)).run();
    expect(open).toMatchObject({ status: 'unsolved' });
  });
  it('reports a timeout as budget-exhausted, never as unsolved', () => {
    const blocked = solveExactly(line(9, [3, 4], 2), 'steps');
    expect(blocked.status).toBe('budget-exhausted');
    const solvable = solveExactly(line(1000, [], 10), 'steps');
    expect(solvable.status).toBe('budget-exhausted');
  });
  it('resumes across slices with the same answer', () => {
    const whole = createSearch(line(40)).run(), sliced = createSearch(line(40));
    let result = sliced.run(1), slices = 1;
    while (result.status === 'running') { result = sliced.run(1); slices++; }
    expect(slices).toBeGreaterThan(5);
    expect(result).toEqual(whole);
    expect(sliced.run(1)).toEqual(whole);
  });
  it('uses step costs for the cheapest route, and an admissible heuristic keeps it optimal', () => {
    const costly: SearchProblem<number, number> = { ...line(6), cost: (_, a) => (a === 2 ? 5 : 1) };
    expect(createSearch(costly).run()).toMatchObject({ status: 'solved', cost: 6 });
    const guided: SearchProblem<number, number> = { ...costly, heuristic: s => 6 - s };
    expect(createSearch(guided).run()).toMatchObject({ status: 'solved', cost: 6 });
  });
  it('skips no-op actions instead of treating them as moves', () => {
    const r = createSearch<number, number>({ start: 0, key: s => s, moves: () => [0, 1], apply: (s, a) => (a === 0 ? s : s + a), goal: s => s === 3, nodeBudget: 20 }).run();
    expect(r).toMatchObject({ status: 'solved', witness: [1, 1, 1] });
  });
  it('rejects a negative step cost', () => {
    expect(() => createSearch({ ...line(3), cost: () => -1 }).run()).toThrow();
  });
});
describe('par', () => {
  it('is exact only when the bounds agree', () => {
    expect(parFrom('cards', 4, 4).exact).toBe(true);
    expect(parFrom('cards', 3, 4).exact).toBe(false);
    expect(() => parFrom('cards', 5, 4)).toThrow();
    expect(() => parFrom('cards', -1, 4)).toThrow();
    expect(() => parFrom('cards', 1.5, 4)).toThrow();
  });
  it('only lets a proven par be worded as the best', () => {
    expect(parWording(parFrom('steps', 6, 6))).toBe('best-possible');
    expect(parWording(parFrom('steps', 4, 6))).toBe('try-this-budget');
  });
});
describe('R1: an admissible heuristic that is not consistent', () => {
  const edges: Record<string, [string, number][]> = { S: [['A', 3], ['B', 1]], B: [['A', 1]], A: [['G', 2]], G: [] };
  const h: Record<string, number> = { S: 0, A: 0, B: 3, G: 0 };
  const problem: SearchProblem<string, string> = {
    start: 'S', key: s => s, moves: s => edges[s].map(e => e[0]), apply: (_, a) => a, goal: s => s === 'G',
    cost: (s, a) => edges[s].find(e => e[0] === a)![1], heuristic: s => h[s], nodeBudget: 100,
  };
  it('reopens a state when a cheaper route reaches it, and keeps that route as the witness', () => {
    expect(solveExactly(problem, 'steps')).toEqual({ status: 'solved', witness: ['B', 'A', 'G'], metric: 'steps', lower: 4, upper: 4, exact: true });
  });
  it('gives the same proof when run in slices', () => {
    const sliced = createSearch(problem);
    let result = sliced.run(1);
    while (result.status === 'running') result = sliced.run(1);
    expect(result).toMatchObject({ status: 'solved', witness: ['B', 'A', 'G'], cost: 4 });
  });
  it('matches uniform-cost search on random weighted graphs with inconsistent estimates', () => {
    const rng = createRng(11);
    for (let round = 0; round < 300; round++) {
      const size = 6 + rng.below(8), goal = size - 1;
      const graph = Array.from({ length: size }, () => Array.from({ length: 1 + rng.below(4) }, () => [rng.below(size), 1 + rng.below(9)] as const));
      const base: SearchProblem<number, number> = { start: 0, key: s => s, moves: s => graph[s].map((_, i) => i), apply: (s, i) => graph[s][i][0], cost: (s, i) => graph[s][i][1], goal: s => s === goal, nodeBudget: 100_000 };
      const toGoal = Array.from({ length: size }, (_, s) => { const r = createSearch({ ...base, start: s }).run(); return r.status === 'solved' ? r.cost : 0; });
      // Any share of the true remaining cost is admissible, and random shares are rarely consistent.
      const scale = Array.from({ length: size }, () => rng.below(101) / 100);
      const plain = createSearch(base).run(), guided = createSearch({ ...base, heuristic: s => toGoal[s] * scale[s] }).run();
      expect(guided.status).toBe(plain.status);
      if (plain.status === 'solved' && guided.status === 'solved') {
        expect(guided.cost).toBe(plain.cost);
        let at = 0, walked = 0;
        for (const i of guided.witness) { walked += graph[at][i][1]; at = graph[at][i][0]; }
        expect([at, walked]).toEqual([goal, guided.cost]);
      }
    }
  });
  it('rejects a negative estimate, which could end the search on a dearer goal', () => {
    expect(() => createSearch({ ...problem, heuristic: () => -1 }).run()).toThrow(/heuristic/i);
  });
});
