import { createBoardPan, BoardPanView } from '../../gestures/BoardPan';
import { C, Button, Copy } from "../../board/WarmUI";
import React, { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, TextInput, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../../components/Text';
import { LARGE_TEXT, atLarge, wordFitMultiplier, wordsFit } from '../../components/wordFit';
import { acceptTouch, gridGeometry, moveSelection, nearestCell, paintLine, type GridAction, type GridSpec, type GridState } from './model';
import type { Mistakes } from '../../cove/local';
import { GridPreferences, GridFeedback, GridFeel, GridInteraction, GridAdult } from './preferences';
import { GridChromeContext, boardRoom, gridViewportMax } from './budget';
import { cornerGridGeometry, cornerNoteLayout, type CornerClue, type CornerClues } from './cornerNotes';
import { theme } from '../../ui/theme';

/** This memoized layer never changes during selection, notes, painting or panning. */
export const GridLines = memo(function GridLines({ rows, columns, cell, borders = '', stroke = '#A1B4A9' }: { rows: number; columns: number; cell: number; borders?: string; stroke?: string }) {
  let d = '';
  for (let r = 0; r <= rows; r++) d += `M0 ${r * cell}H${columns * cell}`;
  for (let c = 0; c <= columns; c++) d += `M${c * cell} 0V${rows * cell}`;
  return <View pointerEvents="none" accessible={false} style={{ position: 'absolute', left: 0, top: 0 }}><Svg width={columns * cell} height={rows * cell}><Path d={d} stroke={stroke} strokeWidth={1} fill="none"/>{!!borders && <Path d={borders} stroke={C.ink} strokeWidth={2.5} fill="none"/>}</Svg></View>;
});
/** A square's fill. A peer shares the selected square's row, column or box (a warm lagoon wash, about 1.16:1 on an empty square); a tint or the selection wins. */
const cellFill = ({ paint, value, tint, selected, peer, given }: { paint: boolean; value: number; tint: GridTint; selected: boolean; peer: boolean; given: boolean }) =>
  paint && value === 1 ? '#246858' : tint === 2 || tint === 3 ? '#F6E3A8' : tint === 4 ? '#BCD0E2' : selected && !paint ? '#BFE0CC' : tint === 1 ? '#DCEBE2' : peer ? given ? '#E1E7D6' : '#E3F0E5' : given ? '#F0EDDF' : '#FFFDF7';
/**
 * Puzzles boards' espresso frame (with a bottom lip), their cell lines (at least 3:1 on every fill) and the keys' lip.
 * The frame is wood around the board, never over it, so an edge square's selection and conflict borders stay whole.
 */
const FRAME = theme.colors.frame, TRIM = 3, LINE = '#6B7D72', KEY_LIP = { borderBottomWidth: 4, borderBottomColor: 'rgba(61,43,36,0.24)' } as const;
/** Without a host's feel the board is unframed. */
function Framed({ on, children }: { on: boolean; children: React.ReactNode }) {
  return on ? <View testID="cove-grid-frame" style={{ alignSelf: 'center', borderRadius: 8 + TRIM, padding: TRIM, paddingBottom: 2 * TRIM, backgroundColor: FRAME }}>{children}</View> : <>{children}</>;
}
/** Tint 3 and 4 are the two colours of a hint's chain: a dot and a ring, never colour alone. */
const chainMark: Record<number, { ring: boolean; words: string }> = { 3: { ring: false, words: ', chain dot' }, 4: { ring: true, words: ', chain ring' } };
const Cell = memo(function Cell({ index, value, notes, given, selected, conflict, cell, columns, symbols, paint, select, tint = 0, words = '', corner, school, peer = false }: { index: number; value: number; notes: number; given: boolean; selected: boolean; conflict: boolean; cell: number; columns: number; symbols: readonly string[]; paint: boolean; select: (index: number) => void; tint?: GridTint; words?: string; corner?: CornerClue; school?: boolean; peer?: boolean }) {
  const noteText = symbols.map((s, i) => notes & 1 << i ? s : '·').reduce((lines, s, i) => lines + s + (i % 3 === 2 ? '\n' : ' '), '').trim(), mark = chainMark[tint];
  const layout = corner && notes ? cornerNoteLayout(cell, symbols, corner, notes) : undefined;
  const border = selected ? 3 : conflict ? 2 : 0;
  const valueBand = school && corner ? Math.ceil(corner.top + corner.lineHeight) + 2 : 0;
  const valueFont = school ? Math.min(cell * .48, cell - valueBand - 6) : cell * .48;
  const label = `Row ${Math.floor(index / columns) + 1}, column ${index % columns + 1}, ${value ? symbols[value - 1] : notes ? `notes ${symbols.filter((_, i) => notes & 1 << i).join(', ')}` : 'empty'}${given ? ', given' : ''}${conflict ? ', conflict' : ''}${tint >= 2 ? ', hint focus' : ''}${mark?.words ?? ''}${words ? `, ${words}` : ''}`;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={() => select(index)} onAccessibilityTap={() => select(index)} style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center', backgroundColor: cellFill({ paint, value, tint, selected, peer, given }), borderWidth: border, borderColor: conflict ? C.error : C.teal, ...(valueBand && value ? { paddingTop: valueBand } : {}) }}>
    {/* Centred and large on an empty square; small in the corner when the square shows notes or a number. */}
    {mark && (() => { const big = !value && !notes, size = Math.max(10, cell * (big ? .38 : .22)); return <View accessible={false} pointerEvents="none" style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, ...(big ? {} : { right: 2, bottom: 2 }), backgroundColor: mark.ring ? 'transparent' : C.ink, borderWidth: mark.ring ? Math.max(2.5, size * .16) : 0, borderColor: C.ink }}/>; })()}
    {notes ? layout ? layout.fits ? <View pointerEvents="none" accessible={false} style={{ position: 'absolute', left: -border, top: -border, width: cell, height: cell }}>{layout.boxes.map(({ symbolIndex, ...box }) => <Text key={symbolIndex} testID={`corner-note-${index}-${symbolIndex}`} maxFontSizeMultiplier={1} style={{ position: 'absolute', ...box, color: C.ink, fontSize: layout.fontSize, lineHeight: layout.lineHeight, fontFamily: Platform.OS === 'android' ? 'monospace' : 'ui-monospace', fontVariant: ['tabular-nums'], textAlign: 'center' }}>{symbols[symbolIndex]}</Text>)}</View> : null : <Text maxFontSizeMultiplier={1} style={{ color: C.ink, fontSize: Math.max(8, cell * .19), lineHeight: cell * .25, fontVariant: ['tabular-nums'], textAlign: 'center' }}>{noteText}</Text> : value > 0 && (!paint || value !== 1) && <Text maxFontSizeMultiplier={school ? 1 : 1.4} adjustsFontSizeToFit numberOfLines={1} style={{ color: conflict ? C.error : C.ink, fontSize: valueFont, fontWeight: given ? '800' : '500', ...(school ? { lineHeight: valueFont } : {}) }}>{symbols[value - 1] ?? ''}</Text>}
  </Pressable>;
});
export type GridShellProps = {
  spec: GridSpec; state: GridState; dispatch: (action: GridAction) => void; width: number; active: boolean;
  mistakes?: Mistakes; /** Computed by the same pure engine as validation/hints. */ conflicts?: readonly number[];
  fillNotes?: () => void; /** A path, or a path for a given cell size. */ borders?: string | ((cell: number) => string); numberFirst?: boolean; onAccepted?: () => void;
  /** Cell tints: 1 for a quiet same-number echo, 2 for a hint's focus, 3 and 4 for a hint chain's two colours. Presentation only. */
  tints?: ReadonlyMap<number, GridTint>;
  /** Extra words a screen reader hears for a cell, such as the cage it belongs to. */
  cellWords?: (index: number) => string;
  /** Public corner captions; their note cells reserve the caption area instead of drawing underneath. */
  cornerClues?: CornerClues;
  /** Lead-approved School drawing allocation; absent hosts retain the legacy budget. */
  schoolLayout?: { height: number; minimumCell: number; testID: string; onLayout: (event: LayoutChangeEvent) => void };
  /** The status sentence above the board (see `statusSentence`), so the height budget can measure how it wraps. */
  status?: string;
  /** A static layer above the cells and lines (cage sums, inequality marks). Never input. */
  overlay?: (cell: number) => React.ReactNode;
  /** Edge clues outside the board: a gutter `size` cells wide on every side, drawn by `layer`. */
  frame?: { size: number; layer: (cell: number, gutter: number) => React.ReactNode };
  /** In a Puzzles round the HUD owns Undo and How to play holds the instructions, so the board leaves both out. */
  hosted?: boolean;
  /** Wash the selected square's row and column, and its box when `box` is given (rows × columns). Presentation only. */
  peers?: { box?: { rows: number; columns: number } };
};
export type GridTint = 0 | 1 | 2 | 3 | 4;
/** Input/render only. Adapters own truth, hint evidence, checkpoint codec and Store autosave. */
export function GridShell({ spec, state, dispatch, width: outer, active, mistakes: mistakeChoice, conflicts = [], borders, fillNotes, numberFirst = false, onAccepted, tints, overlay, frame, cellWords, cornerClues, schoolLayout, status, hosted = false, peers }: GridShellProps) {
  const feel = useContext(GridFeel);
  // A clue frame takes its share of the width, so the board's cells stay square and centred; a host's wood frame takes its trim.
  const width = (frame ? outer * spec.columns / (spec.columns + 2 * frame.size) : outer) - (feel ? 2 * TRIM : 0);
  const feedback = useContext(GridFeedback), interaction = useContext(GridInteraction), adult = useContext(GridAdult), preferences = useContext(GridPreferences), mistakes = mistakeChoice ?? preferences.mistakes;
  const { width: windowWidth, height, fontScale } = useWindowDimensions(), large = (fontScale ?? 1) >= LARGE_TEXT, chrome = useContext(GridChromeContext);
  // At accessibility sizes the board, its clue gutters and the keys share one height budget; below them it is the base share of the window.
  const viewportMax = schoolLayout ? Math.max(schoolLayout.height, schoolLayout.minimumCell * spec.rows) : gridViewportMax(boardRoom({ windowWidth, windowHeight: height, fontScale, chrome, pad: true, sentence: status }), height, spec.rows, frame?.size ?? 0);
  const [zoom, setZoom] = useState(() => spec.kind !== 'digits' && gridGeometry(width, viewportMax, spec, false).needsZoom), [first, setFirst] = useState(numberFirst), [line, setLine] = useState<number[]>([]);
  const [screenReader, setScreenReader] = useState(false);
  useEffect(() => { let live = true; void AccessibilityInfo?.isScreenReaderEnabled().then(on => { if (live) setScreenReader(on); }); const subscription = AccessibilityInfo?.addEventListener('screenReaderChanged', setScreenReader); return () => { live = false; subscription?.remove(); }; }, []);
  const layoutWidth = schoolLayout ? Math.max(width, schoolLayout.minimumCell * spec.columns) : width;
  const fit = gridGeometry(layoutWidth, viewportMax, spec, false);
  const fitCorners = useMemo(() => cornerClues?.(fit.cell, fontScale ?? 1), [cornerClues, fit.cell, fontScale]);
  const { geometry, noteZoom } = cornerGridGeometry(layoutWidth, viewportMax, spec, zoom && !screenReader, state.notes, fitCorners, cell => cornerClues?.(cell, fontScale ?? 1));
  const enlarged = noteZoom || zoom && !screenReader;
  const { cell } = geometry;
  const corners = useMemo(() => cornerClues?.(cell, fontScale ?? 1), [cornerClues, cell, fontScale]);
  // The large pad sits right under the board, in rows of up to five, so a phone shows both at once.
  const padCount = spec.symbols.length + 1, perRow = padCount > 6 ? Math.ceil(padCount / 2) : padCount, padWidth = Math.max(52, Math.floor((Math.min(outer, 560) - 8 * (perRow - 1)) / perRow));
  const acceptedEdits = useRef(state.edits);
  useEffect(() => { if (state.edits > acceptedEdits.current) (onAccepted ?? feedback)(); acceptedEdits.current = state.edits; }, [state.edits, onAccepted, feedback]);
  useEffect(() => () => interaction(false), [interaction]);
  // With a host's feel, a symbol the player places pops once it is accepted, and a square the player chooses ticks.
  // Undo, Redo, hints and Start over change the board without either; clearing the popped square removes its ring.
  const [placing, setPlacing] = useState<{ cells: readonly number[]; value: number } | null>(null);
  const [seen, setSeen] = useState({ edits: state.edits, values: state.values }), [pop, setPop] = useState<{ at: number; value: number; nonce: number } | null>(null);
  if (feel && seen.edits !== state.edits) {
    setSeen({ edits: state.edits, values: state.values }); setPlacing(null);
    const at = placing ? state.values.findIndex((v, i) => v > 0 && v === placing.value && v !== seen.values[i] && placing.cells.includes(i)) : -1;
    if (at >= 0) setPop(before => ({ at, value: state.values[at], nonce: (before?.nonce ?? 0) + 1 }));
    else if (pop && state.values[pop.at] !== pop.value) setPop(null);
  }
  const ticked = useRef(state.selected), chosen = useRef<number | null>(null);
  useEffect(() => { if (ticked.current !== state.selected) { ticked.current = state.selected; if (chosen.current === state.selected) feel?.select(); chosen.current = null; } }, [state.selected, feel]);
  const peerOf = (i: number) => {
    if (!peers || i === state.selected) return false;
    const r = Math.floor(i / spec.columns), c = i % spec.columns, sr = Math.floor(state.selected / spec.columns), sc = state.selected % spec.columns, box = peers.box;
    return r === sr || c === sc || !!box && Math.floor(r / box.rows) === Math.floor(sr / box.rows) && Math.floor(c / box.columns) === Math.floor(sc / box.columns);
  };
  const panX = useSharedValue(0), panY = useSharedValue(0), cursorX = useSharedValue(0), cursorY = useSharedValue(0), cursorOn = useSharedValue(0);
  const nativeKeyboard = useRef<TextInput>(null);
  const last = useRef<{ cell: number; at: number } | null>(null);
  const drag = useRef<{ start: number; end: number; axis: 'row' | 'column' | null; cells: number[]; pan: boolean; dx: number; dy: number; px: number; py: number } | null>(null);
  const live = useRef({ state, active });
  useEffect(() => { live.current = { state, active }; }, [state, active]);
  /** A square the player moves the selection to (a tap, a drag's end or an arrow key). */
  const choose = useCallback((index: number) => { chosen.current = index === live.current.state.selected ? null : index; }, []);
  useEffect(() => { panX.set(0); panY.set(0); cursorOn.set(0); drag.current = null; interaction(false); }, [width, height, enlarged, spec.rows, spec.columns, panX, panY, cursorOn, interaction]);
  useEffect(() => {
    if (!enlarged) return;
    const x = (state.selected % spec.columns) * cell, y = Math.floor(state.selected / spec.columns) * cell;
    if (x + panX.get() < 0) panX.set(-x); else if (x + cell + panX.get() > width) panX.set(width - x - cell);
    const viewportHeight = viewportMax;
    if (y + panY.get() < 0) panY.set(-y); else if (y + cell + panY.get() > viewportHeight) panY.set(viewportHeight - y - cell);
  }, [enlarged, state.selected, spec.columns, cell, width, viewportMax, panX, panY]);
  const send = useCallback((action: GridAction) => {
    if (!active) return;
    if (action.type === 'write') {
      setPlacing({ cells: action.cells, value: action.value });
      if (action.selected !== undefined) choose(action.selected);
    }
    dispatch(action);
  }, [active, dispatch, choose]);
  const select = useCallback((index: number) => {
    if (!active) return;
    const changes = first || spec.kind === 'paint' || spec.kind === 'cells', now = Date.now();
    if (!acceptTouch(last.current, index, now, changes)) return;
    last.current = { cell: index, at: now }; choose(index);
    if (changes) send({ type: 'write', cells: [index], value: state.tool, selected: index });
    else dispatch({ type: 'select', cell: index });
  }, [active, first, spec.kind, dispatch, send, state.tool, choose]);
  const selectRef = useRef(select);
  const stableSelect = useCallback((index: number) => selectRef.current(index), []);
  useEffect(() => { selectRef.current = select; }, [select]);
  const keyAction = useCallback((key: string) => {
    if (!active) return false;
    if (key.startsWith('Arrow')) { const cell = moveSelection(state.selected, key, spec); choose(cell); dispatch({ type: 'select', cell }); return true; }
    if (key.toLowerCase() === 'n' && spec.kind === 'digits') { send({ type: 'pencil' }); return true; }
    const erase = ['Backspace', 'Delete', '0'].includes(key), value = erase ? 0 : spec.symbols.findIndex(s => s.toLocaleLowerCase() === key.toLocaleLowerCase()) + 1;
    if (value || erase) { send({ type: 'write', cells: [state.selected], value }); return true; }
    return false;
  }, [active, state.selected, spec, send, dispatch, choose]);
  useEffect(() => { if (!active) { nativeKeyboard.current?.blur(); interaction(false); } }, [active, interaction]);
  useEffect(() => {
    if (Platform.OS !== 'web' || !active) return;
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-testid="cove-grid-keyboard"]') || target.tagName === 'INPUT' || event.altKey) return;
      if (event.ctrlKey || event.metaKey) { if (event.key.toLowerCase() === 'z') { event.preventDefault(); send({ type: event.shiftKey ? 'redo' : 'undo' }); } return; }
      if (keyAction(event.key)) event.preventDefault();
    };
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key);
  }, [active, keyAction, send]);
  // eslint-disable-next-line react-hooks/refs -- PanResponder stores these event handlers; creation never reads the refs.
  const responder = useMemo(() => createBoardPan({
    onStartShouldSetPanResponder: () => active,
    onMoveShouldSetPanResponder: (_e, g) => active && (spec.kind === 'paint' || zoom && g.numberActiveTouches >= 2),
    onPanResponderGrant: (e, g) => {
      interaction(true);
      if (Platform.OS === 'ios') nativeKeyboard.current?.focus();
      const x = e.nativeEvent.locationX, y = e.nativeEvent.locationY;
      const start = nearestCell(x - panX.get(), y - panY.get(), cell, spec);
      drag.current = { start, end: start, axis: null, cells: [start], pan: g.numberActiveTouches >= 2, dx: g.dx ?? 0, dy: g.dy ?? 0, px: panX.get(), py: panY.get() };
      if (spec.kind === 'paint') { setLine([start]); cursorX.set((start % spec.columns) * cell); cursorY.set(Math.floor(start / spec.columns) * cell); cursorOn.set(1); }
    },
    onPanResponderMove: (e, g) => {
      const d = drag.current; if (!d || !live.current.active) return;
      if (g.numberActiveTouches >= 2 && !d.pan) { d.pan = true; d.px = panX.get(); d.py = panY.get(); d.dx = g.dx; d.dy = g.dy; setLine([]); }
      if (d.pan) {
        panX.set(Math.min(0, Math.max(width - geometry.width, d.px + g.dx - d.dx)));
        panY.set(Math.min(0, Math.max(viewportMax - geometry.height, d.py + g.dy - d.dy))); cursorOn.set(0); return;
      }
      const end = nearestCell(e.nativeEvent.locationX - panX.get(), e.nativeEvent.locationY - panY.get(), cell, spec);
      if (end === d.end) return;
      d.end = end;
      if (spec.kind === 'paint') { const path = paintLine(d.start, end, spec.columns, d.axis); d.axis = path.axis; d.cells = path.cells; d.end = d.axis === 'row' ? Math.floor(d.start / spec.columns) * spec.columns + end % spec.columns : Math.floor(end / spec.columns) * spec.columns + d.start % spec.columns; setLine(path.cells); }
      cursorX.set((d.end % spec.columns) * cell); cursorY.set(Math.floor(d.end / spec.columns) * cell);
    },
    onPanResponderRelease: () => {
      interaction(false); const d = drag.current; drag.current = null; cursorOn.set(0); setLine([]);
      if (!d || d.pan || !live.current.active) return;
      if (spec.kind === 'paint') {
        // eslint-disable-next-line react-hooks/purity -- This runs only on a gesture release, never during render.
        const now = Date.now(); if (!acceptTouch(last.current, d.start, now, d.cells.length === 1)) return;
        last.current = { cell: d.start, at: now }; send({ type: 'write', cells: d.cells, value: live.current.state.tool, selected: d.end });
      } else selectRef.current(d.end);
    },
    onPanResponderTerminate: () => { interaction(false); drag.current = null; cursorOn.set(0); setLine([]); },
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }), [active, spec, zoom, cell, panX, panY, cursorX, cursorY, cursorOn, width, viewportMax, geometry.width, geometry.height, interaction, send]);
  const panStyle = useAnimatedStyle(() => ({ transform: [{ translateX: panX.get() }, { translateY: panY.get() }] }));
  const cursorStyle = useAnimatedStyle(() => ({ opacity: cursorOn.get(), transform: [{ translateX: cursorX.get() }, { translateY: cursorY.get() }] }));
  // Below the accessibility sizes the zoom controls sit between the board and the keys, as they always did. At them the keys
  // come first, so the board and the keys' first row share the screen; the zoom controls follow the keys.
  const buttonMax = atLarge(fontScale, 1.3);
  const eraseRoom = padWidth - 12; // 4-pt padding and 2-pt border on each side
  const eraseMax = wordFitMultiplier('Erase', 15, eraseRoom, 1.3);
  const eraseIcon = !wordsFit('Erase', 15 * Math.min(fontScale ?? 1, eraseMax), eraseRoom);
  const zoomControls = geometry.needsZoom && !screenReader && <>{noteZoom ? <Copy maxFontSizeMultiplier={buttonMax}>Larger cells keep the clues and notes clear.</Copy> : <Button quiet compact maxFontSizeMultiplier={buttonMax} selected={zoom} onPress={() => setZoom(!zoom)}>{zoom ? 'Fit whole board' : 'Enlarge cells'}</Button>}{enlarged && <><Copy maxFontSizeMultiplier={atLarge(fontScale, 1.5)}>Two fingers move the board. One finger selects or paints.</Copy><Button quiet compact maxFontSizeMultiplier={buttonMax} onPress={() => { panX.set(0); panY.set(0); }}>Return to top left</Button></>}</>;
  return <View testID="cove-grid-keyboard" style={{ gap: 10 }}>
    {Platform.OS === 'ios' && <TextInput ref={nativeKeyboard} testID="cove-native-keyboard" accessible={false} importantForAccessibility="no-hide-descendants" showSoftInputOnFocus={false} caretHidden contextMenuHidden autoCorrect={false} autoCapitalize="none" value="" onKeyPress={e => keyAction(e.nativeEvent.key)} onChangeText={() => nativeKeyboard.current?.clear()} style={{ position: 'absolute', width: 1, height: 1, opacity: 0, fontSize: 18 }}/>}

    {/* The selected cell is already marked on the board; the caption speaks for VoiceOver and for notes. */}
    {(screenReader || !!state.notes[state.selected]) && <Copy>Selected row {Math.floor(state.selected / spec.columns) + 1}, column {state.selected % spec.columns + 1}{state.notes[state.selected] ? ` · Notes: ${spec.symbols.filter((_, i) => state.notes[state.selected] & 1 << i).join(', ')}` : ''}</Copy>}
    <View style={frame ? { alignSelf: 'center', padding: frame.size * cell } : { alignSelf: 'center' }}>
    {frame && <View pointerEvents="none" accessible={false} style={{ position: 'absolute', left: 0, top: 0, width: (spec.columns + 2 * frame.size) * cell, height: (spec.rows + 2 * frame.size) * cell }}>{frame.layer(cell, frame.size * cell)}</View>}
    <Framed on={!!feel}>
    <View {...(schoolLayout ? { testID: schoolLayout.testID, onLayout: schoolLayout.onLayout } : {})} style={{ width: Math.min(layoutWidth, geometry.width), alignSelf: 'center', height: Math.min(geometry.height, viewportMax), overflow: 'hidden', borderRadius: 8, ...(Platform.OS === 'web' ? { touchAction: spec.kind === 'paint' || zoom ? 'none' as const : 'auto' as const } : {}) }}>
      <Animated.View style={[{ width: geometry.width, height: geometry.height }, panStyle]}>
        {Array.from({ length: spec.rows }, (_, r) => <View key={r} style={{ flexDirection: 'row' }}>{Array.from({ length: spec.columns }, (_, c) => { const i = r * spec.columns + c; return <Cell key={i} index={i} value={state.values[i]} notes={state.notes[i]} selected={state.selected === i} conflict={mistakes === 'Friendly' && conflicts.includes(i)} given={!!spec.givens[i]} cell={cell} columns={spec.columns} symbols={spec.symbols} paint={spec.kind === 'paint'} select={stableSelect} tint={tints?.get(i) ?? 0} words={cellWords?.(i)} corner={corners?.get(i)} peer={peerOf(i)} {...(schoolLayout ? { school: true } : {})}/>; })}</View>)}
        {line.map(i => <View key={`stroke-${i}`} testID={`stroke-${i}`} pointerEvents="none" accessible={false} style={{ position: 'absolute', left: i % spec.columns * cell, top: Math.floor(i / spec.columns) * cell, width: cell, height: cell, backgroundColor: state.tool === 1 ? '#246858' : '#FFFDF7', opacity: .7, borderWidth: 2, borderColor: C.gold }}/>) }
        {!corners?.size && <GridLines rows={spec.rows} columns={spec.columns} cell={cell} borders={typeof borders === 'function' ? borders(cell) : borders} {...(feel ? { stroke: LINE } : {})}/>}
        {overlay && <View pointerEvents="none" accessible={false} style={{ position: 'absolute', left: 0, top: 0, width: spec.columns * cell, height: spec.rows * cell }}>{overlay(cell)}</View>}
        {!!corners?.size && <View pointerEvents="none" accessible={false} style={{ position: 'absolute', left: 0, top: 0, width: spec.columns * cell, height: spec.rows * cell }}>{[...corners!].map(([i, clue]) => {
          const hasNotes = !!state.notes[i], tint = tints?.get(i) ?? 0;
          const background = cellFill({ paint: false, value: state.values[i], tint, selected: state.selected === i, peer: peerOf(i), given: !!spec.givens[i] });
          return <Text key={i} testID={`corner-clue-${i}`} allowFontScaling={false} numberOfLines={1} style={{ position: 'absolute', left: i % spec.columns * cell + (hasNotes ? 0 : clue.left), top: Math.floor(i / spec.columns) * cell + (hasNotes ? 0 : clue.top), width: clue.width, height: hasNotes ? clue.fontSize : clue.lineHeight, fontSize: clue.fontSize, lineHeight: hasNotes ? clue.fontSize : clue.lineHeight, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'], ...(hasNotes ? { backgroundColor: background } : {}) }}>{clue.text}</Text>;
        })}</View>}
        {!!corners?.size && <GridLines rows={spec.rows} columns={spec.columns} cell={cell} borders={typeof borders === 'function' ? borders(cell) : borders} {...(feel ? { stroke: LINE } : {})}/>}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: cell, height: cell, borderWidth: 3, borderColor: C.gold }, cursorStyle]}/>
        {feel && pop && <feel.Pop left={pop.at % spec.columns * cell} top={Math.floor(pop.at / spec.columns) * cell} size={cell} nonce={pop.nonce}/>}
      </Animated.View>
      <BoardPanView testID="cove-grid-input" accessible={false} importantForAccessibility="no" tabIndex={Platform.OS === 'web' ? 0 : undefined} onPointerDown={Platform.OS === 'web' ? e => e.currentTarget.focus() : undefined} pan={responder} enabled={active} {...(active ? responder.panHandlers : {})} style={{ position: 'absolute', inset: 0 }}/>
    </View>
    </Framed>
    </View>
    {(enlarged || line.length > 0) && <Copy>Enlarged row {Math.floor((line[0] ?? state.selected) / spec.columns) + 1}: {state.values.slice(Math.floor((line[0] ?? state.selected) / spec.columns) * spec.columns, (Math.floor((line[0] ?? state.selected) / spec.columns) + 1) * spec.columns).map(v => spec.symbols[v - 1] ?? '·').join('  ')}</Copy>}
    {!large && zoomControls}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: Math.min(outer, 560), alignSelf: 'center' }}>{[...spec.symbols, 'Erase'].map((symbol, i) => { const erasing = i === spec.symbols.length, value = erasing ? 0 : i + 1; return <Button key={i} compact stillOnly selected={first && state.tool === value} disabled={!active} style={{ minWidth: 52, minHeight: 56, width: padWidth, ...(erasing || large && symbol.length > 1 ? { paddingHorizontal: 4 } : {}), ...(feel ? KEY_LIP : {}) }} textStyle={symbol.length === 1 ? { fontSize: 26 } : undefined} maxFontSizeMultiplier={erasing ? eraseMax : symbol.length === 1 || !large ? buttonMax : wordFitMultiplier(symbol, 15, padWidth - 10, 1.3)} {...(erasing ? { numberOfLines: 1, icon: eraseIcon ? 'erase' as const : undefined } : {})} label={erasing ? 'Erase' : `${state.pencil ? 'Note' : 'Enter'} ${symbol}`}  onPress={() => first || spec.kind === 'paint' || spec.kind === 'cells' ? dispatch({ type: 'tool', value }) : send({ type: 'write', cells: [state.selected], value })}>{erasing && eraseIcon ? null : symbol}</Button>; })}</View>
    {large && zoomControls}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{!hosted && <Button quiet compact maxFontSizeMultiplier={buttonMax} disabled={!active || !state.undo.length} onPress={() => send({ type: 'undo' })}>Undo</Button>}<Button quiet compact maxFontSizeMultiplier={buttonMax} disabled={!active || !state.redo.length} onPress={() => send({ type: 'redo' })}>Redo</Button>{spec.kind === 'digits' && <><Button quiet compact maxFontSizeMultiplier={buttonMax} selected={state.pencil} disabled={!active} onPress={() => send({ type: 'pencil' })}>Notes {state.pencil ? 'on' : 'off'}</Button><Button quiet compact maxFontSizeMultiplier={buttonMax} selected={first} disabled={!active} onPress={() => setFirst(value => !value)}>Number first {first ? 'on' : 'off'}</Button></>}</View>
    {adult && preferences.reader === 'Grown-up' && preferences.fillNotes && fillNotes && <Button quiet disabled={!active} onPress={fillNotes}>Fill notes</Button>}
    {mistakes === 'Rewind' && conflicts.length > 0 && <><Copy>You can undo and try another idea. There is no mistake limit.</Copy><Button quiet disabled={!state.undo.length} onPress={() => send({ type: 'undo' })}>Rewind one step</Button></>}
    {!hosted && <Copy maxFontSizeMultiplier={1.5}>{spec.kind === 'paint' ? 'Choose a mark, then paint a line. Undo keeps the whole stroke together.' : Platform.OS === 'web' ? 'Select a cell, then use the large pad. Keyboard: arrows, symbols, N for notes, Command-Z to undo.' : 'Select a cell, then use the large pad. Hardware keyboard: symbols, Backspace, N for notes. Use the Undo and Redo buttons.'}</Copy>}
  </View>;
}
