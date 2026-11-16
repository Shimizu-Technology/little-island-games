import type { SceneEntity } from '../scene/types';
import type { DragSlot } from './useInteraction';
import { carryLift, carriedPropGrowth } from './carry';
import { settleProgress } from './settle';
import { dangle, faceSample, giggleTilt, pickupFace, squashCurve, squashDepth, squashes, squashScale, SQUASH_MS } from './delight';

/**
 * Which pre-mounted carry frame shows: the limb-lag sample (-4…4) and the face (HD-01:
 * 0 plain, 1 glance, 2 smile). The carried prop in a friend's hand reads the same sample,
 * so it stays in the hand whatever the legs do.
 */
export function carryDisplay(slot: DragSlot, now: number, reduced: boolean): { sample: number; face: 0 | 1 | 2 } {
  'worklet';
  const base = reduced ? 0 : Math.max(-4, Math.min(4, Math.round(slot.lag / 2.5)));
  if (!slot.id || !slot.ready || slot.phase !== 'dragging') return { sample: base, face: 0 };
  let sample = base;
  if (!reduced) sample = Math.max(-4, Math.min(4, sample + dangle(now - Math.max(slot.lastMoveAt, slot.liftedAt)).sample));
  const face = pickupFace(now - slot.liftedAt);
  if (face === 1) sample = 0;
  else if (face === 2) sample = reduced ? 0 : faceSample(sample);
  return { sample, face };
}

/** HD-01: a carried friend's giggle and dangle, as degrees about the grip. Zero for props. */
export function carrySway(slot: DragSlot, root: SceneEntity, now: number, reduced: boolean) {
  'worklet';
  if (reduced || !root.character || !slot.ready || slot.phase !== 'dragging') return 0;
  return giggleTilt(now - slot.liftedAt) + dangle(now - Math.max(slot.lastMoveAt, slot.liftedAt)).tilt;
}

/** Resting and overlay art use exactly the same transform during their one-frame handoff. */
export function pickupTransform(slot: DragSlot, root: SceneEntity, scale: number, now: number, reduced: boolean) {
  'worklet';
  const settling = slot.phase === 'settling' && slot.settleAt > 0 || slot.phase === 'pending' && slot.pausedElapsed > 0;
  const elapsed = settling ? slot.phase === 'pending' ? slot.pausedElapsed : now - slot.settleAt : 0;
  const lift = reduced || !slot.ready ? 0 : Math.min(1, Math.max(0, (now - slot.liftedAt) / 90));
  const blend = settling ? Math.max(0, 1 - elapsed / 140) : 1;
  const growth = root.character ? .04 : carriedPropGrowth;
  const p = settling ? settleProgress(elapsed - slot.travelDelay, reduced, slot.duration) : 0;
  const hop = !reduced && slot.synthetic && root.character && settling
    ? Math.sin(Math.PI * p) * Math.min(22 / scale, Math.hypot(slot.targetX - slot.releaseX, slot.targetY - slot.releaseY) * .12) : 0;
  const amount = reduced ? 0 : growth * (settling ? blend : lift);
  return { lift: (reduced ? 0 : carryLift(root, scale) * lift * blend) + hop,
    // HD-02: the landing squash is drawn about the contact by the overlay (`landingSquash`).
    tilt: reduced ? 0 : slot.tilt + carrySway(slot, root, now, reduced), scaleX: 1 + amount, scaleY: 1 + amount };
}

/**
 * HD-02: the landing squash, drawn about the contact point. It happens inside the settle (the
 * last SQUASH_MS of travel), so it is finished before the resting art takes over and nothing
 * pops. A catalog piece squashes after it lands, before its reveal (which waits 160 ms).
 */
export function landingSquash(slot: DragSlot, root: SceneEntity, give: number, scale: number, now: number, reduced: boolean) {
  'worklet';
  if (reduced || !slot.ready || !squashes(slot.proposal?.kind)) return { sx: 1, sy: 1 };
  let curve = 0;
  if (slot.catalog) curve = slot.landedAt ? squashCurve(now - slot.landedAt, SQUASH_MS) : 0;
  else if ((slot.phase === 'settling' && slot.settleAt > 0) || (slot.phase === 'pending' && slot.pausedElapsed > 0)) {
    const elapsed = (slot.phase === 'pending' ? slot.pausedElapsed : now - slot.settleAt) - slot.travelDelay;
    curve = squashCurve(elapsed, slot.duration ?? 240);
  }
  if (curve <= 0) return { sx: 1, sy: 1 };
  const fall = Math.max(0, (slot.targetY - slot.releaseY) * scale) + carryLift(root, scale) * scale;
  return squashScale(squashDepth(give, fall), curve);
}

/** A shadow follows the actual support footprint; no one-size-fits-all ellipse. */
export function footprintShadow(entity: SceneEntity) {
  const width = entity.character ? entity.bounds.width * .55 : Math.max(16, (entity.body?.w ?? 1) * 37.5);
  return { width, height: Math.max(5, Math.min(22, width * .2)) };
}
