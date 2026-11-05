import { wardrobeRewards } from '../islander/rewards';
import { badgeRule, badgeInfo, trackLabels } from '../badges/engine';
import { isValidLook, builds, shoes, shoeColors, accessories, bottoms, brows, cheeks, freckles, hairColors, hairStyles, hats, lashes, outfitPalettes, outfits, skinTones, tops, type IslanderLook } from '../islander/look';
export type Category = Exclude<keyof IslanderLook, 'presentation'>;
export const categories: { key: Category; label: string }[] = [
  { key: 'build', label: 'Build' }, { key: 'shoes', label: 'Shoes' }, { key: 'shoeColor', label: 'Shoe colour' }, { key: 'skinTone', label: 'Skin' }, { key: 'brows', label: 'Brows' }, { key: 'lashes', label: 'Lashes' }, { key: 'freckles', label: 'Freckles' }, { key: 'cheeks', label: 'Cheeks' }, { key: 'hairStyle', label: 'Hair' }, { key: 'hairColor', label: 'Hair colour' }, { key: 'outfit', label: 'Outfit' }, { key: 'top', label: 'Top' }, { key: 'bottom', label: 'Bottom' }, { key: 'palette', label: 'Clothes colour' }, { key: 'hat', label: 'Hat' }, { key: 'accessory', label: 'Accessory' },
];
export type Audience = 'girls' | 'boys' | 'everyone';
export const audienceLabels: Record<Audience, string> = { girls: 'Girls', boys: 'Boys', everyone: 'Everyone' };
/** Labels only: every item stays shown and wearable by anyone. Anything unlisted in a sorted category is Everyone. */
const audienceTable: Partial<Record<Category, Partial<Record<Exclude<Audience, 'everyone'>, readonly string[]>>>> = {
  hairStyle: { girls: ['ponytail', 'braids', 'afro-puffs', 'top-knot', 'long-straight', 'long-wavy', 'pigtails', 'bob'], boys: ['crop', 'buzz-cut', 'short-spiky', 'side-part', 'mohawk-fade'] },
  outfit: { girls: ['sundress', 'skirt-tee', 'jersey-dress', 'ruffle-dress', 'tutu-set', 'star-dress', 'storybook-dress', 'comet-gown'], boys: ['board-shorts-set', 'polo-shorts', 'aloha-shorts', 'varsity-jacket', 'skater-set', 'smart-vest', 'circuit-hoodie', 'captain-coat'] },
  bottom: { girls: ['skirt'], boys: ['board-shorts', 'cargo-shorts'] },
  hat: { girls: ['flower-crown'], boys: ['cap', 'captain-cap'] },
};
export const audienceFor = (category: Category, value: string): Audience | undefined => { const row = audienceTable[category]; return !row ? undefined : row.girls?.includes(value) ? 'girls' : row.boys?.includes(value) ? 'boys' : 'everyone'; };
/** The child's own section leads; a "me" child, or one who has not chosen, leads with Everyone. */
export const audienceOrder = (presentation: IslanderLook['presentation']): readonly Audience[] => presentation === 'girl' ? ['girls', 'everyone', 'boys'] : presentation === 'boy' ? ['boys', 'everyone', 'girls'] : ['everyone', 'girls', 'boys'];
export type StyleItem = { id: string; category: Category; value: string; label: string; color?: string; starter: boolean; track?: string; lockedReason?: string; audience?: Audience };
export const pretty = (value: string) => value.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
const choices = { build: builds, shoes, shoeColor: Object.keys(shoeColors), skinTone: Object.keys(skinTones), brows, lashes, freckles, cheeks, hairStyle: hairStyles, hairColor: Object.keys(hairColors), outfit: outfits, top: tops, bottom: bottoms, palette: Object.keys(outfitPalettes), hat: hats, accessory: accessories };
export const styleCatalog: readonly StyleItem[] = categories.flatMap(({ key }) => choices[key].map(value => ({
  id: `${key.toLowerCase()}:${value}`, category: key, value, label: wardrobeRewards.find(r => r.slot === key && r.id === value)?.name ?? (value === 'none' ? 'None' : value === 'mix' ? 'Mix & match' : pretty(value)), track: (() => { const reward = wardrobeRewards.find(r => r.slot === key && r.id === value); return reward ? trackLabels[badgeInfo(reward.badge).track] : undefined; })(), starter: !wardrobeRewards.some(r => r.slot === key && r.id === value), lockedReason: (() => { const r = wardrobeRewards.find(r => r.slot === key && r.id === value); return r ? badgeRule(r.badge) : undefined; })(),
  audience: audienceFor(key, value),
  color: key === 'shoeColor' ? shoeColors[value as keyof typeof shoeColors] : key === 'skinTone' ? skinTones[value as keyof typeof skinTones] : key === 'hairColor' ? hairColors[value as keyof typeof hairColors] : key === 'palette' ? outfitPalettes[value as keyof typeof outfitPalettes].primary : undefined,
})));
export const lockedReason = (item: StyleItem, earned: readonly string[]) => item.starter || earned.includes(item.id) ? undefined : item.lockedReason ?? 'Complete an island milestone to earn this style.';
export function canWear(look: IslanderLook, earned: readonly string[], catalog = styleCatalog) {
  if (!isValidLook(look)) return false;
  return Object.entries(look).every(([category, value]) => {
    if (category === 'presentation') return ['boy', 'girl', 'me'].includes(value);
    const item = catalog.find(i => i.category === category && i.value === value);
    return !!item && !lockedReason(item, earned);
  });
}

export function lookWithStyle(look: IslanderLook, item: Pick<StyleItem, 'category' | 'value'>): IslanderLook {
  const mixed = item.category === 'top' || item.category === 'bottom' || item.category === 'outfit' && item.value === 'mix';
  return { ...look, ...(mixed ? { outfit: 'mix', top: look.top ?? 'tee', bottom: look.bottom ?? 'shorts' } : {}), [item.category]: item.value } as IslanderLook;
}

export const selectedValue = (look: IslanderLook, category: Category): string => look[category] ?? (category === 'build' ? (look.presentation === 'boy' || look.presentation === 'girl' ? look.presentation : 'neutral') : category === 'shoes' ? 'sneakers' : category === 'shoeColor' ? 'cream' : category === 'lashes' || category === 'freckles' ? 'none' : category === 'brows' ? 'soft' : category === 'cheeks' ? 'rosy' : category === 'top' ? 'tee' : category === 'bottom' ? 'shorts' : look.outfit === 'hoodie' ? 'twilight' : look.outfit === 'explorer' ? 'lagoon' : 'coral');
