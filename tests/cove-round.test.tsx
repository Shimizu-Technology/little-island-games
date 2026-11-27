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
const db = vi.hoisted(() => ({ raw: null as string | null, rows: [] as string[], fail: false, focused: true, reduced: false }));
const sound = vi.hoisted(() => ({ play: (() => {}) as (key: string) => void }));
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (raw: string) => { if (db.fail) throw new Error('disk'); db.raw = raw; }, preserve: async () => {}, writeDraft: async (raw: string) => { db.rows.push(raw); }, readDrafts: async () => db.rows, discardSession: async () => {} } }));
vi.mock('react-native', () => ({ ScrollView: 'section', View: 'div', useWindowDimensions: () => ({ width: 393, height: 852 }), AppState: { addEventListener: () => ({ remove() {} }) }, AccessibilityInfo: { isReduceMotionEnabled: async () => db.reduced, addEventListener: () => ({ remove() {} }) } }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'main' }));
vi.mock('expo-router', () => ({ useIsFocused: () => db.focused, router: {} }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Chip: 'button', Heading: 'h2', Copy: 'p', styles: {} }));
vi.mock('../src/ui', async () => (await import('./helpers/cove-ui')).ui);
vi.mock('../src/personalization/Portrait', () => ({ Portrait: () => null }));
vi.mock('../src/cove/CoveArt', async () => (await import('./helpers/cove-ui')).art);
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play: (key: string) => sound.play(key) }) }));
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

it('PR100 R1 cheers a finish once, only after it saves: never while attribution waits or after a refused save', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); registerSaveContent(registration.catalog, catalogManifest(registration.catalog));
  db.rows = []; db.raw = JSON.stringify({ ...emptySave(), learning: addLearner(undefined, 'A', 'a') }); let screen!: ReactTestRenderer;
  const played: string[] = []; sound.play = key => { played.push(key); };
  const wins = () => played.filter(k => k === 'win').length, bursts = () => screen.root.findAllByType('i').filter(n => n.props.testID === 'cove-finish-burst').length;
  const solveAll = async () => { for (let i = 0; i < 40 && screen.root.findAllByType('button').some(b => b.children.includes('Next legal step')); i++) await press(screen, 'Next legal step'); };
  try {
    await act(async () => { screen = create(<StoreProvider><Probe/><Ready/></StoreProvider>); });
    await solveAll();
    // The partner question is up: no cue, no burst, nothing saved as a result.
    expect(screen.root.findAllByType('button').some(n => n.props.accessibilityLabel === 'Solved together with Family practice')).toBe(true);
    expect(wins()).toBe(0); expect(bursts()).toBe(0); expect(store.save.challenge!.paused[0].result).toBeNull();
    db.fail = true; await press(screen, 'Save my finish');
    expect(JSON.stringify(screen.toJSON())).toContain('Your finish has not saved yet.');
    expect(wins()).toBe(0); expect(bursts()).toBe(0); expect(store.save.challenge!.paused).toHaveLength(1);
    // Back on the board, the same final move asks again and still does not cheer.
    await press(screen, 'Back to my board'); await solveAll();
    expect(wins()).toBe(0); expect(bursts()).toBe(0);
    db.fail = false; await press(screen, 'Save my finish');
    expect(store.save.challenge!.paused).toEqual([]);
    expect(wins()).toBe(1); expect(bursts()).toBe(1);
    expect(JSON.stringify(screen.toJSON())).toContain('Puzzle solved');
  } finally { db.fail = false; sound.play = () => {}; if (screen) await act(async () => screen.unmount()); vi.unstubAllGlobals(); }
});

it('PR100 R1 cheers a direct finish once, after its save', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); registerSaveContent(registration.catalog, catalogManifest(registration.catalog));
  db.rows = []; db.raw = JSON.stringify(emptySave()); let screen!: ReactTestRenderer;
  const played: string[] = []; sound.play = key => { played.push(key); };
  try {
    await act(async () => { screen = create(<StoreProvider><Probe/><Ready/></StoreProvider>); });
    for (let i = 0; i < 40 && screen.root.findAllByType('button').some(b => b.children.includes('Next legal step')); i++) await press(screen, 'Next legal step');
    expect(store.save.challenge!.paused).toEqual([]);
    expect(played.filter(k => k === 'win')).toHaveLength(1);
    expect(screen.root.findAllByType('i').filter(n => n.props.testID === 'cove-finish-burst')).toHaveLength(1);
  } finally { sound.play = () => {}; if (screen) await act(async () => screen.unmount()); vi.unstubAllGlobals(); }
});

describe('above-the-fold finish flow', () => {
  it('renders cove-finish and Next puzzle BEFORE the completed board and smoothly scrolls to top on solve', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    registerSaveContent(registration.catalog, catalogManifest(registration.catalog));
    db.rows = []; db.reduced = false; db.raw = JSON.stringify(emptySave());
    const boardEntry = {
      ...entry,
      helpUI: 'board' as const,
      render: (session: Parameters<typeof registration.move>[0], dispatch: (a: unknown) => void) => {
        const actions = (solve(registration.start(puzzle.ref, 'a', 'fixture', emptyChallenge(), { supportOff: false, ownRead: false }, [])).payload as Payload).actions;
        return <div data-board="completed-grid"><button onClick={() => dispatch(actions[(session.payload as Payload).actions.length])}>Next legal step</button></div>;
      },
    };
    const onNext = vi.fn();
    const scrollTo = vi.fn();
    function BoardReady() {
      const s = useStore();
      return s.ready ? <CoveRound key={`${selectedOwner(s.save)}:${s.epoch}`} entry={boardEntry} card={boardEntry.puzzles[0]} partner={null} width={353} onBrowse={() => {}} onClose={() => {}} choices={{ onNext }}/> : null;
    }
    let screen!: ReactTestRenderer;
    try {
      await act(async () => {
        screen = create(<StoreProvider><Probe/><BoardReady/></StoreProvider>, {
          createNodeMock: el => (el.type === 'section' ? { scrollTo } : null),
        });
      });
      expect(scrollTo).not.toHaveBeenCalled();
      for (let i = 0; i < 40 && screen.root.findAllByType('button').some(b => b.children.includes('Next legal step')); i++) {
        await press(screen, 'Next legal step');
      }
      expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
      const scroll = screen.root.findByType('section' as never);
      const scrollChildren = scroll.children.filter(c => typeof c !== 'string');
      const finishIndex = scrollChildren.findIndex(c => c.props.testID === 'cove-finish');
      const boardIndex = scrollChildren.findIndex(c => c.props.testID === 'cove-solved-board');
      expect(finishIndex).toBe(0);
      expect(boardIndex).toBeGreaterThan(finishIndex);
      const serialized = JSON.stringify(screen.toJSON());
      expect(serialized.indexOf('cove-finish')).toBeLessThan(serialized.indexOf('Next puzzle'));
      expect(serialized.indexOf('Next puzzle')).toBeLessThan(serialized.indexOf('cove-solved-board'));
      expect(serialized).toContain('Puzzle solved!');
      await press(screen, 'Next puzzle');
      expect(onNext).toHaveBeenCalledTimes(1);
    } finally {
      if (screen) await act(async () => screen.unmount());
      vi.unstubAllGlobals();
    }
  });

  it('auto-scrolls to top without animation under Reduce Motion on partner prompt and confirmed finish', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    registerSaveContent(registration.catalog, catalogManifest(registration.catalog));
    db.rows = []; db.reduced = true; db.raw = JSON.stringify({ ...emptySave(), learning: addLearner(undefined, 'A', 'a') });
    const scrollTo = vi.fn();
    let screen!: ReactTestRenderer;
    try {
      await act(async () => {
        screen = create(<StoreProvider><Probe/><Ready/></StoreProvider>, {
          createNodeMock: el => (el.type === 'section' ? { scrollTo } : null),
        });
      });
      expect(scrollTo).not.toHaveBeenCalled();
      for (let i = 0; i < 40 && screen.root.findAllByType('button').some(b => b.children.includes('Next legal step')); i++) {
        await press(screen, 'Next legal step');
      }
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo).toHaveBeenLastCalledWith({ y: 0, animated: false });
      await press(screen, 'Save my finish');
      expect(scrollTo).toHaveBeenCalledTimes(2);
      expect(scrollTo).toHaveBeenLastCalledWith({ y: 0, animated: false });
    } finally {
      db.reduced = false;
      if (screen) await act(async () => screen.unmount());
      vi.unstubAllGlobals();
    }
  });
});
