import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { instance, migrateHome, starterHome, validHome, type HomeAction, type HomeStateV2 } from '../src/home/model';
import { editHistory, restoredHistory, useHomeStore, RESTORE_NOTE, UNDO_FULL_MESSAGE } from '../src/home/useHomeStore';
import { HOME_UNDO_BYTES, undoBytes } from '../src/home/undoHistory';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const canon = (v: unknown): unknown => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().filter((k) => k !== 'undo' && k !== 'current').map((k) => [k, canon((v as any)[k])])) : v;
const roundTrip = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
function basket(state: HomeStateV2, room: 'home' | 'kitchen', count: number, prefix: string) {
  state.rooms[room].instances.push(...Array.from({ length: count }, (_, n) => ({ ...instance(`${prefix}-${n}`, 'shell', 0, 0), staged: true as const })));
  return state;
}
const reset = (roomId: 'home' | 'kitchen') => ({ type: 'reset', roomId } as HomeAction);
async function host(initial: HomeStateV2) {
  const saves: HomeStateV2[] = [];
  const ref: { store?: ReturnType<typeof useHomeStore> } = {};
  function Host() { ref.store = useHomeStore({}, initial, (s) => { saves.push(roundTrip(s)); return true; }); return null; }
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<Host />); });
  return { saves, store: () => ref.store!, unmount: () => act(async () => root.unmount()) };
}

describe('F3: a Restore room that Undo cannot keep asks first, then happens', () => {
  it('a room too big to undo: the cost is "no-undo"; confirmed, it restores and says so', async () => {
    const initial = basket(starterHome(), 'home', 240, 'keepsake');
    expect(validHome(initial)).toBe(true);
    const { saves, store, unmount } = await host(initial);
    expect(store().restoreCost('home')).toBe('no-undo');
    // Without the confirmation nothing happens, as before.
    await act(async () => store().dispatch(reset('home')));
    expect(saves).toHaveLength(0);
    expect(store().message).toBe(UNDO_FULL_MESSAGE);
    await act(async () => store().dispatch(reset('home'), { anyway: true }));
    expect(saves).toHaveLength(1);
    expect(saves[0].rooms.home.instances).toHaveLength(6);
    expect(saves[0].undo).toBeUndefined();
    expect(validHome(saves[0])).toBe(true);
    expect(store().message).toBe(RESTORE_NOTE['no-undo']);
    expect(store().canUndo).toBe(false);
    // Afterwards ordinary edits and their Undo work as always.
    await act(async () => store().dispatch({ type: 'theme', wallpaper: 'lagoon', roomId: 'home' } as HomeAction));
    expect(saves).toHaveLength(2);
    expect(saves[1].undo?.steps).toHaveLength(1);
    await act(async () => store().dispatch({ type: 'undo' }));
    expect(canon(store().state)).toEqual(canon(saves[0]));
    await unmount();
  });
  it('a restore that would push out an older removal: "drops-older"; confirmed, the oldest steps go with it', async () => {
    const initial = basket(basket(starterHome(), 'kitchen', 48, 'k'), 'home', 48, 'h');
    const { saves, store, unmount } = await host(initial);
    expect(store().restoreCost('kitchen')).toBe('undoable');
    await act(async () => store().dispatch(reset('kitchen')));
    expect(saves).toHaveLength(1);
    expect(store().restoreCost('home')).toBe('drops-older');
    await act(async () => store().dispatch(reset('home')));
    expect(saves).toHaveLength(1);
    await act(async () => store().dispatch(reset('home'), { anyway: true }));
    expect(saves).toHaveLength(2);
    expect(store().message).toBe(RESTORE_NOTE['drops-older']);
    const saved = saves[1];
    expect(undoBytes(saved.undo!)).toBeLessThanOrEqual(HOME_UNDO_BYTES);
    // After a relaunch, Undo brings back My room's basket, and no further: the Kitchen removal dropped out.
    let reopened = restoredHistory(migrateHome(saved)!);
    expect(reopened.past).toHaveLength(1);
    reopened = editHistory(reopened, { type: 'undo' });
    expect(reopened.present.rooms.home.instances).toHaveLength(54);
    expect(reopened.present.rooms.kitchen.instances).toHaveLength(starterHome().rooms.kitchen.instances.length);
    // In the session too: Undo stops at the same place.
    await act(async () => store().dispatch({ type: 'undo' }));
    expect(store().state.rooms.home.instances).toHaveLength(54);
    expect(store().canUndo).toBe(false);
    await unmount();
  });
  it('an ordinary restore is unchanged: no extra question, and Undo brings it back', async () => {
    const initial = basket(starterHome(), 'home', 48, 'keepsake');
    const { saves, store, unmount } = await host(initial);
    expect(store().restoreCost('home')).toBe('undoable');
    await act(async () => store().dispatch(reset('home')));
    expect(saves).toHaveLength(1);
    expect(store().message).not.toBe(UNDO_FULL_MESSAGE);
    await act(async () => store().dispatch({ type: 'undo' }));
    expect(canon(store().state)).toEqual(canon(initial));
    await unmount();
  });
});
