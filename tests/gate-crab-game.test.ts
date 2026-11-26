import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import {
  canCheckQuiz, checkQuiz, dealFresh, engine, evidenceOf, lockSecretRule, makerRuleOptions,
  markHelped, nextGate, openRulePicker, pickSecretRule, puzzleAt, resetQuiz, ROUND, setBuilderSlot,
  setPhase, setQuizChoice, startGuessing, startRound, submitTestRow, toggleReadRows, undoStep,
  validGateCrab, type GateCrabState,
} from '../src/learn/games/gate-crab/engine';
import {
  CHECK, DARE_BANK, DEEP_BANK, encodeHintQuiz, encodeHintTest, encodeQuiz, HELP, ORDINARY_LIMIT,
  packedBanks, puzzles, registration, RESET, UNDO, type Payload, type State as ChallengeState,
} from '../src/learn/games/gate-crab/challenge';
import { gateCrabHelpRules, type GateView } from '../src/learn/games/gate-crab/help';
import { ALL_SHELL_CODES, evaluateRow, RULE_BY_ID } from '../src/learn/games/gate-crab/rules';
import { GATE_SPEECH_KEYS, shellSpeechKey } from '../src/learn/games/gate-crab/speech';
import { requestHint } from '../src/puzzles/hints';
import { startSession, validLearnSession } from '../src/learn/session';
import { optionsAtLevel } from '../src/learn/levels';
import { homeContinue, shelfGames, toggleShelfFavorite } from '../src/learn/home';
import { learningGroups, learnIds } from '../src/learn/generated/ids';
import { emptySave } from '../src/state/validation';
import { emptyChallenge, validChallengeSession, type ChallengeSession } from '../src/state/challenge';
import { jsonBytes } from '../src/state/saveBits';
import { productionDirs, readCatalog } from '../scripts/puzzles/pipeline';
import speechLines from '../scripts/learn/o3-gate-crab.json';

const rng = (() => {
  let x = 23;
  return () => {
    x = (x * 16807) % 2147483647;
    return (x - 1) / 2147483646;
  };
})();

function solveGate(s: GateCrabState): GateCrabState {
  const p = puzzleAt(s)!;
  const rule = RULE_BY_ID.get(p.ruleId)!;
  let cur = setPhase(s, 'quiz');
  for (let i = 0; i < 5; i++) {
    cur = setQuizChoice(cur, i, evaluateRow(rule, p.len, cur.quizRows[i]));
  }
  return checkQuiz(cur).state;
}

describe('Gate Crab School rounds & counterexamples', () => {
  it('runs a 4-gate round across Levels 1-5 with 2-shell rows on Level 1 and 3-shell rows on Levels 2-5', () => {
    for (let level = 1; level <= 5; level++) {
      let s = startRound(level, rng);
      expect(s.puzzles).toHaveLength(ROUND);
      expect(puzzleAt(s)!.len).toBe(level === 1 ? 2 : 3);
      expect(validGateCrab(s, level)).toBe(true);
      for (let i = 0; i < ROUND; i++) {
        const tested = submitTestRow(setBuilderSlot(s, 0, 3));
        s = tested.state;
        // Duplicate test row is a safe no-op that never adds a test turn.
        const dup = submitTestRow(s);
        expect(dup.duplicate).toBe(true);
        expect(dup.state.tests.length).toBe(s.tests.length);
        s = solveGate(s);
        expect(s.won).toBe(true);
        expect(validGateCrab(s, level)).toBe(true);
        expect(engine.outcome(s, { mode: 'solo', pace: 'medium' })).toBeNull();
        s = nextGate(s);
      }
      expect(engine.outcome(s, { mode: 'solo', pace: 'medium' })).toBe('done');
      expect(validGateCrab(s, level)).toBe(true);
    }
  });

  it('shows a gentle counterexample on a missed quiz check, adds it to evidence, and swaps in a backup row', () => {
    let s = startRound(3, rng);
    const p = puzzleAt(s)!;
    const rule = RULE_BY_ID.get(p.ruleId)!;
    const originalRow0 = s.quizRows[0];
    const actual0 = evaluateRow(rule, p.len, originalRow0);

    // Intentionally flip quiz row 0 while answering rows 1-4 accurately.
    s = setPhase(s, 'quiz');
    s = setQuizChoice(s, 0, !actual0);
    for (let i = 1; i < 5; i++) s = setQuizChoice(s, i, evaluateRow(rule, p.len, s.quizRows[i]));
    expect(canCheckQuiz(s)).toBe(true);

    const res = checkQuiz(s);
    expect(res.correct).toBe(false);
    expect(res.state.won).toBe(false);
    expect(res.state.phase).toBe('test');
    expect(res.state.misses).toBe(1);
    expect(res.state.checks).toBe(1);
    expect(res.state.revealed).toContain(originalRow0);
    expect(evidenceOf(res.state).some(e => e.row === originalRow0 && e.pass === actual0)).toBe(true);
    expect(res.state.counterexample?.row).toBe(originalRow0);
    expect(res.state.counterexample?.actualPass).toBe(actual0);
    expect(res.state.counterexample?.contrastRow).not.toBeNull();
    // Revealed quiz row was replaced with a fresh unseen backup row.
    expect(res.state.quizRows[0]).not.toBe(originalRow0);
    expect(res.state.quizChoices.every(c => c === null)).toBe(true);
    // Undo stack is cleared on miss so Undo cannot re-attach stale answers to the swapped row.
    expect(res.state.undo).toEqual([]);
    expect(undoStep(res.state)).toBe(res.state);
    expect(validGateCrab(res.state, 3)).toBe(true);
  });

  it('supports Undo, Reset, optional row reading toggle, and fresh deal cleanly', () => {
    let s = startRound(2, rng);
    const b0 = [...s.builder];
    s = setBuilderSlot(s, 0, ((b0[0] + 1) % 6) as 0);
    expect(undoStep(s).builder).toEqual(b0);
    s = setQuizChoice(setPhase(s, 'quiz'), 0, true);
    expect(resetQuiz(s).quizChoices[0]).toBeNull();
    s = toggleReadRows(s);
    expect(s.readRows).toBe(true);
    const fresh = dealFresh(s, rng);
    expect(fresh.puzzles[0][2]).not.toBe(s.puzzles[0][2]);
    expect(validGateCrab(fresh, 2)).toBe(true);
  });

  it('rejects malformed or forged saves without throwing or mutating input', () => {
    const base = startSession('gate-crab', { options: optionsAtLevel({ mode: 'solo', pace: 'easy' }, 2) }, {}, 99);
    expect(validLearnSession(base, 'gate-crab')).toBe(true);

    const forgedWin = structuredClone(base);
    (forgedWin.state as GateCrabState).won = true;
    expect(validLearnSession(forgedWin, 'gate-crab')).toBe(false);

    const badTuple = structuredClone(base);
    ((badTuple.state as GateCrabState).puzzles[0] as unknown[])[0] = '3';
    expect(() => validGateCrab(badTuple.state)).not.toThrow();
    expect(validGateCrab(badTuple.state)).toBe(false);
    expect(((badTuple.state as GateCrabState).puzzles[0] as unknown[])[0]).toBe('3');

    // Together stage/won invariants: stage === 'revealed' requires won, and won && together requires stage === 'revealed'.
    const togetherBase = startRound(2, rng, true, 0);
    const forgedRevealedUnwon: GateCrabState = { ...togetherBase, stage: 'revealed', won: false };
    expect(validGateCrab(forgedRevealedUnwon, 2)).toBe(false);

    const solvedTogether = solveGate(startGuessing(lockSecretRule(openRulePicker(togetherBase))));
    expect(solvedTogether.won).toBe(true);
    expect(solvedTogether.stage).toBe('revealed');
    expect(validGateCrab(solvedTogether, 2)).toBe(true);
    const forgedWonWrongStage: GateCrabState = { ...solvedTogether, stage: 'play' };
    expect(validGateCrab(forgedWonWrongStage, 2)).toBe(false);
  });
});

describe('Together Rule-Maker co-play mode & privacy across force-close/resume (OR-03, CV-07)', () => {
  it('enforces maker -> lock -> guesser handover privacy, survives JSON round-trip, never marks helped, and swaps roles', () => {
    let s = startRound(2, rng, true, 0);
    expect(s.together).toBe(true);
    expect(s.maker).toBe(0);
    expect(s.stage).toBe('cover-maker');
    // Cannot test rows while covered!
    expect(submitTestRow(s).state).toBe(s);

    // Maker opens rule picker and chooses a secret rule.
    s = openRulePicker(s);
    expect(s.stage).toBe('pick-rule');
    const choices = makerRuleOptions(2);
    const picked = choices[choices.length - 1];
    s = pickSecretRule(s, picked.id, 1234);
    expect(puzzleAt(s)!.ruleId).toBe(picked.id);

    // Lock secret rule -> handover privacy cover for guesser!
    s = lockSecretRule(s);
    expect(s.stage).toBe('cover-guesser');
    // Simulate force-close & JSON restore at cover-guesser.
    const restoredCover = JSON.parse(JSON.stringify(s)) as GateCrabState;
    expect(validGateCrab(restoredCover, 2)).toBe(true);
    expect(restoredCover.stage).toBe('cover-guesser');
    expect(submitTestRow(restoredCover).state).toBe(restoredCover);

    // Guesser starts testing; Help in Together mode NEVER marks the round as helped!
    s = startGuessing(restoredCover);
    expect(s.stage).toBe('play');
    s = markHelped(s);
    expect(s.helped).toBe(false);

    // Guesser solves -> revealed -> nextGate swaps maker 0 -> 1 and re-engages cover-maker!
    s = solveGate(s);
    expect(s.won).toBe(true);
    expect(s.stage).toBe('revealed');
    const next = nextGate(s);
    expect(next.maker).toBe(1);
    expect(next.stage).toBe('cover-maker');
    expect(validGateCrab(next, 2)).toBe(true);
  });

  it('credits Challenge Together completion as event:"together" even when Help was used (PLAN §8)', () => {
    const target = puzzles[0];
    let s: ChallengeSession = {
      ...registration.start(target.ref, 'alex', 'c-together-1', emptyChallenge(), { supportOff: false, ownRead: false }, []),
      partner: 'sam',
    };
    s = registration.move(s, HELP)!;
    const rule = RULE_BY_ID.get(target.descriptor.puzzle.ruleId)!;
    for (let i = 0; i < 5; i++) {
      s = registration.move(s, encodeQuiz(i, evaluateRow(rule, target.descriptor.puzzle.len, target.descriptor.puzzle.quiz[i])))!;
    }
    s = registration.move(s, CHECK)!;
    expect(s.result?.event).toBe('together');
    expect(validChallengeSession(s, 'alex', registration.catalog, false)).toBe(true);
  });
});

describe('Challenge replay, dares (2100-2199), and 500-action save reserve stress test', () => {
  const start = (index: number, dares: number[] = []): ChallengeSession =>
    registration.start(puzzles[index].ref, 'alex', `gate-${index}`, emptyChallenge(), { supportOff: false, ownRead: false }, dares);
  const play = (s: ChallengeSession, actions: number[]) =>
    actions.reduce<ChallengeSession>((at, a) => {
      const next = registration.move(at, a);
      expect(next, `action ${a}`).not.toBeNull();
      return next!;
    }, s);

  it('uses only reserved banks 310-329 and dare slots 2100-2199, including Pass-the-quiz-in-3-tests dare', () => {
    expect(new Set(puzzles.map(p => p.ref.bank))).toEqual(new Set([DEEP_BANK, DARE_BANK]));
    expect(packedBanks.map(b => b.slot)).toEqual([310, 311, 312, 313, 314, 315]);
    const dareSlots = puzzles.flatMap(p => p.dares.map(d => d.slot));
    expect(Math.min(...dareSlots)).toBe(2100);
    expect(Math.max(...dareSlots)).toBeLessThanOrEqual(2199);
    expect(new Set(dareSlots).size).toBe(dareSlots.length);
    expect(puzzles.some(p => p.dares.some(d => d.label === 'Pass the quiz in 3 tests' && d.rule.kind === 'par' && d.rule.metric === 'turns' && d.rule.max === 3))).toBe(true);

    const manifest = readCatalog(productionDirs).families.get('gate-crab')!;
    for (const b of packedBanks) {
      const row = manifest.packs.find(p => p[0] === b.slot)!;
      expect([row[1], row[2], row[4], row[6]]).toEqual([b.first, b.count, b.packHash, b.rules]);
    }
  });

  it('earns the Pass-the-quiz-in-3-tests dare when solved independently within 3 tests', () => {
    const idx = puzzles.findIndex(p => p.dares.some(d => d.label === 'Pass the quiz in 3 tests'));
    expect(idx).toBeGreaterThanOrEqual(0);
    const p = puzzles[idx].descriptor.puzzle;
    const rule = RULE_BY_ID.get(p.ruleId)!;
    const dare = puzzles[idx].dares.find(d => d.label === 'Pass the quiz in 3 tests')!;
    let s = start(idx, [dare.slot]);
    // Perform 1 test row + sort all 5 quiz rows + CHECK.
    const testRow = Array.from({ length: p.len === 2 ? 36 : 216 }, (_, i) => i).find(r => !p.starters.includes(r))!;
    s = play(s, [
      testRow,
      ...p.quiz.map((r, i) => encodeQuiz(i, evaluateRow(rule, p.len, r))),
      CHECK,
    ]);
    expect(s.result).toMatchObject({ event: 'independent', dares: [dare.slot] });
  });

  it('STRESS: repeated tests, misses, Undo, Reset, and saturated Help NEVER exhaust the 500-action save reserve or block completion', async () => {
    // Pick a hardest Rung F Deep Water puzzle.
    const idx = puzzles.findIndex(p => p.ref.bank === DEEP_BANK && p.descriptor.band === 'f');
    expect(idx).toBeGreaterThanOrEqual(0);
    const p = puzzles[idx].descriptor.puzzle;
    const rule = RULE_BY_ID.get(p.ruleId)!;

    let s = start(idx);
    // 1. Saturate Help 25 times -> idempotentHelp coalesces to 1 action!
    for (let i = 0; i < 25; i++) {
      const next = registration.move(s, HELP);
      expect(next).not.toBeNull();
      s = next!;
    }
    expect((s.payload as Payload).actions.filter(a => a === HELP)).toHaveLength(1);

    // 2. Duplicate starter test row is rejected safely without spending an action.
    expect(registration.move(s, p.starters[0])).toBeNull();

    // 3. Mix wrong quiz checks (misses), Undo, Reset, and quiz toggling right up to ORDINARY_LIMIT!
    // First cause 2 real quiz misses so backups/counterexamples are exercised too.
    for (let miss = 0; miss < 2; miss++) {
      const wrong = [0, 1, 2, 3, 4].map(slot => {
        const row = p.quiz[slot];
        const actual = evaluateRow(rule, p.len, row);
        return encodeQuiz(slot, slot === 0 ? !actual : actual);
      });
      s = play(s, [...wrong, CHECK]);
      expect(s.result).toBeNull();
    }

    // Now churn ordinary quiz edits + UNDO + RESET right up to ORDINARY_LIMIT.
    let flip = true;
    for (let step = 0; step < 600; step++) {
      const action = step % 5 === 4 ? RESET : step % 3 === 2 ? UNDO : encodeQuiz(0, flip);
      if (step % 3 !== 2 && step % 5 !== 4) flip = !flip;
      const next = registration.move(s, action);
      if (!next) {
        if ((s.payload as Payload).actions.length >= ORDINARY_LIMIT) break;
        // If RESET or UNDO was a no-op, toggle slot 0 directly.
        const fallback = registration.move(s, encodeQuiz(0, flip));
        flip = !flip;
        if (!fallback) break;
        s = fallback;
      } else {
        s = next;
      }
    }
    expect((s.payload as Payload).actions.length).toBe(ORDINARY_LIMIT);
    // Ordinary edit is now blocked to protect the reserve!
    expect(registration.move(s, encodeQuiz(1, true))).toBeNull();

    // 4. Now finish the puzzle purely through real public-evidence `requestHint` ('show-me') + CHECK!
    // Reconstruct the exact public view from replay.
    const ev = p.starters.map(r => ({ row: r, pass: evaluateRow(rule, p.len, r) }));
    const curQuiz = [...p.quiz];
    const curChoices: (boolean | null)[] = [null, null, null, null, null];
    // Re-derive live state by running through `gateCrabHelpRules` on the exact current state.
    const { gateCrabStep } = await import('../src/learn/games/gate-crab/challenge');
    let st: ChallengeState = {
      puzzle: p, evidence: ev, tests: [] as number[], quizRows: curQuiz, quizChoices: curChoices,
      stack: [] as (boolean | null)[][], checks: 0, misses: 0, counterexample: null, won: false, actions: 0,
    };
    for (const a of (s.payload as Payload).actions) st = gateCrabStep(st, a)!;

    const ac = new AbortController();
    const view: GateView = { len: p.len, rung: p.rung, evidence: st.evidence, quizRows: st.quizRows, quizChoices: st.quizChoices };
    const helpRes = await requestHint(gateCrabHelpRules(r => evaluateRow(rule, p.len, r), true), view, 'show-me', ac.signal);
    expect(helpRes.status).toBe('route');
    if (helpRes.status !== 'route') return;

    const finishActions = [
      HELP,
      ...helpRes.actions.map(a => (a.kind === 'test' ? encodeHintTest(a.row) : encodeHintQuiz(a.slot, a.pass))),
      CHECK,
    ];
    s = play(s, finishActions);
    expect(s.result).toMatchObject({ event: 'helped', dares: [] });
    expect((s.payload as Payload).actions.length).toBeLessThanOrEqual(512);
    expect(jsonBytes(s)).toBeLessThanOrEqual(4096);
    expect(validChallengeSession(s, 'alex', registration.catalog, false)).toBe(true);
  });
});

describe('Island Original wiring, speech staging, and save catalog', () => {
  it('wires Gate Crab into learnIds, Island Originals group, shelfGames, Favorites, and homeContinue', () => {
    expect(learnIds).toContain('gate-crab');
    expect(learningGroups['gate-crab']).toBe('originals');
    expect(shelfGames.find(g => g.id === 'gate-crab')?.island).toBe('thinking');

    let save = emptySave();
    save = toggleShelfFavorite(save, 'gate-crab');
    expect(save.favoriteGames).toContain('gate-crab');

    const round = startSession('gate-crab', { options: optionsAtLevel({ mode: 'solo', pace: 'easy' }, 1) }, {}, 7);
    save = { ...save, learn: { 'gate-crab': round }, recentLearn: 'gate-crab' };
    expect(homeContinue(save)).toBe('gate-crab');
  });

  it('stages all Gate Crab speech lines and keeps save-catalog.json in sync', () => {
    const lines = speechLines as Record<string, string>;
    for (const key of Object.values(GATE_SPEECH_KEYS)) expect(lines[key], key).toBeTruthy();
    for (const code of ALL_SHELL_CODES) expect(lines[shellSpeechKey(code)], shellSpeechKey(code)).toBeTruthy();

    expect(() =>
      execFileSync(process.execPath, ['--import', './scripts/puzzles/register.mjs', 'scripts/puzzles/gate-crab-catalog.ts', '--check'], {
        encoding: 'utf8',
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });
});
