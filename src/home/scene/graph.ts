import { floatyFrame } from "../floaty";
import { trashTarget } from "../kitchen";
import { defaultGuamRoom, isGuamPlace } from "../locations";
import { fridgeShelfOffset, storageCapacity, storageOpen } from '../storage';
import {heldDrinkGeometry,heldDrinkScale} from '../art/heldDrink';
import { worldRevision, translatedBounds, standingContact, occludedFraction, catalogSamples, catalogNeighbours } from "./spatial";

import { locationIds as roomIds, type RoomId } from "../catalogMore";
import { decorSpec, itemSpec } from "../catalog";
import { capabilityOf, visualBox } from "../world";
import { canHold, retiredSeat, socketPoint, socketsOf } from "../interactions";
import { itemShapes, occluderBounds, paintedBounds, unionBounds } from "../art/silhouettes";
import { characterFrame, characterPoint, furnitureDepth, itemPoint, itemSize, surfacePoint } from "../geometry";
import { panCell, panFloorPoint, panFood, panSeatPoint, panStoveOf } from "./pan";
import { panSeats, panSeatsTag } from "./panSeats";
import { anchorsFor, species } from "./species";
import { characterEntityId, gridCell, gridToRoom, itemEntityId, roomPoint } from "./types";
import type {
  Attachment,
  Bounds,
  FloorLocation,
  HitShape,
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

function surveyed(shapes: HitShape[], fallback: Bounds): Pick<SceneEntity, "shapes" | "occluders" | "visual"> {
  const outline = unionBounds(shapes) ?? fallback;
  return {
    shapes: shapes.length ? shapes : [{ kind: "box", ...fallback }],
    occluders: shapes.flatMap((shape) => occluderBounds(shape) ?? []),
    visual: { x: outline.left + outline.width / 2, y: outline.top + outline.height / 2 },
  };
}
export function itemEntity(room: RoomId, item: Instance, instances: readonly Instance[] = [], seated = false): SceneEntity {
  const spec = itemSpec(item.item);
  const [a, b] = spec.footprint;
  const capability = capabilityOf(item.item);
  const point = itemPoint(item, instances);
  const box = visualBox(item.item, item.rotation, item.mirrored);
  const parent = item.on && instances.find((i) => i.id === item.on);
  // HD-07: food saved on the floor in front of a stove is drawn seated in its pan, but only
  // when a pan drop put it there this session (scene/panSeats); otherwise it is on the floor.
  const stove = seated ? panStoveOf(item, instances) : undefined;
  const shown = stove ? panSeatPoint(stove) : point;
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
    contact: roomPoint(shown.x, shown.y),
    bounds: box,
    ...surveyed(itemShapes(item, box.width), box),
    base: "stand",
    facing: item.mirrored !== item.rotation >= 180 ? "left" : "front",
    action: null,
    children: [],
    depth: stove ? furnitureDepth(stove) + 1 : furnitureDepth(item),
    band: item.layer === "wall" || item.layer === "ground" ? "background" : "furniture-back",
    hitProxies: [box],
    item,
    ...(stove ? { pan: itemEntityId(room, stove.id) } : {}),
    body: {
      w: item.rotation % 180 ? b * 2 : a * 2,
      h: item.rotation % 180 ? a * 2 : b * 2,
      layer: item.layer,
      container: storageCapacity(item.item) > 0,
      small: !!decorSpec(item.item).small,
      holdable: canHold(item),
      edible: item.empty ? undefined : capability.edible,
      discardable: !!capability.edible,
      portable: capability.moveInPlay,
      underfoot: capability.holdable === true,
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
    action: character.action ?? (character.holding ? "hold" : null),
    children: [],
    depth: seat ? furnitureDepth(seat) + 1 : point.y + 1,
    band: "occupant",
    hitProxies: [bounds],
    shapes: anchorsFor(character.slot, character.pose, frame.mirrored ? "left" : "front", character.action ?? (character.holding ? "hold" : null)).shapes,
    visual: { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 },
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
export function buildRoomIndex(room: RoomId, state: RoomState, revision = JSON.stringify(state) + panSeatsTag(state)): RoomIndex {
  const entities: RoomIndex["entities"] = {};
  for (const item of state.instances) {
    const entity = itemEntity(room, item, state.instances, panSeats(state).has(item.id));
    entities[entity.id] = entity;
  }
  for (const character of state.characters) {
    const entity = characterEntity(room, state, character);
    entities[entity.id] = entity;
  }
  for (const character of state.characters) {
    const held = character.holding && entities[itemEntityId(room, character.holding)];
    const owner = entities[characterEntityId(character.slot)];
    if (held) {
      held.attachment = { kind: "hand", character: owner.id, side: "right" };
      if (held.item?.item === "swim-ring") { owner.floaty = true; owner.action = null; }
    }
  }
  for (const entity of Object.values(entities)) {
    entity.parent = parentId(entity.attachment);
    if (entity.parent && entities[entity.parent]) entities[entity.parent].children.push(entity.id);
  }
  for (const e of Object.values(entities)) if (e.body?.container) e.contents = e.children.flatMap(id => entities[id].attachment.kind === "container" && entities[id].item ? [entities[id].item!] : []);
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
      const anchors = anchorsFor(parent.character.slot, parent.base, parent.facing, parent.action);
      entity.contact = roomPoint(parent.contact.x + anchors.hand.x, parent.contact.y + anchors.hand.y);
      entity.band = parent.band;
      entity.depth = parent.depth + 0.1;
      if (entity.item?.item === "swim-ring") {
        const frame = floatyFrame(parent.character.slot, parent.base, parent.facing);
        entity.contact = parent.contact;
        entity.bounds = frame;
        entity.hitProxies = [frame];
        // Reachable side rims take off the ring; the torso still picks up the friend.
        entity.shapes = [
          { kind: "box", left: frame.left, top: frame.top + frame.height * .42, width: frame.width * .22, height: frame.height * .28 },
          { kind: "box", left: frame.left + frame.width * .78, top: frame.top + frame.height * .42, width: frame.width * .22, height: frame.height * .28 },
        ];
      }
      if (entity.item && capabilityOf(entity.item.item).edible === 'drink') {
        const slot=parent.character.slot;
        Object.assign(entity,heldDrinkGeometry(entity.item,heldDrinkScale(species[slot].unit,slot),false));
        entity.hitProxies=[entity.bounds];
      }
    } else if (parent && entity.attachment.kind === "container") {
      if (parent.item?.item === "fridge" && storageOpen(parent.item)) {
        const storedIds = parent.children.filter((id) => entities[id]?.attachment.kind === "container");
        const slotIndex = Math.max(0, storedIds.indexOf(entity.id));
        const flip = parent.item.mirrored !== (parent.item.rotation >= 180);
        const offset = fridgeShelfOffset(slotIndex, itemSize(parent.item), flip);
        entity.contact = roomPoint(parent.contact.x + offset.x, parent.contact.y + offset.y);
        entity.depth = parent.depth + 3 + slotIndex * 0.01;
        entity.band = "foreground";
      } else {
        entity.contact = roomPoint(parent.contact.x, parent.contact.y - (parent.item ? itemSize(parent.item) * .3 : 0));
      }
    } else if (parent) {
      entity.contact = roomPoint(
        parent.contact.x + originalContacts[entity.id].x - originalContacts[parent.id].x,
        parent.contact.y + originalContacts[entity.id].y - originalContacts[parent.id].y
      );
      entity.depth = parent.depth + (entity.character ? 1 : 0.5);
      if (parent.band === "foreground") entity.band = "foreground";
    }
  };
  for (const entity of Object.values(entities)) {
    transform(entity);
    if (entity.item) entity.catalogSamples = catalogSamples(entity);
  }
  const occlusionBands = Object.values(entities)
    .filter((e) => e.item?.layer === "furniture" && !e.parent && !e.item.staged)
    .flatMap((e) => (e.occluders ?? []).map((bounds) => ({ id: e.id, bounds: translatedBounds(bounds, e.contact), depth: e.depth })));
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
      const anchors = anchorsFor(c.slot, entity.base, entity.facing, entity.action);
      const hand = { x: entity.contact.x + anchors.hand.x, y: entity.contact.y + anchors.hand.y };
      const mouth = roomPoint(entity.contact.x + anchors.mouth.x, entity.contact.y + anchors.mouth.y);
      const face = { x: entity.contact.x + anchors.head.x, y: entity.contact.y + anchors.head.y, headRadius: species[c.slot].headRadius };
      const waist = floatyFrame(c.slot, entity.base, entity.facing);
      targets.push({ id: `${entity.id}/wear-floaty`, kind: "floaty", owner: entity.id, floaty: true,
        attachment: { kind: "hand", character: entity.id, side: "right" },
        contact: entity.contact, projectedContact: entity.contact,
        core: { left: entity.contact.x + entity.bounds.left, top: entity.contact.y + entity.bounds.top,
          width: entity.bounds.width, height: Math.max(entity.bounds.height, waist.top + waist.height) },
        base: entity.base, facing: entity.facing,
        occupied: c.holding ? itemEntityId(room, c.holding) : undefined });
      for (const kind of ["hand", "mouth"] as const) {
        const point = kind === "hand" ? roomPoint(hand.x, hand.y) : mouth;
        const resultHand = anchorsFor(c.slot, entity.base, entity.facing, kind === "hand" ? "hold" : "drink").hand;
        const projectedHand = roomPoint(entity.contact.x + resultHand.x, entity.contact.y + resultHand.y);
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
          ...(kind === "mouth" ? { face } : {}),
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
      const facing = socket.id.replace(/^pet-/, "") === "chef" ? (entity.facing === "left" ? "front" : "left") : entity.facing;
      const occupied = Object.values(entities).find(
        (e) => e.attachment.kind === "socket" && e.attachment.item === entity.id && e.attachment.socket === socket.id
      )?.id;
      const sofaConflicts = ["sofa", "beach-blanket"].includes(item.item) && !socket.id.startsWith("pet-")
        ? Object.values(entities).filter(e => e.attachment.kind === "socket" && e.attachment.item === entity.id &&
          !e.attachment.socket.startsWith("pet-") && (socket.kind === "lie" || e.base === "lie")).map(e => e.id) : undefined;
      if (retiredSeat(item) && !occupied) continue;
      targets.push({
        id: `${entity.id}/socket/${socket.id}`,
        kind: "socket",
        owner: entity.id,
        attachment: { kind: "socket", item: entity.id, socket: socket.id },
        contact,
        core: rectCore(contact, Math.min(32, itemSize(item) * 0.12)),
        // Lying contacts are at the pillow. The visible blanket is also a destination.
        activation: socket.kind === "lie" ? lyingActivation(item, socket.id)
          : socket.kind === "bathe" ? furnitureActivation(item, { left: 12, top: 48, width: 128, height: 65 })
          : item.item === "stove" ? furnitureActivation(item, { left: 25, top: 95, width: 100, height: 55 })
          : item.item === "sofa" ? furnitureActivation(item, { left: socket.id.includes("right") ? 77 : 20, top: 63, width: 55, height: 52 }) : undefined,
        // Reclining remains an explicit pictorial destination; cushions naturally mean sitting.
        hidden: item.item === "sofa" && socket.kind === "lie",
        base: socket.kind,
        facing,
        pet: socket.id.startsWith("pet-"),
        rim: paintedBounds(entity),
        occupied,
        conflicts: sofaConflicts,
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
    if (item.item === "stove") {
      // HD-07: the pan takes one food. It lands on the floor cell in front of the stove (what
      // the save keeps) and is drawn in the pan. A blocked cell closes the pan.
      const cell = panCell(item), floorAt = panFloorPoint(item), seat = panSeatPoint(item);
      const seated = Object.values(entities).find((e) => e.pan === entity.id)?.id;
      const blockers = new Set<string>();
      for (let y = cell.y; y < cell.y + 2; y++) for (let x = cell.x; x < cell.x + 2; x++)
        for (const id of occupancy[`furniture:${x}:${y}`] ?? []) if (id !== seated) blockers.add(id);
      // Fix round 2: food set on the floor over the pan's cell isn't in the pan, but it holds the
      // cell. That one food may still go in (it only moves to the pan's spot); nothing else can.
      const [only] = blockers, holder = blockers.size === 1 ? entities[only] : undefined;
      const waiting = !seated && holder?.item && holder.attachment.kind === "floor" && !holder.children.length && panFood(holder.item) ? holder.id : undefined;
      const occupant = seated ?? waiting;
      const blocked = cell.y + 2 > 12 || [...blockers].some((id) => id !== occupant);
      const box = { left: seat.x - 36, top: seat.y - 18, width: 72, height: 32 };
      targets.push({
        id: `${entity.id}/pan`,
        kind: "surface",
        owner: entity.id,
        attachment: { kind: "floor", room, at: floorAt },
        contact: seat,
        core: box,
        support: box,
        base: "stand",
        facing: "front",
        occupied: occupant,
        closed: !!occupant || blocked,
        pan: true,
        cell,
      });
    }
    if (storageCapacity(item.item)) {
      const size = itemSize(item);
      const capacity = storageCapacity(item.item);
      const storedCount = Object.values(entities).filter(e => e.attachment.kind === "container" && e.parent === entity.id).length;
      const isFridge = item.item === "fridge";
      const flip = item.mirrored !== (item.rotation >= 180);
      const offset = isFridge ? fridgeShelfOffset(Math.min(storedCount, capacity - 1), size, flip) : undefined;
      const contact = offset
        ? roomPoint(entity.contact.x + offset.x, entity.contact.y + offset.y)
        : roomPoint(entity.contact.x, entity.contact.y - size * .3);
      const core = isFridge
        ? { left: entity.contact.x - size * 0.42, top: entity.contact.y - size * 0.82, width: size * 0.84, height: size * 0.80 }
        : { left: contact.x - size * .26, top: contact.y - size * .2, width: size * .52, height: size * .4 };
      targets.push({
        id: `${entity.id}/container`,
        kind: "container",
        owner: entity.id,
        attachment: { kind: "container", parent: entity.id },
        contact,
        core,
        base: "stand",
        facing: "front",
        closed: storedCount >= capacity,
      });
    }
  }
  if (room === "kitchen") targets.push(trashTarget());
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
    catalogNeighbours: catalogNeighbours(entities, occlusionBands),
    surfaces: targets.filter((t) => t.kind === "surface"),
    sockets: targets.filter((t) => t.kind === "socket"),
    hitProxies: Object.values(entities).flatMap((e) =>
      e.hitProxies.map((b) => ({ id: e.id, bounds: translatedBounds(b, e.contact), depth: e.depth, band: e.band }))
    ),
  };
}

/** Bounds from SeatShape's 150-unit bedding art, reflected exactly like SeatArt. */
function lyingActivation(item: Instance, socket: string): Bounds {
  const bed = ["bed", "cloud-bed", "bunk-bed"].includes(item.item);
  const y = item.item === "bunk-bed" ? (socket === "upper" ? -31 : 29) : 0;
  const box = bed ? { left: 4, top: 40 + y, width: 143, height: 63 } : { left: 22, top: 48, width: 122, height: 64 };
  return furnitureActivation(item, box);
}
function furnitureActivation(item: Instance, box: Bounds): Bounds {
  const size = itemSize(item), p = itemPoint(item);
  const flip = item.mirrored !== (item.rotation === 180 || item.rotation === 270);
  return {
    left: p.x - size / 2 + ((flip ? 150 - box.left - box.width : box.left) * size) / 150,
    top: p.y - size * 0.85 + (box.top * size) / 150,
    width: (box.width * size) / 150,
    height: (box.height * size) / 150,
  };
}
// One immutable index per room content. A character move must not reconstruct
// three unrelated rooms or allocate new SVG props for every resting item.
type SceneRoomCache = Partial<Record<RoomId, { key: string; index: RoomIndex }>>;
/** Scope memoization to one mounted world. Ordinary engine queries stay pure. */
export function createSceneBuilder() {
  const cache: SceneRoomCache = {};
  return (state: SceneState) => buildScene(state, cache);
}
export function buildScene(state: SceneState, cache?: SceneRoomCache): Scene {
  const revision = worldRevision(state);
  const rooms = {} as Scene["rooms"];
  const entities: Scene["entities"] = {};
  for (const room of roomIds) {
    const content = state.rooms[room] ?? (isGuamPlace(room) ? defaultGuamRoom(room) : state.rooms[room]);
    const key = JSON.stringify(content) + panSeatsTag(content);
    let cached = cache?.[room];
    if (!cached || cached.key !== key) {
      const index = buildRoomIndex(room, content, revision);
      // A room edit changes geometry only for affected entities. Keep untouched
      // immutable drawings stable so React.memo can skip their SVG trees.
      if (cached) for (const [id, entity] of Object.entries(index.entities)) {
        const before = cached.index.entities[id];
        if (before && JSON.stringify(before) === JSON.stringify(entity)) index.entities[id] = before;
      }
      cached = { key, index };
      if (cache) cache[room] = cached;
    }
    rooms[room] = cached.index.revision === revision ? cached.index : { ...cached.index, revision };
    Object.assign(entities, rooms[room].entities);
  }
  return { revision, entities, rooms };
}
