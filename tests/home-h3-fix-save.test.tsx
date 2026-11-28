import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it } from 'vitest';
import { instance, migrateHome, starterHome, validHome, type HomeAction, type HomeStateV2 } from '../src/home/model';
import { editHistory, restoredHistory, savedHistory, useHomeStore, type History } from '../src/home/useHomeStore';
import { HOME_UNDO_BYTES, HOME_UNDO_STEPS, undoBytes, validUndoShape } from '../src/home/undoHistory';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const canon = (v: unknown): unknown => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().filter((k) => k !== 'undo' && k !== 'current').map((k) => [k, canon((v as any)[k])])) : v;
const roundTrip = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
/** The reviewer's R1 home: 48 collected shells in My room's basket, beside the starter furniture. */
function basketHome(count = 48, room: 'home' | 'kitchen' | 'treehouse' | 'beach' = 'home', prefix = 'keepsake'): HomeStateV2 {
  const state = starterHome();
  state.rooms[room].instances.push(...Array.from({ length: count }, (_, n) => ({ ...instance(`${prefix}-${n}`, 'shell', 0, 0), staged: true as const })));
  return state;
}
const step = (n: number): HomeAction => ({ type: 'theme', wallpaper: (['lagoon', 'cream'] as const)[n % 2], roomId: 'treehouse' } as HomeAction);

describe('R1: the newest removal survives the byte cap and a relaunch', () => {
  it('restoring a room with 48 basket shells saves its undo, and Undo after a relaunch brings all 54 back', () => {
    const before = basketHome();
    expect(validHome(before)).toBe(true);
    const history = editHistory({ present: before, past: [], future: [] }, { type: 'reset', roomId: 'home' } as HomeAction);
    expect(history.present.rooms.home.instances).toHaveLength(6);
    const saved = roundTrip(savedHistory(history));
    expect(saved.undo).toBeDefined();
    expect(validHome(saved)).toBe(true);
    const reopened = restoredHistory(migrateHome(saved)!);
    expect(reopened.past).toHaveLength(1);
    expect(canon(editHistory(reopened, { type: 'undo' }).present)).toEqual(canon(before));
  });
  it('a removal stays recoverable through the next 19 steps and a relaunch', () => {
    const before = basketHome();
    let history: History = editHistory({ present: before, past: [], future: [] }, { type: 'reset', roomId: 'home' } as HomeAction);
    for (let n = 0; n < HOME_UNDO_STEPS - 1; n++) history = editHistory(history, step(n));
    let reopened = restoredHistory(migrateHome(roundTrip(savedHistory(history)))!);
    expect(reopened.past).toHaveLength(HOME_UNDO_STEPS);
    for (let n = 0; n < HOME_UNDO_STEPS; n++) reopened = editHistory(reopened, { type: 'undo' });
    expect(canon(reopened.present)).toEqual(canon(before));
  });
  it('drops the oldest steps first; the newest always stays', () => {
    const start = basketHome(48, 'kitchen', 'k');
    start.rooms.home.instances.push(...basketHome(30, 'home', 'h').rooms.home.instances.slice(6));
    let history: History = { present: start, past: [], future: [] };
    for (let n = 0; n < 10; n++) history = editHistory(history, { type: 'place', instance: instance(`p${n}`, 'plant', 2 + n, 9), roomId: 'beach' } as HomeAction);
    history = editHistory(history, { type: 'reset', roomId: 'kitchen' } as HomeAction);
    history = editHistory(history, { type: 'reset', roomId: 'home' } as HomeAction);
    const saved = savedHistory(history);
    expect(undoBytes(saved.undo!)).toBeLessThanOrEqual(HOME_UNDO_BYTES);
    const reopened = restoredHistory(saved);
    // The newest step is the last reset; undoing it returns exactly the state before it.
    expect(canon(editHistory(reopened, { type: 'undo' }).present)).toEqual(canon(history.past.at(-1)));
  });
  it('an edit whose removal Undo could not keep is refused before anything is saved', async () => {
    const saves: HomeStateV2[] = [];
    let store!: ReturnType<typeof useHomeStore>;
    const initial = basketHome(240);
    expect(validHome(initial)).toBe(true);
    function Host() { store = useHomeStore({}, initial, (s) => { saves.push(roundTrip(s)); return true; }); return null; }
    let root!: ReactTestRenderer;
    await act(async () => { root = create(<Host />); });
    await act(async () => store.dispatch({ type: 'reset', roomId: 'home' } as HomeAction));
    expect(saves).toHaveLength(0);
    expect(store.state.rooms.home.instances).toHaveLength(246);
    expect(store.message).toMatch(/Undo/);
    // An ordinary edit still works afterwards.
    await act(async () => store.dispatch(step(0)));
    expect(saves).toHaveLength(1);
    await act(async () => root.unmount());
  });
  it('a second big restore inside the window is refused rather than pushing the first one out', async () => {
    const saves: HomeStateV2[] = [];
    let store!: ReturnType<typeof useHomeStore>;
    // F2: 48 basket things each, as the cap is now derived from the whole-save envelope.
    const starterKitchenCount = starterHome().rooms.kitchen.instances.length;
    const initial = basketHome(48, 'home', 'a');
    initial.rooms.kitchen.instances.push(...basketHome(48, 'kitchen', 'b').rooms.kitchen.instances.slice(starterKitchenCount));
    expect(validHome(initial)).toBe(true);
    function Host() { store = useHomeStore({}, initial, (s) => { saves.push(roundTrip(s)); return true; }); return null; }
    let root!: ReactTestRenderer;
    await act(async () => { root = create(<Host />); });
    await act(async () => store.dispatch({ type: 'reset', roomId: 'home' } as HomeAction));
    await act(async () => store.dispatch({ type: 'reset', roomId: 'kitchen' } as HomeAction));
    // Every save that was written can still bring back everything it removed.
    for (const save of saves) {
      let reopened = restoredHistory(migrateHome(save)!);
      while (reopened.past.length) reopened = editHistory(reopened, { type: 'undo' });
      expect(canon(reopened.present)).toEqual(canon(initial));
    }
    expect(store.state.rooms.home.instances).toHaveLength(6);
    expect(store.state.rooms.kitchen.instances).toHaveLength(starterKitchenCount + 48);
    expect(store.message).toMatch(/Undo/);
    await act(async () => root.unmount());
  });
});

describe('R6: corrupt undo is rejected, never thrown', () => {
  it('a newer malformed room behind an older valid step is rejected by both validators', () => {
    const state: any = starterHome();
    state.undo = { version: 1, steps: [
      { kitchen: { theme: { ...state.rooms.kitchen.theme } } },
      { home: { room: { instances: [], theme: { ...state.rooms.home.theme } } } },
    ] };
    expect(validUndoShape(state.undo)).toBe(true);
    const frozen = JSON.stringify(state);
    expect(validHome(state)).toBe(false);
    expect(migrateHome(state)).toBeUndefined();
    expect(JSON.stringify(state)).toBe(frozen);
  });
  it('malformed puts, characters and themes across rooms and steps never throw', () => {
    const base = starterHome();
    const bad: unknown[] = [
      { home: { instances: { remove: [], put: [{ index: 0, value: { id: 'x', item: 7 } }] } } },
      { home: { instances: { remove: [], put: [{ index: 0, value: { id: 'x', item: 'not-an-item' } }] } } },
      { kitchen: { characters: { remove: [], put: [{ index: 0, value: { slot: 1 } }] } } },
      { beach: { theme: { wallpaper: 'cream' } } },
      { treehouse: { room: { instances: [{}], characters: [], theme: base.rooms.treehouse.theme } } },
      { home: { room: { instances: null, characters: null, theme: null } } },
    ];
    for (const newer of bad) for (const older of [{ kitchen: { theme: { ...base.rooms.kitchen.theme } } }, newer]) {
      const state: any = { ...starterHome(), undo: { version: 1, steps: [older, newer] } };
      expect(() => validHome(state)).not.toThrow();
      expect(validHome(state)).toBe(false);
      expect(() => migrateHome(state)).not.toThrow();
      expect(migrateHome(state)).toBeUndefined();
    }
  });
  it('the store keeps a corrupt save as the recovery original instead of throwing', async () => {
    const state: any = starterHome();
    state.undo = { version: 1, steps: [
      { kitchen: { theme: { ...state.rooms.kitchen.theme } } },
      { home: { room: { instances: [], theme: { ...state.rooms.home.theme } } } },
    ] };
    const frozen = JSON.stringify(state);
    let store!: ReturnType<typeof useHomeStore>;
    function Host() { store = useHomeStore({}, state, () => true); return null; }
    let root!: ReactTestRenderer;
    await act(async () => { root = create(<Host />); });
    expect(store.recoveryOriginal).toBe(state);
    expect(JSON.stringify(store.recoveryOriginal)).toBe(frozen);
    await act(async () => root.unmount());
  });
});

afterEach(() => undefined);
