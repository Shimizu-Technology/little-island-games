import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { engine, taskAt, enter, hint, move, boardAt, revealStep, singleCandidateBot, type LatinState } from '../src/learn/games/logic-lagoon/engine';
import { taskAt as legacyTask } from '../src/learn/games/logic-lagoon/legacy';
import { validLearnSession } from '../src/learn/session';
import { optionsAtLevel } from '../src/learn/levelOptions';
import { decodePuzzle, solved } from '../src/puzzles/latin/core';
import { grade, planHint, rank, search } from '../src/puzzles/latin/solver';
import { independentCount } from '../src/puzzles/latin/independent';
import { decodeRow } from '../src/puzzles/descriptor';
import { lagoonLatinAdapter } from '../src/puzzles/adapters/lagoon-latin';
import { lagoonRungs } from '../scripts/puzzles/logic-lagoon/family';
import { registration, puzzles, makeRegistration } from '../src/learn/games/logic-lagoon/challenge';
import { challengeEngine, type Action } from '../src/learn/games/logic-lagoon/challenge-engine';
import { emptyChallenge, validChallengeSession } from '../src/state/challenge';
import { createBankLoader } from '../src/puzzles/loader';
import { catalogRoot } from '../src/puzzles/catalog';
import frozenRounds from './fixtures/t1-lagoon-rounds.json';
import supply from '../src/learn/games/logic-lagoon/supply-v1.json';
import { creditSchool, type SchoolProgress } from '../src/learn/schoolProgress';
const opts = (n: 1|2|3|4|5) => optionsAtLevel({ mode: 'solo', pace: 'easy' }, n);
const create = (level: 1|2|3|4|5, seed: number) => engine.create(opts(level), { rng: () => seed / 0xffffffff, skills: {}, starter: 0, today: 1 }) as LatinState;
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const rows = (slot: number) => readFileSync(`src/content/puzzles/assets/p${slot}.lipuzzle`, 'utf8').trimEnd().split('\n').slice(1);

describe('T1 shared Latin teacher', () => {
  it('version gates freeze old and new task identities', () => {
    expect(sha(readFileSync('src/learn/games/logic-lagoon/legacy.ts', 'utf8'))).toBe(frozenRounds.legacyEngine);
    for (const [version, level, index, fingerprint] of frozenRounds.rows) {
      const state = version === 1 ? { version: 1 as const, level: +level, seed: 17, index: +index, total: 4 as const, entries: [], helped: false } : { ...create(+level as 1|2|3|4|5, 17), catalog: 1 as const, index: +index };
      expect(sha(JSON.stringify(taskAt(state)))).toBe(fingerprint);
    }
  });
  it('W0-04: 200 sampled six-wide answers are distinct (old generator had six)', () => {
    const oldAnswers = new Set<string>();
    for (let seed = 0; seed < 200; seed++) { const t = legacyTask({ version: 1, level: 4, seed, index: 0, total: 4, entries: [], helped: false }); if (t.kind === 'grid') oldAnswers.add(t.solution.join('')); }
    expect(oldAnswers.size).toBe(6);
    const answers = new Set<string>();
    for (let seed = 0; seed < 200; seed++) { const t = taskAt(create(4, seed)); expect(t.kind).toBe('grid'); if (t.kind === 'grid') answers.add(t.solution.join('')); }
    expect(answers.size).toBe(200);
  });
  it.each([1, 2, 3, 4, 5] as const)('Level %s completes and survives JSON validation with a technique trace', level => {
    for (const seed of [0, 17, 92345]) {
      let s = create(level, seed);
      for (let i = 0; i < 4; i++) {
        const t = taskAt(s); expect(engine.validate(JSON.parse(JSON.stringify(s)), opts(level))).toBe(true);
        if (t.kind === 'balance') { expect(level).toBe(3); s = enter(s, 0, t.answer) as LatinState; continue; }
        const g = grade(t.puzzle!); expect(g.status).toBe('complete');
        if (level <= 3) expect(g.ceiling).toBe('single');
        if (level === 4) { expect(t.size).toBe(6); expect(g.ceiling).toBe('hidden-single'); expect(singleCandidateBot(t.puzzle!)).toBe(false); }
        if (level === 5) { expect(t.puzzle!.givens.some(Boolean)).toBe(false); expect(g.ceiling).toBe('cage-sum'); }
        for (const [cell, v] of t.solution.entries()) if (!t.givens[cell] && s.index === i) s = enter(s, cell, v) as LatinState;
      }
      expect(engine.outcome(s, opts(level))).toBe('done'); expect(engine.validate(s, opts(level))).toBe(true);
    }
  });
  it('notes, undo, selection, help and wrong entries resume without changing the board', () => {
    let s = create(4, 17); const t = taskAt(s); if (t.kind !== 'grid') throw new Error();
    const cell = t.givens.indexOf(0);
    s = move(s, { type: 'select', cell }); s = move(s, { type: 'pencil' });
    s = move(s, { type: 'write', cells: [cell], value: 2 });
    expect(boardAt(s, t.puzzle!).notes[cell]).toBe(2);
    const raw = JSON.stringify(s); expect(engine.validate(JSON.parse(raw), opts(4))).toBe(true); expect(JSON.stringify(s)).toBe(raw);
    const undone = move(s, { type: 'undo' }); expect(boardAt(undone, t.puzzle!).notes[cell]).toBe(0);
    expect(boardAt(move(undone, { type: 'redo' }), t.puzzle!).notes[cell]).toBe(2);
    const h = hint(s); expect(h.state.helped).toBe(true); expect(h.state.version === 2 && h.state.board).toEqual(s.board);
    expect(h.reason).toMatch(/row|column|box|place/i);
    expect(h.value).toBe(t.solution[h.cell]);
    const taught = revealStep(s); expect(boardAt(taught, t.puzzle!).pencil).toBe(true); expect(boardAt(taught, t.puzzle!).values[h.cell]).toBe(h.value); expect(taught.helped).toBe(true);
    expect(engine.validate({ ...s, catalog: 3 }, opts(4))).toBe(false);
    expect(engine.validate({ ...s, board: { ...s.board, selected: 99 } }, opts(4))).toBe(false);
  });
  it('version-1 paused rounds retain their exact grids and stars through Challenge handover', () => {
    const progress: SchoolProgress = { 'logic-lagoon': { 4: { stars: 3, completed: 2, independent: 2, days: [1, 2], rounds: ['earned-a', 'earned-b'] } } };
    for (const level of [1, 2, 3, 4, 5] as const) {
      const state = { version: 1 as const, level, seed: 17, index: 1, total: 4 as const, entries: [], helped: false };
      const old = { game: 'logic-lagoon' as const, version: 1 as const, id: `old-${level}`, revision: 2, options: opts(level), state };
      const raw = JSON.stringify(old), grid = JSON.stringify(legacyTask(state));
      const challenge = registration.start(registration.puzzles[0].ref, 'family', `handover-${level}`, emptyChallenge(), { supportOff: false, ownRead: false }, []);
      expect(validChallengeSession(challenge, 'family', registration.catalog)).toBe(true);
      const resumed = JSON.parse(raw); expect(validLearnSession(resumed)).toBe(true);
      expect(JSON.stringify(taskAt(resumed.state))).toBe(grid); expect(JSON.stringify(old)).toBe(raw);
      expect(creditSchool(progress, resumed)).toBe(progress); expect(progress['logic-lagoon']![4]!.stars).toBe(3);
    }
  });
  it('reused supply points at the exact original descriptors, without new Sudoku receipts', () => {
    for (const pool of Object.values(supply)) for (const row of pool) {
      const [bank, index, hash] = row.source as [number, number, string], line = rows(bank)[index];
      expect(sha(line)).toBe(hash);
      expect(JSON.parse(line)[3]).toEqual(row.puzzle);
    }
    expect(supply.sprout.length + supply.coral.length).toBe(512);
  });
  it('all 500 baked grids are unique, graded in their window and defeat the peer-single bot', () => {
    const seen = new Set<string>();
    for (const [i, rung] of lagoonRungs.entries()) for (const line of rows(260 + i)) {
      const d = decodeRow(line, rung.id, lagoonLatinAdapter)!; expect(d).not.toBeNull();
      const p = d.payload, g = grade(p); expect(g.status).toBe('complete'); if (g.status !== 'complete') throw new Error('Ungraded pack.');
      expect(rank(g.ceiling)).toBeGreaterThanOrEqual(rank(rung.min)); expect(rank(g.ceiling)).toBeLessThanOrEqual(rank(rung.max));
      const c = independentCount(p); expect(c.status).toBe('counted'); expect(c.count).toBe(1);
      expect(p.givens.some(Boolean)).toBe(false); expect(singleCandidateBot(p)).toBe(false); expect(p.size).toBeLessThanOrEqual(6);
      const key = lagoonLatinAdapter.semanticKey(d)!; expect(seen.has(key)).toBe(false); seen.add(key);
      if (rung.id === 'marks-only') expect(p.less.length).toBeGreaterThan(0);
      else expect(p.cages.every(c => c.cells.length <= (p.size === 4 ? 3 : 4))).toBe(true);
    }
    expect(seen.size).toBe(500);
    for (const bank of [260, 261]) expect(rows(bank).some(line => decodeRow(line, bank === 260 ? 'cages' : 'wide-cages', lagoonLatinAdapter)!.payload.cages.some(c => c.cells.length >= 3))).toBe(true);
  });
  it('Challenge waits for Check, reports only a count, and preserves help/miss evidence after undo/reset', () => {
    const puzzle = puzzles.find(p => p.tier === 4)!, d = puzzle.descriptor as Parameters<typeof challengeEngine.create>[0];
    const initial = challengeEngine.initial(d), answer = search(d.puzzle, 1).first!;
    let s = challengeEngine.create(d, initial, { supportOff: false, ownRead: false });
    const cell = d.puzzle.givens.indexOf(0), wrong: Action = ['w', cell, answer[cell] % 6 + 1];
    s = challengeEngine.step(s, wrong, d)!.state; expect(s.wrong).toBeNull(); expect(challengeEngine.inspect(s, d).solved).toBe(false);
    const miss = challengeEngine.step(s, ['c'], d)!; expect(miss.correct).toBe(false); expect(miss.state.wrong).toBeGreaterThan(0);
    s = challengeEngine.step(miss.state, ['u'], d)!.state;
    for (const [i, v] of answer.entries()) if (!d.puzzle.givens[i]) s = challengeEngine.step(s, ['w', i, v], d)!.state;
    expect(solved(d.puzzle, s.grid.values)).toBe(true); expect(challengeEngine.inspect(s, d).solved).toBe(false);
    s = challengeEngine.step(s, ['c'], d)!.state; expect(challengeEngine.inspect(s, d).solved).toBe(true);
    let session = registration.start(puzzle.ref, 'family', 'check-evidence', emptyChallenge(), { supportOff: false, ownRead: false }, puzzle.dares.map(x => x.slot));
    session = registration.move(session, wrong)!; session = registration.move(session, ['c'])!; session = registration.move(session, ['h'])!; session = registration.move(session, ['z'])!;
    for (const [i, v] of answer.entries()) if (!d.puzzle.givens[i]) session = registration.move(session, ['w', i, v])!;
    expect(session.result).toBeNull(); session = registration.move(session, ['c'])!;
    expect(session.result?.event).toBe('helped'); expect(session.result?.dares).toEqual([]); expect(session.result?.awards).toBe(0);
    expect(validChallengeSession(JSON.parse(JSON.stringify(session)), 'family', registration.catalog)).toBe(true);
  });
  it('long attempts retain a complete teaching route and final Check', () => {
    const puzzle = puzzles.find(p => p.tier === 4)!, d = puzzle.descriptor;
    let round = registration.start(puzzle.ref, 'family', 'budget-test', emptyChallenge(), { supportOff: false, ownRead: false }, []);
    for (let i = 0; i < 600; i++) { const next = registration.move(round, ['p']); expect(next).not.toBeNull(); round = next!; }
    expect(registration.move(round, ['p'])).not.toBeNull();
    for (let i = 0; i < 36; i++) { const next = registration.move(round, ['v']); if (!next) break; round = next; }
    round = registration.move(round, ['c'])!;
    expect(round.result?.event).toBe('helped'); expect(JSON.stringify(round).length).toBeLessThanOrEqual(4096);
    expect(validChallengeSession(round, 'family', registration.catalog)).toBe(true);
    expect(d.puzzle.size).toBe(6);
  });
  it('all three real packs load by immutable ref, resume notes, and finish through the registered codec', async () => {
    const loader = createBankLoader({ root: catalogRoot(), transport: { read: async asset => readFileSync(`src/content/puzzles/assets/${asset}.lipuzzle`, 'utf8') } });
    const game = makeRegistration(() => loader);
    for (const b of game.packed!.bands) {
      const facts = registration.catalog.banks.get(b.bank)!;
      if (!('first' in facts)) throw new Error();
      const descriptor = await loader.entry(lagoonLatinAdapter, 'logic-lagoon', facts.first);
      expect(descriptor.ref.bank).toBe(b.bank); expect(grade(descriptor.payload).status).toBe('complete');
      expect(decodePuzzle(lagoonLatinAdapter.encodePayload(descriptor.payload))).toEqual(descriptor.payload);
      expect(planHint(descriptor.payload, descriptor.payload.givens).kind).toBe('place');
      const ref = await game.packed!.choose(b.bank, emptyChallenge());
      let round = game.start(ref, 'family', `pack-${b.bank}`, emptyChallenge(), { supportOff: false, ownRead: false }, []);
      const cell = 1;
      round = game.move(round, ['s', cell])!; round = game.move(round, ['p'])!; round = game.move(round, ['w', cell, 2])!;
      const copy = JSON.parse(JSON.stringify(round)); await game.packed!.prepare(copy.puzzle);
      expect(game.catalog.codecs.get(game.codec)!.validate(copy)).toBe(true);
      round = game.move(copy, ['u'])!; round = game.move(round, ['p'])!;
      const answer = search(descriptor.payload, 1).first!;
      for (const [i, v] of answer.entries()) if (!descriptor.payload.givens[i]) round = game.move(round, ['w', i, v])!;
      expect(round.result).toBeNull(); round = game.move(round, ['c'])!;
      expect(round.result?.event).toBe('independent');
      expect(validChallengeSession(round, 'family', game.catalog)).toBe(true);
    }
  });
});
