import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { CoveRound } from '../src/cove/CoveRound';
import { StoreProvider, useStore } from '../src/state/Store';
import { registerSaveContent, emptyChallenge } from '../src/state/challenge';
import { catalogManifest } from '../src/state/catalogManifest';
import { emptySave } from '../src/state/validation';
import { addLearner } from '../src/learn/learners';
import { registration, puzzle, solve, type Payload } from './helpers/challenge-replay';
import { progressFor, selectedOwner } from '../src/state/challengeDrafts';
import { completion } from '../src/cove/catalog';
const db = vi.hoisted(() => ({ raw: null as string | null, rows: [] as string[], fail: false, focused: true }));
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (raw: string) => { if (db.fail) throw new Error('disk'); db.raw = raw; }, preserve: async () => {}, writeDraft: async (raw: string) => { db.rows.push(raw); }, readDrafts: async () => db.rows, discardSession: async () => {} } }));
vi.mock('react-native', () => ({ ScrollView: 'section', View: 'div', useWindowDimensions: () => ({ width: 393, height: 852 }), AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'main' }));
vi.mock('expo-router', () => ({ useIsFocused: () => db.focused, router: {} }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Chip: 'button', Heading: 'h2', Copy: 'p', styles: {} }));
vi.mock('../src/ui', async () => (await import('./helpers/cove-ui')).ui);
vi.mock('../src/personalization/Portrait', () => ({ Portrait: () => null }));
vi.mock('../src/cove/CoveArt', async () => (await import('./helpers/cove-ui')).art);
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play: vi.fn() }) }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
let store: ReturnType<typeof useStore>;
function Probe() { const value = useStore(); useLayoutEffect(() => { store = value; }, [value]); return null; }
const entry = { ...registration, render: (session: Parameters<typeof registration.move>[0], dispatch: (a: unknown) => void) => {
  const actions = (solve(registration.start(puzzle.ref, 'a', 'fixture', emptyChallenge(), { supportOff: false, ownRead: false }, [])).payload as Payload).actions;
  return <button onClick={() => dispatch(actions[(session.payload as Payload).actions.length])}>Next legal step</button>;
} };
function Ready({ partner = null }: { partner?: string | null }) { const s = useStore(); return s.ready ? <CoveRound key={`${selectedOwner(s.save)}:${s.epoch}`} entry={entry} card={entry.puzzles[0]} partner={partner} width={353} onBrowse={() => {}} onClose={() => {}}/> : null; }
const press = async (screen: ReactTestRenderer, text: string) => act(async () => { const b = screen.root.findAllByType('button').find(n => n.children.includes(text)); expect(b).toBeDefined(); (b!.props.onClick ?? b!.props.onPress)(); });
describe('Cove round real Store acceptance', () => {
  it('opens in one tap, autosaves, resumes the same ref, and cannot cross people', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); registerSaveContent(registration.catalog, catalogManifest(registration.catalog));
    db.rows = []; db.raw = JSON.stringify({ ...emptySave(), learning: addLearner(undefined, 'A', 'a') }); let screen!: ReactTestRenderer;
    try {
      await act(async () => { screen = create(<StoreProvider><Probe/><Ready/></StoreProvider>); });
      expect(store.save.challenge?.paused).toHaveLength(1); const first = store.save.challenge!.paused[0];
      await press(screen, 'Next legal step'); expect(store.save.challenge!.paused[0].revision).toBe(1); expect(db.rows.length).toBeGreaterThan(0);
      const accepted = store.save.challenge!.paused[0]; await act(async () => { await store.backup(); screen.unmount(); });
      await act(async () => { screen = create(<StoreProvider><Probe/><Ready/></StoreProvider>); });
      expect(store.save.challenge!.paused[0]).toEqual(accepted);
      await act(async () => { await store.covePerson({ type: 'add', name: 'Leon', id: 'cove-leon' }, store.epoch); });
      expect(selectedOwner(store.save)).toBe('cove-leon'); expect(progressFor(store.save, 'a')!.paused[0]).toEqual(accepted);
      expect(store.save.cove!.people['cove-leon'].challenge.paused[0].id).not.toBe(first.id);
    } finally { if (screen) await act(async () => screen.unmount()); vi.unstubAllGlobals(); }
  });
  it('credits both Together people atomically without a helped finish', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); registerSaveContent(registration.catalog, catalogManifest(registration.catalog));
    db.rows = []; db.raw = JSON.stringify({ ...emptySave(), learning: addLearner(undefined, 'A', 'a') }); let screen!: ReactTestRenderer;
    try {
      await act(async () => { screen = create(<StoreProvider><Probe/><Ready partner="family"/></StoreProvider>); });
      expect(store.save.challenge!.paused[0].partner).toBe('family');
      for (let i = 0; i < 40 && store.save.challenge!.paused.length; i++) await press(screen, 'Next legal step');
      expect(store.save.challenge!.paused).toEqual([]);
      expect(completion(progressFor(store.save, 'a')!, puzzle.ref, entry)).toBe(3);
      expect(completion(progressFor(store.save, 'family')!, puzzle.ref, entry)).toBe(3);
      expect(JSON.stringify(screen.toJSON())).toContain('Solved together');
    } finally { if (screen) await act(async () => screen.unmount()); vi.unstubAllGlobals(); }
  });
  it('does not start a new attempt while its retained route is out of focus', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); registerSaveContent(registration.catalog, catalogManifest(registration.catalog));
    db.focused = false; db.rows = []; db.raw = JSON.stringify({ ...emptySave(), learning: addLearner(undefined, 'A', 'a') }); let screen!: ReactTestRenderer;
    try {
      await act(async () => { screen = create(<StoreProvider><Probe/><Ready/></StoreProvider>); });
      expect(store.save.challenge!.paused).toEqual([]);
      db.focused = true; await act(async () => screen.update(<StoreProvider><Probe/><Ready/></StoreProvider>));
      expect(store.save.challenge!.paused).toHaveLength(1);
    } finally { db.focused = true; if (screen) await act(async () => screen.unmount()); vi.unstubAllGlobals(); }
  });

});

it('13 confirms Together at a solo finish and credits both people in one save', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); registerSaveContent(registration.catalog, catalogManifest(registration.catalog));
  db.rows = []; db.raw = JSON.stringify({ ...emptySave(), learning: addLearner(undefined, 'A', 'a') }); let screen!: ReactTestRenderer;
  try {
    await act(async () => { screen = create(<StoreProvider><Probe/><Ready/></StoreProvider>); });
    for (let i = 0; i < 40 && screen.root.findAllByType('button').some(b => b.children.includes('Next legal step')); i++) await press(screen, 'Next legal step');
    expect(store.save.challenge!.paused).toHaveLength(1);
    const confirm = screen.root.findAllByType('button').find(b => b.props.accessibilityLabel === 'Solved together with Family practice'); expect(confirm).toBeDefined();
    await act(async () => confirm!.props.onPress());
    expect(store.save.challenge!.paused).toEqual([]);
    expect(completion(progressFor(store.save, 'a')!, puzzle.ref, entry)).toBe(3);
    expect(completion(progressFor(store.save, 'family')!, puzzle.ref, entry)).toBe(3);
    expect(JSON.stringify(screen.toJSON())).toContain('Together with ');
  } finally { if (screen) await act(async () => screen.unmount()); vi.unstubAllGlobals(); }
});

it('G3 R1 saves a Family practice solo finish immediately and retains it across relaunch', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); registerSaveContent(registration.catalog, catalogManifest(registration.catalog));
  db.rows = []; db.raw = JSON.stringify(emptySave()); let screen!: ReactTestRenderer;
  try {
    await act(async () => { screen = create(<StoreProvider><Probe/><Ready/></StoreProvider>); });
    for (let i = 0; i < 40 && screen.root.findAllByType('button').some(b => b.children.includes('Next legal step')); i++) await press(screen, 'Next legal step');
    expect(store.save.challenge!.paused).toEqual([]);
    expect(completion(progressFor(store.save, 'family')!, puzzle.ref, entry)).toBe(5);
    expect(JSON.stringify(screen.toJSON())).toContain('Puzzle solved');
    await act(async () => { await store.backup(); screen.unmount(); });
    await act(async () => { screen = create(<StoreProvider><Probe/></StoreProvider>); });
    expect(completion(progressFor(store.save, 'family')!, puzzle.ref, entry)).toBe(5);
  } finally { if (screen) await act(async () => screen.unmount()); vi.unstubAllGlobals(); }
});
