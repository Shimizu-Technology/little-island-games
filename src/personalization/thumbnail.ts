import type { StyleItem } from './catalog';
/** Rig-space square crops; the watch uses about 2.5 times the full-body scale. */
export function thumbnailFocus(item: Pick<StyleItem, 'category' | 'value'>) {
  if (item.category === 'accessory') {
    if (item.value === 'calculator-watch') return { view: 'front' as const, box: '39 68 52 52' };
    if (item.value === 'backpack') return { view: 'back' as const, box: '12 48 62 62' };
    if (['flower-lei', 'checker-scarf'].includes(item.value)) return { view: 'front' as const, box: '9 43 62 62' };
  }
  return { view: 'front' as const, box: ['hat', 'hairStyle', 'accessory'].includes(item.category) ? '5 0 70 70' : '-26 0 132 132' };
}
