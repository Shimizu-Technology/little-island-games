/** R0c: a grid puzzle (Sudoku and its cousins) at the largest text size. The status line is one capped line, its buttons
 * and the number pad stay compact so the board and the pad's first row share a screen, the Erase key never breaks a word,
 * and a short large-text landscape window brings the board itself to the top of the page. Default size is unchanged. */
import React, { createContext } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { LatinPuzzle } from '../src/puzzles/latin/core';
import { LatinBoard } from '../src/puzzles/latin/LatinBoard';
import { freshPayload, viewOf } from '../src/puzzles/latin/registration';
import { GridPreferences } from '../src/puzzles/grid/preferences';
import { wordWidth } from '../src/components/wordFit';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 3.12 }));
vi.mock('react-native', () => ({ AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener: () => ({ remove() {} }) }, View: 'div', TextInput: 'input', Pressable: 'button', Platform: { OS: 'ios' }, useWindowDimensions: () => viewport, PanResponder: { create: (handlers: unknown) => ({ panHandlers: handlers }) } }));
vi.mock('react-native-reanimated', async () => { const { useRef } = await import('react'); return { default: { View: 'animated' }, useAnimatedStyle: (fn: () => unknown) => fn(), useSharedValue: (value: number) => useRef({ value, get() { return this.value; }, set(n: number) { this.value = n; } }).current }; });
vi.mock('react-native-svg', () => ({ default: 'svg', Path: 'path' }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Chip: 'button', Copy: 'p', Heading: 'h2', C: {}, styles: {} }));
vi.mock('../src/components/Text', () => ({ Text: 'span' }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play() {} }) }));

const sudoku4: LatinPuzzle = { kind: 'sudoku', size: 4, box: 2, givens: [...'1000000000000004'].map(Number), cages: [], less: [], sights: [], mask: Array<number>(16).fill(0) };
let screen: ReactTestRenderer | undefined;
const textOf = (n: ReactTestInstance): string => n.children.map(c => typeof c === 'string' ? c : textOf(c)).join('');
async function mountBoard() {
  const view = viewOf(sudoku4, freshPayload(sudoku4), 'Sprout 1', 'single')!;
  await act(async () => { screen = create(<GridPreferences.Provider value={{ mistakes: 'Friendly', band: 1, reader: 'Growing', fillNotes: false } as never}><LatinBoard view={view} dispatch={() => {}} active width={353}/></GridPreferences.Provider>); });
}
const buttons = () => screen!.root.findAllByType('button' as never);
const named = (label: string) => { const b = buttons().find(b => textOf(b) === label || b.props.label === label); if (!b) throw new Error(`No button ${label}; have ${buttons().map(textOf).join(' | ')}`); return b; };
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(async () => { if (screen) await act(async () => screen!.unmount()); screen = undefined; Object.assign(viewport, { width: 393, height: 852, fontScale: 3.12 }); vi.unstubAllGlobals(); });

it('AX5: the status line is one capped sentence with the full spoken count, and the buttons beside it stay at 1.3x', async () => {
  await mountBoard();
  const line = screen!.root.findByProps({ testID: 'puzzle-status-line' });
  expect(line.props.maxFontSizeMultiplier).toBe(1.3);
  expect(line.props.accessibilityLabel).toBe('Sprout 1. Skill: One number left. 2 of 16 cells filled');
  expect(textOf(line)).toBe('Sprout 1 · skill: One number left · 2/16');
  for (const label of ['How to play', 'Hint']) expect(named(label).props.maxFontSizeMultiplier, label).toBe(1.3);
  for (const label of ['Undo', 'Redo', 'Notes off', 'Number first off', 'Clashes shown', 'Start over']) expect(named(label).props.maxFontSizeMultiplier, label).toBeLessThanOrEqual(1.3);
});

it('AX5: the number pad keys stop at 1.3x and Erase fits its key, so no word breaks mid-word', async () => {
  await mountBoard();
  const keys = buttons().filter(b => /^Enter /.test(String(b.props.label ?? '')) || b.props.label === 'Erase');
  expect(keys.map(k => k.props.label)).toEqual(['Enter 1', 'Enter 2', 'Enter 3', 'Enter 4', 'Erase']);
  const erase = keys[4], padWidth = erase.props.style.width as number;
  expect(erase.props.style.paddingHorizontal).toBe(4);
  expect(erase.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.3);
  // "Erase" at its capped size (the system size is larger still) fits the key's text width.
  expect(wordWidth('Erase') * 15 * Math.min(viewport.fontScale, erase.props.maxFontSizeMultiplier)).toBeLessThanOrEqual(padWidth - 8);
  for (const k of keys.slice(0, 4)) expect(k.props.maxFontSizeMultiplier).toBe(1.3);
  // The instruction under the pad is capped, so it does not run on for screens.
  const hint = screen!.root.findAllByType('p' as never).find(p => /^Select a cell/.test(textOf(p)))!;
  expect(hint.props.maxFontSizeMultiplier).toBe(1.5);
});

it('AX5: the rules a child opens with How to play stop at 1.5x', async () => {
  await mountBoard();
  await act(async () => { named('How to play').props.onPress(); });
  const rules = screen!.root.findAllByType('p' as never).find(p => /^Fill every empty square/.test(textOf(p)))!;
  expect(rules.props.maxFontSizeMultiplier).toBe(1.5);
});

it('default size: status stays separate and the approved Erase word fit prevents mid-word breaks', async () => {
  Object.assign(viewport, { fontScale: 1 });
  await mountBoard();
  expect(screen!.root.findAllByProps({ testID: 'puzzle-status-line' })).toHaveLength(0);
  const facts = screen!.root.findByProps({ testID: 'puzzle-status' }).findAllByType('p' as never);
  expect(facts.map(textOf)).toEqual(['Sprout 1', '· skill: One number left', '· 2/16']);
  expect(facts[2].props.accessibilityLabel).toBe('2 of 16 cells filled');
  const erase = buttons().find(b => b.props.label === 'Erase')!;
  expect(erase.props.style.paddingHorizontal).toBe(4);
  // Lead-approved round2 exception: word keys fit at default as well as AX.
  expect(erase.props.numberOfLines).toBe(1);
  expect(wordWidth('Erase') * 15 * Math.min(viewport.fontScale, erase.props.maxFontSizeMultiplier)).toBeLessThanOrEqual(erase.props.style.width - 12);
  expect(erase.props.style.minWidth).toBe(52);
});

it('the Bridges, Loop and Pearl Loop boards share the same status line, so they cap the same way', async () => {
  const { readFileSync } = await import('node:fs');
  for (const file of ['src/puzzles/edges/BridgesBoard.tsx', 'src/puzzles/lines/LineBoard.tsx', 'src/puzzles/latin/LatinBoard.tsx']) {
    const source = readFileSync(file, 'utf8');
    expect(source, file).toContain('<PuzzleStatus');
    expect(source, file).not.toContain('· skill: ${');
  }
});

it.each([[393, 'full row'], [852, 'beside the buttons']])('PuzzleStatus at AX5 and %s pt keeps the line %s', async (width, _where) => {
  Object.assign(viewport, { width, height: width === 393 ? 852 : 393 });
  const { PuzzleStatus } = await import('../src/puzzles/ui/PuzzleStatus');
  await act(async () => { screen = create(<PuzzleStatus title="Harbour 3" skill="Only one place" count="13/36" countLabel="13 of 36 cells filled"><span>buttons</span></PuzzleStatus>); });
  const line = screen!.root.findByProps({ testID: 'puzzle-status-line' });
  expect(line.props.style).toEqual(width === 393 ? { width: '100%' } : { flex: 1, minWidth: 0 });
  expect(textOf(line)).toBe('Harbour 3 · skill: Only one place · 13/36');
});
