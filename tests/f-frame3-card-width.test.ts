import { expect, it } from 'vitest';
import { COMPANION_COLUMN, boardCardInner, companionBeside } from '../src/learn/boardGeometry';

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
