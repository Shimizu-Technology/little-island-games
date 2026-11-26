import React from 'react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { MAP_DOOR_ART, PUZZLE_TILE_ART } from '../src/art/illustrated';
import { BOARD_FEEL, CoveMotif, FinishBurst, tileArt } from '../src/cove/CoveArt';
import { SECTIONS } from '../src/cove/shelf';
import { DOOR_ART } from '../src/hub/Landmarks';
import { places } from '../src/hub/model';
import { GridShell } from '../src/puzzles/grid/GridShell';
import { createGrid, gridAction, type GridSpec } from '../src/puzzles/grid/model';
import { GridFeel, type GridFeelValue } from '../src/puzzles/grid/preferences';

const motion = vi.hoisted(() => ({ timing: [] as unknown[] }));
vi.mock('react-native', () => ({ AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener: () => ({ remove() {} }) },
  View: 'div', Image: 'img', Pressable: 'button', TextInput: 'input', ScrollView: 'section', Platform: { OS: 'ios' },
  useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }), PanResponder: { create: () => ({ panHandlers: {} }) } }));
vi.mock('react-native-reanimated', async () => {
  const { useRef } = await import('react');
  return { default: { View: 'animated' }, Easing: { out: (f: unknown) => f, cubic: 'cubic' }, ReduceMotion: { System: 'system' },
    useAnimatedStyle: (fn: () => unknown) => fn(), useSharedValue: (value: number) => useRef({ value, get() { return this.value; }, set(n: number) { this.value = n; } }).current,
    withTiming: (value: number, config: unknown) => { motion.timing.push(config); return value; } };
});
vi.mock('react-native-svg', () => ({ default: 'svg', G: 'g', Path: 'path', Ellipse: 'ellipse' }));
vi.mock('expo-haptics', async () => (await import('./helpers/cove-ui')).haptics);
vi.mock('../src/ui', async () => (await import('./helpers/cove-ui')).ui);
vi.mock('../src/components/GameIcon', () => ({ GameIcon: 'game-icon', hasGameArt: (id: string) => id === 'coconut-drop' }));
vi.mock('../src/components/Text', () => ({ Text: 'span' }));
vi.mock('../src/components/ui', () => ({ C: {}, Button: 'key', Copy: 'p' }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const files = ['map', 'puzzles'].flatMap(dir => readdirSync(`assets/art/${dir}`).map(name => `assets/art/${dir}/${name}`));
async function mount(element: React.ReactElement) { let screen!: ReactTestRenderer; await act(async () => { screen = create(element); }); return screen; }
const images = (screen: ReactTestRenderer) => screen.root.findAll(n => n.type === 'img');
/** Mocked host names (`key`, `animated`, …) are plain strings, not JSX intrinsics. */
const host = (n: { type: unknown }) => n.type as string;

describe('Art Batch 1 illustrations', () => {
  it('bundles all 19 approved 512×512 WebPs, about 448 KB in all', () => {
    expect(files).toHaveLength(19);
    for (const file of files) {
      const head = readFileSync(file).subarray(0, 30);
      expect(head.toString('latin1', 0, 4) + head.toString('latin1', 8, 16), file).toBe('RIFFWEBPVP8X');
      expect([head.readUIntLE(24, 3) + 1, head.readUIntLE(27, 3) + 1], file).toEqual([512, 512]);
    }
    expect(files.reduce((sum, file) => sum + statSync(file).size, 0)).toBeLessThan(470_000);
  });

  it('requires every picture statically, each from a file that exists', () => {
    const source = readFileSync('src/art/illustrated.tsx', 'utf8'), required = [...source.matchAll(/require\(([^)]*)\)/g)].map(m => m[1]);
    expect(required).toHaveLength(19);
    for (const arg of required) expect(arg).toMatch(/^'\.\.\/\.\.\/assets\/art\/(?:map|puzzles)\/[a-z-]+\.webp'$/);
    expect(new Set([...Object.values(MAP_DOOR_ART), ...Object.values(PUZZLE_TILE_ART)])).toEqual(new Set(files));
  });

  it('gives every shelf game and the six core doors their own picture', () => {
    const shelf = SECTIONS.flatMap(s => [...s.games]);
    expect(Object.keys(PUZZLE_TILE_ART).sort()).toEqual([...shelf].sort());
    expect(PUZZLE_TILE_ART.killer).toBe('assets/art/puzzles/cage-sudoku.webp');
    expect(places.filter(p => DOOR_ART[p.id]).map(p => p.id).sort()).toEqual(['arcade', 'cove', 'hall', 'home', 'library', 'school']);
    expect(MAP_DOOR_ART[DOOR_ART.cove!]).toBe('assets/art/map/puzzles.webp');
    expect(MAP_DOOR_ART[DOOR_ART.school!]).toBe('assets/art/map/learn.webp');
  });

  it('fills a tile generously with the illustration and keeps vector art for a game without one', async () => {
    const tile = await mount(tileArt('sudoku', 174));
    const [art] = images(tile);
    expect(art.props).toMatchObject({ source: 'assets/art/puzzles/sudoku.webp', resizeMode: 'contain', fadeDuration: 0, accessible: false, style: [{ width: 125, height: 125 }, undefined] });
    const fallback = await mount(<CoveMotif game="drop-puzzles" size={56}/>);
    expect(images(fallback)).toHaveLength(0);
    expect(fallback.root.findAll(n => host(n) === 'game-icon')).toHaveLength(1);
    // A game with neither stands in with the Puzzles door.
    expect(images(await mount(<CoveMotif game="pearl-loop"/>)).map(n => n.props.source)).toEqual(['assets/art/map/puzzles.webp']);
  });
});

describe('Puzzles board feel', () => {
  const spec: GridSpec = { rows: 4, columns: 4, symbols: ['1', '2', '3', '4'], givens: [1, ...Array(15).fill(0)], kind: 'digits' };
  const label = (screen: ReactTestRenderer, words: string) => screen.root.findAll(n => n.type === 'button' && n.props.accessibilityLabel?.startsWith(words))[0];

  it('frames the board, pops a placed symbol, ticks a new selection and washes the selected row, column and box', async () => {
    const pops: { left: number; top: number; size: number; nonce: number }[] = [];
    const feel: GridFeelValue = { Pop: props => { pops.push(props); return null; }, select: vi.fn() };
    let state = createGrid(spec);
    const board = () => <GridFeel.Provider value={feel}><GridShell spec={spec} state={state} dispatch={() => {}} active width={320} peers={{ box: { rows: 2, columns: 2 } }}/></GridFeel.Provider>;
    const screen = await mount(board());
    expect(screen.root.findAll(n => n.props.testID === 'cove-grid-frame')).toHaveLength(1);
    expect(screen.root.findAll(n => host(n) === 'key' && n.props.label === 'Enter 1')[0].props.style).toMatchObject({ borderBottomWidth: 4 });
    expect(feel.select).not.toHaveBeenCalled();
    const cell = label(screen, 'Row 1, column 1,').props.style.width;
    // Row 1 and column 1 and the top-left box are peers of the selected first square; the far corner is not.
    expect(label(screen, 'Row 2, column 2,').props.style.backgroundColor).toBe('#EDF6F2');
    expect(label(screen, 'Row 1, column 4,').props.style.backgroundColor).toBe('#EDF6F2');
    expect(label(screen, 'Row 4, column 4,').props.style.backgroundColor).toBe('#FFFDF7');
    expect(label(screen, 'Row 1, column 1,').props.style.backgroundColor).toBe('#BFE0CC');

    state = gridAction(state, { type: 'write', cells: [6], value: 3 }, spec);
    await act(async () => screen.update(board()));
    expect(pops.at(-1)).toEqual({ left: 2 * cell, top: cell, size: cell, nonce: 1 });
    state = gridAction(state, { type: 'write', cells: [6], value: 0 }, spec);
    await act(async () => screen.update(board()));
    expect(pops.at(-1)?.nonce).toBe(1);
    state = gridAction(state, { type: 'select', cell: 15 }, spec);
    await act(async () => screen.update(board()));
    expect(feel.select).toHaveBeenCalledOnce();
    expect(label(screen, 'Row 1, column 1,').props.style.backgroundColor).toBe('#F0EDDF');
    expect(label(screen, 'Row 3, column 3,').props.style.backgroundColor).toBe('#EDF6F2');
    await act(async () => screen.unmount());
  });

  it('leaves a board without a host plain: no frame, no pop, no key lip', async () => {
    let state = createGrid(spec);
    const screen = await mount(<GridShell spec={spec} state={state} dispatch={() => {}} active width={320}/>);
    state = gridAction(state, { type: 'write', cells: [6], value: 3 }, spec);
    await act(async () => screen.update(<GridShell spec={spec} state={state} dispatch={() => {}} active width={320}/>));
    expect(screen.root.findAll(n => n.props.testID === 'cove-grid-frame')).toHaveLength(0);
    expect(screen.root.findAll(n => host(n) === 'key' && n.props.label === 'Enter 1')[0].props.style.borderBottomWidth).toBeUndefined();
    expect(label(screen, 'Row 2, column 2,').props.style.backgroundColor).toBe('#FFFDF7');
    await act(async () => screen.unmount());
  });

  it('runs the pop and the finish burst under the system Reduce Motion setting', async () => {
    motion.timing.length = 0;
    const burst = await mount(<FinishBurst/>);
    expect(burst.root.findAll(n => host(n) === 'animated')).toHaveLength(10);
    const pop = await mount(<BOARD_FEEL.Pop left={0} top={0} size={40} nonce={1}/>);
    expect(motion.timing).toHaveLength(2);
    for (const config of motion.timing) expect(config).toMatchObject({ reduceMotion: 'system' });
    await act(async () => { burst.unmount(); pop.unmount(); });
  });
});
