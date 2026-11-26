import React, { useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AudioPreferences, useSoundControls } from '../../../components/Audio';
import type { ChallengeViewProps } from '../../../challenge/types';
import type { HintCue } from '../../../puzzles/hints';
import { PuzzleHelp, type HintCommit, type HintSnapshot } from '../../../puzzles/ui/PuzzleHelp';
import { ScaleBoard } from './board';
import {
  actPickOdd, actPlaceSort, actWeighFor, CHECK, HELP, ordinaryAllowed, ordinaryFull, RESET, scaleStep, UNDO,
  type Action, type State,
} from './challenge';
import { shellHelpRules, type PublicScaleView, type ScaleHelpAction } from './help';
import { draftComplete, puzzleTuple } from './rules';

type Accepted = { key: string; state: State };
const QUEUE = 2;

const viewOf = (s: State): PublicScaleView => ({
  kind: s.puzzle.kind,
  n: s.puzzle.n,
  cast: s.puzzle.cast,
  history: s.history,
  order: s.order,
  oddPick: s.oddPick,
  oddDir: s.oddDir,
});

/**
 * Challenge host for Shell Scale: serializes every action through the revision-guarded `commit`,
 * strictly passes only `PublicScaleView` into `ScaleBoard` and `PuzzleHelp`, and preserves the
 * certified assistance reserve so repeated weighings, misses, saturated Help, and Undo can never
 * block completion.
 */
export function ChallengeBoard({ state, dispatch, active, width, sessionKey, commit, onFresh, header, footer }: ChallengeViewProps<State, Action>) {
  const prefs = useContext(AudioPreferences), { play } = useSoundControls(prefs.sound ?? true);
  const live = useRef({ state, key: sessionKey, active }), lane = useRef<Promise<unknown>>(Promise.resolve());
  const epoch = useRef(0), waiting = useRef(0), sending = useRef(false);
  const [cue, setCue] = useState<HintCue | null>(null);

  useLayoutEffect(() => {
    if (!active || (live.current.key !== sessionKey && !sending.current)) epoch.current++;
    live.current = { state, key: sessionKey, active };
  }, [state, sessionKey, active]);

  const submit = useCallback((action: Action, expected?: string): Promise<Accepted | null> => {
    const mine = epoch.current;
    const run = async (): Promise<Accepted | null> => {
      const at = live.current;
      if (mine !== epoch.current || !at.active || !commit || at.key === undefined || (expected !== undefined && expected !== at.key)) return null;
      if (!scaleStep(at.state, action) || !ordinaryAllowed(at.state, action)) return null;
      sending.current = true;
      let accepted: Accepted | null;
      try { accepted = await commit(action, at.key); } finally { sending.current = false; }
      if (!accepted) { epoch.current++; return null; }
      if (live.current.key === at.key || live.current.key === accepted.key) {
        live.current = { ...live.current, state: accepted.state, key: accepted.key };
      } else {
        epoch.current++;
        return null;
      }
      return accepted;
    };
    const next = lane.current.then(run, run);
    lane.current = next.catch(() => null);
    return next;
  }, [commit]);

  const predicted = useRef<{ epoch: number; state: State } | null>(null);
  const enqueue = useCallback((action: Action) => {
    if (!active) return false;
    if (!commit) {
      if (!scaleStep(state, action) || !ordinaryAllowed(state, action)) return false;
      dispatch(action);
      return true;
    }
    const base = waiting.current && predicted.current?.epoch === epoch.current ? predicted.current.state : live.current.state;
    const after = scaleStep(base, action);
    if (!after || !ordinaryAllowed(base, action) || waiting.current > QUEUE) return false;
    predicted.current = { epoch: epoch.current, state: after };
    waiting.current++;
    void submit(action).then(accepted => {
      if (!accepted) return;
      if (action === CHECK) play(accepted.state.won ? 'win' : 'scale-not-yet');
      else if (accepted.state.won) play('win');
      else play('tap');
    }).catch(() => null).finally(() => { waiting.current--; });
    return true;
  }, [active, commit, dispatch, play, state, submit]);

  const full = ordinaryFull(state);
  const publicView = useMemo(() => viewOf(state), [state]);
  const rules = useMemo(() => shellHelpRules(publicView), [publicView]);
  const snapshot = useMemo<HintSnapshot<PublicScaleView>>(
    () => ({ key: sessionKey ?? `standalone:${state.actions}`, view: publicView }),
    [sessionKey, state.actions, publicView],
  );

  const helpCommit = useCallback(
    async (event: HintCommit<ScaleHelpAction>, expected: string): Promise<HintSnapshot<PublicScaleView> | null> => {
      if (event.kind === 'finish') {
        return live.current.key === expected ? { key: expected, view: viewOf(live.current.state) } : null;
      }
      let action: Action;
      if (event.kind === 'help') {
        action = HELP;
      } else if (event.kind === 'step') {
        const a = event.action;
        if (a.kind === 'weigh') action = actWeighFor(live.current.state.puzzle, a.left, a.right, true);
        else if (a.kind === 'place-sort') action = actPlaceSort(a.item, a.slot, true);
        else action = actPickOdd(a.pearl, a.dir, true);
      } else {
        return null;
      }
      const accepted = await submit(action, expected);
      return accepted ? { key: accepted.key, view: viewOf(accepted.state) } : null;
    },
    [submit],
  );

  return (
    <ScaleBoard
      key={puzzleTuple(state.puzzle).join('|')}
      board={publicView}
      order={state.order}
      oddPick={state.oddPick}
      oddDir={state.oddDir}
      showLinks={state.showLinks}
      won={state.won}
      missed={state.checked}
      canCheck={!state.won && !state.checked && draftComplete(state.puzzle, state)}
      active={active}
      width={width}
      title="Shell Scale"
      cue={cue}
      notice={full ? 'That is a lot of moves! Help can still guide the rest of the way, or try another puzzle.' : undefined}
      onWeigh={(l, r) => enqueue(actWeighFor(state.puzzle, l, r, false))}
      onPlaceSort={(item, slot) => enqueue(actPlaceSort(item, slot, false))}
      onPickOdd={(pearl, dir) => enqueue(actPickOdd(pearl, dir ?? (state.puzzle.kind === 'odd-heavy' ? 'heavy' : (state.oddDir ?? 'heavy')), false))}
      onSetOddDir={dir => {
        if (state.oddPick !== null) enqueue(actPickOdd(state.oddPick, dir, false));
      }}
      onCheck={() => { enqueue(CHECK); }}
      onUndo={() => { enqueue(UNDO); }}
      onReset={() => { enqueue(RESET); }}
      canUndo={state.stack.length > 0 && !full}
      canReset={(state.puzzle.kind === 'sort' ? state.order.some(x => x >= 0) : state.oddPick !== null || state.oddDir !== null) && !full}
      header={header}
      footer={footer}
      help={
        <PuzzleHelp
          key={`help:${puzzleTuple(state.puzzle).join('|')}:${state.history.length}`}
          snapshot={snapshot}
          rules={rules}
          commit={helpCommit}
          onFresh={() => onFresh?.()}
          kind="grid"
          failedRuns={state.misses}
          active={active && !!commit}
          onCue={setCue}
        />
      }
    />
  );
}
