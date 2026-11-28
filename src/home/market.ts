import { foodIds, drinkIds } from './art/living';
import { instance, type HomeStateV2, type HomeResult } from './model';
import { storageCapacity } from './storage';
import type { ItemId } from './catalog';
export const marketStock: readonly ItemId[] = [...foodIds, ...drinkIds];
export const MARKET_BASKET_ID = 'market-carry-basket';
export function marketContents(save: HomeStateV2) {
  return save.rooms.kitchen.instances.filter(i => i.in === MARKET_BASKET_ID);
}
export type MarketAction = { type: 'market-add'; item: ItemId } | { type: 'market-return'; id: string } | { type: 'market-unpack' };
/** All groceries use existing item/container identities. No new save fields or unbounded inventory. */
export function shop(save: HomeStateV2, action: MarketAction): HomeResult {
  const kitchen = save.rooms.kitchen;
  const contents = marketContents(save);
  let instances = kitchen.instances;
  let message: string;
  if (action.type === 'market-add') {
    if (!marketStock.includes(action.item)) return { state: save };
    if (contents.length >= storageCapacity('carry-basket')) return { state: save, message: 'Your basket is full. Put something back or carry it Home.' };
    const basket = instances.find(i => i.id === MARKET_BASKET_ID);
    if (basket && basket.item !== 'carry-basket') return { state: save, message: 'Your original basket has been kept.' };
    if (instances.length + (basket ? 1 : 2) > 256) return { state: save, message: 'Make some room in the Kitchen first.' };
    // Staged baskets remain reachable in the tray even in a completely full room.
    if (!basket) instances = [...instances, { ...instance(MARKET_BASKET_ID, 'carry-basket', 1, 8), staged: true, storage: { version: 1, open: true } }];
    let n = 1;
    while (instances.some(i => i.id === `market-grocery-${n}`)) n++;
    instances = [...instances, { ...instance(`market-grocery-${n}`, action.item, 1, 8), in: MARKET_BASKET_ID }];
    message = 'In your Carry Basket!';
  } else if (action.type === 'market-return') {
    if (!contents.some(i => i.id === action.id)) return { state: save };
    instances = instances.filter(i => i.id !== action.id);
    message = 'Back on the shelf.';
  } else {
    const fridge = instances.find(i => i.item === 'fridge' && !i.staged);
    if (!fridge || !contents.length) return { state: save, message: contents.length ? 'Place a fridge in your Kitchen first.' : 'Your Carry Basket is empty.' };
    const free = Math.max(0, storageCapacity('fridge') - instances.filter(i => i.in === fridge.id).length);
    if (!free) return { state: save, message: 'The fridge is full. Your groceries are safe in the basket.' };
    const unpack = new Set(contents.slice(0, free).map(i => i.id));
    instances = instances.map(i => unpack.has(i.id) ? { ...i, in: fridge.id, x: fridge.x, y: fridge.y } : i.id === fridge.id ? { ...i, state: "active" as const, powered: true, storage: { version: 1 as const, open: true } } : i);
    // A fully unpacked staged shopping basket has no reason to occupy every room's tray.
    // A basket the child already placed in the room stays as their furnishing.
    if (unpack.size === contents.length) instances = instances.filter(i => i.id !== MARKET_BASKET_ID || !i.staged);
    message = unpack.size < contents.length ? 'Fridge stocked! The rest stays in your basket.' : 'All stocked! Time to cook.';
  }
  return { state: { ...save, version: 4, rooms: { ...save.rooms, kitchen: { ...kitchen, instances } } }, message };
}
