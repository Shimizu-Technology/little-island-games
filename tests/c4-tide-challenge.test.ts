import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { ASSIST_ACTIONS, registration } from '../src/learn/games/tide-logic/challenge';
import { FIRST_DARE, TIDE_BANKS, tidePuzzles } from '../src/learn/games/tide-logic/challenge-content';
import { CLEAR, HELP, RUN, UNDO, answerOf, challengeEngine, helpLeft, helped, hintText, missOf, pick, right, setBlock, type Action, type Descriptor, type Payload, type State } from '../src/learn/games/tide-logic/challenge-engine';
import { FRAMES } from '../src/learn/games/tide-logic/rules';
import { emptyChallenge, type ChallengeSession } from '../src/state/challenge';
import { jsonBytes } from '../src/state/saveBits';
vi.mock('../src/challenge/registry.generated', () => ({ challengeEntries: [] }));

const options = { supportOff: false, ownRead: false }, owner = 'learner-1';
type P = (typeof tidePuzzles)[number];
const start = (p: P, dares: number[] = []) => registration.start(p.ref, owner, 'round-1', emptyChallenge(), options, dares);
const move = (s: ChallengeSession, a: Action): ChallengeSession => { const next = registration.move(s, a); if (!next) throw new Error(`refused ${a} after ${(s.payload as Payload).actions.length}`); return next; };
const tryMove = (s: ChallengeSession, a: Action) => registration.move(s, a);
const actions = (s: ChallengeSession) => (s.payload as Payload).actions;
const replayState = (p: P, s: ChallengeSession): State => (s.payload as Payload).actions.reduce((x, a) => challengeEngine.step(x, a, p.descriptor)!.state, challengeEngine.create(p.descriptor, (s.payload as Payload).initial, options));
/** Fills a draft through ordinary edits. */
const fill = (s: ChallengeSession, d: Descriptor, draft: readonly number[]) => draft.reduce((x, o, i) => o < 0 ? x : move(x, d.kind === 'trace' ? pick(i, o as 0 | 1) : setBlock(i, o)), s);
/** A complete draft that is wrong, and a second one, different and also wrong. */
function wrongs(d: Descriptor): [number[], number[]] {
  const a = answerOf(d);
  if (d.kind === 'trace') { const x = [...a]; x[0] = 1 - x[0]; const y = [...a]; y[1] = 1 - y[1]; return [x, y]; }
  const f = FRAMES[d.frame], side = d.frame === 'flip' ? 1 : f.slots.length - 1, x = [...a]; x[side] = 1 - x[side];
  for (let o = 0; o < f.slots[0].options.length; o++) { const y = [...x]; y[0] = o; if (o !== x[0] && !right(d, y)) return [x, y]; }
  throw new Error('no second wrong draft');
}
/** Help, then Run, until the puzzle is solved; every press must be accepted or the attempt would be stuck. */
function finishWithHelp(s: ChallengeSession): ChallengeSession {
  for (let guard = 0; guard < 16 && !s.result; guard++) {
    const next = tryMove(s, HELP) ?? tryMove(s, RUN);
    if (!next) throw new Error(`stuck at ${actions(s).length} actions`);
    s = next;
  }
  expect(s.result).not.toBeNull();
  expect(actions(s).length).toBeLessThanOrEqual(512); expect(jsonBytes(s)).toBeLessThanOrEqual(4096);
  return s;
}
const kinds = (() => {
  const pickOne = (q: (p: P) => boolean) => tidePuzzles.find(q)!;
  return [pickOne(p => p.descriptor.kind === 'write' && p.descriptor.frame === 'three'), pickOne(p => p.descriptor.kind === 'write' && p.descriptor.frame === 'bell'),
    pickOne(p => p.descriptor.kind === 'find' && p.descriptor.frame === 'not'), pickOne(p => p.descriptor.kind === 'find' && p.descriptor.frame === 'flip'), pickOne(p => p.descriptor.kind === 'trace')];
})();

describe('Tide Logic Challenge registration (SC-05, BK-24)', () => {
  it('registers 108 puzzles: Endless Tide banks 245–250 (tiers 1–6) and Deep Water banks 251–254 (tiers climbing 1–6)', () => {
    expect(tidePuzzles).toHaveLength(108);
    expect(TIDE_BANKS).toEqual([245, 246, 247, 248, 249, 250, 251, 252, 253, 254]);
    for (let t = 0; t < 6; t++) { const rows = tidePuzzles.filter(p => p.ref.bank === 245 + t); expect(rows).toHaveLength(10); expect(rows.every(p => p.path === 'endless' && p.tier === t + 1 && p.source.kind === 'endless')).toBe(true); }
    for (let step = 0; step < 4; step++) { const rows = tidePuzzles.filter(p => p.ref.bank === 251 + step); expect(rows.map(p => p.tier)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]); expect(rows.every(p => p.path === 'deep-water')).toBe(true); }
    expect([...registration.catalog.banks.keys()].sort((a, b) => a - b)).toEqual(TIDE_BANKS);
    const ranges = JSON.parse(readFileSync('src/content/puzzles/slot-ranges.json', 'utf8')).banks as { owner: string; first: number; last: number }[];
    const mine = ranges.find(r => r.owner === 'c4-tide-logic')!;
    expect(mine).toEqual({ owner: 'c4-tide-logic', first: 245, last: 259 });
    for (const b of TIDE_BANKS) expect(b >= mine.first && b <= mine.last).toBe(true);
  });
  it('uses dares 650–685 only, once each, on Endless tiers 5–6 and Deep Water tiers 5–6', () => {
    const slots = tidePuzzles.flatMap(p => p.dares.map(d => d.slot));
    expect(slots).toHaveLength(36); expect(new Set(slots).size).toBe(36);
    expect(Math.min(...slots)).toBe(FIRST_DARE); expect(Math.max(...slots)).toBeLessThanOrEqual(799);
    for (const p of tidePuzzles) if (p.dares.length) expect(p.tier).toBeGreaterThanOrEqual(5);
    for (const p of tidePuzzles) for (const d of p.dares) expect(d.rule.kind).toBe(p.descriptor.kind === 'trace' ? 'whole' : 'plan');
  });
  it('is in the committed save catalog exactly as built', () => {
    const catalog = JSON.parse(readFileSync('src/state/save-catalog.json', 'utf8')) as { banks: { slot: number; engine: string; entries: { ordinal: number; hash: string }[] }[]; dares: [number, { bank: number; puzzle: number; kind: string }][]; contexts: string[] };
    for (const slot of TIDE_BANKS) {
      const theirs = catalog.banks.find(b => b.slot === slot)!;
      expect(theirs.engine).toBe('tide-logic');
      expect(theirs.entries).toEqual(tidePuzzles.filter(p => p.ref.bank === slot).map(p => ({ ordinal: slot * 1024 + p.ref.puzzle, hash: p.ref.hash })));
    }
    expect(catalog.dares.filter(([slot]) => slot >= 650 && slot <= 799).map(([slot]) => slot)).toEqual(tidePuzzles.flatMap(p => p.dares.map(d => d.slot)).sort((a, b) => a - b));
    for (const tier of [1, 2, 3, 4, 5, 6]) expect(catalog.contexts).toContain(`tide-${tier}`);
  });
});

describe('the replay engine', () => {
  it('a written rule that sorts the belt wins on its first run, independently, and proves its dare', () => {
    const p = tidePuzzles.find(x => x.dares.length && x.descriptor.kind === 'write')!, d = p.descriptor;
    let s = fill(start(p, [p.dares[0].slot]), d, d.target);
    s = move(s, RUN);
    expect(s.result?.event).toBe('independent'); expect(s.result?.dares).toEqual([p.dares[0].slot]);
  });
  it('a wrong run shows its first wrong catch; an unchanged rerun is refused; a De Morgan twin is a right answer', () => {
    const p = tidePuzzles.find(x => x.descriptor.frame === 'not' && x.descriptor.kind === 'write')!, d = p.descriptor;
    const [bad] = wrongs(d);
    let s = move(fill(start(p), d, bad), RUN);
    const state = replayState(p, s);
    expect(state.miss).toBe(missOf(d, bad)); expect(state.misses).toBe(1); expect(s.result).toBeNull();
    expect(tryMove(s, RUN)).toBeNull();
    // Flip every clue to its opposite word, swap AND and OR, and swap the bucket: the same behaviour.
    const f = FRAMES.not, flip = (o: number) => o >= 7 ? o - 7 : o + 7, twin = [flip(d.target[0]), 1 - d.target[1], flip(d.target[2]), 1 - d.target[3]];
    expect(right(d, twin)).toBe(true); expect(f.slots[0].options[twin[0]]).not.toBe(f.slots[0].options[d.target[0]]);
    s = move(twin.reduce((x, o, i) => o === bad[i] ? x : move(x, setBlock(i, o)), s), RUN);
    expect(s.result?.event).toBe('helped');
  });
  it('tracing: every catch is picked, then one Check; a wrong pick is named and the rest stay', () => {
    const p = tidePuzzles.find(x => x.descriptor.kind === 'trace' && x.dares.length)!, d = p.descriptor, [bad] = wrongs(d);
    let s = move(fill(start(p), d, bad), RUN);
    expect(replayState(p, s).miss).toBe(0);
    s = move(move(s, pick(0, answerOf(d)[0] as 0 | 1)), RUN);
    expect(s.result?.event).toBe('helped'); expect(s.result?.dares).toEqual([]);
    const clean = move(fill(start(p, [p.dares[0].slot]), d, answerOf(d)), RUN);
    expect(clean.result?.event).toBe('independent'); expect(clean.result?.dares).toEqual([p.dares[0].slot]);
  });
  it('Help climbs Look, One step, Show from the same rules, is refused when it would add nothing, and marks the finish helped', () => {
    for (const p of kinds) {
      const d = p.descriptor;
      let s = start(p);
      s = move(s, HELP); expect(replayState(p, s).hint).toBe(1); expect(hintText(replayState(p, s)).length).toBeGreaterThan(10);
      s = move(s, HELP); expect(replayState(p, s).draft.filter(x => x >= 0).length).toBe(1);
      s = move(s, HELP); expect(right(d, replayState(p, s).draft)).toBe(true);
      expect(tryMove(s, HELP)).toBeNull();
      s = move(s, RUN);
      expect(s.result?.event).toBe('helped');
    }
    // One step reaches the answer one block at a time from any draft.
    for (const p of tidePuzzles) { const d = p.descriptor; let draft = wrongs(d)[1]; for (let i = 0; i < 8 && !right(d, draft); i++) draft = helped(d, draft, 2); expect(right(d, draft)).toBe(true); }
  });
  it('Help does not depend on the draft being wrong: it stays available on a right draft, records assistance, and the finish is never independent', () => {
    for (const p of kinds) {
      const d = p.descriptor, wrong = wrongs(d)[0];
      // The last edit makes the draft right: the Help button must not change state, so it cannot reveal that.
      let s = fill(start(p, p.dares.length ? [p.dares[0].slot] : []), d, wrong);
      const beforeEdit = replayState(p, s);
      expect(helpLeft(beforeEdit)).toBe(true);
      const fixing = answerOf(d).map((o, i) => o === wrong[i] ? -1 : o);
      s = fill(s, d, fixing);
      const state = replayState(p, s);
      expect(right(d, state.draft)).toBe(true); expect(helpLeft(state)).toBe(true);
      // Asking Help on the right draft is accepted, changes no block, and marks the attempt helped.
      s = move(s, HELP);
      const helpedState = replayState(p, s);
      expect(helpedState.draft).toEqual(state.draft); expect(helpedState.hints).toBe(1); expect(hintText(helpedState)).toMatch(/Press (Run|Check)/);
      s = move(s, RUN);
      expect(s.result?.event).toBe('helped'); expect(s.result?.dares).toEqual([]);
    }
  });
  it('a Help-only Keep my plan finish is told it had help, not that it fixed a missed catch', () => {
    const p = kinds[0], d = p.descriptor;
    let s = fill(start(p), d, wrongs(d)[0].map(() => -1));
    s = move(s, HELP);
    const next = registration.restart!(s, 'round-2', emptyChallenge());
    expect((next.payload as Payload).initial.prior).toMatchObject({ runs: 0, hints: 1 });
    const done = move(fill(next, d, d.target.map((o, i) => o === replayState(p, s).draft[i] ? -1 : o)), RUN);
    expect(done.result?.event).toBe('helped');
    const facts = registration.completionFacts!(done)!;
    expect(facts.helpUsed).toBe(true);
    expect(registration.completionText!(p.ref, done.result!, facts)).not.toMatch(/read the bug/);
    // A real miss with no Help still earns the bug-fix line.
    let m = move(fill(start(p), d, wrongs(d)[0]), RUN);
    m = registration.restart!(m, 'round-3', emptyChallenge());
    const fixed = move(fill(m, d, d.target.map((o, i) => o === ((m.payload as Payload).initial.draft ?? [])[i] ? -1 : o)), RUN);
    expect(registration.completionText!(p.ref, fixed.result!, registration.completionFacts!(fixed))).toMatch(/read the bug/);
  });
  it('refuses forged actions and work after the finish', () => {
    const p = kinds[0];
    expect(tryMove(start(p), 164)).toBeNull(); expect(tryMove(start(p), -1)).toBeNull(); expect(tryMove(start(p), pick(0, 0))).toBeNull();
    const won = move(fill(start(p), p.descriptor, p.descriptor.target), RUN);
    expect(tryMove(won, UNDO)).toBeNull();
  });
});

describe('the 500-action reserve never blocks a finish', () => {
  it.each(kinds.map(p => [p.title, p] as [string, P]))('%s: repeated misses until ordinary edits stop, then Help finishes', (_t, p) => {
    const d = p.descriptor, [a, b] = wrongs(d), slot = d.kind === 'trace' ? 1 : 0;
    const to = (draft: number[]) => d.kind === 'trace' ? pick(slot, draft[slot] as 0 | 1) : setBlock(slot, draft[slot]);
    let s = move(fill(start(p), d, a), RUN), misses = 1;
    for (let i = 0; i < 600; i++) { const next = tryMove(s, to(i % 2 ? a : b)); if (!next) break; s = move(next, RUN); misses++; }
    expect(actions(s).length).toBeGreaterThanOrEqual(512 - ASSIST_ACTIONS - 1);
    expect(misses).toBeGreaterThan(200);
    expect(registration.full!(s, to(a))).toBe(true);
    const done = finishWithHelp(s);
    expect(done.result?.event).toBe('helped');
  });
  it.each(kinds.map(p => [p.title, p] as [string, P]))('%s: saturated Help again and again, broken each time, then Help still finishes', (_t, p) => {
    const d = p.descriptor, [a] = wrongs(d), slot = d.kind === 'trace' ? 0 : FRAMES[d.frame].slots.length - 1;
    let s = start(p);
    for (let round = 0; round < 200; round++) {
      let x: ChallengeSession | null = s;
      while (x && (x = tryMove(x, HELP))) s = x;
      const breakIt = tryMove(s, d.kind === 'trace' ? pick(slot, a[slot] as 0 | 1) : setBlock(slot, a[slot]));
      if (!breakIt) break;
      s = breakIt;
    }
    expect(actions(s).length).toBeGreaterThanOrEqual(512 - ASSIST_ACTIONS - 4);
    finishWithHelp(s);
  });
  it.each(kinds.map(p => [p.title, p] as [string, P]))('%s: Undo and Clear churn to the ceiling, then Help finishes', (_t, p) => {
    const d = p.descriptor, [a, b] = wrongs(d);
    const edit = (draft: number[]) => d.kind === 'trace' ? pick(1, draft[1] as 0 | 1) : setBlock(0, draft[0]);
    let s = fill(start(p), d, a);
    // Edit, Undo, Clear, Undo, over and over, until the log refuses every ordinary action.
    for (let round = 0; round < 1000; round++) {
      let moved = false;
      for (const action of [edit(b), UNDO, CLEAR, UNDO, edit(a)]) { const next = tryMove(s, action); if (next) { s = next; moved = true; } }
      if (!moved) break;
    }
    expect([UNDO, CLEAR, edit(a), edit(b)].every(x => tryMove(s, x) === null)).toBe(true);
    expect(actions(s).length).toBeGreaterThanOrEqual(512 - ASSIST_ACTIONS - 2);
    finishWithHelp(s);
  });
  it('Keep my plan: a full attempt restarts with its draft, runs, misses and Help on the record', () => {
    const p = kinds[0], d = p.descriptor, [a, b] = wrongs(d);
    let s = move(fill(start(p), d, a), RUN);
    for (let i = 0; i < 600; i++) { const next = tryMove(s, setBlock(0, (i % 2 ? a : b)[0])); if (!next) break; s = move(next, RUN); }
    s = move(s, HELP);
    const before = replayState(p, s), next = registration.restart!(s, 'round-2', emptyChallenge());
    const payload = next.payload as Payload;
    expect(payload.actions).toEqual([]); expect(payload.initial.draft).toEqual(before.draft);
    expect(payload.initial.prior?.failed).toBe(true); expect(payload.initial.prior?.hints).toBe(1);
    const finished = move(fill(next, d, d.target.map((o, i) => o === before.draft[i] ? -1 : o)), RUN);
    expect(finished.result?.event).toBe('helped');
  });
});
