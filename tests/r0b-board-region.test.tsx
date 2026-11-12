/** R0b: the shared pieces behind the School boards at the largest text size. The board text region (prompts and
 * results at 2x where their words fit), the step reveal for games whose next sentence appears above the page, and Slip
 * Tide's landscape board with its arrows beside it. */
import React, { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { wordWidth } from '../src/components/wordFit';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 3.12 }));
vi.mock('react-native', () => ({
  Text: 'Text', View: 'View',
  StyleSheet: { flatten: (s: unknown) => Array.isArray(s) ? Object.assign({}, ...s.flat(Infinity).filter(Boolean)) : s },
  useWindowDimensions: () => viewport,
}));
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
const { Text, TextFit, fittedTextProps } = await import('../src/components/Text');
const { StepReveal, useStepReveal } = await import('../src/learn/stepReveal');
const { Playfield } = await import('../src/learn/games/slip-tide/field');

let root: ReactTestRenderer | undefined;
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; Object.assign(viewport, { width: 393, height: 852, fontScale: 3.12 }); vi.unstubAllGlobals(); });

it('inside the board region, text without its own cap stops at 2x, or where its longest word fits the board', () => {
  const region = { width: 337, ceiling: 2 };
  // A prompt of short words stops at 2x.
  expect(fittedTextProps({ style: { fontSize: 18 }, children: "Plan the crab's path, then Go!" }, region).maxFontSizeMultiplier).toBe(2);
  // A heading whose longest word would pass the board at 2x stops earlier ("Progr/am" at 32 pt).
  const heading = fittedTextProps({ style: [{ fontSize: 32 }, { color: 'red' }], children: ['Program ', 1, ' of 4'] }, region).maxFontSizeMultiplier!;
  expect(heading).toBeLessThanOrEqual(2);
  expect(wordWidth('Program') * 32 * heading).toBeLessThanOrEqual(337);
  // Nested words count too, and React Native's 14-pt default applies when no size is named.
  const nested = fittedTextProps({ children: ['Tap ', React.createElement('Text', { key: 1 }, 'Raincoat')] }, { width: 100, ceiling: 2 }).maxFontSizeMultiplier!;
  expect(nested).toBeLessThan(2);expect(wordWidth('Raincoat') * 14 * nested).toBeLessThanOrEqual(100);
  // Text with its own cap, with scaling off, or outside a region is left alone.
  const own = { maxFontSizeMultiplier: 1.5, style: { fontSize: 18 }, children: 'Beach 1 of 3' };
  expect(fittedTextProps(own, region)).toBe(own);
  const off = { allowFontScaling: false, children: 'Hi' };
  expect(fittedTextProps(off, region)).toBe(off);
  const plain = { children: 'Hi' };
  expect(fittedTextProps(plain, null)).toBe(plain);
});

it('the real Text applies the region, and nothing changes outside it', () => {
  act(() => { root = create(<><TextFit.Provider value={{ width: 337, ceiling: 2 }}><Text style={{ fontSize: 20 }}>Every crab is home!</Text></TextFit.Provider><Text style={{ fontSize: 20 }}>Outside</Text></>); });
  const [inRegion, outside] = root!.root.findAll(n => String(n.type) === 'Text');
  expect(inRegion.props.maxFontSizeMultiplier).toBe(2);
  expect(outside.props.maxFontSizeMultiplier).toBeUndefined();
});

it('a step game asks for the board when its step changes, never on its first render', () => {
  const reveal = vi.fn();
  let turn: (n: number) => void = () => {};
  function Story() { const [page, setPage] = useState(0); turn = setPage; useStepReveal(page); return null; }
  act(() => { root = create(<StepReveal.Provider value={reveal}><Story /></StepReveal.Provider>); });
  expect(reveal).not.toHaveBeenCalled();
  act(() => turn(0));
  expect(reveal).not.toHaveBeenCalled();
  act(() => turn(1));
  expect(reveal).toHaveBeenCalledTimes(1);
  act(() => turn(2));
  expect(reveal).toHaveBeenCalledTimes(2);
});

const puzzle = { size: 4, rocks: [5], crabs: [15, 3], pools: [0, 12], route: 'LU' };
const slip = { puzzle, crabs: [15, 3], title: 'Slip Tide', steps: 0, active: true, canUndo: true, canReset: true, onMove: () => true, onUndo: () => {}, onReset: () => {} };

it.each([3.12, 1])('landscape phone at text scale %s: the arrows sit beside the board as a pad, so both are on screen together', fontScale => {
  Object.assign(viewport, { width: 874, height: 402, fontScale });
  // The frame gives the board 874 - 2 x 59 - 56 pt and 402 - 21 pt.
  act(() => { root = create(<Playfield {...slip} width={700} height={381} />); });
  const side = root!.root.find(n => n.props.testID === 'slip-side');
  expect(side.props.style.flexDirection).toBe('row');
  const [board, column] = side.children as unknown as { props: { testID?: string; style: Record<string, unknown> }; findAll: (f: (n: { props: Record<string, unknown> }) => boolean) => unknown[] }[];
  const water = root!.root.find(n => n.props.accessibilityRole === 'image');
  const size = water.props.style.width as number;
  // The board, inside the card's padding, fits the landscape height, beside a column of at least two arrow widths.
  expect(size + 28).toBeLessThanOrEqual(402);
  expect(size + 16 + 2 * 72 + 8).toBeLessThanOrEqual(700);
  expect(board).toBeDefined();
  const arrows = root!.root.find(n => n.props.testID === 'slip-arrows');
  expect(column.findAll(n => n.props.testID === 'slip-arrows')).toHaveLength(1);
  expect(column.findAll(n => n.props.testID === 'board-header')).toHaveLength(1);
  const keys = arrows.findAll(n => String(n.type) === 'PressableScale');
  expect(keys.map(k => k.props.accessibilityLabel)).toEqual(['Slide all crabs up', 'Slide all crabs left', 'Slide all crabs right', 'Slide all crabs down']);
  for (const k of keys) expect(k.props.style.width).toBeGreaterThanOrEqual(44);
});

it('portrait phone, iPad and the Challenge board keep the arrows under the board', () => {
  for (const [w, h, vw, vh] of [[337, 759, 393, 852], [688, 1077, 744, 1133], [1077, 688, 1133, 744], [700, 820, 874, 402]]) {
    Object.assign(viewport, { width: vw, height: vh });
    act(() => { root = create(<Playfield {...slip} width={w} height={h} />); });
    expect(root!.root.findAll(n => n.props.testID === 'slip-side'), `${w}x${h}`).toHaveLength(0);
    act(() => root!.unmount()); root = undefined;
  }
});
