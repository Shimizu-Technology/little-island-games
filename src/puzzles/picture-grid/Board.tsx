import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useBoardHud } from '../../cove/boardHud';
import { GridChromeContext } from '../grid/budget';
import { GridFeedback } from '../grid/preferences';
import { GridCanvas, gridLayout } from './GridCanvas';
import { Control, Feedback, MoveGrid, controlRow, ink, paper } from './controls';
import { CROSS, EMPTY, FILL, picturePalettes, solved, type Mark, type PictureBand, type PictureGrid } from './engine';
import { pictureHint } from './help';
import type { PictureDraft, PictureEvent } from './checkpoint';

export type PictureBoardProps = {
  picture: PictureGrid; draft: PictureDraft; dispatch: (event: PictureEvent) => void;
  active: boolean; width: number; band?: PictureBand; onBack?: () => void; onNext?: () => void; onDraw?: () => void; onChoose?: () => void;
};

function More({ onClose, onRestart, onDraw, onChoose }: { onClose: () => void; onRestart: () => void; onDraw?: () => void; onChoose?: () => void }) {
  const swipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => g.dy > 6 && Math.abs(g.dx) < g.dy,
    onPanResponderRelease: (_, g) => { if (g.dy >= 24) onClose(); },
  }), [onClose]);
  return <View {...swipe.panHandlers} style={styles.sheet} testID="picture-more">
    <View style={styles.grabberArea}>
      <View style={styles.grabber} />
    </View>
    <View style={controlRow}>
      <Control title="Restart" label="Restart this puzzle" onPress={onRestart} />
      {onChoose && <Control title="Choose a puzzle" onPress={onChoose} />}
      {onDraw && <Control title="Draw a Puzzle" onPress={onDraw} />}
      <Control title="Close" label="Close More" onPress={onClose} />
    </View>
  </View>;
}

function PictureReveal({ picture, marks, width }: { picture: PictureGrid; marks: readonly Mark[]; width: number }) {
  const { size, name, palette } = picture;
  const [base, shadow, light] = picturePalettes[palette];
  const pixel = Math.max(1, Math.floor(Math.min(width, 416) / size));
  // Static reveal also works at Reduce Motion and leaves the colored picture in view.
  return <View style={styles.reveal} testID="picture-reveal">
    <View accessible accessibilityRole="image" accessibilityLabel={name} style={{ borderRadius: 20, overflow: 'hidden' }}>
      {Array.from({ length: size }, (_, row) => <View key={row} style={styles.artRow}>
        {marks.slice(row * size, (row + 1) * size).map((mark, col) => {
          const hasAbove = row > 0 && marks[(row - 1) * size + col] === FILL;
          const hasBelow = row < size - 1 && marks[(row + 1) * size + col] === FILL;
          const color = !hasAbove ? light : !hasBelow ? shadow : base;
          return <View key={col} style={{ width: pixel, height: pixel, backgroundColor: mark === FILL ? color : '#F3E9FA' }} />;
        })}
      </View>)}
    </View>
    <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={styles.pictureName}>{name}</Text>
  </View>;
}

export function Board({ picture, draft, dispatch, active, width, band, onBack, onNext, onDraw, onChoose }: PictureBoardProps) {
  const { height, fontScale } = useWindowDimensions();
  const chrome = useContext(GridChromeContext), feedback = useContext(GridFeedback);
  const accepted = useRef(draft.edits);
  useEffect(() => {
    if (draft.edits > accepted.current) feedback();
    accepted.current = draft.edits;
  }, [draft.edits, feedback]);
  const [mode, setMode] = useState<Mark>(FILL);
  const [more, setMore] = useState(false);
  const [moving, setMoving] = useState(false);
  const [askedOn, setAskedOn] = useState<PictureDraft | null>(null);
  const done = useMemo(() => solved(picture, draft.marks), [picture, draft.marks]);
  const clue = useMemo(() => draft.showingHint && !done ? pictureHint(picture, draft.marks) : null, [picture, draft, done]);
  const usableHeight = height - chrome.top - chrome.bottom - chrome.bar;
  const room = Math.max(154, usableHeight - (more ? 254 : 151) - (fontScale > 1.3 ? 36 : 0) - (clue ? 42 : 0));
  const layout = gridLayout(picture.size, width, room, picture);
  const canEdit = active && !done;
  const movingGrid = moving && layout.movable;
  const title = band ? `${band.title} ${picture.size}×${picture.size}` : `${picture.size}×${picture.size}`;
  const ask = () => {
    setMoving(false);
    if (draft.showingHint) return;
    if (pictureHint(picture, draft.marks)) dispatch({ type: 'hint' });
    else setAskedOn(draft);
  };
  const extraActions = [
    ...(onBack ? [{ label: 'Back to puzzle', icon: 'PuzzlePiece' as const, run: onBack }] : []),
    ...(onDraw ? [{ label: 'Draw a Puzzle', icon: 'Sparkle' as const, run: onDraw }] : []),
  ];
  const moreActions = extraActions.length ? extraActions : undefined;
  const host = useBoardHud(done
    ? { extraActions: moreActions }
    : {
        hint: { run: ask, disabled: !canEdit || draft.showingHint },
        undo: { run: () => dispatch({ type: 'undo' }), disabled: !canEdit || !draft.undo.length },
        reset: { run: () => dispatch({ type: 'reset' }), disabled: !canEdit || (draft.marks.every(m => m === EMPTY) && !draft.undo.length) },
        extraActions: moreActions,
      });
  const hosted = !!host;
  const sheetOpen = !hosted && more;
  if (done) return <View style={styles.board}>
    <PictureReveal picture={picture} marks={draft.marks} width={Math.min(width, Math.max(150, usableHeight - 155))} />
    <View style={controlRow}>
      {onNext && <Control title="Next puzzle" primary onPress={onNext} />}
      {onBack && <Control title="Puzzles" onPress={onBack} />}
      {onDraw && <Control title="Draw a Puzzle" onPress={onDraw} />}
    </View>
  </View>;

  const close = () => setMore(false);
  return <View style={styles.board}>
    {hosted ? (
      onBack ? (
        <View style={controlRow}>
          <Control title="‹" label="Back to puzzle" onPress={onBack} />
          <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={styles.subTitle}>{title}</Text>
        </View>
      ) : (
        <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={styles.subTitle}>{title}</Text>
      )
    ) : (
      <View style={[controlRow, styles.hud]}>
        {onBack && <Control title="‹" label="Back to Puzzles" onPress={onBack} />}
        <View style={styles.titleBlock}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={styles.title}>Picture Grid</Text>
          <Text maxFontSizeMultiplier={2} style={styles.subTitle}>{title}</Text>
        </View>
        <Control title="Undo" onPress={() => dispatch({ type: 'undo' })} disabled={!canEdit || !draft.undo.length} testID="picture-undo" />
        <Control title="Hint" onPress={ask} disabled={!canEdit} testID="picture-hint" />
        <Control title="•••" label="More" onPress={() => setMore(value => !value)} disabled={!canEdit} selected={more} testID="picture-more-button" />
      </View>
    )}
    <GridCanvas layout={layout} size={picture.size} marks={draft.marks} clues={picture} mode={mode} active={canEdit && !sheetOpen}
      moving={movingGrid && !sheetOpen} focusLine={clue ?? undefined} onPaint={dispatch} />
    <View style={[controlRow, styles.tools]}>
      <Control title="■ Fill" label="Fill" onPress={() => { setMode(FILL); setMoving(false); }} selected={mode === FILL && !movingGrid} disabled={!canEdit || sheetOpen} />
      <Control title="× Cross out" label="Cross out" onPress={() => { setMode(CROSS); setMoving(false); }} selected={mode === CROSS && !movingGrid} disabled={!canEdit || sheetOpen} />
      {!sheetOpen && canEdit && <MoveGrid movable={layout.movable} moving={movingGrid} onToggle={() => setMoving(value => !value)} />}
    </View>
    {clue && <Feedback>{clue.message}</Feedback>}
    {!clue && askedOn === draft && <Feedback>No sure move from these marks.</Feedback>}
    {sheetOpen && <More onClose={close} onRestart={() => { close(); dispatch({ type: 'reset' }); }} onDraw={onDraw} onChoose={onChoose} />}
  </View>;
}

const styles = StyleSheet.create({
  board: { alignSelf: 'stretch', alignItems: 'center', gap: 8 },
  hud: { alignSelf: 'stretch', minHeight: 56, justifyContent: 'flex-end' },
  titleBlock: { flexGrow: 1, flexShrink: 1, minWidth: 98 },
  title: { color: ink, fontSize: 17, fontWeight: '800' },
  subTitle: { color: ink, fontSize: 13 },
  tools: { justifyContent: 'center' },
  sheet: { backgroundColor: paper, alignSelf: 'stretch', borderRadius: 24, paddingHorizontal: 10, paddingBottom: 12 },
  grabberArea: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  grabber: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#8B9E98' },
  reveal: { alignItems: 'center', gap: 8 },
  artRow: { flexDirection: 'row' },
  pictureName: { color: ink, fontWeight: '800', fontSize: 26, textAlign: 'center' },
});
