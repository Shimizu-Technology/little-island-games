import { clearFootprint } from "./placement";
import { badgeIds, floorThemes, itemIds, itemSpec, starterItems, wallThemes, type ItemId } from "./catalog";
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
};
export const anchors = ["hello", "window", "bed", "chair", "rug", "beanbag", "shelf", "floor"] as const;
export type Anchor = (typeof anchors)[number];
export type Pose = "stand" | "sit";
export type Character = { slot: 0 | 1 | 2; anchor: Anchor; pose: Pose; x?: number; y?: number; seatId?: string };
export type HomeState = {
  version: 1;
  scene: "room-1";
  instances: Instance[];
  characters: Character[];
  theme: { wallpaper: (typeof wallThemes)[number]; floor: (typeof floorThemes)[number] };
};
export type Ownership = {
  ownedItems?: readonly ItemId[];
  ownedWallpapers?: readonly HomeState["theme"]["wallpaper"][];
  ownedFloors?: readonly HomeState["theme"]["floor"][];
};
export const MAX_INSTANCES = 32;
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
  return i.rotation % 180 ? [h, w] : [w, h];
}
export function validPlacement(instances: readonly Instance[], candidate: Instance): boolean {
  const footprint = (i: Instance) => {
    const [w, h] = dimensions(i);
    return { id: i.id, x: i.x, y: i.y, w, h, layer: i.layer };
  };
  return clearFootprint(instances.map(footprint), footprint(candidate));
}
function validInstance(v: unknown): v is Instance {
  if (
    !exact(v, ["id", "item", "x", "y", "rotation", "mirrored", "layer", "state"]) ||
    typeof v.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,48}$/.test(v.id) ||
    !member(itemIds, v.item)
  )
    return false;
  const spec = itemSpec(v.item as ItemId);
  return (
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
export function validHome(v: unknown): v is HomeState {
  if (
    !exact(v, ["version", "scene", "instances", "characters", "theme"]) ||
    v.version !== 1 ||
    v.scene !== "room-1" ||
    !Array.isArray(v.instances) ||
    v.instances.length > MAX_INSTANCES ||
    !v.instances.every(validInstance)
  )
    return false;
  const instances = v.instances as Instance[];
  if (
    new Set(instances.map((i) => i.id)).size !== instances.length ||
    !instances.every((i) => validPlacement(instances, i))
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
    v.characters.length <= 3 &&
    new Set(v.characters.map((c) => c?.slot)).size === v.characters.length &&
    v.characters.every((c) => validCharacter(c, instances))
  );
}
/** Old three-key anchored characters stay valid, unchanged. Free-floor coordinates and
 * specific seats are optional, strictly checked extensions of this namespace. */
export function validCharacter(c: unknown, items: readonly Instance[]): c is Character {
  if (!c || typeof c !== "object") return false;
  const v = c as Character;
  const keys =
    v.anchor === "floor"
      ? ["slot", "anchor", "pose", "x", "y"]
      : v.seatId !== undefined
        ? ["slot", "anchor", "pose", "seatId"]
        : ["slot", "anchor", "pose"];
  if (!exact(c, keys) || !member([0, 1, 2], v.slot) || !member(anchors, v.anchor) || v.pose !== poseFor(v.anchor))
    return false;
  if (v.anchor === "floor") return integer(v.x) && integer(v.y) && v.x >= 0 && v.x <= 9 && v.y >= 0 && v.y <= 5;
  return v.seatId !== undefined
    ? items.some((i) => i.id === v.seatId && i.item === v.anchor)
    : anchorAvailable(items, v.anchor);
}
export const poseFor = (anchor: Anchor): Pose =>
  ["bed", "chair", "rug", "beanbag", "shelf"].includes(anchor) ? "sit" : "stand";
export const anchorAvailable = (items: readonly Instance[], anchor: Anchor) =>
  !["bed", "chair", "rug", "beanbag", "shelf"].includes(anchor) || items.some((i) => i.item === anchor);
export function instance(id: string, item: ItemId, x: number, y: number): Instance {
  return { id, item, x, y, rotation: 0, mirrored: false, layer: itemSpec(item).layer, state: "rest" };
}
export function starterHome(): HomeState {
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
export type HomeAction =
  | { type: "place"; instance: Instance }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "rotate" | "mirror" | "put-away" | "toggle"; id: string }
  | { type: "character"; slot: Character["slot"]; anchor: Anchor; x?: number; y?: number; seatId?: string }
  | { type: "theme"; wallpaper?: HomeState["theme"]["wallpaper"]; floor?: HomeState["theme"]["floor"] }
  | { type: "reset" };
export type HomeResult = { state: HomeState; message?: string; snapshot?: HomeState };
export function owns(item: ItemId, ownership: Ownership): boolean {
  return (starterItems as readonly string[]).includes(item) || !!ownership.ownedItems?.includes(item);
}
export function homeReducer(state: HomeState, action: HomeAction, ownership: Ownership = {}): HomeResult {
  let next: HomeState = state;
  const fail = (message: string): HomeResult => ({ state, message });
  if (action.type === "reset") return { state: starterHome(), snapshot: state };
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
      const instances = state.instances.filter((i) => i.id !== action.id);
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
      const replacement =
        action.type === "move"
          ? { ...target, x: action.x, y: action.y }
          : action.type === "rotate"
            ? {
                ...target,
                rotation: spec.rotations[(spec.rotations.indexOf(target.rotation) + 1) % spec.rotations.length],
              }
            : action.type === "mirror"
              ? { ...target, mirrored: !target.mirrored }
              : { ...target, state: target.state === "rest" ? ("active" as const) : ("rest" as const) };
      next = { ...state, instances: state.instances.map((i) => (i.id === action.id ? replacement : i)) };
    }
  }
  if (!validHome(next)) return fail("Try a clear spot. The door needs a little space too.");
  return { state: next };
}
// Badge art is deliberately provisional; these IDs are the integration boundary.
export const validBadges = (v: unknown) =>
  Array.isArray(v) &&
  v.length <= badgeIds.length &&
  new Set(v).size === v.length &&
  v.every((id) => member(badgeIds, id));
