import type { SceneEntity } from "../scene/types";
/** How the carried overlay is drawn. The aim test reads the same numbers, so food is tested where it shows. */
export const carriedPropGrowth = 0.08;
export function liftsAboveFinger(entity: SceneEntity): boolean {
  "worklet";
  return !!entity.item && !entity.children.length && entity.bounds.height < 100;
}
/** Upward lift of the carried art at full pickup, in room units. */
export function carryLift(entity: SceneEntity, scale: number): number {
  "worklet";
  return Math.min(10 / scale, entity.bounds.height * 0.04) + (liftsAboveFinger(entity) ? 18 / scale : 0);
}
/** Where the middle of a carried prop's art is drawn, for a drop anchor in the same space. */
export function carriedCentre(entity: SceneEntity, x: number, y: number, gripX: number, gripY: number, scale: number, reduced = false) {
  "worklet";
  const visual = entity.visual ?? { x: 0, y: 0 }, growth = reduced ? 1 : 1 + carriedPropGrowth;
  return { x: x + gripX + (visual.x - gripX) * growth, y: y + gripY + (visual.y - gripY) * growth - (reduced ? 0 : carryLift(entity, scale)) };
}
