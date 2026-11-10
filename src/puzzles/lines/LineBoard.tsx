import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, View, useWindowDimensions, type AccessibilityActionEvent } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { Button, C, Copy } from '../../components/ui';
import { Text } from '../../components/Text';
import { GridFeedback, GridInteraction } from '../grid/preferences';
import type { MarkEvent } from '../edges/marks';
import type { EdgeBoardProps } from '../edges/registration';
import { BLACK, CROSS, EMPTY, LINE, brokenClues, latticeOf, solved, type LinePuzzle } from './core';
import { cueFor, techniqueNames, type Cue } from './teach';

const PAPER = '#FBF7EC', GRIDLINE = '#D9CEB0', RIM = '#CFE0D8', INK = '#1E4A43', DOT = '#7C8C86';
type Ladder = { stage: 0 | 1 | 2; cue: Cue | null; edits: number; helpsAt: number; placed: string };
const closed = (edits: number, helpsAt: number): Ladder => ({ stage: 0, cue: null, edits, helpsAt, placed: '' });
const rulesText: Record<LinePuzzle['kind'], string> = {
  loop: 'Draw one closed loop along the dots, with no branches and no crossings. A number tells how many of that cell’s four sides the loop uses. Drag along the dots to draw; drag back over a line to rub it out. Tap an edge to cycle line, cross (“no line here”) and empty.',
  'pearl-loop': 'Draw one closed loop through the centres of cells. It must pass every pearl. On a black pearl it turns, and goes straight through the next cell on both sides. On a white pearl it goes straight, and turns just before or just after. Drag from cell to cell to draw; tap between two cells to cycle line, cross and empty.',
};

/** Loop and Pearl Loop: drag along the dots (or cell centres); the nearest edge answers a tap. */
export function LineBoard({ view, dispatch, active, width }: EdgeBoardProps<LinePuzzle>) {
  const p = view.puzzle, l = useMemo(() => latticeOf(p), [p]), marks = view.board.marks, pearl = p.kind === 'pearl-loop';
  const { height } = useWindowDimensions(), feedback = useContext(GridFeedback), interaction = useContext(GridInteraction);
  // Loop dots sit on cell corners; Pearl Loop dots sit at cell centres.
  const span = pearl ? 0.5 : 0, cellsX = p.cols, cellsY = p.rows;
  // The board, its rim included, fits the column: no side overhang on a phone.
  const cell = Math.max(22, Math.min(88, Math.floor(Math.min(width / (cellsX + 0.64), Math.max(300, height * 0.6) / (cellsY + 0.64))))), pad = Math.round(cell * 0.32);
  const W = cell * cellsX + pad * 2, H = cell * cellsY + pad * 2;
  const pos = (v: number) => ({ x: pad + (v % l.vc + span) * cell, y: pad + (Math.floor(v / l.vc) + span) * cell });
  const [pending, setPending] = useState<Map<number, number> | null>(null), [rules, setRules] = useState(false);
  const [ladder, setLadder] = useState<Ladder>(() => closed(view.board.edits, view.helps));
  const live = useRef({ marks, active, dispatch });
  useLayoutEffect(() => { live.current = { marks, active, dispatch }; }, [marks, active, dispatch]);
  const accepted = useRef(view.board.edits);
  useEffect(() => { if (view.board.edits > accepted.current) feedback(); accepted.current = view.board.edits; }, [view.board.edits, feedback]);
  useEffect(() => () => interaction(false), [interaction]);

  const nearestDot = (x: number, y: number, reach: number) => {
    const c = Math.round((x - pad) / cell - span), r = Math.round((y - pad) / cell - span);
    if (c < 0 || r < 0 || c >= l.vc || r >= l.vr) return -1;
    const v = r * l.vc + c, at = pos(v);
    return Math.hypot(at.x - x, at.y - y) <= reach ? v : -1;
  };
  const nearestEdge = (x: number, y: number) => {
    let best = -1, dist = cell * 0.42;
    l.edges.forEach(([a, b], e) => {
      const A = pos(a), B = pos(b), horizontal = A.y === B.y;
      const d = horizontal ? (x >= A.x - 2 && x <= B.x + 2 ? Math.abs(y - A.y) + Math.max(0, Math.abs(x - (A.x + B.x) / 2) - cell * 0.38) : Infinity) : (y >= A.y - 2 && y <= B.y + 2 ? Math.abs(x - A.x) + Math.max(0, Math.abs(y - (A.y + B.y) / 2) - cell * 0.38) : Infinity);
      if (d < dist) { dist = d; best = e; }
    });
    return best;
  };
  const edgeBetween = (a: number, b: number) => l.around[a].find(e => l.edges[e][0] === b || l.edges[e][1] === b) ?? -1;
  type Drag = { x: number; y: number; at: number; path: number[]; mode: number | null; changes: Map<number, number>; moved: boolean };
  const drag = useRef<Drag | null>(null);
  /** Walk from the current dot toward `to` one step at a time along a row or column. */
  const walk = (d: Drag, to: number) => {
    const m = live.current.marks;
    for (let guard = 0; d.at !== to && guard < 32; guard++) {
      const ar = Math.floor(d.at / l.vc), ac = d.at % l.vc, tr = Math.floor(to / l.vc), tc = to % l.vc;
      const step = Math.abs(tc - ac) >= Math.abs(tr - ar) ? d.at + Math.sign(tc - ac) : d.at + Math.sign(tr - ar) * l.vc;
      const e = edgeBetween(d.at, step);
      if (e < 0) return;
      const back = d.path.length >= 2 && d.path[d.path.length - 2] === step;
      if (back && d.changes.has(e)) {
        // Sliding back over the edge just drawn takes it back.
        d.changes.delete(e); d.path.pop();
      } else {
        const now = d.changes.get(e) ?? m[e];
        d.mode ??= now === LINE ? EMPTY : LINE;
        if (d.mode === LINE ? now !== LINE : now === LINE) d.changes.set(e, d.mode);
        else if (d.changes.has(e)) d.changes.delete(e);
        d.path.push(step);
      }
      d.at = step; d.moved = true;
    }
    setPending(new Map(d.changes));
  };
  // eslint-disable-next-line react-hooks/refs -- PanResponder stores these event handlers; creation never reads the refs.
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => live.current.active,
    onMoveShouldSetPanResponder: () => live.current.active,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => {
      interaction(true);
      const x = e.nativeEvent.locationX, y = e.nativeEvent.locationY, v = nearestDot(x, y, cell * 0.75);
      drag.current = { x, y, at: v, path: v >= 0 ? [v] : [], mode: null, changes: new Map(), moved: false };
    },
    onPanResponderMove: (_e, g) => {
      const d = drag.current;
      if (!d) return;
      const x = d.x + g.dx, y = d.y + g.dy, v = nearestDot(x, y, cell * 0.38);
      if (d.at < 0) { if (v >= 0 && Math.hypot(g.dx, g.dy) > cell * 0.3) { d.at = v; d.path = [v]; } return; }
      if (v >= 0 && v !== d.at) walk(d, v);
    },
    onPanResponderRelease: (_e, g) => {
      const d = drag.current;
      drag.current = null; interaction(false);
      if (!d) return;
      const { active: on, dispatch: send, marks: m } = live.current;
      if (on && d.moved && d.changes.size) send({ type: 'set', changes: [...d.changes] });
      else if (on && !d.moved && Math.hypot(g.dx, g.dy) < cell * 0.35) {
        const e = nearestEdge(d.x, d.y);
        if (e >= 0) send({ type: 'set', changes: [[e, (m[e] + 1) % 3]] });
      }
      setPending(null);
    },
    onPanResponderTerminate: () => { drag.current = null; setPending(null); interaction(false); },
  }), [cell, pad, l]); // eslint-disable-line react-hooks/exhaustive-deps -- handlers read live values through refs

  const shownMarks = useMemo(() => pending ? marks.map((m, e) => pending.get(e) ?? m) : marks, [marks, pending]);
  const broken = useMemo(() => new Set(brokenClues(p, shownMarks)), [p, shownMarks]);
  const branches = useMemo(() => new Set(l.around.flatMap((list, v) => list.filter(e => shownMarks[e] === LINE).length > 2 ? [v] : [])), [l, shownMarks]);
  const current = ladder.edits === view.board.edits, stage = current ? ladder.stage : 0;
  const waiting = current && stage > 0 && view.helps <= ladder.helpsAt, shown = current && stage > 0 && !waiting && !!ladder.cue;
  const placed = !current && view.board.edits === ladder.edits + 1 ? ladder.placed : '';
  const ask = () => { const cue = cueFor(p, marks); if (!cue) return; setLadder({ stage: 1, cue, edits: view.board.edits, helpsAt: view.helps, placed: '' }); dispatch({ type: 'help' }); };
  const show = () => { if (!ladder.cue) return; setLadder(x => ({ ...x, placed: x.cue?.show ?? '' })); dispatch({ type: 'hint' }); };
  const send = (event: MarkEvent) => dispatch(event);
  // The card points at numbers, pearls or dots; the edges it will change stay hidden until Show me (a mark to fix is shown).
  const fixing = shown && (ladder.cue!.technique === 'clash' || ladder.cue!.technique === 'mistake');
  const focusCells = new Set(shown ? ladder.cue!.cells : []), focusDots = new Set(shown ? ladder.cue!.dots : []), focusEdges = new Set(fixing ? ladder.cue!.edges : []);
  // A number is done when its lines match it (a 0 once its sides are all crossed); a pearl once the loop passes it truly.
  const met = (marks2: readonly number[], c: number) => { if (p.kind !== 'loop') return false; const n = p.clues[c], four = l.sides[c]; return n > 0 ? four.filter(e => marks2[e] === LINE).length === n : n === 0 && four.every(e => marks2[e] === CROSS); };
  const threaded = (v: number) => p.kind === 'pearl-loop' && p.pearls[v] > 0 && l.around[v].filter(e => shownMarks[e] === LINE).length === 2 && !broken.has(v);
  const done = p.kind === 'loop' ? p.clues.filter((n, c) => n >= 0 && met(marks, c)).length : p.pearls.filter((k, v) => k && threaded(v)).length;
  const total = p.kind === 'loop' ? p.clues.filter(n => n >= 0).length : p.pearls.filter(Boolean).length;
  const firstBroken = [...broken][0];
  const trouble = branches.size ? 'Three lines meet at one place. The loop never branches.' : firstBroken === undefined ? '' : p.kind === 'loop' ? `This ${p.clues[firstBroken]} doesn’t fit its lines.` : `This ${p.pearls[firstBroken] === BLACK ? 'black' : 'white'} pearl’s rule is broken.`;
  const thick = Math.max(3.5, cell * 0.13), finished = !pending && solved(p, marks.map(m => m === CROSS ? EMPTY : m)), lineColour = finished ? C.teal : INK;

  const background = useMemo(() => {
    const out: React.ReactElement[] = [<Rect key="bg" x={1} y={1} width={W - 2} height={H - 2} rx={Math.min(16, cell * 0.35)} fill={PAPER} stroke={RIM} strokeWidth={1.5}/>];
    if (pearl) for (let r = 0; r <= p.rows; r++) out.push(<Line key={`h${r}`} x1={pad} y1={pad + r * cell} x2={pad + p.cols * cell} y2={pad + r * cell} stroke={GRIDLINE} strokeWidth={1}/>);
    if (pearl) for (let c = 0; c <= p.cols; c++) out.push(<Line key={`v${c}`} x1={pad + c * cell} y1={pad} x2={pad + c * cell} y2={pad + p.rows * cell} stroke={GRIDLINE} strokeWidth={1}/>);
    return out;
  }, [W, H, cell, pad, pearl, p]);
  const edgeLines = l.edges.map(([a, b], e) => {
    const m = shownMarks[e], A = pos(a), B = pos(b);
    if (m === LINE) return <Line key={e} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={focusEdges.has(e) ? C.gold : lineColour} strokeWidth={thick} strokeLinecap="round"/>;
    if (m === CROSS) { const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, k = cell * 0.09; return <G key={e}><Line x1={mx - k} y1={my - k} x2={mx + k} y2={my + k} stroke={C.coral} strokeWidth={2}/><Line x1={mx - k} y1={my + k} x2={mx + k} y2={my - k} stroke={C.coral} strokeWidth={2}/></G>; }
    if (focusEdges.has(e)) return <Line key={e} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={C.gold} strokeWidth={thick * 0.8} strokeDasharray={`${cell * 0.12} ${cell * 0.08}`} strokeLinecap="round"/>;
    return null;
  });
  const clues = p.kind === 'loop' ? p.clues.flatMap((n, c) => {
    if (n < 0 && !focusCells.has(c)) return [];
    const x = pad + (c % p.cols + 0.5) * cell, y = pad + (Math.floor(c / p.cols) + 0.5) * cell, ok = met(shownMarks, c);
    return [<G key={`c${c}`}>
      {focusCells.has(c) && <Rect x={x - cell * 0.42} y={y - cell * 0.42} width={cell * 0.84} height={cell * 0.84} rx={cell * 0.16} fill="#FBEFC9" stroke={C.gold} strokeWidth={2}/>}
      {n >= 0 && <SvgText x={x} y={y + cell * 0.17} fontSize={cell * 0.48} fontWeight="700" textAnchor="middle" fill={broken.has(c) ? C.error : ok ? C.teal : INK}>{String(n)}</SvgText>}
    </G>];
  }) : p.pearls.flatMap((k, v) => {
    const at = pos(v), bad = broken.has(v);
    return [<G key={`p${v}`}>
      {focusDots.has(v) && <Circle cx={at.x} cy={at.y} r={cell * 0.44} fill="#FBEFC9" stroke={C.gold} strokeWidth={2.5}/>}
      {k > 0 && threaded(v) && <Circle cx={at.x} cy={at.y} r={cell * 0.38} fill="none" stroke={C.teal} strokeWidth={Math.max(3, cell * 0.06)}/>}
      {k > 0 && <Circle cx={at.x} cy={at.y} r={cell * 0.3} fill={k === BLACK ? '#24302E' : '#FFFFFF'} stroke={bad ? C.error : '#24302E'} strokeWidth={bad ? 3.5 : 2.5}/>}
    </G>];
  });
  const dotMarks = pearl ? l.around.flatMap((_, v) => branches.has(v) ? [<Circle key={`d${v}`} cx={pos(v).x} cy={pos(v).y} r={cell * 0.16} fill={C.error}/>] : []) : l.around.map((_, v) => {
    const at = pos(v), hot = focusDots.has(v), bad = branches.has(v);
    return <Circle key={`d${v}`} cx={at.x} cy={at.y} r={hot ? cell * 0.14 : bad ? cell * 0.12 : Math.max(2.2, cell * 0.065)} fill={bad ? C.error : hot ? C.gold : DOT}/>;
  });
  // VoiceOver: one element per cell, with an action per side.
  const sideNames = ['right', 'bottom', 'left', 'top'];
  const a11y = Array.from({ length: p.rows * p.cols }, (_, c) => {
    const r = Math.floor(c / p.cols), col = c % p.cols, x = pad + col * cell, y = pad + r * cell;
    const sides = pearl ? [0, 1, 2, 3].map(d => l.step[c][d]) : [l.sides[c][1], l.sides[c][2], l.sides[c][3], l.sides[c][0]];
    const what = p.kind === 'loop' ? (p.clues[c] >= 0 ? `number ${p.clues[c]}` : 'empty cell') : p.pearls[c] === BLACK ? 'black pearl' : p.pearls[c] ? 'white pearl' : 'cell';
    const state = (e: number) => marks[e] === LINE ? 'line' : marks[e] === CROSS ? 'cross' : 'empty';
    const label = `Row ${r + 1}, column ${col + 1}, ${what}. ${sides.map((e, i) => e >= 0 ? `${sideNames[i]} ${state(e)}` : '').filter(Boolean).join(', ')}.`;
    return <View key={c} accessible accessibilityLabel={label} accessibilityActions={sides.flatMap((e, i) => e >= 0 ? [{ name: `edge-${e}`, label: `Change ${sideNames[i]}: ${state(e)} now` }] : [])}
      onAccessibilityAction={(event: AccessibilityActionEvent) => { const e = Number(event.nativeEvent.actionName.replace('edge-', '')); if (Number.isInteger(e) && live.current.active) send({ type: 'set', changes: [[e, (marks[e] + 1) % 3]] }); }}
      style={{ position: 'absolute', left: x, top: y, width: cell, height: cell }} pointerEvents="none"/>;
  });

  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 6 }}>
      <Copy style={{ flexShrink: 1, fontWeight: '700' }}>{view.title}</Copy>
      {!!view.teaches && <Copy style={{ flexShrink: 1 }}>{`· skill: ${techniqueNames[view.teaches as keyof typeof techniqueNames] ?? view.teaches}`}</Copy>}
      <Copy accessibilityLabel={`${done} of ${total} ${pearl ? 'pearls' : 'numbers'} done`}>{`· ${done}/${total}`}</Copy>
      <Button quiet compact selected={rules} onPress={() => setRules(on => !on)}>How to play</Button>
      {/* Always present, so opening the card never re-wraps this row and moves the board. */}
      <Button quiet compact disabled={!active || waiting || shown} onPress={ask} label="Hint: where should I look?">{waiting ? 'Getting a hint…' : 'Hint'}</Button>
    </View>
    {rules && <Copy style={{ color: C.ink }}>{rulesText[p.kind]}</Copy>}
    <View style={{ alignSelf: 'center', width: W, height: H }} {...responder.panHandlers}>
      <Svg width={W} height={H} pointerEvents="none">
        {background}
        {/* Pearls sit on top of the line that threads them; numbers sit under the loop's edges. */}
        {!pearl && clues}
        {edgeLines}
        {pearl && clues}
        {dotMarks}
      </Svg>
      {a11y}
    </View>
    {/* Everything that answers a move sits under the board, so the board itself never jumps. */}
    <View style={{ minHeight: 24 }}>
      {shown ? <View accessibilityLiveRegion="polite" style={{ gap: 6, padding: 12, borderRadius: 14, backgroundColor: '#FBF2D5', borderWidth: 1, borderColor: C.gold }}>
      <Text style={{ fontSize: 13, letterSpacing: 0.6, color: C.teal, fontWeight: '700' }}>{ladder.cue!.technique === 'clash' || ladder.cue!.technique === 'mistake' ? 'A MARK TO FIX' : techniqueNames[ladder.cue!.technique].toUpperCase()}</Text>
      <Copy style={{ color: C.ink }}>{stage === 2 ? ladder.cue!.think : ladder.cue!.look}</Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {stage === 1 && <Button quiet compact disabled={!active} onPress={() => setLadder(x => ({ ...x, stage: 2 }))}>Why?</Button>}
        <Button compact disabled={!active} onPress={show}>{ladder.cue!.technique === 'clash' || ladder.cue!.technique === 'mistake' ? 'Fix it for me' : 'Show me'}</Button>
        <Button quiet compact onPress={() => setLadder(closed(view.board.edits, view.helps))}>I’ll try it</Button>
      </View>
    </View> : trouble ? <Copy accessibilityLiveRegion="polite" style={{ color: C.error }}>{trouble}</Copy> : placed ? <Copy accessibilityLiveRegion="polite">{placed}</Copy> : null}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Button quiet compact disabled={!active || !view.board.undo.length} onPress={() => send({ type: 'undo' })}>Undo</Button>
      <Button quiet compact disabled={!active || !view.board.redo.length} onPress={() => send({ type: 'redo' })}>Redo</Button>
      <Button quiet compact disabled={!active || marks.every(v => v === EMPTY)} onPress={() => send({ type: 'reset' })}>Start over</Button>
    </View>
  </View>;
}
