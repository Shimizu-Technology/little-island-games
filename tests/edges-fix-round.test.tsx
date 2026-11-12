import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoveRound } from '../src/cove/CoveRound';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptyChallenge, registerSaveContent } from '../src/state/challenge';
import { catalogManifest } from '../src/state/catalogManifest';
import { emptySave } from '../src/state/validation';
import { progressFor } from '../src/state/challengeDrafts';
import { resumeMessage } from '../src/state/sessionContent';
import { packedOpen } from '../src/cove/catalog';
import { GridInteraction } from '../src/puzzles/grid/preferences';
import { registration as bridgesRegistered } from '../src/challenge/registrations/bridges';
import { registration as loopRegistered } from '../src/challenge/registrations/loop';
import { registration as pearlRegistered } from '../src/challenge/registrations/pearl-loop';
import { BridgesBoard } from '../src/puzzles/edges/BridgesBoard';
import { LineBoard } from '../src/puzzles/lines/LineBoard';
import type { ChallengeCard, ChallengeEntry } from '../src/challenge/types';
import { decodeMarks, encodeHistory, freshPayload, stepMarks, type MarkEvent, type MarksPayload } from '../src/puzzles/edges/marks';
import { shapeOf, type BridgesPuzzle } from '../src/puzzles/edges/core';
import { bridgesRules } from '../src/puzzles/edges/teach';
import { lineRules } from '../src/puzzles/lines/teach';
import { latticeOf, type LinePuzzle } from '../src/puzzles/lines/core';
import { bankLoader } from '../src/puzzles/catalog';
import { bridgesAdapter } from '../src/puzzles/edges/adapter';
import { lineAdapter } from '../src/puzzles/lines/adapter';
import { createRng } from '../src/puzzles/rng';
import facts from '../src/puzzles/edges/packs.generated.json';
import type { BankFacts, EdgeBoardProps } from '../src/puzzles/edges/registration';
import { finger, type PanHandlers } from './helpers/native-pan';

const db = vi.hoisted(() => ({ raw: null as string | null, rows: [] as string[], discarded: [] as string[], play: vi.fn(), feel: vi.fn(), held: [] as boolean[] }));
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (raw: string) => { db.raw = raw; }, preserve: async () => {}, writeDraft: async (raw: string) => { db.rows.push(raw); }, readDrafts: async () => db.rows, discardSession: async (raw: string) => { db.discarded.push(raw); } } }));
vi.mock('../src/puzzles/bankAssets', async () => { const { readFileSync } = await import('node:fs'); return { bankTransport: { read: async (name: string) => readFileSync(`src/content/puzzles/assets/${name}.lipuzzle`, 'utf8') } }; });
// React Native's own PanResponder, so release sees exactly the gesture state the device gives it.
vi.mock('react-native', async () => { const { realPanResponder } = await import('./helpers/native-pan'); return { AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener: () => ({ remove() {} }) }, ScrollView: 'section', View: 'div', TextInput: 'input', Pressable: 'button', Platform: { OS: 'ios' }, useWindowDimensions: () => ({ width: 393, height: 852 }), PanResponder: realPanResponder(), AppState: { addEventListener: () => ({ remove() {} }) } }; });
vi.mock('react-native-svg', () => ({ default: 'svg', Circle: 'circle', G: 'g', Line: 'line', Rect: 'rect', Text: 'text', Path: 'path' }));
vi.mock('expo-router', () => ({ useIsFocused: () => true, router: {} }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Chip: 'button', Copy: 'p', Heading: 'h2', C: {}, styles: {} }));
vi.mock('../src/components/Text', () => ({ Text: 'span' }));
vi.mock('../src/components/feel', () => ({ feel: db.feel }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play: db.play }) }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));

const direct = (entry: ChallengeEntry, Board: React.ComponentType<EdgeBoardProps<never>>): ChallengeEntry => ({ ...entry, render: (session, dispatch, active, width, host) => { const el = entry.render(session, dispatch, active, width, host) as React.ReactElement<EdgeBoardProps<never>> | null; return el ? <Board {...el.props}/> : null; } });
const bridges = direct(bridgesRegistered, BridgesBoard as never), loop = direct(loopRegistered, LineBoard as never), pearl = direct(pearlRegistered, LineBoard as never);
let store: ReturnType<typeof useStore>;
function Probe() { const s = useStore(); useLayoutEffect(() => { store = s; }, [s]); return null; }
const settle = () => act(async () => { for (let i = 0; i < 8; i++) await new Promise(r => setTimeout(r, 0)); });
const waitFor = async (done: () => boolean) => { for (let i = 0; i < 300 && !done(); i++) await settle(); expect(done()).toBe(true); };
const text = (screen: ReactTestRenderer) => JSON.stringify(screen.toJSON());
const button = (screen: ReactTestRenderer, label: string) => screen.root.findAllByType('button').find(n => (n.children as unknown[]).filter(c => typeof c === 'string').join('') === label || n.props.label === label);
const press = async (screen: ReactTestRenderer, label: string) => act(async () => { const b = button(screen, label); expect(b, label).toBeDefined(); await (b!.props.onPress as () => unknown)(); });
const surface = (screen: ReactTestRenderer) => screen.root.findAll(n => typeof n.props.onResponderGrant === 'function')[0];
const handlers = (screen: ReactTestRenderer) => surface(screen).props as PanHandlers;
/** A finger: down at the first point, MOVE samples through the rest, let go at `up`. */
const stroke = async (screen: ReactTestRenderer, down: [number, number], moves: [number, number][], up: [number, number]) => act(async () => {
  const f = finger(handlers(screen));
  f.down(...down); for (const m of moves) f.move(...m); f.up(...up);
});
/** MOVE samples every `step` points along a straight line, not including either end. */
const along = (a: [number, number], b: [number, number], step = 10): [number, number][] => {
  const n = Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / step);
  return Array.from({ length: Math.max(0, n - 1) }, (_, i) => [a[0] + (b[0] - a[0]) * (i + 1) / n, a[1] + (b[1] - a[1]) * (i + 1) / n]);
};
const paused = (game: string) => progressFor(store.save, 'family')!.paused.find(s => s.game === game);
const marksOf = (game: string) => (paused(game)!.payload as MarksPayload).marks;
function Round({ entry, card }: { entry: ChallengeEntry; card: ChallengeCard }) { const s = useStore(); return s.ready ? <GridInteraction.Provider value={held => { db.held.push(held); }}><CoveRound key={s.epoch} entry={entry} card={card} partner={null} width={353} onBrowse={() => {}} onClose={() => {}}/></GridInteraction.Provider> : null; }
async function open(entry: ChallengeEntry, registered: ChallengeEntry, bank: number, index: number) {
  const ref = await packedOpen(registered)!.open!(bank, index), card = registered.packed!.card(ref)!;
  let screen!: ReactTestRenderer;
  await act(async () => { screen = create(<StoreProvider><Probe/><Round entry={entry} card={card}/></StoreProvider>); });
  await waitFor(() => !!paused(registered.game) && !!surface(screen));
  return screen;
}
const puzzleOf = <P,>(registered: ChallengeEntry) => (registered.render(paused(registered.game)!, () => {}, false, 353) as React.ReactElement<EdgeBoardProps<P>>).props.view.puzzle;
const firstOf = (family: string, slot: number) => (facts as Record<string, BankFacts[]>)[family].find(b => b.slot === slot)!;

beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); db.rows = []; db.discarded = []; db.held = []; db.play.mockClear(); db.feel.mockClear(); for (const r of [bridgesRegistered, loopRegistered, pearlRegistered]) registerSaveContent(r.catalog, catalogManifest(r.catalog)); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('R1: a stroke ends where the finger lets go (React Native’s release keeps the last MOVE)', () => {
  const lineGeometry = (p: LinePuzzle) => { const cell = Math.max(22, Math.floor(Math.min(353 / (p.cols + 0.64), Math.max(300, 852 * 0.6) / (p.rows + 0.64)))), pad = Math.round(cell * 0.32), span = p.kind === 'pearl-loop' ? 0.5 : 0; return { cell, dot: (c: number, r: number): [number, number] => [pad + (c + span) * cell, pad + (r + span) * cell] }; };
  for (const [name, entry, registered, slot] of [['Loop', loop, loopRegistered, 67], ['Pearl Loop', pearl, pearlRegistered, 74]] as const) {
    it(`${name}: the last MOVE at 2.2 dots, let go at the third dot, draws all three edges`, async () => {
      db.raw = JSON.stringify(emptySave());
      const screen = await open(entry, registered, slot, 0);
      try {
        const { cell, dot } = lineGeometry(puzzleOf<LinePuzzle>(registered)), start = dot(0, 0), short: [number, number] = [start[0] + cell * 2.2, start[1]];
        await stroke(screen, start, [...along(start, short), short], dot(3, 0));
        await waitFor(() => marksOf(registered.game).slice(0, 3) === '111');
        expect((paused(registered.game)!.payload as MarksPayload).undo.split(';').length).toBe(1);
      } finally { await act(async () => screen.unmount()); }
    });
    it(`${name}: a one-edge drag whose only MOVE sample stays near the first dot still draws its edge`, async () => {
      db.raw = JSON.stringify(emptySave());
      const screen = await open(entry, registered, slot, 0);
      try {
        // Downward from an inner dot: a tap there would pick a different edge, so only the drag can draw this one.
        const p = puzzleOf<LinePuzzle>(registered), l = latticeOf(p), { cell, dot } = lineGeometry(p), start = dot(1, 1), v = l.vc + 1, e = l.edges.findIndex(([a, b]) => a === v && b === v + l.vc);
        await stroke(screen, start, [[start[0], start[1] + cell * 0.25]], dot(1, 2));
        await waitFor(() => marksOf(registered.game)[e] === '1');
        expect([...marksOf(registered.game)].filter(m => m !== '0').length).toBe(1);
      } finally { await act(async () => screen.unmount()); }
    });
    // Review round 2, Q2-1: the release lands back inside the first dot's tap zone, but the stroke had already started.
    it(`${name}: out to the next dot and let go back on the first dot rubs the edge out, saving nothing`, async () => {
      db.raw = JSON.stringify(emptySave());
      const screen = await open(entry, registered, slot, 0);
      try {
        const { cell, dot } = lineGeometry(puzzleOf<LinePuzzle>(registered)), start = dot(0, 0), before = paused(registered.game);
        await stroke(screen, start, [dot(1, 0)], start);
        await settle();
        expect(paused(registered.game)).toEqual(before);
        expect(db.play).not.toHaveBeenCalled();
        // The board still takes the next stroke from the same dot.
        await stroke(screen, start, [[start[0] + cell * 0.6, start[1]]], dot(1, 0));
        await waitFor(() => marksOf(registered.game).slice(0, 2) === '10');
      } finally { await act(async () => screen.unmount()); }
    });
    it(`${name}: two dots out, the last MOVE on the way back at the middle dot, let go on the first dot keeps nothing`, async () => {
      db.raw = JSON.stringify(emptySave());
      const screen = await open(entry, registered, slot, 0);
      try {
        const { cell, dot } = lineGeometry(puzzleOf<LinePuzzle>(registered)), start = dot(0, 0), far = dot(2, 0), back: [number, number] = [dot(1, 0)[0] - cell * 0.1, start[1]], before = paused(registered.game);
        await stroke(screen, start, [...along(start, far), far, ...along(far, back), back], [start[0] + cell * 0.1, start[1] + 2]);
        await settle();
        expect(paused(registered.game)).toEqual(before);
      } finally { await act(async () => screen.unmount()); }
    });
    it(`${name}: round one square with the last MOVE on its fourth dot, let go on the first, closes all four sides`, async () => {
      db.raw = JSON.stringify(emptySave());
      const screen = await open(entry, registered, slot, 0);
      try {
        const p = puzzleOf<LinePuzzle>(registered), l = latticeOf(p), { dot } = lineGeometry(p), corners = [dot(0, 0), dot(1, 0), dot(1, 1), dot(0, 1)];
        const moves = corners.flatMap((c, i) => i ? [...along(corners[i - 1], c), c] : []);
        await stroke(screen, corners[0], moves, corners[0]);
        const sides = [[0, 1], [1, l.vc + 1], [l.vc, l.vc + 1], [0, l.vc]].map(([a, b]) => l.edges.findIndex(([x, y]) => x === a && y === b));
        await waitFor(() => sides.every(e => marksOf(registered.game)[e] === '1'));
        expect((paused(registered.game)!.payload as MarksPayload).undo.split(';').length).toBe(1);
      } finally { await act(async () => screen.unmount()); }
    });
  }
  it('Loop: a tap still cycles the nearest edge, and a tiny wobble is still a tap', async () => {
    db.raw = JSON.stringify(emptySave());
    const screen = await open(loop, loopRegistered, 67, 0);
    try {
      const { cell, dot } = lineGeometry(puzzleOf<LinePuzzle>(loopRegistered)), [x, y] = dot(0, 0), mid: [number, number] = [x + cell / 2, y + 3];
      await stroke(screen, mid, [], mid);
      await waitFor(() => marksOf('loop')[0] === '1');
      await stroke(screen, mid, [[mid[0] + 3, mid[1] + 2]], [mid[0] + 4, mid[1] + 2]);
      await waitFor(() => marksOf('loop')[0] === '2');
    } finally { await act(async () => screen.unmount()); }
  });
  it('Bridges: a drag whose last MOVE stays on the island, let go at the neighbour, places the bridge', async () => {
    db.raw = JSON.stringify(emptySave());
    const screen = await open(bridges, bridgesRegistered, 62, 5);
    try {
      const p = puzzleOf<BridgesPuzzle>(bridgesRegistered), { islands, links } = shapeOf(p), cell = Math.floor(Math.min(353 / (p.width + 0.4), Math.max(300, 852 * 0.62) / (p.height + 0.4))), rim = Math.round(cell * 0.2);
      const at = (i: number): [number, number] => [rim + (islands[i].x + 0.5) * cell, rim + (islands[i].y + 0.5) * cell], l = links[0], a = at(l.a), b = at(l.b);
      await stroke(screen, a, [[a[0] + Math.sign(b[0] - a[0]) * cell * 0.3, a[1] + Math.sign(b[1] - a[1]) * cell * 0.3]], b);
      await waitFor(() => marksOf('bridges')[0] === '1');
    } finally { await act(async () => screen.unmount()); }
  });
});

describe('R2: a touch that starts on the water is a tap or nothing, and lets the page scroll', () => {
  async function waterBoard() {
    db.raw = JSON.stringify(emptySave());
    const screen = await open(bridges, bridgesRegistered, 62, 5);
    const p = puzzleOf<BridgesPuzzle>(bridgesRegistered), { islands, links } = shapeOf(p), cell = Math.floor(Math.min(353 / (p.width + 0.4), Math.max(300, 852 * 0.62) / (p.height + 0.4))), rim = Math.round(cell * 0.2);
    // A link at least two squares long, so its middle is open water.
    const e = links.findIndex(l => Math.abs(islands[l.a].x - islands[l.b].x) + Math.abs(islands[l.a].y - islands[l.b].y) >= 2), l = links[e], A = islands[l.a], B = islands[l.b];
    expect(e).toBeGreaterThanOrEqual(0);
    const water: [number, number] = [rim + ((A.x + B.x) / 2 + 0.5) * cell, rim + ((A.y + B.y) / 2 + 0.5) * cell], island: [number, number] = [rim + (A.x + 0.5) * cell, rim + (A.y + 0.5) * cell];
    return { screen, e, water, island };
  }
  it('a 180-point vertical or 120-point sideways swipe from the water leaves the board and save unchanged', async () => {
    const { screen, water } = await waterBoard();
    try {
      const before = paused('bridges');
      const down: [number, number] = [water[0], water[1] + 180], side: [number, number] = [water[0] + 120, water[1]], back: [number, number] = [water[0], water[1] - 180];
      await stroke(screen, water, along(water, down), down);
      await stroke(screen, water, along(water, side), side);
      // Out and back to where it started is a swipe too, not a tap.
      await stroke(screen, water, [...along(water, back), back, ...along(back, water)], water);
      await settle();
      expect(paused('bridges')).toEqual(before);
      expect(db.play).not.toHaveBeenCalled();
    } finally { await act(async () => screen.unmount()); }
  });
  it('a water tap, or a small wobble, still cycles the bridge', async () => {
    const { screen, e, water } = await waterBoard();
    try {
      await stroke(screen, water, [], water);
      await waitFor(() => marksOf('bridges')[e] === '1');
      await stroke(screen, water, [[water[0] + 4, water[1] + 3]], [water[0] + 6, water[1] + 4]);
      await waitFor(() => marksOf('bridges')[e] === '2');
    } finally { await act(async () => screen.unmount()); }
  });
  it('a water touch does not hold the page and gives itself up to the scroll view; an island drag keeps both', async () => {
    const { screen, water, island } = await waterBoard();
    try {
      const before = paused('bridges');
      let f!: ReturnType<typeof finger>, given = false;
      await act(async () => { db.held = []; f = finger(handlers(screen)); f.down(...water); f.move(water[0], water[1] + 12); given = f.request(water[0], water[1] + 12); });
      expect(db.held).not.toContain(true);
      expect(given).toBe(true);
      await act(async () => { f.up(water[0], water[1] + 12); });
      await settle();
      expect(paused('bridges')).toEqual(before);
      await act(async () => { db.held = []; f = finger(handlers(screen)); f.down(...island); given = f.request(...island); f.up(...island); });
      expect(db.held[0]).toBe(true);
      expect(given).toBe(false);
    } finally { await act(async () => screen.unmount()); }
  });
});

describe('R4: saved undo and redo must agree with the saved marks', () => {
  const loopPuzzle = async () => (await bankLoader().entry(lineAdapter('loop'), 'loop', firstOf('loop', 67).first)).payload as LinePuzzle;
  it('rejects the review’s payload: an empty board whose undo says edge 0 is a line', async () => {
    const p = await loopPuzzle(), base = freshPayload(p, lineRules);
    expect(decodeMarks({ ...base, edits: 4, undo: '0.21' }, p, lineRules)).toBeNull();
    // Undo on such a payload must never put a cross on the empty board.
    expect(stepMarks(p, lineRules, { ...base, edits: 4, undo: '0.21' }, { type: 'undo' })).toBeNull();
    // A redo that starts from a mark the board doesn’t have.
    expect(decodeMarks({ ...base, edits: 4, redo: '0.12' }, p, lineRules)).toBeNull();
    // Older strokes are checked too, in order: the second-newest says edge 1 is a cross, but the board shows a line.
    expect(decodeMarks({ ...base, marks: `11${base.marks.slice(2)}`, edits: 2, undo: '1.02;0.01' }, p, lineRules)).toBeNull();
    expect(decodeMarks({ ...base, marks: `11${base.marks.slice(2)}`, edits: 2, undo: '1.01;0.01' }, p, lineRules)).not.toBeNull();
  });
  it('rejects a Bridges history whose undo would bring back a crossing', async () => {
    const first = firstOf('bridges', 64).first;
    let hit: { p: BridgesPuzzle; a: number; b: number } | null = null;
    for (let i = 0; i < 60 && !hit; i++) { const p = (await bankLoader().entry(bridgesAdapter(), 'bridges', first + i)).payload as BridgesPuzzle, c = shapeOf(p).crosses.findIndex(x => x.length > 0); if (c >= 0) hit = { p, a: c, b: shapeOf(p).crosses[c][0] }; }
    const { p, a, b } = hit!, marks = '0'.repeat(bridgesRules.places(p)).split('');
    marks[a] = '1';
    // Bridge a is down now; the history says b was taken away before it, so undo would restore b across a.
    const payload = { ...freshPayload(p, bridgesRules), marks: marks.join(''), edits: 2, undo: encodeHistory([[[b, 1, 0]]]) };
    expect(decodeMarks(payload, p, bridgesRules)).toBeNull();
  });
  it('accepts every history real play makes: strokes, undo, redo, hints, reset and trimming', async () => {
    const p = await loopPuzzle(), q = (await bankLoader().entry(bridgesAdapter(), 'bridges', firstOf('bridges', 63).first)).payload as BridgesPuzzle;
    for (const [puzzle, rules] of [[p, lineRules], [q, bridgesRules]] as const) {
      const rng = createRng(7), n = rules.places(puzzle as never);
      let payload = freshPayload(puzzle as never, rules as never) as MarksPayload;
      for (let k = 0; k < 900; k++) {
        const roll = rng.below(20);
        const event: MarkEvent = roll < 3 ? { type: 'undo' } : roll < 5 ? { type: 'redo' } : roll === 5 ? { type: 'hint' } : roll === 6 && k % 50 === 0 ? { type: 'reset' }
          : { type: 'set', changes: Array.from({ length: 1 + rng.below(4) }, () => [rng.below(n), rng.below(rules.max + 1)] as const) };
        const next = stepMarks(puzzle as never, rules as never, payload, event);
        expect(next, `step ${k}`).not.toBeNull();
        payload = next!;
        expect(decodeMarks(payload, puzzle as never, rules as never), `step ${k}`).not.toBeNull();
      }
      // Long play trims old strokes away; the retained suffix still agrees.
      expect(payload.undo.length + payload.redo.length).toBeGreaterThan(0);
    }
  });
  it('a saved round with an impossible history is not opened; it can be set aside and started fresh', async () => {
    db.raw = JSON.stringify(emptySave());
    let screen = await open(loop, loopRegistered, 67, 0);
    const slot = paused('loop')!;
    await act(async () => { await store.backup(); screen.unmount(); });
    // Edit the stored save as a damaged restore would: an empty board with a history that claims a line.
    const save = JSON.parse(db.raw!), rows = JSON.stringify(save).includes('"edges-loop-1"');
    expect(rows).toBe(true);
    const walk = (x: unknown): void => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { const o = x as Record<string, unknown>; if (o.id === slot.id && o.game === 'loop') o.payload = { ...(o.payload as object), edits: 4, undo: '0.21' }; else Object.values(o).forEach(walk); } };
    walk(save); db.raw = JSON.stringify(save); db.rows = [];
    const ref = slot.puzzle, card = loopRegistered.packed!.card(ref)!;
    await act(async () => { screen = create(<StoreProvider><Probe/><Round entry={loop} card={card}/></StoreProvider>); });
    try {
      await waitFor(() => text(screen).includes(resumeMessage));
      expect(surface(screen)).toBeUndefined();
      expect(button(screen, 'Undo')).toBeUndefined();
      await press(screen, 'Start this puzzle fresh');
      await waitFor(() => db.discarded.length === 1);
      // The damaged round is kept in recovery storage exactly as it was saved.
      expect((JSON.parse(db.discarded[0]).payload as MarksPayload).undo).toBe('0.21');
    } finally { await act(async () => screen.unmount()); }
  });
});

describe('Hide (G3 R5 plumbing) works for the edge games too', () => {
  it('a hidden Loop puzzle is found by hash, counted, and never dealt while others remain', async () => {
    const { dealPacked, hiddenPackedCount } = await import('../src/cove/catalog');
    const first = await packedOpen(loopRegistered)!.open!(67, 0), progress = emptyChallenge();
    expect([...await packedOpen(loopRegistered)!.hiddenRows!(67, [first.hash])]).toEqual([0]);
    expect(await hiddenPackedCount(loopRegistered, [first.hash])).toBe(1);
    expect((await dealPacked(loopRegistered, 67, progress, [first.hash]))!.ref.puzzle).toBe(1);
    expect((await dealPacked(loopRegistered, 67, progress, []))!.ref.puzzle).toBe(0);
  });
});
