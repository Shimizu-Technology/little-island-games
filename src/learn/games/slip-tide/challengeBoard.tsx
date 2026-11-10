import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChallengeViewProps } from '../../../challenge/types';
import type { HintCue } from '../../../puzzles/hints';
import { PuzzleHelp, type HintCommit, type HintSnapshot } from '../../../puzzles/ui/PuzzleHelp';
import { HELP, hinted, ordinaryAllowed, ordinaryFull, RESET, slipStep, UNDO, type Action, type State } from './challenge';
import { Playfield } from './field';
import { slipHelpRules, slipView, type SlipView } from './help';
import type { Dir } from './rules';

type Accepted = { key: string; state: State };
/** Swipes waiting behind the one being saved. More taps than this are ignored, never queued forever. */
const QUEUE = 2;

/**
 * Every action, swipe or help, goes through the host's revision-guarded `commit` one at a time.
 * Each is checked against the newest accepted position just before it is sent: one that would move
 * nothing is dropped, and a rejected or stale commit drops everything queued behind it. Nothing retries.
 * A change of session, position from elsewhere, or activity also drops the queue.
 */
export function ChallengeBoard({ state, dispatch, active, width, sessionKey, commit, onFresh }: ChallengeViewProps<State, Action>) {
  const live = useRef({ state, key: sessionKey, active }), lane = useRef<Promise<unknown>>(Promise.resolve());
  const epoch = useRef(0), waiting = useRef(0), sending = useRef(false), [cue, setCue] = useState<HintCue | null>(null);
  useLayoutEffect(() => {
    // A new key while nothing is being saved came from elsewhere (restore, switch, replacement): drop the queue.
    // During a save the commit result decides, since the host may render its accepted revision first.
    if (!active || live.current.key !== sessionKey && !sending.current) epoch.current++;
    live.current = { state, key: sessionKey, active };
  }, [state, sessionKey, active]);
  const submit = useCallback((action: Action, expected?: string): Promise<Accepted | null> => {
    const mine = epoch.current;
    const run = async (): Promise<Accepted | null> => {
      const at = live.current;
      if (mine !== epoch.current || !at.active || !commit || at.key === undefined || expected !== undefined && expected !== at.key) return null;
      if (!slipStep(at.state, action) || !ordinaryAllowed(at.state, action)) return null;
      sending.current = true;
      let accepted: Accepted | null;
      try { accepted = await commit(action, at.key); } finally { sending.current = false; }
      if (!accepted) { epoch.current++; return null; }
      if (live.current.key === at.key || live.current.key === accepted.key) live.current = { ...live.current, state: accepted.state, key: accepted.key };
      else { epoch.current++; return null; }
      return accepted;
    };
    const next = lane.current.then(run, run);
    lane.current = next.catch(() => null);
    return next;
  }, [commit]);
  /** Where queued swipes will leave the crabs, so a tap that cannot move anything nudges at once. */
  const predicted = useRef<{ epoch: number; state: State } | null>(null);
  const enqueue = useCallback((action: Action) => {
    if (!active) return false;
    if (!commit) {
      if (!slipStep(state, action) || !ordinaryAllowed(state, action)) return false;
      dispatch(action);
      return true;
    }
    const base = waiting.current && predicted.current?.epoch === epoch.current ? predicted.current.state : live.current.state;
    const after = slipStep(base, action);
    if (!after || !ordinaryAllowed(base, action) || waiting.current > QUEUE) return false;
    predicted.current = { epoch: epoch.current, state: after };
    waiting.current++;
    void submit(action).catch(() => null).finally(() => { waiting.current--; });
    return true;
  }, [active, commit, dispatch, state, submit]);
  const rules = useMemo(() => slipHelpRules(state.puzzle), [state.puzzle]);
  const snapshot = useMemo<HintSnapshot<SlipView>>(() => ({ key: sessionKey ?? `standalone:${state.actions}`, view: slipView(state.puzzle, state.crabs) }), [sessionKey, state]);
  const helpCommit = useCallback(async (event: HintCommit<Dir>, expected: string): Promise<HintSnapshot<SlipView> | null> => {
    const view = (a: Accepted) => ({ key: a.key, view: slipView(a.state.puzzle, a.state.crabs) });
    // The last helped swipe already finished the board through the engine; nothing more to record.
    if (event.kind === 'finish') return live.current.key === expected ? { key: expected, view: slipView(live.current.state.puzzle, live.current.state.crabs) } : null;
    const accepted = await submit(event.kind === 'step' ? hinted(event.action) : HELP, expected);
    return accepted ? view(accepted) : null;
  }, [submit]);
  const full = ordinaryFull(state);
  return <Playfield puzzle={state.puzzle} crabs={state.crabs} title="Slip Tide" steps={state.moves.length} active={active} width={width} height={820}
    canUndo={state.stack.length > 0 && !full} canReset={state.moves.length > 0 && !full}
    notice={full ? 'That is a lot of tries! Help can still show the way, or choose Another puzzle.' : undefined}
    onMove={enqueue} onUndo={() => enqueue(UNDO)} onReset={() => enqueue(RESET)} cue={cue}
    help={<PuzzleHelp snapshot={snapshot} rules={rules} commit={helpCommit} onFresh={() => onFresh?.()} kind="grid" failedRuns={0} active={active && !!commit} onCue={setCue} />} />;
}
