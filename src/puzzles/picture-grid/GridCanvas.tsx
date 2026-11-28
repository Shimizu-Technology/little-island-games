import { createBoardPan, BoardPanView } from '../../gestures/BoardPan';
import React, { useCallback, useContext, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { releaseOffset, startOf, type TouchStart } from '../edges/touch';
import { GridFeel, GridInteraction } from '../grid/preferences';
import { theme } from '../../ui/theme';
import { cellFloor, ink, paper } from './controls';
import { CROSS, EMPTY, FILL, lineOf, lineSatisfied, type LineAxis, type Mark, type PictureClues } from './engine';
import type { Paint } from './checkpoint';

// A Puzzles round's firmer cell edge: 3.25:1 on paper.
const filled = '#287A73', cross = '#637485', frame = '#6F8E89', edge = '#C4DAD4', firmEdge = '#7D928C', focus = '#B04F2B', TRIM = 3;
const gestureStyle: ViewStyle = Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none' } as ViewStyle) : {};
const markNames = ['empty', 'filled', 'crossed out'] as const;
type FocusLine = { axis: LineAxis; index: number; cell?: number };
type Layout = { cell: number; left: number; top: number; viewportWidth: number; viewportHeight: number; grid: number; movable: boolean };

export function gridLayout(size: number, width: number, height: number, clues?: PictureClues): Layout {
  const depth = (lines: PictureClues['rows']) => Math.max(1, ...lines.map(line => line.length));
  const left = clues ? Math.min(depth(clues.rows) * 23, Math.floor(width * 0.42)) : 0;
  const top = clues ? Math.min(depth(clues.columns) * 22, Math.floor(height * 0.43)) : 0;
  const cell = Math.max(cellFloor, Math.min(76, Math.floor(Math.min(width - left, height - top) / size)));
  const grid = size * cell;
  const viewportWidth = Math.min(grid, Math.max(cellFloor, Math.floor(width - left)));
  const viewportHeight = Math.min(grid, Math.max(cellFloor, Math.floor(height - top)));
  return { cell, left, top, viewportWidth, viewportHeight, grid, movable: grid > viewportWidth || grid > viewportHeight };
}

type Drag = TouchStart & { x: number; y: number; seed: number; mark: Mark; axis: LineAxis | null };
type Preview = { from: number; to: number; mark: Mark };
type Props = {
  layout: Layout; size: number; marks: readonly Mark[]; clues?: PictureClues;
  mode: Mark; active: boolean; moving: boolean; focusLine?: FocusLine; onPaint: (paint: Paint) => void;
};

function stretch(drag: Drag, size: number, cell: number, dx: number, dy: number) {
  if (!drag.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= Math.min(10, cell / 4)) drag.axis = Math.abs(dx) >= Math.abs(dy) ? 'row' : 'column';
  const axis = drag.axis ?? 'row';
  const stride = axis === 'row' ? 1 : size;
  const start = axis === 'row' ? drag.seed % size : Math.floor(drag.seed / size);
  const end = drag.axis ? Math.max(0, Math.min(size - 1, Math.floor((axis === 'row' ? drag.x + dx : drag.y + dy) / cell))) : start;
  const at = drag.seed + (end - start) * stride;
  return { from: Math.min(drag.seed, at), to: Math.max(drag.seed, at), mark: drag.mark };
}

function includesCell(stroke: Preview, index: number, size: number) {
  return index >= stroke.from && index <= stroke.to
    && (Math.floor(stroke.from / size) === Math.floor(stroke.to / size) || index % size === stroke.from % size);
}

/** Clues stay pinned while the edit-size canvas pans. Each drag previews and commits one straight stroke. */
export function GridCanvas({ layout, size, marks, clues, mode, active, moving, focusLine, onPaint: commit }: Props) {
  const { cell, left, top, viewportWidth, viewportHeight, grid } = layout;
  const hold = useContext(GridInteraction), feel = useContext(GridFeel);
  // With a host's feel (a Puzzles round) the board is framed, its lines and 5×5 blocks read firmer, and a square the player
  // paints pops once it is accepted. Undo and Start over change marks without a pop; clearing the popped square removes its ring.
  const [placing, setPlacing] = useState<Paint | null>(null);
  const [seen, setSeen] = useState(marks), [pop, setPop] = useState<{ at: number; mark: Mark; nonce: number } | null>(null);
  if (feel && seen !== marks && marks.some((m, i) => m !== seen[i])) {
    setSeen(marks); setPlacing(null);
    const at = placing && placing.mark !== EMPTY ? marks.findIndex((m, i) => m === placing.mark && m !== seen[i] && includesCell(placing, i, size)) : -1;
    if (at >= 0) setPop(before => ({ at, mark: marks[at], nonce: (before?.nonce ?? 0) + 1 }));
    else if (pop && marks[pop.at] !== pop.mark) setPop(null);
  }
  const onPaint = useCallback((paint: Paint) => { setPlacing(paint); commit(paint); }, [commit]);
  const block = feel ? 2 : 1, cellEdge = feel ? firmEdge : edge;
  const [focusedCell, setFocusedCell] = useState<number | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [xOffset, setXOffset] = useState(0), [yOffset, setYOffset] = useState(0);
  const drag = useRef<Drag | null>(null);
  const horizontal = useRef<ScrollView>(null), vertical = useRef<ScrollView>(null);
  const live = useRef({ active, moving, marks, mode, onPaint, hold });
  useLayoutEffect(() => { live.current = { active, moving, marks, mode, onPaint, hold }; }, [active, moving, marks, mode, onPaint, hold]);
  useEffect(() => () => {
    drag.current = null;
    hold(false);
  }, [cell, size, hold]);

  // eslint-disable-next-line react-hooks/refs -- creation stores handlers. They read the refs only on input.
  const responder = useMemo(() => createBoardPan({
    onStartShouldSetPanResponder: () => live.current.active && !live.current.moving,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: event => {
      const { locationX: x, locationY: y } = event.nativeEvent;
      if (x < 0 || x >= grid || y < 0 || y >= grid || !Number.isFinite(x + y)) return;
      const seed = Math.floor(y / cell) * size + Math.floor(x / cell);
      const { marks, mode, hold } = live.current;
      const mark = marks[seed] === mode ? EMPTY : mode;
      drag.current = { ...startOf(event), x, y, seed, mark, axis: null };
      setPreview({ from: seed, to: seed, mark });
      hold(true);
    },
    onPanResponderMove: (_event, { dx, dy, numberActiveTouches }) => {
      const current = drag.current;
      if (!current || numberActiveTouches > 1) return;
      const next = stretch(current, size, cell, dx, dy);
      setPreview(before => before?.from === next.from && before.to === next.to ? before : next);
    },
    onPanResponderRelease: (event, gesture) => {
      const current = drag.current;
      drag.current = null;
      setPreview(null);
      live.current.hold(false);
      if (!current || !live.current.active || live.current.moving) return;
      const { dx, dy } = releaseOffset(event, current, gesture);
      live.current.onPaint({ type: 'paint', ...stretch(current, size, cell, dx, dy) });
    },
    onPanResponderTerminate: () => {
      drag.current = null;
      setPreview(null);
      live.current.hold(false);
    },
  }), [size, cell, grid]);

  const scrollIntoView = useCallback((index: number) => {
    const x = (index % size) * cell, y = Math.floor(index / size) * cell;
    if (x < xOffset || x + cell > xOffset + viewportWidth) horizontal.current?.scrollTo({ x: Math.max(0, Math.min(x, grid - viewportWidth)), animated: false });
    if (y < yOffset || y + cell > yOffset + viewportHeight) vertical.current?.scrollTo({ y: Math.max(0, Math.min(y, grid - viewportHeight)), animated: false });
  }, [cell, grid, size, viewportHeight, viewportWidth, xOffset, yOffset]);
  const scrollToHint = useEffectEvent((cell: number) => scrollIntoView(cell));
  const hintCell = focusLine?.cell;
  useEffect(() => { if (hintCell !== undefined) scrollToHint(hintCell); }, [hintCell]);
  const renderClue = (axis: LineAxis, values: readonly number[], index: number) => {
    const isRow = axis === 'row', gutter = isRow ? left : top;
    const all = isRow ? clues!.rows : clues!.columns;
    const extent = gutter / Math.max(1, ...all.map(line => line.length));
    const matched = lineSatisfied(values, lineOf(size, axis, index, marks));
    const focused = focusLine?.axis === axis && focusLine.index === index;
    const label = `${axis === 'row' ? 'Row' : 'Column'} ${index + 1}, ${values.length ? values.join(', ') : 'empty'}${matched ? ', matched' : ''}`;
    return <View key={index} testID={`picture-clue-${axis}-${index}`} accessible accessibilityLabel={label}
      style={[styles.clue, isRow ? { width: left, height: cell, flexDirection: 'row' } : { width: cell, height: top }, focused && styles.clueFocus]}>
      {(values.length ? values : [0]).map((value, i) =>
        <View key={i} style={[styles.pill, matched && styles.matched, isRow ? { width: extent - 1 } : { height: extent - 1, minWidth: 21 }]}>
          <Text maxFontSizeMultiplier={1.15} style={{ color: matched ? '#546366' : ink, fontSize: Math.min(14, Math.floor(extent * 0.63)), fontWeight: '700' }}>{value}</Text>
        </View>)}
    </View>;
  };

  return <View style={{ width: viewportWidth + left, alignSelf: 'center' }}>
    {clues && <View style={{ flexDirection: 'row', height: top }}>
      <View style={{ width: left }} />
      <View style={{ width: viewportWidth, height: top, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', width: grid, transform: [{ translateX: -xOffset }] }}>{clues.columns.map((values, i) => renderClue('column', values, i))}</View>
      </View>
    </View>}
    <View style={{ flexDirection: 'row', height: viewportHeight }}>
      {/* The wood frame sits around the viewport, under the clues, never over a square's focus outline. */}
      {feel && <View pointerEvents="none" accessible={false} testID="picture-frame" style={[styles.frame, { left: left - TRIM, top: -TRIM, width: viewportWidth + 2 * TRIM, height: viewportHeight + 2 * TRIM }]}/>}
      {clues && <View style={{ width: left, height: viewportHeight, overflow: 'hidden' }}>
        <View style={{ transform: [{ translateY: -yOffset }] }}>{clues.rows.map((values, i) => renderClue('row', values, i))}</View>
      </View>}
      <ScrollView ref={horizontal} horizontal nestedScrollEnabled scrollEnabled={moving}
        style={{ width: viewportWidth, height: viewportHeight, flexGrow: 0 }} onScroll={e => setXOffset(e.nativeEvent.contentOffset.x)} scrollEventThrottle={16}>
        <ScrollView ref={vertical} nestedScrollEnabled scrollEnabled={moving}
          style={{ width: grid, height: viewportHeight, flexGrow: 0 }} onScroll={e => setYOffset(e.nativeEvent.contentOffset.y)} scrollEventThrottle={16}>
          <View style={{ width: grid, height: grid, backgroundColor: paper }}>
            {Array.from({ length: size }, (_, row) => <View key={row} style={styles.row}>
              {marks.slice(row * size, (row + 1) * size).map((mark, column) => {
                const index = row * size + column;
                const shown = preview && includesCell(preview, index, size) ? preview.mark : mark;
                const line = focusLine && (focusLine.axis === 'row' ? row : column) === focusLine.index;
                const selected = focusLine?.cell === index;
                const blockRight = column % 5 === 4 || column === size - 1, blockBottom = row % 5 === 4 || row === size - 1;
                const border: ViewStyle = {
                  borderRightColor: blockRight ? frame : cellEdge,
                  borderBottomColor: blockBottom ? frame : cellEdge,
                  ...(blockRight && block > 1 ? { borderRightWidth: block } : {}), ...(blockBottom && block > 1 ? { borderBottomWidth: block } : {}),
                  borderTopWidth: row === 0 ? 1 : 0, borderLeftWidth: column === 0 ? 1 : 0,
                };
                const choose = (value: Mark) => onPaint({ type: 'paint', from: index, to: index, mark: value });
                return <Pressable key={column} testID={`picture-cell-${index}`} accessibilityRole="button"
                  accessibilityLabel={`Row ${row + 1}, column ${column + 1}, ${markNames[mark]}`}
                  accessibilityState={{ disabled: !active || moving }} disabled={!active || moving}
                  onFocus={() => { setFocusedCell(index); scrollIntoView(index); }} onBlur={() => setFocusedCell(null)}
                  accessibilityActions={active && !moving && clues ? [{ name: 'fill', label: 'Fill square' }, { name: 'cross', label: 'Cross out square' }, { name: 'clear', label: 'Clear square' }] : undefined}
                  onAccessibilityAction={event => {
                    if (!active || moving) return;
                    const action = event.nativeEvent.actionName;
                    if (action === 'fill') choose(FILL);
                    if (action === 'cross') choose(CROSS);
                    if (action === 'clear') choose(EMPTY);
                  }}
                  onPress={() => choose(mark === mode ? EMPTY : mode)}
                  style={[styles.square, border, { width: cell, height: cell, backgroundColor: shown === FILL ? filled : line ? '#FFE7D7' : paper }, (selected || focusedCell === index) && styles.selected]}>
                  {shown === CROSS && <Text allowFontScaling={false} style={styles.cross}>×</Text>}
                </Pressable>;
              })}
            </View>)}
            {feel && pop && <feel.Pop left={pop.at % size * cell} top={Math.floor(pop.at / size) * cell} size={cell} nonce={pop.nonce}/>}
            {active && !moving && <BoardPanView pan={responder} enabled={active && !moving}><View {...(active && !moving ? responder.panHandlers : {})} testID="picture-gesture-layer" collapsable={false} accessible={false} importantForAccessibility="no" style={[StyleSheet.absoluteFill, gestureStyle]}/></BoardPanView>}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  square: { borderColor: frame, borderRightWidth: 1, borderBottomWidth: 1, alignItems: 'center', justifyContent: 'center' },
  selected: { borderColor: focus, borderRightColor: focus, borderBottomColor: focus, borderWidth: 3, borderRightWidth: 3, borderBottomWidth: 3, borderTopWidth: 3, borderLeftWidth: 3 },
  cross: { color: cross, fontSize: 29, lineHeight: 34, fontWeight: '400' },
  clue: { alignItems: 'center', justifyContent: 'flex-end', gap: 1, paddingBottom: 1, paddingRight: 1 },
  clueFocus: { backgroundColor: '#FBD4BF', borderRadius: 6 },
  pill: { alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#EDE4F6', minHeight: 13 },
  matched: { backgroundColor: '#EDECED' },
  frame: { position: 'absolute', borderWidth: TRIM, borderColor: theme.colors.frame, borderRadius: 4 + TRIM },
});
