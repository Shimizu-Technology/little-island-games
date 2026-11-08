import { expect, it, vi } from 'vitest';
import { hintOffered, requestHint, type PublicHintRules } from '../src/puzzles/hints';
import { createSearch } from '../src/puzzles/solver';

// A branching route: the child chose 0→1→3 instead of the stored route 0→2→4→5.
const paths: Record<number, number[]> = { 0: [1, 2], 1: [3], 2: [4], 3: [5], 4: [5], 5: [] };
const rules: PublicHintRules<number, number> = {
  look: v => ({ text: 'Look at the paths leaving this stone.', focus: [String(v)] }),
  think: () => ({ text: 'Follow a path toward home.', focus: [] }),
  preserves: () => true,
  problem: view => ({ start: view, key: s => s, moves: s => paths[s], apply: (s, a) => paths[s].includes(a) ? a : s, goal: s => s === 5, nodeBudget: 100 }),
};
const signal = () => new AbortController().signal;
it('Look and Think never solve or return an answer action', async () => {
  const problem = vi.fn(rules.problem), safe = { ...rules, problem };
  expect(await requestHint(safe, 3, 'look', signal())).toEqual({ status: 'cue', cue: { text: 'Look at the paths leaving this stone.', focus: ['3'] } });
  expect(await requestHint(safe, 3, 'think', signal())).toEqual({ status: 'cue', cue: { text: 'Follow a path toward home.', focus: [] } });
  expect(problem).not.toHaveBeenCalled();
});
it('re-derives a sound next step off the stored route; One step stops after one action', async () => {
  expect(await requestHint(rules, 1, 'one-step', signal())).toEqual({ status: 'route', actions: [3] });
  expect(await requestHint(rules, 1, 'show-me', signal())).toEqual({ status: 'route', actions: [3, 5] });
  expect(await requestHint({ ...rules, problem: () => rules.problem(0) }, 3, 'one-step', signal())).toEqual({ status: 'route', actions: [5] });
});
it('does not overwrite a valid alternative grid entry, even if a stored solution would', async () => {
  type Grid = readonly number[];
  const valid = (s: Grid) => s.length === 2 && s[0] + s[1] === 5;
  const grid: PublicHintRules<Grid, Grid> = {
    look: () => ({ text: 'Look at the empty box.', focus: ['1'] }), think: () => ({ text: 'The two boxes add to five.', focus: [] }),
    preserves: (s, next) => s.every((n, i) => !n || n === next[i]),
    problem: start => ({ start, key: s => s.join(), moves: () => [[1, 4], [2, 3], [3, 2], [4, 1]], apply: (_, a) => a, goal: valid, nodeBudget: 20 }),
  };
  expect(await requestHint(grid, [3, 0], 'one-step', signal())).toEqual({ status: 'route', actions: [[3, 2]] });
});
it('cannot use an unseen answer: changing hidden facts leaves a public hint identical', async () => {
  const worlds = [{ visible: 1, secret: 5 }, { visible: 1, secret: 99 }];
  const requests = await Promise.all(worlds.map(world => requestHint(rules, world.visible, 'one-step', signal())));
  expect(requests[0]).toEqual(requests[1]);
});
it('reports exhaustion honestly, supports cancellation, and does not reset a dead-end draft', async () => {
  expect(await requestHint({ ...rules, problem: v => ({ ...rules.problem(v), nodeBudget: 0 }) }, 1, 'show-me', signal())).toEqual({ status: 'unavailable' });
  expect(await requestHint({ ...rules, problem: v => ({ ...rules.problem(v), moves: () => [] }) }, 1, 'one-step', signal())).toEqual({ status: 'unavailable' });
  const controller = new AbortController(); controller.abort();
  expect(await requestHint(rules, 1, 'look', controller.signal)).toEqual({ status: 'cancelled' });
  const long: PublicHintRules<number, number> = { ...rules, problem: start => ({ start, key: s => s, moves: s => [s + 1], apply: (_, a) => a, goal: s => s === 1000, nodeBudget: 2000 }) };
  const yielded = vi.fn(async () => controller.abort()); const next = new AbortController();
  const result = await requestHint(long, 0, 'show-me', next.signal, async () => { yielded(); next.abort(); });
  expect(result.status).toBe('cancelled'); expect(yielded).toHaveBeenCalledOnce();
});
it('uses an 8ms search slice and resumes without changing the route', () => {
  let clock = 0; const spy = vi.spyOn(performance, 'now').mockImplementation(() => clock += 5);
  try {
    const job = createSearch(rules.problem(0));
    expect(job.run(64, 8).status).toBe('running');
    let result = job.run(64, 8); while (result.status === 'running') result = job.run(64, 8);
    expect(result).toMatchObject({ status: 'solved', witness: [1, 3, 5] });
  } finally { spy.mockRestore(); }
});
it('offers help from the start on grids and after three failed build runs; Help itself is never locked', () => {
  expect(hintOffered('grid', 0)).toBe(true); expect(hintOffered('build-run', 2)).toBe(false); expect(hintOffered('build-run', 3)).toBe(true);
});
