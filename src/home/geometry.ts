import { decorSpec, isSeat } from "./catalog";
import type { Instance } from "./model";
export function floorPoint(x: number, y: number) {
  return { x: 174 + x * 25.5 + y * 7, y: 327 + y * 15.5 + x * 1.5 };
}
export function surfacePoint(i: Instance) {
  const p = floorPoint(i.x, i.y);
  return { x: p.x, y: p.y - (i.item === "shelf" ? 92 : i.item === "toy-box" ? 42 : 55) };
}
export function itemPoint(i: Instance, items: readonly Instance[] = []) {
  const parent = i.on && items.find(p => p.id === i.on);
  if (parent) { const p = surfacePoint(parent), offset = floorPoint(i.x - parent.x, i.y - parent.y); return { x:p.x + offset.x - 174, y:p.y + offset.y - 327 }; }
  return i.layer === "wall" ? { x: 205 + i.x * 23, y: 224 + i.y * 19.5 } : floorPoint(i.x, i.y);
}
/** Shared settled-drop targeting; the worklet receives equivalent serialized surface metadata. */
export function stackSpot(items: readonly Instance[], item: Instance, x: number, y: number) {
  if (!decorSpec(item.item).small) return undefined;
  const parent = items.filter(i => i.id !== item.id && !i.on && decorSpec(i.item).surface)
    .map(i => ({ i, p: surfacePoint(i) }))
    .filter(({ i, p }) => Math.abs(p.x - x) <= itemSize(i) * .42 && Math.abs(p.y - y) < 32)
    .sort((a, b) => Math.hypot(a.p.x - x, a.p.y - y) - Math.hypot(b.p.x - x, b.p.y - y))[0];
  return parent ? { x: parent.i.x, y: parent.i.y, on: parent.i.id } : undefined;
}
export const characterSize = (slot: import("./model").Character["slot"]) => slot === 0 ? 163 : 129;

/** Match the convex floor drawn by RoomArt, before rounding to a grid cell. */
function insideFloor(x: number, y: number) {
  "worklet";
  const points = [[34,374],[145,291],[758,330],[779,508],[162,535]];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    if ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) return false;
  }
  return true;
}
/** Invert the room projection. Coordinates are local to the measured canvas, not the SVG hit target. */
export function spotFromPoint(localX: number, localY: number, scale: number, wall: boolean) {
  "worklet";
  if (![localX, localY, scale].every(Number.isFinite) || scale <= 0) return undefined;
  const px = localX / scale,
    py = localY / scale;
  if (!wall && !insideFloor(px, py)) return undefined;
  if (wall && (px < 182 || px > 550 || py < 204 || py > 283)) return undefined;
  const rawY = (py - 327 - ((px - 174) * 3) / 51) / (31 - (14 * 3) / 51);
  const rawX = (px - 174 - rawY * 14) / 51;
  if (!wall && (rawX < -0.5 || rawX > 9.5 || rawY < -0.5 || rawY > 5.5)) return undefined;
  if (wall)
    return {
      x: Math.max(0, Math.min(15, Math.round((px - 205) / 23))),
      y: Math.max(0, Math.min(3, Math.round((py - 224) / 19.5))),
    };
  const y = Math.max(0, Math.min(11, Math.round(2 * ((py - 327 - ((px - 174) * 3) / 51) / (31 - (14 * 3) / 51)))));
  return { x: Math.max(0, Math.min(19, Math.round((px - 174 - y * 7) / 25.5))), y };
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
          : decorSpec(i.item).category === "beds-seats" ? 180 : Math.max(...decorSpec(i.item).footprint) >= 2 ? 145 : 112;
}
export function characterPoint(state: import("./model").RoomState, c: import("./model").Character) {
  if (c.anchor.startsWith("beach-")) return { x: c.anchor === "beach-left" ? 210 : c.anchor === "beach-middle" ? 400 : 590, y: 650 };
  if (c.anchor === "floor") return floorPoint(c.x!, c.y!);
  const seat = state.instances.find((i) => (c.seatId ? i.id === c.seatId : c.anchor === "seat" ? isSeat(i.item) : i.item === c.anchor));
  if (seat) {
    const p = itemPoint(seat);
    // The constant 163-unit rig keeps its hip about 51 units above the box foot.
    // Match each illustrated surface; sidekicks retain their bottom contact.
    const seatedFoot = c.slot === 0 ? ({ bed: -11, chair: 30, rug: 20, beanbag: 21, seat: 15, shelf: -65 } as Partial<Record<import("./model").Anchor, number>>)[c.anchor] : undefined;
    return { x: p.x, y: p.y + (seatedFoot ?? -(c.anchor === "shelf" ? 92 : c.anchor === "bed" ? 48 : 12)) };
  }
  return c.anchor === "window" ? floorPoint(0, 2) : floorPoint(6, 2);
}
/** Snap to the nearest actual seat. Otherwise keep a bounded, validated floor cell. */
export function characterDrop(
  state: import("./model").RoomState,
  slot: import("./model").Character["slot"],
  x: number,
  y: number
): import("./model").HomeAction {
  if (y >= 555) return { type: "character", slot, anchor: x < 305 ? "beach-left" : x < 495 ? "beach-middle" : "beach-right" };
  const seats = state.instances
    .filter((i) => isSeat(i.item))
    .map((i) => ({
      i,
      p: characterPoint(state, { slot, anchor: seatAnchor(i), pose: "sit", seatId: i.id }),
    }))
    .sort((a, b) => Math.hypot(a.p.x - x, a.p.y - y) - Math.hypot(b.p.x - x, b.p.y - y));
  const nearest = seats[0];
  if (nearest && Math.hypot(nearest.p.x - x, nearest.p.y - y) < 65)
    return { type: "character", slot, anchor: seatAnchor(nearest.i), seatId: nearest.i.id };
  return { type: "character", slot, anchor: "floor", ...spotFromPoint(x, y, 1, false)! };
}

/** A seated character paints after its seat even though the raised contact point is higher. */
export function characterDepth(state: import("./model").RoomState, c: import("./model").Character) {
  const seat = state.instances.find((i) => (c.seatId ? i.id === c.seatId : c.anchor === "seat" ? isSeat(i.item) : i.item === c.anchor));
  return seat ? itemPoint(seat).y + 1 : characterPoint(state, c).y + 1;
}

export const seatAnchor = (i: Instance): import("./model").Anchor => ["bed", "chair", "rug", "beanbag", "shelf"].includes(i.item) ? i.item as import("./model").Anchor : "seat";
