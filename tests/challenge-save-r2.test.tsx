import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptySave, parseSave } from '../src/state/validation';
import { encodeSave } from '../src/state/profiles';
import { addLearner } from '../src/learn/learners';
import { startSession } from '../src/learn/session';
import * as personalization from '../src/personalization/model';

const db = vi.hoisted(() => ({ raw: null as string | null, preserved: [] as string[], writes: 0 }));
vi.mock('../src/state/storage', () => ({ storage: {
  get: async () => db.raw,
  set: async (raw: string) => { db.writes++; db.raw = raw; },
  preserve: async (raw: string) => { db.preserved.push(raw); },
} }));
vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}) }));
let store: ReturnType<typeof useStore>, root: ReactTestRenderer | undefined;
function Probe() { const value = useStore(); useLayoutEffect(() => { store = value; }, [value]); return null; }
async function mount() { await act(async () => { root = create(<StoreProvider><Probe /></StoreProvider>); }); }
async function unmount() { if (root) await act(async () => root!.unmount()); root = undefined; }
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  db.raw = JSON.stringify({ ...emptySave(), learning: addLearner(addLearner(undefined, 'A', 'a'), 'B', 'b') });
  db.preserved = []; db.writes = 0;
});
afterEach(async () => { await unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each(['a', 'b'])('R2 P0-1: removing %s with both settings maps reloads every surviving learner', async removed => {
  await mount(); await act(async () => store.selectLearner('a'));
  const round = { ...startSession('letter-lagoon', { options: { mode: 'solo', pace: 'easy' } }, {}, 42), learner: 'a' };
  await act(async () => expect(store.learnUpdate('letter-lagoon', round, { id: null, epoch: store.epoch })).toBe(true));
  await act(async () => {
    expect(store.challengeWorking({ bridge: 'letter-lagoon' }, { owner: 'a', epoch: store.epoch, game: 'letter-lagoon', id: round.id, revision: round.revision, kind: 'school' })).toBe(true);
  });
  await act(async () => {
    store.settings({ learningBridges: { ...store.save.settings.learningBridges, family: ['beep-bot'], b: ['letter-lagoon'] }, learningComfort: {
      a: { offers: false, youngChild: true, opening: 4 }, b: { offers: true, youngChild: false, opening: 3 }, family: { offers: true, youngChild: false, opening: 2 },
    } });
  });
  const before = store.save, original = encodeSave(before), survivor = removed === 'a' ? 'b' : 'a';
  expect(() => parseSave(original)).not.toThrow();
  await act(async () => expect(await store.removeLearner(removed)).toBe(true));
  const bridges = { family: before.settings.learningBridges!.family, [survivor]: before.settings.learningBridges![survivor] };
  const comfort = { family: before.settings.learningComfort!.family, [survivor]: before.settings.learningComfort![survivor] };
  // Reload first: this catches the family's actual Recovery failure, not just a pure helper mismatch.
  await unmount(); await mount(); expect(store.recovery).toBeNull();
  expect(store.save.learning!.people.map(p => p.id).sort()).toEqual(['family', survivor].sort());
  expect(store.save.settings.learningBridges).toEqual(bridges); expect(store.save.settings.learningComfort).toEqual(comfort);
  expect(store.save.profiles!.people[survivor]).toEqual(before.profiles!.people[survivor]);
  expect(db.preserved).toContain(original);
  expect(before.settings.learningBridges![removed]).toEqual(['letter-lagoon']);
  expect(before.settings.learningComfort![removed]).toBeDefined();
  await act(async () => store.settings({ sound: false }));
  expect(parseSave(db.raw!).settings.learningBridges).toEqual(bridges);
  await unmount(); await mount(); expect(store.recovery).toBeNull(); expect(store.save.settings.sound).toBe(false);
});

it('R2 P0-1: validates learner removal before preserving or writing any candidate', async () => {
  await mount(); const before = store.save, raw = db.raw, copies = [...db.preserved], writes = db.writes, epoch = store.epoch;
  vi.spyOn(personalization, 'withoutLearner').mockReturnValue({ ...before, settings: { ...before.settings, learningBridges: { ghost: ['letter-lagoon'] } } });
  await act(async () => expect(await store.removeLearner('a')).toBe(false));
  expect(store.save).toBe(before); expect(store.epoch).toBe(epoch); expect(db.raw).toBe(raw); expect(db.writes).toBe(writes); expect(db.preserved).toEqual(copies);
});

it('R2 save audit: rejects invalid ordinary settings before publication and remains writable', async () => {
  await mount(); const before = store.save, raw = db.raw, writes = db.writes;
  await act(async () => store.settings({ learningBridges: { ghost: ['letter-lagoon'] } }));
  expect(store.save).toBe(before); expect(db.raw).toBe(raw); expect(db.writes).toBe(writes); expect(store.error).toMatch(/invalid/i);
  await act(async () => store.settings({ sound: false })); expect(parseSave(db.raw!).settings.sound).toBe(false);
  await unmount(); await mount(); expect(store.recovery).toBeNull(); expect(store.save.settings.sound).toBe(false);
});
