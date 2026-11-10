import type { SpritePose } from '../../poses';

/** Painter rank at or above this frame value is nearer than the runner (painterDepth > 1). */
export const FRONT_FRAME = 10000;
/** A stable draw key for one actor's whole lifetime. Rows never overtake each other, so newer
 * serials are always farther away; within a row, shells and power sit nearer than its hazards.
 * The value changes only when a recycled slot gets a new actor, never while it moves. */
export function stableDrawOrder(painterKey: number) {
  'worklet';
  const serial = Math.floor(painterKey / 7), part = painterKey - serial * 7;
  return (1 << 30) - serial * 8 + part;
}
export function depthLayer(p: SpritePose, front: boolean) {
  'worklet';
  const visible = (p.opacity ?? 1) > 0;
  return visible && ((p.frame ?? 0) >= FRONT_FRAME) === front ? p.opacity ?? 1 : 0;
}

/** Teaching cue variants, indexed by pose 57's frame. */
export const CUE_MOVES = ['jump', 'duck', 'left', 'right'] as const;
