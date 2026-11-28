import type { DragRegion } from '../../gestures/BoardPan';
type Place = { pile: number; index: number; card: number | null; covered: boolean; x: number; y: number };
/** Only exposed movable card art owns a native drag. Covered cards, stock and empty
 * places retain tap controls but leave touch scrolling to the enclosing table. */
export function cardDragRegions(places: readonly Place[], width: number, height: number, movable: (place: Place) => boolean): DragRegion[] {
  return places.flatMap((p, i) => {
    if (p.covered || p.card === null || !movable(p)) return [];
    const next = places.slice(i + 1).find(q => q.pile === p.pile);
    const visible = next ? Math.min(height, next.y - p.y) : height;
    return visible > 0 ? [{ left: p.x - 2, top: p.y, width: width + 4, height: visible }] : [];
  });
}
