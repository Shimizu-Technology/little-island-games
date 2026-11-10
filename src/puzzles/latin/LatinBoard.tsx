import React, { useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, C, Copy, Heading } from '../../components/ui';
import { Text } from '../../components/Text';
import { GridShell } from '../grid/GridShell';
import { gridAction, type GridAction } from '../grid/model';
import { GridPreferences } from '../grid/preferences';
import { conflicts, type LatinPuzzle } from './core';
import { planHint } from './solver';
import { cueFor, techniqueNames, type Cue } from './teach';
import type { LatinBoardProps, LatinEvent } from './registration';

/** Thick lines for box edges (Sudoku, Killer) or cage edges (Cage Math, Killer), in pixels for one cell size. */
export function boxBorders(p: LatinPuzzle) {
  const n = p.size;
  return (cell: number) => {
    let d = `M0 0H${n * cell}V${n * cell}H0Z`;
    if (p.box) { const w = n / p.box; for (let r = p.box; r < n; r += p.box) d += `M0 ${r * cell}H${n * cell}`; for (let c = w; c < n; c += w) d += `M${c * cell} 0V${n * cell}`; }
    if (p.cages.length && p.kind !== 'cross-sums') {
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
type Ladder = { stage: 0 | 1 | 2; cue: Cue | null; edits: number; helpsAt: number; placed: string };
const closed = (edits: number, helpsAt: number): Ladder => ({ stage: 0, cue: null, edits, helpsAt, placed: '' });

/** Sudoku and its Latin cousins on the shared Cove grid, with a three-rung teaching hint. */
export function LatinBoard({ view, dispatch, active, width }: LatinBoardProps) {
  const { puzzle: p, state, spec } = view, preferences = useContext(GridPreferences);
  const [clashes, setClashes] = useState(preferences.mistakes !== 'Plain');
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
  const solvedCount = state.values.filter(Boolean).length, total = p.givens.length - p.mask.filter(Boolean).length;
  // Wider than the page padding on phones, so a 9×9 cell stays about 42 points.
  const bleed = width < 520 ? 14 : 0, boardWidth = width + bleed * 2;
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <Copy style={{ flexShrink: 1 }}>{view.teaches ? `Teaches: ${techniqueNames[view.teaches as keyof typeof techniqueNames] ?? view.teaches}` : ''}</Copy>
      <Copy accessibilityLabel={`${solvedCount} of ${total} cells filled`}>{solvedCount}/{total} filled</Copy>
    </View>
    <View style={{ marginHorizontal: -bleed }}>
      <GridShell spec={spec} state={state} dispatch={gridSend} width={boardWidth} active={active} conflicts={conflictCells} mistakes={clashes ? 'Friendly' : preferences.mistakes === 'Rewind' ? 'Rewind' : 'Plain'} borders={borders} tints={tints} fillNotes={() => send({ type: 'fill-notes' })}/>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Button quiet compact selected={clashes} disabled={!active} onPress={() => setClashes(on => !on)} label={`Show clashes ${clashes ? 'on' : 'off'}`}>{clashes ? 'Clashes shown' : 'Clashes hidden'}</Button>
      <Button quiet compact disabled={!active || state.values.every((v, i) => v === p.givens[i])} onPress={() => send({ type: 'reset' })}>Start over</Button>
    </View>
    <View style={{ gap: 8, padding: 14, borderRadius: 14, backgroundColor: C.paper, borderWidth: 1, borderColor: '#D9E2DA' }} accessibilityLiveRegion="polite">
      <Heading style={{ fontSize: 20 }}>Stuck? Ask for a hint</Heading>
      {stage === 0 && <>
        {!!placed && <Copy>{placed}</Copy>}
        <Copy>First where to look, then why, then the move. Take your time.</Copy>
        <Button quiet disabled={!active} onPress={ask}>Where should I look?</Button>
      </>}
      {waiting && <Copy>Getting a hint ready…</Copy>}
      {shown && <>
        <Text style={{ fontSize: 13, letterSpacing: 0.6, color: C.teal, fontWeight: '700' }}>{ladder.cue!.technique === 'clash' || ladder.cue!.technique === 'mistake' ? 'A NUMBER TO FIX' : techniqueNames[ladder.cue!.technique as keyof typeof techniqueNames]?.toUpperCase()}</Text>
        <Copy>{ladder.cue!.look}</Copy>
        {stage === 2 && <Copy>{ladder.cue!.think}</Copy>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {stage === 1 && <Button quiet compact disabled={!active} onPress={() => setLadder(l => ({ ...l, stage: 2 }))}>Why?</Button>}
          <Button quiet compact disabled={!active} onPress={show}>{ladder.cue!.technique === 'clash' || ladder.cue!.technique === 'mistake' ? 'Clear it for me' : 'Show me the move'}</Button>
          <Button quiet compact onPress={() => setLadder(closed(state.edits, view.helps))}>I'll try</Button>
        </View>
      </>}
    </View>
  </View>;
}
