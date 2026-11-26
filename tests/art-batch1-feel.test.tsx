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
import { GridCanvas, gridLayout } from '../src/puzzles/picture-grid/GridCanvas';
import { EMPTY, FILL, type Mark } from '../src/puzzles/picture-grid/engine';
import type { Paint } from '../src/puzzles/picture-grid/checkpoint';

const motion = vi.hoisted(() => ({ timing: [] as unknown[], cancelled: 0, reduced: false, listeners: new Set<(on: boolean) => void>() }));
vi.mock('react-native', () => ({
  AccessibilityInfo: { isScreenReaderEnabled: async () => false, isReduceMotionEnabled: async () => motion.reduced,
    addEventListener: (name: string, listener: (on: boolean) => void) => { if (name === 'reduceMotionChanged') motion.listeners.add(listener); return { remove() { motion.listeners.delete(listener); } }; } },
  StyleSheet: { create: (styles: object) => styles, absoluteFill: {} }, Text: 'span', Easing: { bezier: () => (t: number) => t },
  View: 'div', Image: 'img', Pressable: 'button', TextInput: 'input', ScrollView: 'section', Platform: { OS: 'ios' },
  useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }), PanResponder: { create: () => ({ panHandlers: {} }) } }));
vi.mock('react-native-reanimated', async () => {
  const { useRef } = await import('react');
  return { default: { View: 'animated' }, Easing: { out: (f: unknown) => f, cubic: 'cubic' }, ReduceMotion: { System: 'system' },
    useAnimatedStyle: (fn: () => unknown) => fn(), useSharedValue: (value: number) => useRef({ value, get() { return this.value; }, set(n: number) { this.value = n; } }).current,
    // A run is left mid-flight, so a test can see Reduce Motion stop it.
    withTiming: (value: number, config: unknown) => { motion.timing.push(config); return value / 2; }, cancelAnimation: () => { motion.cancelled++; } };
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
    const source = readFileSync('src/art/illustrated.tsx', 'utf8');
    const required = [...source.matchAll(/require\(([^)]*\/(?:map|puzzles)\/[^)]*)\)/g)].map(m => m[1]);
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

  /** A board whose dispatch is the real grid model, so taps, keys and pad presses go through GridShell as a player's would. */
  async function play(feel: GridFeelValue) {
    let state = createGrid(spec);
    const board = () => <GridFeel.Provider value={feel}><GridShell spec={spec} state={state} dispatch={a => { state = gridAction(state, a, spec); }} active width={320} peers={{ box: { rows: 2, columns: 2 } }}/></GridFeel.Provider>;
    const screen = await mount(board());
    const run = async (change: () => void) => act(async () => { change(); screen.update(board()); });
    return {
      screen, state: () => state,
      tap: (words: string) => run(() => label(screen, words).props.onPress()),
      key: (name: string) => run(() => screen.root.findAll(n => host(n) === 'input')[0].props.onKeyPress({ nativeEvent: { key: name } })),
      pad: (name: string) => run(() => screen.root.findAll(n => host(n) === 'key' && n.props.label === name)[0].props.onPress()),
      /** A change the board did not ask for: the HUD's Undo or Redo, a hint, or Start over. */
      apply: (next: (s: ReturnType<typeof createGrid>) => ReturnType<typeof createGrid>) => run(() => { state = next(state); }),
      rings: () => screen.root.findAll(n => host(n) === 'ring').map(n => n.props as { left: number; top: number; nonce: number }),
    };
  }
  const ringFeel = (): GridFeelValue => ({ Pop: props => React.createElement('ring' as unknown as React.FC<typeof props>, props), select: vi.fn() });

  it('frames the board around its edge, firms its lines and washes the selected row, column and box', async () => {
    const feel = ringFeel(), board = await play(feel), { screen } = board;
    const frame = screen.root.findAll(n => n.props.testID === 'cove-grid-frame')[0];
    expect(frame.props.style).toMatchObject({ padding: 3, backgroundColor: '#3D2B24' });
    // Nothing draws the frame over the squares, so an edge square's selection and conflict borders stay whole.
    expect(screen.root.findAll(n => n.props.style?.borderColor === '#3D2B24')).toHaveLength(0);
    expect(screen.root.findAll(n => host(n) === 'path').map(n => n.props.stroke)).toContain('#6B7D72');
    expect(screen.root.findAll(n => host(n) === 'key' && n.props.label === 'Enter 1')[0].props.style).toMatchObject({ borderBottomWidth: 4 });
    expect(feel.select).not.toHaveBeenCalled();
    // Row 1 and column 1 and the top-left box are peers of the selected first square; the far corner is not.
    expect(label(screen, 'Row 2, column 2,').props.style.backgroundColor).toBe('#E3F0E5');
    expect(label(screen, 'Row 1, column 4,').props.style.backgroundColor).toBe('#E3F0E5');
    expect(label(screen, 'Row 4, column 4,').props.style.backgroundColor).toBe('#FFFDF7');
    expect(label(screen, 'Row 1, column 1,').props.style.backgroundColor).toBe('#BFE0CC');
    await board.tap('Row 4, column 4,');
    expect(label(screen, 'Row 1, column 1,').props.style.backgroundColor).toBe('#F0EDDF');
    expect(label(screen, 'Row 3, column 3,').props.style.backgroundColor).toBe('#E3F0E5');
    await act(async () => screen.unmount());
  });

  it('pops only a placement the player makes, and clears the ring with its square, Undo or Start over', async () => {
    const board = await play(ringFeel()), { screen } = board;
    const cell = label(screen, 'Row 1, column 1,').props.style.width;
    await board.tap('Row 2, column 3,'); await board.pad('Enter 3');
    expect(board.rings()).toEqual([{ left: 2 * cell, top: cell, size: cell, nonce: 1 }]);
    // Undo clears the placed square and its ring; Redo puts the symbol back without one.
    await board.apply(s => gridAction(s, { type: 'undo' }, spec)); expect(board.rings()).toEqual([]);
    await board.apply(s => gridAction(s, { type: 'redo' }, spec)); expect(board.rings()).toEqual([]);
    // Erasing removes the ring too, and undoing the erase brings the symbol back without one.
    await board.pad('Enter 4'); expect(board.rings()).toHaveLength(1);
    await board.pad('Erase'); expect(board.rings()).toEqual([]);
    await board.apply(s => gridAction(s, { type: 'undo' }, spec)); expect(board.rings()).toEqual([]);
    // A placement elsewhere keeps the newest ring; Start over clears it with the board.
    await board.key('ArrowDown'); await board.key('2'); expect(board.rings()).toHaveLength(1);
    await board.apply(s => ({ ...createGrid(spec), edits: s.edits + 1 })); expect(board.rings()).toEqual([]);
    await act(async () => screen.unmount());
  });

  it('ticks a square the player chooses by tap or arrow key, never Start over or Undo', async () => {
    const feel = ringFeel(), board = await play(feel);
    await board.tap('Row 4, column 4,'); expect(feel.select).toHaveBeenCalledTimes(1);
    await board.key('ArrowLeft'); expect(feel.select).toHaveBeenCalledTimes(2);
    await board.tap('Row 4, column 3,'); expect(feel.select).toHaveBeenCalledTimes(2);
    await board.pad('Enter 2'); await board.apply(s => gridAction(s, { type: 'undo' }, spec));
    await board.apply(s => ({ ...createGrid(spec), edits: s.edits + 1 }));
    expect(board.state().selected).toBe(0);
    expect(feel.select).toHaveBeenCalledTimes(2);
    await act(async () => board.screen.unmount());
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
    motion.timing.length = 0; motion.reduced = false;
    const burst = await mount(<FinishBurst/>);
    expect(burst.root.findAll(n => host(n) === 'animated')).toHaveLength(10);
    const pop = await mount(<BOARD_FEEL.Pop left={0} top={0} size={40} nonce={1}/>);
    expect(motion.timing).toHaveLength(2);
    for (const config of motion.timing) expect(config).toMatchObject({ reduceMotion: 'system' });
    await act(async () => { burst.unmount(); pop.unmount(); });
  });

  it('stops a running pop and burst the moment Reduce Motion turns on, and plays no more while it stays on', async () => {
    motion.timing.length = 0; motion.cancelled = 0; motion.reduced = false;
    const burst = await mount(<FinishBurst/>);
    const pop = (nonce: number) => <BOARD_FEEL.Pop left={0} top={0} size={40} nonce={nonce}/>;
    const ring = await mount(pop(1));
    expect(motion.timing).toHaveLength(2);
    expect(burst.root.findAll(n => host(n) === 'animated')).toHaveLength(10);
    expect(ring.root.findAll(n => host(n) === 'animated')).toHaveLength(1);
    await act(async () => { for (const listener of [...motion.listeners]) listener(true); });
    expect(motion.cancelled).toBe(2);
    expect(burst.root.findAll(n => host(n) === 'animated')).toHaveLength(0);
    expect(ring.root.findAll(n => host(n) === 'animated')).toHaveLength(0);
    await act(async () => ring.update(pop(2)));
    expect(motion.timing).toHaveLength(2);
    expect(ring.root.findAll(n => host(n) === 'animated')).toHaveLength(0);
    await act(async () => { burst.unmount(); ring.unmount(); });
  });
});

describe('Picture Grid board feel', () => {
  const size = 5, layout = gridLayout(size, 320, 320);
  async function play() {
    let marks: Mark[] = Array(size * size).fill(EMPTY);
    const feel: GridFeelValue = { Pop: props => React.createElement('ring' as unknown as React.FC<typeof props>, props), select: () => {} };
    const paint = (p: Paint) => { marks = marks.map((m, i) => i >= p.from && i <= p.to ? p.mark : m); };
    const board = () => <GridFeel.Provider value={feel}><GridCanvas layout={layout} size={size} marks={marks} mode={FILL} active moving={false} onPaint={paint}/></GridFeel.Provider>;
    const screen = await mount(board());
    const run = async (change: () => void) => act(async () => { change(); screen.update(board()); });
    return {
      screen,
      tap: (index: number) => run(() => screen.root.findAll(n => host(n) === 'button' && n.props.testID === `picture-cell-${index}`)[0].props.onPress()),
      apply: (next: (marks: Mark[]) => Mark[]) => run(() => { marks = next(marks); }),
      rings: () => screen.root.findAll(n => host(n) === 'ring').map(n => n.props.nonce as number),
    };
  }

  it('frames the viewport from outside, pops a painted square, and clears the ring on Undo, clearing and Start over', async () => {
    const board = await play();
    const frame = board.screen.root.findAll(n => host(n) === 'div' && n.props.testID === 'picture-frame')[0];
    expect(frame.props.style[1]).toMatchObject({ left: -3, top: -3, width: layout.viewportWidth + 6, height: layout.viewportHeight + 6 });
    await board.tap(6); expect(board.rings()).toEqual([1]);
    // Undo (the host's change) clears the square and its ring, and puts nothing back with a ring.
    await board.apply(m => m.map((v, i) => i === 6 ? EMPTY : v)); expect(board.rings()).toEqual([]);
    await board.apply(m => m.map((v, i) => i === 6 ? FILL : v)); expect(board.rings()).toEqual([]);
    // Tapping a filled square clears it, and its ring with it.
    await board.tap(7); expect(board.rings()).toEqual([1]);
    await board.tap(7); expect(board.rings()).toEqual([]);
    await board.tap(8); await board.apply(m => m.map(() => EMPTY)); expect(board.rings()).toEqual([]);
    await act(async () => board.screen.unmount());
  });
});
