import { defaultLook, type IslanderLook } from "../islander/look";
import { lookWithStyle } from "./catalog";
import type { StyleItem } from './catalog';
/** V3 rig-space crops: head above y=70, torso at 71–100, feet at 128. */
export function thumbnailFocus(item: Pick<StyleItem, 'category' | 'value'>) {
  if (['brows', 'lashes', 'freckles', 'cheeks'].includes(item.category)) return { view: 'front' as const, box: '17 20 46 46' };
  if (item.category === 'bottom') return { view: 'front' as const, box: '12 88 56 56' };
  if (item.category === 'shoes' || item.category === 'shoeColor') return { view: 'front' as const, box: '14 101 52 40' };
  if (item.category === 'top') return { view: 'front' as const, box: '13 63 54 54' };
  if (item.category === 'accessory') {
    if (item.value === 'calculator-watch') return { view: 'front' as const, box: '39 68 52 52' };
    if (item.value === 'backpack') return { view: 'back' as const, box: '12 48 62 62' };
    if (['flower-lei', 'checker-scarf'].includes(item.value)) return { view: 'front' as const, box: '9 43 62 62' };
  }
  if (item.category === 'palette') return { view: 'front' as const, box: '13 63 54 54' };
  // Hair keeps its whole silhouette, braid tips and bun included, so each tile shows what names the style.
  if (item.category === 'hairStyle') return { view: 'front' as const, box: '-11 -8 102 102' };
  if (item.category === 'outfit') return { view: 'front' as const, box: '-14 16 108 118' };
  return { view: 'front' as const, box: ['hat', 'hairColor', 'accessory'].includes(item.category) ? '-1 -6 82 82' : '-26 0 132 132' };
}

/** Only the visible crop affects a tile. Unrelated wardrobe changes reuse its SVG tree. */
export function thumbnailLook(look: IslanderLook, item: StyleItem): string {
  if (item.color) return "{}";
  const head = item.category === 'hairStyle' || item.category === 'hat' || item.category === 'brows' || item.category === 'lashes' || item.category === 'freckles' || item.category === 'cheeks';
  const feet = item.category === 'shoes' || item.category === 'bottom';
  const torso = item.category === "top";
  const shown: IslanderLook = torso ? { ...defaultLook, build: look.build, skinTone: look.skinTone, outfit: look.outfit, top: look.top, palette: look.palette } : head ? { ...defaultLook, skinTone: look.skinTone, hairColor: look.hairColor, hairStyle: look.hairStyle, build: look.build,
    brows: look.brows, lashes: look.lashes, freckles: look.freckles, cheeks: look.cheeks }
    : feet ? { ...defaultLook, build: look.build, skinTone: look.skinTone, outfit: look.outfit, bottom: look.bottom, shoes: look.shoes, shoeColor: look.shoeColor, palette: look.palette }
    : { ...look, hat: 'none', accessory: 'none' };
  const dressed = lookWithStyle(shown, item);
  return JSON.stringify(Object.fromEntries(Object.entries(dressed).filter(([key, value]) => value !== undefined && value !== defaultLook[key as keyof IslanderLook])));
}
