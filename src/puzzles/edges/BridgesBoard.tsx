import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, View, useWindowDimensions, type AccessibilityActionEvent } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { Button, C, Copy } from '../../components/ui';
import { Text } from '../../components/Text';
import { feel } from '../../components/feel';
import { GridFeedback, GridInteraction } from '../grid/preferences';
import { GridChromeContext, boardRoom, bridgesCell, edgeBoardHeight } from '../grid/budget';
import { degree, overfull, shapeOf, type BridgesPuzzle } from './core';
import type { MarkEvent } from './marks';
import type { EdgeBoardProps } from './registration';
import { cueFor, techniqueNames, type Cue } from './teach';
import { releaseOffset, startOf, type TouchStart } from './touch';
import { PRESS_SLOP } from '../../components/stillPress';
import { PuzzleStatus, statusSentence, useStatusMax } from '../ui/PuzzleStatus';

const SEA = '#D4ECEE', DOT = '#A9D2D7', SAND = '#F7E8C4', SHORE = '#B48A55', PLANK = '#8E5F3A', DONE = '#D3EBCF', OVER = '#F8D3C8';
type Ladder = { stage: 0 | 1 | 2; cue: Cue | null; edits: number; helpsAt: number; placed: string };
const closed = (edits: number, helpsAt: number): Ladder => ({ stage: 0, cue: null, edits, helpsAt, placed: '' });
const howTo = 'Each island’s number is how many bridges it needs. Bridges go straight across or down, never cross, and there can be one or two between the same islands. In the end every island is joined into one map.';

/** Bridges on a sea of dots. Drag from an island toward a neighbour, tap the water between two islands, or tap two islands. */
export function BridgesBoard({ view, dispatch, active, width }: EdgeBoardProps<BridgesPuzzle>) {
  const p = view.puzzle, marks = view.board.marks, shape = useMemo(() => shapeOf(p), [p]), { islands, links, crosses } = shape;
  const statusMax = useStatusMax();
  const { width: windowWidth, height, fontScale } = useWindowDimensions(), chrome = useContext(GridChromeContext), feedback = useContext(GridFeedback), interaction = useContext(GridInteraction);
  // At accessibility sizes the board shares one height budget with the safe areas, bar and status line; below them it is as it always was.
  const room = edgeBoardHeight(boardRoom({ windowWidth, windowHeight: height, fontScale, chrome, pad: false, sentence: statusSentence(view.title, view.teaches ? techniqueNames[view.teaches as keyof typeof techniqueNames] ?? view.teaches : undefined, `${islands.length}/${islands.length}`) }), Math.max(300, height * 0.62));
  // A rim of water around the grid keeps rings and edge islands whole.
  const cell = bridgesCell(width, p.width, p.height, room), rim = Math.round(cell * 0.2);
  const W = cell * p.width + rim * 2, H = cell * p.height + rim * 2, r = cell * (cell < 40 ? 0.44 : 0.4);
  const at = useCallback((i: number) => ({ x: rim + (islands[i].x + 0.5) * cell, y: rim + (islands[i].y + 0.5) * cell }), [islands, cell, rim]);
  const [selected, setSelected] = useState<number | null>(null), [preview, setPreview] = useState<{ link: number; blocked: number[]; to: number } | null>(null);
  const [blocked, setBlocked] = useState<number[]>([]), [message, setMessage] = useState(''), [rules, setRules] = useState(false);
  const [ladder, setLadder] = useState<Ladder>(() => closed(view.board.edits, view.helps));
  const live = useRef({ marks, active, dispatch, selected });
  useLayoutEffect(() => { live.current = { marks, active, dispatch, selected }; }, [marks, active, dispatch, selected]);
  const accepted = useRef(view.board.edits);
  useEffect(() => { if (view.board.edits > accepted.current) feedback(); accepted.current = view.board.edits; }, [view.board.edits, feedback]);
  useEffect(() => () => interaction(false), [interaction]);
  useEffect(() => { if (!blocked.length) return; const t = setTimeout(() => setBlocked([]), 1400); return () => clearTimeout(t); }, [blocked]);

  const linkBetween = (a: number, b: number) => links.findIndex(l => l.a === a && l.b === b || l.a === b && l.b === a);
  const blockersOf = (link: number, counts: readonly number[]) => crosses[link].filter(j => counts[j] > 0);
  /** One more bridge, or none after two. A bridge that would cross another is refused and shown. */
  const cycle = (link: number) => {
    const { marks: m, active: on, dispatch: send } = live.current;
    if (!on) return;
    const next = (m[link] + 1) % 3, stop = next ? blockersOf(link, m) : [];
    if (stop.length) { setBlocked([link, ...stop]); setMessage('Bridges can’t cross. Take the other bridge away first.'); feel('warning'); return; }
    setMessage('');
    send({ type: 'set', changes: [[link, next]] });
  };
  const nearestIsland = (x: number, y: number) => {
    let best = -1, dist = cell * 0.62;
    islands.forEach((_, i) => { const c = at(i), d = Math.hypot(c.x - x, c.y - y); if (d < dist) { dist = d; best = i; } });
    return best;
  };
  /** Nearest link to a point on the water, measured to the segment between the two island rims. */
  const nearestLink = (x: number, y: number) => {
    let best = -1, dist = cell * 0.45;
    links.forEach((l, e) => {
      const a = at(l.a), b = at(l.b), d = l.horizontal ? (x > a.x && x < b.x ? Math.abs(y - a.y) : Infinity) : (y > a.y && y < b.y ? Math.abs(x - a.x) : Infinity);
      if (d < dist) { dist = d; best = e; }
    });
    return best;
  };
  /** The link leaving an island in the direction the finger points. */
  const linkToward = (island: number, dx: number, dy: number) => {
    const c = islands[island];
    return shape.around[island].find(e => { const o = islands[links[e].a === island ? links[e].b : links[e].a]; return Math.abs(dx) >= Math.abs(dy) ? o.y === c.y && Math.sign(o.x - c.x) === Math.sign(dx) : o.x === c.x && Math.sign(o.y - c.y) === Math.sign(dy); }) ?? -1;
  };
  // `wandered`: a water touch that went past the tap slop, which is a scroll attempt, never a bridge.
  const drag = useRef<(TouchStart & { x: number; y: number; island: number; link: number; moved: boolean; wandered: boolean }) | null>(null);
  /** An island drag's link from the finger's offset; within the island it is no link. */
  const aim = (d: NonNullable<typeof drag.current>, dx: number, dy: number) => {
    const c = at(d.island), ox = d.x + dx - c.x, oy = d.y + dy - c.y;
    if (Math.max(Math.abs(ox), Math.abs(oy)) < cell * 0.55) return null;
    return linkToward(d.island, ox, oy);
  };
  // eslint-disable-next-line react-hooks/refs -- PanResponder stores these event handlers; creation never reads the refs.
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => live.current.active,
    onMoveShouldSetPanResponder: () => live.current.active,
    // An island drag owns its touch. A touch that began on the water gives itself up, so the page can scroll.
    onPanResponderTerminationRequest: () => !drag.current || drag.current.island < 0,
    onPanResponderGrant: e => {
      const x = e.nativeEvent.locationX, y = e.nativeEvent.locationY, island = nearestIsland(x, y);
      // Only an island drag holds the page still; a swipe that starts on the water may scroll it.
      if (island >= 0) interaction(true);
      drag.current = { ...startOf(e), x, y, island, link: island < 0 ? nearestLink(x, y) : -1, moved: false, wandered: false };
    },
    onPanResponderMove: (_e, g) => {
      const d = drag.current;
      if (!d) return;
      if (d.island < 0) { if (Math.hypot(g.dx, g.dy) > PRESS_SLOP) d.wandered = true; return; }
      const link = aim(d, g.dx, g.dy);
      if (link === null) { if (d.link >= 0) { d.link = -1; setPreview(null); } return; }
      d.moved = true;
      if (link !== d.link) { d.link = link; setPreview(link >= 0 ? { link, blocked: live.current.marks[link] < 2 ? blockersOf(link, live.current.marks) : [], to: links[link].a === d.island ? links[link].b : links[link].a } : null); }
    },
    onPanResponderRelease: (e, g) => {
      const d = drag.current;
      drag.current = null; setPreview(null); interaction(false);
      if (!d) return;
      // Where the finger let go decides, not the last move sample, which can stop short.
      const { dx, dy } = releaseOffset(e, d, g);
      if (d.island >= 0) {
        const link = aim(d, dx, dy);
        if (link !== null) { d.moved = true; d.link = link; } else if (d.moved) d.link = -1;
        if (d.moved) { if (d.link >= 0) cycle(d.link); return; }
        // Two taps: an island, then a neighbour it can see.
        const from = live.current.selected, two = from !== null && from !== d.island ? linkBetween(from, d.island) : -1;
        if (two >= 0) { cycle(two); setSelected(null); } else setSelected(from === d.island ? null : d.island);
        return;
      }
      // The water answers only a tap: the finger stayed within the slop the whole time.
      if (d.link >= 0 && !d.wandered && Math.hypot(dx, dy) <= PRESS_SLOP) cycle(d.link);
      else setSelected(null);
    },
    onPanResponderTerminate: () => { drag.current = null; setPreview(null); interaction(false); },
  }), [cell, islands, links]); // eslint-disable-line react-hooks/exhaustive-deps -- handlers read live values through refs

  // Hints: a cue appears only after its help record was accepted; any board change closes it.
  const current = ladder.edits === view.board.edits, stage = current ? ladder.stage : 0;
  const waiting = current && stage > 0 && view.helps <= ladder.helpsAt, shown = current && stage > 0 && !waiting && !!ladder.cue;
  const placed = !current && view.board.edits === ladder.edits + 1 ? ladder.placed : '';
  const ask = () => { const cue = cueFor(p, marks); if (!cue) return; setSelected(null); setLadder({ stage: 1, cue, edits: view.board.edits, helpsAt: view.helps, placed: '' }); dispatch({ type: 'help' }); };
  const show = () => { if (!ladder.cue) return; setLadder(l => ({ ...l, placed: l.cue?.show ?? '' })); dispatch({ type: 'hint' }); };
  const send = (event: MarkEvent) => { setMessage(''); setSelected(null); dispatch(event); };

  const over = useMemo(() => new Set(overfull(p, marks)), [p, marks]);
  const finished = islands.filter((s, i) => degree(p, marks, i) === s.clue).length, first = [...over][0];
  const tooMany = first === undefined ? '' : `This ${islands[first].clue} has too many bridges.`;
  // Look rings the one island to think about; Why adds the neighbours it depends on. The answer stays hidden until Show me.
  const focus = new Set(shown ? (stage === 2 ? ladder.cue!.focus : ladder.cue!.focus.slice(0, 1)) : []);
  const neighbours = selected === null ? new Set<number>() : new Set(shape.around[selected].map(e => links[e].a === selected ? links[e].b : links[e].a));
  const plank = (e: number, count: number, color: string, dashed = false) => {
    const l = links[e], a = at(l.a), b = at(l.b), gap = r + 1, ox = l.horizontal ? 0 : 1, oy = l.horizontal ? 1 : 0;
    const x1 = a.x + (l.horizontal ? gap : 0), y1 = a.y + (l.horizontal ? 0 : gap), x2 = b.x - (l.horizontal ? gap : 0), y2 = b.y - (l.horizontal ? 0 : gap);
    const thick = Math.max(3, cell * (count === 2 ? 0.085 : 0.12)), off = cell * 0.11, dash = dashed ? `${cell * 0.16} ${cell * 0.1}` : undefined;
    const offsets = count === 2 ? [-off, off] : [0];
    return offsets.map((o, k) => <Line key={`${e}-${k}-${color}`} x1={x1 + ox * o} y1={y1 + oy * o} x2={x2 + ox * o} y2={y2 + oy * o} stroke={color} strokeWidth={thick} strokeLinecap="round" strokeDasharray={dash}/>);
  };
  /** Where an across link and a down link meet. */
  const crossPoint = (e: number, f: number) => { const h = links[e].horizontal ? e : f, v = h === e ? f : e; return { x: at(links[v].a).x, y: at(links[h].a).y }; };
  const covered = useMemo(() => new Set(links.flatMap((l, e) => marks[e] ? l.water : [])), [links, marks]);
  const dots = useMemo(() => p.clues.flatMap((c, i) => c || covered.has(i) ? [] : [<Circle key={i} cx={rim + (i % p.width + 0.5) * cell} cy={rim + (Math.floor(i / p.width) + 0.5) * cell} r={Math.max(1.5, cell * 0.045)} fill={DOT}/>]), [p, cell, rim, covered]);
  const describe = (i: number) => {
    const s = islands[i], has = degree(p, marks, i);
    return `Island ${s.clue}, row ${s.y + 1}, column ${s.x + 1}. ${has} of ${s.clue} bridges${has === s.clue ? ', finished' : has > s.clue ? ', too many' : ''}.`;
  };
  const actionsFor = (i: number) => shape.around[i].map(e => { const o = links[e].a === i ? links[e].b : links[e].a, s = islands[o], c = islands[i]; const dir = s.x > c.x ? 'right' : s.x < c.x ? 'left' : s.y > c.y ? 'down' : 'up'; return { name: `link-${e}`, label: `Bridge ${dir} to the ${s.clue}: ${marks[e]} now` }; });

  return <View style={{ gap: 12 }}>
    <PuzzleStatus title={view.title} skill={view.teaches ? techniqueNames[view.teaches as keyof typeof techniqueNames] ?? view.teaches : undefined} count={`${finished}/${islands.length}`} countLabel={`${finished} of ${islands.length} islands finished`}>
      <Button quiet compact maxFontSizeMultiplier={statusMax} selected={rules} onPress={() => setRules(on => !on)}>How to play</Button>
      {/* Always present, so opening the card never re-wraps this row and moves the board. */}
      <Button quiet compact maxFontSizeMultiplier={statusMax} disabled={!active || waiting || shown} onPress={ask} label="Hint: where should I look?">{waiting ? 'Getting a hint…' : 'Hint'}</Button>
    </PuzzleStatus>
    {rules && <Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink }}>{howTo}</Copy>}
    <View style={{ alignSelf: 'center', width: W, height: H }} {...responder.panHandlers} accessible={false}>
      <Svg width={W} height={H} pointerEvents="none">
        <Rect x={0} y={0} width={W} height={H} rx={Math.min(16, cell * 0.4)} fill={SEA}/>
        {dots}
        <G>{links.flatMap((_, e) => !marks[e] ? [] : preview?.link === e && marks[e] === 2 ? [<G key={`fade-${e}`} opacity={0.3}>{plank(e, 2, PLANK)}</G>] : plank(e, marks[e], PLANK))}</G>
        {/* What letting go would do: a ghost bridge (two when it would become a double), grey dashes when both would go, red when refused. */}
        {preview && <G opacity={preview.blocked.length || marks[preview.link] === 2 ? 1 : 0.5}>{plank(preview.link, marks[preview.link] === 2 ? 2 : marks[preview.link] + 1, preview.blocked.length ? C.error : marks[preview.link] === 2 ? C.muted : PLANK, !!preview.blocked.length || marks[preview.link] === 2)}</G>}
        {/* A refused bridge: only the attempt is red, with a cross where it meets the bridge in the way. */}
        {blocked.length > 0 && marks[blocked[0]] === 0 && plank(blocked[0], 1, C.error, true)}
        {blocked.length > 0 && blocked.slice(1).map(e => { const k = crossPoint(blocked[0], e), d = cell * 0.16; return <G key={`x-${e}`}><Circle cx={k.x} cy={k.y} r={cell * 0.22} fill={SEA}/><Line x1={k.x - d} y1={k.y - d} x2={k.x + d} y2={k.y + d} stroke={C.error} strokeWidth={3} strokeLinecap="round"/><Line x1={k.x - d} y1={k.y + d} x2={k.x + d} y2={k.y - d} stroke={C.error} strokeWidth={3} strokeLinecap="round"/></G>; })}
        {preview && preview.blocked.length > 0 && preview.blocked.map(e => { const k = crossPoint(preview.link, e), d = cell * 0.16; return <G key={`px-${e}`}><Line x1={k.x - d} y1={k.y - d} x2={k.x + d} y2={k.y + d} stroke={C.error} strokeWidth={3} strokeLinecap="round"/><Line x1={k.x - d} y1={k.y + d} x2={k.x + d} y2={k.y - d} stroke={C.error} strokeWidth={3} strokeLinecap="round"/></G>; })}
        {islands.map((s, i) => {
          const c = at(i), done = degree(p, marks, i) === s.clue, bad = over.has(i);
          return <G key={i}>
            {preview?.to === i && !preview.blocked.length && <Circle cx={c.x} cy={c.y} r={r + Math.max(3, cell * 0.09)} fill="none" stroke={C.gold} strokeWidth={Math.max(3, cell * 0.08)}/>}
            {/* The island to think about gets the full gold ring; its neighbours (once Why is open) a thinner one. */}
            {focus.has(i) && <Circle cx={c.x} cy={c.y} r={r + Math.max(4, cell * 0.12)} fill="none" stroke={C.gold} strokeWidth={i === ladder.cue?.focus[0] ? Math.max(3, cell * 0.1) : Math.max(2, cell * 0.045)}/>}
            {selected === i && <Circle cx={c.x} cy={c.y} r={r + Math.max(3, cell * 0.09)} fill="none" stroke={C.blue} strokeWidth={Math.max(3, cell * 0.08)}/>}
            {neighbours.has(i) && <Circle cx={c.x} cy={c.y} r={r + 2} fill="none" stroke={C.blue} strokeWidth={2} strokeDasharray="4 3"/>}
            <Circle cx={c.x} cy={c.y} r={r} fill={bad ? OVER : done ? DONE : SAND} stroke={bad ? C.error : done ? C.teal : SHORE} strokeWidth={Math.max(2, cell * 0.06)}/>
            <SvgText x={c.x} y={c.y + cell * 0.165} fontSize={cell * (cell < 40 ? 0.52 : 0.46)} fontWeight="700" textAnchor="middle" fill={bad ? C.error : done ? C.teal : C.ink}>{String(s.clue)}</SvgText>
          </G>;
        })}
      </Svg>
      {/* VoiceOver: one element per island with an action per neighbour. */}
      {islands.map((s, i) => { const c = at(i); return <View key={i} accessible accessibilityRole="adjustable" accessibilityLabel={describe(i)} accessibilityActions={actionsFor(i)}
        onAccessibilityAction={(event: AccessibilityActionEvent) => { const e = Number(event.nativeEvent.actionName.replace('link-', '')); if (Number.isInteger(e)) cycle(e); }}
        style={{ position: 'absolute', left: c.x - r, top: c.y - r, width: r * 2, height: r * 2 }} pointerEvents="none"/>; })}
    </View>
    {/* Everything that answers a move sits under the board, so the board itself never jumps. */}
    <View style={{ minHeight: 24 }}>
      {shown ? <View accessibilityLiveRegion="polite" style={{ gap: 6, padding: 12, borderRadius: 14, backgroundColor: '#FBF2D5', borderWidth: 1, borderColor: C.gold }}>
      <Text maxFontSizeMultiplier={statusMax} style={{ fontSize: 13, letterSpacing: 0.6, color: C.teal, fontWeight: '700' }}>{ladder.cue!.technique === 'clash' || ladder.cue!.technique === 'mistake' ? 'A BRIDGE TO FIX' : techniqueNames[ladder.cue!.technique].toUpperCase()}</Text>
      <Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink }}>{stage === 2 ? ladder.cue!.think : ladder.cue!.look}</Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {stage === 1 && <Button quiet compact maxFontSizeMultiplier={statusMax} disabled={!active} onPress={() => setLadder(l => ({ ...l, stage: 2 }))}>Why?</Button>}
        <Button compact maxFontSizeMultiplier={statusMax} disabled={!active} onPress={show}>{ladder.cue!.technique === 'clash' || ladder.cue!.technique === 'mistake' ? 'Fix it for me' : 'Show me'}</Button>
        <Button quiet compact maxFontSizeMultiplier={statusMax} onPress={() => setLadder(closed(view.board.edits, view.helps))}>I’ll try it</Button>
      </View>
    </View> : message ? <Copy accessibilityLiveRegion="polite" style={{ color: C.error }}>{message}</Copy> : tooMany ? <Copy accessibilityLiveRegion="polite" style={{ color: C.error }}>{tooMany}</Copy> : placed ? <Copy accessibilityLiveRegion="polite">{placed}</Copy> : null}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Button quiet compact maxFontSizeMultiplier={statusMax} disabled={!active || !view.board.undo.length} onPress={() => send({ type: 'undo' })}>Undo</Button>
      <Button quiet compact maxFontSizeMultiplier={statusMax} disabled={!active || !view.board.redo.length} onPress={() => send({ type: 'redo' })}>Redo</Button>
      <Button quiet compact maxFontSizeMultiplier={statusMax} disabled={!active || marks.every(v => !v)} onPress={() => send({ type: 'reset' })}>Start over</Button>
    </View>
  </View>;
}
