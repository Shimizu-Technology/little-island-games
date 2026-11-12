/** R0: the Slip Tide board header at the largest text size. The caption gets the full width over its own row of Undo and
 * Reset, and this compact chrome stops at 1.5x, so "Slip / Tide / 0 / swipes" is never squeezed beside a large Undo. */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { Playfield, type PlayfieldProps } from '../src/learn/games/slip-tide/field';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 3.12 }));
vi.mock('react-native', () => ({ View: 'View', useWindowDimensions: () => viewport }));
vi.mock('react-native-gesture-handler', () => ({ Gesture: { Pan: () => { const g: Record<string, () => unknown> = {}; for (const key of ['enabled', 'maxPointers', 'minDistance', 'onBegin', 'onUpdate', 'onFinalize']) g[key] = () => g; return g; } }, GestureDetector: 'GestureDetector' }));
vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView' }, Easing: { bezier: () => 0, out: () => 0, in: () => 0, inOut: () => 0, quad: 0 }, runOnJS: (x: unknown) => x,
  useSharedValue: (value: unknown) => ({ value, get: () => value, set() {} }), useAnimatedStyle: (f: () => unknown) => f(), cancelAnimation: () => {},
  withTiming: (v: number) => v, withSpring: (v: number) => v, withSequence: (...v: number[]) => v.at(-1), withRepeat: (v: number) => v,
}));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => true }));
vi.mock('../src/components/ui', () => ({ Button: 'Button', C: { ink: '#000' }, Copy: 'Copy', PressableScale: 'PressableScale' }));
vi.mock('../src/learn/Coach', () => ({ CoachSpot: 'CoachSpot', Hand: 'Hand' }));
vi.mock('../src/learn/games/slip-tide/art', () => ({ Arrow: 'Arrow', CrabSprite: 'CrabSprite', HomeEyes: 'HomeEyes', LagoonArt: 'LagoonArt', PoolBadge: 'PoolBadge' }));

const puzzle = { size: 4, rocks: [5], crabs: [15, 3], pools: [0, 12], route: 'LU' };
const props: PlayfieldProps = { puzzle, crabs: [15, 3], title: 'Slip Tide', steps: 0, active: true, width: 361, height: 759, canUndo: true, canReset: true, onMove: () => true, onUndo: () => {}, onReset: () => {} };
let root: ReactTestRenderer | undefined;
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; Object.assign(viewport, { fontScale: 3.12 }); });

it.each([3.12, 1.8])('at text scale %s the caption stacks over Undo and Reset, all capped at 1.5x', fontScale => {
  Object.assign(viewport, { fontScale });
  act(() => { root = create(<Playfield {...props} />); });
  const header = root!.root.find(n => n.props.testID === 'board-header');
  expect(header.props.style.flexDirection).toBeUndefined();
  const caption = header.findAll(n => String(n.type) === 'Copy')[0];
  expect(caption.children.join('')).toBe('Slip Tide');
  // The caption is never cut to two lines at large text; it wraps fully at a size where its words fit.
  expect(caption.props.numberOfLines).toBeUndefined();
  for (const copy of header.findAll(n => String(n.type) === 'Copy')) expect(copy.props.maxFontSizeMultiplier).toBe(1.5);
  const buttons = header.findAll(n => String(n.type) === 'Button');
  expect(buttons.map(b => b.children.join(''))).toEqual(['Undo', 'Reset']);
  for (const b of buttons) expect(b.props.maxFontSizeMultiplier).toBe(1.5);
  expect(buttons[0].parent!.props.style.flexDirection).toBe('row');
});

it('at the default size the header keeps the caption beside Undo and Reset', () => {
  Object.assign(viewport, { fontScale: 1 });
  act(() => { root = create(<Playfield {...props} />); });
  const header = root!.root.find(n => n.props.testID === 'board-header');
  expect(header.props.style.flexDirection).toBe('row');
  expect(header.findAll(n => String(n.type) === 'Copy')[0].props.numberOfLines).toBe(2);
});
