import React, { useMemo, useState } from 'react';
import {
  PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions,
} from 'react-native';
import { Icon, type IconName } from '../../components/Icon';
import { Text } from '../../components/Text';
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

// Clean 4.0 palette. The integration branch can source these roles directly from the shared UI kit.
const color = {
  bg: '#FFFDF8', surface: '#FFFFFF', hairline: '#ECE7DC',
  ink: '#173330', muted: '#5B6B68', lagoon: '#1E6B66', lagoonSoft: '#DDF1EE',
  success: '#1E6B43', successSoft: '#DDF5E6', conflict: '#B53708', conflictSoft: '#FFE0EC',
};
const KEYS = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
const GAP = 4;
const KEY_GAP = 2;
const MIN_KEY = 44;

const HINTS = [
  { hint: 'check-letter', label: 'Check letter' },
  { hint: 'reveal-letter', label: 'Reveal letter' },
  { hint: 'reveal-word', label: 'Reveal word' },
] as const;

export type CrosswordBoardProps = {
  puzzle: CrosswordPuzzle;
  state: CrosswordState;
  dispatch: (action: CrosswordAction) => void;
  /** Space inside the host's safe areas and chrome, in points. Defaults to the window. */
  width?: number;
  height?: number;
};

function ActionButton({ label, icon, onPress, selected, disabled = false, compact = false }: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button, compact && styles.squareButton, selected && styles.selectedButton,
        pressed && styles.pressed, disabled && styles.disabled,
      ]}
    >
      {icon ? <Icon name={icon} color={color.ink} /> : <Text style={styles.buttonLabel}>{label}</Text>}
    </Pressable>
  );
}

function feedbackText(feedback: CrosswordFeedback | null): string {
  if (!feedback) return '';
  switch (feedback.type) {
    case 'check':
      if (feedback.wrong) return feedback.wrong === 1 ? '1 letter to try again' : `${feedback.wrong} letters to try again`;
      return 'No wrong letters';
    case 'check-letter':
      if (feedback.result === 'blank') return 'Choose a filled square';
      return feedback.result === 'correct' ? 'That letter is right' : 'Try another letter';
    case 'reveal-letter':
      return 'Letter revealed';
    case 'reveal-word':
      return 'Word revealed';
  }
}

function CrosswordGrid({ puzzle, state, cellSize, dispatch }: Pick<CrosswordBoardProps, 'puzzle' | 'state' | 'dispatch'> & {
  cellSize: number;
}) {
  const clue = activeCrosswordClue(puzzle, state.cursor);
  const conflicts = state.mistakes === 'friendly' ? new Set(checkCrossword(puzzle, state).wrong) : new Set<number>();
  const gridWidth = cellSize * puzzle.size + 2;
  return (
    <View style={[styles.grid, { width: gridWidth }]} testID="crossword-grid">
      {Array.from({ length: puzzle.size }, (_, row) => (
        <View key={row} style={styles.gridRow}>
          {Array.from({ length: puzzle.size }, (_, col) => {
            const cell = row * puzzle.size + col;
            const crossing = puzzle.crossings[cell];
            const size = { width: cellSize, height: cellSize };
            if (!crossing) return <View key={cell} style={[size, styles.block]} />;
            const containingClue = puzzle.clues[crossing[state.cursor.direction]];
            const letter = crosswordLetter(state.cells[cell]);
            const selected = cell === state.cursor.cell;
            const wrong = conflicts.has(cell);
            const locked = state.cells[cell] >= CROSSWORD_LOCK;
            const number = puzzle.numbers[cell];
            const position = `Row ${row + 1}, Column ${col + 1}, ${containingClue.number} ${containingClue.direction}`;
            return (
              <Pressable
                key={cell}
                testID={`crossword-cell-${cell}`}
                accessibilityRole="button"
                accessibilityLabel={`${position}, ${letter || 'blank'}${locked ? ', revealed' : ''}${wrong ? ', try again' : ''}`}
                accessibilityState={{ selected }}
                accessibilityHint={selected ? 'Double tap to change clue direction' : undefined}
                onPress={() => dispatch({ type: 'select', cell })}
                style={[
                  styles.cell, size, clue.cells.includes(cell) && styles.activeWord,
                  locked && styles.lockedCell, wrong && styles.conflictCell,
                  selected && styles.activeCell,
                ]}
              >
                {!!number && <Text allowFontScaling={false} style={[styles.number, { fontSize: Math.min(12, Math.max(8, cellSize * 0.27)) }]}>{number}</Text>}
                <Text
                  allowFontScaling={false}
                  style={[
                    styles.letter,
                    { fontSize: Math.min(34, Math.floor(cellSize * 0.61)), marginTop: cellSize * 0.16 },
                    locked && styles.lockedLetter, wrong && styles.conflictLetter,
                  ]}
                >
                  {letter}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function CrosswordKeyboard({ width, columns, dispatch }: Pick<CrosswordBoardProps, 'dispatch'> & {
  width: number;
  columns: number;
}) {
  const keyWidth = Math.min(72, Math.max(MIN_KEY, Math.floor((width - KEY_GAP * (columns - 1)) / columns)));

  return (
    <View accessibilityLabel="Crossword keyboard" testID="crossword-keyboard" style={styles.keyboard}>
      {[...KEYS, 'Backspace'].map(key => {
        const erase = key === 'Backspace';
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={erase ? 'Backspace' : `Enter ${key}`}
            onPress={() => dispatch(erase ? { type: 'backspace' } : { type: 'type', letter: key })}
            style={({ pressed }) => [
              styles.key, { width: keyWidth }, pressed && styles.pressed,
            ]}
          >
            {erase
              ? <Icon name="erase" color={color.ink} />
              : <Text maxFontSizeMultiplier={1.7} style={styles.keyLabel}>{key}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

export function CrosswordBoard({ puzzle, state, dispatch, width: availableWidth, height: availableHeight }: CrosswordBoardProps) {
  const window = useWindowDimensions();
  const width = Math.min(984, availableWidth ?? window.width);
  const height = availableHeight ?? window.height;
  const [panel, setPanel] = useState<'hint' | 'more' | null>(null);
  const swipeDown = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, { dx, dy }) => dy > 12 && dy > Math.abs(dx) * 1.5,
    onPanResponderRelease: (_, { dy }) => {
      if (dy >= 48) setPanel(null);
    },
    onPanResponderTerminationRequest: () => true,
  }), []);
  const activeClue = activeCrosswordClue(puzzle, state.cursor);
  const complete = isCrosswordComplete(puzzle, state);
  const status = complete ? 'Puzzle complete!' : feedbackText(state.feedback);
  const wide = (width >= 720 || (width >= 560 && height < width * 0.75)) && window.fontScale < 1.5;
  const controlsWidth = wide ? Math.floor((width - 16) * 0.51) : width;
  const boardWidth = wide ? width - controlsWidth - 16 : width;
  const columns = Math.min(9, Math.max(1, Math.floor((controlsWidth + KEY_GAP) / (MIN_KEY + KEY_GAP))));
  const keyboardRows = Math.ceil((KEYS.length + 1) / columns);
  const dockHeight = 88 + keyboardRows * (MIN_KEY + KEY_GAP) + (state.playTogether ? 52 : 0) + (status ? 24 : 0);
  const boardHeight = panel ? height * 0.48 : wide ? height - 60 : height - dockHeight - 60;
  const minBoard = puzzle.size * (puzzle.size <= 5 ? 44 : 23) + 2;
  const boardBudget = Math.min(boardWidth, 400, Math.max(minBoard, boardHeight));
  const cellSize = Math.floor((boardBudget - 2) / puzzle.size);
  const togglePanel = (value: 'hint' | 'more') => setPanel(previous => previous === value ? null : value);

  return (
    <View style={[styles.root, { width, maxHeight: height }]}>
      <ScrollView style={styles.scroller} contentContainerStyle={styles.content}>
        <View style={styles.toolbar}>
          <Text accessibilityRole="header" style={styles.tier}>{puzzle.tier}</Text>
          <ActionButton label="Undo" disabled={!state.undo.length} onPress={() => dispatch({ type: 'undo' })} />
          <ActionButton label="Check" onPress={() => dispatch({ type: 'check' })} />
          <ActionButton label="Hint" selected={panel === 'hint'} onPress={() => togglePanel('hint')} />
          <ActionButton label="More" selected={panel === 'more'} onPress={() => togglePanel('more')} />
        </View>
        <View style={[styles.playArea, wide && styles.playAreaWide]}>
          <CrosswordGrid puzzle={puzzle} state={state} cellSize={cellSize} dispatch={dispatch} />
          <View style={[styles.dock, { width: controlsWidth }]}>
            {!!status && (
              <Text accessibilityLiveRegion="polite" style={[styles.status, complete && styles.completed]}>{status}</Text>
            )}
            {state.playTogether && (
              <View style={styles.settingsRow}>
                <ActionButton label="Easy clue" selected={state.clueLevel === 'easy'} onPress={() => dispatch({ type: 'clue-level', value: 'easy' })} />
                <ActionButton label="Harder clue" selected={state.clueLevel === 'harder'} onPress={() => dispatch({ type: 'clue-level', value: 'harder' })} />
              </View>
            )}
            <View testID="crossword-clue-bar" style={styles.clueBar}>
              <ActionButton label="Previous clue" icon="left" compact onPress={() => dispatch({ type: 'clue', step: -1 })} />
              <View style={styles.clue} accessible accessibilityLiveRegion="polite"
                accessibilityLabel={`${activeClue.number} ${activeClue.direction}. ${crosswordClueText(puzzle, state, activeClue)}`}>
                <Text style={styles.clueNumber}>{activeClue.number} {activeClue.direction}</Text>
                <Text style={styles.clueText}>{crosswordClueText(puzzle, state, activeClue)}</Text>
              </View>
              <ActionButton label="Next clue" icon="right" compact onPress={() => dispatch({ type: 'clue', step: 1 })} />
            </View>
            {!panel && <CrosswordKeyboard width={controlsWidth} columns={columns} dispatch={dispatch} />}
          </View>
        </View>
      </ScrollView>
      {panel && (
        <View style={[styles.panel, { maxHeight: height * 0.4 }]} testID={`crossword-${panel}-panel`}>
          <View {...swipeDown.panHandlers} testID="crossword-panel-grabber" style={styles.grabberTarget}>
            <View style={styles.grabber} />
          </View>
          <ScrollView style={styles.scroller} contentContainerStyle={styles.panelContent}>
            {panel === 'hint' ? HINTS.map(({ label, hint }) => (
              <ActionButton key={hint} label={label} onPress={() => { dispatch({ type: 'hint', hint }); setPanel(null); }} />
            )) : (
              <>
                <ActionButton label="Check when I ask" selected={state.mistakes === 'neutral'} onPress={() => dispatch({ type: 'mistakes', value: 'neutral' })} />
                <ActionButton label="Friendly" selected={state.mistakes === 'friendly'} onPress={() => dispatch({ type: 'mistakes', value: 'friendly' })} />
                <ActionButton label="Skip filled letters" selected={state.skipFilled} onPress={() => dispatch({ type: 'skip-filled', value: !state.skipFilled })} />
                <ActionButton label="Play together" selected={state.playTogether} onPress={() => dispatch({ type: 'play-together', value: !state.playTogether })} />
              </>
            )}
          </ScrollView>
          <ActionButton label="Done" onPress={() => setPanel(null)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexShrink: 1, alignSelf: 'center', backgroundColor: color.bg },
  scroller: { flexGrow: 0, flexShrink: 1 },
  content: { gap: 8, paddingBottom: 4 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: GAP },
  tier: { color: color.muted, fontSize: 15, fontWeight: '700', paddingHorizontal: 8 },
  button: { minWidth: MIN_KEY, minHeight: MIN_KEY, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface, borderRadius: 24, paddingHorizontal: 10, paddingVertical: 6 },
  buttonLabel: { color: color.ink, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  selectedButton: { backgroundColor: color.lagoonSoft },
  squareButton: { width: MIN_KEY, paddingHorizontal: 0 },
  disabled: { opacity: 0.48 },
  pressed: { backgroundColor: color.lagoonSoft },
  playArea: { alignItems: 'center', gap: 8 },
  playAreaWide: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  grid: { borderWidth: 1, borderColor: color.ink, backgroundColor: color.ink, alignSelf: 'center' },
  gridRow: { flexDirection: 'row' },
  block: { backgroundColor: color.ink },
  cell: { position: 'relative', alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: color.muted },
  activeWord: { backgroundColor: color.lagoonSoft },
  lockedCell: { backgroundColor: color.successSoft },
  activeCell: { borderWidth: 2, borderColor: color.lagoon },
  conflictCell: { backgroundColor: color.conflictSoft },
  number: { position: 'absolute', left: 2, top: 0, color: color.ink, fontWeight: '600' },
  letter: { color: color.ink, fontWeight: '800', includeFontPadding: false },
  lockedLetter: { color: color.success },
  conflictLetter: { color: color.conflict, textDecorationLine: 'underline' },
  dock: { gap: GAP, flexShrink: 0 },
  status: { color: color.ink, alignSelf: 'center', textAlign: 'center', fontSize: 15, fontWeight: '600' },
  completed: { color: color.success },
  settingsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: GAP },
  clueBar: { backgroundColor: color.lagoonSoft, borderRadius: 16, flexDirection: 'row', alignItems: 'center', padding: GAP, gap: GAP },
  clue: { flex: 1, paddingVertical: 4, paddingHorizontal: 4 },
  clueNumber: { fontSize: 15, fontWeight: '700', color: color.lagoon },
  clueText: { fontSize: 17, fontWeight: '600', color: color.ink },
  keyboard: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: KEY_GAP },
  key: { minHeight: MIN_KEY, backgroundColor: color.surface, borderRadius: 10, borderWidth: 1, borderColor: color.hairline, alignItems: 'center', justifyContent: 'center' },
  keyLabel: { fontSize: 20, fontWeight: '800', color: color.ink },
  panel: { flexShrink: 0, backgroundColor: color.lagoonSoft, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 8, paddingBottom: 8, gap: GAP },
  panelContent: { gap: GAP },
  grabberTarget: { height: 32, alignItems: 'center', justifyContent: 'center' },
  grabber: { width: 32, height: 4, borderRadius: 2, backgroundColor: color.muted },
});
