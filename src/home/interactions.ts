import { buildRoomIndex } from "./scene/graph";
import { anchorsFor } from "./scene/species";
import { poseBox, resolvePose } from "../islander/rig/poses";
import { capabilityOf, visualBox, type Socket } from "./world";
import { decorSpec, isSeat, itemSpec } from "./catalog";
import { itemPoint, itemSize, surfacePoint, sceneItemDepth } from "./geometry";
import type { Character, Instance, RoomState } from "./model";
import type { DropBody, DropWorld } from "./drop";
/** Phase-one compatibility only. ART owns authored sockets/capabilities. */
export const canHold = (i: Instance) => capabilityOf(i.item).holdable ?? !!decorSpec(i.item).small;
export function socketsOf(i: Instance): readonly Socket[] {
  const authored: readonly Socket[] =
    capabilityOf(i.item).sockets ??
    (i.item === "lounger"
      ? [{ id: "recline", kind: "lie", at: [0.3, 0.61], facing: "left", covered: false }]
      : isSeat(i.item)
        ? [{ id: "legacy-seat", kind: "sit", at: [0.5, 0.66], facing: "front", covered: true }]
        : []);
  return [
    ...authored,
    ...authored
      .filter((s) => s.kind !== "bathe")
      .map((s) => ({
        ...s,
        id: `pet-${s.id}`,
        at: [s.kind === "lie" ? 0.78 : s.at[0], s.kind === "lie" ? s.at[1] + 0.05 : s.at[1] - 0.07] as const,
        covered: false,
      })),
  ];
}
export function socketPoint(i: Instance, s: Socket) {
  const p = itemPoint(i),
    size = itemSize(i),
    flip = i.mirrored !== (i.rotation === 180 || i.rotation === 270);
  return { x: p.x + ((flip ? 1 - s.at[0] : s.at[0]) - 0.5) * size, y: p.y + (s.at[1] - 0.85) * size };
}
export function dropBody(i: Instance): DropBody {
  const [a, b] = itemSpec(i.item).footprint,
    [w, h] = i.rotation % 180 ? [b * 2, a * 2] : [a * 2, b * 2];
  const cap = capabilityOf(i.item),
    box = visualBox(i.item, i.rotation, i.mirrored);
  let left = box.left,
    right = box.left + box.width,
    top = box.top,
    bottom = box.top + box.height;
  const size = itemSize(i),
    unit = 224 / 132;
  for (const socket of socketsOf(i).filter((s) => !s.id.startsWith("pet-"))) {
    const rig = poseBox(resolvePose("front", socket.kind === "sit" ? "sit-front" : socket.kind));
    const x = (socket.at[0] - 0.5) * size - rig.anchor[0] * unit,
      y = (socket.at[1] - 0.85) * size - rig.anchor[1] * unit;
    left = Math.min(left, x);
    right = Math.max(right, x + rig.width * unit);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y + rig.height * unit);
  }
  const radius = Math.max(-left, right);
  left = -radius;
  right = radius;
  return {
    ...i,
    source: i,
    w,
    h,
    small: !!decorSpec(i.item).small,
    holdable: canHold(i),
    edible: i.empty ? undefined : cap.edible,
    left,
    right,
    top,
    bottom,
  };
}
const roomPreparations = new WeakMap<RoomState, { token: string; index: ReturnType<typeof buildRoomIndex> }>();
export function dropWorld(room: RoomState): DropWorld {
  const token = JSON.stringify(room);
  const previous = roomPreparations.get(room);
  const index = previous?.token === token ? previous.index : buildRoomIndex("home", room);
  if (previous?.index !== index) roomPreparations.set(room, { token, index });
  return {
    index,
    bodies: room.instances
      .filter((i) => !room.characters.some((c) => c.holding === i.id))
      .map((i) => {
        const p = itemPoint(i, room.instances),
          b = visualBox(i.item, i.rotation, i.mirrored);
        return {
          ...dropBody(i),
          box: { left: p.x + b.left, top: p.y + b.top, right: p.x + b.left + b.width, bottom: p.y + b.top + b.height },
          depth: sceneItemDepth(room, i),
        };
      }),
    sockets: room.instances.flatMap((i) =>
      socketsOf(i).map((s) => ({
        itemId: i.id,
        socketId: s.id,
        priority: i.layer === "ground" ? 0 : 1,
        pet: s.id.startsWith("pet-"),
        ...socketPoint(i, s),
        box: (() => {
          const p = itemPoint(i, room.instances),
            b = visualBox(i.item, i.rotation, i.mirrored);
          return {
            left: p.x + b.left,
            top: p.y + b.top,
            right: p.x + b.left + b.width,
            bottom: p.y + b.top + b.height,
          };
        })(),
        pose: s.kind,
        occupied: room.characters.find(
          (c) =>
            (c.socket?.itemId === i.id && c.socket.socketId === s.id) ||
            (!c.socket && (c.seatId === i.id || (!c.seatId && c.anchor === i.item)))
        )?.slot,
      }))
    ),
    surfaces: room.instances
      .filter((i) => !i.on && decorSpec(i.item).surface)
      .map((i) => ({
        id: i.id,
        x: i.x,
        y: i.y,
        w: dropBody(i).w,
        sx: surfacePoint(i).x,
        sy: surfacePoint(i).y,
        radius: itemSize(i) * 0.42,
      })),
    people: room.characters.map((c) => {
      const entity = index.entities[`character/${c.slot}`],
        contact = entity.contact,
        anchors = anchorsFor(c.slot, entity.base, entity.facing, entity.action),
        hand = { x: contact.x + anchors.hand.x, y: contact.y + anchors.hand.y },
        mouth = { x: contact.x + anchors.mouth.x, y: contact.y + anchors.mouth.y };
      return {
        slot: c.slot,
        ...contact,
        holding: c.holding,
        seatId: c.socket?.itemId ?? c.seatId,
        ...(c.slot === 0 ? { handX: hand.x, handY: hand.y, mouthX: mouth.x, mouthY: mouth.y } : {}),
      };
    }),
  };
}
export function characterForSocket(c: Character, i: Instance, s: Socket): Character {
  return {
    slot: c.slot,
    anchor: "seat",
    pose: s.kind,
    seatId: i.id,
    socket: { itemId: i.id, socketId: s.id },
    ...(c.holding ? { holding: c.holding } : {}),
  };
}
