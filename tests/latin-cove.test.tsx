import React, { createContext, useLayoutEffect, useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoveRound } from '../src/cove/CoveRound';
import { StoreProvider, useStore } from '../src/state/Store';
import { registerSaveContent } from '../src/state/challenge';
import { catalogManifest } from '../src/state/catalogManifest';
import { emptySave } from '../src/state/validation';
import { addLearner } from '../src/learn/learners';
import { progressFor, selectedOwner } from '../src/state/challengeDrafts';
import { completion, packedOpen } from '../src/cove/catalog';
import { registration as registered } from '../src/challenge/registrations/sudoku';
import { LatinBoard } from '../src/puzzles/latin/LatinBoard';
import type { ChallengeCard, ChallengeEntry } from '../src/challenge/types';
import { gridSpec, type LatinBoardProps, type LatinPayload } from '../src/puzzles/latin/registration';
import { decodeGrid } from '../src/puzzles/grid/model';
import { search } from '../src/puzzles/latin/solver';
import type { LatinPuzzle } from '../src/puzzles/latin/core';
import { GridPreferences } from '../src/puzzles/grid/preferences';
import { defaults, type Mistakes } from '../src/cove/local';
vi.mock('../src/atmosphere/AtmosphereHeader', () => ({ AtmosphereHeader: () => null }));
vi.mock('../src/atmosphere/GlobalWeatherLayer', () => ({ GlobalWeatherLayer: () => null, AtmosphereSky: () => null }));


const db = vi.hoisted(() => ({ raw: null as string | null, rows: [] as string[], play: vi.fn() }));
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (raw: string) => { db.raw = raw; }, preserve: async () => {}, writeDraft: async (raw: string) => { db.rows.push(raw); }, readDrafts: async () => db.rows, discardSession: async () => {} } }));
vi.mock('../src/puzzles/bankAssets', async () => { const { readFileSync } = await import('node:fs'); return { bankTransport: { read: async (name: string) => readFileSync(`src/content/puzzles/assets/${name}.lipuzzle`, 'utf8') } }; });
vi.mock('react-native', () => ({ AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener: () => ({ remove() {} }) }, ScrollView: 'section', View: 'div', TextInput: 'input', Pressable: 'button', Platform: { OS: 'ios' }, useWindowDimensions: () => ({ width: 393, height: 852 }), PanResponder: { create: (handlers: unknown) => ({ panHandlers: handlers }) }, AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('react-native-reanimated', async () => { const { useRef } = await import('react'); return { default: { View: 'animated' }, useAnimatedStyle: (fn: () => unknown) => fn(), useSharedValue: (value: number) => useRef({ value, get() { return this.value; }, set(n: number) { this.value = n; } }).current }; });
vi.mock('react-native-svg', () => ({ default: 'svg', Path: 'path' }));
vi.mock('expo-router', () => ({ useIsFocused: () => true, router: {} }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Chip: 'button', Copy: 'p', Heading: 'h2', C: {}, styles: {} }));
vi.mock('../src/ui', async () => (await import('./helpers/cove-ui')).ui);
vi.mock('../src/personalization/Portrait', () => ({ Portrait: () => null }));
vi.mock('../src/cove/CoveArt', async () => (await import('./helpers/cove-ui')).art);
vi.mock('../src/components/Text', () => ({ Text: 'span' }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play: db.play }) }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));

// The registration lazily requires its board on device; here the same props render it directly.
const registration: ChallengeEntry = { ...registered, render: (session, dispatch, active, width, host) => { const el = registered.render(session, dispatch, active, width, host) as React.ReactElement<LatinBoardProps> | null; return el ? <LatinBoard {...el.props}/> : null; } };
let store: ReturnType<typeof useStore>;
function Probe() { const s = useStore(); useLayoutEffect(() => { store = s; }, [s]); return null; }
const settle = () => act(async () => { for (let i = 0; i < 8; i++) await new Promise(r => setTimeout(r, 0)); });
const waitFor = async (done: () => boolean) => { for (let i = 0; i < 300 && !done(); i++) await settle(); expect(done()).toBe(true); };
const text = (screen: ReactTestRenderer) => JSON.stringify(screen.toJSON());
const button = (screen: ReactTestRenderer, match: (n: { children: unknown[]; props: Record<string, unknown> }) => boolean) => screen.root.findAllByType('button').find(n => match(n as never));
const press = async (screen: ReactTestRenderer, label: string) => act(async () => { const b = button(screen, n => n.children.filter(c => typeof c === 'string').join('') === label || n.props.label === label || n.props.accessibilityLabel === label); expect(b, label).toBeDefined(); await (b!.props.onPress as () => unknown)(); });
const cellButton = (screen: ReactTestRenderer, i: number) => screen.root.findAllByType('button').filter(b => typeof b.props.accessibilityLabel === 'string' && b.props.accessibilityLabel.startsWith('Row '))[i];
const paused = () => progressFor(store.save, selectedOwner(store.save))!.paused.find(s => s.game === 'sudoku')!;
const boardOf = (p: LatinPuzzle) => decodeGrid((paused().payload as LatinPayload).board, gridSpec(p))!;
function Round({ card, partner = null }: { card: ChallengeCard; partner?: string | null }) { const s = useStore(); return s.ready ? <CoveRound key={`${selectedOwner(s.save)}:${s.epoch}`} entry={registration} card={card} partner={partner} width={353} onBrowse={() => {}} onClose={() => {}}/> : null; }
/** The Puzzles screen's live Mistakes choice, changeable mid-round the way More changes it. */
let setPolicy!: (m: Mistakes) => void;
function Policy({ children }: { children: React.ReactNode }) { const [mistakes, set] = useState<Mistakes>('Friendly'); useLayoutEffect(() => { setPolicy = set; }, [set]); return <GridPreferences.Provider value={{ ...defaults(), mistakes }}>{children}</GridPreferences.Provider>; }
const audit = () => (paused().payload as LatinPayload).audit;
const helps = () => audit().filter(a => a[0] === 'help').reduce((n, a) => n + a[1], 0);
const conflicted = (screen: ReactTestRenderer) => screen.root.findAllByType('button').filter(b => typeof b.props.accessibilityLabel === 'string' && b.props.accessibilityLabel.startsWith('Row ') && b.props.accessibilityLabel.includes(', conflict')).length;
const puzzleOf = () => (registered.render(paused(), () => {}, false, 353) as React.ReactElement<LatinBoardProps>).props.view.puzzle;

beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); db.rows = []; db.play.mockClear(); registerSaveContent(registered.catalog, catalogManifest(registered.catalog)); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('Sudoku in the Cove, through the real Store and packed bank', () => {
  it('G3-01/02: opens a packed puzzle, places, undoes, takes notes, asks for help and resumes the exact board', async () => {
    db.raw = JSON.stringify({ ...emptySave(), learning: addLearner(undefined, 'A', 'a') });
    const ref = await packedOpen(registered)!.open!(40, 3), card = registered.packed!.card(ref)!;
    let screen!: ReactTestRenderer;
    try {
      await act(async () => { screen = create(<StoreProvider><Probe/><Round card={card}/></StoreProvider>); });
      await waitFor(() => !!progressFor(store.save, 'a')?.paused.length && !!cellButton(screen, 0));
      const p = (registered.render(paused(), () => {}, false, 353) as React.ReactElement<LatinBoardProps>).props.view.puzzle;
      const answer = search(p, 1).first!, empty = p.givens.findIndex(v => !v), other = p.givens.findIndex((v, i) => !v && i !== empty);
      await act(async () => { (cellButton(screen, empty).props.onPress as () => void)(); });
      await press(screen, `Enter ${answer[empty]}`);
      expect(boardOf(p).values[empty]).toBe(answer[empty]); expect(db.play).toHaveBeenCalledTimes(1);
      await press(screen, 'Undo'); expect(boardOf(p).values[empty]).toBe(0);
      await press(screen, 'Redo'); expect(boardOf(p).values[empty]).toBe(answer[empty]);
      await act(async () => { (cellButton(screen, other).props.onPress as () => void)(); });
      await press(screen, 'Notes off'); await press(screen, 'Note 1'); await press(screen, 'Note 2');
      expect(boardOf(p).notes[other]).toBe(3);
      await press(screen, 'Hint');
      await waitFor(() => text(screen).includes('Why?'));
      expect(text(screen)).toMatch(/Look/);
      await press(screen, 'Why?');
      const accepted = paused(); expect(accepted.revision).toBeGreaterThan(5);
      await act(async () => { await store.backup(); screen.unmount(); });
      await act(async () => { screen = create(<StoreProvider><Probe/><Round card={card}/></StoreProvider>); });
      await waitFor(() => !!cellButton(screen, 0));
      expect(paused()).toEqual(accepted);
      const resumed = boardOf(p);
      expect(resumed.values[empty]).toBe(answer[empty]); expect(resumed.notes[other]).toBe(3); expect(resumed.selected).toBe(other); expect(resumed.pencil).toBe(true); expect(resumed.undo.length).toBeGreaterThanOrEqual(3);
    } finally { if (screen) await act(async () => screen.unmount()); }
  });
  it('G3-03/06: a solo finish with nobody else to credit saves at once, keeps the solved grid, and survives relaunch', async () => {
    db.raw = JSON.stringify(emptySave());
    const ref = await packedOpen(registered)!.open!(40, 0), card = registered.packed!.card(ref)!;
    let screen!: ReactTestRenderer;
    try {
      await act(async () => { screen = create(<StoreProvider><Probe/><Round card={card}/></StoreProvider>); });
      await waitFor(() => !!cellButton(screen, 0));
      for (let i = 0; i < 20 && !text(screen).includes('Puzzle solved'); i++) {
        await press(screen, 'Hint');
        await waitFor(() => !!button(screen, n => n.children.includes('Show me')));
        await press(screen, 'Show me');
        await settle();
      }
      expect(text(screen)).toContain('Puzzle solved');
      expect(text(screen)).not.toContain('Keep this finish');
      expect(progressFor(store.save, 'family')!.paused).toEqual([]);
      const code = completion(progressFor(store.save, 'family')!, ref, registration);
      expect(code).toBeGreaterThanOrEqual(2);
      // The finished grid stays on screen, read-only.
      expect(cellButton(screen, 0)).toBeDefined();
      await act(async () => { await store.backup(); screen.unmount(); });
      await act(async () => { screen = create(<StoreProvider><Probe/></StoreProvider>); });
      await settle();
      expect(completion(progressFor(store.save, 'family')!, ref, registration)).toBe(code);
    } finally { if (screen) await act(async () => screen.unmount()); }
  });
});

describe('Sudoku in a Puzzles round: one staged Hint, one Undo, live Mistakes and a true Restart', () => {
  it('HUD Hint on a blank and on an edited board only opens Look; Undo undoes; the help evidence stays', async () => {
    db.raw = JSON.stringify({ ...emptySave(), learning: addLearner(undefined, 'A', 'a') });
    const ref = await packedOpen(registered)!.open!(40, 3), card = registered.packed!.card(ref)!;
    let screen!: ReactTestRenderer;
    try {
      await act(async () => { screen = create(<StoreProvider><Probe/><Round card={card}/></StoreProvider>); });
      await waitFor(() => !!progressFor(store.save, 'a')?.paused.length && !!cellButton(screen, 0));
      const p = puzzleOf(), blank = boardOf(p).values;
      // The board's own Hint and Undo are not repeated under it.
      expect(button(screen, n => n.props.label === 'Hint: where should I look?')).toBeUndefined();
      expect(screen.root.findAllByType('button').filter(b => b.props.testID === 'hud-undo' || b.children.includes('Undo'))).toHaveLength(1);
      await press(screen, 'Hint');
      await waitFor(() => text(screen).includes('Why?'));
      expect(boardOf(p).values).toEqual(blank); expect(helps()).toBe(1);
      // An edited board, with one right and one wrong entry: Hint still changes nothing.
      const answer = search(p, 1).first!, [a, b] = p.givens.flatMap((v, i) => v ? [] : [i]);
      await act(async () => { (cellButton(screen, a).props.onPress as () => void)(); });
      await press(screen, `Enter ${answer[a]}`);
      await act(async () => { (cellButton(screen, b).props.onPress as () => void)(); });
      await press(screen, `Enter ${answer[b] % p.size + 1}`);
      const edited = boardOf(p).values;
      await press(screen, 'Hint');
      await waitFor(() => text(screen).includes('Why?'));
      expect(boardOf(p).values).toEqual(edited); expect(helps()).toBe(2);
      await press(screen, 'Undo');
      await waitFor(() => boardOf(p).values[b] === 0);
      expect(boardOf(p).values[a]).toBe(answer[a]);
      // Undo never erases the record that help was used: a finish here is a helped one.
      expect(helps()).toBe(2); expect(registered.completionFacts!(paused())).toEqual({ helpUsed: true, failed: false });
    } finally { if (screen) await act(async () => screen.unmount()); }
  });
  it('switching Mistakes mid-round updates the mounted board: Friendly marks, Check when I ask checks on request, Rewind offers a step back', async () => {
    db.raw = JSON.stringify({ ...emptySave(), learning: addLearner(undefined, 'A', 'a') });
    const ref = await packedOpen(registered)!.open!(40, 3), card = registered.packed!.card(ref)!;
    let screen!: ReactTestRenderer;
    try {
      await act(async () => { screen = create(<StoreProvider><Probe/><Policy><Round card={card}/></Policy></StoreProvider>); });
      await waitFor(() => !!progressFor(store.save, 'a')?.paused.length && !!cellButton(screen, 0));
      const p = puzzleOf(), n = p.size, empty = p.givens.findIndex(v => !v), row = Math.floor(empty / n);
      const clash = p.givens.slice(row * n, row * n + n).find(Boolean)!, id = paused().id;
      await act(async () => { (cellButton(screen, empty).props.onPress as () => void)(); });
      await press(screen, `Enter ${clash}`);
      await waitFor(() => boardOf(p).values[empty] === clash);
      expect(conflicted(screen)).toBeGreaterThan(0);
      expect(button(screen, n => n.props.label === 'Check for clashes')).toBeUndefined();
      await act(async () => setPolicy('Plain'));
      expect(conflicted(screen)).toBe(0);
      await press(screen, 'Check for clashes');
      expect(conflicted(screen)).toBeGreaterThan(0);
      expect(text(screen)).toMatch(/squares? clash.*They are marked/);
      // A check lasts until the next change.
      await press(screen, 'Undo'); await waitFor(() => boardOf(p).values[empty] === 0);
      await press(screen, `Enter ${clash}`); await waitFor(() => boardOf(p).values[empty] === clash);
      expect(conflicted(screen)).toBe(0);
      await act(async () => setPolicy('Rewind'));
      expect(conflicted(screen)).toBe(0); expect(text(screen)).toContain('Rewind one step');
      expect(button(screen, n => n.props.label === 'Check for clashes')).toBeUndefined();
      await act(async () => setPolicy('Friendly'));
      expect(conflicted(screen)).toBeGreaterThan(0); expect(text(screen)).not.toContain('Rewind one step');
      // One persisted round throughout.
      expect(paused().id).toBe(id);
    } finally { if (screen) await act(async () => screen.unmount()); }
  });
  it('More → Restart this puzzle resets this attempt: same id, ordinal and partner, the help record kept', async () => {
    db.raw = JSON.stringify({ ...emptySave(), learning: addLearner(undefined, 'A', 'a') });
    const ref = await packedOpen(registered)!.open!(40, 3), card = registered.packed!.card(ref)!;
    let screen!: ReactTestRenderer;
    try {
      await act(async () => { screen = create(<StoreProvider><Probe/><Round card={card} partner="family"/></StoreProvider>); });
      await waitFor(() => !!progressFor(store.save, 'a')?.paused.length && !!cellButton(screen, 0));
      const p = puzzleOf(), answer = search(p, 1).first!, cell = p.givens.findIndex(v => !v);
      await press(screen, 'Hint'); await waitFor(() => helps() === 1);
      await act(async () => { (cellButton(screen, cell).props.onPress as () => void)(); });
      await press(screen, `Enter ${answer[cell]}`); await waitFor(() => boardOf(p).values[cell] === answer[cell]);
      const before = paused();
      expect(before.partner).toBe('family');
      await press(screen, 'More'); await press(screen, 'Restart this puzzle'); await press(screen, 'Restart');
      await waitFor(() => boardOf(p).values[cell] === 0);
      const after = paused();
      expect({ id: after.id, ordinal: after.ordinal, partner: after.partner, puzzle: after.puzzle, selectedDares: after.selectedDares }).toEqual({ id: before.id, ordinal: before.ordinal, partner: 'family', puzzle: before.puzzle, selectedDares: before.selectedDares });
      expect(boardOf(p).values).toEqual([...p.givens]);
      expect(audit()).toEqual([['help', 1], ['reset', 1]]);
      expect(registered.completionFacts!(after)).toEqual({ helpUsed: true, failed: false });
    } finally { if (screen) await act(async () => screen.unmount()); }
  });
});
