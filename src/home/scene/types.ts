import type { RoomId } from "../catalogMore";
import type { Character, HomeStateV2, Instance } from "../model";

/** Brands are compile-time only; coordinates remain plain serializable data. */
declare const space: unique symbol;
type Point<S extends string> = Readonly<{ x: number; y: number; [space]: S }>;
export type ScreenPoint = Point<"screen-pt">;
export type HousePoint = Point<"house">;
export type RoomPoint = Point<"room-800x560">;
export type GridCell = Point<"grid">;
export type EntityId = string;
export type Facing = "front" | "left" | "right";
export type CharacterBase = "stand" | "sit" | "lie" | "bathe" | "carry";
export type CharacterAction = "eat" | "drink" | null;
export type Face = "neutral" | "anticipate" | "chew" | "happy" | "sleepy" | "surprised";
export type Attachment =
  | { kind: "floor"; room: RoomId; at: RoomPoint }
  | { kind: "surface"; parent: EntityId; slot: number }
  | { kind: "socket"; item: EntityId; socket: string }
  | { kind: "hand"; character: EntityId; side: "left" | "right" }
  | { kind: "container"; parent: EntityId }
  | { kind: "staging"; room: RoomId };
export type Bounds = Readonly<{ left: number; top: number; width: number; height: number }>;
export type DepthBand = "background" | "furniture-back" | "occupant" | "furniture-front" | "foreground" | "drag" | "ui";
export type SceneEntity = {
  id: EntityId;
  room: RoomId;
  attachment: Attachment;
  contact: RoomPoint;
  bounds: Bounds;
  base: CharacterBase;
  facing: Facing;
  action: CharacterAction;
  parent?: EntityId;
  children: EntityId[];
  depth: number;
  band: DepthBand;
  hitProxies: Bounds[];
  item?: Instance;
  character?: Character;
};
export type Scene = {
  revision: string;
  entities: Record<EntityId, SceneEntity>;
  rooms: Record<RoomId, RoomIndex>;
};
export type FloorLocation = {
  cell: GridCell;
  contact: RoomPoint;
  /** IDs blocking this cell. Filter the subject's moving group at query time. */
  blockers: EntityId[];
  occlusion: readonly [number, number, number];
};
export type Target = {
  id: string;
  kind: "hand" | "mouth" | "socket" | "surface" | "container";
  attachment: Attachment;
  contact: RoomPoint;
  core: Bounds;
  base: CharacterBase;
  facing: Facing;
  owner: EntityId;
  occupied?: EntityId;
  slot?: number;
  pet?: boolean;
  hidden?: boolean;
  closed?: boolean;
};
/** Prepared at settled edits, never a Map, function, class or native handle. */
export type RoomIndex = {
  room: RoomId;
  revision: string;
  entities: Record<EntityId, SceneEntity>;
  floor: FloorLocation[];
  surfaces: Target[];
  sockets: Target[];
  targets: Target[];
  buckets: Record<string, number[]>;
  occlusionBands: { bounds: Bounds; depth: number }[];
  hitProxies: { id: EntityId; bounds: Bounds; depth: number; band: DepthBand }[];
};
export type SceneState = HomeStateV2;

export function roomPoint(x: number, y: number): RoomPoint {
  "worklet";
  return { x, y } as RoomPoint;
}
export function screenPoint(x: number, y: number): ScreenPoint {
  "worklet";
  return { x, y } as ScreenPoint;
}
export function housePoint(x: number, y: number): HousePoint {
  "worklet";
  return { x, y } as HousePoint;
}
export function gridCell(x: number, y: number): GridCell {
  "worklet";
  return { x, y } as GridCell;
}
export function gridToRoom(cell: GridCell, wall = false): RoomPoint {
  "worklet";
  return wall
    ? roomPoint(54 + cell.x * 46, 124 + cell.y * 56)
    : roomPoint(43 + cell.x * 37.5 + cell.y * 1.5, 386 + cell.y * 14.4);
}
export function roomToGrid(point: RoomPoint, wall = false): GridCell {
  "worklet";
  const y = wall ? (point.y - 124) / 56 : (point.y - 386) / 14.4;
  return gridCell(wall ? (point.x - 54) / 46 : (point.x - 43 - y * 1.5) / 37.5, y);
}
/** IDs are room-qualified because historical item IDs repeat between rooms. */
export function itemEntityId(room: RoomId, id: string): EntityId {
  "worklet";
  return `${room}/item/${id}`;
}
export function characterEntityId(slot: number): EntityId {
  "worklet";
  return `character/${slot}`;
}
