import type { Instance } from "./model";
export function floorPoint(x: number, y: number) {
  return { x: 174 + x * 51 + y * 14, y: 327 + y * 31 + x * 3 };
}
export function itemPoint(i: Instance) {
  return i.layer === "wall" ? { x: 205 + i.x * 46, y: 224 + i.y * 39 } : floorPoint(i.x, i.y);
}
/** Invert the room projection. Coordinates are local to the measured canvas, not the SVG hit target. */
export function spotFromPoint(localX: number, localY: number, scale: number, wall: boolean) {
  "worklet";
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

export function itemSize(i: Instance) {
  return i.item === "bed"
    ? 215
    : ["rug", "mat"].includes(i.item)
      ? 210
      : i.layer === "wall"
        ? 64
        : ["table", "shelf", "books", "trophies", "aquarium", "checkers", "toy-box", "beanbag"].includes(i.item)
          ? 145
          : 112;
}
export function characterPoint(state: import("./model").HomeState, c: import("./model").Character) {
  if (c.anchor.startsWith("beach-")) return { x: c.anchor === "beach-left" ? 210 : c.anchor === "beach-middle" ? 400 : 590, y: 650 };
  if (c.anchor === "floor") return floorPoint(c.x!, c.y!);
  const seat = state.instances.find((i) => (c.seatId ? i.id === c.seatId : i.item === c.anchor));
  if (seat) {
    const p = itemPoint(seat);
    // The enlarged seated Islander's hip is ~47 scene units above its box foot.
    // Match the illustrated seat surface; sidekicks retain their bottom contact.
    const seatedFoot = c.slot === 0 ? ({ bed: -15, chair: 23, rug: 10, beanbag: 6 } as Partial<Record<import("./model").Anchor, number>>)[c.anchor] : undefined;
    return { x: p.x, y: p.y + (seatedFoot ?? -(c.anchor === "shelf" ? 92 : c.anchor === "bed" ? 48 : 12)) };
  }
  return c.anchor === "window" ? floorPoint(0, 2) : floorPoint(6, 2);
}
/** Snap to the nearest actual seat. Otherwise keep a bounded, validated floor cell. */
export function characterDrop(
  state: import("./model").HomeState,
  slot: import("./model").Character["slot"],
  x: number,
  y: number
): import("./model").HomeAction {
  if (y >= 555) return { type: "character", slot, anchor: x < 305 ? "beach-left" : x < 495 ? "beach-middle" : "beach-right" };
  const seats = state.instances
    .filter((i) => ["bed", "chair", "rug", "beanbag"].includes(i.item))
    .map((i) => ({
      i,
      p: characterPoint(state, { slot, anchor: i.item as import("./model").Anchor, pose: "sit", seatId: i.id }),
    }))
    .sort((a, b) => Math.hypot(a.p.x - x, a.p.y - y) - Math.hypot(b.p.x - x, b.p.y - y));
  const nearest = seats[0];
  if (nearest && Math.hypot(nearest.p.x - x, nearest.p.y - y) < 65)
    return { type: "character", slot, anchor: nearest.i.item as import("./model").Anchor, seatId: nearest.i.id };
  return { type: "character", slot, anchor: "floor", ...spotFromPoint(x, y, 1, false)! };
}

/** A seated character paints after its seat even though the raised contact point is higher. */
export function characterDepth(state: import("./model").HomeState, c: import("./model").Character) {
  const seat = state.instances.find((i) => (c.seatId ? i.id === c.seatId : i.item === c.anchor));
  return seat ? itemPoint(seat).y + 1 : characterPoint(state, c).y + 1;
}
