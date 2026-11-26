import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions,
} from 'react-native';
import { TextFit } from '../../components/Text';
import { CHROME_MAX, LARGE_TEXT, wordFitMultiplier } from '../../components/wordFit';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { ArrowLeft } from '../../ui/icons';
import { Sheet } from '../../ui/Sheet';
import { Text } from '../../ui/Text';
import { theme } from '../../ui/theme';
import {
  activeCrosswordClue,
  checkCrossword,
  CROSSWORD_LOCK,
  crosswordClueText,
  crosswordLetter,
  isCrosswordComplete,
  type CrosswordAction,
  type CrosswordFeedback,
  type CrosswordPuzzle,
  type CrosswordState,
} from './engine';

const { colors, space, target } = theme;
const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM⌫'];
const KEY_GAP = 2;
const HINTS = [
  { hint: 'check-letter', label: 'Check letter' },
  { hint: 'reveal-letter', label: 'Reveal letter' },
  { hint: 'reveal-word', label: 'Reveal word' },
] as const;
const MISTAKE_MODES = [
  { value: 'neutral', label: 'Check when I ask' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'rewind', label: 'Rewind mode' },
] as const;

export type CrosswordBoardProps = {
  puzzle: CrosswordPuzzle;
  state: CrosswordState;
  dispatch: (action: CrosswordAction) => void;
  active?: boolean;
  /** Space inside the host's safe areas and chrome, in points. Defaults to the window. */
  width?: number;
  height?: number;
};

function feedbackText(feedback: CrosswordFeedback | null): string {
  switch (feedback?.type) {
    case 'incomplete':
      return feedback.blanks === 1 ? '1 square still empty' : `${feedback.blanks} squares still empty`;
    case 'check':
      if (feedback.wrong === 1) return '1 letter to fix';
      return feedback.wrong ? `${feedback.wrong} letters to fix` : 'All letters are right';
    case 'check-letter':
      if (feedback.result === 'blank') return 'Choose a filled square';
      return feedback.result === 'correct' ? 'That letter is right' : 'Try another letter';
    case 'reveal-letter':
      return 'Letter revealed';
    case 'reveal-word':
      return 'Word revealed';
    case 'already-revealed':
      return 'Already revealed';
    case 'rewind':
      if (feedback.result === 'clear') return 'All filled letters are right';
      return feedback.result === 'restored' ? 'Back to your last correct draft' : 'No correct draft left in Undo';
    default:
      return '';
  }
}

type BoardControls = Pick<CrosswordBoardProps, 'puzzle' | 'state' | 'dispatch'> & { enabled: boolean };

function CrosswordGrid({ puzzle, state, cellSize, dispatch, enabled }: BoardControls & { cellSize: number }) {
  const clue = activeCrosswordClue(puzzle, state.cursor);
  const conflicts = state.mistakes === 'friendly' && state.helpUsed
    ? new Set(checkCrossword(puzzle, state).wrong) : null;
  const numberSize = Math.min(14, Math.max(8, Math.floor(cellSize * 0.27)));
  const letterSize = Math.min(34, Math.floor(cellSize * 0.57));
  const size = { width: cellSize, height: cellSize };
  return (
    <View style={[styles.grid, { width: cellSize * puzzle.size + 2 }]} testID="crossword-grid"
      tabIndex={enabled ? 0 : -1} accessibilityLabel="Crossword grid"
      accessibilityHint={Platform.OS === 'web' ? 'Tab changes clues. Escape returns to the toolbar.' : undefined}>
      {Array.from({ length: puzzle.size }, (_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: puzzle.size }, (_, col) => {
            const cell = row * puzzle.size + col;
            const crossing = puzzle.crossings[cell];
            if (!crossing) return <View key={cell} style={[size, styles.block]} />;
            const containingClue = puzzle.clues[crossing[state.cursor.direction]];
            const letter = crosswordLetter(state.cells[cell]);
            const selected = cell === state.cursor.cell;
            const wrong = conflicts?.has(cell);
            const locked = state.cells[cell] >= CROSSWORD_LOCK;
            const number = puzzle.numbers[cell];
            const position = `Row ${row + 1}, Column ${col + 1}, ${containingClue.number} ${containingClue.direction}`;
            return (
              <Pressable
                key={cell}
                testID={`crossword-cell-${cell}`}
                accessibilityRole="button"
                accessibilityLabel={`${position}, ${letter || 'blank'}${locked ? ', revealed' : ''}${wrong ? ', try again' : ''}`}
                accessibilityState={{ selected, disabled: !enabled }}
                accessibilityHint={selected ? 'Activate to change clue direction' : undefined}
                disabled={!enabled}
                tabIndex={-1}
                onPress={() => dispatch({ type: 'select', cell })}
                style={[
                  styles.cell, size, clue.cells.includes(cell) && styles.activeWord,
                  locked && styles.lockedCell, wrong && styles.conflictCell,
                ]}
              >
                {!!number && <Text allowFontScaling={false} style={[styles.number, { fontSize: numberSize, lineHeight: numberSize + 1 }]}>{number}</Text>}
                <Text
                  allowFontScaling={false}
                  style={[
                    styles.letter,
                    { fontSize: letterSize, lineHeight: letterSize + 2, marginTop: numberSize + 1 },
                    locked && styles.lockedLetter, wrong && styles.conflictLetter,
                  ]}
                >
                  {letter}
                </Text>
                {selected && <View pointerEvents="none" testID="crossword-cell-focus" style={styles.cellFocus} />}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function GridViewport({ fitCell, zoom, width, ...props }: BoardControls & {
  fitCell: number;
  zoom: boolean;
  width: number;
}) {
  const horizontal = useRef<ScrollView>(null);
  const vertical = useRef<ScrollView>(null);
  const offset = useRef({ x: 0, y: 0 });
  const { size } = props.puzzle;
  const { cell } = props.state.cursor;
  const cellSize = zoom ? target.min : fitCell;
  const gridSize = cellSize * size + 2;
  const viewportWidth = Math.min(gridSize, width);
  const viewportHeight = fitCell * size + 2;
  useEffect(() => {
    if (!zoom) {
      offset.current = { x: 0, y: 0 };
      return;
    }
    const bringIntoView = (index: number, start: number, span: number) => {
      const near = index * cellSize + 1;
      const far = near + cellSize;
      if (near < start) return near - 1;
      if (far > start + span) return Math.min(gridSize - span, far + 1 - span);
      return start;
    };
    const x = bringIntoView(cell % size, offset.current.x, viewportWidth);
    const y = bringIntoView(Math.floor(cell / size), offset.current.y, viewportHeight);
    if (x !== offset.current.x) horizontal.current?.scrollTo({ x, animated: false });
    if (y !== offset.current.y) vertical.current?.scrollTo({ y, animated: false });
    offset.current = { x, y };
  }, [cell, cellSize, gridSize, size, viewportHeight, viewportWidth, zoom]);

  const grid = <CrosswordGrid {...props} cellSize={cellSize} />;
  if (!zoom) return grid;
  return (
    <ScrollView ref={vertical} testID="crossword-vertical-pan" nestedScrollEnabled scrollEventThrottle={16}
      style={{ width: viewportWidth, height: viewportHeight, flexGrow: 0 }}
      onScroll={event => { offset.current.y = event.nativeEvent.contentOffset.y; }}>
      <ScrollView ref={horizontal} testID="crossword-horizontal-pan" horizontal nestedScrollEnabled scrollEventThrottle={16}
        style={{ width: viewportWidth, height: gridSize, flexGrow: 0 }}
        onScroll={event => { offset.current.x = event.nativeEvent.contentOffset.x; }}>
        {grid}
      </ScrollView>
    </ScrollView>
  );
}

function CrosswordKeyboard({ width, dispatch, enabled }: Pick<BoardControls, 'dispatch' | 'enabled'> & { width: number }) {
  const keyWidth = Math.min(56, Math.floor((width - KEY_GAP * 9) / 10));
  return (
    <View testID="crossword-keyboard" style={styles.keyboard}>
      {KEY_ROWS.map((row, index) => (
        <View key={row} testID={`crossword-key-row-${index}`} style={styles.keyRow}>
          {[...row].map(key => {
            const erase = key === '⌫';
            return (
              <Pressable key={key} accessibilityRole="button" accessibilityLabel={erase ? 'Backspace' : `Enter ${key}`}
                accessibilityState={{ disabled: !enabled }} disabled={!enabled} tabIndex={-1}
                onPress={() => dispatch(erase ? { type: 'backspace' } : { type: 'type', letter: key })}
                style={({ pressed }) => [styles.key, { width: keyWidth }, pressed && styles.pressed]}>
                <Text maxFontSizeMultiplier={wordFitMultiplier(key, theme.type.body.fontSize, keyWidth, CHROME_MAX)}>{key}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function keyboardAction(event: KeyboardEvent): CrosswordAction | undefined {
  if (event.altKey || event.isComposing) return;
  if (event.ctrlKey || event.metaKey) {
    if (event.key.toLowerCase() === 'z' && !event.shiftKey) return { type: 'undo' };
    return;
  }
  switch (event.key) {
    case 'Backspace': return { type: 'backspace' };
    case 'ArrowUp': return { type: 'move', direction: 'up' };
    case 'ArrowDown': return { type: 'move', direction: 'down' };
    case 'ArrowLeft': return { type: 'move', direction: 'left' };
    case 'ArrowRight': return { type: 'move', direction: 'right' };
    case 'Tab': return { type: 'clue', step: event.shiftKey ? -1 : 1 };
    case ' ': return { type: 'toggle-direction' };
    default: if (/^[a-z]$/i.test(event.key)) return { type: 'type', letter: event.key };
  }
}

function useCrosswordAnnouncements(active: boolean, clue: string, status: string) {
  const [screenReader, setScreenReader] = useState(false);
  const last = useRef({ clue: '', status: '' });
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let listening = true;
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    void AccessibilityInfo.isScreenReaderEnabled().then(enabled => {
      if (listening) setScreenReader(enabled);
    });
    return () => {
      listening = false;
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    if (!active || !screenReader) return;
    const announcement = [
      status !== last.current.status && status,
      clue !== last.current.clue && clue,
    ].filter(Boolean).join(' ');
    last.current = { clue, status };
    if (announcement) AccessibilityInfo.announceForAccessibility(announcement);
  }, [active, clue, status, screenReader]);
}

function ClueArrow({ step, enabled, dispatch }: Pick<BoardControls, 'enabled' | 'dispatch'> & { step: -1 | 1 }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={step === -1 ? 'Previous clue' : 'Next clue'}
      accessibilityState={{ disabled: !enabled }} disabled={!enabled} style={styles.clueArrow}
      onPress={() => dispatch({ type: 'clue', step })}>
      <View style={step === 1 ? styles.nextArrow : undefined}><Icon glyph={ArrowLeft} tone="lagoon" /></View>
    </Pressable>
  );
}

export function CrosswordBoard({ puzzle, state, dispatch, active = true, width: availableWidth, height: availableHeight }: CrosswordBoardProps) {
  const window = useWindowDimensions();
  const width = availableWidth ?? window.width;
  const height = availableHeight ?? window.height;
  const root = useRef<View>(null);
  const [panel, setPanel] = useState<{ kind: 'hint' | 'more'; open: boolean }>({ kind: 'hint', open: false });
  const [enlarged, setEnlarged] = useState(false);
  const activeClue = activeCrosswordClue(puzzle, state.cursor);
  const reading = crosswordClueText(puzzle, state, activeClue);
  const cluePosition = `${activeClue.number} ${activeClue.direction}`;
  const clueLabel = `${cluePosition}. ${reading}`;
  const complete = isCrosswordComplete(puzzle, state);
  const enabled = active && !complete;
  const status = complete ? 'Puzzle complete!' : feedbackText(state.feedback);
  const closePanel = useCallback(() => setPanel(previous => previous.open ? { ...previous, open: false } : previous), []);
  const send = useCallback((action: CrosswordAction) => {
    if (enabled) dispatch(action);
  }, [dispatch, enabled]);

  useCrosswordAnnouncements(active, clueLabel, status);

  // Clear the open sheet as part of deactivation so it stays closed when the board resumes.
  if (!enabled && panel.open) setPanel({ ...panel, open: false });

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled || typeof document === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      const scope = root.current as unknown as HTMLElement | null;
      const element = event.target as HTMLElement | null;
      if (event.defaultPrevented || panel.open || !scope?.contains(element)
        || !element?.closest?.('[data-testid="crossword-grid"], [data-testid="crossword-keyboard"]')) return;
      // Sheet owns Escape while open. From the grid, Escape leaves clue navigation for the toolbar.
      if (event.key === 'Escape') {
        event.preventDefault();
        scope.querySelector<HTMLElement>('[data-testid="crossword-more"]')?.focus();
        return;
      }
      const action = keyboardAction(event);
      if (!action) return;
      event.preventDefault();
      send(action);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled, panel.open, send]);

  const largeText = window.fontScale >= LARGE_TEXT;
  const sideBySide = !largeText && (width >= 880 || (width >= 560 && height < width * 0.75));
  const controlsWidth = sideBySide ? Math.min(580, Math.floor((width - space.lg) * 0.46)) : width;
  const boardWidth = sideBySide ? width - controlsWidth - space.lg : width;
  const fitsByWidth = Math.max(1, Math.floor((boardWidth - 2) / puzzle.size));
  const showViewportTools = fitsByWidth < target.min || state.mistakes === 'rewind';
  // Budget the clue bar and first key row before sizing the grid. Short views can scroll the full page.
  const stackedChrome = (largeText ? 182 : 140) + target.min + (showViewportTools ? 48 : 0)
    + (state.playTogether ? 52 : 0);
  const floor = fitsByWidth >= target.min ? target.min : 23;
  const boardHeight = height - (sideBySide ? 60 : stackedChrome);
  const fitCell = Math.min(fitsByWidth, Math.max(floor, Math.floor((boardHeight - 2) / puzzle.size)));
  const zoom = fitCell < target.min && enlarged;
  const clueWidth = controlsWidth - 2 * target.min - 6 * space.xs;
  const sheetFit = { width: Math.min(window.width, theme.sheet.maxWidth) - 4 * space.xl, ceiling: CHROME_MAX };
  const controls = { puzzle, state, enabled, dispatch: send };
  const liveRegion = Platform.OS === 'web' ? 'polite' : undefined;
  const openPanel = panel.open ? panel.kind : null;
  const togglePanel = (next: 'hint' | 'more') => {
    if (enabled) setPanel(previous => ({ kind: next, open: !previous.open || previous.kind !== next }));
  };

  return (
    <View ref={root} testID="crossword-board" style={[styles.root, { width, height }]}>
      <TextFit.Provider value={{ width: width - 2 * space.sm, ceiling: CHROME_MAX }}>
        <ScrollView style={styles.scroller} contentContainerStyle={styles.content} nestedScrollEnabled>
          <View style={styles.toolbar}>
            <Text variant="caption" tone="muted" accessibilityRole="header">{puzzle.tier}</Text>
            <Button label="Undo" variant="quiet" target="min" style={styles.toolbarButton}
              disabled={!enabled || !state.undo.length} onPress={() => send({ type: 'undo' })} />
            <Button label="Check" variant="quiet" target="min" style={styles.toolbarButton}
              disabled={!enabled} onPress={() => send({ type: 'check' })} />
            <Button label="Hint" variant={openPanel === 'hint' ? 'secondary' : 'quiet'} target="min" style={styles.toolbarButton}
              disabled={!enabled} selected={openPanel === 'hint'} onPress={() => togglePanel('hint')} />
            <Button label="More" testID="crossword-more" variant={openPanel === 'more' ? 'secondary' : 'quiet'} target="min" style={styles.toolbarButton}
              disabled={!enabled} selected={openPanel === 'more'} onPress={() => togglePanel('more')} />
          </View>
          {showViewportTools && (
            <View style={styles.toolbar}>
              {fitCell < target.min && <Button label={zoom ? 'Fit whole grid' : 'Enlarge cells'} variant="secondary" target="min"
                style={styles.toolbarButton} selected={zoom} onPress={() => setEnlarged(!zoom)} />}
              {state.mistakes === 'rewind' && <Button label="Rewind" variant="quiet" target="min"
                style={styles.toolbarButton} disabled={!enabled} onPress={() => send({ type: 'rewind' })} />}
            </View>
          )}
          <View style={[styles.playArea, sideBySide && styles.playAreaWide]}>
            <GridViewport {...controls} fitCell={fitCell} zoom={zoom} width={boardWidth} />
            <View style={[styles.dock, { width: controlsWidth }]}>
              {!!status && (
                <Text variant="caption" accessibilityLiveRegion={liveRegion} testID="crossword-status"
                  style={[styles.status, complete && styles.completed]}>{status}</Text>
              )}
              {state.playTogether && (
                <View style={styles.toolbar}>
                  <Button label="Easy clue" target="min" style={styles.toolbarButton} disabled={!enabled}
                    variant={state.clueLevel === 'easy' ? 'secondary' : 'quiet'} selected={state.clueLevel === 'easy'}
                    onPress={() => send({ type: 'clue-level', value: 'easy' })} />
                  <Button label="Harder clue" target="min" style={styles.toolbarButton} disabled={!enabled}
                    variant={state.clueLevel === 'harder' ? 'secondary' : 'quiet'} selected={state.clueLevel === 'harder'}
                    onPress={() => send({ type: 'clue-level', value: 'harder' })} />
                </View>
              )}
              <View testID="crossword-clue-bar" style={styles.clueBar}>
                <ClueArrow step={-1} enabled={enabled} dispatch={send} />
                <View style={styles.clue} accessible accessibilityLiveRegion={liveRegion} accessibilityLabel={clueLabel}>
                  <Text variant="caption" tone="lagoon" testID="crossword-clue-number"
                    maxFontSizeMultiplier={wordFitMultiplier(cluePosition, theme.type.caption.fontSize, clueWidth, CHROME_MAX)}>{cluePosition}</Text>
                  <Text testID="crossword-clue-text"
                    maxFontSizeMultiplier={wordFitMultiplier(reading, theme.type.body.fontSize, clueWidth, CHROME_MAX)}>{reading}</Text>
                </View>
                <ClueArrow step={1} enabled={enabled} dispatch={send} />
              </View>
              <CrosswordKeyboard width={controlsWidth} dispatch={send} enabled={enabled} />
            </View>
          </View>
        </ScrollView>
      </TextFit.Provider>
      <TextFit.Provider value={sheetFit}>
        <Sheet visible={enabled && panel.open} mode="small" onClose={closePanel} title={panel.kind === 'hint' ? 'Hint' : 'More'}>
          {panel.kind === 'hint' ? HINTS.map(({ label, hint }) => (
            <Button key={hint} label={label} variant="secondary" target="min" disabled={!enabled || !panel.open}
              onPress={() => { send({ type: 'hint', hint }); closePanel(); }} />
          )) : (
            <>
              {MISTAKE_MODES.map(({ value, label }) => (
                <Button key={value} label={label} target="min" disabled={!enabled || !panel.open} selected={state.mistakes === value}
                  variant={state.mistakes === value ? 'secondary' : 'quiet'}
                  onPress={() => send({ type: 'mistakes', value })} />
              ))}
              <Button label="Skip filled letters" target="min" disabled={!enabled || !panel.open} selected={state.skipFilled}
                variant={state.skipFilled ? 'secondary' : 'quiet'}
                onPress={() => send({ type: 'skip-filled', value: !state.skipFilled })} />
              <Button label="Play together" target="min" disabled={!enabled || !panel.open} selected={state.playTogether}
                variant={state.playTogether ? 'secondary' : 'quiet'}
                onPress={() => send({ type: 'play-together', value: !state.playTogether })} />
            </>
          )}
        </Sheet>
      </TextFit.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexShrink: 1, alignSelf: 'center', backgroundColor: colors.bg },
  scroller: { flex: 1 },
  content: { gap: space.sm, paddingBottom: space.sm },
  row: { flexDirection: 'row' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: space.xs },
  toolbarButton: { paddingHorizontal: space.sm, paddingVertical: space.xs },
  playArea: { alignItems: 'center', gap: space.sm },
  playAreaWide: { flexDirection: 'row', justifyContent: 'center', gap: space.lg },
  grid: { borderWidth: 1, borderColor: colors.ink, backgroundColor: colors.ink, alignSelf: 'center' },
  block: { backgroundColor: colors.ink },
  cell: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.muted },
  activeWord: { backgroundColor: colors.lagoonSoft },
  lockedCell: { backgroundColor: colors.successSoft },
  conflictCell: { backgroundColor: colors.conflictSoft },
  cellFocus: { ...StyleSheet.absoluteFill, borderWidth: 2, borderColor: colors.lagoon },
  number: { position: 'absolute', left: 2, top: 0, includeFontPadding: false },
  letter: { fontWeight: '800', includeFontPadding: false },
  lockedLetter: { color: colors.success },
  conflictLetter: { color: colors.conflict, textDecorationLine: 'underline' },
  dock: { gap: space.xs, flexShrink: 0 },
  status: { alignSelf: 'center', textAlign: 'center', fontWeight: '700' },
  completed: { color: colors.success },
  clueBar: { backgroundColor: colors.lagoonSoft, borderRadius: theme.radius.tile, flexDirection: 'row', alignItems: 'center', padding: space.xs, gap: space.xs },
  clue: { flex: 1, minWidth: 0, padding: space.xs },
  clueArrow: { width: target.min, height: target.min, alignItems: 'center', justifyContent: 'center' },
  nextArrow: { transform: [{ rotate: '180deg' }] },
  keyboard: { gap: KEY_GAP },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: KEY_GAP },
  key: { minHeight: target.min, backgroundColor: colors.surface, borderRadius: space.sm, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: colors.lagoonSoft },
});
