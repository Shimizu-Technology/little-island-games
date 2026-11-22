import { expect, it } from 'vitest';
import { COMPANION_COLUMN, boardCardInner, cheerPillClear, companionBeside, layoutMatchesWindow } from '../src/learn/boardGeometry';

// The card as LearnFrame lays it out (tests/f-frame3-space.test.tsx checks the styles): 16-pt gutters, a 2-pt border,
// 12/22-pt padding, and on a wide tablet the islander column beside it.
const inner = (width: number, left: number, right: number, beside: boolean) =>
  Math.min(width - left - right, 1280) - 32 - 4 - (width < 600 ? 24 : 44) - (beside ? 168 * 80 / 132 + 8 : 0);

it('the companion column is the islander column Companion.tsx draws beside the card', () => {
  expect(COMPANION_COLUMN).toBeCloseTo(168 * 80 / 132 + 8, 9);
  expect([companionBeside(744, 1133), companionBeside(768, 1024), companionBeside(1133, 744), companionBeside(852, 393)]).toEqual([false, true, true, false]);
});

it.each([
  ['iPhone SE', 375, 667, 0, 0, 315], ['iPhone 15', 393, 852, 0, 0, 333], ['iPhone 15 Pro Max', 440, 956, 0, 0, 380],
  ['iPhone 15 landscape', 852, 393, 59, 59, 654], ['iPad mini', 744, 1133, 0, 0, 664], ['iPad 10th gen', 820, 1180, 0, 0, inner(820, 0, 0, true)],
  ['iPad mini landscape', 1133, 744, 0, 0, inner(1133, 0, 0, true)], ['iPad Pro 13 landscape', 1376, 1032, 0, 0, 1280 - 80 - COMPANION_COLUMN],
] as const)('%s: the card content width', (_, width, height, left, right, expected) => {
  const beside = companionBeside(width, height);
  expect(boardCardInner(width, left, right, beside)).toBeCloseTo(expected, 9);
  expect(boardCardInner(width, left, right, beside)).toBeCloseTo(inner(width, left, right, beside), 9);
  // With the islander turned off the card takes the whole row.
  expect(boardCardInner(width, left, right, false)).toBeCloseTo(inner(width, left, right, false), 9);
});

// F-frame-3 fix 1: a layout belongs to the current window only when its viewport is as wide as the window less the safe-area sides.
it.each([
  [393, 393, 0, 0, true], [393, 852, 0, 0, false], [734, 852, 59, 59, true], [852, 852, 59, 59, false], [744, 1133, 0, 0, false], [1133, 1133, 0, 0, true], [0, 393, 0, 0, false],
])('a %s-pt viewport layout in a %s-pt window (insets %s, %s) is fresh: %s', (layout, window, left, right, fresh) => {
  expect(layoutMatchesWindow(layout, window, left, right)).toBe(fresh);
});

// The cheer line sits at the bottom-right corner of its row. Boxes are in the row's coordinates.
const ROW = { width: 361, height: 22 };
it('a short mode label leaves the corner clear', () => {
  // "On my own" at the default size, and the 136-pt "You got it!" pill.
  expect(cheerPillClear(ROW, [{ x: 0, y: 0, width: 92, height: 22 }], { width: 136, height: 29 })).toBe(true);
});
it("Slip Tide's long mode label (about 260 pt at AX) is not covered by the pill, whose 136-155 pt would overlap it by 35-54 pt", () => {
  const mode = { x: 0, y: 0, width: 260, height: 22 };
  expect(cheerPillClear(ROW, [mode], { width: 136, height: 29 })).toBe(false);
  expect(cheerPillClear(ROW, [mode], { width: 155, height: 29 })).toBe(false);
});
it('a wrapped row clears a pill that rises above a short last line only where the line above is clear', () => {
  const row = { width: 361, height: 70 };
  const mode = { x: 0, y: 48, width: 120, height: 22 };
  // A maximum-length learner chip fills the first line, so a 29-pt pill rising over the 22-pt mode line would cover its end
  // when the chip is taller than the gap above the pill (6 pt of clearance included).
  expect(cheerPillClear(row, [{ x: 0, y: 0, width: 361, height: 30 }, mode], { width: 136, height: 29 })).toBe(true);
  expect(cheerPillClear(row, [{ x: 0, y: 0, width: 361, height: 40 }, mode], { width: 136, height: 29 })).toBe(false);
  // A chip that stops short of the pill's column does not matter.
  expect(cheerPillClear(row, [{ x: 0, y: 0, width: 200, height: 52 }, mode], { width: 136, height: 29 })).toBe(true);
});
it('an unmeasured row, box or pill is never clear, and a pill wider than its row is not drawn', () => {
  const mode = { x: 0, y: 0, width: 92, height: 22 };
  expect(cheerPillClear(null, [mode], { width: 136, height: 29 })).toBe(false);
  expect(cheerPillClear(ROW, [mode], null)).toBe(false);
  expect(cheerPillClear(ROW, [null], { width: 136, height: 29 })).toBe(false);
  expect(cheerPillClear({ width: 120, height: 22 }, [mode], { width: 136, height: 29 })).toBe(false);
});
