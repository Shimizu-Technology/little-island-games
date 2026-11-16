import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CanoeBoardProps } from '../src/learn/games/canoe-seats/board';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 1 }));
vi.mock('react-native', () => ({ View: 'View', useWindowDimensions: () => viewport }));
vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView' }, Easing: { out: () => 0, in: () => 0, inOut: () => 0, quad: 0 },
  useSharedValue: (value: unknown) => ({ value, get: () => value, set() {} }), useAnimatedStyle: (f: () => unknown) => f(),
  withTiming: (v: number) => v, withSpring: (v: number) => v, withSequence: (...v: number[]) => v.at(-1), withRepeat: (v: number) => v,
}));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => true }));
vi.mock('../src/components/ui', () => ({ Button: 'Button', C: { ink: '#000', teal: '#0a0', blue: '#00f', muted: '#888' }, Copy: 'Copy', PressableScale: 'PressableScale' }));
vi.mock('../src/learn/Coach', () => ({ CoachSpot: 'CoachSpot' }));
vi.mock('../src/learn/BoardSpace', () => ({ BoardPrimary: 'BoardPrimary', useBoardSpace: () => null, useBoardGeometry: (_id: string, natural: number) => ({ height: natural, measured: false }) }));
vi.mock('../src/learn/games/canoe-seats/art', () => ({ CLUE_RATIO: 160 / 70, CluePicture: 'CluePicture', Fruit: 'Fruit', Friend: 'Friend', Hat: 'Hat', Hull: 'Hull', ItemArt: 'ItemArt', ink: '#000' }));
const { CanoeBoard } = await import('../src/learn/games/canoe-seats/board');

const puzzle = { n: 4, attrs: 1, cast: [0, 1, 2, 3], clues: [{ k: 'at' as const, x: 0, s: 0 }, { k: 'next' as const, x: 1, y: 2 }, { k: 'ahead' as const, x: 3, y: 1 }] };
const big = { n: 5, attrs: 3, cast: [0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4], clues: Array.from({ length: 13 }, (_, i) => ({ k: 'next' as const, x: i % 5, y: (i % 5) + 5 })) };
let root: ReactTestRenderer | undefined;
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; Object.assign(viewport, { width: 393, fontScale: 1 }); });
function mount(over: Partial<CanoeBoardProps> = {}) {
  const calls = { place: [] as [number, number][], used: [] as number[], heard: [] as number[], check: 0 };
  const props: CanoeBoardProps = {
    puzzle, pos: [-1, -1, -1, -1], used: 0, lights: true, won: false, missed: false, canCheck: false, active: true, width: 337, title: 'Four friends',
    hear: c => { calls.heard.push(c); return false; }, onPlace: (i, s) => { calls.place.push([i, s]); return true; }, onToggleUsed: c => calls.used.push(c),
    onCheck: () => { calls.check++; }, onUndo: () => {}, onReset: () => {}, canUndo: false, canReset: false, ...over,
  };
  act(() => { root = create(<CanoeBoard {...props} />); });
  return calls;
}
const byId = (id: string) => root!.root.find(n => n.props.testID === id);
const tap = (id: string) => act(() => { byId(id).props.onPress({ nativeEvent: { locationX: 10, locationY: 30 } }); });

describe('Canoe Seats board', () => {
  it('picks up a friend from the shore and seats it with one more tap', () => {
    const calls = mount();
    tap('canoe-token-2');
    expect(byId('canoe-token-2').props.accessibilityState).toEqual({ selected: true });
    expect(byId('canoe-seat-1').props.accessibilityHint).toBe('Double-tap to seat the fish here.');
    tap('canoe-seat-1');
    expect(calls.place).toEqual([[2, 1]]);
  });
  it('picks up a seated friend and sends it back to the shore', () => {
    const calls = mount({ pos: [0, -1, -1, -1] });
    tap('canoe-seat-0');
    const back = root!.root.find(n => n.props.accessibilityLabel === 'Put the turtle back on the shore');
    act(() => back.props.onPress());
    expect(calls.place).toEqual([[0, -1]]);
  });
  it('first tap on a clue hears it (words show when no line can play), the second marks it done', () => {
    const calls = mount();
    tap('canoe-clue-1');
    expect(calls.heard).toEqual([1]);
    expect(JSON.stringify(root!.toJSON())).toContain('The crab sits right next to the fish.');
    tap('canoe-clue-1');
    expect(calls.used).toEqual([1]);
  });
  it('lights a card only when its friends are seated and it is true, and never in Check mode', () => {
    mount({ pos: [0, -1, -1, -1] });
    expect(byId('canoe-clue-0').props.accessibilityLabel).toBe('Clue: The turtle sits in seat 1. (true now)');
    expect(byId('canoe-clue-1').props.accessibilityLabel).toBe('Clue: The crab sits right next to the fish.');
    act(() => root!.unmount()); root = undefined;
    const calls = mount({ pos: [0, 2, 3, 1], lights: false, canCheck: true, missed: true });
    expect(byId('canoe-clue-0').props.accessibilityLabel).toBe('Clue: The turtle sits in seat 1.');
    expect(JSON.stringify(root!.toJSON())).toContain('Not quite yet. Everyone is still in their seats.');
    const check = root!.root.findAll(n => String(n.type) === 'Button').find(b => b.children.join('') === 'Check')!;
    act(() => check.props.onPress());
    expect(calls.check).toBe(1);
  });
  it('clue keepers: the other keeper’s cards lie face down, and the hand-over cover hides them all', () => {
    const keepers = { names: ['Stassie', 'Mom'] as const, keeper: 0 as const, cover: false, owner: (i: number) => (i % 2 ? 1 : 0) as 0 | 1, onPass: vi.fn(), onReveal: vi.fn() };
    mount({ keepers });
    expect(byId('canoe-clue-0')).toBeDefined();
    expect(byId('canoe-clue-hidden-1').props.accessibilityLabel).toBe("Mom's clue, face down");
    act(() => root!.unmount()); root = undefined;
    mount({ keepers: { ...keepers, cover: true, keeper: 1 } });
    expect(root!.root.findAll(n => typeof n.props.testID === 'string' && n.props.testID.startsWith('canoe-clue'))).toHaveLength(0);
    expect(JSON.stringify(root!.toJSON())).toContain('Pass to Mom');
  });
  it('pages rung H’s thirteen cards on a phone, and shows them all on an iPad', () => {
    mount({ puzzle: big, pos: Array(15).fill(-1) });
    expect(root!.root.findAll(n => typeof n.props.testID === 'string' && /^canoe-clue-\d+$/.test(n.props.testID))).toHaveLength(8);
    expect(JSON.stringify(root!.toJSON())).toContain('1 / 2');
    act(() => root!.unmount()); root = undefined;
    Object.assign(viewport, { width: 744 });
    mount({ puzzle: big, pos: Array(15).fill(-1), width: 600 });
    expect(root!.root.findAll(n => typeof n.props.testID === 'string' && /^canoe-clue-\d+$/.test(n.props.testID))).toHaveLength(13);
  });
  it('caps every caption and control at 1.5x and stacks the header at the largest text size', () => {
    Object.assign(viewport, { fontScale: 3.12 });
    mount({ lights: false, onLights: () => {} });
    const header = byId('board-header');
    expect(header.props.style.flexDirection).toBeUndefined();
    for (const n of root!.root.findAll(n => String(n.type) === 'Copy' || String(n.type) === 'Button')) expect(n.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
  });
  it('describes the whole canoe for VoiceOver, front to back, with the shore', () => {
    mount({ pos: [1, -1, 0, -1] });
    const canoe = root!.root.find(n => n.props.accessibilityRole === 'image');
    expect(canoe.props.accessibilityLabel).toBe('Canoe with 4 seats. Seat 1, at the front: the fish. Seat 2: the turtle. Seat 3: empty. Seat 4, at the back: empty. On the shore: the crab, the bird.');
  });
});

describe('Canoe Seats help', () => {
  it('looks and thinks from the cards alone, and never reads a keeper’s hidden card aloud', async () => {
    const { canoeHelpRules, canoeView } = await import('../src/learn/games/canoe-seats/help');
    const solo = canoeHelpRules(puzzle, false), keepers = canoeHelpRules(puzzle, false, true), view = canoeView(puzzle, [-1, -1, -1, -1], false);
    expect(solo.look(view).text).toMatch(/^Look at this clue first\. The /);
    expect(keepers.look(view).text).toBe('Look at this clue first. Whoever holds that card can say it out loud.');
    expect(keepers.think(view).text).not.toMatch(/sits|next to|in front/);
    expect(solo.draft).toBeNull();
    expect(canoeHelpRules(puzzle, true).draft).not.toBeNull();
  });
});
