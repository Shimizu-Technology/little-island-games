import type { HitShape } from "./types";
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
/** True when a point is on any of an entity's painted shapes, offset to where it is drawn now. */
export function onShapes(shapes: readonly HitShape[], x: number, y: number): boolean {
  "worklet";
  for (const shape of shapes) if (shapeDistance(shape, x, y) === 0) return true;
  return false;
}
