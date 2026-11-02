import React, { createContext, useLayoutEffect } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StoreProvider, useStore } from '../src/state/Store';
import { newLibraryChild, libraryChild } from '../src/library/state';
import { emptySave, parseSave } from '../src/state/validation';
import { newExploreProgress } from '../src/explore/progress';
import { retainPageDraft, pageDraftKey, pendingPage, clearPageDrafts } from '../src/library/drafts';
import { familyLearners, addLearner } from '../src/learn/learners';
const db = vi.hoisted(() => ({ raw: null as string | null, preserved: [] as string[], set: vi.fn<(raw: string) => Promise<void>>(), preserve: vi.fn<(raw: string) => Promise<void>>() }));
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: (raw: string) => db.set(raw), preserve: (raw: string) => db.preserve(raw) } }));
vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}) }));
let store: ReturnType<typeof useStore>;
let root: ReturnType<typeof TestRenderer.create> | undefined;
function Probe() { const value = useStore(); useLayoutEffect(() => { store = value; }, [value]); return null; }
async function mount() { await act(async () => { root = TestRenderer.create(<StoreProvider><Probe /></StoreProvider>); }); }
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
beforeEach(() => {
  clearPageDrafts(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); db.raw = null; db.preserved = [];
  db.set.mockReset().mockImplementation(async raw => { db.raw = raw; });
  db.preserve.mockReset().mockImplementation(async raw => { db.preserved.push(raw); });
});
afterEach(async () => { if (root) await act(async () => { root!.unmount(); }); root = undefined; vi.unstubAllGlobals(); });
const legacy = () => { const progress = newExploreProgress(); progress.query = 'moon'; return { ...emptySave(), explore: { favorites: ['moon', 'retired-topic'], progress } }; };

describe('Store Library persistence and recovery', () => {
  it('applies delayed route patches against current data without resetting a reader or creation', async () => {
    await mount();
    const epoch = store.epoch;
    await act(async () => {
      store.libraryPatch({ bookPages: { 'busy-day': 2 } }, epoch, 'family');
      store.libraryPatch({ positions: { 'wonder:index:all:q0': 400 } }, epoch, 'family');
      store.libraryPatch({ recent: ['moon'] }, epoch, 'family');
    });
    expect(store.save.library!.profiles.family.bookPages['busy-day']).toBe(2);
    expect(store.save.library!.profiles.family.positions['wonder:index:all:q0']).toBe(400);
    await act(async () => { store.libraryPatch({ bookPages: { 'busy-day': 0 } }, epoch - 1, 'family'); });
    expect(store.save.library!.profiles.family.bookPages['busy-day']).toBe(2);
  });
  it('removes a deleted learner Library profile after preserving the original backup', async () => {
    await mount(); await act(async () => { store.addLearner('A reader'); });
    const owner = store.save.learning!.active;
    await act(async () => { store.libraryUpdate({ ...newLibraryChild(), saved: ['moon'] }, store.epoch, owner); });
    expect(store.save.library!.profiles[owner]).toBeDefined();
    await act(async () => { expect(await store.removeLearner(owner)).toBe(true); });
    expect(store.save.library!.profiles[owner]).toBeUndefined();
    expect(db.preserved.some(raw => JSON.parse(raw).library?.profiles[owner]?.saved.includes('moon'))).toBe(true);
  });
  it('keeps rejected drafts across learner switches and preserves them before a successful restore', async () => {
    await mount();
    const page = { id: 'page-pending', title: 'Unsaved', sentences: '', updatedAt: 1, strokes: [], stamps: [] };
    const key = pageDraftKey('family', page.id);
    retainPageDraft(key, page, false);
    await act(async () => { store.addLearner('Other reader'); store.selectLearner('family'); });
    expect(pendingPage(key)).toEqual(page);
    await act(async () => { await store.restore(JSON.stringify(emptySave())); });
    expect(db.preserved.some(raw => raw.includes('little-island-unsaved-pages') && raw.includes('page-pending'))).toBe(true);
    expect(pendingPage(key)).toBeUndefined();
  });
  it('preserves exact startup bytes before atomic migrated storage and publishes only after success', async () => {
    const original = ' \n' + JSON.stringify(legacy(), null, 2) + '\n'; db.raw = original;
    const order: string[] = [], gate = deferred();
    db.preserve.mockImplementation(async raw => { db.preserved.push(raw); order.push('preserve'); await gate.promise; });
    db.set.mockImplementation(async raw => { expect(db.preserved).toContain(original); order.push('set'); db.raw = raw; });
    await mount(); expect(store.ready).toBe(false); expect(db.set).not.toHaveBeenCalled();
    await act(async () => { gate.resolve(); });
    expect(store.ready).toBe(true); expect(store.recovery).toBeNull(); expect(order).toEqual(['preserve', 'set']);
    expect(store.save.explore).toEqual(legacy().explore); expect(store.save.library?.archive?.explore).toEqual(legacy().explore);
    expect(parseSave(db.raw!).library).toEqual(store.save.library);
  });
  it.each(['preserve', 'write'])('does not publish or replace a startup migration if %s fails', async kind => {
    const original = JSON.stringify(legacy()); db.raw = original;
    if (kind === 'preserve') db.preserve.mockRejectedValue(new Error('disk full'));
    else db.set.mockRejectedValue(new Error('disk full'));
    await mount(); expect(store.ready).toBe(true); expect(store.recovery).toContain('disk full'); expect(db.raw).toBe(original);
    expect(store.save.library).toBeUndefined();
    if (kind === 'preserve') expect(db.set).not.toHaveBeenCalled();
    else expect(db.preserved).toContain(original);
    let flushed: boolean | undefined; await act(async () => { flushed = await store.libraryFlush(); }); expect(flushed).toBe(false);
  });
  it('preserves malformed startup bytes for recovery and never rewrites them', async () => {
    const original = ' \n' + JSON.stringify({ ...emptySave(), library: { version: 1, profiles: { family: { ...newLibraryChild(), labs: {} } } } }) + '\n';
    db.raw = original; await mount();
    expect(store.recovery).toContain('invalid'); expect(db.preserved).toContain(original); expect(db.set).not.toHaveBeenCalled(); expect(db.raw).toBe(original);
  });
  it('does not re-migrate a validated existing Library or overwrite its archive on cold load', async () => {
    const originalLibrary = { version: 1, profiles: { family: { ...newLibraryChild(), query: 'kept' } }, archive: { explore: legacy().explore } };
    db.raw = JSON.stringify({ ...emptySave(), library: originalLibrary }); await mount();
    expect(store.save.library).toEqual(originalLibrary); expect(db.set).not.toHaveBeenCalled(); expect(db.preserve).not.toHaveBeenCalled();
  });
  it('includes all profile data in backups and preserves incoming legacy and current bytes on restore', async () => {
    await mount();
    await act(async () => { store.libraryUpdate({ ...newLibraryChild(), saved: ['moon'], bookPages: { busy: 4 }, current: 'busy', onlyFavorites: true, creations: [{ id: 'made-1', title: 'Turtle', sourceId: 'moon', sentences: 'It swims.', updatedAt: 123, strokes: [{ color: '#123abc', width: 22, points: [{ x: .4, y: .8 }] }], stamps: [{ id: 'turtle', x: .5, y: .5, size: .17 }] }] }, store.epoch, 'family'); });
    const current = db.raw!, backup = JSON.stringify(store.save);
    const incoming = ' \n' + JSON.stringify(legacy(), null, 3) + '\n';
    await act(async () => { await store.restore(incoming); });
    expect(db.preserved).toContain(incoming); expect(db.preserved).toContain(current);
    expect(store.save.library?.archive?.explore).toEqual(legacy().explore);
    await act(async () => { await store.restore(backup); });
    expect(store.save.library?.profiles.family).toEqual(JSON.parse(backup).library.profiles.family); expect(parseSave(db.raw!)).toEqual(store.save);
  });
  it('keeps malformed/oversize Library imports and the current device save intact', async () => {
    await mount(); await act(async () => { store.libraryUpdate({ ...newLibraryChild(), saved: ['moon'] }, store.epoch, 'family'); });
    const current = db.raw;
    for (const bad of [JSON.stringify({ ...emptySave(), library: { version: 2, profiles: {} } }), 'x'.repeat(2_000_001)]) {
      await act(async () => { await expect(store.restore(bad)).rejects.toThrow(); });
      expect(db.raw).toBe(current); expect(db.preserved).toContain(bad); expect(store.recovery).toBeTruthy();
    }
  });
  it('rejects stale child and epoch writes after switch, removal and restore, and isolates policies', async () => {
    db.raw = JSON.stringify({ ...emptySave(), learning: addLearner(familyLearners(), 'Child', 'child-1') });
    await mount(); const oldEpoch = store.epoch;
    await act(async () => { store.libraryUpdate({ ...newLibraryChild(), saved: ['moon'] }, oldEpoch, 'child-1'); });
    await act(async () => { store.selectLearner('family'); });
    const before = store.save;
    await act(async () => { store.libraryUpdate({ ...newLibraryChild(), saved: ['water-cycle'] }, oldEpoch, 'child-1'); store.libraryUpdate(newLibraryChild(), store.epoch, 'child-1'); });
    expect(store.save).toBe(before);
    const policy = { collections: ['ocean'], hours: { enabled: true, start: 22 * 60, end: 6 * 60 } };
    await act(async () => { store.libraryPolicy('child-1', policy); store.libraryPolicy('missing', policy); });
    expect(store.save.library?.profiles['child-1'].policy).toEqual(policy);
    await act(async () => { store.selectLearner('child-1'); });
    await act(async () => { store.libraryUpdate({ ...newLibraryChild(), query: 'turtle' }, store.epoch, 'child-1'); });
    expect(store.save.library?.profiles['child-1'].policy).toEqual(policy); expect(libraryChild(store.save.library, 'family').saved).toEqual([]);
    const staleEpoch = store.epoch, backup = JSON.stringify(store.save);
    await act(async () => { await store.restore(backup); store.libraryUpdate(newLibraryChild(), staleEpoch, 'child-1'); });
    expect(store.save.library?.profiles['child-1'].query).toBe('turtle');
    await act(async () => { expect(await store.removeLearner('child-1')).toBe(true); });
    expect(store.save.library?.profiles['child-1']).toBeUndefined(); expect(store.save.learning?.active).toBe('family');
    expect(parseSave(db.raw!)).toEqual(store.save);
  });
  it('detaches accepted updates from caller-owned objects', async () => {
    await mount(); const child = newLibraryChild(); child.saved = ['moon'];
    await act(async () => { store.libraryUpdate(child, store.epoch, 'family'); });
    child.saved.push('water-cycle'); expect(store.save.library?.profiles.family.saved).toEqual(['moon']);
    const policy = newLibraryChild().policy;
    await act(async () => { store.libraryPolicy('family', { ...policy, collections: ['ocean'] }); });
    policy.hours.enabled = true; expect(store.save.library?.profiles.family.policy.hours.enabled).toBe(false);
  });
  it('reports rejected oversized/invalid autosaves through error and flush without replacing good data', async () => {
    await mount();
    await act(async () => { store.libraryUpdate({ ...newLibraryChild(), saved: ['moon'] }, store.epoch, 'family'); });
    const original = db.raw;
    let result: boolean | undefined;
    await act(async () => { store.libraryUpdate({ ...newLibraryChild(), query: 'x'.repeat(201) }, store.epoch, 'family'); result = await store.libraryFlush(); });
    expect(result).toBe(false); expect(store.error).toContain('could not be saved'); expect(db.raw).toBe(original);
    await act(async () => { store.libraryUpdate(libraryChild(store.save.library, 'family'), store.epoch, 'family'); result = await store.libraryFlush(); });
    expect(result).toBe(true); expect(store.error).toBeNull();
  });
  it('never commits a valid child if all profiles together exceed the Library budget', async () => {
    db.raw = JSON.stringify({ ...emptySave(), learning: addLearner(familyLearners(), 'Child', 'child-1') });
    await mount();
    const large = { ...newLibraryChild(), creations: Array.from({ length: 24 }, (_, i) => ({ id: `page-${i}`, title: 'Page', sentences: 'a'.repeat(4000), updatedAt: 1,
      strokes: Array.from({ length: 10 }, () => ({ color: '#abc', width: 4, points: Array.from({ length: 100 }, () => ({ x: .123456789, y: .123456789 })) })), stamps: [] })) };
    await act(async () => { store.libraryUpdate(large, store.epoch, 'child-1'); });
    expect(store.save.library?.profiles['child-1'].creations).toHaveLength(24);
    await act(async () => { store.selectLearner('family'); });
    const original = db.raw;
    let result: boolean | undefined;
    await act(async () => { store.libraryUpdate(large, store.epoch, 'family'); result = await store.libraryFlush(); });
    expect(result).toBe(false); expect(db.raw).toBe(original); expect(store.save.library?.profiles.family).toBeUndefined();
  });
  it('flush waits for every queued write, returns false on failures, then succeeds after durable retry', async () => {
    await mount(); const first = deferred(), second = deferred();
    db.set.mockImplementationOnce(async raw => { await first.promise; db.raw = raw; }).mockImplementationOnce(async raw => { await second.promise; db.raw = raw; });
    let result: boolean | undefined;
    await act(async () => { store.libraryUpdate({ ...newLibraryChild(), query: 'first' }, store.epoch, 'family'); store.libraryUpdate({ ...newLibraryChild(), query: 'second' }, store.epoch, 'family'); void store.libraryFlush().then(value => { result = value; }); });
    expect(result).toBeUndefined(); expect(store.saving).toBe(true);
    await act(async () => { first.resolve(); }); expect(result).toBeUndefined();
    await act(async () => { second.resolve(); }); expect(result).toBe(true); expect(parseSave(db.raw!).library?.profiles.family.query).toBe('second');
    db.set.mockRejectedValueOnce(new Error('disk full'));
    await act(async () => { store.libraryUpdate({ ...newLibraryChild(), query: 'failed' }, store.epoch, 'family'); result = await store.libraryFlush(); });
    expect(result).toBe(false); expect(store.error).toContain('could not be saved');
    await act(async () => { result = await store.libraryFlush(); }); expect(result).toBe(false);
    await act(async () => { await store.retry(); result = await store.libraryFlush(); });
    expect(result).toBe(true); expect(store.error).toBeNull(); expect(parseSave(db.raw!).library?.profiles.family.query).toBe('failed');
  });
  it('flush includes snapshots queued while its previous tail is still pending', async () => {
    await mount(); const first = deferred(), second = deferred();
    db.set.mockImplementationOnce(async raw => { await first.promise; db.raw = raw; }).mockImplementationOnce(async raw => { await second.promise; db.raw = raw; });
    let result: boolean | undefined;
    await act(async () => { store.libraryUpdate({ ...newLibraryChild(), query: 'first' }, store.epoch, 'family'); void store.libraryFlush().then(value => { result = value; }); });
    await act(async () => { store.libraryUpdate({ ...newLibraryChild(), query: 'later' }, store.epoch, 'family'); first.resolve(); });
    expect(result).toBeUndefined();
    await act(async () => { second.resolve(); });
    expect(result).toBe(true); expect(parseSave(db.raw!).library?.profiles.family.query).toBe('later');
  });
  it('flush reports a failure even when a subsequent queued snapshot succeeds', async () => {
    await mount(); db.set.mockRejectedValueOnce(new Error('disk full'));
    let result: boolean | undefined;
    await act(async () => { store.libraryUpdate({ ...newLibraryChild(), query: 'one' }, store.epoch, 'family'); store.libraryUpdate({ ...newLibraryChild(), query: 'two' }, store.epoch, 'family'); result = await store.libraryFlush(); });
    expect(result).toBe(false); expect(parseSave(db.raw!).library?.profiles.family.query).toBe('two');
  });
});
