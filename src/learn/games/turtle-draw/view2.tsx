/** Turtle Draw, version 2 rounds (C2c): measured board space, every block counted, Undo, a hint ladder, and the K7 block editor from Level 4.
 * Version 1 rounds keep the original board in view.tsx. Free drawing is the same free drawing: ungraded, with no hint and no limit but the shared ones. */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, C, Copy } from '../../../components/ui';
import { useReducedMotion } from '../../../components/motion';
import { BoardColumns, useBoardColumns, useBoardGeometry } from '../../BoardSpace';
import { SCHOOL_BOARD_MIN } from '../../boardGeometry';
import { ProgramEditor } from '../../program/ProgramEditor';
import { encodeProgram, sessionBytes } from '../../program/codec';
import { interpret } from '../../program/interpreter';
import { useStepReveal } from '../../stepReveal';
import type { BoardProps } from '../../types';
import { advance, draw, drawingFeedback, initialProgram, programIssue, replaceBlock, solves, wrapIssue, type Block, type TurtleState } from './engine';
import { blockCost } from './dsl';
import { editText, editsToGo, nearestEdit } from './distance';
import { blockLabel } from './labels';
import { programCodes, readTurtleDraft, turtleBlocks, turtleProgram } from './program';
import { ASPECT, SandCanvas } from './SandCanvas';
import { templateWinners } from './templates';
import { learnSources } from '../../../content/learnAudio';

/** Free drawing keeps the original shared limits: 20 blocks on the top level and the 120-line cap. */
export const FREE_BLOCKS = 20;
const FORWARD = [60, 70, 80, 90, 100], TURNS = [45, 60, 90, 120], COUNTS = [2, 3, 4, 6, 8], PENS = ['coral', 'teal', 'gold'] as const;
const goalWords = (level: number, debug: boolean) => debug ? 'One block is wrong. Find it and fix it.' : level === 5 ? 'Put a repeat inside a repeat.' : level === 4 ? 'Work out each turn, then repeat.' : level === 3 ? 'Use repeat to trace the shape.' : 'Trace the faint shape.';

export function BoardV2(props: BoardProps<TurtleState>) {
  const s = props.session.state;
  return <Round key={`${props.session.id}:${s.done}:${s.free}`} {...props} />;
}

function Round({ session, update, practice, assistance, cheer, sound, width, active, coach }: BoardProps<TurtleState>) {
  const s = session.state, task = s.tasks[Math.min(s.done, 3)], free = s.free, origin = free ? undefined : task.origin;
  useStepReveal(s.done);
  const reduced = useReducedMotion(), wide = useBoardColumns();
  const goal = free ? [] : draw(task.target, task.origin) || [], full = draw(s.program, origin) || [], traced = full.slice(0, s.cursor), steps = Math.max(1, full.length);
  const won = !free && s.done < 4 && !s.running && s.cursor > 0 && solves(task, s.program);
  const [blockMode, setBlocks] = useState(task.blockEditor === true), blocks = blockMode && task.blockEditor === true && !free;
  const draft = s.blockDraft ? readTurtleDraft(s.blockDraft) : null;
  const [message, setMessage] = useState(''), [editing, setEditing] = useState<{ path: number[]; block: Block } | null>(null);
  const [history, setHistory] = useState<Block[][]>([]), [hint, setHint] = useState(0);
  const winners = !free && task.template !== undefined ? templateWinners(s.level, task.template) : [task.target];
  const feedback = !free && s.cursor > 0 && !s.running && !won ? drawingFeedback(task, s.program) : null;
  const finish = (state: TurtleState) => {
    if (state.free) { cheer('right'); setMessage('Your own turtle picture!'); }
    else if (solves(task, state.program)) { practice(state.level >= 3 ? 'think.loops' : 'think.geometry', true); cheer(state.done === 3 ? 'big' : 'right'); setMessage('Shape traced!'); }
    else { practice('think.debug', false); setMessage(drawingFeedback(task, state.program).message); }
  };
  useEffect(() => {
    if (!active || !s.running) return;
    const id = setTimeout(() => { const last = s.cursor + 1 >= steps; update(advance(s)); if (last) finish(s); }, reduced ? 15 : Math.max(35, Math.min(220, 5000 / steps)));
    return () => clearTimeout(id);
    // `finish` only reads the round's own task; the effect re-arms on every state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, task, steps, active, reduced, update, practice, cheer]);

  const limit = free ? Infinity : task.limit;
  const issue = (program: Block[]): string | null => {
    const legacy = programIssue(program);
    if (legacy) return legacy;
    if (free ? program.length > FREE_BLOCKS : blockCost(program) > limit) return free ? 'The plan is full. Edit or remove a block first.' : `That makes ${blockCost(program)} blocks. This goal allows ${limit}. A repeat can hold blocks that run again.`;
    return null;
  };
  const change = (program: Block[]) => {
    if (!active || s.running) return false;
    const problem = issue(program);
    if (problem) { setMessage(problem); return false; }
    setHistory(h => [...h.slice(-15), s.program]);
    const { blockDraft: _, ...legacy } = s;
    update({ ...legacy, program, cursor: 0 }); setMessage(''); setEditing(null); setHint(0); sound('tap', true);
    return true;
  };
  const add = (block: Block) => { if (change([...s.program, block])) coach.done(); };
  const wrap = (times: number) => { const problem = wrapIssue(s.program, times); if (problem) setMessage(problem); else change([{ kind: 'repeat', times, body: s.program }]); };
  const undo = () => { const previous = history.at(-1); if (!previous || s.running || !active) return; setHistory(h => h.slice(0, -1)); const { blockDraft: _, ...legacy } = s; update({ ...legacy, program: previous, cursor: 0 }); setMessage(''); setHint(0); sound('tap', true); };
  const run = () => { const problem = programIssue(s.program); if (problem) { setMessage(problem); return; } update({ ...s, cursor: 0, running: true, attempts: s.attempts + 1 }); setEditing(null); setMessage('Watch the turtle draw!'); };
  const next = () => { const done = s.done + 1; const { blockDraft: _, ...legacy } = s; update({ ...legacy, done, program: done < 4 ? initialProgram(s.tasks[done]) : [], cursor: 0, running: false, free: false }); };
  const showMe = () => { assistance?.(); const { blockDraft: _, ...legacy } = s; update({ ...legacy, program: task.target, cursor: 0, helped: true }); setEditing(null); setHint(0); setMessage('Here is one way. Press Draw!'); };
  const hintText = (): string => {
    if (hint === 0) return '';
    const near = nearestEdit(s.program, winners);
    if (!near) return 'Your blocks match the picture. Press Draw.';
    if (hint === 1) return s.cursor > 0 && feedback ? feedback.message : `You are ${editsToGo(s.program, winners)} ${editsToGo(s.program, winners) === 1 ? 'change' : 'changes'} from the picture.`;
    return editText(near.edit, s.program);
  };

  const geometry = useBoardGeometry('turtle-draw', Math.min(Math.max(width, 120) * ASPECT, 288), SCHOOL_BOARD_MIN['turtle-draw'], !blocks);
  const side = blocks ? Math.min(Math.max(width, 120), 230) : Math.min(Math.max(width, 120), geometry.height / ASPECT);
  const point = traced.at(-1)?.to || origin || { x: 100, y: 80 };
  const lengths = [...new Set(goal.map(a => Math.round(Math.hypot(a.to.x - a.from.x, a.to.y - a.from.y))))].join(', ');
  const canvas = <View testID={geometry.testID} onLayout={geometry.onLayout} style={{ alignItems: 'center' }}>
    <SandCanvas width={side} goal={goal} traced={traced} point={point} wrongLine={feedback?.segment ?? null} labels={!free} label={`Sand canvas. Grid squares are 10 units.${goal.length ? ` Target lengths: ${lengths} units.` : ''} ${traced.length} drawn lines.`} />
  </View>;

  const programLine = free ? `Free drawing · ${s.program.length} ${s.program.length === 1 ? 'block' : 'blocks'}` : `Your program: ${blockCost(s.program)} of ${task.limit} blocks`;
  const status = <Copy testID="turtle-message" maxFontSizeMultiplier={1.5} accessibilityLiveRegion="polite" style={{ fontSize: 15, color: C.ink }}>{message || programLine}</Copy>;
  const controlsOff = !active || s.running;
  // A recording appears only once the lead has generated its audio; until then the printed words carry everything.
  const speech = task.debug ? 'c2c-turtle-fix' : s.level === 4 ? 'c2c-turtle-angles' : null;
  const hear = speech && learnSources[speech] && !free && !won ? <Button quiet compact maxFontSizeMultiplier={1.5} disabled={controlsOff} onPress={() => sound(speech, true)}>Hear this</Button> : null;
  const runRow = <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {won || free ? <>
      <Button style={{ flexGrow: 1 }} onPress={next}>{s.done === 3 ? 'Finish!' : 'Next shape'}</Button>
      {won && <Button quiet onPress={() => { const { blockDraft: _, ...legacy } = s; update({ ...legacy, free: true, program: [], cursor: 0 }); setMessage('Free draw: add any blocks!'); }}>Free draw</Button>}
    </> : <>
      <Button style={{ flexGrow: 1 }} maxFontSizeMultiplier={1.5} disabled={controlsOff || !s.program.length} onPress={run}>Draw ▶</Button>
      {!blocks && <Button quiet compact maxFontSizeMultiplier={1.5} disabled={controlsOff || !history.length} onPress={undo}>Undo</Button>}
      {!free && <Button quiet compact maxFontSizeMultiplier={1.5} disabled={controlsOff || hint >= 2} onPress={() => { assistance?.(); setHint(h => Math.min(2, h + 1)); sound('tap', true); }}>{hint === 0 ? 'Hint' : 'More hint'}</Button>}
      {!free && <Button quiet compact maxFontSizeMultiplier={1.5} disabled={controlsOff} onPress={showMe}>Show me</Button>}
      {hear}
    </>}
  </View>;
  const hintPanel = hint > 0 && !won && !free ? <View accessibilityLiveRegion="polite" testID="turtle-hint" style={{ padding: 10, borderRadius: 12, backgroundColor: C.soft }}><Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink }}>{hintText()}</Copy></View> : null;
  const palette = (kind: 'forward' | 'turn' | 'pen' | 'wrap') => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
    {kind === 'forward' && FORWARD.map(n => <Button key={n} compact quiet maxFontSizeMultiplier={1.5} label={`Add forward ${n}`} disabled={controlsOff || won} onPress={() => add({ kind: 'forward', n })}>↑ {n}</Button>)}
    {kind === 'turn' && TURNS.map(angle => <Button key={angle} compact quiet maxFontSizeMultiplier={1.5} label={`Add turn ${angle} degrees`} disabled={controlsOff || won} onPress={() => add({ kind: 'turn', angle })}>↻ {angle}°</Button>)}
    {kind === 'pen' && PENS.map(color => <Button key={color} compact quiet maxFontSizeMultiplier={1.5} label={`Add ${color} pen`} disabled={controlsOff || won} onPress={() => add({ kind: 'color', color })}>{color} pen</Button>)}
    {kind === 'wrap' && COUNTS.map(times => <Button key={times} compact quiet maxFontSizeMultiplier={1.5} label={`Wrap plan in repeat ${times}`} disabled={controlsOff || won || !s.program.length} onPress={() => wrap(times)}>Repeat ×{times}</Button>)}
  </View>;
  const renderBlock = (block: Block, path: number[]): React.ReactNode => <View key={path.join('.')} style={{ gap: 5, padding: 7, borderRadius: 10, backgroundColor: block.kind === 'repeat' ? '#F5D398' : '#DCE9E3', borderLeftWidth: path.length > 1 ? 3 : 0, borderColor: '#648B80' }}>
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {block.kind === 'repeat' ? <Copy maxFontSizeMultiplier={1.5} style={{ flex: 1, fontWeight: '800' }}>{blockLabel(block)} · body below</Copy>
        : <Button compact quiet maxFontSizeMultiplier={1.5} style={{ flex: 1 }} label={`Edit block ${path.map(i => i + 1).join('.')}: ${blockLabel(block)}`} disabled={controlsOff || won} onPress={() => setEditing({ path, block })}>{blockLabel(block)} ✎</Button>}
      {path.length === 1 && <Button compact quiet maxFontSizeMultiplier={1.5} label={`Remove block ${path[0] + 1}`} disabled={controlsOff || won} onPress={() => change(s.program.filter((_, i) => i !== path[0]))}>✕</Button>}
    </View>
    {block.kind === 'repeat' && block.body.map((child, i) => renderBlock(child, [...path, i]))}
  </View>;
  const editor = editing && <View style={{ gap: 6, padding: 10, backgroundColor: '#FFF4D4', borderRadius: 12 }}>
    <Copy maxFontSizeMultiplier={1.5} style={{ fontWeight: '800' }}>Change {blockLabel(editing.block)} · keep the rest of the loop</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {(editing.block.kind === 'forward' ? FORWARD.map(n => ({ kind: 'forward', n } as Block)) : editing.block.kind === 'turn' ? TURNS.map(angle => ({ kind: 'turn', angle } as Block)) : PENS.map(color => ({ kind: 'color', color } as Block))).map(b => <Button key={blockLabel(b)} compact maxFontSizeMultiplier={1.5} disabled={controlsOff} onPress={() => change(replaceBlock(s.program, editing.path, b))}>{blockLabel(b)}</Button>)}
      <Button compact quiet maxFontSizeMultiplier={1.5} onPress={() => setEditing(null)}>Cancel edit</Button>
    </View>
  </View>;
  const programList = <View testID="turtle-program" style={{ gap: 6, padding: 6, borderRadius: 14, backgroundColor: C.paper }}>{!s.program.length && <Copy maxFontSizeMultiplier={1.5} style={{ padding: 10 }}>Tap a block to begin</Copy>}{s.program.map((b, i) => renderBlock(b, [i]))}</View>;
  const runningPath = (() => { const frames = interpret(draft?.program ?? turtleProgram(s.program), 0, { step: n => n + 1, blocked: () => false })?.frames.filter(f => programCodes[f.command].kind === 'forward'); return frames?.[s.cursor - 1]?.path; })();
  const editorBlock = s.done < 4 && <ProgramEditor schoolGeometry key={`${session.id}:${s.done}:${s.free}`} program={draft?.program ?? turtleProgram(s.program)} songs={false} tray={free ? undefined : task.limit}
    cards={programCodes.map((block, code) => ({ code, name: blockLabel(block), icon: <Copy maxFontSizeMultiplier={1.3}>{block.kind === 'forward' ? '↑' : block.kind === 'turn' ? '↻' : '●'}</Copy>, speech: `k7-turtle-${code}` }))}
    disabled={!active || s.running || won} hear={key => sound(key, true)} currentPath={runningPath}
    onChange={program => {
      const plan = turtleBlocks(program);
      if (!plan) return { accepted: false as const, reason: 'Turtle uses drawing cards and repeats; obstacle conditions do not work here.' };
      const problem = programIssue(plan);
      if (problem) return { accepted: false as const, reason: problem };
      const nextState = { ...s, program: plan, blockDraft: encodeProgram(program), cursor: 0, running: false };
      if (sessionBytes({ ...session, state: nextState }) > 4096) return false;
      update(nextState); setMessage(''); setHint(0); return true;
    }}
    onStep={() => { if (s.cursor >= steps) return; update({ ...advance({ ...s, running: true }), running: false }); if (s.cursor + 1 >= steps) finish(s); else sound('tap', true); }}
    onRestart={() => update({ ...s, cursor: 0, running: false })} />;

  const cardsPrimary = <>{status}{runRow}{hintPanel}{!won && palette('forward')}</>;
  const cardsRest = <>{!won && <>{palette('turn')}{s.level >= 2 && palette('pen')}{s.level >= 3 && <><Copy maxFontSizeMultiplier={1.5}>↻ ×2 = [↑ ↻] + [↑ ↻] · two whole-body runs</Copy>{palette('wrap')}</>}</>}{programList}{editor}</>;
  const primary = blocks ? <>{status}{runRow}{hintPanel}{editorBlock}</> : wide ? <>{cardsPrimary}{cardsRest}</> : cardsPrimary;
  const toggle = task.blockEditor === true && !free && s.done < 4 && <Button quiet compact maxFontSizeMultiplier={1.5} disabled={controlsOff} onPress={() => setBlocks(b => !b)}>{blocks ? 'Drawing cards' : 'Block editor'}</Button>;
  const heading = s.done === 4 ? 'Turtle artist!' : `Drawing ${s.done + 1} of 4 · ${free ? 'Free draw' : goalWords(s.level, task.debug)}`;
  return <View style={{ gap: 9, alignSelf: 'stretch' }}>
    <Copy maxFontSizeMultiplier={1.5} style={{ fontSize: 18, fontWeight: '700', color: C.ink }}>{heading}</Copy>
    <BoardColumns reserveColumnChrome={false} drawing={canvas}>{primary}</BoardColumns>
    {toggle}
    {!blocks && !wide && cardsRest}
  </View>;
}
