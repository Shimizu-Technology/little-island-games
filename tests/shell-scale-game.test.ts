import { describe, expect, it } from 'vitest';
import {
  answerHolderWeigh, canCheckAnswer, checkAnswer, dealFresh, engine, exitRandomPractice, HISTORY_LIMIT,
  linksByDefault, linksChoice, markHelped, nextBoard, openGuesserScreen, openHolderScreen, pickOddPearl,
  puzzleAt, requestHolderWeigh, resetDraft, ROUND, scaleTogetherRefs, setOddDirection, setOrderSlot,
  setPartner, setShowLinks, startRandomPractice, startRound, swapRoles, undoDraft, validScale, weighSolo,
  type ScaleState,
} from '../src/learn/games/shell-scale/engine';
import {
  actPickOdd, actPlaceSort, actWeighFor, CHECK, DARE_BANK, DEEP_BANK, HELP, ORDINARY_GROUP_LIMIT,
  ORDINARY_LIMIT, packedBanks, puzzles, registration, RESET, scaleStep, UNDO, type Payload, type State,
} from '../src/learn/games/shell-scale/challenge';
import { shellHelpRules, type PublicScaleView } from '../src/learn/games/shell-scale/help';
import {
  bestPublicWeighing, emptyOrder, maskOf, provenPar, secretKey, trueSortOrder, tuplePuzzle, validPanPair, weighOnScale,
} from '../src/learn/games/shell-scale/rules';
import { scaleSpeechLines } from '../src/learn/games/shell-scale/speech';
import { requestHint } from '../src/puzzles/hints';
import { finished as learnFinished, startSession, validLearnSession } from '../src/learn/session';
import { optionsAtLevel } from '../src/learn/levels';
import { addLearner, selectLearner } from '../src/learn/learners';
import { recordLevelRound } from '../src/learn/levelEvidence';
import { creditSchool, roundStars } from '../src/learn/schoolProgress';
import { emptyChallenge, saveCatalog, type ChallengeSession } from '../src/state/challenge';
import { encodeSave, migrateProfiles, projectProfile } from '../src/state/profiles';
import { applyLearnSave } from '../src/state/learnAction';
import { emptySave, MAX_SAVE_BYTES, parseSave } from '../src/state/validation';
import { jsonBytes, unpack } from '../src/state/saveBits';
import { progressFor, putProgress } from '../src/state/challengeDrafts';
import '../src/challenge/catalog';
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
    const nextSecret = secretKey(tuplePuzzle(swappedFresh.puzzles[1])!);
    expect(nextSecret).not.toBe(secretKey(puzzleAt(peeked)!));
    expect(nextSecret).not.toBe(secretKey(puzzleAt(swappedFresh)!));
    expect(validScale(swappedFresh)).toBe(true);
  });

  it('P1-1: role swap after peek NEVER repeats the seen secret on full-pool Levels 1-2 or 12-pearl Random Practice', () => {
    // Levels 1 and 2 have 4 certified rows total (all 4 used in a round) — even constant RNGs must pick a different secret!
    for (const level of [1, 2] as const) {
      for (const fixed of [0, 0.25, 0.5, 0.75, 0.99]) {
        let s = startRound(level, () => fixed);
        const beforePuzzle = puzzleAt(s)!;
        const beforeTuple = s.puzzles[s.index].join('|');
        const beforeSecret = secretKey(beforePuzzle);
        s = requestHolderWeigh(s, 1 << 0, 1 << 1);
        s = openHolderScreen(s);
        const truth = weighOnScale(beforePuzzle, 1 << 0, 1 << 1)!;
        s = openGuesserScreen(answerHolderWeigh(s, truth));
        const swapped = swapRoles(s, () => fixed);
        const afterPuzzle = puzzleAt(swapped)!;
        expect(swapped.puzzles[swapped.index].join('|')).not.toBe(beforeTuple);
        expect(secretKey(afterPuzzle)).not.toBe(beforeSecret);
        expect(validScale(swapped, level)).toBe(true);
      }
    }

    // 12-pearl Random Practice: across 1,000 sampled swaps + constant RNG, (odd, dir) secret must NEVER repeat!
    const rng = mkRng(2026);
    let rand = startRandomPractice(startRound(4, rng), 'odd-either', 12, rng);
    for (let i = 0; i < 1000; i++) {
      const p = puzzleAt(rand)!;
      const beforeSecret = secretKey(p);
      const l = maskOf([0, 1, 2, 3]), r = maskOf([4, 5, 6, 7]);
      let peeked = openHolderScreen(requestHolderWeigh(rand, l, r));
      peeked = openGuesserScreen(answerHolderWeigh(peeked, weighOnScale(p, l, r)!));
      rand = swapRoles(peeked, i % 50 === 0 ? () => 0 : rng);
      const after = puzzleAt(rand)!;
      expect(secretKey(after)).not.toBe(beforeSecret);
      expect(validScale(rand, 4)).toBe(true);
    }
  });

  it('P1-2: entering, playing, completing, and relaunching Random Practice preserves the certified School draft & Undo stack', () => {
    const rng = mkRng(303);
    let cert = startRound(3, rng);
    cert = weighSolo(cert, 1 << 0, 1 << 1);
    cert = setOrderSlot(cert, 0, 0);
    const afterFirstPlace = cert;
    cert = setOrderSlot(cert, 1, 1);
    expect(cert.history).toHaveLength(1);
    expect(cert.undo).toHaveLength(2);

    // Enter Random Practice -> solve a 12-pearl board -> switch to 6-shell -> simulate JSON save/relaunch -> exit back!
    let prac = startRandomPractice(cert, 'odd-either', 12, rng);
    expect(prac.practice).toBe(true);
    expect(validScale(prac, 3)).toBe(true);
    prac = solveSchoolBoard(prac);
    expect(prac.won).toBe(true);
    expect(engine.outcome(prac, { mode: 'solo', pace: 'hard' })).toBeNull();
    prac = startRandomPractice(prac, 'sort', 6, rng);
    const reloaded = JSON.parse(JSON.stringify(prac)) as ScaleState;
    expect(validScale(reloaded, 3)).toBe(true);

    const restored = exitRandomPractice(reloaded);
    expect(restored.practice).toBe(false);
    expect(restored.certified).toBeUndefined();
    expect(restored.puzzles).toEqual(cert.puzzles);
    expect(restored.history).toEqual(cert.history);
    expect(restored.order).toEqual(cert.order);
    expect(restored.undo).toEqual(cert.undo);
    expect(undoDraft(restored).order).toEqual(afterFirstPlace.order);
    expect(validScale(restored, 3)).toBe(true);

    // R1 compatibility: practice without certified loads cleanly, while malformed certified or certified on non-practice is rejected.
    expect(validScale({ ...prac, certified: undefined }, 3)).toBe(true);
    expect(validScale({ ...prac, certified: null as unknown as undefined }, 3)).toBe(false);
    expect(validScale({ ...prac, certified: {} as never }, 3)).toBe(false);
    expect(validScale({ ...cert, certified: prac.certified }, 3)).toBe(false);
  });

  it('R2 P1-1: Scale-Holder co-play at Levels 1 and 2 awards durable Together credit to BOTH players without mutating catalog or Level 3 banks', () => {
    for (const level of [1, 2] as const) {
      const learners = selectLearner(addLearner(addLearner(undefined, 'Alex', 'a'), 'Maya', 'b'), 'a');
      let save = migrateProfiles({ ...emptySave(), learning: learners });
      const opts = optionsAtLevel({ mode: 'together', pace: 'easy' }, level);
      let session = { ...startSession('shell-scale', { options: opts, names: ['Alex', 'Maya'] }, {}, 190 + level), learner: 'a' };
      save = applyLearnSave(save, 'shell-scale', session, { id: null, epoch: 1 }, 1);

      let st = session.state as ScaleState;
      for (let i = 0; i < ROUND; i++) {
        st = markHelped(st);
        st = solveSchoolBoard(st);
        st = i < ROUND - 1 ? nextBoard(st) : nextBoard(setPartner(st, 'b'));
        const nextSession = { ...session, revision: session.revision + 1, levelHelped: true, state: st };
        const updated = applyLearnSave(save, 'shell-scale', nextSession, { id: session.id, revision: session.revision, epoch: 1 }, 1);
        save = recordLevelRound(save, updated, 'shell-scale', 100);
        session = nextSession;
      }

      // Survives full encode -> parse -> profile projection roundtrip for BOTH players!
      const reloaded = parseSave(encodeSave(save));
      expect(reloaded.schoolTogether?.['shell-scale']?.[level]).toEqual({ completed: 1, rounds: [session.id] });
      const asMaya = projectProfile(reloaded, selectLearner(reloaded.learning, 'b'));
      expect(asMaya.schoolTogether?.['shell-scale']?.[level]).toEqual({ completed: 1, rounds: [session.id] });

      for (const person of ['a', 'b'] as const) {
        expect(reloaded.profiles!.people[person].schoolTogether?.['shell-scale']?.[level]).toEqual({ completed: 1, rounds: [session.id] });
        // School stars, learner notes, signals, recent, and Level 3 bank 362 remain completely untouched!
        expect(reloaded.profiles!.people[person].school?.['shell-scale']).toBeUndefined();
        expect(progressFor(reloaded, person)!.banks.find(b => b[0] === 362)).toBeUndefined();
        expect(progressFor(reloaded, person)!.signals).toEqual([]);
        expect(progressFor(reloaded, person)!.recent).toEqual([]);
      }
      expect(reloaded.school?.['shell-scale']).toBeUndefined();
      expect(reloaded.learning!.people.every(p => Object.keys(p.notes).length === 0)).toBe(true);
      expect(roundStars(session, 3)).toBe(0);

      // Malformed schoolTogether is strictly rejected by save validation.
      const tampered = JSON.parse(encodeSave(reloaded));
      tampered.profiles.people.a.schoolTogether['shell-scale'][String(level)].completed = 0;
      expect(() => parseSave(JSON.stringify(tampered))).toThrow();
    }
  });

  it('R2 P1-2: exact R1 Random Practice save (without certified) loads cleanly without recovery and exits to a fresh certified round', () => {
    const rng = mkRng(606);
    const base = startRound(3, rng);
    const r2Prac = startRandomPractice(base, 'sort', 4, rng);
    // Exact R1-shaped serialized state: identical to R2 practice state except `certified` key is absent.
    const { certified: _dropped, ...r1Raw } = r2Prac;
    const r1Serialized = JSON.parse(JSON.stringify(r1Raw)) as ScaleState;
    expect('certified' in r1Serialized).toBe(false);
    expect(validScale(r1Serialized, 3)).toBe(true);

    const learners = selectLearner(addLearner(undefined, 'Alex', 'a'), 'a');
    const opts = optionsAtLevel({ mode: 'solo', pace: 'hard' }, 3);
    const r1Session = {
      ...startSession('shell-scale', { options: opts }, {}, 77),
      learner: 'a',
      state: r1Serialized,
    };
    expect(validLearnSession(r1Session, 'shell-scale')).toBe(true);

    // Must load cleanly through BOTH legacy v1 save validation and v3 profile save validation (no recovery!).
    const legacyRaw = JSON.stringify({ ...emptySave(), learning: learners, learn: { 'shell-scale': r1Session } });
    expect(() => parseSave(legacyRaw)).not.toThrow();
    const migrated = migrateProfiles(parseSave(legacyRaw));
    const reloaded = parseSave(encodeSave(migrated));
    expect((reloaded.learn?.['shell-scale']?.state as ScaleState).practice).toBe(true);
    expect((reloaded.learn?.['shell-scale']?.state as ScaleState).certified).toBeUndefined();

    // Exiting Random Practice on an R1 save cleanly starts a fresh valid certified round at the same level.
    const exited = exitRandomPractice(reloaded.learn!['shell-scale']!.state as ScaleState, mkRng(707));
    expect(exited.practice).toBe(false);
    expect(exited.certified).toBeUndefined();
    expect(exited.level).toBe(3);
    expect(exited.index).toBe(0);
    expect(exited.showLinks).toBe(r1Serialized.showLinks);
    expect(validScale(exited, 3)).toBe(true);
  });

  it('R3 P2: full-pool L1–L2 swaps change the current secret and avoid restoring a spoiled tuple', () => {
    for (const level of [1, 2] as const) {
      for (const fixed of [0, 0.25, 0.5, 0.75, 0.99]) {
        const rng = () => fixed;
        for (const swapIndex of [0, 1, 2, 3] as const) {
          // Advance to `swapIndex` cleanly.
          let cur = startRound(level, rng);
          for (let k = 0; k < swapIndex; k++) {
            cur = nextBoard(solveSchoolBoard(cur));
          }
          const origPuzzle = puzzleAt(cur)!;
          const origTuple = cur.puzzles[cur.index].join('|');
          const origSecret = secretKey(origPuzzle);

          // Outgoing Holder opens secret and completes handover.
          cur = requestHolderWeigh(cur, 1 << 0, 1 << 1);
          cur = openHolderScreen(cur);
          cur = openGuesserScreen(answerHolderWeigh(cur, weighOnScale(origPuzzle, 1 << 0, 1 << 1)!));

          // Swap with the exact same RNG -> new Holder gets replacement board.
          const swapped = swapRoles(cur, rng);
          const repPuzzle = puzzleAt(swapped)!;
          const repTuple = swapped.puzzles[swapped.index].join('|');
          const repSecret = secretKey(repPuzzle);
          expect(repTuple).not.toBe(origTuple);
          expect(repSecret).not.toBe(origSecret);
          expect(validScale(swapped, level)).toBe(true);

          // New Holder views replacement, Guesser solves it, then Next scale flips roles so former Holder is now Guesser!
          let played = requestHolderWeigh(swapped, 1 << 0, 1 << 1);
          played = openHolderScreen(played);
          played = openGuesserScreen(answerHolderWeigh(played, weighOnScale(repPuzzle, 1 << 0, 1 << 1)!));

          const swappedAgain = swapRoles(JSON.parse(JSON.stringify(played)) as ScaleState, rng);
          expect(swappedAgain.holder).toBe(cur.holder);
          expect(swappedAgain.history).toHaveLength(0);
          expect(swappedAgain.puzzles[swapIndex].join('|')).not.toBe(origTuple);
          expect(swappedAgain.puzzles[swapIndex].join('|')).not.toBe(repTuple);
          expect(secretKey(puzzleAt(swappedAgain)!)).not.toBe(repSecret);
          expect(validScale(swappedAgain, level)).toBe(true);

          if (swapIndex === ROUND - 1) continue;
          played = solveSchoolBoard(played);
          const next = nextBoard(played);
          const followingPuzzle = puzzleAt(next)!;
          const followingTuple = next.puzzles[next.index].join('|');
          const followingSecret = secretKey(followingPuzzle);
          expect(followingTuple).not.toBe(repTuple);
          expect(followingTuple).not.toBe(origTuple);
          expect(followingSecret).not.toBe(repSecret);
          // L1 only has two certified orderings (fallback reuses the older ordering with a different cast);
          // L2 now spans all 6 distinct 3-shell orderings so the next board gets a completely unseen ordering!
          if (level === 1) expect(followingSecret).toBe(origSecret);
          else expect(followingSecret).not.toBe(origSecret);
          expect(validScale(next, level)).toBe(true);
        }
      }
    }
  });

  it('R2 P2-2 & P2-3: Together credit preserves Challenge recent history verbatim and rejects finish atomically on save/per-person admission limits', () => {
    const learners = selectLearner(addLearner(addLearner(undefined, 'Alex', 'a'), 'Maya', 'b'), 'a');
    let save = migrateProfiles({ ...emptySave(), learning: learners });

    // Build 64 valid Challenge recent entries (full cap) from existing catalog banks!
    const validPairs: [number, number][] = [];
    for (const [slot, bank] of saveCatalog.banks) {
      if (bank.cove || slot === 362) continue;
      const count = 'count' in bank ? bank.count : bank.entries.length;
      for (let idx = 0; idx < count && validPairs.length < 64; idx++) validPairs.push([slot, idx]);
      if (validPairs.length >= 64) break;
    }
    expect(validPairs).toHaveLength(64);
    for (const person of ['a', 'b'] as const) {
      const prog = { ...progressFor(save, person)!, recent: validPairs.map(([b, p]) => [b, p] as [number, number]) };
      save = putProgress(save, person, prog);
    }

    const opts = optionsAtLevel({ mode: 'together', pace: 'hard' }, 3);
    let session = { ...startSession('shell-scale', { options: opts, names: ['Alex', 'Maya'] }, {}, 212), learner: 'a' };
    save = applyLearnSave(save, 'shell-scale', session, { id: null, epoch: 1 }, 1);
    let st = session.state as ScaleState;
    for (let i = 0; i < ROUND - 1; i++) {
      st = nextBoard(solveSchoolBoard(st));
      const ns = { ...session, revision: session.revision + 1, state: st };
      save = applyLearnSave(save, 'shell-scale', ns, { id: session.id, revision: session.revision, epoch: 1 }, 1);
      session = ns;
    }
    // Win board 4 but do NOT tap Finish yet -> `beforeFinish` is the unfinished retryable snapshot.
    st = solveSchoolBoard(st);
    const wonBoard4 = { ...session, revision: session.revision + 1, state: st };
    const beforeFinish = applyLearnSave(save, 'shell-scale', wonBoard4, { id: session.id, revision: session.revision, epoch: 1 }, 1);
    const finishSession = { ...wonBoard4, revision: wonBoard4.revision + 1, state: nextBoard(setPartner(st, 'b')) };
    const afterFinish = applyLearnSave(beforeFinish, 'shell-scale', finishSession, { id: wonBoard4.id, revision: wonBoard4.revision, epoch: 1 }, 1);

    // 1. P2-2a: Per-person limit exceeded on existing partner 'b' MUST reject atomically (return unfinished `before`, NO owner-only credit!).
    const hugeSignals: [string, string, number, null, boolean][] = [];
    const hugeBests: [number, number, number][] = [];
    // Push partner 'b' ChallengeProgress past 104_000 bytes with valid-shape data (or invalid oversized progress).
    const bloatedPartnerProg = {
      ...progressFor(beforeFinish, 'b')!,
      signals: hugeSignals,
      bests: hugeBests,
      // Add valid-sized dummy banks/paused? Easiest exact trigger: 26 paused-like bytes or pad valid solutions/bests to exceed 104_000!
      // Valid solutions max 32, bests max 256; paused max 8 * 4096 = 32768; banks up to 512! Fill all catalog non-cove banks to exceed 104_000 bytes!
      banks: [...saveCatalog.banks.values()]
        .filter(b => !b.cove && b.slot !== 362)
        .sort((a, b) => a.slot - b.slot)
        .map(b => {
          const n = 'count' in b ? b.count : b.entries.length;
          return [b.slot, 'A'.repeat(Math.ceil((n * 3) / 6)), 'A'.repeat(Math.ceil((n * 2) / 6))] as [number, string, string];
        }),
    };
    // Make sure partner's progress specifically exceeds 104_000 bytes when bank 362 is added (if already > 104_000 it fails validChallengeProgress too).
    const oversizedPartnerProg = {
      ...bloatedPartnerProg,
      // Use a valid-length string pad in paused if banks alone are under 104_000; either way validChallengeProgress returns false on 'b'!
      nextOrdinal: jsonBytes(bloatedPartnerProg) > 104_000 ? bloatedPartnerProg.nextOrdinal : 0,
    };
    const overPartnerBefore = putProgress(beforeFinish, 'b', oversizedPartnerProg);
    const overPartnerAfter = putProgress(afterFinish, 'b', oversizedPartnerProg);
    const rejectedPartner = recordLevelRound(overPartnerBefore, overPartnerAfter, 'shell-scale', 100);
    expect(rejectedPartner).toBe(overPartnerBefore);
    expect(learnFinished(rejectedPartner.learn!['shell-scale']!)).toBe(false);
    expect(progressFor(rejectedPartner, 'a')!.banks.find(b => b[0] === 362)).toBeUndefined();
    expect(rejectedPartner.schoolTogether).toBeUndefined();

    // 2. P2-2b: Aggregate 2 MB save limit exceeded MUST reject atomically (return unfinished `before`, NOT `after` with dropped credit!).
    const baseBytes = encodeSave(afterFinish).length;
    const padSize = MAX_SAVE_BYTES - baseBytes + 20;
    const fullBefore = { ...beforeFinish, saveRevision: 'r'.repeat(Math.max(8, padSize)) };
    const fullAfter = { ...afterFinish, saveRevision: 'r'.repeat(Math.max(8, padSize)) };
    const rejectedAggregate = recordLevelRound(fullBefore, fullAfter, 'shell-scale', 100);
    expect(rejectedAggregate).toBe(fullBefore);
    expect(learnFinished(rejectedAggregate.learn!['shell-scale']!)).toBe(false);
    expect(progressFor(rejectedAggregate, 'a')!.banks.find(b => b[0] === 362)).toBeUndefined();
    expect(progressFor(rejectedAggregate, 'b')!.banks.find(b => b[0] === 362)).toBeUndefined();

    // 3. Retry once space is available -> succeeds and credits BOTH players, while keeping 64-entry `recent` history 100% UNCHANGED (P2-3)!
    const credited = recordLevelRound(beforeFinish, afterFinish, 'shell-scale', 100);
    expect(credited).not.toBe(beforeFinish);
    expect(learnFinished(credited.learn!['shell-scale']!)).toBe(true);
    for (const person of ['a', 'b'] as const) {
      const prog = progressFor(credited, person)!;
      expect(prog.recent).toEqual(validPairs);
      const bankRow = prog.banks.find(b => b[0] === 362);
      expect(bankRow).toBeDefined();
      expect(unpack(bankRow![1], 6, 3)!.filter(c => c === 3)).toHaveLength(ROUND);
      expect(credited.profiles!.people[person].schoolTogether?.['shell-scale']?.[3]).toEqual({ completed: 1, rounds: [finishSession.id] });
    }
    expect(parseSave(encodeSave(credited))).toBeTruthy();
  });

  it('P1-3: Scale-Holder co-play finish credits BOTH learners with Together (even when helped) and leaves School stars untouched', () => {
    const learners = selectLearner(addLearner(addLearner(undefined, 'Alex', 'a'), 'Maya', 'b'), 'a');
    let save = migrateProfiles({ ...emptySave(), learning: learners });
    const opts = optionsAtLevel({ mode: 'together', pace: 'hard' }, 3);
    let session = { ...startSession('shell-scale', { options: opts, names: ['Alex', 'Maya'] }, {}, 99), learner: 'a' };
    save = applyLearnSave(save, 'shell-scale', session, { id: null, epoch: 1 }, 1);

    // Play all 4 boards with Help marked on every board!
    let st = session.state as ScaleState;
    for (let i = 0; i < ROUND; i++) {
      st = markHelped(st);
      st = solveSchoolBoard(st);
      if (i < ROUND - 1) {
        st = nextBoard(st);
      } else {
        st = nextBoard(setPartner(st, 'b'));
      }
      const nextSession = { ...session, revision: session.revision + 1, levelHelped: true, state: st };
      const updated = applyLearnSave(save, 'shell-scale', nextSession, { id: session.id, revision: session.revision, epoch: 1 }, 1);
      save = recordLevelRound(save, updated, 'shell-scale', 100);
      session = nextSession;
    }

    const refs = scaleTogetherRefs(st);
    expect(refs).toHaveLength(ROUND);
    // Both 'a' and 'b' receive Together completion (code 3, NEVER code 2 helped!) in bank 362.
    for (const person of ['a', 'b'] as const) {
      const prog = progressFor(save, person)!;
      const bankRow = prog.banks.find(b => b[0] === 362);
      expect(bankRow, `${person} bank 362`).toBeDefined();
      const states = unpack(bankRow![1], 6, 3)!;
      for (const r of refs) expect(states[r.puzzle], `${person} puzzle ${r.puzzle}`).toBe(3);
      expect(prog.signals).toEqual([]);
      expect(save.profiles!.people[person].school?.['shell-scale']).toBeUndefined();
    }
    expect(save.school?.['shell-scale']).toBeUndefined();
    expect(roundStars(session, 3)).toBe(0);
    expect(creditSchool({}, session, 100)).toEqual({});
    expect(save.learning!.people.every(p => Object.keys(p.notes).length === 0)).toBe(true);
    expect(parseSave(encodeSave(save))).toBeTruthy();

    // Solo session with forged partner is rejected.
    expect(engine.validate(setPartner(startRound(3, mkRng(7)), 'b'), optionsAtLevel({ mode: 'solo', pace: 'hard' }, 3))).toBe(false);

    // Removed partner: only surviving owner receives credit without throwing.
    let soloSave = migrateProfiles({ ...emptySave(), learning: selectLearner(addLearner(undefined, 'Alex', 'a'), 'a') });
    let s2 = { ...startSession('shell-scale', { options: opts, names: ['Alex', 'Ghost'] }, {}, 101), learner: 'a' };
    soloSave = applyLearnSave(soloSave, 'shell-scale', s2, { id: null, epoch: 1 }, 1);
    let st2 = s2.state as ScaleState;
    for (let i = 0; i < ROUND; i++) {
      st2 = solveSchoolBoard(st2);
      st2 = i < ROUND - 1 ? nextBoard(st2) : nextBoard(setPartner(st2, 'removed-id'));
      const ns = { ...s2, revision: s2.revision + 1, state: st2 };
      const upd = applyLearnSave(soloSave, 'shell-scale', ns, { id: s2.id, revision: s2.revision, epoch: 1 }, 1);
      soloSave = recordLevelRound(soloSave, upd, 'shell-scale', 100);
      s2 = ns;
    }
    const soloBank = progressFor(soloSave, 'a')!.banks.find(b => b[0] === 362);
    expect(soloBank).toBeDefined();
    expect(soloSave.school?.['shell-scale']).toBeUndefined();
    expect(parseSave(encodeSave(soloSave))).toBeTruthy();
  });

  it('P2-1: 200 repeated comparisons never exhaust weighing capacity for manual, Scale-Holder, or Help deduction', async () => {
    const rng = mkRng(404);
    let s = startRound(3, rng); // 4 shells
    for (let i = 0; i < HISTORY_LIMIT; i++) s = weighSolo(s, 1 << 0, 1 << 1);
    expect(s.history).toHaveLength(HISTORY_LIMIT);
    expect(validScale(s, 3)).toBe(true);

    // Scale-Holder request & answer MUST still succeed at HISTORY_LIMIT!
    const p = puzzleAt(s)!;
    const req = requestHolderWeigh(s, 1 << 2, 1 << 3);
    expect(req.phase).toBe('cover-to-holder');
    const held = openHolderScreen(req);
    const ans = answerHolderWeigh(held, weighOnScale(p, 1 << 2, 1 << 3)!);
    expect(ans.phase).toBe('cover-to-guesser');
    const afterHolder = openGuesserScreen(ans);
    expect(afterHolder.history.length).toBeLessThanOrEqual(HISTORY_LIMIT);
    expect(validScale(afterHolder, 3)).toBe(true);

    // Real Help one-step weighing MUST succeed from 200-repeat state and solve the board cleanly!
    const ac = new AbortController();
    let cur = s;
    for (let step = 0; step < 20 && !cur.won; step++) {
      const view: PublicScaleView = {
        kind: p.kind, n: p.n, cast: p.cast, history: cur.history, order: cur.order, oddPick: null, oddDir: null,
      };
      const hint = await requestHint(shellHelpRules(view), view, 'one-step', ac.signal);
      if (hint.status === 'route' && hint.actions.length) {
        const a = hint.actions[0];
        if (a.kind === 'weigh') cur = weighSolo(cur, a.left, a.right);
        else if (a.kind === 'place-sort') cur = setOrderSlot(cur, a.item, a.slot);
      } else {
        cur = checkAnswer(cur);
      }
      expect(cur.history.length).toBeLessThanOrEqual(HISTORY_LIMIT);
      expect(validScale(cur, 3)).toBe(true);
    }
    expect(cur.won).toBe(true);
  });

  it('P2-2: validPanPair and validScale reject out-of-range pan masks like 2**32 + 1 before bitwise coercion', () => {
    const rng = mkRng(505);
    const s = startRound(1, rng); // 2 shells
    const p = puzzleAt(s)!;
    const truthfulOutcome = weighOnScale(p, 1, 2)!;
    const overflowMask = 2 ** 32 + 1; // 4294967297

    expect(validPanPair(p, overflowMask, 2)).toBe(false);
    expect(validPanPair(p, 1, 2 ** 32 + 2)).toBe(false);
    expect(validPanPair(p, 4, 2)).toBe(false);
    expect(validPanPair(p, -1, 2)).toBe(false);
    expect(validPanPair(p, 0, 2)).toBe(false);
    expect(validPanPair(p, NaN, 2)).toBe(false);
    expect(validPanPair(p, 1.5, 2)).toBe(false);

    expect(validScale({ ...s, history: [{ left: overflowMask, right: 2, outcome: truthfulOutcome }] }, 1)).toBe(false);
    expect(validScale({ ...s, phase: 'cover-to-holder', pendingWeigh: [overflowMask, 2] }, 1)).toBe(false);
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
