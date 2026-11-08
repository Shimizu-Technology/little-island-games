import { paintDepth, restingVisible } from "./group";
import type { Bounds, HitShape, RoomPoint, Scene } from "../scene/types";
import { unionBounds } from "../art/silhouettes";
export type PickProxy = { id: string; shape: HitShape; depth: number; span: number };
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
      [...new Set(index.hitProxies.map((proxy) => proxy.id))]
        .filter((id) => scene.entities[id] && restingVisible(scene.entities[id], scene))
        .flatMap((id) => {
          const e = scene.entities[id];
          const shapes: HitShape[] = e.shapes?.length
            ? e.shapes.map((s) => translated(s, e.contact.x, e.contact.y))
            : index.hitProxies.filter((p) => p.id === id).map((p): HitShape => ({ kind: "box", ...p.bounds }));
          const outline: Bounds = unionBounds(shapes) ?? { left: 0, top: 0, width: 0, height: 0 };
          // Ground art always paints first, whatever its floor row, so it can never be in front.
          const depth = paintDepth(e, scene) - (e.item?.layer === "ground" ? 100000 : 0);
          return shapes.map((shape) => ({ id, shape, depth, span: Math.min(outline.width, outline.height) }));
        }),
    ])
  );
}
/** Room-unit distance from a point to a painted shape. Zero means the point is on it. */
export function shapeDistance(shape: HitShape, x: number, y: number): number {
  "worklet";
  switch (shape.kind) {
    case "box":
      return Math.hypot(Math.max(shape.left - x, 0, x - shape.left - shape.width), Math.max(shape.top - y, 0, y - shape.top - shape.height));
    case "ellipse": {
      const px = x - shape.x, py = y - shape.y, k = Math.sqrt((px / shape.rx) ** 2 + (py / shape.ry) ** 2);
      return k <= 1 ? 0 : (1 - 1 / k) * Math.hypot(px, py);
    }
    case "capsule": {
      const vx = shape.bx - shape.ax, vy = shape.by - shape.ay, length = vx * vx + vy * vy;
      const t = length ? Math.max(0, Math.min(1, ((x - shape.ax) * vx + (y - shape.ay) * vy) / length)) : 0;
      return Math.max(0, Math.hypot(x - shape.ax - vx * t, y - shape.ay - vy * t) - shape.r);
    }
    default: {
      const n = shape.points.length / 2;
      let positive = false, negative = false, nearest = Infinity;
      for (let i = 0; i < n; i++) {
        const ax = shape.points[i * 2], ay = shape.points[i * 2 + 1];
        const bx = shape.points[((i + 1) % n) * 2], by = shape.points[((i + 1) % n) * 2 + 1];
        const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
        if (cross > 0) positive = true;
        if (cross < 0) negative = true;
        const vx = bx - ax, vy = by - ay, length = vx * vx + vy * vy;
        const t = length ? Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / length)) : 0;
        nearest = Math.min(nearest, Math.hypot(x - ax - vx * t, y - ay - vy * t));
      }
      return positive && negative ? nearest : 0;
    }
  }
}
/**
 * The frontmost painted shape under the finger wins, and a prop only beats its neighbour on its
 * own paint. When that shape is something that stays put in Play, a nearby loose thing in front
 * of it may still take the touch through its 8 pt of forgiveness.
 */
export function pickEntity(proxies: readonly PickProxy[], point: RoomPoint, scale: number, movable?: Record<string, boolean>): string | undefined {
  "worklet";
  let exact: PickProxy | undefined, exactDistance = Infinity;
  let near: PickProxy | undefined, nearDistance = Infinity;
  for (const p of proxies) {
    const distance = shapeDistance(p.shape, point.x, point.y);
    if (distance === 0) {
      const box = p.shape.kind === "ellipse" ? { x: p.shape.x, y: p.shape.y } : p.shape.kind === "capsule" ? { x: (p.shape.ax + p.shape.bx) / 2, y: (p.shape.ay + p.shape.by) / 2 } : undefined;
      const middle = box ? Math.hypot(point.x - box.x, point.y - box.y) : 0;
      if (!exact || p.depth > exact.depth || (p.depth === exact.depth && (middle < exactDistance || (middle === exactDistance && p.id < exact.id)))) {
        exact = p;
        exactDistance = middle;
      }
      continue;
    }
    if (movable && movable[p.id] === false) continue;
    const reach = Math.min(8 / scale, Math.max(0, 22 / scale - p.span / 2));
    if (distance > reach) continue;
    if (!near || distance < nearDistance || (distance === nearDistance && (p.depth > near.depth || (p.depth === near.depth && p.id < near.id)))) {
      near = p;
      nearDistance = distance;
    }
  }
  if (exact && (!movable || movable[exact.id] !== false)) return exact.id;
  if (near && (!exact || near.depth >= exact.depth)) return near.id;
  return exact?.id;
}
/** True when a point is on any of an entity's painted shapes, offset to where it is drawn now. */
export function onShapes(shapes: readonly HitShape[], x: number, y: number): boolean {
  "worklet";
  for (const shape of shapes) if (shapeDistance(shape, x, y) === 0) return true;
  return false;
}
