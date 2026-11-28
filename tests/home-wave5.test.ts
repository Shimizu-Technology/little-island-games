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
import { paintDepth } from '../src/home/runtime/group';
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
    const panScene = buildScene(h.present);
    expect(paintDepth(panScene.entities[`kitchen/item/${food.id}`], panScene)).toBeGreaterThan(paintDepth(panScene.entities['kitchen/item/starter-stove'], panScene));
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

it('R1-07 clears only a fully unpacked staged shopping basket, opens the fridge consistently, and preserves saved Undo',()=>{
 let h=start(); h=editHistory(h,{type:'market-add',item:foodIds[0]});h=editHistory(h,{type:'market-add',item:foodIds[1]});
 const before=h.present.rooms.kitchen;
 h=editHistory(h,{type:'market-unpack'});
 expect(h.present.rooms.kitchen.instances.find(i=>i.id==='starter-fridge')).toMatchObject({state:'active',powered:true,storage:{version:1,open:true}});
 expect(h.present.rooms.kitchen.instances.some(i=>i.id===MARKET_BASKET_ID)).toBe(false);
 expect(editHistory(roundtrip(h),{type:'undo'}).present.rooms.kitchen).toEqual(before);
 let placed=start();placed=editHistory(placed,{type:'market-add',item:foodIds[0]});
 const basket=placed.present.rooms.kitchen.instances.find(i=>i.id===MARKET_BASKET_ID)!;
 delete basket.staged;
 placed=editHistory(placed,{type:'market-unpack'});
 expect(placed.present.rooms.kitchen.instances.some(i=>i.id===MARKET_BASKET_ID)).toBe(true);
});

it.each(['fridge','basket','other room'])('R1-06 accepts edible disposal from %s into a Kitchen at MAX_INSTANCES', source=>{
 let h=start();h.present.current='kitchen';
 h.present.rooms.kitchen.characters=[];
 h.present.rooms.kitchen.instances=[instance('full-fridge','fridge',14,0),...Array.from({length:47},(_,n)=>({...instance(`full-${n}`,'banana',0,8),at:{x:60+n%12*55,y:440+Math.floor(n/12)*20}}))];
 const food=instance('dispose-food','mango',1,8);
 if(source==='other room'){h.present.rooms.home.instances=[food];}
 else if(source==='fridge')h.present.rooms.kitchen.instances.push({...food,in:'full-fridge'});
 else h.present.rooms.kitchen.instances.push({...instance('full-basket','carry-basket',1,8),staged:true},{...food,in:'full-basket'});
 expect(validHome(h.present)).toBe(true);
 const scene=buildScene(h.present),bin=scene.rooms.kitchen.targets.find(t=>t.trash)!;
 const id=`${source==='other room'?'home':'kitchen'}/item/dispose-food`;
 const p=resolve({...scene.rooms.kitchen,entities:scene.entities},scene.entities[id],bin.contact,{scale:1,release:true,target:bin.id});
 expect(p).toMatchObject({discard:true,target:bin.id});
 const result=editHistory(h,{type:'apply-proposal',proposal:p});
 expect(result).not.toBe(h);expect(validHome(result.present)).toBe(true);
 expect(Object.values(result.present.rooms).some(room=>room.instances.some(i=>i.id===food.id))).toBe(false);
});

it('R1-01 ignores zero-sentinel timestamps until a real commit or creation clock exists',async()=>{
 const {expiredSlot,COMMIT_TIMEOUT_MS}=await import('../src/home/runtime/liveness');
 const slot={id:'food',phase:'settling',committed:false,commitRequested:true,settleAt:0,createdAt:1000,ready:true};
 expect(expiredSlot(slot,1016)).toBe(false);
 expect(expiredSlot(slot,1000+COMMIT_TIMEOUT_MS)).toBe(true);
 expect(expiredSlot({...slot,createdAt:undefined},Date.now())).toBe(false);
});
