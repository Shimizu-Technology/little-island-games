import { describe, expect, it } from 'vitest';
import { BUTTON_ROW, PAD_ROW } from '../src/puzzles/grid/budget';
import { fitSchoolBoard, measuredBoardSpace, SCHOOL_BOARD_MIN, type BoardSpace, type SchoolBoard } from '../src/learn/boardGeometry';

// Synthetic layout inputs, not native evidence. The frame measures these numbers at
// runtime; the same budget must accept different headers, plans and text wrapping.
const devices = [
  { name: 'iPhone 15 portrait', width: 393, height: 852, top: 59, bottom: 34 },
  { name: 'SE portrait', width: 375, height: 667, top: 20, bottom: 0 },
  { name: 'mini portrait', width: 744, height: 1133, top: 24, bottom: 20 },
  { name: 'mini landscape', width: 1133, height: 744, top: 24, bottom: 20 },
  { name: 'iPhone 15 landscape', width: 852, height: 393, top: 0, bottom: 21 },
];
const boards: { id: SchoolBoard; natural: number; minimum: number; target: number; primary: string }[] = [
  { id: 'crab-commands', natural: 280, minimum: 150, target: 44, primary: 'Go, Clear, Hint; filled plan and command row' },
  { id: 'beep-bot', natural: 200, minimum: 100, target: 48, primary: 'Go beside map, plan, arrow keys' },
  { id: 'hafa-adai', natural: 360, minimum: 3 * 44 + 44, target: 44, primary: 'Picture choices and Hear' },
  { id: 'reef-race', natural: 480, minimum: 260, target: 44, primary: 'Spinner and path stones' },
  { id: 'weather-watch', natural: 220, minimum: 100, target: 44, primary: 'Model choices and Test model' },
  { id: 'shell-math', natural: 180, minimum: 104, target: 44, primary: 'Touch frames or first keypad row' },
  { id: 'tide-pool', natural: 220, minimum: 90, target: 44, primary: 'Watch and choice tiles' },
  { id: 'float-sink', natural: 150, minimum: 100, target: 44, primary: 'Prediction and Test' },
  { id: 'tide-logic', natural: 64, minimum: 24, target: 44, primary: 'Rule choices and Run the belt' },
  { id: 'logic-lagoon', natural: 246, minimum: (44 + 2) * 4 + 14, target: 44, primary: 'Grid cells and values' },
  { id: 'slip-tide', natural: 320, minimum: 6 * 24 + 12, target: 54, primary: 'Swipe surface and direction arrows' },
  { id: 'treasure-algebra', natural: 330, minimum: 140, target: 48, primary: 'Step choices and Open chest' },
  { id: 'program-editor', natural: 340, minimum: 140, target: 44, primary: 'Plan drop targets, tools and external Go' },
];
for (const board of boards) describe(`${board.id}: ${board.primary}`, () => {
  it.each(devices.flatMap(device => [false, true].map(large => ({ ...device, large }))))('$name large=$large reserves the primary action and reports an impossible floor', device => {
    const viewport = device.height - device.top - device.bottom - (device.width < 600 ? 76 : 0);
    const height = measuredBoardSpace(viewport, device.large ? 8 : 80, device.large ? 0 : 14, 14);
    const space: BoardSpace = { width: device.width - 60, height, large: device.large };
    // Exercise wrapping and growing plans with three different *measured* chrome
    // heights. Include the immutable shared 44-pt action / 56-pt keypad budget.
    for (const chrome of [BUTTON_ROW + 24, PAD_ROW + (device.large ? 160 : 100), 420]) {
      const result = fitSchoolBoard(space, board.natural, board.minimum, chrome);
      expect(result.height).toBeGreaterThanOrEqual(board.minimum);
      expect(board.target).toBeGreaterThanOrEqual(44);
      if (board.minimum + chrome <= space.height) {
        expect(result.height + chrome).toBeLessThanOrEqual(space.height);
        expect(result.fits).toBe(true);
      } else {
        expect(result.height).toBe(board.minimum);
        expect(result.overflow).toBe(board.minimum + chrome - space.height);
        expect(result.fits).toBe(false);
      }
    }
  });
  it('retains the current dimensions when there is no provider', () => {
    expect(fitSchoolBoard(null, board.natural, board.minimum, 900).height).toBe(board.natural);
  });
});
it('ports every named School drawing without changing the Challenge budget', () => {
  expect(boards.map(b => b.id).sort()).toEqual(Object.keys(SCHOOL_BOARD_MIN).sort());
  expect(BUTTON_ROW).toBe(44); expect(PAD_ROW).toBe(56);
});
it('Crab regression: a filled plan pushes the 280-pt legacy beach past a 500-pt board space', () => {
  const space = { width: 333, height: 500, large: false }, measuredChrome = 288;
  const legacy = Math.min(333, 759 < 740 ? 200 : 280);
  expect(legacy + measuredChrome).toBeGreaterThan(space.height);
  const after = fitSchoolBoard(space, legacy, SCHOOL_BOARD_MIN['crab-commands'], measuredChrome);
  expect(after.height).toBe(212);
  expect(after.height + measuredChrome).toBeLessThanOrEqual(space.height);
});
it('uses real viewport, board position, card inset and bottom padding once each', () => {
  expect(measuredBoardSpace(700, 70, 14, 14)).toBe(602);
  expect(measuredBoardSpace(300, 400, 14, 14)).toBe(0);
});

it('the lead-approved landscape threshold is strict: 499 reveals, 500 does not', async () => {
  const { revealBoardOnEntry } = await import('../src/learn/boardGeometry');
  expect(revealBoardOnEntry(false, 499)).toBe(true);
  expect(revealBoardOnEntry(false, 500)).toBe(false);
  expect(revealBoardOnEntry(false, 744)).toBe(false);
  expect(revealBoardOnEntry(false, 852)).toBe(false);
  expect(revealBoardOnEntry(true, 500)).toBe(true);
  expect(revealBoardOnEntry(true, 852)).toBe(true);
});
