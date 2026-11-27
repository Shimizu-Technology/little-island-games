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
  expect(journey.visit('cove', false)).toBe(true); vi.runAllTimers(); expect(open).toHaveBeenLastCalledWith('cove');
 });
});
describe('map target geometry', () => {
 it.each([
  [195,590,1],[320,568,1],[320,568,1.5],[320,568,2],[320,590,1],
  [390,590,1],[390,710,1],[390,844,1],[390,844,1.5],[390,844,2],
  [430,798,1],[744,999,1],
  [844,390,1],[844,390,1.5],[844,390,2],
  [1024,768,1],[1024,768,1.5],[1024,768,2],
  [1100,590,1],[1100,610,1],[390,1240,2],[320,1550,2.5],
 ])('separates all six illustrated targets with zero overlap at %s×%s / font scale %s', (width,height,scale) => {
  const { wide, targets } = mapLayout(width,height,scale);
  expect(targets.map(t => t.id)).toEqual(['school','library','arcade','hall','home','cove']);
  expect(wide).toBe(width > height * 1.15);
  const distinctRows = new Set(targets.map(t => Math.round(t.top)));
  expect(distinctRows.size).toBe(wide ? 2 : 3);
  for (const a of targets) {
   expect(a.left).toBeGreaterThanOrEqual(0); expect(a.top).toBeGreaterThanOrEqual(0);
   expect(a.left+a.width).toBeLessThanOrEqual(width); expect(a.top+a.height).toBeLessThanOrEqual(height);
   expect(a.width).toBeGreaterThanOrEqual(44); expect(a.height).toBeGreaterThanOrEqual(44);
   for (const b of targets.filter(b => b.id !== a.id)) expect(a.left < b.left+b.width && b.left < a.left+a.width && a.top < b.top+b.height && b.top < a.top+a.height).toBe(false);
  }
 });
});

describe('compact painted scene acceptance', () => {
 it.each([[320,378],[844,250],[390,654],[1024,628]])('fits all six cottage and label bounds at %s×%s', (width, height) => {
  const layout = mapLayout(width, height);
  for (const a of layout.targets) {
   expect(a.top).toBeGreaterThanOrEqual(0);
   expect(a.top + a.height).toBeLessThanOrEqual(height);
   for (const b of layout.targets.filter(b => b.id !== a.id)) {
    expect(a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height).toBe(false);
   }
  }
 });
 it('keeps bold landmark art (>= 110pt) and hero guide scale (>= 60pt) on iPhone portrait 390×844 and its HubScreen scene 390×654 with zero overlap', () => {
  for (const [width, height] of [[390, 844], [390, 654]] as const) {
   const layout = mapLayout(width, height);
   expect(layout.artWidth, `${width}×${height} artWidth`).toBeGreaterThanOrEqual(110);
   expect(layout.guideSize, `${width}×${height} guideSize`).toBeGreaterThanOrEqual(60);
   expect(layout.labelHeight, `${width}×${height} labelHeight`).toBe(34);
   for (const a of layout.targets) {
    for (const b of layout.targets.filter(b => b.id !== a.id)) {
     const artOverlap = a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
     expect(artOverlap, `${width}×${height} building overlap ${a.id}/${b.id}`).toBe(false);
     const lblH = Math.min(a.x * width + a.labelWidth / 2, b.x * width + b.labelWidth / 2) - Math.max(a.x * width - a.labelWidth / 2, b.x * width - b.labelWidth / 2);
     const lblV = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.baseline, b.baseline);
     expect(Math.max(0, lblH) * Math.max(0, lblV), `${width}×${height} label overlap ${a.id}/${b.id}`).toBe(0);
    }
   }
  }
 });
});
