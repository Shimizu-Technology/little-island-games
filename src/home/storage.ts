import type { Instance } from './model';

/** HS-01: immutable authored limits. Fridge retains the earlier v4 eight-item contract. */
export function storageCapacity(item: string): number {
  'worklet';
  return item === 'toy-box' ? 6 : item === 'dresser' || item === 'carry-basket' ? 4 : item === 'cupboard' || item === 'fridge' ? 8 : 0;
}
export type StorageState = { version: 1; open: boolean };
/** Absent revision-1 state is the legacy powered/state representation; reading never rewrites it. */
export function storageOpen(item: Pick<Instance, 'storage' | 'powered' | 'state'>): boolean {
  'worklet';
  return item.storage?.open ?? item.powered ?? item.state === 'active';
}
export const STORAGE_FULL_MESSAGE = 'This is full. Take something out first.';

/** Real starter staples stocked inside a fresh kitchen fridge (leaving 2 of 8 slots open). */
export const FRIDGE_STAPLES = [
  'mango',
  'banana',
  'rice-ball',
  'cupcake',
  'juice',
  'coconut-drink',
] as const;

export const FRIDGE_RESTOCK_TARGET = FRIDGE_STAPLES.length;

/**
 * Eight shelf/door-pocket contact anchors inside the 384×384 open fridge art
 * (unmirrored coordinates normalized 0..1 of the fridge's square art box).
 * Slots 0–1: top shelf; 2–3: middle shelf; 4–5: lower shelf above crisper;
 * 6–7: top & middle door pockets.
 */
export const FRIDGE_SHELF_SLOTS: readonly (readonly [number, number])[] = [
  [115 / 384, 124 / 384],
  [174 / 384, 124 / 384],
  [115 / 384, 186 / 384],
  [174 / 384, 186 / 384],
  [115 / 384, 256 / 384],
  [174 / 384, 256 / 384],
  [276 / 384, 106 / 384],
  [276 / 384, 172 / 384],
] as const;

export function fridgeShelfOffset(slotIndex: number, size: number, flip: boolean): { x: number; y: number } {
  'worklet';
  const index = Math.max(0, Math.min(FRIDGE_SHELF_SLOTS.length - 1, slotIndex));
  const [nx, ny] = FRIDGE_SHELF_SLOTS[index];
  const xNorm = flip ? 1 - nx : nx;
  return {
    x: (xNorm - 0.5) * size,
    y: (ny - 0.85) * size,
  };
}
