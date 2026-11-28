import { describe, expect, it } from 'vitest';
import { carriedPropGrowth } from '../src/home/runtime/carry';
import { buildScene } from '../src/home/scene/graph';
import { labHome } from '../src/home/runtime/lab';
import { instance } from '../src/home/model';
import { resolve } from '../src/home/scene/resolve';
import { roomPoint } from '../src/home/scene/types';
import { occludedFraction, translatedBounds } from '../src/home/scene/spatial';

describe('H2 hand feel', () => {
 it('prop enlargement stays below the 1.1 pickup cap', () => {
  expect(carriedPropGrowth).toBe(.08);
 });
 it('catalog floor placement stays at least half visible across the kitchen', () => {
  const state = labHome('starter');
  const created = instance('catalog-preview', 'chair', 0, 0);
  state.rooms.kitchen.instances.push(created);
  const scene = buildScene(state), subject = scene.entities['kitchen/item/catalog-preview'];
  let placed = 0;
  for (let x = 60; x <= 740; x += 40) for (let y = 350; y <= 530; y += 30) {
   const proposal = resolve({ ...scene.rooms.kitchen, entities: scene.entities }, subject, roomPoint(x, y),
    { scale: .5, release: true, avoidFurnitureOverlap: true, catalog: true });
   if (proposal.kind === 'staging') continue;
   placed++;
   const covered = occludedFraction(translatedBounds(subject.bounds, proposal.contact), proposal.contact.y,
    scene.rooms.kitchen.occlusionBands.filter(b => b.id !== subject.id));
   expect(covered, `${x},${y}: ${proposal.kind}`).toBeLessThanOrEqual(.5);
  }
  expect(placed).toBeGreaterThan(0);
 });
});

it('HM-16 shadows distinguish a small prop, a friend and a piece of furniture', async () => {
 const { footprintShadow } = await import('../src/home/runtime/handFeel');
 const scene = buildScene(labHome());
 const banana = footprintShadow(scene.entities['home/item/banana']);
 const friend = footprintShadow(scene.entities['character/0']);
 const bed = footprintShadow(scene.entities['home/item/bed']);
 expect(banana.width).toBeLessThan(friend.width); expect(friend.width).toBeLessThan(bed.width);
 expect(banana.height).toBeLessThan(bed.height);
});

it('P3-6 every catalog body across every room preserves visibility in both fixtures', async () => {
 const { itemIds } = await import('../src/home/catalog');
 const { itemSpec } = await import('../src/home/catalog');
 const { roomIds } = await import('../src/home/catalogMore');
 const { catalogCovered } = await import('../src/home/scene/spatial');
 let placed = 0;
 for (const fixture of ['lab','starter'] as const) for (const room of roomIds) for (const item of itemIds) {
  if (item.startsWith('sticker:') || itemSpec(item).layer === 'wall') continue;
  const state = labHome(fixture), created = instance('sweep', item, 0, 0);
  state.rooms[room].instances.push(created);
  const scene = buildScene(state), subject = scene.entities[`${room}/item/sweep`];
  for (let x=80;x<800;x+=160) for (let y=350;y<=530;y+=60) {
   const p=resolve(scene.rooms[room],subject,roomPoint(x,y),{scale:.5,release:true,catalog:true,avoidFurnitureOverlap:true});
   if(p.kind==='staging')continue;
   // HS-01: a stored catalog prop is intentionally hidden by its container.
   if(p.attachment.kind==='container'){expect(subject.body?.small).toBe(true);continue;}
   placed++;
   const bands=scene.rooms[room].occlusionBands.filter(b=>b.id!==subject.id);
   expect(occludedFraction(translatedBounds(subject.bounds,p.contact),p.contact.y,bands)).toBeLessThanOrEqual(.5);
   expect(catalogCovered(subject,p.contact,p.contact.y,bands)).toBeLessThanOrEqual(.4);
  }
 }
 expect(placed).toBeGreaterThan(100);
});

it('P3-6 preview moves equal apply/rebuild results across floor, socket, surface, hand and mouth', async () => {
 const { apply } = await import('../src/home/scene/proposal');
 const { roomIds } = await import('../src/home/catalogMore');
 const state=labHome(),scene=buildScene(state),kinds=new Set<string>();let checked=0;
 for(const subject of Object.values(scene.entities).filter(e=>e.character||e.body?.small)) for(const room of roomIds) {
  const targets=scene.rooms[room].targets.map(t=>t.projectedContact??t.contact);
  const points=[...targets,...Array.from({length:24},(_,n)=>roomPoint(80+n%6*120,350+Math.floor(n/6)*60))];
  for(const point of points){
   const p=resolve(scene.rooms[room],subject,point,{scale:.5,release:true});
   const result=apply(state,p);expect('state' in result).toBe(true);if(!('state' in result))continue;
   const rebuilt=buildScene(result.state);kinds.add(p.kind);
   for(const move of p.moves){
    const entity=rebuilt.entities[result.identities[move.id]??move.id];
    if(!entity && (p.kind==='mouth' || p.discard)) { expect(p.consume).toBe('food'); continue; }
    expect(entity,`${subject.id}/${p.kind}/${move.id}`).toBeDefined();
    expect(entity.contact.x).toBeCloseTo(move.contact.x,6);expect(entity.contact.y).toBeCloseTo(move.contact.y,6);
    expect(entity.base).toBe(move.base);expect(entity.facing).toBe(move.facing);expect(entity.attachment.kind).toBe(move.attachment.kind);checked++;
   }
  }
 }
 expect(checked).toBeGreaterThan(500);
 expect([...kinds]).toEqual(expect.arrayContaining(['floor','socket','surface','hand','mouth']));
});
