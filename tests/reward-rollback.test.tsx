/** Reward backfill must leave a rollback point: older builds reject the ids it adds. */
import React, { createContext, useLayoutEffect } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import previousCatalog from './fixtures/grant-catalog-main.json';
import mainSave from './fixtures/profile-main-v2.json';
import fixture25 from './fixtures/profile-2.5.json';
import { backfillRewards } from '../src/badges/transitions';
import { personFor } from '../src/personalization/model';
import { encodeSave } from '../src/state/profiles';
import { StoreProvider, useStore } from '../src/state/Store';
import { parseSave, type Save } from '../src/state/validation';
const db = vi.hoisted(() => ({ raw: null as string | null, preserved: [] as string[], sets: 0, preserveFails: false }));
vi.mock('../src/state/storage', () => ({ storage: {
  get: async () => db.raw,
  set: async (s: string) => { db.sets++; db.raw = s; },
  preserve: async (s: string) => { if (db.preserveFails) throw new Error('disk full'); db.preserved.push(s); },
} }));
vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}) }));
let store: ReturnType<typeof useStore>, root: ReturnType<typeof TestRenderer.create> | undefined;
function Probe() { const s = useStore(); useLayoutEffect(() => { store = s; }, [s]); return null; }
async function mount() { await act(async () => { root = TestRenderer.create(<StoreProvider><Probe/></StoreProvider>); }); }
async function unmount() { await act(async () => { root?.unmount(); root = undefined; }); }
const added = ['outfit:star-dress', 'outfit:circuit-hoodie', 'outfit:captain-coat', 'outfit:storybook-dress', 'outfit:comet-gown'];
// Whitespace proves these are the source bytes, not a re-encoding of the same data.
const source = () => ` \n${JSON.stringify(mainSave, null, 1)}\n`;
/** The rule main's validator applies to reward ids. The real validator is run separately: see the slice report. */
const previousAccepts = (raw: string) => Object.values(parseSave(raw).personalization!.people).every(p => p.earned.every(id => previousCatalog.includes(id)));
beforeEach(() => { db.raw = null; db.preserved = []; db.sets = 0; db.preserveFails = false; vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(async () => { await unmount(); vi.unstubAllGlobals(); });

it('fixture holds badges without the new outfits, under the previous catalog', () => {
  expect(previousAccepts(source())).toBe(true);
  for (const id of added) expect(previousCatalog).not.toContain(id);
  const after = encodeSave(backfillRewards(parseSave(source())));
  expect(previousAccepts(after)).toBe(false);
  expect([...personFor(parseSave(after), 'a').earned, ...personFor(parseSave(after), 'b').earned]).toEqual(expect.arrayContaining(added));
});
it('load keeps the exact pre-grant bytes of a v2 save before publishing the grants', async () => {
  const raw = source(); db.raw = raw;
  await mount();
  expect(store.recovery).toBeNull();
  expect(db.preserved).toEqual([raw]);
  expect(previousAccepts(db.preserved[0])).toBe(true);
  expect(previousAccepts(db.raw!)).toBe(false);
  expect(personFor(store.save, 'a').earned).toEqual(expect.arrayContaining(['outfit:star-dress', 'outfit:circuit-hoodie', 'outfit:captain-coat']));
  expect(personFor(store.save, 'a').unseen).toContain('outfit:star-dress');
});
it('a settled save writes nothing on later launches', async () => {
  db.raw = source();
  await mount(); await unmount();
  const settled = db.raw, sets = db.sets;
  await mount(); await unmount();
  await mount();
  expect(db.raw).toBe(settled); expect(db.sets).toBe(sets); expect(db.preserved).toHaveLength(1);
});
it('a save with no learner changes makes no copy and no write', async () => {
  const raw = encodeSave(backfillRewards(parseSave(source()))); db.raw = raw;
  await mount();
  expect(db.preserved).toEqual([]); expect(db.sets).toBe(0); expect(db.raw).toBe(raw);
});
it('a learner seen for the first time with nothing earned makes no copy', async () => {
  const settled = JSON.parse(encodeSave(backfillRewards(parseSave(source())))) as Save;
  delete settled.personalization!.people.b;
  for (const p of Object.values(settled.personalization!.people)) expect(p.milestones).toContain('migration:badges-v1');
  // B's learning notes would earn badges; a brand-new learner has none.
  settled.learning = { ...settled.learning!, people: settled.learning!.people.map(p => p.id === 'b' ? { ...p, notes: {} } : p) };
  const b = settled.arcade?.people.b; if (b) settled.arcade!.people.b = { ...b, games: {} };
  const raw = JSON.stringify(settled); db.raw = raw;
  await mount();
  expect(store.recovery).toBeNull();
  expect(personFor(store.save, 'b').earned).toEqual([]);
  expect(db.preserved).toEqual([]); expect(db.sets).toBe(0);
});
it('load publishes nothing when the rollback copy cannot be kept', async () => {
  const raw = source(); db.raw = raw; db.preserveFails = true;
  await mount();
  expect(store.recovery).toBeTruthy(); expect(db.raw).toBe(raw); expect(db.sets).toBe(0);
});
it('restore keeps the exact pre-grant bytes of the backup and the device copy', async () => {
  const device = encodeSave(backfillRewards(parseSave(source()))); db.raw = device;
  await mount();
  const incoming = source();
  await act(async () => store.restore(incoming));
  expect(db.preserved.filter(copy => copy === incoming)).toHaveLength(1);
  expect(db.preserved).toContain(device);
  expect(previousAccepts(db.preserved[db.preserved.indexOf(incoming)])).toBe(true);
  expect(personFor(store.save, 'a').earned).toContain('outfit:star-dress');
});
it('restoring a settled backup keeps only what it replaces', async () => {
  const device = encodeSave(backfillRewards(parseSave(source()))); db.raw = device;
  await mount();
  const incoming = ` ${device}\n`;
  await act(async () => store.restore(incoming));
  expect(db.preserved).not.toContain(incoming);
});
it('an older envelope that also gains grants is copied once on restore and on load', async () => {
  const older = ` ${JSON.stringify(fixture25)}\n`;
  db.raw = encodeSave(backfillRewards(parseSave(source())));
  await mount();
  await act(async () => store.restore(older));
  expect(db.preserved.filter(copy => copy === older)).toHaveLength(1);
  await unmount();
  db.preserved = []; db.raw = older;
  await mount();
  expect(db.preserved).toEqual([older]);
});
