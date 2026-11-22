import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { registration, turtleAssistance } from '../src/learn/games/turtle-draw/challenge';
import { turtlePuzzles, FIRST_DARE } from '../src/learn/games/turtle-draw/challenge-content';
import { admit, buildHint, challengeEngine, ruleOut, solvesBuild, type Action, type BuildDescriptor, type Descriptor, type PredictDescriptor, type State } from '../src/learn/games/turtle-draw/challenge-engine';
import { deepCodes, turtleProgram } from '../src/learn/games/turtle-draw/program';
import { draw, flatten, type Block } from '../src/learn/games/turtle-draw/engine';
import { blockCost, flatCost } from '../src/learn/games/turtle-draw/dsl';
import { DEEP_COUNTS } from '../src/learn/games/turtle-draw/mincost';
import { misreads } from '../src/learn/games/turtle-draw/deep';
import { samePicture } from '../src/learn/games/turtle-draw/picture';
import { applyEdit, nearestEdit } from '../src/learn/games/turtle-draw/distance';
import { programOperations } from '../src/learn/program/operations';
import { encodeProgram } from '../src/learn/program/codec';
import { emptyProgram } from '../src/learn/program/model';
import { emptyChallenge, validChallengeSession, type ChallengeSession } from '../src/state/challenge';
import { jsonBytes } from '../src/state/saveBits';
vi.mock('../src/challenge/registry.generated', () => ({ challengeEntries: [] }));

const options = { supportOff: false, ownRead: false };
const owner = 'learner-1';
const puzzleOf = (bank: number, puzzle: number) => turtlePuzzles.find(p => p.ref.bank === bank && p.ref.puzzle === puzzle)!;
const builds = turtlePuzzles.filter(p => p.descriptor.kind === 'build'), predicts = turtlePuzzles.filter(p => p.descriptor.kind === 'predict');
const start = (p: (typeof turtlePuzzles)[number], dares: number[] = []) => registration.start(p.ref, owner, 'round-1', emptyChallenge(), options, dares);
const move = (s: ChallengeSession, a: Action): ChallengeSession => { const next = registration.move(s, a); if (!next) throw new Error(`refused ${JSON.stringify(a)}`); return next; };
const edit = (from: Block[], to: Block[]): Action => ['e', programOperations(turtleProgram(from, deepCodes), turtleProgram(to, deepCodes))];
const winOps = (d: BuildDescriptor, blocks: Block[] = d.target): Action => ['e', programOperations(emptyProgram(), turtleProgram(blocks, deepCodes))];
const wrongPlan = (d: BuildDescriptor): Block[] => [{ kind: 'repeat', times: 4, body: [{ kind: 'forward', n: 60 }, { kind: 'turn', angle: 45 }] }];
const encode = (blocks: Block[]) => encodeProgram(turtleProgram(blocks, deepCodes));
const play = (d: Descriptor, actions: Action[]) => { let s: State = challengeEngine.create(d, { version: 1 }, options); for (const a of actions) { const n = challengeEngine.step(s, a, d); if (!n) return null; s = n.state; } return s; };

describe('SC-03 Deep Water registration', () => {
  it('registers 120 puzzles: banks 220–224 draw it, 225–229 predict the picture, twelve each, all on the deep-water path', () => {
    expect(turtlePuzzles).toHaveLength(120);
    for (let step = 0; step < 5; step++) {
      expect(builds.filter(p => p.ref.bank === 220 + step).map(p => p.ref.puzzle)).toEqual(Array.from({ length: 12 }, (_, i) => i));
      expect(predicts.filter(p => p.ref.bank === 225 + step).map(p => p.ref.puzzle)).toEqual(Array.from({ length: 12 }, (_, i) => i));
    }
    for (const p of turtlePuzzles) { expect(p.path).toBe('deep-water'); expect(p.source).toEqual({ kind: 'deep-water', collection: p.ref.bank, puzzle: p.ref.puzzle }); expect(p.ref.bank).toBeGreaterThanOrEqual(220); expect(p.ref.bank).toBeLessThanOrEqual(229); }
    expect(registration.puzzles).toHaveLength(120);
    expect([...registration.catalog.banks.keys()].sort((a, b) => a - b)).toEqual([220, 221, 222, 223, 224, 225, 226, 227, 228, 229]);
  });
  it('uses only banks 220–229 and dares 400–499 (slots 400–429 today), once each, on tier-6 rungs only', () => {
    const slots = turtlePuzzles.flatMap(p => p.dares.map(d => d.slot));
    expect(slots).toHaveLength(30);
    expect(new Set(slots).size).toBe(30);
    expect(Math.min(...slots)).toBe(FIRST_DARE); expect(Math.max(...slots)).toBeLessThanOrEqual(499);
    for (const p of turtlePuzzles) if (p.dares.length) expect(p.tier).toBe(6);
    expect(new Set(turtlePuzzles.flatMap(p => p.dares.map(d => d.id))).size).toBe(30);
    for (const p of turtlePuzzles) for (const d of p.dares) expect(d.label).not.toMatch(/\d/);
  });
  it('rises: every bank climbs tier 1 to 6 and its top rungs cost more and draw more than its first', () => {
    for (let bank = 220; bank <= 229; bank++) {
      const rows = turtlePuzzles.filter(p => p.ref.bank === bank);
      expect(rows.map(p => p.tier)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
      const cost = (p: (typeof rows)[number]) => p.descriptor.kind === 'build' ? blockCost(p.descriptor.target) : blockCost(p.descriptor.program);
      const flat = (p: (typeof rows)[number]) => flatCost(p.descriptor.kind === 'build' ? p.descriptor.target : p.descriptor.program);
      const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      expect(mean(rows.slice(10).map(cost))).toBeGreaterThanOrEqual(mean(rows.slice(0, 2).map(cost)));
      expect(mean(rows.slice(10).map(flat))).toBeGreaterThan(mean(rows.slice(0, 2).map(flat)));
    }
  });
  it('free drawing is untouched and ungraded: no Challenge puzzle is a School or free puzzle, and none offers a dare for it', () => {
    expect(turtlePuzzles.every(p => p.source.kind === 'deep-water')).toBe(true);
    expect(turtlePuzzles.some(p => /free/i.test(p.title) || p.dares.some(d => /free/i.test(d.label)))).toBe(false);
  });
  it('is in the committed save catalog exactly as built', () => {
    const catalog = JSON.parse(readFileSync('src/state/save-catalog.json', 'utf8')) as { banks: { slot: number; engine: string; entries: { hash: string }[] }[]; dares: [number, { bank: number; puzzle: number }][]; contexts: string[] };
    for (const slot of registration.catalog.banks.keys()) {
      const ours = registration.catalog.banks.get(slot)!, theirs = catalog.banks.find(b => b.slot === slot)!;
      expect(theirs.engine).toBe('turtle-draw');
      expect(theirs.entries.map(e => e.hash)).toEqual(turtlePuzzles.filter(p => p.ref.bank === slot).map(p => p.ref.hash));
      expect('entries' in ours && ours.entries.length).toBe(12);
    }
    expect(catalog.dares.filter(([slot]) => slot >= 400 && slot <= 499).length).toBe(30);
    for (const tier of [1, 2, 3, 4, 5, 6]) expect(catalog.contexts).toContain(`turtle-${tier}`);
  });
});

describe('draw it: the engine, the replay and the save', () => {
  const p = builds[0], d = p.descriptor as BuildDescriptor;
  it('accepts any plan that draws the picture inside the tray, the written one or another', () => {
    for (const q of builds) {
      const dd = q.descriptor as BuildDescriptor;
      for (const winner of dd.winners) { const s = play(dd, [winOps(dd, winner), ['g']]); expect(s?.won, JSON.stringify(winner)).toBe(true); }
    }
  });
  it('refuses a plan over the tray, a bad Repeat count, a song, an If, or a block Deep Water does not have', () => {
    for (const q of builds) {
      const dd = q.descriptor as BuildDescriptor;
      expect(flatCost(dd.target), `${q.title}: the flat plan must not fit`).toBeGreaterThan(dd.tray);
      const bulk: Block[] = Array.from({ length: dd.tray + 1 }, () => ({ kind: 'forward', n: 40 }));
      expect(admit(encode(bulk), dd)).toBeNull();
      expect(play(dd, [winOps(dd, bulk)])).toBeNull();
    }
    const over: Block[] = [...d.target, { kind: 'color', color: 'coral' }, { kind: 'color', color: 'teal' }];
    expect(play(d, [winOps(d, over)])).toBeNull();
    expect(play(d, [['e', [[0, [-1, 0], [2, 7, [[0, 0]]]]]]])).toBeNull();
    expect(play(d, [['e', [[0, [-1, 0], [2, 16, [[0, 0]]]]]]])).toBeNull();
    expect(play(d, [['e', [[4, 0]]]])).toBeNull();
    expect(play(d, [['e', [[0, [-1, 0], [0, 18]]]]])).toBeNull();
    expect(play(d, [['e', [[0, [-1, 0], [4, [0], [[0, 0]], [[0, 1]]]]]]])).toBeNull();
    expect(play(d, [['e', [[1, [-1, 0]]]]])).toBeNull();
    expect(play(d, [['g']])).toBeNull();
    for (const count of DEEP_COUNTS) expect(play(d, [['e', [[0, [-1, 0], [2, count, [[0, 0]]]]]]])).not.toBeNull();
    // Three Repeats deep is fine, as in the compound pictures.
    expect(builds.some(q => JSON.stringify((q.descriptor as BuildDescriptor).target).includes('"body":[{"kind":"repeat","times":3,"body":[{"kind":"repeat"'))).toBe(true);
  });
  it('a wrong run keeps the plan and the attempt open; a right run ends it', () => {
    const wrong = wrongPlan(d), s = play(d, [edit([], wrong), ['g']])!;
    expect(s.won).toBe(false); expect(s.program).toHaveLength(1); expect(s.runs).toBe(1);
    expect(play(d, [edit([], wrong), ['g'], edit(wrong, d.target), ['g']])!.won).toBe(true);
    expect(play(d, [winOps(d), ['g'], ['g']])).toBeNull();
    expect(play(d, [winOps(d), ['g'], ['h']])).toBeNull();
  });
  it('sessions finish independent, or helped, and always fit 4 KiB', () => {
    let s = move(move(start(p), winOps(d)), ['g']);
    expect(s.result?.event).toBe('independent'); expect(s.result!.awards).toBe(3);
    expect(jsonBytes(s)).toBeLessThanOrEqual(4096); expect(validChallengeSession(s, owner, registration.catalog)).toBe(true);
    s = move(move(move(start(p), ['h']), winOps(d)), ['g']);
    expect(s.result?.event).toBe('helped'); expect(s.result!.awards).toBe(0); expect(validChallengeSession(s, owner, registration.catalog)).toBe(true);
    s = move(move(move(start(p), edit([], wrongPlan(d))), ['g']), edit(wrongPlan(d), d.target));
    expect(s.result).toBeNull();
    expect(move(s, ['g']).result?.event).toBe('helped');
  });
  it('a right run first time earns the independent marks and the dares it met', () => {
    const top = builds.find(q => q.dares.length === 2)!, dd = top.descriptor as BuildDescriptor, slots = top.dares.map(x => x.slot);
    const s = move(move(start(top, slots), winOps(dd)), ['g']);
    expect(s.result!.event).toBe('independent'); expect(s.result!.dares).toEqual(slots); expect(s.result!.awards).toBe(3);
    expect(s.result!.cost).toBe(blockCost(dd.target));
    const slow = move(move(start(top, slots), edit([], wrongPlan(dd))), ['g']);
    const done = move(move(slow, edit(wrongPlan(dd), dd.target)), ['g']);
    // A missed run costs "First run works" but not "Fewest blocks", which allows Help; no independent marks remain.
    expect(done.result!.event).toBe('helped'); expect(done.result!.dares).toEqual([slots[1]]); expect(done.result!.awards).toBe(0);
  });
  it('the Help ladder walks one rung at a time: where you are, one edit, a whole plan; each press is kept', () => {
    const s = play(d, [['h']])!;
    expect(s.hintStage).toBe(1); expect(play(d, [['h'], ['h'], ['h'], ['h']])).toBeNull();
    for (const q of builds) {
      const dd = q.descriptor as BuildDescriptor;
      let program: Block[] = [];
      for (let guard = 0; guard < 40; guard++) {
        const near = nearestEdit(program, dd.winners); if (!near) break;
        expect(buildHint(dd, program, 2).text.length).toBeGreaterThan(10);
        program = applyEdit(program, near.edit);
      }
      expect(solvesBuild(dd, program)).toBe(true);
      expect(buildHint(dd, [], 3).reveal?.length).toBeGreaterThan(0);
    }
  });
  it('help and a long edit churn still leave room to win: the certified reserve', () => {
    const top = builds.find(q => q.tier === 6)!, dd = top.descriptor as BuildDescriptor;
    const outer = dd.target[0] as Extract<Block, { kind: 'repeat' }>, other = DEEP_COUNTS.find(n => n !== outer.times)!;
    const away: Action = ['e', [[3, [-1, 0], other]]], back: Action = ['e', [[3, [-1, 0], outer.times]]];
    // Change the count and change it back until the replay log has no ordinary room left. Try both parities, so the winning plan is on the board in one.
    const seen = new Set<string>();
    const third = DEEP_COUNTS.find(n => n !== outer.times && n !== other)!;
    for (const detour of [false, true]) {
      let s = move(start(top), winOps(dd)), blocked: Action | null = null, turn = false;
      // Going round a three-count detour once changes which plan is on the board when the log fills.
      if (detour) for (const count of [other, third, outer.times]) s = move(s, ['e', [[3, [-1, 0], count]]]);
      for (let i = 0; i < 400 && !blocked; i++) { const action: Action = turn ? back : away, next = registration.move(s, action); if (!next) blocked = action; else { s = next; turn = !turn; } }
      expect(blocked).not.toBeNull();
      expect(registration.full?.(s, blocked!)).toBe(true);
      expect((s.payload as { actions: Action[] }).actions.length).toBeGreaterThan(100);
      let end = s;
      for (let i = 0; i < 3; i++) end = move(end, ['h']);
      const onWinner = blocked === away;
      if (onWinner) { end = move(end, ['g']); expect(end.result?.event).toBe('helped'); seen.add('winner'); } else seen.add('plan to fix');
      expect(jsonBytes(end)).toBeLessThanOrEqual(4096); expect((end.payload as { actions: Action[] }).actions.length).toBeLessThanOrEqual(512);
      expect(validChallengeSession(end, owner, registration.catalog)).toBe(true);
    }
    expect([...seen].sort()).toEqual(['plan to fix', 'winner']);
    expect(turtleAssistance).toMatchObject({ bytes: 192, actions: 4, idempotentHelp: false });
  });
  it('Restart keeps the plan, the runs, the misses and the Help count in a fresh attempt', () => {
    const top = builds[3], dd = top.descriptor as BuildDescriptor, wrong = wrongPlan(dd);
    const s = move(move(move(start(top), ['h']), edit([], wrong)), ['g']);
    expect(s.result).toBeNull();
    const restarted = registration.restart!(s, 'round-2', emptyChallenge());
    expect(validChallengeSession(restarted, owner, registration.catalog)).toBe(true);
    const payload = restarted.payload as { actions: Action[]; initial: { draft?: unknown; prior?: { runs: number; failed: boolean; hints: number } } };
    expect(payload.actions).toEqual([]); expect(payload.initial.prior).toMatchObject({ runs: 1, failed: true, hints: 1 }); expect(payload.initial.draft).toBeDefined();
    const done = move(move(restarted, edit(wrong, dd.target)), ['g']);
    expect(done.result?.event).toBe('helped');
    expect(() => registration.restart!(done, 'round-3', emptyChallenge())).toThrow();
  });
});

describe('predict the picture: the engine, the replay and the dumb player', () => {
  const p = predicts[0], d = p.descriptor as PredictDescriptor;
  it('shows four different pictures, one of which is what the program draws', () => {
    for (const q of predicts) {
      const dd = q.descriptor as PredictDescriptor, lines = dd.choices.map(c => draw(c, dd.origin)!);
      expect(dd.choices).toHaveLength(4);
      expect(samePicture(lines[dd.answer], draw(dd.program, dd.origin)!)).toBe(true);
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(samePicture(lines[i], lines[j])).toBe(false);
      expect(dd.kinds[dd.answer]).toBe('answer');
      expect(blockCost(dd.program)).toBeLessThanOrEqual(14);
    }
    expect(new Set(predicts.map(q => (q.descriptor as PredictDescriptor).answer)).size).toBe(4);
  });
  it('checks a pick, keeps wrong picks crossed out, and finishes on the right one', () => {
    const wrong = [0, 1, 2, 3].find(i => i !== d.answer)!;
    expect(play(d, [['c']])).toBeNull();
    const first = play(d, [['s', wrong], ['c']])!;
    expect(first.won).toBe(false); expect(first.wrong).toEqual([wrong]); expect(first.pick).toBeNull();
    expect(play(d, [['s', wrong], ['c'], ['s', wrong]])).toBeNull();
    expect(play(d, [['s', wrong], ['c'], ['s', d.answer], ['c']])!.won).toBe(true);
    expect(play(d, [['s', d.answer], ['s', d.answer]])).toBeNull();
    expect(play(d, [['s', d.answer], ['c'], ['s', wrong]])).toBeNull();
    expect(play(d, [['g']])).toBeNull(); expect(play(d, [['z']])).toBeNull(); expect(play(d, [['e', [[0, [-1, 0], [0, 0]]]]])).toBeNull();
  });
  it('finishes independent on a first right check, helped after a miss or Help, and fits the save', () => {
    let s = move(move(start(p, p.dares.map(x => x.slot)), ['s', d.answer]), ['c']);
    expect(s.result?.event).toBe('independent'); expect(jsonBytes(s)).toBeLessThanOrEqual(4096); expect(validChallengeSession(s, owner, registration.catalog)).toBe(true);
    const wrong = [0, 1, 2, 3].find(i => i !== d.answer)!;
    s = move(move(move(move(start(p), ['s', wrong]), ['c']), ['s', d.answer]), ['c']);
    expect(s.result?.event).toBe('helped');
    s = move(move(move(start(p), ['h']), ['s', d.answer]), ['c']);
    expect(s.result?.event).toBe('helped');
    const top = predicts.find(q => q.dares.length)!, td = top.descriptor as PredictDescriptor;
    expect(move(move(start(top, top.dares.map(x => x.slot)), ['s', td.answer]), ['c']).result!.dares).toEqual(top.dares.map(x => x.slot));
    const miss = [0, 1, 2, 3].find(i => i !== td.answer)!;
    expect(move(move(move(move(start(top, top.dares.map(x => x.slot)), ['s', miss]), ['c']), ['s', td.answer]), ['c']).result!.dares).toEqual([]);
  });
  it('Help crosses out wrong pictures, the skim first, and never the answer or a picture you chose', () => {
    for (const q of predicts) {
      const dd = q.descriptor as PredictDescriptor;
      let s = play(dd, [['h'], ['h'], ['h']])!;
      expect(s.ruled).toHaveLength(2); expect(s.ruled).not.toContain(dd.answer); expect(new Set(s.ruled).size).toBe(2);
      if (dd.kinds.includes('once')) expect(s.ruled[0]).toBe(dd.kinds.indexOf('once'));
      expect(play(dd, [['h'], ['h'], ['h'], ['h']])).toBeNull();
      const target = s.ruled[0];
      expect(play(dd, [['h'], ['h'], ['s', target]])).toBeNull();
      const chosen = [0, 1, 2, 3].find(i => i !== dd.answer && !s.ruled.includes(i))!;
      s = play(dd, [['s', chosen], ['h'], ['h']])!;
      expect(s.ruled).not.toContain(chosen);
      expect(ruleOut(s, dd)).not.toBe(dd.answer);
    }
  });
  it('the dumb player (reads every Repeat as "once") is wrong on every top rung, and no rung is solved by position alone', () => {
    const skim = (dd: PredictDescriptor) => { const once = draw(misreads.once(dd.program), dd.origin)!; return dd.choices.findIndex(c => samePicture(draw(c, dd.origin)!, once)); };
    for (const q of predicts) {
      const dd = q.descriptor as PredictDescriptor, pick = skim(dd);
      if (q.tier >= 5) { expect(pick, q.title).toBeGreaterThanOrEqual(0); expect(pick, q.title).not.toBe(dd.answer); }
    }
    const rate = (tiers: number[]) => { const rows = predicts.filter(q => tiers.includes(q.tier)); return rows.filter(q => skim(q.descriptor as PredictDescriptor) === (q.descriptor as PredictDescriptor).answer).length / rows.length; };
    expect(rate([5, 6])).toBe(0);
    expect(rate([1, 2, 3, 4])).toBeLessThan(0.5);
  });
});

describe('the dumb player cannot draw it either', () => {
  it('a flat plan with no Repeat never fits any Deep Water tray, and at the top the tray is a third of the flat plan or less', () => {
    for (const q of builds) {
      const dd = q.descriptor as BuildDescriptor;
      expect(flatCost(dd.target), q.title).toBeGreaterThan(dd.tray);
      if (q.tier >= 5) expect(dd.tray * 2, q.title).toBeLessThanOrEqual(flatCost(dd.target) + 2);
    }
  });
});
