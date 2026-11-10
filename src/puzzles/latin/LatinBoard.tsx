import React, { useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, C, Copy } from '../../components/ui';
import { Text } from '../../components/Text';
import { GridShell } from '../grid/GridShell';
import { gridAction, type GridAction } from '../grid/model';
import { GridPreferences } from '../grid/preferences';
import { conflicts, type LatinPuzzle } from './core';
import { planHint } from './solver';
import { cueFor, techniqueNames, type Cue } from './teach';
import { cageLayer, clueWords, markLayer, sightFrame } from './clues';
import type { LatinBoardProps, LatinEvent } from './registration';

/** Thick lines for box edges (Sudoku, Cage Sudoku) or cage edges (Cage Math), in pixels for one cell size. */
export function boxBorders(p: LatinPuzzle) {
  const n = p.size;
  return (cell: number) => {
    let d = `M0 0H${n * cell}V${n * cell}H0Z`;
    if (p.box) { const w = n / p.box; for (let r = p.box; r < n; r += p.box) d += `M0 ${r * cell}H${n * cell}`; for (let c = w; c < n; c += w) d += `M${c * cell} 0V${n * cell}`; }
    if (p.kind === 'cage-math') {
      const cage = p.givens.map(() => -1);
      p.cages.forEach((c, k) => c.cells.forEach(i => { cage[i] = k; }));
      for (let i = 0; i < n * n; i++) {
        const r = Math.floor(i / n), c = i % n;
        if (c < n - 1 && cage[i] !== cage[i + 1]) d += `M${(c + 1) * cell} ${r * cell}V${(r + 1) * cell}`;
        if (r < n - 1 && cage[i] !== cage[i + n]) d += `M${c * cell} ${(r + 1) * cell}H${(c + 1) * cell}`;
      }
    }
    return d;
  };
}
/** The ladder belongs to one board: `edits` and `helpsAt` tie it to the revision it describes. */
/** One line of rules beside each board, so nobody has to guess what the clues mean. */
const rules: Record<string, string> = {
  sudoku: '', 'cage-math': 'Each cage makes its number with its sign: 9+ adds to 9, 2− is a difference of 2, 12× multiplies to 12, 2÷ is one number twice the other. =5 is a one-square cage holding 5. No number repeats in a row or column.',
  'greater-than': 'Each arrow points at the smaller number. No number repeats in a row or column.',
  skyline: 'Each edge number counts the roofs you can see from there. Taller roofs hide shorter ones.',
  killer: 'Each dashed cage adds up to its number (9+ adds to 9; =5 is one square holding 5), with no repeats inside it. Rows, columns and boxes are Sudoku.',
};
type Ladder = { stage: 0 | 1 | 2; cue: Cue | null; edits: number; helpsAt: number; placed: string };
const closed = (edits: number, helpsAt: number): Ladder => ({ stage: 0, cue: null, edits, helpsAt, placed: '' });

/** Sudoku and its Latin cousins on the shared Cove grid, with a three-rung teaching hint. */
export function LatinBoard({ view, dispatch, active, width }: LatinBoardProps) {
  const { puzzle: p, state, spec } = view, preferences = useContext(GridPreferences);
  const [clashes, setClashes] = useState(preferences.mistakes !== 'Plain'), [howTo, setHowTo] = useState(false);
  const [ladder, setLadder] = useState<Ladder>(() => closed(state.edits, view.helps));
  // The parent hands a fresh callback each render; the grid's gesture handler must survive that.
  const live = useRef({ view, dispatch, active });
  useLayoutEffect(() => { live.current = { view, dispatch, active }; }, [view, dispatch, active]);
  const send = useCallback((event: LatinEvent) => {
    const { view: v, dispatch: d, active: on } = live.current;
    if (!on) return;
    if (!['help', 'hint', 'reset', 'fill-notes'].includes(event.type) && gridAction(v.state, event as GridAction, v.spec) === v.state) return;
    d(event);
  }, []);
  const gridSend = useCallback((action: GridAction) => send(action), [send]);
  // Any board change closes the hint: it described the old board. A cue appears only after its
  // help record was accepted, which the board sees as a higher help count.
  const current = ladder.edits === state.edits, stage = current ? ladder.stage : 0;
  const waiting = current && stage > 0 && view.helps <= ladder.helpsAt, shown = current && stage > 0 && !waiting && !!ladder.cue;
  const placed = !current && state.edits === ladder.edits + 1 ? ladder.placed : '';
  const ask = () => {
    const cue = cueFor(p, planHint(p, state.values));
    if (!cue.technique) return;
    setLadder({ stage: 1, cue, edits: state.edits, helpsAt: view.helps, placed: '' });
    send({ type: 'help' });
  };
  const show = () => { if (!ladder.cue) return; setLadder(l => ({ ...l, placed: l.cue?.show ?? '' })); send({ type: 'hint' }); };
  const conflictCells = useMemo(() => conflicts(p, state.values), [p, state.values]);
  const tints = useMemo(() => {
    const out = new Map<number, 1 | 2>(), v = state.values[state.selected];
    if (v) state.values.forEach((x, i) => { if (x === v) out.set(i, 1); });
    if (shown) for (const i of ladder.cue!.focus) out.set(i, 2);
    return out;
  }, [state.values, state.selected, shown, ladder.cue]);
  const borders = useMemo(() => boxBorders(p), [p]);
  const overlay = useMemo(() => p.cages.length ? cageLayer(p) : p.less.length ? markLayer(p) : undefined, [p]);
  const frame = useMemo(() => p.kind === 'skyline' ? { size: 0.7, layer: sightFrame(p) } : undefined, [p]);
  const words = useMemo(() => clueWords(p), [p]);
  const solvedCount = state.values.filter(Boolean).length, total = p.givens.length - p.mask.filter(Boolean).length;
  // Wider than the page padding on phones, so a 9×9 cell stays about 42 points.
  const bleed = width < 520 ? 14 : 0, boardWidth = width + bleed * 2;
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 6 }}>
      <Copy style={{ flexShrink: 1, fontWeight: '700' }}>{view.title}</Copy>
      {!!view.teaches && <Copy style={{ flexShrink: 1 }}>{`· skill: ${techniqueNames[view.teaches as keyof typeof techniqueNames] ?? view.teaches}`}</Copy>}
      <Copy accessibilityLabel={`${solvedCount} of ${total} cells filled`}>{`· ${solvedCount}/${total}`}</Copy>
      {!!rules[p.kind] && <Button quiet compact selected={howTo} onPress={() => setHowTo(on => !on)}>How to play</Button>}
      {!shown && <Button quiet compact disabled={!active || waiting} onPress={ask} label="Hint: where should I look?">{waiting ? 'Getting a hint…' : 'Hint'}</Button>}
    </View>
    {howTo && !!rules[p.kind] && <Copy style={{ color: C.ink }}>{rules[p.kind]}</Copy>}
    {!!placed && !shown && <Copy accessibilityLiveRegion="polite">{placed}</Copy>}
    {shown && <View accessibilityLiveRegion="polite" style={{ gap: 6, padding: 12, borderRadius: 14, backgroundColor: '#FBF2D5', borderWidth: 1, borderColor: C.gold }}>
      <Text style={{ fontSize: 13, letterSpacing: 0.6, color: C.teal, fontWeight: '700' }}>{ladder.cue!.technique === 'clash' || ladder.cue!.technique === 'mistake' ? 'A NUMBER TO FIX' : techniqueNames[ladder.cue!.technique as keyof typeof techniqueNames]?.toUpperCase()}</Text>
      <Copy style={{ color: C.ink }}>{stage === 2 ? ladder.cue!.think : ladder.cue!.look}</Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {stage === 1 && <Button quiet compact disabled={!active} onPress={() => setLadder(l => ({ ...l, stage: 2 }))}>Why?</Button>}
        <Button compact disabled={!active} onPress={show}>{ladder.cue!.technique === 'clash' || ladder.cue!.technique === 'mistake' ? 'Clear it for me' : 'Show me'}</Button>
        <Button quiet compact onPress={() => { const target = ladder.cue?.target; setLadder(closed(state.edits, view.helps)); if (target !== undefined && target !== state.selected) send({ type: 'select', cell: target }); }}>I'll try it</Button>
      </View>
    </View>}
    <View style={{ marginHorizontal: -bleed }}>
      <GridShell spec={spec} state={state} dispatch={gridSend} width={boardWidth} active={active} conflicts={conflictCells} mistakes={clashes ? 'Friendly' : preferences.mistakes === 'Rewind' ? 'Rewind' : 'Plain'} borders={borders} tints={tints} overlay={overlay} frame={frame} fillNotes={() => send({ type: 'fill-notes' })}/>
    </View>
    {!!words && p.kind !== 'sudoku' && <Copy accessibilityRole="text" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>{words}</Copy>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Button quiet compact selected={clashes} disabled={!active} onPress={() => setClashes(on => !on)} label={`Show clashes ${clashes ? 'on' : 'off'}`}>{clashes ? 'Clashes shown' : 'Clashes hidden'}</Button>
      <Button quiet compact disabled={!active || state.values.every((v, i) => v === p.givens[i])} onPress={() => send({ type: 'reset' })}>Start over</Button>
    </View>
  </View>;
}
