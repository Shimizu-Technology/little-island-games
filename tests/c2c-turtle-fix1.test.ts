import { describe, expect, it, vi } from 'vitest';
import { schoolTemplates, templateTask } from '../src/learn/games/turtle-draw/templates';
import { solves, type Block, type Task } from '../src/learn/games/turtle-draw/engine';
import { applyCardsOp, cardsHint, cardsMoves, cardsText, COUNTS, type CardsOp } from '../src/learn/games/turtle-draw/cards';
import { blockCost, parseBlocks } from '../src/learn/games/turtle-draw/dsl';
import { nearestEdit, applyEdit, editText } from '../src/learn/games/turtle-draw/distance';
import { registration } from '../src/learn/games/turtle-draw/challenge';
import { turtlePuzzles } from '../src/learn/games/turtle-draw/challenge-content';
import { admit, buildHint, challengeEngine, predictHelpLeft, predictHint, ruleOut, type Action, type BuildDescriptor, type PredictDescriptor } from '../src/learn/games/turtle-draw/challenge-engine';
import { deepCodes, turtleProgram } from '../src/learn/games/turtle-draw/program';
import { programOperations } from '../src/learn/program/operations';
import { emptyProgram } from '../src/learn/program/model';
import { encodeProgram } from '../src/learn/program/codec';
import { emptyChallenge, type ChallengeSession } from '../src/state/challenge';
vi.mock('../src/challenge/registry.generated', () => ({ challengeEntries: [] }));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Replay hints using only what the cards board offers: each named action must be one of its buttons, and applying it must reach a win. */
function replay(task: Task, start: Block[], cap = 12): number {
  let program = start, steps = 0;
  while (!solves(task, program)) {
    const op = cardsHint(task, program);
    expect(op, `no hint from ${JSON.stringify(program)}`).not.toBeNull();
    expect(cardsMoves(program).some(m => same(m, op)), `${cardsText(op!)} is not a cards-board action`).toBe(true);
    expect(cardsText(op!).length).toBeGreaterThan(10);
    program = applyCardsOp(program, op!);
    expect(blockCost(program), 'a hint never overfills the tray').toBeLessThanOrEqual(task.limit);
    if (++steps > cap) throw new Error('cards hints do not converge');
  }
  return steps;
}
describe('P1-3: every Level 1–3 hint is a tap the cards board offers', () => {
  it('Level 3: from empty, from a wrong-count Repeat, a wrong turn, an extra block and a backwards body', () => {
    schoolTemplates[2].forEach((t, i) => {
      const task = templateTask(3, i), target = task.target, loop = target[0] as Extract<Block, { kind: 'repeat' }>;
      const wrongCount = COUNTS.find(n => n !== loop.times)!;
      const starts: Block[][] = [
        [],
        [{ ...loop, times: wrongCount }],
        [{ ...loop, body: [...loop.body].reverse() }],
        [{ ...loop, body: loop.body.map(b => b.kind === 'turn' ? { ...b, angle: b.angle === 90 ? 60 : 90 } : b) }],
        [...loop.body.slice(0, 1)],
        [{ ...loop }, { kind: 'forward', n: 60 }],
        [{ kind: 'color', color: 'coral' }, ...loop.body],
      ];
      for (const start of starts) replay(task, start);
    });
  });
  it('Levels 1 and 2 (flat): from empty and from a wrong, extra or short plan', () => {
    for (const level of [1, 2]) schoolTemplates[level - 1].forEach((t, i) => {
      const task = templateTask(level, i), target = task.target;
      for (const start of [[], target.slice(0, -1), [...target, { kind: 'forward', n: 60 } as Block], target.map(b => b.kind === 'forward' ? { ...b, n: b.n === 60 ? 70 : 60 } : b), [...target].reverse()]) replay(task, start, 20);
    });
  });
  it('the empty Level 3 plan is told to add the body first, then to wrap it, never to add a Repeat first', () => {
    const task = templateTask(3, 0), first = cardsHint(task, [])!;
    expect(first.op).toBe('add');
    expect(cardsText(first)).toMatch(/^Tap .* to add it at the end\.$/);
    let p: Block[] = [];
    const ops: CardsOp[] = [];
    while (!solves(task, p)) { const op = cardsHint(task, p)!; ops.push(op); p = applyCardsOp(p, op); }
    expect(ops.at(-1)!.op).toBe('wrap');
  });
  it('a Repeat with the wrong count has a count button on the board, and choosing it can finish the picture', () => {
    const task = templateTask(3, 0), loop = task.target[0] as Extract<Block, { kind: 'repeat' }>;
    const wrong: Block[] = [{ ...loop, times: COUNTS.find(n => n !== loop.times)! }];
    const fix: CardsOp = { op: 'count', path: [0], from: wrong[0].kind === 'repeat' ? wrong[0].times : 0, to: loop.times };
    expect(cardsMoves(wrong).some(m => same(m, fix))).toBe(true);
    expect(solves(task, applyCardsOp(wrong, fix))).toBe(true);
    expect(cardsText(fix)).toMatch(/^Tap block 1 \(Repeat ×\d\), then choose ×\d\.$/);
  });
});

describe('P2-1: hints respect a full tray and an already-winning plan', () => {
  it('a full tray is told to make room, not to add a block the tray would refuse', () => {
    const task = templateTask(3, 0), body = (task.target[0] as Extract<Block, { kind: 'repeat' }>).body;
    const full: Block[] = [{ kind: 'repeat', times: 3, body: [body[0]] }, { kind: 'forward', n: 60 }, { kind: 'forward', n: 70 }];
    expect(blockCost(full)).toBe(task.limit);
    const near = nearestEdit(full, [task.target], { full: true })!;
    expect(near.edit.op).not.toBe('insert');
    const next = applyEdit(full, near.edit);
    expect(blockCost(next)).toBeLessThanOrEqual(task.limit);
    expect(editText(near.edit, full)).toMatch(/^(Remove|Change)/);
    // The place named is the right block even though inserts came first in the alignment.
    expect(nearestEdit(full, [task.target], { full: false })!.edit.op).toBe('insert');
  });
  it('a winning plan that is not the written one is told it matches', () => {
    const d = turtlePuzzles.find(p => p.descriptor.kind === 'build')!.descriptor as BuildDescriptor;
    const alt = [{ kind: 'color', color: 'coral' } as Block, ...d.target];
    if (solvesAlt(d, alt)) expect(buildHint(d, alt, 2).text).toBe('Your blocks match. Press Go.');
    expect(buildHint(d, d.target, 1).text).toBe('Your blocks match. Press Go.');
  });
  it('the Deep Water hint on a full tray never proposes an insert', () => {
    for (const p of turtlePuzzles) if (p.descriptor.kind === 'build') {
      const d = p.descriptor;
      const full: Block[] = Array.from({ length: d.tray }, () => ({ kind: 'forward', n: 40 }));
      const text = buildHint(d, full, 2).text;
      expect(text).not.toMatch(/^Add /);
    }
  });
});
const solvesAlt = (d: BuildDescriptor, p: Block[]) => blockCost(p) <= d.tray && challengeEngine.step(challengeEngine.create(d, { version: 1 }, { supportOff: false, ownRead: false }), ['e', programOperations(emptyProgram(), turtleProgram(p, deepCodes))], d) !== null;

const options = { supportOff: false, ownRead: false };
const start = (p: (typeof turtlePuzzles)[number], dares: number[] = []) => registration.start(p.ref, 'learner-1', 'round-1', emptyChallenge(), options, dares);
const move = (s: ChallengeSession, a: Action): ChallengeSession => { const n = registration.move(s, a); if (!n) throw new Error(`refused ${JSON.stringify(a)}`); return n; };
const builds = turtlePuzzles.filter(p => p.descriptor.kind === 'build'), predicts = turtlePuzzles.filter(p => p.descriptor.kind === 'predict');
describe('P1-1: Keep my plan keeps Help on the record', () => {
  it('3× Help with no runs, restart, enter the revealed plan, Go: helped, no independent awards or dares', () => {
    const top = builds.find(q => q.dares.length === 2)!, d = top.descriptor as BuildDescriptor, slots = top.dares.map(x => x.slot);
    let s = start(top, slots);
    for (let i = 0; i < 3; i++) s = move(s, ['h']);
    const restarted = registration.restart!(s, 'round-2', emptyChallenge());
    expect((restarted.payload as { initial: { prior: { failed: boolean; hints: number } } }).initial.prior).toMatchObject({ failed: true, hints: 3 });
    const done = move(move(restarted, ['e', programOperations(emptyProgram(), turtleProgram(d.target, deepCodes))]), ['g']);
    expect(done.result!.event).toBe('helped');
    expect(done.result!.awards).toBe(0);
    // Dares that welcome Help are still earned; none that need independence.
    expect(done.result!.dares).toEqual(top.dares.filter(x => x.help === 'allowed').map(x => x.slot).filter(slot => done.result!.dares.includes(slot)));
  });
});

describe('P1-2: Predict Help never records undefined and tells the truth', () => {
  const ruledOk = (s: { ruled: number[] }) => expect(s.ruled.every(n => Number.isInteger(n))).toBe(true);
  it('2 wrong checks then 3 Helps; 3 wrong checks then 2 Helps; a chosen picture is never ruled out', () => {
    for (const q of predicts) {
      const d = q.descriptor as PredictDescriptor, wrongs = [0, 1, 2, 3].filter(i => i !== d.answer);
      const run = (checks: number[], helps: number) => {
        let s = challengeEngine.create(d, { version: 1 }, options), refused = 0;
        for (const i of checks) s = challengeEngine.step(challengeEngine.step(s, ['s', i], d)!.state, ['c'], d)!.state;
        for (let h = 0; h < helps; h++) { const n = challengeEngine.step(s, ['h'], d); if (!n) refused++; else s = n.state; }
        ruledOk(s);
        expect(new Set(s.ruled).size).toBe(s.ruled.length);
        expect(s.ruled.every(i => i !== d.answer && !s.wrong.includes(i))).toBe(true);
        return { s, refused };
      };
      const a = run(wrongs.slice(0, 2), 3);
      expect(a.s.ruled).toHaveLength(1); expect(a.refused).toBe(1);
      expect(predictHelpLeft(a.s, d)).toBe(false);
      const b = run(wrongs, 2);
      expect(b.s.ruled).toHaveLength(0); expect(b.refused).toBe(1);
      expect(ruleOut(b.s, d)).toBeNull();
      const picked = challengeEngine.step(challengeEngine.step(challengeEngine.create(d, { version: 1 }, options), ['h'], d)!.state, ['s', wrongs[0]], d)!.state;
      expect(ruleOut(picked, d)).not.toBe(wrongs[0]);
    }
  });
  it('stage 2 calls a picture "a quick reading" only when it is', () => {
    for (const q of predicts) {
      const d = q.descriptor as PredictDescriptor;
      let s = challengeEngine.create(d, { version: 1 }, options);
      s = challengeEngine.step(challengeEngine.step(s, ['h'], d)!.state, ['h'], d)!.state;
      const text = predictHint(d, 2, s.ruled);
      expect(/quick reading/.test(text)).toBe(d.kinds[s.ruled[0]] === 'once');
    }
    expect(predicts.filter(q => (q.descriptor as PredictDescriptor).kinds.includes('once')).length).toBeLessThan(predicts.length);
  });
});

describe('P2-3: admit reads the saved tree, not the flattened blocks', () => {
  const d = builds[0].descriptor as BuildDescriptor;
  it('refuses an empty Repeat with a count the puzzle does not offer, and groups, songs and conditions', () => {
    expect(admit([1, [[2, 7, []]], []], d)).toBeNull();
    expect(admit([1, [[2, 16, []]], []], d)).toBeNull();
    expect(admit([1, [[1, [[0, 12]]]], []], d)).toBeNull();
    expect(admit([1, [[3, 0]], [[[0, 12]]]], d)).toBeNull();
    expect(admit([1, [[4, [0], [[0, 12]], []]], []], d)).toBeNull();
    expect(admit([1, [[2, 5, [[0, 12]]]], []], d)).not.toBeNull();
    expect(admit(encodeProgram(turtleProgram([{ kind: 'repeat', times: 5, body: [{ kind: 'forward', n: 40 }] }], deepCodes)), d)).not.toBeNull();
  });
});
