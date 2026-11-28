/** Missing native callbacks must never lock input or leave a carried actor in the air. */
export const COMMIT_TIMEOUT_MS = 2500;
export const PRESENTATION_TIMEOUT_MS = 1800;
export const MAX_QUEUED_INPUTS = 64;
type Slot = { id: string; phase: string; committed: boolean; commitRequested?: boolean; commitAt?: number; settleAt: number; createdAt?: number; ready: boolean; mealPending?: boolean };
export function expiredSlot(slot: Slot, now: number): boolean {
  'worklet';
  if (!slot.id) return false;
  const since = slot.commitAt ?? (slot.settleAt || slot.createdAt);
  if (slot.commitRequested && !slot.committed) return !!since && now - since >= COMMIT_TIMEOUT_MS;
  const created = slot.createdAt || slot.settleAt;
  if (!slot.ready && created && now - created >= PRESENTATION_TIMEOUT_MS) return true;
  return slot.phase === 'settling' && slot.committed && slot.settleAt > 0 && now - slot.settleAt >= PRESENTATION_TIMEOUT_MS;
}
export function orphanedSlot(slot: Pick<Slot, 'id' | 'phase'> & { pointer: number; synthetic?: boolean }, pointers: readonly { pointer: number; entity?: string }[], zeroTouches = false): boolean {
  'worklet';
  return !!slot.id && !slot.synthetic && slot.phase !== 'settling' &&
    (zeroTouches || !pointers.some(p => p.pointer === slot.pointer && p.entity));
}
