import { itemSpec } from "../catalog";
import { floorPoint, itemPoint } from "../geometry";
import { capabilityOf } from "../world";
import type { Instance } from "../model";
import { gridCell, roomPoint, type GridCell, type RoomPoint } from "./types";

/**
 * HD-07 (fix round 1): the stove's pan is a runtime seat, not a saved attachment.
 *
 * Saves must stay readable by the build before H4, whose validator rejects anything `on` a
 * stove. So food "in the pan" is saved exactly as the older build understands it: resting on
 * the floor in the cell directly in front of the stove (same column), with `powered` for
 * cooked. This build recognises food at that exact point and draws it seated in the pan.
 * An older build simply shows it on the floor in front of the stove. A true pan attachment
 * waits for the versioned Home storage change (H5).
 */
export const PAN_LIFT = 99;
const isStove = (i: Instance) => i.item === "stove" && !i.staged && !i.on && !i.in;
/** The floor cell in front of the stove, in the stove's own column. */
export function panCell(stove: Instance): GridCell {
  const [w, h] = itemSpec(stove.item).footprint;
  return gridCell(stove.x, stove.y + (stove.rotation % 180 ? w : h) * 2);
}
/** Where food in the pan is saved: that cell's exact floor point. */
export function panFloorPoint(stove: Instance): RoomPoint {
  const cell = panCell(stove), p = floorPoint(cell.x, cell.y);
  return roomPoint(p.x, p.y);
}
/** Where food in the pan is drawn: in the pan on the stove top. */
export function panSeatPoint(stove: Instance): RoomPoint {
  const p = floorPoint(stove.x, stove.y);
  return roomPoint(p.x, p.y - PAN_LIFT);
}
const same = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;
/** Only food sits in the pan; anything else at that spot is just on the floor. */
export const panFood = (i: Instance) => capabilityOf(i.item).edible === "food" && !i.on && !i.in && !i.staged;
/** The stove whose pan this food is in, if any. */
export function panStoveOf(item: Instance, instances: readonly Instance[]): Instance | undefined {
  if (!panFood(item)) return undefined;
  const point = itemPoint(item, instances);
  return instances.find((s) => isStove(s) && same(panFloorPoint(s), point));
}
