import React, { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { artByBand, unpackDrawing } from '../scripts/puzzles/families/picture-grid';
import { decodePicture, editPicture, encodePicture, freshPicture } from '../src/puzzles/picture-grid/checkpoint';
import { Board } from '../src/puzzles/picture-grid/Board';
import { DrawBoard } from '../src/puzzles/picture-grid/DrawBoard';
import { PlayScreen } from '../src/puzzles/picture-grid/PlayScreen';
import { CROSS, EMPTY, FILL, pictureBands } from '../src/puzzles/picture-grid/engine';

const window = vi.hoisted(() => ({ width: 390, height: 800, fontScale: 1 }));
vi.mock('react-native', () => ({
  View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', Platform: { OS: 'web' },
  PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) },
  StyleSheet: { create: (styles: object) => styles, absoluteFill: {} },
  useWindowDimensions: () => window,
}));

let mounted: ReactTestRenderer | undefined;
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => {
  if (mounted) act(() => mounted!.unmount());
  mounted = undefined;
  vi.unstubAllGlobals();
  Object.assign(window, { width: 390, height: 800, fontScale: 1 });
});
function render(element: React.ReactElement) { act(() => { mounted = create(element); }); }
function byID(id: string) { return mounted!.root.find(node => typeof node.type === 'string' && node.props.testID === id); }
function hasID(id: string) { return mounted!.root.findAll(node => typeof node.type === 'string' && node.props.testID === id).length > 0; }
function byLabel(label: string) { return mounted!.root.find(node => typeof node.type === 'string' && node.props.accessibilityLabel === label); }
function tap(id: string) { act(() => byID(id).props.onPress()); }
function press(label: string) { act(() => byLabel(label).props.onPress()); }
function cellLabel(index: number) { return byID(`picture-cell-${index}`).props.accessibilityLabel; }

const star = unpackDrawing(artByBand.easy.find(([name]) => name === 'Star')!);
function Game({ picture = star.picture, initial = freshPicture(picture.size), width = window.width }: {
  picture?: typeof star.picture; initial?: ReturnType<typeof freshPicture>; width?: number;
}) {
  const [draft, setDraft] = useState(initial);
  return <Board picture={picture} draft={draft} width={width} band={pictureBands[0]} active
    dispatch={event => setDraft(previous => editPicture(previous, event, picture))} onDraw={() => {}} />;
}

describe('Picture Grid board', () => {
  it('keeps the picture name hidden, toggles marks, dims matched clues, and reveals the colored picture', () => {
    render(<Game />);
    expect(JSON.stringify(mounted!.toJSON())).toContain('Easy 5×5');
    expect(JSON.stringify(mounted!.toJSON())).not.toContain(star.picture.name);
    press('Cross out');
    tap('picture-cell-0');
    expect(cellLabel(0)).toContain('crossed out');
    tap('picture-cell-0');
    expect(cellLabel(0)).toContain('empty');
    press('Fill');
    tap('picture-cell-2');
    expect(byID('picture-clue-row-0').props.accessibilityLabel).toBe('Row 1, 1, matched');
    star.marks.forEach((mark, index) => {
      if (mark === FILL && index !== 2) tap(`picture-cell-${index}`);
    });
    expect(hasID('picture-reveal')).toBe(true);
    expect(byLabel('Star').props.accessibilityRole).toBe('image');
    expect(JSON.stringify(mounted!.toJSON())).toContain('#F3B641');
    expect(hasID('picture-gesture-layer')).toBe(false);
  });

  it('locks a drag to the first direction, covers fast gaps and undoes it as one stroke', () => {
    render(<Game />);
    const size = byID('picture-cell-0').props.style.find((style: object | false) => (style as { width?: number })?.width)?.width;
    const handlers = byID('picture-gesture-layer').props;
    act(() => handlers.onPanResponderGrant({ nativeEvent: { locationX: 8, locationY: 8, pageX: 20, pageY: 30 } }));
    act(() => handlers.onPanResponderMove({}, { dx: size + 4, dy: 4, numberActiveTouches: 1 }));
    act(() => handlers.onPanResponderMove({}, { dx: size / 2, dy: 2 * size, numberActiveTouches: 1 }));
    act(() => handlers.onPanResponderRelease({ nativeEvent: { changedTouches: [{ pageX: 20 + 3 * size, pageY: 30 + 2 * size }] } }, { dx: 2, dy: size }));
    [0, 1, 2, 3].forEach(cell => expect(cellLabel(cell)).toContain('filled'));
    [4, 5, 10].forEach(cell => expect(cellLabel(cell)).toContain('empty'));
    tap('picture-undo');
    [0, 1, 2, 3].forEach(cell => expect(cellLabel(cell)).toContain('empty'));
    expect(byID('picture-undo').props.disabled).toBe(true);
  });

  it('retracts the preview and commits only the span from the anchor to the release point', () => {
    render(<Game />);
    const cellStyle = (index: number) =>
      byID(`picture-cell-${index}`).props.style.find((style: { width?: number }) => style.width !== undefined);
    const { width, backgroundColor } = cellStyle(0);
    const handlers = byID('picture-gesture-layer').props;
    act(() => handlers.onPanResponderGrant({ nativeEvent: { locationX: 8, locationY: 8, pageX: 20, pageY: 30 } }));
    act(() => handlers.onPanResponderMove({}, { dx: 4 * width, dy: 0, numberActiveTouches: 1 }));
    expect(cellStyle(4).backgroundColor).not.toBe(backgroundColor);
    act(() => handlers.onPanResponderMove({}, { dx: 2 * width, dy: 3 * width, numberActiveTouches: 1 }));
    expect(cellStyle(4).backgroundColor).toBe(backgroundColor);
    expect(cellStyle(2).backgroundColor).not.toBe(backgroundColor);
    act(() => handlers.onPanResponderRelease(
      { nativeEvent: { changedTouches: [{ pageX: 20 + width, pageY: 30 + 3 * width }] } },
      { dx: 2 * width, dy: 3 * width },
    ));
    [0, 1].forEach(cell => expect(cellLabel(cell)).toContain('filled'));
    [2, 3, 4, 15, 16].forEach(cell => expect(cellLabel(cell)).toContain('empty'));
  });

  it('drops interrupted gestures, supports accessible cell actions, and dismisses More with a downward swipe', () => {
    render(<Game />);
    const gesture = byID('picture-gesture-layer').props;
    act(() => gesture.onPanResponderGrant({ nativeEvent: { locationX: 5, locationY: 5 } }));
    act(() => gesture.onPanResponderTerminate());
    expect(cellLabel(0)).toContain('empty');
    act(() => byID('picture-cell-0').props.onAccessibilityAction({ nativeEvent: { actionName: 'cross' } }));
    expect(cellLabel(0)).toContain('crossed out');
    tap('picture-more-button');
    expect(hasID('picture-more')).toBe(true);
    expect(hasID('picture-gesture-layer')).toBe(false);
    const swipe = byID('picture-more').props;
    expect(swipe.onMoveShouldSetPanResponderCapture({}, { dx: 0, dy: 10 })).toBe(true);
    act(() => swipe.onPanResponderRelease({}, { dy: 30 }));
    expect(hasID('picture-more')).toBe(false);
    expect(hasID('picture-gesture-layer')).toBe(true);
  });

  it('highlights and explains a public hint without changing a cell, then clears the hint on edit', () => {
    const initial = decodePicture(encodePicture(freshPicture(5)))!;
    render(<Game initial={initial} />);
    tap('picture-hint');
    expect(JSON.stringify(mounted!.toJSON())).toContain('Row 2, column 3 must be filled. Every fit for row 2 fills this square.');
    expect(byID('picture-cell-7').props.style).toContainEqual(expect.objectContaining({ borderWidth: 3 }));
    expect(cellLabel(7)).toContain('empty');
    tap('picture-cell-7');
    expect(JSON.stringify(mounted!.toJSON())).not.toContain('Every fit for row 2');
  });

  it('keeps Expert cells at least 44 pt and exposes a pan mode at large text on a narrow phone', () => {
    Object.assign(window, { width: 320, height: 568, fontScale: 2 });
    const expert = unpackDrawing(artByBand.expert[0]);
    render(<Board picture={expert.picture} draft={freshPicture(15)} dispatch={() => {}} active band={pictureBands[3]} width={320} />);
    expect(JSON.stringify(mounted!.toJSON())).toContain('Expert 15×15');
    expect(byID('picture-cell-224').props.style).toContainEqual(expect.objectContaining({ height: 44, width: 44 }));
    press('Move grid');
    expect(hasID('picture-gesture-layer')).toBe(false);
    expect(mounted!.root.findAll(node => String(node.type) === 'ScrollView').every(node => node.props.scrollEnabled)).toBe(true);
    press('Edit grid');
    expect(hasID('picture-gesture-layer')).toBe(true);
  });
});

describe('Draw a Puzzle', () => {
  it('checks the drawing live, replaces it with a cover, and starts the solver with empty cells', () => {
    render(<DrawBoard width={340} />);
    expect(byID('picture-pass').props.disabled).toBe(true);
    press('8×8');
    expect(hasID('picture-cell-63')).toBe(true);
    tap('picture-cell-0');
    expect(JSON.stringify(mounted!.toJSON())).toContain('One way to solve it');
    tap('picture-cell-9');
    expect(JSON.stringify(mounted!.toJSON())).toContain('still has options');
    tap('picture-pass');
    expect(hasID('picture-pass-cover')).toBe(true);
    expect(JSON.stringify(mounted!.toJSON())).toContain('Pass to solver!');
    expect(JSON.stringify(mounted!.toJSON())).not.toMatch(/picture-cell|picture-clue|still has options/);
    tap('picture-family-play');
    expect(hasID('picture-pass-cover')).toBe(false);
    expect(hasID('picture-clue-row-0')).toBe(true);
    expect(cellLabel(0)).toContain('empty');
    expect(cellLabel(9)).toContain('empty');
    // The solver may complete the other diagonal of the clue-equivalent 2×2.
    tap('picture-cell-1');
    tap('picture-cell-8');
    expect(hasID('picture-reveal')).toBe(true);
  });

  it('offers 10×10 through More and leaves the authored marks intact when returning', () => {
    const draft = editPicture(freshPicture(5), { type: 'paint', from: 0, to: 0, mark: FILL });
    render(<PlayScreen picture={star.picture} draft={draft} dispatch={() => {}} active width={340} />);
    tap('picture-more-button');
    press('Draw a Puzzle');
    press('10×10');
    expect(hasID('picture-cell-99')).toBe(true);
    press('Back from drawing');
    expect(hasID('picture-cell-99')).toBe(false);
    expect(cellLabel(0)).toContain('filled');
    expect(draft.marks[1]).toBe(EMPTY);
    expect(draft.marks[0]).not.toBe(CROSS);
  });
});
