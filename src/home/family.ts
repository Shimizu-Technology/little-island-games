import { defaultLook, type IslanderLook } from '../islander/look';
/** Stable Home actors, separate from learner profiles. Slots 0–2 never change meaning. */
export const familySlots = [0, 1, 2, 3, 4, 5] as const;
export type FamilySlot = typeof familySlots[number];
export const friendNames = ['Islander', 'Pip', 'Crab', 'Mom', 'Dad', 'Little Sibling'] as const;
export function rigSlot(slot: number): 0 | 1 | 2 {
  'worklet';
  return slot === 1 ? 1 : slot === 2 ? 2 : 0;
}
export const familyLooks: Partial<Record<FamilySlot, IslanderLook>> = {
  3: { ...defaultLook, skinTone: 'honey', hairStyle: 'long-wavy', hairColor: 'espresso', outfit: 'sundress', presentation: 'girl', build: 'girl', shoes: 'sandals' },
  4: { ...defaultLook, skinTone: 'earth', hairStyle: 'side-part', hairColor: 'midnight', outfit: 'aloha-shorts', presentation: 'boy', build: 'boy', shoes: 'sandals' },
  5: { ...defaultLook, skinTone: 'sand', hairStyle: 'pigtails', hairColor: 'chestnut', outfit: 'overalls', presentation: 'me', build: 'neutral', shoes: 'sneakers' },
};
