import { roomDefaultTheme } from "./art/roomDefaults";
import { moreCatalog, roomIds, tintIds, type RoomId, type TintId } from "./catalogMore";
import { clearFootprint } from "./placement";
import { badgeIds, floorThemes, itemIds, itemSpec, starterItems, wallThemes, decorSpec, isSeat, type ItemId } from "./catalog";
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
};
export const anchors = ["hello", "window", "bed", "chair", "rug", "beanbag", "shelf", "floor", "beach-left", "beach-middle", "beach-right", "seat"] as const;
export type Anchor = (typeof anchors)[number];
export type Pose = "stand" | "sit";
export type Character = { slot: 0 | 1 | 2; anchor: Anchor; pose: Pose; x?: number; y?: number; seatId?: string };
/** Room view retained for the immutable art contract’s HomeState["theme"] lookup. */
export type HomeState = {
  version: 1;
  scene: "room-1";
  instances: Instance[];
  characters: Character[];
  theme: { wallpaper: (typeof wallThemes)[number]; floor: (typeof floorThemes)[number] };
};
export type RoomState = Pick<HomeState, "instances" | "characters" | "theme">;
export type HomeStateV2 = { version: 2; current: RoomId; rooms: Record<RoomId, RoomState> };
export type HomeSave = HomeState | HomeStateV2;
export const currentRoom = (state: HomeStateV2): RoomState => state.rooms[state.current];
export type Ownership = {
  ownedItems?: readonly ItemId[];
  ownedWallpapers?: readonly HomeState["theme"]["wallpaper"][];
  ownedFloors?: readonly HomeState["theme"]["floor"][];
};
export const MAX_INSTANCES = 48;
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
    const parent = instances.find(i => i.id === candidate.on);
    if (!parent || parent.id === candidate.id || parent.on !== undefined || !decorSpec(parent.item).surface || !decorSpec(candidate.item).small) return false;
    const [w, h] = dimensions(parent), [cw, ch] = dimensions(candidate);
    if (candidate.x < parent.x || candidate.y < parent.y || candidate.x + cw > parent.x + w || candidate.y + ch > parent.y + h) return false;
    return clearFootprint(instances.filter(i => i.on === parent.id).map(footprint), footprint(candidate));
  }
  return clearFootprint(instances.filter(i => i.on === undefined).map(footprint), footprint(candidate));
}
function footprint(i: Instance) {
  const [w, h] = dimensions(i);
  return { id: i.id, x: i.x, y: i.y, w, h, layer: i.layer };
}
function validInstance(v: unknown, legacy = false): v is Instance {
  if (
    !exact(v, ["id", "item", "x", "y", "rotation", "mirrored", "layer", "state", ...(!legacy && v && typeof v === "object" && Object.hasOwn(v, "tint") ? ["tint"] : []), ...(!legacy && v && typeof v === "object" && Object.hasOwn(v, "on") ? ["on"] : [])]) ||
    typeof v.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,48}$/.test(v.id) ||
    !member(itemIds, v.item) || (legacy && typeof v.item === "string" && Object.hasOwn(moreCatalog, v.item))
  )
    return false;
  const spec = itemSpec(v.item as ItemId);
  return (
    (!Object.hasOwn(v, "tint") || (decorSpec(v.item as ItemId).tintable === true && member(tintIds, v.tint))) &&
    (!Object.hasOwn(v, "on") || typeof v.on === "string") &&
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
function validRoom(v: unknown, legacy = false): v is RoomState {
  if (!exact(v, ["instances", "characters", "theme"]) || !Array.isArray(v.instances) || v.instances.length > (legacy ? 32 : MAX_INSTANCES) || !v.instances.every(i => validInstance(i, legacy))) return false;
  const items = v.instances as Instance[];
  if (new Set(items.map(i => i.id)).size !== items.length) return false;
  const placed = legacy ? items.map(i => ({ ...i, x: i.x * 2, y: i.y * 2 })) : items;
  if (!placed.every(i => validPlacement(placed, i))) return false;
  if (!exact(v.theme, ["wallpaper", "floor"]) || !member(wallThemes, v.theme.wallpaper) || !member(floorThemes, v.theme.floor)) return false;
  return Array.isArray(v.characters) && v.characters.length <= 3 && new Set(v.characters.map(c => c?.slot)).size === v.characters.length && v.characters.every(c => validCharacter(c, items, legacy));
}
export function validHome(v: unknown): v is HomeSave {
  if (!v || typeof v !== "object") return false;
  const s = v as HomeSave;
  if (s.version === 1) {
    if (!exact(v, ["version", "scene", "instances", "characters", "theme"]) || s.scene !== "room-1") return false;
    return validRoom({ instances: s.instances, characters: s.characters, theme: s.theme }, true);
  }
  if (!exact(v, ["version", "current", "rooms"]) || s.version !== 2 || !member(roomIds, s.current) || !exact(s.rooms, [...roomIds]) || !roomIds.every(id => validRoom(s.rooms[id]))) return false;
  // Friends visit one room together; duplicate slots across rooms are corrupt data.
  const slots = roomIds.flatMap(id => s.rooms[id].characters.map(c => c.slot));
  return new Set(slots).size === slots.length && roomIds.every(id => id === s.current || s.rooms[id].characters.length === 0);
}
/** Pure, strict and idempotent. Never changes the source; invalid input belongs in recovery. */
export function migrateHome(v: unknown): HomeStateV2 | undefined {
  if (!validHome(v)) return undefined;
  if (v.version === 2) return v;
  const base = starterHome();
  return { ...base, rooms: { ...base.rooms, home: {
    theme: { ...v.theme }, instances: v.instances.map(i => ({ ...i, x: i.x * 2, y: i.y * 2 })),
    characters: v.characters.map(c => c.anchor === "floor" ? { ...c, x: c.x! * 2, y: c.y! * 2 } : { ...c })
  } } };
}
/** Old three-key anchored characters stay valid, unchanged. Free-floor coordinates and
 * specific seats are optional, strictly checked extensions of this namespace. */
export function validCharacter(c: unknown, items: readonly Instance[], legacy = false): c is Character {
  if (!c || typeof c !== "object" || (legacy && (c as Character).anchor === "seat")) return false;
  const v = c as Character;
  const keys =
    v.anchor === "floor"
      ? ["slot", "anchor", "pose", "x", "y"]
      : v.seatId !== undefined
        ? ["slot", "anchor", "pose", "seatId"]
        : ["slot", "anchor", "pose"];
  if (!exact(c, keys) || !member([0, 1, 2], v.slot) || !member(anchors, v.anchor) || v.pose !== poseFor(v.anchor))
    return false;
  if (v.anchor === "floor") return integer(v.x) && integer(v.y) && v.x >= 0 && v.x <= (legacy ? 9 : 19) && v.y >= 0 && v.y <= (legacy ? 5 : 11);
  return v.seatId !== undefined
    ? items.some((i) => i.id === v.seatId && (v.anchor === "seat" ? isSeat(i.item) : i.item === v.anchor))
    : anchorAvailable(items, v.anchor);
}
export const poseFor = (anchor: Anchor): Pose =>
  ["bed", "chair", "rug", "beanbag", "shelf", "seat"].includes(anchor) ? "sit" : "stand";
export const anchorAvailable = (items: readonly Instance[], anchor: Anchor) =>
  !["bed", "chair", "rug", "beanbag", "shelf", "seat"].includes(anchor) || items.some((i) => anchor === "seat" ? isSeat(i.item) : i.item === anchor);
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
export function starterHome(): HomeStateV2 {
  const old = legacyStarterHome();
  const home: RoomState = { theme: { ...roomDefaultTheme.home }, instances: old.instances.map(i => ({ ...i, x: i.x * 2, y: i.y * 2 })), characters: old.characters };
  const extra = (room: Exclude<RoomId, "home">): RoomState => {
    const starters: Record<Exclude<RoomId, "home">, readonly [string, number, number][]> = {
      kitchen: [["fridge", 0, 0], ["stove", 4, 0], ["kitchen-table", 6, 6], ["stool", 10, 8]],
      treehouse: [["hammock", 0, 0], ["floor-cushion", 8, 6], ["string-lights", 4, 0], ["lantern", 12, 2]],
      beach: [["rocking-chair", 2, 0], ["shell-pile", 12, 4], ["round-rug", 6, 6], ["kite", 10, 0]],
    };
    return { theme: { ...roomDefaultTheme[room] }, characters: [], instances: starters[room].map(([item, x, y]) => instance(`starter-${item}`, item, x, y)) };
  };
  return { version: 2, current: "home", rooms: { home, kitchen: extra("kitchen"), treehouse: extra("treehouse"), beach: extra("beach") } };
}
export type HomeAction =
  | { type: "place"; instance: Instance }
  | { type: "move"; id: string; x: number; y: number; on?: string }
  | { type: "tint"; id: string; tint: TintId }
  | { type: "room"; room: RoomId }
  | { type: "rotate" | "mirror" | "put-away" | "toggle"; id: string }
  | { type: "character"; slot: Character["slot"]; anchor: Anchor; x?: number; y?: number; seatId?: string }
  | { type: "theme"; wallpaper?: HomeState["theme"]["wallpaper"]; floor?: HomeState["theme"]["floor"] }
  | { type: "reset" };
export type HomeResult = { state: HomeStateV2; message?: string; snapshot?: HomeStateV2 };
export function owns(item: ItemId, ownership: Ownership): boolean {
  return !!moreCatalog[item]?.free || (starterItems as readonly string[]).includes(item) || !!ownership.ownedItems?.includes(item);
}
export function homeReducer(save: HomeStateV2, action: HomeAction, ownership: Ownership = {}): HomeResult {
  const state = currentRoom(save);
  let next: RoomState = state;
  const fail = (message: string): HomeResult => ({ state: save, message });
  if (action.type === "room") {
    if (!member(roomIds, action.room) || action.room === save.current) return { state: save };
    const characters = state.characters.map(c => ({ slot: c.slot, anchor: "floor" as const, pose: "stand" as const, x: c.slot * 6, y: c.slot === 2 ? 8 : 4 }));
    return { state: { ...save, current: action.room, rooms: { ...save.rooms, [save.current]: { ...state, characters: [] }, [action.room]: { ...save.rooms[action.room], characters } } } };
  }
  if (action.type === "reset") return { state: { ...save, rooms: { ...save.rooms, [save.current]: { ...starterHome().rooms[save.current], characters: starterHome().rooms[save.current].characters.length ? starterHome().rooms[save.current].characters : state.characters.map(c => ({ slot: c.slot, anchor: "hello", pose: "stand" })) } } }, snapshot: save };
  if (action.type === "place") {
    if (state.instances.length >= MAX_INSTANCES) return fail("Put something away to make room.");
    if (
      !validInstance(action.instance) ||
      !owns(action.instance.item, ownership) ||
      state.instances.some((i) => i.id === action.instance.id)
    )
      return fail("Choose an owned item.");
    next = { ...state, instances: [...state.instances, action.instance] };
  } else if (action.type === "theme") {
    if (action.wallpaper && !["cream", "lagoon", ...(ownership.ownedWallpapers ?? [])].includes(action.wallpaper))
      return fail("Earn this room style through the badge tracks.");
    if (action.floor && !["sand", "honey", ...(ownership.ownedFloors ?? [])].includes(action.floor))
      return fail("Earn this room style through the badge tracks.");
    next = {
      ...state,
      theme: { wallpaper: action.wallpaper ?? state.theme.wallpaper, floor: action.floor ?? state.theme.floor },
    };
  } else if (action.type === "character") {
    if (!state.characters.some((c) => c.slot === action.slot) || !anchorAvailable(state.instances, action.anchor))
      return fail("Put that seat in the room first.");
    next = {
      ...state,
      characters: state.characters.map((c) =>
        c.slot === action.slot
          ? {
              slot: c.slot,
              anchor: action.anchor,
              pose: poseFor(action.anchor),
              ...(action.anchor === "floor"
                ? { x: action.x, y: action.y }
                : action.seatId !== undefined
                  ? { seatId: action.seatId }
                  : {}),
            }
          : c
      ),
    };
  } else {
    const target = state.instances.find((i) => i.id === action.id);
    if (!target) return fail("Choose an object first.");
    const spec = itemSpec(target.item);
    if (action.type === "put-away") {
      const instances = state.instances.filter((i) => i.id !== action.id && i.on !== action.id);
      next = {
        ...state,
        instances,
        characters: state.characters.map((c) =>
          anchorAvailable(instances, c.anchor) && (!c.seatId || instances.some((i) => i.id === c.seatId))
            ? c
            : { slot: c.slot, anchor: "hello", pose: "stand" }
        ),
      };
    } else {
      if (action.type === "mirror" && !spec.mirror) return fail("This object stays this way round.");
      if (action.type === "toggle" && !spec.interactive) return fail(`${spec.name} is ready for your story.`);
      if (action.type === "tint" && (!decorSpec(target.item).tintable || !member(tintIds, action.tint))) return fail("Choose a paintable item.");
      const { on: _on, ...floorTarget } = target;
      void _on;
      const replacement =
        action.type === "move"
          ? { ...floorTarget, x: action.x, y: action.y, ...(action.on !== undefined ? { on: action.on } : {}) }
          : action.type === "tint" ? { ...target, tint: action.tint }
          : action.type === "rotate"
            ? {
                ...target,
                rotation: spec.rotations[(spec.rotations.indexOf(target.rotation) + 1) % spec.rotations.length],
              }
            : action.type === "mirror"
              ? { ...target, mirrored: !target.mirrored }
              : { ...target, state: target.state === "rest" ? ("active" as const) : ("rest" as const) };
      next = { ...state, instances: state.instances.map((i) => i.id === action.id ? replacement : action.type === "move" && i.on === target.id ? { ...i, x: i.x + action.x - target.x, y: i.y + action.y - target.y } : i) };
    }
  }
  const result: HomeStateV2 = { ...save, rooms: { ...save.rooms, [save.current]: next } };
  if (!validHome(result)) return fail("Try a clear spot. The door needs a little space too.");
  return { state: result };
}
// Badge art is deliberately provisional; these IDs are the integration boundary.
export const validBadges = (v: unknown) =>
  Array.isArray(v) &&
  v.length <= badgeIds.length &&
  new Set(v).size === v.length &&
  v.every((id) => member(badgeIds, id));
