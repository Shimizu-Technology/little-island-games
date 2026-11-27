import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, expect, it, vi } from 'vitest';
import { CoveRound } from '../src/cove/CoveRound';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptySave } from '../src/state/validation';
import { addLearner } from '../src/learn/learners';
import { registerSaveContent } from '../src/state/challenge';
import { catalogManifest } from '../src/state/catalogManifest';
import { selectedOwner, progressFor } from '../src/state/challengeDrafts';
import { defineReplayGame } from '../src/challenge/replay';
import { GridShell } from '../src/puzzles/grid/GridShell';
import { createGrid, gridAction, type GridAction, type GridSpec, type GridState } from '../src/puzzles/grid/model';
import { isGridEvent } from '../src/puzzles/grid/checkpoint';
import type { ChallengeEntry, ReplayEngine } from '../src/challenge/types';
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false }));
const db = vi.hoisted(() => ({ raw: null as string | null, rows: [] as string[], hold: null as null | (() => Promise<void>), envelopeHold: null as null | Promise<void>, play: vi.fn() }));
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (raw: string) => { await db.envelopeHold; db.raw = raw; }, preserve: async () => {}, writeDraft: async (raw: string) => { await db.hold?.(); db.rows.push(raw); }, readDrafts: async () => db.rows } }));
vi.mock('react-native', () => ({ AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener: () => ({ remove() {} }) }, ScrollView: 'section', View: 'div', TextInput: 'input', Pressable: 'button', Platform: { OS: 'ios' }, useWindowDimensions: () => ({ width: 393, height: 852 }), PanResponder: { create: (handlers: unknown) => ({ panHandlers: handlers }) }, AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('react-native-reanimated', async () => { const { useRef } = await import('react'); return { default: { View: 'animated' }, useAnimatedStyle: (fn: () => unknown) => fn(), useSharedValue: (value: number) => useRef({ value, get() { return this.value; }, set(n: number) { this.value = n; } }).current }; });
vi.mock('react-native-svg', () => ({ default: 'svg', Path: 'path' }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'main', useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
vi.mock('expo-router', () => ({ useIsFocused: () => true, router: {} }));
vi.mock('../src/components/Settings', () => ({ Settings: () => null }));
vi.mock('../src/personalization/LearnerChip', () => ({ LearnerChip: () => null }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Chip: 'button', Copy: 'p', Heading: 'h2', ToggleRow: 'switch', C: {}, styles: {} }));
vi.mock('../src/ui', async () => (await import('./helpers/cove-ui')).ui);
vi.mock('../src/personalization/Portrait', () => ({ Portrait: () => null }));
vi.mock('../src/cove/CoveArt', async () => (await import('./helpers/cove-ui')).art);
vi.mock('../src/components/Text', () => ({ Text: 'span' }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play: db.play }) }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
let store: ReturnType<typeof useStore>;
function Probe() { const s = useStore(); useLayoutEffect(() => { store = s; }, [s]); return null; }
function fixture(kind: 'digits' | 'paint') {
  const spec: GridSpec = { rows: 4, columns: 4, kind, symbols: ['1','2','3','4'], givens: Array(16).fill(0) }, game = kind === 'digits' ? 'sudoku' : 'picture-grid';
  const engine: ReplayEngine<Record<string, never>, Record<string, never>, GridAction, GridState> = { initial: () => ({}), validInitial: (v): v is Record<string, never> => !!v && Object.keys(v).length === 0, create: () => createGrid(spec), validAction: (v): v is GridAction => isGridEvent(v, spec) && !['help','check','reset'].includes(v.type), step: (s,a) => ({ state: gridAction(s,a,spec), event: 'edit' }), inspect: s => ({ solved: false, metrics: {}, edits: s.edits, solution: null, objectives: [] }) };
  return defineReplayGame({ game, codec: `test-grid-${kind}`, context: game, cove: true, budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 }, puzzles: [{ ref: { bank: kind === 'digits' ? 401 : 402, puzzle: 0, engine: game, rules: 1, hash: (kind === 'digits' ? 'b' : 'c').repeat(64) }, source: { kind: 'endless', bank: kind === 'digits' ? 401 : 402, puzzle: 0 }, path: 'endless', tier: 1, title: 'Grid integration fixture', descriptor: {}, dares: [], awards: [null, null] }], engine, Board: ({ state, dispatch, active, width }) => <GridShell spec={spec} state={state} dispatch={dispatch} active={active} width={width} numberFirst/>, controls: { help: () => ({ type: 'pencil' as const }), reset: () => ({ type: 'undo' as const }) } });
}
function Ready({ entry }: { entry: ChallengeEntry }) { const s = useStore(); return s.ready ? <CoveRound key={`${selectedOwner(s.save)}:${s.epoch}`} entry={entry} card={entry.puzzles[0]} partner={null} width={353} onBrowse={() => {}} onClose={() => {}}/> : null; }
const stateOf = (entry: ChallengeEntry) => { const s = progressFor(store.save, selectedOwner(store.save))!.paused[0]; return s; };
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); db.rows = []; db.hold = null; db.envelopeHold = null; db.play.mockClear(); db.raw = JSON.stringify({ ...emptySave(), learning: addLearner(undefined, 'A', 'a') }); });
it.each(['digits','paint'] as const)('1 accepts one %s gesture as one round revision and undo decision', async kind => {
  const entry = fixture(kind); registerSaveContent(entry.catalog, catalogManifest(entry.catalog)); let screen!: ReactTestRenderer;
  try {
    await act(async () => { screen = create(<StoreProvider><Probe/><Ready entry={entry}/></StoreProvider>); });
    if (kind === 'digits') await act(async () => screen.root.findAllByType('button').filter(b => b.props.accessibilityLabel?.startsWith('Row '))[2].props.onPress());
    else await act(async () => { const h = screen.root.findByProps({ testID: 'cove-grid-input' }).props; h.onPanResponderGrant({ nativeEvent: { locationX: 4, locationY: 4, pageX: 4, pageY: 4 } }, { numberActiveTouches: 1 }); h.onPanResponderMove({ nativeEvent: { locationX: 250, locationY: 4 } }, { numberActiveTouches: 1 }); h.onPanResponderRelease(); });
    const session = stateOf(entry), actions = (session.payload as { actions: GridAction[] }).actions;
    expect(actions).toHaveLength(1); expect(actions[0]).toMatchObject({ type: 'write', selected: 2 });
    expect(session.revision).toBe(1); expect(db.play).toHaveBeenCalledTimes(1);
    await act(async () => screen.root.findAllByType('button').find(b => b.children.includes('Undo'))!.props.onPress());
    expect(stateOf(entry).revision).toBe(2);
  } finally { if (screen) await act(async () => screen.unmount()); }
});
it('3 accepts consecutive input and undo while the first draft is still writing', async () => {
  const entry = fixture('digits'); registerSaveContent(entry.catalog, catalogManifest(entry.catalog)); let screen!: ReactTestRenderer, release!: () => void;
  try {
    await act(async () => { screen = create(<StoreProvider><Probe/><Ready entry={entry}/></StoreProvider>); });
    db.hold = () => new Promise<void>(resolve => { release = resolve; });
    await act(async () => screen.root.findAllByType('button').filter(b => b.props.accessibilityLabel?.startsWith('Row '))[1].props.onPress());
    expect(stateOf(entry).revision).toBe(1);
    await act(async () => screen.root.findAllByType('button').filter(b => b.props.accessibilityLabel?.startsWith('Row '))[2].props.onPress());
    expect(stateOf(entry).revision).toBe(2);
    await act(async () => screen.root.findAllByType('button').find(b => b.children.includes('Undo'))!.props.onPress());
    expect(stateOf(entry).revision).toBe(3);
  } finally { db.hold = null; await act(async () => { release?.(); await store.backup(); screen?.unmount(); }); }
});
it('2 resets a persisted adult identity to the current learner on relaunch', async () => {
  const entry = fixture('digits'); registerSaveContent(entry.catalog, catalogManifest(entry.catalog)); let screen!: ReactTestRenderer;
  try {
    await act(async () => { screen = create(<StoreProvider><Probe/></StoreProvider>); });
    await act(async () => { await store.covePerson({ type: 'add', name: 'Leon', id: 'cove-leon' }, store.epoch); });
    const original = db.raw; expect(selectedOwner(store.save)).toBe('cove-leon');
    await act(async () => screen.unmount());
    await act(async () => { screen = create(<StoreProvider><Probe/></StoreProvider>); });
    expect(selectedOwner(store.save)).toBe('a'); expect(store.save.cove!.people['cove-leon'].name).toBe('Leon'); expect(db.raw).toBe(original);
  } finally { if (screen) await act(async () => screen.unmount()); }
});

it('5 and 6 previews the axis-locked stroke and pans by centroid without a finger jump', async () => {
  const spec: GridSpec = { rows: 25, columns: 25, kind: 'paint', symbols: ['Fill','×'], givens: Array(625).fill(0) }, dispatch = vi.fn(); let screen!: ReactTestRenderer;
  try {
    await act(async () => { screen = create(<GridShell spec={spec} state={createGrid(spec)} dispatch={dispatch} width={353} active/>); });
    const input = () => screen.root.findByProps({ testID: 'cove-grid-input' }).props;
    await act(async () => input().onPanResponderGrant({ nativeEvent: { locationX: 3, locationY: 3, pageX: 3, pageY: 3 } }, { numberActiveTouches: 1, dx: 0, dy: 0 }));
    await act(async () => input().onPanResponderMove({ nativeEvent: { locationX: 135, locationY: 3 } }, { numberActiveTouches: 1, dx: 132, dy: 0 }));
    await act(async () => input().onPanResponderMove({ nativeEvent: { locationX: 179, locationY: 135 } }, { numberActiveTouches: 1, dx: 176, dy: 132 }));
    expect(screen.root.findAll(n => typeof n.props.testID === 'string' && n.props.testID.startsWith('stroke-')).map(n => n.props.testID)).toEqual(['stroke-0','stroke-1','stroke-2','stroke-3','stroke-4']);
    await act(async () => input().onPanResponderRelease());
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'write', cells: [0,1,2,3,4], value: 1, selected: 4 });
    // A changed event can belong to either finger; only dx/dy may affect the board.
    await act(async () => input().onPanResponderGrant({ nativeEvent: { locationX: 80, locationY: 80, pageX: 80, pageY: 80 } }, { numberActiveTouches: 2, dx: 0, dy: 0 }));
    await act(async () => input().onPanResponderMove({ nativeEvent: { pageX: 500, pageY: 500 } }, { numberActiveTouches: 2, dx: -30, dy: -20 }));
    // Force a render so the test's animated-style shim reads the shared values.
    await act(async () => screen.update(<GridShell spec={spec} state={{ ...createGrid(spec), selected: 1 }} dispatch={dispatch} width={353} active/>));
    const board = screen.root.findAll(n => n.type === ('animated' as React.ElementType)).find(n => n.props.style?.[0]?.width === 1100)!;
    expect(board.props.style[1].transform).toEqual([{ translateX: -30 }, { translateY: -20 }]);
    await act(async () => input().onPanResponderTerminate());
  } finally { await act(async () => screen?.unmount()); }
});

it('2 retries blur identity cleanup after an in-flight launch boundary', async () => {
  const entry = fixture('digits'); registerSaveContent(entry.catalog, catalogManifest(entry.catalog)); let screen!: ReactTestRenderer, release!: () => void;
  try {
    await act(async () => { screen = create(<StoreProvider><Probe/></StoreProvider>); });
    await act(async () => { await store.covePerson({ type: 'add', name: 'Leon', id: 'cove-leon' }, store.epoch); });
    const epoch = store.epoch, owner = selectedOwner(store.save), session = entry.start(entry.puzzles[0].ref, owner, 'boundary-test', progressFor(store.save, owner)!, { supportOff: false, ownRead: false }, []);
    db.envelopeHold = new Promise<void>(resolve => { release = resolve; });
    let launch!: Promise<boolean>, blur!: Promise<boolean>;
    await act(async () => { launch = store.challengeSave(session, { owner, epoch, game: entry.game, id: null, revision: null }); await Promise.resolve(); blur = store.covePerson({ type: 'select', id: null }, epoch); });
    await act(async () => { db.envelopeHold = null; release(); await launch; await blur; });
    expect(selectedOwner(store.save)).toBe('a'); expect(progressFor(store.save, owner)?.paused[0].id).toBe('boundary-test');
  } finally { db.envelopeHold = null; release?.(); await act(async () => screen?.unmount()); }
});

it('G3 R2 Challenge route holds its page during a grid touch, releases on cancel and supplies accepted feedback', async()=>{
  const { ChallengeFrame }=await import('../src/challenge/ChallengeFrame');
  const entry=fixture('digits');registerSaveContent(entry.catalog,catalogManifest(entry.catalog));let screen!:ReactTestRenderer;
  function Frame(){const s=useStore();return s.ready?<ChallengeFrame entry={entry}/>:null;}
  try{
    await act(async()=>{screen=create(<StoreProvider><Probe/><Frame/></StoreProvider>);});
    await act(async()=>screen.root.findAllByType('button').find(b=>b.children.includes('Start this puzzle'))!.props.onPress());
    const page=()=>screen.root.findByType('section'),input=()=>screen.root.findByProps({testID:'cove-grid-input'}).props;
    expect(page().props.scrollEnabled).toBe(true);
    await act(async()=>input().onPanResponderGrant({nativeEvent:{locationX:4,locationY:4}},{numberActiveTouches:1,dx:0,dy:0}));
    expect(page().props.scrollEnabled).toBe(false);
    await act(async()=>input().onPanResponderTerminate());expect(page().props.scrollEnabled).toBe(true);
    await act(async()=>screen.root.findAllByType('button').filter(b=>b.props.accessibilityLabel?.startsWith('Row '))[1].props.onPress());
    expect(stateOf(entry).revision).toBe(1);expect(db.play).toHaveBeenCalledTimes(1);
  }finally{await act(async()=>screen?.unmount());}
});
