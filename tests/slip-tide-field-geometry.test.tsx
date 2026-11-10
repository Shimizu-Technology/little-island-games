import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { Playfield, boardCell, type PlayfieldProps } from '../src/learn/games/slip-tide/field';

const motion = vi.hoisted(() => ({ reduced: false, animated: [] as number[] }));
vi.mock('react-native', () => ({ View: 'View' }));
vi.mock('react-native-gesture-handler', () => ({ Gesture: { Pan: () => { const g: Record<string, () => unknown> = {}; for (const key of ['enabled', 'maxPointers', 'minDistance', 'onUpdate', 'onFinalize']) g[key] = () => g; return g; } }, GestureDetector: 'GestureDetector' }));
vi.mock('react-native-reanimated', async () => {
  const { useRef } = await import('react');
  type Shared = { value: unknown; get(): unknown; set(x: unknown): void };
  return {
    default: { View: 'AnimatedView' }, Easing: { bezier: () => 0, out: () => 0, in: () => 0, inOut: () => 0, quad: 0 }, runOnJS: (x: unknown) => x,
    // Values are plain numbers here: an animation records its target and lands there, so any slide is visible to the test.
    useSharedValue: (v: unknown) => { const ref = useRef<Shared | null>(null); if (!ref.current) ref.current = { value: v, get() { return this.value; }, set(x) { this.value = x; } }; return ref.current; },
    useAnimatedStyle: (f: () => unknown) => f(), cancelAnimation: () => {},
    withTiming: (v: number) => { motion.animated.push(v); return v; }, withSpring: (v: number) => v, withSequence: (...v: number[]) => v.at(-1), withRepeat: (v: number) => v,
  };
});
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => motion.reduced }));
vi.mock('../src/components/ui', () => ({ Button: 'Button', C: { ink: '#000' }, Copy: 'Copy', PressableScale: 'PressableScale' }));
vi.mock('../src/learn/Coach', () => ({ CoachSpot: 'CoachSpot', Hand: 'Hand' }));
vi.mock('../src/learn/games/slip-tide/art', () => ({ Arrow: 'Arrow', CrabSprite: 'CrabSprite', HomeEyes: 'HomeEyes', LagoonArt: 'LagoonArt', PoolBadge: 'PoolBadge' }));
afterEach(() => { motion.animated = []; });

const puzzle = { size: 4, rocks: [5], crabs: [15, 3], pools: [0, 12], route: 'LU' };
const props = (width = 760, height = 1100, crabs = [15, 3]): PlayfieldProps => ({ puzzle, crabs, title: 'test', steps: 0, active: true, width, height, canUndo: true, canReset: true, onMove: vi.fn(() => true), onUndo: vi.fn(), onReset: vi.fn() });
const tokens = (root: ReactTestRenderer) => root.root.findAllByType('CrabSprite' as never).map(c => {
  const t = (c.parent!.props.style as { transform: Record<string, number>[] }[])[1].transform;
  return [t[0].translateX, t[1].translateY];
});
const at = (cell: number, size: number) => [(cell % 4) * size, Math.floor(cell / 4) * size];

it.each([['iPad portrait to landscape', 760, 1100, 1100, 760], ['tablet narrowed by split view', 760, 1100, 500, 1100], ['larger text shrinks the board', 760, 1100, 760, 700]])('R6: %s moves every crab to its cell at once, with no slide', (_, w1, h1, w2, h2) => {
  let root!: ReactTestRenderer;
  act(() => { root = create(<Playfield {...props(w1, h1)} />); });
  const before = boardCell(w1, h1, 4, false), after = boardCell(w2, h2, 4, false);
  expect(after).not.toBe(before);
  expect(tokens(root)).toEqual([at(15, before), at(3, before)]);
  motion.animated = [];
  act(() => { root.update(<Playfield {...props(w2, h2)} />); });
  act(() => { root.update(<Playfield {...props(w2, h2)} />); });
  expect(tokens(root)).toEqual([at(15, after), at(3, after)]);
  expect(motion.animated).toEqual([]);
  act(() => { root.unmount(); });
});
it('R6: a real move still slides', () => {
  let root!: ReactTestRenderer;
  act(() => { root = create(<Playfield {...props()} />); });
  const size = boardCell(760, 1100, 4, false);
  act(() => { root.update(<Playfield {...props(760, 1100, [14, 3])} />); });
  act(() => { root.update(<Playfield {...props(760, 1100, [14, 3])} />); });
  expect(motion.animated).toContain(at(14, size)[0]);
  expect(tokens(root)[0]).toEqual(at(14, size));
  act(() => { root.unmount(); });
});
it('R9: the board label lists bounds, rocks, crabs and pools', () => {
  let root!: ReactTestRenderer;
  act(() => { root = create(<Playfield {...props()} />); });
  const label = root.root.findByProps({ accessibilityRole: 'image' }).props.accessibilityLabel as string;
  expect(label).toContain('4 rows by 4 columns');
  expect(label).toContain('A rock at row 2, column 2');
  expect(label).toContain('coral crab with a flower is at row 4, column 4, its pool at row 1, column 1');
  expect(label).toContain('golden crab with a fish is at row 1, column 4, its pool at row 4, column 1');
  act(() => { root.unmount(); });
});
it('R9: help draws the cue it was given and nothing else', () => {
  let root!: ReactTestRenderer;
  act(() => { root = create(<Playfield {...props()} cue={{ text: 'Look', focus: ['crab:1'] }} />); });
  expect(root.root.findAllByProps({ testID: 'hint-stop' })).toHaveLength(0);
  act(() => { root.update(<Playfield {...props()} cue={{ text: 'Think', focus: ['crab:1', 'stop:7', 'blocker:11'] }} />); });
  expect(root.root.findAllByProps({ testID: 'hint-stop' }).length).toBeGreaterThan(0);
  expect(root.root.findAllByProps({ testID: 'hint-blocker' }).length).toBeGreaterThan(0);
  act(() => { root.unmount(); });
});
it('largest text: the caption keeps a minimum width and the controls wrap below it', () => {
  let root!: ReactTestRenderer;
  act(() => { root = create(<Playfield {...props(402, 874)} />); });
  const header = root.root.findByProps({ testID: 'board-header' });
  expect(header.props.style.flexWrap).toBe('wrap');
  expect((header.children[0] as ReactTestRenderer['root']).props.style.minWidth).toBeGreaterThanOrEqual(150);
  act(() => { root.unmount(); });
});
