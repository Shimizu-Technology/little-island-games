import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { EntityArt } from '../src/home/runtime/EntityArt';
import { buildScene } from '../src/home/scene/graph';
import { instance, starterHome } from '../src/home/model';
import { familySlots } from '../src/home/family';
import { species } from '../src/home/scene/species';
import type { Facing } from '../src/home/scene/types';
vi.mock('react-native', () => ({ View: 'View' }));
vi.mock('react-native-reanimated', () => ({ default: { View: 'AnimatedView' } }));
vi.mock('react-native-svg', () => ({ default: 'Svg', G: 'G', Path: 'Path', Ellipse: 'Ellipse' }));
vi.mock('../src/home/runtime/CharacterDrawing', () => ({ CharacterDrawing: 'CharacterDrawing' }));
vi.mock('../src/home/runtime/MealArt', () => ({ MealArt: 'MealArt' }));
vi.mock('../src/home/art/Items', () => ({ ItemArt: 'ItemArt' }));
vi.mock('../src/home/art/More', () => ({ MoreItemArt: 'MoreItemArt' }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
it('invalidates the item memo on attachment changes, so a worn ring is never painted twice', async () => {
  const state = starterHome();
  state.rooms.home.instances = [instance('ring', 'swim-ring', 8, 0)];
  const scene = buildScene(state), ring = scene.entities['home/item/ring'];
  let tree: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<EntityArt entity={ring} reduced/>); });
  expect(tree!.root.findAllByType('MoreItemArt' as any)).toHaveLength(1);
  await act(async () => tree!.update(<EntityArt entity={{ ...ring, attachment: { kind: 'hand', character: 'character/0', side: 'right' } }} reduced/>));
  expect(tree!.toJSON()).toBeNull();
  await act(async () => tree!.unmount());
});
it.each(familySlots)('paints a flattened back and front around the waist in every facing, slot %i', async slot => {
  const state = starterHome();
  for (const room of Object.values(state.rooms)) room.characters = [];
  state.rooms.home.instances = [instance('ring', 'swim-ring', 8, 0)];
  state.rooms.home.characters = [{ slot, anchor: 'floor', pose: 'stand', x: 8, y: 8, holding: 'ring' }];
  const actor = buildScene(state).entities[`character/${slot}`];
  for (const facing of Object.keys(species[slot].poses.stand) as Facing[]) {
    let tree: TestRenderer.ReactTestRenderer;
    await act(async () => { tree = TestRenderer.create(<EntityArt entity={{ ...actor, facing }} reduced/>); });
    const back = tree!.root.findByProps({ testID: `worn-floaty-back-${slot}` });
    const front = tree!.root.findByProps({ testID: `worn-floaty-front-${slot}` });
    expect(front.props.style).toEqual(back.props.style);
    expect(front.props.style.height / front.props.style.width).toBeCloseTo(.48);
    const art = tree!.root.findAllByType('MoreItemArt' as any);
    expect(art.map(a => a.props.layer)).toEqual(['back', 'front']);
    expect(art.every(a => a.props.occupied)).toBe(true);
    await act(async () => tree!.unmount());
  }
});
