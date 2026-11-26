import '../src/learn/engines';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { engine, type LegacyTide, type TideState, type TideV3 } from '../src/learn/games/tide-logic/engine';
import { SCHOOL_ROWS, UNDO_DEPTH, advance, blank, choose, clear, counted, currentRow, frameOf, help, roundPicks, run, undo, validV3 } from '../src/learn/games/tide-logic/school';
import { complete, firstMiss, goalSentence, routes, sorts, usesRuleWords } from '../src/learn/games/tide-logic/rules';
import type { LearnOptions } from '../src/learn/types';

const options = (level: number): LearnOptions => ({ mode: 'solo', pace: level === 1 ? 'easy' : level === 2 ? 'medium' : 'hard', ...(level === 4 ? { stage: 'stretch' } : level === 5 ? { stage: 'deep' } : {}) });
const fresh = (level: number, r = .42, previous?: TideState) => engine.create(options(level), { skills: {}, rng: () => r, starter: 0, today: 0, previous }) as TideV3;
const must = <T,>(x: T | null): T => { expect(x).not.toBeNull(); return x!; };
const roundTrip = (s: TideV3, level: number) => { const copy = JSON.parse(JSON.stringify(s)); expect(engine.validate(copy, options(level))).toBe(true); return copy as TideV3; };
const setRule = (s: TideV3, rule: readonly number[]) => rule.reduce((x, o, i) => choose(x, i, o) ?? x, s);
const wrongRule = (s: TideV3) => { const row = currentRow(s)!, f = frameOf(s.level), side = f.slots.length - 1; const r = [...row.target]; r[side] = 1 - r[side]; return r; };

describe('School version 3 rounds', () => {
  for (let level = 1; level <= 5; level++) it(`Level ${level}: four certified belts, easiest first, played to the end through save and resume`, () => {
    let s = fresh(level);
    expect(s.version).toBe(3); expect(s.picks.map((p, q) => Math.floor(p / 10))).toEqual([0, 1, 2, 3]);
    roundTrip(s, level);
    for (let belt = 0; belt < 4; belt++) {
      const row = currentRow(s)!;
      s = roundTrip(setRule(s, row.target), level);
      s = roundTrip(must(run(s)).state, level);
      expect(s.running).toBe(0);
      for (let i = 0; i <= row.belt.length; i++) s = roundTrip(advance(s), level);
      expect(s.index).toBe(belt + 1);
    }
    expect(engine.outcome(s, options(level))).toBe('done');
    expect(engine.helpedWork!(s, options(level))).toBe(false);
  });
  it('a new round avoids the belts of the round before when it can', () => {
    const first = fresh(3, .1), next = fresh(3, .1, first);
    expect(next.picks.some((p, i) => p !== first.picks[i])).toBe(true);
    expect(next.picks.every(p => !first.picks.includes(p))).toBe(true);
    expect(roundPicks(() => .99)).toEqual([9, 19, 29, 39]);
  });
  it('a wrong run is a miss with the first catch the rule sends the wrong way, and the rule stays editable', () => {
    let s = fresh(3);
    const row = currentRow(s)!, wrong = wrongRule(s);
    s = setRule(s, wrong);
    const result = must(run(s));
    expect(result.miss).toBe(firstMiss(frameOf(3), wrong, row.target, row.belt));
    expect(result.state.running).toBe(-1); expect(result.state.misses).toBe(1);
    expect(engine.helpedWork!(result.state, options(3))).toBe(true);
    expect(must(choose(result.state, 0, (wrong[0] + 1) % 6)).rule[0]).toBe((wrong[0] + 1) % 6);
  });
  it('a saved round cannot claim a running belt with a rule that does not sort it', () => {
    const s = fresh(3), wrong = wrongRule(s);
    expect(engine.validate({ ...s, rule: wrong, running: 0 }, options(3))).toBe(false);
    expect(engine.validate({ ...s, rule: currentRow(s)!.target, running: 0 }, options(3))).toBe(true);
    expect(engine.validate({ ...s, picks: [12, 13, 25, 35] }, options(3))).toBe(false);
    expect(engine.validate({ ...s, extra: 1 }, options(3))).toBe(false);
    expect(engine.validate({ ...s, rule: [...s.rule, 0] }, options(3))).toBe(false);
    expect(engine.validate(s, options(4))).toBe(false);
  });
  it('Help climbs Look, One step, Show rule from the same pure rules, then stops; an edit starts the ladder again', () => {
    // From an empty rule every rung has something to give: One step sets one block, Show rule the rest.
    const s = fresh(5);
    const row = currentRow(s)!, f = frameOf(5);
    const look = must(help(s));
    expect(look.hint).toBe(1); expect(look.rule).toEqual(s.rule); expect(look.helped).toBe(true);
    const step = must(help(look));
    expect(step.hint).toBe(2); expect(step.rule.filter((o, i) => o !== s.rule[i]).length).toBe(1);
    const show = must(help(step));
    expect(show.hint).toBe(3); expect(sorts(f, show.rule, row.target, row.belt)).toBe(true);
    expect(help(show)).toBeNull();
    expect(must(undo(show)).hint).toBe(0);
    // A rule one block from right: One step finishes it, so Show rule only confirms and leaves the rule alone.
    const near = must(help(must(help(setRule(fresh(5), wrongRule(fresh(5)))))));
    expect(sorts(f, near.rule, row.target, row.belt)).toBe(true); expect(must(help(near)).rule).toEqual(near.rule);
    // Help on a rule that already sorts is never a free check: it records assistance and changes nothing else.
    const confirmed = must(help(setRule(fresh(5), row.target)));
    expect(confirmed.helped).toBe(true); expect(confirmed.hint).toBe(1); expect(confirmed.rule).toEqual(row.target);
    expect(must(help(confirmed)).helped).toBe(true);
  });
  it('Undo walks back each block, Clear empties the rule, and the undo history stays bounded', () => {
    let s = fresh(3);
    const row = currentRow(s)!;
    s = setRule(s, row.target);
    expect(s.undo.length).toBe(4);
    const cleared = must(clear(s));
    expect(cleared.rule).toEqual(blank(frameOf(3)));
    expect(must(undo(cleared)).rule).toEqual(row.target);
    expect(clear(must(clear(s)))).toBeNull();
    let busy = s;
    for (let i = 0; i < 40; i++) busy = must(choose(busy, 0, busy.rule[0] === 0 ? 1 : 0));
    expect(busy.undo.length).toBe(UNDO_DEPTH);
    expect(validV3(JSON.parse(JSON.stringify(busy)), 3)).toBe(true);
  });
  it('Level 4 counts the catches its rule sends to the bucket the child chose, once each, including the one on show', () => {
    let s = fresh(4);
    const row = currentRow(s)!;
    s = must(run(setRule(s, row.target))).state;
    const side = row.target[2];
    for (let i = 0; i <= row.belt.length; i++) {
      // The catch on show counts as sorted, as the board says ("Catch 3: LEFT ✓").
      expect(counted(s)).toBe(routes(frameOf(4), row.target, row.belt).slice(0, Math.min(row.belt.length, i + 1)).filter(x => x === side).length);
      if (i < row.belt.length) s = advance(s);
    }
  });
  it('the goal sentence never names AND, OR or NOT above Level 2, and Levels 1–2 keep the plain sentence', () => {
    for (let level = 1; level <= 5; level++) for (const row of SCHOOL_ROWS[level - 1]) {
      const text = goalSentence(frameOf(level), row.target)!;
      expect(usesRuleWords(text)).toBe(false);
      if (level <= 2) expect(text.startsWith('Send ')).toBe(true);
    }
  });
  it('rises: Level 4 and 5 rule spaces are larger than Level 3, and Level 5 belts are the longest', () => {
    const mean = (l: number) => SCHOOL_ROWS[l - 1].reduce((n, r) => n + r.belt.length, 0) / 40;
    expect(frameOf(5).slots[0].options.length).toBeGreaterThan(frameOf(3).slots[0].options.length);
    expect(mean(5)).toBeGreaterThan(mean(3));
    for (const row of SCHOOL_ROWS[4]) expect(row.trace).toBeGreaterThanOrEqual(0);
  });
});

describe('Saved rounds from before C4', () => {
  it('every frozen save fixture\'s Tide Logic round still validates, unchanged, as version 2', () => {
    let seen = 0;
    const walk = (v: unknown): void => {
      if (!v || typeof v !== 'object') return;
      const o = v as Record<string, unknown>;
      if (o.game === 'tide-logic' && o.state && o.options) {
        const state = o.state as LegacyTide, before = JSON.stringify(state);
        expect(state.version).toBe(2);
        expect(engine.validate(state, o.options as LearnOptions)).toBe(true);
        expect(JSON.stringify(state)).toBe(before); seen++;
      }
      Object.values(o).forEach(walk);
    };
    for (const file of readdirSync('tests/fixtures/save-v3').filter(f => f.endsWith('.json') && f !== 'RECEIPT.json')) walk(JSON.parse(readFileSync(`tests/fixtures/save-v3/${file}`, 'utf8')));
    expect(seen).toBeGreaterThan(10);
  });
  it('a version 2 round is never read as version 3 and keeps its own star record', () => {
    const legacy: LegacyTide = { version: 2, level: 4, seed: 14177, index: 0, total: 4, rule: { first: '', join: '', second: '', action: '' }, running: -1, helped: false };
    expect(engine.validate(legacy, options(4))).toBe(true);
    expect(engine.helpedWork!(legacy, options(4))).toBe(false);
    expect(engine.validate({ ...legacy, version: 3 }, options(4))).toBe(false);
  });
  it('the rules engine refuses an unfinished rule rather than guessing', () => {
    expect(complete(frameOf(3), [0, -1, 2, 0])).toBe(false);
    expect(() => routes(frameOf(3), [0, -1, 2, 0], [0])).toThrow();
  });
});
