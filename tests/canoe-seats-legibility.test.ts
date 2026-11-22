import { describe, expect, it } from 'vitest';
import { fitSchoolBoard, SCHOOL_BOARD_MIN } from '../src/learn/boardGeometry';
import { canoeHeight, canoeWidth, SEAT_FLOOR_PHONE, SEAT_FLOOR_TABLET, seatFloor, seatForHeight, seatForWidth } from '../src/learn/games/canoe-seats/layout';

/** Board widths the School frame gives (window width minus 56, and the iPad Islander column). */
const screens = [
  { name: 'iPhone 15 portrait', window: 393, height: 852, board: 393 - 56 },
  { name: 'iPad mini portrait', window: 744, height: 1133, board: 744 - 56 - 88 },
];
describe('Canoe Seats seat pictures stay legible at the floor', () => {
  it('records the phone floor for a one-row School canoe', () => {
    expect(SCHOOL_BOARD_MIN['canoe-seats']).toBe(canoeHeight(SEAT_FLOOR_PHONE, 1));
  });
  for (const s of screens) for (const large of [false, true]) {
    it(`${s.name}, ${large ? 'AX5' : 'default text'}: every rung keeps seats at or above ${s.window >= 600 ? 64 : 56} pt and fits the width`, () => {
      const floor = seatFloor(s.window);
      expect(floor).toBe(s.window >= 600 ? SEAT_FLOOR_TABLET : SEAT_FLOOR_PHONE);
      for (const [n, attrs] of [[2, 1], [3, 1], [4, 1], [5, 1], [4, 2], [5, 2], [5, 3]]) {
        // An impossible screen: chrome takes everything. The drawing keeps its floor and overflows (scrolls) instead.
        const fit = fitSchoolBoard({ width: s.board, height: 120, large }, canoeHeight(seatForWidth(s.board, n, s.window), attrs), canoeHeight(floor, attrs), 900);
        const seat = Math.min(seatForWidth(s.board, n, s.window), seatForHeight(fit.height, attrs, s.window));
        expect(seat).toBeGreaterThanOrEqual(floor);
        expect(canoeWidth(seat, n)).toBeLessThanOrEqual(s.board);
        expect(fit.fits).toBe(false);
      }
    });
  }
});
describe('clue paging on a phone', () => {
  it('keeps Check in view by paging hats and fruit, more tightly at the largest text', async () => {
    const { cluePages, cluePageSize } = await import('../src/learn/games/canoe-seats/layout');
    expect(cluePages(5, 337, 1)).toBe(1);
    expect(cluePageSize(337, 3, 13)).toBe(6);
    expect(cluePages(13, 337, 3)).toBe(3);
    expect(cluePageSize(337, 3, 13, true)).toBe(4);
    expect(cluePages(13, 600, 3, true)).toBe(1);
  });
});
