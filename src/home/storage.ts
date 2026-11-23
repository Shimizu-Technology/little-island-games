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
