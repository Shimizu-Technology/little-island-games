import { anchorsFor } from './scene/species';
import { roomPoint, type RoomPoint, type CharacterBase, type Facing } from './scene/types';
import type { FamilySlot } from './family';

/** Runtime geometry only. The existing validated holding relationship saves a worn ring. */
export function floatyFrame(slot: FamilySlot, base: CharacterBase, facing: Facing) {
  'worklet';
  const standing = anchorsFor(slot, 'stand', facing).bounds;
  const bounds = base === 'carry' ? anchorsFor(slot, base, facing).bounds : standing;
  const size = Math.max(78, Math.min(bounds.width, standing.width) * (slot === 2 ? 1.22 : 1.05));
  // The painted ring's opening is centred at 55% of its square; align to the waist.
  const waist = bounds.top + bounds.height * (slot === 2 ? .68 : .69);
  return { left: bounds.left + bounds.width / 2 - size / 2, top: waist - size * .48 * .55, width: size, height: size * .48 };
}

/** Keep the complete upright wearer, including the slightly wider ring, inside the room. */
export function floatyContact(point: RoomPoint, slot: FamilySlot, facing: Facing): RoomPoint {
  'worklet';
  const body = anchorsFor(slot, 'stand', facing).bounds;
  const ring = floatyFrame(slot, 'stand', facing);
  const left = Math.min(body.left, ring.left), right = Math.max(body.left + body.width, ring.left + ring.width);
  return roomPoint(Math.max(8 - left, Math.min(792 - right, point.x)), point.y);
}

/** The lower ring rim (or mid-torso without a ring) meets the water, never the feet.
 * Relative to the unchanged saved floor contact; shared by paint and touch geometry. */
export function swimWaterline(slot: FamilySlot, base: CharacterBase, facing: Facing, buoyant: boolean): number {
  'worklet';
  if (buoyant) {
    const ring = floatyFrame(slot, base, facing);
    const body = anchorsFor(slot, base, facing).bounds;
    // Small companions sit deeper inside the same ring; their feet must submerge too.
    return Math.min(ring.top + ring.height * .9, body.top + body.height * .82);
  }
  const body = anchorsFor(slot, base, facing).bounds;
  return body.top + body.height * .67;
}
