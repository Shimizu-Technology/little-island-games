/** R3-F1: undo histories saved by the previous head under its 20,480-byte cap stay readable,
 * and the first write after loading one fits it to today's 15,000-byte write cap. The fixtures
 * were produced by the previous head's own hook and reducer (0b5ca92b); see their README. */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import twentySteps from './fixtures/home-undo-legacy/twenty-steps.json';
import elevenSteps from './fixtures/home-undo-legacy/eleven-steps.json';
import { migrateHome, validHome, type HomeAction, type HomeStateV2 } from '../src/home/model';
import { historyAdmits, restoredHistory, savedHistory, useHomeStore, UNDO_TRIMMED_NOTE, UNDO_NOTES } from '../src/home/useHomeStore';
import { HOME_UNDO_BYTES, HOME_UNDO_READ_BYTES, undoBytes, validUndoShape } from '../src/home/undoHistory';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const roundTrip = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const legacy = { 'twenty-steps': twentySteps, 'eleven-steps': elevenSteps } as unknown as Record<string, HomeStateV2>;
async function host(initial: unknown) {
  const saves: HomeStateV2[] = [];
  const ref: { store?: ReturnType<typeof useHomeStore> } = {};
  function Host() { ref.store = useHomeStore({}, initial, (s) => { saves.push(roundTrip(s)); return true; }); return null; }
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<Host />); });
  return { saves, store: () => ref.store!, unmount: () => act(async () => root.unmount()) };
}
const findFriends = (roomId: 'home' | 'kitchen') => ({ type: 'find-friends', roomId } as HomeAction);
/** An edit that always changes the home: the fixtures' rooms are cream. */
const paint = (wallpaper: 'lagoon' | 'cream') => ({ type: 'theme', roomId: 'home', wallpaper } as HomeAction);
/** What a save's undo must look like after any write today. */
function fitsToday(saved: HomeStateV2) {
  expect(validHome(saved)).toBe(true);
  expect(undoBytes(saved.undo!)).toBeLessThanOrEqual(HOME_UNDO_BYTES);
  expect(historyAdmits(restoredHistory(migrateHome(saved)!))).toBe(true);
}

describe('R3-F1: the read limit is separate from the write limit', () => {
  it('the fixtures are what the reviewer described: over today\'s write cap or its promises, within the old cap', () => {
    expect(undoBytes(legacy['twenty-steps'].undo!)).toBe(16_885);
    expect(legacy['twenty-steps'].undo!.steps).toHaveLength(20);
    expect(undoBytes(legacy['eleven-steps'].undo!)).toBeLessThanOrEqual(HOME_UNDO_BYTES);
    expect(historyAdmits(restoredHistory(legacy['eleven-steps']))).toBe(false);
  });
  it('version-1 histories up to the previous 20,480-byte cap validate; one byte over does not', () => {
    expect(HOME_UNDO_READ_BYTES).toBe(20_480);
    for (const save of Object.values(legacy)) {
      expect(validHome(save)).toBe(true);
      const before = JSON.stringify(save);
      const migrated = migrateHome(save)!;
      expect(migrated).toBeDefined();
      // Never mutates its input; the migrated copy keeps every saved step.
      expect(JSON.stringify(save)).toBe(before);
      expect(migrated.undo).toEqual(save.undo);
    }
    const undo = roundTrip(legacy['twenty-steps'].undo!);
    const pad = (n: number) => ({ ...undo, steps: [...undo.steps.slice(0, -1), { ...undo.steps.at(-1), kitchen: { theme: { wallpaper: 'x'.repeat(n) } } }] });
    const at = (bytes: number) => { let n = 0; while (undoBytes(pad(n) as never) < bytes) n++; return pad(n); };
    expect(undoBytes(at(HOME_UNDO_READ_BYTES) as never)).toBe(HOME_UNDO_READ_BYTES);
    expect(validUndoShape(at(HOME_UNDO_READ_BYTES))).toBe(true);
    expect(validUndoShape(at(HOME_UNDO_READ_BYTES + 1))).toBe(false);
  });
  it.each(Object.keys(legacy))('%s: the first ordinary edit after loading succeeds, fits today\'s cap, and says the oldest steps went', async (name) => {
    const initial = roundTrip(legacy[name]);
    const original = JSON.stringify(initial);
    const { saves, store, unmount } = await host(initial);
    expect(store().canUndo).toBe(true);
    expect(store().recoveryOriginal).toBeUndefined();
    await act(async () => store().dispatch(paint('lagoon')));
    expect(saves).toHaveLength(1);
    expect(store().message).toBe(UNDO_TRIMMED_NOTE);
    expect(UNDO_NOTES).toContain(UNDO_TRIMMED_NOTE);
    fitsToday(saves[0]);
    // The newest steps are the ones kept, and the edit itself is the newest: Undo from the new
    // save passes the state just before the edit, then the loaded newest past states in order.
    const loadedPast = restoredHistory(migrateHome(initial)!).past.map((h) => h.rooms);
    const keptPast = restoredHistory(saves[0]).past.map((h) => h.rooms);
    expect(keptPast.length).toBeGreaterThan(1);
    expect(keptPast.at(-1)).toEqual(migrateHome(initial)!.rooms);
    expect(keptPast.slice(0, -1)).toEqual(loadedPast.slice(-(keptPast.length - 1)));
    expect(keptPast.length - 1).toBeLessThan(loadedPast.length);
    // Once: the next edit is ordinary again.
    await act(async () => store().dispatch(paint('cream')));
    expect(saves).toHaveLength(2);
    expect(store().message).not.toBe(UNDO_TRIMMED_NOTE);
    fitsToday(saves[1]);
    // Undo still walks back through what was kept.
    await act(async () => store().dispatch({ type: 'undo' }));
    expect(saves).toHaveLength(3);
    expect(store().message).toBe('Undone.');
    // The loaded original was never touched.
    expect(JSON.stringify(initial)).toBe(original);
    await unmount();
  });
  it('the first write is an Undo: it works, fits today\'s cap, and shows the note once', async () => {
    const initial = roundTrip(legacy['twenty-steps']);
    const { saves, store, unmount } = await host(initial);
    await act(async () => store().dispatch({ type: 'undo' }));
    expect(saves).toHaveLength(1);
    expect(store().message).toBe(UNDO_TRIMMED_NOTE);
    fitsToday(saves[0]);
    // The newest step was undone, so the present is the state before it.
    expect(saves[0].rooms).toEqual(restoredHistory(migrateHome(initial)!).past.at(-1)!.rooms);
    await act(async () => store().dispatch({ type: 'undo' }));
    expect(store().message).toBe('Undone.');
    await unmount();
  });
  it('a navigation write fits the history too, so nothing older is written past the cap', async () => {
    const { saves, store, unmount } = await host(roundTrip(legacy['twenty-steps']));
    expect(legacy['twenty-steps'].current).toBe('kitchen');
    await act(async () => store().dispatch({ type: 'room', room: 'home' } as HomeAction));
    expect(saves).toHaveLength(1);
    expect(store().message).toBe(UNDO_TRIMMED_NOTE);
    fitsToday(saves[0]);
    await unmount();
  });
  it('a grown-up access change is a write as well: it fits the history and tells the child', async () => {
    const { saves, store, unmount } = await host(roundTrip(legacy['twenty-steps']));
    await act(async () => { expect(store().setAccess({ largeTargets: true })).toBe(true); });
    expect(saves).toHaveLength(1);
    expect(store().message).toBe(UNDO_TRIMMED_NOTE);
    fitsToday(saves[0]);
    await act(async () => store().dispatch(findFriends('home')));
    expect(store().message).not.toBe(UNDO_TRIMMED_NOTE);
    await unmount();
  });
  it('a write that fails keeps the loaded history, and the note comes with the write that succeeds', async () => {
    const initial = roundTrip(legacy['twenty-steps']);
    let ok = false;
    const saves: HomeStateV2[] = [];
    const ref: { store?: ReturnType<typeof useHomeStore> } = {};
    function Host() { ref.store = useHomeStore({}, initial, (s) => { if (ok) saves.push(roundTrip(s)); return ok; }); return null; }
    let root!: ReactTestRenderer;
    await act(async () => { root = create(<Host />); });
    await act(async () => ref.store!.dispatch(findFriends('home')));
    expect(ref.store!.message).toBe('Your room could not be updated. Please try again.');
    ok = true;
    await act(async () => ref.store!.dispatch(findFriends('home')));
    expect(ref.store!.message).toBe(UNDO_TRIMMED_NOTE);
    fitsToday(saves[0]);
    await act(async () => root.unmount());
  });
  it('a history that already fits today\'s cap and promises loads and edits without any note', async () => {
    const { saves, store, unmount } = await host(roundTrip(legacy['twenty-steps']));
    await act(async () => store().dispatch(findFriends('home')));
    const fitted = saves[0];
    const reopened = await host(roundTrip(fitted));
    await act(async () => reopened.store().dispatch(findFriends('kitchen')));
    expect(reopened.store().message).not.toBe(UNDO_TRIMMED_NOTE);
    // Every step it had is still there, one older now.
    expect(restoredHistory(reopened.saves[0]).past.slice(0, -1).map((h) => h.rooms)).toEqual(restoredHistory(fitted).past.map((h) => h.rooms).slice(-(reopened.saves[0].undo!.steps.length - 1)));
    expect(reopened.saves[0].undo!.steps.length).toBe(Math.min(20, fitted.undo!.steps.length + 1));
    await reopened.unmount();
    await unmount();
  });
  it('every write today stays within the 15,000-byte cap, whatever was loaded', () => {
    for (const save of Object.values(legacy)) {
      const written = savedHistory(restoredHistory(save));
      expect(undoBytes(written.undo!)).toBeLessThanOrEqual(HOME_UNDO_BYTES);
    }
  });
});
