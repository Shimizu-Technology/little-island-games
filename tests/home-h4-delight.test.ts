import { describe, expect, it, vi } from 'vitest';
import { createFeedback, homeSounds, MAX_VOICES, HAPTIC_GAP_MS, soundLength, type HomeSound } from '../src/home/runtime/homeSound';
import { litLamps, attaches, burps, cookingIds, cueLength, cueMotion, dangle, DANGLE_AFTER_MS, faceSamples, giggleTilt, GIGGLE_DEGREES, greeters,
  lampShadow, landingMaterial, landingSound, materialGive, materialOf, noticesFor, NOTICE_RADIUS, pickupFace, squashCurve, squashDepth,
  squashScale, SQUASH_MS, watchersOf, FRIEND_GIVE } from '../src/home/runtime/delight';
import { carryDisplay, landingSquash, pickupTransform } from '../src/home/runtime/handFeel';
import { emptyDragSlot, type DragSlot } from '../src/home/runtime/useInteraction';
import { restingFlagsOf, restingMotionOf } from '../src/home/runtime/restingState';
import { particlesOf, effectLength, type EffectKind } from '../src/home/runtime/Effects';
import { labFixtures } from '../src/home/runtime/lab';
import { buildScene } from '../src/home/scene/graph';
import { buildingLayout } from '../src/home/camera';
import { homeReducer, instance, starterHome, validHome, type HomeStateV2 } from '../src/home/model';
import { editHistory } from '../src/home/useHomeStore';
import { capabilityOf } from '../src/home/world';
import { itemIds } from '../src/home/catalog';
import { entityName } from '../src/home/scene/labels';
import { panCell, panFloorPoint, panSeatPoint } from '../src/home/scene/pan';
import { decorSpec } from '../src/home/catalog';
import type { DropProposal } from '../src/home/scene/resolve';
import type { SceneEntity } from '../src/home/scene/types';
vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove() {} }), currentState: 'active' }, Platform: { OS: 'ios' }, View: 'View' }));
vi.mock('react-native-reanimated', () => ({ default: { View: 'AnimatedView' }, useSharedValue: (v: unknown) => ({ value: v }), useAnimatedStyle: (fn: () => unknown) => fn,
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }), useAnimatedReaction: () => {}, useFrameCallback: () => undefined, withTiming: (v: unknown) => v,
  Easing: { linear: (t: number) => t }, runOnJS: (f: unknown) => f, runOnUI: (f: unknown) => f, cancelAnimation: () => {} }));
vi.mock('react-native-gesture-handler', () => { const b: any = new Proxy({}, { get: () => () => b }); return { Gesture: { Manual: () => b } }; });

const slot = (over: Partial<DragSlot>): DragSlot => ({ ...emptyDragSlot(), id: 'home/character/0', ready: true, ...over });
const proposal = (over: Partial<DropProposal>) => ({ kind: 'floor', base: 'stand', room: 'home', attachment: { kind: 'floor' }, contact: { x: 400, y: 450 }, ...over }) as unknown as DropProposal;

describe('HD-03 / HD-04 sounds and haptics (rule 60)', () => {
  const fake = () => {
    const played: HomeSound[] = [], haptics: string[] = [];
    let now = 1000;
    const feedback = createFeedback({
      create: (sound) => ({ play: () => { played.push(sound); }, seekTo: () => undefined, pause: () => {}, remove: () => {} }),
      haptic: (kind) => { haptics.push(kind); },
      now: () => now,
    });
    return { feedback, played, haptics, tick: (ms: number) => { now += ms; } };
  };
  it('plays nothing and taps nothing while sound is off, and everything visual stays the same', () => {
    const f = fake();
    expect(f.feedback.play('wood')).toBe(false);
    expect(f.feedback.haptic('pickup')).toBe(false);
    expect(f.played).toEqual([]); expect(f.haptics).toEqual([]);
    f.feedback.setLive(true);
    expect(f.feedback.play('wood')).toBe(true);
    expect(f.feedback.haptic('pickup')).toBe(true);
    f.feedback.setLive(false);
    f.tick(500);
    expect(f.feedback.haptic('attach')).toBe(false);
  });
  it('one light haptic on pickup and one on attach, at least 100 ms apart', () => {
    const f = fake(); f.feedback.setLive(true);
    expect(f.feedback.haptic('pickup')).toBe(true);
    f.tick(HAPTIC_GAP_MS - 1); expect(f.feedback.haptic('attach')).toBe(false);
    f.tick(1); expect(f.feedback.haptic('attach')).toBe(true);
    expect(f.haptics).toEqual(['pickup', 'attach']);
  });
  it('at most four voices at once; a voice frees when its sound ends', () => {
    const f = fake(); f.feedback.setLive(true);
    for (const s of ['bubbles', 'sizzle', 'burp', 'clang'] as const) expect(f.feedback.play(s)).toBe(true);
    expect(f.feedback.play('wood')).toBe(false);
    f.tick(soundLength.burp);
    expect(f.feedback.play('wood')).toBe(true);
    expect(MAX_VOICES).toBe(4);
  });
  it('every cue is short: ticks <= 50 ms, landings 60-120 ms, actions <= 800 ms', () => {
    for (const s of ['pick', 'lift'] as const) expect(soundLength[s]).toBeLessThanOrEqual(50);
    for (const s of ['cloth', 'wood', 'shell'] as const) { expect(soundLength[s]).toBeGreaterThanOrEqual(60); expect(soundLength[s]).toBeLessThanOrEqual(120); }
    for (const s of homeSounds) expect(soundLength[s]).toBeLessThanOrEqual(800);
  });
  it('cloth, wood, shell and splash each have a sound, chosen by what lands and where', () => {
    const scene = buildScene(labFixtures.delight());
    expect(landingSound(undefined, proposal({ kind: 'socket', base: 'bathe' }), scene)).toBe('splash');
    expect(landingSound({ item: instance('c', 'floor-cushion', 0, 0) } as SceneEntity, proposal({}), scene)).toBe('cloth');
    expect(landingSound({ item: instance('b', 'book', 0, 0) } as SceneEntity, proposal({}), scene)).toBe('wood');
    expect(landingSound({ item: instance('s', 'shell', 0, 0) } as SceneEntity, proposal({}), scene)).toBe('shell');
    expect(landingSound(undefined, proposal({ kind: 'mouth' }), scene)).toBeUndefined();
    expect(attaches(proposal({ kind: 'floor' }))).toBe(false);
    for (const kind of ['hand', 'mouth', 'socket'] as const) expect(attaches(proposal({ kind }))).toBe(true);
    // A running sink splashes.
    const sink = Object.values(scene.entities).find((e) => e.item?.item === 'sink-counter')!;
    const wet = buildScene({ ...labFixtures.delight(), rooms: { ...labFixtures.delight().rooms, kitchen: { ...labFixtures.delight().rooms.kitchen,
      instances: labFixtures.delight().rooms.kitchen.instances.map((i) => i.item === 'sink-counter' ? { ...i, powered: true } : i) } } });
    expect(landingMaterial(undefined, proposal({ kind: 'surface', attachment: { kind: 'surface', parent: sink.id, slot: 0 } }), wet)).toBe('splash');
  });
});

describe('HD-02 squash by drop height and material', () => {
  it('is visible at phone size: at least 2 pt on a small mango at 0.5 scale, more for soft things and higher drops', () => {
    const mangoHeight = 55 * 0.5;
    const low = squashDepth(materialGive.cloth, 0), high = squashDepth(materialGive.cloth, 80);
    expect(low * mangoHeight).toBeGreaterThanOrEqual(2);
    expect(high).toBeGreaterThan(low);
    expect(squashDepth(materialGive.shell, 80)).toBeLessThan(squashDepth(materialGive.wood, 80));
    expect(squashDepth(materialGive.wood, 80)).toBeLessThan(squashDepth(materialGive.cloth, 80));
    expect(squashDepth(FRIEND_GIVE, 30) * 163 * 0.5).toBeGreaterThan(3);
    expect(materialOf('teddy')).toBe('cloth'); expect(materialOf('shell')).toBe('shell'); expect(materialOf('bookcase')).toBe('wood');
  });
  it('happens inside the settle and is over before the resting art takes over', () => {
    for (const duration of [240, 320, 400]) {
      expect(squashCurve(0, duration)).toBe(0);
      expect(squashCurve(duration - SQUASH_MS, duration)).toBe(0);
      expect(squashCurve(duration - SQUASH_MS + 45, duration)).toBeCloseTo(1, 5);
      expect(squashCurve(duration, duration)).toBe(0);
      expect(squashCurve(duration + 50, duration)).toBe(0);
    }
    const s = squashScale(0.2, 1);
    expect(s.sy).toBeCloseTo(0.8); expect(s.sx).toBeGreaterThan(1);
  });
  it('only scales about the contact, never under Reduced Motion, never into a hand or mouth', () => {
    const scene = buildScene(labFixtures.delight());
    const mango = Object.values(scene.entities).find((e) => e.item?.item === 'mango')!;
    const settling = slot({ id: mango.id, phase: 'settling', settleAt: 1000, releaseY: 100, targetY: 160, proposal: proposal({ kind: 'floor' }) });
    const peak = 1000 + 240 - SQUASH_MS + 45;
    expect(landingSquash(settling, mango, 1, 0.5, peak, false).sy).toBeLessThan(0.9);
    expect(landingSquash(settling, mango, 1, 0.5, peak, true)).toEqual({ sx: 1, sy: 1 });
    expect(landingSquash({ ...settling, proposal: proposal({ kind: 'hand' }) }, mango, 1, 0.5, peak, false)).toEqual({ sx: 1, sy: 1 });
    expect(landingSquash({ ...settling, proposal: proposal({ kind: 'mouth' }) }, mango, 1, 0.5, peak, false)).toEqual({ sx: 1, sy: 1 });
    // The pickup transform no longer carries a squash of its own, so lift and position are unchanged.
    const t = pickupTransform(settling, mango, 0.5, peak, false);
    expect(t.scaleX).toBe(t.scaleY);
  });
});

describe('HD-01 picked-up reactions (rule 43)', () => {
  it('glances at once, smiles within 250 ms and keeps smiling while carried; set down, the face is their own again', () => {
    expect(pickupFace(0)).toBe(1);
    expect(pickupFace(250)).toBe(2);
    expect(pickupFace(5000)).toBe(2);
    expect(pickupFace(-1)).toBe(0);
    expect(carryDisplay(slot({ phase: 'settling', liftedAt: 0 }), 5000, false).face).toBe(0);
  });
  it('the giggle and the dangle only rotate about the grip and stay small', () => {
    let max = 0;
    for (let t = 0; t < 2000; t += 5) max = Math.max(max, Math.abs(giggleTilt(t)));
    expect(max).toBeLessThanOrEqual(GIGGLE_DEGREES);
    expect(dangle(DANGLE_AFTER_MS)).toEqual({ tilt: 0, sample: 0 });
    for (let t = 0; t < 12000; t += 7) { const d = dangle(t); expect(Math.abs(d.tilt)).toBeLessThanOrEqual(4); expect(Math.abs(d.sample)).toBeLessThanOrEqual(4); }
    const scene = buildScene(labFixtures.delight());
    const friend = Object.values(scene.entities).find((e) => e.character)!;
    const held = slot({ id: friend.id, phase: 'dragging', liftedAt: 1000, lastMoveAt: 1000 });
    const a = pickupTransform(held, friend, 0.5, 1300, false), b = pickupTransform(held, friend, 0.5, 2600, false);
    expect(a.lift).toBe(b.lift);
    expect(pickupTransform(held, friend, 0.5, 1300, true).tilt).toBe(0);
    // Props never giggle.
    const mango = Object.values(scene.entities).find((e) => e.item?.item === 'mango')!;
    expect(pickupTransform({ ...held, id: mango.id }, mango, 0.5, 1300, false).tilt).toBe(0);
  });
  it('always selects a mounted carry frame, so a friend can never vanish mid-carry', () => {
    const mounted = new Set([...[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((s) => s * 3), 1, ...faceSamples.map((s) => s * 3 + 2)]);
    const reducedMounted = new Set([0, 1, 2]);
    for (const lag of [-12, -7, -3, 0, 2, 6, 11]) for (const moved of [0, 500, 3000]) for (let t = 0; t < 6000; t += 37) {
      const s = slot({ phase: 'dragging', lag, liftedAt: 1000, lastMoveAt: 1000 + moved });
      const d = carryDisplay(s, 1000 + t, false);
      expect(mounted.has(d.sample * 3 + d.face)).toBe(true);
      const r = carryDisplay(s, 1000 + t, true);
      expect(reducedMounted.has(r.sample * 3 + r.face)).toBe(true);
    }
    expect(carryDisplay(slot({ phase: 'settling', liftedAt: 0 }), 100, false).face).toBe(0);
  });
});

describe('HD-05 / HD-06 / HD-09 resting reactions', () => {
  it('each cue is short, starts small and returns exactly to rest', () => {
    for (const kind of Object.keys(cueLength) as (keyof typeof cueLength)[]) {
      const cue = { at: 1000, kind, dir: 1 };
      expect(cueMotion(cue, 1000 + cueLength[kind])).toBeUndefined();
      expect(cueLength[kind]).toBeLessThanOrEqual(900);
      for (let t = 0; t < cueLength[kind]; t += 10) expect(Math.abs(cueMotion(cue, 1000 + t)!.deg)).toBeLessThanOrEqual(7);
    }
    const motion = restingMotionOf([], '', 1, 1100, false, {}, null, { a: { at: 1000, kind: 'happy', dir: 0 } });
    expect(motion.wobble.a).not.toBe(0);
    expect(restingMotionOf([], '', 1, 1100, true, {}, null, { a: { at: 1000, kind: 'happy', dir: 0 } }).wobble.a).toBeUndefined();
  });
  it('a friend notices food or a friend carried near, toward the side it is on; the flag changes only at the edge', () => {
    const state = labFixtures.delight(), scene = buildScene(state), building = buildingLayout(4);
    const watchers = watchersOf(scene, building);
    const pip = watchers.find((w) => w.id.endsWith('character/1'))!;
    expect(noticesFor({ x: pip.x - 60, y: pip.y }, true, watchers, [])).toContainEqual({ id: pip.id, dir: -1, food: true });
    expect(noticesFor({ x: pip.x + NOTICE_RADIUS + 400, y: pip.y }, true, watchers, []).some((n) => n.id === pip.id)).toBe(false);
    const mango = Object.values(scene.entities).find((e) => e.item?.item === 'mango')!;
    const drag = (x: number) => slot({ id: mango.id, subject: mango, phase: 'dragging', x, y: pip.y - (mango.visual?.y ?? 0) });
    const a = restingFlagsOf([drag(pip.x - 60), emptyDragSlot()], [], watchers), b = restingFlagsOf([drag(pip.x - 50), emptyDragSlot()], [], watchers);
    expect(a.notice.some((n) => n.id === pip.id && n.food)).toBe(true);
    expect(a.key).toBe(b.key);
    // Waiting and lying friends do not look.
    const rest = buildScene(labFixtures['delight-rest']());
    expect(watchersOf(rest, building).some((w) => rest.entities[w.id].base === 'lie')).toBe(false);
  });
  it('friends near a friend set down greet them; lying or eating friends do not', () => {
    const scene = buildScene(labFixtures.delight());
    const islander = Object.values(scene.entities).find((e) => e.character?.slot === 0)!;
    const pip = Object.values(scene.entities).find((e) => e.character?.slot === 1)!;
    expect(greeters(scene, islander).map((g) => g.id)).not.toContain(pip.id);
    const beside = { ...islander, contact: { ...pip.contact, x: pip.contact.x - 100 } } as SceneEntity;
    expect(greeters(scene, beside)).toContainEqual({ id: pip.id, dir: -1 }); // Pip leans left, toward the friend set down on that side.
    const rest = buildScene(labFixtures['delight-rest']());
    const restingPip = Object.values(rest.entities).find((e) => e.character?.slot === 1)!;
    expect(greeters(rest, restingPip).some((g) => rest.entities[g.id].base === 'lie')).toBe(false);
  });
  it('the burp is rare and never random: the fifth meal, then every sixth', () => {
    expect(Array.from({ length: 30 }, (_, i) => i + 1).filter(burps)).toEqual([5, 11, 17, 23, 29]);
  });
  it('every effect is short, drawn from a few small dots, and the same each time', () => {
    for (const kind of Object.keys(effectLength) as EffectKind[]) {
      expect(effectLength[kind]).toBeLessThanOrEqual(1500);
      expect(particlesOf(kind, 7)).toEqual(particlesOf(kind, 7));
      expect(particlesOf(kind, 7).length).toBeLessThanOrEqual(8);
    }
  });
});

describe('HD-07 stove and pan (rules 48, 49)', () => {
  const kitchen = () => labFixtures.delight();
  // Food in the pan is saved on the floor cell in front of the stove (scene/pan), never `on` it.
  const withFood = (state: HomeStateV2, lit: boolean, food = 'mango') => {
    const stove = state.rooms.kitchen.instances.find((i) => i.item === 'stove')!, cell = panCell(stove);
    return { ...state, rooms: { ...state.rooms, kitchen: { ...state.rooms.kitchen,
      instances: [...state.rooms.kitchen.instances.filter((i) => i.id !== 'mango').map((i) => i.item === 'stove' ? { ...i, powered: lit } : i),
        instance('pan-food', food as never, cell.x, cell.y)] } } } as HomeStateV2;
  };
  it('a tap lights the stove and a second tap turns it off; it stays put in Play', () => {
    const state = kitchen(), stove = state.rooms.kitchen.instances.find((i) => i.item === 'stove')!;
    expect(capabilityOf('stove')).toMatchObject({ toggle: 'power', moveInPlay: false });
    const on = homeReducer(state, { type: 'toggle', id: stove.id, roomId: 'kitchen' }).state;
    expect(on.rooms.kitchen.instances.find((i) => i.id === stove.id)!.powered).toBe(true);
    const off = homeReducer(on, { type: 'toggle', id: stove.id, roomId: 'kitchen' }).state;
    expect(off.rooms.kitchen.instances.find((i) => i.id === stove.id)!.powered).toBe(false);
  });
  it('the pan takes food without a saved attachment: the stove is not a surface, the food is saved on the floor in front and drawn in the pan', () => {
    expect(decorSpec('stove').surface).toBeFalsy();
    const state = withFood(kitchen(), false);
    expect(validHome(state)).toBe(true);
    const food = state.rooms.kitchen.instances.find((i) => i.id === 'pan-food')!;
    expect(food.on).toBeUndefined();
    const scene = buildScene(state), stove = Object.values(scene.entities).find((e) => e.item?.item === 'stove')!;
    const entity = scene.entities['kitchen/item/pan-food'];
    expect(entity.pan).toBe(stove.id);
    expect(entity.attachment).toMatchObject({ kind: 'floor', at: panFloorPoint(stove.item!) });
    expect(entity.contact).toEqual(panSeatPoint(stove.item!));
    expect(scene.rooms.kitchen.surfaces.filter((t) => t.owner === stove.id).map((t) => t.id)).toEqual([`${stove.id}/pan`]);
    // Only food: a toy at the same spot is just on the floor.
    const toy = buildScene(withFood(kitchen(), false, 'teddy'));
    expect(toy.entities['kitchen/item/pan-food'].pan).toBeUndefined();
  });
  it('raw food on a lit stove cooks; off the heat or on a cold stove nothing happens; cooked food stays cooked', () => {
    const hot = withFood(kitchen(), true), cold = withFood(kitchen(), false);
    expect(cookingIds(buildScene(hot))).toEqual(['kitchen/item/pan-food']);
    expect(cookingIds(buildScene(cold))).toEqual([]);
    const cooked = homeReducer(hot, { type: 'cook', id: 'pan-food', roomId: 'kitchen' });
    expect(cooked.state.rooms.kitchen.instances.find((i) => i.id === 'pan-food')!.powered).toBe(true);
    expect(cooked.message).toBe('The mango is cooked.');
    expect(validHome(cooked.state)).toBe(true);
    expect(cookingIds(buildScene(cooked.state))).toEqual([]);
    expect(homeReducer(cold, { type: 'cook', id: 'pan-food', roomId: 'kitchen' }).state).toBe(cold);
    expect(homeReducer(cooked.state, { type: 'cook', id: 'pan-food', roomId: 'kitchen' }).state).toBe(cooked.state);
    // A drink or a toy in the pan never "cooks".
    expect(cookingIds(buildScene(withFood(kitchen(), true, 'juice')))).toEqual([]);
    expect(entityName(buildScene(cooked.state).entities['kitchen/item/pan-food'])).toBe('Grilled mango');
  });
  it('cooking is not an undo step of its own (like finish-action); undo of the drop restores the raw food', () => {
    const hot = withFood(kitchen(), true);
    const history = { present: hot, past: [kitchen()], future: [] };
    const next = editHistory(history, { type: 'cook', id: 'pan-food', roomId: 'kitchen' }, {});
    expect(next.past).toBe(history.past);
    expect(next.present.rooms.kitchen.instances.find((i) => i.id === 'pan-food')!.powered).toBe(true);
  });
});

describe('HD-08 lamp shadows', () => {
  it('a lit lamp throws a soft shadow from a friend standing near it, away from the light; off, none', () => {
    const lit = buildScene(labFixtures['delight-rest']());
    const crab = Object.values(lit.entities).find((e) => e.character?.slot === 2)!;
    const shadow = lampShadow(lit, crab)!;
    expect(shadow).toBeDefined();
    expect(shadow.opacity).toBeLessThanOrEqual(0.32);
    const lamp = Object.values(lit.rooms.home.entities).find((e) => e.item?.item === 'lamp')!;
    expect(Math.sign(Math.cos((shadow.angle * Math.PI) / 180))).toBe(Math.sign(crab.contact.x - lamp.contact.x) || 1);
    const state = labFixtures['delight-rest']();
    state.rooms.home.instances = state.rooms.home.instances.map((i) => (i.id === 'lamp' ? { ...i, powered: false } : i));
    const dark = buildScene(state);
    expect(lampShadow(dark, Object.values(dark.entities).find((e) => e.character?.slot === 2)!)).toBeUndefined();
    expect(litLamps(lit, 'home').map((e) => e.item!.item)).toEqual(['lamp']);
    expect(litLamps(dark, 'home')).toEqual([]);
    // A friend asleep in bed throws none.
    expect(lampShadow(lit, Object.values(lit.entities).find((e) => e.character?.slot === 0)!)).toBeUndefined();
  });
});

describe('HC-01 nothing that looks touchable refuses silently', () => {
  it('every catalog item has an answer to a tap in Play: a toggle, a tub, or its own sound', () => {
    for (const id of itemIds) {
      const cap = capabilityOf(id as never);
      expect(!!cap.toggle || ['bathtub', 'bubble-bath'].includes(id) || ['cloth', 'wood', 'shell'].includes(materialOf(id))).toBe(true);
    }
  });
  it('the starter rooms and the H4 lab fixtures validate with the stove change', () => {
    expect(validHome(starterHome())).toBe(true);
    for (const name of ['delight', 'delight-rest', 'delight-feast', 'delight-beach']) expect(validHome(labFixtures[name]())).toBe(true);
  });
});
