import type { RoomState } from "../model";

/**
 * HD-07 (fix round 2): which food is sitting in a pan is known at runtime only.
 *
 * The save can't tell "in the pan" from "on the floor in front of the stove": both are the same
 * floor placement (scene/pan). So an accepted pan drop seats the food here, and any other drop
 * of it, an explicit floor drop on that same cell included, unseats it. Seats are keyed by the
 * room state object: undo and redo return to earlier room objects and bring their seats back
 * with them. A loaded or relaunched room has no entry, so its food is ordinary floor (the lead
 * accepted this). Nothing here is saved.
 */
const seats = new WeakMap<RoomState, ReadonlySet<string>>();
const none: ReadonlySet<string> = new Set();
/** Ids of the food seated in a pan in this room. */
export function panSeats(room: RoomState): ReadonlySet<string> {
  return seats.get(room) ?? none;
}
export function setPanSeats(room: RoomState, ids: Iterable<string>): void {
  const next = new Set(ids);
  if (next.size) seats.set(room, next);
  else seats.delete(room);
}
/** Seat food in this room's pan without a drop: lab fixtures and tests. */
export function seatInPan(room: RoomState, id: string): void {
  setPanSeats(room, [...panSeats(room), id]);
}
/** Seats change what is drawn, touched and cooked, so they are part of a room's identity. */
export function panSeatsTag(room: RoomState | undefined): string {
  const ids = room ? panSeats(room) : none;
  return ids.size ? `|pan:${[...ids].sort().join(",")}` : "";
}
