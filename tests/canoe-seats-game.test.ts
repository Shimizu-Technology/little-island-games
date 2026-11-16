import { describe, expect, it } from 'vitest';
import {
  boardsFor, canCheck, checkSeats, dealFresh, engine, keeperOf, levelTeach, lightsByDefault, nextBoard, passClues, placeItem, puzzleAt, resetSeats, revealClues, ROUND,
  rowPuzzle, setFor, setLights, startRound, teachKindOf, toggleUsed, undoSeat, UNDO_LIMIT, validCanoe, type CanoeState,
} from '../src/learn/games/canoe-seats/engine';
import { accepts, answerOf, countSeatings, items, type CanoePuzzle } from '../src/learn/games/canoe-seats/rules';
import { registration, puzzles, packedBanks, CHECK, HELP, RESET, UNDO, USED, hinted, ASSIST_ACTIONS, lightsBand, DEEP_BANK, DARE_BANK, type Payload } from '../src/learn/games/canoe-seats/challenge';
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
  it('help can always finish inside its reserve, even after a full log of ordinary play', () => {
    const index = puzzles.findIndex(p => p.descriptor.band === 'h');
    const p = puzzles[index].descriptor.puzzle;
    let s = start(index);
    for (let i = 0; i < 600; i++) { const next = registration.move(s, encodeAction(i % items(p), (i * 2) % p.n)); if (!next) break; s = next; }
    const payload = s.payload as Payload;
    expect(payload.actions.length).toBeLessThanOrEqual(512 - ASSIST_ACTIONS);
    s = play(s, [HELP, RESET]); // reset is ordinary, so it may be refused past the limit; help never is
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
