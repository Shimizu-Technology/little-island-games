/** R3-F1: a whole save or backup holding a Home written by the previous head (20,480-byte undo cap)
 * opens at startup and restores from a backup; the first Home edit through the real Store fits it. */
import React, { createContext, useLayoutEffect } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import twentySteps from './fixtures/home-undo-legacy/twenty-steps.json';
import { StoreProvider, useStore } from '../src/state/Store';
import { parseSave, type Save } from '../src/state/validation';
import { encodeSave } from '../src/state/profiles';
import { personFor } from '../src/personalization/model';
import { useHomeStore, UNDO_TRIMMED_NOTE } from '../src/home/useHomeStore';
import { HOME_UNDO_BYTES, undoBytes } from '../src/home/undoHistory';
import { migrateHome, type HomeAction, type HomeStateV2 } from '../src/home/model';

const db = vi.hoisted(() => ({ raw: null as string | null, preserved: [] as string[] }));
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (s: string) => { db.raw = s; }, preserve: async (s: string) => { db.preserved.push(s); }, readDrafts: async () => [], discardSession: async () => {} } }));
vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}) }));
let store: ReturnType<typeof useStore>, home: ReturnType<typeof useHomeStore> | undefined, root: ReturnType<typeof TestRenderer.create> | undefined;
function Probe() { const s = useStore(); useLayoutEffect(() => { store = s; }, [s]); return null; }
/** The route's wiring: the active learner's saved home, written through Store.personalize. */
function Home() {
  const s = useStore(), owner = s.save.learning?.active ?? 'family', expected = { learner: owner, epoch: s.epoch };
  const h = useHomeStore({}, personFor(s.save).home, (next) => s.personalize({ home: next }, expected));
  useLayoutEffect(() => { home = h; }, [h]);
  return null;
}
/** Like the route: Home mounts once the save is ready, and again for each new save epoch. */
function Route() { const s = useStore(); return s.ready && !s.recovery ? <Home key={s.epoch} /> : null; }
const legacyHome = () => JSON.parse(JSON.stringify(twentySteps)) as HomeStateV2;
/** The reviewer's envelope: the 2-envelope fixture, with the previous head's Home for the active learner. */
function legacyBackup(): string {
  const envelope: Save = parseSave(readFileSync('tests/fixtures/save-v3/main-envelope-2.json', 'utf8'));
  const owner = envelope.learning!.active;
  envelope.personalization!.people[owner].home = legacyHome() as never;
  return encodeSave(envelope);
}
const activeHome = () => personFor(store.save).home as HomeStateV2;
const savedHome = () => { const s = parseSave(db.raw!); return s.personalization!.people[s.learning!.active].home as HomeStateV2; };
beforeEach(() => { db.raw = null; db.preserved = []; home = undefined; vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(async () => { if (root) await act(async () => { root!.unmount(); }); root = undefined; vi.unstubAllGlobals(); });

it('the reviewer\'s backup parses: the old undo is within the read cap', () => {
  const raw = legacyBackup();
  expect(() => parseSave(raw)).not.toThrow();
  expect(undoBytes((parseSave(raw).personalization!.people[parseSave(raw).learning!.active].home as HomeStateV2).undo!)).toBe(16_885);
});
it('startup: the old Home opens unchanged, and the first edit is saved within today\'s cap with the note', async () => {
  db.raw = legacyBackup();
  await act(async () => { root = TestRenderer.create(<StoreProvider><Probe /><Route /></StoreProvider>); });
  expect(store.ready).toBe(true);
  expect(store.recovery).toBeNull();
  expect(activeHome()).toEqual(migrateHome(legacyHome()));
  expect(home!.recoveryOriginal).toBeUndefined();
  expect(home!.canUndo).toBe(true);
  await act(async () => home!.dispatch({ type: 'find-friends', roomId: 'home' } as HomeAction));
  expect(home!.message).toBe(UNDO_TRIMMED_NOTE);
  expect(store.error ?? null).toBeNull();
  const saved = savedHome();
  expect(undoBytes(saved.undo!)).toBeLessThanOrEqual(HOME_UNDO_BYTES);
  expect(saved.undo!.steps).toHaveLength(20);
});
it('backup restore: the old backup restores, and the first edit afterwards is saved within today\'s cap', async () => {
  db.raw = encodeSave(parseSave(readFileSync('tests/fixtures/save-v3/main-envelope-2.json', 'utf8')));
  await act(async () => { root = TestRenderer.create(<StoreProvider><Probe /></StoreProvider>); });
  expect(store.recovery).toBeNull();
  const backup = legacyBackup();
  await act(async () => { await store.restore(backup); });
  expect(store.recovery).toBeNull();
  expect(activeHome()).toEqual(migrateHome(legacyHome()));
  expect(savedHome()).toEqual(migrateHome(legacyHome()));
  // The route remounts Home for the restored save.
  await act(async () => { root!.update(<StoreProvider><Probe /><Route /></StoreProvider>); });
  await act(async () => home!.dispatch({ type: 'find-friends', roomId: 'home' } as HomeAction));
  expect(home!.message).toBe(UNDO_TRIMMED_NOTE);
  expect(undoBytes(savedHome().undo!)).toBeLessThanOrEqual(HOME_UNDO_BYTES);
});
