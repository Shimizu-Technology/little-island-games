import { expect, it } from 'vitest';
import { starterHome, instance, validHome } from '../src/home/model';
import { buildScene } from '../src/home/scene/graph';
import { apply, resolve } from '../src/home/scene/proposal';
import { characterForSocket, socketsOf } from '../src/home/interactions';
import { floatyFrame } from '../src/home/floaty';
import { anchorsFor, species } from '../src/home/scene/species';
import { type Facing } from '../src/home/scene/types';
import type { ItemId } from '../src/home/catalog';

it('R1-04 centres Pip on the actual upright bounds, with a standing-size limit for carry and non-upright requests', () => {
  for (const facing of Object.keys(species[1].poses.stand) as Facing[]) {
    for (const base of Object.keys(species[1].poses) as (keyof typeof species[1]['poses'])[]) {
      const frame = floatyFrame(1, base, facing);
      const bounds = anchorsFor(1, base === 'carry' ? 'carry' : 'stand', facing).bounds;
      expect(frame.left + frame.width / 2).toBeCloseTo(bounds.left + bounds.width / 2);
      expect(frame.width).toBeLessThanOrEqual(Math.max(78, anchorsFor(1, 'stand', facing).bounds.width * 1.05));
    }
  }
});
for (const [item, pose] of Object.entries({ bed: 'lie', bathtub: 'bathe', chair: 'sit' })) {
  it(`R1-04 refuses a floaty while a friend is ${pose}, including a stale/forged wear target`, () => {
    const state = starterHome();
    for (const room of Object.values(state.rooms)) room.characters = [];
    const furniture = instance('r1-seat', item as ItemId, 8, 5);
    state.rooms.home.instances = [furniture, instance('r1-ring', 'swim-ring', 2, 0)];
    state.rooms.home.characters = [{ slot: 0, anchor: 'floor', pose: 'stand', x: 8, y: 9 }];
    const previous = buildScene(state).rooms.home.targets.find(t => t.floaty)!;
    const socket = socketsOf(furniture).find(s => !s.id.startsWith('pet-'))!;
    state.rooms.home.characters[0] = characterForSocket({ slot: 0, anchor: 'floor', pose: 'stand', x: 8, y: 9 }, furniture, socket);
    expect(validHome(state), JSON.stringify(state.rooms.home)).toBe(true);
    const scene = buildScene(state), actor = scene.entities['character/0'];
    const index = { ...scene.rooms.home, entities: scene.entities };
    expect(index.targets.some(t => t.floaty && t.owner === actor.id)).toBe(false);
    const stale = { ...previous, contact: actor.contact };
    const proposal = resolve({ ...index, targets: [...index.targets, stale] }, scene.entities['home/item/r1-ring'], actor.contact,
      { scale: 1, target: stale.id, release: true, contact: actor.contact });
    expect(proposal.target).not.toBe(stale.id);
    const result = apply(state, proposal);
    expect(result).toHaveProperty('state');
    if ('state' in result) {
      expect(validHome(result.state)).toBe(true);
      expect(result.state.rooms.home.characters[0]).toMatchObject({ pose, seatId: 'r1-seat' });
      expect(result.state.rooms.home.characters[0].holding).toBeUndefined();
    }
    expect(floatyFrame(0, pose as 'lie' | 'sit' | 'bathe', 'front')).toEqual(floatyFrame(0, 'stand', 'front'));
  });
}
