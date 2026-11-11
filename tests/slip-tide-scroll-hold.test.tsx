import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { Playfield, type PlayfieldProps } from '../src/learn/games/slip-tide/field';
import { GridInteraction } from '../src/puzzles/grid/preferences';

// Integration rehearsal: a page scroll that started on the Slip Tide board also moved the crabs. The board now owns
// the page scroll from touch-down to release, the arbitration Cove grids use, so a drag on the water is only a swipe.
type Handlers = { enabled?: boolean; onBegin?: () => void; onUpdate?: (e: { translationX: number; translationY: number }) => void; onFinalize?: () => void };
const pan = vi.hoisted(() => ({ last: {} as Handlers }));
vi.mock('react-native', () => ({ View: 'View' }));
vi.mock('react-native-gesture-handler', () => ({
  Gesture: { Pan: () => { const h: Handlers = {}; pan.last = h; const g: Record<string, (x: unknown) => unknown> = {};
    for (const key of ['maxPointers', 'minDistance']) g[key] = () => g;
    g.enabled = x => { h.enabled = x as boolean; return g; };
    for (const key of ['onBegin', 'onUpdate', 'onFinalize'] as const) g[key] = f => { h[key] = f as never; return g; };
    return g; } },
  GestureDetector: 'GestureDetector',
}));
vi.mock('react-native-reanimated', async () => {
  const { useRef } = await import('react');
  return {
    default: { View: 'AnimatedView' }, Easing: { bezier: () => 0, out: () => 0, in: () => 0, inOut: () => 0, quad: 0 }, runOnJS: (x: unknown) => x,
    useSharedValue: (v: unknown) => { const ref = useRef<{ value: unknown; get(): unknown; set(x: unknown): void } | null>(null); if (!ref.current) ref.current = { value: v, get() { return this.value; }, set(x) { this.value = x; } }; return ref.current; },
    useAnimatedStyle: (f: () => unknown) => f(), cancelAnimation: () => {}, withTiming: (v: number) => v, withSpring: (v: number) => v, withSequence: (...v: number[]) => v.at(-1), withRepeat: (v: number) => v,
  };
});
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => true }));
vi.mock('../src/components/ui', () => ({ Button: 'Button', C: { ink: '#000' }, Copy: 'Copy', PressableScale: 'PressableScale' }));
vi.mock('../src/learn/Coach', () => ({ CoachSpot: 'CoachSpot', Hand: 'Hand' }));
vi.mock('../src/learn/games/slip-tide/art', () => ({ Arrow: 'Arrow', CrabSprite: 'CrabSprite', HomeEyes: 'HomeEyes', LagoonArt: 'LagoonArt', PoolBadge: 'PoolBadge' }));

const puzzle = { size: 4, rocks: [5], crabs: [15, 3], pools: [0, 12], route: 'LU' };
const props = (extra: Partial<PlayfieldProps> = {}): PlayfieldProps => ({ puzzle, crabs: [15, 3], title: 'test', steps: 0, active: true, width: 390, height: 700, canUndo: true, canReset: true, onMove: vi.fn(() => true), onUndo: vi.fn(), onReset: vi.fn(), ...extra });
const mount = (hold: (held: boolean) => void, p: PlayfieldProps) => { let root!: ReactTestRenderer; act(() => { root = create(<GridInteraction.Provider value={hold}><Playfield {...p} /></GridInteraction.Provider>); }); return root; };

it('holds the page scroll from touch-down on the water until release, and the drag is one swipe', () => {
  const hold = vi.fn(), p = props(), root = mount(hold, p);
  pan.last.onBegin!();
  expect(hold).toHaveBeenLastCalledWith(true);
  // A vertical drag that a child meant as a page scroll: the page stays put, so it is the board's swipe.
  pan.last.onUpdate!({ translationX: 2, translationY: -40 });
  pan.last.onUpdate!({ translationX: 3, translationY: -120 });
  expect(p.onMove).toHaveBeenCalledTimes(1);
  expect(p.onMove).toHaveBeenCalledWith(0);
  expect(hold).toHaveBeenLastCalledWith(true);
  pan.last.onFinalize!();
  expect(hold).toHaveBeenLastCalledWith(false);
  act(() => root.unmount());
});
it('a cancelled touch also releases the page, and so does leaving the board mid-touch', () => {
  const hold = vi.fn(), root = mount(hold, props());
  pan.last.onBegin!();
  pan.last.onFinalize!();
  expect(hold).toHaveBeenLastCalledWith(false);
  pan.last.onBegin!();
  expect(hold).toHaveBeenLastCalledWith(true);
  act(() => root.unmount());
  expect(hold).toHaveBeenLastCalledWith(false);
});
it('Together has no swipe, so it never holds the page', () => {
  const hold = vi.fn(), root = mount(hold, props({ together: true }));
  expect(pan.last.enabled).toBe(false);
  expect(hold).not.toHaveBeenCalledWith(true);
  act(() => root.unmount());
});
