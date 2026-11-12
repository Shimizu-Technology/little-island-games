/** Page coordinates of a touch event: the changed touch on a release, the event itself otherwise. */
type TouchEvent = { nativeEvent?: { pageX?: number; pageY?: number; changedTouches?: readonly { pageX?: number; pageY?: number }[] } };
export type TouchStart = { px?: number; py?: number };
const pageOf = (e: TouchEvent) => { const t = e.nativeEvent?.changedTouches?.[0] ?? e.nativeEvent; return Number.isFinite(t?.pageX) && Number.isFinite(t?.pageY) ? { x: t!.pageX!, y: t!.pageY! } : null; };
/** Where a finger went down, in page coordinates, for `releaseOffset`. */
export const startOf = (e: TouchEvent): TouchStart => { const p = pageOf(e); return p ? { px: p.x, py: p.y } : {}; };
/**
 * How far a finger had moved when it let go. React Native's PanResponder hands release the gesture
 * state of the last MOVE sample (it never updates it from the release), so a fast stroke's final
 * stretch would be lost. The release event's own touch says where the finger actually stopped.
 */
export function releaseOffset(e: TouchEvent, start: TouchStart, g: { dx: number; dy: number }): { dx: number; dy: number } {
  const p = pageOf(e);
  return p && start.px !== undefined && start.py !== undefined ? { dx: p.x - start.px, dy: p.y - start.py } : { dx: g.dx, dy: g.dy };
}
