import { describe, expect, it } from 'vitest';
import { instance, migrateHome, starterHome, validHome, homeReducer, type HomeStateV2 } from '../src/home/model';
import { storageCapacity, storageOpen } from '../src/home/storage';
import { withPortions } from '../src/home/runtime/portions';
import { itemShapes } from '../src/home/art/silhouettes';
import { buildScene } from '../src/home/scene/graph';
import { resolve, apply } from '../src/home/scene/proposal';
import { roomPoint } from '../src/home/scene/types';
import { editHistory, restoredHistory, savedHistory, historyAdmits, type History } from '../src/home/useHomeStore';
import { undoBytes, HOME_UNDO_BYTES, HOME_UNDO_READ_BYTES } from '../src/home/undoHistory';

function fixture(container = 'carry-basket', count = 0): HomeStateV2 {
  const s = migrateHome(starterHome())!;
  for (const r of Object.values(s.rooms)) { r.instances = []; r.characters = []; }
  s.rooms.home.instances = [instance('box', container, 8, 7), instance('loose', 'mango', 3, 10),
    ...Array.from({ length: count }, (_, n) => ({ ...instance(`stored-${n}`, 'shell', 0, 0), in: 'box' }))];
  return s;
}
function proposal(s: HomeStateV2, id: string, room = 'home' as HomeStateV2['current'], target?: string) {
  const scene = buildScene(s), subject = scene.entities[`home/item/${id}`] ?? scene.entities[`kitchen/item/${id}`];
  const index = { ...scene.rooms[room], entities: scene.entities };
  const t = index.targets.find(t => t.id === target);
  return resolve(index, subject, t?.contact ?? roomPoint(500, 525), { scale: 1, release: true, target, floorOnly: !target });
}
function put(s: HomeStateV2) { return proposal(s, 'loose', 'home', 'home/item/box/container'); }

describe('HS-01 / HS-02 storage', () => {
  it.each([['toy-box', 6], ['dresser', 4], ['cupboard', 8], ['carry-basket', 4], ['fridge', 8]])('%s has an explicit capacity %i and accepts a small item while shut', (kind, cap) => {
    const s = fixture(kind as string);
    expect(storageCapacity(kind as string)).toBe(cap);
    const p = put(s);
    expect(p.attachment).toEqual({ kind: 'container', parent: 'home/item/box' });
    const result = apply(s, p);
    expect('state' in result).toBe(true);
    if (!('state' in result)) return;
    expect(validHome(result.state)).toBe(true);
    expect(result.state.rooms.home.instances.find(i => i.id === 'loose')?.in).toBe('box');
    const box = result.state.rooms.home.instances.find(i => i.id === 'box')!;
    expect(box.storage).toEqual({ version: 1, open: true });
    expect(box.powered).toBe(true);
    expect(buildScene(result.state).entities['home/item/loose'].contact).toEqual(p.contact);
    expect(storageOpen(box)).toBe(true);
  });
  it('full means a typed refusal, with no mutation or lost object', () => {
    const s = fixture('carry-basket', 4), raw = JSON.stringify(s), p = put(s);
    expect(p.refusal).toBe('storage-capacity');
    expect(apply(s, p)).toEqual({ stale: true });
    expect(JSON.stringify(s)).toBe(raw);
  });
  it('rejects self/nested containers, heavy furniture and characters deterministically', () => {
    const s = fixture();
    s.rooms.home.instances.push(instance('other', 'carry-basket', 12, 7), instance('heavy', 'table', 3, 3));
    const scene = buildScene(s), index = scene.rooms.home, t = index.targets.find(t => t.kind === 'container')!;
    for (const id of ['home/item/box', 'home/item/other', 'home/item/heavy']) {
      const p = resolve(index, scene.entities[id], t.contact, { scale: 1, release: true, target: t.id });
      expect(p.attachment.kind).not.toBe('container');
    }
    const nested = fixture(); nested.rooms.home.instances.push({ ...instance('other', 'carry-basket', 0, 0), in: 'box' });
    expect(validHome(nested)).toBe(false);
  });
  it('moves the filled basket as one graph, renames collisions, unpacks, undoes and redoes after relaunch', () => {
    const s = fixture('carry-basket', 4);
    s.rooms.kitchen.instances = [instance('box', 'shell', 2, 10), instance('stored-0', 'shell', 4, 10)];
    let h: History = { present: s, past: [], future: [] };
    const p = proposal(s, 'box', 'kitchen');
    expect(p.moves).toHaveLength(5);
    h = editHistory(h, { type: 'apply-proposal', proposal: p });
    expect(h.present.rooms.home.instances.map(i => i.id)).toEqual(['loose']);
    const basket = h.present.rooms.kitchen.instances.find(i => i.item === 'carry-basket')!;
    expect(h.present.rooms.kitchen.instances.filter(i => i.in === basket.id)).toHaveLength(4);
    const saved = JSON.parse(JSON.stringify(savedHistory(h)));
    expect(validHome(saved)).toBe(true);
    expect(undoBytes(saved.undo)).toBeLessThanOrEqual(HOME_UNDO_BYTES);
    expect(HOME_UNDO_READ_BYTES).toBe(20480);
    const reopened = restoredHistory(saved), undone = editHistory(reopened, { type: 'undo' });
    expect(undone.present.rooms).toEqual(s.rooms);
    expect(editHistory(undone, { type: 'redo' }).present.rooms).toEqual(h.present.rooms);
    const scene = buildScene(h.present), stored = Object.values(scene.entities).find(e => e.item?.in === basket.id)!;
    const unpack = resolve({ ...scene.rooms.kitchen, entities: scene.entities }, stored, roomPoint(650, 525), { scale: 1, release: true, floorOnly: true });
    const result = apply(h.present, unpack);
    expect('state' in result && result.state.rooms.kitchen.instances.filter(i => i.in === basket.id)).toHaveLength(3);
  });
  it('fridge portions, hulls and dispensing obey the revision-1 door state over legacy power', () => {
    let s = fixture('fridge');
    s.rooms.home.instances[0].powered = true;
    s = homeReducer(s, { type: 'toggle', id: 'box', roomId: 'home' }).state;
    const box = s.rooms.home.instances[0];
    expect(storageOpen(box)).toBe(false);
    expect(Object.keys(withPortions(buildScene(s)).entities).filter(id => id.includes('portion-'))).toHaveLength(0);
    expect(itemShapes(box, 336)).toEqual(itemShapes({ ...box, storage: undefined, powered: false, state: 'rest' }, 336));
    const action = { type: 'dispense' as const, source: 'box', id: 'new-food', item: 'mango', x: 300, y: 520, roomId: 'home' as const };
    expect(homeReducer(s, action).state).toBe(s);
    s = homeReducer(s, { type: 'toggle', id: 'box', roomId: 'home' }).state;
    expect(Object.keys(withPortions(buildScene(s)).entities).filter(id => id.includes('portion-'))).toHaveLength(4);
  });
  it('a friend carries the basket and every child; stale/interrupted proposals preserve the complete source', () => {
    const s = fixture('carry-basket', 4);
    s.rooms.home.characters = [{ slot: 0, anchor: 'floor', pose: 'stand', x: 8, y: 7, holding: 'box' }];
    const before = JSON.stringify(s), scene = buildScene(s);
    const p = resolve({ ...scene.rooms.kitchen, entities: scene.entities }, scene.entities['character/0'], roomPoint(500, 525), { scale: 1, floorOnly: true, release: true });
    expect(p.moves).toHaveLength(6);
    expect(JSON.stringify(s)).toBe(before); // Hover, background/cancel and a mid-carry regrab publish no partial save.
    const changed = homeReducer(s, { type: 'toggle', id: 'box', roomId: 'home' }).state;
    expect(apply(changed, p)).toEqual({ stale: true });
    expect(changed.rooms.home.instances).toHaveLength(6);
    const result = apply(s, p); expect('state' in result).toBe(true);
    if ('state' in result) {
      expect(validHome(result.state)).toBe(true);
      expect(result.state.rooms.kitchen.characters[0].holding).toBeDefined();
      expect(result.state.rooms.kitchen.instances.filter(i => i.in)).toHaveLength(4);
      expect(result.state.rooms.home.instances.map(i => i.id)).toEqual(['loose']);
    }
  });
  it('a dense 70-edit storage history stays within H3 budgets, and corruption inside undo is rejected', () => {
    let h: History = { present: fixture('carry-basket', 4), past: [], future: [] };
    for (let n = 0; n < 70; n++) h = editHistory(h, { type: 'toggle', id: 'box', roomId: 'home' });
    const saved = savedHistory(h);
    expect(saved.undo!.steps).toHaveLength(20);
    expect(undoBytes(saved.undo!)).toBeLessThanOrEqual(HOME_UNDO_BYTES);
    expect(historyAdmits(restoredHistory(saved))).toBe(true);
    expect(validHome(saved)).toBe(true);
    const corrupt = JSON.parse(JSON.stringify(saved));
    corrupt.undo.steps.at(-1).home.instances.put[0].value.storage.version = 99;
    expect(migrateHome(corrupt)).toBeUndefined();
  });
  it('legacy v4 saves stay untouched, unknown storage revisions/corrupt links fail closed, reset remains undoable', () => {
    const s = fixture('toy-box', 2), raw = JSON.stringify(s);
    expect(migrateHome(s)).toBe(s); expect(JSON.stringify(s)).toBe(raw);
    let next = homeReducer(s, { type: 'toggle', id: 'box', roomId: 'home' }).state;
    expect(next.rooms.home.instances[0].storage).toEqual({ version: 1, open: true });
    next = homeReducer(next, { type: 'toggle', id: 'box', roomId: 'home' }).state;
    expect(storageOpen(next.rooms.home.instances[0])).toBe(false);
    expect(next.rooms.home.instances.filter(i => i.in === 'box')).toHaveLength(2);
    const broken = JSON.parse(JSON.stringify(next)); broken.rooms.home.instances[0].storage.version = 2;
    expect(migrateHome(broken)).toBeUndefined();
    broken.rooms.home.instances[0].storage.version = 1; broken.rooms.home.instances[1].in = 'missing';
    expect(validHome(broken)).toBe(false);
    const reset = editHistory({ present: next, past: [], future: [] }, { type: 'reset', roomId: 'home' });
    expect(editHistory(restoredHistory(savedHistory(reset)), { type: 'undo' }).present.rooms).toEqual(next.rooms);
    expect(JSON.stringify(s)).toBe(raw);
  });
});
