import { describe, expect, it } from 'vitest';
import { canGoAlone, crabsKey, cellsText, dirOf, explore, gridOf, HOME, hintMove, homeAll, lightTile, nextOnRoute, shortestRoute, slide, slideOn, tuplePuzzle, puzzleTuple, validPuzzle, type Crabs, type Dir, type SlipPuzzle } from '../src/learn/games/slip-tide/rules';

// The audit's independent samples: capital crab, small pool, # rock.
function board(rows: string[], route = ''): SlipPuzzle {
  const cells = rows.flatMap(r => r.split(' ')), size = rows.length, crabs: number[] = [], pools: number[] = [], rocks: number[] = [];
  cells.forEach((ch, i) => {
    if (ch === '#') rocks.push(i);
    else if (/[A-D]/.test(ch)) crabs['ABCD'.indexOf(ch)] = i;
    else if (/[a-d]/.test(ch)) pools['abcd'.indexOf(ch)] = i;
  });
  return { size, rocks, crabs, pools, route };
}
const walk = (p: SlipPuzzle, route: string) => [...route].reduce<Crabs>((at, letter) => slide(p, at, dirOf(letter)), p.crabs);
const samples: [string, string[], string, number][] = [
  ['A', ['# . . .', '. . . .', '. a . .', '# . . A'], 'LU', 2],
  ['B', ['. . . # A', '. . . . .', '# # . # .', '. a . . .', '. . . . .'], 'DLUR', 4],
  ['C', ['. B . . #', '# . . . .', '. . b . .', 'a A . . #', '. . . . #'], 'DLUR', 4],
  ['D', ['. # . a . B', '. . # # . .', '. . . # . .', 'A . . # . .', '. b . . . .', '. # # . . .'], 'RDRULDLUL', 9],
  ['E', ['A . b # . #', '# . . . C .', '. . . . B #', '# . . a . #', '. c . . . .', '. . . . . #'], 'URDRUDLUR', 9],
  ['G', ['. . . B . . .', '# c C # . . .', '# . . b . . .', '. . . # . d .', '. D . # # # .', '. . # # . . .', '# # . . A a .'], 'URDRULDRURDRULULDRDL', 20],
];
describe('slide', () => {
  it('slides every crab until something stops it', () => {
    const p = board(['A . # .', '. . . .', 'B . . .', '. . . .']);
    expect(slide(p, p.crabs, 1)).toEqual([1, 11]);
    expect(slide(p, p.crabs, 2)).toEqual([8, 12]);
  });
  it('lets crabs stop against each other, in both orders', () => {
    const p = board(['A B . .', '. . . .', '. . . .', '. . . .']);
    expect(slide(p, p.crabs, 1)).toEqual([2, 3]);
    expect(slide(p, slide(p, p.crabs, 1), 3)).toEqual([0, 1]);
  });
  it('takes a crab home the moment it enters its own pool, even mid-line', () => {
    const p = board(['A . a .', '. . . .', '. . . .', '. . . .']);
    expect(slide(p, p.crabs, 1)).toEqual([HOME]);
  });
  it('passes over another crab\'s pool', () => {
    const p = board(['A b . .', '. . . .', '. . . .', '. . . B']);
    expect(slide(p, p.crabs, 1)[0]).toBe(3);
  });
  it('frees the line for the crab behind when the front crab goes home', () => {
    const p = board(['A B b .', '. . . .', '. . . .', '. . . a']);
    const after = slide(p, p.crabs, 1);
    expect(after[1]).toBe(HOME);
    expect(after[0]).toBe(3);
  });
  it('returns the same array for a swipe that moves nothing', () => {
    const p = board(['A # . .', '# . . .', '. . . .', '. . . a']);
    expect(slide(p, p.crabs, 0)).toBe(p.crabs);
    expect(slide(p, p.crabs, 3)).toBe(p.crabs);
  });
});
describe('audit samples, solved from the written rules', () => {
  it.each(samples)('rung %s matches the separately validated answer and shortest length', (_rung, rows, route, length) => {
    const p = board(rows, route);
    expect(homeAll(walk(p, route))).toBe(true);
    const graph = explore(p);
    expect(graph.complete).toBe(true);
    expect(graph.dist).toBe(length);
    expect(shortestRoute(p, p.crabs)).toMatchObject({ status: 'solved' });
  });
  it('agrees with the audit that rung E needs a stopper', () => {
    const p = board(samples[4][1]);
    expect(p.crabs.map((_, i) => canGoAlone(p, i))).toContain(false);
  });
});
describe('explore', () => {
  it('counts every shortest route and dead state on a hand-checked board', () => {
    const p = board(['A . . a', '. . . .', '. . . .', '. . . .']);
    expect(explore(p)).toMatchObject({ complete: true, dist: 1, shortest: 1, dead: 0 });
    const dead = board(['A # . .', '# . . .', '. . . .', '. . . a']);
    expect(explore(dead)).toMatchObject({ complete: true, dist: -1, states: 1, dead: 1 });
  });
  it('reports an honest incomplete search instead of claiming a result', () => {
    expect(explore(board(samples[5][1]), 10)).toMatchObject({ complete: false, dist: -1 });
  });
});
describe('hints', () => {
  it('follows the stored route, then re-derives a sound step when the child leaves it', () => {
    const p = board(samples[3][1], 'RDRULDLUL');
    expect(hintMove(p, p.crabs)).toBe(dirOf('R'));
    const away = ([0, 1, 2, 3] as Dir[]).map(d => slide(p, p.crabs, d)).filter(s => s !== p.crabs && nextOnRoute(p, s) === null && explore(p, 200_000, s).dist > 0);
    expect(away.length).toBeGreaterThan(0);
    const wandered = away[0];
    const step = hintMove(p, wandered);
    expect(step).not.toBeNull();
    const to = slide(p, wandered, step as Dir);
    expect(explore(p, 200_000, to).dist).toBe(explore(p, 200_000, wandered).dist - 1);
  });
  it('tells a dead end apart from a search that ran out of budget', () => {
    const p = board(['A # . .', '# . . .', '. . . .', '. . . a']);
    expect(shortestRoute(p, p.crabs).status).toBe('stuck');
    expect(shortestRoute(board(samples[5][1]), board(samples[5][1]).crabs, 2).status).toBe('budget');
  });
});
describe('board shading', () => {
  it.each([4, 5, 6, 7])('alternates along rows and columns at board size %i', size => {
    for (let c = 0; c < size * size; c++) {
      if ((c + 1) % size) expect(lightTile(c, size)).not.toBe(lightTile(c + 1, size));
      if (c + size < size * size) expect(lightTile(c, size)).not.toBe(lightTile(c + size, size));
    }
  });
});
describe('board data', () => {
  it('round-trips the compact tuple form and refuses bad boards', () => {
    const p = board(samples[5][1], 'UR');
    expect(tuplePuzzle(JSON.parse(JSON.stringify(puzzleTuple(p))))).toEqual(p);
    expect(tuplePuzzle([8, '', '1', '2', ''])).toBeNull();
    expect(tuplePuzzle([4, '', '1', '1', ''])).toBeNull();
    expect(tuplePuzzle([4, '0', '0', '2', ''])).toBeNull();
    expect(validPuzzle({ ...p, route: 'X' })).toBe(false);
  });
  it('keeps the cell alphabet decodable and the state key injective', () => {
    expect(cellsText([0, 10, 48])).toHaveLength(3);
    const keys = new Set<number>();
    for (let a = -1; a < 49; a += 7) for (let b = -1; b < 49; b += 7) keys.add(crabsKey([a, b, 0, 5]));
    expect(keys.size).toBe(64);
  });
  it('does not rebuild its grid between slides on the same board', () => {
    const p = board(samples[4][1]), g = gridOf(p);
    expect(slideOn(g, p.crabs, 1)).toEqual(slide(p, p.crabs, 1));
  });
});
