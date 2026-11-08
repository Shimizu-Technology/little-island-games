import React, { createContext, useLayoutEffect } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { storage as native } from '../src/state/storage.native';
import { storage as web } from '../src/state/storage.web';
import type { StorageAdapter } from '../src/state/storage';
import { StoreProvider, useStore } from '../src/state/Store';
import { Recovery } from '../src/components/Recovery';
import { emptySave, parseSave } from '../src/state/validation';
import { encodeSave } from '../src/state/profiles';
import type { ChallengeExpected } from '../src/state/challengeDrafts';
import { installFixture, moved, session } from './helpers/save-contract';

// The Store uses each production adapter. Only Expo's transport is replaced by real Node SQL.
const sql = await vi.hoisted(async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(':memory:');
  const tx = {
    runAsync: async (query: string, ...args: (string | number)[]) => db.prepare(query).run(...args),
    getFirstAsync: async (query: string, ...args: (string | number)[]) => db.prepare(query).get(...args),
    getAllAsync: async (query: string, ...args: (string | number)[]) => db.prepare(query).all(...args),
  };
  return { db, api: { ...tx, execAsync: async (query: string) => db.exec(query), withExclusiveTransactionAsync: async (work: (t: typeof tx) => Promise<void>) => {
    db.exec('BEGIN');
    try { await work(tx); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; }
  } } };
});
const route = vi.hoisted(() => ({ adapter: null as StorageAdapter | null, failSet: false, failGet: false, hold: false, entered: false, release: null as (() => void) | null, exported: '' }));
vi.mock('expo-sqlite', () => ({ openDatabaseAsync: async () => sql.api }));
vi.mock('../src/state/storage', () => ({ storage: new Proxy({}, { get: (_, key) => {
  if (key === 'set') return async (...args: Parameters<StorageAdapter['set']>) => {
    if (route.hold) { route.entered = true; await new Promise<void>(resolve => { route.release = resolve; }); }
    if (route.failSet) throw new Error('private SQLite failure details');
    return route.adapter!.set(...args);
  };
  if (key === 'get') return async () => { if (route.failGet) throw new Error('read unavailable'); return route.adapter!.get(); };
  return route.adapter![key as keyof StorageAdapter];
} }) }));
vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove() {} }) }, ScrollView: 'ScrollView' }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}) }));
vi.mock('../src/components/ui', () => ({ Button: 'Button', Copy: 'Copy', Heading: 'Heading', styles: { content: {} } }));
vi.mock('../src/state/backup', () => ({ exportBackup: async (raw: string) => { route.exported = raw; } }));
installFixture();
const map = new Map<string, string>();
const local = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); }, removeItem: (key: string) => { map.delete(key); }, get length() { return map.size; }, key: (index: number) => [...map.keys()][index] ?? null };
let store: ReturnType<typeof useStore>, root: ReturnType<typeof TestRenderer.create> | undefined;
function Probe() { const current = useStore(); useLayoutEffect(() => { store = current; }, [current]); return current.recovery ? <Recovery /> : null; }
async function mount() { await act(async () => { root = TestRenderer.create(<StoreProvider><Probe /></StoreProvider>); }); }
async function unmount() { await act(async () => { root?.unmount(); root = undefined; }); }
const expected = (s: ReturnType<typeof session>): ChallengeExpected => ({ epoch: store.epoch, owner: s.owner, game: s.game, id: s.id, revision: s.revision });
async function start(s = session()) { await act(async () => expect(await store.challengeSave(s, { ...expected(s), id: null, revision: null })).toBe(true)); return s; }
async function uncertainFinish() {
  await mount(); let s = await start();
  for (let i = 0; i < 3; i++) { const next = moved(s); await act(async () => expect(await store.challengeSave(next, expected(s))).toBe(true)); s = next; }
  // Keep accepted ambient work in memory while its envelope write fails too.
  route.failSet = true;
  await act(async () => store.settings({ sound: false }));
  const accepted = encodeSave(store.save);
  route.failSet = route.failGet = true;
  await act(async () => expect(await store.challengeSave(moved(s, { end: true }), expected(s))).toBe(false));
  expect(store.recovery).toMatch(/could not be confirmed/);
  return accepted;
}
beforeEach(async () => {
  vi.stubGlobal('localStorage', local); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  map.clear(); await native.get(); sql.db.exec('DELETE FROM app_data');
  Object.assign(route, { failSet: false, failGet: false, hold: false, entered: false, release: null, exported: '' });
});
afterEach(async () => { route.release?.(); await unmount(); vi.unstubAllGlobals(); });
for (const [name, adapter] of [['native', native], ['web', web]] as const) {
  async function seed(raw = JSON.stringify(emptySave())) { route.adapter = adapter; await adapter.set(raw); }
  it(`${name}: R2-P1-1 mid-round discard never buries the exact pre-update copy`, async () => {
    const original = readFileSync('tests/fixtures/save-v3/main-envelope-2.json', 'utf8');
    await seed(original); await mount();
    await act(async () => store.selectLearner('family'));
    const copies = await adapter.listRecovery(); expect(copies).toHaveLength(1);
    for (let i = 0; i < 12; i++) {
      const s = await start(session('family', `discard-${i}`, i + 1)), next = moved(s);
      await act(async () => expect(await store.challengeSave(next, expected(s))).toBe(true));
      await act(async () => expect(await store.challengeDiscard(expected(next))).toBe(true));
      expect(await adapter.readDrafts!()).toEqual([]);
    }
    expect(await adapter.listRecovery()).toEqual(copies);
    expect(await adapter.readRecovery(copies[0].key)).toBe(original);
    await unmount(); await mount(); expect(store.save.challenge!.paused).toEqual([]);
    const ring = name === 'native' ? sql.db.prepare("SELECT value FROM app_data WHERE key LIKE 'discarded-session-%'").all().map(r => r.value) : [...map].filter(([k]) => k.startsWith('little-island.discarded-session-')).map(([, v]) => v);
    expect(ring).toHaveLength(8); expect(ring.map(raw => JSON.parse(raw as string).revision)).toEqual(Array(8).fill(1));
  });
  it(`${name}: R2-P2-1 reachable Recovery export contains the latest accepted work`, async () => {
    await seed(); const accepted = await uncertainFinish();
    const button = root!.root.findAllByType('Button' as never).find(b => /backup/i.test(b.props.children));
    expect(button).toBeDefined(); await act(async () => button!.props.onPress());
    expect(parseSave(route.exported)).toEqual(parseSave(accepted));
    expect(parseSave(route.exported).settings.sound).toBe(false);
    expect(parseSave(route.exported).challenge!.paused[0].revision).toBe(3);
  });
  it(`${name}: R2-P2-1 Start fresh preserves the live save even when Recovery is active`, async () => {
    await seed(); const accepted = await uncertainFinish(); route.failSet = route.failGet = false;
    await act(async () => store.startFresh());
    const kept = await Promise.all((await adapter.listRecovery()).map(entry => adapter.readRecovery(entry.key)));
    expect(kept).toContain(accepted); expect(store.save.challenge!.paused).toEqual([]);
  });
  for (const boundary of ['start', 'finish'] as const) it(`${name}: R2-P2-2 ${boundary} reports refused ambient commits and permits an explicit retry`, async () => {
    await seed(); await mount(); const s = boundary === 'start' ? session() : await start();
    route.hold = true;
    let write!: Promise<boolean>;
    await act(async () => { write = store.challengeSave(boundary === 'start' ? s : moved(s, { end: true }), boundary === 'start' ? { ...expected(s), id: null, revision: null } : expected(s)); });
    expect(route.entered).toBe(true);
    await act(async () => { store.settings({ sound: false }); store.markCoached('crab-commands'); });
    expect(store.error).toMatch(/try.*again.*saving finishes/i);
    route.hold = false; route.release!(); await act(async () => expect(await write).toBe(true));
    expect(store.error).toMatch(/try.*again.*saving finishes/i);
    expect(store.save.settings.sound).toBe(true); expect(store.save.coached ?? []).not.toContain('crab-commands');
    await act(async () => { store.settings({ sound: false }); store.markCoached('crab-commands'); });
    await unmount(); await mount();
    expect(store.save.settings.sound).toBe(false); expect(store.save.coached).toContain('crab-commands');
  });
  for (const action of ['finish', 'discard', 'person'] as const) it(`${name}: R2-P3-3 ${action} failures report a family-facing error and keep accepted work`, async () => {
    await seed(); await mount(); const s = await start(), accepted = encodeSave(store.save);
    route.failSet = true;
    await act(async () => {
      const result = action === 'finish' ? await store.challengeSave(moved(s, { end: true }), expected(s)) : action === 'discard' ? await store.challengeDiscard(expected(s)) : await store.covePerson({ type: 'add', name: 'Adult', id: 'cove-adult' }, store.epoch);
      expect(result).toBe(false);
    });
    expect(store.error).toMatch(/could not be/); expect(store.error).not.toMatch(/SQLite|private/);
    expect(encodeSave(store.save)).toBe(accepted); expect(await adapter.get()).toBe(accepted);
  });
  it(`${name}: R2-P3-1 repeated failed upgrades keep one exact recovery copy`, async () => {
    const original = readFileSync('tests/fixtures/save-v3/fix-last-bytes-2.json', 'utf8');
    await seed(original); await mount(); expect(store.recovery).toMatch(/more room/);
    await act(async () => store.retry()); await unmount(); await mount();
    const copies = await adapter.listRecovery(); expect(copies).toHaveLength(1);
    expect(await adapter.readRecovery(copies[0].key)).toBe(original); expect(await adapter.get()).toBe(original);
  });
}
