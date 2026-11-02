import { capabilityOf } from "../world";
import { instance } from "../model";
import { itemEntityId, roomPoint, type Scene, type SceneEntity } from "../scene/types";
import { itemEntity, translatedBounds } from "../scene/graph";
/** Authored shelves, inside the open source; no floating bubble menu. */
export function withPortions(scene: Scene): Scene {
  let changed = false;
  const entities = { ...scene.entities },
    rooms = { ...scene.rooms };
  for (const source of Object.values(scene.entities)) {
    if (!source.item) continue;
    const choices = capabilityOf(source.item.item).dispenses;
    if (!choices || (source.item.item === "fridge" && !(source.item.powered ?? source.item.state === "active")))
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
        source.contact.x + (column - 0.5) * 42,
        source.contact.y - (source.item!.item === "fridge" ? 132 - row * 52 : 28)
      );
      const seed = itemEntity(source.room, instance(`portion-${source.item!.id}-${item}`, item, 0, 0));
      const entity: SceneEntity = {
        ...seed,
        contact,
        attachment: { kind: "floor", room: source.room, at: contact },
        depth: source.depth + 3,
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
  return changed ? { ...scene, entities, rooms } : scene;
}
export function isPortion(id: string): boolean {
  return id.includes("/item/portion-");
}
