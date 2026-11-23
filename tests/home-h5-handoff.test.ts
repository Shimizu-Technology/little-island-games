import { expect, it } from 'vitest';
import { instance, starterHome, migrateHome } from '../src/home/model';
import { buildScene } from '../src/home/scene/graph';
import { restingLayoutReady, layoutToken } from '../src/home/runtime/layout';
it('HS-01 hands off a stored prop to the updated container, never to a nonexistent child view', () => {
  const s = migrateHome(starterHome())!;
  s.rooms.home.instances = [instance('box', 'toy-box', 8, 7), { ...instance('toy', 'teddy', 0, 0), in: 'box' }];
  s.rooms.home.characters=[];
  const scene=buildScene(s), box=scene.entities['home/item/box'], toy=scene.entities['home/item/toy'];
  const expected={ [box.id]:layoutToken(box), [toy.id]:layoutToken(toy) };
  expect(restingLayoutReady(toy,{},expected)).toBe(false);
  expect(restingLayoutReady(toy,{[box.id]:'old-container-layout'},expected)).toBe(false);
  expect(restingLayoutReady(toy,{[box.id]:expected[box.id]},expected)).toBe(true);
  expect(restingLayoutReady(toy,{},{})).toBe(false);
});
