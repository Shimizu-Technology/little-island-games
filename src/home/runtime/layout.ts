import type { SceneEntity } from "../scene/types";
/** Identifies the actual native placement/pose subtree, independently of JS revision. */
export function layoutToken(entity: SceneEntity): string {
  "worklet";
  return JSON.stringify([entity.room, entity.contact.x, entity.contact.y, entity.base, entity.facing, entity.action,
    entity.item?.rotation, entity.item?.mirrored, entity.item?.powered, entity.item?.state, entity.children]);
}

/** Stored props have no resting room node. Their container's updated peek owns the handoff. */
export function restingLayoutReady(entity: SceneEntity, acknowledgements: Record<string, string>, expected: Record<string, string>): boolean {
  'worklet';
  if (entity.attachment.kind === 'staging') return true;
  const id = entity.attachment.kind === 'container' ? entity.attachment.parent : entity.id;
  return expected[id] !== undefined && acknowledgements[id] === expected[id];
}
