import type { Scene, SceneEntity } from "../scene/types";
export function groupIds(scene: Scene, id: string): string[] {
  const result: string[] = [];
  const visit = (key: string) => {
    if (result.includes(key)) return;
    const entity = scene.entities[key];
    if (!entity) return;
    result.push(key);
    entity.children.forEach(visit);
  };
  visit(id);
  return result;
}
/** Paint depth uses the visible ground anchor, independently of grid occupancy.
 * Supported children stay between their parent's back and front paint passes. */
export function paintDepth(entity: SceneEntity, scene: Scene): number {
  if (entity.band === "foreground") return entity.depth;
  if (entity.parent && scene.entities[entity.parent]) {
    const parent = paintDepth(scene.entities[entity.parent], scene);
    return parent + (entity.attachment.kind === "socket" ? 1 : 0.5);
  }
  return entity.item && entity.attachment.kind === "floor" ? entity.contact.y : entity.depth;
}
export function paintEntries(
  entities: SceneEntity[],
  scene: Scene
): { entity: SceneEntity; front: boolean; depth: number }[] {
  return entities
    .flatMap((entity) => [
      { entity, front: false, depth: paintDepth(entity, scene) },
      ...(entity.item && entity.children.some((id) => scene.entities[id]?.attachment.kind === "socket")
        ? [{ entity, front: true, depth: paintDepth(entity, scene) + 2 }]
        : []),
    ])
    .sort(
      (a, b) =>
        Number(b.entity.item?.layer === "ground") - Number(a.entity.item?.layer === "ground") ||
        a.depth - b.depth ||
        a.entity.id.localeCompare(b.entity.id)
    );
}

/** Stored descendants are represented by their container and its pictorial contents chooser. */
export function restingVisible(entity: SceneEntity, scene: Scene, capturedRoot?: string): boolean {
  let current: SceneEntity | undefined = entity;
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.id === capturedRoot) return true;
    if (current.attachment.kind === "staging" || current.attachment.kind === "container") return false;
    current = current.parent ? scene.entities[current.parent] : undefined;
  }
  return true;
}
