import { describe, expect, it } from 'vitest';
import { roomIds } from "../src/home/catalogMore";
import { starterHome, instance, validHome, hydrateHome, compactHome } from '../src/home/model';
import { editHistory, restoredHistory, savedHistory, type History } from '../src/home/useHomeStore';
import { buildScene } from '../src/home/scene/graph';
import { resolve, apply } from '../src/home/scene/proposal';
import { marketContents, marketStock, MARKET_BASKET_ID } from '../src/home/market';
import { foodIds, drinkIds } from '../src/home/art/living';
import { roomHopAt, roomHops } from '../src/home/roomHops';
import { cookingIds } from '../src/home/runtime/delight';
import { thumbnailLook } from '../src/personalization/thumbnail';
import { styleCatalog } from '../src/personalization/catalog';
import { defaultLook } from '../src/islander/look';
const start = (): History => ({ present: starterHome(), past: [], future: [] });
function roundtrip(h: History) { const save = JSON.parse(JSON.stringify(compactHome(savedHistory(h)))); expect(validHome(save)).toBe(true); return restoredHistory(hydrateHome(save)!); }
function drop(h: History, id: string, targetId: string): History {
  const scene = buildScene(h.present), index = scene.rooms.kitchen, target = index.targets.find(t => t.id === targetId)!;
  expect(target).toBeDefined();
  const proposal = resolve(index, scene.entities[id], target.contact, { scale: 1, release: true, target: target.id });
  expect(proposal.target).toBe(target.id);
  const next = editHistory(h, { type: 'apply-proposal', proposal, roomId: 'kitchen' });
  expect(next).not.toBe(h); expect(validHome(next.present)).toBe(true); return next;
}
describe('Wave 5 grocery loop', () => {
  it('derives shelves from canonical food and drink definitions; bounds and persists the basket', () => {
    expect(marketStock).toEqual([...foodIds, ...drinkIds]);
    let h = start(); const before = JSON.stringify(h.present);
    for (const item of marketStock.slice(0, 4)) h = editHistory(h, { type: 'market-add', item });
    expect(marketContents(h.present)).toHaveLength(4);
    expect(editHistory(h, { type: 'market-add', item: drinkIds[0] })).toBe(h);
    h = roundtrip(h); expect(marketContents(h.present)).toHaveLength(4);
    h = editHistory(h, { type: 'market-return', id: marketContents(h.present)[0].id });
    expect(marketContents(h.present)).toHaveLength(3);
    expect(marketContents(editHistory(h, { type: 'undo' }).present)).toHaveLength(4);
    expect(JSON.parse(before).rooms.kitchen.instances.some((i: {id:string}) => i.id === MARKET_BASKET_ID)).toBe(false);
  });
  it('unpacks only free fridge slots, keeps overflow in the basket, and restores every grocery with Undo', () => {
    let h = start();
    for (const item of marketStock.slice(0, 4)) h = editHistory(h, { type: 'market-add', item });
    const before = h.present.rooms.kitchen;
    h = editHistory(h, { type: 'market-unpack' });
    expect(h.present.rooms.kitchen.instances.filter(i => i.in === 'starter-fridge')).toHaveLength(8);
    expect(marketContents(h.present)).toHaveLength(2);
    expect(editHistory(h, { type: 'market-unpack' })).toBe(h);
    expect(editHistory(roundtrip(h), { type: 'undo' }).present.rooms.kitchen).toEqual(before);
  });
  it('refuses forged furniture groceries and arbitrary put-back removals', () => {
    const h = start();
    expect(editHistory(h, { type: 'market-add', item: 'stove' })).toBe(h);
    expect(editHistory(h, { type: 'market-return', id: 'starter-fridge' })).toBe(h);
  });
  it('cooks groceries on an automatically lit burner, then trashes food and empty drinks with saved Undo', () => {
    let h = start(); h.present = { ...h.present, current: 'kitchen' };
    h = editHistory(h, { type: 'market-add', item: foodIds[0] });
    const food = marketContents(h.present)[0];
    h = drop(h, `kitchen/item/${food.id}`, 'kitchen/item/starter-stove/pan');
    expect(h.present.rooms.kitchen.instances.find(i => i.item === 'stove')?.powered).toBe(true);
    expect(cookingIds(buildScene(h.present))).toContain(`kitchen/item/${food.id}`);
    h = editHistory(h, { type: 'cook', id: food.id });
    expect(h.present.rooms.kitchen.instances.find(i => i.id === food.id)?.powered).toBe(true);
    const cooked = h.present.rooms.kitchen;
    h = drop(h, `kitchen/item/${food.id}`, 'kitchen/trash-can');
    expect(h.present.rooms.kitchen.instances.some(i => i.id === food.id)).toBe(false);
    expect(editHistory(roundtrip(h), { type: 'undo' }).present.rooms.kitchen).toEqual(cooked);
    h.present.rooms.kitchen.instances.push({ ...instance('empty-cup', drinkIds[0], 5, 8), empty: true });
    h = drop(h, 'kitchen/item/empty-cup', 'kitchen/trash-can');
    expect(h.present.rooms.kitchen.instances.some(i => i.id === 'empty-cup')).toBe(false);
    const scene = buildScene(h.present), bin = scene.rooms.kitchen.targets.find(t => t.trash)!;
    for (const id of ['kitchen/item/starter-fridge', 'character/0']) {
      expect(resolve(scene.rooms.kitchen, scene.entities[id], bin.contact, {scale: 1, target: bin.id, release: true}).discard).not.toBe(true);
    }
    const bad = resolve(scene.rooms.kitchen, scene.entities['kitchen/item/starter-fridge'], bin.contact, {scale: 1, release: true});
    expect(apply(h.present, { ...bad, target: bin.id, discard: true, consume: 'food' })).toEqual({stale: true});
  });
  it('offers a grounded, undoable chef socket for every Islander', () => {
    for (const slot of [0, 3, 4, 5] as const) {
      let h = start();
      const from = Object.entries(h.present.rooms).find(([, room]) => room.characters.some(c => c.slot === slot))![0] as 'home';
      h = editHistory(h, { type: 'transfer', slot, room: 'kitchen', roomId: from, x: 9, y: 8 });
      const before = h.present.rooms.kitchen;
      h = drop(h, `character/${slot}`, 'kitchen/item/starter-stove/socket/chef');
      expect(h.present.rooms.kitchen.characters.find(c => c.slot === slot)).toMatchObject({pose: 'stand', socket: {socketId: 'chef'}});
      expect(editHistory(roundtrip(h), {type: 'undo'}).present.rooms.kitchen).toEqual(before);
    }
  });
});
it('uses nonoverlapping shared ladder/door targets and transfers a character with their held item', () => {
  for (const room of roomIds) {
    const hops = roomHops(room); expect(hops).toHaveLength(2);
    for (const hop of hops) expect(roomHopAt(room, {x: hop.box.left + 10, y: hop.box.top + 10})).toEqual(hop);
    expect(hops[0].box.top + hops[0].box.height).toBeLessThan(hops[1].box.top);
  }
  let h = start();
  h = editHistory(h, { type: 'transfer', slot: 0, room: 'kitchen', roomId: 'home', x: 8, y: 8 });
  h = editHistory(h, { type: 'use-item', id: 'starter-fridge-mango', slot: 0, roomId: 'kitchen' });
  const holding = h.present.rooms.kitchen.characters.find(c => c.slot === 0)?.holding;
  expect(holding).toBeDefined();
  h = editHistory(h, {type: 'transfer', slot: 0, room: 'beach', roomId: 'kitchen', x: 8, y: 8});
  expect(h.present.rooms.beach.characters.find(c => c.slot === 0)?.holding).toBe(holding);
  expect(validHome(roundtrip(h).present)).toBe(true);
});
it('does not rebuild hair thumbnails for unrelated outfit changes or swatches for any look changes', () => {
  const hair = styleCatalog.find(i => i.category === 'hairStyle')!;
  expect(thumbnailLook(defaultLook, hair)).toBe(thumbnailLook({...defaultLook, outfit: 'hoodie', shoes: 'boots'}, hair));
  expect(thumbnailLook(defaultLook, hair)).not.toBe(thumbnailLook({...defaultLook, hairColor: 'blonde'}, hair));
  const color = styleCatalog.find(i => i.category === 'hairColor')!;
  expect(thumbnailLook(defaultLook, color)).toBe(thumbnailLook({...defaultLook, skinTone: 'shell'}, color));
});
