// Import the independent worklet engine, avoiding the legacy model/apply cycle.
import { resolve } from "./scene/resolve";
import { occludedFraction } from "./scene/spatial";
import { anchorsFor } from "./scene/species";
import { characterEntityId, gridCell, gridToRoom, itemEntityId, roomPoint } from "./scene/types";
import type { RoomIndex, SceneEntity, Target } from "./scene/types";
import type { DropProposal } from "./scene/proposal";
import type { Instance } from "./model";
export type DropBox = { left: number; top: number; right: number; bottom: number };
export type DropPoint = { x: number; y: number };
/** Serializable, worklet-safe destination rules. Prepared once per settled room edit. */
export type DropBody = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  layer: string;
  on?: string;
  small?: boolean;
  holdable?: boolean;
  edible?: "food" | "drink";
  left: number;
  right: number;
  top: number;
  bottom: number;
  box?: DropBox;
  depth?: number;
  source?: Instance;
};
export type DropSocket = {
  itemId: string;
  socketId: string;
  x: number;
  y: number;
  pose: "stand" | "sit" | "lie" | "bathe";
  occupied?: number;
  pet?: boolean;
  priority?: number;
  box?: DropBox;
};
export type DropWorld = {
  index?: RoomIndex;
  bodies: DropBody[];
  sockets: DropSocket[];
  surfaces: { id: string; x: number; y: number; w: number; sx: number; sy: number; radius: number }[];
  people: {
    slot: number;
    x: number;
    y: number;
    holding?: string;
    seatId?: string;
    handX?: number;
    handY?: number;
    mouthX?: number;
    mouthY?: number;
  }[];
};
export type DropResult = {
  kind: "floor" | "surface" | "socket" | "hand" | "mouth" | "staging";
  proposal?: DropProposal;
  x: number;
  y: number;
  px: number;
  py: number;
  on?: string;
  itemId?: string;
  socketId?: string;
  slot?: number;
  pose?: "sit" | "lie" | "bathe";
  box?: DropBox;
};
/** Conservative standing silhouettes, in the same room units as the rendered rigs. */
export function friendBounds(slot: number) {
  "worklet";
  return (slot === 0 || slot >= 3)
    ? { width: 136, height: 224 }
    : slot === 2
      ? { width: 98, height: 90 }
      : { width: 170, height: 170 };
}
/** Union of front-painted furniture rectangles; overlapping art is counted once. */
export function occlusion(world: DropWorld, slot: number, x: number, y: number) {
  "worklet";
  const size = friendBounds(slot),
    left = x - size.width / 2,
    right = x + size.width / 2,
    top = y - size.height;
  // Prepared rooms answer from painted hulls, never from a whole transparent art square.
  if (world.index) {
    const bands = world.index.occlusionBands.filter((b) => b.depth > y + 1 && b.bounds.left < right && b.bounds.left + b.bounds.width > left && b.bounds.top < y && b.bounds.top + b.bounds.height > top);
    return {
      fraction: occludedFraction({ left, top, width: size.width, height: size.height }, y + 1, bands),
      depth: bands.reduce((depth, b) => Math.max(depth, b.depth), -Infinity),
    };
  }
  const boxes = world.bodies
    .filter((b) => b.box && b.layer === "furniture" && (b.depth ?? -Infinity) > y + 1)
    .map((b) => ({
      left: Math.max(left, b.box!.left),
      right: Math.min(right, b.box!.right),
      top: Math.max(top, b.box!.top),
      bottom: Math.min(y, b.box!.bottom),
      depth: b.depth!,
    }))
    .filter((b) => b.right > b.left && b.bottom > b.top);
  const edges = boxes.flatMap((b) => [b.left, b.right]).sort((a, b) => a - b);
  let area = 0,
    depth = -Infinity;
  for (const b of boxes) depth = Math.max(depth, b.depth);
  for (let i = 1; i < edges.length; i++) {
    const a = edges[i - 1],
      b = edges[i];
    if (a === b) continue;
    const spans = boxes.filter((r) => r.left < b && r.right > a).sort((r, s) => r.top - s.top);
    let end = top,
      height = 0;
    for (const r of spans) {
      height += Math.max(0, r.bottom - Math.max(end, r.top));
      end = Math.max(end, r.bottom);
    }
    area += (b - a) * height;
  }
  return { fraction: area / (size.width * size.height), depth };
}

/** Legacy external worlds are prepared once by dropWorld in live callers. */
function legacyIndex(world: DropWorld): RoomIndex {
  "worklet";
  const room = "home" as const,
    entities: RoomIndex["entities"] = {},
    occupancy: RoomIndex["occupancy"] = {},
    targets: Target[] = [];
  const core = (x: number, y: number, r: number) => ({ left: x - r, top: y - r, width: r * 2, height: r * 2 });
  for (const b of world.bodies) {
    const id = itemEntityId(room, b.id),
      contact = gridToRoom(gridCell(b.x, b.y), b.layer === "wall");
    entities[id] = {
      id,
      room,
      contact,
      attachment: { kind: "floor", room, at: contact },
      bounds: { left: b.left, top: b.top, width: b.right - b.left, height: b.bottom - b.top },
      base: "stand",
      facing: "front",
      action: null,
      children: [],
      depth: b.depth ?? contact.y,
      band: "furniture-back",
      hitProxies: [],
      body: b,
      item: b.source,
    };
    if (!b.on)
      for (let y = b.y; y < b.y + b.h; y++)
        for (let x = b.x; x < b.x + b.w; x++) (occupancy[`${b.layer}:${x}:${y}`] ??= []).push(id);
  }
  for (const p of world.people) {
    const id = characterEntityId(p.slot),
      contact = roomPoint(p.x, p.y);
    entities[id] = {
      id,
      room,
      contact,
      attachment: { kind: "floor", room, at: contact },
      bounds: anchorsFor(p.slot as 0 | 1 | 2, "stand", "front").bounds,
      base: "stand",
      facing: "front",
      action: null,
      children: [],
      depth: p.y,
      band: "occupant",
      hitProxies: [],
      character: { slot: p.slot as 0 | 1 | 2, anchor: "floor", pose: "stand", x: 8, y: 8 },
    };
    for (const kind of ["hand", "mouth"] as const) {
      const x = kind === "hand" ? (p.handX ?? p.x + 42) : (p.mouthX ?? p.x),
        y = kind === "hand" ? (p.handY ?? p.y - 84) : (p.mouthY ?? p.y - 160);
      targets.push({
        id: `${id}/${kind}`,
        kind,
        owner: id,
        attachment: { kind: "hand", character: id, side: "right" },
        contact: roomPoint(x, y),
        core: core(x, y, 10),
        base: "stand",
        facing: "front",
        occupied: kind === "hand" && p.holding ? itemEntityId(room, p.holding) : undefined,
      });
    }
  }
  for (const s of world.sockets) {
    const owner = itemEntityId(room, s.itemId);
    targets.push({
      id: `${owner}/socket/${s.socketId}`,
      kind: "socket",
      owner,
      attachment: { kind: "socket", item: owner, socket: s.socketId },
      contact: roomPoint(s.x, s.y),
      core: core(s.x, s.y, 24),
      base: s.pose,
      facing: "front",
      pet: s.pet,
      occupied: s.occupied === undefined ? undefined : characterEntityId(s.occupied),
    });
  }
  for (const s of world.surfaces)
    for (let slot = 0; slot < s.w; slot++) {
      const x = s.sx + (slot - (s.w - 1) / 2) * 38,
        owner = itemEntityId(room, s.id),
        occupant = world.bodies.find((b) => b.on === s.id && b.x === s.x + slot);
      targets.push({
        id: `${owner}/surface/${slot}`,
        kind: "surface",
        owner,
        attachment: { kind: "surface", parent: owner, slot },
        contact: roomPoint(x, s.sy),
        core: { left: s.sx - s.w * 19, top: s.sy - 19, width: s.w * 38, height: 38 },
        support: { left: s.sx - s.w * 19, top: s.sy - 19, width: s.w * 38, height: 38 },
        base: "stand",
        facing: "front",
        slot,
        occupied: occupant ? itemEntityId(room, occupant.id) : undefined,
        closed: world.bodies.filter((b) => b.on === s.id).length >= Math.min(3, s.w),
      });
    }
  const floor: RoomIndex["floor"] = [];
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < 20; x++) {
      const cell = gridCell(x, y),
        contact = gridToRoom(cell);
      floor.push({
        cell,
        contact,
        blockers: occupancy[`furniture:${x}:${y}`] ?? [],
        occlusion: [0, 1, 2].map((slot) => occlusion(world, slot, contact.x, Math.min(540, contact.y)).fraction) as [
          number,
          number,
          number,
        ],
      });
    }
  const buckets: RoomIndex["buckets"] = {};
  for (let y = -4; y < 10; y++) for (let x = -4; x < 12; x++) buckets[`${x}:${y}`] = targets.map((_, i) => i);
  return {
    room,
    revision: "legacy-preview",
    entities,
    floor,
    occupancy,
    targets,
    buckets,
    surfaces: targets.filter((t) => t.kind === "surface"),
    sockets: targets.filter((t) => t.kind === "socket"),
    occlusionBands: [],
    hitProxies: [],
  };
}

/** Preview and release choose the same room even when the feet straddle a doorway. */

/** @deprecated RUNTIME should keep the proposal and call scene.apply directly. */
export function resolveDrop(
  world: DropWorld,
  subject: DropBody | { slot: number; floorOnly?: boolean },
  px: number,
  py: number,
  contacts: readonly DropPoint[] = []
): DropResult {
  "worklet";
  const prepared = world.index ?? legacyIndex(world);
  const index = world.index
    ? {
        ...prepared,
        targets: prepared.targets.map((t) => {
          if (t.kind !== "socket" || t.attachment.kind !== "socket") return t;
          const attachment = t.attachment;
          const external = world.sockets.find(
            (s) => itemEntityId(prepared.room, s.itemId) === attachment.item && s.socketId === attachment.socket
          );
          return {
            ...t,
            occupied: external?.occupied === undefined ? undefined : characterEntityId(external.occupied),
          };
        }),
      }
    : prepared;
  const id = "id" in subject ? itemEntityId(index.room, subject.id) : characterEntityId(subject.slot);
  const existing = index.entities[id];
  const entity: SceneEntity =
    existing ??
    ("id" in subject
      ? {
          id,
          room: index.room,
          attachment: { kind: "floor", room: index.room, at: roomPoint(px, py) },
          contact: roomPoint(px, py),
          bounds: {
            left: subject.left,
            top: subject.top,
            width: subject.right - subject.left,
            height: subject.bottom - subject.top,
          },
          base: "stand",
          facing: "front",
          action: null,
          children: [],
          depth: py,
          band: "furniture-back",
          hitProxies: [],
          body: subject,
          item: subject.source,
        }
      : {
          id,
          room: index.room,
          attachment: { kind: "floor", room: index.room, at: roomPoint(px, py) },
          contact: roomPoint(px, py),
          bounds: anchorsFor(subject.slot as 0 | 1 | 2, "stand", "front").bounds,
          base: "stand",
          facing: "front",
          action: null,
          children: [],
          depth: py,
          band: "occupant",
          hitProxies: [],
          character: { slot: subject.slot as 0 | 1 | 2, anchor: "floor", pose: "stand", x: 8, y: 8 },
        });
  const kinds: Target["kind"][] = [];
  if (world.people.length) kinds.push("hand", "mouth");
  if (world.sockets.length) kinds.push("socket", "container");
  if (world.surfaces.length) kinds.push("surface");
  const proposal = resolve(index, entity, roomPoint(px, py), {
    scale: 1,
    release: true,
    floorOnly: "floorOnly" in subject && subject.floorOnly,
    kinds,
  });
  const attachment = proposal.attachment;
  const owner = attachment.kind === "hand" ? Number(attachment.character.split("/")[1]) : undefined;
  return {
    kind: proposal.kind === "transfer" ? "floor" : proposal.kind,
    proposal,
    x: proposal.cell?.x ?? 0,
    y: proposal.cell?.y ?? 0,
    px: proposal.contact.x,
    py: proposal.contact.y,
    ...(attachment.kind === "socket"
      ? {
          itemId: attachment.item.split("/item/")[1],
          socketId: attachment.socket,
          pose: proposal.base as "sit" | "lie" | "bathe",
        }
      : {}),
    ...(attachment.kind === "surface" ? { on: attachment.parent.split("/item/")[1] } : {}),
    ...(owner !== undefined ? { slot: owner } : {}),
  };
}
export function characterDropRoom<T extends { id: string; origin: DropPoint; world: DropWorld }>(
  rooms: readonly T[],
  slot: number,
  points: readonly DropPoint[]
): T | undefined {
  "worklet";
  // The final point is the semantic feet anchor. Auxiliary finger/body points never
  // change the destination room or manufacture an oversized seat activation halo.
  const foot = points[points.length - 1];
  if (!foot || !rooms.length) return undefined;
  let socketRoom: T | undefined;
  let socketDistance = Infinity;
  for (const room of rooms) {
    const local = { x: foot.x - room.origin.x, y: foot.y - room.origin.y };
    const proposal = resolveDrop(room.world, { slot }, local.x, local.y);
    if (proposal.kind !== "socket") continue;
    const distance = Math.hypot(local.x - proposal.px, local.y - proposal.py);
    if (distance < socketDistance || (distance === socketDistance && room.id < (socketRoom?.id ?? ""))) {
      socketRoom = room;
      socketDistance = distance;
    }
  }
  if (socketRoom) return socketRoom;
  let best: T | undefined;
  let distance = Infinity;
  for (const room of rooms) {
    const dx = Math.max(room.origin.x - foot.x, 0, foot.x - room.origin.x - 800);
    const dy = Math.max(room.origin.y - foot.y, 0, foot.y - room.origin.y - 560);
    const score = dx * dx + dy * dy;
    if (score < distance || (score === distance && room.id < (best?.id ?? ""))) {
      best = room;
      distance = score;
    }
  }
  return best;
}
