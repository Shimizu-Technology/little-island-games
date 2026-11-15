export type Rect = { x: number; y: number; width: number; height: number };
/** Only the visible part of a slot can receive a drop. A hidden slot has no hit rectangle. */
export function clipped(rect: Rect, viewport: Rect | null): Rect | null {
  if (!viewport) return null;
  const x = Math.max(rect.x, viewport.x), y = Math.max(rect.y, viewport.y);
  const width = Math.min(rect.x + rect.width, viewport.x + viewport.width) - x;
  const height = Math.min(rect.y + rect.height, viewport.y + viewport.height) - y;
  return width > 0 && height > 0 ? { x, y, width, height } : null;
}
export function edgeScroll(y: number, viewport: Rect): number {
  if (y < viewport.y || y > viewport.y + viewport.height) return 0;
  return y < viewport.y + 32 ? -12 : y > viewport.y + viewport.height - 32 ? 12 : 0;
}
