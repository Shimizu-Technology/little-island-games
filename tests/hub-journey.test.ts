import { afterEach, describe, expect, it, vi } from 'vitest';
import { createJourney, mapLayout, WALK_MS, ZOOM_MS } from '../src/hub/model';
afterEach(() => vi.useRealTimers());
describe('interruptible guide journey', () => {
 it('opens one destination after a bounded walk and door zoom', () => {
  vi.useFakeTimers(); const open = vi.fn(), journey = createJourney(open);
  expect(journey.visit('school', false)).toBe(true);
  vi.advanceTimersByTime(WALK_MS); expect(open).not.toHaveBeenCalled();
  vi.advanceTimersByTime(ZOOM_MS); expect(open.mock.calls).toEqual([['school']]);
  expect(WALK_MS+ZOOM_MS).toBeLessThanOrEqual(600);
 });
 it.each(['school','home'] as const)('second tap immediately opens %s and cancels stale completion', place => {
  vi.useFakeTimers(); const open = vi.fn(), journey = createJourney(open);
  journey.visit('school', false); vi.advanceTimersByTime(100);
  expect(journey.visit(place, false)).toBe(false);
  expect(open.mock.calls).toEqual([[place]]);
  vi.runAllTimers(); expect(open).toHaveBeenCalledTimes(1);
 });
 it('Reduce Motion opens immediately; canceled travel never navigates', () => {
  vi.useFakeTimers(); const open = vi.fn(), journey = createJourney(open);
  expect(journey.visit('library', true)).toBe(false); expect(open).toHaveBeenCalledWith('library');
  journey.visit('school', false); journey.cancel(); vi.runAllTimers(); expect(open).toHaveBeenCalledTimes(1);
  expect(journey.visit('locker', false)).toBe(true); vi.runAllTimers(); expect(open).toHaveBeenLastCalledWith('locker');
 });
});
describe('map target geometry', () => {
 it.each([[195,590,1],[320,590,1],[390,590,1],[1100,590,1],[390,710,1],[430,798,1],[744,999,1],[1100,610,1],[390,1240,2],[320,1550,2.5]])('separates eight full targets at %s×%s / font scale %s', (width,height,scale) => {
  const { targets } = mapLayout(width,height,scale);
  for (const a of targets) {
   expect(a.left).toBeGreaterThanOrEqual(0); expect(a.top).toBeGreaterThanOrEqual(0);
   expect(a.left+a.width).toBeLessThanOrEqual(width); expect(a.top+a.height).toBeLessThanOrEqual(height);
   expect(a.width).toBeGreaterThanOrEqual(44); expect(a.height).toBeGreaterThanOrEqual(44);
   for (const b of targets.filter(b => b.id !== a.id)) expect(a.left < b.left+b.width && b.left < a.left+a.width && a.top < b.top+b.height && b.top < a.top+a.height).toBe(false);
  }
 });
});
