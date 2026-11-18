import React, { useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Button, C, Copy } from '../../components/ui';
import { Text } from '../../components/Text';
import { GridShell, type GridTint } from '../grid/GridShell';
import { gridAction, type GridAction } from '../grid/model';
import { GridPreferences } from '../grid/preferences';
import { PuzzleStatus, statusSentence, useStatusMax } from '../ui/PuzzleStatus';
import { conflicts, type LatinPuzzle } from './core';
import { planHint } from './solver';
import { cueFor, techniqueName, type Cue } from './teach';
import { cageCorners, cageLayer, cellClueWords, clueWords, markLayer, sightFrame } from './clues';
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
/**
 * Lines between linked chain squares, stopping at each mark's edge. On the Why step the squares it
 * names get a bold ring, joined by a dashed line when they are the two dots that see each other.
 */
function chainLines(n: number, links: readonly [number, number][], cell: number, proof: readonly number[] = [], wrap = false) {
  const at = (i: number) => [(i % n + 0.5) * cell, (Math.floor(i / n) + 0.5) * cell], gap = cell * 0.22;
  const segment = (a: number, b: number) => { const [x1, y1] = at(a), [x2, y2] = at(b), len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len; return `M${x1 + ux * gap} ${y1 + uy * gap}L${x2 - ux * gap} ${y2 - uy * gap}`; };
  const rings = proof.map(i => { const [x, y] = at(i), r = cell * 0.44; return `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`; }).join('');
  return <Svg width={n * cell} height={n * cell} style={{ position: 'absolute' }}>
    <Path d={links.map(([a, b]) => segment(a, b)).join('')} stroke={C.ink} strokeOpacity={0.4} strokeWidth={Math.max(2, cell * 0.045)} strokeLinecap="round" fill="none"/>
    {!!rings && <Path d={rings} stroke={C.teal} strokeWidth={Math.max(3, cell * 0.07)} fill="none"/>}
    {wrap && proof.length === 2 && <Path d={segment(proof[0], proof[1])} stroke={C.teal} strokeWidth={Math.max(3, cell * 0.06)} strokeDasharray={`${cell * 0.12} ${cell * 0.08}`} fill="none"/>}
  </Svg>;
}
/** A few plain sentences beside each board, so nobody has to know the game already. Size-aware. */
export function rulesFor(p: LatinPuzzle): string {
  const n = p.size, once = `Each row and each column has the numbers 1 to ${n}, each one once.`;
  const box = p.box ? (p.box === n / p.box ? `${p.box}×${p.box} box` : `box of ${p.box} rows by ${n / p.box} columns`) : '';
  switch (p.kind) {
    case 'sudoku': return `Fill every empty square. Each row, each column and each ${box} has the numbers 1 to ${n}, each one once. The starting numbers stay.`;
    case 'cage-math': return `${once} Each cage makes its number with its sign: 9+ adds to 9, 2− is a difference of 2, 12× multiplies to 12, 2÷ is one number twice the other. =5 is a one-square cage holding 5. A number may repeat inside a cage if it is not in the same row or column.`;
    case 'greater-than': return `${once} Each arrow points at the smaller number.`;
    case 'skyline': return `${once} Think of each number as a roof that tall. Each edge number counts the roofs you can see from there: a taller roof hides every shorter one behind it.`;
    case 'killer': return `Sudoku rules: each row, each column and each ${box} has 1 to ${n}, each one once. Each dashed cage adds up to its number (9+ adds to 9; =5 is one square holding 5), and no number repeats inside a cage.`;
    default: return '';
  }
}
type Ladder = { stage: 0 | 1 | 2; cue: Cue | null; edits: number; helpsAt: number; placed: string };
const closed = (edits: number, helpsAt: number): Ladder => ({ stage: 0, cue: null, edits, helpsAt, placed: '' });

/** Sudoku and its Latin cousins on the shared Cove grid, with a three-rung teaching hint. */
export function LatinBoard({ view, dispatch, active, width }: LatinBoardProps) {
  const { puzzle: p, state, spec } = view, preferences = useContext(GridPreferences);
  const statusMax = useStatusMax();
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
    const out = new Map<number, GridTint>(), v = state.values[state.selected], cue = ladder.cue;
    // The quiet same-number echo would compete with a chain's two colours, so it rests meanwhile.
    if (v && !(shown && cue?.marks)) state.values.forEach((x, i) => { if (x === v) out.set(i, 1); });
    if (shown && cue) {
      for (const i of cue.focus) out.set(i, 2);
      // A colour chain shows its two colours as dots and rings, the square the hint fills included:
      // it may be one of the two squares that prove the step.
      cue.marks?.forEach((cells, k) => cells.forEach(i => out.set(i, k === 0 ? 3 : 4)));
    }
    return out;
  }, [state.values, state.selected, shown, ladder.cue]);
  const borders = useMemo(() => boxBorders(p), [p]);
  const clues = useMemo(() => p.cages.length ? cageLayer(p, { labels: false }) : p.less.length ? markLayer(p) : undefined, [p]);
  const cornerClues = useMemo(() => p.cages.length ? cageCorners(p) : undefined, [p]);
  // A shown colour chain draws the lines that join it, under any clue layer.
  const links = shown ? ladder.cue?.links : undefined, proof = shown && stage === 2 ? ladder.cue?.proof : undefined, wrap = !!proof && proof.length === 2 && proof.every(i => ladder.cue?.marks?.[0].includes(i));
  const overlay = useMemo(() => links?.length ? (cell: number) => <>{chainLines(p.size, links, cell, proof, wrap)}{clues?.(cell)}</> : clues, [links, proof, wrap, clues, p.size]);
  const frame = useMemo(() => p.kind === 'skyline' ? { size: 0.7, layer: sightFrame(p) } : undefined, [p]);
  const words = useMemo(() => clueWords(p), [p]), cellWords = useMemo(() => p.cages.length || p.less.length ? cellClueWords(p) : undefined, [p]), rules = useMemo(() => rulesFor(p), [p]);
  const solvedCount = state.values.filter(Boolean).length, total = p.givens.length - p.mask.filter(Boolean).length;
  // Wider than the page padding on phones, so a 9×9 cell stays about 42 points.
  const bleed = width < 520 ? 14 : 0, boardWidth = width + bleed * 2;
  return <View style={{ gap: 12 }}>
    <PuzzleStatus title={view.title} skill={techniqueName(view.teaches) || undefined} count={`${solvedCount}/${total}`} countLabel={`${solvedCount} of ${total} cells filled`}>
      {!!rules && <Button quiet compact maxFontSizeMultiplier={statusMax} selected={howTo} onPress={() => setHowTo(on => !on)}>How to play</Button>}
      {!shown && <Button quiet compact maxFontSizeMultiplier={statusMax} disabled={!active || waiting} onPress={ask} label="Hint: where should I look?">{waiting ? 'Getting a hint…' : 'Hint'}</Button>}
    </PuzzleStatus>
    {howTo && !!rules && <Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink }}>{rules}</Copy>}
    {!!placed && !shown && <Copy maxFontSizeMultiplier={1.5} accessibilityLiveRegion="polite">{placed}</Copy>}
    {shown && <View accessibilityLiveRegion="polite" style={{ gap: 6, padding: 12, borderRadius: 14, backgroundColor: '#FBF2D5', borderWidth: 1, borderColor: C.gold }}>
      <Text maxFontSizeMultiplier={statusMax} style={{ fontSize: 13, letterSpacing: 0.6, color: C.teal, fontWeight: '700' }}>{ladder.cue!.technique === 'clash' || ladder.cue!.technique === 'mistake' ? 'A NUMBER TO FIX' : techniqueName(ladder.cue!.technique ?? '').toUpperCase()}</Text>
      <Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink }}>{stage === 2 ? ladder.cue!.think : ladder.cue!.look}</Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {stage === 1 && <Button quiet compact maxFontSizeMultiplier={statusMax} disabled={!active} onPress={() => setLadder(l => ({ ...l, stage: 2 }))}>Why?</Button>}
        <Button compact maxFontSizeMultiplier={statusMax} disabled={!active} onPress={show}>{ladder.cue!.technique === 'clash' || ladder.cue!.technique === 'mistake' ? 'Clear it for me' : 'Show me'}</Button>
        <Button quiet compact maxFontSizeMultiplier={statusMax} onPress={() => { const target = ladder.cue?.target; setLadder(closed(state.edits, view.helps)); if (target !== undefined && target !== state.selected) send({ type: 'select', cell: target }); }}>I'll try it</Button>
      </View>
    </View>}
    <View style={{ marginHorizontal: -bleed }}>
      <GridShell spec={spec} state={state} dispatch={gridSend} width={boardWidth} active={active} conflicts={conflictCells} mistakes={clashes ? 'Friendly' : preferences.mistakes === 'Rewind' ? 'Rewind' : 'Plain'} borders={borders} tints={tints} overlay={overlay} cornerClues={cornerClues} frame={frame} cellWords={cellWords} status={statusSentence(view.title, techniqueName(view.teaches) || undefined, `${total}/${total}`)} fillNotes={() => send({ type: 'fill-notes' })}/>
    </View>
    {!!words && p.kind !== 'sudoku' && <Copy accessibilityRole="text" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>{words}</Copy>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Button quiet compact maxFontSizeMultiplier={statusMax} selected={clashes} disabled={!active} onPress={() => setClashes(on => !on)} label={`Show clashes ${clashes ? 'on' : 'off'}`}>{clashes ? 'Clashes shown' : 'Clashes hidden'}</Button>
      <Button quiet compact maxFontSizeMultiplier={statusMax} disabled={!active || state.values.every((v, i) => v === p.givens[i])} onPress={() => send({ type: 'reset' })}>Start over</Button>
    </View>
  </View>;
}
