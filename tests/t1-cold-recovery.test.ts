import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { makeRegistration } from '../src/learn/games/logic-lagoon/challenge';
import { createBankLoader } from '../src/puzzles/loader';
import { catalogRoot } from '../src/puzzles/catalog';
import { emptyChallenge, validChallengeSession, type ChallengeSession } from '../src/state/challenge';
import { recoverChallengeDrafts, putProgress, progressFor } from '../src/state/challengeDrafts';
import { emptySave } from '../src/state/validation';
import { migrateProfiles } from '../src/state/profiles';

const loader = () => createBankLoader({ root: catalogRoot(), transport: { read: async asset => readFileSync(`src/content/puzzles/assets/${asset}.lipuzzle`, 'utf8') } });
it.each([false, true])('cold recovery keeps packed notes, undo, help and misses (legacy upgrade %s)', async legacy => {
  const warm = makeRegistration(loader), ref = await warm.packed!.choose(261, emptyChallenge());
  let before = warm.start(ref, 'family', 'cold-notes', emptyChallenge(), { supportOff: false, ownRead: false }, []);
  if (legacy) before = { ...before, payload: { version: 1, initial: { version: 1 }, options: { supportOff: false, ownRead: false }, firstSolutions: [], actions: [['c'], ['h'], ['p'], ['w', 0, 2]] } };
  let after = before;
  for (const a of legacy ? [['p'], ['c'], ['h']] : [['p'], ['w', 0, 2], ['c'], ['h']]) {
    const next = warm.move(after, a); expect(next).not.toBeNull(); after = next!;
  }
  const base = putProgress({ ...migrateProfiles(emptySave()), saveRevision: 'cold-base' }, 'family', { ...emptyChallenge(), nextOrdinal: 2, paused: [before] });
  const original = JSON.stringify(base), row = JSON.stringify({ version: 1, base: 'cold-base', session: after });
  const coldLoader = loader(), read = vi.spyOn(coldLoader, 'entry'), cold = makeRegistration(() => coldLoader), preserve = vi.fn();
  const codec = cold.catalog.codecs.get(cold.codec)!;
  expect(codec.extends(before, after)).toBe(true);
  const storage = { get: async () => null, set: async () => {}, preserve, listRecovery: async () => [], readRecovery: async () => null, readDrafts: async () => [row] };
  const recovered = await recoverChallengeDrafts(base, storage, cold.catalog);
  const resumed = progressFor(recovered, 'family')!.paused[0];
  expect(resumed).toEqual(after); expect(read).not.toHaveBeenCalled(); expect(preserve).not.toHaveBeenCalled(); expect(JSON.stringify(base)).toBe(original);
  await cold.packed!.prepare(resumed.puzzle);
  expect(validChallengeSession(resumed, 'family', cold.catalog)).toBe(true);
  expect(cold.completionFacts!(resumed)).toEqual({ helpUsed: true, failed: true });
  const bad = (change: object): ChallengeSession => ({ ...after, payload: { ...(after.payload as object), ...change } });
  expect(codec.extends(after, bad({ helps: 0 }))).toBe(false);
  expect(codec.extends(after, bad({ checks: 0, failed: false, wrong: null }))).toBe(false);
  expect(codec.extends(after, bad({ options: { supportOff: true, ownRead: false } }))).toBe(false);
  if (!legacy) {
    const undo = cold.move(resumed, ['u'])!; expect(undo).not.toBeNull();
    expect(cold.completionFacts!(undo)).toEqual({ helpUsed: true, failed: true });
  }
});
