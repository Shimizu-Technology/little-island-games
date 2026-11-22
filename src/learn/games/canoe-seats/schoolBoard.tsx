import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { hasSpeech } from '../../../components/Audio';
import { Button, C, Copy } from '../../../components/ui';
import type { HintCue } from '../../../puzzles/hints';
import { PuzzleHelp, type HintCommit, type HintSnapshot } from '../../../puzzles/ui/PuzzleHelp';
import type { BoardProps } from '../../types';
import { CanoeBoard } from './board';
import {
  canCheck, checkSeats, dealFresh, keeperOf, levelInfo, lightsChoice, markHelped, nextBoard, passClues, placeItem, puzzleAt, resetSeats, revealClues, setLights, teachKindOf,
  toggleUsed, undoSeat, type CanoeState,
} from './engine';
import { canoeHelpRules, canoeView, type CanoeView, type HelpMove } from './help';
import { clueKey, teachCaptions } from './speech';

/** The help key names this exact board, seating, and keeper visibility, so a hint for any other position or keeper is never shown or applied. */
const keyOf = (s: CanoeState) => `${s.index}:${s.puzzles[s.index]?.join('|') ?? ''}:${s.pos.join(',')}:${s.lights ? 1 : 0}:${s.checks}:${s.helped ? 1 : 0}:${s.won ? 1 : 0}:${s.keeper}:${s.cover ? 1 : 0}`;
export function SchoolBoard({ session, update, practice, assistance, cheer, coach, active, width, sound, soundOn }: BoardProps<CanoeState>) {
  const state = session.state, together = session.options.mode === 'together';
  const puzzle = useMemo(() => puzzleAt(state), [state.index, state.puzzles]); // eslint-disable-line react-hooks/exhaustive-deps -- index and tuples identify the board.
  const latest = useRef(state);
  useLayoutEffect(() => { latest.current = state; }, [state]);
  const [notice, setNotice] = useState(''), [cue, setCue] = useState<HintCue | null>(null);
  const boardKey = `${state.index}:${state.puzzles[state.index]?.join('|') ?? ''}`;
  const commit = useCallback((next: CanoeState) => { if (next === latest.current) return false; latest.current = next; update(next); return true; }, [update]);
  const won = useCallback((next: CanoeState, hinted: boolean) => {
    if (!next.won || hinted) return;
    if (next.index === next.puzzles.length - 1) cheer('big', 'canoe-all-seated');
    else sound('match');
    if (!next.helped && next.misses <= 1) practice('think.seat-logic', true);
  }, [cheer, practice, sound]);
  const placeOne = useCallback((item: number, seat: number, hinted: boolean) => {
    const before = latest.current, next = placeItem(before, item, seat);
    if (!commit(next)) return false;
    sound('tap');
    setNotice('');
    if (next.won && !before.won) won(next, hinted);
    return true;
  }, [commit, sound, won]);
  const check = useCallback(() => {
    const next = checkSeats(latest.current);
    if (!commit(next)) return;
    if (next.won) won(next, false);
    else sound('canoe-not-yet');
  }, [commit, sound, won]);
  const visibleClues = useMemo(() => (puzzle && together ? puzzle.clues.map((_, i) => i).filter(i => keeperOf(i) === state.keeper) : undefined), [puzzle, together, state.keeper]);
  const rules = useMemo(() => puzzle && canoeHelpRules(puzzle, !state.lights, visibleClues), [puzzle, state.lights, visibleClues]);
  const snapshot = useMemo<HintSnapshot<CanoeView> | null>(() => puzzle && { key: keyOf(state), view: canoeView(puzzle, state.pos, !state.lights) }, [puzzle, state]);
  /** Help is recorded on the round before any cue shows; helped placements use the same rule as play. */
  const helpCommit = useCallback(async (event: HintCommit<HelpMove>, expected: string): Promise<HintSnapshot<CanoeView> | null> => {
    const at = latest.current, board = puzzleAt(at);
    if (!active || !board || keyOf(at) !== expected) return null;
    if (event.kind === 'help') { assistance?.(); commit(markHelped(at)); }
    else if (event.kind === 'step' && !placeOne(Math.floor(event.action / 8), (event.action % 8) - 1, true)) return null;
    return { key: keyOf(latest.current), view: canoeView(board, latest.current.pos, !latest.current.lights) };
  }, [active, assistance, commit, placeOne]);
  const onCue = useCallback((next: HintCue | null) => {
    setCue(next);
    if (next?.text.startsWith('Look')) sound('canoe-hint-look');
    else if (next?.text.startsWith('Think')) sound('canoe-hint-think');
  }, [sound]);
  // A teaching board says what its new card means, once, as automatic speech the settings can silence.
  const teachNow = teachKindOf(state.level, state.puzzles[state.index]), fresh = !state.moves && active;
  useEffect(() => { if (teachNow && fresh) sound(`canoe-teach-${teachNow}`, true); }, [boardKey]); // eslint-disable-line react-hooks/exhaustive-deps -- once per board.
  const hear = useCallback((clue: number) => {
    const p = puzzleAt(latest.current), key = p && clueKey(p, p.clues[clue]);
    if (!key || !soundOn || !hasSpeech(key)) return false;
    sound(key);
    return true;
  }, [sound, soundOn]);
  if (!puzzle || !rules || !snapshot) return null;
  const teach = teachNow;
  const teachLine = teach ? teachCaptions[teach] : '';
  const title = `${levelInfo[state.level - 1].name} · Canoe ${state.index + 1} of ${state.puzzles.length}${teach ? ' · New clue' : ''}`;
  const finished = state.won ? <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 10, alignSelf: 'stretch', backgroundColor: '#E2F2E4', borderRadius: 20, padding: 14 }}>
    <Copy maxFontSizeMultiplier={1.5} style={{ fontWeight: '900', fontSize: 20, color: C.ink }}>Everyone has a seat!</Copy>
    <Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink, fontSize: 16, textAlign: 'center' }}>{state.lights ? 'Every clue is true.' : state.misses ? 'Every clue is true. Checking again was the right idea.' : 'Every clue is true, first Check!'}</Copy>
    {state.helped && <Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink, fontSize: 14, textAlign: 'center' }}>A helped finish counts too. Want to try a fresh one yourself?</Copy>}
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      <Button compact maxFontSizeMultiplier={1.5} onPress={() => commit(nextBoard(latest.current))}>{state.index + 1 === state.puzzles.length ? 'Finish' : 'Next canoe'}</Button>
      {state.helped && <Button quiet compact maxFontSizeMultiplier={1.5} onPress={() => { commit(dealFresh(latest.current, Math.random)); setNotice('Your turn on a new one!'); }}>Try a fresh one</Button>}
    </View>
  </View> : undefined;
  const names = session.names ?? ['Player 1', 'Player 2'];
  return <CanoeBoard key={boardKey} puzzle={puzzle} pos={state.pos} used={state.used} lights={state.lights} won={state.won} missed={state.checked} canCheck={canCheck(state)}
    active={active} width={width} title={title} hear={hear} notice={notice} cue={cue} finished={finished} teach={teach === 'whatif' ? null : teach} teachNote={teachLine}
    coach={state.index === 0 && !state.moves ? coach : undefined}
    onPlace={(item, seat) => placeOne(item, seat, false)} onToggleUsed={clue => commit(toggleUsed(latest.current, clue))} onCheck={check}
    onUndo={() => commit(undoSeat(latest.current))} onReset={() => commit(resetSeats(latest.current))} canUndo={state.undo.length > 0} canReset={state.pos.some(s => s !== -1)}
    onLights={lightsChoice(state.level) ? on => commit(setLights(latest.current, on)) : undefined}
    keepers={together ? { names, keeper: state.keeper, cover: state.cover, owner: keeperOf, onPass: () => { setCue(null); if (commit(passClues(latest.current))) sound('canoe-pass'); }, onReveal: () => { setCue(null); commit(revealClues(latest.current)); } } : undefined}
    help={<PuzzleHelp key={`${boardKey}:${state.lights ? 1 : 0}:${together ? `${state.keeper}:${state.cover ? 1 : 0}` : 'solo'}`} snapshot={snapshot} rules={rules} commit={helpCommit} onFresh={() => { commit(dealFresh(latest.current, Math.random)); setNotice('Your turn on a new one!'); }} kind="grid" failedRuns={0} active={active && !state.cover} onCue={onCue} />} />;
}
