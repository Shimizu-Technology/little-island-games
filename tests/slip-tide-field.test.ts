import { describe, expect, it, vi } from 'vitest';
import { boardCell } from '../src/learn/games/slip-tide/field';
vi.mock('react-native', () => ({ View: 'View' }));
vi.mock('react-native-gesture-handler', () => ({ Gesture: {}, GestureDetector: 'GestureDetector' }));
vi.mock('react-native-reanimated', () => ({ default: {}, Easing: { bezier: () => 0, out: () => 0, in: () => 0, inOut: () => 0, quad: 0 }, runOnJS: () => undefined, useAnimatedStyle: () => ({}), useSharedValue: () => ({}), withRepeat: () => 0, withSequence: () => 0, withSpring: () => 0, withTiming: () => 0 }));
vi.mock('react-native-svg', () => ({ default: 'Svg', Circle: 'Circle', Ellipse: 'Ellipse', G: 'G', Path: 'Path', Rect: 'Rect' }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => false }));
vi.mock('../src/components/ui', () => ({ Button: 'Button', C: { ink: '#000' }, Copy: 'Copy', PressableScale: 'PressableScale' }));
vi.mock('../src/learn/Coach', () => ({ CoachSpot: 'CoachSpot', Hand: 'Hand' }));

describe('board sizing', () => {
  it.each([[334, 759], [374, 759], [322, 667]])('fits a 7x7 board at 44 points on a %ix%i phone', (width, height) => {
    expect(boardCell(width, height, 7, false)).toBeGreaterThanOrEqual(44);
  });
  it('keeps the board inside the width it is given', () => {
    for (const n of [4, 5, 6, 7]) expect(boardCell(334, 759, n, false) * n + 12).toBeLessThanOrEqual(334);
  });
  it('holds room for the arrow labels in Together', () => {
    expect(boardCell(334, 759, 5, true) * 5 + 12).toBeLessThanOrEqual(300);
  });
  it('lets a tablet use more of the board, up to a comfortable cap', () => {
    expect(boardCell(760, 1100, 5, false)).toBeGreaterThan(boardCell(334, 759, 5, false));
    expect(boardCell(1200, 1100, 4, false)).toBeLessThanOrEqual(92);
  });
});
