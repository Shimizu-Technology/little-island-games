import { describe, expect, it, vi } from 'vitest';
import { catalogCommit } from '../src/home/runtime/catalogCapture';
import { labHome } from '../src/home/runtime/lab';
import { carriedCentre } from '../src/home/runtime/carry';
import { itemIds, itemSpec } from '../src/home/catalog';
import { roomIds } from '../src/home/catalogMore';
import { instance } from '../src/home/model';
import { buildScene, itemEntity } from '../src/home/scene/graph';
import { resolve, apply } from '../src/home/scene/proposal';
import { roomPoint } from '../src/home/scene/types';
import * as spatial from '../src/home/scene/spatial';

describe('H2 round 2 catalog regressions', () => {
 it('R2-P1-1 preview and commit agree with carried aim, finger contact and camera scale', () => {
  const mismatches: unknown[] = []; let checked = 0;
  for (const fixture of ['lab', 'starter']) for (const room of roomIds) {
   const latest = labHome(fixture);
   for (const item of itemIds.filter(i => !i.startsWith('sticker:') && itemSpec(i).layer !== 'wall')) {
    const seed = structuredClone(latest); seed.rooms[room].instances.push(instance('capture', item, 0, 0));
    const scene = buildScene(seed), id = `${room}/item/capture`, subject = scene.entities[id];
    const points = [...scene.rooms[room].targets.flatMap(t => [t.contact, roomPoint(t.contact.x + 28, t.contact.y + 45)]),
     ...Array.from({length: 20}, (_, n) => roomPoint(80 + n % 5 * 150, 350 + Math.floor(n / 5) * 50))];
    for (const point of points) {
     const centre = carriedCentre(subject, point.x, point.y, 0, 0, .5025);
     const p = resolve(scene.rooms[room], subject, point, {scale: .5025, aim: roomPoint(centre.x, centre.y), contact: point,
      release: true, catalog: true, avoidFurnitureOverlap: true});
     if (p.kind === 'staging') continue;
     const commit = catalogCommit(latest, {seed}, id, p);
     if (!commit || commit.proposal.kind !== p.kind || commit.proposal.target !== p.target ||
      commit.proposal.contact.x !== p.contact.x || commit.proposal.contact.y !== p.contact.y) {
      if (mismatches.length < 10) mismatches.push({fixture, room, item, point, preview: [p.kind, p.target, p.contact], commit: commit?.proposal});
     }
     checked++;
    }
   }
  }
  expect(checked).toBeGreaterThan(10000); expect(mismatches).toEqual([]);
 });
 it('R2-P1-2 never resamples full neighbouring hulls per candidate during a drag', () => {
  const state = labHome('starter');
  for (let n = 0; n < 30; n++) state.rooms.home.instances.push(instance(`filler-${n}`, 'chair', n % 16, Math.floor(n / 16) * 4));
  const scene = buildScene(state), subject = itemEntity('home', instance('new', 'chair', 0, 0));
  const sample = vi.spyOn(spatial, 'catalogCovered');
  try {
   resolve(scene.rooms.home, subject, roomPoint(300, 430), {scale: .5025, catalog: true, avoidFurnitureOverlap: true});
   expect(sample.mock.calls.filter(([entity]) => entity.id !== subject.id)).toHaveLength(0);
  } finally { sample.mockRestore(); }
 });
 it('R2-P1-1 two quick drops at one preview retain both identities and choose a legal later landing', () => {
  const initial = labHome();
  const capture = (name: string) => {
   const seed = structuredClone(initial); seed.rooms.home.instances.push(instance(name, 'chair', 0, 0));
   const scene = buildScene(seed), id = `home/item/${name}`;
   const proposal = resolve(scene.rooms.home, scene.entities[id], roomPoint(571, 414.8), {scale: .5025, floorOnly: true, catalog: true, avoidFurnitureOverlap: true});
   return {id, proposal, catalog: {seed}};
  };
  const a = capture('first'), b = capture('second'); expect(a.proposal.contact).toEqual(b.proposal.contact);
  const first = catalogCommit(initial, a.catalog, a.id, a.proposal)!;
  const saved = apply(first.seed, first.proposal); expect('state' in saved).toBe(true); if (!('state' in saved)) return;
  const second = catalogCommit(saved.state, b.catalog, b.id, b.proposal); expect(second).toBeDefined();
  const final = apply(second!.seed, second!.proposal); expect('state' in final).toBe(true); if (!('state' in final)) return;
  expect(final.state.rooms.home.instances.filter(i => ['first','second'].includes(i.id))).toHaveLength(2);
  expect(second!.proposal.kind).toBe('floor'); expect(second!.proposal.contact).not.toEqual(first.proposal.contact);
 });
});
it('the busiest native catalog fixture has room for exactly one more catalog instance',async()=>{
 const {validHome,MAX_INSTANCES}=await import('../src/home/model');const state=labHome('catalog-busy');
 expect(validHome(state)).toBe(true);expect(state.rooms.home.instances).toHaveLength(MAX_INSTANCES-1);
});
