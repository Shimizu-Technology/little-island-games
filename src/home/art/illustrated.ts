import type { ImageSourcePropType } from 'react-native';

/** Static thunks keep Metro asset discovery deterministic without loading art at module import. */
export const illustratedRooms = {
  'tumon-beach': (): ImageSourcePropType => require('../../../assets/art/home/places/tumon-beach.webp'),
  'chamorro-village': (): ImageSourcePropType => require('../../../assets/art/home/places/chamorro-village.webp'),
  'home': (): ImageSourcePropType => require('../../../assets/home/rooms/home.webp'),
  'kitchen': (): ImageSourcePropType => require('../../../assets/home/rooms/kitchen.webp'),
  'treehouse': (): ImageSourcePropType => require('../../../assets/home/rooms/treehouse.webp'),
  'beach': (): ImageSourcePropType => require('../../../assets/home/rooms/beach.webp'),
};
export const illustratedProps = {
  'beach-blanket': (): ImageSourcePropType => require('../../../assets/art/home/places/beach-blanket.webp'),
  'surfboard': (): ImageSourcePropType => require('../../../assets/art/home/places/surfboard.webp'),
  'bbq-grill': (): ImageSourcePropType => require('../../../assets/art/home/places/bbq-grill.webp'),
  'shaved-ice': (): ImageSourcePropType => require('../../../assets/art/home/places/shaved-ice.webp'),
  'christmas-tree': (): ImageSourcePropType => require('../../../assets/art/home/seasonal/christmas-tree.webp'),
  'gift-box': (): ImageSourcePropType => require('../../../assets/art/home/seasonal/gift-box.webp'),
  'hot-cocoa': (): ImageSourcePropType => require('../../../assets/art/home/seasonal/hot-cocoa.webp'),
  'pumpkin-pie': (): ImageSourcePropType => require('../../../assets/art/home/seasonal/pumpkin-pie.webp'),
  'fiesta-platter': (): ImageSourcePropType => require('../../../assets/art/home/seasonal/fiesta-platter.webp'),
  'autumn-wreath': (): ImageSourcePropType => require('../../../assets/art/home/seasonal/autumn-wreath.webp'),

  'bed': (): ImageSourcePropType => require('../../../assets/home/props/bed.webp'),
  'sofa': (): ImageSourcePropType => require('../../../assets/home/props/sofa.webp'),
  'bathtub': (): ImageSourcePropType => require('../../../assets/home/props/bathtub.webp'),
  'fridge-closed': (): ImageSourcePropType => require('../../../assets/home/props/fridge-closed.webp'),
  'fridge-open': (): ImageSourcePropType => require('../../../assets/home/props/fridge-open.webp'),
  'stove': (): ImageSourcePropType => require('../../../assets/home/props/stove.webp'),
  'bookcase': (): ImageSourcePropType => require('../../../assets/home/props/bookcase.webp'),
  'crab': (): ImageSourcePropType => require('../../../assets/home/props/crab.webp'),
  'sink-counter': (): ImageSourcePropType => require('../../../assets/home/props/sink-counter.webp'),
  'tv': (): ImageSourcePropType => require('../../../assets/home/props/tv.webp'),
  'radio': (): ImageSourcePropType => require('../../../assets/home/props/radio.webp'),
  'lamp': (): ImageSourcePropType => require('../../../assets/home/props/lamp.webp'),
  'monstera': (): ImageSourcePropType => require('../../../assets/home/props/monstera.webp'),
  'teddy': (): ImageSourcePropType => require('../../../assets/home/props/teddy.webp'),
  'cupcake': (): ImageSourcePropType => require('../../../assets/home/props/cupcake.webp'),
  'coconut-drink': (): ImageSourcePropType => require('../../../assets/home/props/coconut-drink.webp'),
};
export type IllustratedProp = keyof typeof illustratedProps;
/** Aliases project existing catalog identities; saves and footprints are unchanged. */
export function paintedProp(id: string): IllustratedProp | undefined {
  if (id === "beach-surfboard") return "surfboard";
  if (id in illustratedProps) return id as IllustratedProp;
  if (['lamp', 'floor-lamp', 'table-lamp'].includes(id)) return 'lamp';
  if (['plant', 'potted-fern', 'banana-plant'].includes(id)) return 'monstera';
  if (id === 'bubble-bath') return 'bathtub';
  return undefined;
}
