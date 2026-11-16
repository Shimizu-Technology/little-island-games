import { itemSpec } from "../catalog";
import type { EntityId, SceneEntity } from "./types";

const friends = ["Islander", "Pip", "Crab"];
/** The spoken name of an entity before any numbering. */
/** HD-07: food cooked on the stove says so. */
const cookedNames: Record<string, string> = { mango: "Grilled mango", banana: "Fried banana", "rice-ball": "Toasted rice ball", cupcake: "Warm cupcake" };
export const entityName = (entity: SceneEntity) =>
  entity.character ? friends[entity.character.slot]
    : (entity.item!.powered && cookedNames[entity.item!.item]) || itemSpec(entity.item!.item).name;

/**
 * Accessible names for entities that share a room. Same-name entities in one room are numbered
 * left to right ("Floor cushion 1 of 2") so a screen reader can tell them apart; a name that is
 * unique in its room stays plain. Ties break on id so the numbering is stable between renders.
 */
export function entityLabels(entities: readonly SceneEntity[]): Record<EntityId, string> {
  const groups = new Map<string, SceneEntity[]>();
  for (const entity of entities) {
    const key = `${entity.room}:${entityName(entity)}`;
    groups.set(key, [...(groups.get(key) ?? []), entity]);
  }
  const labels: Record<EntityId, string> = {};
  for (const group of groups.values()) {
    const ordered = [...group].sort((a, b) => a.contact.x - b.contact.x || a.id.localeCompare(b.id));
    for (const [index, entity] of ordered.entries())
      labels[entity.id] = ordered.length > 1 ? `${entityName(entity)} ${index + 1} of ${ordered.length}` : entityName(entity);
  }
  return labels;
}
