import type { SceneEntity } from '../scene/types';
import { settleProgress } from './settle';

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
  const left = from ? 1 - settleProgress(elapsed, reduced, from.duration) : 0;
  if (!left) return {dx:0,dy:0,scale:1};
  return { dx: (from?.dx ?? 0) * left, dy: (from?.dy ?? 0) * left, scale: 1 + ((from?.scale ?? 1) - 1) * left };
}
