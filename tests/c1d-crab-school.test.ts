import { describe, expect, it } from 'vitest';
import { engine as crab, levels, nextBeach, run, solve, solved, currentLevel, commands, type CrabState, type Level } from '../src/learn/games/crab-commands/engine';
import { crabProgram, withCrabProgram } from '../src/learn/games/crab-commands/program';
import { codes, crabSim, flatCards, gradeLoops, loopSolutions } from '../src/learn/games/crab-commands/proofs';
import { blockBest, runNodes } from '../src/learn/games/crab-commands/search';
import { execute, nextHint } from '../src/learn/games/crab-commands/challenge-engine';
import { greedyBot } from '../src/learn/games/crab-commands/deep-proofs';
import { applyStep, describeStep, nearestBlocks, nextStep } from '../src/learn/games/crab-commands/block-hint';
import { encodeProgram } from '../src/learn/program/codec';
import { nodeCost, type Program } from '../src/learn/program/model';
import { engines } from '../src/learn/engines';
import { createGrowth, isGrowth } from '../src/learn/growth/engine';
import { optionsAtLevel, levelOf } from '../src/learn/levelOptions';
import { levelInfo } from '../src/learn/levels';
import { startSession, validLearnSession } from '../src/learn/session';
import { creditSchool } from '../src/learn/schoolProgress';
import proof from '../src/learn/games/crab-commands/school-content.json';

const context = { skills: {}, rng: () => 0, starter: 0 as const, today: 1 };
const at = (level: 1 | 2 | 3 | 4 | 5) => optionsAtLevel({ mode: 'solo', pace: 'medium' }, level);
const stage = (s: 'stretch' | 'deep') => levels.filter(l => l.stage === s);
const by = (items: Level[], key: (l: Level) => number) => [0, 1, 2].map(tier => items.filter(l => l.tier === tier).map(key));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const proofOf = (id: string) => (proof.proof as Record<string, Record<string, unknown>>)[id];

describe('C1d: 30 more Level 1–3 beaches', () => {
  const extra = levels.filter(l => /^n[emh]\d+$/.test(l.id));
  it('adds ten real beaches per level, each solvable in its tier, none a copy of an older beach', () => {
    expect(extra).toHaveLength(30);
    const older = new Set(levels.filter(l => !extra.includes(l) && !l.stage).map(l => l.rows.join('/')));
    for (const pace of ['easy', 'medium', 'hard'] as const) expect(extra.filter(l => l.pace === pace)).toHaveLength(10);
    for (const l of extra) {
      const plan = solve(l), [lo, hi] = [[2, 3], [4, 6], [7, 13]][l.tier];
      expect(plan.length, l.id).toBeGreaterThanOrEqual(lo); expect(plan.length, l.id).toBeLessThanOrEqual(hi);
      expect(solved(l, run(l, plan)), l.id).toBe(true);
      expect(older.has(l.rows.join('/')), l.id).toBe(false);
      expect(l.stage).toBeUndefined(); expect(l.blockEditor).toBeUndefined();
      // Level 3's Again saves cards on every new beach (two on the long ones), so it can't be ignored.
      if (l.pace === 'hard') expect(solve({ ...l, pace: 'medium' }).length - plan.length, l.id).toBeGreaterThanOrEqual(l.tier === 2 ? 2 : 1);
    }
  });
  it('lets Level 1 offer more than three long beaches', () => {
    expect(levels.filter(l => l.pace === 'easy' && !l.stage && l.tier === 2 && !l.retired).length).toBeGreaterThan(3);
  });
});

describe('C1d Level 4: find and fix a bug on real beaches', () => {
  const bugs = stage('stretch');
  it('has eight beaches per tier, each opening with exactly one planted step, turn or Again bug', () => {
    expect(bugs).toHaveLength(24);
    for (const tier of [0, 1, 2]) {
      const row = bugs.filter(l => l.tier === tier);
      expect(row).toHaveLength(8);
      expect(new Set(row.map(l => l.bug))).toEqual(new Set(['step', 'turn', 'loop']));
    }
    for (const l of bugs) {
      const d = { level: l, budget: null, starter: [], lesson: '' }, best = solve(l), broken = l.starter!;
      expect(l.pace, l.id).toBe('hard'); expect(l.skill).toBe('think.debug');
      expect(execute(d, broken).won, `${l.id} starter must not already win`).toBe(false);
      // The board's own repair search names one edit first, and that one edit wins with a shortest plan.
      const hint = nextHint(d, broken), fixed = [...broken];
      expect(hint.edit, l.id).toBeDefined();
      if (hint.edit!.op === 'change') fixed[hint.edit!.at] = hint.edit!.card!; else if (hint.edit!.op === 'insert') fixed.splice(hint.edit!.at, 0, hint.edit!.card!); else fixed.splice(hint.edit!.at, 1);
      expect(execute(d, fixed).won, l.id).toBe(true);
      expect(fixed).toHaveLength(best.length);
      const kind = l.bug, diffs = broken.length - best.length;
      if (kind === 'turn' || kind === 'loop') expect(diffs).toBe(0); else expect(Math.abs(diffs)).toBe(1);
    }
  });
  it('gets harder by tier: longer plans and bugs whose symptom shows up later', () => {
    const cards = by(bugs, l => solve(l).length), delay = by(bugs, l => proofOf(l.id).delay as number);
    expect(mean(cards[0])).toBeLessThan(mean(cards[1])); expect(mean(cards[1])).toBeLessThan(mean(cards[2]));
    expect(Math.max(...delay[0])).toBeLessThanOrEqual(2); expect(Math.min(...delay[2])).toBeGreaterThanOrEqual(3);
  });
});

describe('C1d Level 5: block loops, tray below the flat optimum', () => {
  const loops = stage('deep');
  it('opts in only these beaches, each tray strictly below every flat plan (with or without Again)', () => {
    expect(loops).toHaveLength(24);
    for (const l of loops) {
      expect(l.blockEditor, l.id).toBe(true);
      expect(commands(l.pace)).toEqual(['forward', 'turn-left', 'turn-right']);
      const walk = flatCards(l, commands('medium'))!, again = flatCards(l, commands('hard'))!;
      expect(l.tray!, l.id).toBeLessThan(walk); expect(l.tray!, l.id).toBeLessThan(again);
      expect(proofOf(l.id)).toMatchObject({ flat: walk, again });
    }
  });
  it('re-proves the fewest blocks on the engine, and every baked winner fits the tray', () => {
    for (const l of loops) {
      const g = gradeLoops(l);
      expect(g.exhausted, l.id).toBe(false);
      expect(g.blocks, l.id).toBe(proofOf(l.id).blocks);
      expect(g.blocks!, l.id).toBeLessThanOrEqual(l.tray!);
      expect(l.tray! - g.blocks!, l.id).toBeLessThanOrEqual(1);
      const winners = loopSolutions(l);
      expect(winners.length, l.id).toBeGreaterThan(0);
      for (const p of winners) {
        expect(nodeCost(p), l.id).toBeLessThanOrEqual(l.tray!);
        expect(runNodes(crabSim(l), crabSim(l).start, p.body)?.won, l.id).toBe(true);
        // And on the School board itself, through the K7 draft the editor saves.
        const s = crab.create(at(5), context), round = { ...s, levels: [l.id, ...s.levels.filter(id => id !== l.id).slice(0, 2)] };
        const drafted = withCrabProgram(round, p, l)!;
        // A run stops the moment the crab is home, so a Repeat may count past it.
        expect(drafted.program.some((_, i) => solved(l, run(l, drafted.program.slice(0, i + 1)))), l.id).toBe(true);
      }
    }
  });
  it('rises by tier: more flat cards, more blocks, and a Repeat inside a Repeat at the top', () => {
    const flat = by(loops, l => proofOf(l.id).flat as number), blocks = by(loops, l => proofOf(l.id).blocks as number), depth = by(loops, l => proofOf(l.id).depth as number);
    expect(mean(flat[0])).toBeLessThan(mean(flat[1])); expect(mean(flat[1])).toBeLessThan(mean(flat[2]));
    expect(mean(blocks[0])).toBeLessThan(mean(blocks[1])); expect(mean(blocks[1])).toBeLessThanOrEqual(mean(blocks[2]));
    expect(depth[0].every(d => d === 1)).toBe(true); expect(depth[2].every(d => d === 2)).toBe(true);
    for (const l of loops.filter(x => x.tier === 2)) expect(blockBest(crabSim(l), codes(commands('medium')), l.tray!, { nest: 1 }).best, l.id).toBeNull();
  });
  it('a flat greedy player with no loops fails every Level 5 beach', () => {
    for (const l of loops) expect(greedyBot({ level: l, budget: null, starter: [], lesson: '', tray: l.tray }).won, l.id).toBe(false);
  });
  it('the block hint names one editor action at a time toward a certified winner, from empty to home', () => {
    const name = (c: number) => ['Up', 'Right', 'Down', 'Left', 'Walk', 'Turn left', 'Turn right'][c];
    for (const l of loops) {
      let program: Program = { version: 1, body: [], songs: [] };
      const near = nearestBlocks(program, loopSolutions(l))!;
      for (let guard = 0; guard < 40; guard++) {
        const step = nextStep(program, near.target);
        if (!step) break;
        expect(describeStep(step, program, name), l.id).toMatch(/^Tap /);
        expect(step.kind === 'count' ? [2, 3, 4, 6, 8] : [step.kind]).toContain(step.kind === 'count' ? step.times : step.kind);
        const next = applyStep(program, step)!;
        expect(next, l.id).not.toBeNull();
        expect(nodeCost(next), l.id).toBeLessThanOrEqual(l.tray!);
        program = next;
      }
      expect(runNodes(crabSim(l), crabSim(l).start, program.body)?.won, l.id).toBe(true);
    }
  });
});

describe('C1d School rounds: new rounds use the new beaches; saved rounds and stars stay', () => {
  it('Crab owns Levels 4–5 natively with the shared board kept for archived rounds', () => {
    expect(crab.nativeStages).toBe(true); expect(crab.ownLevels).toBeUndefined();
    expect(levelInfo('crab-commands', 4).name).toBe('Find & fix a bug'); expect(levelInfo('crab-commands', 5).name).toBe('Repeat whole blocks');
    for (const level of [1, 2, 3] as const) expect(levelInfo('crab-commands', level).name).toBe(['Follow the arrows', 'Walk and turn', 'Do it again'][level - 1]);
  });
  it('a new Level 4 round opens on a bug beach with its planted plan, and the next beach brings its own', () => {
    const o = at(4), s = engines['crab-commands'].create(o, context) as CrabState;
    expect(isGrowth(s)).toBe(false);
    const first = currentLevel(s);
    expect(first.stage).toBe('stretch'); expect(s.program).toEqual(first.starter); expect(s.cards).toBe(first.starter!.length);
    expect(engines['crab-commands'].validate(s, o)).toBe(true);
    const plan = solve(first), won = { ...s, program: plan, cursor: plan.length, cards: s.cards + plan.length };
    expect(crab.validate(won, o)).toBe(true);
    const next = nextBeach(won);
    expect(next.program).toEqual(currentLevel(next).starter); expect(currentLevel(next).stage).toBe('stretch');
    expect(crab.validate(next, o)).toBe(true);
    expect(crab.validate(s, at(1))).toBe(false);
  });
  it('a new Level 5 round opens on a tray beach; a draft over the tray or a flat plan over it is refused', () => {
    const o = at(5), s = engines['crab-commands'].create(o, context) as CrabState, l = currentLevel(s);
    expect(l.stage).toBe('deep'); expect(s.program).toEqual([]);
    expect(engines['crab-commands'].validate(s, o)).toBe(true);
    const winner = loopSolutions(l)[0], ok = withCrabProgram(s, winner, l)!;
    expect(crab.validate(ok, o)).toBe(true);
    const flat = crabProgram(solve(l));
    expect(nodeCost(flat)).toBeGreaterThan(l.tray!);
    expect(crab.validate(withCrabProgram(s, flat, l)!, o)).toBe(false);
    expect(crab.validate({ ...s, program: solve(l).slice(0, l.tray! + 1), cards: 99 }, o)).toBe(false);
    expect(crab.validate({ ...s, program: solve(l).slice(0, l.tray!), cards: 99 }, o)).toBe(true);
  });
  it('a paused Level 4–5 board round from before resumes on the board; its stars are unchanged', () => {
    for (const level of [4, 5] as const) {
      const o = at(level), growth = createGrowth('crab-commands', o, context);
      expect(isGrowth(growth)).toBe(true);
      expect(engines['crab-commands'].validate(growth, o)).toBe(true);
      const session = { ...startSession('crab-commands', { options: o }, {}, 3), state: growth };
      expect(validLearnSession(JSON.parse(JSON.stringify(session)))).toBe(true);
      // Stars for an earlier finished board round stay exactly as earned.
      const finished = { ...session, learner: 'kid', levelHelped: false, state: { ...growth, history: growth.ids.flatMap(() => [{ type: 'answer' as const, value: '' }]) } };
      expect(creditSchool({ 'crab-commands': { [level]: { stars: 3, completed: 4, independent: 2, days: [1, 2], rounds: ['old'] } } }, finished as never)['crab-commands']![level]!.stars).toBe(3);
      expect(levelOf(o)).toBe(level);
    }
  });
  it('flat Level 1–3 rounds saved before C1d still validate unchanged', () => {
    const saved: CrabState = { levels: ['ea1', 'eb1', 'e5'], completed: [['right', 'right']], program: ['down'], cursor: 0, running: false, starter: 0, cards: 3, debugging: false };
    const frozen = JSON.stringify(saved);
    expect(crab.validate(saved, at(1))).toBe(true);
    expect(JSON.stringify(saved)).toBe(frozen);
    const legacy = crab.create(at(2), context);
    expect(legacy.levels.every(id => levels.find(l => l.id === id)!.stage === undefined)).toBe(true);
  });
  it('a stretch or deep beach never appears in a Level 1–3 pool, and the K7 draft codec still round-trips', () => {
    for (let seed = 0; seed < 30; seed++) for (const level of [1, 2, 3] as const) {
      const s = crab.create(at(level), { ...context, rng: () => (seed * 0.031) % 1 });
      expect(s.levels.every(id => !levels.find((l: Level) => l.id === id)!.stage)).toBe(true);
    }
    const l = stage('deep')[0], p = loopSolutions(l)[0];
    expect(encodeProgram(p)).toEqual(encodeProgram(JSON.parse(JSON.stringify(p))));
  });
});

it('a Repeat hint matches the editor: add Repeat ×2, then set the count', () => {
  const empty: Program = { version: 1, body: [], songs: [] }, target: Program = { version: 1, body: [{ kind: 'repeat', times: 4, body: [{ kind: 'command', command: 4 }] }], songs: [] };
  const first = nextStep(empty, target)!;
  expect(describeStep(first, empty, String)).toBe('Tap “＋ End of plan”, then tap ↻ Repeat ×2. The Repeat starts at ×2.');
  const added = applyStep(applyStep(empty, first)!, nextStep(applyStep(empty, first)!, target)!)!;
  expect(describeStep(nextStep(added, target)!, added, String)).toBe('Tap the Repeat at plan, block 1, then tap ×4.');
});

it('fix P2-1: a saved Level 5 draft with a song or a condition is refused, even inside the tray', () => {
  const o = at(5), s = crab.create(o, context), l = currentLevel(s);
  const songDraft: Program = { version: 1, body: [{ kind: 'call', song: 0 }], songs: [[{ kind: 'command', command: 4 }]] };
  const ifDraft: Program = { version: 1, body: [{ kind: 'if', condition: { kind: 'blocked' }, yes: [{ kind: 'command', command: 6 }], no: [{ kind: 'command', command: 4 }] }], songs: [] };
  for (const p of [songDraft, ifDraft]) {
    expect(nodeCost(p)).toBeLessThanOrEqual(l.tray!);
    const drafted = withCrabProgram(s, p, l);
    expect(drafted && crab.validate(drafted, o)).toBeFalsy();
  }
  expect(crab.validate(withCrabProgram(s, loopSolutions(l)[0], l)!, o)).toBe(true);
});
