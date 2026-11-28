import { defaultGuamRoom, guamPlaceIds, untouchedGuamRoom, type GuamPlaceId } from "./locations";
import { compactAtmosphere, validAtmosphere, type Atmosphere } from "./atmosphere";
import { familySlots, type FamilySlot } from "./family";
import { FRIDGE_STAPLES, storageCapacity, type StorageState } from './storage';
import { MAX_INSTANCES } from "./limits";
import { anchorsFor } from "./scene/species";
import type { DropProposal } from "./scene/proposal";
import { reduceSceneAction } from "./scene/reducer";
import type { CharacterAction, Facing, RoomPoint } from "./scene/types";
import { visualBox, capabilityOf, type WorldPose } from "./world";
import { canHold, socketsOf, characterForSocket, dropBody, dropWorld } from "./interactions";
import { resolveDrop, occlusion } from "./drop";
import { itemPoint, characterPoint } from "./geometry";
import { freeFloor } from "./freeFloor";
import { roomDefaultTheme } from "./art/roomDefaults";
import { moreCatalog, locationIds as roomIds, roomIds as houseRoomIds, tintIds, type HouseRoomId, type RoomId, type TintId } from "./catalogMore";
import { clearFootprint } from "./placement";
import { applyUndoStep, validUndoShape, type HomeUndo } from "./undoHistory";
import {
  badgeIds,
  floorThemes,
  itemIds,
  itemSpec,
  isSeat,
  starterItems,
  wallThemes,
  decorSpec,
  type ItemId,
} from "./catalog";
export type Rotation = 0 | 90 | 180 | 270;
export type Instance = {
  id: string;
  item: ItemId;
  x: number;
  y: number;
  rotation: Rotation;
  mirrored: boolean;
  layer: "ground" | "furniture" | "wall";
  state: "rest" | "active";
  tint?: TintId;
  on?: string;
  powered?: boolean;
  empty?: boolean;
  staged?: boolean;
  in?: string;
  /** HS-01 additive v4 field. Missing means the legacy powered/state representation. */
  storage?: StorageState;
  /** Exact room point a loose item was dropped on. Grid x/y stay the collision cell. */
  at?: { x: number; y: number };
};
export const anchors = [
  "hello",
  "window",
  "bed",
  "chair",
  "rug",
  "beanbag",
  "shelf",
  "floor",
  "beach-left",
  "beach-middle",
  "beach-right",
  "seat",
] as const;
export type Anchor = (typeof anchors)[number];
export type Pose = WorldPose;
export type Character = {
  slot: FamilySlot;
  anchor: Anchor;
  pose: Pose;
  x?: number;
  y?: number;
  seatId?: string;
  socket?: { itemId: string; socketId: string };
  holding?: string;
  at?: RoomPoint;
  staged?: boolean;
  action?: CharacterAction;
  facing?: Facing;
};
/** Room view retained for the immutable art contract’s HomeState["theme"] lookup. */
export type { Atmosphere } from "./atmosphere";
export type HomeState = {
  version: 1;
  scene: "room-1";
  instances: Instance[];
  characters: Character[];
  theme: { wallpaper: (typeof wallThemes)[number]; floor: (typeof floorThemes)[number] };
};
export type RoomState = Pick<HomeState, "instances" | "characters" | "theme">;
export type HomeStateV2 = {
  version: 2 | 3 | 4;
  /** Versioned family extension within the v4 envelope, which existing restore gates require. */
  rosterVersion?: 1;
  atmosphere?: Atmosphere;
  current: RoomId;
  rooms: Record<RoomId, RoomState>;
  /** v4 only. The last saved undo steps (HM-18, rule 57). Never part of history itself. */
  undo?: HomeUndo;
  /** v4 only. Grown-up access choices for this child's home (HR-03). Outside history. */
  access?: HomeAccess;
  /** v4 only. Secret/special Guam places this child has visited & unlocked. Omitted when empty. */
  discoveredPlaces?: readonly GuamPlaceId[];
};
export type HomeAccess = { largeTargets: true };
export type HomeSave = HomeState | HomeStateV2;
export const currentRoom = (state: HomeStateV2): RoomState => state.rooms[state.current];
export type Ownership = {
  ownedItems?: readonly ItemId[];
  ownedWallpapers?: readonly HomeState["theme"]["wallpaper"][];
  ownedFloors?: readonly HomeState["theme"]["floor"][];
};
export { MAX_INSTANCES } from "./limits";
const exact = (v: unknown, keys: string[]): v is Record<string, unknown> =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).length === keys.length &&
  keys.every((k) => Object.hasOwn(v, k));
const integer = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n);
const member = <T>(values: readonly T[], v: unknown): v is T => values.includes(v as T);
export function dimensions(i: Instance): readonly [number, number] {
  const [w, h] = itemSpec(i.item).footprint;
  return i.rotation % 180 ? [h * 2, w * 2] : [w * 2, h * 2];
}
export function validPlacement(instances: readonly Instance[], candidate: Instance): boolean {
  if (candidate.on !== undefined) {
    const parent = instances.find((i) => i.id === candidate.on);
    if (
      !parent ||
      parent.id === candidate.id ||
      parent.on !== undefined ||
      !decorSpec(parent.item).surface ||
      !decorSpec(candidate.item).small
    )
      return false;
    const [w, h] = dimensions(parent),
      cw = 1,
      ch = 1;
    if (
      candidate.x < parent.x ||
      candidate.y < parent.y ||
      candidate.x + cw > parent.x + w ||
      candidate.y + ch > parent.y + h
    )
      return false;
    if (
      candidate.y !== parent.y ||
      instances.filter((i) => i.on === parent.id && i.id !== candidate.id).length >= Math.min(3, w)
    )
      return false;
    return clearFootprint(
      instances.filter((i) => i.on === parent.id).map((i) => ({ ...footprint(i), w: 1, h: 1 })),
      { ...footprint(candidate), w: 1, h: 1 }
    );
  }
  return clearFootprint(instances.filter((i) => i.on === undefined).map(footprint), footprint(candidate));
}
function footprint(i: Instance) {
  const [w, h] = dimensions(i);
  return { id: i.id, x: i.x, y: i.y, w, h, layer: i.layer };
}
function validRoomPoint(v: unknown): boolean {
  return !!v && typeof v === "object" && exact(v, ["x", "y"]) &&
    typeof v.x === "number" && Number.isFinite(v.x) && v.x >= 0 && v.x <= 800 &&
    typeof v.y === "number" && Number.isFinite(v.y) && v.y >= 0 && v.y <= 560;
}
export function validInstance(v: unknown, legacy = false, canonicalV4 = false): v is Instance {
  if (
    !exact(v, [
      "id",
      "item",
      "x",
      "y",
      "rotation",
      "mirrored",
      "layer",
      "state",
      ...(!legacy && v && typeof v === "object" && Object.hasOwn(v, "tint") ? ["tint"] : []),
      ...(!legacy && v && typeof v === "object" && Object.hasOwn(v, "on") ? ["on"] : []),
      ...["staged", "in", "at", "storage"].filter((k) => canonicalV4 && v && typeof v === "object" && Object.hasOwn(v, k)),
      ...["powered", "empty"].filter((k) => !legacy && v && typeof v === "object" && Object.hasOwn(v, k)),
    ]) ||
    typeof v.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,48}$/.test(v.id) ||
    !member(itemIds, v.item) ||
    (legacy && typeof v.item === "string" && Object.hasOwn(moreCatalog, v.item))
  )
    return false;
  const spec = itemSpec(v.item as ItemId);
  return (
    (!Object.hasOwn(v, "tint") || (decorSpec(v.item as ItemId).tintable === true && member(tintIds, v.tint))) &&
    (!Object.hasOwn(v, "on") || typeof v.on === "string") &&
    (!Object.hasOwn(v, "staged") || v.staged === true) &&
    (!Object.hasOwn(v, "in") || typeof v.in === "string") &&
    (!Object.hasOwn(v, "at") || validRoomPoint(v.at)) &&
    (!Object.hasOwn(v, "storage") || (storageCapacity(v.item as string) > 0 && exact(v.storage, ["version", "open"]) && v.storage.version === 1 && typeof v.storage.open === "boolean")) &&
    !(Object.hasOwn(v, "on") && Object.hasOwn(v, "in")) &&
    (!Object.hasOwn(v, "powered") || typeof v.powered === "boolean") &&
    (!Object.hasOwn(v, "empty") ||
      (typeof v.empty === "boolean" && capabilityOf(v.item as ItemId).edible === "drink")) &&
    integer(v.x) &&
    integer(v.y) &&
    member(spec.rotations, v.rotation) &&
    typeof v.mirrored === "boolean" &&
    (!v.mirrored || spec.mirror) &&
    v.layer === spec.layer &&
    member(["rest", "active"], v.state) &&
    (v.state === "rest" || !!spec.interactive)
  );
}
/** Visible placements share one capacity definition across validation and reducer adapters. */
export function placedInstances(room: Pick<RoomState, "instances" | "characters">): Instance[] {
  return room.instances.filter((item) => {
    const seen = new Set<string>();
    let cursor: Instance | undefined = item;
    while (cursor && !seen.has(cursor.id)) {
      if (cursor.staged || cursor.in || room.characters.some((c) => c?.holding === cursor!.id)) return false;
      seen.add(cursor.id);
      const parent: string | undefined = cursor.on;
      cursor = room.instances.find((i) => i.id === parent);
    }
    return true;
  });
}
function validRoom(v: unknown, legacy = false, canonical = false, canonicalV4 = false, family = false, roomId?: RoomId): v is RoomState {
  if (
    !exact(v, ["instances", "characters", "theme"]) ||
    !Array.isArray(v.instances) ||
    v.instances.length > (legacy ? 32 : canonicalV4 ? 256 : MAX_INSTANCES) ||
    !v.instances.every((i) => validInstance(i, legacy, canonicalV4))
  )
    return false;
  const items = v.instances as Instance[];
  if (new Set(items.map((i) => i.id)).size !== items.length) return false;
  const placed = legacy ? items.map((i) => ({ ...i, x: i.x * 2, y: i.y * 2 })) : items;
  const loose = placedInstances({ instances: placed, characters: Array.isArray(v.characters) ? v.characters : [] });
  if (
    !loose.every((i) =>
      validPlacement(
        canonicalV4 && !i.on && decorSpec(i.item).small ? loose.filter((other) => !decorSpec(other.item).small) : loose,
        i
      )
    )
  )
    return false;
  if (canonicalV4 && (!validContainers(items) || loose.length > MAX_INSTANCES)) return false;
  if (
    canonicalV4 &&
    !loose.every((item) => {
      const point = itemPoint(item, items);
      const bounds = visualBox(item.item, item.rotation, item.mirrored);
      return (
        point.x + bounds.left >= 8 - 1e-7 &&
        point.x + bounds.left + bounds.width <= 792 + 1e-7 &&
        point.y + bounds.top >= 8 - 1e-7 &&
        point.y + bounds.top + bounds.height <= 552 + 1e-7
      );
    })
  )
    return false;
  if (
    !exact(v.theme, ["wallpaper", "floor"]) ||
    !member(wallThemes, v.theme.wallpaper) ||
    !member(floorThemes, v.theme.floor)
  )
    return false;
  return (
    Array.isArray(v.characters) &&
    v.characters.length <= (family ? 6 : 3) &&
    new Set(v.characters.map((c) => c?.slot)).size === v.characters.length &&
    v.characters.every((c) => validCharacter(c, items, legacy, canonical, canonicalV4, family, roomId))
  );
}
function validContainers(items: readonly Instance[]): boolean {
  for (const item of items) {
    if (item.staged && (item.on || item.in)) return false;
    if (!item.in) continue;
    const parent = items.find((i) => i.id === item.in);
    if (!parent || !decorSpec(item.item).small || storageCapacity(item.item) || !storageCapacity(parent.item) || items.some(i => i.on === item.id || i.in === item.id)) return false;
    if (items.filter((i) => i.in === parent.id).length > storageCapacity(parent.item)) return false;
    const seen = new Set([item.id]);
    let cursor: Instance | undefined = parent;
    while (cursor) {
      if (seen.has(cursor.id)) return false;
      seen.add(cursor.id);
      cursor = items.find((i) => i.id === (cursor!.in ?? cursor!.on));
    }
  }
  return true;
}
export function validHome(v: unknown): v is HomeSave {
  if (!v || typeof v !== "object") return false;
  let s = v as HomeSave;
  if (s.version === 1) {
    if (!exact(v, ["version", "scene", "instances", "characters", "theme"]) || s.scene !== "room-1") return false;
    return validRoom({ instances: s.instances, characters: s.characters, theme: s.theme }, true);
  }
  const optional = s.version === 4 ? (["undo", "access", "rosterVersion", "atmosphere", "discoveredPlaces"] as const).filter((k) => Object.hasOwn(v, k)) : [];
  if (
    !exact(v, ["version", "current", "rooms", ...optional]) ||
    ![2, 3, 4].includes(s.version) ||
    !member(s.version === 4 ? roomIds : houseRoomIds, s.current) ||
    !s.rooms || typeof s.rooms !== "object" || Array.isArray(s.rooms) ||
    !houseRoomIds.every(id => Object.hasOwn((s as HomeStateV2).rooms, id)) ||
    !Object.keys(s.rooms).every(id => (s.version === 4 ? roomIds : houseRoomIds).includes(id as RoomId))
  )
    return false;
  s = { ...s, rooms: locationRooms(s.rooms) };
  if (!validRooms(s, roomIds)) return false;
  if (Object.hasOwn(v, "rosterVersion") && (s.version !== 4 || s.rosterVersion !== 1)) return false;
  if (s.version >= 4 && s.access !== undefined && !(exact(s.access, ["largeTargets"]) && s.access.largeTargets === true)) return false;
  if (Object.hasOwn(v, "atmosphere") && !validAtmosphere(s.atmosphere)) return false;
  if (
    Object.hasOwn(v, "discoveredPlaces") &&
    (s.version !== 4 ||
      !Array.isArray(s.discoveredPlaces) ||
      s.discoveredPlaces.length === 0 ||
      s.discoveredPlaces.length > guamPlaceIds.length ||
      new Set(s.discoveredPlaces).size !== s.discoveredPlaces.length ||
      !s.discoveredPlaces.every((id) => member(guamPlaceIds, id)))
  )
    return false;
  // Every saved undo step must rebuild a valid earlier home; one bad step makes the save invalid.
  // A step only changes the rooms it names, so only those rooms are validated again. Each rebuilt
  // home is checked before it becomes the input to the next older step, and nothing a corrupt
  // step contains can throw out of this validator (R6).
  if (s.version >= 4 && s.undo !== undefined) {
    if (!validUndoShape(s.undo, s.rosterVersion === 1)) return false;
    let cursor: HomeStateV2 = { version: s.version, ...(s.rosterVersion ? { rosterVersion: s.rosterVersion } : {}), current: s.current, rooms: s.rooms, ...(s.atmosphere ? { atmosphere: s.atmosphere } : {}), ...(s.discoveredPlaces?.length ? { discoveredPlaces: s.discoveredPlaces } : {}) };
    for (let i = s.undo.steps.length - 1; i >= 0; i--) {
      const step = s.undo.steps[i];
      try {
        cursor = applyUndoStep(cursor, step);
        if (!exact(cursor.rooms, [...roomIds]) || !validRooms(cursor, roomIds.filter(id => Object.hasOwn(step, id)))) return false;
      } catch {
        return false;
      }
    }
  }
  return true;
}
/** Per-room validity plus the cross-room rules, for the rooms named in `changed`. */
function validRooms(s: HomeStateV2, changed: readonly RoomId[]): boolean {
  if (!changed.every((id) => validRoom(s.rooms[id], false, s.version >= 3, s.version >= 4, s.rosterVersion === 1, id))) return false;
  // Friends may live in different rooms; duplicate slots across rooms are corrupt data.
  const slots = roomIds.flatMap((id) => s.rooms[id].characters.map((c) => c.slot));
  if (new Set(slots).size !== slots.length) return false;
  return changed.every((id) => {
    const room = s.rooms[id],
      occupied = room.characters.filter((c) => c.socket).map((c) => `${c.socket!.itemId}:${c.socket!.socketId}`),
      held = room.characters.flatMap((c) => (c.holding ? [c.holding] : []));
    return new Set(occupied).size === occupied.length && new Set(held).size === held.length && held.every(id => !room.instances.find(i => i.id === id)?.in);
  });
}
/** Pure, strict and idempotent. Never changes the source; invalid input belongs in recovery. */
export function migrateHome(v: unknown): HomeStateV2 | undefined {
  const migrated = migrateSavedHome(v);
  if (!migrated) return undefined;
  if (migrated.rosterVersion === 1 && guamPlaceIds.every(id => Object.hasOwn(migrated.rooms, id))) return migrated;
  return hydrateHome(migrated);
}
/** The mounted Home always offers the complete roster, including omitted drawer presets. */
export function hydrateHome(v: unknown): HomeStateV2 | undefined {
  const saved = migrateSavedHome(v);
  if (!saved) return undefined;
  const rooms = locationRooms(saved.rooms);
  const migrated = rooms === saved.rooms ? saved : { ...saved, rooms };
  // Runtime-only defaults: an untouched learner's saved Home need not pay for the drawer.
  // Undo patches are retained byte-for-byte; older rooms may legitimately omit the new actors.
  const present = new Set(roomIds.flatMap(id => migrated.rooms[id].characters.map(c => c.slot)));
  const missing = waitingFamily().filter(c => !present.has(c.slot));
  const canonical: HomeStateV2 = migrated.rosterVersion === 1 && !missing.length ? migrated : {
    ...migrated, version: 4, rosterVersion: 1, rooms: { ...migrated.rooms, home: { ...migrated.rooms.home,
      characters: [...migrated.rooms.home.characters, ...missing],
    } },
  };
  return validHome(canonical) ? canonical : undefined;
}
/** Upgrade the stored schema without materializing runtime drawer defaults. */
export function migrateSavedHome(v: unknown): HomeStateV2 | undefined {
  const migrated = migrateValidatedHome(v);
  if (!migrated) return undefined;
  const canonical: HomeStateV2 = migrated.version === 4 ? migrated : { ...migrated, version: 4 };
  const stored = migrated.version === 4 ? canonical : compactPlaces(canonical);
  return validHome(stored) ? stored : undefined;
}
/** Omit only exact, unused drawer presets. Placed actors and saved Undo remain lossless. */
function locationRooms(rooms: HomeStateV2["rooms"]): HomeStateV2["rooms"] {
  if (guamPlaceIds.every(id => Object.hasOwn(rooms, id))) return rooms;
  return { ...Object.fromEntries(guamPlaceIds.filter(id => !Object.hasOwn(rooms, id)).map(id => [id, defaultGuamRoom(id)])), ...rooms } as HomeStateV2["rooms"];
}
function compactPlaces(state: HomeStateV2): HomeStateV2 {
  const rooms = { ...state.rooms };
  for (const id of guamPlaceIds) if (rooms[id] && untouchedGuamRoom(id, rooms[id])) delete (rooms as Partial<typeof rooms>)[id];
  return Object.keys(rooms).length === Object.keys(state.rooms).length ? state : { ...state, rooms };
}
export function compactHome(state: HomeStateV2): HomeStateV2 {
  if (state.atmosphere && !compactAtmosphere(state.atmosphere)) {
    const { atmosphere: _atmosphere, ...rest } = state; void _atmosphere; state = rest;
  }
  if (state.discoveredPlaces !== undefined && state.discoveredPlaces.length === 0) {
    const { discoveredPlaces: _discovered, ...rest } = state; void _discovered; state = rest;
  }
  if (state.rosterVersion !== 1) return compactPlaces(state);
  state = { ...state, rooms: locationRooms(state.rooms) };
  const characters = state.rooms.home.characters.filter(c => !waitingFamily().some(preset =>
    Object.keys(c).length === Object.keys(preset).length &&
    (Object.keys(preset) as (keyof Character)[]).every(key => c[key] === preset[key])));
  const rooms = characters.length === state.rooms.home.characters.length ? state.rooms : {
    ...state.rooms, home: { ...state.rooms.home, characters },
  };
  const family = roomIds.some(id => rooms[id].characters.some(c => c.slot >= 3)) ||
    state.undo?.steps.some(step => roomIds.some(id => { const patch = step[id]; return patch && ("room" in patch
      ? patch.room.characters.some(c => c.slot >= 3)
      : patch.characters && (patch.characters.remove.some(slot => slot >= 3) ||
        patch.characters.put.some(p => p.value.slot >= 3 || p.index >= 3))); }));
  if (family) return compactPlaces(rooms === state.rooms ? state : { ...state, rooms });
  const { rosterVersion: _roster, ...base } = state;
  void _roster;
  return compactPlaces({ ...base, rooms });
}
function migrateValidatedHome(v: unknown): HomeStateV2 | undefined {
  if (!validHome(v)) return undefined;
  if (v.version === 4) return v;
  if (v.version === 3) {
    const source = { ...v, rooms: locationRooms(v.rooms) };
    const rooms = Object.fromEntries(roomIds.map((id) => [id, normalizeRoom(source.rooms[id])])) as HomeStateV2["rooms"];
    return roomIds.every((id) => JSON.stringify(rooms[id]) === JSON.stringify(source.rooms[id])) ? source : { ...source, rooms };
  }
  if (v.version !== 1) return upgradeHome({ ...v, rooms: locationRooms(v.rooms) });
  const { rosterVersion: _roster, ...base } = starterHome();
  void _roster;
  return upgradeHome({
    ...base, version: 3,
    rooms: {
      ...base.rooms,
      home: {
        theme: { ...v.theme },
        instances: v.instances.map((i) => ({ ...i, x: i.x * 2, y: i.y * 2 })),
        characters: v.characters.map((c) => (c.anchor === "floor" ? { ...c, x: c.x! * 2, y: c.y! * 2 } : { ...c })),
      },
    },
  });
}
/** Only visually invalid positions change on migration; source records are never mutated. */
export function normalizeRoom(room: RoomState): RoomState {
  let instances = room.instances.map((i) => ({ ...i }));
  // Move furniture before its surface children, then check every drawn child too.
  const ids = [...instances.filter((i) => !i.on), ...instances.filter((i) => i.on)].map((i) => i.id);
  for (const id of ids) {
    const i = instances.find((i) => i.id === id)!;
    if (i.in || room.characters.some((c) => c.holding === id)) continue;
    const p = itemPoint(i, instances),
      b = visualBox(i.item, i.rotation, i.mirrored);
    if (p.x + b.left >= 8 && p.x + b.left + b.width <= 792 && p.y + b.top >= 8 && p.y + b.top + b.height <= 552)
      continue;
    const world = dropWorld({ ...room, instances }),
      body = { ...dropBody(i), left: b.left, right: b.left + b.width, top: b.top, bottom: b.top + b.height };
    const spot = resolveDrop(
      { ...world, people: [], sockets: [], surfaces: i.on ? world.surfaces : [] },
      body,
      p.x,
      p.y
    );
    if (!spot)
      throw new Error("This room needs a clear space before its layout can be repaired. Your original has been kept.");
    if (spot.kind === "staging") {
      instances = instances.map((other) => (other.id === id ? { ...other, staged: true } : other));
      continue;
    }
    const dx = spot.x - i.x,
      dy = spot.y - i.y;
    instances = instances.map((other) => {
      if (other.id === id) {
        const { on, ...rest } = other;
        void on;
        return { ...rest, x: spot.x, y: spot.y, ...(spot.on ? { on: spot.on } : {}) };
      }
      return other.on === id ? { ...other, x: other.x + dx, y: other.y + dy } : other;
    });
  }
  return { ...room, instances };
}
function upgradeHome(v: HomeStateV2): HomeStateV2 {
  const rooms = { ...v.rooms };
  for (const id of roomIds) {
    const room = normalizeRoom(v.rooms[id]),
      used = new Set<string>();
    const characters = room.characters.map((c) => {
      // Match historical characterPoint: an implicit "seat" means the first seat.
      const seat = room.instances.find((i) =>
        c.seatId ? i.id === c.seatId : c.anchor === "seat" ? isSeat(i.item) : i.item === c.anchor
      );
      const compatible = seat && socketsOf(seat).filter((s) => s.id.startsWith("pet-") === (c.slot === 2));
      const free = compatible?.filter((s) => !used.has(`${seat!.id}:${s.id}`));
      const socket = free?.find((s) => s.id === c.socket?.socketId) ?? free?.[0];
      if (seat && socket) {
        used.add(`${seat.id}:${socket.id}`);
        return characterForSocket(c, seat, socket);
      }
      if (c.anchor === "seat" || (seat && c.pose !== "stand"))
        return {
          slot: c.slot,
          anchor: "floor" as const,
          pose: "stand" as const,
          ...freeFloor(
            room.instances.filter((i) => !room.characters.some((c) => c.holding === i.id)),
            8,
            8
          ),
          ...(c.holding ? { holding: c.holding } : {}),
        };
      return { ...c };
    });
    rooms[id] = { ...room, characters };
  }
  return { ...v, version: 3, rooms };
}
/** Historical furniture anchors are input-only; v3 occupants name a compatible socket.
 * Non-furniture anchors (hello/window/beach) remain valid without relationships. */
export function validCharacter(
  c: unknown,
  items: readonly Instance[],
  legacy = false,
  canonical = true,
  canonicalV4 = false,
  family = false,
  roomId?: RoomId
): c is Character {
  if (!c || typeof c !== "object" || (legacy && (c as Character).anchor === "seat")) return false;
  const v = c as Character;
  if (v.socket !== undefined) {
    const seat = items.find((i) => i.id === v.socket?.itemId),
      socket = seat && socketsOf(seat).find((s) => s.id === v.socket?.socketId);
    if (
      !exact(v.socket, ["itemId", "socketId"]) ||
      !socket ||
      socket.id.startsWith("pet-") !== (v.slot === 2) ||
      v.pose !== socket.kind ||
      v.anchor !== "seat" ||
      v.seatId !== seat?.id
    )
      return false;
  }
  const resolvedSeat = items.find((i) => (v.seatId ? i.id === v.seatId : i.item === v.anchor));
  if (canonical && !v.socket && (v.anchor === "seat" || (resolvedSeat && socketsOf(resolvedSeat).length > 0)))
    return false;
  if (
    v.holding !== undefined &&
    (!items.some((i) => i.id === v.holding && canHold(i) && !i.on && !i.in && !i.staged) ||
      typeof v.holding !== "string")
  )
    return false;
  const keys =
    v.anchor === "floor"
      ? ["slot", "anchor", "pose", "x", "y"]
      : v.seatId !== undefined
        ? ["slot", "anchor", "pose", "seatId"]
        : ["slot", "anchor", "pose"];
  if (
    !exact(c, [
      ...keys,
      ...(v.socket ? ["socket"] : []),
      ...(v.holding !== undefined ? ["holding"] : []),
      ...["at", "staged", "action", "facing"].filter((k) => canonicalV4 && Object.hasOwn(v, k)),
    ]) ||
    !member(family ? familySlots : [0, 1, 2], v.slot) ||
    !member(anchors, v.anchor) ||
    (!v.socket && v.pose !== poseFor(v.anchor))
  )
    return false;
  const minCharacterY = roomId === "tumon-beach" ? 286 : roomId === "cocos-island" ? 308 : 350;
  if (
    v.at !== undefined &&
    (!canonicalV4 ||
      v.anchor !== "floor" ||
      !exact(v.at, ["x", "y"]) ||
      !Number.isFinite(v.at.x) ||
      !Number.isFinite(v.at.y) ||
      v.at.x < 8 ||
      v.at.x > 792 ||
      v.at.y < minCharacterY ||
      v.at.y > 552)
  )
    return false;
  if (
    v.facing !== undefined &&
    (!canonicalV4 || v.anchor !== "floor" || !["front", "left", "right"].includes(v.facing))
  )
    return false;
  if (v.at && !v.staged) {
    const bounds = anchorsFor(v.slot, "stand", v.facing ?? "front").bounds;
    if (
      v.at.x + bounds.left < 8 ||
      v.at.x + bounds.left + bounds.width > 792 ||
      v.at.y + bounds.top < 8 ||
      v.at.y + bounds.top + bounds.height > 552
    )
      return false;
  }
  if (v.staged !== undefined && (!canonicalV4 || v.staged !== true || v.anchor !== "floor")) return false;
  if (v.action !== undefined && (!canonicalV4 || ![null, "eat", "drink"].includes(v.action))) return false;
  if (v.anchor === "floor")
    return integer(v.x) && integer(v.y) && v.x >= 0 && v.x <= (legacy ? 9 : 19) && v.y >= 0 && v.y <= (legacy ? 5 : 11);
  return v.seatId !== undefined
    ? items.some((i) => i.id === v.seatId && (v.anchor === "seat" ? socketsOf(i).length > 0 : i.item === v.anchor))
    : anchorAvailable(items, v.anchor);
}
export const poseFor = (anchor: Anchor): Pose =>
  ["bed", "chair", "rug", "beanbag", "shelf", "seat"].includes(anchor) ? "sit" : "stand";
export const anchorAvailable = (items: readonly Instance[], anchor: Anchor) =>
  !["bed", "chair", "rug", "beanbag", "shelf", "seat"].includes(anchor) ||
  items.some((i) => (anchor === "seat" ? socketsOf(i).length > 0 : i.item === anchor));
export function instance(id: string, item: ItemId, x: number, y: number): Instance {
  return { id, item, x, y, rotation: 0, mirrored: false, layer: itemSpec(item).layer, state: "rest" };
}
export function legacyStarterHome(): HomeState {
  return {
    version: 1,
    scene: "room-1",
    theme: { wallpaper: "cream", floor: "honey" },
    instances: [
      instance("bed", "bed", 0, 0),
      instance("shelf", "shelf", 3, 0),
      instance("plant", "plant", 6, 0),
      instance("lamp", "lamp", 7, 2),
      instance("rug", "rug", 2, 3),
      instance("table", "table", 5, 3),
      instance("chair", "chair", 5, 4),
      instance("toys", "toy-box", 0, 4),
    ],
    characters: [
      { slot: 0, anchor: "window", pose: "stand" },
      { slot: 1, anchor: "shelf", pose: "sit" },
      { slot: 2, anchor: "rug", pose: "sit" },
    ],
  };
}
function waitingFamily(): Character[] {
  return ([3, 4, 5] as const).map(slot => ({ slot, anchor: "floor", pose: "stand", x: 8, y: 8, staged: true }));
}
export function starterHome(): HomeStateV2 {
  const positions: readonly [string, string, number, number][] = [
    ["bed", "bed", 4, 0],
    ["shelf", "shelf", 12, 0],
    ["plant", "plant", 14, 4],
    ["lamp", "lamp", 13, 0],
    ["rug", "rug", 8, 8],
    ["toys", "toy-box", 3, 6],
  ];
  const home: RoomState = {
    theme: { ...roomDefaultTheme.home },
    instances: positions.map(([id, item, x, y]) => ({
      ...instance(id, item, x, y),
      ...(id === "lamp" ? { on: "shelf" } : {}),
    })),
    characters: [
      { slot: 0, anchor: "floor", pose: "stand", x: 8, y: 8 },
      { slot: 1, anchor: "floor", pose: "stand", x: 17, y: 2 },
      { slot: 2, anchor: "floor", pose: "stand", x: 6, y: 10 },
    ],
  };
  const extra = (room: Exclude<HouseRoomId, "home">): RoomState => {
    const starters: Record<Exclude<HouseRoomId, "home">, readonly [string, number, number][]> = {
      kitchen: [
        ["fridge", 14, 0],
        ["sink-counter", 8, 0],
        ["stove", 2, 0],
        ["fruit-bowl", 11, 9],
        ["kitchen-table", 10, 9],
        ["stool", 5, 9],
        ["stool", 14, 9],
      ],
      treehouse: [
        ["hammock", 4, 0],
        ["floor-cushion", 8, 7],
        ["floor-cushion", 11, 9],
        ["string-lights", 6, 0],
        ["lantern", 10, 2],
        ["teddy", 6, 8],
        ["book", 9, 5],
      ],
      beach: [
        ["bubble-bath", 3, 0],
        ["lounger", 9, 1],
        ["beach-towel", 6, 7],
        ["beach-towel", 11, 8],
        ["ball", 6, 4],
        ["shell", 12, 6],
        ["banana-plant", 14, 5],
      ],
    };
    return {
      theme: { ...roomDefaultTheme[room] },
      characters: [],
      instances: starters[room].map(([item, x, y], index) => ({
        ...instance(
          `starter-${item}${starters[room].findIndex((row) => row[0] === item) === index ? "" : `-${index}`}`,
          item,
          x,
          y
        ),
        ...(item === "fruit-bowl" ? { on: "starter-kitchen-table" } : item === "fridge" ? { mirrored: true } : {}),
      })),
    };
  };
  const base = upgradeHome({
    version: 3, current: "home",
    rooms: { home, kitchen: extra("kitchen"), treehouse: extra("treehouse"), beach: extra("beach"), "tumon-beach": defaultGuamRoom("tumon-beach"), "chamorro-village": defaultGuamRoom("chamorro-village"), "cocos-island": defaultGuamRoom("cocos-island") },
  });
  return {
    ...base,
    version: 4,
    rosterVersion: 1,
    rooms: {
      ...base.rooms,
      home: { ...base.rooms.home, characters: [...base.rooms.home.characters, ...waitingFamily()] },
      kitchen: {
        ...base.rooms.kitchen,
        instances: [
          ...base.rooms.kitchen.instances,
          ...FRIDGE_STAPLES.map((item) => ({
            ...instance(`starter-fridge-${item}`, item, 14, 0),
            in: "starter-fridge",
          })),
        ],
      },
    },
  };
}
export type HomeAction = (
  | { type: "apply-proposal"; proposal: DropProposal }
  | { type: "finish-action"; slot: Character["slot"] }
  /** HD-07: food in the pan of a lit stove becomes cooked. Outside history, like finish-action. */
  | { type: "cook"; id: string }
  | { type: "restock-fridge"; id: string }
  | { type: "refill-drink"; id: string }
  | { type: "dispense"; source: string; item: ItemId; id: string; x: number; y: number }
  | { type: "use-item"; id: string; slot: Character["slot"]; eat?: boolean }
  | { type: "release-held"; slot: Character["slot"]; x: number; y: number }
  | {
      type: "transfer";
      slot: Character["slot"];
      room: RoomId;
      x: number;
      y: number;
      seatId?: string;
      socketId?: string;
    }
  | { type: "place"; instance: Instance; target?: { slot: Character["slot"]; eat: boolean } }
  | { type: "move"; id: string; x: number; y: number; on?: string }
  | { type: "tint"; id: string; tint: TintId }
  | { type: "room"; room: RoomId }
  | { type: "discover"; place: GuamPlaceId }
  | { type: "palm-coconut" }
  | { type: "rotate" | "mirror" | "put-away" | "toggle"; id: string }
  | {
      type: "character";
      slot: Character["slot"];
      anchor: Anchor;
      x?: number;
      y?: number;
      seatId?: string;
      socketId?: string;
    }
  | { type: "theme"; wallpaper?: HomeState["theme"]["wallpaper"]; floor?: HomeState["theme"]["floor"] }
  | { type: "atmosphere"; atmosphere: Atmosphere }
  | { type: "seasonal-pack"; pack: import("./seasonal").SeasonalPackId }
  | { type: "find-friends" }
  | { type: "reset" }
) & { roomId?: RoomId };
export type HomeResult = { state: HomeStateV2; message?: string; snapshot?: HomeStateV2; stale?: true };
export function owns(item: ItemId, ownership: Ownership): boolean {
  return (
    !!moreCatalog[item]?.free ||
    (starterItems as readonly string[]).includes(item) ||
    !!ownership.ownedItems?.includes(item)
  );
}
export function homeReducer(save: HomeStateV2, action: HomeAction, ownership: Ownership = {}): HomeResult {
  return reduceSceneAction(save, action, ownership);
}
// Badge art is deliberately provisional; these IDs are the integration boundary.
export const validBadges = (v: unknown) =>
  Array.isArray(v) &&
  v.length <= badgeIds.length &&
  new Set(v).size === v.length &&
  v.every((id) => member(badgeIds, id));

/** Layout edits settle free friends in front of art that would hide their silhouette. */
export function settleFriends(room: RoomState): RoomState {
  const world = dropWorld(room);
  let changed = false;
  const characters = room.characters.map((c) => {
    if (c.socket) return c;
    const p = characterPoint(room, c);
    if (occlusion(world, c.slot, p.x, p.y).fraction <= 0.25) return c;
    const spot = resolveDrop(world, { slot: c.slot, floorOnly: true }, p.x, p.y);
    if (!spot) return c;
    changed = true;
    return {
      slot: c.slot,
      anchor: "floor" as const,
      pose: "stand" as const,
      x: spot.x,
      y: spot.y,
      ...(c.holding ? { holding: c.holding } : {}),
    };
  });
  return changed ? { ...room, characters } : room;
}
