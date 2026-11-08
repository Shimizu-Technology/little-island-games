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
