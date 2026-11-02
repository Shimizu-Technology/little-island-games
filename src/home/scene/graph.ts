import { worldRevision, translatedBounds, standingContact, occludedFraction } from "./spatial";

import { roomIds, type RoomId } from "../catalogMore";
import { decorSpec, itemSpec } from "../catalog";
import { capabilityOf, visualBox } from "../world";
import { canHold, socketPoint, socketsOf } from "../interactions";
import { characterFrame, characterPoint, furnitureDepth, itemPoint, itemSize, surfacePoint } from "../geometry";
import { anchorsFor } from "./species";
import { characterEntityId, gridCell, gridToRoom, itemEntityId, roomPoint } from "./types";
import type {
  Attachment,
  Bounds,
  FloorLocation,
  RoomIndex,
  RoomPoint,
  Scene,
  SceneEntity,
  SceneState,
  Target,
} from "./types";
import type { Character, Instance, RoomState } from "../model";

export {
  worldRevision,
  translatedBounds,
  overlaps,
  contains,
  contained,
  standingContact,
  movingGroup,
  occludedFraction,
} from "./spatial";

export function itemEntity(room: RoomId, item: Instance, instances: readonly Instance[] = []): SceneEntity {
  const spec = itemSpec(item.item);
  const [a, b] = spec.footprint;
  const capability = capabilityOf(item.item);
  const point = itemPoint(item, instances);
  const parent = item.on && instances.find((i) => i.id === item.on);
  const attachment: Attachment = item.staged
    ? { kind: "staging", room }
    : item.in
      ? { kind: "container", parent: itemEntityId(room, item.in) }
      : parent
        ? { kind: "surface", parent: itemEntityId(room, parent.id), slot: item.x - parent.x }
        : { kind: "floor", room, at: roomPoint(point.x, point.y) };
  return {
    id: itemEntityId(room, item.id),
    room,
    attachment,
    contact: roomPoint(point.x, point.y),
    bounds: visualBox(item.item, item.rotation, item.mirrored),
    base: "stand",
    facing: item.mirrored !== item.rotation >= 180 ? "left" : "front",
    action: null,
    children: [],
    depth: furnitureDepth(item),
    band: item.layer === "wall" || item.layer === "ground" ? "background" : "furniture-back",
    hitProxies: [visualBox(item.item, item.rotation, item.mirrored)],
    item,
    body: {
      w: item.rotation % 180 ? b * 2 : a * 2,
      h: item.rotation % 180 ? a * 2 : b * 2,
      layer: item.layer,
      small: !!decorSpec(item.item).small,
      holdable: canHold(item),
      edible: item.empty ? undefined : capability.edible,
    },
  };
}
function characterEntity(room: RoomId, state: RoomState, character: Character): SceneEntity {
  const point = characterPoint(state, character);
  const seat = state.instances.find((i) => i.id === character.socket?.itemId);
  const frame = characterFrame(state, character);
  const contact = roomPoint(point.x, point.y);
  const attachment: Attachment = character.staged
    ? { kind: "staging", room }
    : character.socket
      ? { kind: "socket", item: itemEntityId(room, character.socket.itemId), socket: character.socket.socketId }
      : { kind: "floor", room, at: contact };
  const bounds = { left: frame.left - point.x, top: frame.top - point.y, width: frame.width, height: frame.height };
  return {
    id: characterEntityId(character.slot),
    room,
    attachment,
    contact,
    bounds,
    base: character.pose,
    facing: frame.mirrored ? "left" : "front",
    action: character.action ?? null,
    children: [],
    depth: seat ? furnitureDepth(seat) + 1 : point.y + 1,
    band: "occupant",
    hitProxies: [bounds],
    character,
  };
}
function parentId(attachment: Attachment): string | undefined {
  switch (attachment.kind) {
    case "surface":
    case "container":
      return attachment.parent;
    case "socket":
      return attachment.item;
    case "hand":
      return attachment.character;
    default:
      return undefined;
  }
}
function rectCore(point: RoomPoint, radius: number): Bounds {
  return { left: point.x - radius, top: point.y - radius, width: radius * 2, height: radius * 2 };
}
/** Build once per settled edit. The returned index is safe to serialize to a worklet. */
export function buildRoomIndex(room: RoomId, state: RoomState, revision = JSON.stringify(state)): RoomIndex {
  const entities: RoomIndex["entities"] = {};
  for (const item of state.instances) {
    const entity = itemEntity(room, item, state.instances);
    entities[entity.id] = entity;
  }
  for (const character of state.characters) {
    const entity = characterEntity(room, state, character);
    entities[entity.id] = entity;
  }
  for (const character of state.characters) {
    const held = character.holding && entities[itemEntityId(room, character.holding)];
    const owner = entities[characterEntityId(character.slot)];
    if (held) held.attachment = { kind: "hand", character: owner.id, side: "right" };
  }
  for (const entity of Object.values(entities)) {
    entity.parent = parentId(entity.attachment);
    if (entity.parent && entities[entity.parent]) entities[entity.parent].children.push(entity.id);
  }
  const originalContacts = Object.fromEntries(Object.values(entities).map((e) => [e.id, e.contact]));
  const visited = new Set<string>();
  const transform = (entity: SceneEntity): void => {
    if (visited.has(entity.id)) return;
    visited.add(entity.id);
    const parent = entity.parent && entities[entity.parent];
    if (parent) transform(parent);
    if (entity.attachment.kind === "staging") {
      entity.contact = roomPoint(400, 510);
      entity.band = "foreground";
    } else if (parent && entity.attachment.kind === "hand" && parent.character) {
      const anchors = anchorsFor(parent.character.slot, parent.base === "stand" ? "carry" : parent.base, parent.facing);
      entity.contact = roomPoint(parent.contact.x + anchors.hand.x, parent.contact.y + anchors.hand.y);
      entity.band = parent.band;
      entity.depth = parent.depth + 0.1;
    } else if (parent && entity.attachment.kind === "container") {
      entity.contact = parent.contact;
    } else if (parent) {
      entity.contact = roomPoint(
        parent.contact.x + originalContacts[entity.id].x - originalContacts[parent.id].x,
        parent.contact.y + originalContacts[entity.id].y - originalContacts[parent.id].y
      );
      entity.depth = parent.depth + (entity.character ? 1 : 0.5);
      if (parent.band === "foreground") entity.band = "foreground";
    }
  };
  for (const entity of Object.values(entities)) transform(entity);
  const occlusionBands = Object.values(entities)
    .filter((e) => e.item?.layer === "furniture" && !e.parent && !e.item.staged)
    .map((e) => ({ id: e.id, bounds: translatedBounds(e.bounds, e.contact), depth: e.depth }));
  const floor: FloorLocation[] = [];
  const occupancy: RoomIndex["occupancy"] = {};
  for (const entity of Object.values(entities)) {
    const item = entity.item;
    if (!item || entity.parent || item.staged) continue;
    for (let y = item.y; y < item.y + entity.body!.h; y++) {
      for (let x = item.x; x < item.x + entity.body!.w; x++) {
        const key = `${item.layer}:${x}:${y}`;
        (occupancy[key] ??= []).push(entity.id);
      }
    }
  }
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 20; x++) {
      const cell = gridCell(x, y);
      const contact = gridToRoom(cell);
      const fractions = [0, 1, 2].map((slot) => {
        const point = standingContact(contact, slot as Character["slot"]);
        const bounds = anchorsFor(slot as Character["slot"], "stand", "front").bounds;
        return occludedFraction(translatedBounds(bounds, point), point.y + 1, occlusionBands);
      }) as [number, number, number];
      floor.push({ cell, contact, blockers: occupancy[`furniture:${x}:${y}`] ?? [], occlusion: fractions });
    }
  }
  const targets: Target[] = [];
  for (const entity of Object.values(entities)) {
    if (entity.attachment.kind === "staging" || entity.attachment.kind === "container") continue;
    if (entity.character) {
      const c = entity.character;
      const anchors = anchorsFor(c.slot, entity.base === "stand" && c.holding ? "carry" : entity.base, entity.facing);
      const hand = { x: entity.contact.x + anchors.hand.x, y: entity.contact.y + anchors.hand.y };
      const mouth = roomPoint(entity.contact.x + anchors.mouth.x, entity.contact.y + anchors.mouth.y);
      const carrying = anchorsFor(c.slot, entity.base === "stand" ? "carry" : entity.base, entity.facing);
      const projectedHand = roomPoint(entity.contact.x + carrying.hand.x, entity.contact.y + carrying.hand.y);
      // RIG replaces provisional mouth/head metadata; hand uses today's exact rig geometry.
      for (const kind of ["hand", "mouth"] as const) {
        const point = kind === "hand" ? roomPoint(hand.x, hand.y) : mouth;
        targets.push({
          id: `${entity.id}/${kind}`,
          kind,
          owner: entity.id,
          attachment: { kind: "hand", character: entity.id, side: "right" },
          contact: point,
          projectedContact: projectedHand,
          core: rectCore(point, 10),
          base: entity.base,
          facing: entity.facing,
          occupied: kind === "hand" && c.holding ? itemEntityId(room, c.holding) : undefined,
          hidden: occludedFraction(rectCore(point, 10), entity.depth, occlusionBands) >= 0.99,
        });
      }
    }
    if (!entity.item || entity.parent) continue;
    const item = entity.item;
    for (const socket of socketsOf(item)) {
      const point = socketPoint(item, socket);
      const contact = roomPoint(point.x, point.y);
      const facing = entity.facing;
      targets.push({
        id: `${entity.id}/socket/${socket.id}`,
        kind: "socket",
        owner: entity.id,
        attachment: { kind: "socket", item: entity.id, socket: socket.id },
        contact,
        core: rectCore(contact, Math.min(32, itemSize(item) * 0.12)),
        base: socket.kind,
        facing,
        pet: socket.id.startsWith("pet-"),
        occupied: Object.values(entities).find(
          (e) => e.attachment.kind === "socket" && e.attachment.item === entity.id && e.attachment.socket === socket.id
        )?.id,
      });
    }
    if (decorSpec(item.item).surface) {
      const surface = surfacePoint(item);
      const capacity = Math.min(3, entity.body!.w);
      for (let slot = 0; slot < entity.body!.w; slot++) {
        const contact = roomPoint(surface.x + (slot - (entity.body!.w - 1) / 2) * 38, surface.y);
        const children = Object.values(entities).filter(
          (e) => e.attachment.kind === "surface" && e.attachment.parent === entity.id
        );
        targets.push({
          id: `${entity.id}/surface/${slot}`,
          kind: "surface",
          owner: entity.id,
          attachment: { kind: "surface", parent: entity.id, slot },
          contact,
          core: { left: surface.x - entity.body!.w * 19, top: surface.y - 16, width: entity.body!.w * 38, height: 32 },
          support: {
            left: surface.x - entity.body!.w * 19,
            top: surface.y - 16,
            width: entity.body!.w * 38,
            height: 32,
          },
          base: "stand",
          facing: "front",
          slot,
          occupied: children.find((e) => e.attachment.kind === "surface" && e.attachment.slot === slot)?.id,
          closed: children.length >= capacity,
        });
      }
    }
    if (capabilityOf(item.item).toggle === "open") {
      targets.push({
        id: `${entity.id}/container`,
        kind: "container",
        owner: entity.id,
        attachment: { kind: "container", parent: entity.id },
        contact: entity.contact,
        core: rectCore(entity.contact, 22),
        base: "stand",
        facing: "front",
        closed: !(item.powered ?? item.state === "active") || entity.children.length >= 8,
      });
    }
  }
  targets.sort((a, b) => a.id.localeCompare(b.id));
  const buckets: RoomIndex["buckets"] = {};
  // 128 room-unit buckets, expanded by the maximum 48pt magnet at supported scale >= .2.
  for (const [i, target] of targets.entries()) {
    for (let y = Math.floor((target.contact.y - 240) / 128); y <= Math.floor((target.contact.y + 240) / 128); y++) {
      for (let x = Math.floor((target.contact.x - 240) / 128); x <= Math.floor((target.contact.x + 240) / 128); x++) {
        (buckets[`${x}:${y}`] ??= []).push(i);
      }
    }
  }
  return {
    room,
    revision,
    entities,
    floor,
    occupancy,
    targets,
    buckets,
    occlusionBands,
    surfaces: targets.filter((t) => t.kind === "surface"),
    sockets: targets.filter((t) => t.kind === "socket"),
    hitProxies: Object.values(entities).flatMap((e) =>
      e.hitProxies.map((b) => ({ id: e.id, bounds: translatedBounds(b, e.contact), depth: e.depth, band: e.band }))
    ),
  };
}
export function buildScene(state: SceneState): Scene {
  const revision = worldRevision(state);
  const rooms = {} as Scene["rooms"];
  const entities: Scene["entities"] = {};
  for (const room of roomIds) {
    rooms[room] = buildRoomIndex(room, state.rooms[room], revision);
    Object.assign(entities, rooms[room].entities);
  }
  return { revision, entities, rooms };
}
