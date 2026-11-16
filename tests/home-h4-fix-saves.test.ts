import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { labFixtures } from '../src/home/runtime/lab';
import { buildScene } from '../src/home/scene/graph';
import { resolve } from '../src/home/scene/proposal';
import { roomPoint } from '../src/home/scene/types';
import { validHome, type HomeStateV2 } from '../src/home/model';
import { editHistory, restoredHistory, savedHistory } from '../src/home/useHomeStore';
import { decorSpec } from '../src/home/catalog';
import { panFloorPoint } from '../src/home/scene/pan';
import { cookingIds } from '../src/home/runtime/delight';
import type { RoomId } from '../src/home/catalogMore';

/**
 * Fix round 1 (codex P1, lead decision): every save H4 can write, undo history included, must
 * stay valid for the build before H4. This walks a play session through the real resolver and
 * history: light the stove, put food in the pan, cook it, serve it, a second food in and out,
 * the stove off, a friend into the bath, toggles. Every saved form is checked here against
 * today's validator; with H4_SAVES_OUT set it is also written out, and
 * v4/h4-home/tools/base-validate.test.ts checks the same file against the d18d62a3 validHome.
 */
type History = Parameters<typeof savedHistory>[0];
function walk(): HomeStateV2[] {
  const saves: HomeStateV2[] = [];
  let history: History = { present: labFixtures.delight(), past: [], future: [] };
  const keep = () => { saves.push(savedHistory(history)); };
  const act = (action: Parameters<typeof editHistory>[1]) => { const next = editHistory(history, action); expect(next).not.toBe(history); history = next; keep(); };
  const drop = (id: string, room: RoomId, at: { x: number; y: number }, target?: string) => {
    const scene = buildScene(history.present);
    const proposal = resolve({ ...scene.rooms[room], entities: scene.entities }, scene.entities[id], roomPoint(at.x, at.y), { scale: .5, release: true, target });
    act({ type: 'apply-proposal', proposal } as never);
    return proposal;
  };
  const stove = () => history.present.rooms.kitchen.instances.find((i) => i.item === 'stove')!;
  const pan = () => buildScene(history.present).rooms.kitchen.targets.find((t) => t.pan)!;
  keep();
  act({ type: 'toggle', id: stove().id, roomId: 'kitchen' });
  const into = drop('kitchen/item/mango', 'kitchen', pan().contact, pan().id);
  expect(into.target).toBe(pan().id);
  act({ type: 'cook', id: 'mango', roomId: 'kitchen' } as never);
  expect(history.present.rooms.kitchen.instances.find((i) => i.id === 'mango')!.powered).toBe(true);
  drop('kitchen/item/mango', 'kitchen', { x: 250, y: 480 });
  drop('kitchen/item/rice', 'kitchen', pan().contact, pan().id);
  act({ type: 'toggle', id: stove().id, roomId: 'kitchen' });
  drop('kitchen/item/rice', 'kitchen', { x: 330, y: 480 });
  // Fix round 2: an explicit floor drop on the pan's own cell (same save as "in the pan"), undone and redone.
  drop('kitchen/item/rice', 'kitchen', pan().contact, pan().id);
  drop('kitchen/item/rice', 'kitchen', panFloorPoint(stove()));
  act({ type: 'undo' });
  act({ type: 'redo' });
  const sink = history.present.rooms.kitchen.instances.find((i) => i.item === 'sink-counter')!;
  act({ type: 'toggle', id: sink.id, roomId: 'kitchen' });
  act({ type: 'undo' });
  act({ type: 'redo' });
  // A relaunch rebuilds the history from the save; one more edit is saved from that.
  history = restoredHistory(saves.at(-1)!);
  act({ type: 'toggle', id: stove().id, roomId: 'kitchen' });
  return saves;
}

describe('fix round 1: H4 saves stay readable by the build before H4', () => {
  const saves = walk();
  it('every save in a full stove session is valid, undo included', () => {
    expect(saves.length).toBeGreaterThan(10);
    for (const save of saves) expect(validHome(save)).toBe(true);
    expect(saves.some((s) => (s.undo?.steps.length ?? 0) > 3)).toBe(true);
    if (process.env.H4_SAVES_OUT) writeFileSync(process.env.H4_SAVES_OUT, JSON.stringify(saves));
  });
  it('nothing is ever saved on a stove: not in the present, not in any undo step', () => {
    const json = saves.map((s) => JSON.stringify(s));
    const stoveIds = new Set(saves.flatMap((s) => Object.values(s.rooms).flatMap((r) => r.instances.filter((i) => i.item === 'stove').map((i) => i.id))));
    for (const text of json) for (const id of stoveIds) expect(text).not.toContain(`"on":"${id}"`);
    expect(decorSpec('stove').surface).toBeFalsy();
  });
  it('a cooked food is saved with powered on an ordinary floor placement', () => {
    const cooked = saves.find((s) => s.rooms.kitchen.instances.some((i) => i.id === 'mango' && i.powered))!;
    const mango = cooked.rooms.kitchen.instances.find((i) => i.id === 'mango')!;
    expect(Object.keys(mango).sort()).toEqual(expect.arrayContaining(['id', 'item', 'x', 'y', 'powered']));
    expect(mango.on).toBeUndefined();
  });
});

describe('fix round 2: the pan is a runtime seat; undo, redo and relaunch agree with it', () => {
  type H = Parameters<typeof savedHistory>[0];
  const seated = (h: H) => buildScene(h.present).entities['kitchen/item/mango'].pan;
  it('a pan drop seats the food, a floor drop on the same cell unseats it, and undo/redo bring each back exactly', () => {
    let h: H = { present: labFixtures.delight(), past: [], future: [] };
    const stove = h.present.rooms.kitchen.instances.find((i) => i.item === 'stove')!;
    h = editHistory(h, { type: 'toggle', id: stove.id, roomId: 'kitchen' });
    const drop = (at: { x: number; y: number }, target?: string) => {
      const scene = buildScene(h.present);
      const p = resolve({ ...scene.rooms.kitchen, entities: scene.entities }, scene.entities['kitchen/item/mango'], roomPoint(at.x, at.y), { scale: .5, release: true, target });
      h = editHistory(h, { type: 'apply-proposal', proposal: p } as never);
      return p;
    };
    const pan = buildScene(h.present).rooms.kitchen.targets.find((t) => t.pan)!;
    drop(pan.contact, pan.id);
    const stoveId = `kitchen/item/${stove.id}`;
    expect(seated(h)).toBe(stoveId);
    expect(cookingIds(buildScene(h.present))).toEqual(['kitchen/item/mango']);
    const inPan = h.present;
    expect(drop(panFloorPoint(stove)).kind).toBe('floor');
    expect(JSON.stringify(h.present.rooms.kitchen)).toBe(JSON.stringify(inPan.rooms.kitchen));
    expect(seated(h)).toBeUndefined();
    expect(cookingIds(buildScene(h.present))).toEqual([]);
    expect(buildScene(h.present).revision).not.toBe(buildScene(inPan).revision);
    h = editHistory(h, { type: 'undo' });
    expect(seated(h)).toBe(stoveId);
    expect(cookingIds(buildScene(h.present))).toEqual(['kitchen/item/mango']);
    h = editHistory(h, { type: 'redo' });
    expect(seated(h)).toBeUndefined();
    // The stove turned off and on again keeps a seated food seated.
    h = editHistory(h, { type: 'undo' });
    h = editHistory(h, { type: 'toggle', id: stove.id, roomId: 'kitchen' });
    h = editHistory(h, { type: 'toggle', id: stove.id, roomId: 'kitchen' });
    expect(seated(h)).toBe(stoveId);
    // A cook step keeps it seated and is cooked.
    h = editHistory(h, { type: 'cook', id: 'mango', roomId: 'kitchen' } as never);
    expect(h.present.rooms.kitchen.instances.find((i) => i.id === 'mango')!.powered).toBe(true);
    expect(seated(h)).toBe(stoveId);
  });
  it('after a relaunch, food on the pan cell is ordinary floor and does not cook; the save is unchanged', () => {
    let h: H = { present: labFixtures.delight(), past: [], future: [] };
    const stove = h.present.rooms.kitchen.instances.find((i) => i.item === 'stove')!;
    h = editHistory(h, { type: 'toggle', id: stove.id, roomId: 'kitchen' });
    const scene = buildScene(h.present), pan = scene.rooms.kitchen.targets.find((t) => t.pan)!;
    const p = resolve({ ...scene.rooms.kitchen, entities: scene.entities }, scene.entities['kitchen/item/mango'], pan.contact, { scale: .5, release: true, target: pan.id });
    h = editHistory(h, { type: 'apply-proposal', proposal: p } as never);
    expect(seated(h)).toBeDefined();
    const save = savedHistory(h);
    expect(validHome(save)).toBe(true);
    const relaunched = restoredHistory(JSON.parse(JSON.stringify(save)));
    expect(seated(relaunched)).toBeUndefined();
    expect(cookingIds(buildScene(relaunched.present))).toEqual([]);
    expect(editHistory(relaunched, { type: 'cook', id: 'mango', roomId: 'kitchen' } as never).present.rooms.kitchen.instances.find((i) => i.id === 'mango')!.powered).toBeUndefined();
  });
});
