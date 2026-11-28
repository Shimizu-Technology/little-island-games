import { itemSpec } from "../catalog";
import { floorPoint, itemPoint } from "../geometry";
import { capabilityOf } from "../world";
import type { HomeAction, HomeStateV2, Instance } from "../model";
import { panSeats, setPanSeats } from "./panSeats";
import { gridCell, itemEntityId, roomPoint, type GridCell, type RoomPoint } from "./types";

/**
 * HD-07 (fix round 1): the stove's pan is a runtime seat, not a saved attachment.
 *
 * Saves must stay readable by the build before H4, whose validator rejects anything `on` a
 * stove. So food "in the pan" is saved exactly as the older build understands it: resting on
 * the floor in the cell directly in front of the stove (same column), with `powered` for
 * cooked. This build draws food at that exact point seated in the pan only when a pan drop put
 * it there this session (scene/panSeats); food set on that floor cell stays on the floor.
 * An older build simply shows it on the floor in front of the stove. A true pan attachment
 * waits for the versioned Home storage change (H5).
 */
// Measured against the illustrated stove skillet, rather than the retired SVG knobs.
export const PAN_LIFT = 132;
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
/**
 * Fix round 2: carry the runtime pan seats from one Home state to the next (scene/panSeats).
 * Only an accepted drop into a pan seats food; any other drop of that food unseats it, and food
 * that has left its pan cell by any route is unseated. Rooms an action leaves alone keep their
 * object, and with it their seats.
 */
export function carryPanSeats(before: HomeStateV2, after: HomeStateV2, action: HomeAction): void {
  const moved = action.type === "apply-proposal" ? action.proposal : undefined;
  for (const [roomId, room] of Object.entries(after.rooms) as [keyof HomeStateV2["rooms"], HomeStateV2["rooms"][keyof HomeStateV2["rooms"]]][]) {
    const was = before.rooms[roomId];
    if (!room || room === was) continue;
    const next = new Set(was ? panSeats(was) : []);
    if (moved) {
      const id = moved.id.split("/item/")[1];
      if (id) {
        next.delete(id);
        const food = moved.room === roomId ? room.instances.find((i) => i.id === id) : undefined;
        const stove = food && panStoveOf(food, room.instances);
        if (stove && moved.target === `${itemEntityId(roomId, stove.id)}/pan`) next.add(id);
      }
    }
    for (const id of next) {
      const food = room.instances.find((i) => i.id === id);
      if (!food || !panStoveOf(food, room.instances)) next.delete(id);
    }
    setPanSeats(room, next);
  }
}
