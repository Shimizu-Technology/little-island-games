import { describe, expect, it } from 'vitest';
import {
  boardsFor, canCheck, checkSeats, dealFresh, engine, keeperOf, levelTeach, lightsByDefault, nextBoard, passClues, placeItem, puzzleAt, resetSeats, revealClues, ROUND,
  rowPuzzle, setFor, setLights, startRound, teachKindOf, toggleUsed, undoSeat, UNDO_LIMIT, validCanoe, type CanoeState,
} from '../src/learn/games/canoe-seats/engine';
import { accepts, answerOf, countSeatings, emptySeating, items, place, type CanoePuzzle } from '../src/learn/games/canoe-seats/rules';
import { canoeHelpRules, canoeView } from '../src/learn/games/canoe-seats/help';
import { requestHint } from '../src/puzzles/hints';
import { startSession, validLearnSession } from '../src/learn/session';
import { optionsAtLevel } from '../src/learn/levels';
import { registration, puzzles, packedBanks, CHECK, HELP, UNDO, USED, hinted, ORDINARY_LIMIT, lightsBand, DEEP_BANK, DARE_BANK, type Payload } from '../src/learn/games/canoe-seats/challenge';
import { emptyChallenge, type ChallengeSession } from '../src/state/challenge';
import { encodeAction } from '../src/puzzles/adapters/canoe-seats';
import { readCatalog, productionDirs } from '../scripts/puzzles/pipeline';
import { clueKey, friendClueLines } from '../src/learn/games/canoe-seats/speech';
import speechLines from '../scripts/learn/o2-canoe-seats.json';

const rng = (() => { let x = 11; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; })();
/** Seat every item where the clues say, one placement each. */
const solve = (s: CanoeState) => { const answer = answerOf(puzzleAt(s)!)!; return answer.reduce((st, seat, i) => placeItem(st, i, seat), s); };

describe('School rounds', () => {
  it('opens each level with a teaching board for every new kind of clue, then ordinary boards', () => {
    for (let level = 1; level <= 5; level++) {
      const s = startRound(level, rng), kinds = levelTeach[level];
      expect(s.puzzles).toHaveLength(ROUND);
      expect(s.puzzles.slice(0, kinds.length).map(t => teachKindOf(level, t))).toEqual(kinds);
      expect(s.puzzles.slice(kinds.length).every(t => teachKindOf(level, t) === null)).toBe(true);
      expect(validCanoe(s, level)).toBe(true);
      // A returning child on the same level gets four ordinary boards, none from the last round.
      const again = boardsFor(level, rng, s);
      expect(again.teach).toBe(0);
      expect(again.puzzles.filter(t => s.puzzles.some(o => o.join() === t.join()))).toHaveLength(0);
    }
  });
  it('plays a lights-on round to the end: each board wins the moment every clue is true', () => {
    let s = startRound(2, rng);
    for (let i = 0; i < ROUND; i++) {
      s = solve(s);
      expect(s.won).toBe(true);
      expect(validCanoe(s)).toBe(true);
      expect(engine.outcome(s, { mode: 'solo', pace: 'medium' })).toBeNull();
      s = nextBoard(s);
    }
    expect(engine.outcome(s, { mode: 'solo', pace: 'medium' })).toBe('done');
    expect(validCanoe(s)).toBe(true);
  });
  it('Level 5 starts with Check at the end: a miss keeps every seat, counts once and waits for a change', () => {
    let s = startRound(5, rng);
    expect(lightsByDefault(5)).toBe(false);
    expect(s.lights).toBe(false);
    const p = puzzleAt(s)!, answer = answerOf(p)!;
    expect(checkSeats(s)).toBe(s); // nothing seated yet
    // Seat everyone, with two friends swapped.
    const wrong = [...answer]; [wrong[0], wrong[1]] = [wrong[1], wrong[0]];
    s = wrong.reduce((st, seat, i) => placeItem(st, i, seat), s);
    expect(s.won).toBe(false);
    expect(canCheck(s)).toBe(true);
    const missed = checkSeats(s);
    expect(missed).toMatchObject({ checks: 1, misses: 1, checked: true, won: false });
    expect(missed.pos).toEqual(s.pos);
    expect(checkSeats(missed)).toBe(missed);
    expect(validCanoe(missed)).toBe(true);
    const fixed = placeItem(missed, 0, answer[0]);
    expect(fixed.checked).toBe(false);
    const right = checkSeats(fixed);
    expect(right).toMatchObject({ won: true, checks: 2, misses: 1 });
  });
  it('lets a child turn the lights off from Level 3, and never on Levels 1 and 2', () => {
    const one = startRound(1, rng);
    expect(setLights(one, false)).toBe(one);
    const three = startRound(3, rng);
    const dark = setLights(three, false);
    expect(dark.lights).toBe(false);
    expect(validCanoe(dark)).toBe(true);
    expect(validCanoe({ ...one, lights: false })).toBe(false);
    // Turning the lights back on with a correct canoe finishes the board at once.
    const seated = solve(dark);
    expect(seated.won).toBe(false);
    expect(setLights(seated, true).won).toBe(true);
  });
  it('makes Undo, Reset and used marks free, exact and bounded', () => {
    let s = startRound(4, rng);
    const p = puzzleAt(s)!;
    s = placeItem(s, 0, 2);
    const once = s;
    s = placeItem(s, 1, 2);
    expect(undoSeat(s).pos).toEqual(once.pos);
    expect(resetSeats(s).pos.every(x => x === -1)).toBe(true);
    expect(undoSeat(resetSeats(s)).pos).toEqual(s.pos);
    for (let i = 0; i < 300; i++) s = placeItem(s, i % items(p), (i * 3) % p.n);
    expect(s.undo.length).toBeLessThanOrEqual(UNDO_LIMIT);
    expect(validCanoe(s)).toBe(true);
    const marked = toggleUsed(s, p.clues.length - 1);
    expect(marked.used).toBe(1 << (p.clues.length - 1));
    expect(toggleUsed(marked, p.clues.length - 1).used).toBe(0);
    expect(toggleUsed(s, p.clues.length)).toBe(s);
  });
  it('rejects forged or impossible saves whole', () => {
    const s = startRound(3, rng), p = puzzleAt(s)!;
    expect(validCanoe({ ...s, level: 7 })).toBe(false);
    expect(validCanoe({ ...s, won: true })).toBe(false); // not the answer
    expect(validCanoe({ ...s, pos: [0, 0, -1, -1] })).toBe(false);
    expect(validCanoe({ ...s, checked: true })).toBe(false); // a miss needs a complete seating and a counted Check
    expect(validCanoe({ ...s, used: 1 << p.clues.length })).toBe(false);
    expect(validCanoe({ ...s, puzzles: [[4, 1, '0123', 'Sa1,Sb2,Sc3'], ...s.puzzles.slice(1)] })).toBe(false);
    expect(validCanoe({ ...solve(s), won: false })).toBe(false); // lights on would already have finished it
    expect(validCanoe(s, 4)).toBe(false);
  });
  it('rejects coerced tuple types and nested arrays on current and future puzzles during session import without throwing or mutating', () => {
    const base = startSession('canoe-seats', { options: optionsAtLevel({ mode: 'solo', pace: 'easy' }, 3) }, {}, 42);
    expect(validLearnSession(base, 'canoe-seats')).toBe(true);
    const badCurrent = structuredClone(base);
    const currentTuple = (badCurrent.state as CanoeState).puzzles[0] as unknown[];
    currentTuple[0] = String(currentTuple[0]);
    expect(() => validCanoe(badCurrent.state)).not.toThrow();
    expect(validCanoe(badCurrent.state)).toBe(false);
    expect(validLearnSession(badCurrent, 'canoe-seats')).toBe(false);
    expect(currentTuple[0]).toBe('4'); // input is never mutated

    const badFuture = structuredClone(base);
    const futureTuple = (badFuture.state as CanoeState).puzzles[1] as unknown[];
    futureTuple[0] = String(futureTuple[0]);
    expect(() => validCanoe(badFuture.state)).not.toThrow();
    expect(validCanoe(badFuture.state)).toBe(false);
    expect(validLearnSession(badFuture, 'canoe-seats')).toBe(false);

    const nestedCurrent = structuredClone(base);
    ((nestedCurrent.state as CanoeState).puzzles[0] as unknown[])[0] = [4];
    expect(() => validCanoe(nestedCurrent.state)).not.toThrow();
    expect(validCanoe(nestedCurrent.state)).toBe(false);
    expect(validLearnSession(nestedCurrent, 'canoe-seats')).toBe(false);

    const nestedFuture = structuredClone(base);
    const origClues = (nestedFuture.state as CanoeState).puzzles[2][3];
    ((nestedFuture.state as CanoeState).puzzles[2] as unknown[])[3] = [origClues];
    expect(() => validCanoe(nestedFuture.state)).not.toThrow();
    expect(validCanoe(nestedFuture.state)).toBe(false);
    expect(validLearnSession(nestedFuture, 'canoe-seats')).toBe(false);
  });
  it('deals a fresh board of the same kind, keeping a teaching board a teaching board', () => {
    const s = startRound(2, rng), fresh = dealFresh(s, rng);
    expect(fresh.puzzles[0].join()).not.toBe(s.puzzles[0].join());
    expect(teachKindOf(2, fresh.puzzles[0])).toBe(teachKindOf(2, s.puzzles[0]));
    expect(validCanoe(fresh)).toBe(true);
  });
});

describe('Clue keepers', () => {
  it('deals the cards so neither keeper can solve alone, on every School board with two or more clues', () => {
    for (let level = 1; level <= 5; level++) {
      const set = setFor(level);
      for (const row of [...Object.values(set.teach).flat(), ...set.rows]) {
        const p = rowPuzzle(row);
        if (p.clues.length < 2) continue;
        for (const keeper of [0, 1]) {
          const half: CanoePuzzle = { ...p, clues: p.clues.filter((_, i) => keeperOf(i) === keeper) };
          expect((countSeatings(half, 2) as { count: number }).count, row).toBeGreaterThan(1);
        }
      }
    }
  });
  it('hides every card while the device changes hands, and blocks moves under the cover', () => {
    const s = startRound(3, rng), passed = passClues(s);
    expect(passed).toMatchObject({ cover: true, keeper: 1 });
    expect(placeItem(passed, 0, 0)).toBe(passed);
    expect(validCanoe(passed)).toBe(true);
    expect(revealClues(passed)).toMatchObject({ cover: false, keeper: 1 });
  });
  it('restricts Together Help strictly to the active keeper’s visible cards without leaking hidden deductions or combined answers', async () => {
    const s = startRound(3, () => 0.4), p = puzzleAt(s)!;
    expect(s.puzzles[0]).toEqual([4, 1, '3524', 'Fcd,Sc1,Sa3']);
    const visible0 = p.clues.map((_, i) => i).filter(i => keeperOf(i) === 0);
    const rules0Whole = canoeHelpRules(p, true, visible0);
    const rules0Lit = canoeHelpRules(p, false, visible0);
    const blank = canoeView(p, emptySeating(p), true);

    const look0 = rules0Whole.look(blank);
    expect(look0.focus).toEqual(['clue:2']);
    const think0 = rules0Whole.think(blank);
    expect(think0.text).not.toContain('the fish cannot sit in seat 2');
    expect(think0.focus).not.toContain('clue:1');
    expect(think0.focus).not.toContain('cross:2-1');
    expect(think0.focus).toContain('clue:2');

    const ac = new AbortController();
    expect(await requestHint(rules0Whole, blank, 'one-step', ac.signal)).toEqual({ status: 'unavailable' });
    expect(await requestHint(rules0Whole, blank, 'show-me', ac.signal)).toEqual({ status: 'unavailable' });
    expect(await requestHint(rules0Lit, canoeView(p, emptySeating(p), false), 'one-step', ac.signal)).toEqual({ status: 'unavailable' });
    expect(await requestHint(rules0Lit, canoeView(p, emptySeating(p), false), 'show-me', ac.signal)).toEqual({ status: 'unavailable' });
    expect(rules0Whole.unavailable).toMatch(/partner|pass/i);

    // A keeper whose visible cards rule out nothing alone gets a partner prompt rather than a hidden deduction.
    const rulesOnlyFar = canoeHelpRules(p, false, [0]);
    const thinkFar = rulesOnlyFar.think(canoeView(p, emptySeating(p), false));
    expect(thinkFar.focus).toEqual([]);
    expect(thinkFar.text).toMatch(/partner|pass/i);

    // Level 1 (single clue): keeper 1 holds zero clues and never gets keeper 0's card or answer.
    const l1 = startRound(1, rng), p1 = puzzleAt(l1)!;
    const rulesK1 = canoeHelpRules(p1, false, []);
    expect(rulesK1.look(canoeView(p1, emptySeating(p1), false)).focus).toEqual([]);
    expect(await requestHint(rulesK1, canoeView(p1, emptySeating(p1), false), 'show-me', ac.signal)).toEqual({ status: 'unavailable' });
  });
});

describe('Challenge replay', () => {
  const start = (index: number, dares: number[] = [], supportOff = false): ChallengeSession => registration.start(puzzles[index].ref, 'alex', `c-${index}`, emptyChallenge(), { supportOff, ownRead: false }, dares);
  const play = (s: ChallengeSession, actions: number[]) => actions.reduce<ChallengeSession>((at, a) => { const next = registration.move(at, a); expect(next, `action ${a}`).not.toBeNull(); return next!; }, s);
  const answerActions = (index: number) => answerOf(puzzles[index].descriptor.puzzle)!.map((seat, i) => encodeAction(i, seat));
  it('registers Deep Water F-H and a dare set C-H in O2 slots only', () => {
    expect(new Set(puzzles.map(p => p.ref.bank))).toEqual(new Set([DEEP_BANK, DARE_BANK]));
    const slots = puzzles.flatMap(p => p.dares.map(d => d.slot));
    expect(Math.min(...slots)).toBe(2000);
    expect(Math.max(...slots)).toBeLessThanOrEqual(2099);
    expect(new Set(slots).size).toBe(slots.length);
    expect(packedBanks.map(b => b.slot)).toEqual([302, 303, 304, 305, 306, 307]);
    const manifest = readCatalog(productionDirs).families.get('canoe-seats')!;
    for (const b of packedBanks) {
      const row = manifest.packs.find(p => p[0] === b.slot)!;
      expect([row[1], row[2], row[4], row[6]]).toEqual([b.first, b.count, b.packHash, b.rules]);
    }
  });
  it('a lights-on board finishes on its last correct placement and earns "seat each friend once"', () => {
    const index = puzzles.findIndex(p => p.path === 'endless' && lightsBand(p.descriptor.band));
    const once = puzzles[index].dares.find(d => d.rule.kind === 'par')!;
    const s = play(start(index, [once.slot]), answerActions(index));
    expect(s.result).toMatchObject({ event: 'independent', dares: [once.slot] });
  });
  it('the "lights off" dare from rung C needs a correct Check with no help', () => {
    const index = puzzles.findIndex(p => p.path === 'endless' && lightsBand(p.descriptor.band));
    const dark = puzzles[index].dares.find(d => d.rule.kind === 'blind')!;
    let s = play(start(index, [dark.slot], true), answerActions(index));
    expect(s.result).toBeNull();
    s = play(s, [CHECK]);
    expect(s.result).toMatchObject({ event: 'independent', dares: [dark.slot] });
  });
  it('from rung E the board waits for Check; a miss is counted once and the "first Check" mark is lost', () => {
    const index = puzzles.findIndex(p => p.path === 'endless' && !lightsBand(p.descriptor.band));
    const first = puzzles[index].dares.find(d => d.rule.kind === 'whole')!;
    const actions = answerActions(index), p = puzzles[index].descriptor.puzzle, answer = answerOf(p)!;
    const swapped = [encodeAction(0, answer[1]), encodeAction(1, answer[0]), ...actions.slice(2)];
    let s = play(start(index, [first.slot]), swapped);
    expect(registration.move(s, UNDO)).not.toBeNull();
    s = play(s, [CHECK]);
    expect(s.result).toBeNull();
    expect(registration.move(s, CHECK)).toBeNull(); // unchanged seats cannot be checked again
    s = play(s, [encodeAction(0, answer[0]), CHECK]);
    expect(s.result).toMatchObject({ event: 'helped', dares: [] });
  });
  it('Rung H One step from empty and Show me succeed via real requestHint, and finish inside the reserve after a full ordinary log', async () => {
    const hEntries = puzzles.filter(entry => entry.descriptor.band === 'h');
    const firstH = puzzles.findIndex(entry => entry.ref.bank === DEEP_BANK && entry.ref.puzzle === 14);
    expect(firstH).toBeGreaterThanOrEqual(0);
    const ac = new AbortController();

    // Every shipped inline Rung H board succeeds on blank One step, blank Show me, and messy Show me.
    for (const entry of hEntries) {
      const p = entry.descriptor.puzzle, answer = answerOf(p)!;
      const blank = canoeView(p, emptySeating(p), true);
      const one = await requestHint(canoeHelpRules(p, true), blank, 'one-step', ac.signal);
      expect(one.status, `${entry.ref.bank}:${entry.ref.puzzle}`).toBe('route');
      const show = await requestHint(canoeHelpRules(p, true), blank, 'show-me', ac.signal);
      expect(show.status, `${entry.ref.bank}:${entry.ref.puzzle}`).toBe('example');

      // Messy draft: every item shifted by one seat.
      let messy = emptySeating(p);
      for (let i = 0; i < items(p); i++) messy = place(p, messy, i, (answer[i] + 1) % p.n);
      const showMessy = await requestHint(canoeHelpRules(p, true), canoeView(p, messy, true), 'show-me', ac.signal);
      expect(showMessy.status).toBe('example');
      const route = await requestHint(canoeHelpRules(p, false), canoeView(p, messy, false), 'show-me', ac.signal);
      expect(route.status).toBe('route');
      if (route.status === 'route') {
        expect(route.actions.length).toBeLessThanOrEqual(items(p));
        const end = route.actions.reduce((pos, a) => place(p, pos, Math.floor(a / 8), (a % 8) - 1), messy);
        expect(accepts(p, end)).toBe(true);
      }
    }

    // Full ordinary-action log on inline bank 308 puzzle 14, then real hint route + Check -> helped.
    const p = puzzles[firstH].descriptor.puzzle, answer = answerOf(p)!;
    let s = start(firstH), pos = emptySeating(p);
    // Start with a messy full seating, then toggle item 0 back and forth until ordinary actions hit the reserve.
    for (let i = 0; i < items(p); i++) {
      const seat = (answer[i] + 1) % p.n;
      s = play(s, [encodeAction(i, seat)]);
      pos = place(p, pos, i, seat);
    }
    for (let step = 0; step < 600; step++) {
      const targetSeat = pos[0] === 0 ? 1 : 0;
      const next = registration.move(s, encodeAction(0, targetSeat));
      if (!next) break;
      s = next;
      pos = place(p, pos, 0, targetSeat);
    }
    const payload = s.payload as Payload;
    expect(payload.actions.length).toBe(ORDINARY_LIMIT);
    expect(registration.move(s, encodeAction(0, pos[0] === 0 ? 1 : 0))).toBeNull();

    const route = await requestHint(canoeHelpRules(p, false), canoeView(p, pos, false), 'show-me', ac.signal);
    expect(route.status).toBe('route');
    if (route.status !== 'route') return;
    expect(route.actions.length).toBeLessThanOrEqual(items(p));
    s = play(s, [HELP, ...route.actions.map(hinted), CHECK]);
    expect(s.result).toMatchObject({ event: 'helped', dares: [] });
  });
  it('marks a clue card done as an ordinary replayed action, and rejects unknown cards', () => {
    const s = start(0), p = puzzles[0].descriptor.puzzle;
    expect(registration.move(s, USED + p.clues.length - 1)).not.toBeNull();
    expect(registration.move(s, USED + p.clues.length)).toBeNull();
    expect(registration.move(s, hinted(encodeAction(0, 0)))).not.toBeNull();
    expect(accepts(p, answerOf(p)!)).toBe(true);
  });
});

describe('speech', () => {
  it('stages a recorded line for every friend-only clue a School board can show', () => {
    const lines = speechLines as Record<string, string>, all = friendClueLines();
    for (const [key, text] of Object.entries(all)) expect(lines[key], key).toBe(text);
    for (let level = 1; level <= 5; level++) {
      const set = setFor(level);
      for (const row of [...Object.values(set.teach).flat(), ...set.rows]) {
        const p = rowPuzzle(row);
        for (const c of p.clues) expect(lines[clueKey(p, c)!], row).toBeDefined();
      }
    }
  });
});

describe('save catalog', () => {
  it('holds exactly the registration’s banks, dares and contexts, in slot order', async () => {
    const { execFileSync } = await import('node:child_process');
    expect(() => execFileSync(process.execPath, ['--import', './scripts/puzzles/register.mjs', 'scripts/puzzles/canoe-seats-catalog.ts', '--check'], { encoding: 'utf8', stdio: 'pipe' })).not.toThrow();
  });
});
