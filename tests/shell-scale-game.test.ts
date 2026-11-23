import { describe, expect, it } from 'vitest';
import {
  answerHolderWeigh, canCheckAnswer, checkAnswer, dealFresh, engine, linksByDefault, linksChoice,
  nextBoard, openGuesserScreen, openHolderScreen, pickOddPearl, puzzleAt, requestHolderWeigh,
  resetDraft, ROUND, setOddDirection, setOrderSlot, setShowLinks, startRandomPractice, startRound,
  swapRoles, undoDraft, validScale, weighSolo, type ScaleState,
} from '../src/learn/games/shell-scale/engine';
import {
  actPickOdd, actPlaceSort, actWeighFor, CHECK, DARE_BANK, DEEP_BANK, HELP, ORDINARY_GROUP_LIMIT,
  ORDINARY_LIMIT, packedBanks, puzzles, registration, RESET, scaleStep, UNDO, type Payload, type State,
} from '../src/learn/games/shell-scale/challenge';
import { shellHelpRules, type PublicScaleView } from '../src/learn/games/shell-scale/help';
import { bestPublicWeighing, emptyOrder, maskOf, provenPar, trueSortOrder, weighOnScale } from '../src/learn/games/shell-scale/rules';
import { scaleSpeechLines } from '../src/learn/games/shell-scale/speech';
import { requestHint } from '../src/puzzles/hints';
import { startSession, validLearnSession } from '../src/learn/session';
import { optionsAtLevel } from '../src/learn/levels';
import { emptyChallenge, type ChallengeSession } from '../src/state/challenge';
import { jsonBytes } from '../src/state/saveBits';
import { productionDirs, readCatalog } from '../scripts/puzzles/pipeline';
import speechLines from '../scripts/learn/o5-shell-scale.json';

const mkRng = (seed = 17) => {
  let x = seed;
  return () => {
    x = (x * 16807) % 2147483647;
    return (x - 1) / 2147483646;
  };
};

function solveSchoolBoard(s: ScaleState): ScaleState {
  const p = puzzleAt(s)!;
  let cur = s;
  // Weigh via optimal public strategy until uniquely deduced, then submit.
  for (let i = 0; i < 12; i++) {
    const w = bestPublicWeighing({ kind: p.kind, n: p.n, cast: p.cast, history: cur.history });
    if (!w) break;
    cur = weighSolo(cur, w.left, w.right);
  }
  if (p.kind === 'sort') {
    const order = trueSortOrder(p);
    order.forEach((shell, slot) => { cur = setOrderSlot(cur, shell, slot); });
  } else {
    cur = pickOddPearl(cur, p.odd, p.kind === 'odd-either' ? p.dir : 'heavy');
    if (p.kind === 'odd-either') cur = setOddDirection(cur, p.dir);
  }
  return checkAnswer(cur);
}

describe('Shell Scale School rounds & random practice', () => {
  it('starts valid 4-board certified rounds for Levels 1-5 with links shown on L1-4 and hidden on L5', () => {
    const rng = mkRng(23);
    for (const level of [1, 2, 3, 4, 5] as const) {
      const s = startRound(level, rng);
      expect(s.puzzles).toHaveLength(ROUND);
      expect(s.showLinks).toBe(linksByDefault(level));
      expect(s.showLinks).toBe(level <= 4);
      expect(validScale(s, level)).toBe(true);
      const session = startSession('shell-scale', { options: optionsAtLevel({ mode: 'solo', pace: 'easy' }, level) }, {}, 10 + level);
      expect(validLearnSession(session, 'shell-scale')).toBe(true);
    }
    // Links toggle allowed from Level 3, blocked on Levels 1-2.
    const l1 = startRound(1, rng);
    expect(linksChoice(1)).toBe(false);
    expect(setShowLinks(l1, false)).toBe(l1);
    const l3 = startRound(3, rng);
    expect(linksChoice(3)).toBe(true);
    expect(setShowLinks(l3, false).showLinks).toBe(false);
  });

  it('plays a full 4-board round to completion, and over-par is NEVER a failure', () => {
    const rng = mkRng(31);
    let s = startRound(2, rng);
    for (let i = 0; i < ROUND; i++) {
      // Deliberately make redundant weighings well past par (3) on board 0.
      if (i === 0) {
        for (let k = 0; k < 6; k++) s = weighSolo(s, 1 << 0, 1 << 1);
        expect(s.history.length).toBe(6);
        expect(s.history.length).toBeGreaterThan(provenPar(puzzleAt(s)!));
      }
      s = solveSchoolBoard(s);
      expect(s.won).toBe(true);
      expect(validScale(s)).toBe(true);
      expect(engine.outcome(s, { mode: 'solo', pace: 'medium' })).toBeNull();
      s = nextBoard(s);
    }
    expect(engine.outcome(s, { mode: 'solo', pace: 'medium' })).toBe('done');
    expect(validScale(s)).toBe(true);
  });

  it('supports open random practice for all sizes (2-6 shells, 9 pearls, 12 pearls) with valid saves', () => {
    const rng = mkRng(41);
    const base = startRound(1, rng);
    const configs = [
      ['sort', 2], ['sort', 3], ['sort', 4], ['sort', 5], ['sort', 6],
      ['odd-heavy', 9], ['odd-either', 12],
    ] as const;
    for (const [kind, n] of configs) {
      let p = startRandomPractice(base, kind, n, rng);
      expect(p.practice).toBe(true);
      expect(puzzleAt(p)?.kind).toBe(kind);
      expect(puzzleAt(p)?.n).toBe(n);
      expect(validScale(p, 1)).toBe(true);
      p = solveSchoolBoard(p);
      expect(p.won).toBe(true);
      expect(validScale(p, 1)).toBe(true);
    }
  });

  it('undo, clear row, dealFresh, and strict malformed-save rejection work safely without mutating input', () => {
    const rng = mkRng(55);
    let s = startRound(3, rng);
    s = setOrderSlot(s, 0, 0);
    const afterOne = s;
    s = setOrderSlot(s, 1, 1);
    expect(undoDraft(s).order).toEqual(afterOne.order);
    expect(resetDraft(s).order.every(x => x === -1)).toBe(true);
    expect(undoDraft(resetDraft(s)).order).toEqual(s.order);

    const fresh = dealFresh(s, rng);
    expect(fresh.puzzles[0].join('|')).not.toBe(s.puzzles[0].join('|'));
    expect(validScale(fresh)).toBe(true);

    // Forged / impossible saves rejected without throwing or mutating.
    expect(validScale({ ...s, won: true })).toBe(false);
    expect(validScale({ ...s, level: 9 })).toBe(false);
    expect(validScale({ ...s, phase: 'holder', pendingWeigh: null })).toBe(false);
    expect(validScale({ ...s, checked: true })).toBe(false);
    const bad = structuredClone(s);
    (bad.puzzles[0] as unknown[])[1] = '4';
    expect(() => validScale(bad)).not.toThrow();
    expect(validScale(bad)).toBe(false);
    expect((bad.puzzles[0] as unknown[])[1]).toBe('4');
  });
});

describe('Scale-Holder co-play (OR-05b)', () => {
  it('runs the full cover-to-holder -> holder -> cover-to-guesser -> guesser handshake and guards against Holder mis-taps', () => {
    const rng = mkRng(77);
    let s = startRound(4, rng); // 9 pearls
    const p = puzzleAt(s)!;
    const left = maskOf([0, 1, 2]), right = maskOf([3, 4, 5]);
    const truth = weighOnScale(p, left, right)!;
    const wrong = truth === '=' ? 'L' : '=';

    // Step 1: Guesser asks for 3 vs 3 -> enters cover-to-holder.
    s = requestHolderWeigh(s, left, right);
    expect(s.phase).toBe('cover-to-holder');
    expect(s.pendingWeigh).toEqual([left, right]);
    expect(canCheckAnswer(s)).toBe(false);
    expect(validScale(s)).toBe(true);

    // Step 2: Holder unlocks secret screen.
    s = openHolderScreen(s);
    expect(s.phase).toBe('holder');
    expect(s.holderPeeked).toBe(true);
    expect(validScale(s)).toBe(true);

    // Untruthful mis-tap is refused without corrupting public history.
    expect(answerHolderWeigh(s, wrong)).toBe(s);

    // Step 3: Holder taps truthful answer -> transitions to cover-to-guesser.
    s = answerHolderWeigh(s, truth);
    expect(s.phase).toBe('cover-to-guesser');
    expect(s.pendingWeigh).toBeNull();
    expect(s.history).toEqual([{ left, right, outcome: truth }]);
    expect(validScale(s)).toBe(true);

    // Step 4: Guesser reveals public result.
    s = openGuesserScreen(s);
    expect(s.phase).toBe('guesser');
    expect(validScale(s)).toBe(true);
  });

  it('swaps roles cleanly on one device — keeps board before any peek, deals fresh board after a peek', () => {
    const rng = mkRng(88);
    const s0 = startRound(3, rng);
    const swappedClean = swapRoles(s0, rng);
    expect(swappedClean.holder).toBe(1);
    expect(swappedClean.puzzles[0]).toEqual(s0.puzzles[0]);

    // Once holder has peeked, swapping deals a fresh board so the new Guesser never sees a secret they already saw!
    let peeked = requestHolderWeigh(s0, 1 << 0, 1 << 1);
    peeked = openHolderScreen(peeked);
    const truth = weighOnScale(puzzleAt(peeked)!, 1 << 0, 1 << 1)!;
    peeked = openGuesserScreen(answerHolderWeigh(peeked, truth));
    const swappedFresh = swapRoles(peeked, rng);
    expect(swappedFresh.holder).toBe(1);
    expect(swappedFresh.history).toHaveLength(0);
    expect(swappedFresh.holderPeeked).toBe(false);
    expect(swappedFresh.puzzles[0]).not.toEqual(peeked.puzzles[0]);
    expect(validScale(swappedFresh)).toBe(true);
  });
});

describe('Challenge replay, Together credit & 500-action reserve safety', () => {
  const start = (index: number, dares: number[] = [], supportOff = false, partner: string | null = null): ChallengeSession => {
    const s = registration.start(puzzles[index].ref, 'alex', `scale-${index}`, emptyChallenge(), { supportOff, ownRead: false }, dares);
    return partner ? { ...s, partner } : s;
  };
  const play = (s: ChallengeSession, actions: number[]) =>
    actions.reduce<ChallengeSession>((at, a) => {
      const next = registration.move(at, a);
      expect(next, `action ${a} at len ${(at.payload as Payload).actions.length}`).not.toBeNull();
      return next!;
    }, s);

  const replayState = (index: number, s: ChallengeSession): State => {
    const d = puzzles[index].descriptor;
    const init: State = {
      puzzle: d.puzzle,
      showLinks: true,
      history: [],
      order: d.puzzle.kind === 'sort' ? emptyOrder(d.puzzle.n) : [],
      oddPick: null,
      oddDir: null,
      stack: [],
      checks: 0,
      misses: 0,
      checked: false,
      won: false,
      actions: 0,
    };
    return (s.payload as Payload).actions.reduce((cur, a) => scaleStep(cur, a)!, init);
  };

  it('registers Deep Water F (6 shells + 12 pearls), dare set C-F, and packed banks 362-365 strictly inside O5 slots 360-374 and dares 2400-2499', () => {
    expect(new Set(puzzles.map(p => p.ref.bank))).toEqual(new Set([DEEP_BANK, DARE_BANK]));
    const dareSlots = puzzles.flatMap(p => p.dares.map(d => d.slot));
    expect(Math.min(...dareSlots)).toBe(2400);
    expect(Math.max(...dareSlots)).toBeLessThanOrEqual(2499);
    expect(new Set(dareSlots).size).toBe(dareSlots.length);

    expect(packedBanks.map(b => b.slot)).toEqual([362, 363, 364, 365]);
    const manifest = readCatalog(productionDirs).families.get('shell-scale')!;
    expect(manifest.packs.reduce((n, p) => n + p[2], 0)).toBe(32);
    for (const b of packedBanks) {
      const row = manifest.packs.find(p => p[0] === b.slot)!;
      expect([row[1], row[2], row[4], row[6]]).toEqual([b.first, b.count, b.packHash, b.rules]);
    }
  });

  it('over-par completes calmly as independent without the par dare mark; at-par earns the par dare mark', () => {
    const idx = puzzles.findIndex(p => p.descriptor.puzzle.kind === 'sort' && p.descriptor.puzzle.n === 4);
    const p = puzzles[idx].descriptor.puzzle;
    const parDare = puzzles[idx].dares.find(d => d.rule.kind === 'par')!;

    // Over par (extra redundant weighings): still wins cleanly, no par dare mark, calm encouraging completionText!
    let over = start(idx, [parDare.slot]);
    const extraWeighs = Array.from({ length: 7 }, () => actWeighFor(p, 1 << 0, 1 << 1));
    const order = trueSortOrder(p as Extract<typeof p, { kind: 'sort' }>);
    over = play(over, [...extraWeighs, ...order.map((shell, slot) => actPlaceSort(shell, slot)), CHECK]);
    expect(over.result).toMatchObject({ event: 'independent', dares: [], cost: 7 });
    expect(registration.completionText?.(over.puzzle, over.result!, null)).toMatch(/The tide thinks it can be done in 5/);

    // At par (<= 5 weighings): wins AND earns the par dare mark!
    let atPar = start(idx, [parDare.slot]);
    atPar = play(atPar, [actWeighFor(p, 1 << 0, 1 << 1), ...order.map((shell, slot) => actPlaceSort(shell, slot)), CHECK]);
    expect(atPar.result).toMatchObject({ event: 'independent', dares: [parDare.slot] });
  });

  it('Together credit (PLAN §8) marks event "together" even when Help is used, never "helped"', () => {
    const idx = puzzles.findIndex(p => p.descriptor.puzzle.kind === 'odd-heavy');
    const p = puzzles[idx].descriptor.puzzle as Extract<typeof puzzles[number]['descriptor']['puzzle'], { kind: 'odd-heavy' }>;
    let s = start(idx, [], false, 'mom');
    s = play(s, [HELP, actPickOdd(p.odd, 'heavy', true), CHECK]);
    expect(s.result?.event).toBe('together');
  });

  it('STRESS: 6-shell sort with repeated weighings, Undo, Reset, missed Checks, and saturated Help up to 486 actions NEVER blocks completion', async () => {
    const idx = puzzles.findIndex(p => p.descriptor.puzzle.kind === 'sort' && p.descriptor.puzzle.n === 6);
    expect(idx).toBeGreaterThanOrEqual(0);
    const p = puzzles[idx].descriptor.puzzle as Extract<typeof puzzles[number]['descriptor']['puzzle'], { kind: 'sort' }>;
    let s = start(idx);

    // 1. Place a deliberately WRONG full order, trigger missed Check, Undo, Reset, and saturate Help + repeated weighings up to ORDINARY_LIMIT (486).
    const trueOrd = trueSortOrder(p);
    const wrongOrd = [...trueOrd];
    [wrongOrd[0], wrongOrd[1]] = [wrongOrd[1], wrongOrd[0]];
    s = play(s, wrongOrd.map((sh, sl) => actPlaceSort(sh, sl)));
    s = play(s, [CHECK]); // miss 1
    expect(s.result).toBeNull();
    s = play(s, [UNDO, RESET]);
    s = play(s, wrongOrd.map((sh, sl) => actPlaceSort(sh, sl)));
    // Saturate repeated HELP calls — idempotentHelp coalesces repeats so only 1 HELP action is stored!
    for (let h = 0; h < 15; h++) s = play(s, [HELP]);
    // Spam repeated weighings of (0, 1) until hitting the exact ordinary limit (486).
    while ((s.payload as Payload).actions.length < ORDINARY_LIMIT) {
      s = play(s, [actWeighFor(p, 1 << 0, 1 << 1)]);
    }
    expect((s.payload as Payload).actions.length).toBe(ORDINARY_LIMIT);
    // Ordinary weighing is now cleanly gated.
    expect(registration.move(s, actWeighFor(p, 1 << 2, 1 << 3))).toBeNull();

    // Even trigger one more missed Check right at the 486 boundary!
    s = play(s, [CHECK]);
    expect(s.result).toBeNull();

    // 2. Drive real public-knowledge requestHint('one-step') to deduce all 6 shells and place them, even spamming Checks between placements!
    const ac = new AbortController();
    let guard = 0;
    while (!s.result && guard++ < 40) {
      const st = replayState(idx, s);
      const view: PublicScaleView = { kind: p.kind, n: p.n, cast: p.cast, history: st.history, order: st.order, oddPick: null, oddDir: null };
      const rules = shellHelpRules(view);
      const res = await requestHint(rules, view, 'one-step', ac.signal);
      if (res.status === 'route' && res.actions.length) {
        const a = res.actions[0];
        if (a.kind === 'weigh') s = play(s, [actWeighFor(p, a.left, a.right, true)]);
        else if (a.kind === 'place-sort') s = play(s, [actPlaceSort(a.item, a.slot, true)]);
      } else {
        s = play(s, [CHECK]);
      }
    }
    expect(s.result).toMatchObject({ event: 'helped', dares: [] });
    expect((s.payload as Payload).actions.length).toBeLessThanOrEqual(512);
    expect(jsonBytes(s)).toBeLessThanOrEqual(4096);
  });

  it('STRESS: 12-pearl heavy-or-light with repeated group weighings, misses, Undo, and saturated Help up to byte/action limit NEVER blocks completion', async () => {
    const idx = puzzles.findIndex(p => p.descriptor.puzzle.kind === 'odd-either' && p.descriptor.puzzle.n === 12);
    expect(idx).toBeGreaterThanOrEqual(0);
    const p = puzzles[idx].descriptor.puzzle as Extract<typeof puzzles[number]['descriptor']['puzzle'], { kind: 'odd-either' }>;
    let s = start(idx);

    const wrongPearl = (p.odd + 1) % 12;
    s = play(s, [actPickOdd(wrongPearl, 'heavy'), CHECK, UNDO, actPickOdd(wrongPearl, 'light')]);
    for (let h = 0; h < 10; h++) s = play(s, [HELP]);
    const bigL = maskOf([0, 1, 2, 3, 4, 5]), bigR = maskOf([6, 7, 8, 9, 10, 11]);
    for (let k = 0; k < ORDINARY_GROUP_LIMIT + 50; k++) {
      const next = registration.move(s, actWeighFor(p, bigL, bigR));
      if (!next) break;
      s = next;
    }
    // Now complete via real public-knowledge requestHint + Check!
    const ac = new AbortController();
    let guard = 0;
    while (!s.result && guard++ < 15) {
      const st = replayState(idx, s);
      const view: PublicScaleView = { kind: p.kind, n: p.n, cast: p.cast, history: st.history, order: [], oddPick: st.oddPick, oddDir: st.oddDir };
      const res = await requestHint(shellHelpRules(view), view, 'one-step', ac.signal);
      if (res.status === 'route' && res.actions.length) {
        const a = res.actions[0];
        if (a.kind === 'weigh') s = play(s, [actWeighFor(p, a.left, a.right, true)]);
        else if (a.kind === 'pick-odd') s = play(s, [actPickOdd(a.pearl, a.dir, true)]);
      } else {
        s = play(s, [CHECK]);
      }
    }
    expect(s.result).toMatchObject({ event: 'helped', dares: [] });
    expect((s.payload as Payload).actions.length).toBeLessThanOrEqual(512);
    expect(jsonBytes(s)).toBeLessThanOrEqual(4096);
  });
});

describe('Save catalog & speech staging', () => {
  it('stages every Shell Scale speech line in scripts/learn/o5-shell-scale.json', () => {
    const json = speechLines as Record<string, string>;
    for (const [key, line] of Object.entries(scaleSpeechLines)) {
      expect(json[key], key).toBe(line);
    }
  });

  it('save-catalog.json matches Shell Scale registration banks, dares and contexts', async () => {
    const { execFileSync } = await import('node:child_process');
    expect(() =>
      execFileSync(process.execPath, ['--import', './scripts/puzzles/register.mjs', 'scripts/puzzles/shell-scale-catalog.ts', '--check'], {
        encoding: 'utf8',
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });
});
