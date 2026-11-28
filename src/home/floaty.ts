import { anchorsFor } from './scene/species';
import type { CharacterBase, Facing } from './scene/types';
import type { FamilySlot } from './family';

/** Runtime geometry only. The existing validated holding relationship saves a worn ring. */
export function floatyFrame(slot: FamilySlot, base: CharacterBase, facing: Facing) {
  'worklet';
  const bounds = anchorsFor(slot, base, facing).bounds;
  const size = Math.max(78, bounds.width * (slot === 2 ? 1.22 : 1.05));
  // The painted ring's opening is centred at 55% of its square; align to the waist.
  const waist = bounds.top + bounds.height * (slot === 2 ? .68 : .69);
  return { left: -size / 2, top: waist - size * .48 * .55, width: size, height: size * .48 };
}
