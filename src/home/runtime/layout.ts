import type { SceneEntity } from "../scene/types";
/** Identifies the actual native placement/pose subtree, independently of JS revision. */
export function layoutToken(entity: SceneEntity): string {
  "worklet";
  return JSON.stringify([entity.room, entity.contact.x, entity.contact.y, entity.base, entity.facing, entity.action,
    entity.item?.rotation, entity.item?.mirrored, entity.item?.powered, entity.item?.state, entity.children]);
}
