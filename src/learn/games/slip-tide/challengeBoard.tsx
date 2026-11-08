import React, { useCallback, useEffect, useRef } from 'react';
import type { ChallengeViewProps } from '../../../challenge/types';
import { MAX_ACTIONS, type Action, type State } from './challenge';
import { Playfield } from './field';
import { gridOf, slideOn, type Dir } from './rules';

/** The frame ignores a dispatch while a save is in flight, so actions go through one at a time and retry until accepted. */
export function ChallengeBoard({ state, dispatch, active, width }: ChallengeViewProps<State, Action>) {
  const queue = useRef<Action[]>([]), sending = useRef<Action | null>(null), retry = useRef<ReturnType<typeof setTimeout> | null>(null), seen = useRef(state.actions);
  const stopRetry = () => { if (retry.current) clearTimeout(retry.current); retry.current = null; };
  const send = useCallback((action: Action) => {
    sending.current = action;
    const attempt = () => {
      if (sending.current !== action) return;
      dispatch(action);
      retry.current = setTimeout(attempt, 400);
    };
    attempt();
  }, [dispatch]);
  useEffect(() => stopRetry, []);
  useEffect(() => {
    if (state.actions === seen.current) return;
    seen.current = state.actions;
    sending.current = null;
    stopRetry();
    const next = queue.current.shift();
    if (next !== undefined) send(next);
  }, [send, state.actions]);
  const enqueue = (action: Action) => {
    if (sending.current === null) send(action);
    else if (queue.current.length < 2) queue.current.push(action);
  };
  const full = state.actions >= MAX_ACTIONS;
  const onMove = (d: Dir) => {
    if (full || !active || (sending.current === null && slideOn(gridOf(state.puzzle), state.crabs, d) === state.crabs)) return false;
    enqueue(d);
    return true;
  };
  return <Playfield puzzle={state.puzzle} crabs={state.crabs} title="Slip Tide" steps={state.moves.length} active={active} width={width} height={820}
    canUndo={state.stack.length > 0} canReset={state.moves.length > 0} notice={full ? 'That is a lot of tries! Choose Another puzzle for a fresh start.' : undefined}
    onMove={onMove} onHelp={() => enqueue('help')} onUndo={() => enqueue('undo')} onReset={() => enqueue('reset')} />;
}
