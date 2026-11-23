import { jsonBytes } from '../../../state/saveBits';
import { validChallengeSession, type ChallengeSession } from '../../../state/challenge';
import React, { lazy, Suspense } from 'react';
import { defineReplayGame } from '../../../challenge/replay';
import { challengeEngine, type Action, type Initial, type Payload, type State } from './challenge-engine';
import { turtlePuzzles } from './challenge-content';
import type { ChallengeViewProps } from '../../../challenge/types';
export type { Payload, Action, State } from './challenge-engine';
// Loading the catalog never loads the native renderer, audio players or School art.
const Board = lazy(() => import('./challenge-view').then(m => ({ default: m.ChallengeBoard })));
/** Certified in tests/c2c-turtle-challenge.test.ts: from the ordinary-edit ceiling, three Help presses plus a winning Go still fit in 4 KiB. */
export const turtleAssistance = { bytes: 192, actions: 4, idempotentHelp: false, isAction: (a: Action) => a[0] === 'h' };
export const registration = defineReplayGame({
  game: 'turtle-draw', codec: 'turtle-proof-v1', context: 'turtle', cove: false, budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
  puzzles: [...turtlePuzzles].sort((a, b) => a.ref.bank - b.ref.bank || a.ref.puzzle - b.ref.puzzle), engine: challengeEngine,
  helpUI: 'board', assistance: turtleAssistance,
  Board: (p: ChallengeViewProps<State, Action>) => <Suspense fallback={null}><Board {...p} /></Suspense>,
  controls: { help: (): Action => ['h'], reset: (): Action => ['z'] },
  completionText: (_ref, result) => result.event === 'independent' ? 'You worked it out yourself.' : 'You kept going and found it.',
});
registration.animatedRuns = true;
registration.dareHelp = 'Dares are optional. Help keeps your finish, and a dare that needs none says so.';
const find = (s: ChallengeSession) => turtlePuzzles.find(p => p.ref.bank === s.puzzle.bank && p.ref.puzzle === s.puzzle.puzzle);
/** A draw-it attempt that has used its replay room: the next block edit could not be saved. Restart keeps the plan. */
registration.full = (s, action) => {
  const puzzle = find(s);
  if (puzzle?.descriptor.kind !== 'build') return false;
  const payload = s.payload as Payload;
  return jsonBytes({ ...s, revision: s.revision + 1, payload: { ...payload, actions: [...payload.actions, action ?? ['g']] } }) > 4096 - 192 || payload.actions.length + 1 > 512 - 4;
};
registration.restart = (session, id, progress) => {
  const puzzle = find(session);
  if (puzzle?.descriptor.kind !== 'build' || session.result || !validChallengeSession(session, session.owner, registration.catalog)) throw new Error('Invalid Turtle attempt.');
  const payload = session.payload as Payload;
  let state = challengeEngine.create(puzzle.descriptor, payload.initial, payload.options), failed = payload.initial.prior?.failed ?? false;
  for (const action of payload.actions) {
    const next = challengeEngine.step(state, action, puzzle.descriptor);
    if (!next) throw new Error('Invalid Turtle replay.');
    if (next.correct === false) failed = true;
    state = next.state;
  }
  // Help counts as a miss for independence, so Keep my plan cannot launder it.
  const prior = { runs: Math.min(65535, (payload.initial.prior?.runs ?? 0) + state.runs), failed: failed || state.hints > 0, edits: Math.min(65535, state.edits), hints: Math.min(65535, state.hints) };
  const initial: Initial = { version: 1, prior, ...(state.draft ? { draft: state.draft } : {}) };
  const started = registration.start(session.puzzle, session.owner, id, progress, payload.options, session.selectedDares);
  const next: ChallengeSession = { ...started, payload: { ...(started.payload as Payload), initial } };
  return { ...next, revision: 0 };
};
