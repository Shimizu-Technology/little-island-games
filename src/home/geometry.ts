import type { Instance } from "./model";
export function floorPoint(x: number, y: number) {
  return { x: 174 + x * 51 + y * 14, y: 327 + y * 31 + x * 3 };
}
export function itemPoint(i: Instance) {
  return i.layer === "wall" ? { x: 205 + i.x * 46, y: 224 + i.y * 39 } : floorPoint(i.x, i.y);
}
/** Invert the room projection. Coordinates are local to the measured canvas, not the SVG hit target. */
export function spotFromPoint(localX: number, localY: number, scale: number, wall: boolean) {
  if (![localX, localY, scale].every(Number.isFinite) || scale <= 0) return undefined;
  const px = localX / scale,
    py = localY / scale;
  if (wall)
    return {
      x: Math.max(0, Math.min(7, Math.round((px - 205) / 46))),
      y: Math.max(0, Math.min(1, Math.round((py - 224) / 39))),
    };
  const y = Math.max(0, Math.min(5, Math.round((py - 327 - ((px - 174) * 3) / 51) / (31 - (14 * 3) / 51))));
  return { x: Math.max(0, Math.min(9, Math.round((px - 174 - y * 14) / 51))), y };
}
