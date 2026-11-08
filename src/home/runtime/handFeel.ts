import type { SceneEntity } from '../scene/types';
import type { DragSlot } from './useInteraction';
import { carryLift, carriedPropGrowth } from './carry';
import { settleProgress } from './settle';

/** Resting and overlay art use exactly the same transform during their one-frame handoff. */
export function pickupTransform(slot: DragSlot, root: SceneEntity, scale: number, now: number, reduced: boolean) {
  'worklet';
  const settling = slot.phase === 'settling' && slot.settleAt > 0 || slot.phase === 'pending' && slot.pausedElapsed > 0;
  const elapsed = settling ? slot.phase === 'pending' ? slot.pausedElapsed : now - slot.settleAt : 0;
  const lift = reduced || !slot.ready ? 0 : Math.min(1, Math.max(0, (now - slot.liftedAt) / 90));
  const blend = settling ? Math.max(0, 1 - elapsed / 140) : 1;
  const growth = root.character ? .04 : carriedPropGrowth;
  const accentElapsed = slot.catalog ? slot.landedAt ? now - slot.landedAt : -1 : elapsed;
  const accent = !reduced && settling && slot.proposal?.kind === 'floor' && accentElapsed >= 0 && accentElapsed < 160
    ? Math.max(0, accentElapsed < 60 ? accentElapsed / 60 : (160 - accentElapsed) / 100) : 0;
  const p = settling ? settleProgress(elapsed - slot.travelDelay, reduced, slot.duration) : 0;
  const hop = !reduced && slot.synthetic && root.character && settling
    ? Math.sin(Math.PI * p) * Math.min(22 / scale, Math.hypot(slot.targetX - slot.releaseX, slot.targetY - slot.releaseY) * .12) : 0;
  const amount = reduced ? 0 : growth * (settling ? blend : lift);
  return { lift: (reduced ? 0 : carryLift(root, scale) * lift * blend) + hop,
    tilt: reduced ? 0 : slot.tilt, scaleX: 1 + amount + .02 * accent, scaleY: 1 + amount - .02 * accent };
}

/** A shadow follows the actual support footprint; no one-size-fits-all ellipse. */
export function footprintShadow(entity: SceneEntity) {
  const width = entity.character ? entity.bounds.width * .55 : Math.max(16, (entity.body?.w ?? 1) * 37.5);
  return { width, height: Math.max(5, Math.min(22, width * .2)) };
}
