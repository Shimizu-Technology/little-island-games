import type { Bounds } from "../scene/types";
export type Point = { x: number; y: number };
export type SupportPlane = Bounds & { base: number };
/** First contact with the drawn support footprint, including a release already
 * inside it. A scalar threshold makes the swap irreversible during the glide. */
export function supportEntry(from: Point, to: Point, footprint: Bounds): number {
  "worklet";
  let enter = 0, exit = 1;
  for (const [start, end, low, high] of [
    [from.x, to.x, footprint.left, footprint.left + footprint.width],
    [from.y, to.y, footprint.top, footprint.top + footprint.height],
  ]) {
    const d = end - start;
    if (Math.abs(d) < .0001) { if (start < low || start > high) return 1; continue; }
    const a = (low - start) / d, b = (high - start) / d;
    enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
  }
  return enter <= exit ? Math.max(0, Math.min(1, enter)) : 1;
}
/** Actor alpha is binary. Supports use the authored supported orientation from
 * the first contact frame; only free-floor art rotates around the moving head. */
export function poseHandoff(p: number, from: Point, to: Point, startHead: Point,
  head: Point, lowestLimb: number, angle: number, support?: SupportPlane) {
  "worklet";
  const swap = support ? supportEntry(from, to, support) : .35;
  const target = p >= swap;
  const x = (startHead.x - head.x) * (1 - p);
  let y = (startHead.y - head.y) * (1 - p);
  if (support && target) {
    // Authored limb hull, including shoes/stroke, rather than only a
    // foot joint. The front occluder still paints above the supported actor.
    const contactY = from.y + (to.y - from.y) * p;
    y = Math.min(y, support.base - contactY - lowestLimb);
  }
  return { carryOpacity: target ? 0 : 1, targetOpacity: target ? 1 : 0,
    x, y, rotation: support ? 0 : angle * (p - 1) };
}
