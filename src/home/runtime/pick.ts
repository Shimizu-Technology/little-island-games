import { shapeDistance } from "../scene/hitShapes";
import { paintDepth, paintEntries, restingVisible } from "./group";
import type { Bounds, HitShape, RoomPoint, Scene } from "../scene/types";
import { itemFrontShapes, unionBounds } from "../art/silhouettes";
export { shapeDistance, onShapes } from "../scene/hitShapes";
export type PickProxy = { id: string; shape: HitShape; depth: number; paintOrder: number; span: number };
function translated(shape: HitShape, x: number, y: number): HitShape {
  switch (shape.kind) {
    case "box":
      return { ...shape, left: shape.left + x, top: shape.top + y };
    case "ellipse":
      return { ...shape, x: shape.x + x, y: shape.y + y };
    case "capsule":
      return { ...shape, ax: shape.ax + x, ay: shape.ay + y, bx: shape.bx + x, by: shape.by + y };
    default:
      return { ...shape, points: shape.points.map((v, i) => v + (i % 2 ? y : x)) };
  }
}
/** Hull tables and paint order come from one place: what is drawn in front is what is touched. */
export function prepareHits(scene: Scene): Record<string, PickProxy[]> {
  return Object.fromEntries(
    Object.entries(scene.rooms).map(([room, index]) => [
      room,
      paintEntries(Object.values(index.entities).filter((e) => restingVisible(e, scene)), scene)
        .flatMap(({ entity: e, front }, paintOrder) => {
          const shapes: HitShape[] = front && e.item
            ? itemFrontShapes(e.item, e.bounds.width).map((s) => translated(s, e.contact.x, e.contact.y))
            : e.shapes?.length
              ? e.shapes.map((s) => translated(s, e.contact.x, e.contact.y))
              : index.hitProxies.filter((p) => p.id === e.id).map((p): HitShape => ({ kind: "box", ...p.bounds }));
          const outline: Bounds = unionBounds(shapes) ?? { left: 0, top: 0, width: 0, height: 0 };
          const depth = paintDepth(e, scene) + (front ? 2 : 0) - (e.item?.layer === "ground" ? 100000 : 0);
          return shapes.map((shape) => ({ id: e.id, shape, depth, paintOrder, span: Math.min(outline.width, outline.height) }));
        }),
    ])
  );
}
/**
 * The frontmost painted shape under the finger wins, and a prop only beats its neighbour on its
 * own paint. When that shape is something that stays put in Play, a nearby loose thing in front
 * of it may still take the touch through its 8 pt of forgiveness.
 */
export function pickEntity(proxies: readonly PickProxy[], point: RoomPoint, scale: number, movable?: Record<string, boolean>): string | undefined {
  "worklet";
  let exact: PickProxy | undefined;
  let near: PickProxy | undefined, nearDistance = Infinity;
  for (const p of proxies) {
    const distance = shapeDistance(p.shape, point.x, point.y);
    if (distance === 0) {
      if (!exact || p.paintOrder > exact.paintOrder) exact = p;
      continue;
    }
    if (movable && movable[p.id] === false) continue;
    const reach = Math.min(8 / scale, Math.max(0, 22 / scale - p.span / 2));
    if (distance > reach) continue;
    if (!near || distance < nearDistance || (distance === nearDistance && p.paintOrder > near.paintOrder)) {
      near = p;
      nearDistance = distance;
    }
  }
  if (exact && (!movable || movable[exact.id] !== false)) return exact.id;
  if (near && (!exact || near.paintOrder >= exact.paintOrder)) return near.id;
  return exact?.id;
}
