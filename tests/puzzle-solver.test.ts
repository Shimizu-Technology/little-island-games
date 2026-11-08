import { describe, expect, it } from 'vitest';
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
