import { describe, expect, it } from 'vitest';
import { instance, starterHome, migrateHome, validHome, homeReducer } from '../src/home/model';
import { buildScene } from '../src/home/scene/graph';
import { apply, resolve } from '../src/home/scene/proposal';
import { roomPoint } from '../src/home/scene/types';
import { prepareHits, pickEntity } from '../src/home/runtime/pick';
import { familyLooks, familySlots, friendNames } from '../src/home/family';
import { isValidLook } from '../src/islander/look';
import { anchorsFor } from '../src/home/scene/species';
import { characterForSocket, socketsOf } from '../src/home/interactions';
import { undoStep } from '../src/home/undoHistory';
import { restoredHistory, savedHistory } from '../src/home/useHomeStore';

function room(item = 'bed') {
  const state = starterHome();
  for (const r of Object.values(state.rooms)) { r.instances = []; r.characters = []; }
  state.rooms.home.instances = [instance('seat', item, 5, 1)];
  state.rooms.home.characters = [{ slot: 0, anchor: 'floor', pose: 'stand', x: 12, y: 9 }];
  return state;
}
describe('Phase 1 silky Home intent and family saves', () => {
  it.each(['bed', 'bubble-bath', 'bathtub', 'sofa', 'chair'])('head grip uses the doll body at %s, at every camera scale', item => {
    const s = room(item), scene = buildScene(s), subject = scene.entities['character/0'];
    const target = scene.rooms.home.sockets.find(t => !t.pet && !t.hidden)!;
    for (const scale of [.35, .5, 1, 1.5]) {
      const p = resolve(scene.rooms.home, subject, target.contact, { scale, contact: roomPoint(target.contact.x, target.contact.y - 120), release: true });
      expect(p.kind).toBe('socket'); expect(p.base).toBe(item === 'bed' ? 'lie' : item.includes('bath') ? 'bathe' : 'sit');
    }
  });
  it.each(['bubble-bath', 'bathtub'])('all across the %s body activates bathing', item => {
    const scene = buildScene(room(item)), t = scene.rooms.home.sockets.find(t => !t.pet)!;
    const b = t.activation!;
    for (const fraction of [.05, .25, .5, .75, .95]) {
      const anchor = roomPoint(b.left + b.width * fraction, b.top + b.height * .7);
      expect(resolve(scene.rooms.home, scene.entities['character/0'], anchor, { scale: .5, contact: roomPoint(anchor.x, anchor.y - 150), release: true }).base).toBe('bathe');
    }
  });
  it('gives a large Islander a 14-screen-point halo and fills the limb gaps without stealing foreground props', () => {
    const scene = buildScene(room()), e = scene.entities['character/0'];
    scene.rooms.home.entities = { [e.id]: e }; // isolated painted actor
    const hits = prepareHits(scene).home;
    for (const scale of [.35, .5, 1, 2]) {
      const box = hits.find(p => p.fallback && !p.occupantOf)!.shape;
      if (box.kind !== 'box') throw Error('actor body fallback missing');
      const edge = roomPoint(box.left + box.width + 13.9 / scale, box.top + box.height / 2);
      expect(pickEntity(hits, edge, scale, { [e.id]: true })).toBe(e.id);
      expect(pickEntity(hits, roomPoint(e.contact.x, e.contact.y - 20), scale, { [e.id]: true })).toBe(e.id);
      const prop = { id: 'mango', shape: { kind: 'box' as const, left: edge.x - 3, top: edge.y - 3, width: 6, height: 6 }, depth: 9999, paintOrder: 9999, span: 6 };
      expect(pickEntity([...hits, prop], edge, scale, { [e.id]: true, mango: true })).toBe('mango');
    }
  });
  it.each(['bed', 'sofa', 'bubble-bath', 'bathtub'])('covered %s occupant regrabs through only their own furniture', item => {
    const s = room(item), seat = s.rooms.home.instances[0];
    s.rooms.home.characters = [characterForSocket(s.rooms.home.characters[0], seat, socketsOf(seat).find(t => !t.id.startsWith('pet-'))!)];
    const scene = buildScene(s), hits = prepareHits(scene).home, proxy = hits.find(p => p.occupantOf)!;
    expect(proxy).toBeDefined();
    const b = proxy.shape;
    if (b.kind !== 'box') throw Error('covered pickup region missing');
    const at = roomPoint(b.left + b.width * .65, b.top + b.height * .7);
    expect(pickEntity(hits, at, .5, { 'character/0': true, 'home/item/seat': false })).toBe('character/0');
    const prop = { id: 'toy', shape: { kind: 'box' as const, left: at.x - 5, top: at.y - 5, width: 10, height: 10 }, depth: 9999, paintOrder: 9999, span: 10 };
    expect(pickEntity([...hits, prop], at, .5, { 'character/0': true, toy: true, 'home/item/seat': false })).toBe('toy');
  });
  it('seats two family dolls on distinct sofa cushions and retains explicit nap', () => {
    let s = room('sofa'); s.rooms.home.characters.push({ slot: 3, anchor: 'floor', pose: 'stand', x: 15, y: 9 });
    for (const [slot, cushion] of [[0, 'left'], [3, 'right']] as const) {
      const scene = buildScene(s), t = scene.rooms.home.sockets.find(t => t.id.endsWith(`/socket/${cushion}`))!;
      const p = resolve(scene.rooms.home, scene.entities[`character/${slot}`], t.contact, { scale: .5, release: true });
      expect(p.base).toBe('sit'); expect(p.target).toBe(t.id);
      const result = apply(s, p); if (!('state' in result)) throw Error('seat refused'); s = result.state;
    }
    expect(s.rooms.home.characters.map(c => c.socket?.socketId)).toEqual(['left', 'right']); expect(validHome(s)).toBe(true);
    const scene = buildScene(s), nap = scene.rooms.home.sockets.find(t => t.base === 'lie' && !t.pet)!;
    expect(nap.hidden).toBe(true);
    for (const slot of [0, 3]) expect(resolve(scene.rooms.home, scene.entities[`character/${slot}`], nap.contact, { scale: .5, target: nap.id, release: true }).kind).not.toBe('socket');
  });
  it('a missed drop returns to its original place instead of searching the whole room', () => {
    const scene = buildScene(room()), e = scene.entities['character/0'];
    const p = resolve(scene.rooms.home, e, roomPoint(760, 80), { scale: 1, release: true, floorOnly: true, contact: roomPoint(760, 80) });
    expect(p.contact).toEqual(e.contact); expect(p.reason).toContain('original place');
  });
  it('six stable actors have valid distinct family looks and all Islander pose/action anchors', () => {
    const s = starterHome(); expect(s.version).toBe(4); expect(s.rosterVersion).toBe(1); expect(validHome(s)).toBe(true);
    expect(s.rooms.home.characters.map(c => c.slot)).toEqual(familySlots); expect(friendNames).toEqual(['Islander', 'Pip', 'Crab', 'Mom', 'Dad', 'Little Sibling']);
    expect(new Set(Object.values(familyLooks).map(l => JSON.stringify(l))).size).toBe(3);
    for (const slot of [3, 4, 5] as const) {
      expect(isValidLook(familyLooks[slot])).toBe(true);
      for (const base of ['stand', 'sit', 'lie', 'bathe', 'carry'] as const) for (const action of [null, 'hold', 'eat', 'drink'] as const)
        expect(anchorsFor(slot, base, 'front', action)).toEqual(anchorsFor(0, base, 'front', action));
    }
  });
  it.each([3, 4, 5] as const)('family doll %i can hold, eat, drink, bathe and transfer with the same graph', slot => {
    let s = room('bathtub');
    s.rooms.home.characters = [{ slot, anchor: 'floor', pose: 'stand', x: 12, y: 9 }];
    s.rooms.home.instances.push(instance('toy', 'teddy', 10, 10), instance('food', 'mango', 12, 10), instance('drink', 'juice', 14, 10));
    expect(validHome(s)).toBe(true);
    const perform = (id: string, targetId: string) => {
      const scene = buildScene(s), target = scene.rooms.home.targets.find(t => t.id === targetId)!;
      const proposal = resolve(scene.rooms.home, scene.entities[id], target.contact, { scale: .5, target: target.id, release: true });
      const result = apply(s, proposal); if (!('state' in result)) throw Error('family action refused '+JSON.stringify(proposal));
      s = result.state; expect(validHome(s)).toBe(true); return proposal;
    };
    perform(`character/${slot}`, 'home/item/seat/socket/water');
    expect(s.rooms.home.characters[0].pose).toBe('bathe');
    perform('home/item/toy', `character/${slot}/hand`);
    expect(s.rooms.home.characters[0].holding).toBe('toy');
    expect(perform('home/item/food', `character/${slot}/mouth`).consume).toBe('food');
    expect(s.rooms.home.instances.some(i => i.id === 'food')).toBe(false);
    expect(perform('home/item/drink', `character/${slot}/mouth`).consume).toBe('drink');
    expect(s.rooms.home.characters[0].holding).toBe('drink');
    expect(s.rooms.home.instances.find(i => i.id === 'drink')?.empty).toBe(true);
    const scene = buildScene(s), move = resolve({ ...scene.rooms.kitchen, entities: scene.entities }, scene.entities[`character/${slot}`], roomPoint(450, 500), { scale: .5, floorOnly: true, release: true });
    const moved = apply(s, move); expect('state' in moved).toBe(true);
    if ('state' in moved) {
      expect(moved.state.rooms.kitchen.characters[0].slot).toBe(slot);
      expect(moved.state.rooms.kitchen.instances.some(i => i.id === 'drink' && i.empty)).toBe(true);
    }
  });
  it('migrates strict v4 rooms/held items/undo/access losslessly, once; v4 never accepts family slots', () => {
    const old = room(); old.version = 4; delete old.rosterVersion; old.access = { largeTargets: true };
    old.rooms.home.instances.push(instance('toy', 'teddy', 12, 9), instance('light', 'lamp', 13, 1)); old.rooms.home.characters[0].holding = 'toy';
    expect(validHome(old)).toBe(true);
    const previous = structuredClone(old);
    old.rooms = homeReducer(old, { type: 'toggle', id: 'light' }, {}).state.rooms;
    const before = structuredClone(old);
    old.undo = { version: 1, steps: [undoStep(previous, old)] };
    const raw = JSON.stringify(old), next = migrateHome(old)!;
    expect(next).toBeDefined(); expect(next.version).toBe(4); expect(next.rosterVersion).toBe(1); expect(validHome(next)).toBe(true);
    expect(next.undo).toEqual(old.undo); expect(next.access).toEqual(old.access);
    expect(next.rooms.home.characters.filter(c => c.slot < 3)).toEqual(before.rooms.home.characters);
    expect(next.rooms.home.instances).toEqual(before.rooms.home.instances);
    expect(JSON.stringify(old)).toBe(raw); expect(migrateHome(next)).toBe(next);
    const { rosterVersion: extension, ...withoutExtension } = next; expect(extension).toBe(1); expect(validHome(withoutExtension)).toBe(false);
    const bad = structuredClone(next); bad.rooms.kitchen.characters.push({ ...bad.rooms.home.characters[3] });
    expect(validHome(bad)).toBe(false); expect(migrateHome({ ...old, surprise: true })).toBeUndefined();
    expect(validHome(savedHistory(restoredHistory(next)))).toBe(true);
  });
});

// Restore must stay persistable even when the destination has no starter actors.
it.each(['home', 'kitchen', 'treehouse', 'beach'] as const)('reset %s keeps all six actors valid and permits the next write', roomId => {
  const state = starterHome();
  const characters = familySlots.map(slot => ({ slot, anchor: 'floor' as const, pose: 'stand' as const, x: 2 + slot * 3, y: 8 }));
  state.rooms.home.characters = [];
  state.rooms[roomId].characters = characters;
  expect(validHome(state)).toBe(true);
  const result = homeReducer(state, { type: 'reset', roomId }, {});
  expect(result.message).toBeUndefined();
  expect(validHome(result.state)).toBe(true);
  expect(result.state.rooms[roomId].characters.map(c => c.slot)).toEqual(familySlots);
  for (const c of result.state.rooms[roomId].characters) {
    expect(c.x).toBeGreaterThanOrEqual(0); expect(c.x).toBeLessThanOrEqual(19);
  }
  expect(validHome(homeReducer(result.state, { type: 'theme', roomId, floor: 'honey' }, {}).state)).toBe(true);
});
