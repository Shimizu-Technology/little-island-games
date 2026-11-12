/** R0: shared chrome at the largest text size. The Helper-style toggle row stacks its switch under the words, the game
 * bar collapses Back to an icon and lets its title wrap between words, and the School journey labels stay compact. */
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 3.12 }));
vi.mock('react-native', () => {
  class Value { constructor(public v: number) {} }
  return {
    View: 'View', Switch: 'Switch', Pressable: 'Pressable', ScrollView: 'ScrollView', Modal: 'Modal', KeyboardAvoidingView: 'KeyboardAvoidingView',
    StyleSheet: { create: (s: object) => s, absoluteFill: {} }, PanResponder: { create: () => ({ panHandlers: {} }) }, Platform: { OS: 'ios' },
    Animated: { createAnimatedComponent: (c: unknown) => c, Value, timing: () => ({ start() {} }), spring: () => ({ start() {} }), View: 'AnimatedView' },
    useWindowDimensions: () => viewport,
  };
});
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock('react-native-svg', () => ({ default: 'Svg', Circle: 'Circle', Path: 'Path', Ellipse: 'Ellipse' }));
vi.mock('../src/components/Text', () => ({ Text: 'Text' }));
vi.mock('../src/components/motion', () => ({ easeOut: 0, nativeDriver: true, useReducedMotion: () => true }));

const textOf = (n: ReactTestInstance): string => n.children.map(c => typeof c === 'string' ? c : textOf(c)).join('');
const flat = (style: unknown): Record<string, unknown> => Array.isArray(style) ? Object.assign({}, ...style.map(flat)) : (style && typeof style === 'object' ? style as Record<string, unknown> : {});
let root: ReactTestRenderer | undefined;
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; Object.assign(viewport, { fontScale: 3.12 }); });

it.each([[3.12, true], [1.8, true], [1.35, false], [1, false]])('ToggleRow at text scale %s stacks the switch under its words: %s', async (fontScale, stacked) => {
  Object.assign(viewport, { fontScale });
  const { ToggleRow } = await import('../src/components/ui');
  act(() => { root = create(<ToggleRow label="Helper" detail="A gentle hand guides you through each level" value={false} onChange={() => {}} />); });
  const row = root!.root.find(n => n.props.testID === 'toggle-row'), style = flat(row.props.style);
  // Stacked, the words get the row's full width instead of one or two words per line beside the switch.
  expect(style.flexDirection === 'row').toBe(!stacked);
  const words = row.children[0] as ReactTestInstance;
  expect(flat(words.props.style).flex).toBe(stacked ? undefined : 1);
  const toggle = root!.root.find(n => String(n.type) === 'Switch');
  expect(toggle.props.accessibilityLabel).toBe('Helper');
  expect(flat(toggle.props.style).alignSelf).toBe(stacked ? 'flex-start' : undefined);
});

it('GameHeader large-text bar: Back is an icon, the title wraps between words at its cap; the default bar is unchanged', async () => {
  const { GameHeader } = await import('../src/components/ui');
  act(() => { root = create(<GameHeader title="Crab Commands" onBack={() => {}} sound={{ on: true, toggle: () => {} }} onHelp={() => {}} titleMax={1.3} />); });
  const labels = () => root!.root.findAll(n => String(n.type) === 'Pressable' && n.props.accessibilityRole === 'button').map(n => n.props.accessibilityLabel);
  expect(labels()).toEqual(['Back to games', 'Sound on. Turn sound off', 'How to play Crab Commands']);
  expect(root!.root.findAll(n => String(n.type) === 'Text' && textOf(n) === 'Games')).toHaveLength(0);
  let title = root!.root.find(n => String(n.type) === 'Text' && n.props.accessibilityRole === 'header');
  expect(title.props.numberOfLines).toBe(2);expect(title.props.maxFontSizeMultiplier).toBe(1.3);expect(title.props.adjustsFontSizeToFit).toBeFalsy();
  act(() => { root!.update(<GameHeader title="Crab Commands" onBack={() => {}} onHelp={() => {}} />); });
  title = root!.root.find(n => String(n.type) === 'Text' && n.props.accessibilityRole === 'header');
  expect(title.props.numberOfLines).toBe(1);expect(title.props.adjustsFontSizeToFit).toBe(true);
  expect(root!.root.findAll(n => String(n.type) === 'Text' && textOf(n) === 'Games')).toHaveLength(1);
});

it('School journey labels are compact chrome and stop at 1.5x', async () => {
  const { RoundProgress } = await import('../src/learn/LearnChrome');
  const { startSession } = await import('../src/learn/session');
  const session = startSession('letter-lagoon', { options: { mode: 'solo', pace: 'easy' } }, {}, 3);
  act(() => { root = create(<RoundProgress session={session} island="reading" finished={false} />); });
  const label = root!.root.find(n => String(n.type) === 'Text' && textOf(n) === 'YOUR JOURNEY');
  expect(label.props.maxFontSizeMultiplier).toBe(1.5);
  const count = root!.root.find(n => String(n.type) === 'Text' && /^\d+\/\d+$/.test(textOf(n)));
  expect(count.props.maxFontSizeMultiplier).toBe(1.5);
});
