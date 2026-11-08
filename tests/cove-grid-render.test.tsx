import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { GridShell } from '../src/puzzles/grid/GridShell';
import { createGrid, gridAction, type GridSpec } from '../src/puzzles/grid/model';
const counts = vi.hoisted(() => ({ cells: 0, svg: 0 }));
vi.mock('react-native', () => ({ AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener: () => ({ remove() {} }) },
  TextInput: 'input', View: 'div', ScrollView: 'section', Platform: { OS: 'ios' }, useWindowDimensions: () => ({ width: 744, height: 1133 }),
  Pressable: (props: Record<string, unknown>) => { counts.cells++; return React.createElement('button', props); },
  PanResponder: { create: () => ({ panHandlers: {} }) },
}));
vi.mock('react-native-reanimated', async () => {
  const { useRef } = await import('react');
  return { default: { View: 'div' }, useAnimatedStyle: () => ({}), useSharedValue: (initial: number) => {
    const ref = useRef({ value: initial, get() { return this.value; }, set(value: number) { this.value = value; } }); return ref.current;
  } };
});
vi.mock('react-native-svg', () => ({ default: (props: Record<string, unknown>) => { counts.svg++; return React.createElement('svg', props); }, Path: 'path' }));
vi.mock('../src/components/Text', () => ({ Text: 'span' }));
vi.mock('../src/components/ui', () => ({ C: {}, Button: 'button', Copy: 'p', ToggleRow: 'switch' }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
describe('largest grids keep vectors static and update only changed cells', () => {
  it.each([9, 25])('memoizes the %s square board through notes/edit and selection', async size => {
    counts.cells = 0; counts.svg = 0;
    const spec: GridSpec = { rows: size, columns: size, symbols: size === 9 ? ['1','2','3','4','5','6','7','8','9'] : ['Fill','×'], givens: Array(size * size).fill(0), kind: size === 9 ? 'digits' : 'paint' };
    let state = createGrid(spec); if (size === 9) state = { ...state, notes: Array(81).fill(511) };
    const dispatch = vi.fn(); let screen!: ReactTestRenderer;
    const render = () => <GridShell spec={spec} state={state} dispatch={dispatch} active width={704}/>;
    try {
      await act(async () => { screen = create(render()); }); expect(counts.cells).toBe(size * size); expect(counts.svg).toBe(1);
      state = gridAction(state, { type: 'write', cells: [1], value: 1 }, spec);
      await act(async () => screen.update(render())); expect(counts.cells).toBe(size * size + 1); expect(counts.svg).toBe(1);
      state = gridAction(state, { type: 'select', cell: 2 }, spec);
      await act(async () => screen.update(render())); expect(counts.cells).toBe(size * size + 3); expect(counts.svg).toBe(1);
      expect(screen.root.findAllByType('path')).toHaveLength(1);
    } finally { if (screen) await act(async () => screen.unmount()); }
  });
});

it('routes native typed symbols and Backspace through the same selected-cell action', async () => {
  const spec: GridSpec = { rows: 4, columns: 4, symbols: ['1','2','3','4'], givens: Array(16).fill(0), kind: 'digits' };
  const dispatch = vi.fn(); let screen!: ReactTestRenderer;
  try {
    await act(async () => { screen = create(<GridShell spec={spec} state={createGrid(spec)} dispatch={dispatch} active width={320}/>); });
    const input = screen.root.findByProps({ testID: 'cove-native-keyboard' });
    expect(input.props.showSoftInputOnFocus).toBe(false);
    await act(async () => input.props.onKeyPress({ nativeEvent: { key: '3' } }));
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'write', cells: [0], value: 3 });
    await act(async () => input.props.onKeyPress({ nativeEvent: { key: 'Backspace' } }));
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'write', cells: [0], value: 0 });
    expect(dispatch).toHaveBeenCalledTimes(2);
  } finally { if (screen) await act(async () => screen.unmount()); }
});

it('8 advertises only supported iOS keyboard input', async () => {
  const spec: GridSpec = { rows: 4, columns: 4, symbols: ['1','2','3','4'], givens: Array(16).fill(0), kind: 'digits' }; let screen!: ReactTestRenderer;
  try { await act(async () => { screen = create(<GridShell spec={spec} state={createGrid(spec)} dispatch={() => {}} active width={320}/>); });
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/Keyboard: arrows|Command-Z/);
  } finally { await act(async () => screen?.unmount()); }
});
it('9 routes accessibility activation directly to the intended cell', async () => {
  const spec: GridSpec = { rows: 9, columns: 9, symbols: ['1'], givens: Array(81).fill(0), kind: 'digits' }, dispatch = vi.fn(); let screen!: ReactTestRenderer;
  try { await act(async () => { screen = create(<GridShell spec={spec} state={createGrid(spec)} dispatch={dispatch} active width={320}/>); });
    const cell = screen.root.findAllByType('button').find(b => b.props.accessibilityLabel?.startsWith('Row 9, column 9,'))!;
    expect(cell.props.onAccessibilityTap).toBeTypeOf('function'); await act(async () => cell.props.onAccessibilityTap()); expect(dispatch).toHaveBeenLastCalledWith({ type: 'select', cell: 80 });
  } finally { await act(async () => screen?.unmount()); }
});
it('6 and 28 keeps selected paint visible and mounts no empty symbols', async () => {
  const spec: GridSpec = { rows: 25, columns: 25, symbols: ['Fill','×'], givens: Array(625).fill(0), kind: 'paint' }; let screen!: ReactTestRenderer;
  try { const state = gridAction(createGrid(spec), { type: 'write', cells: [0], value: 1 }, spec); await act(async () => { screen = create(<GridShell spec={spec} state={state} dispatch={() => {}} active width={320}/>); });
    const cells = screen.root.findAllByType('button').filter(b => b.props.accessibilityLabel?.startsWith('Row '));
    expect(cells[0].props.style.backgroundColor).toBe('#246858'); expect(screen.root.findAllByType('span')).toHaveLength(0);
  } finally { await act(async () => screen?.unmount()); }
});
it('7 keeps the content viewport separate from its border', async () => {
  const spec: GridSpec = { rows: 9, columns: 9, symbols: ['1'], givens: Array(81).fill(0), kind: 'digits' }; let screen!: ReactTestRenderer;
  try { await act(async () => { screen = create(<GridShell spec={spec} state={createGrid(spec)} dispatch={() => {}} active width={351}/>); });
    const clip = screen.root.findAllByType('div').find(n => n.props.style?.overflow === 'hidden')!; expect(clip.props.style.borderWidth ?? 0).toBe(0);
  } finally { await act(async () => screen?.unmount()); }
});

it('keeps the Number first mode visibly named and toggles it in a wrapping toolbar', async () => {
  const spec: GridSpec = { rows: 9, columns: 9, symbols: ['1','2','3','4','5','6','7','8','9'], givens: Array(81).fill(0), kind: 'digits' }; let screen!: ReactTestRenderer;
  try {
    await act(async () => { screen = create(<GridShell spec={spec} state={createGrid(spec)} dispatch={() => {}} active width={320}/>); });
    const off = screen.root.findAllByType('button').find(b => b.children.join('') === 'Number first off'); expect(off).toBeDefined();
    await act(async () => off!.props.onPress());
    const on = screen.root.findAllByType('button').find(b => b.children.join('') === 'Number first on'); expect(on?.props.selected).toBe(true);
  } finally { await act(async () => screen?.unmount()); }
});
