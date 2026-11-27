import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { StoreProvider, useStore } from '../src/state/Store';
import { parseSave } from '../src/state/validation';
import { personFor, starterPerson } from '../src/personalization/model';
import { compactHome, hydrateHome, migrateSavedHome, starterHome, validHome, type HomeStateV2 } from '../src/home/model';
import { useHomeStore } from '../src/home/useHomeStore';
import { buildScene, translatedBounds } from '../src/home/scene/graph';
import { resolve } from '../src/home/scene/proposal';
import { roomPoint } from '../src/home/scene/types';
import { familySlots } from '../src/home/family';
import { socketsOf } from '../src/home/interactions';

const db = vi.hoisted(() => ({ raw: null as string | null }));
vi.mock('../src/state/storage', () => ({ storage: {
  get: async () => db.raw, set: async (raw: string) => { db.raw = raw; },
  preserve: async () => {}, readDrafts: async () => [], discardSession: async () => {},
} }));
vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}) }));
let store: ReturnType<typeof useStore>, home: ReturnType<typeof useHomeStore>, root: ReactTestRenderer | undefined;
function Home() {
  const s = useStore(), expected = { learner: s.save.learning?.active ?? 'family', epoch: s.epoch };
  const h = useHomeStore({}, personFor(s.save).home, next => s.personalize({ home: next }, expected));
  useLayoutEffect(() => { home = h; }, [h]);
  return null;
}
function Route() {
  const s = useStore();
  useLayoutEffect(() => { store = s; }, [s]);
  return s.ready && !s.recovery ? <Home key={s.epoch} /> : null;
}
async function mount() { await act(async () => { root = create(<StoreProvider><Route /></StoreProvider>); }); }
async function unmount() { await act(async () => { root?.unmount(); root = undefined; }); }
const diskHome = () => personFor(parseSave(db.raw!)).home as HomeStateV2;
const slots = (state: HomeStateV2) => Object.values(state.rooms).flatMap(r => r.characters.map(c => c.slot)).sort();
beforeEach(() => { db.raw = null; vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(async () => { await unmount(); vi.unstubAllGlobals(); });

it('default drawer presets cost no save bytes and hydrate losslessly without mutating the original', () => {
  const runtime = starterHome(), saved = compactHome(runtime), original = JSON.stringify(saved);
  expect(saved).toEqual(starterPerson().home);
  expect(saved.rosterVersion).toBeUndefined();
  expect(slots(saved)).toEqual([0, 1, 2]);
  expect(validHome(saved)).toBe(true);
  expect(migrateSavedHome(saved)).toBe(saved);
  expect(hydrateHome(saved)).toEqual(runtime);
  expect(JSON.stringify(saved)).toBe(original);
  expect(compactHome(hydrateHome(saved)!)).toEqual(saved);
});

it('an unrelated settings write and backup keep untouched Home records compact', async () => {
  await mount();
  const original = personFor(store.save).home;
  expect(slots(home.state)).toEqual(familySlots);
  await act(async () => store.settings({ sound: false }));
  expect(diskHome()).toEqual(original);
  expect(slots(diskHome())).toEqual([0, 1, 2]);
  let backup = '';
  await act(async () => { backup = await store.backup(); });
  expect(personFor(parseSave(backup)).home).toEqual(original);
  await unmount(); await mount();
  expect(store.recovery).toBeNull();
  expect(slots(home.state)).toEqual(familySlots);
  expect(personFor(store.save).home).toEqual(original);
});

it('compaction preserves every nondefault family field and rejects invalid compact saves', () => {
  const runtime = starterHome(), mom = runtime.rooms.home.characters.find(c => c.slot === 3)!;
  mom.facing = 'left';
  const saved = compactHome(runtime), raw = JSON.stringify(saved);
  expect(saved.rooms.home.characters.find(c => c.slot === 3)).toEqual(mom);
  expect(saved.rooms.home.characters.some(c => c.slot === 4 || c.slot === 5)).toBe(false);
  expect(validHome(saved)).toBe(true);
  expect(compactHome(hydrateHome(JSON.parse(raw))!)).toEqual(saved);
  expect(JSON.stringify(saved)).toBe(raw);
  const { rosterVersion: _roster, ...missingVersion } = saved;
  expect(_roster).toBe(1);
  expect(hydrateHome(missingVersion)).toBeUndefined();
  const duplicate = structuredClone(saved);
  duplicate.rooms.kitchen.characters.push({ ...mom });
  expect(hydrateHome(duplicate)).toBeUndefined();
});

it.each([3, 4, 5] as const)('dragging family member %i into a room persists through reload, backup restore and Undo', async slot => {
  await mount();
  // Same proposal and Store transaction as a Friends drawer drag into the kitchen.
  const scene = buildScene(home.state), actor = scene.entities[`character/${slot}`];
  const proposal = resolve({ ...scene.rooms.kitchen, entities: scene.entities }, actor, roomPoint(450, 500),
    { scale: .5, floorOnly: true, release: true });
  expect(proposal.kind).toBe('floor');
  await act(async () => { expect(home.commitProposal(proposal)).toBeDefined(); });
  const placed = home.state.rooms.kitchen.characters.find(c => c.slot === slot)!;
  expect(placed.staged).toBeUndefined();
  expect(diskHome().rosterVersion).toBe(1);
  expect(diskHome().rooms.kitchen.characters.find(c => c.slot === slot)).toEqual(placed);
  expect(diskHome().rooms.home.characters.some(c => c.slot >= 3)).toBe(false);
  expect(validHome(diskHome())).toBe(true);
  await unmount(); await mount();
  expect(store.recovery).toBeNull();
  expect(slots(home.state)).toEqual(familySlots);
  expect(home.state.rooms.kitchen.characters.find(c => c.slot === slot)).toEqual(placed);
  expect(home.canUndo).toBe(true);
  // A later pose/attachment change is also owned data, not a replaceable drawer default.
  const seat = home.state.rooms.kitchen.instances.find(i => i.id === 'starter-stool')!;
  await act(async () => home.dispatch({ type: 'character', roomId: 'kitchen', slot,
    anchor: 'seat', seatId: seat.id, socketId: socketsOf(seat)[0].id }));
  const seated = home.state.rooms.kitchen.characters.find(c => c.slot === slot)!;
  expect(seated.pose).toBe('sit');
  expect(seated.socket?.itemId).toBe(seat.id);
  await unmount(); await mount();
  expect(home.state.rooms.kitchen.characters.find(c => c.slot === slot)).toEqual(seated);
  let backup = '';
  await act(async () => { backup = await store.backup(); });
  await act(async () => { await store.restore(backup); });
  expect(home.state.rooms.kitchen.characters.find(c => c.slot === slot)).toEqual(seated);
  await act(async () => home.dispatch({ type: 'undo' }));
  expect(home.state.rooms.kitchen.characters.find(c => c.slot === slot)).toEqual(placed);
  await act(async () => home.dispatch({ type: 'undo' }));
  expect(home.state.rooms.kitchen.characters.some(c => c.slot === slot)).toBe(false);
  expect(home.state.rooms.home.characters.find(c => c.slot === slot)?.staged).toBe(true);
  expect(home.canRedo).toBe(true);
  await act(async () => home.dispatch({ type: 'redo' }));
  expect(diskHome().rooms.kitchen.characters.find(c => c.slot === slot)).toEqual(placed);
  await act(async () => home.dispatch({ type: 'undo' }));
  await unmount(); await mount();
  expect(slots(home.state)).toEqual(familySlots);
  expect(diskHome().rosterVersion).toBeUndefined();
});

it('upper-body-only blanket overlap cannot capture a doll, while lower-body overlap can', () => {
  const state = starterHome(), scene = buildScene(state), actor = scene.entities['character/0'];
  const bed = scene.rooms.home.sockets.find(t => t.base === 'lie' && !t.pet)!;
  const region = bed.activation!;
  const anchor = roomPoint(region.left + region.width / 2, region.top + region.height + 200);
  const upperOnly = translatedBounds(actor.bounds, anchor);
  expect(upperOnly.top).toBeLessThan(region.top + region.height);
  expect(resolve(scene.rooms.home, actor, anchor, { scale: .5, silhouette: upperOnly, contact: anchor, release: true }).target).not.toBe(bed.id);
  const bodyOverBed = roomPoint(anchor.x, region.top + region.height + 60);
  expect(resolve(scene.rooms.home, actor, bodyOverBed, {
    scale: .5, silhouette: translatedBounds(actor.bounds, bodyOverBed),
    contact: roomPoint(bodyOverBed.x, bodyOverBed.y - 150), release: true,
  }).target).toBe(bed.id);
});
