import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { slipTideAdapter, rungRules } from '../src/puzzles/adapters/slip-tide';
import { engine, dealFresh, finishedBoard, markHelped, nextBoard, resetBoard, rowPuzzle, setFor, startRound, swipeBoard, undoBoard, validSlip, ROUND, UNDO_LIMIT, type SlipState } from '../src/learn/games/slip-tide/engine';
import { dirOf, explore, homeAll, needsStopper, puzzleTuple, tuplePuzzle, type Dir } from '../src/learn/games/slip-tide/rules';
import sets from '../src/learn/games/slip-tide/sets.generated.json';
import { certify } from '../src/puzzles/checks';
import { slipTideFamily, rungs, drawBoard } from '../scripts/puzzles/families/slip-tide';
import { decodeRow } from '../src/puzzles/descriptor';
import { registration, puzzles, HELP, RESET, UNDO, type Action, type Payload } from '../src/learn/games/slip-tide/challenge';
import { emptyChallenge, type ChallengeSession } from '../src/state/challenge';
import { readCatalog, productionDirs, readPackText } from '../scripts/puzzles/pipeline';
import { parsePack } from '../src/puzzles/bank';

const rng = (() => { let x = 7; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; })();
const route = (s: SlipState) => [...tuplePuzzle(s.puzzles[s.index])!.route].map(dirOf);
const solve = (s: SlipState) => route(s).reduce((st, d) => swipeBoard(st, d), s);
describe('School round', () => {
  it('deals four boards, plays them through their stored routes and finishes', () => {
    let s = startRound(4, rng);
    expect(s.puzzles).toHaveLength(ROUND);
    expect(validSlip(s)).toBe(true);
    for (let i = 0; i < ROUND; i++) {
      s = solve(s);
      expect(finishedBoard(s)).toBe(true);
      expect(engine.outcome(s, { mode: 'solo', pace: 'easy' })).toBeNull();
      s = nextBoard(s);
      expect(validSlip(s)).toBe(true);
    }
    expect(engine.outcome(s, { mode: 'solo', pace: 'easy' })).toBe('done');
    expect(s.done).toHaveLength(ROUND);
    s.done.forEach(([steps, par]) => expect(steps).toBe(par));
  });
  it('makes Undo and Reset free and exact', () => {
    let s = startRound(5, rng);
    const before = s.crabs, first = route(s)[0];
    s = swipeBoard(s, first);
    expect(s.steps).toBe(1);
    const undone = undoBoard(s);
    expect(undone.crabs).toEqual(before);
    expect(undone.steps).toBe(0);
    s = resetBoard(swipeBoard(s, 3));
    expect(s.crabs).toEqual(before);
    expect(s.resets).toBe(1);
    expect(undoBoard(s)).toBe(s);
    expect(resetBoard(s)).toBe(s);
  });
  it('holds undo to a bound over a long wandering round', () => {
    let s = startRound(5, rng);
    for (let i = 0; i < 300; i++) { const d = ((i * 3 + 1) % 4) as Dir; s = swipeBoard(s, d); }
    expect(s.undo.length).toBeLessThanOrEqual(UNDO_LIMIT);
    expect(validSlip(s)).toBe(true);
  });
  it('rejects forged rounds', () => {
    const s = startRound(3, rng);
    expect(validSlip({ ...s, crabs: s.crabs.map(c => (c === -1 ? c : 999)) })).toBe(false);
    expect(validSlip({ ...s, level: 7 })).toBe(false);
    expect(validSlip({ ...s, puzzles: s.puzzles.slice(1) })).toBe(false);
    expect(validSlip({ ...s, crabs: [...tuplePuzzle(s.puzzles[0])!.pools] })).toBe(false);
    expect(validSlip({ ...s, undo: Array(UNDO_LIMIT + 1).fill(s.crabs) })).toBe(false);
  });
  it('a fresh deal changes the board, keeps the position in the round and marks nothing', () => {
    const s = startRound(2, rng), next = dealFresh(markHelped(s), rng);
    expect(next.puzzles[0]).not.toEqual(s.puzzles[0]);
    expect(next.helped).toBe(false);
    expect(next.index).toBe(s.index);
  });
  it('offers every level with no gating and a name for each rung', () => {
    expect(engine.levelNames).toHaveLength(5);
    expect(engine.modes).toEqual(['solo', 'together']);
    [1, 2, 3, 4, 5].forEach(level => expect(setFor(level).length).toBeGreaterThanOrEqual(ROUND));
  });
});
describe('kit adapter', () => {
  const descriptor = (band: string, row: string) => decodeRow<ReturnType<typeof rowPuzzle>>(row, band, slipTideAdapter)!;
  const { families } = readCatalog(productionDirs), manifest = families.get('slip-tide')!;
  const allRows = manifest.packs.flatMap(p => parsePack(readPackText(productionDirs, p[0]), p, manifest)!.rows.map(row => [manifest.bands[p[5]], row] as const));
  it('has a certified bank at every rung, above the floors', () => {
    slipTideFamily.bands.forEach(b => expect(allRows.filter(([band]) => band === b.id).length).toBeGreaterThanOrEqual(b.floor));
    expect(allRows.length).toBeGreaterThanOrEqual(512);
  });
  it('has run an exhaustive search for every shipped entry and proved each rung promise', () => {
    for (const [band, row] of allRows) {
      const d = descriptor(band, row), claims = slipTideAdapter.claims!(d, 200_000), rule = rungRules[band];
      expect(claims.every(c => c.proven), `${band}: ${JSON.stringify(claims)}`).toBe(true);
      const graph = explore(d.payload);
      expect(graph.complete).toBe(true);
      expect(graph.dist).toBe(d.payload.route.length);
      expect(graph.shortest).toBeLessThanOrEqual(rule.maxShortest);
      if (rule.noDeadEnds) expect(graph.dead).toBe(0);
      if (rule.stopper) expect(needsStopper(d.payload)).toBe(true);
    }
  });
  it('refuses a stored route that is not shortest, and a claim of no dead ends on a board with one', () => {
    const [, row] = allRows.find(([band]) => band === 'e')!, d = descriptor('e', row);
    const longer = { ...d.payload, route: d.payload.route + 'U' };
    expect(slipTideAdapter.claims!({ ...d, payload: longer }, 200_000).find(c => c.id === 'stored-route')!.proven).toBe(false);
    const asA = { ...d, band: 'a', payload: { ...d.payload } };
    expect(explore(asA.payload).dead).toBeGreaterThan(0);
    expect(slipTideAdapter.claims!(asA, 200_000).find(c => c.id === 'no-dead-ends')!.proven).toBe(false);
  });
  it('certifies a candidate end to end through the real gates', () => {
    const ctx = { budget: 200_000, seenExact: new Set<string>(), seenSemantic: new Set<string>() };
    let done = 0;
    for (const band of slipTideFamily.bands.slice(0, 3)) {
      const core = Array.from({ length: 6000 }, (_, i) => slipTideFamily.generate(i + 1, band)).find(Boolean)!;
      const result = certify(slipTideFamily, band, core, ctx);
      expect(result).toMatchObject({ ok: true });
      done++;
    }
    expect(done).toBe(3);
  });
  it('keeps Hint moves through the same slide rule as play', () => {
    const [, row] = allRows.find(([band]) => band === 'd')!, d = descriptor('d', row);
    let s = slipTideAdapter.create(d);
    for (let i = 0; i < d.payload.route.length; i++) {
      const hint = slipTideAdapter.hint!(s, d)!;
      expect(hint).toBe(dirOf(d.payload.route[i]));
      s = slipTideAdapter.reduce(s, hint, d);
    }
    expect(homeAll(s.crabs)).toBe(true);
  });
  it('generates only 7x7 boards at the deep rungs and uses seeded determinism', () => {
    expect(rungs.g.size).toBe(7);
    expect(drawBoard(123, 'g')).toEqual(drawBoard(123, 'g'));
    expect(drawBoard(123, 'g')).not.toEqual(drawBoard(124, 'g'));
  });
});
describe('inline sets come straight from the certified bank', () => {
  const { families } = readCatalog(productionDirs), manifest = families.get('slip-tide')!;
  const bankRows = new Set(manifest.packs.flatMap(p => parsePack(readPackText(productionDirs, p[0]), p, manifest)!.rows));
  it('School and Challenge rows are identical bytes to pack rows', () => {
    const inline = [...Object.values(sets.levels).flat(), ...sets.challenge.flatMap(c => c.rows)];
    expect(inline.every(r => bankRows.has(r))).toBe(true);
  });
});
describe('Challenge replay', () => {
  const start = (p = puzzles[0], dares = [p.dares[0].slot, p.dares[1].slot]) => registration.start(p.ref, 'alex', 'c-1', emptyChallenge(), { supportOff: false, ownRead: false }, dares);
  const play = (s: ChallengeSession, actions: Action[]) => actions.reduce<ChallengeSession>((session, a) => { const next = registration.move(session, a); if (!next) throw new Error(`Refused ${String(a)}`); return next; }, s);
  const moves = (p = puzzles[0]) => [...tuplePuzzle(puzzleTuple(p.descriptor.puzzle))!.route].map(dirOf) as Action[];
  it('earns the shortest and no-undo marks on a perfect clean route', () => {
    const done = play(start(), moves());
    expect(done.result?.event).toBe('independent');
    expect(done.result?.dares.length).toBe(2);
    expect(done.result?.cost).toBe(puzzles[0].par!.upper);
  });
  it('a reset removes the no-reset mark but still accepts the solve', () => {
    const p = puzzles[0], done = play(start(p, [p.dares[1].slot]), [moves(p)[0], RESET, ...moves(p)]);
    expect(done.result?.dares).toEqual([]);
    expect(done.result?.event).toBe('independent');
  });
  it('help makes a helped finish, with no dares, on the real engine evidence', () => {
    const done = play(start(), [HELP, ...moves()]);
    expect(done.result?.event).toBe('helped');
    expect(done.result?.dares).toEqual([]);
  });
  it('rejects a no-op or impossible action and forged payload', () => {
    const s = start();
    expect(registration.move(s, UNDO)).toBeNull();
    expect(registration.move(s, 11 as unknown as Action)).toBeNull();
    expect(registration.move(s, 'undo' as unknown as Action)).toBeNull();
    const payload = s.payload as Payload;
    expect(registration.catalog.codecs.get('slip-tide-replay-v1')!.validate({ ...s, payload: { ...payload, actions: [1, 1, 1, 11] as Action[] } })).toBe(false);
  });
  it('binds every Challenge puzzle to its row hash', () => {
    const inline = sets.challenge.flatMap(c => c.rows);
    expect(puzzles.map(p => p.ref.hash)).toEqual(inline.map(r => createHash('sha256').update(r).digest('hex')));
    expect(new Set(puzzles.flatMap(p => p.dares.map(d => d.slot))).size).toBe(puzzles.length * 2);
  });
  it('declares no-reset as an objective of the engine, not a free-form field', () => {
    expect(puzzles[0].dares.map(d => d.rule.kind)).toEqual(['par', 'pick-up']);
  });
});
describe('board rules visible in the source', () => {
  it('routes both swipe and arrows through the one engine and hides shortest length until a win', () => {
    const source = readFileSync('src/learn/games/slip-tide/schoolBoard.tsx', 'utf8');
    expect(source).toContain('swipeBoard');
    expect(source).toContain('There is a way in');
    expect(source.indexOf('There is a way in')).toBeGreaterThan(source.indexOf('finishedBoard(state)'));
    expect(readFileSync('src/learn/games/slip-tide/field.tsx', 'utf8')).toContain('accessibilityLabel={`Slide all crabs');
  });
  it('keeps the board controls still on a win, and leaves every hint to the shared sliced help', () => {
    const view = readFileSync('src/learn/games/slip-tide/schoolBoard.tsx', 'utf8'), field = readFileSync('src/learn/games/slip-tide/field.tsx', 'utf8');
    expect(view.match(/cheer\(/g)).toHaveLength(1);
    expect(view).toContain("next.index === next.puzzles.length - 1) cheer('big'");
    for (const board of ['schoolBoard', 'challengeBoard']) expect(readFileSync(`src/learn/games/slip-tide/${board}.tsx`, 'utf8')).toContain('<PuzzleHelp');
    expect(field).not.toMatch(/routeSearch|createSearch|storedRouteFrom|setTimeout/);
  });
  it('does not import the slicing-free route search into a frame callback', () => {
    expect(readFileSync('src/learn/games/slip-tide/field.tsx', 'utf8')).not.toMatch(/shortestRoute\(/);
  });
});
