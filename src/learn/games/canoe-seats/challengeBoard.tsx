import React, { useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AudioPreferences, hasSpeech, useSoundControls } from '../../../components/Audio';
import type { ChallengeViewProps } from '../../../challenge/types';
import type { HintCue } from '../../../puzzles/hints';
import { PuzzleHelp, type HintCommit, type HintSnapshot } from '../../../puzzles/ui/PuzzleHelp';
import { CanoeBoard } from './board';
import { canoeStep, CHECK, HELP, hinted, ordinaryAllowed, ordinaryFull, RESET, UNDO, USED, type Action, type State } from './challenge';
import { canoeHelpRules, canoeView, type CanoeView, type HelpMove } from './help';
import { complete } from './rules';
import { clueKey } from './speech';

type Accepted = { key: string; state: State };
/** Actions waiting behind the one being saved. More taps than this are ignored, never queued forever. */
const QUEUE = 2;

/**
 * Every action goes through the host's revision-guarded `commit` one at a time. Each is checked
 * against the newest accepted position just before it is sent; a rejected or stale commit drops
 * everything queued behind it. A change of session or activity also drops the queue.
 */
export function ChallengeBoard({ state, dispatch, active, width, sessionKey, commit, onFresh, header, footer }: ChallengeViewProps<State, Action>) {
  const prefs = useContext(AudioPreferences), { play } = useSoundControls(prefs.sound ?? true);
  const live = useRef({ state, key: sessionKey, active }), lane = useRef<Promise<unknown>>(Promise.resolve());
  const epoch = useRef(0), waiting = useRef(0), sending = useRef(false), [cue, setCue] = useState<HintCue | null>(null);
  useLayoutEffect(() => {
    if (!active || live.current.key !== sessionKey && !sending.current) epoch.current++;
    live.current = { state, key: sessionKey, active };
  }, [state, sessionKey, active]);
  const submit = useCallback((action: Action, expected?: string): Promise<Accepted | null> => {
    const mine = epoch.current;
    const run = async (): Promise<Accepted | null> => {
      const at = live.current;
      if (mine !== epoch.current || !at.active || !commit || at.key === undefined || expected !== undefined && expected !== at.key) return null;
      if (!canoeStep(at.state, action) || !ordinaryAllowed(at.state, action)) return null;
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
  const predicted = useRef<{ epoch: number; state: State } | null>(null);
  /** Sends an action if it would change the newest position; a no-op returns false at once. */
  const enqueue = useCallback((action: Action) => {
    if (!active) return false;
    if (!commit) {
      if (!canoeStep(state, action) || !ordinaryAllowed(state, action)) return false;
      dispatch(action);
      return true;
    }
    const base = waiting.current && predicted.current?.epoch === epoch.current ? predicted.current.state : live.current.state;
    const after = canoeStep(base, action);
    if (!after || !ordinaryAllowed(base, action) || waiting.current > QUEUE) return false;
    predicted.current = { epoch: epoch.current, state: after };
    waiting.current++;
    void submit(action).then(accepted => {
      if (!accepted) return;
      if (action === CHECK) play(accepted.state.won ? 'win' : 'canoe-not-yet');
      else if (accepted.state.won) play('win');
      else play('tap');
    }).catch(() => null).finally(() => { waiting.current--; });
    return true;
  }, [active, commit, dispatch, play, state, submit]);
  const whole = !state.lights;
  const rules = useMemo(() => canoeHelpRules(state.puzzle, whole), [state.puzzle, whole]);
  const snapshot = useMemo<HintSnapshot<CanoeView>>(() => ({ key: sessionKey ?? `standalone:${state.actions}`, view: canoeView(state.puzzle, state.pos, whole) }), [sessionKey, state, whole]);
  const helpCommit = useCallback(async (event: HintCommit<HelpMove>, expected: string): Promise<HintSnapshot<CanoeView> | null> => {
    const view = (a: Accepted) => ({ key: a.key, view: canoeView(a.state.puzzle, a.state.pos, !a.state.lights) });
    if (event.kind === 'finish') return live.current.key === expected ? { key: expected, view: canoeView(live.current.state.puzzle, live.current.state.pos, whole) } : null;
    const accepted = await submit(event.kind === 'step' ? hinted(event.action) : HELP, expected);
    return accepted ? view(accepted) : null;
  }, [submit, whole]);
  const hear = useCallback((clue: number) => {
    const key = clueKey(state.puzzle, state.puzzle.clues[clue]);
    return !!key && hasSpeech(key) && play(key);
  }, [play, state.puzzle]);
  const full = ordinaryFull(state);
  return <CanoeBoard puzzle={state.puzzle} pos={state.pos} used={state.used} lights={state.lights} won={state.won} missed={state.checked}
    canCheck={whole && !state.won && !state.checked && complete(state.puzzle, state.pos)} active={active} width={width} title="Canoe Seats" hear={hear} cue={cue}
    notice={full ? 'That is a lot of moves! Help can still show the way, or choose another puzzle.' : undefined}
    onPlace={(item, seat) => enqueue(item * 8 + seat + 1)} onToggleUsed={clue => { enqueue(USED + clue); }} onCheck={() => { enqueue(CHECK); }}
    onUndo={() => { enqueue(UNDO); }} onReset={() => { enqueue(RESET); }} canUndo={state.stack.length > 0 && !full} canReset={state.pos.some(s => s !== -1) && !full}
    header={header} footer={footer}
    help={<PuzzleHelp snapshot={snapshot} rules={rules} commit={helpCommit} onFresh={() => onFresh?.()} kind="grid" failedRuns={state.misses} active={active && !!commit} onCue={setCue} />} />;
}
