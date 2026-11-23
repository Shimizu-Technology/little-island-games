import { storageOpen } from '../storage';
import { paintDepth, restingVisible } from "./group";
import { capabilityOf } from "../world";
import { itemSize } from "../geometry";
import { instance } from "../model";
import { itemEntityId, roomPoint, type Scene, type SceneEntity } from "../scene/types";
import { itemEntity, translatedBounds } from "../scene/graph";
import type { RoomId } from "../catalogMore";
/** HC-02: the three beach shells, in room units on the shore below a ground-floor room. */
export const shoreShells: readonly (readonly [number, number])[] = [[160, 624], [361, 591], [570, 641]];
export const SHORE_TOP = 560;
export const shoreShellId = (room: RoomId, n: number) => itemEntityId(room, `portion-shore-${n}`);
/** Authored shelves, inside the open source; no floating bubble menu. Beach shells, like the
 * fridge, never run out: picking one up leaves it on the sand, and placing it makes a new shell. */
export function withPortions(scene: Scene, shoreRooms: readonly RoomId[] = []): Scene {
  let changed = false;
  const entities = { ...scene.entities },
    rooms = { ...scene.rooms };
  for (const source of Object.values(scene.entities)) {
    if (!source.item || !restingVisible(source, scene)) continue;
    const choices = capabilityOf(source.item.item).dispenses;
    if (!choices || (source.item.item === "fridge" && !storageOpen(source.item)))
      continue;
    const index = {
      ...rooms[source.room],
      entities: { ...rooms[source.room].entities },
      hitProxies: [...rooms[source.room].hitProxies],
    };
    choices.forEach((item, i) => {
      const id = itemEntityId(source.room, `portion-${source.item!.id}-${item}`);
      const row = Math.floor(i / 2),
        column = i % 2;
      const contact = roomPoint(
        source.contact.x + (source.item!.item === "fridge"
          ? (column - 0.5) * 72 * (source.item!.mirrored !== (source.item!.rotation >= 180) ? -1 : 1)
          : (i - (choices.length - 1) / 2) * 44),
        source.contact.y - (source.item!.item === "fridge" ? itemSize(source.item!) * (0.85 - (row ? 111 : 60) / 150) : 28)
      );
      const seed = itemEntity(source.room, instance(`portion-${source.item!.id}-${item}`, item, 0, 0));
      const entity: SceneEntity = {
        ...seed,
        contact,
        attachment: { kind: "floor", room: source.room, at: contact },
        depth: paintDepth(source, scene) + 3,
        band: "foreground",
      };
      const bounds = translatedBounds(entity.bounds, contact);
      entities[id] = entity;
      index.entities[id] = entity;
      index.hitProxies.push({ id, bounds, depth: entity.depth, band: entity.band });
      changed = true;
    });
    rooms[source.room] = index;
  }
  for (const room of shoreRooms) {
    if (!rooms[room]) continue;
    const index = { ...rooms[room], entities: { ...rooms[room].entities }, hitProxies: [...rooms[room].hitProxies] };
    shoreShells.forEach(([x, y], n) => {
      const id = shoreShellId(room, n);
      const seed = itemEntity(index.room, instance(`portion-shore-${n}`, "shell", 0, 0));
      const contact = roomPoint(x, y);
      const entity: SceneEntity = { ...seed, contact, attachment: { kind: "floor", room: index.room, at: contact }, depth: y, band: "foreground" };
      entities[id] = entity;
      index.entities[id] = entity;
      index.hitProxies.push({ id, bounds: translatedBounds(entity.bounds, contact), depth: entity.depth, band: entity.band });
    });
    rooms[room] = index;
    changed = true;
  }
  return changed ? { ...scene, entities, rooms } : scene;
}
export function isPortion(id: string): boolean {
  return id.includes("/item/portion-");
}
