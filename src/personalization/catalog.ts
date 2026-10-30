import { wardrobeRewards } from '../islander/rewards';
import { badgeRule, badgeInfo, trackLabels } from '../badges/engine';
import { accessories, hairColors, hairStyles, hats, outfitPalettes, outfits, skinTones, type IslanderLook } from '../islander/look';
export type Category = keyof IslanderLook;
export const categories: { key: Category; label: string }[] = [
  { key: 'skinTone', label: 'Skin' }, { key: 'hairStyle', label: 'Hair' }, { key: 'hairColor', label: 'Hair colour' }, { key: 'outfit', label: 'Outfit' }, { key: 'palette', label: 'Outfit colour' }, { key: 'hat', label: 'Hat' }, { key: 'accessory', label: 'Accessory' },
];
export type StyleItem = { id: string; category: Category; value: string; label: string; color?: string; starter: boolean; track?: string; lockedReason?: string };
export const pretty = (value: string) => value.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
const choices = { skinTone: Object.keys(skinTones), hairStyle: hairStyles, hairColor: Object.keys(hairColors), outfit: outfits, palette: Object.keys(outfitPalettes), hat: hats, accessory: accessories };
export const styleCatalog: readonly StyleItem[] = categories.flatMap(({ key }) => choices[key].map(value => ({
  id: `${key.toLowerCase()}:${value}`, category: key, value, label: wardrobeRewards.find(r => r.slot === key && r.id === value)?.name ?? (value === 'none' ? 'None' : pretty(value)), track: (() => { const reward = wardrobeRewards.find(r => r.slot === key && r.id === value); return reward ? trackLabels[badgeInfo(reward.badge).track] : undefined; })(), starter: !wardrobeRewards.some(r => r.slot === key && r.id === value), lockedReason: (() => { const r = wardrobeRewards.find(r => r.slot === key && r.id === value); return r ? badgeRule(r.badge) : undefined; })(),
  color: key === 'skinTone' ? skinTones[value as keyof typeof skinTones] : key === 'hairColor' ? hairColors[value as keyof typeof hairColors] : key === 'palette' ? outfitPalettes[value as keyof typeof outfitPalettes].primary : undefined,
})));
export const lockedReason = (item: StyleItem, earned: readonly string[]) => item.starter || earned.includes(item.id) ? undefined : item.lockedReason ?? 'Complete an island milestone to earn this style.';
export function canWear(look: IslanderLook, earned: readonly string[], catalog = styleCatalog) {
  return Object.entries(look).every(([category, value]) => {
    const item = catalog.find(i => i.category === category && i.value === value);
    return !!item && !lockedReason(item, earned);
  });
}

export const selectedValue = (look: IslanderLook, category: Category): string => look[category] ?? (look.outfit === 'hoodie' ? 'twilight' : look.outfit === 'explorer' ? 'lagoon' : 'coral');
