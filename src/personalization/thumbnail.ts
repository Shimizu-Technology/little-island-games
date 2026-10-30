import type { StyleItem } from './catalog';
/** Rig-space square crops; the watch uses about 2.5 times the full-body scale. */
export function thumbnailFocus(item: Pick<StyleItem, 'category' | 'value'>) {
  if (['brows', 'lashes', 'freckles', 'cheeks'].includes(item.category)) return { view: 'front' as const, box: '17 20 46 46' };
  if (item.category === 'bottom') return { view: 'front' as const, box: '12 71 56 56' };
  if (item.category === 'top') return { view: 'front' as const, box: '10 42 60 60' };
  if (item.category === 'accessory') {
    if (item.value === 'calculator-watch') return { view: 'front' as const, box: '39 68 52 52' };
    if (item.value === 'backpack') return { view: 'back' as const, box: '12 48 62 62' };
    if (['flower-lei', 'checker-scarf'].includes(item.value)) return { view: 'front' as const, box: '9 43 62 62' };
  }
  return { view: 'front' as const, box: ['hat', 'hairStyle', 'accessory'].includes(item.category) ? '5 0 70 70' : '-26 0 132 132' };
}
