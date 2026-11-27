import type { Save } from '../state/validation';
import type { Atmosphere } from './atmosphere';

export const seasonalPacks = [
  { id: 'harvest-fiesta', name: 'Harvest Fiesta', occasion: 'Thanksgiving together', rounds: 3,
    items: ['pumpkin-pie', 'fiesta-platter', 'autumn-wreath'], wallpaper: 'harvest', floor: 'harvest-wood',
    atmosphere: { timeOfDay: 'sunset', weather: 'leaves' }, preview: 'pumpkin-pie',
    description: 'Pumpkin pie, a feast to share, and a golden wreath.' },
  { id: 'island-snow', name: 'Island Snow', occasion: 'Christmas on our island', rounds: 6,
    items: ['christmas-tree', 'gift-box', 'hot-cocoa'], wallpaper: 'snow-cozy', floor: 'snow-wood',
    atmosphere: { timeOfDay: 'night', weather: 'snow' }, preview: 'christmas-tree',
    description: 'Twinkling tree lights, a festive gift, and warm cocoa.' },
  { id: 'island-fiesta', name: 'Island Fiesta Night', occasion: 'A little celebration', rounds: 9,
    items: ['fiesta-platter', 'string-lights', 'lantern'], wallpaper: 'fiesta-night', floor: 'fiesta-wood',
    atmosphere: { timeOfDay: 'night', weather: 'fireflies' }, preview: 'fiesta-platter',
    description: 'Share a fiesta platter under lanterns and dancing fireflies.' },
] as const satisfies readonly { id: string; name: string; occasion: string; rounds: number; items: readonly string[]; wallpaper: string; floor: string; atmosphere: Atmosphere; preview: string; description: string }[];
export type SeasonalPackId = typeof seasonalPacks[number]['id'];
export const seasonalItems = ['christmas-tree', 'gift-box', 'hot-cocoa', 'pumpkin-pie', 'fiesta-platter', 'autumn-wreath'] as const;
/** Counts durable per-learner round records, including helped and together play. No stars or duplicate ledger. */
export function completedLearningRounds(save: Save, owner = save.learning?.active ?? 'family'): number {
  const profile = save.profiles?.people[owner];
  const progress = owner === (save.learning?.active ?? 'family') ? { school: save.school ?? profile?.school, schoolTogether: save.schoolTogether ?? profile?.schoolTogether } : profile;
  return [progress?.school, progress?.schoolTogether].reduce((total, school) => total + Object.values(school ?? {}).reduce((n, levels) =>
    n + Object.values(levels ?? {}).reduce((sum, row) => sum + row.completed, 0), 0), 0);
}
export const unlockedSeasonalPacks = (rounds: number, grownUp = false) => seasonalPacks.filter(pack => grownUp || rounds >= pack.rounds);
