import { anchorsFor } from "./scene/species";
import { buildRoomIndex, itemEntity } from "./scene/graph";
// Import the independent worklet engine, avoiding the legacy model/apply cycle.
import { resolve } from "./scene/resolve";
import { characterEntityId, roomPoint } from "./scene/types";
import { socketsOf, socketPoint } from "./interactions";
import { decorSpec, isSeat, itemSpec } from "./catalog";
import { freeFloor } from "./freeFloor";
import { moreCatalog } from "./catalogMore";
import type { Instance } from "./model";
export function floorPoint(x: number, y: number) {
  return { x: 43 + x * 37.5 + y * 1.5, y: 386 + y * 14.4 };
}
export function surfacePoint(i: Instance) {
  const p = i.staged ? { x: 400, y: 510 } : floorPoint(i.x, i.y);
  return {
    x: p.x,
    y:
      p.y -
      (["shelf", "bookcase"].includes(i.item)
        ? 130
        : i.item === "dresser"
          ? 105
          : i.item === "toy-box" || i.item === "coffee-table"
            ? 60
            : 78),
  };
}
export function itemPoint(i: Instance, items: readonly Instance[] = []) {
  if (i.staged) return { x: 400, y: 510 };
  const parent = (i.on ?? i.in) && items.find((p) => p.id === (i.on ?? i.in));
  if (parent) {
    const p = surfacePoint(parent),
      [w] = importDimensions(parent),
      dx = i.x - parent.x,
      dy = i.y - parent.y;
    return { x: p.x + (dx - (w - 1) / 2) * 38 + dy * 1.5, y: p.y + dy * 14.4 };
  }
  return i.layer === "wall" ? { x: 54 + i.x * 46, y: 124 + i.y * 56 } : floorPoint(i.x, i.y);
}
export function stackActionLabel(parent: Instance, items: readonly Instance[]) {
  const same = items.filter((i) => !i.on && i.item === parent.item);
  return `Put on ${itemSpec(parent.item).name}${same.length > 1 ? ` ${same.findIndex((i) => i.id === parent.id) + 1}` : ""}`;
}
/** Keep sibling targets inside their own projected surface cell. Height can remain generous. */
export function stackedHitWidth(i: Instance, scale: number, normalWidth: number) {
  return Math.max(44, i.on ? Math.min(normalWidth, 30 * scale) : normalWidth);
}

/** Position a measured toolbar in the space reserved between chrome and inventory. */
export function toolbarY(
  objectTop: number,
  objectBottom: number,
  toolbarHeight: number,
  headerBottom: number,
  trayTop: number
) {
  const gap = 8;
  const top = headerBottom + 4;
  const bottom = trayTop - 4 - toolbarHeight;
  if (objectBottom + gap <= bottom) return Math.max(top, objectBottom + gap);
  if (objectTop - gap - toolbarHeight >= top) return Math.min(bottom, objectTop - gap - toolbarHeight);
  return top;
}
/** Shared settled-drop targeting; the worklet receives equivalent serialized surface metadata. */
/** @deprecated Use the complete scene proposal and apply it without dropping semantics. */
export function stackSpot(items: readonly Instance[], item: Instance, x: number, y: number) {
  const room = {
    instances: [...items],
    characters: [],
    theme: { wallpaper: "cream" as const, floor: "sand" as const },
  };
  const index = buildRoomIndex("home", room);
  const subject = index.entities[`home/item/${item.id}`] ?? itemEntity("home", item, items);
  const proposal = resolve(index, subject, roomPoint(x, y), { scale: 1, kinds: ["surface"], release: true });
  if (proposal.attachment.kind !== "surface" || !proposal.cell) return undefined;
  return { x: proposal.cell.x, y: proposal.cell.y, on: proposal.attachment.parent.split("/item/")[1] };
}
function importDimensions(i: Instance) {
  const [w, h] = itemSpec(i.item).footprint;
  return i.rotation % 180 ? [h * 2, w * 2] : [w * 2, h * 2];
}
export const characterSize = (slot: import("./model").Character["slot"]) => (slot === 0 ? 224 : slot === 2 ? 98 : 170);

/** Match the convex floor drawn by RoomArt, before rounding to a grid cell. */
const floorPolygon = [0, 350, 800, 350, 800, 560, 0, 560] as const;
function insideFloor(x: number, y: number) {
  "worklet";
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4,
      ax = floorPolygon[i * 2],
      ay = floorPolygon[i * 2 + 1],
      bx = floorPolygon[j * 2],
      by = floorPolygon[j * 2 + 1];
    if ((bx - ax) * (y - ay) - (by - ay) * (x - ax) < 0) return false;
  }
  return true;
}
/** Invert the room projection. Coordinates are local to the measured canvas, not the SVG hit target. */
export function spotFromPoint(localX: number, localY: number, scale: number, wall: boolean) {
  "worklet";
  if (!Number.isFinite(localX) || !Number.isFinite(localY) || !Number.isFinite(scale) || scale <= 0) return undefined;
  const px = localX / scale,
    py = localY / scale;
  if (!wall && !insideFloor(px, py)) return undefined;
  if (wall && (px < 30 || px > 770 || py < 90 || py > 330)) return undefined;
  const rawY = (py - 386) / 14.4;
  const rawX = (px - 43 - rawY * 1.5) / 37.5;
  if (!wall && (rawX < -0.5 || rawX > 19.5 || rawY < -2.5 || rawY > 11.5)) return undefined;
  if (wall)
    return {
      x: Math.max(0, Math.min(15, Math.round((px - 54) / 46))),
      y: Math.max(0, Math.min(3, Math.round((py - 124) / 56))),
    };
  const y = Math.max(0, Math.min(11, Math.round(rawY)));
  return { x: Math.max(0, Math.min(19, Math.round((px - 43 - y * 1.5) / 37.5))), y };
}

export function itemSize(i: Instance) {
  if (moreCatalog[i.item]) return Math.round(moreCatalog[i.item].itemSize * 1.18);
  if (["bed", "bunk-bed"].includes(i.item)) return 260;
  if (i.layer === "ground") return 250;
  if (i.layer === "wall") return 90;
  if (decorSpec(i.item).category === "beds-seats") return Math.max(...itemSpec(i.item).footprint) >= 2 ? 218 : 165;
  if (decorSpec(i.item).small) return 105;
  return ["table", "shelf", "books", "trophies", "aquarium", "checkers", "toy-box", "beanbag"].includes(i.item) ||
    Math.max(...itemSpec(i.item).footprint) >= 2
    ? 182
    : 148;
}

export function characterPoint(state: import("./model").RoomState, c: import("./model").Character) {
  if (c.staged) return { x: 400, y: 510 };
  if (c.at) return c.at;
  if (c.anchor.startsWith("beach-"))
    return floorPoint(c.anchor === "beach-left" ? 5 : c.anchor === "beach-middle" ? 10 : 15, 10);
  if (c.anchor === "floor") {
    const p = freeFloor(
      state.instances.filter((i) => !state.characters.some((c) => c.holding === i.id)),
      c.x!,
      c.y!
    );
    const point = floorPoint(p.x, p.y);
    return { ...point, x: Math.max(76, Math.min(724, point.x)), y: Math.min(540, point.y) };
  }
  const seat = state.instances.find((i) =>
    c.seatId ? i.id === c.seatId : c.anchor === "seat" ? isSeat(i.item) : i.item === c.anchor
  );
  if (seat) {
    const p = itemPoint(seat);
    const socket = socketsOf(seat).find((s) => s.id === c.socket?.socketId) ?? socketsOf(seat)[0];
    if (socket) {
      const contact = socketPoint(seat, socket);
      return contact;
    }
    return p;
  }
  const p = freeFloor(state.instances, c.anchor === "window" ? 8 : 6, 5);
  const point = floorPoint(p.x, p.y);
  return { ...point, x: Math.max(76, Math.min(724, point.x)), y: Math.min(540, point.y) };
}
/** Snap to the nearest actual seat. Otherwise keep a bounded, validated floor cell. */
/** @deprecated Dispatch apply-proposal to preserve the complete semantic transaction. */
export function characterDrop(
  state: import("./model").RoomState,
  slot: import("./model").Character["slot"],
  x: number,
  y: number
): import("./model").HomeAction {
  const index = buildRoomIndex("home", state);
  const subject = index.entities[characterEntityId(slot)];
  if (!subject) return { type: "character", slot, anchor: "floor", x: 8, y: 8 };
  const proposal = resolve(index, subject, roomPoint(x, y), { scale: 1, release: true });
  if (proposal.attachment.kind === "socket") {
    const id = proposal.attachment.item.split("/item/")[1];
    const seat = state.instances.find((i) => i.id === id)!;
    return { type: "character", slot, anchor: seatAnchor(seat), seatId: id, socketId: proposal.attachment.socket };
  }
  return { type: "character", slot, anchor: "floor", x: proposal.cell?.x ?? 8, y: proposal.cell?.y ?? 8 };
}

/** A seated character paints after its seat even though the raised contact point is higher. */
export function characterDepth(state: import("./model").RoomState, c: import("./model").Character) {
  const seat = state.instances.find((i) =>
    c.seatId ? i.id === c.seatId : c.anchor === "seat" ? isSeat(i.item) : i.item === c.anchor
  );
  return seat ? furnitureDepth(seat) + 1 : characterPoint(state, c).y + 1;
}

export const seatAnchor = (i: Instance): import("./model").Anchor =>
  ["bed", "chair", "rug", "beanbag", "shelf"].includes(i.item) ? (i.item as import("./model").Anchor) : "seat";

/** Contact row at the front of the saved footprint, shared with seated depth. */
export function furnitureDepth(i: Instance) {
  const [, h] = importDimensions(i);
  return floorPoint(i.x, i.y + h - 1).y;
}
/** The near rim may cover lap/legs, never the torso of any seated friend. */
export function seatClipTop(state: import("./model").RoomState, i: Instance) {
  const occupants = state.characters.filter(
    (c) => c.pose === "sit" && (c.seatId ? c.seatId === i.id : c.anchor === i.item || c.anchor === "seat")
  );
  return Math.max(
    itemPoint(i).y - itemSize(i) * 0.85,
    ...occupants.map((c) => characterPoint(state, c).y - characterSize(c.slot) * 0.23)
  );
}

/** A seated torso in front of a nearby table must remain a continuous silhouette. */
export function furniturePaintDepth(state: import("./model").RoomState, i: Instance) {
  let depth = furnitureDepth(i);
  if (["table", "kitchen-table", "coffee-table", "side-table"].includes(i.item)) {
    const p = itemPoint(i);
    for (const c of state.characters) {
      const foot = characterPoint(state, c);
      if (c.pose === "sit" && Math.abs(foot.x - p.x) < itemSize(i) * 0.6 && foot.y >= p.y - 20 && foot.y <= p.y + 120)
        depth = Math.min(depth, characterDepth(state, c) - 0.5);
    }
  }
  return depth;
}

/** Raised children must sort above the same front-edge depth used by their surface. */
export function sceneItemDepth(state: import("./model").RoomState, i: Instance) {
  if (i.layer === "wall") return -100;
  if (i.layer === "ground") return -50;
  const parent = i.on && state.instances.find((p) => p.id === i.on);
  return parent ? furniturePaintDepth(state, parent) + 0.5 : furniturePaintDepth(state, i);
}

/** Place a complete rig box at its semantic contact, reflected about the seat centre. */
export function characterFrame(room: import("./model").RoomState, c: import("./model").Character, reaction?: string) {
  const contact = characterPoint(room, c),
    seat = room.instances.find((i) => i.id === (c.socket?.itemId ?? c.seatId));
  const mirrored = seat ? seat.mirrored !== (seat.rotation === 180 || seat.rotation === 270) : c.facing === "left";
  const base = c.pose;
  const action = reaction === "eat" || reaction === "drink" ? reaction : (c.action ?? (c.holding ? "hold" : null));
  const box = anchorsFor(c.slot, base, mirrored ? "left" : "front", action).bounds;
  return { left: contact.x + box.left, top: contact.y + box.top, width: box.width, height: box.height, mirrored };
}

/** The visible hand follows the same pose, lying transform and mirror as the rig. */
export function characterHand(room: import("./model").RoomState, c: import("./model").Character, reaction?: string) {
  const contact = characterPoint(room, c),
    frame = characterFrame(room, c, reaction);
  const action = reaction === "eat" || reaction === "drink" ? reaction : (c.action ?? (c.holding ? "hold" : null));
  const anchor = anchorsFor(c.slot, c.pose, frame.mirrored ? "left" : "front", action).hand;
  return { x: contact.x + anchor.x, y: contact.y + anchor.y };
}
