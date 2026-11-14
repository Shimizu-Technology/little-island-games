/** R0c fix round 1 (P1-2): at accessibility sizes one height budget covers the safe areas, the frame's bar, the status line, the
 * clue gutters and the keys, so a board and its pad's first row share a screen. Verified for every registered Latin family and
 * size, Bridges, Loop and Pearl Loop, on the iPhone 15 and the iPad mini in both orientations; the zoom control follows the keys. */
import React, { createContext } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GridShell } from '../src/puzzles/grid/GridShell';
import { createGrid, gridGeometry, type GridSpec } from '../src/puzzles/grid/model';
import { GridChromeContext, STATUS_LINE, baseBoardHeight, boardRoom, bridgesCell, challengeChrome, edgeBoardHeight, gridViewportMax, loopCell, statusHeight } from '../src/puzzles/grid/budget';
import { statusSentence } from '../src/puzzles/ui/PuzzleStatus';
import { techniqueNames as latinTechniques } from '../src/puzzles/latin/teach';
import { techniqueNames as bridgesTechniques } from '../src/puzzles/edges/teach';
import { techniqueNames as lineTechniques } from '../src/puzzles/lines/teach';
import { latinRungs } from '../src/puzzles/latin/rungs';
import { bridgesRungs } from '../src/puzzles/edges/rungs';
import { loopRungs, pearlRungs } from '../src/puzzles/lines/rungs';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 3.12 }));
vi.mock('react-native', () => ({ AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener: () => ({ remove() {} }) }, View: 'div', TextInput: 'input', Pressable: 'button', Platform: { OS: 'ios' }, useWindowDimensions: () => viewport, PanResponder: { create: (handlers: unknown) => ({ panHandlers: handlers }) } }));
vi.mock('react-native-reanimated', async () => { const { useRef } = await import('react'); return { default: { View: 'animated' }, useAnimatedStyle: (fn: () => unknown) => fn(), useSharedValue: (value: number) => useRef({ value, get() { return this.value; }, set(n: number) { this.value = n; } }).current }; });
vi.mock('react-native-svg', () => ({ default: 'svg', Path: 'path' }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Chip: 'button', Copy: 'p', Heading: 'h2', C: {}, styles: {} }));
vi.mock('../src/components/Text', () => ({ Text: 'span' }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play() {} }) }));

/** The iPhone 15 (393 x 852, safe areas 59 / 34 upright and 0 / 21 turned) and the iPad mini 6 (744 x 1133, 24 / 20 both ways). */
const devices = [
  { name: 'iPhone 15 portrait', width: 393, height: 852, top: 59, bottom: 34, side: 0 }, { name: 'iPhone 15 landscape', width: 852, height: 393, top: 0, bottom: 21, side: 59 },
  { name: 'iPad mini portrait', width: 744, height: 1133, top: 24, bottom: 20, side: 0 }, { name: 'iPad mini landscape', width: 1133, height: 744, top: 24, bottom: 20, side: 0 },
];
const AX5 = 3.12;
/** What the Challenge frame puts around a board on a device (its bar and chip stay above the page unless the window is short). */
const chromeOf = (d: typeof devices[number]) => { const short = d.height < 500; return challengeChrome({ insets: { top: d.top, bottom: d.bottom, left: d.side, right: d.side }, barPinned: !short, short, chip: !short }); };
/** The 14 distinct registered Latin family and size combinations. */
const latinVariants = Object.entries(latinRungs).flatMap(([kind, rungs]) => [...new Set(rungs.map(r => r.size))].map(size => ({ kind, size })));
/**
 * The longest status sentence a registered puzzle shows: the longest title the packs hold with the longest skill name of any family and
 * a count at its widest (digits all share one advance, so the total stands for every count). Round 2 replaces the optimistic 44-pt status floor with this
 * sentence's measured height, wrapped in the safe content width.
 */
const titles = ['Full Cages 144', 'Stepping Stones 100', 'Tide Pool 100', 'Small Cages 100', 'High Town 100', 'Steep 100'];
const skills = [...Object.values(latinTechniques), ...Object.values(bridgesTechniques), ...Object.values(lineTechniques)];
const sentences = titles.flatMap(t => skills.map(k => statusSentence(t, k, '81/81')));
const WORST = sentences.reduce((a, b) => b.length > a.length ? b : a);
/** The worst-case height of that sentence's status row on a device, and what also shares the screen: the 12-pt gap, the 10-pt gap and a 56-pt first row of keys. */
const statusOn = (d: typeof devices[number]) => Math.max(...sentences.map(text => statusHeight(d.width, d.side, text)));
const keysOn = (d: typeof devices[number]) => statusOn(d) + 12 + 10 + 56;

it('the registered Latin families cover exactly the 14 family and size combinations the review measured', () => {
  expect(latinVariants).toHaveLength(14);
  expect(new Set(latinVariants.map(v => v.kind))).toEqual(new Set(['sudoku', 'cage-math', 'greater-than', 'skyline', 'killer']));
});

it.each(devices)('AX5 on the $name: every Latin family and size shows its whole board (clue gutters included) with the keys\' first row', d => {
  const chrome = chromeOf(d), room = boardRoom({ windowWidth: d.width, windowHeight: d.height, fontScale: AX5, chrome, pad: true, sentence: WORST })!;
  for (const { kind, size: n } of latinVariants) {
    const gutter = kind === 'skyline' ? 0.7 : 0, outer = d.width - 40 + (d.width - 40 < 520 ? 28 : 0), width = outer * n / (n + 2 * gutter);
    const spec: GridSpec = { rows: n, columns: n, kind: 'digits', symbols: Array.from({ length: n }, (_, i) => String(i + 1)), givens: Array(n * n).fill(0) };
    const viewportMax = gridViewportMax(room, d.height, n, gutter), geometry = gridGeometry(width, viewportMax, spec, false);
    const board = Math.min(geometry.height, viewportMax) + 2 * gutter * geometry.cell;
    expect(board + keysOn(d), `${kind} ${n}×${n}`).toBeLessThanOrEqual(d.height - d.top - d.bottom);
  }
});

it('the matrix has teeth: sized as before the budget (the base 55% of the window), the phone turned on its side overflows for Skyline, Sudoku 6×6 and larger, Cage Math and the rest', () => {
  const d = devices[1], overflow: string[] = [];
  for (const { kind, size: n } of latinVariants) {
    const gutter = kind === 'skyline' ? 0.7 : 0, width = (d.width - 40 + 28) * n / (n + 2 * gutter);
    const spec: GridSpec = { rows: n, columns: n, kind: 'digits', symbols: Array.from({ length: n }, (_, i) => String(i + 1)), givens: Array(n * n).fill(0) };
    const geometry = gridGeometry(width, baseBoardHeight(d.height), spec, false), board = Math.min(geometry.height, baseBoardHeight(d.height)) + 2 * gutter * geometry.cell + (geometry.needsZoom ? 44 + 10 : 0);
    if (board + keysOn(d) > d.height - d.top - d.bottom) overflow.push(`${kind} ${n}`);
  }
  expect(overflow).toContain('skyline 6');
  expect(overflow).toContain('sudoku 9');
  expect(overflow).toContain('cage-math 9');
  expect(overflow.length).toBeGreaterThanOrEqual(8);
});

it.each(devices)('AX5 on the $name: Bridges, Loop and Pearl Loop show their whole board with the status line unless a grown-up board is taller than the window can hold at its smallest cell', d => {
  const chrome = chromeOf(d), room = boardRoom({ windowWidth: d.width, windowHeight: d.height, fontScale: AX5, chrome, pad: false, sentence: WORST })!, usable = d.height - d.top - d.bottom, width = d.width - 40;
  const tooTall: string[] = [];
  for (const r of bridgesRungs) {
    const cell = bridgesCell(width, r.width, r.height, edgeBoardHeight(room, Math.max(300, d.height * .62))), drawn = cell * r.height + 2 * Math.round(cell * .2);
    if (statusOn(d) + 12 + drawn > usable) { tooTall.push(`bridges ${r.id}`); expect(cell, `bridges ${r.id} at its smallest cell`).toBe(24); }
  }
  for (const [kind, rungs] of [['loop', loopRungs], ['pearl-loop', pearlRungs]] as const) for (const r of rungs) {
    const cell = loopCell(width, r.cols, r.rows, edgeBoardHeight(room, Math.max(300, d.height * .6))), drawn = cell * r.rows + 2 * Math.round(cell * .32);
    if (statusOn(d) + 12 + drawn > usable) { tooTall.push(`${kind} ${r.id}`); expect(cell, `${kind} ${r.id} at its smallest cell`).toBe(22); }
  }
  // Only the phone turned on its side can run out of height, and then only for the largest grown-up boards at their smallest cell.
  if (d.name !== 'iPhone 15 landscape') expect(tooTall).toEqual([]);
  else expect(tooTall.every(name => /channel|archipelago|atoll|abyss|deep/.test(name)), tooTall.join(', ')).toBe(true);
});

it.each(devices)('below the accessibility threshold the budget is absent on the $name: the board has its base share of the window', d => {
  for (const fontScale of [1, 1.3, 1.35]) {
    expect(boardRoom({ windowWidth: d.width, windowHeight: d.height, fontScale, chrome: chromeOf(d), pad: true })).toBeNull();
    for (const rows of [4, 6, 9]) for (const gutter of [0, 0.7]) expect(gridViewportMax(null, d.height, rows, gutter)).toBe(baseBoardHeight(d.height));
    expect(edgeBoardHeight(null, 300)).toBe(300);
  }
});

let screen: ReactTestRenderer | undefined;
const textOf = (n: ReactTestInstance): string => n.children.map(c => typeof c === 'string' ? c : textOf(c)).join('');
const skyline6: GridSpec = { rows: 6, columns: 6, kind: 'digits', symbols: ['1', '2', '3', '4', '5', '6'], givens: Array(36).fill(0) };
async function mount(d: typeof devices[number], spec = skyline6, frame: boolean | undefined = true) {
  Object.assign(viewport, { width: d.width, height: d.height });
  await act(async () => { screen = create(<GridChromeContext.Provider value={chromeOf(d)}><GridShell spec={spec} state={createGrid(spec)} dispatch={() => {}} width={d.width - 40 + (d.width - 40 < 520 ? 28 : 0)} active frame={frame ? { size: 0.7, layer: () => null } : undefined} status={WORST}/></GridChromeContext.Provider>); });
}
const buttons = () => screen!.root.findAllByType('button' as never);
const order = (n: ReactTestInstance) => screen!.root.findAll(() => true).indexOf(n);
const framed = () => screen!.root.find(n => n.type === 'div' && n.props.style?.overflow === 'hidden' && n.props.style?.borderRadius === 8);
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(async () => { if (screen) await act(async () => screen!.unmount()); screen = undefined; Object.assign(viewport, { width: 393, height: 852, fontScale: 3.12 }); vi.unstubAllGlobals(); });

it('Skyline 6×6 at AX5 on the landscape phone: the whole framed board fits the room left above the keys, and Enlarge cells follows the keys', async () => {
  const d = devices[1];
  await mount(d);
  const room = boardRoom({ windowWidth: d.width, windowHeight: d.height, fontScale: AX5, chrome: chromeOf(d), pad: true, sentence: WORST })!, cell = framed().props.style.height / 6;
  // Cells plus the two clue gutters (0.7 of a cell each) stay inside the room; before, they drew 266.6 pt (the 216-pt cells and their gutters).
  expect(framed().props.style.height + 2 * 0.7 * cell).toBeLessThanOrEqual(room + 0.5);
  expect(framed().props.style.height).toBeLessThan(216);
  expect(room + statusOn(d) + 12 + 10 + 56).toBeLessThanOrEqual(d.height - d.bottom);
  const zoom = buttons().find(b => textOf(b) === 'Enlarge cells')!, firstKey = buttons().find(b => b.props.label === 'Enter 1')!;
  expect(zoom, 'the cells are under 40 pt, so zoom is offered').toBeDefined();
  expect(order(zoom)).toBeGreaterThan(order(firstKey));
  expect(zoom.props.maxFontSizeMultiplier).toBe(1.3);
});

it('Sudoku 9×9 at AX5 on the landscape phone: the board takes the room left above the keys, not the whole 55% of the window', async () => {
  const d = devices[1], n = 9, spec: GridSpec = { rows: n, columns: n, kind: 'digits', symbols: Array.from({ length: n }, (_, i) => String(i + 1)), givens: Array(n * n).fill(0) };
  await mount(d, spec, false);
  const room = boardRoom({ windowWidth: d.width, windowHeight: d.height, fontScale: AX5, chrome: chromeOf(d), pad: true, sentence: WORST })!;
  expect(framed().props.style.height).toBeLessThanOrEqual(room + 0.5);
  expect(buttons().find(b => textOf(b) === 'Enlarge cells')).toBeDefined();
  expect(room).toBeGreaterThan(160);
  expect(STATUS_LINE).toBeGreaterThan(0);
});

it.each([1, 1.3, 1.35])('Skyline 6×6 at text scale %s on the landscape phone is drawn as before: 55%% of the window, Enlarge cells before the keys, no caps', async fontScale => {
  Object.assign(viewport, { fontScale });
  await mount(devices[1]);
  expect(framed().props.style.height).toBeCloseTo(393 * .55, 5);
  const zoom = buttons().find(b => textOf(b) === 'Enlarge cells')!, firstKey = buttons().find(b => b.props.label === 'Enter 1')!;
  expect(order(zoom)).toBeLessThan(order(firstKey));
  for (const b of buttons()) expect(b.props.maxFontSizeMultiplier, textOf(b)).toBeUndefined();
});
