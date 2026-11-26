import React, { useState } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { CrosswordBoard } from '../src/puzzles/crossword/CrosswordBoard';
import {
  createCrossword, crosswordReducer, type CrosswordPuzzle, type CrosswordState,
} from '../src/puzzles/crossword/engine';
import { STARTER_CROSSWORDS } from '../src/puzzles/crossword/starterSet';

const screen = vi.hoisted(() => ({ width: 320, height: 660, fontScale: 1 }));
vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  View: 'View',
  ScrollView: 'ScrollView',
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 0.5 },
  useWindowDimensions: () => screen,
  PanResponder: { create: (panHandlers: object) => ({ panHandlers }) },
}));
vi.mock('../src/components/Icon', () => ({ Icon: 'Icon' }));
vi.mock('../src/components/Text', () => ({ Text: 'Text' }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mini = STARTER_CROSSWORDS.Easy[0];
let renderer: ReactTestRenderer | undefined;

afterEach(async () => {
  if (renderer) await act(async () => renderer?.unmount());
  renderer = undefined;
  screen.fontScale = 1;
});

function Fixture({ puzzle = mini, onState }: { puzzle?: CrosswordPuzzle; onState?: (state: CrosswordState) => void }) {
  const [state, setState] = useState(() => createCrossword(puzzle));
  return (
    <CrosswordBoard puzzle={puzzle} state={state} dispatch={action => {
      const next = crosswordReducer(puzzle, state, action);
      setState(next);
      onState?.(next);
    }} />
  );
}

async function render(puzzle = mini, onState?: (state: CrosswordState) => void) {
  await act(async () => { renderer = create(<Fixture puzzle={puzzle} onState={onState} />); });
}

function control(label: string): ReactTestInstance {
  return renderer!.root.findAllByType('Pressable' as never).find(node => node.props.accessibilityLabel === label)!;
}

const node = (testID: string) => renderer!.root.findByProps({ testID });
const output = () => JSON.stringify(renderer!.toJSON());

async function press(label: string) {
  const button = control(label);
  expect(button.props.accessibilityState?.disabled ?? false).toBe(false);
  await act(async () => button.props.onPress());
}

it.each([1, 3.12])('renders an accessible square board and 44 point keys at font scale %s', async fontScale => {
  screen.fontScale = fontScale;
  const puzzle = STARTER_CROSSWORDS.Expert[0];
  await render(puzzle);
  const open = puzzle.crossings.filter(Boolean).length;
  expect(renderer!.root.findAllByType('Pressable' as never).filter(x => x.props.testID?.startsWith('crossword-cell-'))).toHaveLength(open);
  expect(node('crossword-grid')).toBeTruthy();
  const keys = node('crossword-keyboard').findAllByType('Pressable' as never);
  expect(keys).toHaveLength(27);
  for (const key of keys) {
    const styles = key.props.style({ pressed: false }).filter(Boolean);
    expect(styles.find((style: { width?: number }) => style.width)?.width).toBeGreaterThanOrEqual(44);
    expect(styles[0].minHeight).toBeGreaterThanOrEqual(44);
  }
  const cell = puzzle.clues[0].cells[0];
  const selected = node(`crossword-cell-${cell}`);
  expect(selected.props.accessibilityLabel).toMatch(/^Row \d+, Column \d+, 1 Across, blank$/);
  expect(selected.props.accessibilityState.selected).toBe(true);
  expect(selected.props.style.filter(Boolean)).toContainEqual({ borderWidth: 2, borderColor: '#1E6B66' });
  expect(output().indexOf('crossword-clue-bar')).toBeLessThan(output().indexOf('crossword-keyboard'));
});

it('types and toggles the selected clue, then clears a letter using the built-in Backspace', async () => {
  await render();
  expect(control('Undo').props.disabled).toBe(true);
  const clue = mini.clues[0];
  const second = clue.cells[1];
  await press('Enter E');
  expect(node(`crossword-cell-${clue.cells[0]}`).props.accessibilityLabel).toMatch(/, E$/);
  expect(node(`crossword-cell-${second}`).props.accessibilityState.selected).toBe(true);
  await press('Backspace');
  expect(node(`crossword-cell-${clue.cells[0]}`).props.accessibilityLabel).toMatch(/, blank$/);
  await act(async () => node(`crossword-cell-${clue.cells[0]}`).props.onPress());
  expect(node(`crossword-cell-${clue.cells[0]}`).props.accessibilityLabel).toContain('1 Down');
  await press('Next clue');
  expect(output()).toContain('2 Down');
  await press('Previous clue');
  expect(output()).toContain('1 Down');
});

it('makes Check neutral, gives Friendly conflicts a visible underline, and switches readers without clearing letters', async () => {
  await render();
  await press('Enter Z');
  expect(node('crossword-cell-0').props.accessibilityLabel).toContain('1 Across, Z');
  expect(node('crossword-cell-0').props.accessibilityLabel).not.toContain('try again');
  await press('Check');
  expect(output()).toContain('1 letter to try again');
  await press('More');
  await press('Friendly');
  await press('Play together');
  const grabber = node('crossword-panel-grabber');
  expect(grabber.props.onMoveShouldSetPanResponder(null, { dy: 30, dx: 0 })).toBe(true);
  await act(async () => grabber.props.onPanResponderRelease(null, { dy: 50 }));
  expect(output()).not.toContain('crossword-more-panel');
  expect(node('crossword-cell-0').props.accessibilityLabel).toContain(', Z, try again');
  expect(output()).toContain('textDecorationLine":"underline"');
  expect(output()).toContain(mini.clues[0].easy);
  await press('Harder clue');
  expect(output()).toContain(mini.clues[0].harder);
  expect(node('crossword-cell-0').props.accessibilityLabel).toContain(', Z, try again');
  await press('Easy clue');
  expect(output()).toContain(mini.clues[0].easy);
});

it('commits help credit together with a visible hint, and Undo changes the board without removing credit', async () => {
  const observed = vi.fn();
  await render(mini, observed);
  await press('Hint');
  expect(control('Check letter')).toBeTruthy();
  expect(control('Reveal word')).toBeTruthy();
  await press('Reveal letter');
  expect(observed).toHaveBeenLastCalledWith(expect.objectContaining({ helpUsed: true }));
  expect(node('crossword-cell-0').props.accessibilityLabel).toContain('E, revealed');
  expect(output()).toContain('Letter revealed');
  await press('Undo');
  expect(node('crossword-cell-0').props.accessibilityLabel).toContain('blank');
  expect(observed).toHaveBeenLastCalledWith(expect.objectContaining({ helpUsed: true }));
});
