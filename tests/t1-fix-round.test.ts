import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { makeRegistration, puzzles } from '../src/learn/games/logic-lagoon/challenge';
import { emptyChallenge, validChallengeSession } from '../src/state/challenge';
import { createBankLoader } from '../src/puzzles/loader';
import { catalogRoot } from '../src/puzzles/catalog';
import { lagoonLatinAdapter } from '../src/puzzles/adapters/lagoon-latin';
import * as solver from '../src/puzzles/latin/solver';
import { challengeEngine, toAction } from '../src/learn/games/logic-lagoon/challenge-engine';

it('number-first writes carry selection, including an unchanged value', () => {
  const p = puzzles.find(p => p.tier === 4)!;
  let s = challengeEngine.create(p.descriptor, { version: 1 }, { supportOff: false, ownRead: false });
  expect(p.descriptor.puzzle.givens[s.grid.selected]).toBe(0);
  const cell = p.descriptor.puzzle.givens.indexOf(0);
  s = challengeEngine.step(s, ['w', cell, 1], p.descriptor)!.state;
  const a = toAction({ type: 'write', cells: [cell], value: 1, selected: cell });
  expect(a).toEqual(['w', cell, 1, cell]);
});

it('notes-heavy six-wide play stays bounded through corrections, undo, help and Check', async () => {
  const loader = createBankLoader({ root: catalogRoot(), transport: { read: async asset => readFileSync(`src/content/puzzles/assets/${asset}.lipuzzle`, 'utf8') } });
  const game = makeRegistration(() => loader);
  const ref = await game.packed!.choose(261, emptyChallenge());
  const facts = game.catalog.banks.get(261)!;
  if (!('first' in facts)) throw new Error();
  const d = await loader.entry(lagoonLatinAdapter, 'logic-lagoon', facts.first + ref.puzzle);
  let s = game.start(ref, 'family', 'worst-notes', emptyChallenge(), { supportOff: false, ownRead: false }, []);
  const send = (a: unknown) => { const next = game.move(s, a); expect(next, JSON.stringify(a)).not.toBeNull(); s = next!; expect(JSON.stringify(s).length).toBeLessThanOrEqual(3296); };
  send(['p']);
  // Every candidate in every square, then remove/re-add each one twice: >1,000 real edits.
  for (let pass = 0; pass < 5; pass++) for (let cell = 0; cell < 36; cell++) for (let v = 1; v <= 6; v++) send(['w', cell, v]);
  for (let i = 0; i < 36; i++) { send(['u']); send(['d']); }
  send(['p']);
  const answer = solver.search(d.payload, 1).first!;
  for (let cell = 0; cell < 36; cell++) send(['w', cell, answer[cell] % 6 + 1]);
  send(['c']);
  send(['h']);
  // Worst assistance path: clear every wrong cell, then place every answer.
  for (let i = 0; i < 72; i++) { const next = game.move(s, ['v']); if (!next) break; s = next; }
  s = game.move(s, ['c'])!;
  expect(s.result?.event).toBe('helped'); expect(s.result?.awards).toBe(0);
  expect(validChallengeSession(JSON.parse(JSON.stringify(s)), 'family', game.catalog)).toBe(true);
  expect(JSON.stringify(s).length).toBeLessThanOrEqual(4096);
}, 120000);

it('past checks and reveals add no solver work to the next ordinary tap', () => {
  const game = makeRegistration(), p = puzzles.find(p => p.tier === 4)!;
  let s = game.start(p.ref, 'family', 'bounded-work', emptyChallenge(), { supportOff: false, ownRead: false }, []);
  for (let i = 0; i < 12; i++) { s = game.move(s, ['c'])!; s = game.move(s, ['v'])!; }
  const grade = vi.spyOn(solver, 'grade'), hint = vi.spyOn(solver, 'planHint');
  try { expect(game.move(s, ['p'])).not.toBeNull(); expect(grade).not.toHaveBeenCalled(); expect(hint).not.toHaveBeenCalled(); }
  finally { grade.mockRestore(); hint.mockRestore(); }
});

// Required acceptance is blocked until lead/slot-claims lands and the School pool is baked.
it.skip('new School Level 5 rounds use a separate versioned pool without repeats in a round', async () => {
  const { engine, taskAt } = await import('../src/learn/games/logic-lagoon/engine');
  const { optionsAtLevel } = await import('../src/learn/levelOptions');
  const { encodePuzzle } = await import('../src/puzzles/latin/core');
  const old = (await import('../src/learn/games/logic-lagoon/supply-v1.json')).default;
  const challenge = new Set(old.cages.map(row => JSON.stringify(row.puzzle)));
  const o = optionsAtLevel({ mode: 'solo', pace: 'easy' }, 5);
  const s = engine.create(o, { rng: () => 17 / 0xffffffff, skills: {}, starter: 0, today: 1 });
  expect(s.version === 2 && s.catalog).toBe(2);
  if (s.version !== 2) throw new Error();
  const round = new Set();
  for (let index = 0; index < 4; index++) {
    const t = taskAt({ ...s, index }); if (t.kind !== 'grid') throw new Error();
    const encoded = JSON.stringify(encodePuzzle(t.puzzle!));
    expect(challenge.has(encoded)).toBe(false); round.add(encoded);
  }
  expect(round.size).toBe(4);
});

it('Help speech matches its visible instructions, including the open step-up path', async () => {
  const { engine } = await import('../src/learn/games/logic-lagoon/engine');
  const speech = JSON.parse(readFileSync('scripts/learn/t1-logic-lagoon.json', 'utf8'));
  expect(engine.helpAudio).toBe('logic-lagoon-help-v2');
  expect(speech[engine.helpAudio!]).toBe(engine.help);
  expect(engine.help).toContain('Level 4 is open');
});

it('legacy replay drafts upgrade without losing original help, misses, notes or history', () => {
  const game = makeRegistration(), puzzle = puzzles.find(p => p.tier === 4)!;
  const fresh = game.start(puzzle.ref, 'family', 'legacy-replay', emptyChallenge(), { supportOff: false, ownRead: false }, []);
  const cell = puzzle.descriptor.puzzle.givens.indexOf(0);
  const old = { ...fresh, payload: { version: 1, initial: { version: 1 }, options: { supportOff: false, ownRead: false }, firstSolutions: [], actions: [['c'], ['h'], ['p'], ['w', cell, 2]] } };
  const original = JSON.stringify(old);
  expect(validChallengeSession(old, 'family', game.catalog)).toBe(true);
  const next = game.move(old, ['p'])!;
  expect(next).not.toBeNull(); expect((next.payload as { version: number }).version).toBe(2);
  expect(game.completionFacts!(next)).toEqual({ helpUsed: true, failed: true });
  expect(JSON.stringify(old)).toBe(original);
  expect(validChallengeSession(JSON.parse(JSON.stringify(next)), 'family', game.catalog)).toBe(true);
});

it('clue-aware singles make progress but stall on most cages and the hardest arrows', async () => {
  const { clueSinglesBot } = await import('../scripts/puzzles/logic-lagoon/clue-bot');
  const { decodeRow } = await import('../src/puzzles/descriptor');
  const counts = [];
  for (const [bank, band] of [[260, 'cages'], [261, 'wide-cages'], [262, 'marks-only']] as const) {
    let solved = 0, progressed = 0;
    for (const line of readFileSync(`src/content/puzzles/assets/p${bank}.lipuzzle`, 'utf8').trim().split('\n').slice(1)) {
      const p = decodeRow(line, band, lagoonLatinAdapter)!.payload, bot = clueSinglesBot(p);
      solved += Number(bot.solved); progressed += Number(bot.placements > 0);
    }
    counts.push({ bank, solved, progressed });
  }
  expect(counts[0].solved).toBeLessThan(100); expect(counts[1].solved).toBeLessThan(10); expect(counts[2].solved).toBeLessThan(200);
  expect(counts[0].progressed).toBeGreaterThan(0); expect(counts[1].progressed).toBeGreaterThan(0);
});

it('picture-rung hints use picture words, including clashes and revealed placements', async () => {
  const { hint, taskAt, boardAt, move } = await import('../src/learn/games/logic-lagoon/engine');
  const state = { version: 2 as const, catalog: 1 as const, level: 2, seed: 17, index: 0, total: 4 as const, board: null, helped: false };
  expect(hint(state).reason).not.toMatch(/\bnumber(s)?\b/);
  expect(hint(state).reason).toContain('picture');
  const { lagoonCue } = await import('../src/learn/games/logic-lagoon/teaching');
  const t = taskAt(state); if (t.kind !== 'grid') throw new Error();
  const cue = lagoonCue(t.puzzle!, boardAt(state, t.puzzle!).values, t.symbols);
  expect(cue.show).toMatch(/^(shell|fish|star) goes/);
  const cell = t.givens.indexOf(0), wrong = move(state, { type: 'write', cells: [cell], value: t.solution[cell] % 3 + 1 });
  const clash = lagoonCue(t.puzzle!, boardAt(wrong, t.puzzle!).values, t.symbols);
  expect(clash.think).not.toMatch(/\bnumber(s)?\b|^[1-3] is in/);
});

it('loading the Challenge registration does not build or solve teaching samples', async () => {
  vi.resetModules();
  const solver = await import('../src/puzzles/latin/solver');
  const grade = vi.spyOn(solver, 'grade'), search = vi.spyOn(solver, 'search');
  try {
    const { puzzles } = await import('../src/learn/games/logic-lagoon/challenge');
    expect(puzzles).toHaveLength(20);
    expect(grade).not.toHaveBeenCalled(); expect(search).not.toHaveBeenCalled();
  } finally { grade.mockRestore(); search.mockRestore(); }
});

it('a recent checkpoint remains resumable after packed descriptor cache churn', async () => {
  const loader = createBankLoader({ root: catalogRoot(), transport: { read: async asset => readFileSync(`src/content/puzzles/assets/${asset}.lipuzzle`, 'utf8') } });
  const game = makeRegistration(() => loader), progress = emptyChallenge();
  const ref = await game.packed!.choose(261, progress);
  const s = game.start(ref, 'family', 'cache-resume', progress, { supportOff: false, ownRead: false }, []);
  for (let i = 1; i <= 15; i++) await game.packed!.choose(261, { ...progress, recent: [[261, i - 1]] });
  await game.packed!.prepare(ref);
  expect(validChallengeSession(s, 'family', game.catalog)).toBe(true);
  await game.packed!.choose(261, { ...progress, recent: [[261, 15]] });
  await game.packed!.prepare(ref);
  expect(validChallengeSession(s, 'family', game.catalog)).toBe(true);
});

it('preparing an older packed checkpoint reloads its descriptor even if the replay cache still has it', async () => {
  const loader = createBankLoader({ root: catalogRoot(), transport: { read: async asset => readFileSync(`src/content/puzzles/assets/${asset}.lipuzzle`, 'utf8') } });
  const game = makeRegistration(() => loader), progress = emptyChallenge();
  const ref = await game.packed!.choose(261, progress), a = game.start(ref, 'family', 'cache-active', progress, { supportOff: false, ownRead: false }, []);
  let older = a;
  for (let i = 1; i <= 15; i++) { const ref = await game.packed!.choose(261, { ...progress, recent: [[261, i - 1]] }); if (i === 2) older = game.start(ref, 'family', 'cache-older', progress, { supportOff: false, ownRead: false }, []); }
  expect(validChallengeSession(a, 'family', game.catalog)).toBe(true);
  for (let i = 16; i <= 17; i++) await game.packed!.choose(261, { ...progress, recent: [[261, i - 1]] });
  await game.packed!.prepare(older.puzzle);
  expect(validChallengeSession(older, 'family', game.catalog)).toBe(true);
});

it('new small picture clues do not depend on shared solver traversal', async () => {
  const { engine, taskAt } = await import('../src/learn/games/logic-lagoon/engine');
  const { optionsAtLevel } = await import('../src/learn/levelOptions');
  for (const level of [1, 2] as const) {
    const options = optionsAtLevel({ mode: 'solo', pace: 'easy' }, level);
    const s = engine.create(options, { rng: () => 17421 / 0xffffffff, skills: {}, starter: 0, today: 1 });
    expect(s.version === 2 && s.catalog).toBe(2);
    expect(engine.validate(JSON.parse(JSON.stringify(s)), options)).toBe(true);
    const p = taskAt(s); if (p.kind !== 'grid') throw new Error();
    expect(solver.search(p.puzzle!, 2).count).toBe(1);
    expect(solver.grade(p.puzzle!).ceiling).toBe('single');
    const baseline = puzzles.find(p => p.tier === level)!.descriptor.puzzle;
    expect(p.givens.filter(Boolean)).toHaveLength(baseline.givens.filter(Boolean).length);
  }
});

it('legacy proof provenance covers the archived engine used by its adapter', async () => {
  const { logicProofFamily } = await import('../scripts/puzzles/proof-families');
  expect(logicProofFamily().sources).toContain('src/learn/games/logic-lagoon/legacy.ts');
});
