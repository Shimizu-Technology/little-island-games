/** Pure proofs about what a program draws: where it ends, whether it closes, and whether it fits the sand canvas. */
import type { Point, Segment } from './engine';
/** The grid's drawn area (viewBox -50 -55 400 320, grid lines -40..340 by -50..250). Lines keep 4 units clear of the edge. */
export const CANVAS = { left: -40, top: -45, right: 340, bottom: 250 } as const;
export const MARGIN = 4;
export const START: Point = { x: 100, y: 80 };
export type Box = { left: number; top: number; right: number; bottom: number };
export function bounds(lines: readonly Segment[]): Box | null {
  if (!lines.length) return null;
  const xs = lines.flatMap(l => [l.from.x, l.to.x]), ys = lines.flatMap(l => [l.from.y, l.to.y]);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}
export const fits = (lines: readonly Segment[], margin = MARGIN): boolean => {
  const box = bounds(lines);
  return !!box && box.left >= CANVAS.left + margin && box.right <= CANVAS.right - margin && box.top >= CANVAS.top + margin && box.bottom <= CANVAS.bottom - margin;
};
const close = (a: Point, b: Point, tolerance = 0.6) => Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
/** The pen ends where it began. Rounded steps drift a little, so the check is a tolerance, not equality. */
export const closes = (lines: readonly Segment[]): boolean => lines.length > 1 && close(lines[0].from, lines[lines.length - 1].to);
/** Position the picture on grid crossings (multiples of 10) so it sits as centred as the canvas allows. */
export function centredOrigin(lines: readonly Segment[], from: Point = START): Point | null {
  const box = bounds(lines);
  if (!box) return null;
  const width = box.right - box.left, height = box.bottom - box.top;
  const room = { x: CANVAS.right - CANVAS.left - 2 * MARGIN, y: CANVAS.bottom - CANVAS.top - 2 * MARGIN };
  if (width > room.x || height > room.y) return null;
  // Where the box's left/top sit relative to the start: slide it so its middle meets the canvas middle.
  const wantLeft = (CANVAS.left + CANVAS.right) / 2 - width / 2, wantTop = (CANVAS.top + CANVAS.bottom) / 2 - height / 2;
  const shiftX = wantLeft - box.left, shiftY = wantTop - box.top;
  let best: { point: Point; score: number } | null = null;
  const base = { x: Math.round((from.x + shiftX) / 10) * 10, y: Math.round((from.y + shiftY) / 10) * 10 };
  for (let dx = -30; dx <= 30; dx += 10) for (let dy = -30; dy <= 30; dy += 10) {
    const point = { x: base.x + dx, y: base.y + dy }, move = { x: point.x - from.x, y: point.y - from.y };
    const left = box.left + move.x, right = box.right + move.x, top = box.top + move.y, bottom = box.bottom + move.y;
    if (left < CANVAS.left + MARGIN || right > CANVAS.right - MARGIN || top < CANVAS.top + MARGIN || bottom > CANVAS.bottom - MARGIN) continue;
    const score = Math.abs((left + right) / 2 - (CANVAS.left + CANVAS.right) / 2) + Math.abs((top + bottom) / 2 - (CANVAS.top + CANVAS.bottom) / 2);
    if (!best || score < best.score) best = { point, score };
  }
  return best?.point ?? null;
}
/** Every line, both directions the same, in a stable order. Colour never changes the geometry. */
const canonical = (lines: readonly Segment[]) => {
  const key = (p: Point) => `${Math.round(p.x)},${Math.round(p.y)}`;
  return [...new Set(lines.map(l => [key(l.from), key(l.to)].sort().join('>')))].sort();
};
export const geometryKey = (lines: readonly Segment[]): string => canonical(lines).join('|');
/** The same picture however it was drawn: drawing a shape twice, or in the other direction, changes nothing. */
export function samePicture(a: readonly Segment[], b: readonly Segment[], tolerance = 0.6): boolean {
  const near = (p: Point, q: Point) => Math.abs(p.x - q.x) <= tolerance && Math.abs(p.y - q.y) <= tolerance;
  const has = (list: readonly Segment[], s: Segment) => list.some(t => near(s.from, t.from) && near(s.to, t.to) || near(s.from, t.to) && near(s.to, t.from));
  return a.every(s => has(b, s)) && b.every(s => has(a, s));
}
export const distinctLines = (lines: readonly Segment[]): number => canonical(lines).length;
/** How far apart two pictures look: the largest distance from a point on either to the nearest point on the other (a Hausdorff distance on points every 5 units). */
export function pictureGap(a: readonly Segment[], b: readonly Segment[]): number {
  const points = (lines: readonly Segment[]): Point[] => lines.flatMap(l => { const n = Math.max(1, Math.ceil(Math.hypot(l.to.x - l.from.x, l.to.y - l.from.y) / 5)); return Array.from({ length: n + 1 }, (_, i) => ({ x: l.from.x + (l.to.x - l.from.x) * i / n, y: l.from.y + (l.to.y - l.from.y) * i / n })); });
  const pa = points(a), pb = points(b);
  const reach = (from: Point[], to: Point[]) => Math.max(...from.map(p => Math.min(...to.map(q => Math.hypot(p.x - q.x, p.y - q.y)))));
  return Math.max(reach(pa, pb), reach(pb, pa));
}
