import { expect, it } from 'vitest';
import { floatyFrame, swimWaterline } from '../src/home/floaty';
import { familySlots } from '../src/home/family';
import { anchorsFor } from '../src/home/scene/species';
import { waterSurfaceMinY, waterFloorMinY, isInWaterZone } from '../src/home/waterZone';
it.each(['tumon-beach', 'cocos-island'] as const)('%s places the surface below the painted horizon for every family member', room => {
  expect(waterSurfaceMinY(room)).toBeGreaterThan(250 + 12);
  expect(waterFloorMinY(room)).toBe(256);
  for (const slot of familySlots) for (const buoyant of [false, true]) {
    const body = anchorsFor(slot, 'stand', 'front').bounds;
    const line = swimWaterline(slot, 'stand', 'front', buoyant), sink = -line;
    expect(sink).toBeGreaterThan(0);
    expect(line - body.top).toBeGreaterThan(body.height * .5);
    expect(line - body.top).toBeLessThan(body.height);
    expect(286 + line + sink).toBe(286); // An existing TestFlight contact remains the water surface.
    if (buoyant) { const ring = floatyFrame(slot, 'stand', 'front'); expect(286 + ring.top + ring.height + sink).toBeGreaterThan(286); }
  }
  expect(isInWaterZone(room, { x: room === 'tumon-beach' ? 345 : 650, y: 300 })).toBe(true);
});

it('keeps a published y=256 save valid while painting, picking and pickup bindings use the lower bay surface', async () => {
  const { starterHome, validHome } = await import('../src/home/model');
  const { buildScene } = await import('../src/home/scene/graph');
  const { roomPoint } = await import('../src/home/scene/types');
  const { carryBinding } = await import('../src/home/runtime/rigGeometry');
  const home = starterHome();
  for (const room of Object.values(home.rooms)) room.characters = [];
  const room = home.rooms['tumon-beach'], ring = room.instances.find(i => i.item === 'swim-ring')!;
  room.characters = [{ slot: 0, anchor: 'floor', pose: 'stand', x: 7, y: 0, at: roomPoint(400, 256), holding: ring.id }];
  expect(validHome(home)).toBe(true);
  const swimmer = buildScene(home).entities['character/0'];
  expect(swimmer.contact.y).toBe(256);
  expect(swimmer.contact.y + swimWaterline(0, 'stand', 'front', true) + swimmer.waterOffset!).toBe(268);
  expect(carryBinding(swimmer, { x: 0, y: 0 }, 'head').y).toBeCloseTo(carryBinding({ ...swimmer, waterOffset: undefined }, { x: 0, y: 0 }, 'head').y + swimmer.waterOffset!);
  expect(buildScene(home).entities[`tumon-beach/item/${ring.id}`].waterOffset).toBe(swimmer.waterOffset);
});
