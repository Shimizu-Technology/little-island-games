import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import { engine as crab, currentLevel, tick as crabTick } from '../src/learn/games/crab-commands/engine';
import { crabProgram, withCrabProgram } from '../src/learn/games/crab-commands/program';
import { engine as beep, tick as beepTick } from '../src/learn/games/beep-bot/engine';
import { beepProgram } from '../src/learn/games/beep-bot/program';
import { engine as turtle, advance as turtleTick } from '../src/learn/games/turtle-draw/engine';
import { turtleProgram } from '../src/learn/games/turtle-draw/program';
import { encodeProgram, sessionBytes } from '../src/learn/program/codec';
import { optionsAtLevel } from '../src/learn/levelOptions';
import { emptySave, parseSave } from '../src/state/validation';
import { migrateProfiles, encodeSave } from '../src/state/profiles';
import { validLearnSession } from '../src/learn/session';
import { registration as crabEntry } from '../src/challenge/registrations/crab-commands';
import { registration as beepEntry } from '../src/learn/games/beep-bot/challenge';
import { crabPuzzles } from '../src/learn/games/crab-commands/challenge-content';
import { beepPuzzles } from '../src/learn/games/beep-bot/challenge-content';
import { emptyChallenge, validChallengeSession } from '../src/state/challenge';
import { fromFlat, type Program } from '../src/learn/program/model';
vi.mock('../src/challenge/registry.generated', () => ({ challengeEntries: [] }));
const context = { skills: {}, rng: () => 0, starter: 0 as const, today: 1 };
const freeze = <T>(v: T): T => { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };

it('K7 preserves exact frozen v1/v2/3.0.0 fixtures and migration/restore round trips', () => {
  const dir = 'tests/fixtures/save-v3/';
  for (const receipt of ['RECEIPT.json', 'FIX_RECEIPT.json']) {
    const meta = JSON.parse(readFileSync(dir + receipt, 'utf8')) as { files: Record<string, { sha256: string }> };
    for (const [name, { sha256 }] of Object.entries(meta.files)) {
      const raw = readFileSync(dir + name, 'utf8'); expect(createHash('sha256').update(raw).digest('hex')).toBe(sha256);
      if (!name.endsWith('.json') || name.includes('last-bytes') || name.includes('near-limit')) continue;
      const old = parseSave(raw), original = JSON.stringify(old), next = migrateProfiles(freeze(old));
      expect(JSON.stringify(old)).toBe(original); expect(parseSave(encodeSave(next))).toEqual(next);
    }
  }
});

it('K7 resumes paused Crab, Beep and Turtle rounds without changing legacy data; exact block drafts round trip', () => {
  const options = optionsAtLevel({ mode: 'solo', pace: 'easy' }, 1);
  const c = crab.create(options, context), b = beep.create(options, context), t = turtle.create(options, context);
  const legacyCrab = freeze({ ...c, program: ['right'] as typeof c.program, cards: 1, cursor: 1, running: false });
  const legacyBeep = freeze({ ...b, program: b.puzzles[0].answer, cursor: 1, running: false });
  const legacyTurtle = freeze({ ...t, program: t.tasks[0].target, cursor: 1, running: false, completed: [t.tasks[0].target] });
  // Crab's one-card stopped prefix is a legitimate exhausted legacy plan.
  const states = [legacyCrab, legacyBeep, legacyTurtle]; const before = states.map(s => JSON.stringify(s));
  const nestedCrab = withCrabProgram(legacyCrab, crabProgram(legacyCrab.program), currentLevel(c))!;
  const drafts = [nestedCrab, { ...legacyBeep, blockDraft: encodeProgram(beepProgram(legacyBeep.program)) }, { ...legacyTurtle, blockDraft: encodeProgram(turtleProgram(legacyTurtle.program)) }];
  for (let i = 0; i < 3; i++) {
    const e = [crab, beep, turtle][i], game = e.id;
    expect(e.validate(states[i], options), game).toBe(true);
    expect(e.validate(drafts[i], options), game).toBe(true);
    const session = { game, version: 1 as const, id: `k7-${game}`, revision: 0, options, state: drafts[i] };
    expect(sessionBytes(session), game).toBeLessThanOrEqual(4096);
    expect(validLearnSession(JSON.parse(JSON.stringify(session))), game).toBe(true);
    const save = { ...emptySave(), learn: { [game]: session } };
    expect(parseSave(JSON.stringify(save)).learn?.[game]).toEqual(session);
    expect(JSON.stringify(states[i])).toBe(before[i]);
  }
  expect(crabTick({ ...legacyCrab, cursor: 0, running: true }).program).toEqual(legacyCrab.program);
  expect(beepTick({ ...legacyBeep, cursor: 0, running: true }).program).toEqual(legacyBeep.program);
  expect(turtleTick({ ...legacyTurtle, cursor: 0, running: true }).program).toEqual(legacyTurtle.program);
});

it('K7 rejects mismatched executable projections, unknown fields and byte overflow without mutating accepted rounds', () => {
  const options = optionsAtLevel({ mode: 'solo', pace: 'easy' }, 1), c = crab.create(options, context);
  const accepted = withCrabProgram(c, crabProgram(['right']), currentLevel(c))!, snapshot = JSON.stringify(accepted);
  expect(crab.validate({ ...accepted, program: ['left'] }, options)).toBe(false);
  expect(crab.validate({ ...accepted, blockDraft: [1, [[0, 4]], []] }, options)).toBe(false);
  expect(crab.validate({ ...accepted, forged: true }, options)).toBe(false);
  expect(crab.validate({ ...accepted, cursor: 500 }, options)).toBe(false);
  const cyclic: unknown[] = []; cyclic.push(cyclic);
  expect(crab.validate({ ...accepted, blockDraft: cyclic }, options)).toBe(false);
  expect(JSON.stringify(accepted)).toBe(snapshot);
});

it('K7 replay codecs recompute nested wins and costs; reject forged results and retain audit across undo', () => {
  const opts = { supportOff: false, ownRead: false };
  const cp = crabPuzzles.find(p => p.descriptor.level.pace === 'easy')!;
  let c = crabEntry.start(cp.ref, 'family', 'k7-crab', emptyChallenge(), opts, []);
  // The shared program may be empty while building a repeat; it cannot forge a result.
  const nested: Program = { version: 1, songs: [], body: [{ kind: 'repeat', times: 2, body: [{ kind: 'command', command: 1 }] }] };
  c = crabEntry.move(c, ['b', encodeProgram(nested)])!; expect(c).not.toBeNull();
  expect(validChallengeSession(c, 'family', crabEntry.catalog)).toBe(true);
  expect(validChallengeSession({ ...c, result: { event: 'independent', awards: 0, dares: [], cost: 0, solution: null } }, 'family', crabEntry.catalog)).toBe(false);
  const helped = crabEntry.move(c, ['h'])!, undone = crabEntry.move(helped, ['u'])!;
  expect((undone.payload as { actions: unknown[] }).actions).toHaveLength(3);
  expect(crabEntry.move(c, ['b', [1, [[3, 0]], []]])).toBeNull();
  const bp = beepPuzzles.find(p => p.descriptor.level === 3)!;
  let b = beepEntry.start(bp.ref, 'family', 'k7-beep', emptyChallenge(), opts, []);
  const plan = beepProgram(bp.descriptor.winners[0]);
  b = beepEntry.move(b, ['b', encodeProgram(plan)])!; b = beepEntry.move(b, ['g'])!;
  expect(b.result?.event).toBe('independent'); expect(validChallengeSession(b, 'family', beepEntry.catalog)).toBe(true);
  expect(validChallengeSession({ ...b, result: { ...b.result!, cost: 0 } }, 'family', beepEntry.catalog)).toBe(false);
  expect(beepEntry.move(beepEntry.start(bp.ref, 'family', 'bad', emptyChallenge(), opts, []), ['b', encodeProgram(fromFlat([4]))])).toBeNull();
});
