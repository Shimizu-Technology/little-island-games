import React, { createContext, useLayoutEffect } from 'react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ChallengeFrame } from '../src/challenge/ChallengeFrame';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptyChallenge, registerSaveContent } from '../src/state/challenge';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { putProgress } from '../src/state/challengeDrafts';
import { catalogManifest } from '../src/state/catalogManifest';
import { emptySave } from '../src/state/validation';
import { addLearner } from '../src/learn/learners';
import { registration, type Action, type Payload, type State } from '../src/learn/games/slip-tide/challenge';
import { ChallengeBoard } from '../src/learn/games/slip-tide/challengeBoard';
import type { PlayfieldProps } from '../src/learn/games/slip-tide/field';
import { dirOf, tuplePuzzle } from '../src/learn/games/slip-tide/rules';
import type { ChallengeEntry, ChallengeViewProps } from '../src/challenge/types';

const db = vi.hoisted(() => ({ raw: null as string | null }));
let field: PlayfieldProps | undefined;
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (raw: string) => { db.raw = raw; }, preserve: async () => {}, writeDraft: async () => {}, discardSession: async () => {} } }));
vi.mock('../src/puzzles/bankAssets', async () => {
  const { readFileSync: read } = await import('node:fs');
  return { bankTransport: { read: async (name: string) => read(`src/content/puzzles/assets/${name}.lipuzzle`, 'utf8') } };
});
vi.mock('react-native', () => ({ ScrollView: 'section', View: 'div', useWindowDimensions: () => ({ width: 390, height: 844 }), AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'main' }));
vi.mock('expo-router', () => ({ useIsFocused: () => true, router: { canGoBack: () => false, replace: vi.fn() } }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Chip: 'button', Heading: 'h2', Copy: 'p', ToggleRow: 'switch', styles: {} }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}) }));
vi.mock('../src/components/Settings', () => ({ Settings: () => null }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/personalization/LearnerChip', () => ({ LearnerChip: () => null }));
vi.mock('../src/learn/games/slip-tide/field', () => ({ Playfield: (props: PlayfieldProps) => { field = props; return props.help ?? null; } }));

let store: ReturnType<typeof useStore>;
function Probe() { const s = useStore(); useLayoutEffect(() => { store = s; }, [s]); return null; }
// The registration's own board is lazily required on device; here the same props render it directly.
const entry: ChallengeEntry = { ...registration, render: (session, dispatch, active, width, host) => {
  const el = registration.render(session, dispatch, active, width, host) as React.ReactElement<ChallengeViewProps<State, Action>> | null;
  return el ? <ChallengeBoard {...el.props} /> : null;
} };
function Ready() { const s = useStore(); return s.ready ? <ChallengeFrame key={`${s.epoch}`} entry={entry} /> : null; }
const press = async (root: ReactTestRenderer, label: string) => act(async () => {
  const button = root.root.findAllByType('button' as never).find(n => n.children.filter(c => typeof c === 'string').join('') === label);
  expect(button, label).toBeDefined(); await (button!.props.onPress ?? button!.props.onClick)();
});
const settle = () => act(async () => { for (let i = 0; i < 6; i++) await new Promise(r => setTimeout(r, 0)); });
/** Loading a pack and saving the launch take several turns; wait for the visible result, not a fixed count. */
const waitFor = async (done: () => boolean) => { for (let i = 0; i < 200 && !done(); i++) await settle(); expect(done()).toBe(true); };
const row = (slot: number, index: number) => readFileSync(`src/content/puzzles/assets/p${slot}.lipuzzle`, 'utf8').trim().split('\n')[index + 1];
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); field = undefined; });
afterEach(() => { vi.unstubAllGlobals(); });

it('R8: Endless Tide starts, plays, finishes and reopens packed bank entries through the Store content check', async () => {
  registerSaveContent(registration.catalog, catalogManifest(registration.catalog));
  db.raw = JSON.stringify({ ...emptySave(), learning: addLearner(undefined, 'A', 'a') });
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<StoreProvider><Probe /><Ready /></StoreProvider>); });
  await press(root, 'Endless Tide');
  const labels = root.root.findAllByType('button' as never).map(b => b.children.filter(c => typeof c === 'string').join(''));
  expect(labels).toEqual(expect.arrayContaining(['Lagoon · Tide 3 · 400 puzzles', 'Stopper · Tide 4 · 400 puzzles', 'Deep · Tide 5 · 256 puzzles', 'Trench · Tide 6 · 128 puzzles']));
  await press(root, 'Lagoon · Tide 3 · 400 puzzles');
  await press(root, 'Start this puzzle');
  await waitFor(() => !!store.save.challenge?.paused.length && !!field);
  const first = store.save.challenge!.paused[0];
  expect(first.puzzle).toEqual({ bank: 3, puzzle: 0, engine: 'slip-tide', rules: 1, hash: createHash('sha256').update(row(3, 0)).digest('hex') });
  expect(store.save.challenge!.choice).toEqual(['slip-tide', 'endless', 3]);
  expect(JSON.stringify(root.toJSON())).toContain('Lagoon 1');
  // Play the certified route with real swipes through the frame's guarded commit.
  for (const d of [...tuplePuzzle(JSON.parse(row(3, 0))[3])!.route].map(dirOf)) { await act(async () => { field!.onMove(d); }); await settle(); }
  expect(JSON.stringify(root.toJSON())).toContain('Puzzle solved!');
  expect(store.save.challenge!.banks.find(b => b[0] === 3)).toBeDefined();
  expect(store.save.challenge!.recent.at(-1)).toEqual([3, 0]);
  // Another from the same band deals a different, never-opened entry.
  await press(root, 'Try another');
  await waitFor(() => store.save.challenge!.paused.length === 1);
  const second = store.save.challenge!.paused[0];
  expect(second.puzzle.bank).toBe(3);
  expect(second.puzzle.puzzle).toBe(1);
  const d0 = dirOf(tuplePuzzle(JSON.parse(row(3, 1))[3])!.route[0]);
  await act(async () => { field!.onMove(d0); }); await settle();
  expect((store.save.challenge!.paused[0].payload as Payload).actions).toEqual([d0]);
  await act(async () => root.unmount());

  // Reopen from the saved envelope: the paused packed entry is verified again before its board renders.
  field = undefined;
  await act(async () => { root = create(<StoreProvider><Probe /><Ready /></StoreProvider>); });
  await waitFor(() => !!field);
  expect(store.save.challenge!.paused[0].puzzle).toEqual(second.puzzle);
  expect(field).toBeDefined();
  // This storage double keeps envelopes only, so the reopened board shows the saved envelope's moves.
  expect(field!.steps).toBe((store.save.challenge!.paused[0].payload as Payload).actions.length);
  await act(async () => root.unmount());
});

it('R8: a saved packed entry whose fingerprint no longer matches is kept and not opened', async () => {
  registerSaveContent(registration.catalog, catalogManifest(registration.catalog));
  const real = { bank: 4, puzzle: 2, engine: 'slip-tide', rules: 1, hash: createHash('sha256').update(row(4, 2)).digest('hex') };
  await registration.packed!.prepare(real);
  const session = registration.start(real, 'a', 'challenge-a-1', emptyChallenge(), { supportOff: false, ownRead: false }, []);
  const forged = { ...session, puzzle: { ...real, hash: 'e'.repeat(64) } };
  const progress = { ...emptyChallenge(), nextOrdinal: 2, paused: [forged] };
  db.raw = encodeSave(putProgress(migrateProfiles({ ...emptySave(), learning: addLearner(undefined, 'A', 'a') }), 'a', progress));
  field = undefined;
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<StoreProvider><Probe /><Ready /></StoreProvider>); });
  await settle();
  expect(field).toBeUndefined();
  const text = JSON.stringify(root.toJSON());
  // Stored packed slots load structurally; the exact check at Continue refuses it and keeps it saved.
  expect(store.save.challenge!.paused[0].puzzle.hash).toBe('e'.repeat(64));
  expect(text).toContain('could not open');
  expect(text).toContain('Try opening again');
  await act(async () => root.unmount());
});
