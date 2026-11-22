import type { SceneEntity } from '../scene/types';

/** Held art is centred on the hand. Floor/surface art uses a support contact. */
export function restFrom(previous: SceneEntity, next: SceneEntity) {
  if (previous.attachment.kind !== 'hand' || next.attachment.kind === 'hand' || previous.room !== next.room) return undefined;
  const scale = previous.bounds.width / next.bounds.width;
  return { x: previous.contact.x, y: previous.contact.y, scale, duration: 220,
    dx: previous.contact.x - next.contact.x - (next.visual?.x ?? 0) * scale,
    dy: previous.contact.y - next.contact.y - (next.visual?.y ?? 0) * scale };
}
export function restTransform(from: ReturnType<typeof restFrom>, elapsed: number, reduced: boolean) {
  'worklet';
  const left = from && !reduced ? 1 - Math.max(0,Math.min(1,elapsed/from.duration)) : 0;
  if (!left) return {dx:0,dy:0,scale:1};
  // Lower first, then finish the sideways set-down. Keep lateral travel spread
  // across the whole clock rather than compressing it into the first 100 ms.
  return { dx: (from?.dx ?? 0) * left, dy: (from?.dy ?? 0) * left * left, scale: 1 + ((from?.scale ?? 1) - 1) * left };
}
