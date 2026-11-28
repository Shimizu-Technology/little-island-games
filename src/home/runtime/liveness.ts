/** Missing native callbacks must never lock input or leave a carried actor in the air. */
export const COMMIT_TIMEOUT_MS = 2500;
export const PRESENTATION_TIMEOUT_MS = 1800;
export const MAX_QUEUED_INPUTS = 64;
type Slot = { id: string; phase: string; committed: boolean; commitRequested?: boolean; commitAt?: number; settleAt: number; createdAt?: number; ready: boolean; mealPending?: boolean };
export function expiredSlot(slot: Slot, now: number): boolean {
  'worklet';
  if (!slot.id) return false;
  if (slot.commitRequested && !slot.committed) return now - (slot.commitAt ?? slot.settleAt) >= COMMIT_TIMEOUT_MS;
  if (!slot.ready && now - (slot.createdAt ?? slot.settleAt) >= PRESENTATION_TIMEOUT_MS) return true;
  return slot.phase === 'settling' && slot.committed && now - slot.settleAt >= PRESENTATION_TIMEOUT_MS;
}
export function orphanedSlot(slot: Pick<Slot, 'id' | 'phase'> & { pointer: number; synthetic?: boolean }, pointers: readonly { pointer: number; entity?: string }[], zeroTouches = false): boolean {
  'worklet';
  return !!slot.id && !slot.synthetic && slot.phase !== 'settling' &&
    (zeroTouches || !pointers.some(p => p.pointer === slot.pointer && p.entity));
}
