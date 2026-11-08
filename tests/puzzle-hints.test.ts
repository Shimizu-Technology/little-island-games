import { expect, it, vi } from 'vitest';
import { hintOffered, requestHint, type PublicHintRules } from '../src/puzzles/hints';
import { createSearch } from '../src/puzzles/solver';

// A branching route: the child chose 0→1→3 instead of the stored route 0→2→4→5.
const paths: Record<number, number[]> = { 0: [1, 2], 1: [3], 2: [4], 3: [5], 4: [5], 5: [] };
const rules: PublicHintRules<number, number> = {
  draft: null,
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
  expect(await requestHint(rules, 1, 'one-step', signal())).toEqual({ status: 'route', actions: [3], last: false });
  expect(await requestHint(rules, 1, 'show-me', signal())).toEqual({ status: 'route', actions: [3, 5], last: false });
  expect(await requestHint({ ...rules, problem: () => rules.problem(0) }, 3, 'one-step', signal())).toEqual({ status: 'route', actions: [5], last: true });
});
it('shows a separate engine-solved example without overwriting a valid alternative grid entry', async () => {
  type Grid = readonly number[];
  const valid = (s: Grid) => s.length === 2 && s[0] + s[1] === 5;
  const grid: PublicHintRules<Grid, Grid> = {
    draft: {hasEntries:s=>s.some(Boolean),complete:s=>s.every(Boolean),opening:()=>[0,0],describe:s=>({text:`One way: ${s.join(' + ')} = 5.`,focus:[]})},
    look: () => ({ text: 'Look at the empty box.', focus: ['1'] }), think: () => ({ text: 'The two boxes add to five.', focus: [] }),
    preserves: (s, next) => s.every((n, i) => !n || n === next[i]),
    problem: start => ({ start, key: s => s.join(), moves: () => [[1, 4], [2, 3], [3, 2], [4, 1]], apply: (_, a) => a, goal: valid, nodeBudget: 20 }),
  };
  const draft = [3,0];
  expect(await requestHint(grid, draft, 'show-me', signal())).toEqual({ status: 'example', cue: {text:'One way: 1 + 4 = 5.',focus:[]} });
  expect(draft).toEqual([3,0]);
});
it('F14: the native adapter view builder excludes varied hidden facts for all four rungs', async () => {
  const {publicSumView,sumHints}=await import('./helpers/puzzle-kit');
  const worlds=[{target:6,draft:[3,0],solution:[2,4],privateRecord:{answer:99}},{target:6,draft:[3,0],solution:[4,2],privateRecord:{answer:1}}];
  for(const step of ['look','think','one-step','show-me'] as const){
    const results=await Promise.all(worlds.map(world=>requestHint(sumHints,publicSumView(world),step,signal())));
    expect(results[0]).toEqual(results[1]);
  }
  expect(publicSumView(worlds[0])).toEqual({target:6,draft:[3,0]});
  expect(await requestHint(sumHints,publicSumView(worlds[0]),'show-me',signal())).toMatchObject({status:'example',cue:{text:'One way: 2 + 4 = 6.',focus:[]}});
  expect(await requestHint(sumHints,publicSumView({...worlds[0],target:7}),'think',signal())).not.toEqual(await requestHint(sumHints,publicSumView(worlds[0]),'think',signal()));
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
it('uses the real maze move and completion rules from a wandering draft, without a stored route', async () => {
  const { createMaze, directions, mazeDone, mazeMove, mazeRoute } = await import('../src/games/maze');
  const { defaultOptions } = await import('../src/games/types');
  type Maze = ReturnType<typeof createMaze>;
  const visible: PublicHintRules<Maze, number> = {
    draft: null,
    look: () => ({ text: 'Look at the open paths.', focus: [] }), think: () => ({ text: 'Follow the paths toward home.', focus: [] }), preserves: () => true,
    problem: start => ({ start, key: s => s.path.at(-1)!, goal: mazeDone, apply: mazeMove, nodeBudget: 1000,
      moves: s => { const cell = s.path.at(-1)!; return directions.flatMap(d => {
        const r = Math.floor(cell / s.size) + d.dr, c = cell % s.size + d.dc;
        return !(s.walls[cell] & d.bit) && r >= 0 && c >= 0 && r < s.size && c < s.size ? [r * s.size + c] : [];
      }); } }),
  };
  for (let seed = 1; seed <= 50; seed++) {
    let draft = createMaze(defaultOptions, seed);
    // Deliberately follow legal choices rather than a witness, including backtracking.
    for (let step = 0; step < 8 && !mazeDone(draft); step++) {
      const moves = visible.problem(draft).moves(draft); draft = mazeMove(draft, moves[(seed + step) % moves.length]);
    }
    const before = JSON.stringify(draft), result = await requestHint(visible, draft, 'show-me', signal());
    expect(JSON.stringify(draft)).toBe(before); expect(result.status).toBe('route');
    if (result.status !== 'route') throw new Error('Missing real-engine route');
    for (const action of result.actions) { const next = mazeMove(draft, action); expect(next).not.toBe(draft); draft = next; }
    expect(mazeDone(draft)).toBe(true); expect(mazeRoute(draft)).toHaveLength(1);
  }
});

it('F17: a grid example never solves or compares the entered draft, including on solver exhaustion', async () => {
  const {sumHints,publicSumView}=await import('./helpers/puzzle-kit');
  const problem=vi.fn((v:ReturnType<typeof publicSumView>)=>sumHints.problem(v));
  for(const draft of [[0,0],[1,0],[3,0],[1,1],[2,4],[3,3]]) {
    const result=await requestHint({...sumHints,problem},publicSumView({target:6,draft}),'show-me',signal());
    expect(result).toEqual({status:'example',cue:{text:'One way: 2 + 4 = 6.',focus:[]}});
    expect(problem.mock.calls.at(-1)?.[0].draft).toEqual([0,0]);
    expect(await requestHint({...sumHints,problem:v=>({...sumHints.problem(v),nodeBudget:0})},publicSumView({target:6,draft}),'show-me',signal())).toEqual({status:'unavailable'});
  }
});
