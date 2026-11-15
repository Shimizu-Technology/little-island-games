import React from 'react';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterAll, afterEach, expect, it, vi } from 'vitest';
import { GridShell } from '../src/puzzles/grid/GridShell';
import { createGrid, type GridSpec } from '../src/puzzles/grid/model';
import { GridChromeContext, challengeChrome } from '../src/puzzles/grid/budget';
import { GridPreferences } from '../src/puzzles/grid/preferences';
import { defaults } from '../src/cove/local';
import { cageCorners, cageLayer } from '../src/puzzles/latin/clues';
import type { LatinPuzzle } from '../src/puzzles/latin/core';

const window = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 1 }));
vi.mock('react-native', () => ({ View: 'View', TextInput: 'TextInput', Pressable: 'Pressable', Platform: { OS: 'ios' }, useWindowDimensions: () => window,
  AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener: () => ({ remove() {} }) }, PanResponder: { create: () => ({ panHandlers: {} }) } }));
vi.mock('react-native-reanimated', async () => {
  const { useRef } = await import('react');
  return { default: { View: 'AnimatedView' }, useAnimatedStyle: (f: () => unknown) => f(), useSharedValue: (initial: number) => {
    const ref = useRef({ value: initial, get() { return this.value; }, set(v: number) { this.value = v; } }); return ref.current;
  } };
});
vi.mock('react-native-svg', () => ({ default: 'Svg', Path: 'Path' }));
vi.mock('../src/components/Text', () => ({ Text: 'Text' }));
vi.mock('../src/components/ui', () => ({ C: { ink: '#183F39', teal: '#246858', error: '#A53F3F', gold: '#E8B95A' }, Button: 'Button', Copy: 'Copy' }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const fixture = 'tests/fixtures/grid-host-before-school.json', capture = process.env.LITTLE_ISLAND_CAPTURE_GRID_BASELINE === '1';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const source = readFileSync('src/puzzles/grid/GridShell.tsx', 'utf8');
const gestureHash = hash(source.slice(source.indexOf('  const responder ='), source.indexOf('  const panStyle =')));
const cornerHash = hash(readFileSync('src/puzzles/grid/cornerNotes.ts', 'utf8'));
type Baseline = { source: string; gestureHash: string; cornerHash: string; cases: Record<string, string> };
const baseline: Baseline = capture ? { source: '23744722 (merged frame/R1a, before schoolLayout)', gestureHash, cornerHash, cases: {} } : JSON.parse(readFileSync(fixture, 'utf8'));
// Preserve missing-vs-undefined props and every layout value; callbacks compare
// their callable signature rather than identities allocated by different renders.
const signature = (tree: unknown) => JSON.stringify(tree, (_key, v) => typeof v === 'function' ? { function: v.name, arity: v.length } : v === undefined ? { undefined: true } : v);
let screen: ReactTestRenderer | undefined;
afterEach(async () => { if (screen) await act(async () => screen!.unmount()); screen = undefined; });
afterAll(() => { if (capture) writeFileSync(fixture, JSON.stringify(baseline, null, 2) + '\n'); });
it('keeps gesture arbitration and the corner-note implementation byte-for-byte unchanged', () => {
  expect(gestureHash).toBe(baseline.gestureHash); expect(cornerHash).toBe(baseline.cornerHash);
});
it.each((['Cove', 'Challenge'] as const).flatMap(host => (['sudoku', 'killer', 'cage-math'] as const).flatMap(kind => [393, 744].flatMap(width => [1, 3.12].map(scale => ({ host, kind, width, scale }))))))('absent School layout preserves $host $kind layout and props at $width / $scale', async ({ host, kind, width, scale }) => {
  Object.assign(window, { width, height: width === 393 ? 852 : 1133, fontScale: scale });
  const n = 9, givens = Array(81).fill(0); givens[80] = 9;
  const spec: GridSpec = { rows: n, columns: n, symbols: Array.from({ length: n }, (_, i) => String(i + 1)), givens, kind: 'digits' };
  const state = { ...createGrid(spec), values: [...givens], notes: Array(81).fill(511), selected: 5 }; state.values[0] = 1; state.notes[0] = state.notes[80] = 0;
  const p: LatinPuzzle = { kind, size: n, box: kind === 'cage-math' ? 0 : 3, givens, cages: kind === 'sudoku' ? [] : [{ cells: [0, 1], op: '+', target: 10 }, { cells: [8, 17], op: '*', target: 12 }], less: [], sights: [], mask: Array(81).fill(0) };
  const chrome = host === 'Challenge' ? challengeChrome({ insets: { top: 59, bottom: 34 }, barPinned: true, short: false, chip: scale >= 1.5 }) : { top: 0, bottom: 0, bar: 0 };
  const render = (explicitUndefined: boolean) => <GridChromeContext.Provider value={chrome}><GridPreferences.Provider value={{ ...defaults(), mistakes: host === 'Cove' ? 'Friendly' : 'Plain' }}><GridShell spec={spec} state={state} active width={width - 60} dispatch={() => {}} conflicts={[2]} tints={new Map([[2, 3], [3, 4]])} cornerClues={p.cages.length ? cageCorners(p) : undefined} overlay={p.cages.length ? cageLayer(p, { labels: false }) : undefined} {...(explicitUndefined ? { schoolLayout: undefined } : {})}/></GridPreferences.Provider></GridChromeContext.Provider>;
  await act(async () => { screen = create(render(false)); });
  const before = signature(screen!.toJSON()), key = `${host}/${kind}/${width}/${scale}`;
  if (capture) baseline.cases[key] = hash(before); else expect(hash(before), key).toBe(baseline.cases[key]);
  await act(async () => screen!.update(render(true)));
  expect(signature(screen!.toJSON())).toBe(before);
});
