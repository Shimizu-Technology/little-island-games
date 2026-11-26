import React, { createContext, useLayoutEffect } from 'react';
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
function Round({ card }: { card: ChallengeCard }) { const s = useStore(); return s.ready ? <CoveRound key={`${selectedOwner(s.save)}:${s.epoch}`} entry={registration} card={card} partner={null} width={353} onBrowse={() => {}} onClose={() => {}}/> : null; }

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
      await press(screen, 'Hint: where should I look?');
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
        await press(screen, 'Hint: where should I look?');
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
