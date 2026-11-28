import React from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { StorageTray, StorageFullNote } from '../src/home/runtime/StorageTray';
import { storageDescription } from '../src/home/scene/labels';
import { buildScene } from '../src/home/scene/graph';
import { migrateHome, starterHome, instance } from '../src/home/model';
import { restingVisible } from '../src/home/runtime/group';
vi.mock('react-native', () => ({ View: 'View', Text: 'Text', ScrollView: 'ScrollView', Pressable: 'Pressable' }));
vi.mock('../src/home/art/Items', () => ({ ItemArt: 'ItemArt' }));
vi.mock('../src/home/art/More', () => ({ MoreItemArt: 'MoreItemArt' }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
function fixture(open = true) {
  const s = migrateHome(starterHome())!;
  s.rooms.home.instances = [{ ...instance('box', 'carry-basket', 8, 7), storage: { version: 1, open } },
    { ...instance('toy', 'teddy', 0, 0), in: 'box' }, { ...instance('food', 'mango', 0, 0), in: 'box' }];
  s.rooms.home.characters = [];
  const scene = buildScene(s); return { scene, entity: scene.entities['home/item/box'] };
}
describe('HS-01 storage controls', () => {
  it.each([false, true])('opened shelf has named take-out controls and explicit spaces, large %s', async large => {
    const f = fixture(), onTake = vi.fn(), onClose = vi.fn(); let root!: ReturnType<typeof create>;
    await act(async () => { root = create(<StorageTray {...f} bottom={80} large={large} onTake={onTake} onClose={onClose}/>); });
    const button = root.root.findAllByType('Pressable' as any).find(n => n.props.accessibilityLabel === 'Take out Teddy')!;
    expect(button.props.style.width).toBe(large ? 72 : 60);
    await act(async () => button.props.onPress()); expect(onTake).toHaveBeenCalledWith('home/item/toy');
    await act(async () => root.root.findAllByType('Pressable' as any)[0].props.onPress()); expect(onClose).toHaveBeenCalledOnce();
    expect(storageDescription(f.entity)).toBe('open, 2 of 4 items: Teddy, Mango');
    expect(f.entity.contents?.map(i => i.id)).toEqual(['toy', 'food']);
    expect(restingVisible(f.scene.entities['home/item/toy'], f.scene)).toBe(false);
    await act(async () => root.update(<StorageTray {...fixture(false)} bottom={80} onTake={onTake} onClose={onClose}/>));
    expect(root.toJSON()).toBeNull();
    await act(async () => root.update(<StorageTray {...fixture(false)} inspect bottom={80} onTake={onTake} onClose={onClose}/>));
    expect(root.root.findAllByType('Pressable' as any).some(n => n.props.accessibilityLabel === 'Take out Teddy')).toBe(true);
    expect(storageDescription(fixture(false).entity)).toContain('closed, 2 of 4');
    await act(async () => root.unmount());
  });
  it('full feedback is visible, spoken, and dismissible without a reading timer', async () => {
    const dismiss = vi.fn(); let root!: ReturnType<typeof create>;
    await act(async () => { root = create(<StorageFullNote name="Carry basket" top={100} onDismiss={dismiss}/>); });
    const note = root.root.findByType('Pressable' as any);
    expect(note.props.accessibilityRole).toBe('alert');
    expect(note.props.accessibilityLabel).toBe('Carry basket is full. Take something out first.');
    await act(async () => note.props.onPress()); expect(dismiss).toHaveBeenCalledOnce();
    await act(async () => root.unmount());
  });
});


it('an open empty fridge shows its shelf with empty slots and a Restock fridge action', async () => {
  const s = starterHome(); s.rooms.home.instances = [{ ...instance('fridge', 'fridge', 8, 1), storage: { version: 1, open: true } }];
  s.rooms.home.characters = [];
  const scene = buildScene(s), entity = scene.entities['home/item/fridge'];
  const onRestock = vi.fn();
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(<StorageTray entity={entity} scene={scene} inspect bottom={80} onTake={() => {}} onClose={() => {}} onRestock={onRestock}/>); });
  expect(root.root.findByProps({ testID: 'storage-tray' })).toBeDefined();
  const restock = root.root.findByProps({ testID: 'fridge-restock-button' });
  expect(restock.props.accessibilityLabel).toBe('Restock fridge');
  await act(async () => restock.props.onPress());
  expect(onRestock).toHaveBeenCalledWith('fridge');
  await act(async () => root.unmount());
});
