import type { RoomId } from './catalogMore';
import type { Scene, SceneEntity } from './scene/types';

function lerpCurve(value: number, knots: readonly (readonly [number, number])[]): number {
  if (value <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    const [x0, y0] = knots[i - 1];
    const [x1, y1] = knots[i];
    if (value <= x1) {
      const t = (value - x0) / Math.max(1e-6, x1 - x0);
      return y0 + (y1 - y0) * t;
    }
  }
  return knots[knots.length - 1][1];
}

/**
 * Pure geometric water bounds pixel-calibrated to the wet turquoise lagoon/foam shorelines of
 * `tumon-beach.webp` and `cocos-island.webp` in the 800×560 room coordinate space.
 */
const TUMON_SHORE_KNOTS: readonly (readonly [number, number])[] = [
  [0, 354],
  [100, 354],
  [380, 346],
  [540, 326],
  [660, 314],
  [755, 296],
];

const COCOS_SHORE_KNOTS: readonly (readonly [number, number])[] = [
  [256, 310],
  [276, 310],
  [296, 205],
  [324, 316],
  [340, 448],
  [360, 530],
  [404, 612],
  [468, 620],
  [500, 526],
  [532, 432],
  [560, 340],
];

export function waterFloorMinY(room: RoomId): number {
  "worklet";
  if (room === 'tumon-beach') return 256;
  if (room === 'cocos-island') return 256;
  return 350;
}

export function waterShoreY(room: RoomId, x: number): number | undefined {
  if (room !== 'tumon-beach') return undefined;
  const clampedX = Math.max(0, Math.min(755, x));
  return lerpCurve(clampedX, TUMON_SHORE_KNOTS);
}

export function cocosShoreX(y: number): number {
  const clampedY = Math.max(256, Math.min(560, y));
  return lerpCurve(clampedY, COCOS_SHORE_KNOTS);
}

export function isBeachWaterRoom(room: RoomId): boolean {
  return room === 'tumon-beach' || room === 'cocos-island';
}

export function isInWaterZone(room: RoomId, point: { x: number; y: number }): boolean {
  if (room === 'tumon-beach') {
    if (point.x < 12 || point.x > 755 || point.y < 248) return false;
    const shoreY = waterShoreY(room, point.x)!;
    return point.y <= shoreY;
  }
  if (room === 'cocos-island') {
    if (point.x < 200 || point.x > 792 || point.y < 256 || point.y > 556) return false;
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
