import React, { useState } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TextLayoutProvider } from '../src/components/Text';
import { CHROME_MAX, wordFitMultiplier } from '../src/components/wordFit';
import { CrosswordBoard } from '../src/puzzles/crossword/CrosswordBoard';
import {
  createCrossword, crosswordLetterCode, crosswordReducer,
  type CrosswordAction, type CrosswordPuzzle, type CrosswordState,
} from '../src/puzzles/crossword/engine';
import { theme } from '../src/ui/theme';
import { STARTER_CROSSWORDS } from './fixtures/crossword-starter/starterSet';

const env = vi.hoisted(() => ({
  window: { width: 320, height: 660, fontScale: 1 },
  os: 'ios',
  screenReader: false,
  announce: vi.fn(),
}));
vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => flatten(style),
    hairlineWidth: 0.5,
    absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  },
  Platform: { get OS() { return env.os; } },
  useWindowDimensions: () => env.window,
  PanResponder: { create: (panHandlers: object) => ({ panHandlers }) },
  AccessibilityInfo: {
    isScreenReaderEnabled: () => Promise.resolve(env.screenReader),
    addEventListener: () => ({ remove: () => undefined }),
    announceForAccessibility: env.announce,
  },
}));
vi.mock('react-native-reanimated', () => ({
  default: { View: 'View', createAnimatedComponent: (component: unknown) => component },
  ReduceMotion: { System: 'system' },
  useAnimatedStyle: (fn: () => object) => fn(),
  useSharedValue: (initial: number) => {
    const box = { value: initial };
    return { get: () => box.value, set: (value: number) => { box.value = value; } };
  },
  withTiming: (value: number) => value,
  withSpring: (value: number) => value,
}));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
vi.mock('expo-haptics', () => ({}));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => false }));
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false }));
vi.mock('../src/ui/icons', () => ({ ArrowLeft: 'svg', X: 'svg' }));

const mini = STARTER_CROSSWORDS.Easy[0];
let renderer: ReactTestRenderer | undefined;
const flatten = (style: unknown): Record<string, unknown> => Array.isArray(style)
  ? Object.assign({}, ...style.map(flatten))
  : (style && typeof style === 'object' ? style as Record<string, unknown> : {});

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  env.window = { width: 320, height: 660, fontScale: 1 };
  env.os = 'ios';
  env.screenReader = false;
  env.announce.mockClear();
});

afterEach(async () => {
  if (renderer) await act(async () => renderer?.unmount());
  renderer = undefined;
  vi.unstubAllGlobals();
});

function Fixture({ puzzle = mini, active, initial, onAction, onState }: {
  puzzle?: CrosswordPuzzle;
  active?: boolean;
  initial?: CrosswordState;
  onAction?: (action: CrosswordAction) => void;
  onState?: (state: CrosswordState) => void;
}) {
  const [state, setState] = useState(() => initial ?? createCrossword(puzzle));
  return (
    <TextLayoutProvider>
      <CrosswordBoard puzzle={puzzle} state={state} active={active} dispatch={action => {
        onAction?.(action);
        const next = crosswordReducer(puzzle, state, action);
        setState(next);
        onState?.(next);
      }} />
    </TextLayoutProvider>
  );
}

async function render(props: React.ComponentProps<typeof Fixture> = {}, options?: Parameters<typeof create>[1]) {
  await act(async () => { renderer = create(<Fixture {...props} />, options); });
}

const isPressable = (instance: ReactTestInstance) => String(instance.type) === 'Pressable';
const control = (label: string) =>
  renderer!.root.findAllByType('Pressable' as never).find(node => node.props.accessibilityLabel === label)!;
const node = (testID: string) => renderer!.root.findAll(instance => typeof instance.type === 'string' && instance.props.testID === testID)[0];
const output = () => JSON.stringify(renderer!.toJSON());
const cell = (index: number) => node(`crossword-cell-${index}`);
const labelFor = (index: number) => cell(index).props.accessibilityLabel;
const selected = (index: number) => cell(index).props.accessibilityState.selected;
const displayText = (root: ReactTestInstance) => root.findByType('Text' as never);

async function press(label: string) {
  const button = control(label);
  expect(button.props.accessibilityState?.disabled ?? false).toBe(false);
  await act(async () => button.props.onPress());
}

it('lays out three QWERTY rows with 44 point key heights inside a 320 point screen', async () => {
  const puzzle = STARTER_CROSSWORDS.Expert[0];
  await render({ puzzle });
  expect(renderer!.root.findAll(instance => isPressable(instance)
    && instance.props.testID?.startsWith('crossword-cell-'))).toHaveLength(puzzle.crossings.filter(Boolean).length);
  for (const [index, expected] of ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM⌫'].entries()) {
    const keys = node(`crossword-key-row-${index}`).findAll(isPressable);
    expect(keys.map(key => displayText(key).props.children).join('')).toBe(expected);
    const styles = keys.map(key => flatten(key.props.style({ pressed: false })));
    expect(styles.every(style => Number(style.minHeight) >= 44)).toBe(true);
    expect(styles.reduce((width, style) => width + Number(style.width), (keys.length - 1) * 2)).toBeLessThanOrEqual(320);
  }
  expect(renderer!.root.findAllByType('TextInput' as never)).toHaveLength(0);
});

it('enlarges small cells to 44 points with both scroll axes, then fits the whole grid again', async () => {
  const puzzle = STARTER_CROSSWORDS.Expert[0];
  const scrollTo = vi.fn();
  await render({ puzzle }, { createNodeMock: element => String(element.type) === 'ScrollView' ? { scrollTo } : null });
  const first = puzzle.clues[0].cells[0];
  expect(flatten(cell(first).props.style).width).toBeLessThan(44);
  await press('Enlarge cells');
  expect(flatten(cell(first).props.style)).toMatchObject({ width: 44, height: 44 });
  expect(node('crossword-horizontal-pan').props.horizontal).toBe(true);
  expect(node('crossword-vertical-pan').props.nestedScrollEnabled).toBe(true);
  const lowerRight = puzzle.crossings.findLastIndex(Boolean);
  await act(async () => cell(lowerRight).props.onPress());
  expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ x: expect.any(Number), animated: false }));
  expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ y: expect.any(Number), animated: false }));
  await press('Fit whole grid');
  expect(node('crossword-horizontal-pan')).toBeUndefined();
  expect(selected(lowerRight)).toBe(true);
});

it.each([[768, 1024], [1024, 768]])('allows both large grids to reach 44 point cells at %s × %s', async (width, height) => {
  env.window = { width, height, fontScale: 1 };
  for (const tier of ['Hard', 'Expert'] as const) {
    const puzzle = STARTER_CROSSWORDS[tier][0];
    await render({ puzzle });
    expect(flatten(cell(puzzle.clues[0].cells[0]).props.style).width).toBeGreaterThanOrEqual(44);
    expect(control('Enlarge cells')).toBeUndefined();
    await act(async () => renderer?.unmount());
  }
});

it('applies word-fit and chrome caps to rendered AX5 text, including shared panel buttons', async () => {
  env.window.fontScale = 3.12;
  const puzzle = STARTER_CROSSWORDS.Expert[0];
  await render({ puzzle });
  await press('Check');
  await press('More');
  expect(node('crossword-clue-number').props.allowFontScaling).toBe(false);
  expect(flatten(node('crossword-clue-number').props.style).fontSize).toBe(theme.type.caption.fontSize * CHROME_MAX);
  const clueWidth = env.window.width - 2 * theme.target.min - 6 * theme.space.xs;
  const clue = node('crossword-clue-text');
  const clueCap = wordFitMultiplier(clue.props.children, theme.type.body.fontSize, clueWidth, CHROME_MAX);
  expect(clue.props.allowFontScaling).toBe(false);
  expect(flatten(clue.props.style).fontSize).toBe(theme.type.body.fontSize * clueCap);
  for (const label of ['Check', 'More', 'Check when I ask', 'Friendly', 'Skip filled letters']) {
    const text = displayText(control(label));
    expect(text.props.allowFontScaling, label).toBe(false);
    expect(flatten(text.props.style).fontSize, label).toBe(theme.type.body.fontSize * CHROME_MAX);
  }
  const status = node('crossword-status');
  expect(status.props.allowFontScaling).toBe(false);
  expect(flatten(status.props.style).fontSize).toBe(theme.type.caption.fontSize * CHROME_MAX);
  expect(output().indexOf('crossword-clue-bar')).toBeLessThan(output().indexOf('crossword-keyboard'));
});

it('types, erases, changes direction and moves the focus indicator without changing borders', async () => {
  await render();
  const firstBorder = flatten(cell(0).props.style).borderWidth;
  expect(selected(0)).toBe(true);
  await press('Enter E');
  expect(labelFor(0)).toMatch(/, E$/);
  expect(selected(1)).toBe(true);
  expect(flatten(cell(0).props.style).borderWidth).toBe(firstBorder);
  expect(flatten(cell(1).props.style).borderWidth).toBe(firstBorder);
  expect(flatten(node('crossword-cell-focus').props.style)).toMatchObject({ position: 'absolute', borderWidth: 2 });
  await press('Backspace');
  expect(labelFor(0)).toMatch(/, blank$/);
  await act(async () => cell(0).props.onPress());
  expect(labelFor(0)).toContain('1 Down');
  await press('Next clue');
  expect(output()).toContain('2 Down');
  await press('Previous clue');
  expect(output()).toContain('1 Down');
});

it('reports neutral blanks, records Friendly help, and switches readers without clearing letters', async () => {
  const observed = vi.fn();
  await render({ onState: observed });
  await press('Enter Z');
  expect(labelFor(0)).not.toContain('try again');
  await press('Check');
  expect(node('crossword-status').props.children).toMatch(/^\d+ squares still empty$/);
  expect(observed).toHaveBeenLastCalledWith(expect.objectContaining({ checks: 0, failedChecks: 0, helpUsed: false }));
  await press('More');
  await press('Friendly');
  await press('Play together');
  expect(labelFor(0)).toContain(', Z, try again');
  expect(output()).toContain('textDecorationLine":"underline"');
  await press('Check when I ask');
  expect(labelFor(0)).not.toContain('try again');
  expect(observed).toHaveBeenLastCalledWith(expect.objectContaining({ helpUsed: true }));
  await act(async () => node('sheet').props.onAccessibilityEscape());
  expect(control('More').props.accessibilityState.selected).toBe(false);
  await press('Harder clue');
  expect(node('crossword-clue-text').props.children).toBe(mini.clues[0].harder);
  await press('Easy clue');
  expect(node('crossword-clue-text').props.children).toBe(mini.clues[0].easy);
  expect(labelFor(0)).toContain(', Z');
});

function fullDraft() {
  return [...mini.solution].map(letter => letter === '#' ? 0 : crosswordLetterCode(letter));
}

it('reports and audits a full failed Check, then offers a Rewind action that preserves help credit', async () => {
  const observed = vi.fn();
  const cells = fullDraft();
  cells[0] = crosswordLetterCode('Z');
  await render({ initial: { ...createCrossword(mini), cells, edits: cells.filter(Boolean).length }, onState: observed });
  await press('Check');
  expect(node('crossword-status').props.children).toBe('1 letter to fix');
  expect(observed).toHaveBeenLastCalledWith(expect.objectContaining({ checks: 1, failedChecks: 1, helpUsed: false }));
  await press('More');
  await press('Rewind mode');
  await press('Close');
  await press('Rewind');
  expect(node('crossword-status').props.children).toBe('No correct draft left in Undo');
  expect(observed).toHaveBeenLastCalledWith(expect.objectContaining({ checks: 1, failedChecks: 1, helpUsed: true, cells }));
});

it('announces clue changes, hints, already revealed cells and completion with a screen reader', async () => {
  env.screenReader = true;
  await render();
  await press('Next clue');
  expect(env.announce).toHaveBeenLastCalledWith(expect.stringMatching(/^4 Across\./));
  await press('Previous clue');
  await press('Hint');
  await press('Reveal letter');
  expect(env.announce).toHaveBeenLastCalledWith('Letter revealed');
  await press('Hint');
  await press('Reveal letter');
  expect(env.announce).toHaveBeenLastCalledWith('Already revealed');
  expect(node('crossword-status').props.children).toBe('Already revealed');
  await press('Hint');
  await press('Reveal word');
  await press('Hint');
  await press('Reveal word');
  expect(node('crossword-status').props.children).toBe('Already revealed');
  await press('Undo');
  expect(labelFor(0)).toContain('E, revealed');
  await press('Undo');
  expect(labelFor(0)).toContain('blank');

  await act(async () => renderer?.unmount());
  const cells = fullDraft();
  cells[0] = 0;
  await render({ initial: { ...createCrossword(mini), cells, edits: cells.filter(Boolean).length } });
  await press('Enter E');
  expect(env.announce).toHaveBeenLastCalledWith('Puzzle complete!');
});

it.each(['inactive', 'completed'])('blocks every board dispatch when %s', async condition => {
  const onAction = vi.fn();
  const initial = condition === 'completed' ? { ...createCrossword(mini), cells: fullDraft(), edits: 19 } : undefined;
  await render({ active: condition !== 'inactive', initial, onAction });
  for (const button of [cell(0), ...['Enter Z', 'Backspace', 'Previous clue', 'Next clue', 'Undo', 'Check', 'Hint', 'More'].map(control)]) {
    expect(button.props.disabled).toBe(true);
    await act(async () => button.props.onPress());
  }
  expect(onAction).not.toHaveBeenCalled();
  expect(env.announce).not.toHaveBeenCalled();
});

it('closes a pending hint when the board becomes inactive and keeps it closed on resume', async () => {
  const onAction = vi.fn();
  await render({ onAction });
  await press('Hint');
  await act(async () => renderer!.update(<Fixture active={false} onAction={onAction} />));
  expect(control('Reveal letter').props.disabled).toBe(true);
  await act(async () => renderer!.update(<Fixture onAction={onAction} />));
  expect(control('Hint').props.accessibilityState.selected).toBe(false);
  expect(onAction).not.toHaveBeenCalled();
});

it('supports scoped web hardware keys, both Tab directions, Undo and Escape through the shared sheet', async () => {
  env.os = 'web';
  const handlers: { handler: (event: KeyboardEvent) => void; capture: boolean }[] = [];
  vi.stubGlobal('document', {
    addEventListener(_type: string, handler: (event: KeyboardEvent) => void, capture = false) { handlers.push({ handler, capture }); },
    removeEventListener(_type: string, handler: (event: KeyboardEvent) => void) {
      const at = handlers.findIndex(entry => entry.handler === handler);
      if (at >= 0) handlers.splice(at, 1);
    },
  });
  const inside = { closest: () => true };
  const outside = { closest: () => true };
  const focus = vi.fn();
  const onAction = vi.fn();
  const createNodeMock: NonNullable<Parameters<typeof create>[1]>['createNodeMock'] = element => {
    const { testID } = element.props as { testID?: string };
    if (testID === 'crossword-board') return { contains: (target: object) => target === inside, querySelector: () => ({ focus }) };
    if (testID === 'sheet-title') return { focus: vi.fn() };
    return null;
  };
  await render({ onAction }, { createNodeMock });
  const sendKey = async (key: string, options: Record<string, unknown> = {}) => {
    const event = {
      key, target: inside, ...options, defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() {},
    };
    await act(async () => {
      for (const { handler } of handlers.slice().sort((a, b) => Number(b.capture) - Number(a.capture))) {
        handler(event as unknown as KeyboardEvent);
      }
    });
    return event.defaultPrevented;
  };

  expect(await sendKey('A', { target: outside })).toBe(false);
  expect(await sendKey('c', { ctrlKey: true })).toBe(false);
  expect(await sendKey('x', { isComposing: true })).toBe(false);
  expect(await sendKey('e')).toBe(true);
  expect(labelFor(0)).toMatch(/, E$/);
  expect(await sendKey('Backspace')).toBe(true);
  expect(labelFor(0)).toMatch(/, blank$/);
  await sendKey('z', { ctrlKey: true });
  expect(labelFor(0)).toMatch(/, E$/);
  await sendKey('Z', { metaKey: true });
  expect(labelFor(0)).toMatch(/, blank$/);
  await sendKey('ArrowRight');
  expect(selected(1)).toBe(true);
  await sendKey('ArrowDown');
  expect(selected(6)).toBe(true);
  await sendKey('ArrowUp');
  await sendKey('ArrowLeft');
  expect(selected(0)).toBe(true);
  await sendKey(' ');
  expect(labelFor(0)).toContain('1 Down');
  await sendKey('Tab');
  expect(node('crossword-clue-number').props.children).toBe('2 Down');
  await sendKey('Tab', { shiftKey: true });
  expect(node('crossword-clue-number').props.children).toBe('1 Down');
  await press('Hint');
  expect(await sendKey('Q')).toBe(false);
  expect(await sendKey('Escape')).toBe(true);
  expect(control('Hint').props.accessibilityState.selected).toBe(false);
  expect(await sendKey('Escape')).toBe(true);
  expect(focus).toHaveBeenCalledOnce();

  await act(async () => renderer!.update(<Fixture active={false} onAction={onAction} />));
  expect(await sendKey('a')).toBe(false);
  expect(handlers.filter(entry => !entry.capture)).toHaveLength(0);
});
