import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, C, Copy } from '../../../components/ui';
import type { BoardProps } from '../../types';
import { ShelfArt } from './art';
import { dealFresh, finishedBoard, markHelped, nextBoard, parOf, puzzleAt, resetBoard, swipeBoard, undoBoard, type SlipState } from './engine';
import { Playfield } from './field';
import { homeAll, type Dir } from './rules';

export function Art({ size }: { size: number }) { return <ShelfArt size={size} />; }
const rung = ['', 'Paddling', 'Shallows', 'Two crabs', 'Lagoon', 'Stopper'];

export function Board({ session, update, practice, assistance, cheer, coach, active, width, height, sound }: BoardProps<SlipState>) {
  const state = session.state, together = session.options.mode === 'together';
  const puzzle = useMemo(() => puzzleAt(state), [state.index, state.puzzles]); // eslint-disable-line react-hooks/exhaustive-deps -- index and tuples identify the board.
  // Quick swipes must each land on the newest position, even before the next render.
  const latest = useRef(state);
  useLayoutEffect(() => { latest.current = state; }, [state]);
  const [notice, setNotice] = useState('');
  const boardKey = `${state.index}:${state.puzzles[state.index]?.join('') ?? ''}`;
  const commit = useCallback((next: SlipState) => { if (next === latest.current) return false; latest.current = next; update(next); return true; }, [update]);
  const move = useCallback((d: Dir) => {
    const next = swipeBoard(latest.current, d);
    if (!commit(next)) return false;
    sound('tap');
    setNotice('');
    if (homeAll(next.crabs)) {
      cheer(next.index === next.puzzles.length - 1 ? 'big' : 'right');
      if (!next.helped) practice('think.slide-plan', true);
    }
    return true;
  }, [cheer, commit, practice, sound]);
  if (!puzzle) return null;
  const solved = finishedBoard(state);
  const finished = solved ? <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 10, alignSelf: 'stretch', backgroundColor: '#E2F2E4', borderRadius: 20, padding: 14 }}>
    <Copy style={{ fontWeight: '900', fontSize: 20, color: C.ink }}>All home!</Copy>
    <Copy style={{ color: C.ink, fontSize: 16, textAlign: 'center' }}>{state.steps} swipes.{state.steps > parOf(puzzle) ? ` Could you do it in ${parOf(puzzle)}?` : ' That is the shortest way!'}</Copy>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      <Button compact onPress={() => commit(nextBoard(latest.current))}>{state.index + 1 === state.puzzles.length ? 'Finish' : 'Next tide'}</Button>
      <Button quiet compact onPress={() => commit(resetBoard(latest.current))}>Try again</Button>
    </View>
  </View> : undefined;
  return <Playfield key={boardKey} puzzle={puzzle} crabs={state.crabs} title={`${rung[state.level]} · Tide ${state.index + 1} of ${state.puzzles.length}`} steps={state.steps}
    active={active} width={width} height={height} together={together} names={session.names} coach={coach} canUndo={state.undo.length > 0} canReset={state.steps > 0}
    onMove={move} notice={notice} finished={finished}
    onHelp={() => { assistance?.(); commit(markHelped(latest.current)); }}
    onUndo={() => commit(undoBoard(latest.current))}
    onReset={() => commit(resetBoard(latest.current))}
    onAnother={() => commit(dealFresh(latest.current, Math.random))}
    onShown={() => { commit(dealFresh(markHelped(latest.current), Math.random)); setNotice('Your turn on a new one!'); }} />;
}
