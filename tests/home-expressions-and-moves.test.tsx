import React from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { EntityArt } from '../src/home/runtime/EntityArt';
import { HomeCharacter } from '../src/home/characterRenderer';
import { activityFaceOf } from '../src/home/runtime/expressions';
import { familySlots, friendNames } from '../src/home/family';
import { labFixtures } from '../src/home/runtime/lab';
import { buildScene, createSceneBuilder } from '../src/home/scene/graph';
import { resolve, apply } from '../src/home/scene/proposal';
import { migrateHome } from '../src/home/model';
import { roomPoint } from '../src/home/scene/types';
import type { SceneEntity } from '../src/home/scene/types';
import { historyAdmits, savedHistory, editHistory, type History } from '../src/home/useHomeStore';
import * as undo from '../src/home/undoHistory';
vi.mock('react-native', () => ({ View: 'View', Image: 'image' }));
vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView', createAnimatedComponent: (c: unknown) => c },
  ReduceMotion: { Never: 'never', System: 'system' },
  useSharedValue: (value: number) => ({ value, set(v: number) { this.value = v; } }),
  useAnimatedProps: () => ({}),
  useAnimatedStyle: () => ({}),
  cancelAnimation: () => {},
  withRepeat: () => 0,
  withSequence: () => 0,
  withTiming: () => 0,
  Easing: { inOut: () => 0, sin: 0, linear: (t: number) => t },
}));

vi.mock('react-native-svg', () => {
  const tags = {
    default: 'svg',
    Circle: 'circle',
    Ellipse: 'ellipse',
    G: 'g',
    Path: 'path',
    Rect: 'rect', Image: 'image',
    Defs: 'defs',
    Filter: 'filter',
    FeColorMatrix: 'feColorMatrix',
    ClipPath: 'clipPath',
    Pattern: 'pattern',
    Text: 'text',
    LinearGradient: 'linearGradient',
    Stop: 'stop',
  };
  return Object.fromEntries(
    Object.entries(tags).map(([name, tag]) => [
      name,
      ({ children, accessible: _accessible, ...props }: Record<string, unknown>) =>
        React.createElement(tag, props, children as React.ReactNode),
    ]),
  );
});

vi.mock('../src/arcade/Art', () => ({ StickerArt: () => null }));


const state = () => migrateHome(labFixtures['silky-family']())!;
function actor(slot: number, base: SceneEntity['base'] = 'lie'): SceneEntity {
  const scene = buildScene(state());
  return { ...scene.entities[`character/${slot}`], base, action: null };
}
describe('Track 4 first-paint activity expressions', () => {
  it.each(familySlots)('family slot %s sleeps immediately, including landing art, and wakes cheerfully in carry', slot => {
    const e = actor(slot), inputs: any[] = [];
    const renderer = (input: any) => { inputs.push(input); return <HomeCharacter input={input}/>; };
    const html = render(<EntityArt entity={e} reduced renderCharacter={renderer}/>);
    expect(inputs[0].face, friendNames[slot]).toBe('sleepy');
    expect(html).toContain('data-eyes="closed-arcs"');
    expect(html).not.toContain('data-gaze="pupils"');
    inputs.length = 0;
    const carried = render(<EntityArt entity={e} carry reduced faceOverride="sleepy" renderCharacter={renderer}/>);
    expect(inputs[0].base).toBe('carry');
    expect(inputs[0].face).toBe('happy');
    expect(carried).toContain('data-expression="happy"');
    expect(carried).not.toContain('data-eyes="closed-arcs"');
  });
  it.each(familySlots)('uses warm expressions for family slot %s in bath, sofa/beach seating, or holding toys', slot => {
    for (const e of [actor(slot, 'bathe'), actor(slot, 'sit'), {...actor(slot, 'stand'), character: {...actor(slot).character!, holding: 'teddy' as any}}]) {
      expect(activityFaceOf(e)).toBe('happy');
      const html = render(<EntityArt entity={e} reduced/>);
      expect(html).toContain('data-expression="happy"');
    }
  });
  it('sleep wins over landing greetings, but meals and carry retain their own expressions', () => {
    const e = actor(0);
    expect(activityFaceOf(e, false, 'happy')).toBe('sleepy');
    expect(activityFaceOf(e, true, 'surprised')).toBe('sleepy');
    expect(activityFaceOf({...e, action:'eat'}, false, 'yum')).toBe('yum');
    expect(activityFaceOf({...e, action:'drink'})).toBeUndefined();
    expect(activityFaceOf(e, true, 'surprised', true)).toBe('surprised');
  });
});
describe('Track 4 scene identity and history work', () => {
  it('bed → floor keeps every untouched entity in all rooms, then room navigation keeps every entity', () => {
    const build = createSceneBuilder(), initial = state(), before = build(initial);
    const doll = before.entities['character/0'];
    const proposal = resolve({...before.rooms.home, entities:before.entities}, doll, roomPoint(460, 515), {scale: .5, release:true});
    expect(proposal.kind).toBe('floor');
    const result = apply(initial, proposal);
    expect('stale' in result).toBe(false);
    if ('stale' in result) throw Error('stale fixture');
    const after = build(result.state);
    const affected = new Set(['character/0', doll.parent!]);
    for (const [id, entity] of Object.entries(before.entities)) if (!affected.has(id)) expect(after.entities[id], id).toBe(entity);
    expect(after.entities[doll.id].base).toBe('stand');
    const navigated = build({...result.state, current:'kitchen'});
    for (const [id, entity] of Object.entries(after.entities)) expect(navigated.entities[id], id).toBe(entity);
  });
  it('admission and persistence share one computed entries array without weakening undo', () => {
    const admits = vi.spyOn(undo, 'undoAdmits'), bounded = vi.spyOn(undo, 'boundedUndo');
    const history: History = editHistory({present:state(), past:[], future:[]}, {type:'atmosphere', atmosphere:{timeOfDay:'night',weather:'clear'}});
    expect(historyAdmits(history)).toBe(true);
    const saved = savedHistory(history);
    expect(bounded.mock.calls.at(-1)![0]).toBe(admits.mock.calls.at(-1)![0]);
    expect(saved.undo?.steps.length).toBe(1);
    admits.mockRestore(); bounded.mockRestore();
  });
});
