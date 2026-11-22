import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { advance, draw, engine as turtle, initialProgram, solves, task as legacyTask, validBlock, type Block, type TurtleState } from '../src/learn/games/turtle-draw/engine';
import { blockCost } from '../src/learn/games/turtle-draw/dsl';
import { LEVEL_TASKS, schoolTemplates } from '../src/learn/games/turtle-draw/templates';
import { deepCodes, readTurtleDraft, turtleProgram, programCodes } from '../src/learn/games/turtle-draw/program';
import { encodeProgram, sessionBytes } from '../src/learn/program/codec';
import { levelOf } from '../src/learn/levelOptions';
import type { LearnOptions } from '../src/learn/types';

const options = (level: 1 | 2 | 3 | 4 | 5): LearnOptions => ({ mode: 'solo', pace: (['easy', 'medium', 'hard'] as const)[Math.min(level, 3) - 1], ...(level === 4 ? { stage: 'stretch' as const } : level === 5 ? { stage: 'deep' as const } : {}) });
const make = (level: 1 | 2 | 3 | 4 | 5, seed = 0.4, previous?: TurtleState) => turtle.create(options(level), { skills: {}, rng: () => seed, starter: 0, today: 0, previous } as never) as TurtleState;
const run = (state: TurtleState) => { let x: TurtleState = { ...state, running: true, cursor: 0 }; while (x.running) x = advance(x); return x; };

describe('new rounds are version 2 and from certified pictures', () => {
  it.each([1, 2, 3, 4, 5] as const)('Level %i makes four distinct pictures, easiest first, and they validate and survive a save round trip', level => {
    const s = make(level), o = options(level);
    expect(s.version).toBe(2); expect(levelOf(o)).toBe(level);
    expect(s.tasks.map(t => schoolTemplates[level - 1][t.seed].tier)).toEqual([1, 2, 3, 4]);
    expect(new Set(s.tasks.map(t => t.seed)).size).toBe(4);
    expect(turtle.validate(s, o)).toBe(true); expect(turtle.validate(JSON.parse(JSON.stringify(s)), o)).toBe(true);
    for (const t of s.tasks) { expect(t.template).toBe(t.seed); expect(solves(t, t.target)).toBe(true); expect(t.limit).toBeGreaterThanOrEqual(blockCost(t.target)); }
  });
  it('a new round avoids the pictures of the one before', () => {
    for (const level of [3, 4, 5] as const) { const first = make(level, 0.2), second = make(level, 0.2, first); expect(second.tasks.some(t => first.tasks.some(f => f.seed === t.seed))).toBe(false); }
  });
  it('rejects a tampered version 2 round: another picture, another limit, a repeated picture, or a number outside the 40', () => {
    const s = make(5), o = options(5);
    const bad = (mutate: (x: TurtleState) => void) => { const x = JSON.parse(JSON.stringify(s)) as TurtleState; mutate(x); return turtle.validate(x, o); };
    expect(bad(x => { x.tasks[0].limit += 1; })).toBe(false);
    expect(bad(x => { x.tasks[0].seed = (x.tasks[0].seed + 1) % LEVEL_TASKS; })).toBe(false);
    expect(bad(x => { x.tasks[1] = JSON.parse(JSON.stringify(x.tasks[0])); })).toBe(false);
    expect(bad(x => { x.tasks[0] = { ...x.tasks[0], seed: LEVEL_TASKS, template: LEVEL_TASKS }; })).toBe(false);
    expect(bad(x => { x.version = 3 as never; })).toBe(false);
    expect(bad(x => { x.tasks[0].origin = { x: 0, y: 0 }; })).toBe(false);
    expect(bad(x => { x.tasks.pop(); })).toBe(false);
    expect(bad(x => { (x as unknown as Record<string, unknown>).extra = 1; })).toBe(false);
    expect(bad(() => undefined)).toBe(true);
  });
  it('keeps a block-editor draft of a version 2 round only when it matches the plan, inside 4 KiB', () => {
    const s = make(5), plan = s.tasks[0].target;
    const withDraft = { ...s, program: plan, blockDraft: encodeProgram(turtleProgram(plan)) };
    expect(turtle.validate(withDraft, options(5))).toBe(true);
    expect(sessionBytes({ game: 'turtle-draw', version: 1, id: 'x', revision: 1, options: options(5), state: withDraft })).toBeLessThanOrEqual(4096);
    expect(turtle.validate({ ...withDraft, program: [] }, options(5))).toBe(false);
    // School drafts can never carry a Deep Water code, even though the reader of Deep Water drafts can decode them.
    const deep = turtleProgram([{ kind: 'turn', angle: 72 }], deepCodes);
    expect(readTurtleDraft(encodeProgram(deep))).toBeNull();
    expect(readTurtleDraft(encodeProgram(deep), deepCodes)).not.toBeNull();
    expect(programCodes).toHaveLength(12); expect(deepCodes.slice(0, 12)).toEqual(programCodes);
  });
  it('the level names put Angles before Flowers and fixes', () => {
    expect(turtle.levelNames!.map(l => l.name)).toEqual(['Lines in sand', 'Four sides', 'Loop a shape', 'Angles', 'Flowers and fixes']);
  });
});

describe('W0-03 legacy: paused version 1 rounds and earned stars are unchanged', () => {
  const legacy = (level: 1 | 2 | 3 | 4 | 5): TurtleState => ({ version: 1, level, tasks: [1, 2, 3, 4].map(i => legacyTask(level, i * 7)), done: 0, completed: [], program: [], cursor: 0, running: false, attempts: 0, helped: false, free: false });
  it.each([1, 2, 3, 4, 5] as const)('Level %i version 1 still validates, plays and finishes exactly as before', level => {
    const s = legacy(level), o = options(level);
    expect(turtle.validate(s, o)).toBe(true);
    let x = s;
    for (let i = 0; i < 4; i++) {
      x = { ...x, program: x.tasks[i].target, cursor: 0 };
      x = run(x);
      expect(x.completed).toHaveLength(i + 1);
      expect(turtle.validate(x, o)).toBe(true);
      x = { ...x, done: i + 1, program: i < 3 ? initialProgram(x.tasks[i + 1]) : [], cursor: 0, running: false };
    }
    expect(turtle.outcome(x, o)).toBe('done');
  });
  it('version 1 still counts blocks on the top level only, and the legacy tasks are byte-for-byte what the old generator made', () => {
    const t = legacyTask(3, 0);
    const bulky: Block[] = [{ kind: 'repeat', times: 4, body: [{ kind: 'forward', n: 60 }, { kind: 'turn', angle: 90 }] }];
    expect(solves(t, bulky)).toBe(true);
    expect(JSON.stringify(legacyTask(5, 1))).toBe(JSON.stringify({ seed: 1, target: [{ kind: 'repeat', times: 4, body: [{ kind: 'forward', n: 70 }, { kind: 'turn', angle: 90 }] }], limit: 3, requiredLoop: true, debug: false }));
    expect(legacyTask(5, 1).target.every(b => validBlock(b))).toBe(true);
    expect(initialProgram(legacyTask(5, 2)).length).toBeGreaterThan(0);
    // A version 2 round tracks no `template` on a legacy task, and a version 1 round refuses version 2's tasks.
    const mixed = { ...legacy(3), tasks: make(3).tasks };
    expect(turtle.validate(mixed, options(3))).toBe(false);
  });
  it('every frozen save fixture\'s Turtle round still validates unchanged', () => {
    let seen = 0;
    const walk = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') {
        const v = value as Record<string, unknown>;
        if (v.game === 'turtle-draw' && v.state && typeof v.state === 'object') {
          const state = v.state as TurtleState, before = JSON.stringify(state);
          expect(state.version).toBe(1);
          expect(turtle.validate(state, v.options as LearnOptions)).toBe(true);
          expect(JSON.stringify(state)).toBe(before); seen++;
        }
        Object.values(v).forEach(walk);
      }
    };
    for (const file of readdirSync('tests/fixtures/save-v3').filter(f => f.endsWith('.json') && f !== 'RECEIPT.json')) walk(JSON.parse(readFileSync(`tests/fixtures/save-v3/${file}`, 'utf8')));
    expect(seen).toBeGreaterThan(10);
  });
  it('a version 1 round at Level 5 keeps the old counter that makes it easier than Level 4 by block count (the defect W0-03 fixes for new rounds)', () => {
    const l4 = legacyTask(4, 0), l5 = legacyTask(5, 0);
    expect(blockCost(l5.target)).toBeLessThanOrEqual(blockCost(l4.target));
  });
});

describe('free drawing is untouched and ungraded', () => {
  it('a free run changes nothing but the lines: no completed shape, no step, no solved check', () => {
    for (const s of [make(3), { ...make(3), version: 1 as const, tasks: [1, 2, 3, 4].map(i => legacyTask(3, i)) }]) {
      const free: TurtleState = { ...s, free: true, program: [{ kind: 'forward', n: 60 }, { kind: 'turn', angle: 90 }, { kind: 'forward', n: 60 }], cursor: 0, running: true };
      const done = run(free);
      expect(done.completed).toEqual([]); expect(done.done).toBe(0); expect(done.free).toBe(true); expect(done.program).toEqual(free.program);
      expect(turtle.outcome(done, options(3))).toBeNull();
    }
  });
  it('a free picture draws from the original start, not a template\'s centred one', () => {
    const s = make(3), program: Block[] = [{ kind: 'forward', n: 60 }];
    expect(draw(program)![0].from).toEqual({ x: 100, y: 80 });
    expect(s.tasks[0].origin).not.toEqual({ x: 100, y: 80 });
  });
});
