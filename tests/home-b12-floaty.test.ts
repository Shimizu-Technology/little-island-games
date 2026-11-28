import { describe, expect, it } from 'vitest';
import { familySlots, type FamilySlot } from '../src/home/family';
import { instance, starterHome, validHome, type HomeStateV2 } from '../src/home/model';
import { buildScene } from '../src/home/scene/graph';
import { apply, resolve } from '../src/home/scene/proposal';
import { roomPoint, type SceneEntity } from '../src/home/scene/types';
import { isEntitySwimming } from '../src/home/waterZone';
import { floatyFrame } from '../src/home/floaty';
import { editHistory, restoredHistory, savedHistory } from '../src/home/useHomeStore';
import { prepareHits, pickEntity } from '../src/home/runtime/pick';
import { roomHops } from '../src/home/roomHops';

export function beachFixture(room: 'tumon-beach' | 'cocos-island', slot: FamilySlot = 0) {
  const state = starterHome();
  for (const content of Object.values(state.rooms)) content.characters = [];
  state.current = room;
  state.rooms[room] = { ...state.rooms[room], instances: [instance('b12-ring', 'swim-ring', 8, 0)],
    characters: [{ slot, anchor: 'floor', pose: 'stand', x: 8, y: 8, at: roomPoint(400, 470) }] };
  expect(validHome(state)).toBe(true);
  return state;
}
function edit(state: HomeStateV2, id: string, point: { x: number; y: number }, target?: string) {
  const scene = buildScene(state), index = { ...scene.rooms[state.current], entities: scene.entities };
  const proposal = resolve(index, scene.entities[id], roomPoint(point.x, point.y), { scale: 1, release: true, target });
  const result = apply(state, proposal);
  expect(result, proposal.reason).toHaveProperty('state');
  if (!('state' in result)) throw Error('Invalid edit');
  expect(validHome(result.state)).toBe(true);
  return { ...result, proposal };
}
for (const room of ['tumon-beach', 'cocos-island'] as const) describe(room, () => {
  it.each(familySlots)('wears a waist floaty in either direction and swims as one unit, slot %i', slot => {
    for (const reverse of [false, true]) {
      let state = beachFixture(room, slot);
      let scene = buildScene(state);
      const ringId = `${room}/item/b12-ring`, actorId = `character/${slot}`;
      const target = reverse ? scene.rooms[room].targets.find(t => t.owner === ringId && t.kind === 'socket' && !!t.pet === (slot === 2))!
        : scene.rooms[room].targets.find(t => t.owner === actorId && t.floaty)!;
      state = edit(state, reverse ? actorId : ringId, target.contact, target.id).state;
      expect(state.rooms[room].characters[0].holding).toBe('b12-ring');
      for (const point of [roomPoint(660, 280), roomPoint(710, 290), roomPoint(680, 440), roomPoint(400, 490)]) {
        const move = edit(state, actorId, point);
        expect(move.proposal.moves.map(m => m.id)).toContain(ringId);
        state = move.state;
        scene = buildScene(state);
        const actor = scene.entities[actorId], ring = scene.entities[ringId];
        expect(actor.floaty).toBe(true);
        expect(ring.parent).toBe(actorId);
        expect(ring.contact).toEqual(actor.contact);
        expect(ring.bounds).toEqual(floatyFrame(slot, actor.base, actor.facing));
        expect(state.rooms[room].characters[0].holding).toBe('b12-ring');
        if (point.y <= 320) expect(isEntitySwimming(actor, scene)).toBe(true);
      }
      // Take off: drag the separately pickable rim to open sand/water.
      state = edit(state, ringId, roomPoint(640, 300)).state;
      expect(state.rooms[room].characters[0].holding).toBeUndefined();
      expect(buildScene(state).entities[actorId].floaty).toBeUndefined();
    }
  });
  it('swaps a worn floaty onto another friend, keeps torso pickup, and round-trips Undo/Redo', () => {
    let state = beachFixture(room);
    state.rooms[room].characters.push({ slot: 3, anchor: 'floor', pose: 'stand', x: 12, y: 8, at: roomPoint(620, 460) });
    let scene = buildScene(state);
    const ringId = `${room}/item/b12-ring`;
    state = edit(state, ringId, scene.entities['character/0'].contact, 'character/0/wear-floaty').state;
    scene = buildScene(state);
    const actor = scene.entities['character/0'], ring = scene.entities[ringId];
    const hits = prepareHits(scene)[room];
    const rim = ring.shapes![0] as { left: number; top: number; width: number; height: number };
    expect(pickEntity(hits, roomPoint(ring.contact.x + rim.left + rim.width / 2, ring.contact.y + rim.top + rim.height / 2), 1)).toBe(ringId);
    expect(pickEntity(hits, roomPoint(actor.contact.x, actor.contact.y + actor.bounds.top + 30), 1)).toBe(actor.id);
    const swapped = edit(state, ringId, scene.entities['character/3'].contact, 'character/3/wear-floaty');
    expect(swapped.state.rooms[room].characters.find(c => c.slot === 0)?.holding).toBeUndefined();
    expect(swapped.state.rooms[room].characters.find(c => c.slot === 3)?.holding).toBe('b12-ring');
    let history = editHistory({ past: [], present: state, future: [] }, { type: 'apply-proposal', proposal: swapped.proposal, roomId: room });
    history = restoredHistory(savedHistory(history));
    expect(validHome(savedHistory(history))).toBe(true);
    history = editHistory(history, { type: 'undo' });
    expect(history.present.rooms[room]).toEqual(state.rooms[room]);
    history = editHistory(history, { type: 'redo' });
    expect(history.present.rooms[room]).toEqual(swapped.state.rooms[room]);
  });
  it('allows free swimming and seated floaty poses without invalid saves', () => {
    let state = beachFixture(room);
    state = edit(state, 'character/0', roomPoint(660, 270)).state;
    const scene = buildScene(state);
    expect(isEntitySwimming(scene.entities['character/0'], scene)).toBe(true);
    expect(scene.entities['character/0'].floaty).toBeUndefined();
  });
});

it('resolves Kitchen drags across trash, stove, fridge, sink, table and both portals', () => {
  const state = starterHome(), scene = buildScene(state);
  const index = { ...scene.rooms.kitchen, entities: scene.entities };
  const subjects = Object.values(scene.entities).filter(e => e.character?.slot === 0 || e.room === 'kitchen' && e.item && e.body?.portable && !e.children.length);
  const points = [...index.targets.map(t => t.contact), ...roomHops('kitchen').map(h => roomPoint(h.box.left + h.box.width / 2, h.box.top + h.box.height / 2))];
  for (const subject of subjects) for (const point of points) {
    const proposal = resolve(index, subject as SceneEntity, point, { scale: 1, release: true });
    const result = apply(state, proposal);
    expect(result).toHaveProperty('state');
    if ('state' in result) expect(validHome(result.state)).toBe(true);
  }
});

it('takes the ring off atomically when the wearer sits, and carries it across rooms', () => {
  let state = beachFixture('tumon-beach');
  state = edit(state, 'tumon-beach/item/b12-ring', buildScene(state).entities['character/0'].contact, 'character/0/wear-floaty').state;
  const scene = buildScene(state), actor = scene.entities['character/0'];
  const destination = { ...scene.rooms.kitchen, entities: scene.entities };
  const transfer = resolve(destination, actor, roomPoint(400, 490), { scale: 1, release: true, floorOnly: true });
  const transferred = apply(state, transfer);
  expect(transferred).toHaveProperty('state');
  if ('state' in transferred) {
    expect(transferred.state.rooms.kitchen.characters.find(c => c.slot === 0)?.holding).toBe('b12-ring');
    expect(validHome(transferred.state)).toBe(true);
  }
  state.rooms['tumon-beach'].instances.push(instance('b12-chair', 'chair', 12, 6));
  const seatedScene = buildScene(state);
  const index = { ...seatedScene.rooms['tumon-beach'], entities: seatedScene.entities };
  const seat = index.targets.find(t => t.owner === 'tumon-beach/item/b12-chair' && t.kind === 'socket' && !t.pet)!;
  const proposal = resolve(index, index.entities[actor.id], seat.contact, { scale: 1, release: true, target: seat.id });
  expect(proposal.kind).toBe('socket');
  const result = apply(state, proposal);
  expect(result).toHaveProperty('state');
  if ('state' in result) {
    expect(validHome(result.state)).toBe(true);
    expect(result.state.rooms['tumon-beach'].characters[0].holding).toBeUndefined();
    expect(result.state.rooms['tumon-beach'].characters[0].pose).toBe('sit');
    expect(buildScene(result.state).entities['tumon-beach/item/b12-ring'].parent).toBeUndefined();
  }
});
