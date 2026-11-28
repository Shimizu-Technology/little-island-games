import { expect, it } from 'vitest';
import { cardDragRegions } from '../src/puzzles/table/dragRegions';
it('only exposed movable card areas claim drags; covered cards, invalid runs, stock and empty places can scroll', () => {
  const places = [
    { pile: 0, index: 0, card: 1, covered: true, x: 10, y: 100 },
    { pile: 0, index: 1, card: 2, covered: false, x: 10, y: 130 },
    { pile: 0, index: 2, card: 3, covered: false, x: 10, y: 160 },
    { pile: 1, index: 0, card: 4, covered: false, x: 90, y: 100 },
    { pile: 12, index: 0, card: null, covered: true, x: 170, y: 4 },
    { pile: 2, index: 0, card: null, covered: false, x: 250, y: 100 },
  ];
  expect(cardDragRegions(places, 60, 90, p => p.pile !== 1)).toEqual([
    { left: 8, top: 130, width: 64, height: 30 },
    { left: 8, top: 160, width: 64, height: 90 },
  ]);
});
