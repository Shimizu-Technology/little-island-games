import React, { useContext, useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GridChromeContext } from '../grid/budget';
import { Board } from './Board';
import { GridCanvas, gridLayout } from './GridCanvas';
import { Control, Feedback, MoveGrid, controlRow, ink } from './controls';
import { editPicture, type PictureEvent } from './checkpoint';
import { checkDrawing, drawingSizes, newDrawing, paintDrawing, passDrawing, revealDrawing, type DrawingSize, type DrawMode } from './drawMode';
import { FILL } from './engine';

function editFamilyPuzzle(state: Extract<DrawMode, { phase: 'solve' }>, event: PictureEvent): DrawMode {
  const draft = editPicture(state.draft, event, state.puzzle);
  return draft === state.draft ? state : { ...state, draft };
}

export function DrawBoard({ width, onBack, active = true }: { width: number; onBack?: () => void; active?: boolean }) {
  const [state, setState] = useState<DrawMode>(newDrawing);
  const [pendingSize, setPendingSize] = useState<DrawingSize | null>(null);
  const [moving, setMoving] = useState(false);
  const { height, fontScale } = useWindowDimensions();
  const chrome = useContext(GridChromeContext);
  const check = useMemo(() => state.phase === 'draw' ? checkDrawing(state.draft) : null, [state]);

  if (state.phase === 'cover') return <View style={styles.cover} testID="picture-pass-cover" accessibilityViewIsModal>
    <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={styles.heading}>Pass to solver!</Text>
    <Control title="Play" primary disabled={!active} testID="picture-family-play"
      onPress={() => setState(current => current.phase === 'cover' ? revealDrawing(current) : current)} />
  </View>;

  if (state.phase === 'solve') return <Board picture={state.puzzle} draft={state.draft} width={width} active={active} onBack={onBack}
    onDraw={() => { setMoving(false); setState(newDrawing()); }}
    dispatch={event => setState(current => current.phase === 'solve'
      ? editFamilyPuzzle(current, event) : current)} />;

  const { draft } = state;
  const room = Math.max(154, height - chrome.top - chrome.bottom - chrome.bar - (fontScale > 1.3 ? 245 : 196));
  const layout = gridLayout(draft.size, width, room);
  return <View style={styles.drawing} testID="picture-drawing">
    <View style={controlRow}>
      {onBack && <Control title="‹" label="Back from drawing" onPress={onBack} />}
      <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={styles.heading}>Draw a Puzzle</Text>
    </View>
    <Text style={{ color: ink, fontSize: 13 }}>Just for this turn — hand over to play!</Text>
    {pendingSize !== null && <View style={controlRow}><Text>Clear your drawing for a new size?</Text><Control title="Keep drawing" disabled={!active} onPress={() => setPendingSize(null)}/><Control title="Clear drawing" disabled={!active} onPress={() => { setState(newDrawing(pendingSize)); setPendingSize(null); setMoving(false); }}/></View>}
    <View style={controlRow}>{drawingSizes.map(size =>
      <Control key={size} title={`${size}×${size}`} selected={draft.size === size} disabled={!active}
        onPress={() => { if (size !== draft.size) { if (draft.undo.length) setPendingSize(size); else { setState(newDrawing(size)); setMoving(false); } } }} />)}</View>
    <GridCanvas key={draft.size} layout={layout} size={draft.size} marks={draft.marks} mode={FILL} active={active}
      moving={moving && layout.movable} focusLine={check?.kind === 'open' ? check.line : undefined}
      onPaint={event => setState(current => current.phase === 'draw' ? paintDrawing(current, event) : current)} />
    {check?.kind === 'ready' && <Feedback>One way to solve it</Feedback>}
    {check?.kind === 'open' && <Feedback>{`Row ${check.line.index + 1} still has options`}</Feedback>}
    <View style={controlRow}>
      <Control title="Undo" disabled={!active || !draft.undo.length}
        onPress={() => setState(current => current.phase === 'draw' ? paintDrawing(current, { type: 'undo' }) : current)} />
      {active && <MoveGrid movable={layout.movable} moving={moving} onToggle={() => setMoving(value => !value)} />}
      <Control title="Pass to solver" primary disabled={!active || check?.kind === 'empty'} testID="picture-pass"
        onPress={() => setState(current => current.phase === 'draw' ? passDrawing(current) : current)} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  drawing: { gap: 8, alignItems: 'center', alignSelf: 'stretch' },
  cover: { minHeight: 264, alignItems: 'center', justifyContent: 'center', gap: 20, backgroundColor: '#F3E5FF', borderRadius: 28, padding: 20 },
  heading: { color: ink, fontWeight: '800', fontSize: 24, flexShrink: 1, textAlign: 'center' },
});
