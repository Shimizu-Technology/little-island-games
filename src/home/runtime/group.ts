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
export function paintEntries(
  entities: SceneEntity[],
  scene: Scene
): { entity: SceneEntity; front: boolean; depth: number }[] {
  return entities
    .flatMap((entity) => [
      { entity, front: false, depth: entity.depth },
      ...(entity.item && entity.children.some((id) => scene.entities[id]?.attachment.kind === "socket")
        ? [{ entity, front: true, depth: entity.depth + 2 }]
        : []),
    ])
    .sort((a, b) => a.depth - b.depth || a.entity.id.localeCompare(b.entity.id));
}
