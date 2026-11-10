import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoveRound } from '../src/cove/CoveRound';
import { StoreProvider, useStore } from '../src/state/Store';
import { registerSaveContent } from '../src/state/challenge';
import { catalogManifest } from '../src/state/catalogManifest';
import { emptySave } from '../src/state/validation';
import { progressFor } from '../src/state/challengeDrafts';
import { completion, packedOpen } from '../src/cove/catalog';
import { registration as bridgesRegistered } from '../src/challenge/registrations/bridges';
import { registration as loopRegistered } from '../src/challenge/registrations/loop';
import { BridgesBoard } from '../src/puzzles/edges/BridgesBoard';
import { LineBoard } from '../src/puzzles/lines/LineBoard';
import type { ChallengeCard, ChallengeEntry } from '../src/challenge/types';
import type { MarksPayload } from '../src/puzzles/edges/marks';
import { shapeOf, type BridgesPuzzle } from '../src/puzzles/edges/core';
import { solutionOf } from '../src/puzzles/edges/solver';
import { latticeOf, type LinePuzzle } from '../src/puzzles/lines/core';
import { bankLoader } from '../src/puzzles/catalog';
import { bridgesAdapter } from '../src/puzzles/edges/adapter';
import facts from '../src/puzzles/edges/packs.generated.json';
import type { BankFacts, EdgeBoardProps } from '../src/puzzles/edges/registration';

const db = vi.hoisted(() => ({ raw: null as string | null, rows: [] as string[], play: vi.fn(), feel: vi.fn() }));
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (raw: string) => { db.raw = raw; }, preserve: async () => {}, writeDraft: async (raw: string) => { db.rows.push(raw); }, readDrafts: async () => db.rows, discardSession: async () => {} } }));
vi.mock('../src/puzzles/bankAssets', async () => { const { readFileSync } = await import('node:fs'); return { bankTransport: { read: async (name: string) => readFileSync(`src/content/puzzles/assets/${name}.lipuzzle`, 'utf8') } }; });
vi.mock('react-native', () => ({ AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener: () => ({ remove() {} }) }, ScrollView: 'section', View: 'div', TextInput: 'input', Pressable: 'button', Platform: { OS: 'ios' }, useWindowDimensions: () => ({ width: 393, height: 852 }), PanResponder: { create: (handlers: unknown) => ({ panHandlers: handlers }) }, AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('react-native-svg', () => ({ default: 'svg', Circle: 'circle', G: 'g', Line: 'line', Rect: 'rect', Text: 'text', Path: 'path' }));
vi.mock('expo-router', () => ({ useIsFocused: () => true, router: {} }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Chip: 'button', Copy: 'p', Heading: 'h2', C: {}, styles: {} }));
vi.mock('../src/components/Text', () => ({ Text: 'span' }));
vi.mock('../src/components/feel', () => ({ feel: db.feel }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play: db.play }) }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));

// Registrations lazily require their boards on device; here the same props render them directly.
const direct = (entry: ChallengeEntry, Board: React.ComponentType<EdgeBoardProps<never>>): ChallengeEntry => ({ ...entry, render: (session, dispatch, active, width, host) => { const el = entry.render(session, dispatch, active, width, host) as React.ReactElement<EdgeBoardProps<never>> | null; return el ? <Board {...el.props}/> : null; } });
const bridges = direct(bridgesRegistered, BridgesBoard as never), loop = direct(loopRegistered, LineBoard as never);
let store: ReturnType<typeof useStore>;
function Probe() { const s = useStore(); useLayoutEffect(() => { store = s; }, [s]); return null; }
const settle = () => act(async () => { for (let i = 0; i < 8; i++) await new Promise(r => setTimeout(r, 0)); });
const waitFor = async (done: () => boolean) => { for (let i = 0; i < 300 && !done(); i++) await settle(); expect(done()).toBe(true); };
const text = (screen: ReactTestRenderer) => JSON.stringify(screen.toJSON());
const button = (screen: ReactTestRenderer, label: string) => screen.root.findAllByType('button').find(n => (n.children as unknown[]).filter(c => typeof c === 'string').join('') === label || n.props.label === label);
const press = async (screen: ReactTestRenderer, label: string) => act(async () => { const b = button(screen, label); expect(b, label).toBeDefined(); await (b!.props.onPress as () => unknown)(); });
const surface = (screen: ReactTestRenderer) => screen.root.findAll(n => typeof n.props.onPanResponderGrant === 'function')[0];
/** A touch on the board: down at (x, y), moved by (dx, dy), let go. */
const gesture = async (screen: ReactTestRenderer, x: number, y: number, dx = 0, dy = 0) => act(async () => {
  const h = surface(screen).props;
  h.onPanResponderGrant({ nativeEvent: { locationX: x, locationY: y } });
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 10));
  for (let i = 1; i <= steps && (dx || dy); i++) h.onPanResponderMove({}, { dx: dx * i / steps, dy: dy * i / steps });
  h.onPanResponderRelease({}, { dx, dy });
});
const paused = (game: string) => progressFor(store.save, 'family')!.paused.find(s => s.game === game)!;
const marksOf = (game: string) => (paused(game).payload as MarksPayload).marks;
function Round({ entry, card }: { entry: ChallengeEntry; card: ChallengeCard }) { const s = useStore(); return s.ready ? <CoveRound key={s.epoch} entry={entry} card={card} partner={null} width={353} onBrowse={() => {}} onClose={() => {}}/> : null; }

beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); db.rows = []; db.play.mockClear(); db.feel.mockClear(); for (const r of [bridgesRegistered, loopRegistered]) registerSaveContent(r.catalog, catalogManifest(r.catalog)); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('Bridges in the Cove, through the real Store and packed bank', () => {
  it('G5-01: drag and tap place bridges, undo and redo, hint, and the exact board resumes', async () => {
    db.raw = JSON.stringify(emptySave());
    const ref = await packedOpen(bridgesRegistered)!.open!(62, 5), card = bridgesRegistered.packed!.card(ref)!;
    let screen!: ReactTestRenderer;
    try {
      await act(async () => { screen = create(<StoreProvider><Probe/><Round entry={bridges} card={card}/></StoreProvider>); });
      await waitFor(() => !!paused('bridges') && !!surface(screen));
      const p = (bridgesRegistered.render(paused('bridges'), () => {}, false, 353) as React.ReactElement<EdgeBoardProps<BridgesPuzzle>>).props.view.puzzle;
      const { islands, links } = shapeOf(p), cell = Math.floor(Math.min(353 / (p.width + 0.4), Math.max(300, 852 * 0.62) / (p.height + 0.4))), rim = Math.round(cell * 0.2), at = (i: number) => [rim + (islands[i].x + 0.5) * cell, rim + (islands[i].y + 0.5) * cell];
      const e = 0, l = links[e], [ax, ay] = at(l.a), [bx, by] = at(l.b);
      // Drag from one island toward its neighbour: one bridge, one sound.
      await gesture(screen, ax, ay, bx - ax, by - ay);
      await waitFor(() => marksOf('bridges')[e] === '1');
      expect(db.play).toHaveBeenCalledTimes(1);
      // Tap the water between them: a second bridge.
      await gesture(screen, (ax + bx) / 2, (ay + by) / 2);
      await waitFor(() => marksOf('bridges')[e] === '2');
      await press(screen, 'Undo');
      await waitFor(() => marksOf('bridges')[e] === '1');
      await press(screen, 'Redo');
      await waitFor(() => marksOf('bridges')[e] === '2');
      // Two taps on islands cycle the same link: two bridges become none.
      await gesture(screen, ax, ay); await gesture(screen, bx, by);
      await waitFor(() => marksOf('bridges')[e] === '0');
      await press(screen, 'Hint: where should I look?');
      await waitFor(() => text(screen).includes('Why?'));
      await press(screen, 'Show me');
      await waitFor(() => /[12]/.test(marksOf('bridges')));
      const accepted = paused('bridges');
      expect((accepted.payload as MarksPayload).audit.some(a => a[0] === 'help')).toBe(true);
      await act(async () => { await store.backup(); screen.unmount(); });
      await act(async () => { screen = create(<StoreProvider><Probe/><Round entry={bridges} card={card}/></StoreProvider>); });
      await waitFor(() => !!surface(screen));
      expect(paused('bridges')).toEqual(accepted);
      expect(solutionOf(p)).not.toBeNull();
    } finally { if (screen) await act(async () => screen.unmount()); }
  });
  it('G5-02: a bridge that would cross another is refused with a message, and the save is unchanged', async () => {
    db.raw = JSON.stringify(emptySave());
    // Find a packed board with two links that cross.
    const first = (facts as Record<string, BankFacts[]>).bridges.find(b => b.slot === 64)!.first;
    let found: { i: number; p: BridgesPuzzle; a: number; b: number } | null = null;
    for (let i = 0; i < 40 && !found; i++) {
      const p = (await bankLoader().entry(bridgesAdapter(), 'bridges', first + i)).payload, c = shapeOf(p).crosses.findIndex(list => list.length > 0);
      if (c >= 0) found = { i, p, a: c, b: shapeOf(p).crosses[c][0] };
    }
    expect(found).not.toBeNull();
    const { p, a, b } = found!, ref = await packedOpen(bridgesRegistered)!.open!(64, found!.i), card = bridgesRegistered.packed!.card(ref)!;
    let screen!: ReactTestRenderer;
    try {
      await act(async () => { screen = create(<StoreProvider><Probe/><Round entry={bridges} card={card}/></StoreProvider>); });
      await waitFor(() => !!paused('bridges') && !!surface(screen));
      const { islands, links } = shapeOf(p), cell = Math.floor(Math.min(353 / (p.width + 0.4), Math.max(300, 852 * 0.62) / (p.height + 0.4))), rim = Math.round(cell * 0.2), mid = (e: number) => { const l = links[e], A = islands[l.a], B = islands[l.b]; return [rim + ((A.x + B.x) / 2 + 0.5) * cell, rim + ((A.y + B.y) / 2 + 0.5) * cell]; };
      const [x1, y1] = mid(a); await gesture(screen, x1, y1);
      await waitFor(() => marksOf('bridges')[a] === '1');
      const before = paused('bridges');
      // Drag from an end island of the crossing link toward its partner.
      const lb = links[b], A = islands[lb.a], B = islands[lb.b];
      await gesture(screen, rim + (A.x + 0.5) * cell, rim + (A.y + 0.5) * cell, (B.x - A.x) * cell, (B.y - A.y) * cell);
      await settle();
      expect(paused('bridges')).toEqual(before);
      expect(text(screen)).toContain('Bridges can’t cross');
      expect(db.feel).toHaveBeenCalledWith('warning');
    } finally { if (screen) await act(async () => screen.unmount()); }
  });
});

describe('Loop in the Cove', () => {
  it('G5-03: one drag along the dots is one stroke and one undo step; a tap cycles line, cross, empty', async () => {
    db.raw = JSON.stringify(emptySave());
    const ref = await packedOpen(loopRegistered)!.open!(67, 2), card = loopRegistered.packed!.card(ref)!;
    let screen!: ReactTestRenderer;
    try {
      await act(async () => { screen = create(<StoreProvider><Probe/><Round entry={loop} card={card}/></StoreProvider>); });
      await waitFor(() => !!paused('loop') && !!surface(screen));
      const p = (loopRegistered.render(paused('loop'), () => {}, false, 353) as React.ReactElement<EdgeBoardProps<LinePuzzle>>).props.view.puzzle, l = latticeOf(p);
      const cell = Math.max(22, Math.floor(Math.min(353 / (p.cols + 0.64), Math.max(300, 852 * 0.6) / (p.rows + 0.64)))), pad = Math.round(cell * 0.32);
      // From the top-left dot, right three dots: three lines.
      await gesture(screen, pad, pad, cell * 3, 0);
      await waitFor(() => marksOf('loop').slice(0, 3) === '111');
      expect((paused('loop').payload as MarksPayload).undo.split(';').length).toBe(1);
      // Back over the same path in a new stroke rubs them out.
      await gesture(screen, pad + cell * 3, pad, -cell * 3, 0);
      await waitFor(() => marksOf('loop').slice(0, 3) === '000');
      await press(screen, 'Undo');
      await waitFor(() => marksOf('loop').slice(0, 3) === '111');
      // A tap on the middle of the first edge: line → cross → empty.
      await gesture(screen, pad + cell / 2, pad + 3);
      await waitFor(() => marksOf('loop')[0] === '2');
      await gesture(screen, pad + cell / 2, pad + 3);
      await waitFor(() => marksOf('loop')[0] === '0');
      expect(l.edges[0]).toEqual([0, 1]);
      // Regression (iOS 18.5 run): the last move sample can stop short of where the finger lets go.
      await press(screen, 'Start over');
      await waitFor(() => /^0+$/.test(marksOf('loop')));
      await act(async () => {
        const h = surface(screen).props;
        h.onPanResponderGrant({ nativeEvent: { locationX: pad, locationY: pad } });
        for (let x = 10; x <= cell * 2.2; x += 10) h.onPanResponderMove({}, { dx: x, dy: 0 });
        h.onPanResponderRelease({}, { dx: cell * 3, dy: 0 });
      });
      await waitFor(() => marksOf('loop').slice(0, 3) === '111');
    } finally { if (screen) await act(async () => screen.unmount()); }
  });
  it('G5-04: hints solve a board; the solo finish saves at once and survives relaunch', async () => {
    db.raw = JSON.stringify(emptySave());
    const ref = await packedOpen(loopRegistered)!.open!(67, 0), card = loopRegistered.packed!.card(ref)!;
    let screen!: ReactTestRenderer;
    try {
      await act(async () => { screen = create(<StoreProvider><Probe/><Round entry={loop} card={card}/></StoreProvider>); });
      await waitFor(() => !!surface(screen));
      for (let i = 0; i < 120 && !text(screen).includes('Puzzle solved'); i++) {
        await press(screen, 'Hint: where should I look?');
        await waitFor(() => !!button(screen, 'Show me') || !!button(screen, 'Fix it for me'));
        await press(screen, button(screen, 'Show me') ? 'Show me' : 'Fix it for me');
        await settle();
      }
      expect(text(screen)).toContain('Puzzle solved');
      expect(progressFor(store.save, 'family')!.paused).toEqual([]);
      const code = completion(progressFor(store.save, 'family')!, ref, loop);
      expect(code).toBeGreaterThanOrEqual(2);
      await act(async () => { await store.backup(); screen.unmount(); });
      await act(async () => { screen = create(<StoreProvider><Probe/></StoreProvider>); });
      await settle();
      expect(completion(progressFor(store.save, 'family')!, ref, loop)).toBe(code);
    } finally { if (screen) await act(async () => screen.unmount()); }
  });
});
