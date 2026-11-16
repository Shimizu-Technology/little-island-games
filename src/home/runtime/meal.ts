import type { Instance } from '../model';
import type { MealFrame } from '../../islander/rig/character';

/** Art only: the resolver has already committed consumption and its undo. */
export type Meal = Readonly<{ key: number; food: Instance; action: 'eat' | 'drink' }>;
export const MEAL_MS = 750;
export const mealTimes = [0, 30, 60, 90, 120, 150, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720] as const;
export function mealIndex(ms: number): number {
  'worklet';
  let index = 0;
  for (let i = 1; i < mealTimes.length; i++) if (ms >= mealTimes[i]) index = i;
  return index;
}
export function mealFrame(ms: number, reduced = false): MealFrame {
  // An ease-out reach, a clear bite, then an easy downward return while chewing.
  const t = Math.max(0, Math.min(1, ms / 180));
  const down = Math.max(0, Math.min(1, (ms - 360) / 240));
  return { reach: reduced ? 1 : ms < 180 ? 1 - (1 - t) ** 2 : 1 - down * down * (3 - 2 * down),
    bite: ms >= 150 && ms < 360, chew: Math.floor(ms / 120) % 2 === 0 };
}
