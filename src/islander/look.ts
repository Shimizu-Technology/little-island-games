/** Stable wardrobe IDs. Pure data: no storage, platform imports or worklets. */
export const skinTones = { shell: '#F4D2B4', sand: '#DEAF86', honey: '#CB956D', earth: '#996445', cocoa: '#654332' } as const;
export const hairColors = { midnight: '#302C36', espresso: '#493332', chestnut: '#754A37', auburn: '#9C533B', honey: '#C59752', silver: '#D0C5BD', lagoon: '#387E86', plum: '#825B94', galaxy: '#373666', 'lightning-streak': '#302C36' } as const;
export const hairStyles = ['crop', 'curls', 'ponytail', 'braids'] as const;
export const outfits = ['island', 'sundress', 'explorer', 'hoodie', 'number-tee', 'lab-coat', 'lagoon-jersey'] as const;
export const hats = ['none', 'sunhat', 'cap', 'flower-crown', 'bookworm-beanie', 'woven-sunhat', 'runner-headband', 'captain-cap'] as const;
export const accessories = ['none', 'glasses', 'backpack', 'calculator-watch', 'reading-glasses', 'safety-goggles', 'flower-lei', 'checker-scarf'] as const;
export const outfitPalettes = { 'star-math': { primary: '#364D79', secondary: '#283B60', trim: '#F4CC76' }, storyteller: { primary: '#79516F', secondary: '#57415B', trim: '#FFF0D1' }, sunset: { primary: '#F08069', secondary: '#BD695B', trim: '#F4BC62' }, 'star-sneakers': { primary: '#438F92', secondary: '#365E68', trim: '#FFF7E9' }, royal: { primary: '#7859A0', secondary: '#514471', trim: '#F4CC76' }, coral: { primary: '#F58062', secondary: '#364D79', trim: '#FFE4A9' }, lagoon: { primary: '#58B9B1', secondary: '#365E68', trim: '#FFF0BC' }, twilight: { primary: '#7D6CB5', secondary: '#36425E', trim: '#F4CC76' } } as const;
export type IslanderLook = Readonly<{ skinTone: keyof typeof skinTones; hairStyle: typeof hairStyles[number]; hairColor: keyof typeof hairColors; outfit: typeof outfits[number]; hat: typeof hats[number]; accessory: typeof accessories[number]; palette?: keyof typeof outfitPalettes }>;
export const defaultLook: IslanderLook = Object.freeze({ skinTone: 'honey', hairStyle: 'ponytail', hairColor: 'espresso', outfit: 'island', hat: 'none', accessory: 'none' });
const choices = { skinTone: Object.keys(skinTones), hairStyle: hairStyles, hairColor: Object.keys(hairColors), outfit: outfits, hat: hats, accessory: accessories, palette: Object.keys(outfitPalettes) };
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
export function isValidLook(value: unknown): value is IslanderLook {
  if (!record(value) || Object.keys(value).some(k => !Object.hasOwn(choices, k))) return false;
  return Object.entries(choices).every(([k, ids]) => k === 'palette' && !Object.hasOwn(value, k) || typeof value[k] === 'string' && (ids as readonly string[]).includes(value[k] as string));
}
/** Preserve valid selections field by field; never mutate or retain untrusted data. */
export function normalizeLook(value: unknown): IslanderLook {
  const source = record(value) ? value : {};
  const result: Record<string, string> = { ...defaultLook };
  for (const [k, ids] of Object.entries(choices)) if (typeof source[k] === 'string' && (ids as readonly string[]).includes(source[k] as string)) result[k] = source[k] as string;
  return result as IslanderLook;
}
