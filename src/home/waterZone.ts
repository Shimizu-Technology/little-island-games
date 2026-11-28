import type { RoomId } from './catalogMore';
import type { Scene, SceneEntity } from './scene/types';

/**
 * Pure geometric water bounds calibrated to the turquoise lagoon/shallows of
 * `tumon-beach.webp` and `cocos-island.webp` in the 800×560 room coordinate space.
 */
export function waterShoreY(room: RoomId, x: number): number | undefined {
  if (room !== 'tumon-beach') return undefined;
  const clampedX = Math.max(0, Math.min(800, x));
  if (clampedX <= 520) return 425;
  const t = (clampedX - 520) / (780 - 520);
  return 425 - Math.max(0, Math.min(1, t)) * 33;
}

export function cocosShoreX(y: number): number {
  const clampedY = Math.max(260, Math.min(560, y));
  if (clampedY <= 405) {
    // Upper bay curve sweeping right from x=220 at y=280 to the sandy point at (485, 405).
    const t = Math.max(0, Math.min(1, (clampedY - 280) / (405 - 280)));
    return 220 + t * 265;
  }
  // Lower crescent sweeping back left from (485, 405) down to (300, 560).
  const t = Math.max(0, Math.min(1, (clampedY - 405) / (560 - 405)));
  return 485 - t * 185;
}

export function isBeachWaterRoom(room: RoomId): boolean {
  return room === 'tumon-beach' || room === 'cocos-island';
}

export function isInWaterZone(room: RoomId, point: { x: number; y: number }): boolean {
  if (room === 'tumon-beach') {
    if (point.x < 12 || point.x > 785 || point.y < 245) return false;
    const shoreY = waterShoreY(room, point.x)!;
    return point.y <= shoreY;
  }
  if (room === 'cocos-island') {
    if (point.x < 220 || point.x > 792 || point.y < 270 || point.y > 556) return false;
    return point.x >= cocosShoreX(point.y);
  }
  return false;
}

const waterRideItems = new Set(['swim-ring', 'outrigger-canoe', 'beach-surfboard', 'sea-turtle']);

export function isWaterRideItem(itemId: string): boolean {
  return waterRideItems.has(itemId);
}

/** True when a character is wading/swimming in the lagoon or riding a floatie/canoe/board in water. */
export function isEntitySwimming(entity: SceneEntity, scene?: Pick<Scene, 'entities'>): boolean {
  if (!entity.character || !isBeachWaterRoom(entity.room)) return false;
  if (entity.attachment.kind === 'staging') return false;
  if (entity.attachment.kind === 'socket' && scene) {
    const parent = scene.entities[entity.attachment.item];
    if (parent?.item && isWaterRideItem(parent.item.item)) {
      return isInWaterZone(entity.room, parent.contact) || isInWaterZone(entity.room, entity.contact);
    }
    return false;
  }
  return isInWaterZone(entity.room, entity.contact);
}

/** Bounding box of the leaning coconut palms in `cocos-island.webp` (800×560 room space). */
export const COCOS_PALM_HOTSPOT = {
  left: 16,
  top: 12,
  width: 280,
  height: 245,
} as const;

export const MAX_PALM_COCONUTS = 2;

export function isPointInCocosPalm(point: { x: number; y: number }): boolean {
  return (
    point.x >= COCOS_PALM_HOTSPOT.left &&
    point.x <= COCOS_PALM_HOTSPOT.left + COCOS_PALM_HOTSPOT.width &&
    point.y >= COCOS_PALM_HOTSPOT.top &&
    point.y <= COCOS_PALM_HOTSPOT.top + COCOS_PALM_HOTSPOT.height
  );
}
