import React, { useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { Button, C, Copy, PressableScale } from '../../../components/ui';
import { NativeGrid } from './native-grid';

import { cageCorners, cageLayer, cellClueWords, markLayer } from '../../../puzzles/latin/clues';
import { lagoonCue } from './teaching';
import type { LatinPuzzle } from '../../../puzzles/latin/core';
import type { GridAction, GridState } from '../../../puzzles/grid/model';
import { SeaGlyph } from '../thinkingArt';
import { specFor } from './engine';
import { BoardPrimary, BoardRow, useBoardColumns, useBoardGeometry, useBoardSpace } from '../../BoardSpace';
import { SCHOOL_BOARD_MIN } from '../../boardGeometry';
import { LARGE_TEXT } from '../../../components/wordFit';
import type { CornerClues } from '../../../puzzles/grid/cornerNotes';

const boxBorders = (p: LatinPuzzle) => (cell: number) => {
  let d = `M0 0H${p.size * cell}V${p.size * cell}H0Z`;
  if (p.box) { for (let r = p.box; r < p.size; r += p.box) d += `M0 ${r * cell}H${p.size * cell}`; for (let c = p.size / p.box; c < p.size; c += p.size / p.box) d += `M${c * cell} 0V${p.size * cell}`; }
  return d;
};
type Props = { puzzle: LatinPuzzle; state: GridState; dispatch: (a: GridAction) => void; assisted: boolean; help: () => void; reveal: () => void; check?: () => void; title: string; active: boolean; width: number; pictures?: readonly string[]; message?: string };
/** School and Challenge share input, notes and public-rule teaching; only their feedback policy differs. */
export function LagoonGrid({ puzzle: p, state, dispatch, assisted, help, reveal, check, title, active, width: legacyWidth, pictures, message }: Props) {
  const space = useBoardSpace(), columns = useBoardColumns(), school = space !== null;
  const { width: windowWidth, height, fontScale } = useWindowDimensions(), large = fontScale >= LARGE_TEXT;
  const width = space?.ready ? space.width : legacyWidth;
  const short = school ? columns : !pictures && windowWidth > height && height < 500;
  const columnWidth = Math.max(1, short ? width - 192 : width);
  const floor = p.cages.length ? large ? 72 : 56 : SCHOOL_BOARD_MIN['logic-lagoon'];
  const naturalCell = Math.max(floor, Math.min(56, Math.floor((columnWidth - (pictures ? 4 : 0)) / p.size)));
  const rim = pictures ? 4 : 0;
  const geometry = useBoardGeometry('logic-lagoon', naturalCell * p.size + rim, floor * p.size + rim, school);
  const schoolLayout = school ? { height: geometry.height, minimumCell: floor, testID: geometry.testID!, onLayout: geometry.onLayout! } : undefined;
  const [ladder, setLadder] = useState({ edits: -1, stage: 0 });
  const cue = useMemo(() => lagoonCue(p, state.values, pictures), [p, state.values, pictures]);
  const stage = ladder.edits === state.edits && assisted ? ladder.stage : 0;
  const tints = useMemo(() => new Map(cue.focus.map(i => [i, 2 as const])), [cue]);
  const borders = useMemo(() => boxBorders(p), [p]);
  const overlay = useMemo(() => p.cages.length ? cageLayer(p, { labels: false }) : p.less.length ? markLayer(p) : undefined, [p]);
  const cornerClues = useMemo<CornerClues | undefined>(() => {
    if (!p.cages.length) return undefined;
    const corners = cageCorners(p);
    if (!school) return corners;
    return (cell, scale) => new Map([...corners(cell, scale)].map(([i, clue]) => {
      const fontSize = Math.max(clue.fontSize, 13 * (scale >= LARGE_TEXT ? 1.5 : 1));
      return [i, { ...clue, fontSize, lineHeight: fontSize * 1.15, width: clue.text.length * .7 * fontSize + 1 }];
    }));
  }, [p, school]);
  const cellWords = useMemo(() => p.cages.length || p.less.length ? cellClueWords(p) : undefined, [p]);
  // The teacher's maximum is six-wide. Leave room for both pad rows and Notes beside Check.
  const gridWidth = school ? Math.max(columnWidth, floor * p.size + rim) : Math.min(short ? width - 192 : width, Math.max(304, height * .36));
  const size = school ? Math.max(floor, Math.min(naturalCell, Math.floor((geometry.height - rim) / p.size))) : Math.min(56, Math.floor((width - 12) / p.size));
  const hintCard = !!stage && <View accessibilityLiveRegion="polite" style={{ gap: 8, padding: 10, borderRadius: 12, backgroundColor: '#FFF4D6' }}>
    <Copy maxFontSizeMultiplier={1.5}>{stage === 1 ? cue.look : cue.think}</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{stage === 1 && <Button compact quiet disabled={!active} onPress={() => setLadder({ edits: state.edits, stage: 2 })}>Why?</Button>}<Button compact disabled={!active || !cue.technique} onPress={() => { reveal(); setLadder({ edits: -1, stage: 0 }); }}>{cue.technique === 'clash' || cue.technique === 'mistake' ? 'Clear it for me' : 'Show me'}</Button><Button compact quiet disabled={!active} onPress={() => { setLadder({ edits: -1, stage: 0 }); if (cue.target !== undefined) dispatch({ type: 'select', cell: cue.target }); }}>I’ll try it</Button></View>
  </View>;
  const Workspace = school && short ? BoardRow : View;
  const drawing = pictures ? <>
      <Copy testID="logic-status" maxFontSizeMultiplier={1.3}>Tap a square, then choose a picture.</Copy>
      <View {...(school ? { testID: geometry.testID, onLayout: geometry.onLayout } : {})} style={{ alignSelf: 'center', borderWidth: 2, borderColor: '#668A66' }}>
        {Array.from({ length: p.size }, (_, r) => <View key={r} style={{ flexDirection: 'row' }}>{Array.from({ length: p.size }, (_, c) => {
          const i = r * p.size + c, v = state.values[i], topBox = !!p.box && r > 0 && r % p.box === 0, leftBox = !!p.box && c > 0 && c % (p.size / p.box) === 0;
          const line = stage && cue.focus.includes(i) ? C.gold : '#B6CCAB';
          return <PressableScale key={i} accessibilityRole="button" accessibilityState={{ selected: state.selected === i }} accessibilityLabel={`Row ${r + 1}, column ${c + 1}: ${v ? pictures[v - 1] : 'empty'}${p.givens[i] ? ', clue' : ''}`} disabled={!active || !!p.givens[i]} onPress={() => dispatch({ type: 'select', cell: i })} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', backgroundColor: state.selected === i ? '#FFE8A5' : p.givens[i] ? '#D8EACD' : '#FFFDF3', borderWidth: 1, borderTopWidth: topBox ? 3 : 1, borderLeftWidth: leftBox ? 3 : 1, borderColor: line, borderTopColor: topBox ? '#668A66' : line, borderLeftColor: leftBox ? '#668A66' : line }}>{!!v && <SeaGlyph kind={pictures[v - 1]} size={size * .68} />}</PressableScale>;
        })}</View>)}
      </View>
      <View testID="logic-values" style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>{pictures.map((symbol, i) => <PressableScale key={symbol} accessibilityRole="button" accessibilityLabel={`Place ${symbol}`} disabled={!active || !!p.givens[state.selected]} onPress={() => dispatch({ type: 'write', cells: [state.selected], value: i + 1 })} style={{ width: 54, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#FDF6DF', borderWidth: 2, borderColor: '#87AA72' }}><SeaGlyph kind={symbol} size={40}/></PressableScale>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Button compact quiet disabled={!active || !state.undo.length} onPress={() => dispatch({ type: 'undo' })}>Undo</Button><Button compact quiet disabled={!active || !state.redo.length} onPress={() => dispatch({ type: 'redo' })}>Redo</Button><Button compact quiet disabled={!active} onPress={() => dispatch({ type: 'write', cells: [state.selected], value: 0 })}>Erase</Button></View>
    </> : <View testID="lagoon-numeric-fit" style={{ width: gridWidth, maxWidth: school ? undefined : '100%' }}><NativeGrid spec={specFor(p)} state={state} dispatch={dispatch} active={active} width={gridWidth} mistakes="Plain" borders={borders} overlay={overlay} cornerClues={cornerClues} schoolLayout={schoolLayout} cellWords={cellWords} tints={stage ? tints : undefined} status={title}/></View>;
  const workspace = <Workspace testID={school && short ? 'school-drawing-row' : 'lagoon-workspace'} style={{ flexDirection: school && short ? 'row-reverse' : short ? 'row' : 'column', gap: 8, ...(short ? { alignItems: 'flex-start' } : {}) }}>
    <View testID="lagoon-controls" style={{ gap: 8, ...(short ? { width: 180 } : {}) }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <Copy maxFontSizeMultiplier={1.3} style={{ color: C.ink, fontWeight: '800', flexGrow: 1 }}>{title}</Copy>
      {check && pictures && <Button compact maxFontSizeMultiplier={1.3} disabled={!active} onPress={check}>Check</Button>}
      <Button compact quiet maxFontSizeMultiplier={1.3} disabled={!active} onPress={() => { help(); setLadder({ edits: state.edits, stage: 1 }); }}>Hint</Button>
    </View>
    {!pictures && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {check && <Button compact maxFontSizeMultiplier={1.3} disabled={!active} onPress={check}>Check</Button>}
      {/* The shared toolbar follows both pad rows. Keep this shortcut beside Check when those rows scroll. */}
      <Button compact quiet maxFontSizeMultiplier={1.3} selected={state.pencil} disabled={!active} onPress={() => dispatch({ type: 'pencil' })}>Notes {state.pencil ? 'on' : 'off'}</Button>
    </View>}
    {!!message && <Copy maxFontSizeMultiplier={1.5} accessibilityLiveRegion="polite">{message}</Copy>}
    {!school && hintCard}
    </View>
    <View {...(school && short ? { ref: space.drawingColumn, collapsable: false, testID: 'school-drawing-column', onLayout: space.changed } : {})} style={{ minWidth: 0, gap: 8, ...(short ? { flex: 1 } : {}) }}>
    {school ? <ScrollView horizontal scrollEnabled={gridWidth > columnWidth} style={{ width: columnWidth, flexGrow: 0 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}><View style={{ width: gridWidth, gap: 8 }}>{drawing}</View></ScrollView> : drawing}
    </View>
    </Workspace>;
  return <View style={{ gap: 8 }}>
    {school ? <BoardPrimary>{workspace}</BoardPrimary> : workspace}
    {school && hintCard}
    <Copy maxFontSizeMultiplier={1.3}>{p.cages.length ? `Each row, column and box needs 1–${p.size}. Dashed cages add to their totals without repeating a number.` : p.less.length ? `Each row and column needs 1–${p.size}. Each arrow points at the smaller number.` : `One of each ${pictures ? 'picture' : 'number'} in every row and column.${p.box ? ' Each outlined box needs one of each too.' : ''}`}</Copy>
  </View>;
}
