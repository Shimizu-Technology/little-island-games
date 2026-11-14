/** R0c fix round 2 (P1-1): at accessibility sizes in a wide window the puzzle status keeps a column for its buttons and the sentence wraps
 * inside what is left, so its height is the sentence's. Full Cages 144 (the longest registered status) at AX5 on the landscape iPhone 15
 * (852 x 393, 59-pt side insets) shows its whole board and the pad's first row together. Widths below are CoreText advances of the production
 * AvenirNext sizes measured by the round-2 review (review/round2-status-widths.log); heights follow Yoga's flex-wrap line breaking. */
import React, { createContext } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LatinBoard } from '../src/puzzles/latin/LatinBoard';
import { freshPayload, viewOf } from '../src/puzzles/latin/registration';
import { GridChromeContext, BUTTON_ROW, SECTION_GAP, PAD_GAP, PAD_ROW, boardRoom, challengeChrome, statusHeight } from '../src/puzzles/grid/budget';
import { PuzzleStatus, statusSentence } from '../src/puzzles/ui/PuzzleStatus';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 3.12 }));
vi.mock('react-native', () => ({ AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener: () => ({ remove() {} }) }, View: 'div', TextInput: 'input', Pressable: 'button', Platform: { OS: 'ios' }, useWindowDimensions: () => viewport, PanResponder: { create: (handlers: unknown) => ({ panHandlers: handlers }) } }));
vi.mock('react-native-reanimated', async () => { const { useRef } = await import('react'); return { default: { View: 'animated' }, useAnimatedStyle: (fn: () => unknown) => fn(), useSharedValue: (value: number) => useRef({ value, get() { return this.value; }, set(n: number) { this.value = n; } }).current }; });
vi.mock('react-native-svg', () => ({ default: 'svg', Path: 'path' }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Chip: 'button', Copy: 'p', Heading: 'h2', C: {}, styles: {} }));
vi.mock('../src/components/Text', () => ({ Text: 'span' }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play() {} }) }));

const LINE = 32.5, GAP = 6, HOW_TO_PLAY = 142.2505, HINT = 67.936;
/** Measured widths of the sentences ("Title · skill: Name · count") at the capped 1.3x: Full Cages 144's first and two-digit-count statuses, and the review's other long ones. */
const measured = [
  { text: 'Full Cages 144 · skill: Pointing and claiming · 0/81', width: 476.4032 },
  { text: 'Full Cages 144 · skill: Pointing and claiming · 12/81', width: 488.4672 },
  { text: 'Tide Pool 100 · skill: Only one place · 12/36', width: 418.184 },
  { text: 'Small Cages 100 · skill: Cage totals · 12/36', width: 410.1344 },
  { text: 'High Town 100 · skill: Counting roofs · 12/36', width: 429.208 },
  { text: 'Stepping Stones 100 · skill: Must reach · 12/36', width: 449.6752 },
  { text: 'Steep 100 · skill: Greater and smaller · 12/36', width: 425.7968 },
];
let screen: ReactTestRenderer | undefined;
const textOf = (n: ReactTestInstance): string => n.children.map(c => typeof c === 'string' ? c : textOf(c)).join('');
const flat = (style: unknown): Record<string, unknown> => Array.isArray(style) ? Object.assign({}, ...style.map(flat)) : (style && typeof style === 'object' ? style as Record<string, unknown> : {});
/**
 * The height the rendered status row takes in `content` points of width, from the styles it actually has. A row that reserves the buttons' column
 * (`flex: 1` sentence, fixed button container) wraps the sentence in the width that is left; a wrapping row places its items by natural width and
 * starts a new row when one would overflow, as Yoga does (each button row is at least the 44-pt minimum).
 */
function statusRowHeight(status: ReactTestInstance, sentenceWidth: number, content: number) {
  const line = status.find(n => n.props.testID === 'puzzle-status-line' && n.type === 'p'), buttons = status.findAll(n => n.type === 'div' && n.props.testID === 'puzzle-status-buttons');
  const lines = (width: number) => Math.max(1, Math.ceil(sentenceWidth / Math.max(1, width)));
  if (buttons.length && flat(line.props.style).flex === 1) return Math.max(lines(content - HOW_TO_PLAY - HINT - 2 * GAP - GAP) * LINE, BUTTON_ROW);
  const rows: number[][] = [[]], items = [{ w: Math.min(sentenceWidth, content), h: lines(content) * LINE }, { w: HOW_TO_PLAY, h: BUTTON_ROW }, { w: HINT, h: BUTTON_ROW }];
  let x = 0;
  for (const item of items) {
    if (rows.at(-1)!.length && x + GAP + item.w > content) { rows.push([]); x = 0; }
    x += (rows.at(-1)!.length ? GAP : 0) + item.w; rows.at(-1)!.push(item.h);
  }
  return rows.reduce((sum, row) => sum + Math.max(...row), 0) + (rows.length - 1) * GAP;
}
const mountStatus = async (width: number, height: number, text: string) => {
  Object.assign(viewport, { width, height });
  const [title, skill, count] = text.split(' · '), done = count;
  await act(async () => { screen = create(<PuzzleStatus title={title} skill={skill.replace('skill: ', '')} count={done} countLabel={done}><span>How to play</span><span>Hint</span></PuzzleStatus>); });
  return screen!.root.find(n => n.type === 'div' && n.props.testID === 'puzzle-status');
};
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(async () => { if (screen) await act(async () => screen!.unmount()); screen = undefined; Object.assign(viewport, { width: 393, height: 852, fontScale: 3.12 }); vi.unstubAllGlobals(); });

it('the model reproduces the review\'s 94-pt status for the wrapping row Hint used to land on (the old styles), so it has teeth', () => {
  // The old row: a flex-shrinking sentence of its natural width, then the two buttons as siblings that wrap onto a second row.
  const row = { find: () => ({ props: { style: { flexShrink: 1 } } }), findAll: () => [] } as unknown as ReactTestInstance;
  expect(statusRowHeight(row, 476.4032, 694)).toBeCloseTo(94, 5);
  expect(statusRowHeight(row, 488.4672, 694)).toBeCloseTo(94, 5);
});

it.each(measured)('AX5 at 852 pt: "$text" keeps the buttons in their own column and the sentence wraps beside them (the row is at most two lines tall)', async ({ text, width }) => {
  const status = await mountStatus(852, 393, text);
  const line = status.find(n => n.type === 'p'), buttons = status.find(n => n.type === 'div' && n.props.testID === 'puzzle-status-buttons');
  expect(flat(line.props.style)).toEqual({ flex: 1, minWidth: 0 });
  expect(flat(buttons.props.style).flexShrink).toBe(0);
  expect(flat(status.props.style).flexWrap).toBeUndefined();
  const height = statusRowHeight(status, width, 852 - 2 * 59 - 40);
  expect(height).toBeLessThanOrEqual(2 * LINE);
  // The budget covers what the row takes: the same sentence, at its widest count, in the same safe width.
  const [title, skill] = text.split(' · ');
  expect(statusHeight(852, 59, statusSentence(title, skill.replace('skill: ', ''), '81/81'))).toBeGreaterThanOrEqual(height);
});

it('AX5 on a narrow window: the sentence is a full-width line and the buttons follow, as before', async () => {
  const status = await mountStatus(393, 852, measured[0].text);
  expect(flat(status.find(n => n.type === 'p').props.style)).toEqual({ width: '100%' });
  expect(flat(status.props.style).flexWrap).toBe('wrap');
  expect(status.findAll(n => n.props.testID === 'puzzle-status-buttons')).toHaveLength(0);
});

it('default size in a wide window: the status is the three facts in the row it always was', async () => {
  Object.assign(viewport, { fontScale: 1 });
  const status = await mountStatus(852, 393, measured[0].text);
  expect(flat(status.props.style)).toEqual({ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 6 });
  expect(status.findAll(n => n.type === 'p').map(textOf)).toEqual(['Full Cages 144', '· skill: Pointing and claiming', '· 0/81']);
  expect(status.findAll(n => n.props.testID === 'puzzle-status-buttons')).toHaveLength(0);
});

it('review2 P1-1: real Full Cages 144 at AX5 on the landscape iPhone 15 shows the status, the whole board and the pad\'s first row together', async () => {
  const fs = await import('node:fs');
  const tuple = JSON.parse(fs.readFileSync('src/content/puzzles/assets/p59.lipuzzle', 'utf8').split('\n')[144]);
  const { decodePuzzle } = await import('../src/puzzles/latin/core');
  const puzzle = decodePuzzle(tuple[3])!;
  expect(puzzle.kind).toBe('killer'); expect(puzzle.size).toBe(9); expect(tuple[7][0]).toBe('locked-candidates');
  const insets = { top: 0, bottom: 21, left: 59, right: 59 }, chrome = challengeChrome({ insets, barPinned: false, short: true, chip: true });
  const view = viewOf(puzzle, freshPayload(puzzle), 'Full Cages 144', tuple[7][0])!;
  Object.assign(viewport, { width: 852, height: 393, fontScale: 3.12 });
  await act(async () => { screen = create(<GridChromeContext.Provider value={chrome}><LatinBoard view={view} dispatch={() => {}} active width={812}/></GridChromeContext.Provider>); });
  const status = screen!.root.find(n => n.type === 'div' && n.props.testID === 'puzzle-status');
  expect(textOf(status.find(n => n.type === 'p' && n.props.testID === 'puzzle-status-line'))).toBe('Full Cages 144 · skill: Pointing and claiming · 0/81');
  const board = screen!.root.find(n => n.type === 'div' && n.props.style?.overflow === 'hidden' && n.props.style?.borderRadius === 8).props.style.height as number;
  const usable = 393 - insets.top - insets.bottom;
  // The registered first status and the two-digit playing one both fit with the whole board and the pad's first row, by their real (not optimistic) heights.
  for (const { width } of measured.slice(0, 2)) {
    const required = statusRowHeight(status, width, 852 - insets.left - insets.right - 40) + SECTION_GAP + board + PAD_GAP + PAD_ROW;
    expect(required, `${width}`).toBeLessThanOrEqual(usable);
  }
  // The budget agrees: the room it leaves is no taller than the board's own height plus the clue-free gutters.
  const room = boardRoom({ windowWidth: 852, windowHeight: 393, fontScale: 3.12, chrome, pad: true, sentence: statusSentence('Full Cages 144', 'Pointing and claiming', '81/81') })!;
  expect(board).toBeLessThanOrEqual(room + 0.5);
});
