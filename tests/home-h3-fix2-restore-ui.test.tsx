import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { DesignTools } from '../src/home/runtime/DesignTools';
import { starterHome } from '../src/home/model';
import { RESTORE_QUESTION, type RestoreCost } from '../src/home/useHomeStore';
vi.mock('react-native', () => ({ View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', Modal: 'Modal',
  FlatList: ({ data, renderItem }: any) => data.map((item: any) => renderItem({ item })), Platform: { OS: 'ios' }, StyleSheet: { create: (v: unknown) => v, absoluteFill: {} },
  AccessibilityInfo: { announceForAccessibility: () => {} } }));
vi.mock('react-native-reanimated', () => ({ default: { View: 'AnimatedView' }, runOnJS: (fn: any) => fn, runOnUI: (fn: any) => fn }));
vi.mock('react-native-gesture-handler', () => ({ GestureDetector: 'GestureDetector', Gesture: { Pan: () => { const builder: any = new Proxy({}, { get: () => () => builder }); return builder; } } }));
vi.mock('react-native-svg', () => ({ default: 'Svg', Circle: 'Circle', Path: 'Path', Rect: 'Rect' }));
vi.mock('../src/home/art/More', () => ({ RoomShellArt: () => null, MoreItemArt: () => null }));
vi.mock('../src/home/art/Items', () => ({ ItemArt: () => null }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const flat = (style: any): any => Array.isArray(style) ? Object.assign({}, ...style.map(flat)) : style || {};
const pressables = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAll((n) => (n.type as unknown) === 'Pressable');
const label = (n: TestRenderer.ReactTestInstance) => n.props.accessibilityLabel ?? n.findAll((t) => (t.type as unknown) === 'Text').map((t) => t.props.children).join('');
const press = (tree: TestRenderer.ReactTestRenderer, name: string) => act(async () => pressables(tree).find((n) => label(n) === name)!.props.onPress());
const texts = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAll((n) => (n.type as unknown) === 'Text').map((t) => String(t.props.children));

async function design(cost: RestoreCost | undefined, large = false) {
  const dispatch = vi.fn(), anyway = vi.fn();
  const ghost = { value: { active: false, x: 0, y: 0 }, set(v: any) { this.value = v; } };
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<DesignTools state={starterHome()} ownership={{}} vertical={false} ghost={ghost as any} onChoose={() => {}} onDrop={() => {}} onDragItem={() => {}}
    interaction={{} as any} offset={{ value: { x: 0, y: 0 } } as any} dispatch={dispatch} onClose={() => {}} large={large} restoreCost={() => cost} onRestoreAnyway={anyway} />); });
  await act(async () => pressables(tree).find((n) => n.props.accessibilityRole === 'tab' && label(n) === 'Room')!.props.onPress());
  const open = () => act(async () => pressables(tree).find((n) => n.props.accessibilityLabel === 'Restore this room')!.props.onPress());
  const modal = () => tree.root.findByType('Modal' as never);
  return { tree, dispatch, anyway, open, modal };
}

describe('F3: Design asks before a Restore that Undo cannot keep', () => {
  it.each(['no-undo', 'drops-older'] as const)('%s: a picture and the words, with Make it new and Keep my room', async (cost) => {
    const { tree, dispatch, anyway, open, modal } = await design(cost);
    await open();
    expect(modal().props.visible).toBe(true);
    const card = tree.root.findByProps({ testID: 'restore-anyway' });
    expect(card.findAll((n) => (n.type as unknown) === 'Svg')).toHaveLength(1);
    // Ordinary visible text, a header the screen reader reads first. No hidden 1x1 text.
    const words = card.findAll((n) => (n.type as unknown) === 'Text' && n.props.children === RESTORE_QUESTION[cost]);
    expect(words).toHaveLength(1);
    expect(words[0].props.accessibilityRole).toBe('header');
    expect(flat(words[0].props.style).width).toBeUndefined();
    expect(texts(tree)).not.toContain('Restore this room? Undo can bring it back.');
    // Keep my room changes nothing.
    await press(tree, 'Keep my room');
    expect(modal().props.visible).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
    expect(anyway).not.toHaveBeenCalled();
    // Make it new does it.
    await open();
    await press(tree, 'Make it new');
    expect(modal().props.visible).toBe(false);
    expect(anyway).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalled();
    await act(async () => tree.unmount());
  });
  it('an ordinary restore keeps its own question', async () => {
    const { tree, dispatch, anyway, open } = await design('undoable');
    await open();
    expect(tree.root.findAllByProps({ testID: 'restore-anyway' })).toHaveLength(0);
    expect(texts(tree)).toContain('Restore this room? Undo can bring it back.');
    await press(tree, 'Restore room');
    expect(dispatch).toHaveBeenCalledWith({ type: 'reset' });
    expect(anyway).not.toHaveBeenCalled();
    await act(async () => tree.unmount());
  });
  it('in the larger-target mode both choices are 64 pt with a visible shape', async () => {
    const { tree, open } = await design('no-undo', true);
    await open();
    for (const name of ['Make it new', 'Keep my room']) {
      const style = flat(pressables(tree).find((n) => label(n) === name)!.props.style);
      expect(style.minWidth, name).toBeGreaterThanOrEqual(64);
      expect(style.minHeight, name).toBeGreaterThanOrEqual(64);
      expect(style.backgroundColor, name).toBeTruthy();
    }
    await act(async () => tree.unmount());
  });
});
